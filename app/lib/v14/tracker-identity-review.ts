import {createHash} from "node:crypto";
import {trackerBaselineGeneration} from "./tracker-conflict-decisions";
import {attachTrackerDisplay} from "./tracker-three-way";
import type {TrackerPreview,TrackerChange} from "./tracker-preview";
import type {SnapshotItem,SnapshotSetting} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";
import type {TrackerBaselineState} from "./tracker-baseline-read";
const hash=(v:unknown)=>createHash("sha256").update(JSON.stringify(v)).digest("hex");
export const identityReviewKey=(library:string,id:string)=>`__cdl_tracker_identity_review_v1:${hash([library,id])}`;
export type IdentityReviewChoice={mode:"same"|"separate";fields:Record<string,"app"|"tracker">};
export function identityReviewValue(token:string,choice:IdentityReviewChoice|null,fields:string[]){
 if(!/^[a-f0-9]{64}$/.test(token))throw new Error("Invalid identity review token");
 if(choice!==null&&(!choice||Object.keys(choice).length!==2||Object.keys(choice).some(k=>!["mode","fields"].includes(k))||!["same","separate"].includes(choice.mode)||!choice.fields||typeof choice.fields!=="object"||Array.isArray(choice.fields)||Object.keys(choice.fields).some(k=>!fields.includes(k)||!["app","tracker"].includes(choice.fields[k]))))throw new Error("Invalid identity review choice");
 return JSON.stringify({version:1,token,choice:choice?{mode:choice.mode,fields:Object.fromEntries(Object.entries(choice.fields).sort(([a],[b])=>a.localeCompare(b)))}:null});
}
/** Saved review intent only. Never turns an identity issue into a runnable
 * import/merge or bypasses the run-bound database collision checks. */
export function attachIdentityReviews(preview:TrackerPreview,items:SnapshotItem[],tables:TrackerTable[],settings:SnapshotSetting[],baseline:TrackerBaselineState):TrackerPreview {
 const displayed=attachTrackerDisplay(preview,items,tables,baseline);
 return {...displayed,changes:displayed.changes.map((row):TrackerChange=>{
  if(row.identityReview?.kind!=="possible-existing-record"||row.identityReview.candidates.length!==1||!row.displayRecord?.candidate)return row;
  const context=row.displayRecord,fields=Object.keys(context.tracker).sort(),token=hash([1,trackerBaselineGeneration(baseline),row.id,context.app,context.tracker,items.filter(i=>i.media_type===row.media).map(i=>[i.id,i.revision]).sort()]);
  const setting=settings.find(s=>s.key===identityReviewKey(baseline.libraryId,row.id));let choice:IdentityReviewChoice|null=null;
  if(setting&&typeof setting.value.value==="string")try{const v=JSON.parse(setting.value.value);if(v.token===token&&identityReviewValue(token,v.choice,fields)===setting.value.value)choice=v.choice;}catch{/* stale or malformed intent cannot be restored */}
  return {...row,identitySelection:{token,revision:setting?.revision??null,fields,...(choice?{choice}:{})}};
 })};
}
