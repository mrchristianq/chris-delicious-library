// Read-only diagnostic. Any temporary job-state change is transaction-rolled
// back; it cannot upload an archive or dispatch a Sheet/library mutation.
import {registerHooks} from 'node:module';import {readFileSync,writeFileSync} from 'node:fs';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),dir=process.argv[2],id=process.argv[3];
if(!dir?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/nightly-14075-')||!/^[a-f0-9-]{36}$/.test(id)||readFileSync(root+'/supabase/.temp/project-ref','utf8').trim()!=='xnitocbxdpikvfxssbvm')throw Error('Pinned diagnostic arguments required');
process.env.CDL_V14_TEST='true';process.env.CDL_V14_ORIGIN='http://localhost:3014';process.env.CDL_V14_TRACKER_CONFIG_FILE='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/tracker-credentials.ljJkxV/connection.json';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {readTrackerConnection}=await import('../../app/lib/v14/tracker-read-server.ts');const {captureTrackerRecoveryBytes}=await import('../../app/lib/v14/tracker-recovery-server.ts');const {encodeFullLibraryBackup}=await import('../../app/lib/v14/nightly-backup.ts');h.deregister();
let at=Date.now();const c=await readTrackerConnection(true);if(!c?.grids)throw Error('Tracker read unavailable');console.log(JSON.stringify({stage:'tracker-read',ms:Date.now()-at}));
at=Date.now();const tracker=await captureTrackerRecoveryBytes('d'.repeat(64),c.grids);console.log(JSON.stringify({stage:'tracker-recovery',ms:Date.now()-at,bytes:tracker.compressed.length}));
const worker=JSON.parse(readFileSync(dir+'/credential.json')).userId;
at=Date.now();
const result=JSON.parse(execFileSync('supabase',['db','query','--linked',`begin;do $$ begin if not exists(select 1 from cdl.nightly_jobs where id='${id}' and status='failed' and backup_prefix is null and safety_prefix is null) then raise exception 'Diagnostic requires untouched failed job';end if;end $$;update cdl.nightly_jobs set status='running' where id='${id}';select set_config('request.jwt.claim.sub','${worker}',true);set local role authenticated;select public.cdl_v14_nightly_rpc('snapshot','{"jobId":"${id}"}'::jsonb) as data;rollback;`],{cwd:root,encoding:'utf8',timeout:120000,maxBuffer:128*1024*1024,stdio:['ignore','pipe','pipe']}));
const rows=result.rows?.filter(r=>Object.hasOwn(r,'data'));if(rows?.length!==1)throw Error('Diagnostic source not confirmed');const backup=rows[0].data;
console.log(JSON.stringify({stage:'database-export',ms:Date.now()-at}));
at=Date.now();const encoded=encodeFullLibraryBackup({...backup,tracker:JSON.parse(tracker.bytes)},'baf0dab8-9904-48f2-a00f-30773bfc6ae1','9fdfae4a-31f5-5c8f-aa64-af839a853b48');
writeFileSync(dir+'/diagnostic-backup.json.gz',encoded.bytes,{mode:0o600,flag:'wx'});
console.log(JSON.stringify({stage:'encode-full',ms:Date.now()-at,bytes:encoded.bytes.length,counts:encoded.counts}));
