/**
 * Google Apps Script to Add GitHub Cover URLs to Your Spreadsheet
 * (For Books/Movies/Shows only)
 * 
 * Instructions:
 * 1. Open your Google Spreadsheet (Books/Movies/Shows)
 * 2. Go to Extensions > Apps Script
 * 3. Delete any existing code
 * 4. Paste this entire script
 * 5. Save (name it "Add Cover URLs")
 * 6. Run the function you want:
 *    - addCoverUrlsToTV() - for "Shows" sheet
 *    - addCoverUrlsToBooks()
 *    - addCoverUrlsToMovies()
 *    - addCoverUrlsToAll() - adds to Shows, Books, Movies
 * 7. Grant permissions when prompted
 * 
 * Note: Games uses a separate script (GOOGLE_APPS_SCRIPT_GAMES_COVER_URLS.gs)
 * in the Games spreadsheet
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
function getGitHubCoverUrl(title, category) {
  const sanitized = sanitizeTitle(title);
  return `https://mrchristianq.github.io/chris-delicious-library/covers/${category}/${sanitized}.jpg`;
}

// Add cover URLs to a specific sheet
function addCoverUrlsToSheet(sheetName, category, titleColumn) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`Sheet "${sheetName}" not found!`);
    return;
  }
  
  Logger.log(`Processing ${sheetName}...`);
  
  // Get all data
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow < 2) {
    Logger.log(`No data in ${sheetName}`);
    return;
  }
  
  // Find Title column (default to column A if titleColumn not specified)
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const titleColIndex = titleColumn ? headerRow.indexOf(titleColumn) : headerRow.indexOf('Title');
  
  if (titleColIndex === -1) {
    Logger.log(`Title column not found in ${sheetName}`);
    return;
  }
  
  // Check if GitHubCoverURL column exists
  let urlColIndex = headerRow.indexOf('GitHubCoverURL');
  
  if (urlColIndex === -1) {
    // Add new column
    urlColIndex = lastCol;
    sheet.getRange(1, urlColIndex + 1).setValue('GitHubCoverURL');
    Logger.log(`Added GitHubCoverURL column to ${sheetName}`);
  } else {
    Logger.log(`GitHubCoverURL column already exists in ${sheetName}, updating...`);
  }
  
  // Get all titles
  const titles = sheet.getRange(2, titleColIndex + 1, lastRow - 1, 1).getValues();
  
  // Generate URLs
  const urls = titles.map(row => {
    const title = row[0];
    if (!title) return [''];
    return [getGitHubCoverUrl(title, category)];
  });
  
  // Write URLs to sheet
  sheet.getRange(2, urlColIndex + 1, urls.length, 1).setValues(urls);
  
  Logger.log(`✅ Added ${urls.length} cover URLs to ${sheetName}`);
  SpreadsheetApp.getUi().alert(`Success! Added ${urls.length} cover URLs to ${sheetName}`);
}

// Individual sheet functions
function addCoverUrlsToTV() {
  addCoverUrlsToSheet('Shows', 'tv', 'Title');
}

function addCoverUrlsToBooks() {
  addCoverUrlsToSheet('Books', 'books', 'Title');
}

function addCoverUrlsToMovies() {
  addCoverUrlsToSheet('Movies', 'movies', 'Title');
}

// Add to all sheets at once
function addCoverUrlsToAll() {
  Logger.log('Adding cover URLs to all sheets...');
  
  addCoverUrlsToSheet('Shows', 'tv', 'Title');
  addCoverUrlsToSheet('Books', 'books', 'Title');
  addCoverUrlsToSheet('Movies', 'movies', 'Title');
  
  SpreadsheetApp.getUi().alert('Success! Added cover URLs to Shows, Books, and Movies!');
}

// Create custom menu
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📚 Cover URLs')
      .addItem('Add URLs to Shows (TV)', 'addCoverUrlsToTV')
      .addItem('Add URLs to Books', 'addCoverUrlsToBooks')
      .addItem('Add URLs to Movies', 'addCoverUrlsToMovies')
      .addSeparator()
      .addItem('Add URLs to ALL Sheets', 'addCoverUrlsToAll')
      .addToUi();
}
