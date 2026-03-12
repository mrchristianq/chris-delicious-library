// Google Apps Script - Save this in your Apps Script editor
// This handles saving settings to the Google Sheet

function onOpen() {
  safeCall_("addTmdbMenu_", typeof addTmdbMenu_ === "function" ? addTmdbMenu_ : null);
  safeCall_("addMoviesMenu_", typeof addMoviesMenu_ === "function" ? addMoviesMenu_ : null);
  safeCall_("addIgdbMenu_", typeof addIgdbMenu_ === "function" ? addIgdbMenu_ : null);
  safeCall_("addBooksMenu_", typeof addBooksMenu_ === "function" ? addBooksMenu_ : null);

  // Fallback menu so it's obvious this web-app script is loaded if no known builders exist.
  const hasAnyKnownBuilder =
    typeof addTmdbMenu_ === "function" ||
    typeof addMoviesMenu_ === "function" ||
    typeof addIgdbMenu_ === "function" ||
    typeof addBooksMenu_ === "function";
  if (!hasAnyKnownBuilder) {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu("Library Tools")
      .addItem("Menu Setup Help", "showLibraryMenuSetupHelp_")
      .addToUi();
  }
}

function onInstall(e) {
  onOpen(e);
}

function safeCall_(name, fn) {
  try {
    if (typeof fn === "function") {
      fn();
    } else {
      console.log(name + " not found (function missing).");
    }
  } catch (err) {
    console.log(name + " failed: " + (err && err.message ? err.message : err));
  }
}

function showLibraryMenuSetupHelp_() {
  SpreadsheetApp.getUi().alert(
    "Library row/sheet processor menu functions were not found in this file.\n\n" +
    "Re-add your previous menu builders (for example addTmdbMenu_, addMoviesMenu_, addIgdbMenu_, addBooksMenu_) or restore an earlier script version, then reload the sheet."
  );
}

function doPost(e) {
  try {
    // Parse incoming JSON
    const payload = JSON.parse(e.postData.contents);
    const action = (payload.action || "").trim();

    // Book row update mode
    if (action === "updateBook") {
      return updateBookRow_(payload);
    }
    if (action === "updateShow") {
      return updateShowRow_(payload);
    }
    if (action === "updateMovie") {
      return updateMovieRow_(payload);
    }
    if (action === "updateGame") {
      return updateGameRow_(payload);
    }
    if (action === "deleteBook") {
      return deleteBookRow_(payload);
    }
    if (action === "deleteShow") {
      return deleteShowRow_(payload);
    }
    if (action === "deleteMovie") {
      return deleteMovieRow_(payload);
    }
    if (action === "deleteGame") {
      return deleteGameRow_(payload);
    }
    if (action === "addBook") {
      return addBookRow_(payload);
    }
    if (action === "addShow") {
      return addShowRow_(payload);
    }
    if (action === "addMovie") {
      return addMovieRow_(payload);
    }
    if (action === "addGame") {
      return addGameRow_(payload);
    }

    // Default mode: settings key/value write
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Settings");
    
    if (!sheet) {
      return createCORSResponse("Settings sheet not found");
    }

    const key = (payload.key || "").trim(); // Trim whitespace from key
    const value = String(payload.value || "").trim(); // Trim whitespace from value
    const category = (payload.category || "").trim();
    const description = (payload.description || "").trim();
    
    // Validate required fields
    if (!key) {
      return createCORSResponse("Error: key is required");
    }
    
    // Check if headers exist, if not create them
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Category", "Key", "Value", "Description"]);
      SpreadsheetApp.flush(); // Flush to ensure header is written
    }
    
    // Get all current data efficiently
    const lastRow = sheet.getLastRow();
    let found = false;
    
    // If there are existing rows beyond the header
    if (lastRow > 1) {
      const keyColumn = sheet.getRange(2, 2, lastRow - 1).getValues(); // Column B (Key), rows 2 onwards
      
      // Search for existing key (case-insensitive to avoid matching issues)
      for (let i = 0; i < keyColumn.length; i++) {
        const storedKey = String(keyColumn[i][0]).trim();
        if (storedKey.toLowerCase() === key.toLowerCase()) {
          // Update the existing row (i + 2 because array is 0-indexed and row 1 is header)
          const rowNum = i + 2;
          sheet.getRange(rowNum, 1).setValue(category);    // Column A: Category
          sheet.getRange(rowNum, 2).setValue(key);         // Column B: Key
          sheet.getRange(rowNum, 3).setValue(value);       // Column C: Value
          sheet.getRange(rowNum, 4).setValue(description); // Column D: Description
          found = true;
          break;
        }
      }
    }
    
    // If not found, append new row
    if (!found) {
      sheet.appendRow([category, key, value, description]);
    }
    
    return createCORSResponse("Success");
    
  } catch (error) {
    return createCORSResponse("Error: " + error.toString());
  }
}

