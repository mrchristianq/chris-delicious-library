import {createHash} from "node:crypto";
import {encodeMixedPlan,decodeMixedPlan,mixedJournal,type TrackerMixedPlan} from "./tracker-mixed-plan";
import type {SnapshotSetting} from "./library-snapshot";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";
import {buildTrackerGoogleBatch} from "./tracker-google-batch";
import type {TrackerGrid} from "./tracker-google-request";
const hash=(s:string)=>createHash("sha256").update(s).digest("hex");
const prefix="mixed-parts-v1:",size=90000;
export const mixedPartKey=(fingerprint:string,n:number)=>`__cdl_tracker_mixed_part_v1:${fingerprint}:${n}`;
export function storedMixedPackage(plan:TrackerMixedPlan){
 const encoded=encodeMixedPlan(plan);
 if(encoded.length<=95000)return {manifest:encoded,parts:[] as Array<{key:string;value:string}>};
 const parts:Array<{key:string;value:string}>=[];
 for(let n=0;n<encoded.length;n+=size)parts.push({key:mixedPartKey(plan.fingerprint,parts.length),value:encoded.slice(n,n+size)});
 if(parts.length>10)throw new Error("Run package exceeds part bound");
 return {manifest:prefix+JSON.stringify({version:1,plan:plan.fingerprint,length:encoded.length,hashes:parts.map(p=>hash(p.value))}),parts};
}
export function readStoredMixedPlan(settings:SnapshotSetting[],libraryId:string,fingerprint:string){
 const raw=settings.find(s=>s.key===`__cdl_tracker_mixed_v1:${fingerprint}`)?.value.value;
 if(typeof raw!=="string")throw new Error("Saved run package unavailable");
 if(!raw.startsWith(prefix))return decodeMixedPlan(raw,libraryId,fingerprint);
 const manifest=JSON.parse(raw.slice(prefix.length));
 if(raw.length>2000||manifest.version!==1||manifest.plan!==fingerprint||Object.keys(manifest).sort().join(',')!=="hashes,length,plan,version"||!Number.isSafeInteger(manifest.length)||manifest.length<=95000||manifest.length>900000||!Array.isArray(manifest.hashes)||manifest.hashes.length!==Math.ceil(manifest.length/size)||manifest.hashes.length>10||manifest.hashes.some((h:unknown)=>typeof h!=="string"||!/^[a-f0-9]{64}$/.test(h)))throw new Error("Invalid saved run manifest");
 const values=manifest.hashes.map((expected:string,n:number)=>{
  const matches=settings.filter(s=>s.key===mixedPartKey(fingerprint,n)),value=matches[0]?.value.value;
  if(matches.length!==1||typeof value!=="string"||value.length!==Math.min(size,manifest.length-n*size)||hash(value)!==expected)throw new Error("Saved run part changed or missing");
  return value;
 });
 return decodeMixedPlan(values.join(''),libraryId,fingerprint);
}

/** Compression bytes can differ across zlib versions/architectures. Validate
 * the logical sealed plan, but retain the ORIGINAL manifest for SQL's seal. */
export function readStoredMixedPackage(settings:SnapshotSetting[],libraryId:string,fingerprint:string){
 const matches=settings.filter(s=>s.key===`__cdl_tracker_mixed_v1:${fingerprint}`);
 if(matches.length!==1)throw new Error("Saved run package unavailable or duplicated");
 const plan=readStoredMixedPlan(settings,libraryId,fingerprint),manifest=matches[0].value.value as string;
 const parts=manifest.startsWith(prefix)?JSON.parse(manifest.slice(prefix.length)).hashes.length:0;
 return {plan,manifest,hash:hash(manifest),partCount:parts};
}
/** All known transport/journal/storage/readback limits are checked before a
 * run is claimed. No network dispatch or cached source is involved. */
export function preflightMixedPackage(plan:TrackerMixedPlan,items:SnapshotItem[],tables:TrackerTable[],grids:TrackerGrid[]){
 const packaged=storedMixedPackage(plan);mixedJournal(plan);
 const after=items.map(item=>{const step=plan.imports.find(s=>s.itemId===item.id);return step?{...item,...step.patch,revision:item.revision+1,user_fields:{...item.user_fields,...step.patch.overrides}}:item;});
 for(const command of plan.creates??[]){const p=command.input.patch;after.push({id:command.input.itemId,library_id:plan.libraryId,media_type:command.input.mediaType,title:p.title!,revision:2,user_status:p.user_status??null,personal_rating:p.personal_rating??null,completed_on:p.completed_on??null,notes:"",user_fields:p.overrides??{},metadata:{}});}
 const batch=buildTrackerGoogleBatch(plan.exports,after,tables,grids);
 let cells=0;
 for(const grid of grids){
  const added=batch.requests.reduce((sum,request)=>{const a=request.appendDimension as {sheetId:number;length:number}|undefined;return sum+(a?.sheetId===grid.sheetId?a.length:0);},0);
  if(grid.rowCount+added>5000)throw new Error("Projected tracker height exceeds verified readback bound");
  cells+=(grid.rowCount+added)*grid.columnCount;
 }
 if(cells>200000)throw new Error("Projected tracker size exceeds verified readback bound");
 return {packageParts:packaged.parts.length,googleRequests:batch.requests.length,googleBytes:Buffer.byteLength(JSON.stringify(batch))};
}
