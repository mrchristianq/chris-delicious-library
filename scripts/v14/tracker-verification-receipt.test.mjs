import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(s==='./tracker-read'?s+'.ts':s,c);}});
const {attachTrackerVerification:attach}=await import('../../app/lib/v14/tracker-verification-receipt.ts');h.deregister();
const run='a'.repeat(64),target='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
const preview={status:'initial-review',changes:[],identityIssues:0,matchedRecords:1,lastConfirmedSync:null,message:'fresh',observedAt:'now'};
const receipt={version:1,target,run,records:1,operations:1,confirmedAt:'2026-10-19T23:00:00Z',baselineConfirmed:false};
const journal={version:1,target,plan:run,steps:[{id:'item',state:'confirmed',fingerprint:'b'.repeat(64),attempt:'11111111-1111-4111-8111-111111111111'}]};
const settings=(r=receipt,j=journal)=>[{key:'__cdl_tracker_verified_run_v1:'+run,revision:1,value:{value:JSON.stringify(r)}},{key:'__cdl_tracker_run_v1:'+run,revision:3,value:{value:JSON.stringify(j)}}];
test('applied tracker receipt does not claim a confirmed baseline; confirmed receipt reports the initial sync',()=>{
 const applied=attach(preview,settings(),1);assert.equal(applied.trackerAppliedAt,receipt.confirmedAt);assert.equal(applied.lastConfirmedSync,null);
 const complete=attach(preview,settings({...receipt,baselineConfirmed:true,baselineFingerprint:'c'.repeat(64),baselineConfirmedAt:'2026-10-19T23:05:00Z'}),1);
 assert.equal(complete.status,'ready');assert.equal(complete.lastConfirmedSync,'2026-10-19T23:05:00Z');
});
test('stale comparison, incomplete journals, wrong target and invalid baseline evidence cannot report synced',()=>{
 assert.equal(attach({...preview,changes:[{}]},settings(),1).trackerAppliedAt,undefined);
 assert.equal(attach(preview,settings(receipt,{...journal,steps:[{...journal.steps[0],state:'dispatched'}]}),1).trackerAppliedAt,undefined);
 assert.equal(attach(preview,settings({...receipt,target:'original'}),1).trackerAppliedAt,undefined);
 assert.equal(attach(preview,settings({...receipt,baselineConfirmed:true}),1).lastConfirmedSync,null);
 assert.equal(attach(preview,settings(),2).trackerAppliedAt,undefined);
});
