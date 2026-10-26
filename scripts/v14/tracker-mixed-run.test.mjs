import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {compileTrackerMixedPlan:compile,mixedJournal,encodeMixedPlan,decodeMixedPlan}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
const {advanceTrackerMixedRun:advance}=await import('../../app/lib/v14/tracker-mixed-run.ts');
const {compileNightlyPlan}=await import('../../app/lib/v14/nightly-plan.ts');
const {trackerRowIdentity}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {trackerBaselineGeneration,attachTrackerConflictDecisions,conflictDecisionKey,conflictDecisionValue}=await import('../../app/lib/v14/tracker-conflict-decisions.ts');
const {previewTrackerThreeWay}=await import('../../app/lib/v14/tracker-three-way.ts');h.deregister();
export function mixedFixture(zero=false){
 const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables),context={stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)};
 if(!zero){items[0].personal_rating=9.1;changeFixture(tables,0,'Hours Played','20');items[1].user_status='Completed';changeFixture(tables,1,'My Rating','9.2');items[2].completed_on='2026-10-18';changeFixture(tables,2,'My Rating','4.9');items[3].personal_rating=9.3;changeFixture(tables,3,'WatchDate','2026-10-19');}
 return {items,tables,baseline,context,plan:compile(items,tables,[],baseline,context,'now')};
}
function adapter(s){
 let record={revision:1,journal:mixedJournal(s.plan)},receipt=null,claimed=false,imports=0,exports=0,confirmations=0;const audits=new Map();
 const a={
  journal:{read:async()=>structuredClone(record),save:async(revision,_id,journal)=>{assert.equal(revision,record.revision);record={revision:revision+1,journal:structuredClone(journal)};return structuredClone(record);}},
  claim:async()=>{claimed=true;return receipt?{status:'completed',receipt:structuredClone(receipt)}:{status:'running'};},
  fresh:async()=>({items:structuredClone(s.items),tables:structuredClone(s.tables),generation:trackerBaselineGeneration(s.baseline),metadataStamp:s.context.metadataStamp}),
  import:{authenticatedOwner:async()=>s.plan.ownerId,read:async(_lib,id)=>structuredClone(s.items.find(i=>i.id===id)),source:async step=>({generation:trackerBaselineGeneration(s.baseline),fields:{...step.sheet}}),write:async(id,revision,requestId,patch)=>{if(audits.has(requestId))return structuredClone(audits.get(requestId));const item=s.items.find(i=>i.id===id);assert.equal(item.revision,revision);Object.assign(item,{...patch,user_fields:{...item.user_fields,...patch.overrides},revision:revision+1});audits.set(requestId,structuredClone(item));imports++;return structuredClone(item);}},
  export:async plan=>{assert.ok(claimed);exports++;for(const step of plan.exports){const t=s.tables.find(t=>t.name===step.tab),row=t.rows.find(c=>step.identities.includes(trackerRowIdentity(t,c)));for(const [key,value] of Object.entries(step.after))row[t.headers.indexOf(key)]=String(value??'');}},
  confirm:async(plan,baseline)=>{confirmations++;receipt={runId:plan.runId,plan:plan.fingerprint,baselineFingerprint:baseline.fingerprint,confirmedAt:'2026-10-20T01:00:00Z',records:baseline.records.length};s.baseline={...s.baseline,lastConfirmedSync:receipt.confirmedAt,records:baseline.records.map(r=>({...r,media:s.items.find(i=>i.id===r.itemId).media_type,confirmedAt:receipt.confirmedAt}))};return structuredClone(receipt);},
  stats:()=>({imports,exports,confirmations,audits:audits.size,record}),
 };return a;
}
test('mixed plan orders post-import revision exports, round-trips and contains no Notes',()=>{
 const s=mixedFixture();assert.equal(s.plan.imports.length,4);assert.equal(s.plan.exports.length,4);assert.ok(s.plan.exports.every(e=>e.itemRevision===2));assert.deepEqual(decodeMixedPlan(encodeMixedPlan(s.plan),s.plan.libraryId,s.plan.fingerprint),s.plan);assert.equal(JSON.stringify(s.plan).includes('PRIVATE NOTES'),false);
 assert.throws(()=>decodeMixedPlan(encodeMixedPlan(s.plan),s.plan.ownerId,s.plan.fingerprint));
});
test('explicit standards override either one-sided source and converge all media without touching Notes',async()=>{
 for(let n=0;n<4;n++)for(const originalSide of ['app','tracker'])for(const side of ['app','tracker']){
  const s=mixedFixture(true),original=s.items[n].personal_rating,next=n===2?4.7:9.2;
  if(originalSide==='app')s.items[n].personal_rating=next;else changeFixture(s.tables,n,'My Rating',next);
  const row=attachTrackerConflictDecisions(previewTrackerThreeWay(s.items,s.tables,s.baseline,'now'),s.items,[],s.baseline).changes[0];
  const setting={key:conflictDecisionKey(s.baseline.libraryId,row),revision:1,value:{value:conflictDecisionValue(row.decisionToken,side)}};
  s.plan=compile(s.items,s.tables,[setting],s.baseline,s.context,'now');
  assert.equal(s.plan.imports.length,side==='tracker'?1:0);assert.equal(s.plan.exports.length,side==='app'?1:0);
  const a=adapter(s);assert.equal((await advance(s.plan,a)).status,'verified');
  assert.equal(s.items[n].personal_rating,side===originalSide?next:original);
  assert.equal(s.items[n].notes,'PRIVATE NOTES MUST SURVIVE');assert.equal(previewTrackerThreeWay(s.items,s.tables,s.baseline,'now').changes.length,0);
 }
});
test('one recoverable mixed run verifies both sides before advancing the baseline; identical restart does not repeat edits',async()=>{
 const s=mixedFixture(),a=adapter(s);assert.equal((await advance(s.plan,a)).status,'verified');assert.deepEqual({...a.stats(),record:undefined},{imports:4,exports:1,confirmations:1,audits:4,record:undefined});
 assert.equal((await advance(decodeMixedPlan(encodeMixedPlan(s.plan),s.plan.libraryId,s.plan.fingerprint),a)).status,'verified');assert.equal(a.stats().imports,4);assert.equal(a.stats().exports,1);assert.equal(a.stats().confirmations,1);
});
test('lost import acknowledgement resumes a durable dispatched command through the same audited request',async()=>{
 const s=mixedFixture(),a=adapter(s),write=a.import.write;let lost=true;a.import.write=async(...args)=>{const r=await write(...args);if(lost){lost=false;throw new Error('lost');}return r;};
 assert.equal((await advance(s.plan,a)).status,'uncertain');assert.equal(a.stats().confirmations,0);assert.equal((await advance(s.plan,a)).status,'verified');assert.equal(a.stats().audits,4);
});
test('lost Google acknowledgement is confirmed by destination readback, not a second send',async()=>{
 const s=mixedFixture(),a=adapter(s),send=a.export;a.export=async p=>{await send(p);throw new Error('lost response');};assert.equal((await advance(s.plan,a)).status,'verified');assert.equal(a.stats().exports,1);
});
test('unchanged cell-only exports can retry the same assignment, but failed readback never advances baselines',async()=>{
 const s=mixedFixture(),a=adapter(s);let sends=0;a.export=async()=>{sends++;throw new Error('no known outcome');};assert.equal((await advance(s.plan,a)).status,'uncertain');assert.equal((await advance(s.plan,a)).status,'uncertain');assert.equal(sends,2);assert.equal(a.stats().confirmations,0);
});
test('lost final commit acknowledgement recovers its durable receipt without a second confirmation',async()=>{
 const s=mixedFixture(),a=adapter(s),confirm=a.confirm;a.confirm=async(...args)=>{await confirm(...args);throw new Error('commit response lost');};await assert.rejects(advance(s.plan,a),/lost/);assert.equal((await advance(s.plan,a)).status,'verified');assert.equal(a.stats().confirmations,1);
});
test('source revision or metadata changes prevent final confirmation',async()=>{
 const s=mixedFixture(),a=adapter(s),send=a.export;a.export=async p=>{await send(p);s.items[0].revision++;};assert.equal((await advance(s.plan,a)).status,'conflict');assert.equal(a.stats().confirmations,0);
 const t=mixedFixture(),b=adapter(t);t.context.metadataStamp='c'.repeat(32);await assert.rejects(advance(t.plan,b),/generation/);assert.equal(b.stats().confirmations,0);
});
test('zero-operation agreement can advance a stale baseline and classify the next one-sided edit correctly',async()=>{
 const s=mixedFixture(true);s.items[2].personal_rating=4.9;changeFixture(s.tables,2,'My Rating','4.9');s.plan=compile(s.items,s.tables,[],s.baseline,s.context,'now');assert.equal(s.plan.imports.length+s.plan.exports.length,0);const a=adapter(s);assert.equal((await advance(s.plan,a)).status,'verified');assert.equal(a.stats().exports,0);assert.equal(a.stats().imports,0);changeFixture(s.tables,2,'My Rating','4.8');assert.equal(previewTrackerThreeWay(s.items,s.tables,s.baseline,'now').changes[0].direction,'import');
});

