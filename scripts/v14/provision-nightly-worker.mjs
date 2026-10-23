// Explicit, one-off provisioning. Existing administrator access is used only
// in process to create a separate ordinary Auth identity, never deployed.
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,existsSync,lstatSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {createClient} from '@supabase/supabase-js';
const root=resolve(import.meta.dirname,'../..'),dir=process.argv[2],project='xnitocbxdpikvfxssbvm';
if(process.argv[3]!=='--create-approved-worker'||!dir?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/nightly-14075-')||!lstatSync(dir).isDirectory()||lstatSync(dir).isSymbolicLink()||readFileSync(root+'/supabase/.temp/project-ref','utf8').trim()!==project)throw Error('Explicit approval, private folder and pinned project required');
if(existsSync(dir+'/credential.pending.json')||existsSync(dir+'/credential.json'))throw Error('Provisioning already dispatched; inspect before retry');
const query=sql=>JSON.parse(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']}));
const ready=query("select to_regprocedure('public.cdl_v14_nightly_rpc(text,jsonb)') is not null ready;");
if(ready.rows?.[0]?.ready!==true)throw Error('Restricted gateway must be installed first');
const pending={email:`cdl-nightly-${randomBytes(10).toString('hex')}@example.invalid`,password:randomBytes(48).toString('base64url')};
writeFileSync(dir+'/credential.pending.json',JSON.stringify(pending),{flag:'wx',mode:0o600});
// Capture existing administrative credentials privately; never print, persist,
// or pass them in process arguments. The deployed worker cannot read API keys.
const listed=JSON.parse(execFileSync('supabase',['projects','api-keys','--project-ref',project,'--reveal','--output','json'],{cwd:root,encoding:'utf8',timeout:60000,stdio:['ignore','pipe','pipe']}));
const keys=Array.isArray(listed)?listed:listed.keys;
const key=keys?.find(k=>k.name==='service_role')?.api_key??keys?.find(k=>k.type==='secret')?.api_key;
if(typeof key!=='string'||key.length<40)throw Error('Provisioning authorization unavailable');
const admin=createClient(`https://${project}.supabase.co`,key,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}});
const made=await admin.auth.admin.createUser({...pending,email_confirm:true,app_metadata:{purpose:'cdl-v14-nightly-worker'}});
if(made.error||!made.data.user?.id)throw Error('Worker creation was not confirmed; inspect pending provisioning before retry');
const userId=made.data.user.id;
const check=await admin.auth.admin.getUserById(userId);
if(check.error||check.data.user?.email!==pending.email||!check.data.user.email_confirmed_at)throw Error('Worker identity readback failed');
writeFileSync(dir+'/credential.json',JSON.stringify({...pending,userId}),{flag:'wx',mode:0o600});
writeFileSync(dir+'/cron-secret.txt',randomBytes(48).toString('base64url'),{flag:'wx',mode:0o600});
console.log(JSON.stringify({workerId:userId,ordinaryAuthAccount:true,confirmed:true,administratorKeyStored:false,workerEnabled:false}));
