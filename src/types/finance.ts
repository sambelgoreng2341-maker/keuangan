export type TransactionType = 'pemasukan' | 'pengeluaran';

export type TransactionCategory =
  | 'Gaji & Upah'
  | 'Makanan & Minuman'
  | 'Tagihan & Utilitas'
  | 'Transportasi'
  | 'Belanja & Kebutuhan'
  | 'Hiburan & Langganan'
  | 'Kesehatan'
  | 'Sewa & Tempat Tinggal'
  | 'Investasi & Tabungan'
  | 'Pendidikan'
  | 'Lain-lain';

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
