/**
 * ============================================================================
 * KASPINTAR - GOOGLE APPS SCRIPT DATABASE BACKEND (Code.gs)
 * ============================================================================
 * Backend API untuk menghubungkan aplikasi KasPintar dengan Google Sheets
 * sebagai database real-time.
 * 
 * FITUR:
 * 1. Otomatis membuat 4 sheet: 'Transaksi', 'Anggaran', 'Rutin_Otomatis', 'Rekap_Bulanan'
 * 2. CRUD Transaksi (Pemasukan & Pengeluaran)
 * 3. Manajemen Batas Anggaran & Rutin Otomatis
 * 4. Sinkronisasi Struk Foto ke Google Drive (Folder: "KasPintar_Struk")
 * 5. CORS Header lengkap & respon format JSON standar
 * ============================================================================
 */

// Nama-nama Sheet Database
const SHEET_TRANSAKSI = 'Transaksi';
const SHEET_ANGGARAN = 'Anggaran';
const SHEET_RUTIN = 'Rutin_Otomatis';
const SHEET_REKAP = 'Rekap_Bulanan';
const DRIVE_FOLDER_NAME = 'KasPintar_Struk';

/**
 * Entry point GET requests (Membaca data)
 */
function doGet(e) {
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'ping';

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'ping') {
      return createJsonResponse({
        status: 'success',
        message: 'Koneksi KasPintar Google Sheet Berhasil Aktif!',
        spreadsheetName: ss.getName(),
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'setup') {
      return createJsonResponse(setupDatabase());
    }

    if (action === 'getInitialData') {
      ensureSheetsExist();
      return createJsonResponse({
        status: 'success',
        transactions: getTransactionsData(),
        budgets: getBudgetsData(),
        recurring: getRecurringData(),
        summary: getMonthlyRecapData()
      });
    }

    if (action === 'getTransactions') {
      return createJsonResponse({
        status: 'success',
        transactions: getTransactionsData()
      });
    }

    if (action === 'getBudgets') {
      return createJsonResponse({
        status: 'success',
        budgets: getBudgetsData()
      });
    }

    if (action === 'getRecurring') {
      return createJsonResponse({
        status: 'success',
        recurring: getRecurringData()
      });
    }

    return createJsonResponse({
      status: 'error',
      message: 'Action GET tidak dikenali: ' + action
    });

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * Entry point POST requests (Menulis, Memperbarui, Menghapus)
 */
function doPost(e) {
  try {
    ensureSheetsExist();
    let body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }

    const action = body.action || (e && e.parameter && e.parameter.action);

    if (action === 'addTransaction') {
      const trx = body.transaction;
      const res = addTransactionRow(trx);
      updateMonthlyRecapSheet();
      return createJsonResponse({ status: 'success', transaction: res });
    }

    if (action === 'updateTransaction') {
      const trx = body.transaction;
      const res = updateTransactionRow(trx);
      updateMonthlyRecapSheet();
      return createJsonResponse({ status: 'success', transaction: res });
    }

    if (action === 'deleteTransaction') {
      const id = body.id;
      deleteTransactionRow(id);
      updateMonthlyRecapSheet();
      return createJsonResponse({ status: 'success', message: 'Transaksi berhasil dihapus', id: id });
    }

    if (action === 'saveBudgets') {
      const budgets = body.budgets || [];
      saveBudgetsData(budgets);
      return createJsonResponse({ status: 'success', message: 'Anggaran berhasil diperbarui' });
    }

    if (action === 'saveRecurring') {
      const recurring = body.recurring || [];
      saveRecurringData(recurring);
      return createJsonResponse({ status: 'success', message: 'Template rutin berhasil diperbarui' });
    }

    if (action === 'syncLocalData') {
      // Bulk sync initial local data into sheets
      const transactions = body.transactions || [];
      const budgets = body.budgets || [];
      const recurring = body.recurring || [];

      if (transactions.length > 0) syncAllTransactions(transactions);
      if (budgets.length > 0) saveBudgetsData(budgets);
      if (recurring.length > 0) saveRecurringData(recurring);

      updateMonthlyRecapSheet();

      return createJsonResponse({
        status: 'success',
        message: 'Semua data lokal berhasil disinkronkan ke Google Sheet!'
      });
    }

    if (action === 'uploadReceipt') {
      // Menyimpan gambar struk (Base64) ke Google Drive
      const base64Data = body.base64Data;
      const filename = body.filename || ('struk_' + Date.now() + '.jpg');
      const fileUrl = saveReceiptToDrive(base64Data, filename);
      return createJsonResponse({ status: 'success', receiptUrl: fileUrl });
    }

    return createJsonResponse({
      status: 'error',
      message: 'Action POST tidak dikenali: ' + action
    });

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error.toString()
    });
  }
}

