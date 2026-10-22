import {TRACKER_ID,TRACKER_DATE_COLUMNS,isExcludedTrackerField} from "./tracker-read";
import {inspectTrackerWriteStep} from "./tracker-write-plan";
import type {TrackerWriteStep} from "./tracker-write-plan";
import type {TrackerTable} from "./tracker-read";
import type {SnapshotItem} from "./library-snapshot";
import type {TrackerValue} from "./tracker-preview";

const sheetIds:Record<string,number>={Games:1374715809,Shows:1246289004,Books:519477596,Movies:488782103};
export type TrackerGrid={spreadsheetId:string;title:string;sheetId:number;rowCount:number;columnCount:number};
function enteredValue(header:string,value:TrackerValue){
  if(value===null||value==="")return {};
  if(typeof value==="boolean")return {boolValue:value};
  if(typeof value==="number"){
    if(!Number.isFinite(value))throw new Error("Invalid numeric tracker value");
    return {numberValue:value};
  }
  if(TRACKER_DATE_COLUMNS.has(header)&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
    const timestamp=Date.parse(value);
    if(!Number.isFinite(timestamp)||new Date(timestamp).toISOString().slice(0,10)!==value)throw new Error("Invalid tracker date");
    return {numberValue:(timestamp-Date.UTC(1899,11,30))/86400000};
  }
  // Always a literal string, including leading = + - @. Never turn personal
  // data or provider values into executable spreadsheet formulas.
  return {stringValue:value};
}

/** Builds one atomic, pinned Sheets batchUpdate body, with NO network access.
 * Caller must use fresh metadata/table/source, durable dispatch journal and
 * independent readback. No valueInputOption=USER_ENTERED or append retries. */
export function buildTrackerGoogleRequest(step:TrackerWriteStep,item:SnapshotItem,table:TrackerTable,grid:TrackerGrid){
  if(grid.spreadsheetId!==TRACKER_ID||grid.title!==step.tab||grid.sheetId!==sheetIds[step.tab]||
    !Number.isSafeInteger(grid.rowCount)||grid.rowCount<2||grid.rowCount>5000||
    !Number.isSafeInteger(grid.columnCount)||grid.columnCount<table.headers.length||grid.columnCount>52||table.rowNumbers!==undefined)
    throw new Error("Tracker grid identity changed");
  const observed=inspectTrackerWriteStep(step,item,table);
  if(observed.state==="conflict")throw new Error("Tracker preconditions changed");
  const requests:Record<string,unknown>[]=[];
  if(observed.state==="after")return {spreadsheetId:TRACKER_ID,requests};
  if(table.rows.length+1>grid.rowCount||observed.rows.some(r=>r<2||r>grid.rowCount))throw new Error("Tracker grid bounds changed");
  let row=observed.rows[0];
  if(step.kind==="add-record"){
    // Use a deterministic fresh end-of-grid location in ONE atomic request.
    // On uncertainty, the journal permits readback only, never blind append.
    requests.push({appendDimension:{sheetId:grid.sheetId,dimension:"ROWS",length:1}});
    row=grid.rowCount+1;
  }
  if(!row)throw new Error("Missing write destination");
  for(const [header,value] of Object.entries(step.after)){
    const column=table.headers.indexOf(header);
    if(column<0||["Cover","Poster"].includes(header)||isExcludedTrackerField(header))throw new Error("Unsafe write column");
    if(item.media_type==="book"&&["MyRating","My Rating"].includes(header)&&value!==null&&value!==""&&(typeof value!=="number"||value<0||value>5))throw new Error("Book rating is not on five-point scale");
    requests.push({updateCells:{range:{sheetId:grid.sheetId,startRowIndex:row-1,endRowIndex:row,startColumnIndex:column,endColumnIndex:column+1},rows:[{values:[{userEnteredValue:enteredValue(header,value)}]}],fields:"userEnteredValue"}});
  }
  if(step.kind==="duplicate-cleanup")for(const duplicate of observed.rows.slice(1).sort((a,b)=>b-a)){
    requests.push({deleteDimension:{range:{sheetId:grid.sheetId,dimension:"ROWS",startIndex:duplicate-1,endIndex:duplicate}}});
  }
  if(requests.length>55)throw new Error("Tracker operation exceeds bounded request");
  return {spreadsheetId:TRACKER_ID,requests};
}
