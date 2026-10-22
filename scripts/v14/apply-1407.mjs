import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One-off, pinned checkpoint application. No production target or generic URL.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
if(readFileSync(path.join(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Wrong linked project');
const backup=process.argv[2];
if(!backup)throw new Error('Provide the privately restored pre-1407 backup directory');
for(const [file,expected] of [['schema-retry.sql','1d42d6c40e255f60339f4269a774ca9967bd02478531fdee9496b90d6081d072'],['data.sql','c89d16662d698c7de7e31ad08bdbadd30a7070d33c44583b5e1ac315318d3553']]){
 if(createHash('sha256').update(readFileSync(path.join(backup,file))).digest('hex')!==expected)throw new Error('Backup hash mismatch');
}
const quote=value=>"'"+value.replaceAll("'","''")+"'";
const migrations=['20261012000400_v14_snapshot.sql','20261012000500_v14_episode_progress.sql','20261012000600_v14_settings.sql'];
const fingerprint=`select jsonb_object_agg(name,hash) from (
 select 'items' name,md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) hash from cdl.items t
 union all select 'progress',md5(coalesce(jsonb_agg(to_jsonb(t) order by episode_id)::text,'')) from cdl.episode_progress t
 union all select 'settings',md5(coalesce(jsonb_agg(to_jsonb(t) order by library_id,key)::text,'')) from cdl.settings t
 union all select 'audit',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from cdl.change_events t
 union all select 'outbox',md5(coalesce(jsonb_agg(to_jsonb(t) order by id)::text,'')) from cdl.sync_outbox t) f`;
let sql=`begin; create temp table checkpoint_before as ${fingerprint};`;
for(const file of migrations){
 const source=readFileSync(path.join(root,'supabase/migrations',file),'utf8');
 const body=source.replace(/^begin;\s*/,'').replace(/commit;\s*$/,'');
 sql+=body;
 sql+=`insert into supabase_migrations.schema_migrations(version,name,statements) values(${quote(file.slice(0,14))},${quote(file.slice(15,-4))},ARRAY[${quote(body)}]);`;
}
sql+=`do $$ begin if (select * from checkpoint_before) is distinct from (${fingerprint}) then raise exception 'Library changed during checkpoint; rolling back'; end if; end $$; commit;
select version from supabase_migrations.schema_migrations order by version;`;
if(process.argv[3]!=='--apply'){console.log('Verified target and restored-backup hashes. Dry run only; add --apply to execute.');}
else console.log(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:1024*1024}));
