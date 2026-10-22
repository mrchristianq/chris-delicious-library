import {projectLegacyRow} from "./legacy-row";
import {trackerRowIdentity} from "./tracker-write-plan";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerTable} from "./tracker-read";
import type {TrackerChange} from "./tracker-preview";

const norm=(v:unknown)=>String(v??"").normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");

/** Diagnostic only. Row positions are locators for human review, NEVER write
 * targets or approval identities. Same-title/provider candidates are not matches.
 * Only identity fields leave this helper; Notes/progress cannot enter a report. */
export function reviewUnmatchedTrackerRows(table:TrackerTable,items:SnapshotItem[],usedRows:Set<number>):TrackerChange[]{
  const media=({Games:"game",Shows:"tv",Books:"book",Movies:"movie"} as const)[table.name];
  if(!media)throw new Error("Unknown tracker tab");
  const provider=media==="game"?"IGDB_ID":media==="book"?"isbn":"TMDB_ID";
  const edition=media==="game"?"Platform":media==="book"?"Type":null;
  const keys=["Title",provider,...(edition?[edition]:[])];
  if(keys.some(k=>!table.headers.includes(k)))throw new Error("Missing identity columns");
  const fields=(cells:string[])=>Object.fromEntries(keys.map(k=>[k,String(cells[table.headers.indexOf(k)]??"").trim()]));
  const groups=new Map<string,number[]>();
  table.rows.forEach((row,n)=>{
    if(!norm(row[table.headers.indexOf("Title")]))return;
    const key=trackerRowIdentity(table,row);groups.set(key,[...(groups.get(key)??[]),n]);
  });
  if(![...groups.values()].some(positions=>positions.some(n=>!usedRows.has(n))))return [];
  const app=items.filter(i=>i.media_type===media).map(i=>{
    const projected=projectLegacyRow(i,i.library_id).row;
    return {title:String(projected.Title??i.title),provider:String(projected[provider]??""),edition:edition?String(projected[edition]??""):""};
  });
  const byTitle=new Map<string,number[]>(),byProvider=new Map<string,number[]>();
  app.forEach((i,n)=>{
    const title=norm(i.title),id=norm(i.provider);
    byTitle.set(title,[...(byTitle.get(title)??[]),n]);
    if(id)byProvider.set(id,[...(byProvider.get(id)??[]),n]);
  });
  const result:TrackerChange[]=[];
  for(const [key,positions] of groups){
    const unmatched=positions.filter(n=>!usedRows.has(n));if(!unmatched.length)continue;
    const identity=fields(table.rows[unmatched[0]]);
    const candidates=[...new Set([...(byTitle.get(norm(identity.Title))??[]),...(byProvider.get(norm(identity[provider]))??[])])].map(n=>app[n]);
    const duplicate=positions.length>1;
    const kind=duplicate?"duplicate-tracker-record" as const:candidates.length?"possible-existing-record" as const:"new-tracker-record" as const;
    const guidance=duplicate?"Compare these tracker rows before resolving the duplicate. Different game platforms and book types must remain separate. Nothing will be deleted or merged.":candidates.length?"Compare the title, external ID and edition with the app candidates. Similar titles or a shared external ID do not authorize a match. This record stays held for explicit identity resolution.":"This row has no same-title or same-provider candidate in the active app. It needs explicit new-item import review, including field validation; it will not be created automatically.";
    result.push({id:JSON.stringify([table.name,key,"unmatched"]),itemId:JSON.stringify([table.name,key]),title:identity.Title,media,field:"identity",label:duplicate?"Duplicate tracker identity":candidates.length?"Possible existing item":"New tracker item",app:candidates.length?`${candidates.length} possible app item${candidates.length===1?"":"s"}`:"Not matched",tracker:"Held for review",direction:"review",resolutionAllowed:false,reason:guidance,identityReview:{kind,tab:table.name,rows:positions.map(n=>n+2),identity,candidates,guidance}});
  }
  return result;
}
