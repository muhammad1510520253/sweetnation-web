/**
 * GOOGLE APPS SCRIPT - OPTIMIZED
 * Kontrak API sama dengan Code.gs (kompatibel penuh), plus:
 *   - CacheService: validasi user (6 jam), produk/konfigurasi (2 menit)
 *   - sheet=bootstrap: produk + konfigurasi dalam SATU request
 *   - transaksi&includeItems=1: transaksi + item dalam SATU request
 *   - transaksi-item&transaksiIds=ID1,ID2: item banyak transaksi sekaligus
 *   - Sortir transaksi tanpa new Date() (parse string sekali)
 *   - LockService pada semua penulisan (anti baris ganda saat request bersamaan)
 *   - doPost memvalidasi userId (sebelumnya tidak)
 *
 * Deploy: Extensions > Apps Script > tempel file ini > Deploy > Manage
 * deployments > Edit > New version > Deploy.
 */

// ======================================================
// CACHE
// ======================================================

const CACHE = CacheService.getScriptCache();
const USER_TTL = 21600; // 6 jam
const DATA_TTL = 120;   // 2 menit

/** Baca dari cache, kalau kosong jalankan producer lalu simpan. */
function cached(key, ttl, producer) {
  const hit = CACHE.get(key);
  if (hit !== null) {
    try {
      return JSON.parse(hit);
    } catch (e) {
      // cache rusak -> abaikan
    }
  }
  const value = producer();
  const text = JSON.stringify(value);
  // CacheService membatasi 100KB per key.
  if (text.length < 95000) CACHE.put(key, text, ttl);
  return value;
}

// Cache header per eksekusi (satu request bisa baca beberapa sheet).
const headerCache = {};

function headersOf(sheet) {
  const name = sheet.getName();
  if (!headerCache[name]) headerCache[name] = getHeaders(sheet);
  return headerCache[name];
}

// ======================================================
// HELPER FUNCTIONS
// ======================================================

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" tidak ditemukan`);
  return sheet;
}

function getHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

function getColumnIndex(headers, name) {
  const index = headers.indexOf(name);
  if (index === -1) throw new Error(`Kolom "${name}" tidak ditemukan`);
  return index;
}

function findRows(sheet, column, value) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const range = sheet.getRange(2, column, lastRow - 1, 1);

  const matches = range.createTextFinder(String(value))
    .matchEntireCell(true)
    .matchCase(true)
    .findAll();

  return matches.map(cell => cell.getRow());
}

/**
 * Membaca baris berdasarkan nomor baris.
 * Baris berurutan digabung agar jumlah request Spreadsheet berkurang.
 */
function getRowsByIndexes(sheet, rowNumbers) {
  if (!rowNumbers.length) return [];

  const lastColumn = sheet.getLastColumn();
  const sorted = [...new Set(rowNumbers)].sort((a, b) => a - b);

  const groups = [];
  let start = sorted[0];
  let previous = sorted[0];

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === previous + 1) {
      previous = sorted[i];
    } else {
      groups.push({ start, count: previous - start + 1 });
      start = previous = sorted[i];
    }
  }

  groups.push({ start, count: previous - start + 1 });

  const result = [];

  groups.forEach(group => {
    const values = sheet.getRange(
      group.start,
      1,
      group.count,
      lastColumn
    ).getValues();

    result.push(...values);
  });

  return result;
}

function rowsToObjects(headers, rows) {
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function getDateValue(value) {
  return String(value).split("#")[0].split(" ")[0];
}

/**
 * "19-11-2026#14:30:00" -> "20261119143000" untuk sortir cepat tanpa Date().
 */
function sortKey(value) {
  const text = String(value || "");
  const hash = text.indexOf("#");
  const datePart = hash === -1 ? text : text.slice(0, hash);
  const timePart = hash === -1 ? "" : text.slice(hash + 1);
  const d = datePart.split("-");
  if (d.length !== 3) return text;

  const time = timePart.replace(/:/g, "").padEnd(6, "0");
  return `${d[2]}${d[1]}${d[0]}${time}`;
}

/** Semua baris non-kosong sebagai objek. Dipakai untuk sheet kecil. */
function readAll(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn === 0) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const headers = headersOf(sheet);

  return rowsToObjects(
    headers,
    values.filter(row => row.some(v => v !== "" && v !== null))
  );
}

