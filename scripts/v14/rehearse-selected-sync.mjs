// Full combined-run acceptance in a network-disabled actual DB restore.
// Google batch bodies use the production planner/dispatcher with a simulated
// in-memory destination. No remote database or Google credentials are used.
import {execFileSync,spawnSync} from 'node:child_process';import {readFileSync} from 'node:fs';import {randomUUID,createHash} from 'node:crypto';import {registerHooks} from 'node:module';import {resolve} from 'node:path';import assert from 'node:assert/strict';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture,fixtureOwner as owner,fixtureLibrary as originalLibrary} from './tracker-import-fixtures.mjs';
const root=resolve(import.meta.dirname,'../..'),library='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {compileTrackerMixedPlan,compileMixedNewItemPlan,compileMixedSameItemPlan,compileMixedSeparateEditionPlan,decodeMixedPlan,mixedHash,mixedRunId}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
const {advanceTrackerMixedRun}=await import('../../app/lib/v14/tracker-mixed-run.ts');
const {createMixedRunAdapter,mixedWriter,readMixedContext}=await import('../../app/lib/v14/tracker-mixed-server.ts');
const {stageMixedPlan}=await import('../../app/lib/v14/tracker-mixed-store.ts');
const {readLibrary}=await import('../../app/lib/v14/read-library.ts');
const {readTrackerBaselineState}=await import('../../app/lib/v14/tracker-baseline-read.ts');
const {dispatchTrackerGoogleBatch}=await import('../../app/lib/v14/tracker-google-dispatch.ts');
const {trackerFieldValue}=await import('../../app/lib/v14/tracker-reconcile.ts');
const {previewTrackerThreeWay}=await import('../../app/lib/v14/tracker-three-way.ts');
const {attachTrackerIdentityDecisions,identityDecisionKey,identityDecisionValue}=await import('../../app/lib/v14/tracker-identity-decisions.ts');
const {prepareNewTrackerImport}=await import('../../app/lib/v14/tracker-new-import.ts');
const {trackerRowIdentity}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {storedMixedPackage,readStoredMixedPlan}=await import('../../app/lib/v14/tracker-mixed-package.ts');
const {saveSetting}=await import('../../app/lib/v14/save-setting.ts');
const {attachTrackerConflictDecisions,conflictDecisionKey,conflictDecisionValue}=await import('../../app/lib/v14/tracker-conflict-decisions.ts');
const {attachIdentityReviews,identityReviewKey,identityReviewValue}=await import('../../app/lib/v14/tracker-identity-review.ts');h.deregister();
const backup=process.argv[2];
if(process.argv.length!==3||backup!=='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-selected-JEMobR')throw new Error('Pinned private selected-sync restore required');
const files=['schema.sql','data.sql'].map((file,n)=>{const bytes=readFileSync(resolve(backup,file));assert.equal(createHash('sha256').update(bytes).digest('hex'),['e9ec3b1515deb0253b30647830e4a885ad5a69428461235bf506229d319f228e','1121b0329dd4b585b515538685563fea6544f4dff198780bfc243919cda07861'][n]);return bytes;});
const name=`cdl-mixed-restore-${randomUUID()}`,q=s=>"'"+String(s).replaceAll("'","''")+"'",json=v=>q(JSON.stringify(v))+'::jsonb';let created=false,lastError='';
function docker(args,input){try{return execFileSync('docker',args,{input,encoding:'utf8',timeout:60000,maxBuffer:40*1024*1024,stdio:['pipe','pipe','pipe']});}catch(e){lastError=['Another run owns the target','Run identity changed','Unconfirmed journal','Final revision changed','Confirmation generation changed','Canonical values not confirmed','Invalid run summary','Pending journal unavailable','Source revisions changed','Immutable run package unavailable','Library unavailable','Injected baseline failure','Missing import audit','Different completion retry'].find(s=>String(e.stderr).includes(s))??(String(e.stderr).match(/ERROR:[^\n]+/)?.[0]??'details withheld');throw new Error(`Isolated DB command failed: ${lastError}`);}}
const sql=input=>docker(['exec','-i',name,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],input);
function query(input){const lines=sql(input).split('\n').filter(l=>l.startsWith('{')||l.startsWith('[')||l==='null');assert.equal(lines.length,1);return JSON.parse(lines[0]);}
const signatures={cdl_v14_snapshot_guard:{p_library_id:'uuid'},cdl_v14_snapshot_page:{p_library_id:'uuid',p_section:'text',p_offset:'int',p_limit:'int'},cdl_v14_tracker_baselines:{p_library_id:'uuid'},cdl_v14_tracker_run_context:{p_library_id:'uuid',p_run_id:'uuid'},cdl_v14_tracker_create:{p_library_id:'uuid',p_run_id:'uuid',p_plan:'text',p_id:'uuid',p_request_id:'uuid',p_media_type:'text',p_patch:'jsonb'},cdl_v14_save_setting:{p_library_id:'uuid',p_key:'text',p_revision:'bigint',p_request_id:'uuid',p_value:'jsonb'},cdl_v14_get_item:{p_id:'uuid'},cdl_v14_full_edit:{p_id:'uuid',p_revision:'bigint',p_request_id:'uuid',p_patch:'jsonb'},cdl_v14_tracker_claim:{p_library_id:'uuid',p_run_id:'uuid',p_plan:'text',p_package_hash:'text',p_summary:'jsonb'},cdl_v14_tracker_confirm:{p_library_id:'uuid',p_run_id:'uuid',p_plan:'text',p_records:'jsonb',p_readback_hash:'text'}};
let lostCreate=false,lostImport=false,lostCommit=false,googleSends=0;
function client(user=owner){return {auth:{getUser:async()=>({data:{user:{id:user}},error:null})},rpc:async(name,args)=>{
  assert.ok(signatures[name]);const params=Object.entries(signatures[name]).filter(([k])=>Object.hasOwn(args,k)).map(([k,type])=>`${k}=>${args[k]===null?'null':type==='jsonb'?json(args[k]):q(args[k])+'::'+type}`);
  let data;try{data=query(`begin;select set_config('request.jwt.claim.sub',${q(user)},true);set local role authenticated;select public.${name}(${params.join(',')});commit;`);}catch{return {data:null,error:{code:'QA_DB'}};}
  if(lostCreate&&name==='cdl_v14_tracker_create'){lostCreate=false;return {data:null,error:{code:'QA_LOST_CREATE_ACK'}};}
  if(lostImport&&name==='cdl_v14_full_edit'&&args.p_id.endsWith('2')){lostImport=false;return {data:null,error:{code:'QA_LOST_IMPORT_ACK'}};}
  if(lostCommit&&name==='cdl_v14_tracker_confirm'){lostCommit=false;return {data:null,error:{code:'QA_LOST_COMMIT_ACK'}};}
  return {data,error:null};
}};}
const fixtures=fixtureItems().map(i=>({...i,library_id:library}));let tables=fixtureTables(fixtures);const ids={Games:1374715809,Shows:1246289004,Books:519477596,Movies:488782103};
const dimensions=Object.fromEntries(Object.keys(ids).map(n=>[n,100]));
const grids=()=>tables.map(t=>({spreadsheetId:'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0',title:t.name,sheetId:ids[t.name],rowCount:dimensions[t.name],columnCount:t.headers.length}));
const transport={read:async()=>({observedAt:new Date().toISOString(),tabs:tables.map(t=>({name:t.name,columns:t.headers.length})),tables:structuredClone(tables),grids:grids()}),write:async(steps,items,freshTables,freshGrids)=>dispatchTrackerGoogleBatch(steps,items,freshTables,freshGrids,async(url,body)=>{
  assert.equal(url,'https://sheets.googleapis.com/v4/spreadsheets/1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0:batchUpdate');googleSends++;
  const next=structuredClone(tables);
  for(const request of body.requests){
   if(request.deleteDimension){const d=request.deleteDimension.range,table=next.find(t=>ids[t.name]===d.sheetId);assert.equal(d.dimension,'ROWS');assert.ok(d.startIndex>=1&&d.endIndex>d.startIndex);table.rows.splice(d.startIndex-1,d.endIndex-d.startIndex);dimensions[table.name]-=d.endIndex-d.startIndex;continue;}
   if(request.appendDimension){const a=request.appendDimension,table=next.find(t=>ids[t.name]===a.sheetId);assert.equal(a.dimension,'ROWS');dimensions[table.name]+=a.length;while(table.rows.length<dimensions[table.name]-1)table.rows.push(table.headers.map(()=>''));continue;}
   assert.deepEqual(Object.keys(request),['updateCells']);const cell=request.updateCells,table=next.find(t=>ids[t.name]===cell.range.sheetId),col=cell.range.startColumnIndex,row=cell.range.startRowIndex-1;assert.equal(cell.fields,'userEnteredValue');assert.ok(row>=0);const v=cell.rows[0].values[0].userEnteredValue??{},raw=v.stringValue??v.numberValue??v.boolValue??'';table.rows[row][col]=String(trackerFieldValue(table.headers[col],String(raw)));
  }
  tables=next;throw new Error('Simulated lost Google acknowledgement after atomic commit');
 })};
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e',`POSTGRES_PASSWORD=${randomUUID()}`,'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
 sql(files[0]);sql(`insert into auth.users(id) values (${q(owner)});`);sql(files[1]);
 sql(`create function public.qa_original_fingerprint() returns jsonb language plpgsql as $$ declare t record;v jsonb:='{}';h text;begin for t in select tablename from pg_tables where schemaname='cdl' loop if exists(select 1 from information_schema.columns where table_schema='cdl' and table_name=t.tablename and column_name='library_id') then execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'''')) from cdl.%I r where library_id=%L::uuid',t.tablename,${q(originalLibrary)}) into h;elsif t.tablename='libraries' then execute format('select md5(jsonb_agg(to_jsonb(r))::text) from cdl.libraries r where id=%L::uuid',${q(originalLibrary)}) into h;else continue;end if;v:=v||jsonb_build_object(t.tablename,h);end loop;return v;end $$;`);
 const protectedBefore=query('select public.qa_original_fingerprint();');
 sql(readFileSync(resolve(root,'supabase/migrations/20261020002200_v14_reviewed_identity_editions.sql'),'utf8'));
 sql(readFileSync(resolve(root,'supabase/migrations/20261021002300_v14_selected_sync.sql'),'utf8'));
 sql(`insert into cdl.libraries(id,owner_id,name) values(${q(library)},${q(owner)},'ISOLATED mixed-sync QA');`);
 for(const item of fixtures)sql(`insert into cdl.items(id,library_id,media_type,title,user_status,personal_rating,notes,user_fields) values(${q(item.id)},${q(library)},${q(item.media_type)},${q(item.title)},${q(item.user_status)},${item.personal_rating},${q(item.notes)},${json(item.user_fields)});insert into cdl.item_metadata(item_id,library_id,fields) values(${q(item.id)},${q(library)},${json(item.metadata)});`);
 const base=fixtureBaseline(fixtures,tables),target=base.targetId;
 sql(`insert into cdl.sync_targets(id,library_id,sheet_id,enabled,approved_columns) values(${q(target)},${q(library)},${q(base.sheetId)},false,${json(base.columns)});`);
 for(const r of base.records)sql(`insert into cdl.sync_baselines(library_id,target_id,item_id,confirmed_fields,confirmed_at) values(${q(library)},${q(target)},${q(r.itemId)},${json(r.fields)},${q(r.confirmedAt)});`);
 sql(`insert into cdl.sync_runs(id,library_id,target_id,status,cursor_data,started_at,finished_at) values(${q(randomUUID())},${q(library)},${q(target)},'completed','{"kind":"initial"}',${q(base.lastConfirmedSync)},${q(base.lastConfirmedSync)});`);
 const c=client(),writer=mixedWriter(c),snap=()=>readLibrary(writer,library),getBase=()=>readTrackerBaselineState(c,owner,library);

 // Existing full-library run shape remains compatible with the new SQL.
 {const before=await snap(),legacy=compileTrackerMixedPlan(before.items,tables,before.settings,await getBase(),await readMixedContext(c,owner,library),'now');await stageMixedPlan(writer,legacy,randomUUID());assert.equal((await advanceTrackerMixedRun(legacy,createMixedRunAdapter(c,legacy,transport))).status,'verified');}
 // Three pending records; one unresolved conflict must not block another row.
 sql(`update cdl.items set personal_rating=9.1,revision=revision+1 where id=${q(fixtures[0].id)};update cdl.items set personal_rating=4.2,revision=revision+1 where id=${q(fixtures[2].id)};`);
 changeFixture(tables,1,'My Rating','9.2');changeFixture(tables,2,'My Rating','4.8');
 let s=await snap(),b=await getBase();const originalTv=JSON.stringify(b.records.find(r=>r.itemId===fixtures[1].id)),originalBook=JSON.stringify(b.records.find(r=>r.itemId===fixtures[2].id));
 const context=await readMixedContext(c,owner,library);assert.equal(context.allowSelectedItems,true);
 const plan=compileTrackerMixedPlan(s.items,tables,s.settings,b,context,'now',[fixtures[0].id]);
 assert.equal(plan.exports.length,1);assert.equal(plan.imports.length,0);await stageMixedPlan(writer,plan,randomUUID());
 const adapter=createMixedRunAdapter(c,plan,transport),confirm=adapter.confirm;
 adapter.confirm=async(p,baseline)=>{
   const extra={itemId:fixtures[1].id,revision:s.items.find(i=>i.id===fixtures[1].id).revision,fields:b.records.find(r=>r.itemId===fixtures[1].id).fields};
   const denied=await c.rpc('cdl_v14_tracker_confirm',{p_library_id:library,p_run_id:p.runId,p_plan:p.fingerprint,p_records:[...baseline.records,extra],p_readback_hash:'d'.repeat(64)});
   assert.ok(denied.error);assert.match(lastError,/Unselected confirmation denied/);lastError='';
   return confirm(p,baseline);
 };
 // SQL commits but its final acknowledgement is lost. Reload the sealed plan
 // from actual stored chunks, as a restarted server would, then resume twice.
 lostCommit=true;
 await assert.rejects(advanceTrackerMixedRun(plan,adapter));
 const reloaded=await readStoredMixedPlan((await snap()).settings,library,plan.fingerprint);
 assert.equal((await advanceTrackerMixedRun(reloaded,createMixedRunAdapter(c,reloaded,transport))).status,'verified');
 assert.equal((await advanceTrackerMixedRun(reloaded,createMixedRunAdapter(c,reloaded,transport))).status,'verified');
 assert.equal(googleSends,1,'Resuming a confirmed export must not resend Google writes');
 b=await getBase();assert.equal(JSON.stringify(b.records.find(r=>r.itemId===fixtures[1].id)),originalTv);assert.equal(JSON.stringify(b.records.find(r=>r.itemId===fixtures[2].id)),originalBook);
 let remaining=previewTrackerThreeWay((await snap()).items,tables,b,'now');assert.equal(remaining.changes.length,2);assert.ok(remaining.changes.some(r=>r.direction==='conflict'));
 // Selected Sheet import works while the book conflict remains skipped.
 s=await snap();const imported=compileTrackerMixedPlan(s.items,tables,s.settings,b,await readMixedContext(c,owner,library),'now',[fixtures[1].id]);
 assert.equal(imported.imports.length,1);await stageMixedPlan(writer,imported,randomUUID());
 assert.equal((await advanceTrackerMixedRun(imported,createMixedRunAdapter(c,imported,transport))).status,'verified');
 b=await getBase();assert.equal(JSON.stringify(b.records.find(r=>r.itemId===fixtures[2].id)),originalBook);
 assert.equal((await snap()).items.find(i=>i.id===fixtures[1].id).personal_rating,9.2);
 assert.equal(previewTrackerThreeWay((await snap()).items,tables,b,'now').changes.length,1);
 // A new Sheet item can be created separately while the book stays pending.
 s=await snap();b=await getBase();const game=tables.find(t=>t.name==='Games'),newRow=[...game.rows[0]];newRow[0]='ISOLATED selected new item';newRow[game.headers.indexOf('IGDB_ID')]='123456';game.rows.push(newRow);
 const key=trackerRowIdentity(game,newRow),command=prepareNewTrackerImport({items:s.items,tables,baseline:b},'Games',key),newPlan=compileMixedNewItemPlan(s.items,tables,b,await readMixedContext(c,owner,library),'Games',key,command.fingerprint,'now','sheet-new-item');
 await stageMixedPlan(writer,newPlan,randomUUID());lostCreate=true;
 assert.equal((await advanceTrackerMixedRun(newPlan,createMixedRunAdapter(c,newPlan,transport))).status,'uncertain');
 const restartedNew=await readStoredMixedPlan((await snap()).settings,library,newPlan.fingerprint);
 assert.equal((await advanceTrackerMixedRun(restartedNew,createMixedRunAdapter(c,restartedNew,transport))).status,'verified');
 assert.equal((await advanceTrackerMixedRun(restartedNew,createMixedRunAdapter(c,restartedNew,transport))).status,'verified');
 assert.equal((await snap()).items.filter(i=>i.id===command.input.itemId).length,1,'Lost creation acknowledgement must not duplicate the new item');
 assert.equal((await snap()).items.find(i=>i.id===command.input.itemId).notes,'');assert.equal(JSON.stringify((await getBase()).records.find(r=>r.itemId===fixtures[2].id)),originalBook);
 assert.deepEqual(query('select public.qa_original_fingerprint();'),protectedBefore);
 console.log(JSON.stringify({result:'PASS',scope:'restored SQL plus simulated Google',oneRowOnly:true,skippedBaselinesUnchanged:true,unrelatedConflictStillPending:true,selectedImportVerified:true,unselectedConfirmationSqlDenied:true,lostFinalAcknowledgementRecovered:true,storedPlanRestartVerified:true,lostCreationAcknowledgementRecovered:true,noDuplicateItems:true,noRepeatedGoogleBatch:true,originalLibraryUnchanged:true,liveWrites:0}));
}catch(cause){console.error(`Last isolated database diagnostic: ${lastError||'none'}`);throw cause;}
finally{if(created){docker(['rm','--force',name]);console.log('Removed disposable selected-sync restore; backups retained.');}}

