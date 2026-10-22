import {TRACKER_ID, TRACKER_TABS, isExcludedTrackerField} from "./tracker-read";
import type {TrackerValue} from "./tracker-preview";

export type TrackerBaselineRecord = {
  itemId:string; media:"game"|"tv"|"book"|"movie";
  fields:Record<string,TrackerValue>; confirmedAt:string;
};
export type TrackerBaselineState = {
  ownerId:string; libraryId:string; targetId:string; sheetId:typeof TRACKER_ID;
  columns:Record<string,string[]>; records:TrackerBaselineRecord[]; lastConfirmedSync:string;
};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==="object"&&!Array.isArray(v);
const scalar=(v:unknown):v is TrackerValue=>v===null||typeof v==="string"||typeof v==="boolean"||(typeof v==="number"&&Number.isFinite(v));
const tabs={game:"Games",tv:"Shows",book:"Books",movie:"Movies"} as const;
const unsafe=(key:string)=>!key||key!==key.trim()||["__proto__","constructor","prototype","Cover","Poster"].includes(key)||isExcludedTrackerField(key);

/** An absent target is different from a broken/partial confirmed baseline.
 * No settings receipt, historical import value or cached fallback can replace it. */
export function validateTrackerBaselineState(data:unknown,ownerId:string,libraryId:string):TrackerBaselineState|null {
  if(!uuid.test(ownerId)||!uuid.test(libraryId)||!object(data)||data.ownerId!==ownerId||data.libraryId!==libraryId||data.sheetId!==TRACKER_ID||typeof data.exists!=="boolean")throw new Error("Wrong baseline scope");
  if(!data.exists){if(Object.keys(data).some(k=>!["ownerId","libraryId","sheetId","exists"].includes(k)))throw new Error("Unexpected absent baseline data");return null;}
  if(!uuid.test(String(data.targetId))||data.enabled!==false||!object(data.columns)||!Array.isArray(data.records)||data.records.length>5000||typeof data.lastConfirmedSync!=="string"||!Number.isFinite(Date.parse(data.lastConfirmedSync))||JSON.stringify(data).length>8*1024*1024)throw new Error("Invalid confirmed baseline");
  if(Object.keys(data.columns).length!==4||TRACKER_TABS.some(tab=>!Object.hasOwn(data.columns as object,tab)))throw new Error("Incomplete baseline columns");
  const columns:Record<string,string[]>={};
  for(const tab of TRACKER_TABS){
    const keys=data.columns[tab];
    const provider=tab==="Games"?"IGDB_ID":tab==="Books"?"isbn":"TMDB_ID";
    const required=["Title",provider,...(tab==="Games"?["Platform"]:tab==="Books"?["Type"]:[])];
    if(!Array.isArray(keys)||keys.length>52||keys.some(k=>typeof k!=="string"||unsafe(k))||new Set(keys).size!==keys.length||required.some(k=>!keys.includes(k)))throw new Error("Unsafe approved baseline columns");
    columns[tab]=keys.slice();
  }
  const seen=new Set<string>();
  const records=data.records.map(value=>{
    if(!object(value)||!uuid.test(String(value.itemId))||seen.has(String(value.itemId))||typeof value.media!=="string"||!Object.hasOwn(tabs,value.media)||!object(value.fields)||typeof value.confirmedAt!=="string"||!Number.isFinite(Date.parse(value.confirmedAt)))throw new Error("Invalid baseline record");
    const media=value.media as TrackerBaselineRecord["media"],keys=columns[tabs[media]];
    if(Object.keys(value.fields).length!==keys.length||keys.some(k=>!Object.hasOwn(value.fields as object,k)||!scalar((value.fields as Record<string,unknown>)[k])))throw new Error("Incomplete baseline fields");
    seen.add(String(value.itemId));
    return {itemId:String(value.itemId),media,confirmedAt:value.confirmedAt,fields:{...value.fields} as Record<string,TrackerValue>};
  });
  return {ownerId,libraryId,targetId:String(data.targetId),sheetId:TRACKER_ID,columns,records,lastConfirmedSync:data.lastConfirmedSync};
}

export async function readTrackerBaselineState(client:{rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>},ownerId:string,libraryId:string){
  const {data,error}=await client.rpc("cdl_v14_tracker_baselines",{p_library_id:libraryId});
  if(error)throw new Error("Fresh confirmed baselines unavailable");
  return validateTrackerBaselineState(data,ownerId,libraryId);
}
