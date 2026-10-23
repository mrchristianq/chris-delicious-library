import {createHash} from 'node:crypto';
import {createV14Client} from '../../../lib/v14/server';
import {getV14Config} from '../../../lib/v14/config';
import {RECOVERY_BUCKET} from '../../../lib/v14/tracker-private-backup';
import type {FullBackupReceipt} from '../../../lib/v14/nightly-backup';
import {encodeFullLibraryBackup,saveFullLibraryBackup,verifyFullLibraryBackup} from '../../../lib/v14/nightly-backup';
import {backupSummary,compareBackupItems} from '../../../lib/v14/backup-summary';
export const dynamic='force-dynamic';
export const maxDuration=300;
const headers={'Cache-Control':'private, no-store',Vary:'Cookie, Origin','X-Content-Type-Options':'nosniff'};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function GET(request:Request){
 try{
  const config=getV14Config(),url=new URL(request.url),libraryId=url.searchParams.get('libraryId'),id=url.searchParams.get('id');
  if(request.headers.get('origin')&&request.headers.get('origin')!==config.origin||request.headers.get('sec-fetch-site')&&request.headers.get('sec-fetch-site')!=='same-origin')return Response.json({error:'Same-origin request required'},{status:403,headers});
  const preview=url.searchParams.get('preview');
  if(!libraryId||!uuid.test(libraryId)||id!==null&&!uuid.test(id)||preview!==null&&(preview!=='true'||!id)||[...url.searchParams.keys()].some(k=>!['libraryId','id','preview'].includes(k)))return Response.json({error:'Invalid backup request'},{status:400,headers});
  const client=await createV14Client(true),auth=await client.auth.getUser();
  if(auth.error||!auth.data.user)return Response.json({error:'Sign-in required'},{status:401,headers});
  const listed=await client.rpc('cdl_v14_backups',{p_library_id:libraryId});
  if(listed.error||!Array.isArray(listed.data))throw new Error('Backup list unavailable');
  const rows=listed.data as Array<{id:string;receipt:FullBackupReceipt;summary?:ReturnType<typeof backupSummary>;kind?:string}>;
  if(!id)return Response.json({backups:rows.map(r=>({id:r.id,capturedAt:r.receipt.capturedAt,bytes:r.receipt.bytes,sha256:r.receipt.sha256,counts:r.receipt.counts,summary:r.summary,kind:r.kind??'scheduled'}))},{headers});
  const receipt=rows.find(r=>r.id===id)?.receipt;
  if(!receipt)return Response.json({error:'Backup not available'},{status:404,headers});
  if(preview==='true'){
   const target=await verifyFullLibraryBackup(client.storage.from(RECOVERY_BUCKET),receipt,auth.data.user.id,libraryId);
   const current=await client.rpc('cdl_v14_recovery_snapshot',{p_library_id:libraryId});
   // Reading an archive never creates a restore token or recovery record.
   const changes=current.error?null:compareBackupItems(current.data,target);
   return Response.json({backupId:id,capturedAt:target.capturedAt,summary:backupSummary(target),changes,
    canRestore:!current.error&&process.env.CDL_V14_VALIDATION_READ_ONLY!=='true',
    notice:current.error?'Backup verified. Comparing with your current library requires the pending recovery database update.':process.env.CDL_V14_VALIDATION_READ_ONLY==='true'?'Read-only preview: no changes have been saved. Restoring is disabled.':null},{headers});
  }
  if(receipt.bucket!==RECOVERY_BUCKET||!receipt.path.startsWith(`${auth.data.user.id}/${libraryId}/`)||receipt.bytes>24000000)throw new Error('Backup scope changed');
  const read=await client.storage.from(RECOVERY_BUCKET).download(receipt.path);
  if(read.error||!read.data||read.data.size!==receipt.bytes)throw new Error('Backup download unconfirmed');
  const bytes=Buffer.from(await read.data.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==receipt.sha256)throw new Error('Backup checksum mismatch');
  // Stream verified bytes; no public URL or Storage path is returned.
  return new Response(new Blob([bytes]).stream(),{headers:{...headers,'Content-Type':'application/gzip','Content-Disposition':`attachment; filename="CDL-backup-${receipt.capturedAt.slice(0,10)}.json.gz"`}});
 }catch{console.warn('CDL backup list/download unavailable');return Response.json({error:'Backup access was not confirmed. Please retry.'},{status:503,headers});}
}

