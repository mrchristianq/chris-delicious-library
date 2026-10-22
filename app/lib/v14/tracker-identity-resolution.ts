import {createHash} from "node:crypto";
import {attachIdentityReviews,identityReviewKey} from "./tracker-identity-review";
import {previewTrackerThreeWay} from "./tracker-three-way";
import {trackerRowIdentity,compileTrackerWriteSteps} from "./tracker-write-plan";
import {trackerImportValues} from "./tracker-import";
import {fullEditPatch} from "./edit-contract";
import {trackerFieldValue,isTrackerCellError} from "./tracker-reconcile";
import {projectRetainedTrackerRow} from "./tracker-projection";
import type {NewTrackerSource} from "./tracker-new-import";
import type {SnapshotSetting} from "./library-snapshot";
import type {TrackerValue} from "./tracker-preview";
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
const tabs={game:"Games",book:"Books",movie:"Movies",tv:"Shows"} as const;
export function resolveReviewedIdentity(source:NewTrackerSource,settings:SnapshotSetting[],changeId:string){
 const {items,tables,baseline}=source;
 const preview=attachIdentityReviews(previewTrackerThreeWay(items,tables,baseline,"review"),items,tables,settings,baseline);
 const row=preview.changes.find(c=>c.id===changeId),selection=row?.identitySelection,choice=selection?.choice;
 if(!row||!selection||!choice||!row.displayRecord?.candidate||row.identityReview?.candidates.length!==1)throw new Error("Choose one current identity review first");
 if(preview.changes.some(c=>c.id!==row.id))throw new Error("Resolve other source changes before this identity review");
 const table=tables.find(t=>t.name===row.identityReview!.tab)!;
 const candidate=row.identityReview.candidates[0],provider=row.media==="game"?"IGDB_ID":row.media==="book"?"isbn":"TMDB_ID",edition=row.media==="game"?"Platform":row.media==="book"?"Type":"";
 const candidates=items.filter(i=>{
  if(i.media_type!==row.media||i.title!==candidate.title)return false;
  const r=projectRetainedTrackerRow(i,baseline.columns[tabs[i.media_type]]);
  return String(r[provider]??"")===candidate.provider&&String(edition?r[edition]??"":"")===candidate.edition;
 });
 if(candidates.length!==1)throw new Error("Candidate identity is no longer unique");
 const item=candidates[0],record=baseline.records.find(r=>r.itemId===item.id);
 if(!record)throw new Error("A confirmed candidate baseline is required");
 const keys=baseline.columns[table.name],sourceIdentity=trackerRowIdentity(table,table.headers.map(h=>row.identityReview!.identity[h]??""));
 const originalIdentity=trackerRowIdentity(table,table.headers.map(h=>String(record.fields[h]??"")));
 if(sourceIdentity===originalIdentity||[sourceIdentity,originalIdentity].some(id=>table.rows.filter(c=>trackerRowIdentity(table,c)===id).length!==1))throw new Error("Two distinct unique tracker identities required");
 const app=row.displayRecord.app,tracker=row.displayRecord.tracker,fields:Record<string,TrackerValue>={};
 const missing:string[]=[];
 for(const key of keys){
  if(!Object.hasOwn(app,key)||!Object.hasOwn(tracker,key)||isTrackerCellError(app[key])||isTrackerCellError(tracker[key]))throw new Error("Incomplete or invalid reviewed fields");
  if(!Object.is(app[key],tracker[key])&&!choice.fields[key])missing.push(key);
  fields[key]=choice.fields[key]==="tracker"?tracker[key]:app[key];
 }
 if(missing.length)throw new Error("Select App or Sheet for: "+missing.join(", "));
 const current=projectRetainedTrackerRow(item,keys),changed=Object.fromEntries(keys.filter(k=>!Object.is(trackerFieldValue(k,current[k]),fields[k])).map(k=>[k,fields[k]]));
 const empty={...item,title:"",user_status:null,personal_rating:null,completed_on:null,notes:"",user_fields:{},metadata:{},revision:1};
 const createValues:Record<string,string>={};
 if(choice.mode==="separate")for(const [key,value] of Object.entries(fields)){
  try{const mapped=trackerImportValues(empty,{[key]:value},true);for(const [alias,text] of Object.entries(mapped)){if(Object.hasOwn(createValues,alias)&&createValues[alias]!==text)throw new Error("Competing field aliases");createValues[alias]=text;}}catch(error){if(value==="")continue;throw new Error(`Selected ${key}: ${error instanceof Error?error.message:"unsupported value"}`);}
 }
 if(choice.mode==="same")for(const [key,value] of Object.entries(changed))try{trackerImportValues(item,{[key]:value},true);}catch(error){throw new Error(`Selected ${key}: ${error instanceof Error?error.message:"unsupported value"}`);}
 if(createValues.status==="")delete createValues.status;if(createValues.watchStatus==="")delete createValues.watchStatus;
 const patch=choice.mode==="separate"?fullEditPatch(empty,createValues):Object.keys(changed).length?fullEditPatch(item,trackerImportValues(item,changed,true)):{};
 if(Object.hasOwn(patch,"notes"))throw new Error("Identity review cannot change private notes");
 const origin=choice.mode==="separate"?empty:item;
 const predicted={...origin,...patch,user_fields:{...origin.user_fields,...patch.overrides},revision:choice.mode==="separate"?2:item.revision+(Object.keys(patch).length?1:0)};
 const projected=projectRetainedTrackerRow(predicted,keys);
 if(keys.some(k=>!Object.is(trackerFieldValue(k,projected[k]),fields[k])))throw new Error("Selected fields cannot round-trip through the app save contract");
 const desiredIdentity=trackerRowIdentity(table,table.headers.map(h=>projected[h]??""));
 if(items.some(i=>i.id!==item.id&&i.media_type===item.media_type&&trackerRowIdentity(table,table.headers.map(h=>projectRetainedTrackerRow(i,keys)[h]??""))===desiredIdentity)||table.rows.some(c=>![sourceIdentity,originalIdentity].includes(trackerRowIdentity(table,c))&&trackerRowIdentity(table,c)===desiredIdentity))throw new Error("Selected identity collides with another record");
 if(choice.mode==="separate"&&(item.media_type!=="game"||!String(fields.Platform??"").trim()||String(fields.Platform).trim().toLowerCase()===String(current.Platform).trim().toLowerCase()||String(fields.Platform).trim().toLowerCase()==="wishlist"))throw new Error("Separate game editions require a different concrete platform");
 const approval={changeId:row.id,reviewKey:identityReviewKey(baseline.libraryId,row.id),reviewRevision:selection.revision!,token:selection.token,choice,candidateId:item.id,candidateRevision:item.revision};
 return {row,item,table,keys,fields,patch,predicted,sourceIdentity,originalIdentity,desiredIdentity,approval};
}

