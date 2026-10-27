import { TransactionCategory, PaymentMethod } from '../types/finance';

export interface ParsedTransactionData {
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  date: string;
  time: string;
  merchant: string;
  description: string;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  confidence: string;
}

export function parseIndonesianTransactionTextLocally(text: string): ParsedTransactionData {
  const clean = text.trim();
  let type: 'pemasukan' | 'pengeluaran' = 'pengeluaran';
  let amount = 0;
  let merchant = 'Transaksi Finansial';
  let category: TransactionCategory = 'Lain-lain';
  let paymentMethod: PaymentMethod = 'QRIS';
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const timeStr = now.toTimeString().slice(0, 5);

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
    category = 'Gaji & Upah';
  }

  // Extract amount: matches "Rp 150.000", "Rp150.000,00", "IDR 50000", "150.000", etc.
  const amountMatch = clean.match(
    /(?:rp\.?|idr)?\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?|[0-9]+)/i
  );
  if (amountMatch) {
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
  else if (lower.includes('tunai') || lower.includes('cash')) paymentMethod = 'Tunai';

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
    merchant,
    category,
    paymentMethod,
    confidence: 'Pencocokan Pola Cerdas',
  };
}

export interface FinancialInsightResult {
  financialScore: number;
  healthStatus: 'Sangat Sehat' | 'Cukup Sehat' | 'Waspada Pengeluaran' | 'Defisit Berbahaya';
  headline: string;
  insights: string[];
  savingsRecommendation: string;
  riskAlert: string;
}

export function computeLocalFinancialInsights(params: {
  monthName: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  budgets?: any[];
  topCategories?: { name: string; amount: number }[];
}): FinancialInsightResult {
  const { totalIncome, totalExpense } = params;
  const savingRate = totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0;
  
  let score = Math.max(20, Math.min(95, Math.round(50 + savingRate * 0.5)));
  let status: 'Sangat Sehat' | 'Cukup Sehat' | 'Waspada Pengeluaran' | 'Defisit Berbahaya' = 'Cukup Sehat';
  
  if (savingRate >= 30) status = 'Sangat Sehat';
  else if (savingRate < 0) status = 'Defisit Berbahaya';
  else if (savingRate < 15) status = 'Waspada Pengeluaran';

  const headline =
    totalIncome === 0 && totalExpense === 0
      ? 'Belum ada transaksi di bulan ini. Catat pemasukan atau pengeluaran pertama Anda!'
      : savingRate >= 20
      ? `Arus kas surplus ${savingRate.toFixed(1)}%! Alokasi keuangan bulan ini terkendali.`
      : totalExpense > totalIncome
      ? 'Perhatian: Total pengeluaran melebihi pemasukan bulan ini!'
      : 'Pengeluaran mendekati pemasukan. Waspadai pengeluaran konsumtif di sisa hari.';

  const insights: string[] = [
    `Pengeluaran bulanan Anda mencapai Rp ${Number(totalExpense).toLocaleString('id-ID')}.`,
    totalIncome > 0
      ? `Rasio tabungan saat ini berada di kisaran ${Math.max(0, savingRate).toFixed(0)}% dari total pemasukan.`
      : 'Belum ada pemasukan tercatat di bulan ini.',
    params.topCategories && params.topCategories.length > 0
      ? `Pengeluaran terbesar ada pada kategori ${params.topCategories[0].name} (Rp ${params.topCategories[0].amount.toLocaleString('id-ID')}).`
      : 'Pos pengeluaran terkonsentrasi pada kebutuhan harian.',
  ];

  const savingsRecommendation =
    totalIncome > 0
      ? `Sisihkan minimal 10-20% (Rp ${(totalIncome * 0.15).toLocaleString('id-ID')}) di awal bulan ke tabungan/reksadana.`
      : 'Catat pemasukan rutin Anda untuk memantau batas rekomendasi tabungan.';

  const riskAlert =
    totalExpense > totalIncome
      ? 'Perhatian: Terjadi defisit kas! Tinjau pos pengeluaran sekunder.'
      : 'Kondisi kas terkendali, tidak ada risiko mendesak.';

  return {
    financialScore: score,
    healthStatus: status,
    headline,
    insights,
    savingsRecommendation,
    riskAlert,
  };
}