function normalizeHeaderKey_(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildHeaderLookup_(headers) {
  const headerIndex = {};
  const normalizedHeaderIndex = {};
  for (var i = 0; i < headers.length; i++) {
    const header = String(headers[i] || "").trim();
    const normalized = normalizeHeaderKey_(header);
    const columnNumber = i + 1;
    headerIndex[header] = columnNumber;
    if (normalized) {
      if (!Object.prototype.hasOwnProperty.call(normalizedHeaderIndex, normalized)) {
        normalizedHeaderIndex[normalized] = columnNumber;
      }
    }
  }
  return { headerIndex: headerIndex, normalizedHeaderIndex: normalizedHeaderIndex };
}

function resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, requestedHeader) {
  if (!requestedHeader) return 0;
  if (Object.prototype.hasOwnProperty.call(headerIndex, requestedHeader)) {
    return headerIndex[requestedHeader];
  }
  var normalizedRequestedHeader = normalizeHeaderKey_(requestedHeader);
  if (!normalizedRequestedHeader) return 0;
  return normalizedHeaderIndex[normalizedRequestedHeader] || 0;
}

function updateBookRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Books");
  if (!sheet) return createCORSResponse("Books sheet not found");

  const match = payload.match || {};
  const updates = payload.updates || {};

  const matchGoogleBooksVolumeId = String(match.googleBooksVolumeId || "").trim();
  const matchOpenLibraryWorkKey = String(match.openLibraryWorkKey || "").trim();
  const matchIsbn = String(match.isbn || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchGoogleBooksVolumeId && !matchOpenLibraryWorkKey && !matchIsbn && !matchTitle) {
    return createCORSResponse("Error: missing book match keys");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return createCORSResponse("Error: Books sheet has no data rows");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });
  const headerLookup = buildHeaderLookup_(headers);
  const headerIndex = headerLookup.headerIndex;
  const normalizedHeaderIndex = headerLookup.normalizedHeaderIndex;

  var rowNum = -1;
  if (headerIndex["GoogleBooksVolumeId"] && matchGoogleBooksVolumeId) {
    const values = sheet.getRange(2, headerIndex["GoogleBooksVolumeId"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchGoogleBooksVolumeId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["OpenLibraryWorkKey"] && matchOpenLibraryWorkKey) {
    const values = sheet.getRange(2, headerIndex["OpenLibraryWorkKey"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchOpenLibraryWorkKey) {
        rowNum = r + 2;
        break;
      }
    }
  }

  const isbnCol = headerIndex["isbn"] || headerIndex["ISBN"];
  if (rowNum === -1 && isbnCol && matchIsbn) {
    const values = sheet.getRange(2, isbnCol, lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchIsbn) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle) {
    const values = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim().toLowerCase() === matchTitle.toLowerCase()) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1) return createCORSResponse("Error: matching book row not found");

  for (var colName in updates) {
    if (!Object.prototype.hasOwnProperty.call(updates, colName)) continue;
    var colNumber = resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, colName);
    if (!colNumber) continue;
    sheet.getRange(rowNum, colNumber).setValue(String(updates[colName] || "").trim());
  }

  return createCORSResponse("Success");
}

function updateShowRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Shows");
  if (!sheet) return createCORSResponse("Shows sheet not found");

  const match = payload.match || {};
  const updates = payload.updates || {};

  const matchTmdbId = String(match.tmdbId || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchTmdbId && !matchTitle) {
    return createCORSResponse("Error: missing show match keys");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return createCORSResponse("Error: Shows sheet has no data rows");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });
  const headerLookup = buildHeaderLookup_(headers);
  const headerIndex = headerLookup.headerIndex;
  const normalizedHeaderIndex = headerLookup.normalizedHeaderIndex;

  var rowNum = -1;
  if (headerIndex["TMDB_ID"] && matchTmdbId) {
    const values = sheet.getRange(2, headerIndex["TMDB_ID"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchTmdbId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle) {
    const values = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim().toLowerCase() === matchTitle.toLowerCase()) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1) return createCORSResponse("Error: matching show row not found");

  for (var colName in updates) {
    if (!Object.prototype.hasOwnProperty.call(updates, colName)) continue;
    var colNumber = resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, colName);
    if (!colNumber) continue;
    sheet.getRange(rowNum, colNumber).setValue(String(updates[colName] || "").trim());
  }

  return createCORSResponse("Success");
}

function updateMovieRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Movies");
  if (!sheet) return createCORSResponse("Movies sheet not found");

  const match = payload.match || {};
  const updates = payload.updates || {};

  const matchTmdbId = String(match.tmdbId || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchTmdbId && !matchTitle) {
    return createCORSResponse("Error: missing movie match keys");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return createCORSResponse("Error: Movies sheet has no data rows");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });
  const headerLookup = buildHeaderLookup_(headers);
  const headerIndex = headerLookup.headerIndex;
  const normalizedHeaderIndex = headerLookup.normalizedHeaderIndex;

  var rowNum = -1;
  if (headerIndex["TMDB_ID"] && matchTmdbId) {
    const values = sheet.getRange(2, headerIndex["TMDB_ID"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchTmdbId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle) {
    const values = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim().toLowerCase() === matchTitle.toLowerCase()) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1) return createCORSResponse("Error: matching movie row not found");

  for (var colName in updates) {
    if (!Object.prototype.hasOwnProperty.call(updates, colName)) continue;
    var colNumber = resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, colName);
    if (!colNumber) continue;
    sheet.getRange(rowNum, colNumber).setValue(String(updates[colName] || "").trim());
  }

  return createCORSResponse("Success");
}

function updateGameRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Games");
  if (!sheet) return createCORSResponse("Games sheet not found");

  const match = payload.match || {};
  const updates = payload.updates || {};

  const matchIgdbId = String(match.igdbId || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchIgdbId && !matchTitle) {
    return createCORSResponse("Error: missing game match keys");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return createCORSResponse("Error: Games sheet has no data rows");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });
  const headerLookup = buildHeaderLookup_(headers);
  const headerIndex = headerLookup.headerIndex;
  const normalizedHeaderIndex = headerLookup.normalizedHeaderIndex;

  var rowNum = -1;
  if (headerIndex["IGDB_ID"] && matchIgdbId) {
    const values = sheet.getRange(2, headerIndex["IGDB_ID"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchIgdbId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle) {
    const values = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim().toLowerCase() === matchTitle.toLowerCase()) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1) return createCORSResponse("Error: matching game row not found");

  const normalizedUpdates = normalizeGameValuesForWrite_(updates, sheet, rowNum);
  for (var colName in normalizedUpdates) {
    if (!Object.prototype.hasOwnProperty.call(normalizedUpdates, colName)) continue;
    var colNumber = resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, colName);
    if (!colNumber) continue;
    sheet.getRange(rowNum, colNumber).setValue(String(normalizedUpdates[colName] || "").trim());
  }

  return createCORSResponse("Success");
}

function deleteBookRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Books");
  if (!sheet) return createCORSResponse("Books sheet not found");

  const match = payload.match || {};
  const matchGoogleBooksVolumeId = String(match.googleBooksVolumeId || "").trim();
  const matchOpenLibraryWorkKey = String(match.openLibraryWorkKey || "").trim();
  const matchIsbn = String(match.isbn || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchGoogleBooksVolumeId && !matchOpenLibraryWorkKey && !matchIsbn && !matchTitle) {
    return createCORSResponse("Error: missing book match keys");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return createCORSResponse("Error: Books sheet has no data rows");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });
  const headerIndex = {};
  for (var i = 0; i < headers.length; i++) {
    headerIndex[headers[i]] = i + 1;
  }

  var rowNum = -1;
  if (headerIndex["GoogleBooksVolumeId"] && matchGoogleBooksVolumeId) {
    const values = sheet.getRange(2, headerIndex["GoogleBooksVolumeId"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchGoogleBooksVolumeId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["OpenLibraryWorkKey"] && matchOpenLibraryWorkKey) {
    const values = sheet.getRange(2, headerIndex["OpenLibraryWorkKey"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchOpenLibraryWorkKey) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["isbn"] && matchIsbn) {
    const values = sheet.getRange(2, headerIndex["isbn"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchIsbn) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle) {
    const values = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim().toLowerCase() === matchTitle.toLowerCase()) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1) return createCORSResponse("Error: matching book row not found");
  sheet.deleteRow(rowNum);
  return createCORSResponse("Success");
}

function deleteShowRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Shows");
  if (!sheet) return createCORSResponse("Shows sheet not found");

  const match = payload.match || {};
  const matchTmdbId = String(match.tmdbId || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchTmdbId && !matchTitle) {
    return createCORSResponse("Error: missing show match keys");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return createCORSResponse("Error: Shows sheet has no data rows");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });
  const headerIndex = {};
  for (var i = 0; i < headers.length; i++) {
    headerIndex[headers[i]] = i + 1;
  }

  var rowNum = -1;
  if (headerIndex["TMDB_ID"] && matchTmdbId) {
    const values = sheet.getRange(2, headerIndex["TMDB_ID"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchTmdbId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle) {
    const values = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim().toLowerCase() === matchTitle.toLowerCase()) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1) return createCORSResponse("Error: matching show row not found");
  sheet.deleteRow(rowNum);
  return createCORSResponse("Success");
}

function deleteMovieRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Movies");
  if (!sheet) return createCORSResponse("Movies sheet not found");

  const match = payload.match || {};
  const matchTmdbId = String(match.tmdbId || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchTmdbId && !matchTitle) {
    return createCORSResponse("Error: missing movie match keys");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return createCORSResponse("Error: Movies sheet has no data rows");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });
  const headerIndex = {};
  for (var i = 0; i < headers.length; i++) {
    headerIndex[headers[i]] = i + 1;
  }

  var rowNum = -1;
  if (headerIndex["TMDB_ID"] && matchTmdbId) {
    const values = sheet.getRange(2, headerIndex["TMDB_ID"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchTmdbId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle) {
    const values = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim().toLowerCase() === matchTitle.toLowerCase()) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1) return createCORSResponse("Error: matching movie row not found");
  sheet.deleteRow(rowNum);
  return createCORSResponse("Success");
}

function deleteGameRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Games");
  if (!sheet) return createCORSResponse("Games sheet not found");

  const match = payload.match || {};
  const matchIgdbId = String(match.igdbId || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchIgdbId && !matchTitle) {
    return createCORSResponse("Error: missing game match keys");
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol < 1) return createCORSResponse("Error: Games sheet has no data rows");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h || "").trim(); });
  const headerIndex = {};
  for (var i = 0; i < headers.length; i++) {
    headerIndex[headers[i]] = i + 1;
  }

  var rowNum = -1;
  if (headerIndex["IGDB_ID"] && matchIgdbId) {
    const values = sheet.getRange(2, headerIndex["IGDB_ID"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchIgdbId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle) {
    const values = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim().toLowerCase() === matchTitle.toLowerCase()) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1) return createCORSResponse("Error: matching game row not found");
  sheet.deleteRow(rowNum);
  return createCORSResponse("Success");
}

function appendRowByHeaders_(sheetName, values) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return createCORSResponse(sheetName + " sheet not found");

  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) return createCORSResponse("Error: " + sheetName + " sheet has no header row");

  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h || "").trim();
  });
  const row = headers.map(function(header) {
    return String((values && values[header]) || "").trim();
  });

  sheet.appendRow(row);
  return createCORSResponse("Success");
}

function addBookRow_(payload) {
  const values = payload.values || payload.updates || {};
  if (!String(values.Title || "").trim()) return createCORSResponse("Error: Title is required for addBook");
  return appendRowByHeaders_("Books", values);
}

function addShowRow_(payload) {
  const values = payload.values || payload.updates || {};
  if (!String(values.Title || "").trim()) return createCORSResponse("Error: Title is required for addShow");
  return appendRowByHeaders_("Shows", values);
}

function addMovieRow_(payload) {
  const values = payload.values || payload.updates || {};
  if (!String(values.Title || "").trim()) return createCORSResponse("Error: Title is required for addMovie");
  return appendRowByHeaders_("Movies", values);
}

function addGameRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Games");
  if (!sheet) return createCORSResponse("Games sheet not found");

  const values = normalizeGameValuesForWrite_(payload.values || payload.updates || {}, sheet, sheet.getLastRow() + 1);
  if (!String(values.Title || "").trim()) return createCORSResponse("Error: Title is required for addGame");
  return appendRowByHeaders_("Games", values);
}

