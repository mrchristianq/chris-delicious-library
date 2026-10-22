import {createHash} from "node:crypto";
import {EDIT_FIELDS,fullEditPatch} from "./edit-contract";
import {projectRetainedTrackerRow} from "./tracker-projection";
import {TRACKER_ID,isExcludedTrackerField} from "./tracker-read";
import {trackerFieldValue,isTrackerCellError} from "./tracker-reconcile";
import {previewTrackerThreeWay} from "./tracker-three-way";
import {attachTrackerConflictDecisions,trackerBaselineGeneration} from "./tracker-conflict-decisions";
import {attachTrackerIdentityDecisions} from "./tracker-identity-decisions";
import {trackerRowIdentity} from "./tracker-write-plan";
import type {EditPatch} from "./edit-contract";
import type {SnapshotItem,SnapshotSetting} from "./library-snapshot";
import type {TrackerBaselineState} from "./tracker-baseline-read";
import type {TrackerTable} from "./tracker-read";
import type {TrackerValue} from "./tracker-preview";
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tabs={game:"Games",tv:"Shows",book:"Books",movie:"Movies"} as const;
const statuses={
  book:["Reading","Completed","Backlog","Abandoned","Paused","Collection","Wishlist"],
  movie:["Watched","Started","Backlog","Pending Digital Release","Abandoned"],
  tv:["Completed","Abandoned","Started","Backlog","Watch Next","Paused","Pending Return","Pending Release"],
  game:["Now Playing","Queued","Collection","Completed","Abandoned","Wishlist","Replay","Backlog"],
};
const identityFields=new Set(["Title","IGDB_ID","IGDB_ID_Override","TMDB_ID","ISBN","isbn","Platform","Type","Types"]);
function editKey(media:SnapshotItem["media_type"],header:string,allowIdentity=false){
  if(allowIdentity&&header==="Title")return "title";
  if(allowIdentity&&identityFields.has(header)){
    const matches=Object.entries(EDIT_FIELDS[media]).filter(([,aliases])=>aliases.includes(header));
    if(matches.length===1)return matches[0][0];
    throw new Error("Unsupported new item identity field");
  }
  if(isExcludedTrackerField(header)||identityFields.has(header)||["Cover","Poster","Completed","Watched","watched"].includes(header))throw new Error("Tracker field requires explicit mapping review");
  if((media==="game"||media==="book")&&header==="Status")return "status";
  if((media==="tv"||media==="movie")&&["WatchStatus","Watch Status"].includes(header))return "watchStatus";
  if(["MyRating","My Rating"].includes(header))return "myRating";
  if(["Completed Date","Date Completed","CompletedDate","WatchDate"].includes(header))return media==="book"?"completedDate":media==="movie"?"watchDate":"dateCompleted";
  const entries=Object.entries(EDIT_FIELDS[media]).filter(([,aliases])=>aliases.includes(header));
  if(entries.length!==1)throw new Error("Unsupported retained tracker import field");
  return entries[0][0];
}
export function trackerImportValues(item:SnapshotItem,fields:Record<string,TrackerValue>,allowIdentity=false){
  const values:Record<string,string>={};
  for(const [header,value] of Object.entries(fields)){
    if(isTrackerCellError(value))throw new Error("Spreadsheet error cannot be imported");
    // Derived flags are never independently editable. Their requested values
    // must round-trip from an explicitly imported canonical status below.
    if(["Completed","Watched","watched"].includes(header))continue;
    const key=editKey(item.media_type,header,allowIdentity),text=value===null?"":String(value);
    if(["status","watchStatus"].includes(key)&&!(allowIdentity&&text==="")&&!statuses[item.media_type].includes(text))throw new Error("Invalid tracker status");
    if(Object.hasOwn(values,key)&&values[key]!==text)throw new Error("Competing aliases require review");
    values[key]=text;
  }
  return values;
}
function retained(item:SnapshotItem,keys:string[]){
  const row=projectRetainedTrackerRow(item,keys);
  return Object.fromEntries(keys.map(key=>{if(isExcludedTrackerField(key)||!Object.hasOwn(row,key))throw new Error("Unmapped retained field");return [key,trackerFieldValue(key,row[key])];}));
}
export type TrackerImportStep={
  identitySource?:{identities:string[];beforeRows:string[];reviewToken:string};
  version:1;target:typeof TRACKER_ID;ownerId:string;libraryId:string;itemId:string;media:SnapshotItem["media_type"];revision:number;
  generation:string;keys:string[];fields:Record<string,TrackerValue>;patch:EditPatch;sheet:Record<string,TrackerValue>;
  beforeHash:string;afterHash:string;requestId:string;fingerprint:string;
};
export function sealTrackerImport(body:Omit<TrackerImportStep,"requestId"|"fingerprint">):TrackerImportStep{
  const d=hash(body),requestId=`${d.slice(0,8)}-${d.slice(8,12)}-4${d.slice(13,16)}-8${d.slice(17,20)}-${d.slice(20,32)}`;
  const value={...body,requestId};return {...value,fingerprint:hash(value)};
}
/** Pure compiler. Recomputes comparison and verified choices, never accepts a
 * browser-supplied patch. It cannot write or advance a baseline. */
