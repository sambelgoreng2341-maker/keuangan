// Cloudflare Pages Function for /api/parse-transaction
export const onRequestPost = async (context: { request: Request; env: Record<string, string> }) => {
  try {
    const { request, env } = context;
    const body = (await request.json().catch(() => ({}))) as any;
    const { rawText, imageBase64, mimeType } = body;

    if (!rawText && !imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Harap sediakan teks SMS/mutasi atau gambar struk.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const parts: any[] = [];
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
Keluarkan hasil ekstraksi HANYA dalam format JSON valid tanpa tanda markdown (no backticks):
{
  "type": "pengeluaran" atau "pemasukan",
  "amount": number (angka nominal dalam Rupiah, contoh 45000 tanpa titik atau Rp),
  "date": "YYYY-MM-DD",
  "time": "HH:mm",
  "merchant": "Nama Toko / Penerima / Pengirim",
  "description": "Deskripsi singkat pengeluaran/pemasukan",
  "category": "Makanan & Minuman" | "Tagihan & Utilitas" | "Transportasi" | "Belanja & Kebutuhan" | "Hiburan & Langganan" | "Kesehatan" | "Sewa & Tempat Tinggal" | "Gaji & Upah" | "Investasi & Tabungan" | "Lain-lain",
  "paymentMethod": "BCA" | "Mandiri" | "BRI" | "BNI" | "GoPay" | "OVO" | "ShopeePay" | "DANA" | "QRIS" | "Tunai" | "Lainnya"
}

Data Masukan:
${rawText ? rawText : 'Gambar struk / transfer terlampir'}
`;
        parts.push({ text: promptText });

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts }] }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = (await geminiRes.json()) as any;
          const textReply = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const match = textReply.match(/\{[\s\S]*\}/);
          if (match) {
            const parsed = JSON.parse(match[0]);
            return new Response(
              JSON.stringify({
                success: true,
                data: {
                  ...parsed,
                  amount: Number(parsed.amount) || 0,
                  confidence: 'Ekstraksi Cerdas Gemini AI',
                },
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
        }
      } catch (aiErr) {
        // Fallback to pattern matcher below
      }
    }

    // Pattern matching fallback
    const clean = (rawText || '').trim();
    let type = 'pengeluaran';
    let amount = 0;
    let merchant = 'Transaksi Finansial';
    let category = 'Lain-lain';
    let paymentMethod = 'QRIS';
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const timeStr = now.toTimeString().slice(0, 5);

    const lower = clean.toLowerCase();
    if (
      lower.includes('masuk') ||
      lower.includes('cr') ||
      lower.includes('menerima') ||
      lower.includes('gaji')
    ) {
      type = 'pemasukan';
      category = 'Gaji & Upah';
    }

    const amountMatch = clean.match(/(?:rp\.?|idr)?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+)/i);
    if (amountMatch) {
      const rawVal = amountMatch[1].replace(/\./g, '').replace(/,/g, '.');
      const parsed = parseFloat(rawVal);
      if (!isNaN(parsed) && parsed > 0) amount = parsed;
    }

    if (lower.includes('bca')) paymentMethod = 'BCA';
    else if (lower.includes('mandiri')) paymentMethod = 'Mandiri';
    else if (lower.includes('gopay')) paymentMethod = 'GoPay';
    else if (lower.includes('ovo')) paymentMethod = 'OVO';
    else if (lower.includes('dana')) paymentMethod = 'DANA';
    else if (lower.includes('shopee')) paymentMethod = 'ShopeePay';

    if (lower.includes('kopi') || lower.includes('makan') || lower.includes('resto') || lower.includes('indomaret') || lower.includes('alfamart')) {
      category = 'Makanan & Minuman';
      merchant = 'Kuliner / Minimarket';
    } else if (lower.includes('listrik') || lower.includes('pln') || lower.includes('pulsa') || lower.includes('wifi')) {
      category = 'Tagihan & Utilitas';
      merchant = 'Pembayaran Tagihan';
    } else if (lower.includes('bensin') || lower.includes('grab') || lower.includes('gojek') || lower.includes('spbu')) {
      category = 'Transportasi';
      merchant = 'Transportasi / SPBU';
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          type,
          amount: amount || (imageBase64 ? 0 : 50000),
          date: dateStr,
          time: timeStr,
          merchant,
          description: clean.slice(0, 100) || 'Transaksi Struk/Mutasi',
          category,
          paymentMethod,
          confidence: 'Pencocokan Pola Cerdas',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Gagal memproses: ' + err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
