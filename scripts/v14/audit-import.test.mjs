import { test } from 'node:test';
import assert from 'node:assert/strict';
import { auditSnapshot } from './audit-import.mjs';

function fixture() {
 return {sourceSheetId:'fixture',capturedAt:'2026-10-10T12:00:00Z',tabs:[
  {name:'Books',values:[['Title','My Rating','Type'],['Book',0,'Physical']]},
  {name:'Movies',values:[['Title']]},
  {name:'Shows',values:[['Title','TMDB_ID','WatchStatus'],['Show','1','Pending Release']]},
  {name:'Games',values:[['Title','IGDB_ID','Platform'],['Game','4','Steam'],['Game','4','Switch']]},
  {name:'TV Episodes',values:[['ShowTMDB_ID','SeasonNumber','EpisodeNumber','Watched'],['1','0','1',false]]},
  {name:'Settings',values:[['Key','Value']]},
  {name:'Changelog',values:[['Timestamp']]}
 ]};
}
test('dry run keeps editions, zero rating, specials and Pending Release',()=>{
 const s=fixture(), before=JSON.stringify(s), r=auditSnapshot(s);
 assert.equal(r.candidateItems,4); assert.equal(r.issueCount,0);
 assert.equal(JSON.stringify(s),before); assert.equal(r.mode,'dry-run-no-writes');
});
test('duplicate identities are flagged, not merged',()=>{
 const s=fixture();s.tabs[3].values.push(['Game','4','Steam']);
 const r=auditSnapshot(s); assert.equal(r.candidateItems,5);
 assert.equal(r.issues.filter(i=>i.code==='duplicate_identity_candidate').length,2);
});
test('missing source tab fails closed',()=>{
 const s=fixture();s.tabs.pop();assert.throws(()=>auditSnapshot(s),/seven/);
});
test('invalid book scale and unnamed data are flagged',()=>{
 const s=fixture();s.tabs[0].values.push(['Other',9,'Physical','preserve me']);
 const r=auditSnapshot(s);assert.ok(r.issues.some(i=>i.code==='invalid_personal_rating'));
 assert.ok(r.issues.some(i=>i.code==='populated_unnamed_column'));
});
test('missing episode parent is flagged',()=>{
 const s=fixture();s.tabs[4].values.push(['404','1','1',true]);
 assert.ok(auditSnapshot(s).issues.some(i=>i.code==='missing_or_ambiguous_parent_show'));
});
