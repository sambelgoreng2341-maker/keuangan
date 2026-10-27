import React, { useState } from 'react';
import { Target, AlertTriangle, CheckCircle, Edit3, Plus, X } from 'lucide-react';
import { CategoryBudget, Transaction, TransactionCategory } from '../types/finance';
import { formatCompactRupiah, formatRupiah } from '../utils/formatters';

interface BudgetTrackerProps {
  budgets: CategoryBudget[];
  transactions: Transaction[];
  onUpdateBudgets: (newBudgets: CategoryBudget[]) => void;
}

const ALL_CATEGORIES: TransactionCategory[] = [
  'Makanan & Minuman',
  'Belanja & Kebutuhan',
  'Tagihan & Utilitas',
  'Transportasi',
  'Sewa & Tempat Tinggal',
  'Hiburan & Langganan',
  'Kesehatan',
  'Investasi & Tabungan',
  'Pendidikan',
  'Lain-lain',
];

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  budgets,
  transactions,
  onUpdateBudgets,
}) => {
  const [editingBudget, setEditingBudget] = useState<{
    category: TransactionCategory;
    limit: number;
    threshold: number;
  } | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<TransactionCategory>('Makanan & Minuman');
  const [newLimit, setNewLimit] = useState<number>(1000000);

  // Calculate actual spending per category
  const expenseByCategory: Record<string, number> = {};
  transactions
    .filter((t) => t.type === 'pengeluaran')
    .forEach((t) => {
      expenseByCategory[t.category] = (expenseByCategory[t.category] || 0) + t.amount;
    });

  const handleSaveEdit = () => {
    if (!editingBudget) return;
    const updated = budgets.map((b) =>
      b.category === editingBudget.category
        ? {
            ...b,
            monthlyLimit: editingBudget.limit,
            alertThresholdPercent: editingBudget.threshold,
          }
        : b
    );
    onUpdateBudgets(updated);
    setEditingBudget(null);
  };

  const handleAddNewBudget = (e: React.FormEvent) => {
    e.preventDefault();
    if (budgets.some((b) => b.category === newCategory)) {
      alert('Batas anggaran untuk kategori ini sudah ada.');
      return;
    }
    const updated = [
      ...budgets,
      {
        category: newCategory,
        monthlyLimit: Number(newLimit) || 500000,
        alertThresholdPercent: 80,
      },
    ];
    onUpdateBudgets(updated);
    setIsAddOpen(false);
  };

  const handleDeleteBudget = (cat: TransactionCategory) => {
    if (confirm(`Hapus batas anggaran untuk ${cat}?`)) {
      onUpdateBudgets(budgets.filter((b) => b.category !== cat));
    }
  };

  return (
    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-neutral-900">
              Pemantau Batas Anggaran Bulanan
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Sistem otomatis memantau persentase konsumsi dan memberikan sinyal peringatan sebelum anggaran habis.
          </p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Pos Anggaran</span>
        </button>
      </div>

      {/* Grid of Budget Progress Items */}
      {budgets.length === 0 ? (
        <div className="py-12 px-4 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl space-y-1">
          <p className="font-semibold text-neutral-700">Belum ada pos anggaran diatur di database.</p>
          <p className="text-[11px] text-neutral-500">
            Klik tombol &quot;Tambah Pos Anggaran&quot; di atas untuk menetapkan batas pengeluaran bulanan Anda.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => {
          const spent = expenseByCategory[b.category] || 0;
          const percent = b.monthlyLimit > 0 ? (spent / b.monthlyLimit) * 100 : 0;
          const remaining = b.monthlyLimit - spent;
          const isOver = spent > b.monthlyLimit;
          const isWarning = !isOver && percent >= b.alertThresholdPercent;

          return (
            <div
              key={b.category}
              className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 hover:bg-white hover:border-neutral-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="truncate">
                    <span className="text-xs font-semibold text-neutral-900 block truncate">
                      {b.category}
                    </span>
                    <span className="text-[11px] text-neutral-500 font-mono tabular-nums">
                      Batas: {formatCompactRupiah(b.monthlyLimit)}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setEditingBudget({
                        category: b.category,
                        limit: b.monthlyLimit,
                        threshold: b.alertThresholdPercent,
                      })
                    }
                    className="p-1 text-neutral-400 hover:text-neutral-700 rounded-md transition-colors cursor-pointer"
                    title="Ubah Anggaran"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-2 w-full bg-neutral-200 rounded-full overflow-hidden">
                    <div
                      style={{ width: `${Math.min(100, percent)}%` }}
                      className={`h-full transition-all duration-300 ${
                        isOver
                          ? 'bg-rose-600'
                          : isWarning
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                    />
                  </div>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-xs font-mono tabular-nums">
                  <span className="text-neutral-600">{formatRupiah(spent)}</span>
                  <span
                    className={`font-semibold ${
                      isOver ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-neutral-700'
                    }`}
                  >
                    {percent.toFixed(0)}%
                  </span>
                </div>
              </div>

              {/* Status indicator note */}
              <div className="mt-3 pt-2.5 border-t border-neutral-200/60 flex items-center justify-between text-[11px]">
                {isOver ? (
                  <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Overbudget {formatCompactRupiah(Math.abs(remaining))}</span>
                  </span>
                ) : isWarning ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>Mendekati Batas ({formatCompactRupiah(remaining)} sisa)</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-700">
                    <CheckCircle className="w-3 h-3 shrink-0" />
                    <span>Aman ({formatCompactRupiah(remaining)} sisa)</span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Edit Budget Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full p-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">
                Ubah Batas: {editingBudget.category}
              </h3>
              <button
                onClick={() => setEditingBudget(null)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block">
                  Batas Anggaran Bulanan (Rp)
                </label>
                <input
                  type="number"
                  min="0"
                  step="50000"
                  value={editingBudget.limit}
                  onChange={(e) =>
                    setEditingBudget({ ...editingBudget, limit: Number(e.target.value) })
                  }
                  className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block">
                  Batas Peringatan ({editingBudget.threshold}%)
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  step="5"
                  value={editingBudget.threshold}
                  onChange={(e) =>
                    setEditingBudget({ ...editingBudget, threshold: Number(e.target.value) })
                  }
                  className="mt-2 w-full accent-emerald-600"
                />
                <div className="flex justify-between text-[10px] text-neutral-400 mt-1 font-mono">
                  <span>50%</span>
                  <span>75%</span>
                  <span>90%</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  handleDeleteBudget(editingBudget.category);
                  setEditingBudget(null);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 cursor-pointer font-medium"
              >
                Hapus Pos Ini
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBudget(null)}
                  className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Budget Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddNewBudget}
            className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-sm w-full p-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">Tambah Pos Anggaran Baru</h3>
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 block">Kategori</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as TransactionCategory)}
                  className="mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {ALL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block">
                  Batas Bulanan (Rp)
                </label>
                <input
                  type="number"
                  min="50000"
                  step="50000"
                  value={newLimit}
                  onChange={(e) => setNewLimit(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddOpen(false)}
                className="px-3 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Tambahkan Pos
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
