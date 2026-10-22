import {createHash} from "node:crypto";
import {projectRetainedTrackerRow} from "./tracker-projection";
import {trackerFieldValue,isTrackerCellError} from "./tracker-reconcile";
import {TRACKER_ID,isExcludedTrackerField} from "./tracker-read";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";
import type {TrackerProvenance} from "./tracker-provenance";
import type {TrackerExecutionOperation} from "./tracker-execution-plan";
import type {TrackerValue} from "./tracker-preview";

const norm=(v:unknown)=>String(v??"").normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");
const key=(title:unknown,edition:unknown,provider:unknown)=>JSON.stringify([norm(title),norm(edition),norm(provider)]);
const tabs={game:"Games",tv:"Shows",book:"Books",movie:"Movies"} as const;
const hash=(value:unknown)=>createHash("sha256").update(JSON.stringify(value)).digest("hex");
export type TrackerWriteStep={
  id:string;fingerprint:string;itemId:string;itemRevision:number;tab:string;
  sourceFingerprint:string;operationIds:string[];
  kind:"fields"|"duplicate-cleanup"|"add-record";
  // Identity sets are stable semantic values, NOT remembered row addresses.
  identities:string[];desiredIdentity:string;expectedRows:number;
  before:Record<string,TrackerValue>;after:Record<string,TrackerValue>;beforeRows:string[];
};
export function trackerRowIdentity(table:TrackerTable,cells:string[]){
  const type=Object.entries(tabs).find(([,name])=>name===table.name)?.[0];
  if(!type)throw new Error("Invalid tracker tab");
  const row=Object.fromEntries(table.headers.map((h,i)=>[h,cells[i]??""]));
  return key(row.Title,type==="game"?row.Platform:type==="book"?row.Type:"",row[type==="game"?"IGDB_ID":type==="book"?"isbn":"TMDB_ID"]);
}
export function compileTrackerWriteSteps(operations:TrackerExecutionOperation[],items:SnapshotItem[],tables:TrackerTable[],hints:TrackerProvenance[]):TrackerWriteStep[]{
  if(operations.length>500||new Set(operations.map(o=>o.id)).size!==operations.length||new Set(items.map(i=>i.id)).size!==items.length||new Set(tables.map(t=>t.name)).size!==tables.length)throw new Error("Duplicate or oversized execution input");
  const grouped=new Map<string,TrackerExecutionOperation[]>();
  for(const op of operations)grouped.set(op.itemId,[...(grouped.get(op.itemId)??[]),op]);
  const claimed=new Set<string>(),steps:TrackerWriteStep[]=[];
  for(const [itemId,ops] of grouped){
    const item=items.find(i=>i.id===itemId);if(!item||ops.some(o=>o.media!==item.media_type))throw new Error("Missing execution item");
    const table=tables.find(t=>t.name===tabs[item.media_type]);
    if(!table||new Set(table.headers).size!==table.headers.length||table.headers.some(h=>!h||isExcludedTrackerField(h)))throw new Error("Unsafe execution columns");
    const projection=projectRetainedTrackerRow(item,table.headers);
    const edition=item.media_type==="game"?"Platform":item.media_type==="book"?"Type":"";
    const provider=item.media_type==="game"?"IGDB_ID":item.media_type==="book"?"isbn":"TMDB_ID";
    if(!["Title",provider,...(edition?[edition]:[])].every(h=>table.headers.includes(h)))throw new Error("Missing identity column");
    const desiredIdentity=key(projection.Title,edition?projection[edition]:"",projection[provider]);
    const sources=hints.filter(h=>h.itemId===itemId&&h.media===item.media_type);
    const identities=[...new Set([desiredIdentity,...sources.map(h=>key(h.title,h.edition,h.provider))])].sort();
    if(hints.some(h=>h.itemId!==itemId&&h.media===item.media_type&&identities.includes(key(h.title,h.edition,h.provider))))throw new Error("Shared historical identity");
    const targets=table.rows.map((cells,index)=>({cells,index})).filter(r=>identities.includes(trackerRowIdentity(table,r.cells)));
    for(const target of targets){const location=JSON.stringify([table.name,target.index]);if(claimed.has(location))throw new Error("Shared execution destination");claimed.add(location);}
    const kinds=ops.map(o=>o.kind),addition=kinds.includes("add-record"),cleanup=kinds.includes("duplicate-cleanup");
    if(ops.some(o=>o.kind==="import-field"))throw new Error("Import adapter must be verified before executing tracker-side choices");
    if(addition&&(ops.length!==1||targets.length!==0||!norm(projection.Title)||(edition&&!norm(projection[edition]))||item.media_type==="book"&&!["physical","audiobook","ebook"].includes(norm(projection.Type))||table.rows.some(c=>{
      const r=Object.fromEntries(table.headers.map((h,i)=>[h,c[i]??""]));
      // Different editions of the same game remain independent records.
      const distinctGameEdition=item.media_type==="game"&&norm(r.Title)===norm(projection.Title)&&norm(r[provider])===norm(projection[provider])&&norm(r.Platform)&&norm(projection.Platform)&&norm(r.Platform)!==norm(projection.Platform);
      return !distinctGameEdition&&(norm(r.Title)===norm(projection.Title)||!!norm(projection[provider])&&norm(r[provider])===norm(projection[provider]));
    })))throw new Error("Addition identity requires review");
    if(cleanup&&(ops.length!==1||targets.length<2||targets.length>sources.length))throw new Error("Consolidation identity requires review");
    if(!addition&&!cleanup&&targets.length!==1)throw new Error("Field destination requires unique identity");
    const before:Record<string,TrackerValue>={},after:Record<string,TrackerValue>={};
    const set=(header:string)=>{
      if(!table.headers.includes(header)||["Cover","Poster"].includes(header)||!Object.hasOwn(projection,header)||isExcludedTrackerField(header))throw new Error("Unmapped write column");
      const value=trackerFieldValue(header,projection[header]);
      if(isTrackerCellError(value))throw new Error("Invalid app value");
      after[header]=value;
      if(targets.length===1)before[header]=trackerFieldValue(header,targets[0].cells[table.headers.indexOf(header)]??"");
    };
    if(addition||cleanup)table.headers.filter(h=>!["Cover","Poster"].includes(h)).forEach(set);
    else for(const op of ops){
      if(op.kind==="provider-correction"){
        for(const header of ["Title",provider,...(edition?[edition]:[])])set(header);
      }else if(op.kind==="export-field"||op.kind==="repair-field"){
        set(op.field);if(!Object.is(after[op.field],op.value))throw new Error("Approved app field changed");
      }else throw new Error("Unsupported execution operation");
    }
    // Bind every retained projected source value + revision, not just a status
    // summary. Notes and progress never enter the plan or its source digest.
    const source=Object.fromEntries(table.headers.filter(h=>!["Cover","Poster"].includes(h)).map(h=>{
      if(!Object.hasOwn(projection,h))throw new Error("Unmapped retained source column");return [h,trackerFieldValue(h,projection[h])];
    }));
    const beforeRows=targets.map(t=>hash(Object.fromEntries(table.headers.filter(h=>!["Cover","Poster"].includes(h)).map(h=>[h,trackerFieldValue(h,t.cells[table.headers.indexOf(h)]??"")])))).sort();
    const body={id:itemId,itemId,itemRevision:item.revision,tab:table.name,sourceFingerprint:hash(source),operationIds:ops.map(o=>o.id).sort(),kind:addition?"add-record" as const:cleanup?"duplicate-cleanup" as const:"fields" as const,identities,desiredIdentity,expectedRows:targets.length,before,after,beforeRows};
    steps.push({...body,fingerprint:hash([TRACKER_ID,body])});
  }
  return steps.sort((a,b)=>a.id.localeCompare(b.id));
}

