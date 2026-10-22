import {createHash} from "node:crypto";
import {prepareNewTrackerImport,type NewTrackerSource} from "./tracker-new-import";
import {trackerRowIdentity} from "./tracker-write-plan";
import type {SnapshotSetting} from "./library-snapshot";
import type {TrackerPreview,TrackerChange} from "./tracker-preview";
export const newItemDecisionKey=(library:string,row:TrackerChange)=>`__cdl_tracker_new_import_v1:${createHash("sha256").update(JSON.stringify([library,row.id])).digest("hex")}`;
export function newItemDecisionValue(token:string,side:"tracker"|"clear"){
 if(!/^[a-f0-9]{64}$/.test(token)||!["tracker","clear"].includes(side))throw new Error("Invalid new-item decision");
 return JSON.stringify({version:1,token,side});
}
export function attachNewItemDecisions(preview:TrackerPreview,source:NewTrackerSource,settings:SnapshotSetting[],enabled:boolean):TrackerPreview{
 if(!enabled)return preview;
 return {...preview,changes:preview.changes.map(row=>{
  if(row.identityReview?.kind!=="new-tracker-record")return row;
  const table=source.tables.find(t=>t.name===row.identityReview!.tab)!;
  const cells=table.headers.map(h=>row.identityReview!.identity[h]??"");
  try{
   const command=prepareNewTrackerImport(source,table.name,trackerRowIdentity(table,cells));
   const setting=settings.find(s=>s.key===newItemDecisionKey(source.baseline.libraryId,row)),approved=setting?.value.value===newItemDecisionValue(command.fingerprint,"tracker");
   return {...row,plannedAction:"import-record" as const,resolutionAllowed:true,decisionToken:command.fingerprint,decisionRevision:setting?.revision??null,planApproved:approved,savedChoice:approved?"tracker" as const:undefined,proposedFields:command.fields,reason:"Review every retained field before approving this new app item. No default status or dates will be added."};
  }catch{return {...row,reason:"This new row cannot yet be imported safely. Check its external ID, edition, statuses, dates, rating and retained metadata. No values have been discarded or applied."};}
 })};
}
