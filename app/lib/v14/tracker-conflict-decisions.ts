import {createHash} from "node:crypto";
import {TRACKER_ID} from "./tracker-read";
import type {SnapshotItem,SnapshotSetting} from "./library-snapshot";
import type {TrackerBaselineState} from "./tracker-baseline-read";
import type {TrackerChange,TrackerPreview} from "./tracker-preview";
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const trackerBaselineGeneration=(baseline:TrackerBaselineState)=>hash([baseline.ownerId,baseline.libraryId,baseline.targetId,baseline.sheetId,baseline.lastConfirmedSync,baseline.columns,baseline.records]);
export const conflictDecisionKey=(libraryId:string,row:TrackerChange)=>`__cdl_tracker_conflict_v1:${hash([libraryId,row.id])}`;
export function conflictDecisionToken(row:TrackerChange,item:SnapshotItem,baseline:TrackerBaselineState,generation=trackerBaselineGeneration(baseline)){
  if(!["conflict","export","import"].includes(row.direction)||row.blockedField||row.field==="identity"||item.id!==row.itemId||item.media_type!==row.media||item.library_id!==baseline.libraryId||!Object.hasOwn(row,"baseline"))throw new Error("Only a current compared field can receive a choice");
  const scoped=[1,TRACKER_ID,baseline.ownerId,baseline.libraryId,baseline.targetId,generation,item.id,item.revision,row.id,row.field,row.app,row.tracker,row.baseline];
  return hash(row.direction==="conflict"?scoped:[2,row.direction,...scoped]);
}
export function conflictDecisionValue(token:string,side:"app"|"tracker"|"clear"){
  if(!/^[a-f0-9]{64}$/.test(token)||!["app","tracker","clear"].includes(side))throw new Error("Invalid conflict choice");
  return JSON.stringify({version:1,target:TRACKER_ID,token,side});
}
/** Separate namespace from initial reconciliation: old bulk choices NEVER
 * authorize later conflicts. Stored values contain hashes/choices, not reviews. */
export function attachTrackerConflictDecisions(preview:TrackerPreview,items:SnapshotItem[],settings:SnapshotSetting[],baseline:TrackerBaselineState):TrackerPreview{
  if(preview.comparisonMode!=="three-way")throw new Error("Confirmed three-way comparison required");
  const generation=trackerBaselineGeneration(baseline),byId=new Map(items.map(i=>[i.id,i])),saved=new Map(settings.map(s=>[s.key,s]));
  const changes=preview.changes.map(row=>{
    if(!["conflict","export","import"].includes(row.direction)||row.blockedField||row.field==="identity")return row;
    const item=byId.get(row.itemId);if(!item)throw new Error("Conflict item unavailable");
    const token=conflictDecisionToken(row,item,baseline,generation),setting=saved.get(conflictDecisionKey(baseline.libraryId,row));
    let savedChoice:"app"|"tracker"|undefined;
    for(const side of ["app","tracker"] as const)if(setting?.value.value===conflictDecisionValue(token,side))savedChoice=side;
    const next={...row,resolutionAllowed:true,decisionToken:token,decisionRevision:setting?.revision??null};
    delete next.savedChoice;
    // A saved explicit choice overrides the automatic one-sided direction.
    // Existing compilers already honor selected conflicts in either direction.
    if(savedChoice){next.savedChoice=savedChoice;next.direction="conflict";}
    return next;
  });
  return {...preview,changes};
}
