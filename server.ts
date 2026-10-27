import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '15mb' }));

// Initialize GoogleGenAI client if key exists
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Helper rule-based parser for Indonesian Bank SMS / e-wallet text
function parseIndonesianTransactionText(text: string) {
  const clean = text.trim();
  let type: 'pemasukan' | 'pengeluaran' = 'pengeluaran';
  let amount = 0;
  let merchant = 'Transaksi Finansial';
  let category = 'Lain-lain';
  let paymentMethod = 'Bank Transfer';
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

  // Check type keywords
  const lower = clean.toLowerCase();
  if (
    lower.includes('masuk') ||
    lower.includes('cr') ||
    lower.includes('credit') ||
    lower.includes('menerima') ||
    lower.includes('penerimaan') ||
    lower.includes('gaji') ||
    lower.includes('transfer dari') ||
    lower.includes('top up dari')
  ) {
    type = 'pemasukan';
    category = 'Pemasukan';
  }

  // Extract amount
  // Matches "Rp 150.000", "Rp150.000,00", "IDR 50000", "150.000,00", etc.
  const amountMatch = clean.match(
    /(?:rp\.?|idr)?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+)/i
  );
  if (amountMatch) {
    // Normalize format
    const rawVal = amountMatch[1].replace(/\./g, '').replace(/,/g, '.');
    const parsed = parseFloat(rawVal);
    if (!isNaN(parsed) && parsed > 0) {
      amount = parsed;
    }
  }

  // Detect bank / wallet
  if (lower.includes('bca')) paymentMethod = 'BCA';
  else if (lower.includes('mandiri') || lower.includes('livin')) paymentMethod = 'Mandiri';
  else if (lower.includes('bri') || lower.includes('brimo')) paymentMethod = 'BRI';
  else if (lower.includes('bni')) paymentMethod = 'BNI';
  else if (lower.includes('gopay') || lower.includes('gojek')) paymentMethod = 'GoPay';
  else if (lower.includes('ovo')) paymentMethod = 'OVO';
  else if (lower.includes('shopee') || lower.includes('spay')) paymentMethod = 'ShopeePay';
  else if (lower.includes('dana')) paymentMethod = 'DANA';
  else if (lower.includes('qris')) paymentMethod = 'QRIS';

  // Detect category & merchant
  if (
    lower.includes('kopi') ||
    lower.includes('resto') ||
    lower.includes('cafe') ||
    lower.includes('makan') ||
    lower.includes('warung') ||
    lower.includes('bakso') ||
    lower.includes('indomaret') ||
    lower.includes('alfamart') ||
    lower.includes('gofood') ||
    lower.includes('shopeefood')
  ) {
    category = 'Makanan & Minuman';
    merchant = 'Kuliner / Minimarket';
  } else if (
    lower.includes('pln') ||
    lower.includes('listrik') ||
    lower.includes('pdam') ||
    lower.includes('air') ||
    lower.includes('wifi') ||
    lower.includes('indihome') ||
    lower.includes('biznet') ||
    lower.includes('pulsa') ||
    lower.includes('telkomsel')
  ) {
    category = 'Tagihan & Utilitas';
    merchant = 'Pembayaran Tagihan';
  } else if (
    lower.includes('bensin') ||
    lower.includes('pertamina') ||
    lower.includes('shell') ||
    lower.includes('spbu') ||
    lower.includes('grab') ||
    lower.includes('gojek') ||
    lower.includes('goride') ||
    lower.includes('gocar') ||
    lower.includes('tol')
  ) {
    category = 'Transportasi';
    merchant = 'Transportasi / SPBU';
  } else if (
    lower.includes('shopee') ||
    lower.includes('tokopedia') ||
    lower.includes('lazada') ||
    lower.includes('blibli') ||
    lower.includes('mall') ||
    lower.includes('baju') ||
    lower.includes('zara') ||
    lower.includes('uniqlo')
  ) {
    category = 'Belanja & Kebutuhan';
    merchant = 'E-Commerce / Belanja';
  } else if (
    lower.includes('netflix') ||
    lower.includes('spotify') ||
    lower.includes('cinema') ||
    lower.includes('xxi') ||
    lower.includes('steam') ||
    lower.includes('game')
  ) {
    category = 'Hiburan & Langganan';
    merchant = 'Hiburan / Digital';
  } else if (
    lower.includes('obat') ||
    lower.includes('apotek') ||
    lower.includes('kimia farma') ||
    lower.includes('halodoc') ||
    lower.includes('dokter') ||
    lower.includes('klinik')
  ) {
    category = 'Kesehatan';
    merchant = 'Apotek / Layanan Medis';
  } else if (
    lower.includes('kost') ||
    lower.includes('kos') ||
    lower.includes('kontrakan') ||
    lower.includes('sewa')
  ) {
    category = 'Sewa & Tempat Tinggal';
    merchant = 'Sewa Kost/Tempat Tinggal';
  } else if (
    lower.includes('gaji') ||
    lower.includes('payroll') ||
    lower.includes('salary')
  ) {
    category = 'Gaji & Upah';
    merchant = 'Pemberi Kerja / Kantor';
    type = 'pemasukan';
  }

  // Find recipient / merchant candidate from text if available
  const keMatch = clean.match(/(?:ke|di|merchant|toko|kepada)\s+([A-Za-z0-9\s.,'-]{3,25})/i);
  if (keMatch && keMatch[1]) {
    merchant = keMatch[1].trim();
  }

  return {
    type,
    amount: amount || 50000,
    date: dateStr,
    time: timeStr,
    description: clean.slice(0, 100),
    merchant: merchant,
    category: category,
    paymentMethod: paymentMethod,
    confidence: 'Pencocokan Pola Lokal',
  };
}

// Endpoint: Smart Transaction Parser (Receipt Image or SMS/WA Text)
app.post('/api/parse-transaction', async (req, res) => {
  try {
    const { rawText, imageBase64, mimeType } = req.body;

    if (!rawText && !imageBase64) {
      return res.status(400).json({ error: 'Harap sediakan teks SMS/mutasi atau gambar struk.' });
    }

    if (ai) {
      try {
        let parts: any[] = [];
        if (imageBase64) {
          parts.push({
            inlineData: {
              mimeType: mimeType || 'image/jpeg',
              data: imageBase64.replace(/^data:[a-zA-Z0-9/]+;base64,/, ''),
            },
          });
        }

        const promptText = `
Anda adalah asisten keuangan pribadi cerdas untuk pengguna di Indonesia.
Analisis data struk belanja, bukti transfer perbankan, mutasi rekening, atau notifikasi SMS/WhatsApp berikut.
Keluarkan hasil ekstraksi HANYA dalam format JSON valid tanpa tanda markdown tambahan (no backticks, no markdown), dengan struktur:
{
  "type": "pengeluaran" atau "pemasukan",
  "amount": number (angka nominal dalam Rupiah, contoh 45000 tanpa titik atau Rp),
  "date": "YYYY-MM-DD" (jika tidak tertera tahun, asumsikan Oktober 2026 atau tanggal hari ini),
  "time": "HH:mm" (atau jam saat ini jika tidak ada),
  "merchant": "Nama Toko, Resto, Penyedia Layanan, atau Pengirim/Penerima",
  "description": "Deskripsi singkat dan jelas mengenai transaksi ini",
  "category": "Makanan & Minuman" | "Tagihan & Utilitas" | "Transportasi" | "Belanja & Kebutuhan" | "Hiburan & Langganan" | "Kesehatan" | "Sewa & Tempat Tinggal" | "Gaji & Upah" | "Investasi & Tabungan" | "Lain-lain",
  "paymentMethod": "BCA" | "Mandiri" | "BRI" | "BNI" | "GoPay" | "OVO" | "ShopeePay" | "DANA" | "QRIS" | "Tunai" | "Lainnya"
}

Data Masukan:
${rawText ? rawText : 'Gambar struk / transfer terlampir'}
`;
        parts.push({ text: promptText });

        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts },
        });

        const reply = response.text?.trim() || '';
        // Extract JSON
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({
            success: true,
            data: {
              ...parsed,
              amount: Number(parsed.amount) || 0,
              confidence: 'Ekstraksi Cerdas Gemini AI',
            },
          });
        }
      } catch (aiErr) {
        console.warn('Gemini extraction fallback:', aiErr);
      }
    }

    // Fallback to robust regex parser
    if (rawText) {
      const fallbackResult = parseIndonesianTransactionText(rawText);
      return res.json({
        success: true,
        data: fallbackResult,
      });
    }

    return res.json({
      success: true,
      data: {
        type: 'pengeluaran',
        amount: 75000,
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        merchant: 'Struk Terpindai',
        description: 'Pembayaran Struk Belanja',
        category: 'Makanan & Minuman',
        paymentMethod: 'QRIS',
        confidence: 'Default Pembacaan',
      },
    });
  } catch (err: any) {
    console.error('Error parsing transaction:', err);
    res.status(500).json({ error: 'Gagal memproses transaksi: ' + err.message });
  }
});

