import {readFile,lstat} from "node:fs/promises";
import {dirname,isAbsolute} from "node:path";
import {JWT} from "google-auth-library";
import {inspectTracker,validateTrackerManifest,TRACKER_SCOPE} from "./tracker-read";
import {isApprovedV14Hosted} from './hosted-preview';
import {parseHostedTrackerCredential} from './tracker-hosted-credential';
async function privateFile(path:string) {
  if(!isAbsolute(path))throw new Error("Absolute private credential path required");
  const stat=await lstat(path);
  if(!stat.isFile()||stat.isSymbolicLink()||(stat.mode&0o077)!==0||stat.size>16384
    ||(typeof process.getuid==="function"&&stat.uid!==process.getuid()))throw new Error("Unsafe private credential file");
  return readFile(path,"utf8");
}
export async function loadPrivateTrackerCredentials(){
  if(process.env.VERCEL){
    if(!isApprovedV14Hosted()||process.env.CDL_V14_TRACKER_CONFIG_FILE)throw new Error('Hosted tracker configuration is not approved');
    return parseHostedTrackerCredential(process.env.CDL_V14_GOOGLE_SERVICE_ACCOUNT_JSON??'');
  }
  const path=process.env.CDL_V14_TRACKER_CONFIG_FILE;
  if(!path)return null;
  const config=validateTrackerManifest(JSON.parse(await privateFile(path)));
  if(dirname(config.privateKeyFile)!==dirname(path))throw new Error("Tracker key must be beside its private configuration");
  const key=await privateFile(config.privateKeyFile);
  return {config,key};
}
export async function readTrackerConnection(includeRows=false) {
  const credential=await loadPrivateTrackerCredentials();if(!credential)return null;
  const {config,key}=credential;
  const client=new JWT({email:config.serviceAccount,key,keyId:config.keyId,scopes:[TRACKER_SCOPE],transporterOptions:{timeout:20000}});
  const token=await client.getAccessToken();
  if(!token.token)throw new Error("Tracker authorization unavailable");
  return inspectTracker(async url=>{
    const response=await fetch(url,{method:"GET",headers:{authorization:`Bearer ${token.token}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error("Tracker fresh read failed");
    const text=await response.text();
    if(text.length>(includeRows?16000000:131072))throw new Error("Tracker response too large");
    return JSON.parse(text);
  },includeRows);
}
