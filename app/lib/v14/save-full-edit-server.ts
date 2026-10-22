import { createV14Client } from "./server";
import { saveFullEdit } from "./save-full-edit";
import type { V14Item } from "./items";

// Internal helper only; existing UI must supply its stable database identity.
export async function saveV14FullEdit(item: V14Item, requestId: string, values: Record<string,string>) {
  const client=await createV14Client();
  return saveFullEdit({
    async authenticate() { const {data,error}=await client.auth.getUser();return !error && Boolean(data.user); },
    async write(id,revision,request,patch) {
      const {data,error}=await client.rpc("cdl_v14_full_edit",{p_id:id,p_revision:revision,p_request_id:request,p_patch:patch});
      if(error)throw new Error("Edit not confirmed. Reload or retry with the same request ID.");
      return data;
    },
    async read(id) {
      const {data,error}=await client.rpc("cdl_v14_get_item",{p_id:id});
      if(error)throw new Error("Edit readback unavailable");
      return data;
    },
  },item,requestId,values);
}
