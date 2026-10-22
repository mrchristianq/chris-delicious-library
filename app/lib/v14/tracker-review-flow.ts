export type ReviewedSyncPlan = {fingerprint:string;imports:number;exports:number;staged:boolean;resume:boolean;writeEnabled:boolean};

/** UI sequencing only. Each dependency retains its server/readback checks.
 * Never apply after an uncertain stage, and never retry a write automatically. */
export async function applyReviewedSync(
  check:()=>Promise<ReviewedSyncPlan|undefined>,
  command:(action:"stage"|"apply",plan:ReviewedSyncPlan)=>Promise<boolean|undefined>,
){
  const plan=await check();
  if(!plan)return "unavailable";
  if(!plan.writeEnabled)return "disabled";
  if(!plan.staged&&!await command("stage",plan))return "unconfirmed";
  return await command("apply",{...plan,staged:true})?"verified":"unconfirmed";
}
