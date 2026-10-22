import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {validateTrackerBaselineState:validate,readTrackerBaselineState:read}=await import('../../app/lib/v14/tracker-baseline-read.ts');
const {previewTrackerThreeWay:preview,attachTrackerDisplay}=await import('../../app/lib/v14/tracker-three-way.ts');
const {TRACKER_ID}=await import('../../app/lib/v14/tracker-read.ts');h.deregister();
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lib='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const at='2026-10-19T23:38:36Z';
const item={id,library_id:lib,media_type:'game',title:'Fixture',revision:1,user_status:'Started',personal_rating:8,completed_on:null,notes:'NEVER EXPORT',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:'7599'}};
const tables=()=>[{name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows:[['Fixture','Steam','7599','Started']]},{name:'Shows',headers:['Title','TMDB_ID','NumberOfEpisodes','WatchStatus'],rows:[]},{name:'Books',headers:['Title','isbn','Type'],rows:[]},{name:'Movies',headers:['Title','TMDB_ID'],rows:[]}];
const payload=()=>({exists:true,ownerId:owner,libraryId:lib,sheetId:TRACKER_ID,targetId:'33333333-3333-4333-8333-333333333333',enabled:false,lastConfirmedSync:at,columns:Object.fromEntries(tables().map(t=>[t.name,t.headers])),records:[{itemId:id,media:'game',confirmedAt:at,fields:{Title:'Fixture',Platform:'Steam',IGDB_ID:'7599',Status:'Started'}}]});
const base=()=>validate(payload(),owner,lib);
test('owner-scoped baseline decoder rejects wrong scope, partial fields, duplicates and excluded data',()=>{
 assert.equal(base().records.length,1);
 for(const mutate of [p=>p.ownerId=lib,p=>p.sheetId='original-sheet',p=>p.enabled=true,p=>delete p.records[0].fields.Status,p=>p.records.push(p.records[0]),p=>p.columns.Games.push('Notes'),p=>p.records[0].fields.Notes='private',p=>p.records[0].fields.Status={},p=>p.lastConfirmedSync='bad']){
  const p=payload();mutate(p);assert.throws(()=>validate(p,owner,lib));
 }
});
test('a genuinely absent target is allowed, but errors never become empty baselines',async()=>{
 assert.equal(validate({exists:false,ownerId:owner,libraryId:lib,sheetId:TRACKER_ID},owner,lib),null);
 assert.throws(()=>validate({exists:false,ownerId:owner,libraryId:lib,sheetId:TRACKER_ID,records:[]},owner,lib));
 await assert.rejects(read({rpc:async()=>({data:payload(),error:{message:'offline'}})},owner,lib),/unavailable/);
 let call;const result=await read({rpc:async(name,args)=>{call={name,args};return {data:payload(),error:null};}},owner,lib);
 assert.equal(result.records.length,1);assert.deepEqual(call,{name:'cdl_v14_tracker_baselines',args:{p_library_id:lib}});
});
test('unchanged live-style sources produce an honest read-only preview with the persisted last sync time',()=>{
 const result=preview([item],tables(),base(),at);
 assert.deepEqual(result.changes,[]);assert.equal(result.matchedRecords,1);assert.equal(result.lastConfirmedSync,at);assert.equal(result.comparisonMode,'three-way');assert.equal(result.canSaveDecisions,false);
 assert.equal(JSON.stringify(result).includes('NEVER EXPORT'),false);
});
test('app-only, sheet-only and competing edits are classified against the actual baseline',()=>{
 for(const [app,sheet,direction] of [['Completed','Started','export'],['Started','Abandoned','import'],['Completed','Abandoned','conflict']]){
  const t=tables();t[0].rows[0][3]=sheet;
  const result=preview([{...item,user_status:app}],t,base(),at);
  assert.equal(result.changes.length,1);assert.equal(result.changes[0].direction,direction);assert.equal(result.changes[0].baseline,'Started');assert.equal(result.canSaveDecisions,false);
 }
});
test('media review context includes retained values without private notes or inferred matches',()=>{
 const t=tables();t[0].rows[0][3]='Abandoned';
 const p=attachTrackerDisplay(preview([item],t,base(),at),[item],t,base()),context=p.changes[0].displayRecord;
 assert.equal(p.syncedRecords,1);
 assert.equal(context.app.Status,'Started');assert.equal(context.tracker.Status,'Abandoned');
 assert.equal(JSON.stringify(context).includes('NEVER EXPORT'),false);
 assert.equal(Object.hasOwn(context.app,'Notes'),false);
 const missing=attachTrackerDisplay(preview([],t,base(),at),[],t,base());
 assert.deepEqual(missing.changes[0].displayRecord.app,{});
});
test('an exact unique candidate is display-only and does not authorize an edition merge',()=>{
 const t=tables();t[0].rows.push(['Fixture','PlayStation 5','','Queued']);
 const raw=preview([item],t,base(),at),before=JSON.stringify(raw);
 const decorated=attachTrackerDisplay(raw,[item],t,base());
 const row=decorated.changes.find(r=>r.identityReview?.kind==='possible-existing-record');
 assert.equal(row.displayRecord.candidate,true);assert.equal(row.displayRecord.app.Platform,'Steam');assert.equal(row.displayRecord.tracker.Platform,'PlayStation 5');
 assert.equal(row.resolutionAllowed,false);assert.equal(row.decisionToken,undefined);
 assert.equal(JSON.stringify(raw),before);assert.equal(JSON.stringify(decorated).includes('NEVER EXPORT'),false);
});
test('moved rows do not change matching and duplicate identities never get zipped',()=>{
 const moved=tables();moved[0].rows.unshift(['','','','']);assert.equal(preview([item],moved,base(),at).changes.length,0);
 const duplicate=tables();duplicate[0].rows.push(duplicate[0].rows[0]);const result=preview([item],duplicate,base(),at);assert.equal(result.matchedRecords,0);assert.ok(result.identityIssues>0);assert.ok(result.changes.every(c=>c.direction==='review'));
});
test('missing rows, archived items, additions and changed identity remain review-only, never inferred deletes',()=>{
 const absent=tables();absent[0].rows=[];
 for(const result of [preview([item],absent,base(),at),preview([],tables(),base(),at),preview([{...item,id:owner}],tables(),base(),at),preview([{...item,title:'Renamed'}],tables(),base(),at)]){
  assert.ok(result.changes.length);assert.ok(result.changes.every(c=>c.direction==='review'&&c.resolutionAllowed===false));
 }
 const changed=tables();changed[0].rows[0][0]='Renamed';const proposed=preview([item],changed,base(),at);assert.equal(proposed.changes[0].plannedAction,'provider-correction');assert.equal(proposed.changes[0].resolutionAllowed,false);
 const movedIdentity=preview([{...item,title:'Renamed',user_status:'Abandoned'}],tables(),base(),at);
 assert.equal(movedIdentity.changes.find(c=>c.field==='identity').plannedAction,'provider-correction');assert.equal(movedIdentity.changes.find(c=>c.field==='Status').direction,'export');
});
test('schema edits, unsafe columns and mixed libraries fail closed without a stale preview',()=>{
 for(const mutate of [t=>t[0].headers.push('Notes'),t=>t[0].headers.pop(),t=>t[0].headers.push('Unexpected'),t=>t.pop()]){const t=tables();mutate(t);assert.throws(()=>preview([item],t,base(),at));}
 assert.throws(()=>preview([{...item,library_id:owner}],tables(),base(),at));
});
test('equal spreadsheet errors are still held for repair instead of disappearing as no changes',()=>{
 const p=payload();p.columns.Games.push('Description');p.records[0].fields.Description='valid';
 const t=tables();t[0].headers.push('Description');t[0].rows[0].push('#REF!');
 const result=preview([{...item,metadata:{...item.metadata,Description:'#REF!'}}],t,validate(p,owner,lib),at);
 assert.equal(result.dataIssues,1);assert.equal(result.changes[0].direction,'review');assert.equal(result.changes[0].blockedField,true);
});
test('preview repeats do not mutate confirmed baselines, source data or persisted last sync',()=>{
 const b=base(),t=tables(),before=JSON.stringify({b,t,item});
 const first=preview([item],t,b,at);assert.deepEqual(preview([item],t,b,at),first);assert.equal(JSON.stringify({b,t,item}),before);
});
