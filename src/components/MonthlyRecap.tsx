import React, { useState, useMemo } from 'react';
import { Transaction } from '../types/finance';
import {
  formatRupiah,
  formatCompactRupiah,
  getMonthLabel,
  getMonthYearKey,
  exportMonthlyRecapToCSV,
} from '../utils/formatters';
import {
  Download,
  CalendarRange,
  ArrowDownRight,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Layers,
  ChevronRight,
  Award,
} from 'lucide-react';

interface MonthlyRecapProps {
  transactions: Transaction[];
  currentMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
  onNavigateToTransactions: () => void;
}

interface MonthSummary {
  monthKey: string;
  monthLabel: string;
  income: number;
  expense: number;
  net: number;
  savingsRate: number;
  transactionCount: number;
  topCategory: string;
  topCategoryAmount: number;
  dailyAverageExpense: number;
  peakExpenseDay: string;
  peakExpenseAmount: number;
  status: 'Surplus Sangat Sehat' | 'Surplus' | 'Defisit' | 'Seimbang';
  incomeChangeMoM: number | null;
  expenseChangeMoM: number | null;
}

export const MonthlyRecap: React.FC<MonthlyRecapProps> = ({
  transactions,
  currentMonthKey,
  onSelectMonth,
  onNavigateToTransactions,
}) => {
  // 1. Group all transactions by monthKey
  const monthlyDataMap = useMemo(() => {
    const map = new Map<string, Transaction[]>();

    transactions.forEach((t) => {
      const key = getMonthYearKey(t.date);
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(t);
    });

    return map;
  }, [transactions]);

  // 2. Sort months descending (newest first)
  const sortedMonthKeys = useMemo(() => {
    return Array.from(monthlyDataMap.keys()).sort((a, b) => b.localeCompare(a));
  }, [monthlyDataMap]);

  // 3. Compute detailed metrics for each month
  const monthlySummaries: MonthSummary[] = useMemo(() => {
    const list: MonthSummary[] = [];

    // Temporary list sorted ascending to calculate MoM
    const ascendingKeys = [...sortedMonthKeys].reverse();
    const tempMap = new Map<string, MonthSummary>();

    ascendingKeys.forEach((key, index) => {
      const items = monthlyDataMap.get(key) || [];
      const income = items
        .filter((t) => t.type === 'pemasukan')
        .reduce((sum, t) => sum + t.amount, 0);
      const expense = items
        .filter((t) => t.type === 'pengeluaran')
        .reduce((sum, t) => sum + t.amount, 0);
      const net = income - expense;
      const savingsRate = income > 0 ? (net / income) * 100 : 0;

      // Group expense by category
      const catTotals: Record<string, number> = {};
      items
        .filter((t) => t.type === 'pengeluaran')
        .forEach((t) => {
          catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
        });

      let topCategory = '-';
      let topCategoryAmount = 0;
      Object.entries(catTotals).forEach(([cat, amt]) => {
        if (amt > topCategoryAmount) {
          topCategoryAmount = amt;
          topCategory = cat;
        }
      });

      // Daily burn & peak day
      const dayTotals: Record<string, number> = {};
      items
        .filter((t) => t.type === 'pengeluaran')
        .forEach((t) => {
          dayTotals[t.date] = (dayTotals[t.date] || 0) + t.amount;
        });

      let peakExpenseDay = '-';
      let peakExpenseAmount = 0;
      Object.entries(dayTotals).forEach(([d, amt]) => {
        if (amt > peakExpenseAmount) {
          peakExpenseAmount = amt;
          peakExpenseDay = d;
        }
      });

      const [yearStr, monthStr] = key.split('-');
      const daysInMonth = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10), 0).getDate();
      const dailyAverageExpense = daysInMonth > 0 ? expense / daysInMonth : 0;

      // MoM calculation
      let incomeChangeMoM: number | null = null;
      let expenseChangeMoM: number | null = null;
      if (index > 0) {
        const prevKey = ascendingKeys[index - 1];
        const prev = tempMap.get(prevKey);
        if (prev && prev.income > 0) {
          incomeChangeMoM = ((income - prev.income) / prev.income) * 100;
        }
        if (prev && prev.expense > 0) {
          expenseChangeMoM = ((expense - prev.expense) / prev.expense) * 100;
        }
      }

      let status: MonthSummary['status'] = 'Seimbang';
      if (net > 0) {
        status = savingsRate >= 30 ? 'Surplus Sangat Sehat' : 'Surplus';
      } else if (net < 0) {
        status = 'Defisit';
      }

      const summary: MonthSummary = {
        monthKey: key,
        monthLabel: getMonthLabel(key),
        income,
        expense,
        net,
        savingsRate,
        transactionCount: items.length,
        topCategory,
        topCategoryAmount,
        dailyAverageExpense,
        peakExpenseDay,
        peakExpenseAmount,
        status,
        incomeChangeMoM,
        expenseChangeMoM,
      };

      tempMap.set(key, summary);
      list.push(summary);
    });

    // Return descending
    return list.reverse();
  }, [sortedMonthKeys, monthlyDataMap]);

  // Active month summary for highlight card
  const [inspectedMonthKey, setInspectedMonthKey] = useState<string>(() => {
    return sortedMonthKeys.includes(currentMonthKey) ? currentMonthKey : sortedMonthKeys[0] || '2026-10';
  });

  const inspectedMonth = useMemo(() => {
    return monthlySummaries.find((m) => m.monthKey === inspectedMonthKey) || monthlySummaries[0] || null;
  }, [monthlySummaries, inspectedMonthKey]);

  // Overall Aggregated Totals
  const overallTotals = useMemo(() => {
    let totalIncome = 0;
    let totalExpense = 0;
    let totalTrx = 0;

    monthlySummaries.forEach((m) => {
      totalIncome += m.income;
      totalExpense += m.expense;
      totalTrx += m.transactionCount;
    });

    const totalNet = totalIncome - totalExpense;
    const avgSavingsRate = totalIncome > 0 ? (totalNet / totalIncome) * 100 : 0;
    const avgMonthlyExpense = monthlySummaries.length > 0 ? totalExpense / monthlySummaries.length : 0;

    return {
      totalIncome,
      totalExpense,
      totalNet,
      avgSavingsRate,
      avgMonthlyExpense,
      totalTrx,
      totalMonths: monthlySummaries.length,
    };
  }, [monthlySummaries]);

  // Bar chart scale
  const maxMonthValue = useMemo(() => {
    let max = 1;
    monthlySummaries.forEach((m) => {
      if (m.income > max) max = m.income;
      if (m.expense > max) max = m.expense;
    });
    return max;
  }, [monthlySummaries]);

  const handleSelectAndGo = (key: string) => {
    onSelectMonth(key);
    onNavigateToTransactions();
  };

  if (monthlySummaries.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-8 text-center space-y-3">
        <CalendarRange className="w-8 h-8 text-neutral-400 mx-auto" />
        <h3 className="text-base font-bold text-neutral-900">Belum Ada Data Rekap</h3>
        <p className="text-xs text-neutral-500 max-w-sm mx-auto">
          Catat transaksi pertama Anda untuk melihat rekapitulasi performa keuangan bulanan secara otomatis.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Card with Export Action */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-emerald-600 shrink-0" />
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 tracking-tight">
              Rekapitulasi Keuangan Per Bulan
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Pantau ringkasan pemasukan, pengeluaran, rasio tabungan, dan pertumbuhan finansial lintas periode.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportMonthlyRecapToCSV(monthlySummaries, `rekap-keuangan-semua-bulan.csv`)}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-xl transition-colors cursor-pointer border border-neutral-200/60 self-start sm:self-auto shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-neutral-600" />
          <span>Unduh Rekap CSV</span>
        </button>
      </div>

      {/* 2. Lifetime Aggregate Summary Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-neutral-400 text-[11px] font-medium block">Total Pemasukan Akumulatif</span>
          <span className="text-sm sm:text-lg font-bold text-emerald-700 font-mono tabular-nums mt-1 block">
            +{formatRupiah(overallTotals.totalIncome)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-1 block font-mono">
            {overallTotals.totalMonths} bulan tercatat
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-neutral-400 text-[11px] font-medium block">Total Pengeluaran Akumulatif</span>
          <span className="text-sm sm:text-lg font-bold text-neutral-900 font-mono tabular-nums mt-1 block">
            -{formatRupiah(overallTotals.totalExpense)}
          </span>
          <span className="text-[10px] text-neutral-400 mt-1 block font-mono">
            Rata-rata: {formatCompactRupiah(overallTotals.avgMonthlyExpense)}/bln
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-neutral-400 text-[11px] font-medium block">Total Tabungan Bersih (Net)</span>
          <span
            className={`text-sm sm:text-lg font-bold font-mono tabular-nums mt-1 block ${
              overallTotals.totalNet >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {overallTotals.totalNet >= 0 ? '+' : '-'}
            {formatRupiah(Math.abs(overallTotals.totalNet))}
          </span>
          <span className="text-[10px] text-neutral-400 mt-1 block font-mono">
            Rasio tabungan: {overallTotals.avgSavingsRate.toFixed(1)}%
          </span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200/80 shadow-2xs">
          <span className="text-neutral-400 text-[11px] font-medium block">Aktivitas Pencatatan</span>
          <span className="text-sm sm:text-lg font-bold text-neutral-900 font-mono tabular-nums mt-1 block">
            {overallTotals.totalTrx} Transaksi
          </span>
          <span className="text-[10px] text-neutral-400 mt-1 block font-mono">
            Otomatis terarsip aman
          </span>
        </div>
      </div>

      {/* 3. Visual Monthly Trend Comparison (Bar Chart) */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-sm font-bold text-neutral-900">
              Grafik Komparasi Pemasukan vs Pengeluaran Antar-Bulan
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Klik pada bar bulan untuk melihat rincian mendalam di kartu bawah
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-600 shrink-0" />
              <span>Pemasukan</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-neutral-800 shrink-0" />
              <span>Pengeluaran</span>
            </div>
          </div>
        </div>

        {/* Bar chart container */}
        <div className="pt-2 overflow-x-auto">
          <div className="min-w-[340px] flex items-end justify-between gap-3 sm:gap-6 h-48 border-b border-neutral-200 pb-2">
            {[...monthlySummaries].reverse().map((m) => {
              const isSelected = m.monthKey === inspectedMonthKey;
              const incomeHeight = maxMonthValue > 0 ? (m.income / maxMonthValue) * 100 : 0;
              const expenseHeight = maxMonthValue > 0 ? (m.expense / maxMonthValue) * 100 : 0;

              return (
                <div
                  key={m.monthKey}
                  onClick={() => setInspectedMonthKey(m.monthKey)}
                  className={`flex-1 flex flex-col items-center justify-end h-full gap-1.5 group cursor-pointer p-1.5 rounded-xl transition-all ${
                    isSelected ? 'bg-neutral-100/90 ring-1 ring-neutral-300' : 'hover:bg-neutral-50'
                  }`}
                  title={`${m.monthLabel}: Masuk ${formatRupiah(m.income)}, Keluar ${formatRupiah(m.expense)}`}
                >
                  {/* Bars */}
                  <div className="w-full flex items-end justify-center gap-1.5 sm:gap-2 h-36">
                    {/* Income Bar */}
                    <div
                      style={{ height: `${Math.max(6, incomeHeight)}%` }}
                      className="w-3 sm:w-5 bg-emerald-600 rounded-t-md transition-all group-hover:brightness-110 relative"
                    />
                    {/* Expense Bar */}
                    <div
                      style={{ height: `${Math.max(6, expenseHeight)}%` }}
                      className="w-3 sm:w-5 bg-neutral-800 rounded-t-md transition-all group-hover:brightness-110 relative"
                    />
                  </div>

                  {/* Month Label */}
                  <span
                    className={`text-[10px] sm:text-xs font-semibold truncate ${
                      isSelected ? 'text-neutral-900 font-bold' : 'text-neutral-500'
                    }`}
                  >
                    {m.monthLabel.split(' ')[0].slice(0, 3)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Deep Dive Highlight for Inspected Month */}
      {inspectedMonth && (
        <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
              <h3 className="text-sm font-bold text-neutral-900">
                Sorotan Analisis: {inspectedMonth.monthLabel}
              </h3>
            </div>

            <button
              type="button"
              onClick={() => handleSelectAndGo(inspectedMonth.monthKey)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline cursor-pointer self-start sm:self-auto"
            >
              <span>Buka Catatan Transaksi Bulan Ini</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-xs">
            {/* Net Surplus / Defisit */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
              <span className="text-neutral-400 block text-[11px]">Sisa Kas Bulan Ini</span>
              <span
                className={`text-sm sm:text-base font-bold font-mono tabular-nums mt-0.5 block ${
                  inspectedMonth.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {inspectedMonth.net >= 0 ? '+' : '-'}
                {formatRupiah(Math.abs(inspectedMonth.net))}
              </span>
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Rasio Simpanan: {inspectedMonth.savingsRate.toFixed(1)}%
              </span>
            </div>

            {/* Rata-rata Harian */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
              <span className="text-neutral-400 block text-[11px]">Rata-rata Pengeluaran / Hari</span>
              <span className="text-sm sm:text-base font-bold text-neutral-900 font-mono tabular-nums mt-0.5 block">
                {formatRupiah(inspectedMonth.dailyAverageExpense)}
              </span>
              <span className="text-[10px] text-neutral-500 mt-1 block">
                Kecepatan belanja harian
              </span>
            </div>

            {/* Kategori Terbesar */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
              <span className="text-neutral-400 block text-[11px]">Pos Pengeluaran Terbesar</span>
              <span className="text-xs sm:text-sm font-bold text-neutral-900 truncate mt-0.5 block">
                {inspectedMonth.topCategory}
              </span>
              <span className="text-[10px] text-neutral-500 font-mono tabular-nums mt-1 block">
                {formatRupiah(inspectedMonth.topCategoryAmount)}
              </span>
            </div>

            {/* Pertumbuhan MoM */}
            <div className="p-3 bg-neutral-50 rounded-2xl border border-neutral-100">
              <span className="text-neutral-400 block text-[11px]">Tren vs Bulan Sebelumnya</span>
              <div className="mt-1 flex items-center gap-1.5">
                {inspectedMonth.expenseChangeMoM !== null ? (
                  inspectedMonth.expenseChangeMoM <= 0 ? (
                    <div className="flex items-center gap-1 text-emerald-700 font-bold font-mono text-xs sm:text-sm">
                      <TrendingDown className="w-3.5 h-3.5" />
                      <span>{Math.abs(inspectedMonth.expenseChangeMoM).toFixed(1)}% lebih hemat</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-rose-600 font-bold font-mono text-xs sm:text-sm">
                      <TrendingUp className="w-3.5 h-3.5" />
                      <span>+{inspectedMonth.expenseChangeMoM.toFixed(1)}% pengeluaran</span>
                    </div>
                  )
                ) : (
                  <span className="text-neutral-400 text-xs">Periode Awal</span>
                )}
              </div>
              <span className="text-[10px] text-neutral-400 mt-1 block">
                Komparasi bulan ke bulan
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 5. Rekap Riwayat Per Bulan (Table on Desktop, Sleek Cards on Mobile) */}
      <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div>
            <h3 className="text-base font-bold text-neutral-900">
              Daftar Rekap Bulanan Lengkap
            </h3>
            <span className="text-xs text-neutral-400">
              {monthlySummaries.length} bulan tercatat dalam pembukuan
            </span>
          </div>
        </div>

        {/* Mobile View: Clean, Responsive Cards (No horizontal squeeze or button collision) */}
        <div className="sm:hidden space-y-3">
          {monthlySummaries.map((m) => {
            const isSelected = m.monthKey === currentMonthKey;
            const isSurplus = m.net >= 0;

            return (
              <div
                key={m.monthKey}
                className={`p-4 rounded-2xl border transition-all ${
                  isSelected
                    ? 'border-emerald-300 bg-emerald-50/20'
                    : 'border-neutral-200 bg-neutral-50/50 hover:bg-white'
                }`}
              >
                {/* Top: Month label & Net cashflow */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900">{m.monthLabel}</span>
                    {isSelected && (
                      <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                        Aktif
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-xs font-bold font-mono tabular-nums ${
                      isSurplus ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {isSurplus ? '+' : '-'}
                    {formatRupiah(Math.abs(m.net))}
                  </span>
                </div>

                {/* Subtitle breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-neutral-200/60 text-xs">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Pemasukan</span>
                    <span className="text-xs font-semibold text-emerald-700 font-mono tabular-nums">
                      +{formatRupiah(m.income)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Pengeluaran</span>
                    <span className="text-xs font-semibold text-neutral-900 font-mono tabular-nums">
                      -{formatRupiah(m.expense)}
                    </span>
                  </div>
                </div>

                {/* Action button */}
                <div className="mt-3 pt-2.5 border-t border-neutral-200/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-neutral-500 font-mono">
                    {m.transactionCount} transaksi · Rasio {m.savingsRate.toFixed(0)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSelectAndGo(m.monthKey)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-800 hover:text-emerald-700 cursor-pointer p-1"
                  >
                    <span>Lihat Transaksi</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop View: Full Spacious Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Periode Bulan</th>
                <th className="py-3 px-3 text-right">Pemasukan</th>
                <th className="py-3 px-3 text-right">Pengeluaran</th>
                <th className="py-3 px-3 text-right">Sisa Bersih (Net)</th>
                <th className="py-3 px-3 text-center">Rasio Tabungan</th>
                <th className="py-3 px-3">Pos Terbesar</th>
                <th className="py-3 px-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 font-mono tabular-nums">
              {monthlySummaries.map((m) => {
                const isSelected = m.monthKey === currentMonthKey;
                const isSurplus = m.net >= 0;

                return (
                  <tr
                    key={m.monthKey}
                    className={`hover:bg-neutral-50/80 transition-colors ${
                      isSelected ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <td className="py-3 px-3 font-sans font-bold text-neutral-900">
                      <div className="flex items-center gap-2">
                        <span>{m.monthLabel}</span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded-md">
                            Bulan Aktif
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-neutral-400 font-mono block mt-0.5 font-normal">
                        {m.transactionCount} catatan transaksi
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-emerald-700">
                      +{formatRupiah(m.income)}
                    </td>
                    <td className="py-3 px-3 text-right font-semibold text-neutral-900">
                      -{formatRupiah(m.expense)}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      <span className={isSurplus ? 'text-emerald-700' : 'text-rose-600'}>
                        {isSurplus ? '+' : '-'}
                        {formatRupiah(Math.abs(m.net))}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block font-semibold ${
                          m.savingsRate >= 20
                            ? 'text-emerald-700'
                            : m.savingsRate > 0
                            ? 'text-neutral-700'
                            : 'text-rose-600'
                        }`}
                      >
                        {m.savingsRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 font-sans text-neutral-700">
                      <span className="block truncate max-w-[140px] font-medium">
                        {m.topCategory}
                      </span>
                      <span className="text-[11px] text-neutral-400 font-mono block">
                        {formatRupiah(m.topCategoryAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-sans">
                      <button
                        type="button"
                        onClick={() => handleSelectAndGo(m.monthKey)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <span>Pilih Bulan</span>
                        <ChevronRight className="w-3.5 h-3.5 text-neutral-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
