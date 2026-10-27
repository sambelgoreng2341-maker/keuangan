import React, { useState } from 'react';
import { X, Download, Receipt, ZoomIn, ZoomOut, Check, Copy } from 'lucide-react';
import { Transaction } from '../types/finance';
import { formatIndonesianDate, formatRupiah } from '../utils/formatters';

interface ReceiptViewerModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptViewerModal: React.FC<ReceiptViewerModalProps> = ({
  transaction,
  onClose,
}) => {
  const [isZoomed, setIsZoomed] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!transaction || !transaction.receiptUrl) return null;

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = transaction.receiptUrl!;
    link.download = `struk-${transaction.merchant.toLowerCase().replace(/\s+/g, '-')}-${transaction.date}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyDetails = () => {
    const text = `Struk: ${transaction.merchant}\nNominal: ${formatRupiah(transaction.amount)}\nTanggal: ${formatIndonesianDate(transaction.date)}\nKategori: ${transaction.category}\nMetode: ${transaction.paymentMethod}`;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-0 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-neutral-950 rounded-none sm:rounded-3xl border-0 sm:border border-neutral-800 shadow-2xl max-w-xl w-full h-full sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 border-b border-neutral-900 bg-neutral-950/90 backdrop-blur-md gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shrink-0">
              <Receipt className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs sm:text-sm font-bold text-white truncate">
                {transaction.merchant}
              </h3>
              <p className="text-[10px] sm:text-[11px] text-neutral-400 font-mono tabular-nums truncate">
                {formatIndonesianDate(transaction.date)} {transaction.time ? `· ${transaction.time}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            <button
              onClick={() => setIsZoomed(!isZoomed)}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl transition-colors cursor-pointer"
              title={isZoomed ? 'Perkecil' : 'Perbesar'}
            >
              {isZoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>

            <button
              onClick={handleCopyDetails}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl transition-colors cursor-pointer"
              title="Salin Rincian"
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            <button
              onClick={handleDownload}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl transition-colors cursor-pointer"
              title="Unduh Gambar Struk"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-900 rounded-xl transition-colors cursor-pointer ml-1"
              title="Tutup"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Viewport Image */}
        <div className="flex-1 bg-neutral-900/60 overflow-auto p-4 flex items-center justify-center min-h-[300px] max-h-[58vh]">
          <img
            src={transaction.receiptUrl}
            alt={`Struk ${transaction.merchant}`}
            className={`transition-all duration-200 rounded-xl border border-neutral-800 shadow-2xl ${
              isZoomed ? 'scale-125 cursor-zoom-out' : 'max-h-full max-w-full object-contain cursor-zoom-in'
            }`}
            onClick={() => setIsZoomed(!isZoomed)}
          />
        </div>

        {/* Bottom Details Strip */}
        <div className="p-4 bg-neutral-950 border-t border-neutral-900 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 block">
              Nominal
            </span>
            <span className="font-bold text-white font-mono text-sm tabular-nums mt-0.5 block">
              {formatRupiah(transaction.amount)}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 block">
              Kategori
            </span>
            <span className="font-medium text-neutral-300 truncate block mt-0.5">
              {transaction.category}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 block">
              Metode
            </span>
            <span className="font-medium text-neutral-300 mt-0.5 block">
              {transaction.paymentMethod}
            </span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-neutral-500 block">
              Keterangan
            </span>
            <span className="text-neutral-400 truncate block mt-0.5">
              {transaction.description || '-'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
