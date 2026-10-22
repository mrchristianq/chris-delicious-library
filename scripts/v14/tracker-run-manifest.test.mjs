import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-read','./tracker-checkpoint','./tracker-reconcile','./tracker-projection','./edit-contract','./legacy-row'].includes(s)?s+'.ts':s,c);}});
const {compileTrackerWriteSteps}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {createTrackerRunManifest:create,encodeTrackerRunManifest:encode,decodeTrackerRunManifest:decode,trackerApprovalDigest:digest,journalForTrackerRun:journal}=await import('../../app/lib/v14/tracker-run-manifest.ts');h.deregister();
const library='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const item={id,library_id:library,media_type:'game',title:'Fixture',revision:1,user_status:'Abandoned',personal_rating:null,completed_on:null,notes:'secret note',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:'7599'}};
const steps=()=>compileTrackerWriteSteps([{id:'op',itemId:id,media:'game',field:'Status',kind:'export-field',comparisonToken:'b'.repeat(64),value:'Abandoned'}],[item],[{name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows:[['Fixture','Steam','7599','Completed']]}],[]);
test('compressed immutable run package survives reload with operation and library hashes intact',()=>{
 const m=create(library,'a'.repeat(64),[],steps());assert.deepEqual(decode(encode(m),library,m.fingerprint),m);assert.equal(journal(m).steps[0].state,'pending');assert.equal(JSON.stringify(m).includes('secret note'),false);
});
test('approval digest changes for clears/revisions, not unrelated journal or theme settings',()=>{
 const s={key:'__cdl_tracker_initial_review_v1',revision:1,value:{value:'approved'}};
 assert.notEqual(digest([s]),digest([{...s,revision:2}]));assert.notEqual(digest([s]),digest([{...s,value:{value:'cleared'}}]));
 assert.equal(digest([s]),digest([s,{key:'theme',revision:1,value:{value:'dark'}},{key:'__cdl_tracker_run_v1:hash',revision:1,value:{value:'journal'}}]));
});
test('wrong library, altered steps, tampered package, duplicate operations and unsupported payloads are rejected',()=>{
 const m=create(library,'a'.repeat(64),[],steps()),encoded=encode(m);
 assert.throws(()=>decode(encoded,id,m.fingerprint));assert.throws(()=>decode(encoded,library,'c'.repeat(64)));
 assert.throws(()=>decode('gzip-v1:invalid',library,m.fingerprint));
 assert.throws(()=>create(library,'a'.repeat(64),[],[...steps(),...steps()]));
 const altered=structuredClone(m);altered.steps[0].after.Status='Started';assert.throws(()=>decode(encode(altered),library,m.fingerprint));
 const malicious=steps();malicious[0].after.Notes='secret';const {fingerprint,...body}=malicious[0];void fingerprint;malicious[0].fingerprint=createHash('sha256').update(JSON.stringify([m.target,body])).digest('hex');assert.throws(()=>create(library,m.decisionPlan,[],malicious));
});
