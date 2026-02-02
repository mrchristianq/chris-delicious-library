// Google Apps Script - Save this in your Apps Script editor
// This handles saving settings to the Google Sheet

function doPost(e) {
  try {
    // Get the spreadsheet and Settings sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName("Settings");
    
    if (!sheet) {
      return createCORSResponse("Settings sheet not found");
    }
    
    // Parse incoming JSON
    const payload = JSON.parse(e.postData.contents);
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
