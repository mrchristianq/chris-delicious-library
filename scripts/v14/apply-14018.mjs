import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
// One reviewed test-project checkpoint. Refuses other projects or schema states.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Wrong linked project');
const backup=process.argv[2];if(!backup)throw new Error('Provide rehearsed private backup directory');
for(const [file,sha] of [['schema.sql','0fa9d0e52c41cb16ec201ef2f1432bda3df78afd0320f2864f7d62147c514643'],['data.sql','95679c2f06da99160e500f4db5569af2ffb98ce3e2a8d8be65fef365aef3743e']])if(createHash('sha256').update(readFileSync(path.join(backup,file))).digest('hex')!==sha)throw new Error('Backup does not match rehearsed checkpoint');
const quote=s=>`'${s.replaceAll("'","''")}'`;
const files=['20261015001200_v14_snapshot_materialization.sql'];
const expected=['20261010000100','20261011000200','20261011000300','20261012000400','20261012000500','20261012000600','20261013000700','20261013000800','20261013000900','20261013001000','20261014001100'];
let sql=`begin;do $$ begin if (select array_agg(version::text order by version) from supabase_migrations.schema_migrations) is distinct from array[${expected.map(quote).join(',')}]::text[] then raise exception 'Unexpected migration history';end if;end $$;
create function pg_temp.fingerprint() returns jsonb language plpgsql as $$ declare t record; result jsonb:='{}'; h text; begin for t in select tablename from pg_tables where schemaname='cdl' order by tablename loop execute format('select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'''')) from cdl.%I r',t.tablename) into h;result:=result||jsonb_build_object(t.tablename,h);end loop;return result;end $$;
create temp table before_data as select pg_temp.fingerprint() as value;`;
for(const file of files){const body=readFileSync(path.join(root,'supabase/migrations',file),'utf8').replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');sql+=body;sql+=`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},ARRAY[${quote(body)}]);`;}
sql+=`do $$ begin if (select value from before_data) is distinct from pg_temp.fingerprint() then raise exception 'Library data changed; rolling back';end if;end $$;commit;select version from supabase_migrations.schema_migrations order by version;`;
if(process.argv[3]!=='--apply')console.log('Pinned project and backup hashes verified. Dry run only.');
else console.log(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
