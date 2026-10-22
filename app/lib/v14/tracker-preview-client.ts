import type {TrackerPreview} from "./tracker-preview";

/** Only retries fresh GETs. Never reuse a prior comparison or retry Apply. */
export async function readFreshTrackerPreview(libraryId:string,signal:AbortSignal,send:typeof fetch=fetch):Promise<TrackerPreview>{
 for(let attempt=0;attempt<2;attempt++){
  signal.throwIfAborted();
  try{
   const response=await send(`/v14/api/sync-preview?libraryId=${encodeURIComponent(libraryId)}`,{method:"GET",cache:"no-store",signal:AbortSignal.any([signal,AbortSignal.timeout(30000)])});
   if(!response.ok){
    if(attempt===0&&[502,503,504].includes(response.status))continue;
    throw new Error("Fresh comparison unavailable. Try Sync Now again; this check does not apply changes.");
   }
   const next:TrackerPreview=await response.json();
   if(!["ready","connection-required","mapping-required","initial-review"].includes(next.status)||!Array.isArray(next.changes))throw new Error("Invalid sync preview response.");
   signal.throwIfAborted();return next;
  }catch(error){
   signal.throwIfAborted();
   if(attempt===0&&(error instanceof TypeError||error instanceof DOMException&&error.name==="TimeoutError"))continue;
   throw error;
  }
 }
 throw new Error("Fresh comparison unavailable.");
}
