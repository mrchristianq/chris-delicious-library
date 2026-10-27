import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {createSnapshotStore}=await import('../../app/lib/v14/snapshot-store.ts');h.deregister();
const owner='11111111-1111-4111-8111-111111111111',lib='22222222-2222-4222-8222-222222222222';
const fixture=()=>({schema_version:1,complete:true,library_id:lib,owner_id:owner,observed_at:'2026-10-27T12:00:00Z',change_token:'a'.repeat(32),items:[],episodes:[],settings:[],counts:{items:0,episodes:0,settings:0},record_index:{items:[],episodes:[],settings:[]}});
function fakeDB(){const records=new Map();let fail=false;return {records,set fail(v){fail=v;},open(){const req={};queueMicrotask(()=>{if(fail){req.error=Error('quota');req.onerror();return;}req.result={close(){},transaction(){const tx={objectStore(){const request={};queueMicrotask(()=>tx.oncomplete());return {get:key=>{request.result=structuredClone(records.get(key));return request;},put:(value,key)=>{records.set(key,structuredClone(value));return request;},delete:key=>{records.delete(key);return request;}};}};return tx;}};req.onsuccess();});return req;}};}
test('device storage scopes accounts, verifies integrity, and never treats a missing copy as data',async()=>{
 const db=fakeDB();globalThis.indexedDB=db;
 const store=createSnapshotStore(owner,lib);assert.equal(await store.read(),null);
 await store.write(fixture());assert.deepEqual(await store.read(),fixture());
 assert.equal(await createSnapshotStore(lib,lib).read(),null);
 const value=db.records.get(`${owner}:${lib}`);value.payload=value.payload.replace('"items":0','"items":1');
 assert.equal(await store.read(),null);assert.equal(db.records.size,0);
});
test('private-mode/quota failures do not break a fresh library load or save',async()=>{
 const db=fakeDB();db.fail=true;globalThis.indexedDB=db;
 const store=createSnapshotStore(owner,lib);assert.equal(await store.read(),null);await store.write(fixture());await store.clear();
});
test('wrong owners and partial snapshots are never persisted',async()=>{
 const db=fakeDB();globalThis.indexedDB=db;const store=createSnapshotStore(owner,lib);
 await store.write({...fixture(),owner_id:lib});await store.write({...fixture(),complete:false});assert.equal(db.records.size,0);
});
