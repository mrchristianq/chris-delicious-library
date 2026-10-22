import {projectLegacyRow} from "./legacy-row";
import {reviewUnmatchedTrackerRows} from "./tracker-unmatched";
import {projectRetainedTrackerRow} from "./tracker-projection";
import {compareTracker} from "./tracker-preview";
import {trackerRowIdentity,compileTrackerWriteSteps} from "./tracker-write-plan";
import {trackerFieldValue,isTrackerCellError} from "./tracker-reconcile";
import {isExcludedTrackerField} from "./tracker-read";
import type {TrackerTable} from "./tracker-read";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerBaselineState} from "./tracker-baseline-read";
import type {TrackerChange,TrackerPreview,TrackerValue} from "./tracker-preview";
const tabs={game:"Games",tv:"Shows",book:"Books",movie:"Movies"} as const;
const normalized=(v:unknown)=>String(v??"").normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");

/** Resolve against CONFIRMED semantic identity, never remembered row position.
 * Identity edits/additions/removals are review-only. No writes or baseline updates. */
export function previewTrackerThreeWay(items:SnapshotItem[],tables:TrackerTable[],baseline:TrackerBaselineState,observedAt:string):TrackerPreview {
  if(items.some(i=>i.library_id!==baseline.libraryId)||new Set(items.map(i=>i.id)).size!==items.length||tables.length!==4||new Set(tables.map(t=>t.name)).size!==4)throw new Error("Incomplete three-way source");
  const changes:TrackerChange[]=[];let matched=0,identityIssues=0;
  const issue=(id:string,title:string,media:string,reason:string,identityReview?:TrackerChange["identityReview"])=>{identityIssues++;changes.push({id:JSON.stringify([id,"identity"]),itemId:id,title,media,field:"identity",label:"Record identity",app:"Review required",tracker:"Review required",direction:"review",resolutionAllowed:false,reason,...(identityReview?{identityReview}:{})});};
  for(const [media,name] of Object.entries(tabs)){
    const table=tables.find(t=>t.name===name);if(!table)throw new Error("Missing tracker table");
    const keys=baseline.columns[name],retained=table.headers.filter(h=>!["Cover","Poster"].includes(h));
    if(new Set(table.headers).size!==table.headers.length||table.headers.some(h=>!h||h!==h.trim()||isExcludedTrackerField(h))||retained.length!==keys.length||retained.some(h=>!keys.includes(h)))throw new Error("Approved tracker columns changed; mapping review required");
    const index=new Map<string,number[]>();
    table.rows.forEach((row,n)=>{if(!String(row[table.headers.indexOf("Title")]??"").trim())return;const key=trackerRowIdentity(table,row);index.set(key,[...(index.get(key)??[]),n]);});
    const records=baseline.records.filter(r=>r.media===media),baseKeys=new Map<string,number>();
    const identity=(fields:Record<string,TrackerValue>)=>trackerRowIdentity(table,table.headers.map(h=>String(fields[h]??"")));
    for(const record of records){const key=identity(record.fields);baseKeys.set(key,(baseKeys.get(key)??0)+1);}
    const usedRows=new Set<number>(),known=new Set(records.map(r=>r.itemId));
    const byId=new Map(items.filter(i=>i.media_type===media).map(i=>[i.id,i]));
    const provider=media==="game"?"IGDB_ID":media==="book"?"isbn":"TMDB_ID",edition=media==="game"?"Platform":media==="book"?"Type":null;
    const stableKey=(fields:Record<string,unknown>)=>JSON.stringify([normalized(fields[provider]),edition?normalized(fields[edition]):""]);
    const stableRows=(fields:Record<string,unknown>)=>table.rows.flatMap((cells,index)=>normalized(fields[provider])&&stableKey(Object.fromEntries(table.headers.map((h,i)=>[h,cells[i]??""])))===stableKey(fields)?[index]:[]);
    for(const record of records){
      const item=byId.get(record.itemId),key=identity(record.fields);let targets=index.get(key)??[];
      // A title-only rename may be proposed only against one unchanged stable
      // provider/edition. Never guess from title similarity or row position.
      if(!targets.length&&records.filter(r=>stableKey(r.fields)===stableKey(record.fields)).length===1)targets=stableRows(record.fields);
      if(!item||targets.length!==1||baseKeys.get(key)!==1){
        const reason=!item?"Previously synced record is absent from the active app. No deletion is inferred.":"Confirmed identity is missing or ambiguous in the tracker. Review identity changes before syncing.";
        issue(record.itemId,String(record.fields.Title??"Unknown"),media,reason,{
          kind:!item?"missing-app-record":"missing-tracker-record",tab:name,rows:targets.map(n=>n+2),
          identity:Object.fromEntries(["Title",provider,...(edition?[edition]:[])].map(k=>[k,String(record.fields[k]??"")])),candidates:[],
          guidance:!item?"Check whether this item was archived in the app. Restore it there if the removal was accidental; no tracker row will be deleted.":"Compare this last-confirmed identity with the current Sheet. Repair an accidental identity edit or restore a removed row, then refresh. No app item will be deleted or silently re-created."
        });continue;
      }
      const position=targets[0];if(usedRows.has(position))throw new Error("Reused tracker destination");usedRows.add(position);matched++;
      const projection=projectRetainedTrackerRow(item,keys),app:Record<string,TrackerValue>={},tracker:Record<string,TrackerValue>={};
      for(const field of keys){
        if(!Object.hasOwn(projection,field))throw new Error("Unmapped retained app field");
        app[field]=trackerFieldValue(field,projection[field]);tracker[field]=trackerFieldValue(field,table.rows[position][table.headers.indexOf(field)]??"");
      }
      const identityFields=["Title",provider,...(edition?[edition]:[])];
      const changedIdentity=identityFields.filter(f=>!Object.is(app[f],record.fields[f])||!Object.is(tracker[f],record.fields[f]));
      if(changedIdentity.length){
        const desired=identity(app),sameStable=stableRows(record.fields);
        const confirmedRow=trackerRowIdentity(table,table.rows[position])===key;
        if(!normalized(app.Title)||!normalized(tracker.Title)||!confirmedRow&&(!normalized(record.fields[provider])||sameStable.length!==1||records.filter(r=>stableKey(r.fields)===stableKey(record.fields)).length!==1)||(edition&&!normalized(app[edition]))||media==="book"&&!["physical","audiobook","ebook"].includes(normalized(app.Type))||table.rows.some((c,n)=>n!==position&&trackerRowIdentity(table,c)===desired)||items.some(i=>i.id!==item.id&&i.media_type===media&&identity(projectLegacyRow(i,i.library_id).row)===desired)){
          issue(item.id,item.title,media,"Renamed identity is ambiguous. No row or title will be guessed.");continue;
        }
        const titleOnly=changedIdentity.every(f=>f==="Title"),describe=(fields:Record<string,TrackerValue>)=>titleOnly?fields.Title:JSON.stringify(Object.fromEntries(identityFields.map(f=>[f,fields[f]])));
        changes.push({id:JSON.stringify([item.id,"identity"]),itemId:item.id,title:item.title,media,field:"identity",label:titleOnly?"Title mapping":"Record mapping",app:describe(app),tracker:describe(tracker),baseline:describe(record.fields),direction:"review",plannedAction:"provider-correction",resolutionAllowed:false,reason:confirmedRow?"The tracker row exactly matches its confirmed identity. Review and approve the app identity fields; no independent editions will be merged.":"One unchanged provider/edition matches the renamed tracker title. Approve the app identity, or edit the app first to retain the tracker identity."});
      }
      const left={id:item.id,title:item.title,media,fields:app},right={...left,fields:tracker};
      const delta=compareTracker([left],[right],keys.map(key=>({key,label:key})),{[item.id]:record.fields});
      const byField=new Map(delta.map(change=>[change.field,change]));
      for(const field of keys){
        if(changedIdentity.length&&identityFields.includes(field))continue;
        const bad=isTrackerCellError(app[field])||isTrackerCellError(tracker[field]);
        let change=byField.get(field);
        if(bad&&!change)change={id:JSON.stringify([item.id,field]),itemId:item.id,title:item.title,media,field,label:field,app:app[field],tracker:tracker[field],baseline:record.fields[field],direction:"review"};
        if(!change)continue;
        const identityChanged=identityFields.includes(field);
        changes.push(bad?{...change,direction:"review",blockedField:true,resolutionAllowed:false,reason:"Spreadsheet error held for repair; no error value can be imported."}:identityChanged?{...change,direction:"review",resolutionAllowed:false,reason:"Identity field changed since the confirmed baseline. Explicit record mapping review is required."}:{...change,resolutionAllowed:false});
      }
    }
    for(const item of byId.values())if(!known.has(item.id)){
      try{
        const own=identity(projectLegacyRow(item,item.library_id).row);
        if([...byId.values()].some(i=>i.id!==item.id&&identity(projectLegacyRow(i,i.library_id).row)===own))throw new Error("Duplicate app identity");
        compileTrackerWriteSteps([{id:JSON.stringify([item.id,"identity"]),itemId:item.id,media,field:"identity",kind:"add-record",comparisonToken:"candidate"}],items,tables,[]);
        changes.push({id:JSON.stringify([item.id,"identity"]),itemId:item.id,title:item.title,media,field:"identity",label:"New app item",app:"Add this item",tracker:"Not present",direction:"review",plannedAction:"add-record",resolutionAllowed:false,reason:"New app record with a unique title/edition identity. Review external IDs when available and approve before adding it to the tracker."});
      }catch{issue(item.id,item.title,media,"New app identity is missing or ambiguous. Review the provider/edition before adding.");}
    }
    const unmatched=reviewUnmatchedTrackerRows(table,items,usedRows);
    identityIssues+=unmatched.length;changes.push(...unmatched);
  }
  const dataIssues=changes.filter(c=>c.blockedField).length;
  return {status:"ready",message:`Fresh three-way comparison against confirmed baselines: ${matched} matched records; ${changes.length} proposed changes. Review proposed changes before manual syncing.`,changes,matchedRecords:matched,identityIssues,dataIssues,observedAt,lastConfirmedSync:baseline.lastConfirmedSync,canSaveDecisions:false,comparisonMode:"three-way"};
}

