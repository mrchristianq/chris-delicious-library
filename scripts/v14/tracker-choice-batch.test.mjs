import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {prepareReviewChoices,persistReviewChoices}=await import('../../app/lib/v14/tracker-choice-batch.ts');
hook.deregister();
const {trackerItemChoiceRows,trackerReviewBlockers,readyTrackerItemIds}=await import('../../app/lib/v14/tracker-review-blockers.ts');
const library='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',owner='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const row=(n,extra={})=>({id:`field-${n}`,itemId:'item-a',title:'Fixture',media:'game',field:'Status',label:'Status',direction:'conflict',resolutionAllowed:true,decisionToken:'a'.repeat(64),...extra});
const choice=r=>({changeId:r.id,token:r.decisionToken,side:'app',revision:null,requestId:crypto.randomUUID()});
test('Keep App selects fields and the existing app identity in one explicit action',()=>{
 const rows=[row(1),row(2,{field:'identity',plannedAction:'provider-correction',planApproved:false})];
 const selected=trackerItemChoiceRows(rows,'app');assert.equal(selected.length,2);
 const choices=Object.fromEntries(selected.map(r=>[r.id,'app']));
 const drafted=rows.map(r=>({...r,...(r.plannedAction?{planApproved:true}:{})}));
 assert.deepEqual(trackerReviewBlockers(drafted,choices),[]);assert.deepEqual(readyTrackerItemIds(drafted,choices,{}),['item-a']);
 assert.equal(trackerItemChoiceRows(rows,'tracker').length,1);
 assert.equal(trackerItemChoiceRows([row(3,{identitySelection:{ready:false}}),row(4,{blockedField:true})],'app').length,0);
});
test('all field tokens are validated before preparing any write',()=>{
 const rows=[row(1),row(2)];const commands=rows.map(choice);
 assert.equal(prepareReviewChoices(library,rows,commands).length,2);
 assert.throws(()=>prepareReviewChoices(library,rows,[commands[0],{...commands[1],token:'b'.repeat(64)}]),/changed/);
 assert.throws(()=>prepareReviewChoices(library,rows,[commands[0],commands[0]]),/changed/);
 assert.throws(()=>prepareReviewChoices(library,[row(1,{identitySelection:{ready:true}})],[commands[0]]),/changed/);
});
test('app identity and new Sheet imports never accept the wrong source',()=>{
 for(const plannedAction of ['add-record','provider-correction']){
  const r=row(1,{field:'identity',plannedAction});
  assert.match(prepareReviewChoices(library,[r],[choice(r)])[0].key,/identity_v1/);
  assert.throws(()=>prepareReviewChoices(library,[r],[{...choice(r),side:'tracker'}]),/identification/);
 }
 const r=row(1,{field:'identity',plannedAction:'import-record'});
 assert.throws(()=>prepareReviewChoices(library,[r],[choice(r)]),/import approval/);
 assert.match(prepareReviewChoices(library,[r],[{...choice(r),side:'tracker'}])[0].key,/new_import_v1/);
});
test('ten choices use at most four concurrent writes and exactly one fresh readback',async()=>{
 const rows=Array.from({length:10},(_,n)=>row(n)),commands=prepareReviewChoices(library,rows,rows.map(choice));
 const settings=[];let active=0,max=0,reads=0;
 const result=await persistReviewChoices({async write(c){active++;max=Math.max(max,active);await new Promise(resolve=>setTimeout(resolve,1));active--;const r={library_id:library,key:c.key,revision:1,value:{value:c.value}};settings.push(r);return r;},async read(){reads++;return {owner_id:owner,library_id:library,settings};}},owner,library,commands);
 assert.equal(result.length,10);assert.equal(reads,1);assert.equal(max,4);assert.ok(result.every(r=>r.revision===1));
});
test('a successful RPC cannot hide a mismatched, missing, or wrong-owner readback',async()=>{
 const r=row(1),commands=prepareReviewChoices(library,[r],[choice(r)]),c=commands[0];
 const receipt={library_id:library,key:c.key,revision:1,value:{value:c.value}};
 for(const fresh of [{owner_id:owner,library_id:library,settings:[]},{owner_id:library,library_id:library,settings:[receipt]},{owner_id:owner,library_id:owner,settings:[receipt]},{owner_id:owner,library_id:library,settings:[{...receipt,revision:2}]}]){
  await assert.rejects(()=>persistReviewChoices({write:async()=>receipt,read:async()=>fresh},owner,library,commands),/readback/);
 }
 await assert.rejects(()=>persistReviewChoices({write:async()=>({...receipt,key:'wrong'}),read:async()=>({owner_id:owner,library_id:library,settings:[receipt]})},owner,library,commands),/fully confirmed/);
});
