import test from 'node:test';import assert from 'node:assert/strict';
import {readFreshTrackerPreview} from '../../app/lib/v14/tracker-preview-client.ts';
const preview={status:'ready',changes:[],lastConfirmedSync:'2026-10-21T13:28:00Z'};
test('transient comparison failure retries only a fresh GET, never a write',async()=>{
 const calls=[];const result=await readFreshTrackerPreview('id',new AbortController().signal,async(url,options)=>{calls.push({url,options});return calls.length===1?new Response('',{status:503}):Response.json(preview);});
 assert.deepEqual(result,preview);assert.equal(calls.length,2);for(const c of calls){assert.equal(c.options.method,'GET');assert.equal(c.options.cache,'no-store');assert.equal(c.options.body,undefined);}
});
test('persistent failure is bounded and never claims previous writes did not happen',async()=>{
 let calls=0;await assert.rejects(readFreshTrackerPreview('id',new AbortController().signal,async()=>{calls++;return new Response('',{status:503});}),/this check does not apply changes/);assert.equal(calls,2);
});
test('authorization failures, malformed data and cancellation do not retry',async()=>{
 for(const response of [new Response('',{status:401}),new Response('',{status:403}),Response.json({status:'ready',changes:null})]){let calls=0;await assert.rejects(readFreshTrackerPreview('id',new AbortController().signal,async()=>{calls++;return response;}));assert.equal(calls,1);}
 const controller=new AbortController();controller.abort();let calls=0;await assert.rejects(readFreshTrackerPreview('id',controller.signal,async()=>{calls++;return Response.json(preview);}));assert.equal(calls,0);
});