export function compileTrackerImports(items:SnapshotItem[],tables:TrackerTable[],settings:SnapshotSetting[],baseline:TrackerBaselineState,observedAt:string,selected?:string[]):TrackerImportStep[]{
  const preview=attachTrackerIdentityDecisions(attachTrackerConflictDecisions(previewTrackerThreeWay(items,tables,baseline,observedAt),items,settings,baseline),items,settings,baseline,tables);
  const changes=selected?preview.changes.filter(c=>selected.includes(c.itemId)):preview.changes;
  if((!selected&&(preview.identityIssues||preview.dataIssues))||changes.some(c=>c.direction==="review"&&!c.planApproved||(c.direction==="conflict"&&!c.savedChoice)))throw new Error("Unresolved comparison blocks import preparation");
  const grouped=new Map<string,Record<string,TrackerValue>>();
  for(const row of changes)if(row.direction==="import"||(row.direction==="conflict"&&row.savedChoice==="tracker"))grouped.set(row.itemId,{...grouped.get(row.itemId),[row.field]:row.tracker});
  if(grouped.size>500)throw new Error("Import plan exceeds bounded run");
  const generation=trackerBaselineGeneration(baseline);
  return [...grouped].sort(([a],[b])=>a.localeCompare(b)).map(([id,fields])=>{
    const item=items.find(i=>i.id===id)!;const keys=baseline.columns[tabs[item.media_type]].slice();
    const before=retained(item,keys),patch=fullEditPatch(item,trackerImportValues(item,fields));
    if(!Object.keys(patch).length||Object.hasOwn(patch,"notes")||Object.hasOwn(patch,"title"))throw new Error("Unsafe or empty import patch");
    const predicted={...item,...patch,user_fields:{...item.user_fields,...patch.overrides}},after=retained(predicted,keys);
    if(Object.entries(fields).some(([key,value])=>!Object.is(after[key],value)))throw new Error("Tracker import cannot round-trip through the existing save contract");
    // Rebuild the exact tracker record from the independently classified fields.
    // App-only edits remain in the expected app profile, not imported over.
    const table=tables.find(t=>t.name===tabs[item.media_type])!,record=baseline.records.find(r=>r.itemId===id)!;
    const identity=trackerRowIdentity(table,table.headers.map(h=>String(record.fields[h]??"")));
    const mapping=preview.changes.some(c=>c.itemId===id&&c.plannedAction==="provider-correction"&&c.planApproved);
    const provider=item.media_type==="game"?"IGDB_ID":item.media_type==="book"?"isbn":"TMDB_ID",edition=item.media_type==="game"?"Platform":item.media_type==="book"?"Type":null;
    const exact=table.rows.filter(c=>trackerRowIdentity(table,c)===identity);
    const targets=mapping&&!exact.length?table.rows.filter(c=>[provider,...(edition?[edition]:[])].every(h=>trackerFieldValue(h,c[table.headers.indexOf(h)]??"")===record.fields[h])):exact;
    if(targets.length!==1)throw new Error("Unique import source required");
    const sheet=Object.fromEntries(keys.map(k=>[k,trackerFieldValue(k,targets[0][table.headers.indexOf(k)]??"")]));
    return sealTrackerImport({version:1,target:TRACKER_ID,ownerId:baseline.ownerId,libraryId:baseline.libraryId,itemId:id,media:item.media_type,revision:item.revision,generation,keys,fields,patch,sheet,beforeHash:hash(before),afterHash:hash(after)});
  });
}

