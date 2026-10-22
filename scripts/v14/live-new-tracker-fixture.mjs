// A single named, recoverable test row in the NEW tracker only. The browser
// performs approval/staging/Apply; this script never calls the import engine.
import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';import {resolve} from 'node:path';import assert from 'node:assert/strict';
import {writer,root,library} from './execute-initial-tracker.mjs';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {readLibrary}=await import('../../app/lib/v14/read-library.ts');
const {readTrackerConnection,loadPrivateTrackerCredentials}=await import('../../app/lib/v14/tracker-read-server.ts');
const {saveTrackerRecoverySnapshot}=await import('../../app/lib/v14/tracker-recovery-server.ts');
const {buildInitialTrackerBaseline}=await import('../../app/lib/v14/tracker-baseline.ts');
const {readTrackerBaselineState}=await import('../../app/lib/v14/tracker-baseline-read.ts');void readTrackerBaselineState;
const {saveSetting}=await import('../../app/lib/v14/save-setting.ts');
const {TRACKER_ID}=await import('../../app/lib/v14/tracker-read.ts');
const {JWT}=await import('google-auth-library');hook.deregister();
const action=process.argv[2],config=process.argv[3],title='CDL v14 SHEET IMPORT QA 14056',provider='99999999956',ledgerKey='__cdl_tracker_fixture_14056';
if(!['seed','repair-date','verify','cleanup'].includes(action)||process.argv.length!==4||!config?.startsWith('/')||readFileSync(resolve(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Pinned test project and explicit fixture action required');
process.env.CDL_V14_TEST='true';process.env.CDL_V14_TRACKER_CONFIG_FILE=config;delete process.env.CDL_V14_TRACKER_WRITE_TARGET;
const q=s=>"'"+String(s).replaceAll("'","''")+"'",hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function query(sql){return JSON.parse(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']})).rows[0].data;}
const sources=async()=>{const [snapshot,connection]=await Promise.all([readLibrary(writer,library),readTrackerConnection(true)]);assert.ok(connection?.tables&&connection.grids);return {snapshot,connection};};
let {snapshot,connection}=await sources(),setting=snapshot.settings.find(s=>s.key===ledgerKey),ledger=setting?JSON.parse(setting.value.value):null;
const table=()=>connection.tables.find(t=>t.name==='Games');
const positions=()=>table().rows.flatMap((row,n)=>row[table().headers.indexOf('Title')]===title?[n]:[]);
const original=(exclude)=>query(`select jsonb_build_object('items',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.id)::text,'')) from cdl.items r where id<>${q(exclude)}::uuid),'metadata',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by r.item_id)::text,'')) from cdl.item_metadata r where item_id<>${q(exclude)}::uuid),'episodes',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.episodes r),'progress',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.episode_progress r)) as data;`);
async function save(next){await saveSetting(writer,library,ledgerKey,setting?.revision??null,randomUUID(),JSON.stringify(next));({snapshot,connection}=await sources());setting=snapshot.settings.find(s=>s.key===ledgerKey);ledger=JSON.parse(setting.value.value);assert.deepEqual(ledger,next);}
async function send(requests){const credential=await loadPrivateTrackerCredentials();assert.ok(credential);const client=new JWT({email:credential.config.serviceAccount,key:credential.key,keyId:credential.config.keyId,scopes:['https://www.googleapis.com/auth/spreadsheets']});const token=await client.getAccessToken();assert.ok(token.token);const result=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${TRACKER_ID}:batchUpdate`,{method:'POST',headers:{authorization:`Bearer ${token.token}`,'Content-Type':'application/json'},body:JSON.stringify({requests}),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(20000)});if(!result.ok)throw new Error('Test tracker mutation not confirmed; inspect readback before retry');}
if(action==='seed'){
 if(ledger)throw new Error('Fixture has already been dispatched; inspect rather than reseeding');
 assert.equal(snapshot.items.length,2337);buildInitialTrackerBaseline(snapshot.items,connection.tables);assert.equal(positions().length,0);assert.ok(!snapshot.items.some(i=>i.title===title));
 const semantic=JSON.stringify([title.toLowerCase(),'steam',provider]),digest=hash([TRACKER_ID,snapshot.owner_id,library,'Games',semantic,'new-item']);
 const itemId=`${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-8${digest.slice(17,20)}-${digest.slice(20,32)}`;
 const backup=await saveTrackerRecoverySnapshot(hash(['new-tracker-fixture',title]),connection.grids);
 await save({version:1,stage:'seeding',itemId,backup,original:original(itemId)});
 const cells=table().headers.map(h=>({Title:title,Platform:'Steam',IGDB_ID:provider,Status:'Completed','My Rating':'8.5',MyRating:'8.5','Completed Date':'10/20/2026',CompletedDate:'10/20/2026','Hours Played':'12',Completed:'true','Date Added':'10/20/2026'}[h]??''));
 const grid=connection.grids.find(g=>g.title==='Games');await send([{appendCells:{sheetId:grid.sheetId,rows:[{values:cells.map(v=>({userEnteredValue:{stringValue:v}}))}],fields:'userEnteredValue'}}]);
 ({snapshot,connection}=await sources());assert.equal(positions().length,1);assert.ok(!snapshot.items.some(i=>i.id===itemId));assert.deepEqual(original(itemId),ledger.original);await save({...ledger,stage:'seeded'});
 console.log(JSON.stringify({stage:'seeded',sheetRows:1,appItemsCreated:0,itemId,title}));
}else if(action==='repair-date'){
 assert.equal(ledger?.stage,'seeded');assert.equal(positions().length,1);
 const n=positions()[0],column=table().headers.indexOf('Date Completed'),grid=connection.grids.find(g=>g.title==='Games');assert.ok(column>=0);assert.equal(table().rows[n][column],'');
 await send([{updateCells:{range:{sheetId:grid.sheetId,startRowIndex:n+1,endRowIndex:n+2,startColumnIndex:column,endColumnIndex:column+1},rows:[{values:[{userEnteredValue:{stringValue:'2026-10-20'}}]}],fields:'userEnteredValue'}}]);
 ({snapshot,connection}=await sources());assert.equal(table().rows[positions()[0]][column],'2026-10-20');assert.deepEqual(original(ledger.itemId),ledger.original);console.log(JSON.stringify({stage:'test-date-confirmed',rows:1}));
}else if(action==='verify'){
 assert.equal(ledger?.stage,'seeded');const item=snapshot.items.find(i=>i.id===ledger.itemId);assert.ok(item);assert.equal(item.title,title);assert.equal(item.user_status,'Completed');assert.equal(item.personal_rating,8.5);assert.equal(item.completed_on,'2026-10-20');assert.equal(item.notes,'');assert.equal(item.revision,2);assert.equal(item.user_fields['Hours Played'],'12');assert.equal(positions().length,1);buildInitialTrackerBaseline(snapshot.items,connection.tables);
 const counts=query(`select jsonb_build_object('createAudit',(select count(*) from cdl.change_events where library_id=${q(library)} and entity_id=${q(item.id)} and entity_kind='create'),'outbox',(select count(*) from cdl.sync_outbox where item_id=${q(item.id)}),'baseline',(select count(*) from cdl.sync_baselines where item_id=${q(item.id)}),'activeRuns',(select count(*) from cdl.sync_runs where library_id=${q(library)} and status='running')) as data;`);
 assert.deepEqual(counts,{createAudit:1,outbox:1,baseline:1,activeRuns:0});assert.deepEqual(original(item.id),ledger.original);await save({...ledger,stage:'verified'});console.log(JSON.stringify({stage:'verified',...counts,originalRecordsUnchanged:true,fieldsReadBack:true}));
}else{
 assert.ok(ledger&&['verified','cleanup-dispatched','sheet-cleaned','cleaned'].includes(ledger.stage));if(ledger.stage==='cleaned'){console.log('Already cleaned; no replay.');process.exit(0);}
 if(ledger.stage==='verified'){
  assert.equal(positions().length,1);const backup=await saveTrackerRecoverySnapshot(hash(['cleanup-new-tracker-fixture',title]),connection.grids);await save({...ledger,stage:'cleanup-dispatched',cleanupBackup:backup});
  const n=positions()[0],grid=connection.grids.find(g=>g.title==='Games');await send([{deleteDimension:{range:{sheetId:grid.sheetId,dimension:'ROWS',startIndex:n+1,endIndex:n+2}}}]);
 }
 ({snapshot,connection}=await sources());assert.equal(positions().length,0);if(ledger.stage!=='sheet-cleaned')await save({...ledger,stage:'sheet-cleaned'});
 const item=snapshot.items.find(i=>i.id===ledger.itemId);assert.ok(item&&item.title===title&&item.revision===2);
 query(`begin;do $$ begin if exists(select 1 from cdl.sync_runs where library_id=${q(library)} and status='running') then raise exception 'Active run';end if;perform set_config('request.jwt.claim.sub',${q(snapshot.owner_id)},true);delete from cdl.sync_baselines where library_id=${q(library)} and item_id=${q(item.id)};perform public.cdl_v14_set_archived(${q(item.id)}::uuid,2,${q(randomUUID())}::uuid,true);end $$;commit;select jsonb_build_object('cleaned',true) as data;`);
 ({snapshot,connection}=await sources());assert.equal(snapshot.items.length,2337);buildInitialTrackerBaseline(snapshot.items,connection.tables);assert.deepEqual(original(ledger.itemId),ledger.original);await save({...ledger,stage:'cleaned'});
 console.log(JSON.stringify({stage:'cleaned',removedSheetRows:1,archivedAppItems:1,originalRecordsUnchanged:true,recovery:'Private Sheet snapshots and archived test item retained.'}));
}