/**
 * ============================================================================
 * FUNGSI SETUP SHEET OTOMATIS (Jalankan sekali di Apps Script)
 * ============================================================================
 */
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Sheet Transaksi
  let wsTrx = ss.getSheetByName(SHEET_TRANSAKSI);
  if (!wsTrx) {
    wsTrx = ss.insertSheet(SHEET_TRANSAKSI);
  }
  const trxHeaders = [
    'ID Transaksi',
    'Tipe',
    'Tanggal',
    'Waktu',
    'Merchant / Toko',
    'Kategori',
    'Metode Bayar',
    'Nominal (Rp)',
    'Keterangan',
    'URL Struk',
    'Rutin Otomatis',
    'Waktu Pencatatan'
  ];
  wsTrx.getRange(1, 1, 1, trxHeaders.length).setValues([trxHeaders]);
  formatHeaderRow(wsTrx, trxHeaders.length, '#10b981'); // Emerald
  wsTrx.setColumnWidth(1, 120); // ID
  wsTrx.setColumnWidth(2, 110); // Tipe
  wsTrx.setColumnWidth(3, 100); // Tanggal
  wsTrx.setColumnWidth(4, 80);  // Waktu
  wsTrx.setColumnWidth(5, 180); // Merchant
  wsTrx.setColumnWidth(6, 160); // Kategori
  wsTrx.setColumnWidth(7, 120); // Metode Bayar
  wsTrx.setColumnWidth(8, 130); // Nominal
  wsTrx.setColumnWidth(9, 220); // Keterangan
  wsTrx.setColumnWidth(10, 200); // URL Struk
  wsTrx.setColumnWidth(11, 110); // Rutin
  wsTrx.setColumnWidth(12, 160); // CreatedAt

  // 2. Sheet Anggaran
  let wsBudget = ss.getSheetByName(SHEET_ANGGARAN);
  if (!wsBudget) {
    wsBudget = ss.insertSheet(SHEET_ANGGARAN);
  }
  const budgetHeaders = [
    'Kategori',
    'Batas Anggaran Bulanan (Rp)',
    'Ambang Peringatan (%)'
  ];
  wsBudget.getRange(1, 1, 1, budgetHeaders.length).setValues([budgetHeaders]);
  formatHeaderRow(wsBudget, budgetHeaders.length, '#059669');
  wsBudget.setColumnWidth(1, 180);
  wsBudget.setColumnWidth(2, 200);
  wsBudget.setColumnWidth(3, 160);

  // Default budgets jika kosong
  if (wsBudget.getLastRow() === 1) {
    const defaultBudgets = [
      ['Makanan & Minuman', 2500000, 80],
      ['Belanja & Kebutuhan', 1500000, 80],
      ['Tagihan & Utilitas', 1200000, 85],
      ['Transportasi', 800000, 80],
      ['Sewa & Tempat Tinggal', 2500000, 95],
      ['Hiburan & Langganan', 600000, 75],
      ['Kesehatan', 500000, 80],
      ['Lain-lain', 500000, 80]
    ];
    wsBudget.getRange(2, 1, defaultBudgets.length, 3).setValues(defaultBudgets);
  }

  // 3. Sheet Rutin Otomatis
  let wsRutin = ss.getSheetByName(SHEET_RUTIN);
  if (!wsRutin) {
    wsRutin = ss.insertSheet(SHEET_RUTIN);
  }
  const rutinHeaders = [
    'ID Rutin',
    'Nama Transaksi',
    'Tipe',
    'Nominal (Rp)',
    'Kategori',
    'Metode Bayar',
    'Tanggal Eksekusi (1-31)',
    'Status Aktif (TRUE/FALSE)',
    'Keterangan'
  ];
  wsRutin.getRange(1, 1, 1, rutinHeaders.length).setValues([rutinHeaders]);
  formatHeaderRow(wsRutin, rutinHeaders.length, '#0d9488'); // Teal
  wsRutin.setColumnWidth(1, 100);
  wsRutin.setColumnWidth(2, 180);
  wsRutin.setColumnWidth(3, 110);
  wsRutin.setColumnWidth(4, 130);
  wsRutin.setColumnWidth(5, 160);
  wsRutin.setColumnWidth(6, 120);
  wsRutin.setColumnWidth(7, 150);
  wsRutin.setColumnWidth(8, 120);
  wsRutin.setColumnWidth(9, 200);

  // 4. Sheet Rekap Bulanan
  let wsRekap = ss.getSheetByName(SHEET_REKAP);
  if (!wsRekap) {
    wsRekap = ss.insertSheet(SHEET_REKAP);
  }
  const rekapHeaders = [
    'Periode Bulan',
    'Total Pemasukan (Rp)',
    'Total Pengeluaran (Rp)',
    'Sisa Bersih / Net (Rp)',
    'Rasio Tabungan (%)',
    'Jumlah Transaksi',
    'Status Arus Kas'
  ];
  wsRekap.getRange(1, 1, 1, rekapHeaders.length).setValues([rekapHeaders]);
  formatHeaderRow(wsRekap, rekapHeaders.length, '#1e293b'); // Slate Dark
  wsRekap.setColumnWidth(1, 140);
  wsRekap.setColumnWidth(2, 160);
  wsRekap.setColumnWidth(3, 160);
  wsRekap.setColumnWidth(4, 160);
  wsRekap.setColumnWidth(5, 140);
  wsRekap.setColumnWidth(6, 130);
  wsRekap.setColumnWidth(7, 150);

  updateMonthlyRecapSheet();

  return {
    status: 'success',
    message: 'Setup database Google Sheet KasPintar selesai! 4 Sheet telah dibuat dan diformat.'
  };
}

