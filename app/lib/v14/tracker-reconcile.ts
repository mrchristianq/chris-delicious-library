import type {SnapshotItem} from "./library-snapshot";
import {projectLegacyRow} from "./legacy-row";
import type {TrackerTable} from "./tracker-read";
import type {TrackerChange,TrackerPreview,TrackerValue} from "./tracker-preview";
const types={Games:"game",Shows:"tv",Books:"book",Movies:"movie"} as const;
const norm=(value:unknown)=>String(value??"").normalize("NFKC").trim().toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g," ");
const dates=new Set(["ReleaseDate","FirstAirDate","LastAirDate","CompletedDate","Completed Date","Date Completed","WatchDate","Date Added","RecommendationsLastChecked"]);
export const isTrackerCellError=(v:TrackerValue)=>typeof v==="string"&&/^#(REF!|VALUE!|N\/A|DIV\/0!|NAME\?|NUM!|NULL!|ERROR!)/i.test(v.trim());
export function trackerFieldValue(header:string,raw:string):TrackerValue {
  const text=raw.trim();
  if(header==="Completed"||header==="Backlog"){
    if(/^(true|yes|1)$/i.test(text))return true;
    if(/^(false|no|0)$/i.test(text)||(header==="Completed"&&text===""))return false;
  }
  if(dates.has(header)&&text){
    let iso=text;
    const american=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
    if(american)iso=`${american[3]}-${american[1].padStart(2,"0")}-${american[2].padStart(2,"0")}`;
    if(/^\d{5}(?:\.\d+)?$/.test(text))iso=new Date(Date.UTC(1899,11,30)+Math.floor(Number(text))*86400000).toISOString().slice(0,10);
    if(/^\d{4}-\d{2}-\d{2}$/.test(iso)&&Number.isFinite(Date.parse(iso))&&new Date(iso).toISOString().slice(0,10)===iso)return iso;
  }
  if(["MyRating","My Rating","TMDB_Rating","Year","pages","Runtime","NumberOfSeasons","NumberOfEpisodes","Hours Played","Year Played"].includes(header)&&text&&Number.isFinite(Number(text)))return Number(text);
  return text;
}
export function initialTrackerReview(items:SnapshotItem[],tables:TrackerTable[],observedAt:string):TrackerPreview {
  const changes:TrackerChange[]=[];let matched=0,issues=0;
  const issue=(id:string,title:string,media:string,app:string,tracker:string,reason:string)=>{
    issues++;changes.push({id,itemId:id,title,media,field:"identity",label:"Record identity",app,tracker,direction:"review",reason,resolutionAllowed:false});
  };
  for(const table of tables){
    const type=types[table.name as keyof typeof types];if(!type)throw new Error("Unexpected tracker table");
    if(table.headers.some(h=>/notes|episode.?progress|watched_at/i.test(h)))throw new Error("Excluded tracker column");
    const titleKey="Title",editionKey=type==="game"?"Platform":type==="book"?"Type":null;
    const providerKey=type==="game"?"IGDB_ID":type==="book"?"isbn":"TMDB_ID";
    const key=(row:Record<string,string>)=>JSON.stringify([norm(row[titleKey]),editionKey?norm(row[editionKey]):""]);
    const app=items.filter(item=>item.media_type===type).map(item=>({item,row:projectLegacyRow(item,item.library_id).row}));
    const sheet=table.rows.map((cells,index)=>({row:Object.fromEntries(table.headers.map((header,col)=>[header,cells[col]??""])),position:table.rowNumbers?.[index]??index+2})).filter(entry=>norm(entry.row.Title));
    const appGroups=new Map<string,typeof app>();const sheetGroups=new Map<string,typeof sheet>();
    for(const entry of app)appGroups.set(key(entry.row),[...(appGroups.get(key(entry.row))??[]),entry]);
    for(const entry of sheet)sheetGroups.set(key(entry.row),[...(sheetGroups.get(key(entry.row))??[]),entry]);
    for(const groupKey of new Set([...appGroups.keys(),...sheetGroups.keys()])){
      const a=appGroups.get(groupKey)??[],b=sheetGroups.get(groupKey)??[];
      const title=a[0]?.item.title??b[0]?.row.Title??"Unknown";
      // Same-title films/shows can be distinct releases. Split ONLY by a
      // nonblank provider ID that is unique on BOTH sides of this title group.
      // A duplicate or mismatching ID still fails closed below; never zip rows.
      const pairs:Array<[typeof app[number],typeof sheet[number]]>=[];
      if((type==="movie"||type==="tv")&&(a.length>1||b.length>1)){
        const ids=new Set([...a.map(e=>norm(e.row[providerKey])),...b.map(e=>norm(e.row[providerKey]))]);
        const remainingA=[...a],remainingB=[...b];
        for(const provider of ids){
          if(!provider)continue;
          const left=a.filter(e=>norm(e.row[providerKey])===provider),right=b.filter(e=>norm(e.row[providerKey])===provider);
          if(left.length!==1||right.length!==1)continue;
          pairs.push([left[0],right[0]]);
          remainingA.splice(remainingA.indexOf(left[0]),1);remainingB.splice(remainingB.indexOf(right[0]),1);
        }
        if(remainingA.length||remainingB.length)issue(`${type}:${groupKey}`,title,type,`${remainingA.length} unmatched app record(s)`,remainingB.length?`Unmatched tracker rows ${remainingB.map(e=>e.position).join(", ")}`:"Not in tracker","Same-title releases could not all be matched uniquely by provider ID. No automatic import or deletion.");
      }else{
        if(a.length!==1||b.length!==1){issue(`${type}:${groupKey}`,title,type,a.length?`${a.length} app record(s); status: ${a.map(e=>e.item.user_status??"Not set").join(", ")}`:"Not in app",b.length?`Tracker rows ${b.map(e=>e.position).join(", ")}`:"Not in tracker","Missing or ambiguous identity. Keep existing app cleanup decisions; no automatic import, deletion or field choice.");continue;}
        pairs.push([a[0],b[0]]);
      }
      for(const [left,right] of pairs){
        const appProvider=norm(left.row[providerKey]),sheetProvider=norm(right.row[providerKey]);
        if(appProvider!==sheetProvider){issue(left.item.id,title,type,appProvider||"No provider ID",sheetProvider||"No provider ID","Provider identity differs. Existing app mapping remains unchanged; verify the tracker mapping before comparing fields.");continue;}
        matched++;
        for(const header of table.headers){
          if(!header||["Cover","Poster"].includes(header))continue; // image/formula display cells, not editable tracker fields
          if(!Object.hasOwn(left.row,header)){issue(`${left.item.id}:${header}`,title,type,"No mapped app field",right.row[header]??"","Retained column has no explicit app mapping. Nothing will be cleared or imported automatically.");continue;}
          const av=trackerFieldValue(header,left.row[header]),bv=trackerFieldValue(header,right.row[header]??"");
          const invalid=isTrackerCellError(av)||isTrackerCellError(bv);
          if(Object.is(av,bv)&&!invalid)continue;
          changes.push({id:JSON.stringify([left.item.id,header]),itemId:left.item.id,title,media:type,field:header,label:header,app:av,tracker:bv,direction:"review",reason:"Initial reconciliation: no confirmed sync baseline. Choose explicitly; existing app values are unchanged.",resolutionAllowed:!invalid,...(invalid?{blockedField:true,reason:"Spreadsheet error value held for repair; neither side can be imported until this field is valid."}:{})});
        }
      }
    }
  }
  return {status:"initial-review",message:`Fresh tracker comparison: ${matched} uniquely matched records; ${issues} identity/column issues require review. This is the first reconciliation, not a completed sync.`,matchedRecords:matched,identityIssues:issues,changes,observedAt,lastConfirmedSync:null};
}
