import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,next){return next(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {reviewUnmatchedTrackerRows:review}=await import('../../app/lib/v14/tracker-unmatched.ts');
hook.deregister();
const table=(rows)=>({name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows});
const item=(title='Fixture',platform='Steam',provider='7599')=>({id:'22222222-2222-4222-8222-222222222222',library_id:'11111111-1111-4111-8111-111111111111',media_type:'game',title,revision:1,user_status:'Started',completed_on:null,personal_rating:null,notes:'PRIVATE NOTES',user_fields:{Platform:platform},metadata:{IGDB_ID:provider}});
test('a genuinely new tracker row is classified without enabling a write',()=>{
 const result=review(table([['Brand new','Steam','9000','Started']]),[item()],new Set());
 assert.equal(result.length,1);assert.equal(result[0].identityReview.kind,'new-tracker-record');
 assert.deepEqual(result[0].identityReview.rows,[2]);assert.equal(result[0].resolutionAllowed,false);assert.equal(result[0].direction,'review');assert.equal(result[0].plannedAction,undefined);
 assert.equal(JSON.stringify(result).includes('PRIVATE NOTES'),false);
});
test('matching title or provider produces candidates, never guessed mappings',()=>{
 for(const row of [['Fixture','Xbox','9000',''],['Renamed','Steam','7599','']]){
  const result=review(table([row]),[item()],new Set())[0];
  assert.equal(result.identityReview.kind,'possible-existing-record');assert.equal(result.identityReview.candidates.length,1);assert.equal(result.resolutionAllowed,false);
 }
});
test('identical duplicate identities are grouped but different platform editions remain separate',()=>{
 const row=['Fixture','Steam','7599','Started'];
 const duplicate=review(table([row,[...row.slice(0,3),'Abandoned']]),[item()],new Set());
 assert.equal(duplicate.length,1);assert.equal(duplicate[0].identityReview.kind,'duplicate-tracker-record');assert.deepEqual(duplicate[0].identityReview.rows,[2,3]);
 const editions=review(table([row,['Fixture','Xbox','7599','']]),[item()],new Set([0]));
 assert.equal(editions.length,1);assert.equal(editions[0].identityReview.kind,'possible-existing-record');assert.equal(editions[0].identityReview.identity.Platform,'Xbox');
});
test('row moves preserve report identity but update human-facing locations',()=>{
 const row=['New item','Steam','',''];
 const before=review(table([row]),[],new Set())[0],after=review(table([['','','',''],row]),[],new Set())[0];
 assert.equal(before.id,after.id);assert.equal(before.itemId,after.itemId);assert.deepEqual(after.identityReview.rows,[3]);
 assert.notEqual(before.id,review(table([['New item','Xbox','','']]),[],new Set())[0].id);
});
test('consumed rows and blank titles do not produce false new records; inputs stay unchanged',()=>{
 const source=table([['Fixture','Steam','7599',''],['','','','']]),items=[item()],used=new Set([0]);
 const before=JSON.stringify({source,items,used:[...used]});assert.deepEqual(review(source,items,used),[]);
 assert.equal(JSON.stringify({source,items,used:[...used]}),before);
});
test('book editions remain independent even with the same title; reused ISBN becomes a candidate',()=>{
 const books={name:'Books',headers:['Title','isbn','Type'],rows:[['Another title','123','Audiobook'],['Fixture','456','eBook']]};
 const book={...item(),media_type:'book',user_fields:{Type:'Physical'},metadata:{isbn:'123'}};
 const result=review(books,[book],new Set());assert.equal(result.length,2);
 assert.ok(result.every(r=>r.identityReview.kind==='possible-existing-record'&&r.resolutionAllowed===false));
 assert.equal(result[0].identityReview.identity.Type,'Audiobook');
});
test('movie and TV candidates never cross media boundaries',()=>{
 const movie={...item(),media_type:'movie',metadata:{TMDB_ID:'123'}};
 const t={name:'Shows',headers:['Title','TMDB_ID'],rows:[['Fixture','123']]};
 assert.equal(review(t,[movie],new Set())[0].identityReview.kind,'new-tracker-record');
 assert.throws(()=>review({name:'Unexpected',headers:[],rows:[]},[],new Set()));
 assert.throws(()=>review({name:'Games',headers:['Title'],rows:[['A']]},[],new Set()));
});
