import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Transaction,
  TransactionCategory,
  PaymentMethod,
  TransactionType,
  CategoryBudget,
  EXPENSE_CATEGORIES_DEFAULT,
  INCOME_CATEGORIES_DEFAULT,
} from '../types/finance';
import {
  X,
  Camera,
  Trash2,
  Sparkles,
  Loader2,
  FileText,
  Upload,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { CameraCaptureModal } from './CameraCaptureModal';
import { formatRupiah, getDeviceLocalDate, getDeviceLocalTime } from '../utils/formatters';
import { parseIndonesianTransactionTextLocally } from '../utils/localParsers';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (transactionData: Omit<Transaction, 'id' | 'createdAt'>, editingId?: string) => void;
  editingTransaction?: Transaction | null;
  defaultDate?: string;
  initialOpenCamera?: boolean;
  availableBudgets?: CategoryBudget[];
  existingTransactions?: Transaction[];
}

const STORAGE_KEY_CUSTOM_EXPENSE_CATS = 'keuangan_custom_expense_cats';
const STORAGE_KEY_CUSTOM_INCOME_CATS = 'keuangan_custom_income_cats';

const loadSavedCategories = (key: string): string[] => {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.filter((c): c is string => typeof c === 'string' && c.trim().length > 0);
      }
    }
  } catch {
    // ignore
  }
  return [];
};

const persistNewCategory = (key: string, newCat: string) => {
  try {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    const existing = loadSavedCategories(key);
    if (!existing.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      localStorage.setItem(key, JSON.stringify([...existing, trimmed]));
    }
  } catch {
    // ignore
  }
};

