import {createHash} from "node:crypto";
import {gzipSync,gunzipSync} from "node:zlib";
import {TRACKER_ID} from "./tracker-read";
import {previewTrackerThreeWay} from "./tracker-three-way";
import {attachTrackerConflictDecisions,trackerBaselineGeneration} from "./tracker-conflict-decisions";
import {compileTrackerImports,sealTrackerImport} from "./tracker-import";
import {compileSameItemResolution,resolveReviewedIdentity} from "./tracker-identity-resolution";
import {compileTrackerWriteSteps,trackerRowIdentity} from "./tracker-write-plan";
import {newSyncJournal} from "./tracker-checkpoint";
import {attachTrackerIdentityDecisions} from "./tracker-identity-decisions";
import {trackerFieldValue} from "./tracker-reconcile";
import {projectRetainedTrackerRow} from "./tracker-projection";
import {prepareNewTrackerImport,type NewTrackerImport} from "./tracker-new-import";
import type {TrackerProvenance} from "./tracker-provenance";
import type {TrackerImportStep} from "./tracker-import";
import type {TrackerWriteStep} from "./tracker-write-plan";
import type {SnapshotItem,SnapshotSetting} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";
import type {TrackerBaselineState} from "./tracker-baseline-read";
export const mixedHash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export const mixedRunId=(hash:string)=>`${hash.slice(0,8)}-${hash.slice(8,12)}-4${hash.slice(13,16)}-8${hash.slice(17,20)}-${hash.slice(20,32)}`;
export type TrackerMixedPlan={version:1;target:typeof TRACKER_ID;ownerId:string;libraryId:string;generation:string;baselineStamp:string;metadataStamp:string;
  selection?:{keys:string[];itemIds:string[]};
  identityReview?:ReturnType<typeof compileSameItemResolution>["approval"];
  sources:Array<{itemId:string;revision:number}>;imports:TrackerImportStep[];exports:TrackerWriteStep[];creates?:NewTrackerImport[];fingerprint:string;runId:string};
