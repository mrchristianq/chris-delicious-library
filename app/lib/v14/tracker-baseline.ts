import {createHash} from "node:crypto";
import {projectRetainedTrackerRow} from "./tracker-projection";
import {trackerRowIdentity} from "./tracker-write-plan";
import {trackerFieldValue,isTrackerCellError} from "./tracker-reconcile";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";
import {isExcludedTrackerField} from "./tracker-read";
import type {TrackerValue} from "./tracker-preview";

/** Full initial baseline, built ONLY when every retained field agrees with a
 * fresh tracker read. Not inferred from successful write receipts or ratings. */
export function buildInitialTrackerBaseline(items:SnapshotItem[],tables:TrackerTable[]){
  const names={game:"Games",tv:"Shows",book:"Books",movie:"Movies"} as const;
  if(tables.length!==4||new Set(tables.map(t=>t.name)).size!==4||new Set(items.map(i=>i.id)).size!==items.length)throw new Error("Incomplete baseline input");
  // Per-read index only: no cached values or weaker freshness checks. Avoid
  // scanning every large tracker row again for each of thousands of items.
  const indexes=new Map(tables.map(table=>{
    if(table.headers.some(h=>!h||h!==h.trim()||isExcludedTrackerField(h))||new Set(table.headers).size!==table.headers.length)throw new Error("Unsafe baseline columns");
    const index=new Map<string,Array<{cells:string[];index:number}>>();
    table.rows.forEach((cells,n)=>{const key=trackerRowIdentity(table,cells);const group=index.get(key)??[];group.push({cells,index:n});index.set(key,group);});
    return [table.name,index] as const;
  }));
  const used=new Set<string>(),records=[];
  for(const item of items){
    const table=tables.find(t=>t.name===names[item.media_type]);
    if(!table||table.headers.some(h=>!h||isExcludedTrackerField(h))||new Set(table.headers).size!==table.headers.length)throw new Error("Unsafe baseline columns");
    const row=projectRetainedTrackerRow(item,table.headers);
    const identity=trackerRowIdentity(table,table.headers.map(h=>row[h]??""));
    const candidates=indexes.get(table.name)!.get(identity)??[];
    if(candidates.length!==1)throw new Error("Baseline identity must match exactly once");
    const slot=JSON.stringify([table.name,candidates[0].index]);if(used.has(slot))throw new Error("Baseline destination reused");used.add(slot);
    const fields:Record<string,TrackerValue>={};
    for(const header of table.headers.filter(h=>!["Cover","Poster"].includes(h))){
      if(!Object.hasOwn(row,header))throw new Error("Unmapped baseline column");
      const app=trackerFieldValue(header,row[header]),tracker=trackerFieldValue(header,candidates[0].cells[table.headers.indexOf(header)]??"");
      if(isTrackerCellError(app)||isTrackerCellError(tracker)||!Object.is(app,tracker))throw new Error("Baseline values are not independently confirmed");
      fields[header]=app;
    }
    records.push({itemId:item.id,revision:item.revision,fields});
  }
  const titledRows=tables.reduce((count,t)=>count+t.rows.filter(c=>String(c[t.headers.indexOf("Title")]??"").trim()).length,0);
  if(titledRows!==records.length)throw new Error("Unmatched tracker rows cannot enter a baseline");
  records.sort((a,b)=>a.itemId.localeCompare(b.itemId));
  return {records,fingerprint:createHash("sha256").update(JSON.stringify(records)).digest("hex"),columns:Object.fromEntries(tables.map(t=>[t.name,t.headers.filter(h=>!["Cover","Poster"].includes(h))]))};
}

/** Only explicitly selected identities are confirmed. Other pending rows and
 * their prior baselines are never included in this confirmation. */
export function buildSelectedTrackerBaseline(items:SnapshotItem[],tables:TrackerTable[],ids:string[]){
 const selected=items.filter(i=>ids.includes(i.id));
 if(selected.length!==ids.length||new Set(ids).size!==ids.length)throw new Error("Selected confirmation membership changed");
 const tabs={game:"Games",book:"Books",movie:"Movies",tv:"Shows"};
 const filtered=tables.map(t=>{const identities=selected.filter(i=>tabs[i.media_type]===t.name).map(i=>{const p=projectRetainedTrackerRow(i,t.headers);return trackerRowIdentity(t,t.headers.map(h=>p[h]??""));});return {...t,rows:t.rows.filter(r=>identities.includes(trackerRowIdentity(t,r)))};});
 return buildInitialTrackerBaseline(selected,filtered);
}
