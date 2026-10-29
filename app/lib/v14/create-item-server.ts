import type {ActivityContext} from "./activity-context";
import { createV14Client } from "./server";
import { createItem, type CreateInput } from "./create-item";

// Internal only. Existing Add modals will supply the retained prepared request.
export async function createV14Item(input: CreateInput,activity?:ActivityContext) {
  if(activity && activity.role!=="user")throw new Error("Creation must start an activity");
  const client = await createV14Client();
  return createItem({
    async authenticate() { const {data,error}=await client.auth.getUser(); return !error && Boolean(data.user); },
    async write(value) {
      const {data,error}=await client.rpc(activity?"cdl_v14_create_item_activity":"cdl_v14_create_item",{
        p_library_id:value.libraryId,p_id:value.itemId,p_request_id:value.requestId,p_media_type:value.mediaType,p_patch:value.patch,
        ...(activity?{p_activity_id:activity.id}:{}),
      });
      if (error) throw new Error("Add not confirmed. Retry with the same request ID.");
      return data;
    },
    async read(id) {
      const {data,error}=await client.rpc("cdl_v14_get_item",{p_id:id});
      if (error) throw new Error("Add readback unavailable");
      return data;
    },
  },input);
}