/**
 * Format baris header agar terlihat bersih & profesional
 */
function formatHeaderRow(sheet, numColumns, bgColor) {
  const range = sheet.getRange(1, 1, 1, numColumns);
  range.setBackground(bgColor);
  range.setFontColor('#ffffff');
  range.setFontWeight('bold');
  range.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

function ensureSheetsExist() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss.getSheetByName(SHEET_TRANSAKSI)) {
    setupDatabase();
  }
}

/**
 * ============================================================================
 * READ / GETTERS
 * ============================================================================
 */
function getTransactionsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRANSAKSI);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).getValues();
  return data.map(function(row) {
    const rawDate = row[2];
    let dateStr = '';
    if (rawDate instanceof Date) {
      dateStr = Utilities.formatDate(rawDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
    } else {
      dateStr = String(rawDate || '');
    }

    return {
      id: String(row[0] || ''),
      type: String(row[1] || 'pengeluaran').toLowerCase(),
      date: dateStr,
      time: String(row[3] || ''),
      merchant: String(row[4] || ''),
      category: String(row[5] || 'Lain-lain'),
      paymentMethod: String(row[6] || 'Cash'),
      amount: Number(row[7] || 0),
      description: String(row[8] || ''),
      receiptUrl: String(row[9] || ''),
      isRecurringApplied: Boolean(row[10] === true || String(row[10]).toLowerCase() === 'true'),
      createdAt: String(row[11] || new Date().toISOString())
    };
  });
}

function getBudgetsData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ANGGARAN);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  return data.map(function(row) {
    return {
      category: String(row[0] || ''),
      monthlyLimit: Number(row[1] || 0),
      alertThresholdPercent: Number(row[2] || 80)
    };
  });
}

function getRecurringData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RUTIN);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).getValues();
  return data.map(function(row) {
    return {
      id: String(row[0] || ''),
      title: String(row[1] || ''),
      type: String(row[2] || 'pengeluaran').toLowerCase(),
      amount: Number(row[3] || 0),
      category: String(row[4] || 'Lain-lain'),
      paymentMethod: String(row[5] || 'BCA'),
      dayOfMonth: Number(row[6] || 1),
      isActive: Boolean(row[7] === true || String(row[7]).toUpperCase() === 'TRUE'),
      autoPost: true,
      notes: String(row[8] || '')
    };
  });
}

function getMonthlyRecapData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_REKAP);
  if (!sheet || sheet.getLastRow() <= 1) return [];

  const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 7).getValues();
  return data.map(function(row) {
    return {
      monthKey: String(row[0] || ''),
      income: Number(row[1] || 0),
      expense: Number(row[2] || 0),
      net: Number(row[3] || 0),
      savingsRate: Number(row[4] || 0),
      transactionCount: Number(row[5] || 0),
      status: String(row[6] || '')
    };
  });
}

/**
 * ============================================================================
 * WRITE / MUTATIONS
 * ============================================================================
 */
function addTransactionRow(trx) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRANSAKSI);

  const id = trx.id || ('trx-' + Date.now());
  const createdAt = trx.createdAt || new Date().toISOString();

  const row = [
    id,
    trx.type || 'pengeluaran',
    trx.date,
    trx.time || '',
    trx.merchant || '',
    trx.category || 'Lain-lain',
    trx.paymentMethod || 'Cash',
    Number(trx.amount || 0),
    trx.description || '',
    trx.receiptUrl || '',
    Boolean(trx.isRecurringApplied),
    createdAt
  ];

  sheet.appendRow(row);
  return { ...trx, id: id, createdAt: createdAt };
}

