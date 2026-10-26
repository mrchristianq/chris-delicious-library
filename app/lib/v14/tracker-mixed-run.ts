import {randomUUID} from "node:crypto";
import {mixedJournal,mixedHash,encodeMixedPlan,decodeMixedPlan} from "./tracker-mixed-plan";
import {runTrackerImport} from "./tracker-import";
import {inspectTrackerWriteStep} from "./tracker-write-plan";
import {buildInitialTrackerBaseline,buildSelectedTrackerBaseline} from "./tracker-baseline";
import type {TrackerMixedPlan} from "./tracker-mixed-plan";
import type {TrackerImportAdapter} from "./tracker-import";
import type {JournalStore,JournalRecord,SyncJournal} from "./tracker-checkpoint";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";
import type {NewTrackerImport} from "./tracker-new-import";
export type MixedReceipt={runId:string;plan:string;baselineFingerprint:string;confirmedAt:string;records:number};
export type MixedAdapter={
  claim(plan:TrackerMixedPlan):Promise<{status:"running"|"completed";receipt?:MixedReceipt}>;
  journal:JournalStore;
  import:TrackerImportAdapter;
  create?:(command:NewTrackerImport)=>Promise<{status:"confirmed"|"uncertain"|"conflict"}>;
  fresh():Promise<{items:SnapshotItem[];tables:TrackerTable[];generation:string;metadataStamp:string}>;
  export(plan:TrackerMixedPlan):Promise<void>;
  confirm(plan:TrackerMixedPlan,baseline:ReturnType<typeof buildInitialTrackerBaseline>):Promise<MixedReceipt>;
};
function checked(record:JournalRecord|null,expected:SyncJournal):JournalRecord{
  if(!record||record.revision<1||record.journal.plan!==expected.plan||record.journal.target!==expected.target||record.journal.steps.length!==expected.steps.length||record.journal.steps.some((s,i)=>s.id!==expected.steps[i].id||s.fingerprint!==expected.steps[i].fingerprint||!["pending","dispatched","confirmed"].includes(s.state)||(s.state!=="pending"&&(!s.attempt||!/^[a-f0-9-]{36}$/i.test(s.attempt)))))throw new Error("Combined checkpoint mismatch");return record;
}
async function persist(store:JournalStore,prior:JournalRecord,journal:SyncJournal){
  const saved=await store.save(prior.revision,randomUUID(),journal),fresh=checked(await store.read(),journal);
  if(saved.revision!==prior.revision+1||fresh.revision!==saved.revision||mixedHash(saved.journal)!==mixedHash(journal)||mixedHash(fresh.journal)!==mixedHash(journal))throw new Error("Combined checkpoint readback failed");return fresh;
}
function finalReadback(plan:TrackerMixedPlan,items:SnapshotItem[],tables:TrackerTable[]){
  const expected=new Map(plan.sources.map(s=>[s.itemId,s.revision+(plan.imports.some(i=>i.itemId===s.itemId)?1:0)]));
  for(const command of plan.creates??[])expected.set(command.input.itemId,2);
  if(items.length!==expected.size||new Set(items.map(i=>i.id)).size!==items.length||items.some(i=>i.library_id!==plan.libraryId||i.revision!==expected.get(i.id)))throw new Error("Final source membership or revision changed");
  return plan.selection?buildSelectedTrackerBaseline(items,tables,plan.selection.itemIds):buildInitialTrackerBaseline(items,tables);
}
/** Stage/claim happens before this runner writes. SQL imports have audited
 * idempotent retries. Only existing-cell assignments may be retried after fresh before/after checks.
 * No success/last-sync is returned until the atomic confirmation is read back. */
