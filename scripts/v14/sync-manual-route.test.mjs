import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const library='11111111-1111-4111-8111-111111111111',owner='owner',fingerprint='a'.repeat(64),requestId='22222222-2222-4222-8222-222222222222';
globalThis.__manual={};
const modules={
 config:`export const getV14Config=()=>({origin:'http://localhost:3014'});`,
 server:`export const createV14Client=async()=>({auth:{getUser:async()=>({data:{user:globalThis.__manual.user?{id:'owner'}:null}})},rpc:async()=>({data:[{id:'${library}'}]})});`,
 'read-library':`export const readLibrary=async()=>{globalThis.__manual.reads++;return {items:[],settings:globalThis.__manual.settingsRows??[]};};`,
 'tracker-read-server':`export const readTrackerConnection=async()=>({tables:[],grids:[],observedAt:'now'});`,
 'tracker-baseline-read':`export const readTrackerBaselineState=async()=>({});`,
 'tracker-three-way':`export const previewTrackerThreeWay=()=>({changes:[]});`,
 'tracker-new-decisions':`export const attachNewItemDecisions=p=>p;`,
 'tracker-identity-review':`export const attachIdentityReviews=p=>p;`,
 'tracker-write-plan':`export const trackerRowIdentity=()=>'';`,
 'tracker-mixed-plan':`export const mixedHash=()=>'';export const mixedRunId=()=>'';export const compileTrackerMixedPlan=()=>{globalThis.__manual.compiles++;if(globalThis.__manual.withdrawn)throw new Error('choice withdrawn');return globalThis.__manual.freshPlan;};export const compileMixedNewItemPlan=compileTrackerMixedPlan;export const compileMixedSameItemPlan=compileTrackerMixedPlan;export const compileMixedSeparateEditionPlan=compileTrackerMixedPlan;`,
 'tracker-mixed-package':`export const storedMixedPackage=()=>{if(globalThis.__manual.forbidRecompression)throw new Error('recompression forbidden');return {parts:[],manifest:'saved'};};export const readStoredMixedPackage=()=>({plan:globalThis.__manual.plan,manifest:'original-compression',partCount:0});export const preflightMixedPackage=()=>{};export const readStoredMixedPlan=()=>globalThis.__manual.plan;`,
 'tracker-mixed-server':`export const mixedWriter=()=>({});export const readMixedContext=async(client,owner,library,runId)=>{const s=globalThis.__manual;if(runId){s.runContextIds.push(runId);if(!s.plan.creates)throw new Error('New-item run unavailable');}return {stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32),activePlan:s.active,runStatus:s.runStatus,allowChunkedPlans:true,allowSheetImports:true,allowAdditions:true,allowReviewedIdentities:s.identities};};export const createMixedRunAdapter=()=>({});`,
 'tracker-mixed-store':`export const stageMixedPlan=async()=>{globalThis.__manual.stages++;};`,
 'tracker-mixed-run':`export const advanceTrackerMixedRun=async()=>{globalThis.__manual.applies++;if(globalThis.__manual.uncertain)throw new Error('readback interrupted');return {status:'verified'};};`,
 'tracker-recovery-server':`export const saveTrackerRecoverySnapshot=async()=>{globalThis.__manual.backups++;return {path:'private-backup'};};`,
 'save-setting':`export const saveSetting=async()=>{globalThis.__manual.settings++;};`,
};
const hooks=registerHooks({resolve(s,c,n){const name=s.split('/').at(-1);if(Object.hasOwn(modules,name))return {url:'file:///manual-mock-'+name,shortCircuit:true};if(s.endsWith('/tracker-manual-contract')||['./tracker-read','./hosted-preview'].includes(s))return n(s+'.ts',c);return n(s,c);},load(u,c,n){if(u.startsWith('file:///manual-mock-'))return {format:'module',shortCircuit:true,source:modules[u.slice('file:///manual-mock-'.length)]};return n(u,c);}});
const {POST,GET}=await import('../../app/v14/api/sync-manual/route.ts');hooks.deregister();
function reset(){const plan={ownerId:owner,libraryId:library,runId:requestId,fingerprint,imports:[],exports:[],sources:[]};Object.assign(globalThis.__manual,{plan,freshPlan:plan,user:true,identities:true,withdrawn:false,active:null,runStatus:null,runContextIds:[],reads:0,compiles:0,applies:0,backups:0,settings:0,stages:0});process.env.CDL_V14_TEST='true';process.env.CDL_V14_MANUAL_SYNC='true';process.env.CDL_V14_REVIEW_ONLY='true';process.env.CDL_V14_TRACKER_WRITE_TARGET='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';process.env.CDL_V14_ORIGIN='http://localhost:3014';}
const req=(extra={},origin='http://localhost:3014')=>new Request('http://localhost:3014/v14/api/sync-manual',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({action:'apply',libraryId:library,fingerprint,requestId,...extra})});
test('withdrawn choices or a newly compiled plan cannot dispatch a saved unclaimed package',async()=>{
 for(const type of ['withdrawn','changed']){reset();const s=globalThis.__manual;if(type==='withdrawn')s.withdrawn=true;else s.freshPlan={...s.plan,fingerprint:'b'.repeat(64)};assert.equal((await POST(req())).status,503);assert.equal(s.applies,0);assert.equal(s.backups,0);assert.equal(s.settings,0);}
});
test('valid current choices apply only after fresh preparation and a recovery snapshot',async()=>{reset();const s=globalThis.__manual;assert.equal((await POST(req())).status,200);assert.equal(s.compiles,1);assert.equal(s.backups,1);assert.equal(s.settings,1);assert.equal(s.applies,1);});
test('active and completed runs resume the sealed package, not newly withdrawn choices',async()=>{
 for(const status of ['running','completed']){reset();const s=globalThis.__manual;s.withdrawn=true;s.runStatus=status;s.active=status==='running'?fingerprint:null;assert.equal((await POST(req())).status,200);assert.equal(s.compiles,0);assert.equal(s.applies,1);assert.deepEqual(s.runContextIds,[]);}
});
test('new-item runs retain the run-specific original-metadata guard',async()=>{
 reset();const s=globalThis.__manual;s.plan.creates=[];s.active=fingerprint;s.runStatus='running';
 assert.equal((await POST(req())).status,200);assert.deepEqual(s.runContextIds,[requestId]);assert.equal(s.applies,1);
});
test('unsupported identity guards, foreign origins and browser patches never dispatch',async()=>{
 reset();let s=globalThis.__manual;s.plan.identityReview={};s.identities=false;assert.equal((await POST(req())).status,503);assert.equal(s.applies,0);
 reset();s=globalThis.__manual;assert.equal((await POST(req({},'https://other.example'))).status,403);assert.equal((await POST(req({patch:{}}))).status,400);assert.equal(s.reads,0);assert.equal(s.applies,0);
});
test('interrupted confirmation is pending, never claims a successful write failed or retries it',async()=>{
 reset();globalThis.__manual.uncertain=true;const res=await POST(req());assert.equal(res.status,409);const body=await res.json();assert.equal(body.status,'pending');assert.match(body.error,/may already be saved/);assert.equal(globalThis.__manual.applies,1);globalThis.__manual.uncertain=false;
});
test('active run readiness recognizes its validated stored package without recompressing or restaging it',async()=>{
 reset();const s=globalThis.__manual;s.active=fingerprint;s.runStatus='running';s.forbidRecompression=true;
 s.settingsRows=[{key:`__cdl_tracker_mixed_v1:${fingerprint}`,value:{value:'original-compression'}},{key:`__cdl_tracker_run_v1:${fingerprint}`}];
 try{const response=await GET(new Request(`http://localhost:3014/v14/api/sync-manual?libraryId=${library}`));assert.equal(response.status,200);const body=await response.json();assert.equal(body.staged,true);assert.equal(body.resume,true);assert.equal(s.compiles,0);assert.equal(s.stages,0);}finally{s.forbidRecompression=false;s.settingsRows=[];}
});
