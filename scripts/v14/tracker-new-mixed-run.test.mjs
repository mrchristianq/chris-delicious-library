import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline} from './tracker-import-fixtures.mjs';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {prepareNewTrackerImport:prepare}=await import('../../app/lib/v14/tracker-new-import.ts');
const {compileMixedNewItemPlan:compile,mixedJournal,encodeMixedPlan,decodeMixedPlan}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
const {advanceTrackerMixedRun:advance}=await import('../../app/lib/v14/tracker-mixed-run.ts');
const {trackerBaselineGeneration:generation}=await import('../../app/lib/v14/tracker-conflict-decisions.ts');
const {trackerRowIdentity:identity}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {mixedSummary}=await import('../../app/lib/v14/tracker-mixed-store.ts');hook.deregister();
function fixture(){
 const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables),context={stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)};
 const row=[...tables[0].rows[0]];row[0]='NEW ISOLATED TRACKER ITEM';row[tables[0].headers.indexOf('IGDB_ID')]='999999';tables[0].rows.push(row);
 const key=identity(tables[0],row),command=prepare({items,tables,baseline},'Games',key),plan=compile(items,tables,baseline,context,'Games',key,command.fingerprint,'now');
 return {items,tables,baseline,context,key,command,plan};
}
function adapter(s){
 let record={revision:1,journal:mixedJournal(s.plan)},receipt=null,creates=0,confirms=0,lost=false;
 const a={journal:{read:async()=>structuredClone(record),save:async(revision,_request,journal)=>{assert.equal(revision,record.revision);record={revision:revision+1,journal:structuredClone(journal)};return structuredClone(record);}},
 claim:async()=>receipt?{status:'completed',receipt:structuredClone(receipt)}:{status:'running'},
 fresh:async()=>({items:structuredClone(s.items),tables:structuredClone(s.tables),generation:generation(s.baseline),metadataStamp:s.context.metadataStamp}),
 import:{},export:async()=>{throw new Error('No export expected');},
 create:async command=>{
  if(!s.items.some(i=>i.id===command.input.itemId)){
   const p=command.input.patch;s.items.push({id:command.input.itemId,library_id:s.plan.libraryId,media_type:command.input.mediaType,title:'',revision:2,user_status:null,personal_rating:null,completed_on:null,notes:'',metadata:{},user_fields:p.overrides??{},...p});creates++;
   if(lost){lost=false;return {status:'uncertain'};}
  }return {status:'confirmed'};
 },
 confirm:async(plan,baseline)=>{confirms++;receipt={runId:plan.runId,plan:plan.fingerprint,baselineFingerprint:baseline.fingerprint,records:baseline.records.length,confirmedAt:'2026-10-20T14:00:00Z'};return structuredClone(receipt);},
 stats:()=>({creates,confirms,journal:structuredClone(record)}),lose:()=>lost=true};return a;
}
test('new item seals into the existing saved package and create journal, without private Notes',()=>{
 const s=fixture(),decoded=decodeMixedPlan(encodeMixedPlan(s.plan),s.plan.libraryId,s.plan.fingerprint);
 assert.deepEqual(decoded,s.plan);assert.equal(s.plan.sources.length,4);assert.equal(s.plan.creates.length,1);assert.equal(s.plan.imports.length+s.plan.exports.length,0);
 assert.equal(mixedJournal(s.plan).steps[0].id,`create:${s.command.input.itemId}`);assert.equal(mixedSummary(s.plan).creates[0].requestId,s.command.input.requestId);
 assert.equal(JSON.stringify(s.plan).includes('PRIVATE NOTES'),false);
 assert.throws(()=>compile(s.items,s.tables,s.baseline,s.context,'Games',s.key,'a'.repeat(64),'now'),/stale/);
 s.items[1].personal_rating=9;assert.throws(()=>compile(s.items,s.tables,s.baseline,s.context,'Games',s.key,s.command.fingerprint,'now'));
});
test('saved creation run confirms only after full five-item readback; repeat skips creation',async()=>{
 const s=fixture(),a=adapter(s);assert.equal((await advance(s.plan,a)).status,'verified');assert.equal(a.stats().creates,1);assert.equal(a.stats().confirms,1);
 assert.equal((await advance(decodeMixedPlan(encodeMixedPlan(s.plan),s.plan.libraryId,s.plan.fingerprint),a)).status,'verified');assert.equal(a.stats().creates,1);assert.equal(a.stats().confirms,1);
});
test('lost create result leaves dispatched checkpoint and resumes without duplicate creation',async()=>{
 const s=fixture(),a=adapter(s);a.lose();assert.equal((await advance(s.plan,a)).status,'uncertain');assert.equal(a.stats().journal.journal.steps[0].state,'dispatched');assert.equal(a.stats().confirms,0);
 assert.equal((await advance(decodeMixedPlan(encodeMixedPlan(s.plan),s.plan.libraryId,s.plan.fingerprint),a)).status,'verified');assert.equal(a.stats().creates,1);assert.equal(a.stats().journal.journal.steps[0].state,'confirmed');
});
test('later record edits, unexpected membership and missing creation adapter never confirm',async()=>{
 for(const alter of [s=>s.items[0].revision++,s=>s.items.push({...s.items[0],id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'})]){
  const s=fixture(),a=adapter(s),create=a.create;a.create=async c=>{const r=await create(c);alter(s);return r;};await assert.rejects(advance(s.plan,a),/membership|revision/);assert.equal(a.stats().confirms,0);
 }
 const s=fixture(),a=adapter(s);delete a.create;await assert.rejects(advance(s.plan,a),/not enabled/);assert.equal(a.stats().creates,0);
});
test('lost final confirmation acknowledgement resumes the durable receipt, not the create',async()=>{
 const s=fixture(),a=adapter(s),confirm=a.confirm;a.confirm=async(...args)=>{await confirm(...args);throw new Error('Lost final reply');};
 await assert.rejects(advance(s.plan,a),/Lost/);assert.equal((await advance(s.plan,a)).status,'verified');assert.equal(a.stats().creates,1);assert.equal(a.stats().confirms,1);
});
