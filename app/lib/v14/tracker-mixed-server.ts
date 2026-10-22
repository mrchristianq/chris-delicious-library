import {TRACKER_ID} from "./tracker-read";
import {readTrackerConnection} from "./tracker-read-server";
import {writeTrackerPreparedBatch} from "./tracker-write-server";
import {readTrackerBaselineState} from "./tracker-baseline-read";
import {trackerBaselineGeneration} from "./tracker-conflict-decisions";
import {readLibrary} from "./read-library";
import {readBoundedSnapshot} from "./bounded-snapshot";
import {createTrackerJournalStore} from "./tracker-journal-store";
import {mixedJournal,mixedHash} from "./tracker-mixed-plan";
import {mixedPackageHash,mixedSummary} from "./tracker-mixed-store";
import {trackerRowIdentity} from "./tracker-write-plan";
import {trackerFieldValue} from "./tracker-reconcile";
import {runNewTrackerImport} from "./tracker-new-import";
import type {TrackerMixedPlan} from "./tracker-mixed-plan";
import type {MixedAdapter,MixedReceipt} from "./tracker-mixed-run";
import type {SnapshotItem} from "./library-snapshot";
import type {SettingWriter} from "./save-setting";
type Client={auth:{getUser:()=>PromiseLike<{data:{user:{id:string}|null};error?:unknown}>};rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:{code?:string}|null}>};
export function mixedWriter(client:Client):SettingWriter{return {
  authenticatedOwner:async()=>{const r=await client.auth.getUser();return r.error?null:r.data.user?.id??null;},
  snapshot:id=>readBoundedSnapshot((name,args)=>client.rpc(name,args),id),
  async write(libraryId,key,revision,requestId,value){const r=await client.rpc("cdl_v14_save_setting",{p_library_id:libraryId,p_key:key,p_revision:revision,p_request_id:requestId,p_value:{value}});if(r.error)throw new Error("Combined preparation failed");return r.data;},
};}
export async function readMixedContext(client:Client,ownerId:string,libraryId:string,runId?:string){
  const r=await client.rpc("cdl_v14_tracker_run_context",{p_library_id:libraryId,...(runId?{p_run_id:runId}:{})}),v=r.data as Record<string,unknown>|null;
  if(r.error||!v||v.ownerId!==ownerId||v.libraryId!==libraryId||v.sheetId!==TRACKER_ID||typeof v.stamp!=="string"||!/^[a-f0-9]{32}$/.test(v.stamp)||typeof v.metadataStamp!=="string"||!/^[a-f0-9]{32}$/.test(v.metadataStamp))throw new Error("Fresh combined-run context unavailable");
  if(v.activePlan!==null&&(typeof v.activePlan!=="string"||!/^[a-f0-9]{64}$/.test(v.activePlan)))throw new Error("Invalid active run identity");
  if(v.sourceMetadataStamp!==undefined&&(typeof v.sourceMetadataStamp!=="string"||!/^[a-f0-9]{32}$/.test(v.sourceMetadataStamp)))throw new Error("Invalid original-source metadata guard");
  if(v.runStatus!==undefined&&v.runStatus!==null&&!["running","completed"].includes(String(v.runStatus)))throw new Error("Invalid saved run status");
  return {stamp:v.stamp,metadataStamp:v.metadataStamp,sourceMetadataStamp:v.sourceMetadataStamp as string|undefined,runStatus:v.runStatus as "running"|"completed"|null|undefined,activePlan:v.activePlan as string|null,allowSelectedItems:v.allowSelectedItems===true,allowAdditions:v.allowAdditions===true,allowSheetImports:v.allowSheetImports===true,allowChunkedPlans:v.allowChunkedPlans===true,allowReviewedIdentities:v.allowReviewedIdentities===true};
}
/** Real source and write bindings, intentionally not reachable from any Apply
 * route yet. Injected transports are used only by the network-isolated QA. */
