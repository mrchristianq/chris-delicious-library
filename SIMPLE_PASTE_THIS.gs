// === PASTE THIS AT THE BOTTOM OF YOUR BOOKS/MOVIES/SHOWS SCRIPT ===

function sanitizeTitle(title) {
  if (!title) return '';
  const titleStr = String(title).trim();
  if (!titleStr) return '';
  return titleStr.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').substring(0, 50);
}

function getGitHubCoverUrl(title, category) {
  const sanitized = sanitizeTitle(title);
  return `https://mrchristianq.github.io/chris-delicious-library/covers/${category}/${sanitized}.jpg`;
}

function addCoverUrlsToSheet(sheetName, category) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2) return;
  
  const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const titleColIndex = headerRow.indexOf('Title');
  if (titleColIndex === -1) return;
  
  let urlColIndex = headerRow.indexOf('GitHubCoverURL');
  if (urlColIndex === -1) {
    urlColIndex = lastCol;
    sheet.getRange(1, urlColIndex + 1).setValue('GitHubCoverURL');
  }
  
  const titles = sheet.getRange(2, titleColIndex + 1, lastRow - 1, 1).getValues();
  const urls = titles.map(row => row[0] ? [getGitHubCoverUrl(row[0], category)] : ['']);
  sheet.getRange(2, urlColIndex + 1, urls.length, 1).setValues(urls);
  
  SpreadsheetApp.getUi().alert(`Done! Added ${urls.length} GitHub cover URLs to ${sheetName}`);
}

function addCoverUrlsToAll() {
  addCoverUrlsToSheet('Shows', 'tv');
  addCoverUrlsToSheet('Books', 'books');
  addCoverUrlsToSheet('Movies', 'movies');
}

function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();
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
      sheet.getRange(row, urlColIndex + 1).setValue(getGitHubCoverUrl(title, category));
    }
  }
}
