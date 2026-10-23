import {createHash,randomUUID} from 'node:crypto';
import {createNightlyClient,NIGHTLY_OWNER,NIGHTLY_LIBRARY} from './nightly-client';
import {encodeFullLibraryBackup,saveFullLibraryBackup,verifyFullLibraryBackup,rotateWeeklyBackups,type FullBackupReceipt} from './nightly-backup';
import {captureTrackerRecoveryBytes} from './tracker-recovery-server';
import {RECOVERY_BUCKET,storePrivateTrackerBackup} from './tracker-private-backup';
import {readTrackerConnection} from './tracker-read-server';
import {readTrackerBaselineState} from './tracker-baseline-read';
import {readLibrary} from './read-library';
import {mixedWriter,readMixedContext,createMixedRunAdapter} from './tracker-mixed-server';
import {compileNightlyPlan} from './nightly-plan';
import {preflightMixedPackage} from './tracker-mixed-package';
import {stageMixedPlan} from './tracker-mixed-store';
import {advanceTrackerMixedRun} from './tracker-mixed-run';

/** Daily, durable claim; no automatic conflict choices or blind network retry.
 * A failed/uncertain run stays visible in the normal sync journal for review. */
export async function runNightly(retryJobId?:string){
 const {client,raw,call}=await createNightlyClient();
 const claim=await call(retryJobId?'retry-empty-job':'claim',retryJobId?{jobId:retryJobId}:{}) as {claimed:boolean;jobId?:string;backupDue?:boolean;fullBackup?:FullBackupReceipt|null};
 if(!claim?.claimed)return {status:'already-claimed'};
 const jobId=claim.jobId!;
 let stage='weekly-backup';
 try{
  const store=raw.storage.from(RECOVERY_BUCKET);
  let backup:FullBackupReceipt;
  if(claim.backupDue===true){
   const connection=await readTrackerConnection(true);
   if(!connection?.tables||!connection.grids)throw new Error('Fresh tracker unavailable');
   const recovery=await captureTrackerRecoveryBytes(createHash('sha256').update(jobId).digest('hex'),connection.grids);
   stage='database-export';const snapshot=await call('snapshot',{jobId}) as Record<string,unknown>;
   stage='archive-encoding';
   const encoded=encodeFullLibraryBackup({...snapshot,tracker:JSON.parse(recovery.bytes)},NIGHTLY_OWNER,NIGHTLY_LIBRARY);
   await call('backup-start',{jobId,prefix:encoded.prefix,bytes:encoded.bytes.length});
   stage='archive-storage';backup=await saveFullLibraryBackup(store,encoded);
   await call('backup-confirm',{jobId,receipt:backup});
   const candidates=await call('rotation-candidates') as FullBackupReceipt[];
   await rotateWeeklyBackups(store,candidates,path=>call('rotation-confirm',{path}));
  }else{
   if(!claim.fullBackup)throw new Error('Weekly recovery archive unavailable');
   backup=claim.fullBackup;
   await verifyFullLibraryBackup(store,backup,NIGHTLY_OWNER,NIGHTLY_LIBRARY);
   await call('backup-reference',{jobId,receipt:backup});
  }

  stage='sync-preparation';const writer=mixedWriter(client),context=await readMixedContext(client,NIGHTLY_OWNER,NIGHTLY_LIBRARY);
  if(context.activePlan){
   const result={backup,reason:'An existing sync run needs review; nightly made no sync changes.',syncedItems:0,needsReview:true};
   await call('finish',{jobId,status:'review',result});return {status:'review',jobId,...result};
  }
  const [library,baseline,freshTracker]=await Promise.all([readLibrary(writer,NIGHTLY_LIBRARY),readTrackerBaselineState(client,NIGHTLY_OWNER,NIGHTLY_LIBRARY),readTrackerConnection(true)]);
  const after=await readMixedContext(client,NIGHTLY_OWNER,NIGHTLY_LIBRARY);
  if(!baseline||!freshTracker?.tables||!freshTracker.grids||after.stamp!==context.stamp||after.metadataStamp!==context.metadataStamp)throw new Error('Sources changed during nightly preparation');
  const prepared=compileNightlyPlan(library,freshTracker.tables,baseline,context,freshTracker.observedAt);
  let syncedItems=0;
  if(prepared.plan){
   preflightMixedPackage(prepared.plan,library.items,freshTracker.tables,freshTracker.grids);
   // Small pre-write Sheet safety copy, not another full weekly archive.
   const prefix=createHash('sha256').update(jobId+prepared.plan.fingerprint).digest('hex');
   const safety=await captureTrackerRecoveryBytes(prefix,freshTracker.grids);
   await call('safety-start',{jobId,prefix,bytes:safety.compressed.length});
   const receipt=await storePrivateTrackerBackup(store,safety.compressed,NIGHTLY_OWNER,NIGHTLY_LIBRARY,prefix);
   await call('safety-confirm',{jobId,receipt});
   await stageMixedPlan(writer,prepared.plan,randomUUID());
   stage='sync-execution';const applied=await advanceTrackerMixedRun(prepared.plan,createMixedRunAdapter(client,prepared.plan));
   if(applied.status!=='verified')throw new Error('Nightly sync requires review; no success assumed');
   syncedItems=prepared.selected.length;
  }
  const result={backup,syncedItems,heldItems:prepared.heldItems.length,confirmedAt:new Date().toISOString()};
  const status=prepared.heldItems.length?'review':'completed';
  await call('finish',{jobId,status,result});
  return {status,jobId,...result};
 }catch(cause){
  console.error('cdl-nightly stage stopped',{stage});
  try{await call('fail',{jobId});}catch{/* A lost acknowledgement is never a successful run. */}
  throw cause;
 }
}
