/***********************
 * ChangeLogBridge.gs
 * Direct app-side ChangeLog append helper.
 *
 * Keep this function in exactly one file.
 ***********************/

function appendChangeLogRows_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("ChangeLog");
  if (!sheet) sheet = ss.insertSheet("ChangeLog");

  const headers = ["Timestamp", "Source", "Sheet", "Title", "Row", "Field", "Old Value", "New Value", "User", "Function"];
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const lastCol = Math.max(sheet.getLastColumn(), headers.length);
    const currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || "").trim());
    const missing = headers.some((header, idx) => String(currentHeaders[idx] || "").trim() !== header);
    if (missing) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
  if (rows.length) {
    const normalizedRows = rows.map((row) => {
      const record = row || {};
      return [
        String(record["Timestamp"] || new Date().toISOString()).trim(),
        String(record["Source"] || "CDL App").trim(),
        String(record["Sheet"] || "").trim(),
        String(record["Title"] || "").trim(),
        String(record["Row"] || "").trim(),
        String(record["Field"] || "").trim(),
        String(record["Old Value"] || "").trim(),
        String(record["New Value"] || "").trim(),
        String(record["User"] || "app").trim(),
        String(record["Function"] || "").trim(),
      ];
    });

    const startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, normalizedRows.length, headers.length).setValues(normalizedRows);
  }

  const maxDataRows = 2000;
  const dataRowCount = Math.max(0, sheet.getLastRow() - 1);
  if (dataRowCount > maxDataRows) {
    sheet.deleteRows(2, dataRowCount - maxDataRows);
  }

  return createCORSResponse("Success");
}

function testAppendChangeLogRows_() {
  return appendChangeLogRows_({
    rows: [{
      Timestamp: new Date().toISOString(),
      Source: "CDL App",
      Sheet: "Movies",
      Title: "TEST",
      Row: "0",
      Field: "Watch Status",
      "Old Value": "Backlog",
      "New Value": "Started",
      User: "app",
      Function: "testAppendChangeLogRows_"
    }]
  });
}
