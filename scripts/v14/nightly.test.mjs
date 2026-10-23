import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
import {gunzipSync} from 'node:zlib';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture,fixtureOwner,fixtureLibrary} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {compileNightlyPlan}=await import('../../app/lib/v14/nightly-plan.ts');
const {encodeFullLibraryBackup,saveFullLibraryBackup}=await import('../../app/lib/v14/nightly-backup.ts');
const {encodeMixedPlan,decodeMixedPlan}=await import('../../app/lib/v14/tracker-mixed-plan.ts');h.deregister();
const context={stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)};
function fixture(){const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables);return {snapshot:{items,settings:[]},tables,baseline};}
const compile=s=>compileNightlyPlan(s.snapshot,s.tables,s.baseline,context,'2026-10-23T09:00:00Z');
test('nightly accepts independent edits in both directions and ignores saved manual conflict decisions',()=>{
 const s=fixture();s.snapshot.items[0].personal_rating=9.1;changeFixture(s.tables,1,'My Rating','9.2');
 s.snapshot.items[2].personal_rating=4.3;changeFixture(s.tables,2,'My Rating','4.7');
 const r=compile(s);assert.equal(r.selected.length,2);assert.deepEqual(r.heldItems,[s.snapshot.items[2].id]);assert.equal(r.plan.imports.length,1);assert.equal(r.plan.exports.length,1);
 assert.deepEqual(decodeMixedPlan(encodeMixedPlan(r.plan),fixtureLibrary,r.plan.fingerprint),r.plan);
 assert.equal(JSON.stringify(r.plan).includes('PRIVATE NOTES'),false);
});
test('a conflict on any field holds the whole item, including other one-sided edits',()=>{
 const s=fixture();s.snapshot.items[0].personal_rating=9.1;changeFixture(s.tables,0,'My Rating','8.4');changeFixture(s.tables,0,'Hours Played','20');
 const r=compile(s);assert.equal(r.plan,null);assert.deepEqual(r.heldItems,[s.snapshot.items[0].id]);
});
test('invalid Sheet values stay in review instead of stopping unrelated safe changes',()=>{
 const s=fixture();changeFixture(s.tables,0,'Status','gibberish');s.snapshot.items[1].personal_rating=9.1;
 const r=compile(s);assert.deepEqual(r.selected,[s.snapshot.items[1].id]);assert.deepEqual(r.heldItems,[s.snapshot.items[0].id]);
});
test('a unique complete app addition may export, but a Sheet addition is never guessed into the library',()=>{
 const s=fixture();const game={...s.snapshot.items[0],id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',title:'New unique game',metadata:{IGDB_ID:'123456'},user_status:'Wishlist'};s.snapshot.items.push(game);
 const r=compile(s);assert.deepEqual(r.selected,[game.id]);assert.equal(r.plan.exports[0].kind,'add-record');assert.equal(r.plan.imports.length,0);
 const t=fixture();t.tables[0].rows.push(['New sheet game','PS5','555555','Queued','8','','5','false']);
 assert.equal(compile(t).plan,null);assert.equal(compile(t).heldItems.length,1);
});
test('converged sources do not stage or write an empty sync',()=>{const r=compile(fixture());assert.equal(r.plan,null);assert.deepEqual(r.heldItems,[]);});
const tableNames=['libraries','items','item_metadata','identifiers','episodes','episode_progress','settings','collections','collection_items','assets','import_batches','import_rows','import_issues','change_events','sync_targets','sync_outbox','sync_baselines','sync_runs','sync_conflicts'];
function backup(){return {format:'cdl-library-backup-v1',ownerId:fixtureOwner,libraryId:fixtureLibrary,capturedAt:'2026-10-23T09:00:00Z',migrations:['20261023002600'],tables:{...Object.fromEntries(tableNames.map(t=>[t,[]])),libraries:[{id:fixtureLibrary,owner_id:fixtureOwner}],items:[{id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',library_id:fixtureLibrary,notes:'PRIVATE NOTES\nSecond paragraph',deleted_at:'2026-10-01T00:00:00Z'}],episode_progress:[{library_id:fixtureLibrary,episode_id:'dddddddd-dddd-4ddd-8ddd-dddddddddddd',watched:true,revision:7}]}};}
test('full recoverable archive retains notes, archived items, paragraph breaks and watched revisions',async()=>{
 let saved;const store={upload:async(_path,body,options)=>{assert.equal(options.upsert,false);saved=body;return {error:null};},download:async()=>({error:null,data:new Blob([saved])})};
 const encoded=encodeFullLibraryBackup(backup(),fixtureOwner,fixtureLibrary),r=await saveFullLibraryBackup(store,encoded);
 assert.deepEqual(JSON.parse(gunzipSync(saved).toString()),backup());assert.equal(r.counts.items,1);assert.equal(r.counts.episode_progress,1);assert.equal(r.format,'cdl-library-backup-v1');
});
test('missing tables, mixed scope and damaged storage fail closed before sync',async()=>{
 const missing=backup();delete missing.tables.episode_progress;assert.throws(()=>encodeFullLibraryBackup(missing,fixtureOwner,fixtureLibrary));
 const mixed=backup();mixed.tables.items[0].library_id=fixtureOwner;assert.throws(()=>encodeFullLibraryBackup(mixed,fixtureOwner,fixtureLibrary));
 const encoded=encodeFullLibraryBackup(backup(),fixtureOwner,fixtureLibrary);
 await assert.rejects(saveFullLibraryBackup({upload:async()=>({error:null}),download:async()=>({error:null,data:new Blob(['damaged'])})},encoded),/readback/);
});