function normalizeGameValuesForWrite_(values, sheet, targetRowNum) {
  const source = values || {};
  const next = {};

  let headerIndex = null;
  if (sheet) {
    const lastCol = sheet.getLastColumn();
    if (lastCol > 0) {
      const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
        return String(h || "").trim();
      });
      headerIndex = {};
      for (var i = 0; i < headers.length; i++) {
        headerIndex[headers[i]] = i + 1;
      }
    }
  }

  for (var key in source) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (key === "Backlog" || key === "Completed") {
      if (sheet && headerIndex && headerIndex[key] && targetRowNum && targetRowNum >= 2) {
        next[key] = normalizeGameCheckboxForCell_(sheet, targetRowNum, headerIndex[key], source[key]);
      } else {
        next[key] = normalizeGameCheckboxForSheet_(source[key]);
      }
      continue;
    }
    next[key] = source[key];
  }

  return next;
}

function normalizeGameCheckboxForCell_(sheet, rowNum, colNum, value) {
  const raw = String(value || "").trim();
  const loweredRaw = raw.toLowerCase();

  const range = sheet.getRange(rowNum, colNum);
  const rule = range.getDataValidation();
  if (!rule) {
    return normalizeGameCheckboxForSheet_(raw);
  }

  const criteriaType = rule.getCriteriaType();
  const criteriaValues = rule.getCriteriaValues() || [];

  if (criteriaType === SpreadsheetApp.DataValidationCriteria.CHECKBOX) {
    const checkedValue = String(criteriaValues[0] != null ? criteriaValues[0] : "TRUE").trim();
    const uncheckedValue = String(criteriaValues[1] != null ? criteriaValues[1] : "FALSE").trim();

    if (!raw || isFalsyGameCheckboxValue_(loweredRaw)) return uncheckedValue;
    if (isTruthyGameCheckboxValue_(loweredRaw)) return checkedValue;
    if (loweredRaw === checkedValue.toLowerCase()) return checkedValue;
    if (loweredRaw === uncheckedValue.toLowerCase()) return uncheckedValue;
    return raw;
  }

  if (criteriaType === SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST) {
    const allowedRaw = Array.isArray(criteriaValues[0]) ? criteriaValues[0] : [];
    const allowed = allowedRaw.map(function(v) { return String(v || "").trim(); }).filter(Boolean);
    const allowedLower = allowed.map(function(v) { return v.toLowerCase(); });

    if (!raw) {
      if (allowedLower.indexOf("") !== -1) return "";
      if (allowedLower.indexOf("no") !== -1) return "No";
      if (allowedLower.indexOf("false") !== -1) return "FALSE";
      return "";
    }
    if (allowedLower.indexOf(loweredRaw) !== -1) return allowed[allowedLower.indexOf(loweredRaw)];

    if (isTruthyGameCheckboxValue_(loweredRaw)) {
      if (allowedLower.indexOf("yes") !== -1) return "Yes";
      if (allowedLower.indexOf("true") !== -1) return "TRUE";
      if (allowedLower.indexOf("completed") !== -1) return "Completed";
    }
    if (isFalsyGameCheckboxValue_(loweredRaw)) {
      if (allowedLower.indexOf("no") !== -1) return "No";
      if (allowedLower.indexOf("false") !== -1) return "FALSE";
      if (allowedLower.indexOf("") !== -1) return "";
    }
    return raw;
  }

  return normalizeGameCheckboxForSheet_(raw);
}

function normalizeGameCheckboxForSheet_(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  if (isTruthyGameCheckboxValue_(normalized)) {
    return "Yes";
  }

  if (isFalsyGameCheckboxValue_(normalized)) {
    return "No";
  }

  return raw;
}

function isTruthyGameCheckboxValue_(normalized) {
  return (
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "1" ||
    normalized === "checked" ||
    normalized === "completed" ||
    normalized === "backlog" ||
    normalized === "queued"
  );
}

function isFalsyGameCheckboxValue_(normalized) {
  return (
    normalized === "" ||
    normalized === "false" ||
    normalized === "no" ||
    normalized === "0" ||
    normalized === "unchecked" ||
    normalized === "not completed" ||
    normalized === "not backlog"
  );
}

// Add CORS headers to the response
function createCORSResponse(content) {
  return ContentService
    .createTextOutput(content)
    .setMimeType(ContentService.MimeType.TEXT);
}

// Handle OPTIONS requests for CORS preflight
function doOptions(e) {
  return createCORSResponse("ok");
}
