// === EXISTING CODE - Keep all your TMDB, Movies, and Google Books functions ===
// (Keep everything you already have for TMDB, Movies, and Google Books)
// This includes addTmdbMenu_(), addMoviesMenu_(), addGoogleBooksMenu_() and all their related functions

// === UPDATE YOUR onOpen FUNCTION TO THIS: ===
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  // Your existing menus
  if (typeof addTmdbMenu_ === "function") addTmdbMenu_();          // TV Shows
  if (typeof addMoviesMenu_ === "function") addMoviesMenu_();      // Movies
  if (typeof addGoogleBooksMenu_ === "function") addGoogleBooksMenu_(); // Books
  
  // Add GitHub Sync menu
  ui.createMenu('GitHub Sync')
      .addItem('Sync Covers (All Sheets)', 'addCoverUrlsToAll')
      .addSeparator()
      .addItem('Sync Shows (TV)', 'addCoverUrlsToTV')
      .addItem('Sync Books', 'addCoverUrlsToBooks')
      .addItem('Sync Movies', 'addCoverUrlsToMovies')
      .addToUi();
}

// === ADD THESE NEW FUNCTIONS BELOW YOUR EXISTING CODE: ===

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
  
  // Find Title column
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

// Automatically populate GitHubCoverURL when Title is added/edited
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();
  
  // Skip header row
  if (row === 1) return;
  
  // Determine sheet category
  let category;
  if (sheetName === 'Shows') category = 'tv';
  else if (sheetName === 'Books') category = 'books';
  else if (sheetName === 'Movies') category = 'movies';
  else return; // Not a tracked sheet
  
  // Get header row to find columns
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const titleColIndex = headers.indexOf('Title');
  const urlColIndex = headers.indexOf('GitHubCoverURL');
  
  if (titleColIndex === -1 || urlColIndex === -1) return;
  
  // If Title column was edited, update GitHubCoverURL
  if (col === titleColIndex + 1) {
    const title = sheet.getRange(row, titleColIndex + 1).getValue();
    if (title) {
      const url = getGitHubCoverUrl(title, category);
      sheet.getRange(row, urlColIndex + 1).setValue(url);
    }
  }
}
