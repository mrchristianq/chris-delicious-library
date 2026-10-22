import {initialTrackerReview as unmatchedReview,trackerFieldValue,isTrackerCellError} from "./tracker-reconcile";
import {projectLegacyRow} from "./legacy-row";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerProvenance} from "./tracker-provenance";
import type {TrackerTable} from "./tracker-read";
import type {TrackerChange,TrackerPreview} from "./tracker-preview";
const types={Games:"game",Shows:"tv",Books:"book",Movies:"movie"} as const;
const norm=(v:unknown)=>String(v??"").normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");
const identity=(title:unknown,edition:unknown,provider:unknown)=>JSON.stringify([norm(title),norm(edition),norm(provider)]);

/** Import history establishes identity only. All comparisons below use CURRENT
 * app/Sheet fields. No source row number or historical field value is restored. */
export function initialTrackerReview(items:SnapshotItem[],tables:TrackerTable[],observedAt:string,hints:TrackerProvenance[]):TrackerPreview {
  const byId=new Map(items.map(item=>[item.id,item]));
  if(hints.some(h=>byId.get(h.itemId)?.media_type!==h.media))throw new Error("Import mapping changed during read");
  const consumedItems=new Set<string>(),changes:TrackerChange[]=[],remainingTables:TrackerTable[]=[];
  let matched=0,issues=0;
  const plan=(item:SnapshotItem,kind:NonNullable<TrackerChange["plannedAction"]>,app:string,tracker:string,reason:string)=>{
    changes.push({id:JSON.stringify([item.id,kind]),itemId:item.id,title:item.title,media:item.media_type,field:kind,label:kind==="duplicate-cleanup"?"Previously approved consolidation":kind==="provider-correction"?"Imported identity correction":"App-only record",app,tracker,direction:"review",resolutionAllowed:false,plannedAction:kind,reason});
  };
  for(const table of tables){
    const type=types[table.name as keyof typeof types];if(!type)throw new Error("Invalid tracker tab");
    if(table.headers.some(h=>/notes|episode.?progress|watched_at/i.test(h)))throw new Error("Excluded tracker field");
    const provider=type==="game"?"IGDB_ID":type==="book"?"isbn":"TMDB_ID";
    const edition=type==="game"?"Platform":type==="book"?"Type":"";
    const rows=table.rows.map((cells,index)=>({cells,index,row:Object.fromEntries(table.headers.map((h,i)=>[h,cells[i]??""]))}));
    const rowIndex=new Map<string,typeof rows>();
    for(const entry of rows){
      const key=identity(entry.row.Title,edition?entry.row[edition]:"",entry.row[provider]);
      rowIndex.set(key,[...(rowIndex.get(key)??[]),entry]);
    }
    const sourceGroups=new Map<string,TrackerProvenance[]>();
    for(const hint of hints.filter(h=>h.media===type)){
      const key=identity(hint.title,hint.edition,hint.provider);
      sourceGroups.set(key,[...(sourceGroups.get(key)??[]),hint]);
    }
    const mapped=new Map<string,typeof rows>();
    for(const [key,sources] of sourceGroups){
      const candidates=rowIndex.get(key)??[];
      if(new Set(sources.map(s=>s.itemId)).size!==1||!candidates.length||candidates.length>sources.length)continue;
      const itemId=sources[0].itemId;mapped.set(itemId,[...(mapped.get(itemId)??[]),...candidates]);
    }
    const consumedRows=new Set<number>();
    for(const [itemId,targets] of mapped){
      const item=byId.get(itemId)!;consumedItems.add(itemId);targets.forEach(t=>consumedRows.add(t.index));matched++;
      const current=projectLegacyRow(item,item.library_id).row;
      if(targets.length>1){
        plan(item,"duplicate-cleanup","Keep canonical app record; status: "+(item.user_status??"Not set"),targets.length+" tracker rows ("+targets.map(t=>t.index+2).join(", ")+")","These source records were already consolidated during the approved import. Plan one canonical tracker record; no duplicate field values are imported and no rows have been removed. Execution must revalidate fresh identities.");
        continue;
      }
      const target=targets[0].row;
      const corrected=[provider,"Title",edition].filter(h=>h&&norm(current[h])!==norm(target[h]));
      if(corrected.length)plan(item,"provider-correction",corrected.map(h=>h+": "+current[h]).join("; "),corrected.map(h=>h+": "+target[h]).join("; "),"Historical source identity maps to this app UUID. Preserve the identity correction already made in the app; this tracker correction is planned, not applied.");
      for(const header of table.headers){
        if(!header||["Cover","Poster"].includes(header)||corrected.includes(header))continue;
        if(!Object.hasOwn(current,header)){
          issues++;changes.push({id:JSON.stringify([itemId,"unmapped",header]),itemId,title:item.title,media:type,field:"identity",label:"Record identity",app:"Unmapped retained field",tracker:header,direction:"review",resolutionAllowed:false,reason:"Retained column requires explicit mapping; no inferred clears."});continue;
        }
        const app=trackerFieldValue(header,current[header]),tracker=trackerFieldValue(header,target[header]??"");
        const invalid=isTrackerCellError(app)||isTrackerCellError(tracker);
        if(!Object.is(app,tracker)||invalid)changes.push({id:JSON.stringify([itemId,header]),itemId,title:item.title,media:type,field:header,label:header,app,tracker,direction:"review",resolutionAllowed:!invalid,...(invalid?{blockedField:true}:{}),reason:invalid?"Spreadsheet error value held for repair. No field choice can import this error.":"Initial reconciliation: no confirmed sync baseline. Choose explicitly; existing app values are unchanged."});
      }
    }
    // A genuinely app-only record is an addition candidate, never a deletion.
    for(const item of items.filter(i=>i.media_type===type&&!consumedItems.has(i.id))){
      const current=projectLegacyRow(item,item.library_id).row;
      const exists=rows.some(e=>identity(e.row.Title,edition?e.row[edition]:"",e.row[provider])===identity(current.Title,edition?current[edition]:"",current[provider]));
      if(!exists&&norm(current[provider])&&!rows.some(e=>norm(e.row[provider])===norm(current[provider]))&&!rows.some(e=>norm(e.row.Title)===norm(current.Title))){
        consumedItems.add(item.id);plan(item,"add-record","Keep app record; status: "+(item.user_status??"Not set"),"Not in tracker","Candidate for reviewed addition to the new tracker. Missing tracker data is not permission to delete the app record. No row has been added.");
      }
    }
    remainingTables.push({...table,rows:rows.filter(e=>!consumedRows.has(e.index)).map(e=>e.cells),rowNumbers:rows.filter(e=>!consumedRows.has(e.index)).map(e=>table.rowNumbers?.[e.index]??e.index+2)});
  }
  const rest=unmatchedReview(items.filter(item=>!consumedItems.has(item.id)),remainingTables,observedAt);
  matched+=rest.matchedRecords??0;issues+=rest.identityIssues??0;
  const all=[...changes,...rest.changes];
  const dataIssues=all.filter(c=>c.blockedField).length;
  return {...rest,changes:all,matchedRecords:matched,identityIssues:issues,dataIssues,message:"Fresh tracker comparison: "+matched+" mapped records; "+issues+" unresolved identity/column issues; "+all.filter(c=>c.plannedAction).length+" planned identity/cleanup/addition actions; "+dataIssues+" invalid field(s) held for repair. No sync has been applied."};
}