export function compileTrackerMixedPlan(items:SnapshotItem[],tables:TrackerTable[],settings:SnapshotSetting[],baseline:TrackerBaselineState,context:{stamp:string;metadataStamp:string},observedAt:string,selected?:string[]):TrackerMixedPlan{
  if(!/^[a-f0-9]{32}$/.test(context.stamp)||!/^[a-f0-9]{32}$/.test(context.metadataStamp))throw new Error("Confirmed database generation required");
  const preview=attachTrackerIdentityDecisions(attachTrackerConflictDecisions(previewTrackerThreeWay(items,tables,baseline,observedAt),items,settings,baseline),items,settings,baseline,tables);
  const changes=selected?preview.changes.filter(c=>selected.includes(c.itemId)):preview.changes;
  if(selected&&(new Set(selected).size!==selected.length||selected.some(id=>!items.some(i=>i.id===id)||!changes.some(c=>c.itemId===id))))throw new Error("Selected item changed or is unavailable");
  const imports=compileTrackerImports(items,tables,settings,baseline,observedAt,selected);
  const after=items.map(item=>{const step=imports.find(s=>s.itemId===item.id);return step?{...item,...step.patch,revision:item.revision+1,user_fields:{...item.user_fields,...step.patch.overrides}}:item;});
  const ops=changes.filter(c=>c.direction==="export"||(c.direction==="conflict"&&c.savedChoice==="app")||c.planApproved).map(c=>{if(c.plannedAction==="import-record")throw new Error("New item requires dedicated preparation");return ({id:c.id,itemId:c.itemId,media:c.media,field:c.field,kind:c.planApproved?c.plannedAction!:"export-field" as const,value:c.app,comparisonToken:mixedHash([c.id,c.app,c.tracker,c.baseline,c.decisionToken])});});
  const hints:TrackerProvenance[]=[];
  for(const row of changes.filter(c=>c.plannedAction==="provider-correction"&&c.planApproved)){
    const item=items.find(i=>i.id===row.itemId)!,record=baseline.records.find(r=>r.itemId===item.id)!,table=tables.find(t=>t.name===({game:"Games",book:"Books",movie:"Movies",tv:"Shows"}[item.media_type]))!;
    const provider=item.media_type==="game"?"IGDB_ID":item.media_type==="book"?"isbn":"TMDB_ID",edition=item.media_type==="game"?"Platform":item.media_type==="book"?"Type":null;
    const confirmed=trackerRowIdentity(table,table.headers.map(h=>String(record.fields[h]??""))),exact=table.rows.filter(c=>trackerRowIdentity(table,c)===confirmed);
    const targets=exact.length?exact:table.rows.filter(c=>[provider,...(edition?[edition]:[])].every(h=>trackerFieldValue(h,c[table.headers.indexOf(h)]??"")===record.fields[h]));
    if(targets.length!==1)throw new Error("Unique mapped export source required");
    hints.push({itemId:item.id,sourceId:item.id,primary:true,media:item.media_type,title:targets[0][table.headers.indexOf("Title")],edition:edition?String(record.fields[edition]??""):"",provider:String(record.fields[provider]??"")});
  }
  // Compile exports against the post-import app revision/profile. Overlapping
  // alias/derived-field effects must agree, not silently override a decision.
  const exports=compileTrackerWriteSteps(ops,after,tables,hints);
  if(imports.length+exports.length>500||items.length>5000)throw new Error("Combined run exceeds bound");
  const body:Omit<TrackerMixedPlan,"fingerprint"|"runId">={version:1,target:TRACKER_ID,ownerId:baseline.ownerId,libraryId:baseline.libraryId,generation:trackerBaselineGeneration(baseline),baselineStamp:context.stamp,metadataStamp:context.metadataStamp,sources:items.map(i=>({itemId:i.id,revision:i.revision})).sort((a,b)=>a.itemId.localeCompare(b.itemId)),imports,exports};
  if(selected?.length){body.selection={keys:[...selected].sort(),itemIds:[...selected].sort()};if(!imports.length&&!exports.length)throw new Error("No selected changes to apply");}
  const fingerprint=mixedHash(body);return {...body,fingerprint,runId:mixedRunId(fingerprint)};
}
/** A new Sheet item uses the same immutable package and journal. For the first
 * supported shape it is one explicit new item with otherwise converged sources;
 * field edits and another new item must be reviewed in separate runs. Caller
 * must obtain this fingerprint from a freshly read owner-scoped approval. */
