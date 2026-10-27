import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const library='11111111-1111-4111-8111-111111111111';const state={calls:0,error:null};globalThis.__incrementalRoute=state;
const h=registerHooks({resolve(s,c,n){if(c.parentURL?.endsWith('/library/read/route.ts')&&s.endsWith('/config'))return {url:'file:///incremental-config.mjs',shortCircuit:true};if(c.parentURL?.endsWith('/library/read/route.ts')&&s.endsWith('/incremental-read-server'))return {url:'file:///incremental-read.mjs',shortCircuit:true};return n(s.startsWith('.')&&!s.endsWith('.ts')?s+'.ts':s,c);},load(u,c,n){if(u==='file:///incremental-config.mjs')return {format:'module',shortCircuit:true,source:`export function getV14Config(){return {origin:'http://localhost:3014'}}`};if(u==='file:///incremental-read.mjs')return {format:'module',shortCircuit:true,source:`export async function readIncrementalLibrary(){const s=globalThis.__incrementalRoute;s.calls++;if(s.error)throw s.error;return {unchanged:true};}`};return n(u,c);}});
const {POST}=await import('../../app/v14/api/library/read/route.ts');h.deregister();
const input=()=>({libraryId:library,changeToken:'a'.repeat(32),records:{items:[],episodes:[],settings:[]}});
const request=(value,headers={})=>new Request('http://localhost:3014/v14/api/library/read',{method:'POST',headers:{origin:'http://localhost:3014','content-type':'application/json',...headers},body:typeof value==='string'?value:JSON.stringify(value)});
test('read comparison is uncached and accepts only fingerprints, not client-owned records or user IDs',async()=>{
 state.calls=0;const response=await POST(request(input()));assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store, max-age=0');assert.equal(state.calls,1);
 for(const extra of [{ownerId:library},{snapshot:{}},{records:{items:[],episodes:[],settings:[['__cdl_tracker_hidden','a'.repeat(32)]]}}])assert.equal((await POST(request({...input(),...extra}))).status,400);
 assert.equal(state.calls,1);
});
test('wrong origins, invalid JSON, oversized bodies and authentication failures fail closed',async()=>{
 assert.equal((await POST(request(input(),{origin:'https://foreign.test'}))).status,403);
 assert.equal((await POST(request(input(),{'content-type':'text/plain'}))).status,415);
 assert.equal((await POST(request('{broken'))).status,400);
 assert.equal((await POST(request('x'.repeat(2*1024*1024+1)))).status,413);
 state.error=Error('Authentication required');assert.equal((await POST(request(input()))).status,401);state.error=null;
});
