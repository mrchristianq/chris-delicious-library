import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,n){return n(s==='./legacy-row'?s+'.ts':s,c);}});
const {initialTrackerReview}=await import('../../app/lib/v14/tracker-reconcile.ts');hook.deregister();
const library='11111111-1111-4111-8111-111111111111';
const item=(id='22222222-2222-4222-8222-222222222222',overrides={})=>({id,library_id:library,media_type:'game',title:'Fixture',user_status:'Abandoned',personal_rating:0,completed_on:'2026-10-04',notes:'PRIVATE NOTES NEVER EXPORTED',revision:2,user_fields:{},metadata:{Platform:'Steam',IGDB_ID:'123'},...overrides});
const table=(rows=[['Fixture','Steam','123','Completed','0','10/4/2026']])=>({name:'Games',headers:['Title','Platform','IGDB_ID','Status','My Rating','Date Completed'],rows});
test('initial review uses canonical values and normalizes calendar dates and numeric zeros',()=>{
 const result=initialTrackerReview([item()],[table()],'now');
 assert.equal(result.status,'initial-review');assert.equal(result.changes.length,1);const change=result.changes[0];
 assert.equal(change.field,'Status');assert.equal(change.app,'Abandoned');assert.equal(change.direction,'review');assert.equal(change.resolutionAllowed,true);
 assert.equal(JSON.stringify(result).includes('PRIVATE NOTES'),false);
});
test('row movement does not change matching; platform editions remain independent',()=>{
 const other=item('33333333-3333-4333-8333-333333333333',{metadata:{Platform:'Xbox',IGDB_ID:'123'}});
 const rows=[['Fixture','Steam','123','Completed','0','10/4/2026'],['Fixture','Xbox','123','Abandoned','0','10/4/2026']];
 const first=initialTrackerReview([item(),other],[table(rows)],'now').changes;
 const reordered=initialTrackerReview([other,item()],[table([...rows].reverse())],'now').changes;
 assert.deepEqual(first,reordered);
});
test('duplicates, missing records and corrected provider identities cannot offer field winners',()=>{
 for(const rows of [[...table().rows,...table().rows],[],[['Fixture','Steam','999','Completed','0','10/4/2026']]]){
  const result=initialTrackerReview([item()],[table(rows)],'now');
  assert.ok(result.changes.length>0);assert.ok(result.changes.every(c=>c.resolutionAllowed===false));
 }
});
test('removed columns are not reintroduced, unmapped retained columns cannot clear the app',()=>{
 const t=table();t.headers.push('Unmapped');t.rows[0].push('value');
 const result=initialTrackerReview([item()],[t],'now');
 assert.equal(result.changes.find(c=>c.label==='Record identity')?.resolutionAllowed,false);
 const removed=table();removed.headers=removed.headers.slice(0,3);removed.rows=removed.rows.map(r=>r.slice(0,3));
 assert.deepEqual(initialTrackerReview([item()],[removed],'now').changes,[]);
});
test('excluded fields fail closed even if a caller bypasses the reader',()=>{
 const t=table();t.headers.push('Notes');assert.throws(()=>initialTrackerReview([item()],[t],'now'),/Excluded/);
});
test('game checkbox spellings compare semantically without affecting episode unknowns',()=>{
 const t=table();t.headers.push('Completed','Backlog');t.rows[0].push('No','Yes');
 const game=item();game.metadata.Backlog='true';
 const result=initialTrackerReview([game],[t],'now');
 assert.equal(result.changes.some(c=>c.field==='Completed'||c.field==='Backlog'),false);
 t.rows[0][6]='';assert.equal(initialTrackerReview([game],[t],'now').changes.some(c=>c.field==='Completed'),false);
});
test('same-title movie releases match by unique TMDB identity, never row order',()=>{
 const first=item(undefined,{title:'The Lion King',media_type:'movie',user_status:'Watched',metadata:{TMDB_ID:'8587'}});
 const second=item('33333333-3333-4333-8333-333333333333',{title:first.title,media_type:'movie',user_status:'Watched',metadata:{TMDB_ID:'420818'}});
 const t={name:'Movies',headers:['Title','TMDB_ID','Watch Status'],rows:[[first.title,'420818','Started'],[first.title,'8587','Backlog']]};
 const result=initialTrackerReview([first,second],[t],'now');
 assert.match(result.message,/2 uniquely matched records; 0 identity/);
 assert.equal(result.changes.find(c=>c.itemId===first.id).tracker,'Backlog');
 assert.equal(result.changes.find(c=>c.itemId===second.id).tracker,'Started');
 assert.deepEqual(initialTrackerReview([first,second],[{...t,rows:[...t.rows].reverse()}],'now').changes,result.changes);
});
test('duplicate or blank remake provider IDs remain blocked without pairing by position',()=>{
 const films=[item(undefined,{media_type:'movie',metadata:{TMDB_ID:'1'}}),item('33333333-3333-4333-8333-333333333333',{media_type:'movie',metadata:{TMDB_ID:'2'}})];
 for(const ids of [['1','1'],['','']]){
  const result=initialTrackerReview(films,[{name:'Movies',headers:['Title','TMDB_ID'],rows:ids.map(id=>['Fixture',id])}],'now');
  assert.equal(result.changes.length,1);assert.equal(result.changes[0].resolutionAllowed,false);
 }
});
test('a unique same-title release can match while its unresolved sibling stays flagged',()=>{
 const films=[item(undefined,{media_type:'tv',metadata:{TMDB_ID:'1'}}),item('33333333-3333-4333-8333-333333333333',{media_type:'tv',metadata:{TMDB_ID:'2'}})];
 const result=initialTrackerReview(films,[{name:'Shows',headers:['Title','TMDB_ID'],rows:[['Fixture','1'],['Fixture','3']]}],'now');
 assert.match(result.message,/1 uniquely matched records; 1 identity/);assert.equal(result.changes[0].resolutionAllowed,false);
});
