export const MONTH_NAMES_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  return 'Rp ' + Math.round(amount).toLocaleString('id-ID');
}

export function formatCompactRupiah(amount: number): string {
  if (isNaN(amount)) return 'Rp 0';
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000_000) {
    return `${sign}Rp ${(abs / 1_000_000_000).toFixed(1)} M`;
  }
  if (abs >= 1_000_000) {
    return `${sign}Rp ${(abs / 1_000_000).toFixed(1)} jt`;
  }
  if (abs >= 1_000) {
    return `${sign}Rp ${(abs / 1_000).toFixed(0)} rb`;
  }
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

export function formatIndonesianDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  const monthIdx = parseInt(month, 10) - 1;
  const mName = MONTH_NAMES_ID[monthIdx] || month;
  return `${parseInt(day, 10)} ${mName.slice(0, 3)} ${year}`;
}

export function getMonthYearKey(dateStr: string): string {
  // Returns "2026-10"
  if (!dateStr) return '';
  return dateStr.slice(0, 7);
}

export function getMonthLabel(monthYearKey: string): string {
  // input "2026-10" -> "Oktober 2026"
  if (!monthYearKey || !monthYearKey.includes('-')) return monthYearKey;
  const [year, month] = monthYearKey.split('-');
  const idx = parseInt(month, 10) - 1;
  return `${MONTH_NAMES_ID[idx] || month} ${year}`;
}

export function exportTransactionsToCSV(transactions: any[], filename = 'laporan-keuangan.csv') {
  const headers = [
    'ID',
    'Tipe',
    'Tanggal',
    'Waktu',
    'Merchant/Pihak',
    'Kategori',
    'Metode Pembayaran',
    'Nominal (Rp)',
    'Deskripsi',
  ];

  const rows = transactions.map((t) => [
    t.id,
    t.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran',
    t.date,
    t.time || '-',
    `"${(t.merchant || '').replace(/"/g, '""')}"`,
    `"${t.category}"`,
    t.paymentMethod,
    t.amount,
    `"${(t.description || '').replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportMonthlyRecapToCSV(monthlySummaries: any[], filename = 'rekap-keuangan-bulanan.csv') {
  const headers = [
    'Bulan',
    'Total Pemasukan (Rp)',
    'Total Pengeluaran (Rp)',
    'Arus Kas Bersih (Rp)',
    'Rasio Tabungan (%)',
    'Jumlah Transaksi',
    'Kategori Terbesar',
    'Pengeluaran Kategori Terbesar (Rp)',
    'Status Keuangan',
  ];

  const rows = monthlySummaries.map((m) => [
    `"${m.monthLabel}"`,
    m.income,
    m.expense,
    m.net,
    m.savingsRate.toFixed(1) + '%',
    m.transactionCount,
    `"${m.topCategory}"`,
    m.topCategoryAmount,
    `"${m.status}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
