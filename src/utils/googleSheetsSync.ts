/**
 * Utilitas untuk sinkronisasi Google Sheets Database melalui Google Apps Script (Code.gs)
 * Menggunakan server proxy internal (/api/gsheet-proxy) untuk kelancaran koneksi di perangkat Mobile/PWA
 * dan menghindari kendala CORS/redirect otentikasi Google.
 */

import { Transaction, CategoryBudget, RecurringTemplate } from '../types/finance';

export const GSHEET_URL_STORAGE_KEY = 'kaspintar_gsheet_url';
export const GSHEET_LAST_SYNC_KEY = 'kaspintar_gsheet_last_sync';

// Default endpoint dari URL Google Apps Script yang diberikan pengguna
export const DEFAULT_GSHEET_URL =
  'https://script.google.com/macros/s/AKfycbyMANJzqHCUaKLOpOrz4nKP8sWzQCk4Pqq6v16aLvoB1heam6SXieLu2SjCqurb3vDH/exec';

export interface GSheetSyncResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  spreadsheetName?: string;
  needsAnyonePermission?: boolean;
}

export function getSavedGSheetUrl(): string {
  try {
    const saved = localStorage.getItem(GSHEET_URL_STORAGE_KEY);
    if (saved !== null && saved.trim().length > 0) {
      return saved.trim();
    }
    return DEFAULT_GSHEET_URL;
  } catch {
    return DEFAULT_GSHEET_URL;
  }
}

export function isUserDefaultUrl(url: string): boolean {
  return url.trim() === DEFAULT_GSHEET_URL;
}

export function saveGSheetUrl(url: string): void {
  try {
    localStorage.setItem(GSHEET_URL_STORAGE_KEY, url.trim());
  } catch (e) {
    console.error('Failed to save GSheet URL:', e);
  }
}

export function removeGSheetUrl(): void {
  try {
    localStorage.removeItem(GSHEET_URL_STORAGE_KEY);
    localStorage.removeItem(GSHEET_LAST_SYNC_KEY);
  } catch (e) {
    console.error('Failed to clear GSheet URL:', e);
  }
}

export function getLastSyncTime(): string | null {
  try {
    return localStorage.getItem(GSHEET_LAST_SYNC_KEY);
  } catch {
    return null;
  }
}

export function setLastSyncTime(): void {
  try {
    localStorage.setItem(GSHEET_LAST_SYNC_KEY, new Date().toISOString());
  } catch {
    // ignore
  }
}

/**
 * Sinkronisasi URL Google Sheets dengan server backend
 * agar perangkat PC dan Mobile selalu berbagi link database yang sama
 */
export async function fetchServerGSheetUrl(): Promise<string> {
  try {
    const res = await fetch('/api/config/gsheet');
    if (res.ok) {
      const data = await res.json();
      if (data.url && typeof data.url === 'string' && data.url.trim().length > 0) {
        saveGSheetUrl(data.url.trim());
        return data.url.trim();
      }
    }
  } catch (err) {
    console.warn('Error fetching server gsheet config:', err);
  }
  return getSavedGSheetUrl();
}

export async function saveGSheetUrlToServer(url: string): Promise<void> {
  const clean = url.trim();
  saveGSheetUrl(clean);
  try {
    await fetch('/api/config/gsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: clean }),
    });
  } catch (err) {
    console.warn('Error saving gsheet url to server:', err);
  }
}

/**
 * Tes koneksi ke URL Web App Google Apps Script via proxy server
 */
