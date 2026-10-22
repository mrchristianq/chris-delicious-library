import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-decisions','./tracker-read'].includes(s)?s+'.ts':s,c);}});
const {buildTrackerExecutionPlan:build,assertTrackerPlanCurrent:current}=await import('../../app/lib/v14/tracker-execution-plan.ts');h.deregister();
const row={id:'r',itemId:'item',title:'Fixture',media:'game',field:'Status',label:'Status',app:'Abandoned',tracker:'Completed',direction:'review',resolutionAllowed:true,savedChoice:'app'};
const preview={status:'initial-review',changes:[row],message:'fixture',observedAt:'now',lastConfirmedSync:null,reviewComplete:true,identityIssues:0,reviewBatchRevision:1,reviewToken:'a'.repeat(64)};
test('execution intent uses approved side, pinned target and no physical row address',()=>{
 const plan=build(preview);assert.equal(plan.operations[0].kind,'export-field');assert.equal(plan.operations[0].value,'Abandoned');
 assert.equal(plan.target,'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0');assert.equal(plan.operations[0].row,undefined);
 assert.equal(build({...preview,changes:[{...row,savedChoice:'tracker'}]}).operations[0].kind,'import-field');
 assert.equal(preview.lastConfirmedSync,null);assert.equal(current(plan.fingerprint,preview).fingerprint,plan.fingerprint);
});
test('stale values, approval revisions and choices invalidate an execution plan',()=>{
 const plan=build(preview);
 for(const p of [{...preview,reviewBatchRevision:2},{...preview,changes:[{...row,app:'Completed'}]},{...preview,changes:[{...row,savedChoice:'tracker'}]}])assert.throws(()=>current(plan.fingerprint,p));
});
test('incomplete approvals, identities, unsafe values and app-only fields fail closed',()=>{
 for(const p of [{...preview,reviewComplete:false},{...preview,identityIssues:1},{...preview,reviewBatchRevision:null},{...preview,reviewToken:'bad'},{...preview,changes:[row,row]},...['Notes','Episode Progress','watched_at'].map(field=>({...preview,changes:[{...row,field}]})),{...preview,changes:[{...row,savedChoice:undefined}]},{...preview,changes:[{...row,app:'#REF!'}]}])assert.throws(()=>build(p));
});
test('structural actions and repairs stay explicit, approved, non-writing intents',()=>{
 for(const plannedAction of ['provider-correction','duplicate-cleanup','add-record']){
  assert.equal(build({...preview,changes:[{...row,plannedAction,planApproved:true}]}).operations[0].kind,plannedAction);
  assert.throws(()=>build({...preview,changes:[{...row,plannedAction,planApproved:false}]}));
 }
 const repair={...row,media:'movie',field:'Released',app:'Released',tracker:'#REF!',blockedField:true,repairApproved:true};
 assert.equal(build({...preview,changes:[repair]}).operations[0].kind,'repair-field');
 assert.throws(()=>build({...preview,changes:[{...repair,field:'Rating'}]}));
});
