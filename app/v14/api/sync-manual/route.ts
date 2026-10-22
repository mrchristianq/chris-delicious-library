import {randomUUID} from "node:crypto";
import {getV14Config} from "../../../lib/v14/config";
import {createV14Client} from "../../../lib/v14/server";
import {readLibrary} from "../../../lib/v14/read-library";
import {readTrackerConnection} from "../../../lib/v14/tracker-read-server";
import {readTrackerBaselineState} from "../../../lib/v14/tracker-baseline-read";
import {compileTrackerMixedPlan,compileMixedNewItemPlan,compileMixedSameItemPlan,compileMixedSeparateEditionPlan,mixedHash,mixedRunId} from "../../../lib/v14/tracker-mixed-plan";
import {attachIdentityReviews} from "../../../lib/v14/tracker-identity-review";
import {storedMixedPackage,readStoredMixedPlan,readStoredMixedPackage,preflightMixedPackage} from "../../../lib/v14/tracker-mixed-package";
import {attachNewItemDecisions} from "../../../lib/v14/tracker-new-decisions";
import {previewTrackerThreeWay} from "../../../lib/v14/tracker-three-way";
import {trackerRowIdentity} from "../../../lib/v14/tracker-write-plan";
import {mixedWriter,readMixedContext,createMixedRunAdapter} from "../../../lib/v14/tracker-mixed-server";
import {stageMixedPlan} from "../../../lib/v14/tracker-mixed-store";
import {advanceTrackerMixedRun} from "../../../lib/v14/tracker-mixed-run";
import {manualSyncEnabled,parseManualCommand,parseSelectedItems} from "../../../lib/v14/tracker-manual-contract";
import {saveTrackerRecoverySnapshot} from "../../../lib/v14/tracker-recovery-server";
import {saveSetting} from "../../../lib/v14/save-setting";
export const runtime="nodejs";
const json=(v:unknown,status=200)=>Response.json(v,{status,headers:{"Cache-Control":"private, no-store, max-age=0",Pragma:"no-cache",Vary:"Cookie, Origin"}});
type Client=Awaited<ReturnType<typeof createV14Client>>;
async function authorized(libraryId:string){
 const client=await createV14Client(true),auth=await client.auth.getUser();
 if(auth.error||!auth.data.user)throw new Error("Authentication required");
 const owned=await client.rpc("cdl_v14_my_libraries");
 if(owned.error||!Array.isArray(owned.data)||!owned.data.some(r=>r.id===libraryId))throw new Error("Library unavailable");
 return {client,owner:auth.data.user.id};
}
async function prepare(client:Client,owner:string,id:string,items?:string[]){
 const writer=mixedWriter(client),before=await readMixedContext(client,owner,id);
 const [snapshot,baseline,connection]=await Promise.all([readLibrary(writer,id),readTrackerBaselineState(client,owner,id),readTrackerConnection(true)]);
 const after=await readMixedContext(client,owner,id);
 if(JSON.stringify(before)!==JSON.stringify(after)||!baseline||!connection?.tables||!connection.grids)throw new Error("Fresh sync sources unavailable");
 const reviewed=attachIdentityReviews(attachNewItemDecisions(previewTrackerThreeWay(snapshot.items,connection.tables,baseline,connection.observedAt),{items:snapshot.items,tables:connection.tables,baseline},snapshot.settings,before.allowSheetImports),snapshot.items,connection.tables,snapshot.settings,baseline);
 if(items&&!before.allowSelectedItems)throw new Error("Selected-item safety controls are not installed");
 if(items&&items.some(key=>!reviewed.changes.some(c=>c.itemId===key)))throw new Error("Selected items changed; refresh first");
 const rows=items?reviewed.changes.filter(c=>items.includes(c.itemId)):reviewed.changes;
 const identityRows=rows.filter(c=>c.identitySelection?.choice);
 if(!before.activePlan&&identityRows.length>1)throw new Error("Review one identity per run");
 if(!before.activePlan&&identityRows.length&&!before.allowReviewedIdentities)throw new Error("Identity safety checks are not installed");
 const selected=rows.filter(c=>c.plannedAction==="import-record"&&c.planApproved);
 if(!before.activePlan&&selected.length>1)throw new Error("Import one new tracker item per reviewed run");
 const row=selected[0],table=row&&connection.tables.find(t=>t.name===row.identityReview?.tab);
 const ir=identityRows[0],identityCompiler=ir?.identitySelection?.choice?.mode==="same"?compileMixedSameItemPlan:compileMixedSeparateEditionPlan;
 if(items&&selected.length&&items.length!==1)throw new Error("Apply new Sheet items individually");
 let plan=before.activePlan?readStoredMixedPlan(snapshot.settings,id,before.activePlan):ir?identityCompiler(snapshot.items,connection.tables,snapshot.settings,baseline,before,ir.id):row&&table?compileMixedNewItemPlan(snapshot.items,connection.tables,baseline,before,table.name,trackerRowIdentity(table,table.headers.map(h=>row.identityReview!.identity[h]??"")),row.decisionToken!,connection.observedAt,items?row.itemId:undefined):compileTrackerMixedPlan(snapshot.items,connection.tables,snapshot.settings,baseline,before,connection.observedAt,items);
 if(ir&&items&&!before.activePlan){if(items.length!==1)throw new Error("Apply identity reviews individually");const {fingerprint:old,runId:oldId,...body}=plan;void old;void oldId;const selectedBody={...body,selection:{keys:items,itemIds:[plan.creates?.[0].input.itemId??plan.identityReview!.candidateId]}};const fingerprint=mixedHash(selectedBody);plan={...selectedBody,fingerprint,runId:mixedRunId(fingerprint)};}
 if(plan.ownerId!==owner)throw new Error("Wrong run owner");
  if(plan.exports.some(s=>s.kind==="add-record")&&!before.allowAdditions)throw new Error("Approved additions are not installed yet");
 const saved=snapshot.settings.some(s=>s.key===`__cdl_tracker_mixed_v1:${plan.fingerprint}`)?readStoredMixedPackage(snapshot.settings,id,plan.fingerprint):null;
 if((saved?saved.partCount:storedMixedPackage(plan).parts.length)&&!before.allowChunkedPlans)throw new Error("Larger package guards are not installed");
 if(!before.activePlan)preflightMixedPackage(plan,snapshot.items,connection.tables,connection.grids);
 const staged=!!saved&&snapshot.settings.some(s=>s.key===`__cdl_tracker_run_v1:${plan.fingerprint}`);
 if(staged)readStoredMixedPlan(snapshot.settings,id,plan.fingerprint);
 if(plan.creates&&!before.allowSheetImports)throw new Error("New-item database guards are not installed");
 return {plan,summary:{fingerprint:plan.fingerprint,imports:plan.imports.length+(plan.creates?.length??0),exports:plan.exports.length,...(plan.selection?{items:plan.selection.keys}:{}),staged,resume:!!before.activePlan,writeEnabled:manualSyncEnabled()}};
}
function origin(request:Request,post=false){const expected=getV14Config().origin;return (post?request.headers.get("origin")===expected:!request.headers.get("origin")||request.headers.get("origin")===expected)&&[null,"same-origin"].includes(request.headers.get("sec-fetch-site"));}
export async function GET(request:Request){
 try{
  if(!origin(request))return json({error:"Same-origin request required."},403);
  const u=new URL(request.url),id=u.searchParams.get("libraryId");
  if(!id||!/^[a-f0-9-]{36}$/i.test(id)||new Set(u.searchParams.keys()).size!==[...u.searchParams.keys()].length||[...u.searchParams.keys()].some(k=>!['libraryId','items'].includes(k)))return json({error:"One library required."},400);
  const items=u.searchParams.has('items')?parseSelectedItems(JSON.parse(u.searchParams.get('items')!)):undefined;
  const {client,owner}=await authorized(id),prepared=await prepare(client,owner,id,items);
  return json(prepared.summary);
 }catch{return json({error:"Manual sync readiness unavailable. Refresh the preview and resolve any held records or conflicts."},409);}
}
export async function POST(request:Request){
 let dispatched=false;
 try{
  if(!origin(request,true))return json({error:"Same-origin request required."},403);
  if(process.env.CDL_V14_VALIDATION_READ_ONLY==="true"&&process.env.CDL_V14_REVIEW_ONLY!=="true")return json({error:"Read-only session."},403);
  if(new URL(request.url).search||request.headers.get("content-type")?.split(';')[0].trim()!=="application/json")return json({error:"JSON command required."},400);
  const reader=request.body?.getReader();if(!reader)return json({error:"Missing command."},400);
  const chunks:Uint8Array[]=[];let length=0;
  try{for(;;){const r=await reader.read();if(r.done)break;length+=r.value.length;if(length>65536){await reader.cancel();return json({error:"Command too large."},413);}chunks.push(r.value);}}finally{reader.releaseLock();}
  let body;try{body=parseManualCommand(JSON.parse(Buffer.concat(chunks).toString("utf8")));}catch{return json({error:"Invalid command."},400);}
  const {client,owner}=await authorized(body.libraryId),writer=mixedWriter(client);
  if(body.action==="stage"){
   const p=await prepare(client,owner,body.libraryId,body.items);if(p.plan.fingerprint!==body.fingerprint)return json({error:"Inputs changed; check readiness again."},409);
   await stageMixedPlan(writer,p.plan,body.requestId);return json({...p.summary,staged:true,requestId:body.requestId});
  }
  if(!manualSyncEnabled())return json({error:"Manual sync is not enabled in this session."},403);
  const snapshot=await readLibrary(writer,body.libraryId);
  const plan=readStoredMixedPlan(snapshot.settings,body.libraryId,body.fingerprint);if(plan.ownerId!==owner)throw new Error("Wrong run owner");
  if(storedMixedPackage(plan).parts.length&&!(await readMixedContext(client,owner,body.libraryId)).allowChunkedPlans)throw new Error("Larger package guards are not installed");
  if(plan.creates&&!(await readMixedContext(client,owner,body.libraryId)).allowSheetImports)throw new Error("New-item imports not installed");
  // The run-specific overload is exclusively for new-item runs: SQL proves
  // original metadata membership there and rejects ordinary update runs.
  const context=await readMixedContext(client,owner,body.libraryId,plan.creates?plan.runId:undefined);
  if(plan.identityReview&&!context.allowReviewedIdentities)throw new Error("Identity safety checks are not installed");
  if(plan.selection&&!context.allowSelectedItems)throw new Error("Selected-item controls unavailable");
  if(!context.activePlan&&context.runStatus!=="completed"&&(await prepare(client,owner,body.libraryId,plan.selection?.keys)).plan.fingerprint!==plan.fingerprint)throw new Error("Approval or source changed before Apply");
  if(plan.exports.some(s=>s.kind==="add-record")&&!(await readMixedContext(client,owner,body.libraryId)).allowAdditions)throw new Error("Approved additions are not installed yet");
  // A verified recovery snapshot is mandatory before dispatched writes:
  // private durable Storage in an approved preview, private disk locally.
  // Recreate one on retry instead of trusting a browser-supplied backup path.
  const connection=await readTrackerConnection(true);if(!connection?.grids)throw new Error("Tracker backup source unavailable");
  const backup=await saveTrackerRecoverySnapshot(plan.fingerprint,connection.grids,{ownerId:owner,libraryId:plan.libraryId});
  const backupKey=`__cdl_tracker_manual_backup_v1:${plan.fingerprint}`,prior=snapshot.settings.find(s=>s.key===backupKey);
  await saveSetting(writer,plan.libraryId,backupKey,prior?.revision??null,randomUUID(),JSON.stringify(backup));
  dispatched=true;
  const result=await advanceTrackerMixedRun(plan,createMixedRunAdapter(client,plan));
  return json({...result,requestId:body.requestId},result.status==="verified"?200:409);
 }catch{return dispatched?json({status:"pending",error:"Checking confirmation. Changes may already be saved; resume this saved sync rather than starting another."},409):json({error:"Sync could not be prepared. Refresh the comparison before trying again."},503);}
}
