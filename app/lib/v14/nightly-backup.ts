import {createHash} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {storePrivateTrackerBackup} from './tracker-private-backup';

export type FullLibraryBackup={
 format:'cdl-library-backup-v1';libraryId:string;ownerId:string;capturedAt:string;
 migrations:string[];tables:Record<string,Record<string,unknown>[]>;
};
const required=['libraries','items','item_metadata','identifiers','episodes','episode_progress','settings','collections','collection_items','assets','import_batches','import_rows','import_issues','change_events','sync_targets','sync_outbox','sync_baselines','sync_runs','sync_conflicts'];
export function validateFullLibraryBackup(value:unknown,ownerId:string,libraryId:string):FullLibraryBackup{
 const b=value as FullLibraryBackup;
 if(!b||b.format!=='cdl-library-backup-v1'||b.ownerId!==ownerId||b.libraryId!==libraryId||
  !Number.isFinite(Date.parse(b.capturedAt))||!Array.isArray(b.migrations)||!b.migrations.length||b.migrations.some(v=>typeof v!=='string'||!/^\d{14}$/.test(v))||
  !b.tables||typeof b.tables!=='object'||Array.isArray(b.tables)||required.some(t=>!Object.hasOwn(b.tables,t)))throw new Error('Incomplete full library backup');
 for(const [table,rows] of Object.entries(b.tables)){
  if(!/^[a-z_]+$/.test(table)||['nightly_workers','nightly_jobs'].includes(table)||!Array.isArray(rows)||rows.length>1000000||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)||
   (table==='libraries'?r.id!==libraryId||r.owner_id!==ownerId:r.library_id!==libraryId)))throw new Error('Mixed or invalid backup records');
 }
 if(b.tables.libraries.length!==1)throw new Error('Backup library identity missing');
 return b;
}
export function encodeFullLibraryBackup(value:unknown,ownerId:string,libraryId:string){
 const backup=validateFullLibraryBackup(value,ownerId,libraryId),raw=Buffer.from(JSON.stringify(backup));
 if(raw.length>128000000)throw new Error('Full backup exceeds decoded safety limit');
 const bytes=gzipSync(raw);
 if(bytes.length>24000000)throw new Error('Full backup exceeds storage object limit');
 const prefix=createHash('sha256').update(raw).digest('hex');
 return {backup,bytes,prefix,counts:Object.fromEntries(Object.entries(backup.tables).map(([k,v])=>[k,v.length]))};
}
/** Exact remote bytes, decompression, scope and all rows must agree before sync. */
export async function saveFullLibraryBackup(
 store:Parameters<typeof storePrivateTrackerBackup>[0],encoded:ReturnType<typeof encodeFullLibraryBackup>,
){
 const {backup,bytes,prefix,counts}=encoded;
 const receipt=await storePrivateTrackerBackup(store,bytes,backup.ownerId,backup.libraryId,prefix);
 const read=await store.download(receipt.path);
 if(read.error||!read.data)throw new Error('Full backup recovery download failed');
 const restored=gunzipSync(Buffer.from(await read.data.arrayBuffer()),{maxOutputLength:128000000});
 const recovered=validateFullLibraryBackup(JSON.parse(restored.toString('utf8')),backup.ownerId,backup.libraryId);
 if(createHash('sha256').update(restored).digest('hex')!==prefix||JSON.stringify(recovered)!==JSON.stringify(backup))throw new Error('Full backup restore verification failed');
 return {...receipt,format:backup.format,capturedAt:backup.capturedAt,counts,decodedSha256:prefix};
}
export type FullBackupReceipt=Awaited<ReturnType<typeof saveFullLibraryBackup>>;
/** Reusing a weekly archive still verifies its actual private bytes today. */
export async function verifyFullLibraryBackup(store:Parameters<typeof storePrivateTrackerBackup>[0],receipt:FullBackupReceipt,ownerId:string,libraryId:string){
 if(!receipt||receipt.bucket!=='cdl-v14-recovery'||receipt.format!=='cdl-library-backup-v1'||
  typeof receipt.path!=='string'||!receipt.path.startsWith(`${ownerId}/${libraryId}/`)||
  !/^[a-f0-9]{64}$/.test(receipt.sha256)||!/^[a-f0-9]{64}$/.test(receipt.decodedSha256)||
  !Number.isSafeInteger(receipt.bytes)||receipt.bytes<1||receipt.bytes>24000000)throw new Error('Invalid weekly backup receipt');
 const read=await store.download(receipt.path);
 if(read.error||!read.data||read.data.size!==receipt.bytes)throw new Error('Weekly backup download not confirmed');
 const bytes=Buffer.from(await read.data.arrayBuffer());
 if(createHash('sha256').update(bytes).digest('hex')!==receipt.sha256)throw new Error('Weekly backup checksum mismatch');
 const raw=gunzipSync(bytes,{maxOutputLength:128000000});
 if(createHash('sha256').update(raw).digest('hex')!==receipt.decodedSha256)throw new Error('Weekly backup decoded checksum mismatch');
 return validateFullLibraryBackup(JSON.parse(raw.toString('utf8')),ownerId,libraryId);
}
/** Deletion candidates are selected AND authorized by SQL's ten-newest rule.
 * Normal/manual/migration backups cannot be returned or deleted by this path. */
export async function rotateWeeklyBackups(
 store:{remove:(paths:string[])=>PromiseLike<{error:unknown}>;list:(path:string,options:{search:string})=>PromiseLike<{data:Array<{name:string}>|null;error:unknown}>},
 candidates:FullBackupReceipt[],confirm:(path:string)=>Promise<unknown>,
){
 if(!Array.isArray(candidates)||candidates.length>100)throw new Error('Invalid retention candidates');
 for(const receipt of candidates){
  if(receipt?.bucket!=='cdl-v14-recovery'||receipt.format!=='cdl-library-backup-v1'||typeof receipt.path!=='string'||
   !/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[a-f0-9]{64}\/[a-f0-9-]{36}\.json\.gz$/.test(receipt.path))throw new Error('Invalid retention path');
  const removed=await store.remove([receipt.path]);if(removed.error)throw new Error('Backup retirement not confirmed');
  const slash=receipt.path.lastIndexOf('/'),name=receipt.path.slice(slash+1),remaining=await store.list(receipt.path.slice(0,slash),{search:name});
  if(remaining.error||!remaining.data||remaining.data.some(r=>r.name===name))throw new Error('Backup retirement readback failed');
  await confirm(receipt.path);
 }
 return candidates.length;
}