export type TrackerImportAdapter={
  authenticatedOwner():Promise<string|null>;
  read(libraryId:string,itemId:string):Promise<SnapshotItem|null>;
  source(step:TrackerImportStep):Promise<{generation:string;fields:Record<string,TrackerValue>}>;
  // Existing owner-scoped cdl_v14_full_edit: stable request + exact original
  // revision/patch returns the audited receipt on retry, without another edit.
  write(itemId:string,revision:number,requestId:string,patch:EditPatch):Promise<SnapshotItem>;
};
/** No route exposes this adapter yet. Explicit retry of this sealed command is
 * safe through DB idempotency; no HTTP acknowledgement alone confirms import. */
export async function runTrackerImport(step:TrackerImportStep,adapter:TrackerImportAdapter):Promise<{status:"confirmed"|"uncertain"|"conflict";requestId:string}>{
  const {fingerprint,...body}=step;
  const identity=step.identitySource;
  if(identity&&(identity.identities.length!==2||new Set(identity.identities).size!==2||identity.beforeRows.length!==2||identity.beforeRows.some(v=>!/^[a-f0-9]{64}$/.test(v))||!/^[a-f0-9]{64}$/.test(identity.reviewToken)))throw new Error("Invalid reviewed identity source");
  if(hash(body)!==fingerprint||step.version!==1||step.target!==TRACKER_ID||![step.ownerId,step.libraryId,step.itemId,step.requestId].every(v=>uuid.test(v))||!Number.isSafeInteger(step.revision)||step.revision<1||!step.keys.length||step.keys.some(isExcludedTrackerField)||Object.keys(step.patch.overrides??{}).some(isExcludedTrackerField)||Object.hasOwn(step.patch,"notes")||Object.hasOwn(step.patch,"title")&&!identity)throw new Error("Invalid sealed import command");
  if(await adapter.authenticatedOwner()!==step.ownerId)throw new Error("Import owner unavailable");
  const sourceMatches=async()=>{const source=await adapter.source(step);return source.generation===step.generation&&Object.keys(source.fields).length===step.keys.length&&step.keys.every(k=>Object.hasOwn(source.fields,k)&&Object.is(source.fields[k],step.sheet[k]));};
  if(!await sourceMatches())return {status:"conflict",requestId:step.requestId};
  const inspect=(item:SnapshotItem|null)=>{
    if(!item||item.library_id!==step.libraryId||item.id!==step.itemId||item.media_type!==step.media)return "conflict";
    const profile=hash(retained(item,step.keys));
    if(item.revision===step.revision&&profile===step.beforeHash)return "before";
    if(item.revision===step.revision+1&&profile===step.afterHash)return "after";
    return "conflict";
  };
  if(inspect(await adapter.read(step.libraryId,step.itemId))==="conflict")return {status:"conflict",requestId:step.requestId};
  // Recheck the external source immediately before the CAS; not transactional
  // with Sheets, so a second read after the save is also mandatory.
  if(!await sourceMatches())return {status:"conflict",requestId:step.requestId};
  let receipt:SnapshotItem;
  try{receipt=await adapter.write(step.itemId,step.revision,step.requestId,step.patch);}catch{return {status:"uncertain",requestId:step.requestId};}
  if(!receipt||receipt.library_id!==step.libraryId||receipt.id!==step.itemId||receipt.media_type!==step.media||receipt.revision!==step.revision+1||
    Object.entries(step.patch).some(([key,value])=>key!=="overrides"&&receipt[key as keyof SnapshotItem]!==value)||
    Object.entries(step.patch.overrides??{}).some(([key,value])=>receipt.user_fields?.[key]!==value))return {status:"uncertain",requestId:step.requestId};
  const confirmed=await adapter.read(step.libraryId,step.itemId);
  if(inspect(confirmed)!=="after")return {status:"uncertain",requestId:step.requestId};
  if(!await sourceMatches())return {status:"conflict",requestId:step.requestId};
  return {status:"confirmed",requestId:step.requestId};
}
