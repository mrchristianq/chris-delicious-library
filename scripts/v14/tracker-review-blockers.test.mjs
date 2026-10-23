import test from 'node:test';import assert from 'node:assert/strict';
import {trackerReviewBlockers as blockers,readyTrackerItemIds} from '../../app/lib/v14/tracker-review-blockers.ts';
const row={id:'one',label:'My Rating',direction:'conflict'};
test('bulk apply includes only whole ready items and ignores skipped items',()=>{
 const rows=[{...row,itemId:'a',direction:'export'},{...row,id:'two',itemId:'b'},{...row,id:'three',itemId:'a',direction:'export'},{...row,id:'four',itemId:'c',plannedAction:'add-record'}];
 assert.deepEqual(readyTrackerItemIds(rows,{},{}),['a','c']);
 assert.deepEqual(readyTrackerItemIds(rows,{two:'app'},{a:true}),['b','c']);
 assert.deepEqual(readyTrackerItemIds([...rows,{...row,id:'five',itemId:'a',plannedAction:'provider-correction',planApproved:false}],{},{}),['c']);
});
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
