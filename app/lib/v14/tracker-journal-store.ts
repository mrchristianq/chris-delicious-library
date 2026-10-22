import {readLibrary} from "./read-library";
import {saveSetting} from "./save-setting";
import type {SettingWriter} from "./save-setting";
import type {JournalStore,SyncJournal} from "./tracker-checkpoint";
import {newSyncJournal} from "./tracker-checkpoint";

export function createTrackerJournalStore(writer:SettingWriter,libraryId:string,expected:SyncJournal):JournalStore{
  // A journal contains only operation IDs/hashes and states. Values and image
  // data stay outside settings; the existing owner-only CAS/audit path is reused.
  const bounded=newSyncJournal(expected.plan,expected.steps);
  const key=`__cdl_tracker_run_v1:${bounded.plan}`;
  const decode=(raw:unknown):SyncJournal=>{
    if(typeof raw!=="string"||Buffer.byteLength(raw)>95000)throw new Error("Invalid sync journal");
    const j=JSON.parse(raw);
    if(!j||Object.keys(j).sort().join(',')!=="plan,steps,target,version"||j.version!==1||j.target!==bounded.target||j.plan!==bounded.plan||!Array.isArray(j.steps)||j.steps.length!==bounded.steps.length||j.steps.some((s:SyncJournal["steps"][number],i:number)=>
      !s||Object.keys(s).some(k=>!["id","fingerprint","state","attempt"].includes(k))||s.id!==bounded.steps[i].id||s.fingerprint!==bounded.steps[i].fingerprint||
      !["pending","dispatched","confirmed"].includes(s.state)||(s.state==="pending"?s.attempt!==undefined:typeof s.attempt!=="string"||!/^[a-f0-9-]{36}$/i.test(s.attempt))))throw new Error("Sync journal scope or shape mismatch");
    return j;
  };
  return {
    async read(){
      const snapshot=await readLibrary(writer,libraryId);
      const setting=snapshot.settings.find(s=>s.key===key);
      return setting?{revision:setting.revision,journal:decode(setting.value.value)}:null;
    },
    async save(revision,requestId,journal){
      const value=JSON.stringify(journal);decode(value);
      const snapshot=await readLibrary(writer,libraryId),prior=snapshot.settings.find(s=>s.key===key);
      if((prior?.revision??null)!==revision)throw new Error("Stale journal revision");
      if(!prior){
        if(journal.steps.some(s=>s.state!=="pending"))throw new Error("New journal must start pending");
      }else{
        const before=decode(prior.value.value);
        let transitions=0;
        journal.steps.forEach((step,i)=>{
          const previous=before.steps[i];
          if(JSON.stringify(step)===JSON.stringify(previous))return;
          transitions++;
          if(!(previous.state==="pending"&&step.state==="dispatched"||previous.state==="dispatched"&&step.state==="confirmed"&&step.attempt===previous.attempt))throw new Error("Unsafe journal transition");
        });
        const atomicBatch=transitions===journal.steps.length&&transitions>0&&
          before.steps.every(s=>s.state===before.steps[0].state)&&journal.steps.every(s=>s.state===journal.steps[0].state)&&
          new Set(journal.steps.map(s=>s.attempt)).size===1;
        const start=before.steps.findIndex(s=>s.state!=="confirmed"),tail=start<0?[]:journal.steps.slice(start),priorTail=start<0?[]:before.steps.slice(start);
        const exportSuffix=start>0&&transitions===tail.length&&tail.length>0&&
          before.steps.slice(0,start).every((s,i)=>s.state==="confirmed"&&JSON.stringify(s)===JSON.stringify(journal.steps[i]))&&
          tail.every(s=>s.id.startsWith("export:")&&s.state===tail[0].state)&&priorTail.every(s=>s.state===priorTail[0].state)&&new Set(tail.map(s=>s.attempt)).size===1;
        if(transitions!==1&&!atomicBatch&&!exportSuffix)throw new Error("Journal must advance one step or one shared atomic batch");
      }
      const result=await saveSetting(writer,libraryId,key,revision,requestId,value);
      const saved=result.snapshot.settings.find(s=>s.key===key);
      if(!saved)throw new Error("Journal persistence not confirmed");
      return {revision:saved.revision,journal:decode(saved.value.value)};
    },
  };
}
