import test from 'node:test';
import assert from 'node:assert/strict';
import {applyReviewedSync} from '../../app/lib/v14/tracker-review-flow.ts';
const plan={fingerprint:'a'.repeat(64),imports:1,exports:1,staged:false,resume:false,writeEnabled:true};
test('one Apply stages and applies only the same freshly checked plan',async()=>{
 const calls=[];
 assert.equal(await applyReviewedSync(async()=>plan,async(action,p)=>{calls.push([action,p]);return true;}),'verified');
 assert.deepEqual(calls.map(c=>c[0]),['stage','apply']);
 assert.equal(calls[1][1].fingerprint,plan.fingerprint);assert.equal(calls[1][1].staged,true);
});
test('saved run resumes without another stage',async()=>{
 const calls=[];assert.equal(await applyReviewedSync(async()=>({...plan,staged:true,resume:true}),async a=>{calls.push(a);return true;}),'verified');assert.deepEqual(calls,['apply']);
});
test('missing or disabled readiness never stages or applies',async()=>{
 for(const p of [undefined,{...plan,writeEnabled:false}]){
 let calls=0;await applyReviewedSync(async()=>p,async()=>{calls++;return true;});assert.equal(calls,0);
 }
});
test('uncertain stage or apply is not automatically retried',async()=>{
 for(const fail of ['stage','apply']){
 const calls=[];assert.equal(await applyReviewedSync(async()=>plan,async a=>{calls.push(a);return a!==fail;}),'unconfirmed');
 assert.deepEqual(calls,fail==='stage'?['stage']:['stage','apply']);
 }
});
