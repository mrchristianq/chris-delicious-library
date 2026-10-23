import {readFileSync,readdirSync,writeFileSync} from 'node:fs';import {execFileSync,spawnSync} from 'node:child_process';import {randomUUID,createHash} from 'node:crypto';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),dir=process.argv[2],file='20261023002700_v14_backup_export_runtime.sql';
if(!dir?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/nightly-14075-')||readFileSync(root+'/supabase/.temp/project-ref','utf8').trim()!=='xnitocbxdpikvfxssbvm')throw Error('Pinned private preparation required');
const versions=readdirSync(root+'/supabase/migrations').filter(f=>f.endsWith('.sql')&&f<file).sort().map(f=>f.slice(0,14)),q=s=>"'"+String(s).replaceAll("'","''")+"'";
if(versions.length!==26)throw Error('Unexpected migration history');
const source=readFileSync(root+'/supabase/migrations/'+file,'utf8'),body=source.slice(source.indexOf('\nbegin;\n')+8).replace(/commit;\s*$/,'');
const install=`begin;set local lock_timeout='10s';set local statement_timeout='120s';
do $$ begin if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array[${versions.map(q)}]::text[] then raise exception 'Unexpected history';end if;if exists(select 1 from cdl.nightly_workers where enabled) or exists(select 1 from cdl.sync_runs where status='running') then raise exception 'Pause worker and sync first';end if;end $$;
${body}
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261023002700','v14_backup_export_runtime',array[${q(body)}]);commit;
select jsonb_build_object('migration','20261023002700','worker_still_disabled',not exists(select 1 from cdl.nightly_workers where enabled),'function_timeout',(select proconfig from pg_proc where oid='public.cdl_v14_nightly_rpc(text,jsonb)'::regprocedure)) verification;`;
writeFileSync(dir+'/runtime27-install.sql',install,{flag:'wx',mode:0o600});
const name='cdl-runtime27-'+randomUUID();let created=false;
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:60*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=s=>docker(['exec','-i',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],s);
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+randomUUID(),'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Database unavailable');
 sql(readFileSync(dir+'/schema.sql','utf8'));sql("insert into auth.users(id) values('baf0dab8-9904-48f2-a00f-30773bfc6ae1');");sql(readFileSync(dir+'/data.sql','utf8'));
 sql(readFileSync('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-release-14065-qTbKTc/storage-schema-for-rehearsal.sql','utf8'));sql(readFileSync(root+'/supabase/migrations/20261021002400_v14_private_recovery.sql','utf8'));
 sql('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);insert into supabase_migrations.schema_migrations(version) values '+versions.slice(0,25).map(v=>'('+q(v)+')').join(',')+';');
 sql(readFileSync(dir+'/revision2/install.sql','utf8'));
 const before=sql('select md5(jsonb_agg(to_jsonb(i) order by id)::text) from cdl.items i;');const result=sql(install);if(before!==sql('select md5(jsonb_agg(to_jsonb(i) order by id)::text) from cdl.items i;'))throw Error('Items changed');
 let replayRejected=false;try{sql(install);}catch{replayRejected=true;}if(!replayRejected)throw Error('Replay accepted');
 writeFileSync(dir+'/runtime27-rehearsal.json',JSON.stringify({result,replayRejected,libraryItemsUnchanged:true,hash:createHash('sha256').update(install).digest('hex')},null,2),{mode:0o600,flag:'wx'});
 console.log(JSON.stringify({restored:true,runtime27Rehearsed:true,replayRejected:true}));
}catch(e){console.error(String(e.stderr??e.message).slice(-1800));process.exitCode=1;}finally{if(created)docker(['rm','--force',name]);}
