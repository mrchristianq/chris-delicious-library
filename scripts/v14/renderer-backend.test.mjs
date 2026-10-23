import test from 'node:test';
import assert from 'node:assert/strict';
import {manualOrderSettings,saveManualOrder} from '../../app/lib/v14/manual-order.ts';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(s,c,n){return n(s.startsWith('./') && c.parentURL?.includes('/app/lib/v14/') && !s.endsWith('.ts') ? `${s}.ts` : s,c);}});
const {createRendererBackend}=await import('../../app/lib/v14/renderer-backend.ts');
const {retainDatabaseIdentity}=await import('../../app/lib/v14/renderer-snapshot.ts');
hooks.deregister();
const owner='11111111-1111-4111-8111-111111111111';
const library='22222222-2222-4222-8222-222222222222';
const id='33333333-3333-4333-8333-333333333333';
function fixture(){return {schema_version:1,library_id:library,owner_id:owner,observed_at:'2026-10-13T12:00:00Z',change_token:'test',complete:true,counts:{items:1,episodes:0,settings:0},items:[{id,library_id:library,media_type:'book',title:'Book',revision:1,user_status:'Collection',personal_rating:0,completed_on:null,notes:'',user_fields:{},metadata:{}}],episodes:[],settings:[]};}
test('season artwork survives metadata save and reload without sending watched progress',async()=>{
 const snapshot=fixture();snapshot.items[0].media_type='tv';snapshot.items[0].user_status='Started';snapshot.items[0].metadata={TMDB_ID:'275139'};
 const metadata={SeasonTitle:'Season 1',SeasonPosterURL:'https://image.tmdb.org/t/p/w500/season-fixture.jpg',EpisodeTitle:'Pilot'};
 const episodeId='44444444-4444-4444-8444-444444444444';
 const backend=createRendererBackend(library,owner,async(url,options)=>{
  if(options.method==='POST'){
   const command=JSON.parse(options.body);assert.equal(command.kind,'episode_metadata');
   assert.deepEqual(command.rows[0].metadata,metadata);
   assert.equal(Object.hasOwn(command.rows[0].metadata,'Watched'),false);
   snapshot.episodes=[{id:episodeId,library_id:library,show_id:id,season_number:1,episode_number:1,provider_id:'123',metadata,progress:{watched:true,watched_at:'2026-10-01T12:00:00Z',revision:4}}];
   snapshot.counts.episodes=1;
   return Response.json({confirmed:true,snapshot});
  }
  return Response.json(snapshot);
 });
 const initial=await backend.load(new AbortController().signal);
 const show=retainDatabaseIdentity({title:'Show'},initial.shows[0]);
 const saved=await backend.episodeMetadata(show,[{SeasonNumber:'1',EpisodeNumber:'1',EpisodeTMDB_ID:'123',...metadata,Watched:'false',WatchedAt:''}]);
 for(const rows of [saved,(await backend.load(new AbortController().signal)).episodes]){
  assert.equal(rows[0].SeasonPosterURL,metadata.SeasonPosterURL);
  assert.equal(rows[0].SeasonTitle,'Season 1');assert.equal(rows[0].Watched,'true');
 }
});
test('server-started snapshot is consumed once; subsequent refresh is fresh and uncached',async()=>{
 let calls=0;
 const fresh=fixture();fresh.items[0].title='Updated';fresh.items[0].revision=2;
 const backend=createRendererBackend(library,owner,async(url,options)=>{
  calls++;assert.equal(options.cache,'no-store');return Response.json(fresh);
 },Promise.resolve({snapshot:fixture()}));
 const first=await backend.load(new AbortController().signal);
 assert.equal(first.books[0].Title,'Book');assert.equal(calls,0);
 const second=await backend.load(new AbortController().signal);
 assert.equal(second.books[0].Title,'Updated');assert.equal(calls,1);
});
test('startup never admits wrong owner, partial data or failed reads',async()=>{
 for(const result of [{error:'Fresh read failed'},{snapshot:{...fixture(),owner_id:library}},{snapshot:{...fixture(),complete:false}}]){
  let calls=0;
  const backend=createRendererBackend(library,owner,async()=>{calls++;return Response.json(fixture());},Promise.resolve(result));
  await assert.rejects(backend.load(new AbortController().signal));assert.equal(calls,0);
  await backend.load(new AbortController().signal);assert.equal(calls,1);
 }
});
test('cancelled startup cannot replace a subsequent fresh read',async()=>{
 let resolve;
 const initial=new Promise(r=>{resolve=r;});
 const backend=createRendererBackend(library,owner,async()=>Response.json(fixture()),initial);
 const controller=new AbortController();
 const loading=backend.load(controller.signal);
 await new Promise(r=>setImmediate(r));controller.abort();
 resolve({snapshot:fixture()});await assert.rejects(loading,/cancelled/);
 await backend.load(new AbortController().signal);
});
function harness(){
 const state={snapshot:fixture(),commands:[],failNext:false};
 const backend=createRendererBackend(library,owner,async(url,options)=>{
  assert.ok(url.startsWith('/v14/api/library'));
  assert.equal(options.cache,'no-store');
  if(options.method!=='POST')return Response.json(state.snapshot);
  const command=JSON.parse(options.body);state.commands.push(command);
  if(state.failNext){state.failNext=false;throw new Error('Simulated timeout');}
  if(command.kind==='setting'){
   const current=state.snapshot.settings.find(s=>s.key===command.key);
   assert.equal(command.revision,current?.revision??null);
   state.snapshot.settings=state.snapshot.settings.filter(s=>s.key!==command.key).concat({key:command.key,revision:(command.revision??0)+1,value:{value:command.value}});
   state.snapshot.counts.settings=state.snapshot.settings.length;
   return Response.json({confirmed:true,snapshot:state.snapshot});
  }
  const item={...state.snapshot.items[0],...command.patch,revision:command.revision+1};
  return Response.json({confirmed:true,item});
 });
 return {state,backend};
}
test('manual order persists database keys and survives rename plus a fresh backend instance',async()=>{
 const {state,backend}=harness();
 state.snapshot.items[0].metadata={Title:'Book',Type:'Physical'};
 state.snapshot.settings=[{key:'viewManualOrder:wishlist-books',revision:1,value:{value:'["book:book:physical"]'}}];
 state.snapshot.counts.settings=1;
 const loaded=await backend.load(new AbortController().signal);
 const order=loaded.settings[0].Value;
 assert.equal(order,JSON.stringify([`book:db:${library}:${id}`]));
 await backend.write('',{key:'viewManualOrder:wishlist-books',value:order});
 state.snapshot.items[0].title='Renamed';state.snapshot.items[0].revision=2;
 state.snapshot.items[0].user_fields={Type:'eBook'};
 const reopened=createRendererBackend(library,owner,async()=>Response.json(state.snapshot));
 const next=await reopened.load(new AbortController().signal);
 assert.equal(next.settings[0].Value,order);
 assert.equal(state.commands[0].revision,1);
 assert.equal(state.commands[0].value,order);
});
test('manual-order group rejects partial sort failure and retries the retained backend command',async()=>{
 const {state,backend}=harness();await backend.load(new AbortController().signal);
 const settings=manualOrderSettings('watchlist-movies',['movie:db:library:first','movie:db:library:second']);
 let fail=true;
 const write=async(key,value)=>{
  if(fail && key==='viewSortField:watchlist-movies'){state.failNext=true;fail=false;}
  return backend.write('',{key,value});
 };
 await assert.rejects(saveManualOrder(write,settings),/timeout/);
 assert.equal(state.snapshot.settings.length,1,'partial operation must not be represented as all three saved');
 await saveManualOrder(write,settings);
 const sortCommands=state.commands.filter(command=>command.key==='viewSortField:watchlist-movies');
 assert.equal(sortCommands.length,2);assert.deepEqual(sortCommands[0],sortCommands[1]);
 const reopened=await backend.load(new AbortController().signal);
 for(const setting of settings) assert.equal(reopened.settings.find(row=>row.Key===setting.key).Value,setting.value);
});
test('identity survives existing parser output and edits keep the opened revision',async()=>{
 const {state,backend}=harness();const rows=await backend.load(new AbortController().signal);
 const item=retainDatabaseIdentity({title:'Book'},rows.books[0]);
 assert.equal(item.__cdlIdentity.itemId,id);
 state.snapshot.items[0].revision=2;await backend.load(new AbortController().signal);
 await backend.edit(item,{notes:'Review'});
 assert.equal(state.commands[0].revision,1);
});
test('timed-out edits retry the same immutable request',async()=>{
 const {state,backend}=harness();const rows=await backend.load(new AbortController().signal);
 const item=retainDatabaseIdentity({title:'Book'},rows.books[0]);
 state.failNext=true;await assert.rejects(backend.edit(item,{notes:'Review'}),/timeout/);
 await backend.edit(item,{notes:'Review'});
 assert.deepEqual(state.commands[0],state.commands[1]);
});
test('rapid different preference saves use each confirmed revision',async()=>{
 const {state,backend}=harness();await backend.load(new AbortController().signal);
 await Promise.all([backend.write('',{key:'theme',value:'dark'}),backend.write('',{key:'theme',value:'light'})]);
 assert.deepEqual(state.commands.map(c=>c.revision),[null,1]);
 assert.equal(state.snapshot.settings[0].value.value,'light');
});
test('double clicks share one active command',async()=>{
 const {state,backend}=harness();await backend.load(new AbortController().signal);
 await Promise.all([backend.write('',{key:'theme',value:'dark'}),backend.write('',{key:'theme',value:'dark'})]);
 assert.equal(state.commands.length,1);
});
test('new setting value first confirms the original failed command',async()=>{
 const {state,backend}=harness();await backend.load(new AbortController().signal);
 state.failNext=true;await assert.rejects(backend.write('',{key:'theme',value:'dark'}));
 await backend.write('',{key:'theme',value:'light'});
 assert.equal(state.commands.length,3);
 assert.deepEqual(state.commands[0],state.commands[1]);
 assert.equal(state.commands[2].revision,1);
});
test('foreign snapshots and unknown legacy writes fail closed',async()=>{
 const {state,backend}=harness();state.snapshot.owner_id=library;
 await assert.rejects(backend.load(new AbortController().signal),/owner/);
 await assert.rejects(backend.write('https://original-sheet.invalid',{action:'updateBook'}),/Unsupported/);
 assert.equal(state.commands.length,0);
});

