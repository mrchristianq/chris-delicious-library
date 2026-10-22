import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

const owner='11111111-1111-4111-8111-111111111111';
const library='22222222-2222-4222-8222-222222222222';
const fixture=()=>({schema_version:1,complete:true,library_id:library,owner_id:owner,observed_at:new Date().toISOString(),change_token:'test',counts:{items:0,episodes:0,settings:0},items:[],episodes:[],settings:[]});
const state={auth:0,reads:0,creates:0,owner,result:fixture(),error:null};
const client={auth:{getUser:async()=>{state.auth++;return {data:{user:state.owner?{id:state.owner}:null},error:state.error};}},rpc:async()=>{state.reads++;if(state.result instanceof Error)throw state.result;return state.result;}};
globalThis.__v14ServerIdentity={state,client};
const hooks=registerHooks({
  resolve(specifier,context,next){
    if(context.parentURL?.endsWith('/read-library-server.ts') && specifier==='./server')return {url:'file:///v14-identity-server.mjs',shortCircuit:true};
    if(context.parentURL?.endsWith('/read-library-server.ts') && specifier==='./bounded-snapshot')return {url:'file:///v14-identity-snapshot.mjs',shortCircuit:true};
    if(context.parentURL?.includes('/app/lib/v14/') && ['./read-library','./library-snapshot','./legacy-row'].includes(specifier))return next(specifier+'.ts',context);
    return next(specifier,context);
  },
  load(url,context,next){
    if(url==='file:///v14-identity-server.mjs')return {format:'module',source:'export async function createV14Client(){globalThis.__v14ServerIdentity.state.creates++;return globalThis.__v14ServerIdentity.client;}',shortCircuit:true};
    if(url==='file:///v14-identity-snapshot.mjs')return {format:'module',source:'export async function readBoundedSnapshot(rpc,id){return rpc("snapshot",{id});}',shortCircuit:true};
    return next(url,context);
  },
});
const {readV14Library,readV14LibraryForVerifiedOwner}=await import('../../app/lib/v14/read-library-server.ts');
hooks.deregister();
const reset=()=>Object.assign(state,{auth:0,reads:0,creates:0,owner,result:fixture(),error:null});
test('initial render reuses only its verified identity, but always reads a fresh snapshot',async()=>{
  reset();
  await readV14LibraryForVerifiedOwner(client,owner,library);
  await readV14LibraryForVerifiedOwner(client,owner,library);
  assert.deepEqual([state.auth,state.creates,state.reads],[0,0,2]);
});
test('API reads still authenticate on every invocation',async()=>{
  reset();await readV14Library(library);await readV14Library(library);
  assert.deepEqual([state.auth,state.creates,state.reads],[2,2,2]);
});
test('malformed library identity fails before remote authentication or data reads',async()=>{
  reset();await assert.rejects(readV14Library('bad'),/Invalid library identity/);
  assert.deepEqual([state.auth,state.reads],[0,0]);
});
test('missing or failed authentication prevents snapshot access',async()=>{
  reset();state.error={message:'denied'};
  await assert.rejects(readV14Library(library),/Authentication/);
  await assert.rejects(readV14LibraryForVerifiedOwner(client,null,library),/Authentication/);
  assert.equal(state.reads,0);
});
test('owner mismatch, transport failure and incomplete data never reuse a previous success',async()=>{
  reset();await readV14LibraryForVerifiedOwner(client,owner,library);
  await assert.rejects(readV14LibraryForVerifiedOwner(client,library,library));
  for(const result of [new Error('offline'),{...fixture(),complete:false},null]){
    state.result=result;await assert.rejects(readV14LibraryForVerifiedOwner(client,owner,library));
  }
  assert.equal(state.reads,5);
});