// ======================================================
// AUTHENTICATION
// ======================================================

function validateUser(ss, userId) {
  if (!userId) return false;

  return cached(`usr:${userId}`, USER_TTL, () => {
    const sheet = getSheet(ss, "akun");

    // userId berada di kolom A, status di kolom F.
    const rows = findRows(sheet, 1, userId);

    for (const rowNumber of rows) {
      if (String(sheet.getRange(rowNumber, 6).getValue()) === "1") {
        return true;
      }
    }

    return false;
  });
}

function login(ss, sheet) {
  const email = eParameter("email");
  const password = eParameter("password");

  if (!email || !password) {
    return jsonResponse({
      error: "Email dan password wajib diisi"
    });
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    return jsonResponse({
      success: false,
      message: "Email atau password salah"
    });
  }

  // Baca kolom email terlebih dahulu.
  const emails = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
  const headers = headersOf(sheet);

  for (let i = 0; i < emails.length; i++) {
    if (String(emails[i][0]) !== String(email)) continue;

    const rowNumber = i + 2;

    // Ambil password dan status.
    const credentials = sheet.getRange(rowNumber, 4, 1, 3).getValues()[0];

    if (
      String(credentials[0]) === String(password) &&
      String(credentials[2]) === "1"
    ) {
      const user = sheet.getRange(
        rowNumber, 1, 1, headers.length
      ).getValues()[0];

      const userData = {};
      headers.forEach((header, index) => {
        userData[header] = user[index];
      });

      // Segarkan cache validasi user.
      CACHE.put(`usr:${userData.user_id}`, "1", USER_TTL);

      return jsonResponse({
        success: true,
        message: "Login Berhasil",
        data: userData
      });
    }
  }

  return jsonResponse({
    success: false,
    message: "Email atau password salah"
  });
}

// Dipakai agar helper login dapat menerima parameter e.
let requestParameters = {};

function eParameter(name) {
  return requestParameters[name];
}

