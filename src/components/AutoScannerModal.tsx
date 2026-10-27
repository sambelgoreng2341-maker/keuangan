import React, { useState } from 'react';
import { Sparkles, Upload, FileText, X, Check, Loader2, ArrowRight } from 'lucide-react';
import { SAMPLE_SMS_TEMPLATES } from '../data/initialData';
import { Transaction, TransactionCategory, PaymentMethod } from '../types/finance';
import { formatRupiah } from '../utils/formatters';
import { parseIndonesianTransactionTextLocally } from '../utils/localParsers';

interface AutoScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
}

export const AutoScannerModal: React.FC<AutoScannerModalProps> = ({
  isOpen,
  onClose,
  onAddTransaction,
}) => {
  const [activeMode, setActiveMode] = useState<'text' | 'image'>('text');
  const [inputText, setInputText] = useState('');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedData, setExtractedData] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectSample = (text: string) => {
    setInputText(text);
    setExtractedData(null);
    setErrorMessage(null);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('Harap unggah file gambar (JPG, PNG, atau WEBP).');
      return;
    }

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setImageBase64(reader.result as string);
      setExtractedData(null);
      setErrorMessage(null);
    };
    reader.readAsDataURL(file);
  };

  const handleProcess = async () => {
    if (activeMode === 'text' && !inputText.trim()) {
      setErrorMessage('Harap masukkan teks SMS atau notifikasi mutasi.');
      return;
    }
    if (activeMode === 'image' && !imageBase64) {
      setErrorMessage('Harap pilih atau unggah foto struk / bukti transfer.');
      return;
    }

    try {
      let resultData: any = null;

      try {
        const response = await fetch('/api/parse-transaction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rawText: activeMode === 'text' ? inputText : undefined,
            imageBase64: activeMode === 'image' ? imageBase64 : undefined,
          }),
        });

        if (response.ok) {
          const res = await response.json();
          if (res.success && res.data) {
            resultData = res.data;
          }
        }
      } catch {
        // backend api not available in static mode
      }

      if (!resultData) {
        if (activeMode === 'text' && inputText.trim()) {
          resultData = parseIndonesianTransactionTextLocally(inputText);
        } else if (activeMode === 'image' && imageBase64) {
          // Provide default transaction with attached receipt for manual adjustment
          resultData = {
            type: 'pengeluaran',
            amount: 0,
            date: new Date().toISOString().split('T')[0],
            time: new Date().toTimeString().slice(0, 5),
            merchant: 'Struk Terlampir',
            description: 'Pembayaran Struk Belanja',
            category: 'Makanan & Minuman',
            paymentMethod: 'QRIS',
            confidence: 'Lampiran Struk',
          };
        }
      }

      if (resultData) {
        setExtractedData(resultData);
      } else {
        setErrorMessage('Gagal memproses data. Coba masukkan teks mutasi atau isi manual.');
      }
    } catch (err: any) {
      if (activeMode === 'text' && inputText.trim()) {
        setExtractedData(parseIndonesianTransactionTextLocally(inputText));
      } else {
        setErrorMessage('Terjadi gangguan: ' + err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAdd = () => {
    if (!extractedData) return;

    onAddTransaction({
      type: extractedData.type || 'pengeluaran',
      amount: Number(extractedData.amount) || 0,
      date: extractedData.date || new Date().toISOString().split('T')[0],
      time: extractedData.time || new Date().toTimeString().slice(0, 5),
      merchant: extractedData.merchant || 'Transaksi Otomatis',
      description: extractedData.description || 'Pencatatan Otomatis',
      category: (extractedData.category as TransactionCategory) || 'Lain-lain',
      paymentMethod: (extractedData.paymentMethod as PaymentMethod) || 'QRIS',
      receiptUrl: imageBase64 || undefined,
    });

    // Reset and close
    setExtractedData(null);
    setInputText('');
    setImageBase64(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-2xl max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">
                Pindai Otomatis (SMS, Mutasi & Struk)
              </h3>
              <p className="text-xs text-neutral-500">
                Deteksi otomatis nominal, pihak merchant, tanggal, dan kategori pengeluaran.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1 rounded-md cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 p-1 bg-neutral-100 rounded-lg mt-4">
          <button
            type="button"
            onClick={() => {
              setActiveMode('text');
              setExtractedData(null);
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeMode === 'text'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Salin SMS / Mutasi Perbankan</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveMode('image');
              setExtractedData(null);
              setErrorMessage(null);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              activeMode === 'image'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Pindai Gambar Struk / Bukti TF</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="mt-4 space-y-4">
          {activeMode === 'text' ? (
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Tempel teks notifikasi transaksi atau SMS:
              </label>
              <textarea
                rows={3}
                placeholder="Contoh: Pembayaran QRIS Rp 45.000 di Kopi Kenangan via BCA berhasil..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-neutral-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-sans"
              />

              {/* Sample Templates Quick Pick */}
              <div className="mt-2.5">
                <span className="text-[11px] text-neutral-500 block mb-1.5 font-medium">
                  Atau coba contoh format SMS / e-wallet di Indonesia:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_SMS_TEMPLATES.map((sample) => (
                    <button
                      key={sample.bank}
                      type="button"
                      onClick={() => handleSelectSample(sample.text)}
                      className="px-2.5 py-1 text-[11px] bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md transition-colors cursor-pointer"
                    >
                      {sample.bank}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold text-neutral-700 block mb-1">
                Pilih atau seret foto struk belanja / tangkapan layar bukti transfer:
              </label>
              <div className="border-2 border-dashed border-neutral-300 hover:border-emerald-500 rounded-xl p-5 text-center transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="receipt-file-input"
                />
                <label
                  htmlFor="receipt-file-input"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                  <span className="text-xs font-semibold text-neutral-800">
                    {imageFileName ? imageFileName : 'Klik untuk pilih foto struk'}
                  </span>
                  <span className="text-[11px] text-neutral-500 mt-0.5">
                    Mendukung JPG, PNG, WEBP (maks. 5MB)
                  </span>
                </label>
              </div>

              {imageBase64 && (
                <div className="mt-3 flex items-center gap-3 p-2.5 bg-neutral-50 border border-neutral-200 rounded-lg">
                  <img
                    src={imageBase64}
                    alt="Pratinjau Struk"
                    className="w-12 h-12 object-cover rounded-md border border-neutral-200"
                  />
                  <div className="text-xs">
                    <p className="font-medium text-neutral-900">{imageFileName}</p>
                    <p className="text-neutral-500 text-[11px]">Siap diproses oleh sistem AI</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Action to trigger extraction */}
          <button
            type="button"
            onClick={handleProcess}
            disabled={isLoading}
            className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Menganalisis data transaksi...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Ekstrak Data Secara Otomatis</span>
              </>
            )}
          </button>

          {/* Extracted Data Result Preview */}
          {extractedData && (
            <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200/60">
                <div className="flex items-center gap-1.5 text-emerald-900 text-xs font-bold">
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Transaksi Terdeteksi ({extractedData.confidence || 'Cerdas'})</span>
                </div>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-900">
                  {extractedData.type === 'pemasukan' ? 'Pemasukan' : 'Pengeluaran'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[11px]">Nominal Transaksi:</span>
                  <span className="font-bold text-neutral-900 font-mono text-base tabular-nums">
                    {formatRupiah(extractedData.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Merchant / Penerima:</span>
                  <span className="font-semibold text-neutral-900 truncate block">
                    {extractedData.merchant}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Kategori Rekomendasi:</span>
                  <span className="font-medium text-neutral-800">{extractedData.category}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[11px]">Metode Pembayaran:</span>
                  <span className="font-medium text-neutral-800">
                    {extractedData.paymentMethod}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-neutral-500 block text-[11px]">Deskripsi Singkat:</span>
                  <span className="text-neutral-700">{extractedData.description}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmAdd}
                  className="w-full py-2.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Simpan ke Buku Kas Bulan Ini</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
