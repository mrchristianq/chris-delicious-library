import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./read-library','./save-setting','./tracker-checkpoint','./tracker-read','./library-snapshot','./tracker-projection','./edit-contract','./legacy-row'].includes(s)?s+'.ts':s,c);}});
const {createTrackerJournalStore:create}=await import('../../app/lib/v14/tracker-journal-store.ts');
const {newSyncJournal}=await import('../../app/lib/v14/tracker-checkpoint.ts');h.deregister();
const owner='11111111-1111-4111-8111-111111111111',library='22222222-2222-4222-8222-222222222222',request='33333333-3333-4333-8333-333333333333';
const journal=()=>newSyncJournal('a'.repeat(64),[{id:'operation',fingerprint:'b'.repeat(64)}]);
function fixture(){let setting=null,authenticated=true,wrongOwner=false,failedRead=false,writes=0;return {
 writer:{async authenticatedOwner(){return authenticated?owner:null;},async write(id,key,revision,_request,value){assert.equal(id,library);assert.equal(revision,setting?.revision??null);writes++;setting={library_id:library,key,revision:(revision??0)+1,value:{value}};return structuredClone(setting);},async snapshot(){if(failedRead)throw new Error('read failed');return {schema_version:1,complete:true,library_id:library,owner_id:wrongOwner?request:owner,observed_at:new Date().toISOString(),change_token:'fresh',items:[],episodes:[],settings:setting?[structuredClone(setting)]:[],counts:{items:0,episodes:0,settings:setting?1:0}};}},
 set authenticated(v){authenticated=v;},set wrongOwner(v){wrongOwner=v;},set failedRead(v){failedRead=v;},get writes(){return writes;},get setting(){return setting;}
};}
test('journal persists through the existing revisioned audited setting contract and survives a new adapter instance',async()=>{
 const f=fixture(),j=journal(),store=create(f.writer,library,j);assert.equal(await store.read(),null);
 const result=await store.save(null,request,j);assert.equal(result.revision,1);assert.deepEqual(result.journal,j);
 assert.deepEqual(await create(f.writer,library,j).read(),result);assert.match(f.setting.key,/^__cdl_tracker_run_v1:/);assert.equal(f.writes,1);
 await assert.rejects(store.save(null,request,j));assert.equal(f.writes,1);
});
test('anonymous, foreign owner, failed readback and tampered journal fail closed',async()=>{
 const f=fixture(),j=journal(),store=create(f.writer,library,j);f.authenticated=false;
 await assert.rejects(store.save(null,request,j));assert.equal(f.writes,0);f.authenticated=true;
 f.wrongOwner=true;await assert.rejects(store.read());f.wrongOwner=false;
 await store.save(null,request,j);f.failedRead=true;await assert.rejects(store.read());f.failedRead=false;
 f.setting.value.value='not json';await assert.rejects(store.read());
});
test('journal store does not accept arbitrary payloads, targets, states or operation hashes',async()=>{
 const f=fixture(),j=journal(),store=create(f.writer,library,j);
 for(const changed of [{...j,target:'original'},{...j,notes:'private'},{...j,steps:[{...j.steps[0],notes:'private'}]},{...j,steps:[{...j.steps[0],state:'confirmed'}]},{...j,steps:[{...j.steps[0],fingerprint:'c'.repeat(64)}]}])await assert.rejects(store.save(null,request,changed));
 assert.equal(f.writes,0);
});
test('checkpoint states cannot skip dispatch, move backwards or switch attempts',async()=>{
 const f=fixture(),j=journal(),store=create(f.writer,library,j);await store.save(null,request,j);
 const attempt='44444444-4444-4444-8444-444444444444';
 await assert.rejects(store.save(1,request,{...j,steps:[{...j.steps[0],state:'confirmed',attempt}]}));
 const dispatched={...j,steps:[{...j.steps[0],state:'dispatched',attempt}]};await store.save(1,request,dispatched);
 await assert.rejects(store.save(2,request,j));
 await assert.rejects(store.save(2,request,{...dispatched,steps:[{...dispatched.steps[0],state:'confirmed',attempt:request}]}));
 await store.save(2,request,{...dispatched,steps:[{...dispatched.steps[0],state:'confirmed'}]});assert.equal(f.writes,3);
});
test('mixed run advances only the whole export suffix after confirmed imports',async()=>{
 const f=fixture(),j=newSyncJournal('a'.repeat(64),['import:book','export:movie','export:game'].map(id=>({id,fingerprint:'b'.repeat(64)}))),store=create(f.writer,library,j);
 const attempt='44444444-4444-4444-8444-444444444444';
 await store.save(null,request,j);
 const dispatched=structuredClone(j);dispatched.steps[0]={...dispatched.steps[0],state:'dispatched',attempt};await store.save(1,request,dispatched);
 const confirmed=structuredClone(dispatched);confirmed.steps[0].state='confirmed';await store.save(2,request,confirmed);
 const exports=structuredClone(confirmed);exports.steps.slice(1).forEach(s=>{s.state='dispatched';s.attempt=attempt;});
 const split=structuredClone(exports);split.steps[2].attempt=request;await assert.rejects(store.save(3,request,split));
 const rewound=structuredClone(exports);rewound.steps[0].state='dispatched';await assert.rejects(store.save(3,request,rewound));
 await store.save(3,request,exports);
 const done=structuredClone(exports);done.steps.slice(1).forEach(s=>{s.state='confirmed';});await store.save(4,request,done);
 assert.equal(f.writes,5);assert.deepEqual((await store.read()).journal,done);
});
test('an unfinished import cannot be included in a multi-step export checkpoint',async()=>{
 const f=fixture(),j=newSyncJournal('a'.repeat(64),['import:book','import:tv','export:movie','export:game'].map(id=>({id,fingerprint:'b'.repeat(64)}))),store=create(f.writer,library,j);
 const attempt='44444444-4444-4444-8444-444444444444';await store.save(null,request,j);
 const first=structuredClone(j);first.steps[0]={...first.steps[0],state:'dispatched',attempt};await store.save(1,request,first);
 first.steps[0].state='confirmed';await store.save(2,request,first);
 const unsafe=structuredClone(first);unsafe.steps.slice(1).forEach(s=>{s.state='dispatched';s.attempt=attempt;});
 await assert.rejects(store.save(3,request,unsafe));assert.equal(f.writes,3);
});
