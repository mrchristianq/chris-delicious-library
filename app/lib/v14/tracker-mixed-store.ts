import {randomUUID,createHash} from "node:crypto";
import {readLibrary} from "./read-library";
import {saveSetting} from "./save-setting";
import {createTrackerJournalStore} from "./tracker-journal-store";
import {encodeMixedPlan,decodeMixedPlan,mixedJournal} from "./tracker-mixed-plan";
import type {TrackerMixedPlan} from "./tracker-mixed-plan";
import type {SettingWriter} from "./save-setting";
import {storedMixedPackage,readStoredMixedPlan} from "./tracker-mixed-package";
export const mixedPackageHash=(plan:TrackerMixedPlan)=>createHash("sha256").update(storedMixedPackage(plan).manifest).digest("hex");
export const mixedSummary=(plan:TrackerMixedPlan)=>({baselineStamp:plan.baselineStamp,metadataStamp:plan.metadataStamp,generation:plan.generation,sources:plan.sources,...(plan.selection?{selection:plan.selection.itemIds}:{}),imports:plan.imports.map(s=>({itemId:s.itemId,requestId:s.requestId})),...(plan.creates?{creates:plan.creates.map(c=>({itemId:c.input.itemId,requestId:c.input.requestId,fingerprint:c.fingerprint,media:c.input.mediaType,patch:c.input.patch,sourceHash:c.sourceHash,...(c.identityApproval?{identityApproval:c.identityApproval}:{})}))}:{}),steps:mixedJournal(plan).steps.map(s=>({id:s.id,fingerprint:s.fingerprint}))});
export async function stageMixedPlan(writer:SettingWriter,plan:TrackerMixedPlan,requestId:string){
  const encoded=encodeMixedPlan(plan);decodeMixedPlan(encoded,plan.libraryId,plan.fingerprint);
  const packaged=storedMixedPackage(plan),value=packaged.manifest;
  const key=`__cdl_tracker_mixed_v1:${plan.fingerprint}`;
  const readSnapshot=async()=>{const snapshot=await readLibrary(writer,plan.libraryId);if(snapshot.owner_id!==plan.ownerId)throw new Error("Wrong run owner");return snapshot;};
  const read=async()=>(await readSnapshot()).settings.find(s=>s.key===key);
  for(const part of packaged.parts){
    const existing=(await readSnapshot()).settings.find(s=>s.key===part.key);
    if(existing&&existing.value.value!==part.value)throw new Error("Immutable run part changed");
    if(!existing){try{await saveSetting(writer,plan.libraryId,part.key,null,randomUUID(),part.value);}catch(cause){if((await readSnapshot()).settings.find(s=>s.key===part.key)?.value.value!==part.value)throw cause;}}
  }
  const existing=await read();if(existing&&existing.value.value!==value)throw new Error("Immutable combined package changed");
  if(!existing){try{await saveSetting(writer,plan.libraryId,key,null,requestId,value);}catch(cause){if((await read())?.value.value!==value)throw cause;}}
  if((await read())?.value.value!==value)throw new Error("Combined package readback failed");
  readStoredMixedPlan((await readSnapshot()).settings,plan.libraryId,plan.fingerprint);
  const journal=createTrackerJournalStore(writer,plan.libraryId,mixedJournal(plan));
  if(!await journal.read()){try{await journal.save(null,randomUUID(),mixedJournal(plan));}catch(cause){if(!await journal.read())throw cause;}}
  return journal;
}
