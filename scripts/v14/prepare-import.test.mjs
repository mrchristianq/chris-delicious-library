import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { prepareImport, prepareCommittedImport, TEST_PROJECT } from './prepare-import.mjs';
const ownerId='00000000-0000-4000-a000-000000000014';
const itemId='00000000-0000-4000-a000-000000000015';
function packet() {
 const capture={sourceSheetId:'1Kh_wLgr6aSKU50fgzqL29YZbNtnJTX8ZdVGGwljyf1Y',completedAt:'2026-10-11T00:00:00Z',tabs:[{name:'Books',formulaBefore:[['Title'],['Book']],formulaAfter:[['Title'],['Book']],evaluated:[['Title'],['Book']]}]};
 return {mode:'LOCAL-IMPORT-CANDIDATE-NO-WRITES',capture,snapshotSha256:createHash('sha256').update(JSON.stringify(capture)).digest('hex'),items:[{id:itemId,title:'Book',media_type:'book',personal_rating:0,completed_on:null,notes:"'); DROP SCHEMA cdl; --",user_status:'Collection',user_fields:{},metadata:{},provider_id:null,source:[{tab:'Books',row:2}]}],episodes:[],settings:[],warnings:[],sourceToItem:{},fieldSelections:[]};
}
const options={ownerId,projectRef:TEST_PROJECT};
test('persistent import requires explicit project/owner/snapshot and fresh capture',()=>{
 const p=packet();p.capture.completedAt=new Date().toISOString();p.snapshotSha256=createHash('sha256').update(JSON.stringify(p.capture)).digest('hex');
 const approved={...options,ownerEmail:'owner@example.test',expectedSnapshotSha256:p.snapshotSha256,confirmation:`IMPORT ${TEST_PROJECT} ${ownerId}`};
 assert.throws(()=>prepareCommittedImport(p,{...approved,confirmation:''}),/confirmation/);
 assert.throws(()=>prepareCommittedImport(p,{...approved,expectedSnapshotSha256:'wrong'}),/snapshot/);
 assert.match(prepareCommittedImport(p,approved).sql,/email_confirmed_at is not null/);
 assert.match(prepareCommittedImport(p,approved).sql,/\ncommit;/);
 p.capture.completedAt='2020-01-01';assert.throws(()=>prepareCommittedImport(p,approved),/30 minutes/);
});
test('rollback only; quotes private text; preserves input and zero rating',()=>{
 const p=packet(),before=structuredClone(p),out=prepareImport(p,options);
 assert.deepEqual(p,before);assert.match(out.sql,/rollback;/);assert.doesNotMatch(out.sql,/\ncommit;/i);assert.match(out.sql,/''\); DROP SCHEMA/);assert.equal(out.summary.items,1);
});
test('reject wrong project and malformed owner',()=>{
 assert.throws(()=>prepareImport(packet(),{...options,projectRef:'production'}),/Wrong project/);
 assert.throws(()=>prepareImport(packet(),{...options,ownerId:"');--"}),/Invalid owner/);
});
test('reject modified capture and invalid personal rating',()=>{
 const p=packet();p.capture.tabs[0].evaluated[1][0]='Changed';assert.throws(()=>prepareImport(p,options),/hash mismatch/);
 const q=packet();q.items[0].personal_rating=9;assert.throws(()=>prepareImport(q,options),/Invalid rating/);
});
test('reject duplicate items and non-TV episode parent',()=>{
 const p=packet();p.items.push(p.items[0]);assert.throws(()=>prepareImport(p,options),/item identity/);
 const q=packet();q.episodes.push({id:ownerId,show_id:itemId,season_number:1,episode_number:1,watched:null});assert.throws(()=>prepareImport(q,options),/episode identity/);
});
test('fails closed for existing target and missing owner; never clears data',()=>{
 const {sql}=prepareImport(packet(),options);assert.match(sql,/Owner must already exist/);assert.match(sql,/Test target must be empty/);assert.match(sql,/refusing overwrite/);assert.doesNotMatch(sql,/\n(?:delete|truncate|update)\s/i);
});
