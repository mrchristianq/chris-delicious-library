import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-read','./tracker-write-plan','./tracker-reconcile','./tracker-projection','./edit-contract','./legacy-row'].includes(s)?s+'.ts':s,c);}});
const {compileTrackerWriteSteps:compile}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {buildTrackerGoogleRequest:build}=await import('../../app/lib/v14/tracker-google-request.ts');h.deregister();
const lib='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',target='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
const item={id,library_id:lib,media_type:'game',title:'Fixture',revision:1,user_status:'Abandoned',personal_rating:8,completed_on:null,notes:'private',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:'7599'}};
const table={name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows:[['Fixture','Steam','7599','Completed']]};
const op={id:'o',itemId:id,media:'game',field:'Status',kind:'export-field',comparisonToken:'a'.repeat(64),value:'Abandoned'};
const grid={spreadsheetId:target,title:'Games',sheetId:1374715809,rowCount:10,columnCount:4};
test('field request is pinned, bounded and updates only userEnteredValue on the selected cell',()=>{
 const step=compile([op],[item],[table],[])[0],body=build(step,item,table,grid);
 assert.equal(body.spreadsheetId,target);assert.equal(body.requests.length,1);
 assert.deepEqual(body.requests[0],{updateCells:{range:{sheetId:grid.sheetId,startRowIndex:1,endRowIndex:2,startColumnIndex:3,endColumnIndex:4},rows:[{values:[{userEnteredValue:{stringValue:'Abandoned'}}]}],fields:'userEnteredValue'}});
 assert.equal(JSON.stringify(body).includes('private'),false);
 const after={...table,rows:[['Fixture','Steam','7599','Abandoned']]};assert.equal(build(step,item,after,grid).requests.length,0);
});
test('wrong original Sheet, tab ID, dimensions, remapped positions and stale values cannot produce requests',()=>{
 const step=compile([op],[item],[table],[])[0];
 for(const g of [{...grid,spreadsheetId:'original'},{...grid,sheetId:1},{...grid,title:'Movies'},{...grid,rowCount:1},{...grid,columnCount:3}])assert.throws(()=>build(step,item,table,g));
 assert.throws(()=>build(step,item,{...table,rowNumbers:[2]},grid));
 assert.throws(()=>build(step,{...item,revision:2},table,grid));
});
test('duplicate cleanup writes app values then deletes surplus rows in descending order atomically',()=>{
 const t={...table,rows:[table.rows[0],table.rows[0],table.rows[0]]};
 const hints=[1,2,3].map(n=>({itemId:id,sourceId:String(n),primary:n===1,media:'game',title:'Fixture',edition:'Steam',provider:'7599'}));
 const step=compile([{...op,kind:'duplicate-cleanup',field:'duplicate-cleanup'}],[item],[t],hints)[0];
 const body=build(step,item,t,grid);assert.equal(body.requests.length,6);
 assert.deepEqual(body.requests.slice(-2).map(r=>r.deleteDimension.range.startIndex),[3,2]);
});
test('addition uses deterministic end-of-grid update in the same atomic request and literal strings',()=>{
 const i={...item,title:'=IMPORTDATA("bad")'},t={...table,rows:[]};
 const step=compile([{...op,kind:'add-record',field:'add-record'}],[i],[t],[])[0];
 const body=build(step,i,t,grid);assert.deepEqual(body.requests[0],{appendDimension:{sheetId:grid.sheetId,dimension:'ROWS',length:1}});
 assert.equal(body.requests[1].updateCells.range.startRowIndex,10);
 assert.deepEqual(body.requests[1].updateCells.rows[0].values[0].userEnteredValue,{stringValue:i.title});
 assert.equal(JSON.stringify(body).includes('formulaValue'),false);
});
test('dates are actual Sheet date serials and blank values explicitly clear only that cell',()=>{
 const i={...item,completed_on:'2026-10-10'},t={...table,headers:[...table.headers,'Completed Date'],rows:[[...table.rows[0],'']]};
 const operation={...op,field:'Completed Date',value:'2026-10-10'};
 const step=compile([operation],[i],[t],[])[0];
 const value=build(step,i,t,{...grid,columnCount:5}).requests[0].updateCells.rows[0].values[0].userEnteredValue;
 assert.deepEqual(value,{numberValue:(Date.UTC(2026,9,10)-Date.UTC(1899,11,30))/86400000});
 const clearItem={...item,user_status:null},clearOp={...op,value:''};
 const clear=compile([clearOp],[clearItem],[table],[])[0];assert.deepEqual(build(clear,clearItem,table,grid).requests[0].updateCells.rows[0].values[0].userEnteredValue,{});
});

test('tracker boolean fields use Yes/No dropdown values, with equivalent canonical readback',()=>{
 for(const header of ['Backlog','Completed'])for(const value of [true,false]){
  const i={...item,user_status:value?'Completed':'Abandoned',user_fields:{...item.user_fields,[header]:value?'Yes':'No'}},t={...table,headers:[...table.headers,header],rows:[[...table.rows[0],value?'No':'Yes']]};
  const step=compile([{...op,field:header,value}],[i],[t],[])[0];
  const request=build(step,i,t,{...grid,columnCount:5}).requests[0];
  assert.deepEqual(request.updateCells.rows[0].values[0].userEnteredValue,{stringValue:value?'Yes':'No'});
 }
});
