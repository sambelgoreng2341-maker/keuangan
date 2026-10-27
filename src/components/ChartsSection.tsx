import React, { useState } from 'react';
import { Transaction, TransactionCategory } from '../types/finance';
import { formatCompactRupiah, formatRupiah } from '../utils/formatters';

interface ChartsSectionProps {
  transactions: Transaction[];
  daysInMonth: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  'Sewa & Tempat Tinggal': '#6366f1', // Indigo
  'Makanan & Minuman': '#f59e0b', // Amber
  'Belanja & Kebutuhan': '#06b6d4', // Cyan
  'Tagihan & Utilitas': '#8b5cf6', // Violet
  'Transportasi': '#10b981', // Emerald
  'Investasi & Tabungan': '#3b82f6', // Blue
  'Hiburan & Langganan': '#ec4899', // Pink
  'Kesehatan': '#ef4444', // Red
  'Gaji & Upah': '#14b8a6', // Teal
  'Lain-lain': '#6b7280', // Gray
};

export const ChartsSection: React.FC<ChartsSectionProps> = ({ transactions, daysInMonth }) => {
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [hoveredDay, setHoveredDay] = useState<{ day: number; expense: number; income: number } | null>(
    null
  );

  // Filter expenses
  const expenses = transactions.filter((t) => t.type === 'pengeluaran');
  const totalExpense = expenses.reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categoryTotals: Record<string, number> = {};
  expenses.forEach((t) => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const categoryList = Object.entries(categoryTotals)
    .map(([cat, amount]) => ({
      category: cat as TransactionCategory,
      amount,
      percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
      color: CATEGORY_COLORS[cat] || '#9ca3af',
    }))
    .sort((a, b) => b.amount - a.amount);

  // Daily distribution for the month
  const dailyData: { day: number; expense: number; income: number }[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dayStr = String(i).padStart(2, '0');
    const dayTrx = transactions.filter((t) => t.date.slice(8, 10) === dayStr);
    const dayExpense = dayTrx
      .filter((t) => t.type === 'pengeluaran')
      .reduce((s, t) => s + t.amount, 0);
    const dayIncome = dayTrx
      .filter((t) => t.type === 'pemasukan')
      .reduce((s, t) => s + t.amount, 0);

    dailyData.push({ day: i, expense: dayExpense, income: dayIncome });
  }

  const maxDailyExpense = Math.max(...dailyData.map((d) => d.expense), 1);

  // SVG Donut calculation
  let cumulativeAngle = 0;
  const radius = 64;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* 1. Donut Chart: Alokasi Pengeluaran per Kategori */}
      <div className="lg:col-span-5 bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <h2 className="text-sm font-semibold text-neutral-900">Alokasi Pengeluaran Bulanan</h2>
            <span className="text-xs text-neutral-500 font-mono tabular-nums">
              {formatCompactRupiah(totalExpense)} total
            </span>
          </div>

          {totalExpense === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              Belum ada data pengeluaran di bulan ini.
            </div>
          ) : (
            <div className="mt-4 flex flex-col sm:flex-row items-center gap-6">
              {/* SVG Donut */}
              <div className="relative w-40 h-40 shrink-0 flex items-center justify-center">
                <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="20"
                  />
                  {categoryList.map((item) => {
                    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                    const strokeDashoffset = -((cumulativeAngle / 100) * circumference);
                    cumulativeAngle += item.percentage;
                    const isHovered = hoveredCategory === item.category;

                    return (
                      <circle
                        key={item.category}
                        cx="80"
                        cy="80"
                        r={radius}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={isHovered ? 24 : 20}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        className="transition-all duration-200 cursor-pointer"
                        onMouseEnter={() => setHoveredCategory(item.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-xs text-neutral-500">
                    {hoveredCategory ? 'Kategori' : 'Proporsi'}
                  </span>
                  <span className="text-sm font-bold text-neutral-900 font-mono tabular-nums">
                    {hoveredCategory
                      ? `${categoryList.find((c) => c.category === hoveredCategory)?.percentage.toFixed(0)}%`
                      : `${categoryList.length} Pos`}
                  </span>
                </div>
              </div>

              {/* Category Legend */}
              <div className="flex-1 w-full space-y-2 max-h-48 overflow-y-auto pr-1">
                {categoryList.map((item) => (
                  <div
                    key={item.category}
                    onMouseEnter={() => setHoveredCategory(item.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                      hoveredCategory === item.category ? 'bg-neutral-100' : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span
                        className="w-2.5 h-2.5 rounded-xs shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="truncate text-neutral-700 font-medium">{item.category}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-mono tabular-nums text-neutral-900 font-semibold">
                        {formatCompactRupiah(item.amount)}
                      </span>
                      <span className="text-neutral-400 font-mono tabular-nums ml-1.5">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Daily Spending Timeline */}
      <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-neutral-200 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">
                Pola Pengeluaran Harian Bulanan
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Grafik batang memantau konsistensi dan lonjakan pengeluaran tiap tanggal
              </p>
            </div>
            {hoveredDay && (
              <div className="text-right">
                <span className="text-xs text-neutral-500">Tgl {hoveredDay.day}: </span>
                <span className="text-xs font-semibold text-rose-700 font-mono tabular-nums">
                  {formatRupiah(hoveredDay.expense)}
                </span>
              </div>
            )}
          </div>

          <div className="mt-6">
            {/* Chart Area */}
            <div className="h-40 flex items-end gap-1 sm:gap-1.5 pt-4 pb-1 border-b border-neutral-200">
              {dailyData.map((d) => {
                const heightPct = (d.expense / maxDailyExpense) * 100;
                const hasExpense = d.expense > 0;
                const hasIncome = d.income > 0;

                return (
                  <div
                    key={d.day}
                    onMouseEnter={() => setHoveredDay(d)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 flex flex-col items-center justify-end h-full group relative cursor-pointer"
                  >
                    {/* Tooltip */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center pointer-events-none whitespace-nowrap bg-neutral-900 text-white text-[11px] px-2 py-1 rounded shadow-md">
                      <span>Tgl {d.day}</span>
                      <span className="font-mono tabular-nums text-rose-300">
                        {formatRupiah(d.expense)}
                      </span>
                      {hasIncome && (
                        <span className="font-mono tabular-nums text-emerald-300">
                          +{formatRupiah(d.income)}
                        </span>
                      )}
                    </div>

                    {/* Bar */}
                    <div
                      style={{ height: `${Math.max(hasExpense ? 8 : 2, heightPct)}%` }}
                      className={`w-full rounded-t-xs transition-all duration-150 ${
                        hasExpense
                          ? heightPct > 70
                            ? 'bg-rose-500 group-hover:bg-rose-600'
                            : 'bg-emerald-600 group-hover:bg-emerald-700'
                          : 'bg-neutral-100'
                      }`}
                    />
                  </div>
                );
              })}
            </div>

            {/* X-axis ticks */}
            <div className="flex justify-between text-[10px] text-neutral-400 font-mono mt-1 px-1">
              <span>01</span>
              <span>05</span>
              <span>10</span>
              <span>15</span>
              <span>20</span>
              <span>25</span>
              <span>{daysInMonth}</span>
            </div>
          </div>
        </div>

        {/* Chart Footer Indicator */}
        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
              <span>Pengeluaran Normal</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-500 inline-block" />
              <span>Lonjakan Transaksi</span>
            </span>
          </div>
          <span className="font-mono tabular-nums text-neutral-400">
            {transactions.length} total transaksi
          </span>
        </div>
      </div>
    </div>
  );
};
