import {JWT} from "google-auth-library";
import {TRACKER_ID} from "./tracker-read";
import {isV14RuntimeAllowed} from './hosted-preview';
import {loadPrivateTrackerCredentials} from "./tracker-read-server";
import {dispatchTrackerGoogleStep,dispatchTrackerGoogleBatch} from "./tracker-google-dispatch";
import type {TrackerWriteStep} from "./tracker-write-plan";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";
import type {TrackerGrid} from "./tracker-google-request";

// Not inherited by the launcher and not enabled in review-only sessions.
// Activation requires an explicit separately approved launch configuration.
function assertWriteEnabled(){
  if(process.env.CDL_V14_TRACKER_WRITE_TARGET!==TRACKER_ID||!isV14RuntimeAllowed())throw new Error("Tracker writing is not enabled");
}
async function send(url:string,body:unknown){
    assertWriteEnabled();
    const credential=await loadPrivateTrackerCredentials();if(!credential)throw new Error("Tracker connection unavailable");
    const {config,key}=credential;
    const client=new JWT({email:config.serviceAccount,key,keyId:config.keyId,scopes:["https://www.googleapis.com/auth/spreadsheets"],transporterOptions:{timeout:20000}});
    const token=await client.getAccessToken();if(!token.token)throw new Error("Tracker write authorization unavailable");
    const response=await fetch(url,{method:"POST",headers:{authorization:`Bearer ${token.token}`,"Content-Type":"application/json"},body:JSON.stringify(body),cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});
    const text=await response.text();if(text.length>131072)throw new Error("Tracker write response exceeded bound");
    let result:unknown;try{result=JSON.parse(text);}catch{result=null;}
    return {ok:response.ok,body:result};
}
export async function writeTrackerPreparedStep(step:TrackerWriteStep,item:SnapshotItem,table:TrackerTable,grid:TrackerGrid){
  assertWriteEnabled();return dispatchTrackerGoogleStep(step,item,table,grid,send);
}
export async function writeTrackerPreparedBatch(steps:TrackerWriteStep[],items:SnapshotItem[],tables:TrackerTable[],grids:TrackerGrid[]){
  assertWriteEnabled();return dispatchTrackerGoogleBatch(steps,items,tables,grids,send);
}
