export type TransactionType = 'pemasukan' | 'pengeluaran';

export const EXPENSE_CATEGORIES_DEFAULT = [
  'Makanan & Minuman',
  'Belanja & Kebutuhan',
  'Tagihan & Utilitas',
  'Transportasi',
  'Sewa & Tempat Tinggal',
  'Hiburan & Langganan',
  'Kesehatan',
  'Pendidikan',
  'Investasi & Tabungan',
  'Lain-lain',
] as const;

export const INCOME_CATEGORIES_DEFAULT = [
  'Gaji & Upah',
  'Bonus & THR',
  'Hasil Usaha & Bisnis',
  'Investasi & Dividen',
  'Pemasukan Lainnya',
] as const;

export type StandardExpenseCategory = (typeof EXPENSE_CATEGORIES_DEFAULT)[number];
export type StandardIncomeCategory = (typeof INCOME_CATEGORIES_DEFAULT)[number];

export type TransactionCategory =
  | StandardExpenseCategory
  | StandardIncomeCategory
  | (string & {});

export type PaymentMethod =
  | 'BCA'
  | 'Mandiri'
  | 'BRI'
  | 'BNI'
  | 'GoPay'
  | 'OVO'
  | 'ShopeePay'
  | 'DANA'
  | 'QRIS'
  | 'Tunai'
  | 'Kartu Kredit'
  | 'Lainnya';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  category: TransactionCategory;
  merchant: string;
  description: string;
  paymentMethod: PaymentMethod;
  isRecurringApplied?: boolean;
  recurringTemplateId?: string;
  receiptUrl?: string;
  createdAt: string;
}

export interface RecurringTemplate {
  id: string;
  title: string;
  type: TransactionType;
  amount: number;
  category: TransactionCategory;
  paymentMethod: PaymentMethod;
  dayOfMonth: number; // 1 - 31
  isActive: boolean;
  notes?: string;
  autoPost?: boolean;
}

export interface CategoryBudget {
  category: TransactionCategory;
  monthlyLimit: number;
  alertThresholdPercent: number; // e.g. 80
}

export interface AIInsightData {
  financialScore: number;
  healthStatus: string;
  headline: string;
  insights: string[];
  savingsRecommendation: string;
  riskAlert: string;
}
