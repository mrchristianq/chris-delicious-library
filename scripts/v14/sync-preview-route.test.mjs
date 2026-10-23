import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const library='11111111-1111-4111-8111-111111111111';
globalThis.__syncPreview={user:true,allowed:true,failed:false,calls:[]};
const hooks=registerHooks({
 resolve(s,c,n){
  if(s.endsWith('/tracker-new-decisions'))return {url:'file:///sync-new-decisions.mjs',shortCircuit:true};
  if(s.endsWith('/tracker-mixed-server'))return {url:'file:///sync-run-context.mjs',shortCircuit:true};
  if(s.endsWith('/tracker-baseline-read'))return {url:'file:///sync-baselines.mjs',shortCircuit:true};
  if(s.endsWith('/tracker-three-way')||s.endsWith('/tracker-identity-readiness')||s.endsWith('/tracker-identity-review')||s.endsWith('/tracker-conflict-decisions')||s.endsWith('/tracker-identity-decisions')||(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')))return n(s+'.ts',c);
  if(s.endsWith('/tracker-provenance'))return {url:'file:///sync-provenance.mjs',shortCircuit:true};if(s.endsWith('/config'))return {url:'file:///sync-config.mjs',shortCircuit:true};if(s.endsWith('/tracker-read-server'))return {url:'file:///sync-reader.mjs',shortCircuit:true};if(s.endsWith('/read-library-server'))return {url:'file:///sync-snapshot.mjs',shortCircuit:true};if(s.endsWith('/server'))return {url:'file:///sync-server.mjs',shortCircuit:true};
  return n(/\/tracker-(mapped-review|reconcile|decisions|verification-receipt)$/.test(s)?s+'.ts':s,c);
 },
 load(u,c,n){if(u==='file:///sync-config.mjs')return {format:'module',shortCircuit:true,source:`export const getV14Config=()=>({origin:'http://localhost:3014'});`};
 if(u==='file:///sync-new-decisions.mjs')return {format:'module',shortCircuit:true,source:"export const attachNewItemDecisions=p=>p;"};
 if(u==='file:///sync-run-context.mjs')return {format:'module',shortCircuit:true,source:"export const readMixedContext=async()=>({activePlan:globalThis.__syncPreview.activePlan??null});"};
 if(u==='file:///sync-provenance.mjs')return {format:'module',shortCircuit:true,source:"export const readTrackerProvenance=async()=>[];"};
 if(u==='file:///sync-baselines.mjs')return {format:'module',shortCircuit:true,source:"export const readTrackerBaselineState=async()=>{const s=globalThis.__syncPreview;if(s.baselineFailed)throw new Error('private baseline failure');if(s.baselineChanges&&s.baselineReads++>0)return {...s.baseline,lastConfirmedSync:'2026-10-20T00:00:00Z'};return s.baseline??null;};"};
 if(u==='file:///sync-reader.mjs')return {format:'module',shortCircuit:true,source:`export async function readTrackerConnection(){globalThis.__syncPreview.calls.push('tracker-read');if(globalThis.__syncPreview.readFailed)throw new Error('private secret never exposed');return globalThis.__syncPreview.connection??null;}`};
 if(u==='file:///sync-snapshot.mjs')return {format:'module',shortCircuit:true,source:`export async function readV14LibraryForVerifiedOwner(){globalThis.__syncPreview.calls.push('snapshot');return {items:[],settings:[]};}`};
 if(u==='file:///sync-server.mjs')return {format:'module',shortCircuit:true,source:`export const createV14Client=async()=>({auth:{getUser:async()=>({data:{user:globalThis.__syncPreview.user?{id:'owner'}:null},error:null})},rpc:async(name)=>{globalThis.__syncPreview.calls.push(name);return {data:globalThis.__syncPreview.allowed?[{id:'${library}'}]:[],error:globalThis.__syncPreview.failed?'failed':null}}});`};return n(u,c);}
});
const route=await import('../../app/v14/api/sync-preview/route.ts');hooks.deregister();
const request=(query=`libraryId=${library}`,headers={})=>new Request(`http://localhost:3014/v14/api/sync-preview?${query}`,{headers});
test('preview is authenticated, uncached, read-only and never presents a disconnected tracker as synced',async()=>{
 const res=await route.GET(request());assert.equal(res.status,200);
 const value=await res.json();assert.equal(value.status,'connection-required');assert.equal(value.lastConfirmedSync,null);assert.deepEqual(value.changes,[]);
 assert.match(res.headers.get('cache-control'),/no-store/);assert.deepEqual(globalThis.__syncPreview.calls,['cdl_v14_my_libraries','tracker-read','snapshot','cdl_v14_nightly_status']);
 assert.equal(route.POST,undefined);
});
test('preview refuses invalid inputs, foreign origins and unauthenticated or unowned libraries',async()=>{
 globalThis.__syncPreview.calls=[];
 assert.equal((await route.GET(request(''))).status,400);
 assert.equal((await route.GET(request(`libraryId=${library}&libraryId=${library}`))).status,400);
 assert.equal((await route.GET(request(`libraryId=${library}&sheetId=original`))).status,400);
 assert.equal((await route.GET(request(undefined,{origin:'https://other.example'}))).status,403);
 globalThis.__syncPreview.user=false;assert.equal((await route.GET(request())).status,401);
 globalThis.__syncPreview.user=true;globalThis.__syncPreview.allowed=false;assert.equal((await route.GET(request())).status,404);
 globalThis.__syncPreview.allowed=true;globalThis.__syncPreview.failed=true;assert.equal((await route.GET(request())).status,503);
 assert.equal(globalThis.__syncPreview.calls.includes('tracker-read'),false);
});
test('fresh tracker connection is not a completed comparison; subsequent failure cannot reuse it',async()=>{
 globalThis.__syncPreview.failed=false;globalThis.__syncPreview.connection={observedAt:'2026-10-19T13:00:00Z',tabs:[{name:'Games',columns:26}]};
 const response=await route.GET(request());assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.status,'mapping-required');assert.equal(body.lastConfirmedSync,null);assert.deepEqual(body.changes,[]);
 globalThis.__syncPreview.readFailed=true;
 const failed=await route.GET(request());assert.equal(failed.status,503);assert.equal(JSON.stringify(await failed.json()).includes('private secret'),false);
});
test('fresh rows produce an initial review without declaring a sync or allowing ambiguous imports',async()=>{
 globalThis.__syncPreview.readFailed=false;
 globalThis.__syncPreview.connection={observedAt:'2026-10-19T14:00:00Z',tabs:[],tables:[{name:'Games',headers:['Title','IGDB_ID','Platform'],rows:[['Unmatched fixture','123','Steam']]}]};
 const response=await route.GET(request());assert.equal(response.status,200);
 const body=await response.json();assert.equal(body.status,'initial-review');
 assert.equal(body.lastConfirmedSync,null);assert.equal(body.changes.length,1);
 assert.equal(body.changes[0].resolutionAllowed,false);
 assert.equal(body.changes[0].direction,'review');
});
test('confirmed baselines switch preview modes, close initial decisions and never fall back after baseline failure',async()=>{
 const s=globalThis.__syncPreview,at='2026-10-19T23:38:36Z';
 const tables=[['Games','Platform','IGDB_ID'],['Shows','TMDB_ID'],['Books','isbn','Type'],['Movies','TMDB_ID']].map(([name,...keys])=>({name,headers:['Title',...keys],rows:[]}));
 s.connection={observedAt:at,tabs:[],tables};s.baseline={libraryId:library,records:[],columns:Object.fromEntries(tables.map(t=>[t.name,t.headers])),lastConfirmedSync:at};
 const response=await route.GET(request());assert.equal(response.status,200);const body=await response.json();
 assert.equal(body.comparisonMode,'three-way');assert.equal(body.canSaveDecisions,true);assert.equal(body.lastConfirmedSync,at);assert.equal(body.reviewComplete,undefined);
 s.baselineFailed=true;const failed=await route.GET(request());assert.equal(failed.status,503);assert.equal(JSON.stringify(await failed.json()).includes('private baseline'),false);
});
test('baseline advancement during a preview is rejected instead of mixing generations',async()=>{
 const s=globalThis.__syncPreview;s.baselineFailed=false;s.baselineChanges=true;s.baselineReads=0;
 assert.equal((await route.GET(request())).status,503);s.baselineChanges=false;
});
test('a saved active run is exposed for recovery and blocks fresh review choices',async()=>{
 const s=globalThis.__syncPreview;s.activePlan='a'.repeat(64);
 const response=await route.GET(request()),body=await response.json();assert.equal(response.status,200);assert.equal(body.activeRun,s.activePlan);assert.equal(body.canSaveDecisions,false);s.activePlan=null;
});
