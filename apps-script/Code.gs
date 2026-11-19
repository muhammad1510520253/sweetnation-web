/**
 * GOOGLE APPS SCRIPT - VERSI ASLI (baseline)
 * Disimpan sebagai referensi. Deploy versi ini bila butuh perilaku lama.
 * Endpoint: lihat BASE di src/api.ts
 */

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

// ======================================================
// AUTHENTICATION
// ======================================================

function validateUser(ss, userId) {
  const sheet = getSheet(ss, "akun");

  // userId berada di kolom A, status di kolom F.
  const rows = findRows(sheet, 1, userId);

  for (const rowNumber of rows) {
    const status = sheet.getRange(rowNumber, 6).getValue();

    if (String(status) === "1") {
      return true;
    }
  }

  return false;
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

  const headers = getHeaders(sheet);

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

    const sheet = getSheet(ss, sheetName);

    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    if (lastRow === 0 || lastColumn === 0) {
      return jsonResponse({
        success: false,
        message: `No data found in sheet "${sheetName}"`
      });
    }

    // LOGIN
    if (sheetName === "akun") {
      requestParameters = params;
      return login(ss, sheet);
    }

    // VALIDASI USER
    if (!validateUser(ss, userId)) {
      return jsonResponse({
        success: false,
        message: "unauthorize"
      });
    }

    const headers = getHeaders(sheet);
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

      // Hanya baca kolom tanggal.
      const dates = sheet.getRange(
        2, dateColumn, dataCount, 1
      ).getValues();

      const matchedRows = [];

      dates.forEach((row, index) => {
        if (getDateValue(row[0]) === transaksiDate.split(" ")[0]) {
          matchedRows.push(index + 2);
        }
      });

      rows = getRowsByIndexes(sheet, matchedRows);

      rows = rowsToObjects(headers, rows);

      rows.sort((a, b) =>
        new Date(b.created_at) - new Date(a.created_at)
      );

    // TRANSAKSI ITEM
    } else if (sheetName === "transaksi-item") {
      if (!transaksiId) {
        return jsonResponse({
          success: false,
          message: "Parameter 'transaksiId' is required",
          data: []
        });
      }

      const idColumn = getColumnIndex(headers, "transaksi_id") + 1;

      // Hanya baca kolom transaksi_id.
      const ids = sheet.getRange(
        2, idColumn, dataCount, 1
      ).getValues();

      const matchedRows = [];

      ids.forEach((row, index) => {
        if (String(row[0]) === String(transaksiId)) {
          matchedRows.push(index + 2);
        }
      });

      rows = getRowsByIndexes(sheet, matchedRows);
      rows = rowsToObjects(headers, rows);

    // SHEET LAIN
    } else {
      const limit = Math.max(
        0,
        parseInt(params.limit, 10) || 0
      );

      const offset = Math.max(
        0,
        parseInt(params.offset, 10) || 0
      );

      const startRow = 2 + offset;

      if (startRow > lastRow) {
        rows = [];
      } else {
        const count = limit > 0
          ? Math.min(limit, lastRow - startRow + 1)
          : lastRow - startRow + 1;

        const values = sheet.getRange(
          startRow, 1, count, lastColumn
        ).getValues();

        rows = values
          .filter(row => row.some(
            value => value !== "" && value !== null
          ));

        rows = rowsToObjects(headers, rows);
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

    const isUpdate = requestData.isUpdate || false;
    const isDelete = requestData.isDelete || false;

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
        transaksi.getRange(matchedRows[0], 10).setValue(
          requestData.value
        );

        return jsonResponse({
          success: true,
          message: "Data berhasil diubah"
        });
      }

      // Ambil header satu kali.
      const headers = getHeaders(transaksi);

      const rowData = headers.map(header => {
        const value = requestData[header];

        return value === undefined || value === null
          ? ""
          : header === "created_at"
            ? String(value)
            : value;
      });

      // Simpan transaksi.
      transaksi.getRange(
        transaksi.getLastRow() + 1,
        1,
        1,
        rowData.length
      ).setValues([rowData]);

      // Simpan semua detail sekaligus.
      if (
        Array.isArray(requestData.items) &&
        requestData.items.length > 0
      ) {
        const detailHeaders = getHeaders(detail);

        const detailRows = requestData.items.map(item => {
          return detailHeaders.map(header => {
            if (header === "transaksi_id") {
              return requestData.transaksi_id;
            }

            const value = item[header];

            if (value === undefined || value === null) {
              return "";
            }

            return header === "created_at"
              ? String(value)
              : value;
          });
        });

        const startRow = detail.getLastRow() + 1;

        detail.getRange(
          startRow,
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
  }
}
