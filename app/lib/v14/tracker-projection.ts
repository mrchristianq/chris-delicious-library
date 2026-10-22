import {projectLegacyRow} from "./legacy-row";
import {EDIT_FIELDS} from "./edit-contract";
import {isExcludedTrackerField} from "./tracker-read";
import type {SnapshotItem} from "./library-snapshot";
const extra:Record<SnapshotItem["media_type"],string[]>={game:["Name","RecommendationSource","RecommendedIDs","RecommendedTitles","RecommendationsLastChecked","RecommendationsHidden"],movie:["Released","Director","Tagline"],tv:[],book:[]};
/** A genuinely new item may not have optional provider metadata yet. Only
 * reviewed known fields default to blank, never identities or unknown columns.
 * This projection is tracker-only: renderer styling/data contracts are intact. */
export function projectRetainedTrackerRow(item:SnapshotItem,headers:string[]){
 const row=projectLegacyRow(item,item.library_id).row,known=new Set([...Object.values(EDIT_FIELDS[item.media_type]).flat(),...extra[item.media_type]]);
 const fields=headers.filter(h=>!["Cover","Poster"].includes(h));
 if(new Set(fields).size!==fields.length)throw new Error("Duplicate retained column");
 return Object.fromEntries(fields.map(h=>{
  if(!h||h!==h.trim()||isExcludedTrackerField(h)||["__proto__","constructor","prototype"].includes(h))throw new Error("Unsafe retained column");
  if(Object.hasOwn(row,h))return [h,row[h]];
  if(!known.has(h))throw new Error("Unmapped retained column");
  return [h,""];
 }));
}
