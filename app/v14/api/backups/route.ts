import {createHash} from 'node:crypto';
import {createV14Client} from '../../../lib/v14/server';
import {getV14Config} from '../../../lib/v14/config';
import {RECOVERY_BUCKET} from '../../../lib/v14/tracker-private-backup';
import type {FullBackupReceipt} from '../../../lib/v14/nightly-backup';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'private, no-store',Vary:'Cookie, Origin','X-Content-Type-Options':'nosniff'};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export async function GET(request:Request){
 try{
  const config=getV14Config(),url=new URL(request.url),libraryId=url.searchParams.get('libraryId'),id=url.searchParams.get('id');
  if(request.headers.get('origin')&&request.headers.get('origin')!==config.origin||request.headers.get('sec-fetch-site')&&request.headers.get('sec-fetch-site')!=='same-origin')return Response.json({error:'Same-origin request required'},{status:403,headers});
  if(!libraryId||!uuid.test(libraryId)||id!==null&&!uuid.test(id)||[...url.searchParams.keys()].some(k=>!['libraryId','id'].includes(k)))return Response.json({error:'Invalid backup request'},{status:400,headers});
  const client=await createV14Client(true),auth=await client.auth.getUser();
  if(auth.error||!auth.data.user)return Response.json({error:'Sign-in required'},{status:401,headers});
  const listed=await client.rpc('cdl_v14_backups',{p_library_id:libraryId});
  if(listed.error||!Array.isArray(listed.data))throw new Error('Backup list unavailable');
  const rows=listed.data as Array<{id:string;receipt:FullBackupReceipt}>;
  if(!id)return Response.json({backups:rows.map(r=>({id:r.id,capturedAt:r.receipt.capturedAt,bytes:r.receipt.bytes,sha256:r.receipt.sha256,counts:r.receipt.counts}))},{headers});
  const receipt=rows.find(r=>r.id===id)?.receipt;
  if(!receipt)return Response.json({error:'Backup not available'},{status:404,headers});
  if(receipt.bucket!==RECOVERY_BUCKET||!receipt.path.startsWith(`${auth.data.user.id}/${libraryId}/`)||receipt.bytes>24000000)throw new Error('Backup scope changed');
  const read=await client.storage.from(RECOVERY_BUCKET).download(receipt.path);
  if(read.error||!read.data||read.data.size!==receipt.bytes)throw new Error('Backup download unconfirmed');
  const bytes=Buffer.from(await read.data.arrayBuffer());
  if(createHash('sha256').update(bytes).digest('hex')!==receipt.sha256)throw new Error('Backup checksum mismatch');
  // Stream verified bytes; no public URL or Storage path is returned.
  return new Response(new Blob([bytes]).stream(),{headers:{...headers,'Content-Type':'application/gzip','Content-Disposition':`attachment; filename="CDL-backup-${receipt.capturedAt.slice(0,10)}.json.gz"`}});
 }catch{console.warn('CDL backup list/download unavailable');return Response.json({error:'Backup access was not confirmed. Please retry.'},{status:503,headers});}
}