export async function testGSheetConnection(rawUrl: string): Promise<GSheetSyncResult> {
  const url = rawUrl.trim();
  if (!url) {
    return { success: false, message: 'URL Google Apps Script masih kosong.' };
  }

  if (!url.startsWith('https://script.google.com/macros/s/') || !url.endsWith('/exec')) {
    return {
      success: false,
      message: 'Format URL salah. Harus diawali https://script.google.com/macros/s/... dan diakhiri /exec',
    };
  }

  try {
    const proxyUrl = `/api/gsheet-proxy?action=ping&_t=${Date.now()}&targetUrl=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const json = await response.json();

    if (json.status === 'success' || json.success === true) {
      return {
        success: true,
        message: json.message || 'Koneksi ke Google Sheet berhasil terhubung!',
        spreadsheetName: json.spreadsheetName || 'Database KasPintar',
      };
    } else {
      return {
        success: false,
        needsAnyonePermission: Boolean(json.needsAnyonePermission),
        message: json.message || 'Respon error dari Google Apps Script.',
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      message: `Tidak dapat menghubungi Google Apps Script (${msg}).`,
    };
  }
}

/**
 * Mengirim penambahan/perubahan/penghapusan 1 transaksi secara instan ke Google Sheets di background
 */
export async function syncSingleTransactionToGSheet(
  url: string,
  mutation:
    | { action: 'addTransaction'; transaction: Transaction }
    | { action: 'updateTransaction'; transaction: Transaction }
    | { action: 'deleteTransaction'; id: string }
): Promise<GSheetSyncResult> {
  const targetUrl = url.trim();
  if (!targetUrl) return { success: false, message: 'URL Google Sheet belum diatur.' };

  try {
    const response = await fetch('/api/gsheet-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        targetUrl,
        ...mutation,
      }),
    });

    const json = await response.json();
    if (json.status === 'success' || json.success === true) {
      setLastSyncTime();
      return { success: true, message: json.message || 'Berhasil disinkronkan ke Google Sheet' };
    }
    return {
      success: false,
      needsAnyonePermission: Boolean(json.needsAnyonePermission),
      message: json.message || 'Gagal menyimpan mutasi ke sheet',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal sinkron mutasi: ${msg}` };
  }
}

/**
 * Meminta Google Apps Script untuk otomatis membuat & memformat 4 sheet
 */
export async function setupGSheetRemotely(url: string): Promise<GSheetSyncResult> {
  try {
    const proxyUrl = `/api/gsheet-proxy?action=setup&_t=${Date.now()}&targetUrl=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const json = await response.json();
    if (json.status === 'success' || json.success === true) {
      return { success: true, message: json.message };
    }
    return {
      success: false,
      needsAnyonePermission: Boolean(json.needsAnyonePermission),
      message: json.message || 'Gagal menjalankan setup sheet.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal inisialisasi sheet: ${msg}` };
  }
}

/**
 * Mengirim seluruh data lokal (Transaksi, Anggaran, Rutin) ke Google Sheets
 */
export async function pushAllDataToGSheet(
  url: string,
  transactions: Transaction[],
  budgets: CategoryBudget[],
  recurring: RecurringTemplate[]
): Promise<GSheetSyncResult> {
  try {
    const payload = {
      targetUrl: url.trim(),
      action: 'syncLocalData',
      transactions,
      budgets,
      recurring,
    };

    const response = await fetch('/api/gsheet-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (json.status === 'success' || json.success === true) {
      setLastSyncTime();
      return {
        success: true,
        message: `Berhasil mengunggah ${transactions.length} transaksi, ${budgets.length} anggaran, dan ${recurring.length} jadwal rutin ke Google Sheet!`,
      };
    }
    return {
      success: false,
      needsAnyonePermission: Boolean(json.needsAnyonePermission),
      message: json.message || 'Gagal mengunggah data ke sheet.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal sinkronisasi ke sheet: ${msg}` };
  }
}

/**
 * Mengambil seluruh data dari Google Sheets ke dalam aplikasi
 */
export async function pullDataFromGSheet(url: string): Promise<
  GSheetSyncResult<{
    transactions: Transaction[];
    budgets: CategoryBudget[];
    recurring: RecurringTemplate[];
  }>
> {
  try {
    const proxyUrl = `/api/gsheet-proxy?action=getInitialData&_t=${Date.now()}&targetUrl=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);
    const json = await response.json();
    if (json.status === 'success' || json.success === true) {
      setLastSyncTime();
      return {
        success: true,
        message: 'Data berhasil ditarik dari Google Sheet!',
        data: {
          transactions: json.transactions || [],
          budgets: json.budgets || [],
          recurring: json.recurring || [],
        },
      };
    }
    return {
      success: false,
      needsAnyonePermission: Boolean(json.needsAnyonePermission),
      message: json.message || 'Gagal mengambil data dari Google Sheet.',
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal memuat data dari sheet: ${msg}` };
  }
}