test('icon reset persists an explicit blank and does not resurrect imported profile values',async()=>{
 const {state,backend}=harness();
 state.snapshot.settings=[{key:'statusIcon:pending-release',revision:3,value:{value:'https://images.invalid/old.png',legacy_profiles:{general_getSetting:'https://images.invalid/older.png'}}}];
 state.snapshot.counts.settings=1;
 await backend.load(new AbortController().signal);
 const result=JSON.parse(await backend.write('',{key:'statusIcon:pending-release',value:''}));
 assert.equal(result.settings[0].Value,'');assert.equal(result.settings[0].__cdlGeneralValue,'');
 const reopened=await backend.load(new AbortController().signal);
 assert.equal(reopened.settings[0].Value,'');assert.equal(state.commands[0].revision,3);
});
test('failed icon resets reject and retry the same command before reporting confirmation',async()=>{
 const {state,backend}=harness();await backend.load(new AbortController().signal);
 state.failNext=true;
 await assert.rejects(backend.write('',{key:'statusIcon:completed',value:''}),/timeout/);
 const result=JSON.parse(await backend.write('',{key:'statusIcon:completed',value:''}));
 assert.equal(result.settings[0].Value,'');assert.deepEqual(state.commands[0],state.commands[1]);
});

function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
function artworkHarness({holdUpload=false,timeoutAfterCommit=false,failUpload=false}={}) {
 const snapshot=fixture();const uploads=[];const commands=[];const receipts=new Map();
 const started=deferred();const release=deferred();
 const backend=createRendererBackend(library,owner,async(url,options)=>{
  if(url==='/v14/api/artwork'){
   uploads.push(options.body);started.resolve();if(holdUpload)await release.promise;
   if(failUpload){failUpload=false;return Response.json({error:'Upload rejected'},{status:502});}
   return Response.json({ok:true,url:'https://r2.invalid/new-cover.jpg'});
  }
  if(options.method!=='POST')return Response.json(snapshot);
  const command=JSON.parse(options.body);commands.push(command);
  if(!receipts.has(command.requestId)){
   const current=snapshot.items[0];
   if(command.revision!==current.revision)return Response.json({error:'Item changed elsewhere'},{status:409});
   snapshot.items[0]={...current,user_fields:{...current.user_fields,...command.patch.overrides},revision:current.revision+1};
   receipts.set(command.requestId,structuredClone({confirmed:true,item:snapshot.items[0]}));
  }
  if(timeoutAfterCommit){timeoutAfterCommit=false;throw new Error('Timeout after artwork association');}
  return Response.json(receipts.get(command.requestId));
 });
 return {backend,snapshot,uploads,commands,receipts,started,release};
}
test('double-clicked artwork shares the upload as well as the association command',async()=>{
 const h=artworkHarness({holdUpload:true});const rows=await h.backend.load(new AbortController().signal);
 const original=retainDatabaseIdentity({title:'Book'},rows.books[0]);
 const first=h.backend.artwork(original,'https://provider.invalid/cover.jpg','cover');await h.started.promise;
 const second=h.backend.artwork(original,'https://provider.invalid/cover.jpg','cover');
 await new Promise(resolve=>setImmediate(resolve));h.release.resolve();
 const results=await Promise.all([first,second]);
 assert.equal(h.uploads.length,1);assert.equal(h.commands.length,1);assert.equal(h.receipts.size,1);
 assert.equal(results[0].R2CoverUrl,results[1].R2CoverUrl);
});
test('artwork timeout after commit retries the original request without re-uploading',async()=>{
 const h=artworkHarness({timeoutAfterCommit:true});const rows=await h.backend.load(new AbortController().signal);
 const original=retainDatabaseIdentity({title:'Book'},rows.books[0]);
 await assert.rejects(h.backend.artwork(original,'https://provider.invalid/cover.jpg','cover'),/Timeout/);
 const confirmed=await h.backend.artwork(original,'https://provider.invalid/cover.jpg','cover');
 assert.equal(confirmed.R2CoverUrl,'https://r2.invalid/new-cover.jpg');
 assert.equal(h.uploads.length,1);assert.deepEqual(h.commands[0],h.commands[1]);assert.equal(h.receipts.size,1);
 const reopened=await h.backend.load(new AbortController().signal);
 assert.equal(reopened.books[0].R2CoverUrl,confirmed.R2CoverUrl);
});
test('failed artwork upload changes no item and a retry can upload successfully',async()=>{
 const h=artworkHarness({failUpload:true});const rows=await h.backend.load(new AbortController().signal);
 const original=retainDatabaseIdentity({title:'Book'},rows.books[0]);
 await assert.rejects(h.backend.artwork(original,'https://provider.invalid/cover.jpg','cover'),/Upload rejected/);
 assert.equal(h.commands.length,0);assert.equal(h.snapshot.items[0].revision,1);
 const confirmed=await h.backend.artwork(original,'https://provider.invalid/cover.jpg','cover');
 assert.equal(confirmed.R2CoverUrl,'https://r2.invalid/new-cover.jpg');assert.equal(h.uploads.length,2);assert.equal(h.commands.length,1);
});
test('a no-op editor confirmation waits for a pending mutation and rejects its stale revision',async()=>{
 const snapshot=fixture();const started=deferred();const release=deferred();let reads=0;
 const backend=createRendererBackend(library,owner,async(_url,options)=>{
  if(options.method!=='POST'){reads++;return Response.json(snapshot);}
  const command=JSON.parse(options.body);started.resolve();await release.promise;
  snapshot.items[0]={...snapshot.items[0],...command.patch,revision:2};
  return Response.json({confirmed:true,item:snapshot.items[0]});
 });
 const loaded=await backend.load(new AbortController().signal);
 const original=retainDatabaseIdentity({title:'Book'},loaded.books[0]);
 const saving=backend.edit(original,{notes:'updated'});await started.promise;
 const noOp=backend.edit(original,{notes:''});
 // Attach rejection handling before releasing the pending request.
 const checked=assert.rejects(noOp,/changed elsewhere/);
 await new Promise(resolve=>setImmediate(resolve));
 const prematureReads=reads;
 release.resolve();await saving;
 assert.equal(prematureReads,1,'no-op read raced the pending save');
 await checked;
});
test('smart-list save, rename, reorder and delete preserve unrelated settings and reload confirmed definitions',async()=>{
 const {state,backend}=harness();
 state.snapshot.settings=[{key:'smartListManualOrder:first',revision:1,value:{value:'["book:a"]'}},{key:'theme',revision:1,value:{value:'dark'}}];state.snapshot.counts.settings=2;
 await backend.load(new AbortController().signal);
 const first={id:'first',name:'First',mediaTypes:['book']},second={id:'second',name:'Second',mediaTypes:['game']};
 for(const definitions of [[first,second],[{...first,name:'Renamed'},second],[second,{...first,name:'Renamed'}],[second]]){
  const result=JSON.parse(await backend.write('',{key:'smartLists:v1',value:JSON.stringify(definitions)}));
  assert.deepEqual(JSON.parse(result.settings.find(row=>row.Key==='smartLists:v1').Value),definitions);
  const reopened=await backend.load(new AbortController().signal);
  assert.deepEqual(JSON.parse(reopened.settings.find(row=>row.Key==='smartLists:v1').Value),definitions);
 }
 assert.deepEqual(state.commands.map(command=>command.revision),[null,1,2,3]);
 assert.equal(state.snapshot.settings.find(row=>row.key==='theme').value.value,'dark');
 assert.equal(state.snapshot.settings.find(row=>row.key==='smartListManualOrder:first').value.value,'["book:a"]');
});