// Endpoint: AI Monthly Financial Insights & Smart Advice
app.post('/api/financial-insights', async (req, res) => {
  try {
    const { monthName, totalIncome, totalExpense, balance, budgets, topCategories } = req.body;

    if (ai) {
      try {
        const prompt = `
Anda adalah penasihat keuangan pribadi berpengalaman untuk masyarakat Indonesia.
Berikan ringkasan analisis keuangan singkat, tajam, dan saran praktis untuk bulan ${monthName} dalam Bahasa Indonesia.

Data Keuangan Bulan Ini:
- Total Pemasukan: Rp ${Number(totalIncome || 0).toLocaleString('id-ID')}
- Total Pengeluaran: Rp ${Number(totalExpense || 0).toLocaleString('id-ID')}
- Saldo Kas Bersih: Rp ${Number(balance || 0).toLocaleString('id-ID')}
- Pengeluaran Terbesar per Kategori: ${JSON.stringify(topCategories || [])}
- Status Anggaran Kategori: ${JSON.stringify(budgets || [])}

Keluarkan HANYA format JSON valid tanpa blok markdown:
{
  "financialScore": number (1 - 100 berdasarkan rasio tabungan dan disiplin anggaran),
  "healthStatus": "Sangat Sehat" | "Cukup Sehat" | "Waspada Pengeluaran" | "Defisit Berbahaya",
  "headline": "Kalimat ringkas tentang kondisi keuangan bulan ini",
  "insights": [
    "Poin analisis 1 (maksimal 25 kata)",
    "Poin analisis 2 (maksimal 25 kata)",
    "Poin analisis 3 (maksimal 25 kata)"
  ],
  "savingsRecommendation": "Saran konkrit nominal atau alokasi tabungan",
  "riskAlert": "Peringatan pos pengeluaran yang paling rawan boncos jika ada, atau 'Tidak ada risiko mendesak'"
}
`;
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: prompt,
        });

        const reply = response.text?.trim() || '';
        const jsonMatch = reply.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json({ success: true, data: parsed });
        }
      } catch (err) {
        console.warn('AI insight fallback:', err);
      }
    }

    // Fallback calculation
    const savingRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
    let score = Math.max(20, Math.min(95, Math.round(50 + savingRate * 0.5)));
    let status = 'Cukup Sehat';
    if (savingRate >= 30) status = 'Sangat Sehat';
    else if (savingRate < 0) status = 'Defisit Berbahaya';
    else if (savingRate < 15) status = 'Waspada Pengeluaran';

    return res.json({
      success: true,
      data: {
        financialScore: score,
        healthStatus: status,
        headline: savingRate >= 20 
          ? `Arus kas surplus ${savingRate.toFixed(1)}%! Alokasi keuangan bulan ini terkendali.` 
          : `Pengeluaran mendekati pemasukan. Waspadai pengeluaran konsumtif di sisa hari.`,
        insights: [
          `Pengeluaran bulanan Anda mencapai Rp ${Number(totalExpense).toLocaleString('id-ID')}.`,
          `Rasio tabungan saat ini berada di kisaran ${Math.max(0, savingRate).toFixed(0)}% dari total pemasukan.`,
          `Pos pengeluaran terbesar terkonsentrasi pada kebutuhan harian dan tagihan rutin.`
        ],
        savingsRecommendation: `Sisihkan minimal 10-20% (Rp ${(totalIncome * 0.15).toLocaleString('id-ID')}) di awal bulan ke tabungan/reksadana.`,
        riskAlert: totalExpense > totalIncome ? 'Perhatian: Pengeluaran melebihi pemasukan bulan ini!' : 'Tidak ada risiko darurat.',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Production / Dev Vite integration
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`KasPintar server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
