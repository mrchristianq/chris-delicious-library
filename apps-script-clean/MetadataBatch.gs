/** Metadata batch runner v13.1.30. Shared by Movies and TV Shows. */
function cdlMetadataNext50_(sheetName, updater, restart) {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error('Sheet not found: ' + sheetName);
  const lock = LockService.getDocumentLock();
  if (!lock.tryLock(1000)) {
    ss.toast('Another metadata batch is running. Please wait.', sheetName, 8);
    return;
  }
  try {
    const props = PropertiesService.getDocumentProperties();
    const key = 'cdl.metadata.nextRow.' + sheet.getSheetId();
    const active = ss.getActiveSheet();
    const selectedRow = active && active.getSheetId() === sheet.getSheetId()
      ? Math.max(2, sheet.getActiveRange().getRow()) : 2;
    if (restart) {
      props.setProperty(key, String(selectedRow));
      ss.toast('Next metadata batch will start at row ' + selectedRow + '.', sheetName, 8);
      return;
    }
    const saved = Number(props.getProperty(key));
    let next = Number.isInteger(saved) && saved >= 2 ? saved : selectedRow;
    const last = sheet.getLastRow();
    if (next > last) {
      ss.toast('Reached the end. To run again, select a row and choose Start metadata batch from selected row.', sheetName, 12);
      return;
    }
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    if (!headers.some(h => String(h).trim() === 'Title')) throw new Error('Missing Title column.');
    const start = next;
    const end = Math.min(last, start + 49);
    const deadline = Date.now() + 180000;
    let processed = 0, matched = 0, errors = 0;
    const failures = [];
    while (next <= end && (processed === 0 || Date.now() < deadline)) {
      // Checkpoint before work: an interrupted row is retried, never skipped.
      props.setProperty(key, String(next));
      ss.toast('Row ' + next + ' (' + (processed + 1) + '/' + (end - start + 1) + ')', sheetName + ' metadata', 10);
      const result = updater(sheet, next, 1, { quiet: true, headers: headers });
      if (!result) throw new Error('Metadata updater returned no result at row ' + next);
      SpreadsheetApp.flush();
      processed++;
      matched += result.matched;
      errors += result.errors;
      if (result.errors || (!result.matched && !result.skipped)) failures.push(next);
      if (result.errors) break; // Retry failed row on next click; do not advance after API/write errors.
      next++;
      props.setProperty(key, String(next));
    }
    const message = 'Processed ' + processed + ' rows; matched ' + matched + '; errors ' + errors + '. ' +
      (next > last ? 'End of sheet.' : 'Next click resumes at row ' + next + '.') +
      (failures.length ? ' Review rows: ' + failures.join(', ') + '.' : '');
    console.log(sheetName + ' metadata: ' + message);
    ss.toast(message, sheetName + ' metadata', 20);
    return { processed, matched, errors, nextRow: next, reviewRows: failures };
  } finally {
    lock.releaseLock();
  }
}
