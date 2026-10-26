import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const library='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',owner='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const fixture=()=>({user:true,allowed:true,activePlan:null,trackerReads:0,snapshotReads:0,writes:[],settings:[],baselineReads:0,changeBaseline:false,badReadback:false,rows:[{id:'field-1',itemId:'item-1',field:'Status',direction:'conflict',resolutionAllowed:true,decisionToken:'a'.repeat(64)}]});
globalThis.__choiceBatch=fixture();
const stubs={
 config:`export const getV14Config=()=>({origin:'http://localhost:3014'});`,
 server:`export const createV14Client=async()=>({auth:{getUser:async()=>({data:{user:globalThis.__choiceBatch.user?{id:'${owner}'}:null}})},rpc:async(name,args)=>{const s=globalThis.__choiceBatch;if(name==='cdl_v14_my_libraries')return {data:s.allowed?[{id:'${library}'}]:[],error:null};if(name!=='cdl_v14_save_setting')throw Error('Unexpected mutation');s.writes.push(args);const receipt={library_id:args.p_library_id,key:args.p_key,revision:(args.p_revision??0)+1,value:args.p_value};s.settings.push(receipt);return {data:receipt,error:null};}});`,
 'tracker-read-server':`export const readTrackerConnection=async()=>{globalThis.__choiceBatch.trackerReads++;return {tables:[],observedAt:'now'}};`,
 'read-library-server':`export const readV14LibraryForVerifiedOwner=async()=>{const s=globalThis.__choiceBatch;s.snapshotReads++;return {owner_id:'${owner}',library_id:'${library}',items:[],settings:s.badReadback&&s.writes.length?[]:s.settings};};`,
 'tracker-baseline-read':`export const readTrackerBaselineState=async()=>{const s=globalThis.__choiceBatch;s.baselineReads++;return {generation:s.changeBaseline?s.baselineReads:1}};`,
 'tracker-three-way':`export const previewTrackerThreeWay=()=>({comparisonMode:'three-way',changes:globalThis.__choiceBatch.rows});`,
 'tracker-conflict-decisions':`export const attachTrackerConflictDecisions=p=>p;export const conflictDecisionKey=(id,r)=>'__cdl_tracker_conflict_v1:'+r.id;export const conflictDecisionValue=(token,side)=>JSON.stringify({token,side});`,
 'tracker-identity-decisions':`export const attachTrackerIdentityDecisions=p=>p;export const identityDecisionKey=()=>'';export const identityDecisionValue=()=>'';`,
 'tracker-new-decisions':`export const attachNewItemDecisions=p=>p;export const newItemDecisionKey=()=>'';export const newItemDecisionValue=()=>'';`,
 'tracker-mixed-server':`export const readMixedContext=async()=>({activePlan:globalThis.__choiceBatch.activePlan,allowSheetImports:true});`,
};
const hook=registerHooks({resolve(s,c,n){const key=s.split('/').at(-1);if(stubs[key])return {url:`file:///batch-test-${key}.mjs`,shortCircuit:true};return n((s.endsWith('/tracker-choice-batch')||c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./'))&&!s.endsWith('.ts')?s+'.ts':s,c);},load(u,c,n){const key=u.replace('file:///batch-test-','').replace('.mjs','');return stubs[key]?{format:'module',source:stubs[key],shortCircuit:true}:n(u,c);}});
const {POST}=await import('../../app/v14/api/sync-review-batch/route.ts');hook.deregister();
const command=()=>({libraryId:library,requestId:crypto.randomUUID(),choices:globalThis.__choiceBatch.rows.map(row=>({changeId:row.id,token:row.decisionToken,side:'app',revision:null,requestId:crypto.randomUUID()}))});
const req=(body=command(),headers={})=>new Request('http://localhost:3014/v14/api/sync-review-batch',{method:'POST',headers:{origin:'http://localhost:3014','content-type':'application/json',...headers},body:JSON.stringify(body)});
test('batch choices enforce bounded same-origin owner authorization before source reads',async()=>{
 globalThis.__choiceBatch=fixture();
 assert.equal((await POST(req(undefined,{origin:'https://other.example'}))).status,403);
 assert.equal((await POST(req({...command(),extra:true}))).status,400);
 assert.equal((await POST(req({...command(),choices:Array(101).fill(command().choices[0])}))).status,400);
 assert.equal((await POST(req({...command(),ignored:'x'.repeat(262144)}))).status,413);
 const s=globalThis.__choiceBatch;s.user=false;assert.equal((await POST(req())).status,401);s.user=true;s.allowed=false;assert.equal((await POST(req())).status,404);
 assert.equal(s.trackerReads,0);assert.equal(s.writes.length,0);
});
test('five selected values use one fresh Sheet read and one combined setting readback',async()=>{
 globalThis.__choiceBatch=fixture();const s=globalThis.__choiceBatch;s.rows=Array.from({length:5},(_,n)=>({...s.rows[0],id:`field-${n}`}));
 const response=await POST(req());assert.equal(response.status,200);const result=await response.json();
 assert.equal(result.confirmed,true);assert.equal(result.applied,false);assert.equal(result.choices.length,5);assert.equal(s.trackerReads,1);assert.equal(s.snapshotReads,2);assert.equal(s.writes.length,5);
});
test('a changed last field prevents every preference write',async()=>{
 globalThis.__choiceBatch=fixture();const s=globalThis.__choiceBatch;s.rows.push({...s.rows[0],id:'last'});const body=command();body.choices[1].token='b'.repeat(64);
 assert.equal((await POST(req(body))).status,409);assert.equal(s.writes.length,0);
});
test('active sync or a changed baseline cannot be bypassed by batch choices',async()=>{
 globalThis.__choiceBatch=fixture();const s=globalThis.__choiceBatch;s.activePlan='a'.repeat(64);
 assert.equal((await POST(req())).status,409);assert.equal(s.trackerReads,0);assert.equal(s.writes.length,0);
 s.activePlan=null;s.changeBaseline=true;assert.equal((await POST(req())).status,409);assert.equal(s.writes.length,0);
});
test('readback failures never claim choices confirmed or library values applied',async()=>{
 globalThis.__choiceBatch=fixture();globalThis.__choiceBatch.badReadback=true;
 const response=await POST(req());assert.equal(response.status,503);assert.match((await response.json()).error,/no library or Sheet values were applied/);
});
test('read-only mode rejects changes while review-only admits only review intent',async()=>{
 globalThis.__choiceBatch=fixture();process.env.CDL_V14_VALIDATION_READ_ONLY='true';delete process.env.CDL_V14_REVIEW_ONLY;
 try{assert.equal((await POST(req())).status,403);process.env.CDL_V14_REVIEW_ONLY='true';assert.equal((await POST(req())).status,200);}finally{delete process.env.CDL_V14_VALIDATION_READ_ONLY;delete process.env.CDL_V14_REVIEW_ONLY;}
});
