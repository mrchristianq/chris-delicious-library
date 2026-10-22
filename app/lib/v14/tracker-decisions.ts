import {createHash} from "node:crypto";
import type {SnapshotSetting} from "./library-snapshot";
import type {TrackerChange,TrackerPreview} from "./tracker-preview";
import {TRACKER_ID} from "./tracker-read";

export const decisionKey=(row:TrackerChange)=>`__cdl_tracker_review_v1:${createHash("sha256").update(row.id).digest("hex")}`;
export const decisionToken=(row:TrackerChange)=>createHash("sha256").update(JSON.stringify([1,TRACKER_ID,row.id,row.title,row.media,row.field,row.app,row.tracker])).digest("hex");
export const INITIAL_REVIEW_KEY="__cdl_tracker_initial_review_v1";
// Restrict the currently supported error repair to the known movie release
// enum. This never grants permission to import an error or an arbitrary clear.
export const canPlanRepair=(row:TrackerChange)=>row.blockedField===true&&row.media==="movie"&&row.field==="Released"&&["Released","Unreleased"].includes(String(row.app))&&/^#REF!/i.test(String(row.tracker));
export function initialReviewToken(preview:TrackerPreview,settings:SnapshotSetting[]){
  return createHash("sha256").update(JSON.stringify(preview.changes.map(row=>[decisionToken(row),settings.find(s=>s.key===decisionKey(row))?.revision??null]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))))).digest("hex");
}
export function initialReviewValue(preview:TrackerPreview,settings:SnapshotSetting[],clear=false){
  if(preview.status!=="initial-review"||(preview.identityIssues??0)>0||preview.changes.length>500||new Set(preview.changes.map(r=>r.id)).size!==preview.changes.length)throw new Error("Initial review is not safe to approve");
  const entries=clear?[]:preview.changes.map(row=>{
    if(row.resolutionAllowed!==true&&!row.plannedAction&&!canPlanRepair(row))throw new Error("Unresolved record or unsupported repair");
    return {id:row.id,token:decisionToken(row),baseRevision:settings.find(s=>s.key===decisionKey(row))?.revision??null,side:"app"};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  const value=JSON.stringify({version:1,target:TRACKER_ID,entries});
  if(Buffer.byteLength(value)>95000)throw new Error("Initial review exceeds bounded approval");
  return value;
}
export function decisionValue(row:TrackerChange,side:"app"|"tracker"|"clear") {
  if(row.resolutionAllowed!==true)throw new Error("Identity review cannot be saved as a field choice");
  return JSON.stringify({version:1,target:TRACKER_ID,token:decisionToken(row),side});
}
export function attachTrackerDecisions(preview:TrackerPreview,settings:SnapshotSetting[]):TrackerPreview {
  const batch=settings.find(s=>s.key===INITIAL_REVIEW_KEY);
  let entries:Array<{id:string;token:string;baseRevision:number|null;side:string}>=[];
  try{
    const parsed=JSON.parse(String(batch?.value.value??"null"));
    if(parsed?.version===1&&parsed.target===TRACKER_ID&&Array.isArray(parsed.entries)&&parsed.entries.length<=500&&parsed.entries.every((e:unknown)=>!!e&&typeof e==="object")&&new Set(parsed.entries.map((e:{id:unknown})=>e.id)).size===parsed.entries.length)entries=parsed.entries;
  }catch{/* Invalid preferences cannot confirm a review. */}
  const changes=preview.changes.map(row=>{
    const setting=settings.find(s=>s.key===decisionKey(row));
    const approved=entries.some(e=>e.id===row.id&&e.token===decisionToken(row)&&e.baseRevision===(setting?.revision??null)&&e.side==="app");
    if(row.plannedAction)return {...row,planApproved:approved};
    if(row.blockedField)return {...row,repairApproved:approved&&canPlanRepair(row),...(approved&&canPlanRepair(row)?{reason:"Repair approved using the valid app value. No Sheet cell has been changed."}:{})};
    if(row.resolutionAllowed!==true)return row;
    let savedChoice:undefined|"app"|"tracker";
    for(const side of ["app","tracker"] as const)if(setting?.value.value===decisionValue(row,side))savedChoice=side;
    if(approved)savedChoice="app";
    return {...row,decisionToken:decisionToken(row),decisionRevision:setting?.revision??null,...(savedChoice?{savedChoice}:{})};
  });
  const reviewComplete=preview.status==="initial-review"&&(preview.identityIssues??0)===0&&changes.every(row=>row.plannedAction?row.planApproved:row.blockedField?row.repairApproved:!!row.savedChoice);
  return {...preview,changes,reviewComplete,reviewToken:initialReviewToken(preview,settings),reviewBatchRevision:batch?.revision??null};
}
