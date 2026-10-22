import {createHash,randomUUID} from 'node:crypto';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const RECOVERY_BUCKET='cdl-v14-recovery';
type Store={upload:(path:string,body:Buffer,options:{contentType:string;upsert:boolean})=>PromiseLike<{error:unknown}>;download:(path:string)=>PromiseLike<{data:Blob|null;error:unknown}>};
/** Fail closed before Google dispatch unless durable bytes read back exactly. */
export async function storePrivateTrackerBackup(store:Store,bytes:Buffer,ownerId:string,libraryId:string,run:string){
  if(!uuid.test(ownerId)||!uuid.test(libraryId)||!/^[a-f0-9]{64}$/.test(run)||bytes.length<1||bytes.length>24000000)throw new Error('Invalid recovery object');
  const path=`${ownerId}/${libraryId}/${run}/${randomUUID()}.json.gz`;
  const hash=(value:Uint8Array)=>createHash('sha256').update(value).digest('hex');
  const sha256=hash(bytes);
  const sent=await store.upload(path,bytes,{contentType:'application/gzip',upsert:false});
  if(sent.error)throw new Error('Private recovery upload not confirmed');
  const read=await store.download(path);
  if(read.error||!read.data||read.data.size!==bytes.length||read.data.size>24000000||hash(new Uint8Array(await read.data.arrayBuffer()))!==sha256)throw new Error('Private recovery readback not confirmed');
  return {bucket:RECOVERY_BUCKET,path,sha256,bytes:bytes.length};
}
