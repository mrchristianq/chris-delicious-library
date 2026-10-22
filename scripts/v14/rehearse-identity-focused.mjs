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
if(process.argv.length!==3||backup!=='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-identity-LUNGUA')throw new Error('Pinned private identity restore required');
const files=['schema.sql','data.sql'].map((file,n)=>{const bytes=readFileSync(resolve(backup,file));assert.equal(createHash('sha256').update(bytes).digest('hex'),['c13e65eeafb4bb1e4e3af8bf28066f33eaadd8851546c7f4521483b24da32d29','41bac9fd721a5fbd34916eec4389103b3c52a00d82b005f3234afe3d79fb07bd'][n]);return bytes;});
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
 sql(`insert into cdl.libraries(id,owner_id,name) values(${q(library)},${q(owner)},'ISOLATED mixed-sync QA');`);
 for(const item of fixtures)sql(`insert into cdl.items(id,library_id,media_type,title,user_status,personal_rating,notes,user_fields) values(${q(item.id)},${q(library)},${q(item.media_type)},${q(item.title)},${q(item.user_status)},${item.personal_rating},${q(item.notes)},${json(item.user_fields)});insert into cdl.item_metadata(item_id,library_id,fields) values(${q(item.id)},${q(library)},${json(item.metadata)});`);
 const base=fixtureBaseline(fixtures,tables),target=base.targetId;
 sql(`insert into cdl.sync_targets(id,library_id,sheet_id,enabled,approved_columns) values(${q(target)},${q(library)},${q(base.sheetId)},false,${json(base.columns)});`);
 for(const r of base.records)sql(`insert into cdl.sync_baselines(library_id,target_id,item_id,confirmed_fields,confirmed_at) values(${q(library)},${q(target)},${q(r.itemId)},${json(r.fields)},${q(r.confirmedAt)});`);
 sql(`insert into cdl.sync_runs(id,library_id,target_id,status,cursor_data,started_at,finished_at) values(${q(randomUUID())},${q(library)},${q(target)},'completed','{"kind":"initial"}',${q(base.lastConfirmedSync)},${q(base.lastConfirmedSync)});`);
 const c=client(),writer=mixedWriter(c),snap=()=>readLibrary(writer,library),getBase=()=>readTrackerBaselineState(c,owner,library);
 const ci=fixtures[0];
 // Same-item identity import + two-row Sheet consolidation; lost app/Google
 // replies must recover from receipts/readback, never duplicate either write.
 lastError='';let qs=await snap(),qb=await getBase(),qi=qs.items.find(i=>i.id===ci.id);
 let qt=tables.find(t=>t.name==='Games'),qrow=[...qt.rows.find(c=>c[qt.headers.indexOf('Title')]===qi.title)];
 qrow[qt.headers.indexOf('Platform')]='PlayStation 5';qrow[qt.headers.indexOf('IGDB_ID')]='';qt.rows.push(qrow);
 let qr=attachIdentityReviews(previewTrackerThreeWay(qs.items,tables,qb,'now'),qs.items,tables,qs.settings,qb).changes.find(c=>c.identitySelection);
 let qfields=Object.fromEntries(qr.identitySelection.fields.map(k=>[k,'app']));qfields.Platform='tracker';
 await saveSetting(writer,library,identityReviewKey(library,qr.id),qr.identitySelection.revision,randomUUID(),identityReviewValue(qr.identitySelection.token,{mode:'same',fields:qfields},qr.identitySelection.fields));
 qs=await snap();const same=compileMixedSameItemPlan(qs.items,tables,qs.settings,qb,await readMixedContext(c,owner,library),qr.id);
 assert.equal(same.imports.length,1);assert.equal(same.exports[0].expectedRows,2);await stageMixedPlan(writer,same,randomUUID());
 const sameAdapter=createMixedRunAdapter(c,same,transport),sameWrite=sameAdapter.import.write;
 let loseIdentityImport=true;sameAdapter.import.write=async(...args)=>{const value=await sameWrite(...args);if(loseIdentityImport){loseIdentityImport=false;throw new Error('Lost identity import reply');}return value;};
 assert.equal((await advanceTrackerMixedRun(same,sameAdapter)).status,'uncertain');
 const loseGoogle={...transport,write:async(...args)=>{await transport.write(...args);throw new Error('Lost identity Google reply');}};
 const sameReload=readStoredMixedPlan((await snap()).settings,library,same.fingerprint);
 assert.equal((await advanceTrackerMixedRun(sameReload,createMixedRunAdapter(c,sameReload,loseGoogle))).status,'verified');
 const sameSends=googleSends;assert.equal((await advanceTrackerMixedRun(sameReload,createMixedRunAdapter(c,sameReload,transport))).status,'verified');assert.equal(googleSends,sameSends);
 qi=(await snap()).items.find(i=>i.id===ci.id);assert.equal(qi.user_fields.Platform,'PlayStation 5');assert.equal(qi.notes,'PRIVATE NOTES MUST SURVIVE');
 assert.equal(tables.find(t=>t.name==='Games').rows.filter(r=>r[qt.headers.indexOf('Title')]===qi.title).length,1);
 assert.equal(previewTrackerThreeWay((await snap()).items,tables,await getBase(),'now').changes.length,0);
 // Separate edition: existing app/Sheet records remain byte-for-byte unchanged.
 qs=await snap();qb=await getBase();qt=tables.find(t=>t.name==='Games');
 const existing=JSON.stringify(qi),existingRow=JSON.stringify(qt.rows.find(c=>c[qt.headers.indexOf('Title')]===qi.title));
 qrow=JSON.parse(existingRow);qrow[qt.headers.indexOf('Platform')]='Xbox Series X';qrow[qt.headers.indexOf('IGDB_ID')]='';qt.rows.push(qrow);
 qr=attachIdentityReviews(previewTrackerThreeWay(qs.items,tables,qb,'now'),qs.items,tables,qs.settings,qb).changes.find(c=>c.identitySelection);
 qfields=Object.fromEntries(qr.identitySelection.fields.map(k=>[k,'app']));qfields.Platform='tracker';
 await saveSetting(writer,library,identityReviewKey(library,qr.id),qr.identitySelection.revision,randomUUID(),identityReviewValue(qr.identitySelection.token,{mode:'separate',fields:qfields},qr.identitySelection.fields));
 qs=await snap();const separate=compileMixedSeparateEditionPlan(qs.items,tables,qs.settings,qb,await readMixedContext(c,owner,library),qr.id);
 assert.equal(separate.imports.length,0);assert.equal(separate.creates.length,1);assert.equal(separate.exports.length,1);
 // Deliberately bypass the compiler to prove the database independently
 // rejects a sealed command that reuses the existing edition's platform.
 const bad=structuredClone(separate);bad.creates[0].input.patch.overrides.Platform='PlayStation 5';
 const {fingerprint:oldCommand,...badCommand}=bad.creates[0];void oldCommand;bad.creates[0].fingerprint=mixedHash(badCommand);bad.exports=[];
 const {fingerprint:oldPlan,runId:oldRun,...badBody}=bad;void oldPlan;void oldRun;bad.fingerprint=mixedHash(badBody);bad.runId=mixedRunId(bad.fingerprint);
 await stageMixedPlan(writer,bad,randomUUID());const deniedAdapter=createMixedRunAdapter(c,bad,transport);await deniedAdapter.claim(bad);
 const pending=await deniedAdapter.journal.read(),dispatched=structuredClone(pending.journal);dispatched.steps[0]={...dispatched.steps[0],state:'dispatched',attempt:randomUUID()};await deniedAdapter.journal.save(pending.revision,randomUUID(),dispatched);
 const denied=await c.rpc('cdl_v14_tracker_create',{p_library_id:library,p_run_id:bad.runId,p_plan:bad.fingerprint,p_id:bad.creates[0].input.itemId,p_request_id:bad.creates[0].input.requestId,p_media_type:'game',p_patch:bad.creates[0].input.patch});
 assert.ok(denied.error);assert.match(lastError,/Independent concrete edition required/);
 assert.equal((await snap()).items.some(i=>i.id===bad.creates[0].input.itemId),false);
 // This is a disposable, network-disabled fixture run only.
 sql(`update cdl.sync_runs set status='failed' where id=${q(bad.runId)} and library_id=${q(library)};`);lastError='';
 await stageMixedPlan(writer,separate,randomUUID());
 lostCreate=true;assert.equal((await advanceTrackerMixedRun(separate,createMixedRunAdapter(c,separate,transport))).status,'uncertain');
 const separateReload=readStoredMixedPlan((await snap()).settings,library,separate.fingerprint);
 assert.equal((await advanceTrackerMixedRun(separateReload,createMixedRunAdapter(c,separateReload,transport))).status,'verified');
 const separateSends=googleSends;assert.equal((await advanceTrackerMixedRun(separateReload,createMixedRunAdapter(c,separateReload,transport))).status,'verified');assert.equal(googleSends,separateSends);
 qs=await snap();assert.equal(JSON.stringify(qs.items.find(i=>i.id===qi.id)),existing);
 assert.equal(JSON.stringify(tables.find(t=>t.name==='Games').rows.find(c=>c[qt.headers.indexOf('Title')]===qi.title&&c[qt.headers.indexOf('Platform')]==='PlayStation 5')),existingRow);
 const newEdition=qs.items.find(i=>i.id===separate.creates[0].input.itemId);assert.equal(newEdition.user_fields.Platform,'Xbox Series X');assert.equal(newEdition.notes,'');
 assert.equal(previewTrackerThreeWay(qs.items,tables,await getBase(),'now').changes.length,0);
 const editionAudit=query('select jsonb_build_object(\'creates\',(select count(*) from cdl.change_events where library_id='+q(library)+'::uuid and request_id='+q(separate.creates[0].input.requestId)+'::uuid and entity_kind=\'create\'))');assert.equal(editionAudit.creates,1);

 // Last-moment app edit after final readback must reject the final SQL CAS.
 const rs=await snap(),rp=compileTrackerMixedPlan(rs.items,tables,rs.settings,await getBase(),await readMixedContext(c,owner,library),'now');await stageMixedPlan(writer,rp,randomUUID());const race=createMixedRunAdapter(c,rp,transport),confirm=race.confirm,stampBeforeRace=(await readMixedContext(c,owner,library)).stamp;
 race.confirm=async(...args)=>{sql(`update cdl.items set revision=revision+1 where id=${q(fixtures[0].id)};`);return confirm(...args);};await assert.rejects(advanceTrackerMixedRun(rp,race));assert.equal(lastError,'Final revision changed');assert.equal((await readMixedContext(c,owner,library)).stamp,stampBeforeRace);
 assert.deepEqual(query('select public.qa_original_fingerprint();'),protectedBefore);
 const enabled=query(`select jsonb_build_object('enabled',(select count(*) from cdl.sync_targets where enabled));`);assert.equal(enabled.enabled,0);
 console.log(JSON.stringify({result:'PASS',scope:'network-disabled real DB restore + simulated Google transport',sameItemConsolidationVerified:true,separateEditionVerified:true,identityImportLostAckRecovered:true,identityGoogleLostAckRecovered:true,separateCreateLostAckRecovered:true,oneCreationAudit:true,originalLibraryAllTablesUnchanged:true,nightlyTargets:enabled.enabled,liveWrites:0}));
}catch(cause){console.error(`Last isolated database diagnostic: ${lastError||'none'}`);throw cause;}
finally{if(created){docker(['rm','--force',name]);console.log('Removed only the disposable mixed-sync restore; recovery backups retained.');}}
