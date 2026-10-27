import React, { useState } from 'react';
import { RecurringTemplate, TransactionCategory, PaymentMethod, TransactionType } from '../types/finance';
import { formatCompactRupiah, formatRupiah } from '../utils/formatters';
import { Zap, Plus, Check, Clock, Trash2, Edit3, X, ArrowDownRight, ArrowUpRight } from 'lucide-react';

interface RecurringManagerProps {
  recurringList: RecurringTemplate[];
  onUpdateRecurring: (newList: RecurringTemplate[]) => void;
  onApplyAllToMonth: () => void;
  currentMonthName: string;
}

const CATEGORIES: TransactionCategory[] = [
  'Gaji & Upah',
  'Makanan & Minuman',
  'Tagihan & Utilitas',
  'Transportasi',
  'Belanja & Kebutuhan',
  'Hiburan & Langganan',
  'Kesehatan',
  'Sewa & Tempat Tinggal',
  'Investasi & Tabungan',
  'Lain-lain',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'BCA',
  'Mandiri',
  'BRI',
  'BNI',
  'GoPay',
  'OVO',
  'ShopeePay',
  'DANA',
  'QRIS',
  'Kartu Kredit',
  'Tunai',
];

export const RecurringManager: React.FC<RecurringManagerProps> = ({
  recurringList,
  onUpdateRecurring,
  onApplyAllToMonth,
  currentMonthName,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringTemplate | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState<TransactionType>('pengeluaran');
  const [amount, setAmount] = useState<number>(500000);
  const [category, setCategory] = useState<TransactionCategory>('Tagihan & Utilitas');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BCA');
  const [dayOfMonth, setDayOfMonth] = useState<number>(5);
  const [notes, setNotes] = useState('');

  const openAddModal = () => {
    setEditingItem(null);
    setTitle('');
    setType('pengeluaran');
    setAmount(250000);
    setCategory('Tagihan & Utilitas');
    setPaymentMethod('BCA');
    setDayOfMonth(1);
    setNotes('');
    setIsModalOpen(true);
  };

  const openEditModal = (item: RecurringTemplate) => {
    setEditingItem(item);
    setTitle(item.title);
    setType(item.type);
    setAmount(item.amount);
    setCategory(item.category);
    setPaymentMethod(item.paymentMethod);
    setDayOfMonth(item.dayOfMonth);
    setNotes(item.notes || '');
    setIsModalOpen(true);
  };

  const handleToggleActive = (id: string) => {
    const updated = recurringList.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r));
    onUpdateRecurring(updated);
  };

  const handleDelete = (id: string) => {
    if (confirm('Hapus transaksi rutin ini?')) {
      onUpdateRecurring(recurringList.filter((r) => r.id !== id));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !amount) return;

    if (editingItem) {
      const updated = recurringList.map((r) =>
        r.id === editingItem.id
          ? {
              ...r,
              title: title.trim(),
              type,
              amount: Number(amount),
              category,
              paymentMethod,
              dayOfMonth: Number(dayOfMonth),
              notes: notes.trim(),
            }
          : r
      );
      onUpdateRecurring(updated);
    } else {
      const newItem: RecurringTemplate = {
        id: `rec-${Date.now()}`,
        title: title.trim(),
        type,
        amount: Number(amount),
        category,
        paymentMethod,
        dayOfMonth: Number(dayOfMonth),
        isActive: true,
        autoPost: true,
        notes: notes.trim(),
      };
      onUpdateRecurring([...recurringList, newItem]);
    }
    setIsModalOpen(false);
  };

  const activeIncome = recurringList
    .filter((r) => r.isActive && r.type === 'pemasukan')
    .reduce((sum, r) => sum + r.amount, 0);

  const activeExpense = recurringList
    .filter((r) => r.isActive && r.type === 'pengeluaran')
    .reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="bg-white p-5 rounded-xl border border-neutral-200 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-100">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            <h2 className="text-base font-bold text-neutral-900">
              Otomatisasi Transaksi Rutin Bulanan
            </h2>
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            Jadwal pengeluaran dan pemasukan bulanan tetap (gaji, sewa kos, wifi, listrik, langganan)
            yang tercatat otomatis tanpa perlu input berulang setiap bulan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={onApplyAllToMonth}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer text-center"
          >
            Sinkronkan ke {currentMonthName}
          </button>
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 text-center"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Rutin</span>
          </button>
        </div>
      </div>

      {/* Summary strips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200/80 text-xs">
        <div>
          <span className="text-neutral-500 block">Total Pemasukan Rutin:</span>
          <span className="text-sm font-bold text-emerald-700 font-mono tabular-nums">
            +{formatRupiah(activeIncome)}
          </span>
        </div>
        <div>
          <span className="text-neutral-500 block">Total Komitmen Pengeluaran:</span>
          <span className="text-sm font-bold text-neutral-900 font-mono tabular-nums">
            -{formatRupiah(activeExpense)}
          </span>
        </div>
        <div>
          <span className="text-neutral-500 block">Estimasi Arus Kas Otomatis:</span>
          <span
            className={`text-sm font-bold font-mono tabular-nums ${
              activeIncome - activeExpense >= 0 ? 'text-emerald-700' : 'text-rose-600'
            }`}
          >
            {activeIncome - activeExpense >= 0 ? '+' : ''}
            {formatRupiah(activeIncome - activeExpense)}
          </span>
        </div>
      </div>

      {/* List Content */}
      {recurringList.length === 0 ? (
        <div className="py-12 px-4 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl space-y-1">
          <p className="font-semibold text-neutral-700">Belum ada template transaksi rutin di database.</p>
          <p className="text-[11px] text-neutral-500">
            Klik tombol &quot;Tambah Transaksi Rutin&quot; di atas untuk mencatat pengeluaran atau pemasukan tetap bulanan.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (Eliminates table squishing and button collisions on phones) */}
          <div className="sm:hidden space-y-2.5">
        {recurringList.map((item) => {
          const isIncome = item.type === 'pemasukan';
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-2xl border border-neutral-200 bg-white transition-all ${
                !item.isActive ? 'opacity-60 bg-neutral-50/50' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`p-2 rounded-xl shrink-0 ${isIncome ? 'bg-emerald-50 text-emerald-700' : 'bg-neutral-100 text-neutral-600'}`}>
                    {isIncome ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-neutral-900 block truncate">{item.title}</span>
                    <span className="text-[11px] text-neutral-400 font-mono">Tgl {item.dayOfMonth} · {item.paymentMethod}</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold font-mono tabular-nums block ${isIncome ? 'text-emerald-700' : 'text-neutral-900'}`}>
                    {isIncome ? '+' : '-'}{formatRupiah(item.amount)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-neutral-100 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleToggleActive(item.id)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                    item.isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-neutral-100 text-neutral-500'
                  }`}
                >
                  {item.isActive ? 'Otomatis Aktif' : 'Dijeda'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 cursor-pointer"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 text-neutral-500 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop Table of Recurring items */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-neutral-500 font-semibold uppercase tracking-wider">
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Nama Transaksi</th>
              <th className="py-2.5 px-3">Kategori</th>
              <th className="py-2.5 px-3">Jadwal Tanggal</th>
              <th className="py-2.5 px-3">Metode Bayar</th>
              <th className="py-2.5 px-3 text-right">Nominal Bulanan</th>
              <th className="py-2.5 px-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {recurringList.map((item) => {
              const isIncome = item.type === 'pemasukan';
              return (
                <tr
                  key={item.id}
                  className={`hover:bg-neutral-50/70 transition-colors ${
                    !item.isActive ? 'opacity-50 bg-neutral-50/30' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <button
                      onClick={() => handleToggleActive(item.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                        item.isActive
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-neutral-200 text-neutral-600'
                      }`}
                      title={item.isActive ? 'Klik untuk jeda' : 'Klik untuk aktifkan'}
                    >
                      {item.isActive ? 'Aktif' : 'Dijeda'}
                    </button>
                  </td>
                  <td className="py-3 px-3 font-medium text-neutral-900">
                    <div className="flex items-center gap-1.5">
                      {isIncome ? (
                        <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      )}
                      <span>{item.title}</span>
                    </div>
                    {item.notes && (
                      <span className="text-[11px] text-neutral-400 block ml-5">
                        {item.notes}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-neutral-600">{item.category}</td>
                  <td className="py-3 px-3 text-neutral-600 font-mono tabular-nums">
                    Setiap tgl {item.dayOfMonth}
                  </td>
                  <td className="py-3 px-3 text-neutral-600">{item.paymentMethod}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold">
                    <span className={isIncome ? 'text-emerald-700' : 'text-neutral-900'}>
                      {isIncome ? '+' : '-'}
                      {formatRupiah(item.amount)}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1 text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                        title="Edit Template"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-neutral-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>
      )}

      {/* Add / Edit Recurring Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl border border-neutral-200 shadow-xl max-w-md w-full p-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
              <h3 className="text-sm font-bold text-neutral-900">
                {editingItem ? 'Edit Transaksi Rutin' : 'Tambah Transaksi Rutin Otomatis'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3.5">
              {/* Type Switcher */}
              <div>
                <label className="text-xs font-semibold text-neutral-700 block mb-1">
                  Jenis Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('pengeluaran')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      type === 'pengeluaran'
                        ? 'bg-rose-50 border-rose-300 text-rose-800'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    Pengeluaran Rutin
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('pemasukan')}
                    className={`py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      type === 'pemasukan'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    Pemasukan Rutin
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block">
                  Nama Transaksi / Tagihan
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Sewa Kost, WiFi Rumah, Gaji Kantor"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Nominal per Bulan (Rp)
                  </label>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Setiap Tanggal (1-31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Number(e.target.value))}
                    className="mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-neutral-700 block">
                    Metode Pembayaran
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  >
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 block">
                  Catatan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Nomor pelanggan, paket langganan, dsb."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-neutral-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer"
              >
                Simpan Transaksi Rutin
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
