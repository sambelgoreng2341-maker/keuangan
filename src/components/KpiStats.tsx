import React from 'react';
import { ArrowDownRight, ArrowUpRight, Zap, Target, TrendingUp } from 'lucide-react';
import { formatRupiah } from '../utils/formatters';

interface KpiStatsProps {
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  totalBudgetLimit: number;
  unappliedRecurringCount: number;
  onApplyRecurring: () => void;
}

export const KpiStats: React.FC<KpiStatsProps> = ({
  totalIncome,
  totalExpense,
  netCashflow,
  totalBudgetLimit,
  unappliedRecurringCount,
  onApplyRecurring,
}) => {
  const budgetUsagePercent = totalBudgetLimit > 0 ? (totalExpense / totalBudgetLimit) * 100 : 0;
  const isSurplus = netCashflow >= 0;

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm overflow-hidden">
      {/* Main Net Balance Header */}
      <div className="p-5 sm:p-7 bg-gradient-to-b from-white via-neutral-50/40 to-neutral-50/80 border-b border-neutral-100">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
            Sisa Saldo Kas Bulan Ini
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              isSurplus
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                : 'bg-rose-50 text-rose-800 border border-rose-200/60'
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>{isSurplus ? 'Surplus Finansial' : 'Posisi Defisit'}</span>
          </span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span
            className={`text-2xl sm:text-4xl font-extrabold font-mono tabular-nums tracking-tight ${
              isSurplus ? 'text-neutral-900' : 'text-rose-600'
            }`}
          >
            {isSurplus ? formatRupiah(netCashflow) : `-${formatRupiah(Math.abs(netCashflow))}`}
          </span>
        </div>

        {/* Minimalist Budget Usage Bar */}
        <div className="mt-5 pt-3.5 border-t border-neutral-200/50">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5 font-mono tabular-nums flex-wrap gap-1">
            <span>Pemakaian Anggaran: {budgetUsagePercent.toFixed(0)}%</span>
            <span>Batas: {formatRupiah(totalBudgetLimit)}</span>
          </div>
          <div className="h-2 w-full bg-neutral-200/80 rounded-full overflow-hidden">
            <div
              style={{ width: `${Math.min(100, budgetUsagePercent)}%` }}
              className={`h-full transition-all duration-300 ${
                budgetUsagePercent > 90
                  ? 'bg-rose-500'
                  : budgetUsagePercent > 75
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Income & Expense Breakdown Row */}
      <div className="grid grid-cols-2 divide-x divide-neutral-100 p-3.5 sm:p-5 bg-white text-xs">
        <div className="flex items-center gap-2 sm:gap-3 pl-1 sm:pl-2 min-w-0">
          <div className="p-2 sm:p-2.5 bg-emerald-50 text-emerald-700 rounded-xl sm:rounded-2xl shrink-0 border border-emerald-100">
            <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-neutral-400 font-medium block truncate text-[11px] sm:text-xs">Pemasukan</span>
            <span className="text-xs sm:text-base font-bold text-emerald-700 font-mono tabular-nums mt-0.5 block truncate">
              +{formatRupiah(totalIncome)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-5 min-w-0">
          <div className="p-2 sm:p-2.5 bg-rose-50 text-rose-700 rounded-xl sm:rounded-2xl shrink-0 border border-rose-100">
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-neutral-400 font-medium block truncate text-[11px] sm:text-xs">Pengeluaran</span>
            <span className="text-xs sm:text-base font-bold text-neutral-900 font-mono tabular-nums mt-0.5 block truncate">
              -{formatRupiah(totalExpense)}
            </span>
          </div>
        </div>
      </div>

      {/* Optional Auto Recurring Sync Notice (One-click) */}
      {unappliedRecurringCount > 0 && (
        <div className="px-4 sm:px-5 py-3 bg-amber-50/80 border-t border-amber-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-amber-950">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Ada {unappliedRecurringCount} tagihan/gaji rutin siap dicatat otomatis</span>
          </div>
          <button
            onClick={onApplyRecurring}
            className="text-xs font-semibold text-amber-900 hover:underline cursor-pointer self-start sm:self-auto py-0.5"
          >
            Terapkan Sekarang
          </button>
        </div>
      )}
    </div>
  );
};
