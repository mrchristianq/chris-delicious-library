// Explicit, pinned, recoverable acceptance fixtures. Never edits existing media.
import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';import {resolve} from 'node:path';import assert from 'node:assert/strict';
import {writer,rpc,root,library} from './execute-initial-tracker.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {readLibrary}=await import('../../app/lib/v14/read-library.ts');
const {prepareCreate,createItem}=await import('../../app/lib/v14/create-item.ts');
const {readTrackerConnection,loadPrivateTrackerCredentials}=await import('../../app/lib/v14/tracker-read-server.ts');
const {TRACKER_ID}=await import('../../app/lib/v14/tracker-read.ts');
const {buildInitialTrackerBaseline}=await import('../../app/lib/v14/tracker-baseline.ts');
const {compileTrackerWriteSteps}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {writeTrackerPreparedBatch}=await import('../../app/lib/v14/tracker-write-server.ts');
const {saveTrackerRecoverySnapshot}=await import('../../app/lib/v14/tracker-recovery-server.ts');
const {saveSetting}=await import('../../app/lib/v14/save-setting.ts');
const {projectLegacyRow}=await import('../../app/lib/v14/legacy-row.ts');
const {JWT}=await import('google-auth-library');h.deregister();
const action=process.argv[2],config=process.argv[3];if(!['inspect','create','seed','verify','cleanup'].includes(action)||process.argv.length!==4||!config?.startsWith('/')||readFileSync(resolve(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Explicit fixture action and pinned private test configuration required');
process.env.CDL_V14_TEST='true';process.env.CDL_V14_TRACKER_CONFIG_FILE=config;delete process.env.CDL_V14_TRACKER_WRITE_TARGET;
const medias=['game','tv','book','movie'],tabs={game:'Games',tv:'Shows',book:'Books',movie:'Movies'},ids=medias.map((_,n)=>`c14a0052-0000-4000-8000-00000000000${n+1}`),prefix='CDL v14 SYNC QA 14052 ',ledgerKey='__cdl_tracker_fixture_14052',q=s=>"'"+String(s).replaceAll("'","''")+"'",hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function query(sql){try{return JSON.parse(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}));}catch{throw new Error('Fixture database result not confirmed');}}
const original=()=>query(`select jsonb_build_object('items',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'')) from cdl.items r where not(id=any(array[${ids.map(q)}]::uuid[]))),'metadata',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.item_id)::text,'')) from cdl.item_metadata r where not(item_id=any(array[${ids.map(q)}]::uuid[]))),'episodes',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.episodes r),'progress',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.episode_progress r)) as data;`).rows[0].data;
const snap=()=>readLibrary(writer,library),read=id=>rpc(`public.cdl_v14_get_item(${q(id)}::uuid)`);
async function sources(){const [snapshot,connection]=await Promise.all([snap(),readTrackerConnection(true)]);if(!connection?.tables||!connection.grids)throw new Error('Fresh fixture source unavailable');return {snapshot,connection};}
function fixtures(snapshot){return ids.map((id,n)=>{const item=snapshot.items.find(i=>i.id===id);assert.ok(item&&(item.title===prefix+medias[n]||n===0&&item.title===prefix+'game renamed')&&item.media_type===medias[n]&&item.library_id===library&&item.notes==='TEMPORARY QA PRIVATE NOTES');return item;});}
let {snapshot,connection}=await sources(),setting=snapshot.settings.find(s=>s.key===ledgerKey),ledger=setting?JSON.parse(setting.value.value):null;
async function save(next){await saveSetting(writer,library,ledgerKey,setting?.revision??null,randomUUID(),JSON.stringify(next));snapshot=await snap();setting=snapshot.settings.find(s=>s.key===ledgerKey);assert.ok(setting);ledger=JSON.parse(setting.value.value);assert.deepEqual(ledger,next);}
async function backup(stage){const artifact=await saveTrackerRecoverySnapshot(hash(['fixture',ids,stage]),connection.grids);console.log(JSON.stringify({stage:'backup',purpose:stage,...artifact}));return artifact;}
if(action==='inspect'){
 console.log(JSON.stringify(fixtures(snapshot).map(item=>{const table=connection.tables.find(t=>t.name===tabs[item.media_type]),row=projectLegacyRow(item,library).row;let failure;try{compileTrackerWriteSteps([{id:item.id,itemId:item.id,media:item.media_type,field:'identity',kind:'add-record',comparisonToken:'diagnostic'}],snapshot.items,connection.tables,[]);}catch(e){failure=e.message;}return {media:item.media_type,missing:table.headers.filter(h=>!['Cover','Poster'].includes(h)&&!Object.hasOwn(row,h)),failure};})));
}else if(action==='create'){
 if(!ledger){assert.equal(snapshot.items.length,2337);assert.equal(query(`select count(*)::int as count from cdl.items where id=any(array[${ids.map(q)}]::uuid[]);`).rows[0].count,0);buildInitialTrackerBaseline(snapshot.items,connection.tables);await save({version:1,ids,stage:'creating',original:original(),backup:await backup('create')});}
 assert.equal(ledger.stage,'creating');assert.deepEqual(original(),ledger.original);
 for(let n=0;n<4;n++){
  const media=medias[n],values={title:prefix+media,notes:'TEMPORARY QA PRIVATE NOTES',myRating:media==='book'?'4':'8',...(media==='game'?{igdbId:'QA-14052-GAME',platform:'Steam',status:'Wishlist'}:media==='book'?{isbn:'QA-14052-BOOK',type:'Physical',status:'Backlog'}:{tmdbId:`QA-14052-${media.toUpperCase()}`,watchStatus:media==='tv'?'Pending Release':'Backlog'})};
  const input=prepareCreate(library,ids[n],`c14a0052-1000-4000-8000-00000000000${n+1}`,media,values,'2026-10-20');
  await createItem({authenticate:async()=>true,read:async id=>read(id),write:async i=>rpc(`public.cdl_v14_create_item(${q(library)}::uuid,${q(i.itemId)}::uuid,${q(i.requestId)}::uuid,${q(i.mediaType)},${q(JSON.stringify(i.patch))}::jsonb)`)},input);
 }
 fixtures(await snap());assert.deepEqual(original(),ledger.original);await save({...ledger,stage:'created'});console.log(JSON.stringify({stage:'created',fixtures:4,originalRecordsUnchanged:true,next:'Approve four additions in Sync, save checkpoint, apply and verify fresh readback.'}));
}else if(action==='seed'){
 assert.ok(ledger&&['created','seeding','sheet-dispatching','seeded'].includes(ledger.stage));const owned=fixtures(snapshot);if(ledger.stage==='created')buildInitialTrackerBaseline(snapshot.items,connection.tables);
 const plans=[];
 for(let n=0;n<4;n++){const item=owned[n],table=connection.tables.find(t=>t.name===tabs[item.media_type]),field=table.headers.find(h=>h==='My Rating'||h==='MyRating');assert.ok(field);const desired=n===2?4.9:9+n/10;plans.push({item,table,field,desired,status:['Completed','Started','Completed','Watched'][n]});}
 if(ledger.stage==='created')await save({...ledger,stage:'seeding',seedRevisions:Object.fromEntries(owned.map(i=>[i.id,i.revision])),seedBackup:await backup('seed')});
 if(ledger.stage==='seeding'){
  for(const [n,p] of plans.entries()){const patch={user_status:p.status,...(n===0?{title:prefix+'game renamed'}:{}),...(p.item.media_type==='book'?{personal_rating:4.5}:{})};rpc(`public.cdl_v14_full_edit(${q(p.item.id)}::uuid,${ledger.seedRevisions[p.item.id]},${q(`c14a0052-2000-4000-8000-00000000000${n+1}`)}::uuid,${q(JSON.stringify(patch))}::jsonb)`);}
  ({snapshot,connection}=await sources());const current=fixtures(snapshot),desired=current.map((item,n)=>({...item,title:n===0?prefix+'game':item.title,personal_rating:plans[n].desired}));
  // Model a user's Sheet edits against the still-unrenamed tracker titles.
  const steps=compileTrackerWriteSteps(plans.map((p,n)=>({id:ids[n],itemId:ids[n],media:medias[n],field:p.field,kind:'export-field',value:p.desired,comparisonToken:'explicit-fixture-sheet-edit'})),desired,connection.tables,[]);
  await save({...ledger,stage:'sheet-dispatching'});process.env.CDL_V14_TRACKER_WRITE_TARGET=TRACKER_ID;
  try{await writeTrackerPreparedBatch(steps,desired,connection.tables,connection.grids);}catch{/* Independent readback below decides whether dispatch succeeded. */}finally{delete process.env.CDL_V14_TRACKER_WRITE_TARGET;}
 }
 ({snapshot,connection}=await sources());
 for(const [n,p] of plans.entries()){const table=connection.tables.find(t=>t.name===tabs[medias[n]]),row=table.rows.filter(c=>c[table.headers.indexOf('Title')]===prefix+medias[n]);assert.equal(row.length,1);assert.equal(Number(row[0][table.headers.indexOf(p.field)]),p.desired);}
 assert.deepEqual(original(),ledger.original);await save({...ledger,stage:'seeded'});console.log(JSON.stringify({stage:'seeded',appStatusEdits:4,trackerRatingEdits:4,bookRatingConflict:true,originalRecordsUnchanged:true,next:'Keep tracker for the synthetic book rating conflict, then apply the mixed run in Sync.'}));
}else if(action==='verify'){
 assert.ok(ledger&&['seeded','verified'].includes(ledger.stage));const owned=fixtures(snapshot),confirmed=buildInitialTrackerBaseline(snapshot.items,connection.tables);
 const run=query(`select jsonb_build_object('status',r.status,'plan',r.cursor_data->>'plan','receipt',r.cursor_data->'receipt','imports',r.cursor_data->'imports','steps',r.cursor_data->'steps','running',(select count(*) from cdl.sync_runs where library_id=${q(library)} and status='running')) as data from cdl.sync_runs r where library_id=${q(library)} order by started_at desc limit 1;`).rows[0].data;
 assert.equal(run.status,'completed');assert.equal(run.running,0);assert.equal(run.receipt.baselineFingerprint,confirmed.fingerprint);assert.equal(run.imports.length,4);assert.equal(run.steps.length,8);assert.deepEqual(run.imports.map(i=>i.itemId).sort(),[...ids].sort());
 const baselines=rpc(`public.cdl_v14_tracker_baselines(${q(library)}::uuid)`);
 for(const item of owned){assert.equal(item.revision,4);assert.deepEqual(baselines.records.find(r=>r.itemId===item.id).fields,confirmed.records.find(r=>r.itemId===item.id).fields);}
 for(const entry of run.imports){const audit=query(`select jsonb_build_object('audit',(select count(*) from cdl.change_events where library_id=${q(library)} and entity_id=${q(entry.itemId)} and request_id=${q(entry.requestId)} and entity_kind='full_edit'),'outbox',(select count(*) from cdl.sync_outbox where item_id=${q(entry.itemId)} and item_revision=4)) as data;`).rows[0].data;assert.deepEqual(audit,{audit:1,outbox:1});}
 owned.forEach((i,n)=>{assert.equal(i.user_status,['Completed','Started','Completed','Watched'][n]);assert.equal(i.personal_rating,n===2?4.9:9+n/10);});assert.deepEqual(original(),ledger.original);
 await save({...ledger,stage:'verified',verifiedRun:run.plan,confirmedAt:run.receipt.confirmedAt});console.log(JSON.stringify({stage:'verified',records:4,changedValueTwoWaySync:true,titleMapping:true,bookRating:4.9,oneImportAuditPerItem:true,privateNotesPreserved:true,originalRecordsUnchanged:true,run:run.plan,confirmedAt:run.receipt.confirmedAt}));
}else{
 assert.ok(ledger&&['verified','cleanup-dispatching','sheet-cleaned','cleaned'].includes(ledger.stage));
 if(ledger.stage==='cleaned'){assert.deepEqual(original(),ledger.original);console.log(JSON.stringify({stage:'cleaned',alreadyComplete:true}));process.exit(0);}
 const owned=fixtures(snapshot);assert.deepEqual(original(),ledger.original);
 const targets=owned.map(item=>{const table=connection.tables.find(t=>t.name===tabs[item.media_type]),title=table.headers.indexOf('Title'),rows=table.rows.flatMap((c,index)=>c[title]===item.title?[index]:[]);assert.ok(rows.length<=1);return {item,table,rows,grid:connection.grids.find(g=>g.title===table.name)};});
 if(ledger.stage==='verified'){
  assert.ok(targets.every(t=>t.rows.length===1));await save({...ledger,stage:'cleanup-dispatching',cleanupBackup:await backup('cleanup')});
  const credential=await loadPrivateTrackerCredentials();assert.ok(credential);const client=new JWT({email:credential.config.serviceAccount,key:credential.key,keyId:credential.config.keyId,scopes:['https://www.googleapis.com/auth/spreadsheets']});const token=await client.getAccessToken();assert.ok(token.token);
  const requests=targets.map(t=>({deleteDimension:{range:{sheetId:t.grid.sheetId,dimension:'ROWS',startIndex:t.rows[0]+1,endIndex:t.rows[0]+2}}}));
  // Exactly the four named rows created above, one per tab. Never replay after
  // dispatch uncertainty: a new invocation must read back missing rows first.
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${TRACKER_ID}:batchUpdate`,{method:'POST',headers:{authorization:`Bearer ${token.token}`,'Content-Type':'application/json'},body:JSON.stringify({requests}),cache:'no-store',redirect:'error',signal:AbortSignal.timeout(20000)});
 }
 ({snapshot,connection}=await sources());assert.ok(connection.tables.every(t=>!t.rows.some(c=>String(c[t.headers.indexOf('Title')]??'').startsWith(prefix))));
 if(ledger.stage!=='sheet-cleaned')await save({...ledger,stage:'sheet-cleaned'});
 const active=fixtures(snapshot),args=active.map(i=>`(${q(i.id)}::uuid,${i.revision})`).join(',');
 query(`begin;do $$ begin if exists(select 1 from cdl.sync_runs where library_id=${q(library)} and status='running') or (select count(*) from cdl.items i join (values ${args}) e(id,revision) on i.id=e.id and i.revision=e.revision where i.library_id=${q(library)} and i.title like ${q(prefix+'%')} and i.deleted_at is null)<>4 then raise exception 'Fixture cleanup source changed';end if;end $$;delete from cdl.sync_baselines where library_id=${q(library)} and item_id=any(array[${ids.map(q)}]::uuid[]);update cdl.items set deleted_at=clock_timestamp(),revision=revision+1 where library_id=${q(library)} and id=any(array[${ids.map(q)}]::uuid[]);insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes) values(${q(library)},${q(randomUUID())},'qa-fixture-cleanup',${q(ids[0])},'{}');commit;`);
 const final=await snap();assert.equal(final.items.length,2337);buildInitialTrackerBaseline(final.items,connection.tables);assert.deepEqual(original(),ledger.original);await save({...ledger,stage:'cleaned'});
 console.log(JSON.stringify({stage:'cleaned',removedTrackerRows:4,archivedAppFixtures:4,originalActiveRecords:2337,originalRecordsUnchanged:true,recovery:'Tracker snapshots retained; app fixtures recoverable by unarchiving.'}));
}
