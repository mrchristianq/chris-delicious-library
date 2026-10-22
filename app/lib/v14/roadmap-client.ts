export type RoadmapEntry = {id:string;text:string;tag?:"bug"|"feature";completed:boolean;createdAt:number;completedAt?:number};

/** One instance per authenticated library. Never uses the shared v13 R2 writer
 * or browser cache, and retains failed commands for timeout-safe retries. */
export function createRoadmapClient(libraryId:string,fetcher:typeof fetch=fetch) {
  const endpoint=`/v14/api/roadmap?libraryId=${encodeURIComponent(libraryId)}`;
  let revision:number|null=null;
  let loaded=false;
  let queue:Promise<unknown>=Promise.resolve();
  let pending:{items:RoadmapEntry[];revision:number|null;requestId:string}|null=null;
  async function confirmPending() {
    if (!pending) return;
    const command=pending;
    const response=await fetcher(endpoint,{method:"PUT",cache:"no-store",credentials:"same-origin",headers:{"Content-Type":"application/json"},body:JSON.stringify(command)});
    const data=await response.json();
    if (!response.ok || data.confirmed!==true || data.requestId!==command.requestId ||
        data.revision!==(command.revision??0)+1 || JSON.stringify(data.items)!==JSON.stringify(command.items)) throw new Error("Roadmap save not confirmed");
    revision=data.revision;
    pending=null;
  }
  return {
    async load():Promise<RoadmapEntry[]> {
      await queue.catch(()=>{});
      if(pending) await confirmPending();
      const response=await fetcher(endpoint,{cache:"no-store",credentials:"same-origin"});
      const data=await response.json();
      if(!response.ok || !Array.isArray(data.items) || (data.revision!==null && (!Number.isSafeInteger(data.revision) || data.revision<1))) throw new Error("Roadmap loading failed");
      revision=data.revision;loaded=true;
      return data.items;
    },
    save(items:RoadmapEntry[]):Promise<void> {
      // Serialize now: edits to the caller's objects must not alter queued data.
      const serialized=JSON.stringify(items);
      const result=queue.catch(()=>{}).then(async()=>{
        if(!loaded) throw new Error("Load the roadmap before editing");
        if(pending) {
          const same=JSON.stringify(pending.items)===serialized;
          await confirmPending();
          if(same)return;
        }
        pending={items:JSON.parse(serialized),revision,requestId:crypto.randomUUID()};
        await confirmPending();
      });
      queue=result;
      return result;
    },
  };
}
