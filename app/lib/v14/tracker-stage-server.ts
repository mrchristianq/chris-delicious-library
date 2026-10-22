import type {createV14Client} from "./server";
import {readBoundedSnapshot} from "./bounded-snapshot";
import {stageTrackerRun} from "./tracker-stage-run";
import type {TrackerRunManifest} from "./tracker-run-manifest";

export function stageTrackerRunForClient(client:Awaited<ReturnType<typeof createV14Client>>,manifest:TrackerRunManifest,requestId:string){
  return stageTrackerRun({
    async authenticatedOwner(){const {data,error}=await client.auth.getUser();return error?null:data.user?.id??null;},
    async snapshot(id){return readBoundedSnapshot((name,args)=>client.rpc(name,args),id);},
    async write(libraryId,key,revision,requestId,value){
      const {data,error}=await client.rpc("cdl_v14_save_setting",{p_library_id:libraryId,p_key:key,p_revision:revision,p_request_id:requestId,p_value:{value}});
      if(error)throw new Error("Run preparation not confirmed");return data;
    },
  },manifest,requestId);
}
