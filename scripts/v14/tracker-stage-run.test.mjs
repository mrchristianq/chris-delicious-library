import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./read-library','./save-setting','./tracker-journal-store','./tracker-run-manifest','./tracker-checkpoint','./tracker-read','./library-snapshot','./tracker-projection','./edit-contract','./legacy-row'].includes(s)?s+'.ts':s,c);}});
const {stageTrackerRun:stage}=await import('../../app/lib/v14/tracker-stage-run.ts');
const {createTrackerRunManifest:create}=await import('../../app/lib/v14/tracker-run-manifest.ts');h.deregister();
const owner='11111111-1111-4111-8111-111111111111',library='22222222-2222-4222-8222-222222222222',request='33333333-3333-4333-8333-333333333333';
function fixture(){const settings=new Map();let authenticated=true,writes=0,timeout=false;return {
 writer:{async authenticatedOwner(){return authenticated?owner:null;},async write(id,key,revision,_request,value){assert.equal(id,library);assert.equal(settings.get(key)?.revision??null,revision);writes++;const setting={library_id:library,key,revision:(revision??0)+1,value:{value}};settings.set(key,setting);if(timeout){timeout=false;throw new Error('timeout after commit');}return structuredClone(setting);},async snapshot(){return {schema_version:1,complete:true,library_id:library,owner_id:owner,observed_at:new Date().toISOString(),change_token:'fresh',items:[],episodes:[],settings:structuredClone([...settings.values()]),counts:{items:0,episodes:0,settings:settings.size}};}},
 get writes(){return writes;},get settings(){return settings;},set authenticated(v){authenticated=v;},set timeout(v){timeout=v;}
};}
test('preparation saves immutable manifest plus pending journal, reuses them after reload, and never applies a Sheet write',async()=>{
 const f=fixture(),m=create(library,'a'.repeat(64),[],[]);
 const saved=await stage(f.writer,m,request);assert.equal(saved.prepared,true);assert.equal(saved.writeEnabled,false);assert.equal(saved.confirmed,0);assert.equal(f.writes,2);
 assert.deepEqual(await stage(f.writer,m,request),saved);assert.equal(f.writes,2);assert.equal(f.settings.size,2);
 assert.ok([...f.settings.keys()].every(k=>/^__cdl_tracker_(manifest|run)_v1:/.test(k)));
});
test('acknowledgement loss is recovered from independent readback without duplicating the run package',async()=>{
 const f=fixture();f.timeout=true;const m=create(library,'a'.repeat(64),[],[]);
 assert.equal((await stage(f.writer,m,request)).prepared,true);assert.equal(f.writes,2);
});
test('anonymous preparation, altered immutable data and invalid request IDs fail closed',async()=>{
 const f=fixture(),m=create(library,'a'.repeat(64),[],[]);f.authenticated=false;await assert.rejects(stage(f.writer,m,request));assert.equal(f.writes,0);f.authenticated=true;
 await assert.rejects(stage(f.writer,m,'bad'));await stage(f.writer,m,request);
 f.settings.get('__cdl_tracker_manifest_v1:'+m.fingerprint).value.value='altered';await assert.rejects(stage(f.writer,m,request));assert.equal(f.writes,2);
});
