import test from 'node:test';import assert from 'node:assert/strict';
import {trackerReviewBlockers as blockers} from '../../app/lib/v14/tracker-review-blockers.ts';
const row={id:'one',label:'My Rating',direction:'conflict'};
test('unselected conflicts explain the required source choice',()=>{
 assert.match(blockers([row],{})[0],/select the App or Google Sheet/);
 assert.deepEqual(blockers([row],{one:'tracker'}),[]);
});
test('identity remains a separate explicit gate despite selected fields',()=>{
 const identity={...row,plannedAction:'provider-correction',field:'identity',planApproved:false};
 assert.match(blockers([identity],{one:'app'})[0],/record identity/);
 assert.deepEqual(blockers([{...identity,planApproved:true}],{one:'app'}),[]);
});
test('blocked values and ambiguous editions are never implicitly approved',()=>{
 assert.match(blockers([{...row,blockedField:true}],{one:'app'})[0],/flagged/);
 assert.match(blockers([{...row,identitySelection:{ready:false}}],{})[0],/same item or separate editions/);
 assert.deepEqual(blockers([{...row,identitySelection:{ready:true}}],{}),[]);
});
test('ordinary additions and resolved fields do not invent extra gates',()=>{
 assert.deepEqual(blockers([{...row,plannedAction:'add-record'},{...row,plannedAction:'import-record'},{...row,direction:'export'}],{}),[]);
});
