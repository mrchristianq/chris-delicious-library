import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {compileTrackerMixedPlan:compile,compileMixedNewItemPlan,decodeMixedPlan,encodeMixedPlan,mixedHash,mixedRunId}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
const {buildSelectedTrackerBaseline}=await import('../../app/lib/v14/tracker-baseline.ts');
const {prepareNewTrackerImport}=await import('../../app/lib/v14/tracker-new-import.ts');
const {trackerRowIdentity}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {parseSelectedItems}=await import('../../app/lib/v14/tracker-manual-contract.ts');h.deregister();
function fixture(){const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables);items[0].personal_rating=9.1;changeFixture(tables,1,'My Rating',9.2);items[2].personal_rating=4.2;changeFixture(tables,2,'My Rating',4.8);return {items,tables,baseline,context:{stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)}};}
test('selected ordinary exports ignore an unrelated unresolved conflict without approving it',()=>{
 const s=fixture(),p=compile(s.items,s.tables,[],s.baseline,s.context,'now',[s.items[0].id]);assert.equal(p.imports.length,0);assert.equal(p.exports.length,1);assert.deepEqual(p.selection.itemIds,[s.items[0].id]);assert.equal(p.sources.length,4);assert.deepEqual(decodeMixedPlan(encodeMixedPlan(p),p.libraryId,p.fingerprint),p);
 assert.throws(()=>compile(s.items,s.tables,[],s.baseline,s.context,'now',[s.items[2].id]),/Unresolved/);
});
test('only selected fresh agreement can enter a partial baseline',()=>{
 const s=fixture();changeFixture(s.tables,0,'My Rating',9.1);const b=buildSelectedTrackerBaseline(s.items,s.tables,[s.items[0].id]);assert.equal(b.records.length,1);assert.equal(b.records[0].fields['My Rating'],9.1);
 assert.throws(()=>buildSelectedTrackerBaseline(s.items,s.tables,[s.items[1].id]));assert.throws(()=>buildSelectedTrackerBaseline(s.items,s.tables,[s.items[0].id,s.items[0].id]));
});
test('selected new Sheet creation retains full source guards but excludes other operations',()=>{
 const s=fixture(),t=s.tables[0],row=[...t.rows[0]];row[0]='Unique selected Sheet item';row[t.headers.indexOf('IGDB_ID')]='123456';t.rows.push(row);
 const identity=trackerRowIdentity(t,row),command=prepareNewTrackerImport(s,'Games',identity),p=compileMixedNewItemPlan(s.items,s.tables,s.baseline,s.context,'Games',identity,command.fingerprint,'now','selected-sheet-row');
 assert.equal(p.creates.length,1);assert.equal(p.exports.length,0);assert.equal(p.imports.length,0);assert.equal(p.sources.length,4);assert.deepEqual(p.selection.itemIds,[command.input.itemId]);assert.deepEqual(decodeMixedPlan(encodeMixedPlan(p),p.libraryId,p.fingerprint),p);
});
test('selection cannot claim items outside its sealed operations, even after rehashing',()=>{
 const s=fixture(),p=compile(s.items,s.tables,[],s.baseline,s.context,'now',[s.items[0].id]);p.selection.itemIds.push(s.items[1].id);const {fingerprint,runId,...body}=p;void fingerprint;void runId;p.fingerprint=mixedHash(body);p.runId=mixedRunId(p.fingerprint);assert.throws(()=>decodeMixedPlan(encodeMixedPlan(p),p.libraryId,p.fingerprint),/scope/);
 for(const bad of [[],null,['x','x'],[{}],['x'.repeat(513)],Array.from({length:101},(_,n)=>String(n))])assert.throws(()=>parseSelectedItems(bad));
});