// ======================================================
// GET API
// ======================================================

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const params = e.parameter || {};

    const sheetName = params.sheet || "produk";
    const transaksiId = params.transaksiId;
    const transaksiDate = params.transaksiDate;
    const userId = params.userId;

    // LOGIN (tidak butuh validasi user)
    if (sheetName === "akun") {
      requestParameters = params;
      return login(ss, getSheet(ss, "akun"));
    }

    // VALIDASI USER (di-cache 6 jam)
    if (!validateUser(ss, userId)) {
      return jsonResponse({
        success: false,
        message: "unauthorize"
      });
    }

    // BOOTSTRAP: produk + konfigurasi sekaligus, satu round trip.
    if (sheetName === "bootstrap") {
      const produk = cached(
        `all:produk:${getSheet(ss, "produk").getLastRow()}`,
        DATA_TTL,
        () => readAll(getSheet(ss, "produk"))
      );

      const konfigurasi = cached(
        `all:konfigurasi:${getSheet(ss, "konfigurasi").getLastRow()}`,
        DATA_TTL,
        () => readAll(getSheet(ss, "konfigurasi"))
      );

      return jsonResponse({
        success: true,
        message: "Success",
        data: { produk, konfigurasi }
      });
    }

    const sheet = getSheet(ss, sheetName);
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow === 0 || lastColumn === 0) {
      return jsonResponse({
        success: false,
        message: `No data found in sheet "${sheetName}"`
      });
    }

    const headers = headersOf(sheet);
    const dataCount = lastRow - 1;

    if (dataCount <= 0) {
      return jsonResponse({
        success: true,
        message: "Success",
        data: []
      });
    }

    let rows = [];

    // TRANSAKSI
    if (sheetName === "transaksi") {
      if (!transaksiDate) {
        return jsonResponse({
          success: false,
          message: "Parameter 'transaksiDate' is required"
        });
      }

      const dateColumn = getColumnIndex(headers, "created_at") + 1;
      const dates = sheet.getRange(2, dateColumn, dataCount, 1).getValues();
      const wanted = transaksiDate.split(" ")[0];

      const matchedRows = [];
      dates.forEach((row, index) => {
        if (getDateValue(row[0]) === wanted) matchedRows.push(index + 2);
      });

      rows = rowsToObjects(headers, getRowsByIndexes(sheet, matchedRows));

      // Sortir terbaru dulu, tanpa new Date().
      rows.sort((a, b) => (sortKey(b.created_at) > sortKey(a.created_at) ? 1 : -1));

      // includeItems=1: item semua transaksi ikut dalam response yang sama.
      if (params.includeItems === "1" && rows.length) {
        const detail = getSheet(ss, "transaksi-item");
        const detailHeaders = headersOf(detail);
        const detailCount = detail.getLastRow() - 1;

        if (detailCount > 0) {
          const idColumn = getColumnIndex(detailHeaders, "transaksi_id") + 1;
          const ids = detail.getRange(2, idColumn, detailCount, 1).getValues();
          const wantedIds = new Set(rows.map(t => String(t.transaksi_id)));

          const itemRows = [];
          ids.forEach((row, index) => {
            if (wantedIds.has(String(row[0]))) itemRows.push(index + 2);
          });

          const items = rowsToObjects(
            detailHeaders,
            getRowsByIndexes(detail, itemRows)
          );

          const byId = {};
          items.forEach(item => {
            const key = String(item.transaksi_id);
            (byId[key] = byId[key] || []).push(item);
          });

          rows.forEach(t => {
            t.items = byId[String(t.transaksi_id)] || [];
          });
        }
      }

    // TRANSAKSI ITEM
    } else if (sheetName === "transaksi-item") {
      // Dukung batch: transaksiIds=ID1,ID2,ID3
      const batch = params.transaksiIds
        ? params.transaksiIds.split(",").map(s => s.trim()).filter(Boolean)
        : [];

      if (!transaksiId && !batch.length) {
        return jsonResponse({
          success: false,
          message: "Parameter 'transaksiId' atau 'transaksiIds' is required",
          data: []
        });
      }

      const wantedIds = new Set(batch.length ? batch : [transaksiId]);
      const idColumn = getColumnIndex(headers, "transaksi_id") + 1;
      const ids = sheet.getRange(2, idColumn, dataCount, 1).getValues();

      const matchedRows = [];
      ids.forEach((row, index) => {
        if (wantedIds.has(String(row[0]))) matchedRows.push(index + 2);
      });

      rows = rowsToObjects(headers, getRowsByIndexes(sheet, matchedRows));

    // SHEET LAIN (produk, konfigurasi, stok, summary, ...)
    } else {
      // Sheet master yang jarang berubah -> cache 2 menit.
      if (sheetName === "produk" || sheetName === "konfigurasi") {
        rows = cached(
          `all:${sheetName}:${lastRow}`,
          DATA_TTL,
          () => readAll(sheet)
        );

        return jsonResponse({
          success: true,
          message: "Success",
          data: rows
        });
      }

      const limit = Math.max(0, parseInt(params.limit, 10) || 0);
      const offset = Math.max(0, parseInt(params.offset, 10) || 0);
      const startRow = 2 + offset;

      if (startRow > lastRow) {
        rows = [];
      } else {
        const count = limit > 0
          ? Math.min(limit, lastRow - startRow + 1)
          : lastRow - startRow + 1;

        const values = sheet.getRange(startRow, 1, count, lastColumn).getValues();

        rows = rowsToObjects(
          headers,
          values.filter(row => row.some(v => v !== "" && v !== null))
        );
      }
    }

    return jsonResponse({
      success: true,
      message: "Success",
      data: rows
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.toString(),
      data: null
    });
  }
}

// ======================================================
// POST API
// ======================================================

