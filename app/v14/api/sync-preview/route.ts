import { getV14Config } from "../../../lib/v14/config";
import { createV14Client } from "../../../lib/v14/server";
import type { TrackerPreview } from "../../../lib/v14/tracker-preview";
import { readTrackerConnection } from "../../../lib/v14/tracker-read-server";
import { readV14LibraryForVerifiedOwner } from "../../../lib/v14/read-library-server";
import {initialTrackerReview} from "../../../lib/v14/tracker-mapped-review";
import {readTrackerProvenance} from "../../../lib/v14/tracker-provenance";
import { attachTrackerDecisions } from "../../../lib/v14/tracker-decisions";
import {attachTrackerVerification} from "../../../lib/v14/tracker-verification-receipt";
import {readTrackerBaselineState} from "../../../lib/v14/tracker-baseline-read";
import {previewTrackerThreeWay} from "../../../lib/v14/tracker-three-way";
import {attachIdentityReviews} from "../../../lib/v14/tracker-identity-review";
import {identityReadiness} from "../../../lib/v14/tracker-identity-readiness";
import {attachTrackerConflictDecisions} from "../../../lib/v14/tracker-conflict-decisions";
import {attachTrackerIdentityDecisions} from "../../../lib/v14/tracker-identity-decisions";
import {readMixedContext} from "../../../lib/v14/tracker-mixed-server";
import {attachNewItemDecisions} from "../../../lib/v14/tracker-new-decisions";

export const runtime = "nodejs";
const headers = {"Cache-Control":"private, no-store, max-age=0",Pragma:"no-cache",Vary:"Cookie, Origin"};
const json = (body:unknown,status=200) => Response.json(body,{status,headers});
export async function GET(request:Request) {
  let stage="authorization";
  try {
    const config=getV14Config(), url=new URL(request.url);
    if ((request.headers.get("origin") && request.headers.get("origin")!==config.origin)
      || (request.headers.get("sec-fetch-site") && request.headers.get("sec-fetch-site")!=="same-origin")) return json({error:"Same-origin request required."},403);
    const id=url.searchParams.get("libraryId");
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
      || [...url.searchParams.keys()].length!==1 || [...url.searchParams.keys()].some(key=>key!=="libraryId")) return json({error:"A valid libraryId is required."},400);
    const client=await createV14Client(true);
    const {data:auth,error:authError}=await client.auth.getUser();
    if(authError||!auth.user)return json({error:"Authentication required."},401);
    const {data,error}=await client.rpc("cdl_v14_my_libraries");
    if(error)throw new Error("Library authorization unavailable");
    if(!Array.isArray(data)||!data.some(row=>row.id===id))return json({error:"Library unavailable."},404);
    stage="fresh-sources";
    const [connection,snapshot,baseline]=await Promise.all([readTrackerConnection(true),readV14LibraryForVerifiedOwner(client,auth.user.id,id),readTrackerBaselineState(client,auth.user.id,id)]);
    if(connection?.tables){
      if(baseline){
        stage="comparison";
        const preview=attachTrackerIdentityDecisions(attachTrackerConflictDecisions(previewTrackerThreeWay(snapshot.items,connection.tables,baseline,connection.observedAt),snapshot.items,snapshot.settings,baseline),snapshot.items,snapshot.settings,baseline,connection.tables);
        // Baselines are a separate fresh RPC from the item snapshot. Detect a
        // concurrent confirmation instead of mixing two sync generations.
        stage="generation-recheck";
        const context=await readMixedContext(client,auth.user.id,id);
        const recheck=await readTrackerBaselineState(client,auth.user.id,id);
        if(JSON.stringify(baseline)!==JSON.stringify(recheck))throw new Error("Confirmed baseline changed during preview");
        const reviewed=attachNewItemDecisions(preview,{items:snapshot.items,tables:connection.tables,baseline},snapshot.settings,context.allowSheetImports);
        const source={items:snapshot.items,tables:connection.tables,baseline},display=attachIdentityReviews(reviewed,snapshot.items,connection.tables,snapshot.settings,baseline);
        return json({...display,changes:display.changes.map(row=>row.identitySelection?{...row,identitySelection:{...row.identitySelection,...identityReadiness(source,snapshot.settings,context,row.id)}}:row),activeRun:context.activePlan,canSaveDecisions:!context.activePlan&&(process.env.CDL_V14_VALIDATION_READ_ONLY!=="true"||process.env.CDL_V14_REVIEW_ONLY==="true")});
      }
      const provenance=await readTrackerProvenance(client,auth.user.id,id);
      return json({...attachTrackerVerification(attachTrackerDecisions(initialTrackerReview(snapshot.items,connection.tables,connection.observedAt,provenance),snapshot.settings),snapshot.settings,snapshot.items.length),canSaveDecisions:process.env.CDL_V14_VALIDATION_READ_ONLY!=="true"||process.env.CDL_V14_REVIEW_ONLY==="true"});
    }
    if(connection) return json({status:"mapping-required",message:`Private tracker read verified (${connection.tabs.map(tab=>tab.name).join(", ")}). Stable record matching and initial reconciliation must be verified before proposed changes are available.`,changes:[],observedAt:connection.observedAt,lastConfirmedSync:null} satisfies TrackerPreview);
    // Never report zero pending changes or a completed comparison without one.
    const preview:TrackerPreview={status:"connection-required",message:"The new tracker’s read connection and stable row mapping must be verified before changes can be previewed.",changes:[],observedAt:new Date().toISOString(),lastConfirmedSync:null};
    return json(preview);
  } catch {console.warn("CDL v14 fresh sync comparison unavailable",{stage});return json({error:"Fresh sync comparison unavailable. This read does not apply changes."},503);}
}
