import {compileMixedSameItemPlan,compileMixedSeparateEditionPlan} from "./tracker-mixed-plan";
import {attachIdentityReviews} from "./tracker-identity-review";
import {previewTrackerThreeWay} from "./tracker-three-way";
import type {NewTrackerSource} from "./tracker-new-import";
import type {SnapshotSetting} from "./library-snapshot";
export function identityReadiness(source:NewTrackerSource,settings:SnapshotSetting[],context:{stamp:string;metadataStamp:string;allowReviewedIdentities?:boolean},changeId:string){
 if(!context.allowReviewedIdentities)return {ready:false,reason:"Identity Apply safety checks are not installed yet."};
 try{
  const row=attachIdentityReviews(previewTrackerThreeWay(source.items,source.tables,source.baseline,"review"),source.items,source.tables,settings,source.baseline).changes.find(c=>c.id===changeId);
  const mode=row?.identitySelection?.choice?.mode;if(!mode)return {ready:false,reason:"Select Same item or Separate edition, then choose the field values to keep."};
  const compile=mode==="same"?compileMixedSameItemPlan:compileMixedSeparateEditionPlan;
  compile(source.items,source.tables,settings,source.baseline,context,changeId);
  return {ready:true,reason:mode==="same"?"Ready: keep the existing app record and consolidate the two reviewed Sheet rows. A recovery backup is retained.":"Ready: add a separate platform record and keep the existing library and tracker entry."};
 }catch(error){return {ready:false,reason:error instanceof Error?error.message:"Review the selected fields before applying."};}
}
