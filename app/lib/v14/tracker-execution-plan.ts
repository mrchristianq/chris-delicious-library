import {createHash} from "node:crypto";
import {decisionToken,canPlanRepair} from "./tracker-decisions";
import {TRACKER_ID,isExcludedTrackerField} from "./tracker-read";
import type {TrackerPreview,TrackerValue} from "./tracker-preview";

export type TrackerExecutionOperation = {
  id:string; itemId:string; media:string; field:string;
  kind:"export-field"|"import-field"|"repair-field"|"provider-correction"|"duplicate-cleanup"|"add-record";
  comparisonToken:string; value?:TrackerValue;
};
// This is an intent plan, NOT a Google batch request. Row addresses must be
// resolved again from fresh identities by the executor, never from UI rows.
export function buildTrackerExecutionPlan(preview:TrackerPreview){
  if(preview.status!=="initial-review"||preview.reviewComplete!==true||
    (preview.identityIssues??0)!==0||!Number.isSafeInteger(preview.reviewBatchRevision)||
    (preview.reviewBatchRevision??0)<1||!preview.reviewToken||!/^[a-f0-9]{64}$/.test(preview.reviewToken)||
    preview.changes.length>500||new Set(preview.changes.map(row=>row.id)).size!==preview.changes.length)
    throw new Error("A fresh, completely approved initial review is required");
  const operations=preview.changes.map<TrackerExecutionOperation>(row=>{
    if(!row.itemId||!row.id||!["book","movie","tv","game"].includes(row.media)||isExcludedTrackerField(row.field))
      throw new Error("Unsafe execution identity or excluded field");
    const base={id:row.id,itemId:row.itemId,media:row.media,field:row.field,comparisonToken:decisionToken(row)};
    if(row.plannedAction){
      if(row.plannedAction==="import-record")throw new Error("New-item imports require a saved two-way run");
      if(row.planApproved!==true||!["provider-correction","duplicate-cleanup","add-record"].includes(row.plannedAction))throw new Error("Unapproved structural action");
      return {...base,kind:row.plannedAction};
    }
    if(row.blockedField){
      if(row.repairApproved!==true||!canPlanRepair(row))throw new Error("Unapproved field repair");
      return {...base,kind:"repair-field",value:row.app};
    }
    if(row.resolutionAllowed!==true||!["app","tracker"].includes(row.savedChoice??""))throw new Error("Unapproved field choice");
    const value=row.savedChoice==="app"?row.app:row.tracker;
    if(typeof value==="number"&&!Number.isFinite(value)||typeof value==="string"&&/^#(?:REF!|VALUE!|N\/A|ERROR!|DIV\/0!|NAME\?|NUM!|NULL!)/i.test(value.trim()))throw new Error("Invalid execution value");
    return {...base,kind:row.savedChoice==="app"?"export-field":"import-field",value};
  }).sort((a,b)=>a.id.localeCompare(b.id));
  const body={version:1,target:TRACKER_ID,approvalRevision:preview.reviewBatchRevision!,reviewToken:preview.reviewToken,operations};
  return {...body,fingerprint:createHash("sha256").update(JSON.stringify(body)).digest("hex")};
}

// Called immediately before a checkpoint or write: a previous plan cannot
// authorize execution after a value, decision, target or action has changed.
export function assertTrackerPlanCurrent(fingerprint:string,freshPreview:TrackerPreview){
  const fresh=buildTrackerExecutionPlan(freshPreview);
  if(fresh.fingerprint!==fingerprint)throw new Error("Sync plan changed; review the fresh comparison before applying");
  return fresh;
}
