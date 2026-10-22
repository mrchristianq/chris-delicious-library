import {TRACKER_ID} from "./tracker-read";
import {buildTrackerGoogleRequest} from "./tracker-google-request";
import {buildTrackerGoogleBatch} from "./tracker-google-batch";
import type {TrackerGrid} from "./tracker-google-request";
import type {TrackerWriteStep} from "./tracker-write-plan";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";

// One attempt only. The executor must independently inspect the Sheet after
// ANY outcome, including a timeout, malformed reply, quota error or HTTP 200.
export async function dispatchTrackerGoogleStep(step:TrackerWriteStep,item:SnapshotItem,table:TrackerTable,grid:TrackerGrid,
  send:(url:string,body:unknown)=>Promise<{ok:boolean;body:unknown}>){
  const batch=buildTrackerGoogleRequest(step,item,table,grid);
  if(!batch.requests.length)return {alreadyPresent:true};
  const response=await send(`https://sheets.googleapis.com/v4/spreadsheets/${TRACKER_ID}:batchUpdate`,{requests:batch.requests,includeSpreadsheetInResponse:false});
  const body=response.body as {spreadsheetId?:unknown;replies?:unknown[]}|null;
  if(!response.ok||!body||body.spreadsheetId!==TRACKER_ID||!Array.isArray(body.replies)||body.replies.length!==batch.requests.length)throw new Error("Tracker write acknowledgement uncertain; independent readback required");
  return {alreadyPresent:false};
}

export async function dispatchTrackerGoogleBatch(steps:TrackerWriteStep[],items:SnapshotItem[],tables:TrackerTable[],grids:TrackerGrid[],send:(url:string,body:unknown)=>Promise<{ok:boolean;body:unknown}>){
  const batch=buildTrackerGoogleBatch(steps,items,tables,grids);
  if(!batch.requests.length)return {alreadyPresent:true};
  const response=await send(`https://sheets.googleapis.com/v4/spreadsheets/${TRACKER_ID}:batchUpdate`,{requests:batch.requests,includeSpreadsheetInResponse:false});
  const body=response.body as {spreadsheetId?:unknown;replies?:unknown[]}|null;
  if(!response.ok||!body||body.spreadsheetId!==TRACKER_ID||!Array.isArray(body.replies)||body.replies.length!==batch.requests.length)throw new Error("Tracker batch acknowledgement uncertain; independent readback required");
  return {alreadyPresent:false};
}
