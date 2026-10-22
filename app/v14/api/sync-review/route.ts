import {getV14Config} from "../../../lib/v14/config";
import {createV14Client} from "../../../lib/v14/server";
import {readTrackerConnection} from "../../../lib/v14/tracker-read-server";
import {readV14LibraryForVerifiedOwner} from "../../../lib/v14/read-library-server";
import {initialTrackerReview} from "../../../lib/v14/tracker-mapped-review";
import {readTrackerProvenance} from "../../../lib/v14/tracker-provenance";
import {decisionKey,decisionToken,decisionValue,initialReviewToken,initialReviewValue,INITIAL_REVIEW_KEY} from "../../../lib/v14/tracker-decisions";
import {saveV14Setting} from "../../../lib/v14/save-setting-server";
import {readTrackerBaselineState} from "../../../lib/v14/tracker-baseline-read";
import {previewTrackerThreeWay} from "../../../lib/v14/tracker-three-way";
import {attachTrackerConflictDecisions,conflictDecisionKey,conflictDecisionValue} from "../../../lib/v14/tracker-conflict-decisions";
import {attachTrackerIdentityDecisions,identityDecisionKey,identityDecisionValue} from "../../../lib/v14/tracker-identity-decisions";
import {readMixedContext} from "../../../lib/v14/tracker-mixed-server";
import {attachNewItemDecisions,newItemDecisionKey,newItemDecisionValue} from "../../../lib/v14/tracker-new-decisions";
import {attachIdentityReviews,identityReviewKey,identityReviewValue} from "../../../lib/v14/tracker-identity-review";
import {identityReadiness} from "../../../lib/v14/tracker-identity-readiness";

