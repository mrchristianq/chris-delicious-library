// Read-only remote capture plus network-disabled restoration of this release's
// already captured private database dump. Never restores the live database.
import {readFileSync,writeFileSync,chmodSync,copyFileSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {randomUUID,createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const backup='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-release-14065-qTbKTc';
if(process.argv.length!==2||readFileSync(resolve(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Pinned release project required');
process.env.CDL_V14_TEST='true';
process.env.CDL_V14_TRACKER_CONFIG_FILE='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/tracker-credentials.ljJkxV/connection.json';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {readTrackerConnection}=await import('../../app/lib/v14/tracker-read-server.ts');
const {saveTrackerRecoverySnapshot}=await import('../../app/lib/v14/tracker-recovery-server.ts');hook.deregister();
const connection=await readTrackerConnection(true);
const receipt=await saveTrackerRecoverySnapshot(createHash('sha256').update('release-14.0.65').digest('hex'),connection.grids);
copyFileSync(receipt.path,resolve(backup,'tracker.json.gz'));chmodSync(resolve(backup,'tracker.json.gz'),0o600);
const name='cdl-release-restore-'+randomUUID();let created=false;
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:40*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=text=>docker(['exec','-i',name,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],text);
try{
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+randomUUID(),'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw new Error('Restore not ready');
 sql(readFileSync(resolve(backup,'schema.sql')));
 sql("insert into auth.users(id) values ('baf0dab8-9904-48f2-a00f-30773bfc6ae1');");
 sql(readFileSync(resolve(backup,'data.sql')));
 const result=sql("select json_build_object('active_items',(select count(*) from cdl.items where deleted_at is null),'baselines',(select count(*) from cdl.sync_baselines),'running',(select count(*) from cdl.sync_runs where status='running'),'enabled_targets',(select count(*) from cdl.sync_targets where enabled));");
 const state=JSON.parse(result.trim());if(state.active_items!==2340||state.baselines!==2340||state.running!==0||state.enabled_targets!==0)throw new Error('Unexpected restored state; review before release');
 const files=['schema.sql','data.sql','tracker.json.gz'];const hashes=Object.fromEntries(files.map(f=>[f,createHash('sha256').update(readFileSync(resolve(backup,f))).digest('hex')]));
 writeFileSync(resolve(backup,'verification.json'),JSON.stringify({version:'14.0.65',capturedAt:new Date().toISOString(),project:'xnitocbxdpikvfxssbvm',tracker:connection.grids[0].spreadsheetId,restored:state,hashes,scope:'CDL schema/data and new tracker; auth identities/secrets and R2 asset bytes are not included'},null,2),{mode:0o600});
 console.log(JSON.stringify({result:'PASS',backup,restored:state,hashes}));
}catch{throw new Error('Release backup verification failed; private dump retained, no live restore attempted');}
finally{if(created)docker(['rm','--force',name]);}
