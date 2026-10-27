import { Transaction, RecurringTemplate, CategoryBudget } from '../types/finance';

/**
 * Nilai awal database kosong (Semua data murni diambil dari Google Sheets Database pengguna)
 */
export const INITIAL_BUDGETS: CategoryBudget[] = [];

export const INITIAL_RECURRING: RecurringTemplate[] = [];

export const INITIAL_TRANSACTIONS: Transaction[] = [];

export const SAMPLE_SMS_TEMPLATES = [
  {
    bank: 'BCA Mutasi',
    text: '04/10 13:45 TRSF E-BANKING DB 175.000,00 KE 081234567 WARUNG BU KRIS',
  },
  {
    bank: 'Mandiri Livin',
    text: 'Transaksi QRIS Rp 48.500 di KOPI KENANGAN TEBET berhasil pada 14/10/2026 15:30. Sisa Saldo Rp 8.420.000',
  },
  {
    bank: 'GoPay Notifikasi',
    text: 'Pembayaran Rp 64.000 ke Solaria Mall Kota Kasablanka via GoPay berhasil.',
  },
  {
    bank: 'BRI Notifikasi',
    text: 'TRX Pembayaran Tagihan Listrik PLN Rp 350.000 di BRImo Sukses tgl 05/10/26 pk 08.12.',
  },
  {
    bank: 'ShopeePay Transfer',
    text: 'Transfer masuk dari Bpk Rudi Rp 500.000 berhasil diterima ke ShopeePay Anda.',
  },
];
