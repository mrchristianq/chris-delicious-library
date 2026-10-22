// Explicit one-time installation of the restored/rehearsed controls only.
// Does not activate a target or write items, baselines, or Google Sheets.
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url)),backup='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-manual-eyfS9q';
if(readFileSync(resolve(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Wrong linked project');
for(const [f,sha] of [['schema.sql','e55b7e70387aca09a6561a005a2e8e01c02289acfeb0c3bebb1f30d4027b0fb2'],['data.sql','8558cfdf5e404685bfe81832f3cb8176ef1301b500bd5b6f8db1f3326b9f67da']])if(createHash('sha256').update(readFileSync(resolve(backup,f))).digest('hex')!==sha)throw new Error('Backup changed');
const file='20261020001800_v14_two_way_run_control.sql',source=readFileSync(resolve(root,'supabase/migrations',file),'utf8');
if(createHash('sha256').update(source).digest('hex')!=='0e17277e7345513efb82aa8b632cfc66b2d3e4c6bbfc1fc07580250eef6d2a01')throw new Error('Migration changed');
const expected=['20261010000100','20261011000200','20261011000300','20261012000400','20261012000500','20261012000600','20261013000700','20261013000800','20261013000900','20261013001000','20261014001100','20261015001200','20261016001300','20261016001400','20261018001500','20261019001600','20261020001700'];
const q=s=>"'"+s.replaceAll("'","''")+"'",body=source.replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const sql=`begin;
do $$ begin if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array[${expected.map(q).join(',')}]::text[] then raise exception 'Unexpected migration history';end if;end $$;
create function pg_temp.fingerprint() returns jsonb language plpgsql as $$ declare t record;result jsonb:='{}';h text;begin for t in select tablename from pg_tables where schemaname='cdl' order by tablename loop execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'''')) from cdl.%I r',t.tablename) into h;result:=result||jsonb_build_object(t.tablename,h);end loop;return result;end $$;
create temp table before_data as select pg_temp.fingerprint() as value;
${body}
insert into supabase_migrations.schema_migrations(version,name,statements) values(${q(file.slice(0,14))},${q(file.slice(15,-4))},ARRAY[${q(body)}]);
do $$ begin if (select value from before_data) is distinct from pg_temp.fingerprint() then raise exception 'Library changed; rolling back';end if;end $$;
commit;select jsonb_build_object('migrations',(select count(*) from supabase_migrations.schema_migrations),'baselines',(select count(*) from cdl.sync_baselines),'enabled_targets',(select count(*) from cdl.sync_targets where enabled)) as verification;`;
if(process.argv.length===2)console.log('Verified pinned project, migration and restored backup. Dry run only.');
else if(process.argv.length===3&&process.argv[2]==='--apply'){
 try{console.log(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}));}
 catch{throw new Error('Installation not confirmed; inspect history before retrying');}
}else throw new Error('Unknown option');
