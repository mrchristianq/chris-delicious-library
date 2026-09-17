import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync(new URL('../apps-script-clean/MetadataBatch.gs', import.meta.url), 'utf8');
function fixture({ selected = 2, last = 130, locked = false } = {}) {
  const props = new Map();
  let released = 0, now = 0;
  const sheet = { getSheetId: () => 1, getActiveRange: () => ({ getRow: () => selected }),
    getLastRow: () => last, getLastColumn: () => 1, getRange: () => ({ getValues: () => [['Title']] }) };
  const ss = { getSheetByName: () => sheet, getActiveSheet: () => sheet, toast() {} };
  const context = vm.createContext({
    SpreadsheetApp: { getActive: () => ss, flush() {} },
    LockService: { getDocumentLock: () => ({ tryLock: () => !locked, releaseLock: () => released++ }) },
    PropertiesService: { getDocumentProperties: () => ({ getProperty: k => props.get(k), setProperty: (k, v) => props.set(k, v) }) },
    Date: { now: () => now }, console: { log() {} },
  });
  vm.runInContext(source, context);
  return { run: updater => context.cdlMetadataNext50_('Movies', updater, false),
    restart: () => context.cdlMetadataNext50_('Movies', null, true),
    advance: ms => now += ms, cursor: () => props.get('cdl.metadata.nextRow.1'), released: () => released };
}
const ok = () => ({ matched: 1, errors: 0, recRows: 0 });
const first = fixture({ selected: 7 });
assert.equal(first.run(ok).processed, 50);
assert.equal(first.cursor(), '57');
assert.equal(first.run(ok).nextRow, 107);
assert.equal(first.released(), 2);
first.restart();
assert.equal(first.cursor(), '7');
const timeout = fixture();
assert.equal(timeout.run(() => { timeout.advance(90000); return ok(); }).processed, 2);
assert.equal(timeout.cursor(), '4');
const error = fixture();
assert.equal(error.run(() => ({ matched: 0, errors: 1 })).nextRow, 2);
assert.equal(error.cursor(), '2');
assert.throws(() => error.run(() => { throw Error('interrupted'); }), /interrupted/);
assert.equal(error.cursor(), '2');
assert.equal(error.released(), 2);
const empty = fixture({ last: 3 });
assert.equal(empty.run(() => ({ matched: 0, errors: 0, skipped: 1 })).reviewRows.length, 0);
assert.equal(empty.cursor(), '4');
assert.equal(empty.run(() => { throw Error('must not wrap'); }), undefined);
const locked = fixture({ locked: true });
assert.equal(locked.run(() => { throw Error('must not run'); }), undefined);
assert.equal(locked.cursor(), undefined);
console.log('PASS: selected start, 50-row limit, resume, empty recommendations, restart, deadline, failure checkpoint, end-of-sheet, blank rows, lock release/exclusion.');
