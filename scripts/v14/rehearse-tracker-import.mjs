// Actual audited save + restart recovery, ONLY in a network-disabled disposable
// restore. There is no Supabase CLI, remote connection or Google transport here.
import {execFileSync,spawnSync} from 'node:child_process';import {readFileSync} from 'node:fs';import {randomUUID,createHash} from 'node:crypto';import {registerHooks} from 'node:module';import {resolve} from 'node:path';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture,fixtureOwner as owner,fixtureLibrary as library} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {compileTrackerImports,runTrackerImport}=await import('../../app/lib/v14/tracker-import.ts');
const {trackerBaselineGeneration,attachTrackerConflictDecisions,conflictDecisionKey,conflictDecisionValue}=await import('../../app/lib/v14/tracker-conflict-decisions.ts');
const {previewTrackerThreeWay}=await import('../../app/lib/v14/tracker-three-way.ts');h.deregister();
const backup=process.argv[2];if(process.argv.length!==3||!backup?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-baseline-read-'))throw new Error('Private restored checkpoint required');
const files=['schema.sql','data.sql'].map((file,n)=>{const bytes=readFileSync(resolve(backup,file)),sha=createHash('sha256').update(bytes).digest('hex');if(sha!==['c9199b5302de6bc9cc89d8d0d496947bf1efbe610ee1a631ac842b9ed22374bc','764e1d80bbcbfdf9e6f7d97257a1da949052a7a9512a6d94f5c04f54c9bb7162'][n])throw new Error('Backup fingerprint changed');return bytes;});
const name=`cdl-import-restore-${randomUUID()}`,q=s=>"'"+String(s).replaceAll("'","''")+"'",json=v=>q(JSON.stringify(v))+'::jsonb';let created=false;
function docker(args,input){try{return execFileSync('docker',args,{input,encoding:'utf8',timeout:60000,maxBuffer:40*1024*1024,stdio:['pipe','pipe','pipe']});}catch{throw new Error('Isolated database command failed; private row contents withheld');}}
const sql=input=>docker(['exec','-i',name,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],input);
function query(input){const text=sql(input),lines=text.split('\n').filter(line=>line.startsWith('{')||line.startsWith('[')||line==='null');if(lines.length!==1)throw new Error('Incomplete isolated database response');return JSON.parse(lines[0]);}
const rpc=(expr,user=owner)=>query(`begin;select set_config('request.jwt.claim.sub',${q(user)},true);set local role authenticated;select ${expr};commit;`);
const fixtures=fixtureItems(),ids=fixtures.map(i=>q(i.id)).join(',');
const fingerprint=()=>query(`select jsonb_build_object('items',(select md5(jsonb_agg(to_jsonb(i) order by i.id)::text) from cdl.items i where id not in (${ids})), 'metadata',(select md5(jsonb_agg(to_jsonb(m) order by m.item_id)::text) from cdl.item_metadata m where item_id not in (${ids})), 'episodes',(select md5(jsonb_agg(to_jsonb(e) order by e.id)::text) from cdl.episodes e), 'progress',(select md5(jsonb_agg(to_jsonb(p) order by p.episode_id)::text) from cdl.episode_progress p), 'baselines',(select md5(jsonb_agg(to_jsonb(b) order by b.item_id)::text) from cdl.sync_baselines b), 'settings',(select md5(jsonb_agg(to_jsonb(s) order by s.key)::text) from cdl.settings s where key not like '__cdl_tracker_import_fixture_%' and key not like '__cdl_tracker_conflict_v1:%'));`);
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e',`POSTGRES_PASSWORD=${randomUUID()}`,'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Restore database unavailable');
 sql(files[0]);sql(`insert into auth.users(id) values (${q(owner)});`);sql(files[1]);
 const before=fingerprint();
 for(const item of fixtures){sql(`insert into cdl.items(id,library_id,media_type,title,user_status,personal_rating,notes,user_fields) values(${q(item.id)},${q(library)},${q(item.media_type)},${q(item.title)},${q(item.user_status)},${item.personal_rating},${q(item.notes)},${json(item.user_fields)});insert into cdl.item_metadata(item_id,library_id,fields) values(${q(item.id)},${q(library)},${json(item.metadata)});`);}
 // Seed a genuine competing app value in the disposable Book fixture only.
 sql(`update cdl.items set personal_rating=4.5 where id=${q(fixtures[2].id)}::uuid;`);
 const readItem=id=>rpc(`public.cdl_v14_get_item(${q(id)}::uuid)`),items=fixtures.map(i=>readItem(i.id)),tables=fixtureTables(fixtures),baseline=fixtureBaseline(fixtures,tables);
 // A conflict choice survives an actual committed setting save and new read.
 const conflicting=structuredClone(items);conflicting[2].personal_rating=4.5;const conflictTables=structuredClone(tables);changeFixture(conflictTables,2,'My Rating','4.9');
 const preview=attachTrackerConflictDecisions(previewTrackerThreeWay(conflicting,conflictTables,baseline,'now'),conflicting,[],baseline),row=preview.changes.find(c=>c.direction==='conflict');
 if(!row?.decisionToken)throw new Error('Conflict choice unavailable');
 const key=conflictDecisionKey(library,row),value=conflictDecisionValue(row.decisionToken,'tracker'),choiceRequest=randomUUID();
 const save=()=>rpc(`public.cdl_v14_save_setting(${q(library)}::uuid,${q(key)},null,${q(choiceRequest)}::uuid,${json({value})})`);
 const receipt=save();save();if(receipt.revision!==1)throw new Error('Choice CAS not confirmed');
 const stored=query(`select jsonb_build_object('key',key,'revision',revision,'value',value) from cdl.settings where library_id=${q(library)}::uuid and key=${q(key)};`);
 if(attachTrackerConflictDecisions(preview,conflicting,[stored],baseline).changes.find(c=>c.id===row.id)?.savedChoice!=='tracker')throw new Error('Conflict choice not restored');
 let denied=false;try{rpc(`public.cdl_v14_save_setting(${q(library)}::uuid,${q(key)},1,${q(randomUUID())}::uuid,${json({value})})`,'11111111-1111-4111-8111-111111111111');}catch{denied=true;}if(!denied)throw new Error('Foreign choice write admitted');
 for(let n=0;n<4;n++){changeFixture(tables,n,n===0||n===2?'Status':n===3?'Watch Status':'WatchStatus',n===3?'Watched':'Completed');changeFixture(tables,n,'My Rating',n===2?'4.9':'9.2');changeFixture(tables,n,n===3?'WatchDate':'Completed Date','2026-10-19');}changeFixture(tables,0,'Completed','true');changeFixture(tables,1,'NumberOfEpisodes','12');
 const steps=compileTrackerImports(items,tables,[stored],baseline,'now'),manifestKey='__cdl_tracker_import_fixture_manifest';
 rpc(`public.cdl_v14_save_setting(${q(library)}::uuid,${q(manifestKey)},null,${q(randomUUID())}::uuid,${json({value:JSON.stringify(steps)})})`);
 function reloadSteps(){return JSON.parse(query(`select value from cdl.settings where library_id=${q(library)}::uuid and key=${q(manifestKey)};`).value);}
 const adapter=()=>({authenticatedOwner:async()=>owner,read:async(_lib,id)=>readItem(id),source:async step=>({generation:trackerBaselineGeneration(baseline),fields:{...step.sheet}}),write:async(id,revision,request,patch)=>rpc(`public.cdl_v14_full_edit(${q(id)}::uuid,${revision},${q(request)}::uuid,${json(patch)})`)});
 let recovered=false;
 for(const step of reloadSteps()){
  const a=adapter();if(step.media==='book'){const write=a.write;a.write=async(...args)=>{await write(...args);throw new Error('Simulated lost acknowledgement after commit');};const result=await runTrackerImport(step,a);if(result.status!=='uncertain')throw new Error('Lost acknowledgement claimed success');const restarted=reloadSteps().find(s=>s.itemId===step.itemId);if((await runTrackerImport(restarted,adapter())).status!=='confirmed')throw new Error('Restart recovery failed');recovered=true;}
  else if((await runTrackerImport(step,a)).status!=='confirmed')throw new Error('Import readback failed');
  if((await runTrackerImport(step,adapter())).status!=='confirmed')throw new Error('Identical retry failed');
  const final=readItem(step.itemId);if(final.revision!==2||final.notes!=='PRIVATE NOTES MUST SURVIVE')throw new Error('Duplicate edit or Notes changed');
  const audit=query(`select jsonb_build_object('audit',(select count(*) from cdl.change_events where request_id=${q(step.requestId)}::uuid),'outbox',(select count(*) from cdl.sync_outbox where item_id=${q(step.itemId)}::uuid));`);if(audit.audit!==1||audit.outbox!==1)throw new Error('Duplicate audit/outbox');
 }
 if(!recovered||JSON.stringify(before)!==JSON.stringify(fingerprint()))throw new Error('Protected restored data changed');
 console.log(JSON.stringify({result:'PASS',scope:'network-disabled disposable restore only',imports:steps.length,media:steps.map(s=>s.media),conflictChoiceSavedAndReloaded:true,foreignChoiceDenied:true,lostAcknowledgementRecovered:true,exactlyOneAuditAndOutboxPerImport:true,notesPreserved:true,originalRecordsAndBaselinesUnchanged:true,liveWrites:0}));
}finally{if(created){docker(['rm','--force',name]);console.log('Removed only the disposable import-test restore; private backups retained.');}}
