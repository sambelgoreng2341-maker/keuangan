import React from 'react';
import { ListFilter, CalendarRange, PieChart, Target, Camera } from 'lucide-react';

export type AppSection = 'transactions' | 'recap' | 'charts' | 'recurring' | 'budget';

interface MobileBottomNavProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  onOpenCamera: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeSection,
  onSelectSection,
  onOpenCamera,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-neutral-200/80 px-2 py-1 shadow-lg pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 items-center h-14 max-w-md mx-auto">
        {/* Tab 1: Transaksi */}
        <button
          type="button"
          onClick={() => onSelectSection('transactions')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] cursor-pointer transition-colors ${
            activeSection === 'transactions'
              ? 'text-emerald-700 font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <ListFilter className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Transaksi</span>
        </button>

        {/* Tab 2: Rekap Bulanan */}
        <button
          type="button"
          onClick={() => onSelectSection('recap')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] cursor-pointer transition-colors ${
            activeSection === 'recap'
              ? 'text-emerald-700 font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <CalendarRange className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Rekap</span>
        </button>

        {/* Center Floating Camera Struk Button (Ergonomic Natural Thumb Reach Zone) */}
        <div className="flex items-center justify-center">
          <button
            type="button"
            onClick={onOpenCamera}
            className="w-12 h-12 -mt-4 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center active:scale-95 transition-transform cursor-pointer border-2 border-white"
            title="Buka Kamera Struk"
          >
            <Camera className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 3: Grafik */}
        <button
          type="button"
          onClick={() => onSelectSection('charts')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] cursor-pointer transition-colors ${
            activeSection === 'charts'
              ? 'text-emerald-700 font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <PieChart className="w-5 h-5" />
          <span className="text-[10px] tracking-tight mt-0.5">Grafik</span>
        </button>

        {/* Tab 4: Anggaran & Rutin */}
        <button
          type="button"
          onClick={() => onSelectSection('budget')}
          className={`flex flex-col items-center justify-center h-full min-h-[44px] min-w-[44px] cursor-pointer transition-colors ${
            activeSection === 'budget' || activeSection === 'recurring'
              ? 'text-emerald-700 font-semibold'
              : 'text-neutral-500 hover:text-neutral-800'
          }`}
        >
          <Target className="w-5 h-5 text-emerald-600" />
          <span className="text-[10px] tracking-tight mt-0.5">Anggaran</span>
        </button>
      </div>
    </nav>
  );
};
