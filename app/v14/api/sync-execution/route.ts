import {getV14Config} from "../../../lib/v14/config";
import {createV14Client} from "../../../lib/v14/server";
import {readTrackerConnection} from "../../../lib/v14/tracker-read-server";
import {readV14LibraryForVerifiedOwner} from "../../../lib/v14/read-library-server";
import {readTrackerProvenance} from "../../../lib/v14/tracker-provenance";
import {initialTrackerReview} from "../../../lib/v14/tracker-mapped-review";
import {attachTrackerDecisions} from "../../../lib/v14/tracker-decisions";
import {buildTrackerExecutionPlan} from "../../../lib/v14/tracker-execution-plan";
import {compileTrackerWriteSteps} from "../../../lib/v14/tracker-write-plan";
import {buildTrackerGoogleRequest} from "../../../lib/v14/tracker-google-request";
import {createTrackerRunManifest,encodeTrackerRunManifest,journalForTrackerRun} from "../../../lib/v14/tracker-run-manifest";
import {stageTrackerRunForClient} from "../../../lib/v14/tracker-stage-server";
import {readTrackerBaselineState} from "../../../lib/v14/tracker-baseline-read";

export const runtime="nodejs";
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"private, no-store, max-age=0",Pragma:"no-cache",Vary:"Cookie, Origin"}});
async function prepare(client:Awaited<ReturnType<typeof createV14Client>>,ownerId:string,libraryId:string){
  if(await readTrackerBaselineState(client,ownerId,libraryId))return null;
  const [connection,snapshot,hints]=await Promise.all([readTrackerConnection(true),readV14LibraryForVerifiedOwner(client,ownerId,libraryId),readTrackerProvenance(client,ownerId,libraryId)]);
  if(!connection?.tables||!connection.grids)throw new Error("Fresh tracker required");
  const preview=attachTrackerDecisions(initialTrackerReview(snapshot.items,connection.tables,connection.observedAt,hints),snapshot.settings);
  if(!preview.reviewComplete)return null;
  const plan=buildTrackerExecutionPlan(preview),steps=compileTrackerWriteSteps(plan.operations,snapshot.items,connection.tables,hints);
  const requests=steps.map(step=>{
    const item=snapshot.items.find(i=>i.id===step.itemId),table=connection.tables!.find(t=>t.name===step.tab),grid=connection.grids!.find(g=>g.title===step.tab);
    if(!item||!table||!grid)throw new Error("Incomplete execution source");
    return buildTrackerGoogleRequest(step,item,table,grid).requests.length;
  }).reduce((a,b)=>a+b,0);
  const manifest=createTrackerRunManifest(libraryId,plan.fingerprint,snapshot.settings,steps);
  const encoded=encodeTrackerRunManifest(manifest),packageBytes=Buffer.byteLength(encoded);
  const stored=snapshot.settings.find(s=>s.key===`__cdl_tracker_manifest_v1:${manifest.fingerprint}`),journal=snapshot.settings.find(s=>s.key===`__cdl_tracker_run_v1:${manifest.fingerprint}`);
  const checkpointSaved=stored?.value.value===encoded&&journal?.value.value===JSON.stringify(journalForTrackerRun(manifest));
  return {manifest,summary:{status:"prepared",writeEnabled:false,target:plan.target,fingerprint:manifest.fingerprint,approvalRevision:plan.approvalRevision,
    operations:plan.operations.length,records:steps.length,requests,packageBytes,checkpointSaved,byKind:Object.fromEntries(["fields","duplicate-cleanup","add-record"].map(kind=>[kind,steps.filter(s=>s.kind===kind).length])),observedAt:connection.observedAt,
    message:"Fresh approved decisions resolve to bounded record operations. This is preparation only; no Sheet write or baseline has been applied."}};
}
// GET only rehearses. POST saves the package and pending checkpoints only;
// neither route has a Google write transport or permission to apply changes.
export async function GET(request:Request){
  try{
    const config=getV14Config(),url=new URL(request.url);
    if(request.headers.get("origin")&&request.headers.get("origin")!==config.origin||request.headers.get("sec-fetch-site")&&request.headers.get("sec-fetch-site")!=="same-origin")return json({error:"Same-origin request required."},403);
    const libraryId=url.searchParams.get("libraryId");
    if(!libraryId||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(libraryId)||[...url.searchParams.keys()].length!==1)return json({error:"One valid libraryId is required."},400);
    const client=await createV14Client();const {data:auth,error:authError}=await client.auth.getUser();
    if(authError||!auth.user)return json({error:"Authentication required."},401);
    const {data:owned,error}=await client.rpc("cdl_v14_my_libraries");if(error)throw new Error("Authorization unavailable");
    if(!Array.isArray(owned)||!owned.some(row=>row.id===libraryId))return json({error:"Library unavailable."},404);
    const prepared=await prepare(client,auth.user.id,libraryId);
    return prepared?json(prepared.summary):json({error:"The fresh initial review is not fully approved. No writes performed."},409);
  }catch{return json({error:"Fresh execution preparation failed. No writes performed."},503);}
}

export async function POST(request:Request){
  try{
    if(process.env.CDL_V14_VALIDATION_READ_ONLY==="true"&&process.env.CDL_V14_REVIEW_ONLY!=="true")return json({error:"Read-only session."},403);
    if(request.headers.get("origin")!==getV14Config().origin||!['same-origin',null].includes(request.headers.get("sec-fetch-site")))return json({error:"Same-origin request required."},403);
    if(new URL(request.url).search||request.headers.get("content-type")?.split(';')[0].trim()!=="application/json")return json({error:"JSON preparation request required."},400);
    const reader=request.body?.getReader();if(!reader)return json({error:"Invalid request."},400);
    const chunks:Uint8Array[]=[];let size=0;
    try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2048){await reader.cancel();return json({error:"Request too large."},413);}chunks.push(value);}}finally{reader.releaseLock();}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
    let body;try{body=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));}catch{return json({error:"Invalid request."},400);}
    const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
    if(!body||typeof body!=="object"||Array.isArray(body)||Object.keys(body).length!==3||Object.keys(body).some(k=>!["libraryId","requestId","fingerprint"].includes(k))||!uuid.test(body.libraryId??"")||!uuid.test(body.requestId??"")||typeof body.fingerprint!=="string"||!/^[a-f0-9]{64}$/.test(body.fingerprint))return json({error:"Invalid preparation identity."},400);
    const client=await createV14Client();const {data:auth,error:authError}=await client.auth.getUser();
    if(authError||!auth.user)return json({error:"Authentication required."},401);
    const {data:owned,error}=await client.rpc("cdl_v14_my_libraries");if(error)throw new Error("Authorization unavailable");
    if(!Array.isArray(owned)||!owned.some(row=>row.id===body.libraryId))return json({error:"Library unavailable."},404);
    const prepared=await prepare(client,auth.user.id,body.libraryId);
    if(!prepared||prepared.manifest.fingerprint!==body.fingerprint)return json({error:"Execution inputs changed. Check readiness again; no Sheet changes made."},409);
    const saved=await stageTrackerRunForClient(client,prepared.manifest,body.requestId);
    return json({...saved,requestId:body.requestId});
  }catch{return json({error:"Execution checkpoint not confirmed. Retry safely; no Sheet changes made."},503);}
}