export const runtime="nodejs";
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie, Origin"}});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
  try{
    if(process.env.CDL_V14_VALIDATION_READ_ONLY==="true"&&process.env.CDL_V14_REVIEW_ONLY!=="true")return json({error:"Read-only session."},403);
    if(request.headers.get("origin")!==getV14Config().origin||!['same-origin',null].includes(request.headers.get("sec-fetch-site")))return json({error:"Same-origin request required."},403);
    if(request.headers.get("content-type")?.split(';')[0].trim()!=="application/json")return json({error:"JSON required."},415);
    // Enforce a streaming bound even when Content-Length is absent or false.
    const reader=request.body?.getReader();if(!reader)return json({error:"Invalid request."},400);
    const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>4096){await reader.cancel();return json({error:"Request too large."},413);}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return json({error:"Invalid request."},400);}
    const bulk=body?.kind==="keep-app-review"||body?.kind==="clear-initial-review";
    const identityReview=body?.kind==="identity-review";
    if(identityReview&&(!body||Object.keys(body).length!==7||Object.keys(body).some(k=>!["kind","libraryId","changeId","token","choice","revision","requestId"].includes(k))||!uuid.test(body.libraryId??"")||!uuid.test(body.requestId??"")||typeof body.changeId!=="string"||body.changeId.length>1000||typeof body.token!=="string"||!/^[a-f0-9]{64}$/.test(body.token)||(body.revision!==null&&(!Number.isSafeInteger(body.revision)||body.revision<1))))return json({error:"Invalid identity review."},400);
    if(bulk&&(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==5||Object.keys(body).some(k=>!["kind","libraryId","requestId","revision","token"].includes(k))||typeof body.libraryId!=="string"||!uuid.test(body.libraryId)||typeof body.requestId!=="string"||!uuid.test(body.requestId)||typeof body.token!=="string"||!/^[a-f0-9]{64}$/.test(body.token)||(body.revision!==null&&(!Number.isSafeInteger(body.revision)||body.revision<1))))return json({error:"Invalid initial review approval."},400);
    if(!bulk&&!identityReview&&(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==6||Object.keys(body).some(k=>!["libraryId","changeId","token","side","revision","requestId"].includes(k))||!uuid.test(body.libraryId??"")||!uuid.test(body.requestId??"")||typeof body.changeId!=="string"||body.changeId.length>1000||typeof body.token!=="string"||!/^[a-f0-9]{64}$/.test(body.token)||!["app","tracker","clear"].includes(body.side)||(body.revision!==null&&(!Number.isSafeInteger(body.revision)||body.revision<1))))return json({error:"Invalid review decision."},400);
    const client=await createV14Client();const {data:auth,error:authError}=await client.auth.getUser();
    if(authError||!auth.user)return json({error:"Authentication required."},401);
    const {data:libraries,error}=await client.rpc("cdl_v14_my_libraries");
    if(error)throw new Error("Authorization unavailable");
    if(!Array.isArray(libraries)||!libraries.some(row=>row.id===body.libraryId))return json({error:"Library unavailable."},404);
    const baseline=await readTrackerBaselineState(client,auth.user.id,body.libraryId);
    if(baseline){
      if(bulk)return json({error:"Initial review is closed after baseline confirmation."},409);
      const context=await readMixedContext(client,auth.user.id,body.libraryId);
      if(context.activePlan)return json({error:"Resume the saved sync before reviewing new changes."},409);
      const [tracker,snapshot]=await Promise.all([readTrackerConnection(true),readV14LibraryForVerifiedOwner(client,auth.user.id,body.libraryId)]);
      if(!tracker?.tables)throw new Error("Fresh tracker unavailable");
      const preview=attachTrackerIdentityDecisions(attachTrackerConflictDecisions(previewTrackerThreeWay(snapshot.items,tracker.tables,baseline,tracker.observedAt),snapshot.items,snapshot.settings,baseline),snapshot.items,snapshot.settings,baseline,tracker.tables);
      if(identityReview){
        const row=attachIdentityReviews(preview,snapshot.items,tracker.tables,snapshot.settings,baseline).changes.find(c=>c.id===body.changeId),selection=row?.identitySelection;
        if(!selection||selection.token!==body.token)return json({error:"Identity comparison changed. Refresh before choosing."},409);
        let value;try{value=identityReviewValue(selection.token,body.choice,selection.fields);}catch{return json({error:"Invalid identity fields or selection."},400);}
        if(JSON.stringify(baseline)!==JSON.stringify(await readTrackerBaselineState(client,auth.user.id,body.libraryId)))return json({error:"Baseline changed. Refresh before choosing."},409);
        const result=await saveV14Setting(body.libraryId,identityReviewKey(body.libraryId,row!.id),body.revision,body.requestId,value);
        if(!result.confirmed)throw new Error("Identity review readback unavailable");
        const reviewKey=identityReviewKey(body.libraryId,row!.id),settings=[...snapshot.settings.filter(s=>s.key!==reviewKey),{key:reviewKey,revision:(body.revision??0)+1,value:{value}}];
        return json({confirmed:true,requestId:body.requestId,token:body.token,revision:(body.revision??0)+1,choice:body.choice,applied:false,readiness:identityReadiness({items:snapshot.items,tables:tracker.tables,baseline},settings,context,row!.id)});
      }
      const row=attachNewItemDecisions(preview,{items:snapshot.items,tables:tracker.tables,baseline},snapshot.settings,context.allowSheetImports).changes.find(c=>c.id===body.changeId);
      if(row?.plannedAction==="import-record"){
        if(row.resolutionAllowed!==true||row.decisionToken!==body.token||!["tracker","clear"].includes(body.side))return json({error:"New-item inputs changed. Refresh before approving."},409);
        if(JSON.stringify(baseline)!==JSON.stringify(await readTrackerBaselineState(client,auth.user.id,body.libraryId)))return json({error:"Baseline changed. Refresh before approving."},409);
        const result=await saveV14Setting(body.libraryId,newItemDecisionKey(body.libraryId,row),body.revision,body.requestId,newItemDecisionValue(row.decisionToken!,body.side));
        if(!result.confirmed)throw new Error("New-item decision readback failed");
        return json({confirmed:true,requestId:body.requestId,token:body.token,side:body.side,revision:(body.revision??0)+1});
      }
      const identity=!!row?.plannedAction&&["add-record","provider-correction"].includes(row.plannedAction)&&row.field==="identity";
      if(!row||!["conflict","import","export"].includes(row.direction)&&!identity||row.resolutionAllowed!==true||row.decisionToken!==body.token||identity&&!["app","clear"].includes(body.side))return json({error:"Compared values changed or action is not supported. Refresh before choosing; nothing was applied."},409);
      if(JSON.stringify(baseline)!==JSON.stringify(await readTrackerBaselineState(client,auth.user.id,body.libraryId)))return json({error:"Confirmed baseline changed. Refresh before choosing."},409);
      const result=await saveV14Setting(body.libraryId,identity?identityDecisionKey(body.libraryId,row):conflictDecisionKey(body.libraryId,row),body.revision,body.requestId,identity?identityDecisionValue(row.decisionToken!,body.side):conflictDecisionValue(row.decisionToken!,body.side));
      if(!result.confirmed)throw new Error("Conflict choice readback failed");
      return json({confirmed:true,requestId:body.requestId,token:body.token,side:body.side,revision:(body.revision??0)+1});
    }
    if(identityReview)return json({error:"Confirmed tracker baseline required."},409);
    const [tracker,snapshot,provenance]=await Promise.all([readTrackerConnection(true),readV14LibraryForVerifiedOwner(client,auth.user.id,body.libraryId),readTrackerProvenance(client,auth.user.id,body.libraryId)]);
    if(!tracker?.tables)throw new Error("Tracker unavailable");
    const preview=initialTrackerReview(snapshot.items,tracker.tables,tracker.observedAt,provenance);
    if(bulk){
      if(initialReviewToken(preview,snapshot.settings)!==body.token)return json({error:"Compared values changed. Refresh and review again; no sync was applied."},409);
      const result=await saveV14Setting(body.libraryId,INITIAL_REVIEW_KEY,body.revision,body.requestId,initialReviewValue(preview,snapshot.settings,body.kind==="clear-initial-review"));
      if(!result.confirmed)throw new Error("Initial review readback failed");
      return json({confirmed:true,requestId:body.requestId,token:body.token,revision:(body.revision??0)+1,cleared:body.kind==="clear-initial-review"});
    }
    const row=preview.changes.find(row=>row.id===body.changeId);
    if(!row||row.resolutionAllowed!==true||decisionToken(row)!==body.token)return json({error:"Compared values changed. Refresh and review again; nothing was applied."},409);
    const result=await saveV14Setting(body.libraryId,decisionKey(row),body.revision,body.requestId,decisionValue(row,body.side));
    if(!result.confirmed)throw new Error("Readback failed");
    return json({confirmed:true,requestId:body.requestId,token:body.token,side:body.side,revision:(body.revision??0)+1});
  }catch{return json({error:"Review decision not confirmed. Retry safely or refresh. No library or Sheet values were applied."},503);}
}
