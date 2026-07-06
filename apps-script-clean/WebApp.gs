/***********************
 * WebApp.gs
 * Clean web-app bridge for Chris' Delicious Library.
 *
 * This is the ONLY Apps Script file that should define doPost(),
 * doOptions(), and createCORSResponse().
 *
 * Keep spreadsheet menus in Menu.gs.
 * Keep direct ChangeLog append helper in ChangeLogBridge.gs.
 ***********************/

const CDL_WEBAPP_BUILD = "10.2.18-clean-webapp";

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
    if (action === "appendChangeLogRows") {
      return appendChangeLogRows_(payload);
    }
    if (action === "upsertTvEpisodeRows") {
      return upsertTvEpisodeRows_(payload);
    }
    if (action === "updateTvEpisodeProgress") {
      return updateTvEpisodeProgress_(payload);
    }
    if (action === "debugWebAppVersion") {
      return createCORSResponse(JSON.stringify({
        status: "Success",
        build: CDL_WEBAPP_BUILD,
        timestamp: new Date().toISOString(),
      }));
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
      sheet.appendRow(["Category", "Key", "Value", "Description", "LastModifiedAt", "ClientUpdatedAt"]);
      SpreadsheetApp.flush(); // Flush to ensure header is written
    }
    ensureHeaderColumn_(sheet, "LastModifiedAt");
    ensureHeaderColumn_(sheet, "ClientUpdatedAt");
    
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
          stampTimestampColumns_(sheet, rowNum, payload);
          found = true;
          break;
        }
      }
    }
    
    // If not found, append new row
    if (!found) {
      const rowNum = sheet.getLastRow() + 1;
      sheet.appendRow([category, key, value, description]);
      stampTimestampColumns_(sheet, rowNum, payload);
    }
    
    return createCORSResponse("Success");
    
  } catch (error) {
    return createCORSResponse("Error: " + error.toString());
  }
}

function normalizeHeaderKey_(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (normalized === "datecompleted" || normalized === "datecompletd" || normalized === "completddate") {
    return "completeddate";
  }
  return normalized;
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

function ensureHeaderColumn_(sheet, headerName) {
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) {
    return String(h || "").trim();
  });
  for (var i = 0; i < headers.length; i++) {
    if (headers[i] === headerName) return i + 1;
  }
  const nextCol = lastCol + 1;
  sheet.getRange(1, nextCol).setValue(headerName);
  return nextCol;
}