test('a smart-list timeout after commit retries the same request without creating a second definition',async()=>{
 const snapshot=fixture();const receipts=new Map();const commands=[];let timeout=true;
 const backend=createRendererBackend(library,owner,async(_url,options)=>{
  if(options.method!=='POST')return Response.json(snapshot);
  const command=JSON.parse(options.body);commands.push(command);
  if(!receipts.has(command.requestId)){
   snapshot.settings=[{key:command.key,revision:(command.revision??0)+1,value:{value:command.value}}];snapshot.counts.settings=1;
   receipts.set(command.requestId,structuredClone({confirmed:true,snapshot}));
  }
  if(timeout){timeout=false;throw new Error('Timeout after commit');}
  return Response.json(receipts.get(command.requestId));
 });
 await backend.load(new AbortController().signal);
 const value=JSON.stringify([{id:'stable-draft-id',name:'Books',mediaTypes:['book']}]);
 await assert.rejects(backend.write('',{key:'smartLists:v1',value}),/Timeout/);
 const retry=JSON.parse(await backend.write('',{key:'smartLists:v1',value}));
 assert.deepEqual(commands[0],commands[1]);assert.equal(receipts.size,1);
 assert.equal(JSON.parse(retry.settings[0].Value).length,1);
});

test('a refresh waits for a pending save and cannot restore the older setting revision',async()=>{
 const snapshot=fixture();const started=deferred();const release=deferred();const commands=[];let reads=0;
 const backend=createRendererBackend(library,owner,async(_url,options)=>{
  if(options.method!=='POST'){reads++;return Response.json(snapshot);}
  const command=JSON.parse(options.body);commands.push(command);
  if(commands.length===1){started.resolve();await release.promise;}
  snapshot.settings=[{key:'theme',revision:(command.revision??0)+1,value:{value:command.value}}];
  snapshot.counts.settings=1;
  return Response.json({confirmed:true,snapshot});
 });
 await backend.load(new AbortController().signal);
 const saving=backend.write('',{key:'theme',value:'dark'});await started.promise;
 const refreshing=backend.load(new AbortController().signal);
 await new Promise(resolve=>setImmediate(resolve));assert.equal(reads,1);
 release.resolve();await saving;await refreshing;
 await backend.write('',{key:'theme',value:'light'});
 assert.deepEqual(commands.map(command=>command.revision),[null,1]);
 assert.equal(reads,2);
});
test('a save waits for an older refresh; cancellation does not block later saves',async()=>{
 const snapshot=fixture();const started=deferred();const release=deferred();let reads=0;const commands=[];
 const backend=createRendererBackend(library,owner,async(_url,options)=>{
  if(options.method!=='POST'){
   reads++;const response=Response.json(snapshot);
   if(reads===2){started.resolve();await release.promise;}
   return response;
  }
  const command=JSON.parse(options.body);commands.push(command);
  snapshot.settings=[{key:'theme',revision:(command.revision??0)+1,value:{value:command.value}}];snapshot.counts.settings=1;
  return Response.json({confirmed:true,snapshot});
 });
 await backend.load(new AbortController().signal);
 const refreshing=backend.load(new AbortController().signal);await started.promise;
 const cancelled=new AbortController();const cancelledRead=backend.load(cancelled.signal);
 const rejection=assert.rejects(cancelledRead,/abort/i);cancelled.abort();
 const saving=backend.write('',{key:'theme',value:'dark'});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(commands.length,0);
 release.resolve();await refreshing;await rejection;await saving;
 assert.equal(reads,2);assert.equal(commands.length,1);
 await backend.write('',{key:'theme',value:'light'});
 assert.deepEqual(commands.map(command=>command.revision),[null,1]);
});
