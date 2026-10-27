import React from 'react';
import { ChevronLeft, ChevronRight, Calendar, Zap, CheckCircle2 } from 'lucide-react';
import { getMonthLabel } from '../utils/formatters';
import { RecurringTemplate } from '../types/finance';

interface MonthlyHeaderProps {
  currentMonthKey: string; // e.g. "2026-10"
  onChangeMonth: (newKey: string) => void;
  unappliedRecurring: RecurringTemplate[];
  onApplyRecurring: () => void;
  totalAppliedRecurringCount: number;
}

export const MonthlyHeader: React.FC<MonthlyHeaderProps> = ({
  currentMonthKey,
  onChangeMonth,
  unappliedRecurring,
  onApplyRecurring,
  totalAppliedRecurringCount,
}) => {
  const handlePrev = () => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    onChangeMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNext = () => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    onChangeMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    onChangeMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  };

  const isCurrentMonth = (() => {
    const now = new Date();
    return currentMonthKey === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const unappliedTotal = unappliedRecurring.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="space-y-3">
      {/* Top Header Row with Month Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Pemantauan Finansial</span>
            <span aria-hidden="true">·</span>
            <span>Otomatisasi Bulanan</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 mt-0.5">
            Laporan Keuangan {getMonthLabel(currentMonthKey)}
          </h1>
        </div>

        {/* Month Navigation Strip */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto bg-white p-1 rounded-lg border border-neutral-200 shadow-xs">
          <button
            onClick={handlePrev}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1 text-sm font-semibold text-neutral-900 min-w-[130px] justify-center tabular-nums">
            <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{getMonthLabel(currentMonthKey)}</span>
          </div>

          <button
            onClick={handleNext}
            className="p-1.5 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {!isCurrentMonth && (
            <button
              onClick={handleCurrentMonth}
              className="ml-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
            >
              Bulan Ini
            </button>
          )}
        </div>
      </div>

      {/* Automation Notification Strip */}
      {unappliedRecurring.length > 0 ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl text-neutral-800">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-800 shrink-0">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-950">
                Otomatisasi Transaksi Rutin Siap Diterapkan
              </p>
              <p className="text-xs text-amber-800 mt-0.5">
                Ada {unappliedRecurring.length} tagihan/pemasukan rutin (Rp{' '}
                {unappliedTotal.toLocaleString('id-ID')}) yang terjadwal untuk bulan{' '}
                {getMonthLabel(currentMonthKey)}.
              </p>
            </div>
          </div>
          <button
            onClick={onApplyRecurring}
            className="self-start sm:self-auto px-3.5 py-1.5 text-xs font-medium text-white bg-amber-700 hover:bg-amber-800 rounded-lg shadow-xs transition-colors whitespace-nowrap cursor-pointer shrink-0"
          >
            Terapkan Rutin Otomatis
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between p-3 bg-neutral-100/80 border border-neutral-200 rounded-lg text-xs text-neutral-600">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Otomatisasi aktif: {totalAppliedRecurringCount} transaksi rutin telah sinkron tercatat
              di bulan {getMonthLabel(currentMonthKey)}.
            </span>
          </div>
          <span className="text-neutral-400 hidden sm:inline">Sinkronisasi Real-time</span>
        </div>
      )}
    </div>
  );
};