export function attachTrackerDisplay(preview:TrackerPreview,items:SnapshotItem[],tables:TrackerTable[],baseline:TrackerBaselineState):TrackerPreview {
  // Display-only context. Execution continues to compile fresh server sources;
  // these values never authorize identity matching or a write.
  const decorated=preview.changes.map(change=>{
    const table=tables.find(t=>t.name===tabs[change.media as keyof typeof tabs]);
    if(!table)return change;
    const item=items.find(i=>i.id===change.itemId);
    // A uniquely described candidate can be SHOWN for comparison, never linked
    // or used by the execution engine. The UI labels it as an unconfirmed match.
    const candidate=change.identityReview?.candidates.length===1?change.identityReview.candidates[0]:undefined;
    const possible=!item&&candidate?items.filter(i=>{
      if(i.media_type!==change.media||i.title!==candidate.title)return false;
      const row=projectLegacyRow(i,i.library_id).row;
      return String(row.IGDB_ID||row.TMDB_ID||row.isbn||"")===candidate.provider&&String(row.Platform||row.Type||"")===candidate.edition;
    }):[];
    const displayItem=item??(possible.length===1?possible[0]:undefined);
    const confirmed=baseline.records.find(r=>r.itemId===change.itemId);
    const positions=change.identityReview?.rows.map(n=>n-2)??(confirmed?table.rows.flatMap((row,n)=>trackerRowIdentity(table,row)===trackerRowIdentity(table,table.headers.map(h=>String(confirmed.fields[h]??"")))?[n]:[]):[]);
    const cells=positions.length===1?table.rows[positions[0]]:undefined;
    const tracker:Record<string,TrackerValue>=cells?Object.fromEntries(table.headers.filter(h=>!isExcludedTrackerField(h)&&h!=="Cover"&&h!=="Poster").map(h=>[h,trackerFieldValue(h,cells[table.headers.indexOf(h)]??"")])):{};
    const legacy=displayItem?projectLegacyRow(displayItem,displayItem.library_id).row:{};
    const app:Record<string,TrackerValue>=displayItem?Object.fromEntries(table.headers.filter(h=>!isExcludedTrackerField(h)&&h!=="Cover"&&h!=="Poster").map(h=>[h,Object.hasOwn(legacy,h)?trackerFieldValue(h,legacy[h]):null])):{};
    const coverUrl=String(app.CoverURL||app.PosterURL||tracker.CoverURL||tracker.PosterURL||"");
    return {...change,displayRecord:{coverUrl,app,tracker,...(!item&&displayItem?{candidate:true}:{})}};
  });
  return {...preview,changes:decorated,syncedRecords:baseline.records.length};
}
