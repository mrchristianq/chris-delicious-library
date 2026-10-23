import {timingSafeEqual} from 'node:crypto';
import {isApprovedV14Production} from '../../../lib/v14/hosted-preview';
import {runNightly} from '../../../lib/v14/nightly-server';

export const dynamic='force-dynamic';
export const maxDuration=300;
export async function GET(request:Request){
 const secret=process.env.CRON_SECRET,authorization=request.headers.get('authorization')??'';
 const expected=`Bearer ${secret??''}`;
 if(!secret||secret.length<40||Buffer.byteLength(authorization)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(authorization),Buffer.from(expected)))return Response.json({error:'Unauthorized'},{status:401});
 if(!isApprovedV14Production()||process.env.CDL_V14_NIGHTLY_ENABLED!=='true')return Response.json({error:'Nightly job is disabled'},{status:503});
 const url=new URL(request.url),retry=url.searchParams.get('retry');
 if([...url.searchParams.keys()].some(k=>k!=='retry')||retry!==null&&!/^[a-f0-9-]{36}$/.test(retry))return Response.json({error:'Invalid job request'},{status:400});
 try{
  const result=await runNightly(retry??undefined);
  console.info('cdl-nightly',{status:result.status,jobId:'jobId' in result?result.jobId:null});
  // Do not expose backup paths, contents, auth details or field values in HTTP.
  return Response.json({status:result.status},{headers:{'Cache-Control':'private, no-store'}});
 }catch{
  console.error('cdl-nightly: stopped without confirmed completion; inspect durable job and sync journals');
  return Response.json({error:'Nightly backup/sync was not confirmed.'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}
