import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const library='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',requestId='33333333-3333-4333-8333-333333333333';
globalThis.__review={user:true,allowed:true,reads:0,writes:[],row:{id:'fixture',itemId:id,title:'Fixture',media:'game',field:'Status',label:'Status',app:'Abandoned',tracker:'Completed',direction:'review',resolutionAllowed:true}};
const hook=registerHooks({resolve(s,c,n){
 if(s.endsWith('/tracker-identity-readiness'))return {url:'file:///review-identity-readiness.mjs',shortCircuit:true};
 if(s.endsWith('/tracker-new-decisions'))return {url:'file:///review-new-decisions.mjs',shortCircuit:true};
 if(s.endsWith('/tracker-mixed-server'))return {url:'file:///review-run-context.mjs',shortCircuit:true};
 if(s.endsWith('/tracker-three-way'))return {url:'file:///review-three-way.mjs',shortCircuit:true};
 if(s.endsWith('/tracker-baseline-read'))return {url:'file:///review-baselines.mjs',shortCircuit:true};
 if(s.endsWith('/tracker-mapped-review'))s=s.replace('/tracker-mapped-review','/tracker-reconcile');
 for(const name of ['tracker-provenance','config','server','tracker-read-server','read-library-server','tracker-reconcile','save-setting-server'])if(s.endsWith('/'+name))return {url:`file:///review-${name}.mjs`,shortCircuit:true};
 return n(s.endsWith('/tracker-decisions')||s.endsWith('/tracker-identity-readiness')||s.endsWith('/tracker-identity-review')||s.endsWith('/tracker-conflict-decisions')||s.endsWith('/tracker-identity-decisions')||(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts'))?s+'.ts':s,c);
},load(u,c,n){const sources={
 'identity-readiness':"export const identityReadiness=()=>({ready:false,reason:'Identity safety checks not installed'});",
 'new-decisions':"export const attachNewItemDecisions=p=>p;export const newItemDecisionKey=()=>'';export const newItemDecisionValue=()=>'';",
 'run-context':"export const readMixedContext=async()=>({activePlan:globalThis.__review.activePlan??null});",
 'baselines':"export const readTrackerBaselineState=async()=>globalThis.__review.baseline??(globalThis.__review.hasBaseline?{}:null);",
 'three-way':"export const previewTrackerThreeWay=()=>({comparisonMode:'three-way',changes:[globalThis.__review.row]});export const attachTrackerDisplay=p=>p;",
 'tracker-provenance':"export const readTrackerProvenance=async()=>[];",
 'config':`export const getV14Config=()=>({origin:'http://localhost:3014'});`,
 'server':`export const createV14Client=async()=>({auth:{getUser:async()=>({data:{user:globalThis.__review.user?{id:'owner'}:null}})},rpc:async()=>({data:globalThis.__review.allowed?[{id:'${library}'}]:[]})});`,
 'tracker-read-server':`export const readTrackerConnection=async()=>{globalThis.__review.reads++;return {tables:globalThis.__review.tables??[],observedAt:'now'};};`,
 'read-library-server':`export const readV14LibraryForVerifiedOwner=async()=>({items:globalThis.__review.items??[],settings:[]});`,
 'tracker-reconcile':`export const initialTrackerReview=()=>({status:'initial-review',identityIssues:0,changes:[globalThis.__review.row]});`,
 'save-setting-server':`export const saveV14Setting=async(...args)=>{globalThis.__review.writes.push(args);if(globalThis.__review.fail)throw new Error('private readback mismatch');return {confirmed:true};};`,
 };for(const [key,source] of Object.entries(sources))if(u===`file:///review-${key}.mjs`)return {format:'module',shortCircuit:true,source};return n(u,c);}});
const {POST}=await import('../../app/v14/api/sync-review/route.ts');
const {decisionToken,initialReviewToken,INITIAL_REVIEW_KEY}=await import('../../app/lib/v14/tracker-decisions.ts');hook.deregister();
const {attachTrackerIdentityDecisions}=await import('../../app/lib/v14/tracker-identity-decisions.ts');
const conflictHook=registerHooks({resolve(s,c,n){return n(s==='./tracker-read'?s+'.ts':s,c);}});
const {conflictDecisionToken}=await import('../../app/lib/v14/tracker-conflict-decisions.ts');conflictHook.deregister();
const command=()=>({libraryId:library,changeId:'fixture',token:decisionToken(globalThis.__review.row),side:'app',revision:null,requestId});
const req=(body=command(),headers={})=>new Request('http://localhost:3014/v14/api/sync-review',{method:'POST',headers:{origin:'http://localhost:3014','content-type':'application/json',...headers},body:JSON.stringify(body)});
test('save requires strict same-origin bounded input and owner authorization before tracker reads',async()=>{
 assert.equal((await POST(req(undefined,{origin:'https://other.example'}))).status,403);
 assert.equal((await POST(req({...command(),extra:'forbidden'}))).status,400);
 assert.equal((await POST(req({...command(),token:'bad'}))).status,400);
 assert.equal((await POST(req({...command(),changeId:'x'.repeat(5000)}))).status,413);
 globalThis.__review.user=false;assert.equal((await POST(req())).status,401);globalThis.__review.user=true;
 globalThis.__review.allowed=false;assert.equal((await POST(req())).status,404);globalThis.__review.allowed=true;
 assert.equal(globalThis.__review.reads,0);assert.equal(globalThis.__review.writes.length,0);
});
test('fresh fingerprint and safe identity are required; only a review setting is written',async()=>{
 assert.equal((await POST(req({...command(),token:'a'.repeat(64)}))).status,409);
 globalThis.__review.row.resolutionAllowed=false;assert.equal((await POST(req())).status,409);globalThis.__review.row.resolutionAllowed=true;
 const response=await POST(req());assert.equal(response.status,200);assert.equal((await response.json()).confirmed,true);
 const [savedLibrary,key,revision,savedRequest,value]=globalThis.__review.writes.at(-1);
 assert.equal(savedLibrary,library);assert.match(key,/^__cdl_tracker_review_v1:[a-f0-9]{64}$/);assert.equal(revision,null);assert.equal(savedRequest,requestId);assert.equal(JSON.parse(value).side,'app');
 globalThis.__review.fail=true;const failed=await POST(req());assert.equal(failed.status,503);assert.equal(JSON.stringify(await failed.json()).includes('private readback'),false);globalThis.__review.fail=false;
});
test('readonly sessions block decisions; review-only explicitly admits them without permitting data sync',async()=>{
 process.env.CDL_V14_VALIDATION_READ_ONLY='true';delete process.env.CDL_V14_REVIEW_ONLY;
 assert.equal((await POST(req())).status,403);
 process.env.CDL_V14_REVIEW_ONLY='true';assert.equal((await POST(req({...command(),side:'clear'}))).status,200);
 delete process.env.CDL_V14_VALIDATION_READ_ONLY;delete process.env.CDL_V14_REVIEW_ONLY;
});
test('initial approval saves one preference after fresh validation, never field values',async()=>{
 const p={status:'initial-review',identityIssues:0,changes:[globalThis.__review.row]};
 const body={kind:'keep-app-review',libraryId:library,requestId,revision:null,token:initialReviewToken(p,[])};
 assert.equal((await POST(req({...body,token:'0'.repeat(64)}))).status,409);
 const response=await POST(req(body));assert.equal(response.status,200);assert.equal((await response.json()).cleared,false);
 const write=globalThis.__review.writes.at(-1);assert.equal(write[1],INITIAL_REVIEW_KEY);assert.equal(JSON.parse(write[4]).entries.length,1);
 assert.equal(write[4].includes('Abandoned'),false);
 assert.equal((await POST(req({...body,kind:'clear-initial-review'}))).status,200);
 assert.equal(JSON.parse(globalThis.__review.writes.at(-1)[4]).entries.length,0);
 globalThis.__review.fail=true;assert.equal((await POST(req(body))).status,503);globalThis.__review.fail=false;
});
test('initial decisions cannot be reopened after confirmed baselines exist',async()=>{
 const s=globalThis.__review,before=s.writes.length;s.hasBaseline=true;
 assert.equal((await POST(req({kind:'keep-app-review',libraryId:library,requestId,revision:null,token:'a'.repeat(64)}))).status,409);assert.equal(s.writes.length,before);s.hasBaseline=false;
});
test('field choices save an independently confirmed scoped preference; changed direction requires its own token',async()=>{
 const s=globalThis.__review;s.row={...s.row,direction:'conflict',baseline:'Started'};
 s.items=[{id,library_id:library,media_type:'game',revision:1}];s.baseline={ownerId:'owner',libraryId:library,targetId:requestId,sheetId:'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0',lastConfirmedSync:'now',columns:{},records:[]};
 const token=conflictDecisionToken(s.row,s.items[0],s.baseline),body={...command(),token};
 assert.equal((await POST(req({...body,token:'f'.repeat(64)}))).status,409);
 const before=s.writes.length,response=await POST(req(body));assert.equal(response.status,200);assert.equal((await response.json()).confirmed,true);assert.equal(s.writes.length,before+1);assert.match(s.writes.at(-1)[1],/^__cdl_tracker_conflict_v1:/);assert.equal(JSON.parse(s.writes.at(-1)[4]).side,'app');
 s.items[0].revision++;assert.equal((await POST(req(body))).status,409);s.items[0].revision--;
 s.row.direction='import';assert.equal((await POST(req(body))).status,409);
 const oneSided={...body,token:conflictDecisionToken(s.row,s.items[0],s.baseline)};assert.equal((await POST(req(oneSided))).status,200);
 s.row.direction='conflict';
 s.fail=true;assert.equal((await POST(req(body))).status,503);s.fail=false;
 delete s.baseline;delete s.items;
});
test('an active saved run refuses new choices before reading or writing compared values',async()=>{
 const s=globalThis.__review;s.hasBaseline=true;s.activePlan='a'.repeat(64);const before=s.writes.length,reads=s.reads;
 assert.equal((await POST(req())).status,409);assert.equal(s.writes.length,before);assert.equal(s.reads,reads);s.activePlan=null;s.hasBaseline=false;
});
test('identity review stores only checked intent, with no Apply or library mutation',async()=>{
 const s=globalThis.__review,previous={row:s.row,items:s.items,baseline:s.baseline};
 s.baseline={ownerId:'owner',libraryId:library,records:[],columns:{}};s.items=[];
 s.row={id:'fixture',itemId:'unmatched',title:'Fixture',media:'game',field:'identity',direction:'review',resolutionAllowed:false,identitySelection:{token:'a'.repeat(64),revision:null,fields:['Platform','Status']}};
 const body={kind:'identity-review',libraryId:library,changeId:'fixture',token:'a'.repeat(64),choice:{mode:'same',fields:{Platform:'tracker'}},revision:null,requestId};
 const before=s.writes.length,ok=await POST(req(body));assert.equal(ok.status,200);const result=await ok.json();assert.equal(result.applied,false);assert.equal(result.confirmed,true);assert.deepEqual(result.choice,body.choice);
 assert.equal(s.writes.length,before+1);assert.match(s.writes.at(-1)[1],/^__cdl_tracker_identity_review_v1:/);
 assert.equal((await POST(req({...body,token:'b'.repeat(64)}))).status,409);
 assert.equal((await POST(req({...body,choice:{mode:'same',fields:{Notes:'tracker'}}}))).status,400);
 assert.equal((await POST(req({...body,patch:{title:'Injected'}}))).status,400);
 assert.equal(s.writes.length,before+1);
 Object.assign(s,previous);if(previous.baseline===undefined)delete s.baseline;if(previous.items===undefined)delete s.items;
});
test('addition approvals use their own scoped namespace, refuse tracker-side intent and invalidate changed items',async()=>{
 const s=globalThis.__review;s.row={id:'fixture',itemId:id,title:'Fixture',media:'game',field:'identity',label:'New app item',app:'Add this item',tracker:'Not present',direction:'review',plannedAction:'add-record',resolutionAllowed:false};
 s.items=[{id,library_id:library,media_type:'game',title:'Fixture',revision:1,user_status:'Wishlist',personal_rating:null,completed_on:null,notes:'PRIVATE',metadata:{IGDB_ID:'123'},user_fields:{Platform:'Steam'}}];
 s.tables=[{name:'Games',headers:['Title','Platform','IGDB_ID'],rows:[]}];s.baseline={ownerId:'owner',libraryId:library,targetId:requestId,sheetId:'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0',lastConfirmedSync:'now',columns:{Games:s.tables[0].headers},records:[]};
 const row=attachTrackerIdentityDecisions({comparisonMode:'three-way',changes:[s.row]},s.items,[],s.baseline,s.tables).changes[0],body={...command(),token:row.decisionToken};
 const before=s.writes.length;assert.equal((await POST(req({...body,side:'tracker'}))).status,409);assert.equal(s.writes.length,before);
 assert.equal((await POST(req(body))).status,200);assert.match(s.writes.at(-1)[1],/^__cdl_tracker_identity_v1:/);assert.equal(s.writes.at(-1)[4].includes('PRIVATE'),false);
 s.items[0].revision++;assert.equal((await POST(req(body))).status,409);delete s.baseline;delete s.items;delete s.tables;
});
