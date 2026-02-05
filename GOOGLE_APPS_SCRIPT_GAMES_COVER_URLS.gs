/**
 * Google Apps Script to Add GitHub Cover URLs to Your GAMES Spreadsheet
 * 
 * Instructions:
 * 1. Open your GAMES Google Spreadsheet
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire script
 * 5. Save (name it "Add Game Cover URLs")
 * 6. Run addCoverUrlsToGames() once to populate existing items
 * 7. Grant permissions when prompted
 * 
 * Features:
 * - Auto-populates GitHubCoverURL when you add/edit a Title in Database sheet
 * - Menu option to manually refresh all URLs
 */

// Sanitize title to match cover filename (must match app logic)
function sanitizeTitle(title) {
  if (!title) return '';
  // Convert to string in case it's a number or other type
  const titleStr = String(title).trim();
  if (!titleStr) return '';
  return titleStr
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars (keep spaces and hyphens)
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .substring(0, 50);
}

// Generate GitHub cover URL from title
function getGitHubCoverUrl(title) {
  const sanitized = sanitizeTitle(title);
  return `https://mrchristianq.github.io/chris-delicious-library/covers/games/${sanitized}.jpg`;
}

// Add cover URLs to Database sheet
function addCoverUrlsToGames() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Database');
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert('Error: "Database" sheet not found!');
    Logger.log('Sheet "Database" not found!');
    return;
  }
  
  Logger.log('Processing Database sheet...');
  
  // Get all data
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow < 2) {
    SpreadsheetApp.getUi().alert('No data found in Database sheet');
    Logger.log('No data in Database sheet');
    return;
  }
  
  // Find Title column
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const titleColIndex = headerRow.indexOf('Title');
  
  if (titleColIndex === -1) {
    SpreadsheetApp.getUi().alert('Error: Title column not found in Database sheet');
    Logger.log('Title column not found in Database sheet');
    return;
  }
  
  // Check if GitHubCoverURL column exists
  let urlColIndex = headerRow.indexOf('GitHubCoverURL');
  
  if (urlColIndex === -1) {
    // Add new column
    urlColIndex = lastCol;
    sheet.getRange(1, urlColIndex + 1).setValue('GitHubCoverURL');
    Logger.log('Added GitHubCoverURL column to Database sheet');
  } else {
    Logger.log('GitHubCoverURL column already exists in Database sheet, updating...');
  }
  
  // Get all titles
  const titles = sheet.getRange(2, titleColIndex + 1, lastRow - 1, 1).getValues();
  
  // Generate URLs
  const urls = titles.map(row => {
    const title = row[0];
    if (!title) return [''];
    return [getGitHubCoverUrl(title)];
  });
  
  // Write URLs to sheet
  sheet.getRange(2, urlColIndex + 1, urls.length, 1).setValues(urls);
  
  Logger.log(`✅ Added ${urls.length} cover URLs to Database sheet`);
  SpreadsheetApp.getUi().alert(`Success! Added ${urls.length} cover URLs to Database sheet`);
}

// Create custom menu
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('GitHub Sync')
      .addItem('Sync Covers', 'addCoverUrlsToGames')
      .addToUi();
}

// Automatically populate GitHubCoverURL when Title is added/edited
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();
  
  // Skip header row
  if (row === 1) return;
  
  // Only process Database sheet
  if (sheetName !== 'Database') return;
  
  // Get header row to find columns
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const titleColIndex = headers.indexOf('Title');
  const urlColIndex = headers.indexOf('GitHubCoverURL');
  
  if (titleColIndex === -1 || urlColIndex === -1) return;
  
  // If Title column was edited, update GitHubCoverURL
  if (col === titleColIndex + 1) {
    const title = sheet.getRange(row, titleColIndex + 1).getValue();
    if (title) {
      const url = getGitHubCoverUrl(title);
      sheet.getRange(row, urlColIndex + 1).setValue(url);
    }
  }
}
