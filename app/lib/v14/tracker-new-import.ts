import {createHash} from "node:crypto";
import {fullEditPatch} from "./edit-contract";
import {createItem,type CreateWriter,type CreateInput} from "./create-item";
import {trackerImportValues} from "./tracker-import";
import {reviewUnmatchedTrackerRows} from "./tracker-unmatched";
import {trackerRowIdentity} from "./tracker-write-plan";
import {trackerFieldValue,isTrackerCellError} from "./tracker-reconcile";
import {projectRetainedTrackerRow} from "./tracker-projection";
import {trackerBaselineGeneration} from "./tracker-conflict-decisions";
import {resolveReviewedIdentity} from "./tracker-identity-resolution";
import {identityReviewValue} from "./tracker-identity-review";
import {TRACKER_ID,isExcludedTrackerField} from "./tracker-read";
import type {SnapshotItem,SnapshotSetting} from "./library-snapshot";
import type {TrackerBaselineState} from "./tracker-baseline-read";
import type {TrackerTable} from "./tracker-read";
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const uuid=(s:string)=>`${s.slice(0,8)}-${s.slice(8,12)}-4${s.slice(13,16)}-8${s.slice(17,20)}-${s.slice(20,32)}`;
const tabs={Games:"game",Shows:"tv",Books:"book",Movies:"movie"} as const;
export type NewTrackerImport={version:1;target:typeof TRACKER_ID;ownerId:string;libraryId:string;tab:string;identity:string;generation:string;sourceHash:string;fields:Record<string,string|number|boolean|null>;input:CreateInput;fingerprint:string;identityApproval?:ReturnType<typeof resolveReviewedIdentity>["approval"]};
export type NewTrackerSource={items:SnapshotItem[];tables:TrackerTable[];baseline:TrackerBaselineState};

/** Preparation only: no default status/ownership/date is invented, and every
 * retained value must survive the existing validated create/edit projection.
 * This command is not yet exposed by a route or admitted to mixed-run baselines. */
export function prepareNewTrackerImport(source:NewTrackerSource,tab:string,identity:string,review?:{settings:SnapshotSetting[];changeId:string}):NewTrackerImport{
 const {items,tables,baseline}=source;
 const resolution=review?resolveReviewedIdentity(source,review.settings,review.changeId):undefined;
 if(resolution&&(resolution.approval.choice.mode!=="separate"||resolution.table.name!==tab||resolution.sourceIdentity!==identity))throw new Error("Explicit separate-edition approval required");
 if(tables.length!==4||new Set(tables.map(t=>t.name)).size!==4||items.some(i=>i.library_id!==baseline.libraryId)||new Set(items.map(i=>i.id)).size!==items.length)throw new Error("Incomplete new-item source");
 for(const table of tables){const keys=baseline.columns[table.name];if(!keys||table.headers.some(isExcludedTrackerField)||new Set(table.headers).size!==table.headers.length||table.headers.filter(h=>!["Cover","Poster"].includes(h)).length!==keys.length||keys.some(k=>!table.headers.includes(k)))throw new Error("Approved columns changed");}
 const table=tables.find(t=>t.name===tab),media=tabs[tab as keyof typeof tabs];if(!table||!media)throw new Error("Invalid new-item tab");
 const rows=table.rows.filter(c=>trackerRowIdentity(table,c)===identity);if(rows.length!==1)throw new Error("Unique new-item source required");
 const diagnostic=reviewUnmatchedTrackerRows(table,items,new Set()).find(c=>c.itemId===JSON.stringify([tab,identity]));
 if((resolution?diagnostic?.identityReview?.kind!=="possible-existing-record":diagnostic?.identityReview?.kind!=="new-tracker-record")||baseline.records.some(r=>r.media===media&&trackerRowIdentity(table,table.headers.map(h=>String(r.fields[h]??"")))===identity))throw new Error("Existing or ambiguous identity requires review");
 const keys=baseline.columns[tab],fields=resolution?.fields??Object.fromEntries(keys.map(k=>[k,trackerFieldValue(k,rows[0][table.headers.indexOf(k)]??"")]));
 if(Object.values(fields).some(isTrackerCellError))throw new Error("Spreadsheet error cannot be imported");
 const provider=String(fields[media==="game"?"IGDB_ID":media==="book"?"isbn":"TMDB_ID"]??"");
 const providerKey=media==="game"?"IGDB_ID":media==="book"?"isbn":"TMDB_ID";
 const norm=(v:unknown)=>String(v??"").normalize("NFKC").trim().toLowerCase().replace(/\s+/g," ");
 if(table.rows.some(c=>trackerRowIdentity(table,c)!==identity&&(norm(c[table.headers.indexOf("Title")])===norm(fields.Title)||!!provider&&norm(c[table.headers.indexOf(providerKey)])===norm(provider))&&!(resolution&&trackerRowIdentity(table,c)===resolution.originalIdentity&&media==="game"&&norm(c[table.headers.indexOf("Platform")])!==norm(fields.Platform))))throw new Error("Tracker identity collision requires review");
 if(provider&&!(media==="book"?/^(?:\d{9}[\dXx]|\d{13})$/:/^\d+$/).test(provider))throw new Error("Invalid external ID");
 if(media==="game"&&!String(fields.Platform??"").trim()||media==="book"&&!["Physical","Audiobook","eBook"].includes(String(fields.Type)))throw new Error("New item edition required");
 const generation=trackerBaselineGeneration(baseline);
 const sourceHash=hash({generation,items:items.map(i=>({id:i.id,revision:i.revision,row:projectRetainedTrackerRow(i,baseline.columns[Object.entries(tabs).find(([,m])=>m===i.media_type)![0]])})).sort((a,b)=>a.id.localeCompare(b.id)),tables:tables.map(t=>({name:t.name,headers:t.headers,rows:t.rows.map(c=>JSON.stringify(t.headers.filter(h=>!["Cover","Poster"].includes(h)).map(h=>trackerFieldValue(h,c[t.headers.indexOf(h)]??"")))).sort()})).sort((a,b)=>a.name.localeCompare(b.name))});
 const itemId=uuid(hash([TRACKER_ID,baseline.ownerId,baseline.libraryId,tab,identity,"new-item"]));
 const empty:SnapshotItem={id:itemId,library_id:baseline.libraryId,media_type:media,title:"",revision:1,user_status:null,personal_rating:null,completed_on:null,notes:"",user_fields:{},metadata:{}};
 // Unsupported nonempty metadata remains held rather than silently discarded.
 const values:Record<string,string>={};
 for(const [key,value] of Object.entries(fields)){
  let mapped:Record<string,string>;
  try{mapped=trackerImportValues(empty,{[key]:value},true);}catch(error){if(value==="")continue;throw error;}
  for(const [key,text] of Object.entries(mapped)){if(Object.hasOwn(values,key)&&values[key]!==text)throw new Error("Competing new-item aliases");values[key]=text;}
 }
 if(values.status==="")delete values.status;if(values.watchStatus==="")delete values.watchStatus;
 const patch=fullEditPatch(empty,values),predicted={...empty,...patch,revision:2,user_fields:patch.overrides??{}};
 if(!patch.title||Object.hasOwn(patch,"notes"))throw new Error("Invalid new-item patch");
 const projected=projectRetainedTrackerRow(predicted,keys);
 if(keys.some(k=>!Object.is(trackerFieldValue(k,projected[k]),fields[k])))throw new Error("New item cannot round-trip retained tracker fields");
 const requestId=uuid(hash([itemId,sourceHash,patch,"create"]));
 const body:Omit<NewTrackerImport,"fingerprint">={version:1,target:TRACKER_ID,ownerId:baseline.ownerId,libraryId:baseline.libraryId,tab,identity,generation,sourceHash,fields,input:{libraryId:baseline.libraryId,itemId,requestId,mediaType:media,patch},...(resolution?{identityApproval:resolution.approval}:{})};
 return {...body,fingerprint:hash(body)};
}

