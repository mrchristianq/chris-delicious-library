// Synthetic, network-disabled database only. Never accepts a live DB address.
import {execFileSync,spawnSync} from 'node:child_process';
import {readFileSync,readdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),name='cdl-recovery-'+randomUUID();let created=false;
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:40*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=s=>docker(['exec','-i',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],s);
const owner=randomUUID(),other=randomUUID(),library=randomUUID(),item=randomUUID(),episode=randomUUID(),worker=randomUUID();
const q=s=>"'"+String(s).replaceAll("'","''")+"'";
const as=(who,s)=>sql(`begin;select set_config('request.jwt.claim.sub','${who}',true);set local role authenticated;${s};commit;`);
const call=(fn,args,who=owner)=>JSON.parse(as(who,`select public.${fn}(${args.map(x=>typeof x==='object'?q(JSON.stringify(x))+'::jsonb':q(x)).join(',')})`).split('\n').find(l=>l.startsWith('{')||l.startsWith('[')));
const snap=()=>call('cdl_v14_recovery_snapshot',[library]);
function register(id,snapshot,kind='manual'){
 const path=`${owner}/${library}/${'a'.repeat(64)}/${id}.json.gz`;
 as(owner,`insert into storage.objects(bucket_id,name,metadata) values('cdl-v14-recovery',${q(path)},'{"size":100}')`);
 return call('cdl_v14_recovery_register',[library,id,kind,{format:'cdl-library-backup-v1',bucket:'cdl-v14-recovery',path,bytes:100,capturedAt:snapshot.capturedAt,sha256:'a'.repeat(64)}, {total:1},snapshot.stateDigest]);
}
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+randomUUID(),'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
 sql(readFileSync('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-release-14065-qTbKTc/storage-schema-for-rehearsal.sql','utf8'));
 for(const file of readdirSync(resolve(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())sql(readFileSync(resolve(root,'supabase/migrations',file),'utf8'));
 sql(`create schema if not exists supabase_migrations;create table if not exists supabase_migrations.schema_migrations(version text primary key);insert into supabase_migrations.schema_migrations values('20261023002800');
 insert into auth.users(id) values('${owner}'),('${other}'),('${worker}');
 insert into cdl.libraries(id,owner_id,name) values('${library}','${owner}','Recovery fixture');
 insert into cdl.nightly_workers(user_id,library_id,enabled) values('${worker}','${library}',true);
 insert into cdl.items(id,library_id,media_type,title,notes) values('${item}','${library}','tv','Original title','Original notes');
 insert into cdl.episodes(id,library_id,show_id,season_number,episode_number) values('${episode}','${library}','${item}',1,1);
 insert into cdl.episode_progress(episode_id,library_id,watched,revision) values('${episode}','${library}',true,7);
 insert into cdl.settings(library_id,key,value,revision) values('${library}','theme','{"value":"dark"}',8);`);
 assert.throws(()=>call('cdl_v14_recovery_snapshot',[library],other));
 assert.throws(()=>as(owner,'select * from cdl.recovery_backups'));
 const target=snap(),backupId=randomUUID(),laterItem=randomUUID();register(backupId,target);
 sql(`insert into cdl.items(id,library_id,media_type,title,notes) values('${laterItem}','${library}','game','Added after backup','Keep in safety backup');`);
 assert.equal(target.tables.recovery_backups,undefined);
 sql(`update cdl.items set title='Changed title',notes='New notes',revision=9 where id='${item}';update cdl.episode_progress set watched=false,revision=10;update cdl.settings set value='{"value":"light"}',revision=11;`);
 let preview=call('cdl_v14_recovery_preview',[library,backupId,target]);
 assert.throws(()=>call('cdl_v14_recovery_restore',[library,preview.token,randomUUID(),target]),/Library changed/);
 // Changes since preview reject even a newly verified safety backup.
 sql(`update cdl.items set notes='Concurrent change',revision=12 where id='${item}'`);
 register(preview.token,snap(),'before-restore');
 assert.throws(()=>call('cdl_v14_recovery_restore',[library,preview.token,preview.token,target]),/Library changed/);
 preview=call('cdl_v14_recovery_preview',[library,backupId,target]);const beforeRestore=snap();register(preview.token,beforeRestore,'before-restore');
 assert.throws(()=>call('cdl_v14_recovery_restore',[library,preview.token,preview.token,{...target,ownerId:other}]),/changed/);
 const receipt=call('cdl_v14_recovery_restore',[library,preview.token,preview.token,target]);
 assert.equal(receipt.confirmed,true);
 const restored=snap(),restoredItem=restored.tables.items.find(r=>r.id===item);assert.equal(restoredItem.title,'Original title');assert.equal(restoredItem.notes,'Original notes');
 assert.ok(restored.tables.items.find(r=>r.id===laterItem).deleted_at);
 assert.equal(restored.tables.episode_progress[0].watched,true);assert.ok(restoredItem.revision>12);assert.ok(restored.tables.episode_progress[0].revision>10);
 assert.equal(restored.tables.settings.find(r=>r.key==='theme').value.value,'dark');
 assert.equal(sql(`select enabled from cdl.nightly_workers where library_id='${library}'`).trim(),'f');
 assert.equal(restored.tables.change_events.filter(r=>r.entity_kind==='library-restore').length,1);
 assert.deepEqual(call('cdl_v14_recovery_restore',[library,preview.token,preview.token,target]),receipt);
 assert.throws(()=>call('cdl_v14_recovery_restore',[library,preview.token,preview.token,target],other));
 const undo=call('cdl_v14_recovery_preview',[library,preview.token,beforeRestore]);register(undo.token,snap(),'before-restore');
 assert.equal(call('cdl_v14_recovery_restore',[library,undo.token,undo.token,beforeRestore]).confirmed,true);
 const undone=snap();assert.equal(undone.tables.items.find(r=>r.id===item).notes,'Concurrent change');assert.equal(undone.tables.items.find(r=>r.id===laterItem).deleted_at,null);assert.equal(undone.tables.episode_progress[0].watched,false);
 console.log('PASS: owner isolation, verified safety gate, concurrent-change rejection, tamper rejection, notes/settings/progress recovery, fresh revisions, audit, paused nightly, idempotent retry.');
}catch(e){console.error(String(e.stderr??e.message).slice(-4000));process.exitCode=1;}finally{if(created)docker(['rm','--force',name]);}
