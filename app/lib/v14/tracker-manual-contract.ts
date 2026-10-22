import {TRACKER_ID} from "./tracker-read";
import {isV14RuntimeAllowed} from './hosted-preview';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function manualSyncEnabled(env:NodeJS.ProcessEnv=process.env){
  const accepted=env.CDL_V14_ACCEPTANCE_WRITES==="true"&&env.CDL_V14_MANUAL_WRITES_ONLY==="true"&&env.CDL_V14_VALIDATION_READ_ONLY==="false"&&env.CDL_V14_REVIEW_ONLY==="false";
  return isV14RuntimeAllowed(env)&&env.CDL_V14_MANUAL_SYNC==="true"&&(env.CDL_V14_REVIEW_ONLY==="true"||accepted)&&env.CDL_V14_TRACKER_WRITE_TARGET===TRACKER_ID;
}
export function parseManualCommand(value:unknown){
  const v=value as Record<string,unknown>|null;
  if(!v||typeof v!=="object"||Array.isArray(v)||Object.keys(v).filter(k=>k!=="items").sort().join(',')!=="action,fingerprint,libraryId,requestId"||typeof v.action!=="string"||!["stage","apply"].includes(v.action)||typeof v.libraryId!=="string"||!uuid.test(v.libraryId)||typeof v.requestId!=="string"||!uuid.test(v.requestId)||typeof v.fingerprint!=="string"||!/^[a-f0-9]{64}$/.test(v.fingerprint))throw new Error("Invalid manual sync command");
  if(Object.hasOwn(v,"items"))parseSelectedItems(v.items);
  return v as {action:"stage"|"apply";libraryId:string;requestId:string;fingerprint:string;items?:string[]};
}
export function parseSelectedItems(value:unknown):string[]{if(!Array.isArray(value)||!value.length||value.length>100||new Set(value).size!==value.length||value.some(k=>typeof k!=="string"||!k||k.length>512))throw new Error("Invalid selected items");return [...value].sort();}
