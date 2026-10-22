// Full combined-run acceptance in a network-disabled actual DB restore.
// Google batch bodies use the production planner/dispatcher with a simulated
// in-memory destination. No remote database or Google credentials are used.
import {execFileSync,spawnSync} from 'node:child_process';import {readFileSync} from 'node:fs';import {randomUUID,createHash} from 'node:crypto';import {registerHooks} from 'node:module';import {resolve} from 'node:path';import assert from 'node:assert/strict';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture,fixtureOwner as owner,fixtureLibrary as originalLibrary} from './tracker-import-fixtures.mjs';
const root=resolve(import.meta.dirname,'../..'),library='dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {compileTrackerMixedPlan,compileMixedNewItemPlan,decodeMixedPlan}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
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
const {saveSetting}=await import('../../app/lib/v14/save-setting.ts');h.deregister();
const backup=process.argv[2],partsBackup=backup==='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-package-parts-AsF6FB',sheetBackup=partsBackup||backup==='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-sheet-imports-kmotzZ',additionsBackup=sheetBackup||backup==='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-additions-zVk00C',manualBackup=additionsBackup||backup==='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-manual-eyfS9q';if(process.argv.length!==3||!manualBackup&&!backup?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-baseline-read-'))throw new Error('Private restore checkpoint required');
const hashes=manualBackup?['e55b7e70387aca09a6561a005a2e8e01c02289acfeb0c3bebb1f30d4027b0fb2','8558cfdf5e404685bfe81832f3cb8176ef1301b500bd5b6f8db1f3326b9f67da']:['c9199b5302de6bc9cc89d8d0d496947bf1efbe610ee1a631ac842b9ed22374bc','764e1d80bbcbfdf9e6f7d97257a1da949052a7a9512a6d94f5c04f54c9bb7162'];
const files=['schema.sql','data.sql'].map((file,n)=>{const bytes=readFileSync(resolve(backup,file));assert.equal(createHash('sha256').update(bytes).digest('hex'),(partsBackup?['032419d4392360755c175b00ec80162f33c1cda5f85cc786c2bf5112bca7f210','76e2600438a71bf9272d83b1080795c23ab817687b33c6bda0f75a04888aeddb']:sheetBackup?['daebf1ad9c887b847d35256097a42ca519f7edc9d991a68b9c4bee137a48f53c','300d972a6e4620c91f9bf3903bfbf59b82924492fb8786c636c4edeed77a0155']:additionsBackup?['4f31d6b89be0a926bcf316df5c6d5f1579c9a24e67c964224fc812b379f69057','4f44139cb9d049e2ed0e48b435c3093fa972c1887b83b90035ab01736a03b89b']:hashes)[n]);return bytes;});
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
 for(const migration of [...(manualBackup?[]:['20261020001700_v14_tracker_baseline_read.sql']),...(additionsBackup?[]:['20261020001800_v14_two_way_run_control.sql']),'20261020001900_v14_approved_tracker_additions.sql',...(partsBackup?[]:['20261020002000_v14_new_tracker_imports.sql']),'20261020002100_v14_chunked_run_packages.sql'])sql(readFileSync(resolve(root,'supabase/migrations',migration),'utf8'));
 sql(`insert into cdl.libraries(id,owner_id,name) values(${q(library)},${q(owner)},'ISOLATED mixed-sync QA');`);
 for(const item of fixtures)sql(`insert into cdl.items(id,library_id,media_type,title,user_status,personal_rating,notes,user_fields) values(${q(item.id)},${q(library)},${q(item.media_type)},${q(item.title)},${q(item.user_status)},${item.personal_rating},${q(item.notes)},${json(item.user_fields)});insert into cdl.item_metadata(item_id,library_id,fields) values(${q(item.id)},${q(library)},${json(item.metadata)});`);
 const base=fixtureBaseline(fixtures,tables),target=base.targetId;
 sql(`insert into cdl.sync_targets(id,library_id,sheet_id,enabled,approved_columns) values(${q(target)},${q(library)},${q(base.sheetId)},false,${json(base.columns)});`);
 for(const r of base.records)sql(`insert into cdl.sync_baselines(library_id,target_id,item_id,confirmed_fields,confirmed_at) values(${q(library)},${q(target)},${q(r.itemId)},${json(r.fields)},${q(r.confirmedAt)});`);
 sql(`insert into cdl.sync_runs(id,library_id,target_id,status,cursor_data,started_at,finished_at) values(${q(randomUUID())},${q(library)},${q(target)},'completed','{"kind":"initial"}',${q(base.lastConfirmedSync)},${q(base.lastConfirmedSync)});`);
 const c=client(),writer=mixedWriter(c),snap=()=>readLibrary(writer,library),getBase=()=>readTrackerBaselineState(c,owner,library);
 const patches=[{personal_rating:9.1},{user_status:'Completed'},{completed_on:'2026-10-18'},{personal_rating:9.3}];
 for(let n=0;n<4;n++){const r=await c.rpc('cdl_v14_full_edit',{p_id:fixtures[n].id,p_revision:1,p_request_id:randomUUID(),p_patch:patches[n]});assert.equal(r.error,null);}
 changeFixture(tables,0,'Hours Played','20');changeFixture(tables,1,'My Rating','9.2');changeFixture(tables,2,'My Rating','4.9');changeFixture(tables,3,'WatchDate','2026-10-19');
 const source=await snap(),baseline=await getBase(),context=await readMixedContext(c,owner,library),plan=compileTrackerMixedPlan(source.items,tables,source.settings,baseline,context,'now');assert.equal(plan.imports.length,4);assert.equal(plan.exports.length,4);
 await stageMixedPlan(writer,plan,randomUUID());
 const reload=async()=>{const s=await snap(),p=s.settings.find(s=>s.key==='__cdl_tracker_mixed_v1:'+plan.fingerprint);return decodeMixedPlan(p.value.value,library,plan.fingerprint);};
 lostImport=true;lostCommit=true;
 assert.equal((await advanceTrackerMixedRun(await reload(),createMixedRunAdapter(c,plan,transport))).status,'uncertain');assert.equal((await readMixedContext(c,owner,library)).stamp,context.stamp);
 // Another valid plan cannot take over an in-flight target.
 const midway=await snap(),other=compileTrackerMixedPlan(midway.items,tables,midway.settings,await getBase(),await readMixedContext(c,owner,library),'now');assert.notEqual(other.fingerprint,plan.fingerprint);await stageMixedPlan(writer,other,randomUUID());await assert.rejects(createMixedRunAdapter(c,other,transport).claim(other));assert.equal(lastError,'Another run owns the target');
 await assert.rejects(readMixedContext(client('11111111-1111-4111-8111-111111111111'),owner,library));
 // Fail on the SECOND baseline update: every earlier baseline update and the
 // completed marker must roll back as one transaction, not remain partial.
 sql(`create sequence public.qa_baseline_updates;create function public.qa_fail_baseline() returns trigger language plpgsql as $$ begin if new.library_id=${q(library)}::uuid and nextval('public.qa_baseline_updates')=2 then raise exception 'Injected baseline failure';end if;return new;end $$;create trigger qa_baseline_fault after update on cdl.sync_baselines for each row execute function public.qa_fail_baseline();`);
 await assert.rejects(advanceTrackerMixedRun(await reload(),createMixedRunAdapter(c,plan,transport)));assert.equal(lastError,'Injected baseline failure');assert.equal((await readMixedContext(c,owner,library)).stamp,context.stamp);assert.equal(googleSends,1);
 await assert.rejects(advanceTrackerMixedRun(await reload(),createMixedRunAdapter(c,plan,transport))); // commit succeeded, acknowledgement lost
 assert.notEqual((await readMixedContext(c,owner,library)).stamp,context.stamp);
 const result=await advanceTrackerMixedRun(await reload(),createMixedRunAdapter(c,plan,transport));assert.equal(result.status,'verified');assert.equal(googleSends,1);
 assert.equal((await advanceTrackerMixedRun(await reload(),createMixedRunAdapter(c,plan,transport))).status,'verified');
 for(const step of plan.imports){const r=await c.rpc('cdl_v14_get_item',{p_id:step.itemId});assert.equal(r.data.revision,3);assert.equal(r.data.notes,'PRIVATE NOTES MUST SURVIVE');const counts=query(`select jsonb_build_object('audit',(select count(*) from cdl.change_events where library_id=${q(library)} and request_id=${q(step.requestId)}),'outbox',(select count(*) from cdl.sync_outbox where item_id=${q(step.itemId)} and item_revision=3));`);assert.deepEqual(counts,{audit:1,outbox:1});}
 const completed=query(`select jsonb_build_object('runs',(select count(*) from cdl.sync_runs where id=${q(plan.runId)} and status='completed'),'audit',(select count(*) from cdl.change_events where library_id=${q(library)} and request_id=${q(plan.runId)}));`);assert.deepEqual(completed,{runs:1,audit:1});
 // Both sides have already converged on a new rating. There are zero writes,
 // but confirming that shared value must establish the next real baseline.
 const book=(await snap()).items.find(i=>i.media_type==='book');assert.equal((await c.rpc('cdl_v14_full_edit',{p_id:book.id,p_revision:book.revision,p_request_id:randomUUID(),p_patch:{personal_rating:4.8}})).error,null);changeFixture(tables,2,'My Rating','4.8');
 const zs=await snap(),zb=await getBase(),zp=compileTrackerMixedPlan(zs.items,tables,zs.settings,zb,await readMixedContext(c,owner,library),'now');assert.equal(zp.imports.length+zp.exports.length,0);await stageMixedPlan(writer,zp,randomUUID());assert.equal((await advanceTrackerMixedRun(zp,createMixedRunAdapter(c,zp,transport))).status,'verified');assert.equal(googleSends,1);
 changeFixture(tables,2,'My Rating','4.7');assert.equal(previewTrackerThreeWay((await snap()).items,tables,await getBase(),'now').changes[0].direction,'import');changeFixture(tables,2,'My Rating','4.8');
 // A genuine new app record and a stable-ID title rename require explicit
 // owner approvals, then join the existing field import/export transaction.
 const addition={...structuredClone(fixtures[2]),id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',title:'ISOLATED approved new book',metadata:{isbn:'999994'}};
 sql(`insert into cdl.items(id,library_id,media_type,title,user_status,personal_rating,notes,user_fields) values(${q(addition.id)},${q(library)},'book',${q(addition.title)},${q(addition.user_status)},4,${q(addition.notes)},${json(addition.user_fields)});insert into cdl.item_metadata(item_id,library_id,fields) values(${q(addition.id)},${q(library)},${json(addition.metadata)});`);
 const renamed=(await snap()).items.find(i=>i.media_type==='game');assert.equal((await c.rpc('cdl_v14_full_edit',{p_id:renamed.id,p_revision:renamed.revision,p_request_id:randomUUID(),p_patch:{title:renamed.title+' renamed'}})).error,null);changeFixture(tables,0,'Hours Played','21');
 let ms=await snap(),mb=await getBase();assert.throws(()=>compileTrackerMixedPlan(ms.items,tables,ms.settings,mb,{stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)},'now'));
 const mapping=attachTrackerIdentityDecisions(previewTrackerThreeWay(ms.items,tables,mb,'now'),ms.items,ms.settings,mb,tables);assert.equal(mapping.changes.filter(c=>c.plannedAction).length,2);
 for(const row of mapping.changes.filter(c=>c.plannedAction))await saveSetting(writer,library,identityDecisionKey(library,row),row.decisionRevision,randomUUID(),identityDecisionValue(row.decisionToken,'app'));
 ms=await snap();mb=await getBase();const mp=compileTrackerMixedPlan(ms.items,tables,ms.settings,mb,await readMixedContext(c,owner,library),'now');assert.equal(mp.imports.length,1);assert.equal(mp.exports.length,2);assert.ok(mp.exports.some(s=>s.kind==='add-record'));
 await stageMixedPlan(writer,mp,randomUUID());assert.equal((await advanceTrackerMixedRun(mp,createMixedRunAdapter(c,mp,transport))).status,'verified');assert.equal((await getBase()).records.length,5);assert.equal(googleSends,2);
 assert.equal(previewTrackerThreeWay((await snap()).items,tables,await getBase(),'now').changes.length,0);

 // New Sheet-only creation must be run-bound and recover the exact audit.
 const ns=await snap(),nb=await getBase(),newRow=[...tables[0].rows[0]];
 newRow[tables[0].headers.indexOf('Title')]='ISOLATED new tracker game';
 newRow[tables[0].headers.indexOf('IGDB_ID')]='9999999';tables[0].rows.push(newRow);
 const key=trackerRowIdentity(tables[0],newRow),nc=prepareNewTrackerImport({items:ns.items,tables,baseline:nb},'Games',key);
 const np=compileMixedNewItemPlan(ns.items,tables,nb,await readMixedContext(c,owner,library),'Games',key,nc.fingerprint,'now');
 await stageMixedPlan(writer,np,randomUUID());
 const createArgs={p_library_id:library,p_run_id:np.runId,p_plan:np.fingerprint,p_id:nc.input.itemId,p_request_id:nc.input.requestId,p_media_type:nc.input.mediaType,p_patch:nc.input.patch};
 assert.ok((await c.rpc('cdl_v14_tracker_create',createArgs)).error); // not claimed/dispatched
 assert.ok((await client('11111111-1111-4111-8111-111111111111').rpc('cdl_v14_tracker_create',createArgs)).error);
 lostCreate=true;
 assert.equal((await advanceTrackerMixedRun(np,createMixedRunAdapter(c,np,transport))).status,'uncertain');
 const reloaded=decodeMixedPlan((await snap()).settings.find(s=>s.key==='__cdl_tracker_mixed_v1:'+np.fingerprint).value.value,library,np.fingerprint);
 assert.equal((await advanceTrackerMixedRun(reloaded,createMixedRunAdapter(c,reloaded,transport))).status,'verified');
 assert.equal((await advanceTrackerMixedRun(reloaded,createMixedRunAdapter(c,reloaded,transport))).status,'verified');
 const newCounts=query(`select jsonb_build_object('items',(select count(*) from cdl.items where id=${q(nc.input.itemId)}),'audit',(select count(*) from cdl.change_events where library_id=${q(library)} and request_id=${q(nc.input.requestId)} and entity_kind='create'),'outbox',(select count(*) from cdl.sync_outbox where item_id=${q(nc.input.itemId)}));`);
 assert.deepEqual(newCounts,{items:1,audit:1,outbox:1});
 assert.equal((await getBase()).records.length,6);
 assert.equal(previewTrackerThreeWay((await snap()).items,tables,await getBase(),'now').changes.length,0);


 // Larger package acceptance: 2,400 additional synthetic members only in this
 // disposable library, then 100 one-sided app changes. No personal data edited.
 const bulk=Array.from({length:2400},(_,n)=>({id:randomUUID(),title:'ISOLATED capacity '+n+' '+randomUUID(),provider:String(9000000+n)}));
 sql('insert into cdl.items(id,library_id,media_type,title,user_status,personal_rating,notes,user_fields) values '+bulk.map(i=>'('+q(i.id)+','+q(library)+",'game',"+q(i.title)+",'Now Playing',8,'ISOLATED private notes',"+json({Platform:'Steam'})+')').join(',')+';insert into cdl.item_metadata(item_id,library_id,fields) values '+bulk.map(i=>'('+q(i.id)+','+q(library)+','+json({IGDB_ID:i.provider,'Hours Played':'10'})+')').join(',')+';');
 const game=tables.find(t=>t.name==='Games');
 for(const item of bulk){const fields={Title:item.title,Platform:'Steam',IGDB_ID:item.provider,Status:'Now Playing','My Rating':'8','Completed Date':'','Hours Played':'10',Completed:'false'};game.rows.push(game.headers.map(h=>fields[h]??''));}
 dimensions.Games=game.rows.length+100;
 const extraBases=bulk.map(i=>({itemId:i.id,fields:Object.fromEntries(game.headers.map(h=>[h,trackerFieldValue(h,({Title:i.title,Platform:'Steam',IGDB_ID:i.provider,Status:'Now Playing','My Rating':'8','Completed Date':'','Hours Played':'10',Completed:'false'})[h]??'')]))}));
 sql('insert into cdl.sync_baselines(library_id,target_id,item_id,confirmed_fields,confirmed_at) select '+q(library)+'::uuid,'+q(target)+'::uuid,r."itemId",r.fields,clock_timestamp() from jsonb_to_recordset('+json(extraBases)+') r("itemId" uuid,fields jsonb);');
 sql('update cdl.items set user_status=\'Abandoned\',revision=revision+1 where id=any(array['+bulk.slice(0,100).map(i=>q(i.id)).join(',')+']::uuid[]);');
 const bs=await snap(),bp=compileTrackerMixedPlan(bs.items,tables,bs.settings,await getBase(),await readMixedContext(c,owner,library),'now'),packed=storedMixedPackage(bp);
 assert.equal(bp.exports.length,100);assert.ok(packed.parts.length>=2);await stageMixedPlan(writer,bp,randomUUID());
 const first=packed.parts[0],setPart=value=>sql('update cdl.settings set value='+json({value})+' where library_id='+q(library)+'::uuid and key='+q(first.key)+';');
 setPart('tampered-before-claim');
 await assert.rejects(createMixedRunAdapter(c,bp,transport).claim(bp));assert.equal(lastError,'Immutable run package unavailable');setPart(first.value);
 const ba=createMixedRunAdapter(c,bp,transport),originalConfirm=ba.confirm;let corrupt=true;
 ba.confirm=async(...args)=>{if(corrupt){setPart('tampered-before-confirm');corrupt=false;}return originalConfirm(...args);};
 await assert.rejects(advanceTrackerMixedRun(bp,ba));assert.equal(googleSends,3);setPart(first.value);
 const savedPlan=readStoredMixedPlan((await snap()).settings,library,bp.fingerprint);
 assert.equal((await advanceTrackerMixedRun(savedPlan,createMixedRunAdapter(c,savedPlan,transport))).status,'verified');assert.equal(googleSends,3);
 assert.equal((await advanceTrackerMixedRun(savedPlan,createMixedRunAdapter(c,savedPlan,transport))).status,'verified');assert.equal(googleSends,3);
 assert.equal(previewTrackerThreeWay((await snap()).items,tables,await getBase(),'now').changes.length,0);


 // Twenty Sheet-side edits, interrupted during independent source readback.
 // This proves DB checkpoint recovery, not real Google quota/performance.
 for(const item of bulk.slice(0,20)){const current=tables.find(t=>t.name==='Games'),row=current.rows.find(c=>c[current.headers.indexOf('Title')]===item.title);row[current.headers.indexOf('My Rating')]='9.2';}
 const is=await snap(),ip=compileTrackerMixedPlan(is.items,tables,is.settings,await getBase(),await readMixedContext(c,owner,library),'now');
 assert.equal(ip.imports.length,20);assert.equal(ip.exports.length,0);await stageMixedPlan(writer,ip,randomUUID());
 let sourceReads=0;const interruptedTransport={...transport,read:async(...args)=>{sourceReads++;if(sourceReads===18)throw new Error('Injected source-read interruption');return transport.read(...args);}};
 await assert.rejects(advanceTrackerMixedRun(ip,createMixedRunAdapter(c,ip,interruptedTransport)));
 const importedPlan=readStoredMixedPlan((await snap()).settings,library,ip.fingerprint);
 assert.equal((await advanceTrackerMixedRun(importedPlan,createMixedRunAdapter(c,importedPlan,transport))).status,'verified');
 assert.equal((await advanceTrackerMixedRun(importedPlan,createMixedRunAdapter(c,importedPlan,transport))).status,'verified');assert.equal(googleSends,3);
 const importedCounts=query('select jsonb_build_object(\'audits\',(select count(*) from cdl.change_events where library_id='+q(library)+'::uuid and request_id=any(array['+ip.imports.map(s=>q(s.requestId)).join(',')+']::uuid[])),\'notes\',(select count(*) from cdl.items where id=any(array['+ip.imports.map(s=>q(s.itemId)).join(',')+']::uuid[]) and notes=\'ISOLATED private notes\' and personal_rating=9.2))');
 assert.deepEqual(importedCounts,{audits:20,notes:20});

 // Last-moment app edit after final readback must reject the final SQL CAS.
 const rs=await snap(),rp=compileTrackerMixedPlan(rs.items,tables,rs.settings,await getBase(),await readMixedContext(c,owner,library),'now');await stageMixedPlan(writer,rp,randomUUID());const race=createMixedRunAdapter(c,rp,transport),confirm=race.confirm,stampBeforeRace=(await readMixedContext(c,owner,library)).stamp;
 race.confirm=async(...args)=>{sql(`update cdl.items set revision=revision+1 where id=${q(fixtures[0].id)};`);return confirm(...args);};await assert.rejects(advanceTrackerMixedRun(rp,race));assert.equal(lastError,'Final revision changed');assert.equal((await readMixedContext(c,owner,library)).stamp,stampBeforeRace);
 assert.deepEqual(query('select public.qa_original_fingerprint();'),protectedBefore);
 const enabled=query(`select jsonb_build_object('enabled',(select count(*) from cdl.sync_targets where enabled));`);assert.equal(enabled.enabled,0);
 console.log(JSON.stringify({result:'PASS',scope:'network-disabled real DB restore + simulated Google transport',largeImportedRecords:20,sourceReadInterruptionRecovered:true,largeChangedRecords:100,largeSourceRecords:2406,chunkParts:packed.parts.length,partTamperClaimDenied:true,partTamperConfirmationDenied:true,chunkedRestartRecovered:true,newTrackerCreation:true,creationRestartRecovered:true,oneCreationAudit:true,imports:4,exports:4,googleBatches:googleSends,claimExclusivity:true,foreignOwnerDenied:true,importRestartRecovered:true,baselineFailureRolledBackAtomically:true,lostFinalAcknowledgementRecovered:true,oneConfirmationAudit:true,zeroOperationConvergence:true,lateSourceEditRejected:true,originalLibraryAllTablesUnchanged:true,liveWrites:0}));
}catch(cause){console.error(`Last isolated database diagnostic: ${lastError||'none'}`);throw cause;}
finally{if(created){docker(['rm','--force',name]);console.log('Removed only the disposable mixed-sync restore; recovery backups retained.');}}