export function createMixedRunAdapter(client:Client,plan:TrackerMixedPlan,transport={read:readTrackerConnection,write:writeTrackerPreparedBatch}):MixedAdapter{
  const writer=mixedWriter(client),journal=createTrackerJournalStore(writer,plan.libraryId,mixedJournal(plan));
  async function fresh(){
    if(await writer.authenticatedOwner()!==plan.ownerId)throw new Error("Run owner unavailable");
    const [snapshot,baseline,connection,context]=await Promise.all([readLibrary(writer,plan.libraryId),readTrackerBaselineState(client,plan.ownerId,plan.libraryId),transport.read(true),readMixedContext(client,plan.ownerId,plan.libraryId,plan.creates?plan.runId:undefined)]);
    if(!baseline||!connection?.tables||!connection.grids)throw new Error("Fresh run sources unavailable");
    const recheck=await readMixedContext(client,plan.ownerId,plan.libraryId,plan.creates?plan.runId:undefined);
    if(recheck.stamp!==context.stamp||recheck.metadataStamp!==context.metadataStamp)throw new Error("Sources changed while reading");
    // Creating an item legitimately adds an empty metadata row. The future
    // run-control RPC must separately prove the ORIGINAL members' metadata is
    // unchanged; never simply ignore the global metadata generation change.
    if(plan.creates&&!context.sourceMetadataStamp)throw new Error("New-item source guards are not installed");
    return {items:snapshot.items,tables:connection.tables,grids:connection.grids,baseline,generation:trackerBaselineGeneration(baseline),metadataStamp:plan.creates?context.sourceMetadataStamp!:context.metadataStamp};
  }
  return {journal,fresh,
    async create(command){
      if(!plan.creates?.some(c=>c.fingerprint===command.fingerprint))throw new Error("Creation is not part of the saved run");
      return runNewTrackerImport(command,{
        owner:writer.authenticatedOwner,approved:async fingerprint=>plan.creates?.some(c=>c.fingerprint===fingerprint)===true,
        source:async()=>{const f=await fresh();return {items:f.items,tables:f.tables,baseline:f.baseline};},
        writer:{authenticate:async()=>await writer.authenticatedOwner()===plan.ownerId,
          async write(input){
            // This dedicated RPC must prove active run ownership, exact sealed
            // command and atomic identity exclusivity. Never fall back to the
            // ordinary Add endpoint if the migration has not been installed.
            const r=await client.rpc("cdl_v14_tracker_create",{p_library_id:plan.libraryId,p_run_id:plan.runId,p_plan:plan.fingerprint,p_id:input.itemId,p_request_id:input.requestId,p_media_type:input.mediaType,p_patch:input.patch});
            if(r.error)throw new Error("Run-bound creation unavailable or unconfirmed");return r.data as SnapshotItem;
          },
          async read(id){const r=await client.rpc("cdl_v14_get_item",{p_id:id});if(r.error)throw new Error("New item readback unavailable");return r.data as SnapshotItem|null;}
        }
      });
    },
    async claim(p){if(await writer.authenticatedOwner()!==p.ownerId)throw new Error("Run owner unavailable");const r=await client.rpc("cdl_v14_tracker_claim",{p_library_id:p.libraryId,p_run_id:p.runId,p_plan:p.fingerprint,p_package_hash:mixedPackageHash(p),p_summary:mixedSummary(p)}),v=r.data as {runId:string;plan:string;status:"running"|"completed";receipt?:MixedReceipt}|null;if(r.error||!v||v.runId!==p.runId||v.plan!==p.fingerprint||!["running","completed"].includes(v.status))throw new Error("Run claim not confirmed");return v;},
    import:{authenticatedOwner:writer.authenticatedOwner,
      async read(libraryId,id){const r=await client.rpc("cdl_v14_get_item",{p_id:id});if(r.error)throw new Error("Import readback unavailable");const item=r.data as SnapshotItem|null;if(item&&item.library_id!==libraryId)throw new Error("Wrong import library");return item;},
      async write(id,revision,request,patch){const r=await client.rpc("cdl_v14_full_edit",{p_id:id,p_revision:revision,p_request_id:request,p_patch:patch});if(r.error)throw new Error("Import acknowledgement uncertain");return r.data as SnapshotItem;},
      async source(step){const f=await fresh(),record=f.baseline.records.find(r=>r.itemId===step.itemId),tab={game:"Games",tv:"Shows",book:"Books",movie:"Movies"}[step.media],table=f.tables.find(t=>t.name===tab);if(!record||!table)throw new Error("Import mapping unavailable");if(step.identitySource){
        const targets=table.rows.filter(c=>step.identitySource!.identities.includes(trackerRowIdentity(table,c)));
        const hashes=targets.map(c=>mixedHash(Object.fromEntries(step.keys.map(k=>[k,trackerFieldValue(k,c[table.headers.indexOf(k)]??"")])))).sort();
        if(targets.length!==2||JSON.stringify(hashes)!==JSON.stringify(step.identitySource.beforeRows)||table.headers.filter(h=>!["Cover","Poster"].includes(h)).length!==step.keys.length||step.keys.some(k=>!table.headers.includes(k)))throw new Error("Reviewed identity source changed");
        return {generation:f.generation,fields:step.sheet};
      }
      const key=trackerRowIdentity(table,table.headers.map(h=>String(step.sheet[h]??""))),targets=table.rows.filter(c=>trackerRowIdentity(table,c)===key);if(targets.length!==1||table.headers.filter(h=>!["Cover","Poster"].includes(h)).length!==step.keys.length||step.keys.some(k=>!table.headers.includes(k)))throw new Error("Import identity/columns changed");return {generation:f.generation,fields:Object.fromEntries(step.keys.map(k=>[k,trackerFieldValue(k,targets[0][table.headers.indexOf(k)]??"")]))};},
    },
    async export(p){const f=await fresh();if(f.generation!==p.generation||f.metadataStamp!==p.metadataStamp)throw new Error("Export source changed");await transport.write(p.exports,f.items,f.tables,f.grids);},
    async confirm(p,baseline){const r=await client.rpc("cdl_v14_tracker_confirm",{p_library_id:p.libraryId,p_run_id:p.runId,p_plan:p.fingerprint,p_records:baseline.records,p_readback_hash:baseline.fingerprint});if(r.error)throw new Error("Final confirmation acknowledgement uncertain");return r.data as MixedReceipt;},
  };
}
