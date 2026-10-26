"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TrackerChange, TrackerPreview } from "../lib/v14/tracker-preview";
import {applyReviewedSync} from "../lib/v14/tracker-review-flow";
import {readFreshTrackerPreview} from "../lib/v14/tracker-preview-client";
import {trackerReviewBlockers,readyTrackerItemIds,trackerItemChoiceRows} from "../lib/v14/tracker-review-blockers";
import {LibraryBackups} from './LibraryBackups';

function SummaryIcon({kind}:{kind:"clock"|"collection"|"review"}){const color={clock:"#3789ee",collection:"#55a46b",review:"#e59b3e"}[kind];return <span aria-hidden style={{display:"grid",placeItems:"center",width:44,height:44,borderRadius:14,color,background:color+"18"}}><svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{kind==="clock"?<><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>:kind==="collection"?<><rect x="4" y="5" width="16" height="15" rx="3"/><path d="M8 2v6m8-6v6M8 12h8m-8 4h5"/></>:<><path d="M10.3 4.5 2.8 18a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.5a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></>}</svg></span>;}
function IdentityReviewDetails({review}:{review:NonNullable<TrackerChange["identityReview"]>}){
  return <details style={{marginTop:10}}><summary style={{cursor:"pointer",minHeight:44,display:"flex",alignItems:"center"}}>View identity details</summary>
    <p>{review.tab} · current Sheet row{review.rows.length===1?"":"s"} {review.rows.join(", ")}. Row numbers are for reference only and may move.</p>
    <dl>{Object.entries(review.identity).map(([key,value])=><div key={key}><dt>{key}</dt><dd style={{margin:"0 0 8px",whiteSpace:"pre-wrap"}}>{value||"Not set"}</dd></div>)}</dl>
    {review.candidates.length?<><b>Possible app items — not confirmed matches</b><ul>{review.candidates.map((candidate,n)=><li key={n}>{candidate.title} · {candidate.edition||"No edition"} · ID: {candidate.provider||"Not set"}</li>)}</ul></>:null}
    <p>{review.guidance}</p><p>No import, merge or deletion is authorized by this report.</p>
  </details>;
}
export function TrackerSyncView({libraryId,isDark,onBack,onSynced,iconSrc="/icon-sync.svg"}:{libraryId:string;isDark:boolean;onBack:()=>void;onSynced?:()=>void;iconSrc?:string}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [screen,setScreen]=useState<"home"|"review"|"backups"|"history">("home");
  const [backupBusy,setBackupBusy]=useState(false);
  useEffect(()=>{
    const element=dialog.current;
    const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const overflow=document.body.style.overflow;
    element?.showModal();document.body.style.overflow="hidden";
    return()=>{element?.close();document.body.style.overflow=overflow;previous?.focus();};
  },[]);
  useEffect(()=>{heading.current?.focus();dialog.current?.scrollTo({top:0});},[screen]);
  const [preview,setPreview]=useState<TrackerPreview|null>(null);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [skipped,setSkipped]=useState<Record<string,boolean>>({});
  const [expanded,setExpanded]=useState<Record<string,boolean>>({});
  const [batchApplying,setBatchApplying]=useState(false);
  const latestPreview=useRef<TrackerPreview|null>(null);
  const [visibleLimit,setVisibleLimit]=useState(100);
  const [choices,setChoices]=useState<Record<string,"app"|"tracker">>({});
  const choiceDrafts=useRef(new Map<string,"app"|"tracker"|"clear">());
  const [saving,setSaving]=useState<string|null>(null);
  const [saveError,setSaveError]=useState("");
  const [preparing,setPreparing]=useState(false);
  const [manual,setManual]=useState<{fingerprint:string;imports:number;exports:number;items?:string[];staged:boolean;resume:boolean;writeEnabled:boolean}|null>(null);
  const [manualMessage,setManualMessage]=useState("");
  const [confirmedSync,setConfirmedSync]=useState<{at:string;records:number}|null>(null);
  const [preparation,setPreparation]=useState<{operations:number;records:number;fingerprint:string;checkpointSaved:boolean}|null>(null);
  const preparationRequest=useRef<AbortController|null>(null);
  const retries=useRef(new Map<string,string>());
  const request=useRef<AbortController|null>(null);
  const ready=preview?.status==="ready"||preview?.status==="initial-review";
  const changes=preview?.changes??[];
  async function refresh(afterManual=false) {
    if(saving&&!afterManual)return;
    setManual(null);setManualMessage("");
    preparationRequest.current?.abort();setPreparing(false);setPreparation(null);
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setLoading(true);setError("");setSaveError("");setPreview(null);latestPreview.current=null;setChoices({});choiceDrafts.current.clear();setVisibleLimit(100);
    try {
      const next=await readFreshTrackerPreview(libraryId,controller.signal);
      if(!controller.signal.aborted){latestPreview.current=next;setPreview(next);setChoices(Object.fromEntries(next.changes.filter(row=>row.savedChoice).map(row=>[row.id,row.savedChoice!])));return next;}
    }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Preview unavailable.");}
    finally{if(!controller.signal.aborted)setLoading(false);}
  }
  async function saveChoice(row:TrackerChange,side:"app"|"tracker"|"clear"){
    if(saving||!row.decisionToken||!preview?.canSaveDecisions)return;
    if(preview.comparisonMode==="three-way"&&!row.identitySelection&&!row.blockedField){
      // Selecting values is local and immediate. Apply validates these tokens against fresh sources.
      preparationRequest.current?.abort();setPreparing(false);setPreparation(null);setManual(null);setManualMessage("");setSaveError("");
      choiceDrafts.current.set(row.id,side);
      setChoices(old=>{const next={...old};if(side==="clear")delete next[row.id];else next[row.id]=side;return next;});
      const current=latestPreview.current??preview;
      const next={...current,changes:current.changes.map(change=>change.id===row.id?{...change,...(change.plannedAction?{planApproved:side===(change.plannedAction==="import-record"?"tracker":"app")}:{})}:change)};
      latestPreview.current=next;setPreview(next);
      return true;
    }
    preparationRequest.current?.abort();setPreparing(false);setSaving(row.id);setSaveError("");setPreparation(null);setManual(null);setManualMessage("");
    const retryKey=JSON.stringify([libraryId,row.id,row.decisionToken,row.decisionRevision,side]);
    const requestId=retries.current.get(retryKey)??crypto.randomUUID();retries.current.set(retryKey,requestId);
    try{
      const response=await fetch('/v14/api/sync-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({libraryId,changeId:row.id,token:row.decisionToken,side,revision:row.decisionRevision??null,requestId})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Review decision not confirmed. Retry or refresh.");
      if(result.confirmed!==true||result.requestId!==requestId||result.token!==row.decisionToken||result.side!==side||result.revision!==(row.decisionRevision??0)+1)throw new Error("Review decision readback not confirmed.");
      setChoices(old=>{const next={...old};if(side==="clear")delete next[row.id];else next[row.id]=side;return next;});
      setPreview(old=>old?{...old,changes:old.changes.map(change=>change.id===row.id?{...change,decisionRevision:result.revision,savedChoice:side==="clear"?undefined:side,...(change.plannedAction?{planApproved:side===(change.plannedAction==="import-record"?"tracker":"app")}:{})}:change)}:old);
      retries.current.delete(retryKey);
      if(side==="clear")await refresh();
      return true;
    }catch(cause){setSaveError(cause instanceof Error?cause.message:"Review decision not confirmed.");}
    finally{setSaving(null);}
  }
  async function saveIdentityChoice(row:TrackerChange,choice:NonNullable<TrackerChange["identitySelection"]>["choice"]|null){
    const selection=row.identitySelection;if(!selection||saving||loading||preparing||!preview?.canSaveDecisions)return;
    const key=JSON.stringify(["identity-review",libraryId,row.id,selection.token,selection.revision,choice]),requestId=retries.current.get(key)??crypto.randomUUID();retries.current.set(key,requestId);
    setSaving(row.id);setSaveError("");setManual(null);setManualMessage("");
    try{
      const response=await fetch('/v14/api/sync-review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:"identity-review",libraryId,changeId:row.id,token:selection.token,choice,revision:selection.revision,requestId})}),v=await response.json();
      if(!response.ok||v.confirmed!==true||v.applied!==false||v.requestId!==requestId||v.token!==selection.token||v.revision!==(selection.revision??0)+1||JSON.stringify(v.choice)!==JSON.stringify(choice))throw new Error(v.error??"Identity review was not confirmed. Refresh or retry safely.");
      retries.current.delete(key);
      if(typeof v.readiness?.ready!=="boolean"||typeof v.readiness?.reason!=="string")throw new Error("Identity readiness was not confirmed. Refresh before applying.");
      setPreview(old=>old?{...old,changes:old.changes.map(r=>r.id===row.id?{...r,identitySelection:{...selection,revision:v.revision,choice:choice??undefined,...v.readiness}}:r)}:old);
    }catch(cause){setSaveError(cause instanceof Error?cause.message:"Identity review not confirmed.");}finally{setSaving(null);}
  }
  async function saveInitialReview(clear=false){
    if(saving||!preview?.reviewToken||!preview.canSaveDecisions)return;
    preparationRequest.current?.abort();setPreparing(false);setSaving("__initial_review");setSaveError("");setPreparation(null);
    const retryKey=JSON.stringify(["initial",libraryId,preview.reviewToken,preview.reviewBatchRevision,clear]);
    const requestId=retries.current.get(retryKey)??crypto.randomUUID();retries.current.set(retryKey,requestId);
    try{
      const response=await fetch("/v14/api/sync-review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:clear?"clear-initial-review":"keep-app-review",libraryId,requestId,token:preview.reviewToken,revision:preview.reviewBatchRevision??null})});
      const result=await response.json();
      if(!response.ok||result.confirmed!==true||result.requestId!==requestId||result.token!==preview.reviewToken||result.revision!==(preview.reviewBatchRevision??0)+1||result.cleared!==clear)throw new Error(result.error??"Initial review save not confirmed. Retry or refresh.");
      retries.current.delete(retryKey);await refresh();
    }catch(cause){setSaveError(cause instanceof Error?cause.message:"Initial review not confirmed.");}
    finally{setSaving(null);}
  }
  async function checkExecution(){
    if(preparing||saving||loading||!preview?.reviewComplete)return;
    preparationRequest.current?.abort();const controller=new AbortController();preparationRequest.current=controller;
    setPreparing(true);setPreparation(null);setSaveError("");
    try{
      const response=await fetch(`/v14/api/sync-execution?libraryId=${encodeURIComponent(libraryId)}`,{cache:"no-store",signal:controller.signal});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Execution preparation unavailable. No changes were written.");
      if(result.status!=="prepared"||result.writeEnabled!==false||result.approvalRevision!==preview.reviewBatchRevision||
        typeof result.fingerprint!=="string"||!/^[a-f0-9]{64}$/.test(result.fingerprint)||typeof result.checkpointSaved!=="boolean"||
        !Number.isSafeInteger(result.operations)||result.operations<0||result.operations>500||!Number.isSafeInteger(result.records)||result.records<0||result.records>result.operations)throw new Error("Execution preparation was not confirmed.");
      if(!controller.signal.aborted)setPreparation({operations:result.operations,records:result.records,fingerprint:result.fingerprint,checkpointSaved:result.checkpointSaved});
    }catch(cause){if(!controller.signal.aborted)setSaveError(cause instanceof Error?cause.message:"Execution preparation unavailable.");}
    finally{if(!controller.signal.aborted)setPreparing(false);}
  }
  async function saveExecutionCheckpoint(){
    if(!preparation||preparation.checkpointSaved||saving||loading||preparing)return;
    const fingerprint=preparation.fingerprint,retryKey=JSON.stringify(["execution",libraryId,fingerprint]);
    const requestId=retries.current.get(retryKey)??crypto.randomUUID();retries.current.set(retryKey,requestId);
    setSaving("__execution");setSaveError("");
    try{
      const response=await fetch("/v14/api/sync-execution",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({libraryId,requestId,fingerprint})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error??"Execution checkpoint not confirmed.");
      if(result.prepared!==true||result.writeEnabled!==false||result.requestId!==requestId||result.fingerprint!==fingerprint||result.records!==preparation.records||result.confirmed!==0||!Number.isSafeInteger(result.manifestRevision)||result.manifestRevision<1||!Number.isSafeInteger(result.journalRevision)||result.journalRevision<1)throw new Error("Execution checkpoint readback not confirmed.");
      retries.current.delete(retryKey);setPreparation(old=>old?.fingerprint===fingerprint?{...old,checkpointSaved:true}:old);
    }catch(cause){setSaveError(cause instanceof Error?cause.message:"Execution checkpoint not confirmed.");}
    finally{setSaving(null);}
  }
  async function checkManual(items?:string[]){
    if(preparing||saving||loading)return;
    preparationRequest.current?.abort();const controller=new AbortController();preparationRequest.current=controller;
    setPreparing(true);setSaveError("");setManual(null);setManualMessage("");
    try{
      const response=await fetch(`/v14/api/sync-manual?libraryId=${encodeURIComponent(libraryId)}${items?`&items=${encodeURIComponent(JSON.stringify(items))}`:""}`,{cache:"no-store",signal:controller.signal}),v=await response.json();
      if(!response.ok)throw new Error(v.error??"Readiness unavailable.");
      if(typeof v.fingerprint!=="string"||!/^[a-f0-9]{64}$/.test(v.fingerprint)||![v.imports,v.exports].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=500)||![v.staged,v.resume,v.writeEnabled].every(b=>typeof b==="boolean"))throw new Error("Readiness not confirmed.");
      if(items&&!v.resume&&JSON.stringify(v.items)!==JSON.stringify([...items].sort()))throw new Error("Selected items were not confirmed.");
      if(!controller.signal.aborted){setManual(v);return v as NonNullable<typeof manual>;}
    }catch(cause){if(!controller.signal.aborted)setSaveError(cause instanceof Error?cause.message:"Readiness unavailable.");}finally{if(!controller.signal.aborted)setPreparing(false);}
  }
  async function manualCommand(action:"stage"|"apply",plan=manual){
    if(!plan||saving||loading||preparing)return false;
    const fingerprint=plan.fingerprint,key=JSON.stringify(["manual",action,libraryId,fingerprint]),requestId=retries.current.get(key)??crypto.randomUUID();retries.current.set(key,requestId);
    setSaving("__manual");setSaveError("");setManualMessage(action==="stage"?"Preparing selected items…":"Syncing and checking confirmation…");
    try{
      const response=await fetch('/v14/api/sync-manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,libraryId,fingerprint,requestId,...(plan.items?{items:plan.items}:{})})}),v=await response.json();
      if(!response.ok&&action==="apply"&&["pending","uncertain"].includes(v.status)){setManual({...plan,staged:true,resume:true});setManualMessage("Checking confirmation… Changes may already be saved. Use Resume Saved Sync to verify the same operation safely.");return false;}
      if(!response.ok)throw new Error(v.error??`Sync ${v.status??"not confirmed"}. Check readiness to resume the saved run.`);
      if(v.requestId!==requestId||(action==="stage"?(v.fingerprint!==fingerprint||v.staged!==true):(v.plan!==fingerprint||v.status!=="verified"||v.receipt?.plan!==fingerprint||!Number.isFinite(Date.parse(v.receipt?.confirmedAt))||!Number.isSafeInteger(v.receipt?.records)||v.receipt.records<0)))throw new Error("Sync readback not confirmed.");
      retries.current.delete(key);
      if(action==="stage"){setManual(old=>old?.fingerprint===fingerprint?{...old,staged:true}:old);setManualMessage("Checkpoint saved. No library or Sheet values changed.");}
      else {setConfirmedSync({at:v.receipt.confirmedAt,records:v.receipt.records});await refresh(true);onSynced?.();setManualMessage("Sync complete. Both sides were checked and confirmed. A failed fresh comparison does not undo this confirmed save.");}
      return true;
    }catch(cause){if(action==="apply"&&(cause instanceof TypeError||cause instanceof DOMException)){setManual({...plan,staged:true,resume:true});setManualMessage("Checking confirmation… The connection was interrupted. Resume Saved Sync to verify the same operation.");}else{setManualMessage("");setSaveError(cause instanceof Error?cause.message:"Sync not confirmed.");}}finally{setSaving(null);}
  }
  useEffect(()=>{void refresh();return()=>{request.current?.abort();preparationRequest.current?.abort();};},[libraryId]); // eslint-disable-line react-hooks/exhaustive-deps
  const needsReview=(row:TrackerChange)=>["add-record","import-record"].includes(row.plannedAction??"")?false:row.identitySelection?!row.identitySelection.ready:row.plannedAction?!row.planApproved:row.blockedField?!row.repairApproved:(row.direction==="review"||row.direction==="conflict")&&!choices[row.id];
  const isExport=(row:TrackerChange)=>choices[row.id]?choices[row.id]==="app":row.direction==="export"||row.planApproved&&row.plannedAction!=="import-record";
  const isImport=(row:TrackerChange)=>choices[row.id]?choices[row.id]==="tracker":row.direction==="import"||row.planApproved&&row.plannedAction==="import-record";
  const visible=changes;
  const display=(value:TrackerChange["app"])=>{
    if(value===null)return "Not set";if(value==="")return "Empty";
    const text=String(value);
    if(text.startsWith("{")){try{const fields=JSON.parse(text);if(fields&&typeof fields==='object'&&!Array.isArray(fields))return Object.entries(fields).map(([key,v])=>`${key.replaceAll('_',' ')}: ${v??'Not set'}`).join(' · ');}catch{/* Ordinary text stays unchanged. */}}
    return text;
  };
  const renderValue=(value:TrackerChange["app"])=>{const text=display(value);return text.length>180?<details><summary>{text.slice(0,140)}…</summary><p style={{whiteSpace:"pre-wrap",overflowWrap:"anywhere"}}>{text}</p></details>:text;};

  const applying=useRef(false);
  const [choosingAll,setChoosingAll]=useState(false);
  const selectableValue=(row:TrackerChange)=>!!row.decisionToken&&row.resolutionAllowed===true&&!row.plannedAction&&!row.blockedField&&!row.identitySelection&&["conflict","import","export"].includes(row.direction);
  async function chooseAllValues(rows:TrackerChange[],side:"app"|"tracker"){
    if(choosingAll||saving||batchApplying)return;
    setChoosingAll(true);
    try{for(const row of trackerItemChoiceRows(rows,side)){if(!await saveChoice(row,side))return;}}
    finally{setChoosingAll(false);}
  }
  async function confirmChoiceDrafts(itemIds:string[]){
    const rows=(latestPreview.current??preview)?.changes.filter(row=>itemIds.includes(row.itemId)&&choiceDrafts.current.has(row.id))??[];
    if(!rows.length)return true;
    setSaving("__choices");setSaveError("");setManualMessage("Checking your selected values together…");
    try{
      for(let offset=0;offset<rows.length;offset+=100){
        const commands=rows.slice(offset,offset+100).map(row=>{
          const side=choiceDrafts.current.get(row.id)!;
          const key=JSON.stringify([libraryId,row.id,row.decisionToken,row.decisionRevision,side]);
          const requestId=retries.current.get(key)??crypto.randomUUID();retries.current.set(key,requestId);
          return {changeId:row.id,token:row.decisionToken!,side,revision:row.decisionRevision??null,requestId};
        });
        const batchKey=JSON.stringify(["choice-batch",libraryId,commands]),requestId=retries.current.get(batchKey)??crypto.randomUUID();retries.current.set(batchKey,requestId);
        const response=await fetch('/v14/api/sync-review-batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({libraryId,requestId,choices:commands})});
        const result=await response.json();
        if(!response.ok)throw new Error(result.error??"Selected values were not confirmed. Retry safely.");
        if(result.confirmed!==true||result.applied!==false||result.requestId!==requestId||!Array.isArray(result.choices)||result.choices.length!==commands.length||commands.some((command,index)=>{
          const saved=result.choices[index];return !saved||saved.changeId!==command.changeId||saved.token!==command.token||saved.requestId!==command.requestId||saved.side!==command.side||saved.revision!==(command.revision??0)+1;
        }))throw new Error("Selected value readback was not confirmed.");
        const savedById=new Map(commands.map(command=>[command.changeId,command]));
        const current=latestPreview.current??preview;
        if(current){const next={...current,changes:current.changes.map(row=>{const command=savedById.get(row.id);return command?{...row,decisionRevision:(command.revision??0)+1,savedChoice:command.side==="clear"?undefined:command.side}:row;})};latestPreview.current=next;setPreview(next);}
        for(const command of commands){choiceDrafts.current.delete(command.changeId);retries.current.delete(JSON.stringify([libraryId,command.changeId,command.token,command.revision,command.side]));}
        retries.current.delete(batchKey);
      }
      setManualMessage("");return true;
    }catch(cause){setManualMessage("");setSaveError(cause instanceof Error?cause.message:"Selected values were not confirmed.");return false;}
    finally{setSaving(null);}
  }
  async function applySelected(ids?:string[]){
    if(applying.current||loading||saving||preparing)return;
    applying.current=true;
    setBatchApplying(true);
    try{
      if(manual?.resume){await manualCommand("apply",manual);return;}
      if(preview?.activeRun){await applyReviewedSync(()=>checkManual(),manualCommand);return;}
      const selected=ids??readyItemIds;
      if(!selected.length)return;
      let selectedRows=(latestPreview.current??preview)?.changes.filter(r=>selected.includes(r.itemId))??[];
      for(const row of selectedRows.filter(r=>["add-record","import-record"].includes(r.plannedAction??"")&&!r.planApproved))if(!await saveChoice(row,row.plannedAction==="import-record"?"tracker":"app"))return;
      if(!await confirmChoiceDrafts(selected))return;
      selectedRows=(latestPreview.current??preview)?.changes.filter(r=>selected.includes(r.itemId))??[];
      if(selectedRows.every(r=>r.plannedAction!=="import-record"&&!r.identitySelection)){
        for(const row of selectedRows.filter(r=>r.plannedAction==="add-record"&&!r.planApproved))if(!await saveChoice(row,"app"))return;
        const status=await applyReviewedSync(()=>checkManual(selected),manualCommand);
        if(status==="disabled")setSaveError("Applying changes is disabled in this session.");return;
      }
      for(const id of selected){
        const rows=latestPreview.current?.changes.filter(r=>r.itemId===id)??[];
        if(!rows.length)continue;
        for(const row of rows.filter(r=>["add-record","import-record"].includes(r.plannedAction??"")&&!r.planApproved)){
          if(!await saveChoice(row,row.plannedAction==="import-record"?"tracker":"app"))return;
        }
        const status=await applyReviewedSync(()=>checkManual([id]),manualCommand);
        if(status!=="verified"){if(status==="disabled")setSaveError("Applying changes is disabled in this session.");return;}
      }
    }finally{applying.current=false;setBatchApplying(false);}
  }
  const groups=new Map<string,TrackerChange[]>();
  for(const row of visible){const key=JSON.stringify([row.media,row.itemId]);groups.set(key,[...(groups.get(key)??[]),row]);}
  const reviewItems=new Set(changes.filter(needsReview).map(r=>JSON.stringify([r.media,r.itemId]))).size;
  const rowBlocked=(rows:TrackerChange[])=>rows.some(r=>needsReview(r)&&!["add-record","import-record"].includes(r.plannedAction??""));
  const readyItemIds=readyTrackerItemIds(changes,choices,skipped);
  const selectedCount=readyItemIds.length;
  const busy=loading||saving!==null||preparing||batchApplying||choosingAll;
  const closeLocked=saving!==null||batchApplying||choosingAll||backupBusy;
  const safeCover=(url:string)=>/^https?:\/\//i.test(url)?url:"";
  function choiceButtons(row:TrackerChange){
    if(selectableValue(row))return choices[row.id]?<button disabled={busy} onClick={()=>void saveChoice(row,"clear")}>Clear selection</button>:null;
    if(row.plannedAction==="add-record"||row.plannedAction==="import-record")return null;
    if(row.resolutionAllowed===false||!row.decisionToken||row.direction!=="conflict"&&!row.blockedField&&!row.plannedAction)return null;
    const sides=row.plannedAction?["app"] as const:["app","tracker"] as const;
    return <div className="choices">{sides.map(side=><button key={side} aria-pressed={choices[row.id]===side} disabled={busy||!preview?.canSaveDecisions} onClick={()=>void saveChoice(row,side)}>{row.plannedAction==="provider-correction"?"Use app identity":side==="app"?"Use App":"Use Sheet"}</button>)}{choices[row.id]?<button disabled={busy||!preview?.canSaveDecisions} onClick={()=>void saveChoice(row,"clear")}>Clear choice</button>:null}</div>;
  }
  function valueChoice(row:TrackerChange,side:"app"|"tracker"){
    const selected=choices[row.id]?choices[row.id]===side:side==="app"?isExport(row):isImport(row);
    const value=side==="app"?row.app:row.tracker;
    if(!selectableValue(row))return <div className={selected?"value selected":"value"}><small>{side==="app"?"App":"Google Sheet"}</small>{row.identitySelection?.ready?(side==="app"?"Existing app record retained":row.identitySelection.choice?.mode==="same"?"Consolidate 2 reviewed rows":"Keep both editions"):renderValue(value)}</div>;
    return <button className={"value valueChoice"+(selected?" selected":"")} aria-pressed={selected} aria-label={`Keep ${side==="app"?"App":"Sheet"} ${row.label}: ${display(value)}`} disabled={busy||!preview?.canSaveDecisions} onClick={()=>void saveChoice(row,side)}><span className="sourceLabel">{side==="app"?"App":"Google Sheet"}</span><span>{display(value)}</span><span className="selectionHint">{selected?"✓ Selected to keep":"Tap to keep this value"}</span></button>;
  }
  function identityFieldButtons(row:TrackerChange,field:string){
    const selection=row.identitySelection,choice=selection?.choice;if(!selection||!choice)return null;
    return <div className="fieldActions choices">{(["app","tracker"] as const).map(side=><button key={side} disabled={busy||!preview?.canSaveDecisions} aria-label={`Use ${side==="app"?"App":"Sheet"} for ${field}`} aria-pressed={choice.fields[field]===side} onClick={()=>void saveIdentityChoice(row,{mode:choice.mode,fields:{...choice.fields,[field]:side}})}>Use {side==="app"?"App":"Sheet"}</button>)}</div>;
  }
  return typeof document==="undefined"?null:createPortal(<dialog ref={dialog} className={`trackerSync ${isDark?"dark":""}`} aria-labelledby="sync-panel-title" onKeyDown={event=>event.stopPropagation()} onKeyUp={event=>event.stopPropagation()} onCancel={event=>{event.preventDefault();if(!closeLocked)onBack();}}>
    <div className="panelNavigation">
      <button disabled={closeLocked} onClick={()=>screen==="home"?onBack():setScreen("home")} aria-label={screen==="home"?"Back to library":"Back to Sync"}>‹</button>
      <button disabled={closeLocked} onClick={onBack} aria-label="Close Sync">×</button>
    </div>
    <header>
      <img className="syncIcon" src={iconSrc} alt="" />
      <div className="heading"><h1 id="sync-panel-title" ref={heading} tabIndex={-1}>{screen==="home"?"Sync":screen==="review"?"Review Changes":screen==="backups"?"Backups":"Sync History"}</h1><p>{screen==="home"?"Your collection, kept together.":screen==="review"?"Choose what to keep.":screen==="backups"?"A safe copy of your collection.":"Your latest confirmed activity."}</p></div>
    </header>
    {screen==="home"?<>
      <button className="primary syncNow" disabled={busy} onClick={()=>{setScreen("review");void refresh();}}>{loading?"Checking both sides…":"Sync Now"}</button>
      <p className="lastSynced">Last synced {preview?.lastConfirmedSync||confirmedSync?.at?new Date(preview?.lastConfirmedSync||confirmedSync!.at).toLocaleString():"—"}</p>
      <nav className="menuGroup" aria-label="Sync options">
        <button onClick={()=>setScreen("review")}><SummaryIcon kind="review"/><span>Changes to Review<small>{loading?"Checking for differences…":error||!ready?"Connection needs attention":`${groups.size} items to review`}</small></span><span aria-hidden>›</span></button>
        <button onClick={()=>setScreen("backups")}><SummaryIcon kind="collection"/><span>Backups<small>Back up or restore your collection</small></span><span aria-hidden>›</span></button>
        <button onClick={()=>setScreen("history")}><SummaryIcon kind="clock"/><span>Sync History<small>Last sync and nightly activity</small></span><span aria-hidden>›</span></button>
      </nav>
      <p className="lastSynced">Review differences before applying changes.</p>
    </>:null}
    <div hidden={screen!=="history"}>
    <div className="stats">
      <div><SummaryIcon kind="clock"/><div><small>Last synced</small><b>{preview?.lastConfirmedSync||confirmedSync?.at?new Date(preview?.lastConfirmedSync||confirmedSync!.at).toLocaleString():"—"}</b></div></div>
      <div><SummaryIcon kind="collection"/><div><small>Items in last sync</small><b>{preview?.lastConfirmedSync&&preview.syncedRecords!==undefined?preview.syncedRecords.toLocaleString():confirmedSync?confirmedSync.records.toLocaleString():"—"}</b></div></div>
      <div><SummaryIcon kind="review"/><div><small>To review</small><b>{ready?reviewItems:"—"}</b></div></div>
    </div>
    {preview?.nightly?.startedAt ? <p className="protection">Last nightly run: {new Date(preview.nightly.startedAt).toLocaleString()} · {preview.nightly.status === "completed" ? "Completed" : preview.nightly.status === "review" ? "Review needed" : preview.nightly.status === "failed" ? "Not completed—review required" : "In progress"}{preview.nightly.backupAt ? " · Full backup verified" : " · Backup not yet confirmed"}{preview.nightly.syncedItems !== null ? ` · ${preview.nightly.syncedItems} items synced` : ""}{preview.nightly.heldItems ? ` · ${preview.nightly.heldItems} held for review` : ""}</p> : null}
    </div>
    {screen==="backups"?<LibraryBackups libraryId={libraryId} onBusyChange={setBackupBusy}/>:null}
    <div hidden={screen!=="review"}>
    {ready&&groups.size>0?<><h2 className="reviewHeading">{groups.size} item{groups.size===1?"":"s"} to review</h2><p className="reviewHint">Choose the values to keep, then Apply. Selections are instant; nothing is synced until you apply.</p></>:null}
    {loading?<div className="empty" role="status">Checking your collection against the latest Google Sheet…</div>:error?<p role="alert">{error}</p>:!ready?<div className="empty"><h2>Tracker connection needs attention</h2><p>{preview?.message}</p></div>:groups.size?Array.from(groups.entries()).slice(0,visibleLimit).map(([key,rows])=>{
      const first=rows[0],context=first.displayRecord,cover=safeCover(context?.coverUrl??""),held=rows.some(needsReview),blockers=trackerReviewBlockers(rows,choices);
      const fields=[...new Set([...Object.keys(context?.app??{}),...Object.keys(context?.tracker??{})])];const appFields=context?.app??{},trackerFields=context?.tracker??{};
      const edition=String(trackerFields.Platform||trackerFields.Type||appFields.Platform||appFields.Type||"");
      return <article className="mediaCard" key={key} style={{opacity:skipped[first.itemId]?0.65:1}}>
        <div className="artwork">{cover?<img src={cover} alt={first.title+" cover"} loading="lazy" onError={event=>{event.currentTarget.style.visibility="hidden";}}/>:<span aria-hidden>{first.media==="book"?"📖":first.media==="game"?"🎮":"🎬"}</span>}</div>
        <div className="record">
          <div className="recordHeader"><div><h2>{first.title}</h2><p className={"media "+first.media}>{first.media==="tv"?"TV Show":first.media==="game"?"Game":first.media==="book"?"Book":"Movie"}{edition?" · "+edition:""}</p></div><span className={held?"badge amber":"badge"}>{held?"Needs review":first.plannedAction==="add-record"?"New to tracker":first.plannedAction==="import-record"?"New to app":rows.length+" difference"+(rows.length===1?"":"s")}</span></div>
          <div className="quickActions">
          {rows.some(selectableValue)?<div className="choices">{(["app","tracker"] as const).map(side=><button key={side} aria-pressed={trackerItemChoiceRows(rows,side).length>0&&trackerItemChoiceRows(rows,side).every(row=>choices[row.id]===side)} disabled={busy||!preview?.canSaveDecisions} onClick={()=>void chooseAllValues(rows,side)}>Keep {side==="app"?"App":"Sheet"}</button>)}</div>:null}
          <button aria-expanded={!!expanded[key]} aria-controls={`comparison-${first.itemId}`} onClick={()=>setExpanded(old=>({...old,[key]:!old[key]}))}>{expanded[key]?"Compare ▴":"Compare ▾"}</button>
          <button disabled={busy} aria-pressed={!!skipped[first.itemId]} onClick={()=>setSkipped(old=>({...old,[first.itemId]:!old[first.itemId]}))}>{skipped[first.itemId]?"Include":"Skip"}</button>
          <button className="primary" disabled={busy||rowBlocked(rows)||!!preview?.activeRun||!!manual?.resume||!!skipped[first.itemId]} onClick={()=>void applySelected([first.itemId])}>{first.plannedAction==="add-record"?"Add to Google Sheet":first.plannedAction==="import-record"?"Add to Library":"Apply"}</button>
          </div>
          {blockers.length?<p className="reviewHint" role="status">{blockers[0]} <button type="button" className="reviewLink" onClick={()=>setExpanded(old=>({...old,[key]:true}))}>Review details</button></p>:choiceDrafts.current.size>0&&rows.some(row=>choiceDrafts.current.has(row.id))?<p className="reviewHint">Selected. Click Apply to sync this item.</p>:null}
          <div id={`comparison-${first.itemId}`} className="comparisonBody" hidden={!expanded[key]}>
          {context?.candidate?<p style={{gridColumn:"1 / -1"}}>Artwork and app fields below belong to a possible match—not a confirmed link. Review its edition before syncing.</p>:null}
          {first.identitySelection?<div className="fieldActions" style={{gridColumn:"1 / -1",marginBottom:12}}><div className="choices">{(["same","separate"] as const).map(mode=><button key={mode} disabled={busy||!preview?.canSaveDecisions} aria-pressed={first.identitySelection?.choice?.mode===mode} onClick={()=>void saveIdentityChoice(first,{mode,fields:first.identitySelection?.choice?.mode===mode?first.identitySelection.choice.fields:{}})}>{mode==="same"?"Same item":"Separate edition"}</button>)}{first.identitySelection.choice?<button disabled={busy||!preview?.canSaveDecisions} onClick={()=>void saveIdentityChoice(first,null)}>Clear identity choice</button>:null}</div>{first.identitySelection.choice?<div className="choices">{(["app","tracker"] as const).map(side=><button key={side} disabled={busy||!preview?.canSaveDecisions} onClick={()=>void saveIdentityChoice(first,{mode:first.identitySelection!.choice!.mode,fields:Object.fromEntries(first.identitySelection!.fields.map(field=>[field,side]))})}>Use {side==="app"?"App":"Sheet"} for all fields</button>)}</div>:null}<p role="status">{first.identitySelection.reason??"Select how these records relate, then choose which field values to keep. Nothing changes until Apply."}</p></div>:null}
          {!["add-record","import-record"].includes(first.plannedAction??"")?<div className="comparisonHead"><span>Field</span><span>App</span><span>Google Sheet</span></div>:null}
          {context?.candidate?["Platform","Type","Ownership","Status","Format"].filter(field=>Object.hasOwn(trackerFields,field)&&!Object.is(appFields[field],trackerFields[field])).map(field=><div className="field" key={"candidate-"+field}><b className="fieldLabel">{field}</b><div className={first.identitySelection?.choice?.fields[field]==="app"?"value selected":"value"}><small>Possible app match</small>{renderValue(appFields[field]??null)}</div><div className={first.identitySelection?.choice?.fields[field]==="tracker"?"value selected":"value difference"}><small>Google Sheet</small>{renderValue(trackerFields[field])}</div>{first.identitySelection?.choice?<div className="fieldActions choices">{(["app","tracker"] as const).map(side=><button key={side} disabled={busy||!preview?.canSaveDecisions} aria-label={`Use ${side==="app"?"App":"Sheet"} for ${field}`} aria-pressed={first.identitySelection?.choice?.fields[field]===side} onClick={()=>void saveIdentityChoice(first,{mode:first.identitySelection!.choice!.mode,fields:{...first.identitySelection!.choice!.fields,[field]:side}})}>Use {side==="app"?"App":"Sheet"}</button>)}</div>:null}</div>):null}
          {rows.map(row=>["add-record","import-record"].includes(row.plannedAction??"")?<p className="newItemSummary" key={row.id}>Ready to add this item to {row.plannedAction==="add-record"?"your Google Sheet":"your library"}. Review its details below or apply it now.</p>:<div className="field" key={row.id}>
            <b className="fieldLabel">{row.identitySelection?.ready?"Confirmed item match":row.plannedAction==="provider-correction"?"Item match":row.label}</b>
            {valueChoice(row,"app")}
            {valueChoice(row,"tracker")}
            <div className="fieldActions">{choiceButtons(row)}{isExport(row)?<small>App value will update the tracker.</small>:isImport(row)?<small>Sheet value will update the app.</small>:null}
              {row.reason&&!row.identitySelection?.ready?<p>{row.reason}</p>:null}
              {row.proposedFields?<details><summary>Review required fields before adding</summary><dl>{Object.entries(row.proposedFields).map(([field,value])=><div key={field}><dt>{field}</dt><dd>{display(value)}</dd></div>)}</dl></details>:null}
              {row.identityReview?<IdentityReviewDetails review={row.identityReview}/>:null}
              {row.baseline!==undefined?<small>Previously synced: {display(row.baseline)}</small>:null}
            </div>
          </div>)}
          {fields.length?<details className="allFields"><summary>View item details ({fields.length} fields)</summary><div className="comparisonHead"><span>Field</span><span>App</span><span>Google Sheet</span></div>{fields.map(field=><div className="field" key={field}><b className="fieldLabel">{field}</b><div className="value"><small>App</small>{renderValue(appFields[field]??null)}</div><div className={Object.is(appFields[field],trackerFields[field])?"value":"value difference"}><small>Google Sheet</small>{renderValue(trackerFields[field])}</div>{identityFieldButtons(first,field)}</div>)}</details>:null}
          {rowBlocked(rows)?<div className="applyBlockers" role="status"><b>Before you can apply this item</b><ul>{trackerReviewBlockers(rows,choices).map((message,n)=><li key={n}>{message}</li>)}</ul>{rows.filter(row=>row.plannedAction==="provider-correction"&&!row.planApproved&&row.resolutionAllowed&&row.decisionToken).map(row=><button key={row.id} disabled={busy||!preview?.canSaveDecisions} onClick={()=>void saveChoice(row,"app")}>Confirm App Record Identity</button>)}</div>:null}
          {preview?.activeRun||manual?.resume?<p role="status">Resume the saved sync below before applying another item.</p>:null}
          </div>
        </div>
      </article>;
    }):<div className="empty"><h2>Your collection is up to date</h2><p>{preview?.matchedRecords} records checked against your confirmed tracker.</p></div>}
    {groups.size>visibleLimit?<button disabled={busy} onClick={()=>setVisibleLimit(n=>n+100)}>Show more items</button>:null}
    {saveError?<p role="alert" className="error">{saveError}</p>:null}
    {manualMessage?<p role="status">{manualMessage}</p>:null}
    {preview?.activeRun?<p role="status">A previous sync needs confirmation. Resume that saved sync before making new choices; already confirmed steps will not repeat.</p>:null}
    {preview?.comparisonMode!=="three-way"&&ready?<details><summary>Initial tracker setup</summary><button disabled={busy||!preview.canSaveDecisions} onClick={()=>void saveInitialReview()}>Keep app values for initial review</button><button disabled={busy} onClick={()=>void saveInitialReview(true)}>Clear initial approval</button><button disabled={busy} onClick={()=>void checkExecution()}>Check initial plan</button>{preparation?<button disabled={busy||preparation.checkpointSaved} onClick={()=>void saveExecutionCheckpoint()}>Save initial plan</button>:null}</details>:null}
    {selectedCount||preview?.activeRun||manual?.resume?<footer><div><b>{selectedCount} item{selectedCount===1?"":"s"} ready</b><p>Unresolved and skipped items stay for review.</p></div><button className="primary" disabled={busy||!ready||preview?.comparisonMode!=="three-way"} onClick={()=>void applySelected()}>{batchApplying?"Checking confirmation…":preparing?"Checking selected items…":preview?.activeRun||manual?.resume?"Resume Saved Sync":`Apply ${selectedCount} Item${selectedCount===1?"":"s"}`}</button></footer>:null}
    </div>
    <style jsx>{`
      .backupHistory{margin:18px 0}.backupHistory>summary{text-align:right;color:#2684ef}.reviewHeading{font-size:18px;margin:18px 0 14px}.quickActions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.quickActions .choices{margin:0}.comparisonBody{margin-top:16px}.comparisonBody[hidden]{display:none}.reviewHint{margin-top:8px}.reviewLink{border:0;background:transparent;color:#3492ff;padding:4px 6px;min-height:32px}.mediaCard .artwork{width:76px;flex-basis:76px;min-height:104px}.mediaCard .artwork img{max-height:116px}.mediaCard{padding:16px;gap:18px}.recordHeader{margin-bottom:10px}h2{font-size:19px}:global(.trackerSync button.valueChoice){min-height:54px!important}:global(.trackerSync .selectionHint){display:none!important}@media(max-width:980px){.quickActions,.comparisonBody,.reviewHint{grid-column:1/-1}.quickActions button{flex:1}.quickActions .choices{display:contents}.mediaCard .artwork{width:64px;min-height:90px}.recordHeader{min-height:90px}}
      .applyBlockers{grid-column:1/-1;margin-top:14px;padding:12px 14px;border:1px solid #e59b3e55;border-radius:12px;background:#e59b3e0d;font-size:13px;line-height:1.5}.applyBlockers ul{padding-left:18px;margin:6px 0}.applyBlockers button{min-height:44px;margin-top:6px}
      .itemChoices{grid-column:1/-1;margin-bottom:12px}.itemChoices p{font-size:13px;color:var(--muted)}
      :global(.trackerSync button.valueChoice){display:flex;flex-direction:column;align-items:flex-start;text-align:left;width:100%;min-height:90px;padding:10px 12px;border-radius:10px;font:inherit;line-height:1.5;color:var(--text);border:1px solid var(--line);background:#8391a00a;cursor:pointer;white-space:pre-wrap;overflow-wrap:anywhere;min-width:0}
      :global(.trackerSync button.valueChoice.selected){border:2px solid #3492ff;background:#3492ff17;box-shadow:0 0 0 1px #3492ff20}
      :global(.trackerSync button.valueChoice:focus-visible){outline:3px solid #3492ff;outline-offset:3px}
      :global(.trackerSync .sourceLabel){display:block;font-size:11px;color:var(--muted);font-weight:600}
      :global(.trackerSync .selectionHint){display:block;font-size:11px;color:var(--muted);margin-top:8px}
      :global(.trackerSync .selected .selectionHint){color:#2684ef;font-weight:650}
      .newItemSummary{grid-column:1/-1}.rowActions{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:10px;grid-column:1/-1;margin-top:18px}.rowActions button{min-height:44px}
      .trackerSync{--bg:#f1f2f4;--surface:rgba(255,255,255,.88);--text:#202a39;--muted:#748094;--line:rgba(145,160,182,.22);background:var(--bg);color:var(--text);min-height:100%;padding:26px 28px 110px;font-family:inherit}
      .dark{--bg:#171b22;--surface:#232a34;--text:#f2f5fa;--muted:#abb5c5;--line:rgba(220,230,245,.16)}
      header{display:flex;gap:14px;align-items:center;margin-bottom:24px}.heading{flex:1}h1{font-size:28px;margin:0;font-weight:750}h2{font-size:22px;margin:0;letter-spacing:-.025em}p{font-size:13px;color:var(--muted);line-height:1.5;margin:6px 0}small{font-size:12px;color:var(--muted);display:block;line-height:1.5}.syncIcon{width:72px;height:72px;object-fit:contain;flex:0 0 72px;align-self:center}.heading h1{line-height:1.2}.heading p{margin-top:2px}
      button{font:600 13px inherit;font-family:inherit;font-size:13px;font-weight:600;border:1px solid var(--line);border-radius:11px;min-height:44px;padding:10px 17px;background:var(--surface);color:var(--text);cursor:pointer}button:disabled{opacity:.45;cursor:not-allowed}button:focus-visible,summary:focus-visible{outline:2px solid #3492ff;outline-offset:3px}.primary{background:linear-gradient(#579fff,#3188ee);color:white;border-color:#4495f7;box-shadow:0 3px 8px #3492ff20}.syncNow{min-width:180px}
      .stats{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:18px;background:var(--surface);border:1px solid var(--line);border-radius:19px;padding:20px 24px;box-shadow:0 3px 10px #1a294506}.stats>div{display:flex;align-items:center;gap:14px}.stats>div>span{font-size:28px;color:var(--muted)}.stats b{font-size:16px}.protection{font-size:12px;margin:12px 2px 22px}
      .tabs{display:flex;border:1px solid var(--line);border-radius:12px;padding:3px;gap:4px;max-width:720px;margin-bottom:20px}.tabs button{flex:1;background:transparent;border-color:transparent;color:var(--muted)}button[aria-pressed=true]{background:#3492ff10;border-color:#3492ff60;color:#2684ef}.mediaCard{display:flex;gap:24px;background:var(--surface);border:1px solid var(--line);border-radius:20px;padding:22px;margin-bottom:18px;box-shadow:0 3px 10px #1a294507}.artwork{width:116px;flex:0 0 116px;align-self:flex-start;min-height:150px;border-radius:7px;background:#8391a015;display:grid;place-items:center;overflow:hidden}.artwork img{width:100%;height:auto;max-height:180px;object-fit:contain;display:block;box-shadow:0 6px 16px #0003}.artwork span{font-size:36px}.record{min-width:0;flex:1}.recordHeader{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:16px}.media{font-weight:600}.game{color:#3492ff}.book{color:#5ca65a}.movie{color:#a168d6}.tv{color:#e98e30}.badge{font-size:12px;white-space:nowrap;border-radius:30px;padding:7px 12px;background:#3492ff12;color:#2684ef}.badge.amber{background:#ee98251a;color:#b66b16}.comparisonHead,.field{display:grid;grid-template-columns:minmax(110px,1fr) minmax(0,1fr) minmax(0,1fr);gap:10px}.comparisonHead{font-size:12px;color:var(--muted);padding:8px 10px;background:#8391a009;border-radius:9px}.field{padding:10px 0;border-bottom:1px solid var(--line);font-size:13px;align-items:start}.fieldLabel{font-weight:550;padding:7px 0;overflow-wrap:anywhere}.value{padding:7px 10px;border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;background:#8391a00a}.value small{display:none}.difference{background:#ee982514}.selected{background:#3492ff17;box-shadow:inset 0 0 0 1px #3492ff30}.fieldActions{grid-column:1/-1}.choices{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px}.fieldActions p{font-size:12px}.allFields{margin-top:10px}summary{cursor:pointer;min-height:44px;align-content:center;color:var(--muted);font-size:13px}dl{font-size:13px}dd{margin:3px 0 12px;white-space:pre-wrap;overflow-wrap:anywhere}.empty{padding:40px 24px;background:var(--surface);border:1px solid var(--line);border-radius:18px;margin-bottom:20px}.error{color:#c65d33}
      footer{position:sticky;bottom:0;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:16px 20px;background:var(--surface);backdrop-filter:blur(18px);border:1px solid var(--line);border-radius:16px;margin-top:24px;z-index:2}footer b{font-size:13px}footer p{font-size:12px}
      @media(max-width:980px){.trackerSync{padding:18px 14px 120px}header{flex-wrap:wrap;gap:10px;margin-bottom:18px}h1{font-size:25px}.heading p{font-size:12px}.syncIcon{width:64px;height:64px;flex-basis:64px}.heading h1{line-height:1.2}.syncNow{width:100%;min-height:48px;order:5}.stats{grid-template-columns:1fr 1fr;gap:16px;padding:16px}.stats>div:first-child{grid-column:1/-1}.stats b{font-size:14px}.stats small{font-size:11px}.tabs{gap:0}.tabs button{padding:8px 6px;font-size:12px}.mediaCard{padding:16px;gap:12px;display:grid;grid-template-columns:64px minmax(0,1fr)}.artwork{width:64px;min-height:90px;grid-column:1;grid-row:1}.artwork img{max-height:100px}.record{display:contents}.recordHeader{grid-column:2;align-items:flex-start;flex-direction:column;min-height:90px;margin:0}h2{font-size:19px}.comparisonHead,.field,.allFields{grid-column:1/-1}.record>.comparisonHead{display:none}.field{grid-template-columns:1fr 1fr}.fieldLabel{grid-column:1/-1;padding:0}.value small{display:block;margin-bottom:3px;font-size:10px}.fieldActions{grid-column:1/-1}.allFields .comparisonHead{display:none}.choices button{flex:1;min-height:44px}.badge{font-size:11px;padding:5px 9px}.empty{padding:28px 18px}footer{bottom:92px;flex-direction:column;align-items:stretch;padding:12px;margin-top:18px}footer button{width:100%;min-height:48px}footer p{margin:3px 0 0}}
      @media(min-width:1100px){.record{display:grid;grid-template-columns:minmax(220px,1fr) auto;align-items:center;gap:0 16px}.recordHeader{grid-column:1;display:block;margin:0}.recordHeader .badge{display:inline-block;margin-top:4px}.quickActions{grid-column:2;justify-content:flex-end}.comparisonBody,.reviewHint{grid-column:1/-1}.mediaCard{align-items:center}}
      .trackerSync{position:fixed;inset:0;margin:auto;width:min(780px,calc(100vw - 48px));max-width:none;height:fit-content;min-height:0;max-height:calc(100dvh - 64px);overflow:auto;overscroll-behavior:contain;padding:24px 32px 32px;border:1px solid var(--line);border-radius:28px;box-shadow:0 28px 100px #0004;box-sizing:border-box}
      /* Native ::backdrop styles live in globals.css to preserve blur during compilation. */
      [hidden]{display:none!important}.panelNavigation{display:flex;justify-content:space-between;margin-bottom:22px;position:sticky;top:-24px;z-index:3;background:var(--bg);padding:8px 0}.panelNavigation button{width:44px;height:44px;padding:0;border-radius:50%;font-size:28px;font-weight:400}
      header{margin-bottom:24px}h1{font-size:32px;letter-spacing:-.03em;outline:none}.heading p{font-size:15px;margin-top:8px}.syncNow{width:100%;min-height:50px;font-size:16px;border-radius:14px}.lastSynced{margin:12px 0 24px;font-size:13px}
      .menuGroup{background:var(--surface);border-radius:22px;overflow:hidden;margin:28px 0 20px}.menuGroup button{display:flex;align-items:center;gap:18px;width:100%;text-align:left;border:0;border-radius:0;background:transparent;padding:20px;min-height:88px;font-size:16px;font-weight:600}.menuGroup button+button{border-top:1px solid var(--line)}.menuGroup button>span:nth-child(2){flex:1}.menuGroup small{margin-top:4px;font-size:13px;font-weight:400}.menuGroup button>span:last-child{font-size:25px;color:var(--muted)}.menuGroup button:hover{background:#3492ff08}
      .stats{grid-template-columns:1fr;box-shadow:none}.mediaCard{padding:18px;gap:16px;align-items:flex-start}.record{display:block}.recordHeader{display:flex;align-items:flex-start}.artwork,.mediaCard .artwork{width:64px;flex-basis:64px;min-height:88px}.quickActions{justify-content:flex-start}.mediaCard h2{font-size:18px}.comparisonBody{margin-top:20px}footer{bottom:-16px}.reviewHeading{font-size:16px;font-weight:500}
      @media(max-width:980px){.record{display:contents}.quickActions,.comparisonBody,.reviewHint{grid-column:1/-1}.quickActions{display:grid;grid-template-columns:1fr 1fr}.quickActions>.primary{grid-column:1/-1}}
      @media(max-width:600px){.trackerSync{width:calc(100vw - 16px);max-height:calc(100dvh - 16px);padding:16px 18px calc(22px + env(safe-area-inset-bottom));border-radius:24px}.panelNavigation{margin-bottom:20px;top:-16px}header{flex-wrap:nowrap}.heading p{font-size:14px}h1{font-size:28px}.syncNow{width:100%}.stats{grid-template-columns:1fr}.menuGroup button{padding:16px;gap:14px}.mediaCard{padding:14px}.recordHeader{display:block}footer{bottom:-8px}}
    `}</style>
  </dialog>,document.body);
}
