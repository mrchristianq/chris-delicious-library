// Installs only the rehearsed owner-scoped READ function in the test project.
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
if(readFileSync(resolve(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Wrong linked project');
const backup=process.argv[2];if(!backup?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-pre-baseline-read-'))throw new Error('Rehearsed private backup required');
for(const [file,sha] of [['schema.sql','c9199b5302de6bc9cc89d8d0d496947bf1efbe610ee1a631ac842b9ed22374bc'],['data.sql','764e1d80bbcbfdf9e6f7d97257a1da949052a7a9512a6d94f5c04f54c9bb7162']])if(createHash('sha256').update(readFileSync(resolve(backup,file))).digest('hex')!==sha)throw new Error('Backup differs from restored checkpoint');
const file='20261020001700_v14_tracker_baseline_read.sql',source=readFileSync(resolve(root,'supabase/migrations',file),'utf8');
if(createHash('sha256').update(source).digest('hex')!=='a2678e9203ed47f0172e618046c45582d15ad41b72c321904323df80d29c937a')throw new Error('Migration differs from rehearsed source');
const expected=['20261010000100','20261011000200','20261011000300','20261012000400','20261012000500','20261012000600','20261013000700','20261013000800','20261013000900','20261013001000','20261014001100','20261015001200','20261016001300','20261016001400','20261018001500','20261019001600'];
const q=s=>"'"+s.replaceAll("'","''")+"'",body=source.replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const sql=`begin;
do $$ begin if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array[${expected.map(q).join(',')}]::text[] then raise exception 'Unexpected migration history';end if;end $$;
create function pg_temp.fingerprint() returns jsonb language plpgsql as $$ declare t record;result jsonb:='{}';h text;begin for t in select tablename from pg_tables where schemaname='cdl' order by tablename loop execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'''')) from cdl.%I r',t.tablename) into h;result:=result||jsonb_build_object(t.tablename,h);end loop;return result;end $$;
create temp table before_data as select pg_temp.fingerprint() as value;
${body}
insert into supabase_migrations.schema_migrations(version,name,statements) values(${q(file.slice(0,14))},${q(file.slice(15,-4))},ARRAY[${q(body)}]);
do $$ begin if (select value from before_data) is distinct from pg_temp.fingerprint() then raise exception 'Library data changed; rolling back';end if;end $$;
commit;select jsonb_build_object('installed_migrations',(select count(*) from supabase_migrations.schema_migrations),'baselines',(select count(*) from cdl.sync_baselines),'enabled_targets',(select count(*) from cdl.sync_targets where enabled)) as verification;`;
if(process.argv.length===3)console.log('Pinned project, migration and rehearsed backup verified. Dry run only.');
else if(process.argv.length===4&&process.argv[3]==='--apply'){
 try{console.log(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']}));}
 catch{throw new Error('Read-only migration not confirmed; inspect migration history before retrying');}
}else throw new Error('Unknown apply option');