/** No Sheet client or service-role credentials: every operation runs as owner. */
export async function POST(request:Request){
 try{
  if(process.env.CDL_V14_VALIDATION_READ_ONLY==='true')return Response.json({error:'Read-only session.'},{status:403,headers});
  if(request.headers.get('origin')!==getV14Config().origin||!['same-origin',null].includes(request.headers.get('sec-fetch-site')))return Response.json({error:'Same-origin request required.'},{status:403,headers});
  if(request.headers.get('content-type')?.split(';')[0]!=='application/json')return Response.json({error:'JSON required.'},{status:415,headers});
  const reader=request.body?.getReader();if(!reader)throw Error('Missing request');
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return Response.json({error:'Request too large.'},{status:413,headers});}chunks.push(value);}}finally{reader.releaseLock();}
  const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
  if(!body||!uuid.test(body.libraryId??'')||!uuid.test(body.requestId??'')||!['create','preview','restore'].includes(body.action)||Object.keys(body).some(k=>!['action','libraryId','requestId','backupId','token'].includes(k))||body.action!=='create'&&!uuid.test(body.backupId??'')||body.action==='restore'&&!uuid.test(body.token??''))return Response.json({error:'Invalid recovery request.'},{status:400,headers});
  const client=await createV14Client(),auth=await client.auth.getUser();
  if(auth.error||!auth.data.user)return Response.json({error:'Sign-in required.'},{status:401,headers});
  const owner=auth.data.user.id,libraryId=body.libraryId,store=client.storage.from(RECOVERY_BUCKET);
  async function rpc(name:string,args:Record<string,unknown>){const r=await client.rpc(name,args);if(r.error)throw Error('Recovery not confirmed. The library may have changed, a sync may be active, or recovery setup may be unavailable. Refresh and preview again.');return r.data;}
  const rows=await rpc('cdl_v14_backups',{p_library_id:libraryId}) as Array<{id:string;receipt:FullBackupReceipt;kind?:string}>;
  if(!Array.isArray(rows))throw Error('Backup list unavailable.');
  async function createBackup(id:string,kind:'manual'|'before-restore'){
   const existing=rows.find(r=>r.id===id);
   if(existing){if(existing.kind!==kind)throw Error('Backup request changed.');await verifyFullLibraryBackup(store,existing.receipt,owner,libraryId);return existing;}
   const raw=await rpc('cdl_v14_recovery_snapshot',{p_library_id:libraryId});
   if(!/^[a-f0-9]{32}$/.test(raw?.stateDigest))throw Error('Snapshot confirmation unavailable.');
   const encoded=encodeFullLibraryBackup(raw,owner,libraryId);
   if(rows.reduce((sum,r)=>sum+r.receipt.bytes,0)+encoded.bytes.length>200000000)throw Error('Backup storage safety limit reached. Download and review older manual backups before creating more; nothing was deleted.');
   const receipt=await saveFullLibraryBackup(store,encoded);
   const saved=await rpc('cdl_v14_recovery_register',{p_library_id:libraryId,p_id:id,p_kind:kind,p_receipt:receipt,p_summary:backupSummary(encoded.backup),p_digest:raw.stateDigest});
   if(saved?.id!==id||saved.receipt?.sha256!==receipt.sha256)throw Error('Backup registration was not confirmed.');return saved;
  }
  if(body.action==='create'){const saved=await createBackup(body.requestId,'manual');return Response.json({confirmed:true,id:saved.id},{headers});}
  const selected=rows.find(r=>r.id===body.backupId);if(!selected)return Response.json({error:'Backup not available.'},{status:404,headers});
  const target=await verifyFullLibraryBackup(store,selected.receipt,owner,libraryId);
  if(body.action==='preview'){
   const preview=await rpc('cdl_v14_recovery_preview',{p_library_id:libraryId,p_backup_id:selected.id,p_target:target});
   if(!uuid.test(preview?.token??''))throw Error('Restore preview not confirmed.');
   return Response.json({token:preview.token,backupId:selected.id,capturedAt:target.capturedAt,summary:backupSummary(target),changes:compareBackupItems(preview.current,target)},{headers});
  }
  // Reuse the same safety archive on retries, never overwrite it after restore.
  const safety=await createBackup(body.token,'before-restore');
  const result=await rpc('cdl_v14_recovery_restore',{p_library_id:libraryId,p_token:body.token,p_safety_id:safety.id,p_target:target});
  if(result?.confirmed!==true||result.token!==body.token||result.safetyId!==safety.id||!Number.isFinite(Date.parse(result.restoredAt)))throw Error('Restore confirmation unavailable. Retry the same restore to check its outcome.');
  return Response.json(result,{headers});
 }catch(cause){return Response.json({error:cause instanceof Error?cause.message:'Recovery was not confirmed.'},{status:409,headers});}
}
