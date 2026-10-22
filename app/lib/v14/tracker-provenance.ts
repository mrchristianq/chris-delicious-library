export type TrackerProvenance={itemId:string;sourceId:string;primary:boolean;media:"book"|"movie"|"tv"|"game";title:string;edition:string;provider:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateTrackerProvenance(data:unknown,ownerId:string,libraryId:string):TrackerProvenance[]{
  if(!data||typeof data!=="object")throw new Error("Invalid tracker provenance");
  const value=data as Record<string,unknown>;
  if(value.ownerId!==ownerId||value.libraryId!==libraryId||!Array.isArray(value.entries)||value.entries.length>10000)throw new Error("Wrong tracker provenance owner or library");
  const seen=new Set<string>();
  return value.entries.map(entry=>{
    if(!entry||typeof entry!=="object"||!uuid.test(entry.itemId)||!uuid.test(entry.sourceId)||typeof entry.primary!=="boolean"||!["book","movie","tv","game"].includes(entry.media)||['title','edition','provider'].some(key=>typeof entry[key]!=="string"||entry[key].length>2000)||seen.has(entry.sourceId))throw new Error("Ambiguous tracker provenance");
    seen.add(entry.sourceId);return entry as TrackerProvenance;
  });
}
export async function readTrackerProvenance(client:{rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>},ownerId:string,libraryId:string){
  const {data,error}=await client.rpc("cdl_v14_tracker_provenance",{p_library_id:libraryId});
  if(error)throw new Error("Fresh tracker provenance unavailable");
  return validateTrackerProvenance(data,ownerId,libraryId);
}
