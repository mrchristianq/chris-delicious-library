import {TRACKER_ID} from "./tracker-read";
import {buildTrackerGoogleRequest} from "./tracker-google-request";
import type {TrackerGrid} from "./tracker-google-request";
import type {TrackerWriteStep} from "./tracker-write-plan";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";

/** Atomic first-pass batch. All original-position cell updates precede all
 * removals. Removals are globally descending within each tab, not merely per
 * record, so cleaning one record cannot shift another record's write address. */
export function buildTrackerGoogleBatch(steps:TrackerWriteStep[],items:SnapshotItem[],tables:TrackerTable[],grids:TrackerGrid[]){
  if(steps.length>500||new Set(steps.map(s=>s.id)).size!==steps.length)throw new Error("Invalid batch step identity");
  const appends=new Map<number,number>(),updates:Record<string,unknown>[]=[],deletes:Array<{sheetId:number;start:number;request:Record<string,unknown>}>=[];
  for(const step of steps){
    const item=items.find(i=>i.id===step.itemId),table=tables.find(t=>t.name===step.tab),grid=grids.find(g=>g.title===step.tab);
    if(!item||!table||!grid)throw new Error("Incomplete batch source");
    const batch=buildTrackerGoogleRequest(step,item,table,grid);
    let additionOffset=0;
    for(const raw of batch.requests){
      if("appendDimension" in raw){additionOffset=appends.get(grid.sheetId)??0;appends.set(grid.sheetId,additionOffset+1);}
      else if("updateCells" in raw){
        const request=structuredClone(raw) as {updateCells:{range:{startRowIndex:number;endRowIndex:number}}};
        if(step.kind==="add-record"){request.updateCells.range.startRowIndex+=additionOffset;request.updateCells.range.endRowIndex+=additionOffset;}
        updates.push(request);
      }else if("deleteDimension" in raw){
        const r=raw.deleteDimension as {range:{sheetId:number;startIndex:number}};deletes.push({sheetId:r.range.sheetId,start:r.range.startIndex,request:raw});
      }else throw new Error("Unsupported batch operation");
    }
  }
  const requests:Record<string,unknown>[]=[...appends].sort((a,b)=>a[0]-b[0]).map(([sheetId,length])=>({appendDimension:{sheetId,dimension:"ROWS",length}}));
  requests.push(...updates,...deletes.sort((a,b)=>a.sheetId-b.sheetId||b.start-a.start).map(d=>d.request));
  if(new Set(deletes.map(d=>`${d.sheetId}:${d.start}`)).size!==deletes.length||requests.length>1000||Buffer.byteLength(JSON.stringify(requests))>1800000)throw new Error("Batch exceeds safe bound or repeats a deletion");
  return {spreadsheetId:TRACKER_ID,requests};
}
