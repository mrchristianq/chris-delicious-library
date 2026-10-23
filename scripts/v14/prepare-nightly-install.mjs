// Generate guarded DDL and rehearse against private exports. No live writes.
import {readFileSync,readdirSync,writeFileSync,lstatSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),dir=process.argv[2];
if(!dir?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/nightly-14075-')||!lstatSync(dir).isDirectory()||lstatSync(dir).isSymbolicLink()||readFileSync(root+'/supabase/.temp/project-ref','utf8').trim()!=='xnitocbxdpikvfxssbvm')throw Error('Explicit private folder and pinned project required');
const file='20261023002600_v14_nightly_worker.sql',versions=readdirSync(root+'/supabase/migrations').filter(f=>f.endsWith('.sql')&&f<file).sort().map(f=>f.slice(0,14));
if(versions.length!==25)throw Error('Unexpected migration history');
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const source=readFileSync(root+'/supabase/migrations/'+file,'utf8'),body=source.slice(source.indexOf('\nbegin;\n')+8).replace(/commit;\s*$/,'');
const install=`begin;set local lock_timeout='10s';set local statement_timeout='120s';
do $$ declare t record;begin
 if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array[${versions.map(q)}]::text[] then raise exception 'Unexpected migration history';end if;
 if exists(select 1 from cdl.sync_runs where status='running') or exists(select 1 from cdl.sync_targets where enabled) then raise exception 'Sync must be idle';end if;
 for t in select tablename from pg_tables where schemaname='cdl' order by tablename loop execute format('lock table cdl.%I in share row exclusive mode',t.tablename);end loop;
end $$;
create function pg_temp.fingerprint() returns jsonb language plpgsql as $$ declare t record;result jsonb:='{}';h text;begin for t in select tablename from pg_tables where schemaname='cdl' and tablename not in ('nightly_workers','nightly_jobs') order by tablename loop execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'''')) from cdl.%I r',t.tablename) into h;result:=result||jsonb_build_object(t.tablename,h);end loop;return result;end $$;
create temporary table before_data as select pg_temp.fingerprint() value;
${body}
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261023002600','v14_nightly_worker',array[${q(body)}]);
do $$ begin if (select value from before_data) is distinct from pg_temp.fingerprint() then raise exception 'Library data changed';end if;end $$;
commit;select jsonb_build_object('migration','20261023002600','workers',(select count(*) from cdl.nightly_workers),'library_data_unchanged',true) verification;`;
writeFileSync(dir+'/install.sql',install,{flag:'wx',mode:0o600});
const name='cdl-nightly-real-restore-'+randomUUID();let created=false;
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:60*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=s=>docker(['exec','-i',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],s);
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+randomUUID(),'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Database unavailable');
 sql(readFileSync(dir+'/schema.sql','utf8'));
 sql("insert into auth.users(id) values('baf0dab8-9904-48f2-a00f-30773bfc6ae1');");
 sql(readFileSync(dir+'/data.sql','utf8'));
 sql(readFileSync('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-release-14065-qTbKTc/storage-schema-for-rehearsal.sql','utf8'));
 sql(readFileSync(root+'/supabase/migrations/20261021002400_v14_private_recovery.sql','utf8'));
 sql('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);insert into supabase_migrations.schema_migrations(version) values '+versions.map(v=>'('+q(v)+')').join(',')+';');
 const result=sql(install);let rejected=false;try{sql(install);}catch{rejected=true;}if(!rejected)throw Error('Replay accepted');
 const hashes=Object.fromEntries(['schema.sql','data.sql','install.sql'].map(f=>[f,createHash('sha256').update(readFileSync(dir+'/'+f)).digest('hex')]));
 writeFileSync(dir+'/rehearsal.json',JSON.stringify({at:new Date().toISOString(),restored:true,replayedRejected:true,result,hashes},null,2),{flag:'wx',mode:0o600});
 console.log(JSON.stringify({restored:true,ddlRehearsed:true,replayRejected:true,hashes}));
}catch(e){console.error(String(e.stderr??e.message).slice(-2000));process.exitCode=1;}finally{if(created)docker(['rm','--force',name]);}
