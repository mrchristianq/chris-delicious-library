import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const backup=process.argv[2];
const bounded=process.argv[3]==='--bounded-snapshot';
const sourceOrder=process.argv[3]==='--source-order';
const trackerProvenance=process.argv[3]==='--tracker-provenance';
const baselineConfirmation=process.argv[3]==='--baseline-confirmation';
const baselineRead=process.argv[3]==='--baseline-read';
if(process.argv[3] && !bounded && !sourceOrder && !trackerProvenance && !baselineConfirmation && !baselineRead)throw new Error('Unknown rehearsal mode');
if(!backup || !path.isAbsolute(backup))throw new Error('Provide an absolute private backup directory');
const files=['schema.sql','data.sql'].map(file=>{
 const bytes=readFileSync(path.join(backup,file));if(bytes.length<100)throw new Error('Backup is empty');
 console.log(`${file} SHA256 ${createHash('sha256').update(bytes).digest('hex')}`);return bytes;
});
const name=`cdl-restore-${randomUUID()}`;
const docker=(args,input)=>{const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:60000,maxBuffer:4*1024*1024});if(r.status!==0 || r.error){const diagnostic=['permission denied for schema cdl','Table exposed','Incomplete baseline read','Excluded baseline field','Foreign owner admitted','Anonymous access admitted','Missing user admitted'].find(message=>r.stderr?.includes(message));throw new Error(`Isolated restore command failed (${args[0]})${diagnostic?`: ${diagnostic}`:''}; private row contents withheld`);}return r.stdout;};
const sql=input=>docker(['exec','-i',name,'psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],input);
let created=false;
try {
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e',`POSTGRES_PASSWORD=${randomUUID()}`,'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;
 for(let i=0;i<40;i++){const r=spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{encoding:'utf8',timeout:3000});if(r.status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw new Error('Disposable restore database did not start');
 sql(files[0]);
 // ID-only fixture, in this network-disabled disposable database only.
 sql("insert into auth.users(id) values ('baf0dab8-9904-48f2-a00f-30773bfc6ae1');");
 sql(files[1]);
 if(baselineConfirmation){
   const file=process.argv[4];if(!file||!path.isAbsolute(file))throw new Error('Absolute private baseline SQL path required');
   const confirmation=readFileSync(file,'utf8');console.log(`confirmation SHA256 ${createHash('sha256').update(confirmation).digest('hex')}`);
   console.log(sql(confirmation));console.log(sql(confirmation));
   console.log('PASS restored-data baseline confirmation and identical retry; source fingerprints preserved');
 }else{
 const fingerprint=`create function pg_temp.fingerprint() returns jsonb language plpgsql as $$ declare t record; result jsonb:='{}'; h text; begin for t in select tablename from pg_tables where schemaname='cdl' order by tablename loop execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'''')) from cdl.%I r',t.tablename) into h;result:=result||jsonb_build_object(t.tablename,h);end loop;return result;end $$;`;
 const migrations=baselineRead?['20261020001700_v14_tracker_baseline_read.sql']:trackerProvenance?['20261019001600_v14_tracker_provenance.sql']:sourceOrder?['20261018001500_v14_legacy_source_order.sql']:bounded?['20261016001300_v14_bounded_snapshot.sql','20261016001400_v14_snapshot_transaction_guard.sql']:['20261013000700_v14_full_edit.sql','20261013000800_v14_archive.sql','20261013000900_v14_create.sql','20261013001000_v14_episode_metadata.sql','20261014001100_v14_activity.sql'];
 let command=`begin;${fingerprint} create temp table before_data as select pg_temp.fingerprint() as value;`;
 for(const file of migrations)command+=readFileSync(path.join(root,'supabase/migrations',file),'utf8').replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
 command+=`do $$ begin if (select value from before_data) is distinct from pg_temp.fingerprint() then raise exception 'Data changed during migration';end if;end $$;commit;select jsonb_build_object('items',(select count(*) from cdl.items),'episodes',(select count(*) from cdl.episodes),'settings',(select count(*) from cdl.settings),'enabled_sync',(select count(*) from cdl.sync_targets where enabled));`;
 console.log(sql(command));
 if(baselineRead){
   const authorization=`begin;select set_config('request.jwt.claim.sub','baf0dab8-9904-48f2-a00f-30773bfc6ae1',true);set local role authenticated;
   do $$ declare result jsonb;begin result:=public.cdl_v14_tracker_baselines('9fdfae4a-31f5-5c8f-aa64-af839a853b48');
   if result->>'exists' is distinct from 'true' or result->>'enabled' is distinct from 'false' or jsonb_array_length(result->'records')<>2337 or result->>'sheetId' is distinct from '1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0' or result->>'lastConfirmedSync' is null then raise exception 'Incomplete baseline read';end if;
   if has_table_privilege('authenticated',(select c.oid from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace where n.nspname='cdl' and c.relname='sync_baselines'),'select') then raise exception 'Table exposed';end if;
   end $$;
   reset role;select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);set local role authenticated;
   do $$ declare denied boolean:=false;begin begin perform public.cdl_v14_tracker_baselines('9fdfae4a-31f5-5c8f-aa64-af839a853b48');exception when others then denied:=true;end;
   if not denied then raise exception 'Foreign owner admitted';end if;
   if has_function_privilege('anon','public.cdl_v14_tracker_baselines(uuid)','execute') then raise exception 'Anonymous access admitted';end if;end $$;
   reset role;select set_config('request.jwt.claim.sub','',true);set local role authenticated;
   do $$ declare denied boolean:=false;begin begin perform public.cdl_v14_tracker_baselines('9fdfae4a-31f5-5c8f-aa64-af839a853b48');exception when others then denied:=true;end;if not denied then raise exception 'Missing user admitted';end if;end $$;rollback;`;
   console.log(sql(authorization));
   console.log('PASS baseline read: 2337 records, owner-only RPC, foreign/anonymous/missing user denied, no table SELECT grant');
 }
 if(trackerProvenance){
   console.log(sql("begin;select set_config('request.jwt.claim.sub','baf0dab8-9904-48f2-a00f-30773bfc6ae1',true);set local role authenticated;select jsonb_array_length(public.cdl_v14_tracker_provenance('9fdfae4a-31f5-5c8f-aa64-af839a853b48')->'entries') as source_identities;reset role;select set_config('request.jwt.claim.sub','11111111-1111-4111-8111-111111111111',true);do $$ declare denied boolean:=false;begin begin perform public.cdl_v14_tracker_provenance('9fdfae4a-31f5-5c8f-aa64-af839a853b48');exception when others then denied:=true;end;if not denied then raise exception 'Foreign owner admitted';end if;if has_function_privilege('anon','public.cdl_v14_tracker_provenance(uuid)','execute') then raise exception 'Anonymous access admitted';end if;end $$;rollback;"));
   console.log('PASS tracker provenance migration, owner/foreign/anon authorization and unchanged data');
 }
 console.log(`PASS actual backup restored; all cdl table fingerprints unchanged after ${baselineRead?'migration 017':trackerProvenance?'migration 016':sourceOrder?'migration 015':bounded?'migrations 013-014':'migrations 007-011'}`);
 }
} finally {if(created){docker(['rm','--force',name]);console.log('Removed only this disposable restore database');}}