export async function advanceTrackerMixedRun(plan:TrackerMixedPlan,adapter:MixedAdapter){
  decodeMixedPlan(encodeMixedPlan(plan),plan.libraryId,plan.fingerprint);
  const claimed=await adapter.claim(plan),expected=mixedJournal(plan);
  let record=checked(await adapter.journal.read(),expected);
  if(claimed.status!=="completed"){
    for(let n=0;n<plan.imports.length;n++){
      if(record.journal.steps[n].state==="confirmed")continue;
      if(record.journal.steps[n].state==="pending"){
        const next=structuredClone(record.journal);next.steps[n]={...next.steps[n],state:"dispatched",attempt:randomUUID()};record=await persist(adapter.journal,record,next);
      }
      // Re-entering a dispatched app import uses the exact SQL request ID; the
      // database proves its audit or rejects CAS rather than editing twice.
      const result=await runTrackerImport(plan.imports[n],adapter.import);
      if(result.status!=="confirmed")return {status:result.status,plan:plan.fingerprint};
      const next=structuredClone(record.journal);next.steps[n]={...next.steps[n],state:"confirmed"};record=await persist(adapter.journal,record,next);
    }
    for(let n=0;n<(plan.creates?.length??0);n++){
      const index=plan.imports.length+n;if(record.journal.steps[index].state==="confirmed")continue;
      if(!adapter.create)throw new Error("New-item creation is not enabled");
      if(record.journal.steps[index].state==="pending"){
        const next=structuredClone(record.journal);next.steps[index]={...next.steps[index],state:"dispatched",attempt:randomUUID()};record=await persist(adapter.journal,record,next);
      }
      const result=await adapter.create(plan.creates![n]);
      if(result.status!=="confirmed")return {status:result.status,plan:plan.fingerprint};
      const next=structuredClone(record.journal);next.steps[index]={...next.steps[index],state:"confirmed"};record=await persist(adapter.journal,record,next);
    }
    const start=plan.imports.length+(plan.creates?.length??0),exportStates=async()=>{
      const fresh=await adapter.fresh();if(fresh.generation!==plan.generation||fresh.metadataStamp!==plan.metadataStamp)throw new Error("Run source generation changed");
      return plan.exports.map(step=>{const item=fresh.items.find(i=>i.id===step.itemId),table=fresh.tables.find(t=>t.name===step.tab);return item&&table?inspectTrackerWriteStep(step,item,table).state:"conflict" as const;});
    };
    if(plan.exports.length&&!record.journal.steps.slice(start).every(s=>s.state==="confirmed")){
      let states=await exportStates();if(states.includes("conflict"))return {status:"conflict" as const,plan:plan.fingerprint};
      const tail=record.journal.steps.slice(start),pending=tail.every(s=>s.state==="pending"),dispatched=tail.every(s=>s.state==="dispatched")&&new Set(tail.map(s=>s.attempt)).size===1;
      if(!pending&&!dispatched)throw new Error("Mixed export checkpoint stages require recovery");
      if(dispatched&&!states.every(s=>s==="after")){
        // An unchanged existing row can safely receive the SAME cell values
        // again. Re-resolve addresses and source guards on every retry; never
        // replay append/delete operations whose position or count can change.
        if(plan.exports.some(step=>step.kind!=="fields"))return {status:"uncertain" as const,plan:plan.fingerprint};
        try{await adapter.export(plan);}catch{/* Independent readback is authoritative. */}
        states=await exportStates();
        if(!states.every(s=>s==="after"))return {status:states.includes("conflict")?"conflict" as const:"uncertain" as const,plan:plan.fingerprint};
      }
      if(pending){
        const next=structuredClone(record.journal),attempt=randomUUID();for(let n=start;n<next.steps.length;n++)next.steps[n]={...next.steps[n],state:"dispatched",attempt};record=await persist(adapter.journal,record,next);
        states=await exportStates();if(states.includes("conflict"))return {status:"conflict" as const,plan:plan.fingerprint};
        if(!states.every(s=>s==="after")){try{await adapter.export(plan);}catch{/* Verify actual destination; never retry this dispatch here. */}}
        states=await exportStates();if(!states.every(s=>s==="after"))return {status:states.includes("conflict")?"conflict" as const:"uncertain" as const,plan:plan.fingerprint};
      }
      const next=structuredClone(record.journal);for(let n=start;n<next.steps.length;n++)next.steps[n]={...next.steps[n],state:"confirmed"};record=await persist(adapter.journal,record,next);
    }
  }
  const fresh=await adapter.fresh();
  if(fresh.metadataStamp!==plan.metadataStamp||claimed.status!=="completed"&&fresh.generation!==plan.generation)throw new Error("Final source generation changed");
  const baseline=finalReadback(plan,fresh.items,fresh.tables);
  if(record.journal.steps.some(s=>s.state!=="confirmed"))throw new Error("Unconfirmed combined operations");
  let receipt:MixedReceipt;
  if(claimed.status==="completed")receipt=claimed.receipt!;
  else receipt=await adapter.confirm(plan,baseline);
  if(!receipt||receipt.runId!==plan.runId||receipt.plan!==plan.fingerprint||receipt.baselineFingerprint!==baseline.fingerprint||receipt.records!==baseline.records.length||!Number.isFinite(Date.parse(receipt.confirmedAt)))throw new Error("Final baseline receipt not confirmed");
  // Re-read the durable control record; a returned SQL result alone isn't a
  // confirmed last-sync marker, including after a lost commit acknowledgement.
  const final=await adapter.claim(plan);
  if(final.status!=="completed"||mixedHash(final.receipt)!==mixedHash(receipt))throw new Error("Completed run readback failed");
  return {status:"verified" as const,plan:plan.fingerprint,receipt};
}