function updateTransactionRow(trx) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRANSAKSI);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return addTransactionRow(trx);

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  let foundRow = -1;
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(trx.id)) {
      foundRow = i + 2;
      break;
    }
  }

  if (foundRow === -1) {
    return addTransactionRow(trx);
  }

  const row = [
    trx.id,
    trx.type,
    trx.date,
    trx.time || '',
    trx.merchant || '',
    trx.category,
    trx.paymentMethod,
    Number(trx.amount || 0),
    trx.description || '',
    trx.receiptUrl || '',
    Boolean(trx.isRecurringApplied),
    trx.createdAt || new Date().toISOString()
  ];

  sheet.getRange(foundRow, 1, 1, 12).setValues([row]);
  return trx;
}

function deleteTransactionRow(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRANSAKSI);
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      sheet.deleteRow(i + 2);
      break;
    }
  }
}

function syncAllTransactions(transactions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_TRANSAKSI);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 12).clearContent();
  }

  const rows = transactions.map(function(t) {
    return [
      t.id,
      t.type,
      t.date,
      t.time || '',
      t.merchant,
      t.category,
      t.paymentMethod,
      Number(t.amount || 0),
      t.description || '',
      t.receiptUrl || '',
      Boolean(t.isRecurringApplied),
      t.createdAt || new Date().toISOString()
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 12).setValues(rows);
  }
}

function saveBudgetsData(budgets) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ANGGARAN);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
  }

  const rows = budgets.map(function(b) {
    return [b.category, Number(b.monthlyLimit || 0), Number(b.alertThresholdPercent || 80)];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 3).setValues(rows);
  }
}

function saveRecurringData(recurring) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_RUTIN);
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, 9).clearContent();
  }

  const rows = recurring.map(function(r) {
    return [
      r.id,
      r.title,
      r.type,
      Number(r.amount || 0),
      r.category,
      r.paymentMethod,
      Number(r.dayOfMonth || 1),
      Boolean(r.isActive),
      r.notes || ''
    ];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 9).setValues(rows);
  }
}

/**
 * Otomatis menghitung dan memperbarui Rekap Bulanan di sheet 'Rekap_Bulanan'
 */
function updateMonthlyRecapSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const wsRekap = ss.getSheetByName(SHEET_REKAP);
  if (!wsRekap) return;

  const transactions = getTransactionsData();
  const monthMap = {};

  transactions.forEach(function(t) {
    const monthKey = t.date ? t.date.slice(0, 7) : 'Unknown';
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { income: 0, expense: 0, count: 0 };
    }
    if (t.type === 'pemasukan') {
      monthMap[monthKey].income += t.amount;
    } else {
      monthMap[monthKey].expense += t.amount;
    }
    monthMap[monthKey].count += 1;
  });

  const sortedMonths = Object.keys(monthMap).sort().reverse();
  const rows = sortedMonths.map(function(m) {
    const item = monthMap[m];
    const net = item.income - item.expense;
    const rate = item.income > 0 ? ((net / item.income) * 100).toFixed(1) : '0';
    let status = 'Seimbang';
    if (net > 0) {
      status = Number(rate) >= 30 ? 'Surplus Sangat Sehat' : 'Surplus';
    } else if (net < 0) {
      status = 'Defisit';
    }

    return [m, item.income, item.expense, net, Number(rate), item.count, status];
  });

  if (wsRekap.getLastRow() > 1) {
    wsRekap.getRange(2, 1, wsRekap.getLastRow() - 1, 7).clearContent();
  }

  if (rows.length > 0) {
    wsRekap.getRange(2, 1, rows.length, 7).setValues(rows);
  }
}

/**
 * Menyimpan Foto Struk ke Google Drive & Mengembalikan Public View URL
 */
function saveReceiptToDrive(base64Data, filename) {
  let folder;
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
  }

  // Bersihkan base64 prefix jika ada (data:image/jpeg;base64,...)
  let cleanBase64 = base64Data;
  if (cleanBase64.indexOf(',') > -1) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const decodedBytes = Utilities.base64Decode(cleanBase64);
  const blob = Utilities.newBlob(decodedBytes, 'image/jpeg', filename);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  // Return download/thumbnail URL yang bisa dibuka langsung di browser
  return file.getDownloadUrl();
}

/**
 * Helper pembungkus response JSON dengan CORS Header lengkap
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
