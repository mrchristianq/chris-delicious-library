// Independent private download + real isolated restore. Never restores live.
import {registerHooks} from 'node:module';import {execFileSync,spawnSync} from 'node:child_process';import {readFileSync,writeFileSync,lstatSync} from 'node:fs';import {resolve} from 'node:path';import {randomUUID,createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),dir=process.argv[2],jobId=process.argv[3];
if(!dir?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/nightly-14075-')||!lstatSync(dir).isDirectory()||lstatSync(dir).isSymbolicLink()||!/^[a-f0-9-]{36}$/.test(jobId)||readFileSync(root+'/supabase/.temp/project-ref','utf8').trim()!=='xnitocbxdpikvfxssbvm')throw Error('Pinned private verification required');
process.loadEnvFile(root+'/.env.local');process.env.CDL_V14_TEST='true';process.env.CDL_V14_ORIGIN='http://localhost:3014';delete process.env.VERCEL;
process.env.CDL_V14_NIGHTLY_CREDENTIAL=readFileSync(dir+'/credential.json','utf8');
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {createNightlyClient,NIGHTLY_OWNER,NIGHTLY_LIBRARY}=await import('../../app/lib/v14/nightly-client.ts');const {verifyFullLibraryBackup}=await import('../../app/lib/v14/nightly-backup.ts');h.deregister();
const query=JSON.parse(execFileSync('supabase',['db','query','--linked',`select full_backup as receipt from cdl.nightly_jobs where id='${jobId}' and library_id='${NIGHTLY_LIBRARY}' and retired_at is null;`],{cwd:root,encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']}));
const receipt=query.rows?.[0]?.receipt;if(!receipt)throw Error('Verified archive receipt unavailable');
const {raw}=await createNightlyClient(),store=raw.storage.from('cdl-v14-recovery');
const backup=await verifyFullLibraryBackup(store,receipt,NIGHTLY_OWNER,NIGHTLY_LIBRARY);
const file=await store.download(receipt.path);if(file.error||!file.data)throw Error('Archive download failed');
const bytes=Buffer.from(await file.data.arrayBuffer());if(createHash('sha256').update(bytes).digest('hex')!==receipt.sha256)throw Error('Archive bytes changed');
writeFileSync(dir+'/verified-weekly-backup.json.gz',bytes,{flag:'wx',mode:0o600});
const name='cdl-weekly-recovery-'+randomUUID();let created=false;
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:60*1024*1024,stdio:['pipe','pipe','pipe']});const sql=s=>docker(['exec','-i',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1','-At'],s);const q=s=>"'"+String(s).replaceAll("'","''")+"'";
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+randomUUID(),'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Recovery database unavailable');
 // No business table columns changed after this private pre-install schema.
 sql(readFileSync(dir+'/schema.sql','utf8'));sql(`insert into auth.users(id) values('${NIGHTLY_OWNER}');`);
 const order=['libraries','import_batches','import_rows','items','item_metadata','identifiers','episodes','episode_progress','settings','collections','collection_items','assets','import_issues','change_events','sync_targets','sync_outbox','sync_baselines','sync_runs','sync_conflicts'];
 if(JSON.stringify(Object.keys(backup.tables).sort())!==JSON.stringify(order.slice().sort()))throw Error('Recovery schema requires review');
 for(const table of order){
  const rows=q(JSON.stringify(backup.tables[table]));
  sql(`begin;insert into cdl.${table} select * from jsonb_populate_recordset(null::cdl.${table},${rows}::jsonb);
   do $$ begin if (select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),'[]'::jsonb) from cdl.${table} r) is distinct from
    (select coalesce(jsonb_agg(v order by v::text),'[]'::jsonb) from jsonb_array_elements(${rows}::jsonb) v) then raise exception 'Raw recovery mismatch: ${table}';end if;end $$;commit;`);
 }
 const report={at:new Date().toISOString(),downloadChecksumVerified:true,allRawTablesRestoredExactly:true,notesAndProgressIncluded:true,counts:receipt.counts,bytes:receipt.bytes,sha256:receipt.sha256,liveRestore:false};
 writeFileSync(dir+'/verified-weekly-restore.json',JSON.stringify(report,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify(report));
}catch(e){console.error(String(e.stderr??e.message).slice(-1800));process.exitCode=1;}finally{if(created)docker(['rm','--force',name]);}
