import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-read','./tracker-google-request','./tracker-write-plan','./tracker-reconcile','./tracker-projection','./edit-contract','./legacy-row'].includes(s)?s+'.ts':s,c);}});
const {compileTrackerWriteSteps:compile}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {buildTrackerGoogleBatch:batch}=await import('../../app/lib/v14/tracker-google-batch.ts');h.deregister();
const lib='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',id2='33333333-3333-4333-8333-333333333333',target='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
const item=(id,title,provider)=>({id,library_id:lib,media_type:'game',title,revision:1,user_status:'Abandoned',personal_rating:null,completed_on:null,notes:'private',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:provider}});
const grid={spreadsheetId:target,title:'Games',sheetId:1374715809,rowCount:10,columnCount:4};
const op=(itemId,kind)=>({id:itemId,itemId,media:'game',field:kind,kind,comparisonToken:'a'.repeat(64)});
test('all cell edits happen before globally descending duplicate removals',()=>{
 const items=[item(id,'First','1'),item(id2,'Second','2')],t={name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows:[['First','Steam','1','Completed'],['Second','Steam','2','Started'],['Second','Steam','2','Completed'],['First','Steam','1','Started']]};
 const hints=items.flatMap(i=>[true,false].map((primary,n)=>({itemId:i.id,sourceId:i.id+n,primary,media:'game',title:i.title,edition:'Steam',provider:i.metadata.IGDB_ID})));
 const steps=compile(items.map(i=>op(i.id,'duplicate-cleanup')),items,[t],hints);
 const b=batch(steps,items,[t],[grid]);const deletes=b.requests.filter(r=>r.deleteDimension);
 assert.deepEqual(deletes.map(d=>d.deleteDimension.range.startIndex),[4,3]);
 assert.ok(b.requests.slice(0,-2).every(r=>r.updateCells));assert.equal(JSON.stringify(b).includes('private'),false);
});
test('multiple additions share one append and receive distinct deterministic new rows',()=>{
 const items=[item(id,'First','1'),item(id2,'Second','2')],t={name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows:[]};
 const steps=compile(items.map(i=>op(i.id,'add-record')),items,[t],[]),b=batch(steps,items,[t],[grid]);
 assert.deepEqual(b.requests[0],{appendDimension:{sheetId:grid.sheetId,dimension:'ROWS',length:2}});
 assert.deepEqual([...new Set(b.requests.slice(1).map(r=>r.updateCells.range.startRowIndex))],[10,11]);
 assert.throws(()=>batch([steps[0],steps[0]],items,[t],[grid]));
});
