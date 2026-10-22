// Local, owner-scoped first-sync runner. Dry run by default. No scheduler or
// production route is enabled, and the original Sheet ID is never accepted.
import {registerHooks} from 'node:module';
import {readFileSync,lstatSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
const root=fileURLToPath(new URL('../../',import.meta.url));
const owner='baf0dab8-9904-48f2-a00f-30773bfc6ae1',library='9fdfae4a-31f5-5c8f-aa64-af839a853b48';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {TRACKER_ID}=await import('../../app/lib/v14/tracker-read.ts');
const {readTrackerConnection}=await import('../../app/lib/v14/tracker-read-server.ts');
const {readLibrary}=await import('../../app/lib/v14/read-library.ts');
const {saveSetting}=await import('../../app/lib/v14/save-setting.ts');
const {decodeTrackerRunManifest,journalForTrackerRun,trackerApprovalDigest}=await import('../../app/lib/v14/tracker-run-manifest.ts');
const {createTrackerJournalStore}=await import('../../app/lib/v14/tracker-journal-store.ts');
const {advanceSyncBatch}=await import('../../app/lib/v14/tracker-checkpoint.ts');
const {inspectTrackerWriteStep}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {buildTrackerGoogleBatch}=await import('../../app/lib/v14/tracker-google-batch.ts');
const {writeTrackerPreparedBatch}=await import('../../app/lib/v14/tracker-write-server.ts');
const {saveTrackerRecoverySnapshot}=await import('../../app/lib/v14/tracker-recovery-server.ts');
const {initialTrackerReview}=await import('../../app/lib/v14/tracker-mapped-review.ts');hook.deregister();

const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
function query(sql){
  try{return JSON.parse(execFileSync('supabase',['db','query','--linked',sql],{cwd:root,encoding:'utf8',timeout:60000,maxBuffer:40*1024*1024,stdio:['ignore','pipe','pipe']}));}
  catch{throw new Error('Pinned database call failed; no confirmed result');}
}
function rpc(expression){
  const result=query(`begin;select set_config('request.jwt.claim.sub',${quote(owner)},true);set local role authenticated;select ${expression} as data;commit;`);
  const rows=result.rows?.filter(r=>Object.hasOwn(r,'data'));if(rows?.length!==1)throw new Error('Invalid owner RPC readback');return rows[0].data;
}
const writer={authenticatedOwner:async()=>owner,snapshot:async()=>rpc(`public.cdl_v14_snapshot(${quote(library)}::uuid)`),
  write:async(id,key,revision,requestId,value)=>{if(id!==library)throw new Error('Wrong library');return rpc(`public.cdl_v14_save_setting(${quote(library)}::uuid,${quote(key)},${revision===null?'null':Number(revision)},${quote(requestId)}::uuid,${quote(JSON.stringify({value}))}::jsonb)`);}};
const fingerprints=()=>query("select jsonb_build_object('items',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.items r),'metadata',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.item_metadata r),'episodes',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.episodes r),'progress',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.episode_progress r)) as data;").rows[0].data;
export {writer,rpc,fingerprints,root,library,owner};

export async function main(args){
  let config,run,apply=false;
  for(let i=0;i<args.length;i++){
    if(args[i]==='--tracker-config'&&!config)config=args[++i];
    else if(args[i]==='--run'&&!run)run=args[++i];
    else if(args[i]==='--apply'&&!apply)apply=true;
    else throw new Error('Unknown runner option');
  }
  if(!config||!config.startsWith('/')||!run||!/^[a-f0-9]{64}$/.test(run)||readFileSync(resolve(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Explicit pinned project, private configuration and run hash required');
  process.env.CDL_V14_TEST='true';process.env.CDL_V14_TRACKER_CONFIG_FILE=config;
  delete process.env.CDL_V14_TRACKER_WRITE_TARGET;
  const protectedBefore=fingerprints();
  const initial=await readLibrary(writer,library),stored=initial.settings.find(s=>s.key===`__cdl_tracker_manifest_v1:${run}`);
  if(!stored)throw new Error('Confirmed run package unavailable');
  const manifest=decodeTrackerRunManifest(stored.value.value,library,run);
  const activeKey='__cdl_tracker_active_run_v1';
  async function fresh(requireActive=false){
    const [snapshot,connection]=await Promise.all([readLibrary(writer,library),readTrackerConnection(true)]);
    if(!connection?.tables||!connection.grids||trackerApprovalDigest(snapshot.settings)!==manifest.approvalDigest||snapshot.settings.find(s=>s.key===stored.key)?.value.value!==stored.value.value)throw new Error('Fresh run source or approval changed');
    const active=snapshot.settings.find(s=>s.key===activeKey);
    if(active&&active.value.value!==run||requireActive&&!active)throw new Error('Another run owns the target');
    const states=manifest.steps.map(step=>{
      const item=snapshot.items.find(i=>i.id===step.itemId),table=connection.tables.find(t=>t.name===step.tab);
      return item&&table?inspectTrackerWriteStep(step,item,table).state:'conflict';
    });
    return {snapshot,connection,states};
  }
  let source=await fresh();
  const batch=buildTrackerGoogleBatch(manifest.steps,source.snapshot.items,source.connection.tables,source.connection.grids);
  console.log(JSON.stringify({stage:'fresh-preflight',run,apply,records:manifest.steps.length,requests:batch.requests.length,states:source.states.reduce((a,s)=>(a[s]=(a[s]??0)+1,a),{})}));
  if(source.states.includes('conflict'))throw new Error('Execution preflight has conflicts');
  if(!apply)return;
  let active=source.snapshot.settings.find(s=>s.key===activeKey);
  if(!active){
    try{await saveSetting(writer,library,activeKey,null,randomUUID(),run);}catch(cause){const recheck=await readLibrary(writer,library);if(recheck.settings.find(s=>s.key===activeKey)?.value.value!==run)throw cause;}
    active=(await readLibrary(writer,library)).settings.find(s=>s.key===activeKey);
  }
  if(active?.value.value!==run)throw new Error('Active run claim not confirmed');
  const backupKey=`__cdl_tracker_backup_v1:${run}`;
  const current=await readLibrary(writer,library);let backup;
  const savedBackup=current.settings.find(s=>s.key===backupKey);
  if(savedBackup)backup=JSON.parse(savedBackup.value.value);
  else{
    backup=await saveTrackerRecoverySnapshot(run,source.connection.grids);
    await saveSetting(writer,library,backupKey,null,randomUUID(),JSON.stringify(backup));
  }
  if(!backup?.path?.startsWith('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/tracker-pre-sync-')||!backup.path.endsWith('/tracker.json.gz'))throw new Error('Invalid recovery location');
  const stat=lstatSync(backup.path);
  if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||stat.uid!==process.getuid()||createHash('sha256').update(readFileSync(backup.path)).digest('hex')!==backup.sha256)throw new Error('Recovery artifact not confirmed');
  console.log(JSON.stringify({stage:'recovery-confirmed',run,backup}));
  const expected=journalForTrackerRun(manifest),store=createTrackerJournalStore(writer,library,expected);
  process.env.CDL_V14_TRACKER_WRITE_TARGET=TRACKER_ID;
  const result=await advanceSyncBatch(store,expected,{
    async inspectAll(){source=await fresh(true);return source.states;},
    async apply(){
      source=await fresh(true);if(source.states.includes('conflict'))throw new Error('Source changed before dispatch');
      console.log(JSON.stringify({stage:'dispatching-one-atomic-batch',run}));
      await writeTrackerPreparedBatch(manifest.steps,source.snapshot.items,source.connection.tables,source.connection.grids);
    },
  });
  delete process.env.CDL_V14_TRACKER_WRITE_TARGET;
  if(result.status!=='verified')throw new Error(`Batch is ${result.status}; no automatic retry will be attempted`);
  source=await fresh(true);
  const hints=rpc(`public.cdl_v14_tracker_provenance(${quote(library)}::uuid)`);
  if(hints.ownerId!==owner||hints.libraryId!==library)throw new Error('Wrong final provenance owner');
  const comparison=initialTrackerReview(source.snapshot.items,source.connection.tables,source.connection.observedAt,hints.entries);
  if(comparison.changes.length||comparison.identityIssues)throw new Error('Final whole-library comparison still has differences');
  const receiptKey=`__cdl_tracker_verified_run_v1:${run}`;
  const existing=source.snapshot.settings.find(s=>s.key===receiptKey);
  const receipt={version:1,target:TRACKER_ID,run,confirmedAt:new Date().toISOString(),records:source.snapshot.items.length,operations:manifest.steps.length,baselineConfirmed:false,backupSha256:backup.sha256};
  if(!existing)await saveSetting(writer,library,receiptKey,null,randomUUID(),JSON.stringify(receipt));
  const protectedAfter=fingerprints();
  if(JSON.stringify(protectedBefore)!==JSON.stringify(protectedAfter))throw new Error('Library data changed during execution; inspect before confirming any baseline');
  console.log(JSON.stringify({stage:'tracker-verified',run,journalRevision:result.record.revision,matchedRecords:comparison.matchedRecords,differences:comparison.changes.length,baselineConfirmed:false,protectedData:protectedAfter}));
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{await main(process.argv.slice(2));}catch(cause){delete process.env.CDL_V14_TRACKER_WRITE_TARGET;console.error(cause instanceof Error?cause.message:'Guarded initial sync stopped');process.exitCode=1;}
}