/** The original app identity/history survives. Only the two explicitly reviewed
 * Sheet rows are consolidated; Google dispatch retains backups and row hashes. */
export function compileSameItemResolution(source:NewTrackerSource,settings:SnapshotSetting[],changeId:string){
 const r=resolveReviewedIdentity(source,settings,changeId);if(r.approval.choice.mode!=="same")throw new Error("Same-item approval required");
 const hint=(identity:string)=>{const v=JSON.parse(identity) as string[];return {itemId:r.item.id,sourceId:r.item.id,primary:false,media:r.item.media_type,title:v[0],edition:v[1],provider:v[2]};};
 const exports=compileTrackerWriteSteps([{id:r.row.id,itemId:r.item.id,media:r.item.media_type,field:"identity",kind:"duplicate-cleanup",comparisonToken:r.approval.token}],source.items.map(i=>i.id===r.item.id?r.predicted:i),source.tables,[hint(r.sourceIdentity),hint(r.originalIdentity)]);
 const profile=(item:typeof r.item)=>Object.fromEntries(r.keys.map(k=>[k,trackerFieldValue(k,projectRetainedTrackerRow(item,r.keys)[k])]));
 const beforeRows=r.table.rows.filter(c=>[r.sourceIdentity,r.originalIdentity].includes(trackerRowIdentity(r.table,c))).map(c=>hash(Object.fromEntries(r.keys.map(k=>[k,trackerFieldValue(k,c[r.table.headers.indexOf(k)]??"")])))).sort();
 return {...r,exports,beforeHash:hash(profile(r.item)),afterHash:hash(profile(r.predicted)),beforeRows};
}