function doPost(e) {
  let lock = null;

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const params = e.parameter || {};
    const sheetName = params.sheet || "transaksi";

    const requestData = JSON.parse(e.postData.contents || "{}");

    if (!requestData || Object.keys(requestData).length === 0) {
      return jsonResponse({
        success: false,
        message: "Invalid request data",
        data: null
      });
    }

    if (!validateUser(ss, params.userId)) {
      return jsonResponse({
        success: false,
        message: "unauthorize"
      });
    }

    const isUpdate = requestData.isUpdate || false;
    const isDelete = requestData.isDelete || false;

    // Cegah baris ganda saat dua request menyimpan bersamaan.
    lock = LockService.getScriptLock();
    lock.waitLock(20000);

    // ==============================================
    // TRANSAKSI
    // ==============================================

    if (sheetName === "transaksi") {
      const transaksi = getSheet(ss, "transaksi");
      const detail = getSheet(ss, "transaksi-item");

      if (isUpdate) {
        const id = requestData.id;
        const matchedRows = findRows(transaksi, 1, id);

        if (!matchedRows.length) {
          return jsonResponse({
            success: false,
            message: "ID tidak ditemukan"
          });
        }

        // Update kolom J.
        transaksi.getRange(matchedRows[0], 10).setValue(requestData.value);

        return jsonResponse({
          success: true,
          message: "Data berhasil diubah"
        });
      }

      const headers = headersOf(transaksi);

      const rowData = headers.map(header => {
        const value = requestData[header];

        return value === undefined || value === null
          ? ""
          : header === "created_at"
            ? String(value)
            : value;
      });

      transaksi.getRange(
        transaksi.getLastRow() + 1,
        1,
        1,
        rowData.length
      ).setValues([rowData]);

      if (Array.isArray(requestData.items) && requestData.items.length > 0) {
        const detailHeaders = headersOf(detail);

        const detailRows = requestData.items.map(item =>
          detailHeaders.map(header => {
            if (header === "transaksi_id") return requestData.transaksi_id;

            const value = item[header];

            if (value === undefined || value === null) return "";

            return header === "created_at" ? String(value) : value;
          })
        );

        detail.getRange(
          detail.getLastRow() + 1,
          1,
          detailRows.length,
          detailHeaders.length
        ).setValues(detailRows);
      }

      return jsonResponse({
        success: true,
        message: "Data berhasil ditambah"
      });
    }

    // ==============================================
    // STOK
    // ==============================================

    if (sheetName === "stok") {
      const sheet = getSheet(ss, "stok");

      const id = requestData.stok_id;
      const matchedRows = findRows(sheet, 1, id);

      if (isDelete) {
        if (!matchedRows.length) {
          return jsonResponse({
            success: false,
            message: "ID tidak ditemukan"
          });
        }

        sheet.deleteRow(matchedRows[0]);

        return jsonResponse({
          success: true,
          message: "Data berhasil dihapus"
        });
      }

      const newData = [
        requestData.stok_id,
        requestData.nama,
        requestData.harga,
        requestData.satuan,
        requestData.harga_satuan,
        requestData.status
      ];

      if (isUpdate) {
        if (!matchedRows.length) {
          return jsonResponse({
            success: false,
            message: "ID tidak ditemukan"
          });
        }

        sheet.getRange(
          matchedRows[0],
          1,
          1,
          newData.length
        ).setValues([newData]);

        return jsonResponse({
          success: true,
          message: "Data berhasil diubah"
        });
      }

      sheet.getRange(
        sheet.getLastRow() + 1,
        1,
        1,
        newData.length
      ).setValues([newData]);

      return jsonResponse({
        success: true,
        message: "Data berhasil ditambah"
      });
    }

    return jsonResponse({
      success: false,
      message: `Sheet "${sheetName}" tidak didukung`
    });

  } catch (error) {
    return jsonResponse({
      success: false,
      message: error.toString(),
      data: null
    });
  } finally {
    if (lock) {
      try {
        lock.releaseLock();
      } catch (e) {
        // abaikan
      }
    }
  }
}
