// Actual schema + Storage policies, synthetic identities/data, network disabled.
// This script never accepts a remote database or modifies real library records.
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),name='cdl-nightly-'+randomUUID();let created=false;
const storage='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-release-14065-qTbKTc/storage-schema-for-rehearsal.sql';
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:40*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=s=>docker(['exec','-i',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],s);
const owner='baf0dab8-9904-48f2-a00f-30773bfc6ae1',library='9fdfae4a-31f5-5c8f-aa64-af839a853b48',worker='11111111-1111-4111-8111-111111111111',other='22222222-2222-4222-8222-222222222222';
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const as=(who,s)=>sql(`begin;select set_config('request.jwt.claim.sub','${who}',true);set local role authenticated;${s};commit;`);
const rpc=(who,call,args={})=>{const out=as(who,`select public.cdl_v14_nightly_rpc(${quote(call)},${quote(JSON.stringify(args))}::jsonb)`);return JSON.parse(out.split('\n').find(l=>l.startsWith('{')||l.startsWith('[')));};
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+randomUUID(),'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
 sql(readFileSync(storage,'utf8'));
 for(const f of readdirSync(resolve(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())sql(readFileSync(resolve(root,'supabase/migrations',f),'utf8'));
 sql(`create schema if not exists supabase_migrations;create table if not exists supabase_migrations.schema_migrations(version text primary key);insert into supabase_migrations.schema_migrations values('20261023002600');
 insert into auth.users(id) values('${owner}'),('${worker}'),('${other}');
 insert into cdl.libraries(id,owner_id,name) values('${library}','${owner}','Synthetic nightly library');
 insert into cdl.nightly_workers(user_id,library_id) values('${worker}','${library}');
 insert into cdl.items(id,library_id,media_type,title,notes) values('${other}','${library}','tv','Fixture','Notes must survive');
 insert into cdl.episodes(id,library_id,show_id,season_number,episode_number) values('${worker}','${library}','${other}',1,1);
 insert into cdl.episode_progress(episode_id,library_id,watched,revision) values('${worker}','${library}',true,7);`);
 assert.throws(()=>rpc(worker,'bootstrap'));sql('update cdl.nightly_workers set enabled=true;');
 assert.equal(rpc(worker,'bootstrap').ownerId,owner);
 for(const who of [owner,other])assert.throws(()=>rpc(who,'bootstrap'));
 for(const call of ['cdl_v14_set_archived','cdl_v14_create_item','cdl_v14_episode_metadata','pg_read_file'])assert.throws(()=>rpc(worker,call,{}));
 assert.throws(()=>as(worker,'select * from cdl.items'));
 assert.throws(()=>rpc(worker,'cdl_v14_snapshot_guard',{p_library_id:other}));
 const manifest=rpc(worker,'cdl_v14_snapshot_guard',{p_library_id:library});assert.equal(manifest.owner_id,owner);
 assert.match(as(worker,`select public.cdl_v14_nightly_rpc('cdl_v14_snapshot_guard','{"p_library_id":"${library}"}');select auth.uid();`),new RegExp(worker+'\\nCOMMIT'));
 assert.throws(()=>rpc(worker,'cdl_v14_save_setting',{p_library_id:library,p_key:'__cdl_tracker_run_v1:'+ 'a'.repeat(64),p_revision:null,p_request_id:randomUUID(),p_value:{value:'{}'}}));
 const claim=rpc(worker,'claim');assert.ok(claim.claimed);assert.equal(rpc(worker,'claim').claimed,false);
 const backup=rpc(worker,'snapshot',{jobId:claim.jobId});assert.equal(backup.tables.items[0].notes,'Notes must survive');assert.equal(backup.tables.episode_progress[0].revision,7);assert.equal(backup.tables.episodes.length,1);assert.equal(backup.tables.nightly_workers,undefined);
 const prefix='a'.repeat(64),path=`${owner}/${library}/${prefix}/${randomUUID()}.json.gz`;
 assert.throws(()=>as(worker,`insert into storage.objects(bucket_id,name,metadata) values('cdl-v14-recovery','${path}','{"size":100}')`));
 rpc(worker,'backup-start',{jobId:claim.jobId,prefix,bytes:100});
 as(worker,`insert into storage.objects(bucket_id,name,metadata) values('cdl-v14-recovery','${path}','{"size":100}')`);
 assert.match(as(worker,`select count(*) from storage.objects where name='${path}'`),/\n1\n/);
 assert.match(as(other,`select count(*) from storage.objects where name='${path}'`),/\n0\n/);
 for(const bad of [path.replace(library,other),path.replace(owner,other),path.replace(prefix,'b'.repeat(64))])assert.throws(()=>as(worker,`insert into storage.objects(bucket_id,name) values('cdl-v14-recovery','${bad}')`));
 assert.throws(()=>rpc(worker,'finish',{jobId:claim.jobId,status:'completed',result:{}}));
 const receipt={bucket:'cdl-v14-recovery',format:'cdl-library-backup-v1',capturedAt:new Date().toISOString(),path,sha256:'b'.repeat(64),bytes:100};rpc(worker,'backup-confirm',{jobId:claim.jobId,receipt});
 assert.throws(()=>rpc(worker,'cdl_v14_save_setting',{p_library_id:library,p_key:'shelfThemeMode',p_revision:null,p_request_id:randomUUID(),p_value:{value:'dark'}}));
 assert.throws(()=>rpc(worker,'cdl_v14_full_edit',{p_id:other,p_revision:1,p_request_id:randomUUID(),p_patch:{notes:'Overwritten'}}));
 assert.throws(()=>rpc(worker,'cdl_v14_full_edit',{p_id:worker,p_revision:1,p_request_id:randomUUID(),p_patch:{personal_rating:8}}));
 const safetyPrefix='c'.repeat(64),safetyPath=`${owner}/${library}/${safetyPrefix}/${randomUUID()}.json.gz`;
 rpc(worker,'safety-start',{jobId:claim.jobId,prefix:safetyPrefix,bytes:100});
 as(worker,`insert into storage.objects(bucket_id,name,metadata) values('cdl-v14-recovery','${safetyPath}','{"size":100}')`);
 rpc(worker,'safety-confirm',{jobId:claim.jobId,receipt:{bucket:'cdl-v14-recovery',path:safetyPath,sha256:'d'.repeat(64),bytes:100}});
 rpc(worker,'cdl_v14_save_setting',{p_library_id:library,p_key:'__cdl_tracker_backup_v1:'+prefix,p_revision:null,p_request_id:randomUUID(),p_value:{value:'verified backup fixture'}});
 rpc(worker,'finish',{jobId:claim.jobId,status:'review',result:{heldItems:1,syncedItems:0}});
 assert.throws(()=>rpc(worker,'snapshot',{jobId:claim.jobId}));
 as(worker,`update storage.objects set name='changed' where name='${path}'`);assert.throws(()=>as(worker,`delete from storage.objects where name='${path}'`));
 assert.equal(sql(`select notes from cdl.items where id='${other}';`).trim(),'Notes must survive');
 // Destructive commands below operate ONLY inside this network-disabled,
 // disposable synthetic container and are rolled back after exact readback.
 const order=['libraries','import_batches','import_rows','items','item_metadata','identifiers','episodes','episode_progress','settings','collections','collection_items','assets','import_issues','change_events','sync_targets','sync_outbox','sync_baselines','sync_runs','sync_conflicts'];
 assert.deepEqual(Object.keys(backup.tables).sort(),order.slice().sort());
 let restore='begin;truncate cdl.libraries cascade;';
 for(const table of order){
  const rows=quote(JSON.stringify(backup.tables[table]));
  restore+=`insert into cdl.${table} select * from jsonb_populate_recordset(null::cdl.${table},${rows}::jsonb);`;
  restore+=`do $$ begin if (select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from cdl.${table} r) is distinct from ${rows}::jsonb then raise exception 'Restore mismatch: ${table}';end if;end $$;`;
 }
 sql(restore+'rollback;');
 // Eleven additional synthetic weekly archives: SQL must retain the newest ten,
 // deny all manual/migration/safety paths, and authorize only the oldest two.
 const extra=[];
 for(let i=1;i<=11;i++){
  const id=randomUUID(),pfx=String(i).padStart(64,'0'),p=`${owner}/${library}/${pfx}/${randomUUID()}.json.gz`;
  extra.push(p);
  const r={...receipt,path:p,capturedAt:new Date(Date.now()+i*86400000).toISOString()};
  sql(`insert into cdl.nightly_jobs(id,library_id,day,status,backup_prefix,backup,full_backup,started_at) values('${id}','${library}',current_date+${i},'completed','${pfx}',${quote(JSON.stringify(r))}::jsonb,${quote(JSON.stringify(r))}::jsonb,now()+interval '${i} days');insert into storage.objects(bucket_id,name,metadata) values('cdl-v14-recovery','${p}','{"size":100}');`);
 }
 assert.deepEqual(rpc(worker,'rotation-candidates').map(r=>r.path).sort(),[path,extra[0]].sort());
 assert.equal(as(worker,`select public.cdl_v14_nightly_can_retire('${safetyPath}')`).includes('\nf\n'),true);
 assert.equal(as(worker,`select public.cdl_v14_nightly_can_retire('${extra[10]}')`).includes('\nf\n'),true);
 assert.throws(()=>rpc(worker,'rotation-confirm',{path}));
 // Storage API sets this GUC for its own authorized physical deletion. SQL
 // direct deletes remain blocked; emulate only inside this disposable test.
 as(worker,`set local storage.allow_delete_query='true';delete from storage.objects where name='${path}'`);
 rpc(worker,'rotation-confirm',{path});
 assert.deepEqual(rpc(worker,'rotation-candidates').map(r=>r.path),[extra[0]]);
 assert.throws(()=>rpc(worker,'rotation-confirm',{path:extra[10]}));
 assert.throws(()=>as(worker,`select public.cdl_v14_nightly_retry_empty('${claim.jobId}')`));
 const retryId=randomUUID();sql(`update cdl.nightly_jobs set day=current_date-100 where id='${claim.jobId}';insert into cdl.nightly_jobs(id,library_id,status,result,finished_at) values('${retryId}','${library}','failed','{"message":"Synthetic untouched failure"}',now());`);
 const retried=JSON.parse(as(worker,`select public.cdl_v14_nightly_retry_empty('${retryId}')`).split('\n').find(l=>l.startsWith('{')));assert.equal(retried.jobId,retryId);assert.equal(retried.claimed,true);assert.equal(retried.backupDue,false);
 assert.throws(()=>as(worker,`select public.cdl_v14_nightly_retry_empty('${retryId}')`));
 assert.equal(sql(`select result->'previousAttempt'->'result'->>'message' from cdl.nightly_jobs where id='${retryId}'`).trim(),'Synthetic untouched failure');
 sql('update cdl.nightly_workers set enabled=false;');assert.throws(()=>rpc(worker,'bootstrap'));
 console.log('PASS isolated nightly: restricted worker; daily idempotency; full notes/progress restore; backup-before-write; private storage; ten-newest retention; migration/manual/safety backups protected; revocation. No live writes.');
}catch(e){console.error(String(e.stderr??e.message).slice(-2500));process.exitCode=1;}
finally{if(created)docker(['rm','--force',name]);}