function stampTimestampColumns_(sheet, rowNum, payload) {
  const now = new Date().toISOString();
  const clientUpdatedAt = String((payload && payload.clientUpdatedAt) || "").trim();
  const lastModifiedCol = ensureHeaderColumn_(sheet, "LastModifiedAt");
  const clientUpdatedCol = ensureHeaderColumn_(sheet, "ClientUpdatedAt");
  sheet.getRange(rowNum, lastModifiedCol).setValue(now);
  if (clientUpdatedAt) {
    sheet.getRange(rowNum, clientUpdatedCol).setValue(clientUpdatedAt);
  }
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
  const matchAudibleAsin = String(match.audibleAsin || match.audibleASIN || "").trim();
  const matchAudnexusAsin = String(match.audnexusAsin || match.audnexusASIN || "").trim();
  const matchHardcoverId = String(match.hardcoverId || match.hardcoverID || "").trim();
  const matchType = String(match.type || "").trim();
  const matchImageUrl = String(match.imageUrl || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (
    !matchGoogleBooksVolumeId &&
    !matchOpenLibraryWorkKey &&
    !matchIsbn &&
    !matchAudibleAsin &&
    !matchAudnexusAsin &&
    !matchHardcoverId &&
    !matchImageUrl &&
    !matchTitle
  ) {
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

  const audibleAsinCol = resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, "AudibleASIN");
  if (rowNum === -1 && audibleAsinCol && matchAudibleAsin) {
    const values = sheet.getRange(2, audibleAsinCol, lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchAudibleAsin) {
        rowNum = r + 2;
        break;
      }
    }
  }

  const audnexusAsinCol = resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, "AudnexusASIN");
  if (rowNum === -1 && audnexusAsinCol && matchAudnexusAsin) {
    const values = sheet.getRange(2, audnexusAsinCol, lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchAudnexusAsin) {
        rowNum = r + 2;
        break;
      }
    }
  }

  const hardcoverIdCol = resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, "HardcoverID");
  if (rowNum === -1 && hardcoverIdCol && matchHardcoverId) {
    const values = sheet.getRange(2, hardcoverIdCol, lastRow - 1, 1).getValues();
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() === matchHardcoverId) {
        rowNum = r + 2;
        break;
      }
    }
  }

  if (rowNum === -1 && matchImageUrl) {
    const imageUrlCol = headerIndex["ImageURL"] || headerIndex["Image Url"] || headerIndex["Image URL"] || headerIndex["Image"];
    if (imageUrlCol) {
      const values = sheet.getRange(2, imageUrlCol, lastRow - 1, 1).getValues();
      for (var r = 0; r < values.length; r++) {
        if (String(values[r][0] || "").trim() === matchImageUrl) {
          rowNum = r + 2;
          break;
        }
      }
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle && matchType) {
    const titleValues = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    const typeCol = headerIndex["Type"] || headerIndex["Types"];
    const typeValues = typeCol ? sheet.getRange(2, typeCol, lastRow - 1, 1).getValues() : null;
    for (var r = 0; r < titleValues.length; r++) {
      var rowTitle = String(titleValues[r][0] || "").trim().toLowerCase();
      if (rowTitle !== matchTitle.toLowerCase()) continue;
      var rowType = String(typeValues && typeValues[r] ? typeValues[r][0] || "" : "").trim().toLowerCase();
      if (rowType === matchType.toLowerCase()) {
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
  stampTimestampColumns_(sheet, rowNum, payload);

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
  stampTimestampColumns_(sheet, rowNum, payload);

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

  var appliedColumns = [];
  var skippedColumns = [];

  for (var colName in updates) {
    if (!Object.prototype.hasOwnProperty.call(updates, colName)) continue;
    var colNumber = resolveHeaderIndex_(headerIndex, normalizedHeaderIndex, colName);
    if (!colNumber) {
      skippedColumns.push(colName);
      continue;
    }
    sheet.getRange(rowNum, colNumber).setValue(String(updates[colName] || "").trim());
    appliedColumns.push(colName);
  }

  var requestedWatchStatus = Object.prototype.hasOwnProperty.call(updates, "Watch Status") ||
    Object.prototype.hasOwnProperty.call(updates, "WatchStatus") ||
    Object.prototype.hasOwnProperty.call(updates, "Watched");
  var appliedWatchStatus = appliedColumns.indexOf("Watch Status") !== -1 ||
    appliedColumns.indexOf("WatchStatus") !== -1 ||
    appliedColumns.indexOf("Watched") !== -1;

  if (requestedWatchStatus && !appliedWatchStatus) {
    return createCORSResponse("Error: movie watch status column not found. Add Watch Status, WatchStatus, or Watched column.");
  }

  if (!appliedColumns.length && Object.keys(updates).length) {
    return createCORSResponse("Error: no matching movie columns found for updates: " + skippedColumns.join(", "));
  }

  if (appliedColumns.length) {
    stampTimestampColumns_(sheet, rowNum, payload);
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
  const matchPlatform = String(match.platform || "").trim();
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
  const platformCol = headerIndex["Platform"] || headerIndex["Platforms"];

  var rowNum = -1;
  if (headerIndex["IGDB_ID"] && matchIgdbId) {
    const values = sheet.getRange(2, headerIndex["IGDB_ID"], lastRow - 1, 1).getValues();
    const platformValues = platformCol ? sheet.getRange(2, platformCol, lastRow - 1, 1).getValues() : null;
    for (var r = 0; r < values.length; r++) {
      if (String(values[r][0] || "").trim() !== matchIgdbId) continue;
      if (matchPlatform && platformValues) {
        const rowPlatform = String(platformValues[r][0] || "").trim().toLowerCase();
        if (rowPlatform !== matchPlatform.toLowerCase()) continue;
      }
      rowNum = r + 2;
      break;
    }
  }

  if (rowNum === -1 && headerIndex["Title"] && matchTitle && matchPlatform && platformCol) {
    const titleValues = sheet.getRange(2, headerIndex["Title"], lastRow - 1, 1).getValues();
    const platformValues = sheet.getRange(2, platformCol, lastRow - 1, 1).getValues();
    for (var r = 0; r < titleValues.length; r++) {
      if (String(titleValues[r][0] || "").trim().toLowerCase() !== matchTitle.toLowerCase()) continue;
      if (String(platformValues[r][0] || "").trim().toLowerCase() !== matchPlatform.toLowerCase()) continue;
      rowNum = r + 2;
      break;
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
  stampTimestampColumns_(sheet, rowNum, payload);

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
  if (headers.indexOf("LastModifiedAt") === -1) {
    sheet.getRange(1, headers.length + 1).setValue("LastModifiedAt");
    headers.push("LastModifiedAt");
  }
  if (headers.indexOf("ClientUpdatedAt") === -1) {
    sheet.getRange(1, headers.length + 1).setValue("ClientUpdatedAt");
    headers.push("ClientUpdatedAt");
  }
  const now = new Date().toISOString();
  const row = headers.map(function(header) {
    if (header === "LastModifiedAt") return now;
    if (header === "ClientUpdatedAt") return String((values && values.ClientUpdatedAt) || "").trim();
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

function ensureTvEpisodesSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName("TV Episodes");
  if (!sheet) {
    sheet = ss.insertSheet("TV Episodes");
  }

  const headers = [
    "EpisodeKey",
    "ShowTMDB_ID",
    "ShowTitle",
    "SeasonNumber",
    "SeasonTitle",
    "SeasonPosterURL",
    "EpisodeNumber",
    "EpisodeTMDB_ID",
    "EpisodeTitle",
    "AirDate",
    "StillURL",
    "Overview",
    "Runtime",
    "Watched",
    "WatchedAt",
    "UpdatedAt",
    "Source",
    "LastModifiedAt",
    "ClientUpdatedAt",
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  } else {
    const currentHeaders = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0].map(function(h) {
      return String(h || "").trim();
    });
    for (var i = 0; i < headers.length; i++) {
      if (currentHeaders[i] !== headers[i]) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
        break;
      }
    }
  }

  return sheet;
}

function buildTvEpisodeHeaderLookup_(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function(h) {
    return String(h || "").trim();
  });
  const lookup = {};
  for (var i = 0; i < headers.length; i++) {
    if (headers[i]) lookup[headers[i]] = i + 1;
  }
  return lookup;
}

function tvEpisodeKeyFromRow_(row) {
  const explicit = String(row.EpisodeKey || "").trim();
  if (explicit) return explicit;
  const showId = String(row.ShowTMDB_ID || row.ShowTitle || "").trim();
  const season = String(row.SeasonNumber || "").trim();
  const episode = String(row.EpisodeNumber || "").trim();
  return showId && season && episode ? showId + ":s" + season + ":e" + episode : "";
}

function findTvEpisodeRowByKey_(sheet, headerLookup, episodeKey) {
  if (!episodeKey || sheet.getLastRow() < 2 || !headerLookup.EpisodeKey) return -1;
  const values = sheet.getRange(2, headerLookup.EpisodeKey, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || "").trim() === episodeKey) return i + 2;
  }
  return -1;
}

function normalizeTvEpisodeWatchedValue_(value) {
  const raw = String(value === null || value === undefined ? "" : value).trim().toLowerCase();
  if (raw === "true" || raw === "yes" || raw === "1" || raw === "watched" || raw === "checked") return "TRUE";
  if (!raw || raw === "false" || raw === "no" || raw === "0" || raw === "unwatched" || raw === "unchecked") return "FALSE";
  return raw.toUpperCase();
}

function tvEpisodeCellText_(value) {
  if (value === true) return "TRUE";
  if (value === false) return "FALSE";
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function upsertTvEpisodeRows_(payload) {
  const sheet = ensureTvEpisodesSheet_();
  const headerLookup = buildTvEpisodeHeaderLookup_(sheet);
  const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
  const now = new Date().toISOString();
  let updated = 0;

  rows.forEach(function(rawRow) {
    const row = rawRow || {};
    const episodeKey = tvEpisodeKeyFromRow_(row);
    if (!episodeKey) return;

    const existingRowNum = findTvEpisodeRowByKey_(sheet, headerLookup, episodeKey);
    const targetRowNum = existingRowNum === -1 ? sheet.getLastRow() + 1 : existingRowNum;

    const currentValues = existingRowNum === -1
      ? {}
      : sheet.getRange(existingRowNum, 1, 1, sheet.getLastColumn()).getValues()[0].reduce(function(acc, value, idx) {
          const header = Object.keys(headerLookup).find(function(key) { return headerLookup[key] === idx + 1; });
          if (header) acc[header] = value;
          return acc;
        }, {});

    const nextRecord = {
      EpisodeKey: episodeKey,
      ShowTMDB_ID: row.ShowTMDB_ID || "",
      ShowTitle: row.ShowTitle || "",
      SeasonNumber: row.SeasonNumber || "",
      SeasonTitle: row.SeasonTitle || "",
      SeasonPosterURL: row.SeasonPosterURL || "",
      EpisodeNumber: row.EpisodeNumber || "",
      EpisodeTMDB_ID: row.EpisodeTMDB_ID || "",
      EpisodeTitle: row.EpisodeTitle || "",
      AirDate: row.AirDate || "",
      StillURL: row.StillURL || "",
      Overview: row.Overview || "",
      Runtime: row.Runtime || "",
      Watched: currentValues.Watched || row.Watched || "",
      WatchedAt: currentValues.WatchedAt || row.WatchedAt || "",
      UpdatedAt: row.UpdatedAt || now,
      Source: row.Source || "TMDB",
      LastModifiedAt: currentValues.LastModifiedAt || "",
      ClientUpdatedAt: row.ClientUpdatedAt || payload.clientUpdatedAt || "",
    };

    const values = Object.keys(headerLookup).map(function(header) {
      return String(nextRecord[header] || "").trim();
    });
    sheet.getRange(targetRowNum, 1, 1, values.length).setValues([values]);
    updated++;
  });

  return createCORSResponse(JSON.stringify({ status: "Success", updated: updated }));
}

function updateTvEpisodeProgress_(payload) {
  const sheet = ensureTvEpisodesSheet_();
  const headerLookup = buildTvEpisodeHeaderLookup_(sheet);
  const match = payload.match || {};
  const updates = payload.updates || {};
  const episodeKey = String(match.episodeKey || "").trim() ||
    [match.showTmdbId, "s" + match.seasonNumber, "e" + match.episodeNumber].join(":");
  const rowNum = findTvEpisodeRowByKey_(sheet, headerLookup, episodeKey);
  if (rowNum === -1) {
    return createCORSResponse("Error: matching TV episode row not found");
  }

  const oldWatched = headerLookup.Watched ? sheet.getRange(rowNum, headerLookup.Watched).getValue() : "";
  const oldWatchedAt = headerLookup.WatchedAt ? sheet.getRange(rowNum, headerLookup.WatchedAt).getValue() : "";
  const now = new Date().toISOString();
  const watched = String(updates.Watched || "").trim();
  const watchedAt = String(updates.WatchedAt || "").trim();
  const updatedAt = String(updates.UpdatedAt || now).trim();

  if (headerLookup.Watched) sheet.getRange(rowNum, headerLookup.Watched).setValue(watched);
  if (headerLookup.WatchedAt) sheet.getRange(rowNum, headerLookup.WatchedAt).setValue(watchedAt);
  if (headerLookup.UpdatedAt) sheet.getRange(rowNum, headerLookup.UpdatedAt).setValue(updatedAt);
  if (headerLookup.LastModifiedAt) sheet.getRange(rowNum, headerLookup.LastModifiedAt).setValue(now);
  if (headerLookup.ClientUpdatedAt) sheet.getRange(rowNum, headerLookup.ClientUpdatedAt).setValue(String(payload.clientUpdatedAt || "").trim());

  const title = headerLookup.ShowTitle ? sheet.getRange(rowNum, headerLookup.ShowTitle).getValue() : "";
  const season = headerLookup.SeasonNumber ? sheet.getRange(rowNum, headerLookup.SeasonNumber).getValue() : "";
  const episode = headerLookup.EpisodeNumber ? sheet.getRange(rowNum, headerLookup.EpisodeNumber).getValue() : "";
  const episodeTitle = headerLookup.EpisodeTitle ? sheet.getRange(rowNum, headerLookup.EpisodeTitle).getValue() : "";

  appendChangeLogRows_({
    rows: [{
      Timestamp: now,
      Source: "CDL App",
      Sheet: "TV Episodes",
      Title: String(title || "") + " S" + season + "E" + episode + " " + String(episodeTitle || ""),
      Row: String(rowNum),
      Field: "Watched",
      "Old Value": oldWatched,
      "New Value": watched,
      User: "app",
      Function: "updateTvEpisodeProgress_",
    }, {
      Timestamp: now,
      Source: "CDL App",
      Sheet: "TV Episodes",
      Title: String(title || "") + " S" + season + "E" + episode + " " + String(episodeTitle || ""),
      Row: String(rowNum),
      Field: "WatchedAt",
      "Old Value": oldWatchedAt,
      "New Value": watchedAt,
      User: "app",
      Function: "updateTvEpisodeProgress_",
    }]
  });

  SpreadsheetApp.flush();
  const actualWatched = headerLookup.Watched ? tvEpisodeCellText_(sheet.getRange(rowNum, headerLookup.Watched).getValue()) : "";
  const normalizedActualWatched = normalizeTvEpisodeWatchedValue_(actualWatched);
  const normalizedExpectedWatched = normalizeTvEpisodeWatchedValue_(watched);
  if (normalizedActualWatched !== normalizedExpectedWatched) {
    return createCORSResponse(
      'Error: write verification failed for TV episode progress. Expected "' +
        normalizedExpectedWatched +
        '" but found "' +
        normalizedActualWatched +
        '" from raw "' +
        actualWatched +
        '".'
    );
  }

  return createCORSResponse(JSON.stringify({
    status: "Success",
    build: CDL_WEBAPP_BUILD,
    EpisodeKey: episodeKey,
    Row: rowNum,
    Watched: normalizedActualWatched,
    WatchedAt: watchedAt,
    UpdatedAt: updatedAt,
  }));
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
