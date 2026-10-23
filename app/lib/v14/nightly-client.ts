import {createClient} from '@supabase/supabase-js';
import {getV14Config} from './config';
import {boundedFreshFetch} from './bounded-fetch';
import {TRACKER_ID} from './tracker-read';

export const NIGHTLY_OWNER='baf0dab8-9904-48f2-a00f-30773bfc6ae1';
export const NIGHTLY_LIBRARY='9fdfae4a-31f5-5c8f-aa64-af839a853b48';
/** Dedicated ordinary Auth account; NO service-role key or owner session. Its
 * identity has no library membership and can only use the restricted gateway. */
export async function createNightlyClient(){
 const {url,key}=getV14Config();
 const credential=JSON.parse(process.env.CDL_V14_NIGHTLY_CREDENTIAL??'null') as {email:string;password:string;userId:string}|null;
 if(!credential||typeof credential.email!=='string'||typeof credential.password!=='string'||credential.password.length<40||
  typeof credential.userId!=='string'||!/^[a-f0-9-]{36}$/.test(credential.userId)||credential.userId===NIGHTLY_OWNER)throw new Error('Nightly identity is not configured');
 const raw=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:(input,init)=>{
  // Only the private weekly export may need longer than a normal fresh read.
  let snapshot=false;
  if(typeof init?.body==='string'&&String(input).endsWith('/rpc/cdl_v14_nightly_rpc')){
   try{snapshot=JSON.parse(init.body).p_call==='snapshot';}catch{/* normal bounded request */}
  }
  if(!snapshot)return boundedFreshFetch(input,init);
  const timeout=AbortSignal.timeout(70000),signal=init?.signal?AbortSignal.any([init.signal,timeout]):timeout;
  return fetch(input,{...init,cache:'no-store',signal});
 }}});
 const signed=await raw.auth.signInWithPassword({email:credential.email,password:credential.password});
 if(signed.error||signed.data.user?.id!==credential.userId)throw new Error('Nightly sign-in not confirmed');
 const bootstrap=await raw.rpc('cdl_v14_nightly_rpc',{p_call:'bootstrap',p_args:{}});
 const scope=bootstrap.data;
 if(bootstrap.error||scope?.workerId!==credential.userId||scope?.ownerId!==NIGHTLY_OWNER||scope?.libraryId!==NIGHTLY_LIBRARY||scope?.sheetId!==TRACKER_ID)throw new Error('Nightly identity scope not confirmed');
 const rpc=async(name:string,args:Record<string,unknown>)=>{
  const result=await raw.rpc('cdl_v14_nightly_rpc',{p_call:name,p_args:args});
  return {data:result.data as unknown,error:result.error?{code:result.error.code}:null};
 };
 // This adapter represents the gateway's explicitly checked owner scope, not
 // an owner JWT. Every call still authenticates as the separate machine user.
 return {raw,client:{auth:{getUser:async()=>({data:{user:{id:NIGHTLY_OWNER}},error:null})},rpc},
  async call(name:string,args:Record<string,unknown>={}){
   if(name==='retry-empty-job'){
    const r=await raw.rpc('cdl_v14_nightly_retry_empty',{p_job_id:args.jobId});if(r.error)throw new Error('Empty retry not confirmed');return r.data;
   }
   const r=await rpc(name,args);if(r.error)throw new Error(`Nightly operation not confirmed (${name})`);return r.data;
  }};
}
