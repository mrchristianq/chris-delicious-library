import { createV14Client } from './server';
import { readRecordDelta, mergeRecordDelta, validateRecordIndex, type RecordIndex } from './incremental-snapshot';
import { validChangeToken } from './conditional-read';
import { readBoundedRendererSnapshot } from './bounded-snapshot';

/** New renderer clients may supply fingerprints, never records or an owner ID.
 * The session and database independently authorize every read. */
export async function readIncrementalLibrary(library:string,previous?:RecordIndex,baseToken:string|null=null) {
  if(!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(library) || (previous && !validChangeToken(baseToken))) throw new Error('Invalid incremental request');
  if(previous) validateRecordIndex(previous);
  const client=await createV14Client();
  const {data:auth,error}=await client.auth.getUser();
  if(error || !auth.user) throw new Error('Authentication required');
  const owner=auth.user.id;
  const rpc=(name:string,args:Record<string,unknown>)=>client.rpc(name,args);
  if(previous) {
    const {data:guard,error:failed}=await rpc('cdl_v14_renderer_state',{p_library_id:library});
    if(failed?.code==='PGRST202')return readBoundedRendererSnapshot(rpc,library);
    if(failed || !guard || guard.owner_id!==owner || guard.library_id!==library || !validChangeToken(guard.change_token) || !Number.isFinite(Date.parse(guard.observed_at))) throw new Error('Fresh library revision check failed');
    if(guard.change_token===baseToken) return {unchanged:true,owner_id:owner,library_id:library,change_token:baseToken,observed_at:guard.observed_at};
  }
  try {
    const delta=await readRecordDelta(rpc,library,previous,baseToken);
    if(delta.owner_id!==owner)throw new Error('Library owner mismatch');
    return previous?delta:mergeRecordDelta(null,delta,owner,library);
  }catch(error){
    // Rollout compatibility only. Other failures never turn into a stale read.
    if((error as {code?:string}).code!=='PGRST202')throw error;
    return readBoundedRendererSnapshot(rpc,library);
  }
}
