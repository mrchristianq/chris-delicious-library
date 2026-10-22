import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-read','./tracker-google-request','./tracker-google-batch','./tracker-write-plan','./tracker-reconcile','./tracker-projection','./edit-contract','./legacy-row'].includes(s)?s+'.ts':s,c);}});
const {compileTrackerWriteSteps:compile}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {dispatchTrackerGoogleStep:dispatch}=await import('../../app/lib/v14/tracker-google-dispatch.ts');h.deregister();
const library='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',target='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
const item={id,library_id:library,media_type:'game',title:'Fixture',revision:1,user_status:'Abandoned',personal_rating:null,completed_on:null,notes:'private',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:'7599'}};
const table={name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows:[['Fixture','Steam','7599','Completed']]};
const op={id:'o',itemId:id,media:'game',field:'Status',kind:'export-field',comparisonToken:'a'.repeat(64),value:'Abandoned'};
const step=compile([op],[item],[table],[])[0],grid={spreadsheetId:target,title:'Games',sheetId:1374715809,rowCount:10,columnCount:4};
test('dispatch uses the pinned endpoint and never retries uncertain responses',async()=>{
 let calls=0;await dispatch(step,item,table,grid,async(url,body)=>{calls++;assert.equal(url,'https://sheets.googleapis.com/v4/spreadsheets/'+target+':batchUpdate');assert.equal(body.requests.length,1);assert.equal(JSON.stringify(body).includes('private'),false);return {ok:true,body:{spreadsheetId:target,replies:[{}]}};});assert.equal(calls,1);
 for(const response of [{ok:false,body:null},{ok:true,body:null},{ok:true,body:{spreadsheetId:'original',replies:[{}]}},{ok:true,body:{spreadsheetId:target,replies:[]}}]){
  calls=0;await assert.rejects(dispatch(step,item,table,grid,async()=>{calls++;return response;}));assert.equal(calls,1);
 }
 calls=0;await assert.rejects(dispatch(step,item,table,grid,async()=>{calls++;throw new Error('timeout');}));assert.equal(calls,1);
});
test('a prior accepted operation or stale source prevents a repeated write',async()=>{
 const send=async()=>assert.fail('must not dispatch');
 assert.equal((await dispatch(step,item,{...table,rows:[['Fixture','Steam','7599','Abandoned']]},grid,send)).alreadyPresent,true);
 await assert.rejects(dispatch(step,{...item,revision:2},table,grid,send));
});
