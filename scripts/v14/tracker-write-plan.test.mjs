import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-projection','./edit-contract','./legacy-row','./tracker-reconcile','./tracker-read'].includes(s)?s+'.ts':s,c);}});
const {compileTrackerWriteSteps:compile,inspectTrackerWriteStep:inspect}=await import('../../app/lib/v14/tracker-write-plan.ts');h.deregister();
const lib='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const item=(extra={})=>({id,library_id:lib,media_type:'game',title:'Fixture',revision:1,user_status:'Abandoned',personal_rating:8,completed_on:null,notes:'never-export-me',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:'7599'},...extra});
const table=(rows=[['Fixture','Steam','7599','Completed']])=>({name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows});
const op=(extra={})=>({id:'op',itemId:id,media:'game',field:'Status',kind:'export-field',comparisonToken:'a'.repeat(64),value:'Abandoned',...extra});
const hint=(extra={})=>({itemId:id,sourceId:lib,primary:true,media:'game',title:'Fixture',edition:'Steam',provider:'62151',...extra});
test('field steps re-resolve moved rows, validate source revision and only touch selected fields',()=>{
 const t=table(),i=item(),step=compile([op()],[i],[t],[])[0];assert.deepEqual(step.after,{Status:'Abandoned'});
 assert.equal(JSON.stringify(step).includes('never-export-me'),false);
 assert.deepEqual(inspect(step,i,table([['Other','Steam','9','Backlog'],...t.rows])),{state:'before',rows:[3]});
 assert.equal(inspect(step,i,table([['Fixture','Steam','7599','Abandoned']])).state,'after');
 assert.equal(inspect(step,item({revision:2}),t).state,'conflict');
 assert.equal(inspect(step,i,table([['Fixture','Steam','7599','Started']])).state,'conflict');
 assert.throws(()=>inspect({...step,after:{Status:'Started'}},i,t));
});
test('provider correction and field changes combine without overwriting other tracker cells',()=>{
 const i=item(),t=table([['Fixture','Steam','62151','Completed']]);
 const step=compile([op(),op({id:'correction',kind:'provider-correction',field:'provider-correction'})],[i],[t],[hint()])[0];
 assert.deepEqual(step.after,{Status:'Abandoned',Title:'Fixture',IGDB_ID:'7599',Platform:'Steam'});
 assert.equal(inspect(step,i,t).state,'before');assert.equal(inspect(step,i,table([['Fixture','Steam','7599','Abandoned']])).state,'after');
});
test('consolidation requires recorded multiplicity and unchanged duplicate contents',()=>{
 const i=item(),t=table([['Fixture','Steam','62151','Completed'],['Fixture','Steam','62151','Started']]);
 const hints=[hint(),hint({sourceId:id,primary:false})],operation=op({kind:'duplicate-cleanup',field:'duplicate-cleanup'});
 const step=compile([operation],[i],[t],hints)[0];assert.equal(inspect(step,i,t).state,'before');
 const changed=structuredClone(t);changed.rows[1][3]='Wishlist';assert.equal(inspect(step,i,changed).state,'conflict');
 assert.equal(inspect(step,i,table([['Fixture','Steam','7599','Abandoned']])).state,'after');
 assert.throws(()=>compile([operation],[i],[t],[hint()]));
});
test('addition has no assumed row address and cannot duplicate an existing title or provider',()=>{
 const i=item(),operation=op({kind:'add-record',field:'add-record'}),t=table([]);
 const step=compile([operation],[i],[t],[])[0];assert.equal(inspect(step,i,t).state,'before');
 assert.equal(inspect(step,i,table([['Fixture','Steam','7599','Abandoned']])).state,'after');
 assert.throws(()=>compile([operation],[i],[table([['Wrong name','Steam','7599','Started']])],[]));
 assert.throws(()=>compile([operation],[i],[table()],[]));
});
test('excluded columns, unmapped values, imports, shared identity and stale approval fail closed',()=>{
 const i=item(),t=table();
 for(const bad of [op({field:'Notes'}),op({kind:'import-field'}),op({value:'Started'})])assert.throws(()=>compile([bad],[i],[t],[]));
 assert.throws(()=>compile([op()],[i],[{...t,headers:[...t.headers,'Notes']}],[]));
 assert.throws(()=>compile([op()],[i],[{...t,headers:[...t.headers,'Unknown']}],[]));
 assert.throws(()=>compile([op()],[i],[t],[hint({itemId:lib,provider:'7599'})]));
 assert.throws(()=>compile([op(),op()],[i],[t],[]));
});
