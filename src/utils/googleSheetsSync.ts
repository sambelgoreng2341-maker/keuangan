/**
 * Utilitas untuk sinkronisasi Google Sheets Database melalui Google Apps Script (Code.gs)
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
    if (saved !== null) {
      return saved;
    }
    // Jika belum diset di localStorage, gunakan default URL dari pengguna
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
 * Tes koneksi ke URL Web App Google Apps Script
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
    const pingUrl = `${url}?action=ping&_t=${Date.now()}`;
    const response = await fetch(pingUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    // Check if redirected to Google Accounts login (Access not set to Anyone)
    if (response.url && response.url.includes('accounts.google.com')) {
      return {
        success: false,
        needsAnyonePermission: true,
        message:
          'Akses Apps Script masih diatur ke "Hanya saya" (meminta login akun Google). Ubah ke "Siapa saja (Anyone)" di menu Deploy.',
      };
    }

    if (!response.ok) {
      return {
        success: false,
        needsAnyonePermission: response.status === 401 || response.status === 403,
        message: `Gagal menghubungi server Google Sheets (Status HTTP: ${response.status}). Pastikan hak akses Web App diatur ke "Siapa saja (Anyone)".`,
      };
    }

    const text = await response.text();
    let json: { status?: string; message?: string; spreadsheetName?: string } = {};
    try {
      json = JSON.parse(text);
    } catch {
      // If HTML was returned, it is likely the Google login page or an HTML error page
      const isLoginRedirect = text.includes('accounts.google.com') || text.includes('ServiceLogin');
      return {
        success: false,
        needsAnyonePermission: isLoginRedirect,
        message: isLoginRedirect
          ? 'Web App dialihkan ke halaman Login Google. Harap atur "Siapa yang memiliki akses (Who has access)" ke "Siapa saja (Anyone)" di Google Apps Script.'
          : 'Respon dari Apps Script bukan format JSON yang valid.',
      };
    }

    if (json.status === 'success') {
      return {
        success: true,
        message: json.message || 'Koneksi ke Google Sheet berhasil terhubung!',
        spreadsheetName: json.spreadsheetName || 'Database KasPintar',
      };
    } else {
      return {
        success: false,
        message: json.message || 'Respon error dari Google Apps Script.',
      };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      needsAnyonePermission: true,
      message: `Tidak dapat menghubungi Google Apps Script (${msg}). Umumnya ini terjadi jika opsi "Who has access" (Siapa yang memiliki akses) belum diatur ke "Anyone" (Siapa saja) saat Deploy.`,
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
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(mutation),
    });

    if (!response.ok) {
      return {
        success: false,
        message: `HTTP error: ${response.status}`,
      };
    }

    const text = await response.text();
    const json = JSON.parse(text);
    if (json.status === 'success') {
      setLastSyncTime();
      return { success: true, message: json.message || 'Berhasil disinkronkan ke Google Sheet' };
    }
    return { success: false, message: json.message || 'Gagal menyimpan mutasi ke sheet' };
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
    const setupUrl = `${url}?action=setup&_t=${Date.now()}`;
    const response = await fetch(setupUrl, {
      method: 'GET',
    });
    const json = await response.json();
    if (json.status === 'success') {
      return { success: true, message: json.message };
    }
    return { success: false, message: json.message || 'Gagal menjalankan setup sheet.' };
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
      action: 'syncLocalData',
      transactions,
      budgets,
      recurring,
    };

    // Menggunakan text/plain untuk menghindari CORS preflight OPTIONS block pada Apps Script
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const json = await response.json();
    if (json.status === 'success') {
      setLastSyncTime();
      return {
        success: true,
        message: `Berhasil mengunggah ${transactions.length} transaksi, ${budgets.length} anggaran, dan ${recurring.length} jadwal rutin ke Google Sheet!`,
      };
    }
    return { success: false, message: json.message || 'Gagal mengunggah data ke sheet.' };
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
    const pullUrl = `${url}?action=getInitialData&_t=${Date.now()}`;
    const response = await fetch(pullUrl, {
      method: 'GET',
    });

    const json = await response.json();
    if (json.status === 'success') {
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
    return { success: false, message: json.message || 'Gagal mengambil data dari Google Sheet.' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: `Gagal memuat data dari sheet: ${msg}` };
  }
}
