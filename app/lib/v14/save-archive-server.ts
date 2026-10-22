import { createV14Client } from "./server";
import { saveArchive } from "./save-archive";

// Internal backend helper only. No new UI or production routing is enabled.
export async function saveV14Archive(id: string, revision: number, requestId: string, archived: boolean) {
  const client = await createV14Client();
  return saveArchive({
    async authenticate() {
      const { data, error } = await client.auth.getUser();
      return !error && Boolean(data.user);
    },
    async write(itemId, expectedRevision, request, archive) {
      const { data, error } = await client.rpc("cdl_v14_set_archived", {
        p_id: itemId, p_revision: expectedRevision, p_request_id: request, p_archived: archive,
      });
      if (error) throw new Error("Archive not confirmed. Reload or retry with the same request ID.");
      return data;
    },
    async read(itemId) {
      const { data, error } = await client.rpc("cdl_v14_archive_state", { p_id: itemId });
      if (error) throw new Error("Archive readback unavailable");
      return data;
    },
  }, id, revision, requestId, archived);
}