/** Fresh resolver used before dispatch and readback. It accepts row moves but
 * not new duplicates, changed source revisions or third-party field changes. */
export function inspectTrackerWriteStep(step:TrackerWriteStep,item:SnapshotItem,table:TrackerTable){
  const {fingerprint,...body}=step;
  if(hash([TRACKER_ID,body])!==fingerprint)throw new Error("Write step integrity mismatch");
  if(item.id!==step.itemId||item.revision!==step.itemRevision||table.name!==step.tab||table.headers.some(isExcludedTrackerField))return {state:"conflict" as const,rows:[] as number[]};
  const projection=projectRetainedTrackerRow(item,table.headers);
  const source=Object.fromEntries(table.headers.filter(h=>!["Cover","Poster"].includes(h)).map(h=>[h,Object.hasOwn(projection,h)?trackerFieldValue(h,projection[h]):null]));
  if(hash(source)!==step.sourceFingerprint)return {state:"conflict" as const,rows:[] as number[]};
  const targets=table.rows.map((cells,index)=>({cells,index})).filter(r=>step.identities.includes(trackerRowIdentity(table,r.cells)));
  const matches=(values:Record<string,TrackerValue>,target:typeof targets[number])=>Object.entries(values).every(([h,v])=>table.headers.includes(h)&&Object.is(v,trackerFieldValue(h,target.cells[table.headers.indexOf(h)]??"")));
  const after=targets.length===1&&trackerRowIdentity(table,targets[0].cells)===step.desiredIdentity&&matches(step.after,targets[0]);
  if(after)return {state:"after" as const,rows:[targets[0].index+2]};
  const rowHashes=targets.map(t=>hash(Object.fromEntries(table.headers.filter(h=>!["Cover","Poster"].includes(h)).map(h=>[h,trackerFieldValue(h,t.cells[table.headers.indexOf(h)]??"")])))).sort();
  const before=step.kind==="add-record"?targets.length===0:step.kind==="duplicate-cleanup"?targets.length===step.expectedRows&&JSON.stringify(rowHashes)===JSON.stringify(step.beforeRows):targets.length===1&&matches(step.before,targets[0]);
  return {state:before?"before" as const:"conflict" as const,rows:targets.map(t=>t.index+2)};
}
