import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(`../../app/${name}`,import.meta.url),'utf8');

test('Sync entry points open an overlay without replacing library navigation',()=>{
 const page=read('page.tsx');
 assert.equal((page.match(/setSyncOpen\(true\)/g)||[]).length,2);
 assert.doesNotMatch(page,/setNav\("tracker-sync"\)/);
 assert.match(page,/syncOpen && libraryBackend \? <TrackerSyncView/);
 assert.match(page,/onBack=\{\(\) => setSyncOpen\(false\)\}/);
});
test('Sync uses native modal focus isolation, named controls and write-aware dismissal',()=>{
 const view=read('components/TrackerSyncView.tsx');
 assert.match(view,/element\?\.showModal\(\)/);
 assert.match(view,/previous\?\.focus\(\)/);
 assert.match(view,/aria-labelledby="sync-panel-title"/);
 assert.match(view,/aria-label="Close Sync"/);
 assert.match(view,/if\(!closeLocked\)onBack\(\)/);
 assert.match(view,/closeLocked=saving!==null\|\|batchApplying\|\|choosingAll\|\|backupBusy/);
 assert.match(view,/onBusyChange=\{setBackupBusy\}/);
 assert.match(view,/::backdrop/);
 assert.match(view,/hidden=\{screen!=="review"\}/);
});
test('Backup navigation reports in-flight work and preserves restore confirmation gates',()=>{
 const view=read('components/LibraryBackups.tsx');
 assert.match(view,/onBusyChange\?\.\(true\)/);
 assert.match(view,/onBusyChange\?\.\(false\)/);
 assert.match(view,/disabled=\{!confirmed\|\|busy\|\|!preview.canRestore\}/);
 assert.match(view,/result.confirmed!==true\|\|result.token!==token/);
});
