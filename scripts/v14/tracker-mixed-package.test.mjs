import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {randomUUID,createHash} from 'node:crypto';import {gzipSync,gunzipSync} from 'node:zlib';
import {fixtureItems,fixtureTables,fixtureBaseline} from './tracker-import-fixtures.mjs';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {compileTrackerMixedPlan:compile,mixedHash,mixedRunId,encodeMixedPlan}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
const {storedMixedPackage:pack,readStoredMixedPlan:read,readStoredMixedPackage:sealed,preflightMixedPackage:preflight}=await import('../../app/lib/v14/tracker-mixed-package.ts');
const {stageMixedPlan:stage}=await import('../../app/lib/v14/tracker-mixed-store.ts');hook.deregister();
function plan(large=true){const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables),base=compile(items,tables,[],baseline,{stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)},'now');if(!large)return base;const {fingerprint:_f,runId:_r,...body}=base;void _f;void _r;body.sources=Array.from({length:4000},()=>({itemId:randomUUID(),revision:1}));const fingerprint=mixedHash(body);return {...body,fingerprint,runId:mixedRunId(fingerprint)};}
function settings(p){const packed=pack(p);return [{key:`__cdl_tracker_mixed_v1:${p.fingerprint}`,revision:1,value:{value:packed.manifest}},...packed.parts.map(v=>({key:v.key,revision:1,value:{value:v.value}}))];}
test('small package remains byte-compatible; a larger package round-trips through checked parts',()=>{
 const small=plan(false);assert.equal(pack(small).manifest,encodeMixedPlan(small));assert.equal(pack(small).parts.length,0);assert.deepEqual(read(settings(small),small.libraryId,small.fingerprint),small);
 const big=plan(),parts=pack(big);assert.ok(parts.parts.length>1);assert.ok(parts.parts.every(p=>p.value.length<=90000));assert.deepEqual(read(settings(big),big.libraryId,big.fingerprint),big);
});
test('missing, altered, reordered and duplicate parts cannot decode as the approved package',()=>{
 const p=plan(),s=settings(p);for(const mutate of [s=>s.pop(),s=>s[1].value.value+='x',s=>[s[1].value.value,s[2].value.value]=[s[2].value.value,s[1].value.value],s=>s.push(s[1]),s=>s[0].value.value=s[0].value.value.replace('"version":1','"version":2')]){const copy=structuredClone(s);mutate(copy);assert.throws(()=>read(copy,p.libraryId,p.fingerprint));}
 assert.throws(()=>read(s,p.ownerId,p.fingerprint));
});
function writer(p){const values=new Map();let count=0,fail=null;return {values,get writes(){return count;},set fail(key){fail=key;},adapter:{authenticatedOwner:async()=>p.ownerId,write:async(lib,key,revision,_request,value)=>{assert.equal(lib,p.libraryId);assert.equal(revision,values.get(key)?.revision??null);if(fail===key){fail=null;throw new Error('Interrupted before write');}const saved={library_id:lib,key,revision:(revision??0)+1,value:{value}};values.set(key,saved);count++;return saved;},snapshot:async()=>({schema_version:1,complete:true,library_id:p.libraryId,owner_id:p.ownerId,observed_at:new Date().toISOString(),change_token:'fresh',items:[],episodes:[],settings:[...values.values()],counts:{items:0,episodes:0,settings:values.size}})}};}
test('interrupted staging resumes parts safely before publishing the manifest or journal',async()=>{
 const p=plan(),parts=pack(p).parts,w=writer(p);w.fail=parts[1].key;
 await assert.rejects(stage(w.adapter,p,randomUUID()));assert.ok(w.values.has(parts[0].key));assert.ok(!w.values.has(`__cdl_tracker_mixed_v1:${p.fingerprint}`));
 await stage(w.adapter,p,randomUUID());assert.deepEqual(read([...w.values.values()],p.libraryId,p.fingerprint),p);const writes=w.writes;
 await stage(w.adapter,p,randomUUID());assert.equal(w.writes,writes);
 w.values.get(parts[0].key).value.value='changed';await assert.rejects(stage(w.adapter,p,randomUUID()),/part changed/);
});
test('readback grid limits are rejected during preflight, before staging or dispatch',()=>{
 const p=plan(false),items=fixtureItems(),tables=fixtureTables(items),grids=tables.map((t,n)=>({title:t.name,sheetId:n+1,spreadsheetId:p.target,rowCount:100,columnCount:t.headers.length}));
 assert.equal(preflight(p,items,tables,grids).googleRequests,0);
 assert.throws(()=>preflight(p,items,tables,grids.map((g,n)=>n?g:{...g,rowCount:5001})),/height/);
 assert.throws(()=>preflight(p,items,tables,grids.map(g=>({...g,rowCount:5000,columnCount:52}))),/size/);
});
test('resume accepts identical content compressed differently and keeps the original SQL package seal',async()=>{
 const p=plan(false),w=writer(p);await stage(w.adapter,p,randomUUID());
 const key=`__cdl_tracker_mixed_v1:${p.fingerprint}`,original=w.values.get(key).value.value;
 const raw=gunzipSync(Buffer.from(original.slice(14),'base64'));
 const alternate='mixed-gzip-v1:'+gzipSync(raw,{level:1}).toString('base64');
 assert.notEqual(alternate,original);w.values.get(key).value.value=alternate;
 const source=sealed([...w.values.values()],p.libraryId,p.fingerprint);
 assert.deepEqual(source.plan,p);assert.equal(source.manifest,alternate);
 assert.equal(source.hash,createHash('sha256').update(alternate).digest('hex'));
 assert.notEqual(source.hash,createHash('sha256').update(pack(p).manifest).digest('hex'));
 const writes=w.writes;await stage(w.adapter,p,randomUUID());assert.equal(w.writes,writes);
 assert.equal(w.values.get(key).value.value,alternate);
 const corrupted=JSON.parse(raw);corrupted.metadataStamp='c'.repeat(32);
 w.values.get(key).value.value='mixed-gzip-v1:'+gzipSync(JSON.stringify(corrupted)).toString('base64');
 assert.throws(()=>sealed([...w.values.values()],p.libraryId,p.fingerprint),/integrity/);
 await assert.rejects(stage(w.adapter,p,randomUUID()),/integrity/);
});
