import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(s==='./tracker-read'?s+'.ts':s,c);}});
const {newSyncJournal,advanceSyncStep:advance,verifySyncRun,advanceSyncBatch}=await import('../../app/lib/v14/tracker-checkpoint.ts');h.deregister();
const expected=()=>newSyncJournal('a'.repeat(64),[{id:'first',fingerprint:'b'.repeat(64)},{id:'second',fingerprint:'c'.repeat(64)}]);
function fixture(){let record=null,external='before',writes=0,saves=0;return {
 store:{async read(){return structuredClone(record);},async save(revision,_id,journal){assert.equal(revision,record?.revision??null,'CAS');saves++;record={revision:(revision??0)+1,journal:structuredClone(journal)};return structuredClone(record);}},
 adapter:{async inspect(){return external;},async apply(){writes++;external='after';}},
 get writes(){return writes;},get saves(){return saves;},set external(v){external=v;},get record(){return record;}
};}
test('only independent readback confirms a step; resuming skips confirmed writes',async()=>{
 const f=fixture(),plan=expected();const first=await advance(f.store,plan,f.adapter);assert.equal(first.status,'pending');assert.equal(f.writes,1);
 assert.equal(first.record.journal.steps[0].state,'confirmed');
 f.external='before';assert.equal((await advance(f.store,plan,f.adapter)).status,'verified');assert.equal(f.writes,2);
 assert.equal((await advance(f.store,plan,f.adapter)).status,'verified');assert.equal(f.writes,2);
});
test('timeout after accepted write is recovered by readback, not repeated',async()=>{
 const f=fixture();const adapter={...f.adapter,async apply(){await f.adapter.apply();throw new Error('timeout');}};
 assert.equal((await advance(f.store,expected(),adapter)).status,'pending');assert.equal(f.writes,1);
});
test('HTTP success without observed change remains uncertain and is never automatically reissued',async()=>{
 const f=fixture();let attempts=0;const adapter={...f.adapter,async apply(){attempts++;}};
 assert.equal((await advance(f.store,expected(),adapter)).status,'uncertain');
 assert.equal((await advance(f.store,expected(),adapter)).status,'uncertain');assert.equal(attempts,1);
 f.external='after';assert.equal((await advance(f.store,expected(),adapter)).status,'pending');assert.equal(attempts,1);
});
test('checkpoint acknowledgement/readback failure blocks external writes',async()=>{
 const f=fixture();let reads=0;const broken={...f.store,async read(){reads++;if(reads===2)return null;return f.store.read();}};
 await assert.rejects(advance(broken,expected(),f.adapter));assert.equal(f.writes,0);
});
test('stale source or destination before dispatch blocks mutation',async()=>{
 const f=fixture();f.external='conflict';assert.equal((await advance(f.store,expected(),f.adapter)).status,'conflict');assert.equal(f.writes,0);
 let calls=0;const g=fixture(),adapter={...g.adapter,async inspect(){return ++calls===1?'before':'conflict';}};
 assert.equal((await advance(g.store,expected(),adapter)).status,'conflict');assert.equal(g.writes,0);
});
test('two concurrent workers cannot dispatch the same operation twice',async()=>{
 const f=fixture();await Promise.allSettled([advance(f.store,expected(),f.adapter),advance(f.store,expected(),f.adapter)]);assert.equal(f.writes,1);
});
test('tampered target, plan, operation or invalid checkpoint never authorizes writes',async()=>{
 const f=fixture();await advance(f.store,expected(),f.adapter);
 const changed=expected();changed.steps[0].fingerprint='d'.repeat(64);await assert.rejects(advance(f.store,changed,f.adapter));
 f.record.journal.target='original';await assert.rejects(advance(f.store,expected(),f.adapter));assert.equal(f.writes,1);
 assert.throws(()=>newSyncJournal('bad',[]));assert.throws(()=>newSyncJournal('a'.repeat(64),[{id:'x',fingerprint:'b'.repeat(64)},{id:'x',fingerprint:'b'.repeat(64)}]));
});
test('a completed operation journal does not replace whole-run independent verification',async()=>{
 const f=fixture(),plan=expected();await advance(f.store,plan,f.adapter);
 await assert.rejects(verifySyncRun(f.store,plan,f.adapter.inspect));
 f.external='before';await advance(f.store,plan,f.adapter);
 assert.equal((await verifySyncRun(f.store,plan,f.adapter.inspect)).verified,true);
 f.external='conflict';await assert.rejects(verifySyncRun(f.store,plan,f.adapter.inspect));
});
test('atomic batch claims a single attempt, verifies every step and recovers lost acknowledgements without replay',async()=>{
 const f=fixture(),plan=expected();await f.store.save(null,'request',plan);
 let present=false,calls=0;
 const adapter={async inspectAll(){return plan.steps.map(()=>present?'after':'before');},async apply(){calls++;present=true;throw new Error('accepted but timeout');}};
 const result=await advanceSyncBatch(f.store,plan,adapter);assert.equal(result.status,'verified');assert.equal(calls,1);assert.equal(new Set(result.record.journal.steps.map(s=>s.attempt)).size,1);
 assert.equal((await advanceSyncBatch(f.store,plan,adapter)).status,'verified');assert.equal(calls,1);
});
test('unobserved atomic batch stays uncertain and concurrent workers cannot double-dispatch',async()=>{
 const f=fixture(),plan=expected();await f.store.save(null,'request',plan);let calls=0;
 const adapter={async inspectAll(){return ['before','before'];},async apply(){calls++;}};
 assert.equal((await advanceSyncBatch(f.store,plan,adapter)).status,'uncertain');assert.equal((await advanceSyncBatch(f.store,plan,adapter)).status,'uncertain');assert.equal(calls,1);
 const g=fixture();await g.store.save(null,'request',plan);let writes=0,present=false;
 const concurrent={async inspectAll(){return plan.steps.map(()=>present?'after':'before');},async apply(){writes++;present=true;}};
 await Promise.allSettled([advanceSyncBatch(g.store,plan,concurrent),advanceSyncBatch(g.store,plan,concurrent)]);assert.equal(writes,1);
});
