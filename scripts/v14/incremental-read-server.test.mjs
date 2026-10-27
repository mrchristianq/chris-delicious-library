import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const owner='11111111-1111-4111-8111-111111111111',lib='22222222-2222-4222-8222-222222222222',token='a'.repeat(32),stamp='2026-10-27T12:00:00Z';
const state={calls:[],owner,authError:null,guard:null};globalThis.__incrementalServer=state;
const h=registerHooks({resolve(s,c,n){if(c.parentURL?.endsWith('/incremental-read-server.ts')&&s==='./server')return {url:'file:///incremental-server.mjs',shortCircuit:true};return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);},load(u,c,n){if(u==='file:///incremental-server.mjs')return {format:'module',shortCircuit:true,source:`export async function createV14Client(){const s=globalThis.__incrementalServer;return {auth:{getUser:async()=>({data:{user:s.owner?{id:s.owner}:null},error:s.authError})},rpc:async(name,args)=>{s.calls.push(name);return {data:s.guard,error:null};}};}`};return n(u,c);}});
const {readIncrementalLibrary}=await import('../../app/lib/v14/incremental-read-server.ts');h.deregister();
const records={items:[],episodes:[],settings:[]};
function reset(){Object.assign(state,{calls:[],owner,authError:null,guard:{owner_id:owner,library_id:lib,change_token:token,observed_at:stamp}});}
test('reopening an unchanged library uses one authenticated guard and returns no inventory or metadata',async()=>{
 reset();const result=await readIncrementalLibrary(lib,records,token);assert.equal(result.unchanged,true);assert.deepEqual(state.calls,['cdl_v14_renderer_state']);assert.ok(JSON.stringify(result).length<350);
});
test('failed authentication and invalid fresh manifests cannot approve a stored library',async()=>{
 for(const failure of ['auth','owner','library','date','token']){reset();if(failure==='auth')state.authError={};else state.guard[{owner:'owner_id',library:'library_id',date:'observed_at',token:'change_token'}[failure]]='invalid';await assert.rejects(readIncrementalLibrary(lib,records,token));}
});
