import React, { useState } from 'react';
import {
  Transaction,
} from '../types/finance';
import { formatRupiah, formatIndonesianDate, exportTransactionsToCSV } from '../utils/formatters';
import {
  Search,
  Download,
  Trash2,
  Edit2,
  ArrowDownRight,
  ArrowUpRight,
  Receipt,
  Camera,
} from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onViewReceipt: (transaction: Transaction) => void;
  currentMonthName: string;
}

export const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  onDeleteTransaction,
  onEditTransaction,
  onViewReceipt,
  currentMonthName,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'pemasukan' | 'pengeluaran'>('all');
  const [hasReceiptOnly, setHasReceiptOnly] = useState<boolean>(false);

  const filtered = transactions.filter((t) => {
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (hasReceiptOnly && !t.receiptUrl) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchMerchant = (t.merchant || '').toLowerCase().includes(q);
      const matchDesc = (t.description || '').toLowerCase().includes(q);
      const matchCat = (t.category || '').toLowerCase().includes(q);
      if (!matchMerchant && !matchDesc && !matchCat) return false;
    }
    return true;
  });

  // Sort newest first
  filtered.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-sm p-5 sm:p-6 space-y-4">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-neutral-900 tracking-tight">
            Riwayat Transaksi
          </h2>
          <span className="text-xs text-neutral-400">
            {filtered.length} transaksi di {currentMonthName}
          </span>
        </div>

        {/* Filter and CSV button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setHasReceiptOnly(!hasReceiptOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer border ${
              hasReceiptOnly
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-2xs'
                : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200 text-neutral-600'
            }`}
          >
            <Camera className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hanya Ada Struk</span>
          </button>

          <button
            onClick={() =>
              exportTransactionsToCSV(
                filtered,
                `keuangan-${currentMonthName.replace(/\s+/g, '-')}.csv`
              )
            }
            className="p-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer border border-neutral-200/80"
            title="Unduh CSV"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Search & Segmented Filter */}
      <div className="flex flex-col sm:flex-row gap-2.5">
        <div className="flex-1 relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari toko, makanan, belanja..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50/50"
          />
        </div>

        <div className="flex items-center p-1 bg-neutral-100 rounded-xl text-xs font-medium w-full sm:w-auto justify-between sm:justify-start">
          <button
            onClick={() => setTypeFilter('all')}
            className={`flex-1 sm:flex-none text-center px-3 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'all'
                ? 'bg-white text-neutral-900 font-semibold shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Semua
          </button>
          <button
            onClick={() => setTypeFilter('pengeluaran')}
            className={`flex-1 sm:flex-none text-center px-3 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'pengeluaran'
                ? 'bg-white text-rose-700 font-semibold shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Keluar
          </button>
          <button
            onClick={() => setTypeFilter('pemasukan')}
            className={`flex-1 sm:flex-none text-center px-3 py-1.5 sm:py-1 rounded-lg transition-all cursor-pointer ${
              typeFilter === 'pemasukan'
                ? 'bg-white text-emerald-700 font-semibold shadow-2xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Masuk
          </button>
        </div>
      </div>

      {/* Transaction List Items */}
      {filtered.length === 0 ? (
        <div className="py-14 px-4 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl space-y-1.5">
          <p className="font-semibold text-neutral-700">
            {transactions.length === 0
              ? 'Belum ada catatan transaksi di database pada periode ini.'
              : 'Tidak ada transaksi yang cocok dengan filter pencarian.'}
          </p>
          <p className="text-[11px] text-neutral-500">
            {transactions.length === 0
              ? 'Klik tombol "Catat" untuk mulai mencatat mutasi pemasukan atau pengeluaran baru.'
              : 'Coba ubah kata kunci pencarian atau reset filter tipe.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-neutral-100 border border-neutral-200/80 rounded-2xl overflow-hidden">
          {filtered.map((t) => {
            const isIncome = t.type === 'pemasukan';
            const hasReceipt = Boolean(t.receiptUrl);

            return (
              <div
                key={t.id}
                className="p-3 sm:p-4 hover:bg-neutral-50/80 transition-colors"
              >
                {/* Primary Row: Left (Icon + Merchant + Struk badge) vs Right (Amount + Desktop buttons) */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div
                      className={`p-2 sm:p-2.5 rounded-xl shrink-0 ${
                        isIncome
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                          : 'bg-neutral-100 text-neutral-600'
                      }`}
                    >
                      {isIncome ? (
                        <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-neutral-900 truncate max-w-[140px] sm:max-w-none">
                          {t.merchant}
                        </span>

                        {hasReceipt && (
                          <button
                            type="button"
                            onClick={() => onViewReceipt(t)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 hover:bg-emerald-100 transition-colors cursor-pointer shrink-0"
                            title="Lihat foto struk"
                          >
                            <Receipt className="w-3 h-3 text-emerald-600" />
                            <span>Struk</span>
                          </button>
                        )}
                      </div>

                      {/* Desktop Subtitle Info */}
                      <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-neutral-400 mt-0.5">
                        <span className="text-neutral-600 font-medium">{t.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{formatIndonesianDate(t.date)}</span>
                        <span aria-hidden="true">·</span>
                        <span>{t.paymentMethod}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Amount & Desktop Edit/Delete */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <div className="text-right">
                      <span
                        className={`text-xs sm:text-base font-bold font-mono tabular-nums block ${
                          isIncome ? 'text-emerald-700' : 'text-neutral-900'
                        }`}
                      >
                        {isIncome ? '+' : '-'}
                        {formatRupiah(t.amount)}
                      </span>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden sm:flex items-center">
                      <button
                        onClick={() => onEditTransaction(t)}
                        className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus "${t.merchant}"?`)) {
                            onDeleteTransaction(t.id);
                          }
                        }}
                        className="p-1.5 text-neutral-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mobile Subtitle & Quick Action Row (Guarantees zero button collision on mobile) */}
                <div className="sm:hidden flex items-center justify-between gap-2 mt-1 pl-8 text-[11px] text-neutral-400">
                  <div className="flex items-center gap-1.5 truncate min-w-0">
                    <span className="text-neutral-600 font-medium truncate">{t.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums shrink-0">{formatIndonesianDate(t.date)}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEditTransaction(t)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors cursor-pointer"
                      title="Edit Transaksi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus "${t.merchant}"?`)) {
                          onDeleteTransaction(t.id);
                        }
                      }}
                      className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                      title="Hapus Transaksi"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
