import React from 'react';
import { Plus, ChevronLeft, ChevronRight, Calendar, Camera, FileSpreadsheet } from 'lucide-react';
import { getMonthLabel } from '../utils/formatters';

interface NavbarProps {
  currentMonthKey: string;
  onChangeMonth: (key: string) => void;
  onOpenAddModal: () => void;
  onOpenCamera: () => void;
  onOpenGoogleSheetsModal: () => void;
  hasGSheetConnected?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentMonthKey,
  onChangeMonth,
  onOpenAddModal,
  onOpenCamera,
  onOpenGoogleSheetsModal,
  hasGSheetConnected = false,
}) => {
  const handlePrevMonth = () => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
    onChangeMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleNextMonth = () => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    onChangeMonth(`${year}-${String(month).padStart(2, '0')}`);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200">
      <div className="max-w-4xl mx-auto px-3 sm:px-6">
        <div className="flex items-center justify-between gap-2 h-14 sm:h-16">
          {/* Brand Wordmark & Icon */}
          <div className="flex items-center gap-2 shrink-0">
            <img
              src="/favicon.webp"
              alt="KasPintar Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 object-contain rounded-lg shadow-2xs"
            />
            <span className="text-base sm:text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap">
              KasPintar
            </span>
          </div>

          {/* Clean Integrated Month Switcher */}
          <div className="flex items-center gap-0.5 bg-neutral-100/90 p-0.5 sm:p-1 rounded-xl border border-neutral-200/60 text-xs shadow-2xs shrink min-w-0">
            <button
              onClick={handlePrevMonth}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-white rounded-lg text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
              title="Bulan sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 sm:gap-1.5 px-1 sm:px-2 font-semibold text-neutral-800 font-mono tabular-nums whitespace-nowrap text-[11px] sm:text-xs">
              <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0 hidden xs:inline" />
              <span className="truncate">{getMonthLabel(currentMonthKey)}</span>
            </div>
            <button
              onClick={handleNextMonth}
              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center hover:bg-white rounded-lg text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer shrink-0"
              title="Bulan berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Action Buttons: Google Sheet (desktop/tablet only) + Camera Struk (desktop/tablet only) + Catat (always visible) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Google Sheet Database Button - Accessible on both mobile and desktop */}
            <button
              type="button"
              onClick={onOpenGoogleSheetsModal}
              className={`inline-flex min-h-[36px] sm:min-h-[40px] items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs font-semibold rounded-xl border transition-all whitespace-nowrap cursor-pointer ${
                hasGSheetConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              }`}
              title="Database Google Sheets"
              aria-label="Database Google Sheets"
            >
              <FileSpreadsheet className={`w-4 h-4 ${hasGSheetConnected ? 'text-emerald-600' : 'text-amber-600'}`} />
              <span className="hidden sm:inline">Google Sheet</span>
              {hasGSheetConnected ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Terhubung"></span>
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-500" title="Perlu Pengaturan / Belum Terhubung"></span>
              )}
            </button>

            {/* Camera Struk Button (hidden on mobile, mobile uses bottom bar floating camera) */}
            <button
              type="button"
              onClick={onOpenCamera}
              className="hidden sm:inline-flex min-h-[38px] sm:min-h-[40px] items-center gap-1.5 px-3 py-2 text-xs font-semibold text-neutral-700 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-all whitespace-nowrap cursor-pointer"
              title="Buka kamera perangkat untuk foto struk"
            >
              <Camera className="w-4 h-4 text-emerald-600" />
              <span>Foto Struk</span>
            </button>

            {/* Catat Button - The only action button in the mobile top bar */}
            <button
              type="button"
              onClick={onOpenAddModal}
              className="min-h-[38px] sm:min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 active:scale-95 rounded-xl shadow-xs transition-all whitespace-nowrap cursor-pointer"
              title="Catat Transaksi Baru"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Catat</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

