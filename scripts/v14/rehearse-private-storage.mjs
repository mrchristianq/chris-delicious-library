// Uses an actual schema export including the project's existing Storage RLS.
// No remote writes or real object uploads; disposable network-disabled SQL only.
import {execFileSync,spawnSync} from 'node:child_process';import {readFileSync} from 'node:fs';import {randomUUID} from 'node:crypto';import assert from 'node:assert/strict';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),backup='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-release-14065-qTbKTc',name='cdl-private-storage-'+randomUUID();let created=false;
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:40*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=s=>docker(['exec','-i',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],s);
const owner='baf0dab8-9904-48f2-a00f-30773bfc6ae1',library='9fdfae4a-31f5-5c8f-aa64-af839a853b48',foreign='11111111-1111-4111-8111-111111111111';
const path=`${owner}/${library}/${'a'.repeat(64)}/${randomUUID()}.json.gz`;
const as=(who,s)=>sql(`begin;select set_config('request.jwt.claim.sub','${who}',true);set local role authenticated;${s};commit;`);
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+randomUUID(),'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
 sql(readFileSync(resolve(backup,'schema.sql')));sql(`insert into auth.users(id) values('${owner}'),('${foreign}');`);sql(readFileSync(resolve(backup,'data.sql')));
 sql(readFileSync(resolve(backup,'storage-schema-for-rehearsal.sql')));
 const before=sql('select md5(jsonb_agg(to_jsonb(i) order by id)::text) from cdl.items i;');
 sql(readFileSync(resolve(root,'supabase/migrations/20261021002400_v14_private_recovery.sql')));
 assert.equal(sql("select public from storage.buckets where id='cdl-v14-recovery';").trim(),'f');
 as(owner,`insert into storage.objects(bucket_id,name) values('cdl-v14-recovery','${path}')`);
 assert.match(as(owner,`select count(*) from storage.objects where bucket_id='cdl-v14-recovery'`),/\n1\n/);
 assert.match(as(foreign,`select count(*) from storage.objects where bucket_id='cdl-v14-recovery'`),/\n0\n/);
 assert.throws(()=>as(foreign,`insert into storage.objects(bucket_id,name) values('cdl-v14-recovery','${path.replace(owner,foreign)}')`));
 assert.throws(()=>as(owner,`insert into storage.objects(bucket_id,name) values('cdl-v14-recovery','${path.replace(library,foreign)}')`));
 assert.throws(()=>as(owner,`insert into storage.objects(bucket_id,name) values('cdl-v14-recovery','${path.replace('a'.repeat(64),'invalid')}')`));
 assert.throws(()=>sql(`begin;set local role anon;insert into storage.objects(bucket_id,name) values('cdl-v14-recovery','${path}');commit;`));
 // Normal owners cannot overwrite or delete their backups through RLS.
 as(owner,`update storage.objects set name='changed' where bucket_id='cdl-v14-recovery'`);
 assert.throws(()=>as(owner,`delete from storage.objects where bucket_id='cdl-v14-recovery'`));
 assert.equal(sql("select count(*) from storage.objects where bucket_id='cdl-v14-recovery';").trim(),'1');
 assert.equal(sql('select md5(jsonb_agg(to_jsonb(i) order by id)::text) from cdl.items i;'),before);
 console.log(JSON.stringify({result:'PASS',privateBucket:true,ownerReadInsert:true,foreignAndAnonDenied:true,wrongLibraryDenied:true,overwriteAndDeleteDenied:true,libraryUnchanged:true,liveWrites:0}));
}catch(e){console.error('Isolated Storage RLS rehearsal failed:',String(e.stderr??e.message).slice(-1100));process.exitCode=1;}
finally{if(created)docker(['rm','--force',name]);}
