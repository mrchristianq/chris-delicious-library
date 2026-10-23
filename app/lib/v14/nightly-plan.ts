import {randomUUID} from 'node:crypto';
import {previewTrackerThreeWay} from './tracker-three-way';
import {compileTrackerMixedPlan,mixedHash,mixedRunId,type TrackerMixedPlan} from './tracker-mixed-plan';
import {compileTrackerWriteSteps} from './tracker-write-plan';
import type {LibrarySnapshot} from './library-snapshot';
import type {TrackerTable} from './tracker-read';
import type {TrackerBaselineState} from './tracker-baseline-read';

/** Nightly is NOT approval of a saved manual conflict choice. It considers the
 * raw three-way comparison and skips the entire item if any field is ambiguous.
 * Unmatched Sheet entries need metadata/edition review in the normal Sync UI. */
export function compileNightlyPlan(snapshot:LibrarySnapshot,tables:TrackerTable[],baseline:TrackerBaselineState,context:{stamp:string;metadataStamp:string},observedAt:string){
 const preview=previewTrackerThreeWay(snapshot.items,tables,baseline,observedAt);
 const groups=new Map<string,typeof preview.changes>();
 for(const row of preview.changes)groups.set(row.itemId,[...(groups.get(row.itemId)??[]),row]);
 const selected:string[]=[],additions:ReturnType<typeof compileTrackerWriteSteps>=[];
 for(const [id,rows] of groups){
  if(selected.length>=100)break;
  if(rows.every(r=>r.direction==='import'||r.direction==='export')){
   try{compileTrackerMixedPlan(snapshot.items,tables,[],baseline,context,observedAt,[id]);selected.push(id);}catch{/* unsupported imports require review */}
   continue;
  }
  if(rows.length===1&&rows[0].plannedAction==='add-record'){
   try{
    // Existing compiler independently proves unique title/provider/edition,
    // all retained columns and complete fields. Never consolidates duplicates.
    const item=snapshot.items.find(i=>i.id===id);if(!item)continue;
    const step=compileTrackerWriteSteps([{id:rows[0].id,itemId:id,media:item.media_type,field:rows[0].field,kind:'add-record',value:rows[0].app,comparisonToken:mixedHash(rows[0])}],snapshot.items,tables,[]);
    if(step.length===1){selected.push(id);additions.push(step[0]);}
   }catch{/* identity or incomplete metadata remains review-only */}
  }
 }
 const ordinary=selected.filter(id=>!additions.some(s=>s.itemId===id));
 let plan:TrackerMixedPlan|null=null;
 if(selected.length){
  // Empty explicit selection compiles no unresolved item, unlike an omitted
  // selection, which intentionally requires a fully resolved manual preview.
  const base=compileTrackerMixedPlan(snapshot.items,tables,[],baseline,context,observedAt,ordinary);
  const {fingerprint:_fingerprint,runId:_runId,...body}=base;void _fingerprint;void _runId;
  const next={...body,exports:[...base.exports,...additions].sort((a,b)=>a.itemId.localeCompare(b.itemId)),selection:{keys:selected.slice().sort(),itemIds:selected.slice().sort()}};
  const fingerprint=mixedHash(next);plan={...next,fingerprint,runId:mixedRunId(fingerprint)};
 }
 return {plan,selected,heldItems:[...groups.keys()].filter(id=>!selected.includes(id)),matchedRecords:preview.matchedRecords??0,requestId:randomUUID()};
}
