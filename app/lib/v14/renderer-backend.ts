import type { LibraryBackend } from "./backend-context";
import { rendererSnapshot } from "./renderer-snapshot";
import { projectLegacyRow } from "./legacy-row";
import { fullEditPatch } from "./edit-contract";
import { prepareCreate } from "./create-item";
import type { LibrarySnapshot } from "./library-snapshot";
import type { V14Item } from "./items";
import { createRoadmapClient } from "./roadmap-client";
import { scopedPreferenceStorage } from "./browser-storage";

export type InitialLibraryRead = { snapshot: LibrarySnapshot } | { error: string };

/** Per-mounted-library state, never a server-wide cache. Original revisions are
 * retained for open editors; a focus refresh must not silently rebase an edit. */
export function createRendererBackend(libraryId:string, ownerId:string, fetcher:typeof fetch=fetch, initialRead?:Promise<InitialLibraryRead>):LibraryBackend {
  // A request-scoped server read, not a cache. Consume at most once; every
  // later refresh still requests a fresh authenticated snapshot.
  let startupRead=initialRead;
  const baselines=new Map<string,V14Item>();
  const pending=new Map<string,Record<string,unknown>>();
  const inFlight=new Map<string,Promise<Awaited<ReturnType<Response["json"]>>>>();
  const uploads=new Map<string,string>();
  const uploading=new Map<string,Promise<string>>();
  let latest:LibrarySnapshot|null=null;
  let queue:Promise<unknown>=Promise.resolve();
  const endpoint="/v14/api/library";
  function identity(item:Record<string,unknown>) {
    const id=item.__cdlIdentity as {itemId?:string;libraryId?:string;revision?:number}|undefined;
    if (!id?.itemId || id.libraryId!==libraryId || !Number.isSafeInteger(id.revision)) throw new Error("Missing database item identity. Reload before saving.");
    const baseline=baselines.get(`${id.itemId}:${id.revision}`);
    if (!baseline) throw new Error("Original edit revision unavailable. Reload before saving.");
    return baseline;
  }
  function row(item:V14Item) {
    const projected=projectLegacyRow(item,libraryId);
    baselines.set(`${item.id}:${item.revision}`,structuredClone(item));
    return {...projected.row,__cdlItemId:item.id,__cdlLibraryId:libraryId,__cdlRevision:String(item.revision),__cdlMediaType:item.media_type};
  }
  async function send(key:string,command:Record<string,unknown>) {
    const response=await fetcher(endpoint,{method:"POST",cache:"no-store",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(command)});
    const data=await response.json();
    if (!response.ok || data.confirmed!==true) throw new Error(data.error||"Save not confirmed");
    if (data.snapshot) {
      if (data.snapshot.owner_id!==ownerId || data.snapshot.library_id!==libraryId) throw new Error("Save snapshot owner mismatch");
      rendererSnapshot(data.snapshot);
      latest=data.snapshot;
    }
    pending.delete(key);
    return data;
  }
  async function post(key:string,build:()=>Record<string,unknown>) {
    const existing=inFlight.get(key);
    if (existing) return existing;
    // Retain exactly the same command after a timeout, including request UUID.
    const result=queue.catch(()=>{}).then(async()=>{
      let command=pending.get(key);
      if (!command) {
        command=build();
        if (command.kind==="setting") {
          for (const [earlierKey,earlier] of pending) {
            if (earlier.kind==="setting" && earlier.key===command.key) await send(earlierKey,earlier);
          }
          // A retry above may have advanced the confirmed setting revision.
          command=build();
        }
        pending.set(key,command);
      }
      return send(key,command);
    });
    queue=result;
    inFlight.set(key,result);
    try { return await result; } finally { inFlight.delete(key); }
  }
  return {
    libraryId,
    storage:scopedPreferenceStorage(ownerId,libraryId),
    storageScope:`${ownerId}:${libraryId}`,
    roadmap:createRoadmapClient(libraryId,fetcher),
    async activity() {
      const response=await fetcher(`/v14/api/activity?libraryId=${encodeURIComponent(libraryId)}`,{cache:"no-store",credentials:"same-origin"});
      const data=await response.json();
      if(!response.ok || !Array.isArray(data.rows)) throw new Error("Activity loading failed");
      return data.rows.slice(0,300).map((value:unknown)=>{
        if(!value || typeof value!=="object" || Array.isArray(value)) throw new Error("Invalid activity row");
        return Object.fromEntries(Object.entries(value).map(([key,cell])=>{
          if(cell!==null && typeof cell!=="string") throw new Error("Invalid activity value");
          return [key,cell??""];
        }));
      });
    },
    async load(signal) {
      // Reads share the write queue: an older in-flight snapshot must never
      // replace a later confirmed save or reset the next setting revision.
      const result=queue.catch(()=>{}).then(async()=>{
      signal.throwIfAborted();
      let data:unknown;
      if (startupRead) {
        const read=startupRead;
        startupRead=undefined;
        const result=await read;
        if ("error" in result) throw new Error(result.error);
        data=result.snapshot;
      } else {
        const response=await fetcher(`${endpoint}?libraryId=${encodeURIComponent(libraryId)}`,{cache:"no-store",credentials:"same-origin",signal});
        if (!response.ok) throw new Error("Fresh library read failed");
        data=await response.json();
      }
      const snapshot=data as LibrarySnapshot;
      if (snapshot?.owner_id!==ownerId || snapshot.library_id!==libraryId) throw new Error("Unexpected library owner");
      const rendered=rendererSnapshot(snapshot);
      if (signal.aborted) throw new Error("Library read cancelled");
      latest=snapshot;
      snapshot.items.forEach(item=>baselines.set(`${item.id}:${item.revision}`,structuredClone(item)));
      return rendered;
      });
      queue=result;
      return result;
    },
    async edit(item,values) {
      const original=identity(item);
      const patch=fullEditPatch(original,values);
      if (!Object.keys(patch).length) {
        const result=queue.catch(()=>{}).then(async()=>{
          // A no-op still checks current state; do not call a cached baseline saved.
          // It must also wait for earlier saves/reads, just like a changed edit.
          const response=await fetcher(`${endpoint}?libraryId=${encodeURIComponent(libraryId)}`,{cache:"no-store",credentials:"same-origin"});
          if (!response.ok) throw new Error("Edit readback failed");
          const data=await response.json();
          const fresh=data as LibrarySnapshot;
          if (fresh?.owner_id!==ownerId || fresh.library_id!==libraryId) throw new Error("Unexpected library owner");
          rendererSnapshot(fresh);
          const current=fresh.items.find(candidate=>candidate.id===original.id);
          if (!current || current.revision!==original.revision) throw new Error("Item changed elsewhere. Reload before saving.");
          return row(current);
        });
        queue=result;
        return result;
      }
      const key=JSON.stringify(["edit",original.id,original.revision,patch]);
      const data=await post(key,()=>({kind:"edit",libraryId,itemId:original.id,revision:original.revision,requestId:crypto.randomUUID(),patch}));
      return row(data.item);
    },
    async create(mediaType,values) {
      const key=JSON.stringify(["create",mediaType,values]);
      const data=await post(key,()=>({kind:"create",libraryId,input:prepareCreate(libraryId,crypto.randomUUID(),crypto.randomUUID(),mediaType,values,new Date().toISOString().slice(0,10))}));
      return row(data.item);
    },
    async archive(item) {
      const original=identity(item);
      await post(JSON.stringify(["archive",original.id,original.revision]),()=>({kind:"archive",libraryId,itemId:original.id,revision:original.revision,requestId:crypto.randomUUID(),archived:true}));
    },
    async progress(episodes,watched) {
      if (!episodes.length) return [];
      const targets=episodes.map(episode=>{
        if (!episode.__cdlEpisodeId || episode.__cdlLibraryId!==libraryId) throw new Error("Missing episode identity. Refresh before saving.");
        return {episode_id:episode.__cdlEpisodeId,revision:episode.__cdlRevision===""?null:Number(episode.__cdlRevision)};
      });
      const data=await post(JSON.stringify(["progress",targets,watched]),()=>({kind:"progress",libraryId,requestId:crypto.randomUUID(),changes:targets.map(target=>({...target,watched,watched_at:watched?new Date().toISOString():null}))}));
      if (data.snapshot?.owner_id!==ownerId || data.snapshot?.library_id!==libraryId) throw new Error("Episode snapshot owner mismatch");
      const rendered=rendererSnapshot(data.snapshot);
      latest=data.snapshot;
      return rendered.episodes;
    },
    async episodeMetadata(show,rows) {
      const original=identity(show);
      const metadataKeys=["EpisodeTitle","AirDate","StillURL","Overview","Runtime","Source","UpdatedAt"];
      const input=rows.map(row=>({season_number:Number(row.SeasonNumber),episode_number:Number(row.EpisodeNumber),provider_id:row.EpisodeTMDB_ID||null,
        metadata:Object.fromEntries(metadataKeys.filter(key=>Object.hasOwn(row,key)).map(key=>[key,row[key]]))}));
      const data=await post(JSON.stringify(["episode_metadata",original.id,original.revision,input]),()=>({kind:"episode_metadata",libraryId,itemId:original.id,revision:original.revision,requestId:crypto.randomUUID(),rows:input}));
      if (data.snapshot?.owner_id!==ownerId || data.snapshot?.library_id!==libraryId) throw new Error("Episode snapshot owner mismatch");
      const rendered=rendererSnapshot(data.snapshot);
      latest=data.snapshot;
      return rendered.episodes;
    },
    async artwork(item,source,kind) {
      const original=identity(item);
      const key=JSON.stringify([original.id,original.revision,kind,typeof source==="string"?source:[source.name,source.size,source.lastModified]]);
      let url=uploads.get(key);
      if (!url) {
        let upload=uploading.get(key);
        if (!upload) {
          upload=(async()=>{
            const form=new FormData();form.set("libraryId",libraryId);form.set("itemId",original.id);
            if (typeof source==="string") form.set("sourceUrl",source);else form.set("file",source);
            const response=await fetcher("/v14/api/artwork",{method:"POST",credentials:"same-origin",body:form});
            const data=await response.json();
            if (!response.ok || !data.ok || typeof data.url!=="string") throw new Error(data.error||"Artwork upload failed");
            return data.url as string;
          })();
          uploading.set(key,upload);
        }
        try {
          url=await upload;
          uploads.set(key,url);
        } finally {
          if (uploading.get(key)===upload) uploading.delete(key);
        }
      }
      const values:Record<string,string>=kind==="cover"?{r2CoverUrl:url!,r2CoverUrlDate:new Date().toISOString()}:{r2BackdropUrl:url!,r2BackdropUrlDate:new Date().toISOString()};
      // Freeze timestamp/URL inside the retained command for retry safety.
      const data=await post(`artwork:${key}`,()=>({kind:"edit",libraryId,itemId:original.id,revision:original.revision,requestId:crypto.randomUUID(),patch:fullEditPatch(original,values)}));
      uploads.delete(key);
      return row(data.item);
    },
    async icon(form) {
      const safeForm=new FormData();safeForm.set("libraryId",libraryId);safeForm.set("scope","icon");
      const file=form.get("file");if (!(file instanceof File)) throw new Error("Icon image required");safeForm.set("file",file);
      const response=await fetcher("/v14/api/artwork",{method:"POST",credentials:"same-origin",body:safeForm});
      const data=await response.json();if (!response.ok || !data.ok) throw new Error(data.error||"Icon upload failed");return data;
    },
    async write(_url,payload) {
      if (typeof payload.key!=="string" || !Object.hasOwn(payload,"value") || !latest) throw new Error("Unsupported legacy write. No Sheet request was sent.");
      const key=payload.key;
      const data=await post(JSON.stringify(["setting",key,payload.value]),()=>({kind:"setting",libraryId,key,revision:latest?.settings.find(entry=>entry.key===key)?.revision??null,requestId:crypto.randomUUID(),value:String(payload.value)}));
      if (data.snapshot?.owner_id!==ownerId || data.snapshot?.library_id!==libraryId) throw new Error("Setting snapshot owner mismatch");
      rendererSnapshot(data.snapshot);
      latest=data.snapshot;
      return JSON.stringify({status:"Success",settings:rendererSnapshot(data.snapshot).settings});
    },
  };
}
