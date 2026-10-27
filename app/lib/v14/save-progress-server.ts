import { createV14Client } from "./server";
import { saveEpisodeProgress, saveEpisodeProgressWithReadback, type EpisodeChange } from "./save-progress";
import { readBoundedSnapshot } from "./bounded-snapshot";

// Internal server helper, not a public Server Action or alternate editor.
export async function saveV14EpisodeProgress(libraryId: string, requestId: string, changes: EpisodeChange[], targeted = false) {
  const client = await createV14Client();
  const readback = targeted ? async (id:string,keys:string[],episodes:string[]) => {
    const {data,error}=await client.rpc("cdl_v14_save_readback",{p_library_id:id,p_setting_keys:keys,p_episode_ids:episodes});
    if(error?.code==="PGRST202")return null; // Old database: verified full read during rollout.
    if(error)throw new Error("Independent save readback failed");
    return data;
  } : undefined;
  return (targeted ? saveEpisodeProgressWithReadback : saveEpisodeProgress)({
    readback,
    async authenticatedOwner() {
      const { data, error } = await client.auth.getUser();
      return error ? null : data.user?.id ?? null;
    },
    async write(id, request, input) {
      const { data, error } = await client.rpc("cdl_v14_save_episode_progress", { p_library_id: id, p_request_id: request, p_changes: input });
      if (error) throw new Error("Episode save not confirmed. Keep the request ID for a safe retry.");
      return data;
    },
    async snapshot(id) {
      return readBoundedSnapshot((name, args) => client.rpc(name, args), id);
    },
  }, libraryId, requestId, changes);
}
