import {createHash} from "node:crypto";
import {gzipSync,gunzipSync} from "node:zlib";
import {TRACKER_ID,isExcludedTrackerField} from "./tracker-read";
import {newSyncJournal} from "./tracker-checkpoint";
import type {SnapshotSetting} from "./library-snapshot";
import type {TrackerWriteStep} from "./tracker-write-plan";

const sha=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const hex=/^[a-f0-9]{64}$/;
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const trackerApprovalDigest=(settings:SnapshotSetting[])=>sha(settings.filter(s=>s.key==="__cdl_tracker_initial_review_v1"||s.key.startsWith("__cdl_tracker_review_v1:")).map(s=>[s.key,s.revision,s.value.value]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))));
export type TrackerRunManifest={version:1;target:typeof TRACKER_ID;libraryId:string;approvalDigest:string;decisionPlan:string;steps:TrackerWriteStep[];fingerprint:string};
export function createTrackerRunManifest(libraryId:string,decisionPlan:string,settings:SnapshotSetting[],steps:TrackerWriteStep[]):TrackerRunManifest{
  if(!uuid.test(libraryId)||!hex.test(decisionPlan)||steps.length>500||new Set(steps.map(s=>s.id)).size!==steps.length)throw new Error("Invalid run package identity");
  for(const step of steps){
    const {fingerprint,...body}=step;
    if(!uuid.test(step.itemId)||step.id!==step.itemId||!hex.test(fingerprint)||sha([TRACKER_ID,body])!==fingerprint||
      [step.before,step.after].some(fields=>!fields||Object.keys(fields).some(isExcludedTrackerField)))throw new Error("Invalid sealed run operation");
  }
  const body:Omit<TrackerRunManifest,"fingerprint">={version:1,target:TRACKER_ID,libraryId,approvalDigest:trackerApprovalDigest(settings),decisionPlan,steps};
  return {...body,fingerprint:sha(body)};
}
export function encodeTrackerRunManifest(manifest:TrackerRunManifest){
  const raw=JSON.stringify(manifest);
  if(Buffer.byteLength(raw)>2000000)throw new Error("Run package exceeds uncompressed bound");
  const value="gzip-v1:"+gzipSync(raw).toString("base64");
  if(Buffer.byteLength(value)>95000)throw new Error("Run package exceeds storage bound");
  return value;
}
export function decodeTrackerRunManifest(value:unknown,libraryId:string,fingerprint:string):TrackerRunManifest{
  if(typeof value!=="string"||value.length>95000||!value.startsWith("gzip-v1:")||!hex.test(fingerprint)||!uuid.test(libraryId))throw new Error("Invalid stored run package");
  const raw=gunzipSync(Buffer.from(value.slice(8),"base64"),{maxOutputLength:2000000}).toString("utf8");
  const manifest=JSON.parse(raw) as TrackerRunManifest;
  if(!manifest||Object.keys(manifest).sort().join(',')!=="approvalDigest,decisionPlan,fingerprint,libraryId,steps,target,version"||manifest.version!==1||manifest.target!==TRACKER_ID||manifest.libraryId!==libraryId||manifest.fingerprint!==fingerprint||!hex.test(manifest.approvalDigest)||!hex.test(manifest.decisionPlan)||!Array.isArray(manifest.steps))throw new Error("Stored run scope mismatch");
  const {fingerprint:stored,...body}=manifest;
  if(sha(body)!==stored||manifest.steps.some(step=>{
    const {fingerprint,...body}=step;return !uuid.test(step.itemId)||step.id!==step.itemId||!hex.test(fingerprint)||sha([TRACKER_ID,body])!==fingerprint||[step.before,step.after].some(fields=>!fields||Object.keys(fields).some(isExcludedTrackerField));
  }))throw new Error("Stored run integrity mismatch");
  newSyncJournal(stored,manifest.steps.map(s=>({id:s.id,fingerprint:s.fingerprint})));
  return manifest;
}
export function journalForTrackerRun(manifest:TrackerRunManifest){return newSyncJournal(manifest.fingerprint,manifest.steps.map(s=>({id:s.id,fingerprint:s.fingerprint})));}
