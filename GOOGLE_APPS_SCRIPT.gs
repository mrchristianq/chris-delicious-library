// Google Apps Script - Save this in your Apps Script editor
// This handles saving settings to the Google Sheet

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

function updateBookRow_(payload) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Books");
  if (!sheet) return createCORSResponse("Books sheet not found");

  const match = payload.match || {};
  const updates = payload.updates || {};

  const matchGoogleBooksVolumeId = String(match.googleBooksVolumeId || "").trim();
  const matchOpenLibraryWorkKey = String(match.openLibraryWorkKey || "").trim();
  const matchTitle = String(match.title || "").trim();

  if (!matchGoogleBooksVolumeId && !matchOpenLibraryWorkKey && !matchTitle) {
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
    if (!headerIndex[colName]) continue;
    sheet.getRange(rowNum, headerIndex[colName]).setValue(String(updates[colName] || "").trim());
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

  for (var colName in updates) {
    if (!Object.prototype.hasOwnProperty.call(updates, colName)) continue;
    if (!headerIndex[colName]) continue;
    sheet.getRange(rowNum, headerIndex[colName]).setValue(String(updates[colName] || "").trim());
  }

  return createCORSResponse("Success");
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
