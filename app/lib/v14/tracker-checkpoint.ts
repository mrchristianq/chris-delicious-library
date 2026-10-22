import {createHash,randomUUID} from "node:crypto";
import {TRACKER_ID} from "./tracker-read";

export type SyncStep={id:string;fingerprint:string};
export type SyncJournal={version:1;target:typeof TRACKER_ID;plan:string;steps:Array<SyncStep&{state:"pending"|"dispatched"|"confirmed";attempt?:string}>};
export type JournalRecord={revision:number;journal:SyncJournal};
export type JournalStore={
  read():Promise<JournalRecord|null>;
  // Must be owner-scoped, audited, compare-and-swap and independently read back.
  save(expectedRevision:number|null,requestId:string,journal:SyncJournal):Promise<JournalRecord>;
};
const hash=/^[a-f0-9]{64}$/;
export function newSyncJournal(plan:string,steps:SyncStep[]):SyncJournal{
  if(!hash.test(plan)||steps.length>500||new Set(steps.map(s=>s.id)).size!==steps.length||
    steps.some(s=>!s.id||s.id.length>1000||!hash.test(s.fingerprint)))throw new Error("Invalid bounded sync plan");
  const journal:SyncJournal={version:1,target:TRACKER_ID,plan,steps:steps.map(s=>({...s,state:"pending"}))};
  if(Buffer.byteLength(JSON.stringify(journal))>95000)throw new Error("Sync checkpoint exceeds bound");
  return journal;
}
function validate(record:JournalRecord|null,expected:SyncJournal):JournalRecord{
  if(!record||!Number.isSafeInteger(record.revision)||record.revision<1||record.journal.version!==1||record.journal.target!==TRACKER_ID||
    record.journal.plan!==expected.plan||record.journal.steps.length!==expected.steps.length||
    record.journal.steps.some((s,i)=>s.id!==expected.steps[i].id||s.fingerprint!==expected.steps[i].fingerprint||
      !["pending","dispatched","confirmed"].includes(s.state)||(s.state!=="pending"&&(!s.attempt||!/^[a-f0-9-]{36}$/i.test(s.attempt)))))throw new Error("Checkpoint identity or state mismatch");
  return record;
}
const digest=(journal:SyncJournal)=>createHash("sha256").update(JSON.stringify(journal)).digest("hex");
async function persist(store:JournalStore,expected:JournalRecord|null,next:SyncJournal){
  const receipt=await store.save(expected?.revision??null,randomUUID(),next);
  validate(receipt,next);
  if(receipt.revision!==(expected?.revision??0)+1||digest(receipt.journal)!==digest(next))throw new Error("Checkpoint receipt mismatch");
  const readback=validate(await store.read(),next);
  if(readback.revision!==receipt.revision||digest(readback.journal)!==digest(next))throw new Error("Checkpoint readback mismatch");
  return readback;
}

/** Executes at most one step. The caller supplies a sealed plan and scoped
 * adapters. A dispatched/uncertain step is NEVER automatically reissued.
 * Recovery is read-only until an independent read proves its desired result.
 * A Google HTTP 200 or timeout is not itself evidence of success. */