export function compileMixedNewItemPlan(items:SnapshotItem[],tables:TrackerTable[],baseline:TrackerBaselineState,context:{stamp:string;metadataStamp:string},tab:string,identity:string,approvedFingerprint:string,observedAt:string,selectedKey?:string):TrackerMixedPlan{
  const command=prepareNewTrackerImport({items,tables,baseline},tab,identity);
  if(command.fingerprint!==approvedFingerprint)throw new Error("New-item approval is stale");
  const remaining=tables.map(t=>t.name===tab?{...t,rows:t.rows.filter(c=>trackerRowIdentity(t,c)!==identity)}:t);
  const base=compileTrackerMixedPlan(items,remaining,[],baseline,context,observedAt,selectedKey?[]:undefined);
  if(base.imports.length||base.exports.length)throw new Error("Complete existing field changes before importing a new item");
  const {fingerprint:_fingerprint,runId:_runId,...body}=base;void _fingerprint;void _runId;
  const next={...body,creates:[command],...(selectedKey?{selection:{keys:[selectedKey],itemIds:[command.input.itemId]}}:{})},fingerprint=mixedHash(next);return {...next,fingerprint,runId:mixedRunId(fingerprint)};
}
export function compileMixedSameItemPlan(items:SnapshotItem[],tables:TrackerTable[],settings:SnapshotSetting[],baseline:TrackerBaselineState,context:{stamp:string;metadataStamp:string},changeId:string):TrackerMixedPlan{
 if(!/^[a-f0-9]{32}$/.test(context.stamp)||!/^[a-f0-9]{32}$/.test(context.metadataStamp))throw new Error("Fresh database generation required");
 const r=compileSameItemResolution({items,tables,baseline},settings,changeId),generation=trackerBaselineGeneration(baseline);
 const sheet=Object.fromEntries(r.keys.map(k=>[k,trackerFieldValue(k,projectRetainedTrackerRow(r.item,r.keys)[k])]));
 const imports=Object.keys(r.patch).length?[sealTrackerImport({version:1,target:TRACKER_ID,ownerId:baseline.ownerId,libraryId:baseline.libraryId,itemId:r.item.id,media:r.item.media_type,revision:r.item.revision,generation,keys:r.keys,fields:r.fields,patch:r.patch,sheet,beforeHash:r.beforeHash,afterHash:r.afterHash,identitySource:{identities:[r.sourceIdentity,r.originalIdentity].sort(),beforeRows:r.beforeRows,reviewToken:r.approval.token}})]:[];
 const body:Omit<TrackerMixedPlan,"fingerprint"|"runId">={version:1,target:TRACKER_ID,ownerId:baseline.ownerId,libraryId:baseline.libraryId,generation,baselineStamp:context.stamp,metadataStamp:context.metadataStamp,sources:items.map(i=>({itemId:i.id,revision:i.revision})).sort((a,b)=>a.itemId.localeCompare(b.itemId)),imports,exports:r.exports,identityReview:r.approval};
 const fingerprint=mixedHash(body);return {...body,fingerprint,runId:mixedRunId(fingerprint)};
}
export function compileMixedSeparateEditionPlan(items:SnapshotItem[],tables:TrackerTable[],settings:SnapshotSetting[],baseline:TrackerBaselineState,context:{stamp:string;metadataStamp:string},changeId:string):TrackerMixedPlan{
 if(!/^[a-f0-9]{32}$/.test(context.stamp)||!/^[a-f0-9]{32}$/.test(context.metadataStamp))throw new Error("Fresh database generation required");
 const source={items,tables,baseline},r=resolveReviewedIdentity(source,settings,changeId);
 const command=prepareNewTrackerImport(source,r.table.name,r.sourceIdentity,{settings,changeId});
 const created={...r.predicted,id:command.input.itemId},cells=r.table.rows.find(c=>trackerRowIdentity(r.table,c)===r.sourceIdentity)!;
 const operations=r.keys.filter(k=>!Object.is(trackerFieldValue(k,cells[r.table.headers.indexOf(k)]??""),command.fields[k])).map(k=>({id:JSON.stringify([created.id,k]),itemId:created.id,media:created.media_type,field:k,kind:["Title","Platform","IGDB_ID"].includes(k)?"provider-correction" as const:"export-field" as const,value:command.fields[k],comparisonToken:command.fingerprint}));
 const identity=JSON.parse(r.sourceIdentity) as string[];
 const exports=operations.length?compileTrackerWriteSteps(operations,[...items,created],tables,[{itemId:created.id,sourceId:created.id,primary:true,media:created.media_type,title:identity[0],edition:identity[1],provider:identity[2]}]):[];
 const body:Omit<TrackerMixedPlan,"fingerprint"|"runId">={version:1,target:TRACKER_ID,ownerId:baseline.ownerId,libraryId:baseline.libraryId,generation:trackerBaselineGeneration(baseline),baselineStamp:context.stamp,metadataStamp:context.metadataStamp,sources:items.map(i=>({itemId:i.id,revision:i.revision})).sort((a,b)=>a.itemId.localeCompare(b.itemId)),imports:[],exports,creates:[command],identityReview:r.approval};
 const fingerprint=mixedHash(body);return {...body,fingerprint,runId:mixedRunId(fingerprint)};
}
export function mixedJournal(plan:TrackerMixedPlan){
 const journal=newSyncJournal(plan.fingerprint,[...plan.imports.map(s=>({id:`import:${s.itemId}`,fingerprint:s.fingerprint})),...(plan.creates??[]).map(s=>({id:`create:${s.input.itemId}`,fingerprint:s.fingerprint})),...plan.exports.map(s=>({id:`export:${s.itemId}`,fingerprint:s.fingerprint}))]);
 // Prove the largest persisted state fits BEFORE claiming a run or dispatching
 // a write; pending journals omit the attempt UUID and can otherwise mislead.
 if(Buffer.byteLength(JSON.stringify({...journal,steps:journal.steps.map(s=>({...s,state:"confirmed",attempt:"00000000-0000-4000-8000-000000000000"}))}))>95000)throw new Error("Run journal exceeds safe completion bound");
 return journal;
}
export function encodeMixedPlan(plan:TrackerMixedPlan){const raw=JSON.stringify(plan);if(Buffer.byteLength(raw)>8000000)throw new Error("Run package exceeds decoded bound");const encoded="mixed-gzip-v1:"+gzipSync(raw).toString("base64");if(encoded.length>900000)throw new Error("Run package exceeds storage bound");return encoded;}
export function decodeMixedPlan(raw:unknown,libraryId:string,fingerprint:string):TrackerMixedPlan{
  if(typeof raw!=="string"||raw.length>900000||!raw.startsWith("mixed-gzip-v1:")||!/^[a-f0-9]{64}$/.test(fingerprint))throw new Error("Invalid combined package");
  const plan=JSON.parse(gunzipSync(Buffer.from(raw.slice(14),"base64"),{maxOutputLength:8000000}).toString("utf8")) as TrackerMixedPlan;
  const {fingerprint:stored,runId,...body}=plan;
  if(stored!==fingerprint||mixedHash(body)!==stored||runId!==mixedRunId(stored)||plan.version!==1||plan.target!==TRACKER_ID||plan.libraryId!==libraryId||!Array.isArray(plan.sources)||plan.sources.length>5000||new Set(plan.sources.map(s=>s.itemId)).size!==plan.sources.length||!Array.isArray(plan.imports)||!Array.isArray(plan.exports))throw new Error("Combined package scope/integrity mismatch");
  if(plan.selection){const s=plan.selection,operations=[...plan.imports.map(i=>i.itemId),...plan.exports.map(i=>i.itemId),...(plan.creates??[]).map(c=>c.input.itemId)];if(!Array.isArray(s.keys)||!s.keys.length||s.keys.length>100||s.keys.some(k=>typeof k!=="string"||!k||k.length>512)||!Array.isArray(s.itemIds)||!s.itemIds.length||new Set(s.keys).size!==s.keys.length||new Set(s.itemIds).size!==s.itemIds.length||s.itemIds.some(id=>!/^[a-f0-9-]{36}$/i.test(id)||!operations.includes(id))||operations.some(id=>!s.itemIds.includes(id)))throw new Error("Invalid selected-item scope");}
  if(plan.imports.some(s=>s.identitySource)&&!plan.identityReview)throw new Error("Reviewed identity approval required");
  if(plan.identityReview){
    const a=plan.identityReview;
    if(!Number.isSafeInteger(a.reviewRevision)||a.reviewRevision<1||!/^[a-f0-9]{64}$/.test(a.token)||!a.reviewKey.startsWith("__cdl_tracker_identity_review_v1:")||!plan.sources.some(s=>s.itemId===a.candidateId&&s.revision===a.candidateRevision))throw new Error("Invalid reviewed identity approval");
    if(a.choice.mode==="same"){
     if(plan.creates||plan.imports.length>1||plan.imports.some(s=>s.itemId!==a.candidateId||s.identitySource?.reviewToken!==a.token)||plan.exports.length!==1||plan.exports[0].itemId!==a.candidateId||plan.exports[0].kind!=="duplicate-cleanup"||plan.exports[0].expectedRows!==2)throw new Error("Invalid same-item package");
    }else if(a.choice.mode!=="separate"||plan.creates?.length!==1||plan.imports.length||plan.exports.length>1||plan.exports.some(s=>s.itemId!==plan.creates![0].input.itemId||s.kind!=="fields")||mixedHash(plan.creates[0].identityApproval)!==mixedHash(a))throw new Error("Invalid separate-edition package");
  }
  if(plan.creates!==undefined){
    if(!Array.isArray(plan.creates)||plan.creates.length!==1||plan.imports.length||plan.exports.length&&!plan.identityReview)throw new Error("Unsupported new-item run shape");
    const c=plan.creates[0],{fingerprint:commandHash,...commandBody}=c;
    if(mixedHash(commandBody)!==commandHash||c.ownerId!==plan.ownerId||c.libraryId!==plan.libraryId||c.generation!==plan.generation||c.target!==TRACKER_ID||c.input.libraryId!==plan.libraryId||plan.sources.some(s=>s.itemId===c.input.itemId))throw new Error("New-item package scope mismatch");
  }
  mixedJournal(plan);return plan;
}
