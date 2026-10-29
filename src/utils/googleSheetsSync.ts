/**
 * Utilitas untuk sinkronisasi Google Sheets Database melalui Google Apps Script (Code.gs)
 * Kompatibel dengan Static Hosting (Cloudflare Pages, Vercel, Netlify) & Server AI Studio
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
 * Sinkronisasi URL Google Sheets dengan server backend jika tersedia
 */
export async function fetchServerGSheetUrl(): Promise<string> {
  try {
    const res = await fetch('/api/config/gsheet');
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.url && typeof data.url === 'string' && data.url.trim().length > 0) {
          saveGSheetUrl(data.url.trim());
          return data.url.trim();
        }
      }
    }
  } catch {
    // fallback to local storage on static hosting
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
  } catch {
    // fallback on static hosting
  }
}

/**
 * Helper request ke Google Apps Script yang aman terhadap format HTML (Anti Unexpected token '<')
 * Bekerja langsung di Cloudflare Pages, browser HP, maupun dev server.
 */
async function requestGSheet(
  url: string,
  params: Record<string, string> = {},
  payload?: any
): Promise<any> {
  const trimmedUrl = url.trim();
  const urlObj = new URL(trimmedUrl);
  for (const [key, val] of Object.entries(params)) {
    urlObj.searchParams.set(key, val);
  }
  urlObj.searchParams.set('_t', String(Date.now()));

  const isPost = payload !== undefined;
  const targetUrl = urlObj.toString();

  try {
    const response = await fetch(targetUrl, {
      method: isPost ? 'POST' : 'GET',
      headers: isPost ? { 'Content-Type': 'text/plain;charset=utf-8' } : undefined,
      body: isPost ? JSON.stringify(payload) : undefined,
      redirect: 'follow',
    });

    const text = await response.text();
    const cleanText = text.trim();

    // Deteksi jika respon adalah HTML (misalnya redirect Google login atau error page)
    if (cleanText.startsWith('<') || cleanText.includes('<!DOCTYPE') || cleanText.includes('<!doctype')) {
      if (cleanText.includes('accounts.google.com') || cleanText.includes('ServiceLogin')) {
        return {
          status: 'error',
          success: false,
          needsAnyonePermission: true,
          message:
            'Akses Google Apps Script dialihkan ke login Google. Harap atur izin "Who has access" (Siapa yang memiliki akses) ke "Anyone" (Siapa saja) di menu Deploy Web App.',
        };
      }
      if (cleanText.includes('Sorry, unable to open the file') || cleanText.includes('Page not found')) {
        return {
          status: 'error',
          success: false,
          message:
            'File spreadsheet Google Sheets tidak ditemukan atau belum dipublikasikan. Pastikan URL Web App benar.',
        };
      }
      return {
        status: 'error',
        success: false,
        message: 'Respon dari Google Apps Script berupa HTML, bukan format JSON.',
      };
    }

    try {
      return JSON.parse(cleanText);
    } catch {
      return {
        status: 'error',
        success: false,
        message: 'Format respon dari Google Apps Script tidak valid.',
      };
    }
  } catch (directErr: any) {
    // Jika fetch langsung gagal (misal koneksi jaringan atau CORS), coba proxy backend jika tersedia
    try {
      const proxyUrl = isPost
        ? '/api/gsheet-proxy'
        : `/api/gsheet-proxy?targetUrl=${encodeURIComponent(targetUrl)}`;
      const proxyRes = await fetch(proxyUrl, {
        method: isPost ? 'POST' : 'GET',
        headers: isPost ? { 'Content-Type': 'application/json' } : undefined,
        body: isPost ? JSON.stringify({ targetUrl: trimmedUrl, ...payload }) : undefined,
      });

      const proxyText = await proxyRes.text();
      const cleanProxy = proxyText.trim();
      if (!cleanProxy.startsWith('<')) {
        return JSON.parse(cleanProxy);
      }
    } catch {
      // abaikan fallback proxy jika gagal
    }

    throw directErr;
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
    const json = await requestGSheet(url, { action: 'ping' });

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
      message: `Tidak dapat menghubungi Google Apps Script (${msg}). Pastikan koneksi internet aktif.`,
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
    const json = await requestGSheet(targetUrl, {}, mutation);

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
    const json = await requestGSheet(url, { action: 'setup' });
    if (json.status === 'success' || json.success === true) {
      return { success: true, message: json.message || '4 Sheet berhasil dibuat dan diformat!' };
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
      action: 'syncLocalData',
      transactions,
      budgets,
      recurring,
    };

    const json = await requestGSheet(url, {}, payload);

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
    const json = await requestGSheet(url, { action: 'getInitialData' });

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
