import { projectLibrarySnapshot } from './library-snapshot';
import { validateRecordIndex, type IndexedSnapshot } from './incremental-snapshot';

export type SnapshotStore = {read():Promise<IndexedSnapshot|null>;write(snapshot:IndexedSnapshot):Promise<void>;clear():Promise<void>};
const databaseName='cdl-v14-library-cache-v1';
// Cache failures (private browsing, quota, corruption) only disable the local
// optimization. A persisted copy never authorizes a render without a fresh API read.
export function createSnapshotStore(owner:string,library:string):SnapshotStore {
  const key=`${owner}:${library}`;
  async function transact(mode:IDBTransactionMode, action:(store:IDBObjectStore)=>IDBRequest) {
    const db=await new Promise<IDBDatabase>((resolve,reject)=>{
      const request=indexedDB.open(databaseName,1);
      let expired=false;
      const timeout=setTimeout(()=>{expired=true;reject(new Error('Local library storage timed out'));},1500);
      request.onupgradeneeded=()=>request.result.createObjectStore('snapshots');
      request.onsuccess=()=>{clearTimeout(timeout);if(expired)request.result.close();else resolve(request.result);};
      request.onerror=()=>{clearTimeout(timeout);reject(request.error);};
      request.onblocked=()=>{clearTimeout(timeout);expired=true;reject(new Error('Local library storage blocked'));};
    });
    try {
      return await new Promise<unknown>((resolve,reject)=>{
        const tx=db.transaction('snapshots',mode);
        const request=action(tx.objectStore('snapshots'));
        const timeout=setTimeout(()=>{tx.abort();reject(new Error('Local library transaction timed out'));},1500);
        tx.oncomplete=()=>{clearTimeout(timeout);resolve(request.result);};
        tx.onerror=()=>{clearTimeout(timeout);reject(tx.error);};
        tx.onabort=()=>{clearTimeout(timeout);reject(tx.error);};
      });
    } finally { db.close(); }
  }
  async function checksum(text:string) {
    return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');
  }
  async function clear(){try {await transact('readwrite',store=>store.delete(key));}catch{/* caching optional */}}
  return {
    async read(){
      try {
        const saved=await transact('readonly',store=>store.get(key)) as {version?:number;payload?:string;checksum?:string}|undefined;
        if(!saved)return null;
        if(saved.version!==1 || typeof saved.payload!=='string' || saved.payload.length>40*1024*1024 || saved.checksum!==await checksum(saved.payload)) throw new Error('Invalid local snapshot');
        const snapshot=JSON.parse(saved.payload) as IndexedSnapshot;
        projectLibrarySnapshot(snapshot,owner,library);
        if(!/^[a-f0-9]{32}$/i.test(snapshot.change_token))throw new Error('Invalid local revision');
        if(snapshot.record_index) {
          validateRecordIndex(snapshot.record_index);
          for(const section of ['items','episodes','settings'] as const) {
            const keys=snapshot[section].map(row=>section==='settings'?(row as {key:string}).key:(row as {id:string}).id);
            if(keys.length!==snapshot.record_index[section].length || keys.some((id,index)=>id!==snapshot.record_index![section][index][0])) throw new Error('Local inventory mismatch');
          }
        }
        return snapshot;
      }catch{await clear();return null;}
    },
    async write(snapshot){
      try {
        projectLibrarySnapshot(snapshot,owner,library);
        const payload=JSON.stringify(snapshot);
        if(payload.length>40*1024*1024)return;
        const saved={version:1,payload,checksum:await checksum(payload)};
        await transact('readwrite',store=>store.put(saved,key));
      }catch{/* Storage is an optimization, never a prerequisite for saves. */}
    },
    clear,
  };
}
