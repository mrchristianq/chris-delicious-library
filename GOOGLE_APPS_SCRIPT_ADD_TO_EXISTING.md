# How to Add GitHub Sync to Your Existing Google Apps Script

## ⚠️ IMPORTANT: Don't Replace Your Entire Script!

You already have IGDB, TMDB, and Google Books menus. We just need to **ADD** the GitHub Sync functionality to your existing script.

## Instructions:

### For Books/Movies/Shows Spreadsheet:

1. **Keep your existing script** - Don't delete your IGDB, TMDB, Google Books code!

2. **Add these functions** to the bottom of your existing script:

```javascript
// === GITHUB SYNC FUNCTIONS (ADD TO EXISTING SCRIPT) ===

// Sanitize title to match cover filename (must match app logic)
function sanitizeTitle(title) {
  if (!title) return '';
  const titleStr = String(title).trim();
  if (!titleStr) return '';
  return titleStr
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
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
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  
  if (lastRow < 2) return;
  
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const titleColIndex = titleColumn ? headerRow.indexOf(titleColumn) : headerRow.indexOf('Title');
  
  if (titleColIndex === -1) return;
  
  let urlColIndex = headerRow.indexOf('GitHubCoverURL');
  
  if (urlColIndex === -1) {
    urlColIndex = lastCol;
    sheet.getRange(1, urlColIndex + 1).setValue('GitHubCoverURL');
  }
  
  const titles = sheet.getRange(2, titleColIndex + 1, lastRow - 1, 1).getValues();
  
  const urls = titles.map(row => {
    const title = row[0];
    if (!title) return [''];
    return [getGitHubCoverUrl(title, category)];
  });
  
  sheet.getRange(2, urlColIndex + 1, urls.length, 1).setValues(urls);
  
  SpreadsheetApp.getUi().alert(`Success! Added ${urls.length} cover URLs to ${sheetName}`);
}

function addCoverUrlsToTV() {
  addCoverUrlsToSheet('Shows', 'tv', 'Title');
}

function addCoverUrlsToBooks() {
  addCoverUrlsToSheet('Books', 'books', 'Title');
}

function addCoverUrlsToMovies() {
  addCoverUrlsToSheet('Movies', 'movies', 'Title');
}

function addCoverUrlsToAll() {
  addCoverUrlsToSheet('Shows', 'tv', 'Title');
  addCoverUrlsToSheet('Books', 'books', 'Title');
  addCoverUrlsToSheet('Movies', 'movies', 'Title');
  SpreadsheetApp.getUi().alert('Success! Added cover URLs to Shows, Books, and Movies!');
}
```

3. **Update your existing `onOpen()` function** to add the GitHub Sync menu:

Find your existing `onOpen()` function and add this menu creation:

```javascript
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  // YOUR EXISTING MENUS (keep these!):
  // ui.createMenu('IGDB')...
  // ui.createMenu('TMDB')...
  // ui.createMenu('Google Books')...
  
  // ADD THIS NEW MENU:
  ui.createMenu('GitHub Sync')
      .addItem('Sync Covers (All Sheets)', 'addCoverUrlsToAll')
      .addSeparator()
      .addItem('Sync Shows (TV)', 'addCoverUrlsToTV')
      .addItem('Sync Books', 'addCoverUrlsToBooks')
      .addItem('Sync Movies', 'addCoverUrlsToMovies')
      .addToUi();
}
```

4. **Add the auto-populate trigger** (add this function too):

```javascript
// Automatically populate GitHubCoverURL when Title is added/edited
function onEdit(e) {
  // ... your existing onEdit code (if any) ...
  
  // ADD THIS:
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const range = e.range;
  const row = range.getRow();
  const col = range.getColumn();
  
  if (row === 1) return;
  
  let category;
  if (sheetName === 'Shows') category = 'tv';
  else if (sheetName === 'Books') category = 'books';
  else if (sheetName === 'Movies') category = 'movies';
  else return;
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const titleColIndex = headers.indexOf('Title');
  const urlColIndex = headers.indexOf('GitHubCoverURL');
  
  if (titleColIndex === -1 || urlColIndex === -1) return;
  
  if (col === titleColIndex + 1) {
    const title = sheet.getRange(row, titleColIndex + 1).getValue();
    if (title) {
      const url = getGitHubCoverUrl(title, category);
      sheet.getRange(row, urlColIndex + 1).setValue(url);
    }
  }
}
```

### For Games Spreadsheet:

Same process - add the functions from `GOOGLE_APPS_SCRIPT_GAMES_COVER_URLS.gs` to your existing script, then add the menu to your `onOpen()` function.

## Result:

You'll have all your menus:
- **IGDB** (your existing menu)
- **TMDB** (your existing menu)  
- **Google Books** (your existing menu)
- **GitHub Sync** (new menu)
