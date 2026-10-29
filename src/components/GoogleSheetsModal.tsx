import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  Copy,
  Check,
  Download,
  ExternalLink,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  AlertCircle,
  CheckCircle2,
  Table,
  Layers,
  ArrowRight,
  Database,
  Unlink,
} from 'lucide-react';
import { CODE_GS_SOURCE } from '../data/codeGsContent';
import {
  getSavedGSheetUrl,
  saveGSheetUrl,
  saveGSheetUrlToServer,
  fetchServerGSheetUrl,
  removeGSheetUrl,
  testGSheetConnection,
  pushAllDataToGSheet,
  pullDataFromGSheet,
  setupGSheetRemotely,
  getLastSyncTime,
  isUserDefaultUrl,
} from '../utils/googleSheetsSync';
import { Transaction, CategoryBudget, RecurringTemplate } from '../types/finance';

interface GoogleSheetsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: Transaction[];
  budgets: CategoryBudget[];
  recurringList: RecurringTemplate[];
  onDataImported: (data: {
    transactions: Transaction[];
    budgets: CategoryBudget[];
    recurring: RecurringTemplate[];
  }) => void;
}

type TabType = 'guide' | 'code' | 'structure' | 'connect';

export const GoogleSheetsModal: React.FC<GoogleSheetsModalProps> = ({
  isOpen,
  onClose,
  transactions,
  budgets,
  recurringList,
  onDataImported,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('guide');
  const [webAppUrl, setWebAppUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [needsAnyonePermission, setNeedsAnyonePermission] = useState(false);
  const [spreadsheetName, setSpreadsheetName] = useState('');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingUpSheets, setIsSettingUpSheets] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedFormula, setCopiedFormula] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const saved = getSavedGSheetUrl();
      setWebAppUrl(saved);
      setLastSync(getLastSyncTime());
      if (saved) {
        setConnectionStatus('idle');
        setStatusMessage('URL API siap digunakan. Klik "Tes & Simpan Koneksi" untuk menguji.');
      } else {
        setConnectionStatus('idle');
        setStatusMessage('');
      }
      setNeedsAnyonePermission(false);

      // Sinkronkan juga URL dari server jika ada pembaruan dari perangkat lain
      fetchServerGSheetUrl().then((serverUrl) => {
        if (serverUrl && serverUrl !== saved) {
          setWebAppUrl(serverUrl);
        }
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(CODE_GS_SOURCE);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleDownloadFile = () => {
    const blob = new Blob([CODE_GS_SOURCE], { type: 'text/javascript;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Code.gs';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleTestConnection = async () => {
    if (!webAppUrl.trim()) {
      setConnectionStatus('error');
      setStatusMessage('Silakan masukkan URL Web App Google Apps Script.');
      return;
    }

    setConnectionStatus('testing');
    setStatusMessage('Sedang menguji koneksi ke Google Sheet via proxy server...');
    setNeedsAnyonePermission(false);

    const res = await testGSheetConnection(webAppUrl);
    if (res.success) {
      await saveGSheetUrlToServer(webAppUrl);
      setConnectionStatus('connected');
      setStatusMessage(res.message);
      if (res.spreadsheetName) setSpreadsheetName(res.spreadsheetName);
    } else {
      setConnectionStatus('error');
      setStatusMessage(res.message);
      if (res.needsAnyonePermission) {
        setNeedsAnyonePermission(true);
      }
    }
  };

  const handleSetupDatabaseRemotely = async () => {
    if (!webAppUrl.trim()) {
      setActiveTab('connect');
      return;
    }

    setIsSettingUpSheets(true);
    setStatusMessage('Sedang menginisialisasi 4 sheet otomatis di Google Sheets...');
    const res = await setupGSheetRemotely(webAppUrl);
    setIsSettingUpSheets(false);

    if (res.success) {
      setStatusMessage(`✅ ${res.message}`);
    } else {
      setStatusMessage(`Gagal setup: ${res.message}`);
      if (res.needsAnyonePermission) {
        setNeedsAnyonePermission(true);
      }
    }
  };

  const handlePushData = async () => {
    if (!webAppUrl.trim()) {
      setActiveTab('connect');
      return;
    }

    setIsSyncing(true);
    setStatusMessage('Mengunggah seluruh data lokal ke Google Sheet...');

    const res = await pushAllDataToGSheet(webAppUrl, transactions, budgets, recurringList);
    setIsSyncing(false);

    if (res.success) {
      setStatusMessage(res.message);
      setLastSync(new Date().toISOString());
    } else {
      setStatusMessage(`Gagal: ${res.message}`);
    }
  };

  const handlePullData = async () => {
    if (!webAppUrl.trim()) {
      setActiveTab('connect');
      return;
    }

    const confirmPull = window.confirm(
      'Apakah Anda yakin ingin menarik data dari Google Sheet? Data lokal saat ini akan diperbarui dengan data dari spreadsheet.'
    );
    if (!confirmPull) return;

    setIsSyncing(true);
    setStatusMessage('Mengambil data terbaru dari Google Sheet...');

    const res = await pullDataFromGSheet(webAppUrl);
    setIsSyncing(false);

    if (res.success && res.data) {
      onDataImported(res.data);
      setStatusMessage('Data berhasil ditarik dan diperbarui ke aplikasi!');
      setLastSync(new Date().toISOString());
    } else {
      setStatusMessage(`Gagal: ${res.message}`);
    }
  };

  const handleDisconnect = () => {
    removeGSheetUrl();
    setWebAppUrl('');
    setConnectionStatus('idle');
    setSpreadsheetName('');
    setStatusMessage('Koneksi Google Sheet telah diputuskan.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-neutral-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-neutral-100 flex items-center justify-between bg-emerald-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                  Database Google Sheets
                </h3>
                {connectionStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Aktif
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                Gunakan Google Sheet milik Anda sendiri sebagai database cloud gratis & permanen
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-neutral-200 bg-neutral-50/60 px-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>1. Panduan Setup</span>
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'code'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>2. Salin Code.gs</span>
          </button>
          <button
            onClick={() => setActiveTab('structure')}
            className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'structure'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>3. Struktur 4 Sheet</span>
          </button>
          <button
            onClick={() => setActiveTab('connect')}
            className={`px-3.5 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'connect'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>4. Hubungkan URL</span>
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: PANDUAN SETUP */}
          {activeTab === 'guide' && (
            <div className="space-y-4 text-xs sm:text-sm text-neutral-700">
              <div className="bg-emerald-50/80 border border-emerald-200/80 rounded-xl p-3.5 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-emerald-950">
                    Database Google Sheet Milik Anda Sendiri (100% Gratis)
                  </h4>
                  <p className="text-emerald-800 text-xs mt-0.5 leading-relaxed">
                    Dengan Google Apps Script (Code.gs), seluruh data transaksi, anggaran, dan foto struk
                    tersimpan aman di akun Google Drive Anda tanpa perantara server luar.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {/* Step 1 */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 bg-white">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                    1
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">Buat Dokumen Spreadsheet Baru</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Buka Google Sheets baru di tab peramban Anda.
                    </p>
                    <a
                      href="https://sheets.new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-1.5"
                    >
                      Buka sheets.new <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 bg-white">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                    2
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">Buka Menu Apps Script</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Di spreadsheet Anda, klik menu <b>Ekstensi</b> (Extensions) &rarr; pilih <b>Apps Script</b>.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 bg-white">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                    3
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">Tempelkan Kode Backend (Code.gs)</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Hapus teks bawaan <code>function myFunction() &#123;&#125;</code>, lalu tempelkan kode dari tab <b>2. Salin Code.gs</b>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('code')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700 mt-1.5 cursor-pointer"
                    >
                      Buka Tab Salin Code.gs <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 bg-white">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                    4
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">Jalankan Setup Sheet Otomatis (Opsional / Praktis)</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Pilih fungsi <b>setupDatabase</b> di dropdown atas Apps Script, lalu klik tombol <b>Jalankan (Run)</b>.
                      Skrip akan langsung membuat dan memberi warna indah pada 4 sheet database (<code>Transaksi</code>, <code>Anggaran</code>, <code>Rutin_Otomatis</code>, <code>Rekap_Bulanan</code>).
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 bg-white">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                    5
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">Terapkan Sebagai Aplikasi Web (Deploy)</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Klik tombol biru <b>Deploy (Terapkan)</b> di pojok kanan atas &rarr; pilih <b>Deployment baru (New deployment)</b>.
                    </p>
                    <div className="mt-2 bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-xs space-y-1">
                      <p>• <b>Jenis:</b> Aplikasi web (Web app)</p>
                      <p>• <b>Jalankan sebagai (Execute as):</b> Saya (Me)</p>
                      <p>• <b>Siapa yang memiliki akses (Who has access):</b> <span className="font-semibold text-emerald-700">Siapa saja (Anyone)</span></p>
                    </div>
                  </div>
                </div>

                {/* Step 6 */}
                <div className="flex items-start gap-3 p-3 rounded-xl border border-neutral-200 bg-white">
                  <div className="w-6 h-6 rounded-full bg-neutral-900 text-white font-mono text-xs flex items-center justify-center shrink-0 font-bold">
                    6
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-neutral-900">Salin URL & Sambungkan di Aplikasi</p>
                    <p className="text-xs text-neutral-500 mt-0.5">
                      Salin URL Web App yang berakhiran <code>/exec</code>, buka tab <b>4. Hubungkan URL</b>, dan klik <b>Tes & Simpan</b>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('connect')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 mt-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Buka Form Input URL <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SALIN KODE CODE.GS */}
          {activeTab === 'code' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 bg-neutral-100 p-2.5 rounded-xl border border-neutral-200 text-xs">
                <div className="flex items-center gap-2 text-neutral-700">
                  <span className="font-mono font-semibold">Code.gs</span>
                  <span className="text-neutral-400">|</span>
                  <span className="text-neutral-500">Google Apps Script Standar (658 baris)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Tersalin ke Clipboard!' : 'Salin Kode'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadFile}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-neutral-300 hover:bg-neutral-50 text-neutral-700 font-semibold rounded-lg transition-colors cursor-pointer"
                    title="Unduh file Code.gs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh File</span>
                  </button>
                </div>
              </div>

              {/* Code viewer */}
              <div className="relative rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-100 p-3 sm:p-4 font-mono text-[11px] sm:text-xs overflow-x-auto max-h-[380px] leading-relaxed selection:bg-emerald-500 selection:text-white">
                <pre>{CODE_GS_SOURCE}</pre>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <p className="font-semibold text-neutral-900">📦 Fitur Ekspor Foto Struk</p>
                  <p className="text-neutral-500 mt-0.5">
                    Foto struk otomatis di-upload ke folder <code>KasPintar_Struk</code> di Google Drive Anda.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-neutral-50 border border-neutral-200">
                  <p className="font-semibold text-neutral-900">⚡ Kalkulasi Rekap Bulanan Otomatis</p>
                  <p className="text-neutral-500 mt-0.5">
                    Setiap mutasi disimpan, sheet <code>Rekap_Bulanan</code> otomatis menghitung net & rasio tabungan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STRUKTUR KOLOM SHEET */}
          {activeTab === 'structure' && (
            <div className="space-y-4 text-xs">
              <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200 text-neutral-600">
                <p>
                  Berikut adalah struktur 4 sheet yang dibuat otomatis oleh fungsi <code>setupDatabase()</code>. Anda juga bisa membuatnya secara manual jika diinginkan:
                </p>
              </div>

              {/* Sheet 1: Transaksi */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-emerald-600 text-white px-3.5 py-2 font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    <span>1. Sheet: Transaksi (12 Kolom)</span>
                  </div>
                  <span className="text-[11px] bg-emerald-700/60 px-2 py-0.5 rounded font-mono">Utama</span>
                </div>
                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-500">
                        <th className="py-1 px-2">Kolom</th>
                        <th className="py-1 px-2">Nama Header</th>
                        <th className="py-1 px-2">Tipe Data</th>
                        <th className="py-1 px-2">Contoh Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-700">
                      <tr><td className="py-1 px-2 font-bold">A</td><td className="py-1 px-2 text-neutral-900">ID Transaksi</td><td className="py-1 px-2">Teks</td><td className="py-1 px-2 text-neutral-500">trx-1729001</td></tr>
                      <tr><td className="py-1 px-2 font-bold">B</td><td className="py-1 px-2 text-neutral-900">Tipe</td><td className="py-1 px-2">pemasukan / pengeluaran</td><td className="py-1 px-2 text-neutral-500">pengeluaran</td></tr>
                      <tr><td className="py-1 px-2 font-bold">C</td><td className="py-1 px-2 text-neutral-900">Tanggal</td><td className="py-1 px-2">YYYY-MM-DD</td><td className="py-1 px-2 text-neutral-500">2026-10-24</td></tr>
                      <tr><td className="py-1 px-2 font-bold">D</td><td className="py-1 px-2 text-neutral-900">Waktu</td><td className="py-1 px-2">HH:mm</td><td className="py-1 px-2 text-neutral-500">12:30</td></tr>
                      <tr><td className="py-1 px-2 font-bold">E</td><td className="py-1 px-2 text-neutral-900">Merchant / Toko</td><td className="py-1 px-2">Teks</td><td className="py-1 px-2 text-neutral-500">Supermarket Hero</td></tr>
                      <tr><td className="py-1 px-2 font-bold">F</td><td className="py-1 px-2 text-neutral-900">Kategori</td><td className="py-1 px-2">Teks</td><td className="py-1 px-2 text-neutral-500">Belanja & Kebutuhan</td></tr>
                      <tr><td className="py-1 px-2 font-bold">G</td><td className="py-1 px-2 text-neutral-900">Metode Bayar</td><td className="py-1 px-2">Teks</td><td className="py-1 px-2 text-neutral-500">QRIS / BCA / Tunai</td></tr>
                      <tr><td className="py-1 px-2 font-bold">H</td><td className="py-1 px-2 text-neutral-900 font-bold">Nominal (Rp)</td><td className="py-1 px-2">Angka</td><td className="py-1 px-2 text-emerald-600 font-bold">250000</td></tr>
                      <tr><td className="py-1 px-2 font-bold">I</td><td className="py-1 px-2 text-neutral-900">Keterangan</td><td className="py-1 px-2">Teks</td><td className="py-1 px-2 text-neutral-500">Belanja mingguan dapur</td></tr>
                      <tr><td className="py-1 px-2 font-bold">J</td><td className="py-1 px-2 text-neutral-900">URL Struk</td><td className="py-1 px-2">Link Drive</td><td className="py-1 px-2 text-neutral-500">https://drive.google.com/...</td></tr>
                      <tr><td className="py-1 px-2 font-bold">K</td><td className="py-1 px-2 text-neutral-900">Rutin Otomatis</td><td className="py-1 px-2">TRUE / FALSE</td><td className="py-1 px-2 text-neutral-500">FALSE</td></tr>
                      <tr><td className="py-1 px-2 font-bold">L</td><td className="py-1 px-2 text-neutral-900">Waktu Pencatatan</td><td className="py-1 px-2">ISO Timestamp</td><td className="py-1 px-2 text-neutral-500">2026-10-24T12:30:00Z</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sheet 2: Anggaran */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-emerald-700 text-white px-3.5 py-2 font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    <span>2. Sheet: Anggaran (3 Kolom)</span>
                  </div>
                  <span className="text-[11px] bg-emerald-800/60 px-2 py-0.5 rounded font-mono">Batas Bulanan</span>
                </div>
                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-500">
                        <th className="py-1 px-2">Kolom</th>
                        <th className="py-1 px-2">Nama Header</th>
                        <th className="py-1 px-2">Tipe Data</th>
                        <th className="py-1 px-2">Contoh Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-700">
                      <tr><td className="py-1 px-2 font-bold">A</td><td className="py-1 px-2 text-neutral-900">Kategori</td><td className="py-1 px-2">Teks</td><td className="py-1 px-2 text-neutral-500">Makanan & Minuman</td></tr>
                      <tr><td className="py-1 px-2 font-bold">B</td><td className="py-1 px-2 text-neutral-900 font-bold">Batas Anggaran Bulanan (Rp)</td><td className="py-1 px-2">Angka</td><td className="py-1 px-2 text-emerald-600 font-bold">2500000</td></tr>
                      <tr><td className="py-1 px-2 font-bold">C</td><td className="py-1 px-2 text-neutral-900">Ambang Peringatan (%)</td><td className="py-1 px-2">Angka (0-100)</td><td className="py-1 px-2 text-neutral-500">80</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sheet 3: Rutin_Otomatis */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-teal-700 text-white px-3.5 py-2 font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    <span>3. Sheet: Rutin_Otomatis (9 Kolom)</span>
                  </div>
                  <span className="text-[11px] bg-teal-800/60 px-2 py-0.5 rounded font-mono">Tagihan Rutin</span>
                </div>
                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-500">
                        <th className="py-1 px-2">Kolom A-I</th>
                        <th className="py-1 px-2">Tipe Data</th>
                        <th className="py-1 px-2">Contoh Nilai</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-700">
                      <tr><td className="py-1 px-2 font-bold">ID Rutin, Nama, Tipe, Nominal, Kategori, Metode, Tanggal Eksekusi, Status Aktif, Keterangan</td><td className="py-1 px-2">Teks / Angka / Boolean</td><td className="py-1 px-2 text-neutral-500">rec-1, Netflix, pengeluaran, 186000, Hiburan, Kartu Kredit, 5, TRUE</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sheet 4: Rekap_Bulanan */}
              <div className="border border-neutral-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <div className="bg-slate-800 text-white px-3.5 py-2 font-semibold flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4" />
                    <span>4. Sheet: Rekap_Bulanan (7 Kolom)</span>
                  </div>
                  <span className="text-[11px] bg-slate-700 px-2 py-0.5 rounded font-mono">Auto Summary</span>
                </div>
                <div className="p-3 overflow-x-auto">
                  <table className="w-full text-left font-mono text-[11px] border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-200 text-neutral-500">
                        <th className="py-1 px-2">Kolom A-G</th>
                        <th className="py-1 px-2">Fungsi</th>
                      </tr>
                    </thead>
                    <tbody className="text-neutral-700">
                      <tr>
                        <td className="py-1.5 px-2 font-bold font-mono">
                          Periode Bulan, Total Pemasukan, Total Pengeluaran, Sisa Bersih (Net), Rasio Tabungan (%), Jumlah Transaksi, Status Arus Kas
                        </td>
                        <td className="py-1.5 px-2 text-neutral-500">
                          Dihitung otomatis oleh Code.gs setiap mutasi dicatat atau diubah.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HUBUNGKAN & SINKRONISASI */}
          {activeTab === 'connect' && (
            <div className="space-y-4">
              <div className="bg-white border border-neutral-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-neutral-800">
                    URL Web App Google Apps Script:
                  </label>
                  {isUserDefaultUrl(webAppUrl) && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                      <Check className="w-3 h-3 text-emerald-600" />
                      Preset API Pengguna Terpasang
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <input
                    type="url"
                    value={webAppUrl}
                    onChange={(e) => {
                      setWebAppUrl(e.target.value);
                      setConnectionStatus('idle');
                      setNeedsAnyonePermission(false);
                    }}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full px-3 py-2 text-xs font-mono border border-neutral-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-neutral-50/50"
                  />
                  <p className="text-[11px] text-neutral-500">
                    Didapat dari menu: <b>Deploy</b> &rarr; <b>Kelola deployment</b> &rarr; Salin <b>URL Aplikasi Web</b> (berakhiran <code>/exec</code>).
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={connectionStatus === 'testing' || !webAppUrl.trim()}
                    className="flex-1 px-3.5 py-2.5 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-2xs"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${connectionStatus === 'testing' ? 'animate-spin' : ''}`} />
                    <span>Tes & Simpan Koneksi</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSetupDatabaseRemotely}
                    disabled={isSettingUpSheets || !webAppUrl.trim()}
                    className="flex-1 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center gap-1.5"
                    title="Jalankan setup database otomatis pada Google Sheet Anda"
                  >
                    <Table className={`w-3.5 h-3.5 ${isSettingUpSheets ? 'animate-spin' : ''}`} />
                    <span>Inisialisasi 4 Sheet</span>
                  </button>

                  {webAppUrl && (
                    <button
                      type="button"
                      onClick={handleDisconnect}
                      className="px-3 py-2.5 text-xs font-semibold text-neutral-600 hover:text-rose-600 hover:bg-rose-50 border border-neutral-200 rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 sm:w-auto"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Reset</span>
                    </button>
                  )}
                </div>

                {/* Status Callout */}
                {statusMessage && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                      connectionStatus === 'connected'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : connectionStatus === 'error'
                        ? 'bg-rose-50 border-rose-200 text-rose-900'
                        : 'bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    {connectionStatus === 'connected' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : connectionStatus === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-neutral-500 shrink-0 mt-0.5 animate-spin" />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{statusMessage}</p>
                      {spreadsheetName && (
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Nama Spreadsheet: <b>{spreadsheetName}</b>
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Anyone Permission Resolution Guide */}
                {needsAnyonePermission && (
                  <div className="p-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-950 text-xs space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-900">
                      <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Panduan Mengatasi Hak Akses Google Apps Script:</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      Google membatasi akses Web App jika diatur ke <i>&quot;Hanya saya&quot;</i>. Agar web app KasPintar bisa membaca &amp; menulis ke spreadsheet tanpa popup login Google:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-amber-900 pl-1 font-medium">
                      <li>Buka halaman <b>Google Apps Script</b> tempat Anda menempelkan kode.</li>
                      <li>Klik tombol <b>Terapkan (Deploy)</b> di pojok kanan atas &rarr; pilih <b>Kelola penerapan (Manage deployments)</b>.</li>
                      <li>Klik ikon pensil <b>Edit</b> pada versi saat ini.</li>
                      <li>Pada pilihan <b>Siapa yang memiliki akses (Who has access)</b>, ubah ke <b>Siapa saja (Anyone)</b>.</li>
                      <li>Klik tombol <b>Terapkan (Deploy)</b>.</li>
                    </ol>
                    <p className="text-[11px] text-amber-700 pt-1">
                      Setelah diubah ke &quot;Siapa saja (Anyone)&quot;, klik kembali tombol <b>&quot;Tes &amp; Simpan Koneksi&quot;</b> di atas.
                    </p>
                  </div>
                )}
              </div>

              {/* Sync Actions Box */}
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-neutral-900">Sinkronisasi Data Dua Arah</h4>
                    <p className="text-[11px] text-neutral-500">
                      Sinkronkan data transaksi lokal dengan Google Sheets kapan pun Anda mau.
                    </p>
                  </div>
                  {lastSync && (
                    <span className="text-[10px] text-neutral-400 font-mono">
                      Sinkron terakhir: {new Date(lastSync).toLocaleTimeString('id-ID')}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* Push button */}
                  <button
                    type="button"
                    onClick={handlePushData}
                    disabled={isSyncing || !webAppUrl.trim()}
                    className="p-3 bg-white hover:bg-emerald-50 border border-neutral-200 hover:border-emerald-300 rounded-xl transition-all cursor-pointer text-left flex items-start gap-2.5 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900">Kirim Data Lokal ke Sheet</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Unggah {transactions.length} transaksi saat ini ke spreadsheet Google Anda.
                      </p>
                    </div>
                  </button>

                  {/* Pull button */}
                  <button
                    type="button"
                    onClick={handlePullData}
                    disabled={isSyncing || !webAppUrl.trim()}
                    className="p-3 bg-white hover:bg-teal-50 border border-neutral-200 hover:border-teal-300 rounded-xl transition-all cursor-pointer text-left flex items-start gap-2.5 disabled:opacity-50"
                  >
                    <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                      <DownloadCloud className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-neutral-900">Tarik Data dari Sheet</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        Unduh data terbaru dari spreadsheet ke memori aplikasi ini.
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between text-xs">
          <div className="text-neutral-500 hidden sm:block">
            <span>Kode siap pakai untuk Google Apps Script</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {activeTab !== 'connect' ? (
              <button
                type="button"
                onClick={() => setActiveTab('connect')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>Lanjut Hubungkan URL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Selesai
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
