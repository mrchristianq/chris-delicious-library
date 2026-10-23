import {mkdtemp,writeFile,lstat,readFile} from "node:fs/promises";
import {join} from "node:path";
import {createHash} from "node:crypto";
import {gzipSync,gunzipSync} from "node:zlib";
import {JWT} from "google-auth-library";
import {loadPrivateTrackerCredentials} from "./tracker-read-server";
import {TRACKER_ID,TRACKER_SCOPE,TRACKER_TABS} from "./tracker-read";
import type {TrackerGrid} from "./tracker-google-request";
import {isV14RuntimeAllowed,isApprovedV14Hosted} from './hosted-preview';
import {storePrivateTrackerBackup,RECOVERY_BUCKET} from './tracker-private-backup';

const root="/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14";
/** Local-only recovery artifact, not a hosted filesystem persistence strategy.
 * Retains actual user-entered formulas, values, formats and validation before
 * any write. Credentials never enter the artifact or returned receipt. */
export async function captureTrackerRecoveryBytes(run:string,grids:TrackerGrid[]){
  // Local standalone backup scripts intentionally do not have an origin env.
  if((process.env.VERCEL?!isV14RuntimeAllowed():process.env.CDL_V14_TEST!=="true")||!/^[a-f0-9]{64}$/.test(run)||grids.length!==4)throw new Error("Invalid tracker backup request");
  const credential=await loadPrivateTrackerCredentials();if(!credential)throw new Error("Tracker backup connection unavailable");
  const query=new URLSearchParams({includeGridData:"true",fields:"spreadsheetId,properties,sheets(properties,data(startRow,startColumn,rowData(values(userEnteredValue,userEnteredFormat,dataValidation,note))))"});
  for(const title of TRACKER_TABS){
    const grid=grids.find(g=>g.title===title);if(!grid||grid.spreadsheetId!==TRACKER_ID||grid.columnCount<1||grid.columnCount>52||grid.rowCount<1||grid.rowCount>5000)throw new Error("Invalid backup grid");
    const n=grid.columnCount,letters=n<=26?String.fromCharCode(64+n):`A${String.fromCharCode(64+n-26)}`;
    query.append("ranges",`'${title}'!A1:${letters}${grid.rowCount}`);
  }
  const {config,key}=credential,client=new JWT({email:config.serviceAccount,key,keyId:config.keyId,scopes:[TRACKER_SCOPE],transporterOptions:{timeout:20000}});
  const token=await client.getAccessToken();if(!token.token)throw new Error("Tracker backup authorization unavailable");
  const response=await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${TRACKER_ID}?${query}`,{headers:{authorization:`Bearer ${token.token}`},cache:"no-store",redirect:"error",signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw new Error("Tracker backup read failed");
  const text=await response.text();if(Buffer.byteLength(text)>128000000)throw new Error("Tracker backup exceeds safe bound");
  const snapshot=JSON.parse(text);
  if(snapshot.spreadsheetId!==TRACKER_ID||!Array.isArray(snapshot.sheets)||snapshot.sheets.length!==4||grids.some(g=>!snapshot.sheets.some((s:{properties:TrackerGrid&{gridProperties:{rowCount:number;columnCount:number}}})=>s.properties.title===g.title&&s.properties.sheetId===g.sheetId&&s.properties.gridProperties.rowCount===g.rowCount&&s.properties.gridProperties.columnCount===g.columnCount)))throw new Error("Tracker backup identity changed");
  const bytes=JSON.stringify({version:1,target:TRACKER_ID,run,capturedAt:new Date().toISOString(),snapshot});
  const compressed=gzipSync(bytes);if(compressed.byteLength>24000000)throw new Error("Compressed tracker backup exceeds safe bound");
  return {bytes,compressed};
}
export async function saveTrackerRecoverySnapshot(run:string,grids:TrackerGrid[],scope?:{ownerId:string;libraryId:string}){
  const {bytes,compressed}=await captureTrackerRecoveryBytes(run,grids);
  if(isApprovedV14Hosted()){
    if(!scope)throw new Error('Recovery owner required');
    const {createV14Client}=await import('./server');
    const client=await createV14Client(),{data:auth,error}=await client.auth.getUser();
    if(error||!auth.user||auth.user.id!==scope.ownerId)throw new Error('Recovery owner unavailable');
    const {data:libraries,error:denied}=await client.rpc('cdl_v14_my_libraries');
    if(denied||!Array.isArray(libraries)||!libraries.some(row=>row.id===scope.libraryId))throw new Error('Recovery library unavailable');
    const receipt=await storePrivateTrackerBackup(client.storage.from(RECOVERY_BUCKET),compressed,scope.ownerId,scope.libraryId,run);
    return {...receipt,uncompressedBytes:Buffer.byteLength(bytes)};
  }
  const stat=await lstat(root);if(!stat.isDirectory()||stat.isSymbolicLink()||typeof process.getuid==="function"&&stat.uid!==process.getuid())throw new Error("Unsafe recovery folder");
  const directory=await mkdtemp(join(root,"tracker-pre-sync-")),path=join(directory,"tracker.json.gz");
  await writeFile(path,compressed,{mode:0o600,flag:"wx"});
  const sha256=createHash("sha256").update(compressed).digest("hex");
  if(createHash("sha256").update(await readFile(path)).digest("hex")!==sha256)throw new Error("Tracker backup readback failed");
  if(!gunzipSync(await readFile(path),{maxOutputLength:128000000}).equals(Buffer.from(bytes)))throw new Error("Tracker backup decompression check failed");
  return {path,sha256,bytes:compressed.byteLength,uncompressedBytes:Buffer.byteLength(bytes)};
}
