// Apply only the rehearsed, data-preserving source-order RPC change.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Wrong linked project');
const backup=process.argv[2];
if(!backup || !path.isAbsolute(backup))throw new Error('Provide rehearsed absolute private backup directory');
for(const [file,sha] of [['schema.sql','dc8e615e4c1d6f7c4e6bcdc169556bce47f1a1a50fe9470467ed80af394bb03d'],['data.sql','7f7bfc0e58df627a41a3a80f926da8055d807ed4ea4a196780a57ef8b2240f06']]){
  if(createHash('sha256').update(readFileSync(path.join(backup,file))).digest('hex')!==sha)throw new Error('Backup does not match rehearsed checkpoint');
}
const quote=s=>`'${s.replaceAll("'","''")}'`;
const file='20261018001500_v14_legacy_source_order.sql';
const expected=['20261010000100','20261011000200','20261011000300','20261012000400','20261012000500','20261012000600','20261013000700','20261013000800','20261013000900','20261013001000','20261014001100','20261015001200','20261016001300','20261016001400'];
const body=readFileSync(path.join(root,'supabase/migrations',file),'utf8').replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
const sql=`begin;
do $$ begin if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array[${expected.map(quote).join(',')}]::text[] then raise exception 'Unexpected migration history';end if;end $$;
create function pg_temp.fingerprint() returns jsonb language plpgsql as $$ declare t record; result jsonb:='{}'; h text; begin for t in select tablename from pg_tables where schemaname='cdl' order by tablename loop execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'''')) from cdl.%I r',t.tablename) into h;result:=result||jsonb_build_object(t.tablename,h);end loop;return result;end $$;
create temp table before_data as select pg_temp.fingerprint() as value;
${body}
insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},ARRAY[${quote(body)}]);
do $$ begin if (select value from before_data) is distinct from pg_temp.fingerprint() then raise exception 'Library data changed; rolling back';end if;end $$;
commit;select version from supabase_migrations.schema_migrations order by version;`;
if(process.argv[3]===undefined)console.log('Pinned project and rehearsed backup hashes verified. Dry run only.');
else if(process.argv[3]==='--apply')console.log(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
else throw new Error('Unknown apply option');