const PAYMENT_METHODS: PaymentMethod[] = [
  'QRIS',
  'BCA',
  'Mandiri',
  'GoPay',
  'OVO',
  'ShopeePay',
  'DANA',
  'Tunai',
  'Kartu Kredit',
  'Lainnya',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingTransaction,
  defaultDate,
  initialOpenCamera = false,
  availableBudgets = [],
  existingTransactions = [],
}) => {
  const [type, setType] = useState<TransactionType>('pengeluaran');
  const [amount, setAmount] = useState<number>(0);
  const [merchant, setMerchant] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TransactionCategory>('Makanan & Minuman');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('QRIS');
  const [date, setDate] = useState(defaultDate || getDeviceLocalDate());
  const [time, setTime] = useState(getDeviceLocalTime());
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [showTextPaste, setShowTextPaste] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const [savedExpenseCats, setSavedExpenseCats] = useState<string[]>(() =>
    loadSavedCategories(STORAGE_KEY_CUSTOM_EXPENSE_CATS)
  );
  const [savedIncomeCats, setSavedIncomeCats] = useState<string[]>(() =>
    loadSavedCategories(STORAGE_KEY_CUSTOM_INCOME_CATS)
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const registerNewCategory = (catName: string, catType: TransactionType) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    if (catType === 'pengeluaran') {
      persistNewCategory(STORAGE_KEY_CUSTOM_EXPENSE_CATS, trimmed);
      setSavedExpenseCats((prev) =>
        prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]
      );
    } else {
      persistNewCategory(STORAGE_KEY_CUSTOM_INCOME_CATS, trimmed);
      setSavedIncomeCats((prev) =>
        prev.some((c) => c.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]
      );
    }
  };

  // Kategori Dinamis Sesuai Database Google Sheets, Custom yang disimpan, & Riwayat Transaksi
  const availableCategories = useMemo<string[]>(() => {
    if (type === 'pengeluaran') {
      const dbCategories = availableBudgets.map((b) => b.category.trim()).filter(Boolean);
      const trxCategories = existingTransactions
        .filter((t) => t.type === 'pengeluaran')
        .map((t) => t.category.trim())
        .filter(Boolean);
      const combined: string[] = Array.from(
        new Set([
          ...dbCategories,
          ...savedExpenseCats,
          ...trxCategories,
          ...EXPENSE_CATEGORIES_DEFAULT,
        ])
      );
      if (category && !combined.includes(category)) {
        combined.push(category);
      }
      return combined;
    } else {
      const trxCategories = existingTransactions
        .filter((t) => t.type === 'pemasukan')
        .map((t) => t.category.trim())
        .filter(Boolean);
      const combined: string[] = Array.from(
        new Set([
          ...savedIncomeCats,
          ...trxCategories,
          ...INCOME_CATEGORIES_DEFAULT.map((c) => String(c)),
        ])
      );
      if (category && !combined.includes(category)) {
        combined.push(category);
      }
      return combined;
    }
  }, [type, availableBudgets, savedExpenseCats, savedIncomeCats, existingTransactions, category]);

  useEffect(() => {
    if (editingTransaction) {
      setType(editingTransaction.type);
      setAmount(editingTransaction.amount);
      setMerchant(editingTransaction.merchant);
      setDescription(editingTransaction.description || '');
      setCategory(editingTransaction.category);
      setPaymentMethod(editingTransaction.paymentMethod);
      setDate(editingTransaction.date);
      setTime(editingTransaction.time || getDeviceLocalTime());
      setReceiptUrl(editingTransaction.receiptUrl);
      setIsCustomCategory(false);
      setCustomCategoryInput('');
    } else {
      setType('pengeluaran');
      setAmount(0);
      setMerchant('');
      setDescription('');
      const defaultExpense = availableBudgets.length > 0 ? availableBudgets[0].category : 'Makanan & Minuman';
      setCategory(defaultExpense);
      setPaymentMethod('QRIS');
      // Sesuai tanggal & waktu di device pengguna saat ini
      setDate(defaultDate || getDeviceLocalDate());
      setTime(getDeviceLocalTime());
      setReceiptUrl(undefined);
      setIsCustomCategory(false);
      setCustomCategoryInput('');

      // Open camera directly if triggered by camera action
      if (initialOpenCamera) {
        setIsCameraOpen(true);
      }
    }
    setShowTextPaste(false);
    setPastedText('');
    setScanMessage(null);
  }, [editingTransaction, defaultDate, isOpen, initialOpenCamera, availableBudgets]);

  if (!isOpen) return null;

  // Process image data (from direct camera or file picker)
  const processReceiptImage = async (base64Image: string) => {
    setReceiptUrl(base64Image);
    setIsScanning(true);
    setScanMessage('Kecerdasan AI sedang membaca struk...');

    try {
      const response = await fetch('/api/parse-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Image }),
      });

      const res = await response.json();
      if (res.success && res.data) {
        const d = res.data;
        if (d.amount) setAmount(Number(d.amount));
        if (d.merchant) setMerchant(d.merchant);
        if (d.category) setCategory(d.category as TransactionCategory);
        if (d.paymentMethod) setPaymentMethod(d.paymentMethod as PaymentMethod);
        if (d.date) setDate(d.date);
        if (d.time) setTime(d.time);
        if (d.type) setType(d.type);
        if (d.description) setDescription(d.description);
        setScanMessage('Struk berhasil dibaca & data terisi otomatis');
      } else {
        setScanMessage('Foto terlampir. Lengkapi nominal di bawah jika belum terdeteksi.');
      }
    } catch (err: any) {
      setScanMessage('Foto struk terpasang.');
    } finally {
      setIsScanning(false);
    }
  };

  // Callback from Live Camera
  const handleCameraCapture = (imageDataUrl: string) => {
    setIsCameraOpen(false);
    processReceiptImage(imageDataUrl);
  };

  // Fallback file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Pilih file gambar struk (JPG, PNG, atau WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      processReceiptImage(base64);
    };
    reader.readAsDataURL(file);
  };

  // Text scan (SMS/Mutasi)
  const handleTextScan = async () => {
    if (!pastedText.trim()) return;
    setIsScanning(true);
    setScanMessage('Membaca pesan mutasi...');
    try {
      let parsedResult: any = null;
      try {
        const response = await fetch('/api/parse-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rawText: pastedText }),
        });
        if (response.ok) {
          const res = await response.json();
          if (res.success && res.data) {
            parsedResult = res.data;
          }
        }
      } catch {
        // server endpoint not reachable in static mode
      }

      if (!parsedResult) {
        parsedResult = parseIndonesianTransactionTextLocally(pastedText);
      }

      if (parsedResult) {
        const d = parsedResult;
        if (d.amount) setAmount(Number(d.amount));
        if (d.merchant) setMerchant(d.merchant);
        if (d.category) setCategory(d.category as TransactionCategory);
        if (d.paymentMethod) setPaymentMethod(d.paymentMethod as PaymentMethod);
        if (d.date) setDate(d.date);
        if (d.time) setTime(d.time);
        if (d.type) setType(d.type);
        if (d.description) setDescription(d.description);
        setShowTextPaste(false);
        setScanMessage('Data berhasil diekstrak!');
      }
    } catch (err) {
      console.warn('Text scan error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNaN(amount) || amount <= 0 || !merchant.trim()) return;

    const finalCategory = isCustomCategory && customCategoryInput.trim()
      ? customCategoryInput.trim()
      : category.trim();

    if (!finalCategory) return;

    // Daftarkan kategori baru ke daftar kategori agar otomatis tersimpan & muncul seterusnya
    registerNewCategory(finalCategory, type);

    onSave(
      {
        type,
        amount: Number(amount),
        merchant: merchant.trim(),
        description: description.trim(),
        category: finalCategory,
        paymentMethod,
        date,
        time,
        receiptUrl,
      },
      editingTransaction ? editingTransaction.id : undefined
    );
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-neutral-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-t-3xl sm:rounded-3xl border-t sm:border border-neutral-200/90 shadow-2xl max-w-lg w-full p-5 sm:p-7 max-h-[90vh] overflow-y-auto space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          {/* Mobile Drag Indicator Handle */}
          <div className="w-12 h-1.5 bg-neutral-300 rounded-full mx-auto mb-2 sm:hidden shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-bold text-neutral-900 tracking-tight">
                {editingTransaction ? 'Edit Catatan Transaksi' : 'Catat Transaksi'}
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Foto struk otomatis mengisi rincian pengeluaran
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 rounded-full transition-colors cursor-pointer -mr-2"
              aria-label="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Section: Live Camera & Struk Upload Area */}
          {!editingTransaction && (
            <div className="space-y-2">
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {receiptUrl ? (
                /* Attached Struk Preview Card */
                <div className="relative p-3.5 bg-neutral-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-md border border-neutral-800">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={receiptUrl}
                      alt="Struk"
                      className="w-14 h-14 object-cover rounded-xl border border-neutral-700 shrink-0 shadow-xs"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-xs font-semibold text-white truncate block">
                          Foto Struk Terlampir
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400 truncate mt-0.5">
                        {isScanning ? 'Membaca data AI...' : 'Tersimpan otomatis bersama transaksi'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsCameraOpen(true)}
                      className="px-2.5 py-1 text-[11px] font-medium bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      Foto Ulang
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptUrl(undefined)}
                      className="p-1.5 text-neutral-400 hover:text-rose-400 transition-colors cursor-pointer"
                      title="Hapus struk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : showTextPaste ? (
                /* Paste SMS Fallback Box */
                <div className="p-3.5 bg-neutral-50 rounded-2xl border border-neutral-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-neutral-700">
                      Tempel SMS / Notifikasi E-Wallet:
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTextPaste(false)}
                      className="text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Contoh: QRIS Rp 45.000 di Kopi Kenangan via BCA berhasil..."
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleTextScan}
                    disabled={isScanning || !pastedText.trim()}
                    className="w-full py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isScanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Pindai Teks</span>
                  </button>
                </div>
              ) : (
                /* Elegant Dual-Action: Live Camera + Gallery / SMS */
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Direct Camera Button */}
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="group relative p-3.5 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-2xl shadow-md transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer text-center"
                  >
                    <div className="p-2 bg-white/10 rounded-full group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-bold tracking-tight">Kamera Langsung</span>
                    <span className="text-[10px] text-emerald-100/80">Jepret struk seketika</span>
                  </button>

                  {/* Gallery & SMS upload */}
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 px-3 py-2 bg-neutral-100 hover:bg-neutral-200/80 border border-neutral-200 text-neutral-800 rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer text-xs font-semibold"
                    >
                      <Upload className="w-3.5 h-3.5 text-neutral-600" />
                      <span>Pilih dari Galeri</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowTextPaste(true)}
                      className="px-3 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 text-neutral-600 rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px] font-medium"
                    >
                      <FileText className="w-3 h-3 text-neutral-500" />
                      <span>Salin Pesan SMS</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Status Notice */}
              {scanMessage && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{scanMessage}</span>
                </div>
              )}
            </div>
          )}

          {/* Type Switcher */}
          <div className="grid grid-cols-2 gap-2 bg-neutral-100 p-1 rounded-2xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setType('pengeluaran');
                setIsCustomCategory(false);
                const defaultExpense = availableBudgets.length > 0 ? availableBudgets[0].category : 'Makanan & Minuman';
                setCategory(defaultExpense);
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                type === 'pengeluaran'
                  ? 'bg-white text-rose-700 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Pengeluaran
            </button>
            <button
              type="button"
              onClick={() => {
                setType('pemasukan');
                setIsCustomCategory(false);
                setCategory('Gaji & Upah');
              }}
              className={`py-2 rounded-xl transition-all cursor-pointer ${
                type === 'pemasukan'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              Pemasukan
            </button>
          </div>

          {/* Amount Field */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Nominal Transaksi
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-400 font-mono">
                Rp
              </span>
              <input
                type="number"
                min="1"
                step="any"
                value={amount === 0 ? '' : amount}
                placeholder="0"
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    setAmount(0);
                  } else {
                    const num = parseFloat(val);
                    setAmount(isNaN(num) ? 0 : num);
                  }
                }}
                className="w-full pl-11 pr-4 py-2.5 text-lg font-bold border border-neutral-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono tabular-nums bg-white"
                required
              />
            </div>

            {/* Quick Amount Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[10000, 20000, 50000, 100000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount((prev) => prev + val)}
                  className="px-2.5 py-1 text-[11px] font-mono bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg cursor-pointer transition-colors"
                >
                  +{val / 1000}rb
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(0)}
                className="px-2 py-1 text-[11px] text-neutral-400 hover:text-rose-600 cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Merchant / Description */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">
              Toko / Merchant / Keterangan
            </label>
            <input
              type="text"
              placeholder="Contoh: Kopi Kenangan, Superindo, Pertamax SPBU"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          {/* Category & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-neutral-700">Kategori</label>
                <button
                  type="button"
                  onClick={() => {
                    if (isCustomCategory) {
                      setIsCustomCategory(false);
                      setCategory(availableCategories[0] || (type === 'pemasukan' ? 'Gaji & Upah' : 'Makanan & Minuman'));
                    } else {
                      setIsCustomCategory(true);
                      setCustomCategoryInput('');
                    }
                  }}
                  className="text-[11px] text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
                >
                  {isCustomCategory ? 'Daftar' : '+ Kategori Baru'}
                </button>
              </div>

              {isCustomCategory ? (
                <div className="space-y-1">
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      placeholder="Ketik kategori baru..."
                      value={customCategoryInput}
                      onChange={(e) => {
                        setCustomCategoryInput(e.target.value);
                        setCategory(e.target.value);
                      }}
                      className="w-full px-3 py-2 text-xs border border-emerald-400 bg-emerald-50/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customCategoryInput.trim()) {
                          const val = customCategoryInput.trim();
                          registerNewCategory(val, type);
                          setCategory(val);
                          setIsCustomCategory(false);
                          setCustomCategoryInput('');
                        }
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 whitespace-nowrap cursor-pointer shrink-0 transition-colors"
                      title="Simpan ke daftar kategori"
                    >
                      + Tambah
                    </button>
                  </div>
                  <p className="text-[10px] text-neutral-400">
                    Otomatis masuk ke daftar kategori pilihan.
                  </p>
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                      setCustomCategoryInput('');
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Tulis Kategori Kustom...</option>
                </select>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">Metode Bayar</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-neutral-700 block mb-1">Tanggal</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2 text-xs border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono bg-white"
              required
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none min-h-[44px] px-5 py-2.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 sm:bg-transparent hover:bg-neutral-100 rounded-xl transition-colors cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 sm:flex-none min-h-[44px] px-6 py-2.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl shadow-md transition-all cursor-pointer text-center"
            >
              {editingTransaction ? 'Simpan Perubahan' : 'Catat Transaksi'}
            </button>
          </div>
        </form>
      </div>

      {/* Live Device Camera Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />
    </>
  );
};
