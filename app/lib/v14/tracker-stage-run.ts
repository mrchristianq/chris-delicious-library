import {randomUUID} from "node:crypto";
import {readLibrary} from "./read-library";
import {saveSetting} from "./save-setting";
import type {SettingWriter} from "./save-setting";
import {createTrackerJournalStore} from "./tracker-journal-store";
import {encodeTrackerRunManifest,decodeTrackerRunManifest,journalForTrackerRun} from "./tracker-run-manifest";
import type {TrackerRunManifest} from "./tracker-run-manifest";

/** Stage only: no network/Sheet write adapter is accepted by this function.
 * Both durable objects use existing owner-scoped, audited CAS settings. Partial
 * preparation is harmless and a retry confirms/reuses the immutable manifest. */
export async function stageTrackerRun(writer:SettingWriter,manifest:TrackerRunManifest,requestId:string){
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId))throw new Error("Invalid preparation request");
  const value=encodeTrackerRunManifest(manifest);decodeTrackerRunManifest(value,manifest.libraryId,manifest.fingerprint);
  const key=`__cdl_tracker_manifest_v1:${manifest.fingerprint}`;
  const read=async()=>{
    const snapshot=await readLibrary(writer,manifest.libraryId);
    return snapshot.settings.find(s=>s.key===key);
  };
  const existing=await read();
  if(existing&&existing.value.value!==value)throw new Error("Immutable run package changed");
  if(!existing){
    try{await saveSetting(writer,manifest.libraryId,key,null,requestId,value);}
    catch(cause){const recovered=await read();if(!recovered||recovered.value.value!==value)throw cause;}
  }
  const readback=await read();
  if(!readback||readback.value.value!==value)throw new Error("Run package readback not confirmed");
  const expected=journalForTrackerRun(manifest),store=createTrackerJournalStore(writer,manifest.libraryId,expected);
  let journal=await store.read();
  if(!journal){
    try{journal=await store.save(null,randomUUID(),expected);}
    catch(cause){journal=await store.read();if(!journal)throw cause;}
  }
  return {prepared:true as const,writeEnabled:false as const,fingerprint:manifest.fingerprint,manifestRevision:readback.revision,journalRevision:journal.revision,
    records:journal.journal.steps.length,confirmed:journal.journal.steps.filter(s=>s.state==="confirmed").length};
}
