import { createV14Client } from "./server";
import { saveEpisodeProgress, type EpisodeChange } from "./save-progress";
import { readBoundedSnapshot } from "./bounded-snapshot";

// Internal server helper, not a public Server Action or alternate editor.
export async function saveV14EpisodeProgress(libraryId: string, requestId: string, changes: EpisodeChange[]) {
  const client = await createV14Client();
  return saveEpisodeProgress({
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
