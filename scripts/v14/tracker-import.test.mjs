import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture,fixtureLibrary} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {compileTrackerImports:compile,runTrackerImport:run}=await import('../../app/lib/v14/tracker-import.ts');
const {trackerBaselineGeneration}=await import('../../app/lib/v14/tracker-conflict-decisions.ts');h.deregister();
function setup(){const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables);return {items,tables,baseline};}
function one(){const s=setup();changeFixture(s.tables,2,'My Rating','4.9');return {...s,step:compile(s.items,s.tables,[],s.baseline,'now')[0]};}
function adapter(s){let item=structuredClone(s.items[2]),writes=0;const receipts=new Map();return {
 authenticatedOwner:async()=>s.baseline.ownerId,read:async()=>structuredClone(item),source:async()=>({generation:trackerBaselineGeneration(s.baseline),fields:{...s.step.sheet}}),
 write:async(id,revision,requestId,patch)=>{writes++;if(receipts.has(requestId))return structuredClone(receipts.get(requestId));if(item.revision!==revision)throw new Error('CAS');item={...item,...patch,user_fields:{...item.user_fields,...patch.overrides},revision:revision+1};receipts.set(requestId,structuredClone(item));return structuredClone(item);},
 state:()=>({item,writes,receipts}),replace:value=>{item=value;},
 };}
test('four-media imports use canonical status/rating/date and preserve five-point book ratings',()=>{
 const s=setup();for(let n=0;n<4;n++){
  const status=n===0||n===2?'Status':n===3?'Watch Status':'WatchStatus';changeFixture(s.tables,n,status,n===3?'Watched':'Completed');changeFixture(s.tables,n,'My Rating',n===2?'4.9':'9.2');changeFixture(s.tables,n,n===3?'WatchDate':'Completed Date','2026-10-19');
 }changeFixture(s.tables,0,'Completed','true');changeFixture(s.tables,1,'NumberOfEpisodes','12');
 const steps=compile(s.items,s.tables,[],s.baseline,'now');assert.equal(steps.length,4);
 for(const step of steps){assert.equal(step.patch.completed_on,'2026-10-19');assert.equal(step.patch.personal_rating,step.media==='book'?4.9:9.2);assert.ok(step.patch.user_status);assert.equal(JSON.stringify(step).includes('PRIVATE NOTES'),false);}
 assert.equal(steps.find(s=>s.media==='tv').patch.overrides.NumberOfEpisodes,'12');
 assert.deepEqual(compile(s.items,s.tables,[],s.baseline,'now'),steps);
});
test('blank dates and zero ratings are explicit changes rather than skipped values',()=>{
 const s=setup();s.items[2].completed_on='2026-10-10';s.baseline.records[2].fields['Completed Date']='2026-10-10';changeFixture(s.tables,2,'My Rating','0');
 const step=compile(s.items,s.tables,[],s.baseline,'now')[0];assert.equal(step.patch.personal_rating,0);assert.equal(step.patch.completed_on,null);
});
test('derived completion flags, invalid status/rating/date, Notes and unknown columns cannot be independently imported',()=>{
 for(const [index,key,value] of [[0,'Completed','true'],[2,'My Rating','6'],[2,'Status','Invalid'],[2,'Completed Date','2026-02-30']]){const s=setup();changeFixture(s.tables,index,key,value);assert.throws(()=>compile(s.items,s.tables,[],s.baseline,'now'));}
 const s=setup();s.tables[0].headers.push('Notes');assert.throws(()=>compile(s.items,s.tables,[],s.baseline,'now'));
});
test('unresolved conflicts block preparation, while app-only edits are never imported over',()=>{
 const s=setup();s.items[2].personal_rating=4.5;changeFixture(s.tables,2,'My Rating','4.9');assert.throws(()=>compile(s.items,s.tables,[],s.baseline,'now'),/Unresolved/);
 const a=setup();a.items[2].personal_rating=4.5;assert.deepEqual(compile(a.items,a.tables,[],a.baseline,'now'),[]);
});
test('import confirms only independent readback and preserves private notes and metadata',async()=>{
 const s=one(),a=adapter(s);assert.equal((await run(s.step,a)).status,'confirmed');const state=a.state();assert.equal(state.item.personal_rating,4.9);assert.equal(state.item.notes,s.items[2].notes);assert.deepEqual(state.item.metadata,s.items[2].metadata);
 assert.equal((await run(JSON.parse(JSON.stringify(s.step)),a)).status,'confirmed');assert.equal(a.state().receipts.size,1);assert.equal(a.state().item.revision,2);
});
test('lost acknowledgement remains uncertain, then explicit restart retry recovers the same audited request only once',async()=>{
 const s=one(),a=adapter(s),write=a.write;let lost=true;a.write=async(...args)=>{const result=await write(...args);if(lost){lost=false;throw new Error('lost acknowledgement');}return result;};
 assert.equal((await run(s.step,a)).status,'uncertain');assert.equal(a.state().item.revision,2);
 assert.equal((await run(JSON.parse(JSON.stringify(s.step)),a)).status,'confirmed');assert.equal(a.state().receipts.size,1);assert.equal(a.state().item.revision,2);
});
test('wrong owner, tampered plan, source changes, baseline changes or newer app revision block dispatch',async()=>{
 const s=one(),a=adapter(s);await assert.rejects(run({...s.step,revision:9},a),/Invalid/);
 await assert.rejects(run(s.step,{...a,authenticatedOwner:async()=>fixtureLibrary}),/owner/);
 assert.equal((await run(s.step,{...a,source:async()=>({generation:'changed',fields:s.step.sheet})})).status,'conflict');
 assert.equal((await run(s.step,{...a,source:async()=>({generation:s.step.generation,fields:{...s.step.sheet,'My Rating':3}})})).status,'conflict');
 a.replace({...a.state().item,revision:3});assert.equal((await run(s.step,a)).status,'conflict');assert.equal(a.state().writes,0);
});
test('an HTTP-like success with stale readback is uncertain; a source edit after applying is a conflict',async()=>{
 const s=one(),a=adapter(s);assert.equal((await run(s.step,{...a,read:async()=>s.items[2]})).status,'uncertain');
 const t=one(),b=adapter(t),source=b.source;let reads=0;b.source=async(step)=>{const result=await source(step);if(++reads===3)result.fields['My Rating']=1;return result;};
 assert.equal((await run(t.step,b)).status,'conflict');assert.equal(b.state().item.revision,2);
});
test('a coincidentally matching later edit is not treated as this command without its audited request',async()=>{
 const s=one(),a=adapter(s);a.replace({...a.state().item,personal_rating:4.9,revision:2});
 assert.equal((await run(s.step,a)).status,'uncertain');assert.equal(a.state().receipts.size,0);assert.equal(a.state().item.revision,2);
});
test('unavailable readback never confirms; the same sealed command can recover after reads return',async()=>{
 const s=one(),a=adapter(s),read=a.read;let calls=0;
 a.read=async(...args)=>{if(++calls===2)throw new Error('readback offline');return read(...args);};
 await assert.rejects(run(s.step,a),/offline/);assert.equal(a.state().item.revision,2);
 a.read=read;assert.equal((await run(s.step,a)).status,'confirmed');assert.equal(a.state().receipts.size,1);
});
