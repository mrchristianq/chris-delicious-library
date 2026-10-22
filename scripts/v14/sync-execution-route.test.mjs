import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const library='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
globalThis.__execution={user:true,owned:true,calls:[],failed:false,settings:[],items:[{id,library_id:library,media_type:'game',title:'Fixture',revision:1,user_status:'Abandoned',personal_rating:null,completed_on:null,notes:'private-note',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:'7599'}}],tables:[{name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows:[['Fixture','Steam','7599','Completed']]}]};
const h=registerHooks({resolve(s,c,n){
 if(s.endsWith('/tracker-baseline-read'))return {url:'file:///execution-baselines.mjs',shortCircuit:true};
 for(const name of ['config','server','tracker-read-server','read-library-server','tracker-provenance','tracker-stage-server'])if(s.endsWith('/'+name))return {url:'file:///execution-'+name+'.mjs',shortCircuit:true};
 if(['./tracker-read','./tracker-decisions','./tracker-reconcile','./tracker-projection','./edit-contract','./legacy-row','./tracker-write-plan','./tracker-checkpoint'].includes(s)||/\/tracker-(mapped-review|decisions|execution-plan|write-plan|google-request|run-manifest)$/.test(s))return n(s+'.ts',c);return n(s,c);
},load(u,c,n){
 const source={
 'file:///execution-baselines.mjs':`export const readTrackerBaselineState=async()=>globalThis.__execution.hasBaseline?{}:null;`,
 'file:///execution-config.mjs':`export const getV14Config=()=>({origin:'http://localhost:3014'});`,
 'file:///execution-server.mjs':`export const createV14Client=async()=>({auth:{getUser:async()=>({data:{user:globalThis.__execution.user?{id:'owner'}:null},error:null})},rpc:async(name)=>{globalThis.__execution.calls.push(name);return {data:globalThis.__execution.owned?[{id:'${library}'}]:[],error:null};}});`,
 'file:///execution-tracker-read-server.mjs':`export async function readTrackerConnection(){globalThis.__execution.calls.push('read-tracker');if(globalThis.__execution.failed)throw new Error('secret');return {tables:globalThis.__execution.tables,observedAt:'now',grids:[{spreadsheetId:'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0',title:'Games',sheetId:1374715809,rowCount:10,columnCount:4}]};}`,
 'file:///execution-read-library-server.mjs':`export async function readV14LibraryForVerifiedOwner(){globalThis.__execution.calls.push('read-app');return {items:globalThis.__execution.items,settings:globalThis.__execution.settings};}`,
 'file:///execution-tracker-provenance.mjs':`export async function readTrackerProvenance(){return [];}`,
 'file:///execution-tracker-stage-server.mjs':`export async function stageTrackerRunForClient(_client,manifest,requestId){globalThis.__execution.calls.push('stage');return {prepared:true,writeEnabled:false,fingerprint:manifest.fingerprint,requestId};}`,
 }[u];return source?{format:'module',shortCircuit:true,source}:n(u,c);
}});
const route=await import('../../app/v14/api/sync-execution/route.ts');
const {initialTrackerReview}=await import('../../app/lib/v14/tracker-mapped-review.ts');
const {INITIAL_REVIEW_KEY,initialReviewValue}=await import('../../app/lib/v14/tracker-decisions.ts');h.deregister();
const request=(query='libraryId='+library,headers={})=>new Request('http://localhost:3014/v14/api/sync-execution?'+query,{headers});
test('GET preparation is read-only and requires a fresh, fully approved review',async()=>{
 assert.equal((await route.GET(request())).status,409);
 const state=globalThis.__execution;state.settings=[{key:INITIAL_REVIEW_KEY,revision:1,value:{value:initialReviewValue(initialTrackerReview(state.items,state.tables,'now',[]),[])}}];
 const res=await route.GET(request()),body=await res.json();assert.equal(res.status,200);assert.equal(body.status,'prepared');assert.equal(body.writeEnabled,false);
 assert.equal(body.operations,1);assert.equal(body.records,1);assert.equal(body.byKind.fields,1);assert.match(res.headers.get('cache-control'),/no-store/);
 assert.equal(JSON.stringify(body).includes('private-note'),false);assert.equal(JSON.stringify(body).includes('Abandoned'),false);
 assert.equal(state.calls.some(c=>c!=='cdl_v14_my_libraries'&&c!=='read-app'&&c!=='read-tracker'),false);
});
test('POST stages only the exact freshly recompiled plan; input, origin and strict read-only checks precede writes',async()=>{
 const s=globalThis.__execution;s.calls=[];
 const ready=await (await route.GET(request())).json();
 const body={libraryId:library,requestId:'33333333-3333-4333-8333-333333333333',fingerprint:ready.fingerprint};
 const post=(data=body,headers={})=>new Request('http://localhost:3014/v14/api/sync-execution',{method:'POST',headers:{origin:'http://localhost:3014','content-type':'application/json',...headers},body:JSON.stringify(data)});
 assert.equal((await route.POST(post({...body,fingerprint:'f'.repeat(64)}))).status,409);
 assert.equal((await route.POST(post({...body,rows:[]}))).status,400);
 assert.equal((await route.POST(post(body,{origin:'https://other.example'}))).status,403);
 assert.equal((await route.POST(post({...body,padding:'x'.repeat(3000)}))).status,413);
 process.env.CDL_V14_VALIDATION_READ_ONLY='true';process.env.CDL_V14_REVIEW_ONLY='false';assert.equal((await route.POST(post())).status,403);
 delete process.env.CDL_V14_VALIDATION_READ_ONLY;delete process.env.CDL_V14_REVIEW_ONLY;
 assert.equal(s.calls.includes('stage'),false);
 const response=await route.POST(post());assert.equal(response.status,200);assert.equal((await response.json()).writeEnabled,false);assert.equal(s.calls.filter(c=>c==='stage').length,1);
});
test('invalid input, duplicated parameters, cross-origin, anonymous and foreign-library calls are rejected before data reads',async()=>{
 const s=globalThis.__execution;s.calls=[];
 assert.equal((await route.GET(request(''))).status,400);assert.equal((await route.GET(request('libraryId='+library+'&libraryId='+library))).status,400);
 assert.equal((await route.GET(request(undefined,{origin:'https://foreign.test'}))).status,403);
 s.user=false;assert.equal((await route.GET(request())).status,401);s.user=true;s.owned=false;assert.equal((await route.GET(request())).status,404);s.owned=true;
 assert.equal(s.calls.includes('read-tracker'),false);
});
test('subsequent read failure or changed values cannot reuse the previous prepared plan',async()=>{
 const s=globalThis.__execution;s.failed=true;let res=await route.GET(request());assert.equal(res.status,503);assert.equal(JSON.stringify(await res.json()).includes('secret'),false);
 s.failed=false;s.items[0].user_status='Started';res=await route.GET(request());assert.equal(res.status,409);
});
test('initial execution preparation closes after confirmed baselines exist',async()=>{
 const s=globalThis.__execution;s.hasBaseline=true;s.calls=[];
 assert.equal((await route.GET(request())).status,409);assert.equal(s.calls.includes('read-tracker'),false);s.hasBaseline=false;
});
