import React, { useState, useEffect, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { KpiStats } from './components/KpiStats';
import { ChartsSection } from './components/ChartsSection';
import { BudgetTracker } from './components/BudgetTracker';
import { RecurringManager } from './components/RecurringManager';
import { TransactionList } from './components/TransactionList';
import { MonthlyRecap } from './components/MonthlyRecap';
import { TransactionModal } from './components/TransactionModal';
import { ReceiptViewerModal } from './components/ReceiptViewerModal';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { MobileBottomNav, AppSection } from './components/MobileBottomNav';
import { Transaction, RecurringTemplate, CategoryBudget } from './types/finance';
import { getMonthLabel, getMonthYearKey } from './utils/formatters';
import { getSavedGSheetUrl, syncSingleTransactionToGSheet, pullDataFromGSheet } from './utils/googleSheetsSync';
import { RotateCcw, ListFilter, PieChart, Zap, Target, CalendarRange, FileSpreadsheet, Check, CloudUpload } from 'lucide-react';

const STORAGE_KEY_TRX = 'kaspintar_transactions_db';
const STORAGE_KEY_REC = 'kaspintar_recurring_db';
const STORAGE_KEY_BUDGET = 'kaspintar_budgets_db';

// Bersihkan cache mock dummy data versi sebelumnya jika ada
try {
  localStorage.removeItem('kaspintar_transactions_v1');
  localStorage.removeItem('kaspintar_recurring_v1');
  localStorage.removeItem('kaspintar_budgets_v1');
} catch {
  // ignore
}

export default function App() {
  // 1. Transactions state - Murni dari database / local cache live
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_TRX);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 2. Recurring items state
  const [recurringList, setRecurringList] = useState<RecurringTemplate[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REC);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 3. Budgets state
  const [budgets, setBudgets] = useState<CategoryBudget[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_BUDGET);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 4. Active view tab & Month (Default ke bulan kalender saat ini)
  const [activeSection, setActiveSection] = useState<AppSection>('transactions');
  const [currentMonthKey, setCurrentMonthKey] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  // 5. Database live pull state
  const [isPullingData, setIsPullingData] = useState(false);

  // 6. Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [openCameraDirectly, setOpenCameraDirectly] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [viewingReceiptTransaction, setViewingReceiptTransaction] = useState<Transaction | null>(null);
  const [isGoogleSheetsModalOpen, setIsGoogleSheetsModalOpen] = useState(false);
  const [hasGSheetConnected, setHasGSheetConnected] = useState<boolean>(() => Boolean(getSavedGSheetUrl()));
  const [syncFeedback, setSyncFeedback] = useState<{
    message: string;
    type: 'syncing' | 'success' | 'error';
  } | null>(null);

  const showSyncFeedback = (message: string, type: 'syncing' | 'success' | 'error') => {
    setSyncFeedback({ message, type });
    if (type !== 'syncing') {
      setTimeout(() => {
        setSyncFeedback((current) => (current?.message === message ? null : current));
      }, 3500);
    }
  };

  // Tarik data langsung dari Google Sheets database
  const fetchDatabaseData = async (silent = false) => {
    const url = getSavedGSheetUrl();
    if (!url) return;

    if (!silent) {
      setIsPullingData(true);
      showSyncFeedback('Menghubungkan ke Google Sheets...', 'syncing');
    }

    try {
      const res = await pullDataFromGSheet(url);
      if (res.success && res.data) {
        setTransactions(res.data.transactions || []);
        setBudgets(res.data.budgets || []);
        setRecurringList(res.data.recurring || []);
        showSyncFeedback(
          `Database terhubung: ${(res.data.transactions || []).length} transaksi`,
          'success'
        );
      } else if (!silent) {
        showSyncFeedback(res.message || 'Gagal memuat data dari database', 'error');
      }
    } catch {
      if (!silent) {
        showSyncFeedback('Gagal terhubung ke database Google Sheet', 'error');
      }
    } finally {
      setIsPullingData(false);
    }
  };

  // On mount: Muat data dari Google Sheets secara otomatis
  useEffect(() => {
    fetchDatabaseData(true);
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TRX, JSON.stringify(transactions));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [transactions]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REC, JSON.stringify(recurringList));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [recurringList]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_BUDGET, JSON.stringify(budgets));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [budgets]);

  // Filter transactions for currently selected month
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => getMonthYearKey(t.date) === currentMonthKey);
  }, [transactions, currentMonthKey]);

  // Days in selected month
  const totalDaysInMonth = useMemo(() => {
    const [yearStr, monthStr] = currentMonthKey.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    return new Date(year, month, 0).getDate();
  }, [currentMonthKey]);

  // Calculate monthly totals
  const totalIncome = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'pemasukan')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const totalExpense = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'pengeluaran')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const netCashflow = totalIncome - totalExpense;

  const totalBudgetLimit = useMemo(() => {
    return budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
  }, [budgets]);

  // Unapplied recurring items detection for the active month
  const unappliedRecurring = useMemo(() => {
    return recurringList.filter((rec) => {
      if (!rec.isActive) return false;
      const alreadyApplied = currentMonthTransactions.some(
        (t) => t.recurringTemplateId === rec.id
      );
      return !alreadyApplied;
    });
  }, [recurringList, currentMonthTransactions]);

  // Apply all pending recurring items to current month
  const handleApplyRecurring = () => {
    if (unappliedRecurring.length === 0) return;

    const [year, month] = currentMonthKey.split('-');
    const newTrxList: Transaction[] = unappliedRecurring.map((rec) => {
      const day = Math.min(rec.dayOfMonth, totalDaysInMonth);
      const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
      return {
        id: `trx-rec-${rec.id}-${currentMonthKey}`,
        type: rec.type,
        amount: rec.amount,
        date: dateStr,
        time: '08:00',
        category: rec.category,
        merchant: rec.title,
        description: rec.notes || 'Transaksi rutin bulanan otomatis',
        paymentMethod: rec.paymentMethod,
        isRecurringApplied: true,
        recurringTemplateId: rec.id,
        createdAt: new Date().toISOString(),
      };
    });

    setTransactions((prev) => [...newTrxList, ...prev]);

    // Background sync to Google Sheet
    const sheetUrl = getSavedGSheetUrl();
    if (sheetUrl) {
      showSyncFeedback('Menyinkronkan transaksi rutin ke Google Sheet...', 'syncing');
      Promise.all(
        newTrxList.map((t) =>
          syncSingleTransactionToGSheet(sheetUrl, { action: 'addTransaction', transaction: t })
        )
      )
        .then(() => {
          showSyncFeedback('Transaksi rutin tersimpan di Google Sheet', 'success');
        })
        .catch(() => {
          // silently keep local data intact
        });
    }
  };

  // Add or Edit Transaction with auto-sync to Google Sheet
  const handleSaveTransaction = (
    data: Omit<Transaction, 'id' | 'createdAt'>,
    editingId?: string
  ) => {
    const sheetUrl = getSavedGSheetUrl();

    if (editingId) {
      let updatedTrx: Transaction | null = null;
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.id === editingId) {
            updatedTrx = { ...t, ...data };
            return updatedTrx;
          }
          return t;
        })
      );

      if (sheetUrl && updatedTrx) {
        showSyncFeedback('Menyimpan perubahan ke Google Sheet...', 'syncing');
        syncSingleTransactionToGSheet(sheetUrl, {
          action: 'updateTransaction',
          transaction: updatedTrx,
        })
          .then((res) => {
            if (res.success) {
              showSyncFeedback('Perubahan tersimpan di Google Sheet', 'success');
            }
          })
          .catch(() => {
            // Local data is preserved
          });
      }
    } else {
      const newTrx: Transaction = {
        ...data,
        id: `trx-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      setTransactions((prev) => [newTrx, ...prev]);

      if (sheetUrl) {
        showSyncFeedback('Menyinkronkan transaksi ke Google Sheet...', 'syncing');
        syncSingleTransactionToGSheet(sheetUrl, {
          action: 'addTransaction',
          transaction: newTrx,
        })
          .then((res) => {
            if (res.success) {
              showSyncFeedback('Transaksi tersimpan di Google Sheet', 'success');
            }
          })
          .catch(() => {
            // Local data is preserved
          });
      }
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));

    const sheetUrl = getSavedGSheetUrl();
    if (sheetUrl) {
      showSyncFeedback('Memperbarui Google Sheet...', 'syncing');
      syncSingleTransactionToGSheet(sheetUrl, {
        action: 'deleteTransaction',
        id,
      })
        .then((res) => {
          if (res.success) {
            showSyncFeedback('Data terhapus dari Google Sheet', 'success');
          }
        })
        .catch(() => {
          // Local data is preserved
        });
    }
  };

  const handleEditTransaction = (t: Transaction) => {
    setEditingTransaction(t);
    setIsAddModalOpen(true);
  };

  const handleRefreshDatabase = () => {
    fetchDatabaseData(false);
  };

  const currentMonthName = getMonthLabel(currentMonthKey);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col antialiased">
      {/* 1. Clean Top Navbar with integrated month switcher & Google Sheets DB access */}
      <Navbar
        currentMonthKey={currentMonthKey}
        onChangeMonth={setCurrentMonthKey}
        onOpenAddModal={() => {
          setEditingTransaction(null);
          setOpenCameraDirectly(false);
          setIsAddModalOpen(true);
        }}
        onOpenCamera={() => {
          setEditingTransaction(null);
          setOpenCameraDirectly(true);
          setIsAddModalOpen(true);
        }}
        onOpenGoogleSheetsModal={() => setIsGoogleSheetsModalOpen(true)}
        hasGSheetConnected={hasGSheetConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-3.5 sm:px-6 py-4 sm:py-6 space-y-5 pb-28 md:pb-12">
        {/* Unified Financial Summary Card */}
        <KpiStats
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          netCashflow={netCashflow}
          totalBudgetLimit={totalBudgetLimit}
          unappliedRecurringCount={unappliedRecurring.length}
          onApplyRecurring={handleApplyRecurring}
        />

        {/* Clean Segmented Navigation Tabs for Desktop */}
        <div className="hidden md:flex items-center p-1 bg-neutral-200/60 rounded-xl text-xs font-semibold text-neutral-600 gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveSection('transactions')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSection === 'transactions'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'hover:text-neutral-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Transaksi</span>
          </button>

          <button
            onClick={() => setActiveSection('recap')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSection === 'recap'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'hover:text-neutral-900'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5 text-emerald-600" />
            <span>Rekap Bulanan</span>
          </button>

          <button
            onClick={() => setActiveSection('charts')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSection === 'charts'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'hover:text-neutral-900'
            }`}
          >
            <PieChart className="w-3.5 h-3.5" />
            <span>Grafik</span>
          </button>

          <button
            onClick={() => setActiveSection('recurring')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSection === 'recurring'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'hover:text-neutral-900'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            <span>Rutin Otomatis</span>
          </button>

          <button
            onClick={() => setActiveSection('budget')}
            className={`flex-1 min-w-[100px] flex items-center justify-center gap-1.5 py-2 rounded-lg transition-all cursor-pointer ${
              activeSection === 'budget'
                ? 'bg-white text-neutral-900 shadow-xs'
                : 'hover:text-neutral-900'
            }`}
          >
            <Target className="w-3.5 h-3.5 text-emerald-600" />
            <span>Anggaran</span>
          </button>
        </div>

        {/* Mobile Sub-Navigation between Budget & Recurring */}
        {(activeSection === 'budget' || activeSection === 'recurring') && (
          <div className="md:hidden flex items-center p-1 bg-neutral-200/70 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveSection('budget')}
              className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
                activeSection === 'budget'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Batas Anggaran
            </button>
            <button
              onClick={() => setActiveSection('recurring')}
              className={`flex-1 py-1.5 text-center rounded-lg transition-all cursor-pointer ${
                activeSection === 'recurring'
                  ? 'bg-white text-neutral-900 shadow-xs'
                  : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Rutin Otomatis
            </button>
          </div>
        )}

        {/* View Section 1: Transaction List (Default) */}
        {activeSection === 'transactions' && (
          <TransactionList
            transactions={currentMonthTransactions}
            onDeleteTransaction={handleDeleteTransaction}
            onEditTransaction={handleEditTransaction}
            onViewReceipt={setViewingReceiptTransaction}
            currentMonthName={currentMonthName}
          />
        )}

        {/* View Section 2: Rekap Bulanan (Multi-month recap & comparison) */}
        {activeSection === 'recap' && (
          <MonthlyRecap
            transactions={transactions}
            currentMonthKey={currentMonthKey}
            onSelectMonth={(key) => setCurrentMonthKey(key)}
            onNavigateToTransactions={() => setActiveSection('transactions')}
          />
        )}

        {/* View Section 3: Charts & Breakdown */}
        {activeSection === 'charts' && (
          <div className="space-y-6">
            <ChartsSection
              transactions={currentMonthTransactions}
              daysInMonth={totalDaysInMonth}
            />
          </div>
        )}

        {/* View Section 4: Automated Recurring Bills */}
        {activeSection === 'recurring' && (
          <RecurringManager
            recurringList={recurringList}
            onUpdateRecurring={setRecurringList}
            onApplyAllToMonth={handleApplyRecurring}
            currentMonthName={currentMonthName}
          />
        )}

        {/* View Section 5: Category Budgets */}
        {activeSection === 'budget' && (
          <BudgetTracker
            budgets={budgets}
            transactions={currentMonthTransactions}
            onUpdateBudgets={setBudgets}
          />
        )}
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-neutral-200/80 bg-white py-4 mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span>KasPintar · Pencatatan Keuangan Simpel</span>
            <span className="text-neutral-300">•</span>
            <button
              onClick={() => setIsGoogleSheetsModalOpen(true)}
              className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-800 font-medium cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Database Google Sheets</span>
            </button>
          </div>
          <button
            onClick={handleRefreshDatabase}
            disabled={isPullingData}
            className="inline-flex items-center gap-1.5 text-neutral-600 hover:text-emerald-700 transition-colors cursor-pointer disabled:opacity-50"
            title="Tarik ulang seluruh data dari Google Sheets"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isPullingData ? 'animate-spin text-emerald-600' : ''}`} />
            <span>{isPullingData ? 'Menyinkronkan...' : 'Tarik Data Sheet'}</span>
          </button>
        </div>
      </footer>

      {/* Unified Transaction Modal (Manual + Camera / Receipt Drop) */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
          setOpenCameraDirectly(false);
        }}
        onSave={handleSaveTransaction}
        editingTransaction={editingTransaction}
        defaultDate={`${currentMonthKey}-15`}
        initialOpenCamera={openCameraDirectly}
      />

      {/* Full-size Receipt Lightbox Modal */}
      <ReceiptViewerModal
        transaction={viewingReceiptTransaction}
        onClose={() => setViewingReceiptTransaction(null)}
      />

      {/* Google Sheets (Code.gs) Database & Setup Modal */}
      <GoogleSheetsModal
        isOpen={isGoogleSheetsModalOpen}
        onClose={() => {
          setIsGoogleSheetsModalOpen(false);
          setHasGSheetConnected(Boolean(getSavedGSheetUrl()));
        }}
        transactions={transactions}
        budgets={budgets}
        recurringList={recurringList}
        onDataImported={(data) => {
          if (data.transactions) setTransactions(data.transactions);
          if (data.budgets) setBudgets(data.budgets);
          if (data.recurring) setRecurringList(data.recurring);
        }}
      />

      {/* Sync Feedback Toast */}
      {syncFeedback && (
        <div className="fixed bottom-20 md:bottom-6 right-4 z-40 max-w-sm pointer-events-none transition-all duration-300">
          <div
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl shadow-lg border text-xs font-semibold backdrop-blur-md ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-900/90 text-white border-emerald-700/60'
                : syncFeedback.type === 'error'
                ? 'bg-rose-900/90 text-white border-rose-700/60'
                : 'bg-neutral-900/90 text-white border-neutral-700/60'
            }`}
          >
            {syncFeedback.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : syncFeedback.type === 'error' ? (
              <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0"></span>
            ) : (
              <CloudUpload className="w-4 h-4 text-emerald-400 shrink-0 animate-bounce" />
            )}
            <span>{syncFeedback.message}</span>
          </div>
        </div>
      )}

      {/* Mobile-First Fixed Bottom Navigation Bar */}
      <MobileBottomNav
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        onOpenCamera={() => {
          setEditingTransaction(null);
          setOpenCameraDirectly(true);
          setIsAddModalOpen(true);
        }}
      />
    </div>
  );
}
