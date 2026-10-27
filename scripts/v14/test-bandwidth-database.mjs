// Network-disabled, disposable database: never connects to a live project.
import {execFileSync,spawnSync} from 'node:child_process';import {readFileSync,readdirSync} from 'node:fs';import {randomUUID} from 'node:crypto';import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..'),name='cdl-bandwidth-'+randomUUID();let created=false;
const docker=(args,input)=>execFileSync('docker',args,{input,encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024,stdio:['pipe','pipe','pipe']});
const sql=s=>docker(['exec','-i',name,'psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1'],s);
try {
 docker(['run','--detach','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD='+randomUUID(),'public.ecr.aws/supabase/postgres:17.6.1.143']);created=true;
 let ready=false;for(let n=0;n<40;n++){if(spawnSync('docker',['exec',name,'pg_isready','-h','127.0.0.1','-U','postgres'],{stdio:'ignore'}).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Disposable database unavailable');
 // The read-path baseline precedes Storage/nightly migrations; those contracts
 // are unchanged and need the separate Storage service rehearsal to run.
 for(const file of readdirSync(resolve(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')&&(f<'20261021002400'||f.startsWith('20261027003000')||f.startsWith('20261027003100'))).sort())sql(readFileSync(resolve(root,'supabase/migrations',file),'utf8'));
 for(const file of ['incremental-reads.sql','bandwidth-reads.sql','bounded-snapshot.sql','legacy-source-order.sql','settings.sql','episode-progress.sql']) {sql(readFileSync(resolve(root,'supabase/tests',file),'utf8'));console.log('PASS '+file);}
} catch(e) {console.error(String(e.stderr??e.message).slice(-2000));process.exitCode=1;} finally {if(created){docker(['rm','--force',name]);console.log('Removed disposable database. Live database writes: 0');}}