export async function advanceSyncStep(store:JournalStore,expected:SyncJournal,adapter:{
  inspect(step:SyncStep):Promise<"before"|"after"|"conflict">;
  apply(step:SyncStep):Promise<void>;
}){
  let record=await store.read();
  record=record?validate(record,expected):await persist(store,null,expected);
  const index=record.journal.steps.findIndex(s=>s.state!=="confirmed");
  if(index<0)return {status:"verified" as const,record};
  let step=record.journal.steps[index];
  const observed=await adapter.inspect(step);
  if(observed==="conflict")return {status:"conflict" as const,record};
  if(step.state==="dispatched"&&observed!=="after")return {status:"uncertain" as const,record};
  if(step.state==="pending"){
    // Claim by revision before any external mutation. A simultaneous claimant
    // fails its CAS rather than entering the write path a second time.
    step={...step,state:"dispatched",attempt:randomUUID()};
    const journal=structuredClone(record.journal);journal.steps[index]=step;
    record=await persist(store,record,journal);
    if(observed!=="after"){
      // Re-resolve identity and recheck source/destination immediately before
      // dispatch; never apply a cell address from the first inspection.
      const again=await adapter.inspect(step);
      if(again==="conflict")return {status:"conflict" as const,record};
      if(again==="before"){
        try{await adapter.apply(step);}catch{/* May have written: verify, do not retry. */}
      }
      const readback=await adapter.inspect(step);
      if(readback!=="after")return {status:readback==="conflict"?"conflict" as const:"uncertain" as const,record};
    }
  }
  const journal=structuredClone(record.journal);journal.steps[index]={...step,state:"confirmed"};
  record=await persist(store,record,journal);
  // This verifies step receipts only. Baselines and "last synced" must be
  // advanced separately after whole-run, fresh app AND tracker verification.
  return {status:record.journal.steps.every(s=>s.state==="confirmed")?"verified" as const:"pending" as const,record};
}

export async function verifySyncRun(store:JournalStore,expected:SyncJournal,inspect:(step:SyncStep)=>Promise<"before"|"after"|"conflict">){
  const before=validate(await store.read(),expected);
  if(before.journal.steps.some(s=>s.state!=="confirmed"))throw new Error("Sync run still has unconfirmed operations");
  for(const step of before.journal.steps)if(await inspect(step)!=="after")throw new Error("Whole-run readback does not match the approved result");
  const after=validate(await store.read(),expected);
  if(after.revision!==before.revision||digest(after.journal)!==digest(before.journal))throw new Error("Sync journal changed during final verification");
  return {verified:true as const,plan:expected.plan,revision:after.revision};
}

/** One atomic external batch, with one shared dispatch attempt. This avoids
 * re-reading the whole library/Sheet hundreds of times on initial sync. */
export async function advanceSyncBatch(store:JournalStore,expected:SyncJournal,adapter:{inspectAll():Promise<Array<"before"|"after"|"conflict">>;apply():Promise<void>}){
  let record=validate(await store.read(),expected);
  const inspect=async()=>{const states=await adapter.inspectAll();if(states.length!==expected.steps.length)throw new Error("Incomplete batch readback");return states;};
  let states=await inspect();
  if(states.includes("conflict"))return {status:"conflict" as const,record};
  if(record.journal.steps.every(s=>s.state==="confirmed"))return {status:states.every(s=>s==="after")?"verified" as const:"conflict" as const,record};
  const dispatched=record.journal.steps.every(s=>s.state==="dispatched")&&new Set(record.journal.steps.map(s=>s.attempt)).size===1;
  if(!record.journal.steps.every(s=>s.state==="pending")&&!dispatched)throw new Error("Mixed checkpoint stages require explicit recovery");
  if(dispatched&&!states.every(s=>s==="after"))return {status:"uncertain" as const,record};
  if(!dispatched){
    const attempt=randomUUID(),journal=structuredClone(record.journal);journal.steps=journal.steps.map(s=>({...s,state:"dispatched",attempt}));
    record=await persist(store,record,journal);
    states=await inspect();if(states.includes("conflict"))return {status:"conflict" as const,record};
    if(!states.every(s=>s==="after")){try{await adapter.apply();}catch{/* Verify accepted-but-timed-out batches; never retry here. */}}
    states=await inspect();if(!states.every(s=>s==="after"))return {status:states.includes("conflict")?"conflict" as const:"uncertain" as const,record};
  }
  const journal=structuredClone(record.journal);journal.steps=journal.steps.map(s=>({...s,state:"confirmed"}));
  record=await persist(store,record,journal);
  return {status:"verified" as const,record};
}
