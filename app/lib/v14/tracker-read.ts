export const TRACKER_ID = "1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0";
export const TRACKER_ACCOUNT = "cdl-v14-tracker-sync@chrisgamelibrary.iam.gserviceaccount.com";
export const TRACKER_SCOPE = "https://www.googleapis.com/auth/spreadsheets.readonly";
// Series episode COUNT is retained show metadata, not per-episode watched
// progress. Keep this one explicit exception to the app-only field guard.
export const isExcludedTrackerField=(name:string)=>!/^NumberOfEpisodes$/i.test(name.trim())&&/notes|episode|progress|watched_at/i.test(name);
export const TRACKER_TABS = ["Games", "Shows", "Books", "Movies"] as const;
export const TRACKER_DATE_COLUMNS = new Set(["ReleaseDate","FirstAirDate","LastAirDate","CompletedDate","Completed Date","Date Completed","WatchDate","Date Added","RecommendationsLastChecked"]);
export type TrackerTable = {name:string;headers:string[];rows:string[][];rowNumbers?:number[]};
export type TrackerInspection = { observedAt:string; tabs:Array<{name:string;columns:number}>; tables?:TrackerTable[];
  grids?:Array<{spreadsheetId:string;title:string;sheetId:number;rowCount:number;columnCount:number}> };