export async function runNewTrackerImport(command:NewTrackerImport,adapter:{owner():Promise<string|null>;approved(fingerprint:string):Promise<boolean>;source():Promise<NewTrackerSource>;writer:CreateWriter}){
 const {fingerprint,...body}=command;if(hash(body)!==fingerprint||command.target!==TRACKER_ID||command.version!==1)throw new Error("Invalid new-item command");
 if(await adapter.owner()!==command.ownerId||!await adapter.approved(fingerprint))throw new Error("Explicit owner approval required");
 const freshMatches=async()=>{
  const fresh=await adapter.source();const own=fresh.items.find(i=>i.id===command.input.itemId);
  if(own&&(own.library_id!==command.libraryId||own.media_type!==command.input.mediaType||own.revision!==2||own.notes!==""||Object.entries(command.fields).some(([k,v])=>!Object.is(trackerFieldValue(k,projectRetainedTrackerRow(own,Object.keys(command.fields))[k]),v))))return false;
  try{
   const a=command.identityApproval;
   const review=a?{changeId:a.changeId,settings:[{key:a.reviewKey,revision:a.reviewRevision,value:{value:identityReviewValue(a.token,a.choice,Object.keys(command.fields))}}] as SnapshotSetting[]}:undefined;
   return prepareNewTrackerImport({...fresh,items:fresh.items.filter(i=>i.id!==command.input.itemId)},command.tab,command.identity,review).fingerprint===fingerprint;
  }catch{return false;}
 };
 if(!await freshMatches())return {status:"conflict" as const};
 // Reissuing the SAME create command requires the original audited receipt.
 // A matching-looking item alone is never accepted as proof of this import.
 let result;try{result=await createItem(adapter.writer,command.input);}catch{return {status:"uncertain" as const};}
 if(!("library_id" in result.item)||result.item.library_id!==command.libraryId||!await freshMatches())return {status:"conflict" as const};
 return {status:"confirmed" as const,item:result.item,requestId:result.requestId};
}