test('resume repairs an unapplied cell batch, without repeating confirmed imports',async()=>{
 const s=mixedFixture(),a=adapter(s),send=a.export;let first=true;
 a.export=async p=>{if(first){first=false;throw new Error('rejected before applying');}return send(p);};
 assert.equal((await advance(s.plan,a)).status,'uncertain');
 assert.equal((await advance(s.plan,a)).status,'verified');
 assert.equal(a.stats().imports,4);assert.equal(a.stats().exports,1);
 assert.equal((await advance(s.plan,a)).status,'verified');assert.equal(a.stats().exports,1);
});
test('a third-party cell change blocks resume instead of overwriting it',async()=>{
 const s=mixedFixture(),a=adapter(s);let sends=0;a.export=async()=>{sends++;throw new Error('lost');};
 assert.equal((await advance(s.plan,a)).status,'uncertain');
 changeFixture(s.tables,0,'My Rating','2.1');
 assert.equal((await advance(s.plan,a)).status,'conflict');assert.equal(sends,1);assert.equal(a.stats().confirmations,0);
});

test('an uncertain append remains readback-only and is never blindly repeated',async()=>{
 const s=mixedFixture(true);
 const game={...s.items[0],id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',title:'New unique game',metadata:{IGDB_ID:'123456'},user_status:'Wishlist'};
 s.items.push(game);
 s.plan=compileNightlyPlan({items:s.items,settings:[]},s.tables,s.baseline,s.context,'2026-10-25T10:00:00Z').plan;
 assert.equal(s.plan.exports[0].kind,'add-record');
 const a=adapter(s);let sends=0;a.export=async()=>{sends++;throw new Error('unknown append outcome');};
 assert.equal((await advance(s.plan,a)).status,'uncertain');
 assert.equal((await advance(s.plan,a)).status,'uncertain');assert.equal(sends,1);assert.equal(a.stats().confirmations,0);
});
