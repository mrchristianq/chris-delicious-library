import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(s==='./tracker-read'?s+'.ts':s,c);}});
const {attachTrackerDecisions,decisionKey,decisionToken,decisionValue,initialReviewValue,initialReviewToken,INITIAL_REVIEW_KEY}=await import('../../app/lib/v14/tracker-decisions.ts');h.deregister();
const row={id:'["item","Status"]',itemId:'item',title:'Fixture',media:'game',field:'Status',label:'Status',app:'Abandoned',tracker:'Completed',direction:'review',resolutionAllowed:true};
const preview={status:'initial-review',changes:[row],message:'test',observedAt:'now',lastConfirmedSync:null};
test('confirmed review choice restores from a revisioned setting without advancing sync baseline',()=>{
 const setting={key:decisionKey(row),revision:3,value:{value:decisionValue(row,'app')}};
 const result=attachTrackerDecisions(preview,[setting]);assert.equal(result.changes[0].savedChoice,'app');assert.equal(result.changes[0].decisionRevision,3);
 assert.equal(result.lastConfirmedSync,null);assert.equal(result.changes[0].direction,'review');
 assert.equal(JSON.stringify(setting).includes('Abandoned'),false);
});
test('one bounded approval restores field choices, plans and a valid repair without syncing',()=>{
 const plan={...row,id:'plan',resolutionAllowed:false,plannedAction:'duplicate-cleanup'};
 const repair={...row,id:'repair',media:'movie',field:'Released',app:'Released',tracker:'#REF! (Reference does not exist.)',resolutionAllowed:false,blockedField:true};
 const p={...preview,identityIssues:0,changes:[row,plan,repair]};
 const saved={key:INITIAL_REVIEW_KEY,revision:1,value:{value:initialReviewValue(p,[])}};
 const result=attachTrackerDecisions(p,[saved]);
 assert.equal(result.reviewComplete,true);assert.equal(result.changes[0].savedChoice,'app');
 assert.equal(result.changes[1].planApproved,true);assert.equal(result.changes[2].repairApproved,true);
 assert.equal(result.changes[2].resolutionAllowed,false);assert.equal(result.lastConfirmedSync,null);
 assert.equal(JSON.stringify(saved).includes('Abandoned'),false);
 assert.equal(attachTrackerDecisions(p,[{...saved,value:{value:initialReviewValue(p,[],true)}}]).reviewComplete,false);
});
test('changed values and later field clears invalidate bulk choices; old clears do not override new approval',()=>{
 const old={key:decisionKey(row),revision:2,value:{value:decisionValue(row,'clear')}};
 const saved={key:INITIAL_REVIEW_KEY,revision:1,value:{value:initialReviewValue(preview,[old])}};
 assert.equal(attachTrackerDecisions(preview,[old,saved]).reviewComplete,true);
 assert.equal(attachTrackerDecisions(preview,[{...old,revision:3},saved]).reviewComplete,false);
 const changed={...preview,changes:[{...row,app:'Completed'}]};
 assert.notEqual(initialReviewToken(preview,[old]),initialReviewToken(changed,[old]));
 assert.equal(attachTrackerDecisions(changed,[old,saved]).reviewComplete,false);
});
test('identity issues, unsupported repairs and oversized or duplicate reviews cannot be approved',()=>{
 assert.throws(()=>initialReviewValue({...preview,identityIssues:1},[]));
 assert.throws(()=>initialReviewValue({...preview,changes:[{...row,resolutionAllowed:false,blockedField:true}]},[]));
 assert.throws(()=>initialReviewValue({...preview,changes:[row,row]},[]));
 assert.throws(()=>initialReviewValue({...preview,changes:Array(501).fill(row)},[]));
});
test('changed app or tracker values and identity details invalidate saved choices',()=>{
 const setting={key:decisionKey(row),revision:3,value:{value:decisionValue(row,'app')}};
 for(const field of ['app','tracker','title','media','field','id']){
  const changed={...row,[field]:'changed'};assert.notEqual(decisionToken(changed),decisionToken(row));
  assert.equal(attachTrackerDecisions({...preview,changes:[changed]},[setting]).changes[0].savedChoice,undefined);
 }
});
test('clear markers and malformed values never restore a choice; ambiguous identities cannot save',()=>{
 for(const value of [null,'bad',decisionValue(row,'clear')])assert.equal(attachTrackerDecisions(preview,[{key:decisionKey(row),revision:4,value:{value}}]).changes[0].savedChoice,undefined);
 assert.throws(()=>decisionValue({...row,resolutionAllowed:false},'app'));
 assert.equal(attachTrackerDecisions({...preview,changes:[{...row,resolutionAllowed:false}]},[]).changes[0].decisionToken,undefined);
});
