import {TRACKER_ID} from "./tracker-read";
import type {SnapshotSetting} from "./library-snapshot";
import type {TrackerPreview} from "./tracker-preview";

export function attachTrackerVerification(preview:TrackerPreview,settings:SnapshotSetting[],activeRecords:number):TrackerPreview{
  if(preview.changes.length||(preview.identityIssues??0)>0||preview.matchedRecords!==activeRecords)return preview;
  const receipts=[];
  for(const setting of settings.filter(s=>s.key.startsWith("__cdl_tracker_verified_run_v1:"))){
    try{
      const r=JSON.parse(String(setting.value.value));
      if(r.version!==1||r.target!==TRACKER_ID||!/^[a-f0-9]{64}$/.test(r.run)||setting.key!==`__cdl_tracker_verified_run_v1:${r.run}`||r.records!==activeRecords||typeof r.baselineConfirmed!=="boolean"||!Number.isSafeInteger(r.operations)||r.operations<0||r.operations>500||typeof r.confirmedAt!=="string"||!Number.isFinite(Date.parse(r.confirmedAt)))continue;
      if(r.baselineConfirmed&&(!/^[a-f0-9]{64}$/.test(r.baselineFingerprint)||typeof r.baselineConfirmedAt!=="string"||!Number.isFinite(Date.parse(r.baselineConfirmedAt))))continue;
      const saved=settings.find(s=>s.key===`__cdl_tracker_run_v1:${r.run}`),j=JSON.parse(String(saved?.value.value));
      if(j.version!==1||j.target!==TRACKER_ID||j.plan!==r.run||!Array.isArray(j.steps)||j.steps.length!==r.operations||new Set(j.steps.map((s:{id:string})=>s.id)).size!==j.steps.length||j.steps.some((s:{state:string;fingerprint:string;attempt:string})=>s.state!=="confirmed"||!/^[a-f0-9]{64}$/.test(s.fingerprint)||!/^[a-f0-9-]{36}$/i.test(s.attempt)))continue;
      receipts.push(r);
    }catch{/* Malformed or partial receipts cannot report an applied tracker. */}
  }
  const latest=receipts.sort((a,b)=>Date.parse(b.confirmedAt)-Date.parse(a.confirmedAt))[0];
  return latest?{...preview,trackerAppliedAt:latest.confirmedAt,...(latest.baselineConfirmed?{status:"ready" as const,lastConfirmedSync:latest.baselineConfirmedAt}:{}),message:latest.baselineConfirmed?`Initial sync confirmed across ${activeRecords} records. Automatic syncing remains off.`:`Tracker update readback verified across ${activeRecords} records. Initial sync baseline confirmation is pending.`}:preview;
}
