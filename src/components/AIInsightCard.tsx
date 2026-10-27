import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { AIInsightData, CategoryBudget, Transaction } from '../types/finance';
import { formatRupiah } from '../utils/formatters';

import { computeLocalFinancialInsights } from '../utils/localParsers';

interface AIInsightCardProps {
  currentMonthName: string;
  totalIncome: number;
  totalExpense: number;
  netCashflow: number;
  budgets: CategoryBudget[];
  transactions: Transaction[];
}

export const AIInsightCard: React.FC<AIInsightCardProps> = ({
  currentMonthName,
  totalIncome,
  totalExpense,
  netCashflow,
  budgets,
  transactions,
}) => {
  const [data, setData] = useState<AIInsightData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Calculate top 3 expense categories
      const catMap: Record<string, number> = {};
      transactions
        .filter((t) => t.type === 'pengeluaran')
        .forEach((t) => {
          catMap[t.category] = (catMap[t.category] || 0) + t.amount;
        });

      const topCategories = Object.entries(catMap)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      let insightData: AIInsightData | null = null;

      try {
        const res = await fetch('/api/financial-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            monthName: currentMonthName,
            totalIncome,
            totalExpense,
            balance: netCashflow,
            budgets,
            topCategories,
          }),
        });

        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            insightData = json.data;
          }
        }
      } catch {
        // Silently catch network/static hosting 404 to trigger local fallback
      }

      // Fallback seamlessly to local intelligent analysis if server route is not present (e.g. Cloudflare Pages static)
      if (!insightData) {
        insightData = computeLocalFinancialInsights({
          monthName: currentMonthName,
          totalIncome,
          totalExpense,
          balance: netCashflow,
          budgets,
          topCategories,
        });
      }

      setData(insightData);
    } catch (err: any) {
      console.warn('Financial insights calculation error:', err);
      // Even on unexpected error, provide fallback
      setData(
        computeLocalFinancialInsights({
          monthName: currentMonthName,
          totalIncome,
          totalExpense,
          balance: netCashflow,
          budgets,
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [currentMonthName, totalIncome, totalExpense]);

  const score = data?.financialScore ?? 75;

  return (
    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-neutral-900">
              Analisis Kesehatan Finansial Bulanan
            </h2>
            <p className="text-xs text-neutral-500">
              Diagnosa otomatis pemasukan, pengeluaran, dan potensi kebocoran dana untuk bulan{' '}
              {currentMonthName}.
            </p>
          </div>
        </div>

        <button
          onClick={fetchInsights}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Perbarui Analisis</span>
        </button>
      </div>

      {isLoading && !data ? (
        <div className="py-12 text-center text-xs text-neutral-400">
          Sedang menghitung evaluasi arus kas bulanan...
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Headline banner & score */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200/80 items-center">
            <div className="md:col-span-1 text-center md:border-r border-neutral-200 pr-0 md:pr-4">
              <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                Indeks Kesehatan
              </span>
              <div className="text-4xl font-extrabold text-neutral-900 font-mono tabular-nums mt-0.5">
                {score}
                <span className="text-xs text-neutral-400 font-normal">/100</span>
              </div>
              <span
                className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded ${
                  score >= 75
                    ? 'bg-emerald-100 text-emerald-800'
                    : score >= 50
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-rose-100 text-rose-800'
                }`}
              >
                {data.healthStatus}
              </span>
            </div>

            <div className="md:col-span-3">
              <h3 className="text-sm font-bold text-neutral-900 leading-snug">
                {data.headline}
              </h3>
              <p className="text-xs text-neutral-600 mt-1">
                Berdasarkan rasio pemasukan Rp {totalIncome.toLocaleString('id-ID')} terhadap
                pengeluaran Rp {totalExpense.toLocaleString('id-ID')} dengan sisa kas bersih{' '}
                {netCashflow >= 0 ? '+' : ''}
                {formatRupiah(netCashflow)}.
              </p>
            </div>
          </div>

          {/* Insights checklist */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
              Hasil Temuan & Evaluasi
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {data.insights.map((insight, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white border border-neutral-200 rounded-xl flex items-start gap-2.5 text-xs text-neutral-700"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recommendation & Risk Alert */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-bold">
                <TrendingUp className="w-4 h-4 text-emerald-700" />
                <span>Rekomendasi Tabungan & Investasi</span>
              </div>
              <p className="text-xs text-emerald-800">{data.savingsRecommendation}</p>
            </div>

            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 text-xs font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                <span>Titik Waspada Pengeluaran</span>
              </div>
              <p className="text-xs text-amber-800">{data.riskAlert}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-xs text-neutral-500">{error || 'Data analisis belum siap.'}</div>
      )}
    </div>
  );
};
