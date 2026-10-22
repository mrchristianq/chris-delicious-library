import {createHash} from "node:crypto";
import {projectRetainedTrackerRow} from "./tracker-projection";
import {trackerBaselineGeneration} from "./tracker-conflict-decisions";
import {TRACKER_ID} from "./tracker-read";
import type {SnapshotItem,SnapshotSetting} from "./library-snapshot";
import type {TrackerPreview,TrackerChange} from "./tracker-preview";
import type {TrackerBaselineState} from "./tracker-baseline-read";
import type {TrackerTable} from "./tracker-read";
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const tabs={game:"Games",tv:"Shows",book:"Books",movie:"Movies"} as const;
export const identityDecisionKey=(library:string,row:TrackerChange)=>`__cdl_tracker_identity_v1:${hash([library,row.id])}`;
export function identityDecisionValue(token:string,side:"app"|"clear"){
 if(!/^[a-f0-9]{64}$/.test(token)||!["app","clear"].includes(side))throw new Error("Invalid identity approval");
 return JSON.stringify({version:1,target:TRACKER_ID,token,side});
}
/** No bulk approval, guessed match or private notes. An addition/title mapping
 * binds its full retained projection plus current table and baseline generation.
 * Row moves do not change the table digest; changed values/duplicates do. */
export function attachTrackerIdentityDecisions(preview:TrackerPreview,items:SnapshotItem[],settings:SnapshotSetting[],baseline:TrackerBaselineState,tables:TrackerTable[]):TrackerPreview{
 const generation=trackerBaselineGeneration(baseline),saved=new Map(settings.map(s=>[s.key,s])),digests=new Map<string,string>();
 return {...preview,changes:preview.changes.map(row=>{
  if(!row.plannedAction||!["add-record","provider-correction"].includes(row.plannedAction)||row.field!=="identity")return row;
  const item=items.find(i=>i.id===row.itemId&&i.media_type===row.media&&i.library_id===baseline.libraryId),table=item&&tables.find(t=>t.name===tabs[item.media_type]);
  if(!item||!table)throw new Error("Identity approval source unavailable");
  const fields=table.headers.filter(h=>!["Cover","Poster"].includes(h));
  if(!digests.has(table.name))digests.set(table.name,hash([fields,table.rows.map(c=>JSON.stringify(fields.map(h=>c[table.headers.indexOf(h)]??""))).sort()]));
  const projection=projectRetainedTrackerRow(item,fields),token=hash([1,TRACKER_ID,baseline.ownerId,baseline.libraryId,generation,item.id,item.revision,row.id,row.plannedAction,fields.map(h=>[h,projection[h]]),digests.get(table.name)]),setting=saved.get(identityDecisionKey(baseline.libraryId,row));
  const approved=setting?.value.value===identityDecisionValue(token,"app");
  return {...row,resolutionAllowed:true,decisionToken:token,decisionRevision:setting?.revision??null,planApproved:approved,savedChoice:approved?"app":undefined};
 })};
}