type Transport=(url:string)=>Promise<unknown>;
function record(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==="object"&&!Array.isArray(value);}
export function validateTrackerManifest(value:unknown) {
  if(!record(value)||value.serviceAccount!==TRACKER_ACCOUNT||value.trackerId!==TRACKER_ID||value.scope!==TRACKER_SCOPE
    ||typeof value.keyId!=="string"||!/^[0-9a-f]{40}$/.test(value.keyId)
    ||typeof value.privateKeyFile!=="string"||!value.privateKeyFile.startsWith("/"))throw new Error("Invalid isolated tracker configuration");
  return {serviceAccount:TRACKER_ACCOUNT,trackerId:TRACKER_ID,scope:TRACKER_SCOPE,keyId:value.keyId,privateKeyFile:value.privateKeyFile};
}
// No caller-supplied Sheet ID, endpoint, range or mutation method.
export async function inspectTracker(read:Transport, includeRows=false):Promise<TrackerInspection> {
  const root=`https://sheets.googleapis.com/v4/spreadsheets/${TRACKER_ID}`;
  const metadataUrl=`${root}?fields=spreadsheetId,sheets(properties(title,sheetId,gridProperties(columnCount,rowCount)))`;
  const metadata=await read(metadataUrl);
  // Auxiliary tabs (for example ChangeLog) are not sync sources. Require each
  // approved library tab exactly once, but never read unrelated tab values.
  if(!record(metadata)||metadata.spreadsheetId!==TRACKER_ID||!Array.isArray(metadata.sheets))throw new Error("Tracker identity or tabs changed");
  const sheets=metadata.sheets.map(sheet=>record(sheet)&&record(sheet.properties)?sheet.properties:null);
  if(TRACKER_TABS.some(name=>sheets.filter(sheet=>sheet?.title===name).length!==1))throw new Error("Tracker tabs changed");
  const columns=TRACKER_TABS.map(name=>{
    const grid=sheets.find(sheet=>sheet?.title===name)?.gridProperties;
    const count=record(grid)?grid.columnCount:undefined;
    if(typeof count!=="number"||!Number.isInteger(count)||count<1||count>52)throw new Error("Tracker width requires review");
    return count;
  });
  const letters=(n:number)=>n<=26?String.fromCharCode(64+n):`A${String.fromCharCode(64+n-26)}`;
  const query=new URLSearchParams({valueRenderOption:"FORMATTED_VALUE"});
  TRACKER_TABS.forEach((name,i)=>query.append("ranges",`'${name}'!A1:${letters(columns[i])}1`));
  const response=await read(`${root}/values:batchGet?${query}`);
  if(!record(response)||response.spreadsheetId!==TRACKER_ID||!Array.isArray(response.valueRanges)||response.valueRanges.length!==4)throw new Error("Incomplete tracker header read");
  const ranges=response.valueRanges;
  const identities:Record<string,string[]>={Games:["Title","IGDB_ID","Platform"],Shows:["Title","TMDB_ID"],Books:["Title","isbn","Type"],Movies:["Title","TMDB_ID"]};
  const tabs=TRACKER_TABS.map((name,i)=>{
    const range=ranges[i];
    if(!record(range)||typeof range.range!=="string"||!new RegExp(`^'?${name}'?!A1:`).test(range.range)||!Array.isArray(range.values)||!Array.isArray(range.values[0]))throw new Error("Invalid tracker headers");
    const headers=range.values[0].map(cell=>String(cell??"").trim());
    const nonblank=headers.filter(Boolean);
    if(new Set(nonblank).size!==nonblank.length||identities[name].some(key=>!headers.includes(key))
      ||headers.some(key=>/^(notes|episode progress|watchedat|watched_at)$/i.test(key)))throw new Error("Tracker columns require review");
    return {name,columns:nonblank.length};
  });
  if(!includeRows)return {observedAt:new Date().toISOString(),tabs};
  // Read actual date serials, not locale-formatted two-digit years. Never guess
  // whether a displayed /26 represents 1926 or 2026.
  const dataQuery=new URLSearchParams({valueRenderOption:"UNFORMATTED_VALUE",dateTimeRenderOption:"SERIAL_NUMBER"});
  let cells=0;
  TRACKER_TABS.forEach((name,i)=>{
    const grid=sheets.find(sheet=>sheet?.title===name)?.gridProperties;
    const count=record(grid)?grid.rowCount:undefined;
    if(typeof count!=="number"||!Number.isInteger(count)||count<1||count>5000)throw new Error("Tracker height requires review");
    cells+=count*columns[i];
    dataQuery.append("ranges",`'${name}'!A1:${letters(columns[i])}${count}`);
  });
  if(cells>200000)throw new Error("Tracker data exceeds bounded preview");
  const url=`${root}/values:batchGet?${dataQuery}`;
  const formattedQuery=new URLSearchParams(dataQuery);formattedQuery.set("valueRenderOption","FORMATTED_VALUE");
  const formattedUrl=`${root}/values:batchGet?${formattedQuery}`;
  const [first,formatted]=await Promise.all([read(url),read(formattedUrl)]);
  const [second,formattedAgain]=await Promise.all([read(url),read(formattedUrl)]);
  // Detect concurrent edits during the preview read; never reuse a previous pass.
  if(JSON.stringify(first)!==JSON.stringify(second)||JSON.stringify(formatted)!==JSON.stringify(formattedAgain))throw new Error("Tracker changed while reading; refresh preview");
  if(JSON.stringify(metadata)!==JSON.stringify(await read(metadataUrl)))throw new Error("Tracker structure changed while reading; refresh preview");
  if(!record(first)||first.spreadsheetId!==TRACKER_ID||!Array.isArray(first.valueRanges)||first.valueRanges.length!==4)throw new Error("Incomplete tracker values");
  const dataRanges=first.valueRanges;
  if(!record(formatted)||formatted.spreadsheetId!==TRACKER_ID||!Array.isArray(formatted.valueRanges)||formatted.valueRanges.length!==4)throw new Error("Incomplete formatted tracker values");
  const formattedRanges=formatted.valueRanges;
  const tables=TRACKER_TABS.map((name,i)=>{
    const range=dataRanges[i], expected=ranges[i] as Record<string,unknown>;
    if(!record(range)||typeof range.range!=="string"||!new RegExp(`^'?${name}'?!A1:`).test(range.range)||!Array.isArray(range.values))throw new Error("Invalid tracker values");
    const displayRange=formattedRanges[i];
    if(!record(displayRange)||displayRange.range!==range.range||!Array.isArray(displayRange.values)||displayRange.values.length!==range.values.length)throw new Error("Tracker formatted rows changed");
    const displayRows=displayRange.values;
    const values=range.values.map((row,rowIndex)=>{
      if(!Array.isArray(row)||row.length>columns[i]||row.some(v=>v!==null&&!['string','number','boolean'].includes(typeof v))||row.some(v=>typeof v==='number'&&!Number.isFinite(v)))throw new Error("Invalid formatted tracker row");
      const headers=(expected.values as string[][])[0];
      return row.map((v,col)=>{
        // Sheets can store titles such as "12 12 12" as a date value with a
        // custom display format. The displayed Title is the actual label;
        // never compare its underlying serial as if it were a different show.
        if(headers[col]?.trim()==="Title"&&typeof v==='number'){
          const displayRow=displayRows[rowIndex];
          const displayed=Array.isArray(displayRow)?displayRow[col]:undefined;
          if(typeof displayed!=="string"||!displayed.trim())throw new Error("Tracker title requires review");
          return displayed;
        }
        // A Year column may be a date cell formatted as yyyy. Only use the
        // actual displayed four-digit year, never infer it from an arbitrary ID.
        if(headers[col]?.trim()==="Year"&&typeof v==='number'&&v>9999){
          const displayRow=displayRows[rowIndex];
          const displayed=Array.isArray(displayRow)?String(displayRow[col]??""):"";
          if(!/^\d{4}$/.test(displayed))throw new Error("Tracker year requires review");
          return displayed;
        }
        if(typeof v==='number'&&TRACKER_DATE_COLUMNS.has(headers[col]?.trim())){
          if(v<0||v>109573)throw new Error("Tracker date requires review");
          return new Date(Date.UTC(1899,11,30)+Math.floor(v)*86400000).toISOString().slice(0,10);
        }
        return v===null?"":String(v);
      });
    });
    if(JSON.stringify(values[0])!==JSON.stringify((expected.values as unknown[])[0]))throw new Error("Tracker headers changed");
    return {name,headers:values[0].map(h=>h.trim()),rows:values.slice(1)};
  });
  const grids=TRACKER_TABS.map((title,i)=>{
    const sheet=sheets.find(sheet=>sheet?.title===title),grid=sheet?.gridProperties;
    if(!sheet||!Number.isSafeInteger(sheet.sheetId)||!record(grid)||typeof grid.rowCount!=="number")throw new Error("Invalid tracker grid identity");
    return {spreadsheetId:TRACKER_ID,title,sheetId:sheet.sheetId as number,rowCount:grid.rowCount,columnCount:columns[i]};
  });
  return {observedAt:new Date().toISOString(),tabs,tables,grids};
}
