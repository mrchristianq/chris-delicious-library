import test from 'node:test';import assert from 'node:assert/strict';
import {boundedFreshFetch} from '../../app/lib/v14/bounded-fetch.ts';
test('manual requests preserve caller cancellation, bypass cache and get independent deadlines',async()=>{
 const caller=new AbortController(),signals=[];const send=async(_url,init)=>{signals.push(init.signal);assert.equal(init.cache,'no-store');assert.equal(init.method,'POST');return new Response('{}');};
 await boundedFreshFetch('https://example.test',{method:'POST',cache:'force-cache',signal:caller.signal},send);await boundedFreshFetch('https://example.test',{method:'POST'},send);
 assert.notEqual(signals[0],caller.signal);assert.notEqual(signals[0],signals[1]);caller.abort();assert.equal(signals[0].aborted,true);assert.equal(signals[1].aborted,false);
});
test('a timed-out write is not silently retried or treated as successful',async()=>{
 let calls=0;await assert.rejects(boundedFreshFetch('https://example.test',{method:'POST'},async()=>{calls++;throw new Error('unknown acknowledgement');}));assert.equal(calls,1);
});
