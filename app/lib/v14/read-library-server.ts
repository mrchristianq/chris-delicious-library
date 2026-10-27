import { createV14Client } from "./server";
import { readLibrary } from "./read-library";
import { readBoundedSnapshot, readBoundedRendererSnapshot } from "./bounded-snapshot";

export async function readV14Library(libraryId: string, renderer = false) {
  const client = await createV14Client();
  return readWithClient(client, async () => {
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user?.id ?? null;
  }, libraryId, renderer);
}

/** Server render only: reuse the user already verified on this same request.
 * No identity/snapshot cache. RPC authorization and owner projection still run.
 * API callers use readV14Library above and authenticate independently. */
export async function readV14LibraryForVerifiedOwner(
  client: Awaited<ReturnType<typeof createV14Client>>,
  ownerId: string | null,
  libraryId: string,
  renderer = false,
) {
  return readWithClient(client, async () => ownerId, libraryId, renderer);
}

function readWithClient(
  client: Awaited<ReturnType<typeof createV14Client>>,
  authenticatedOwner: () => Promise<string | null>,
  libraryId: string,
  renderer = false,
) {
  return readLibrary({
    authenticatedOwner,
    async snapshot(id) {
      return (renderer ? readBoundedRendererSnapshot : readBoundedSnapshot)((name, args) => client.rpc(name, args), id);
    },
  }, libraryId);
}

/** No-store, owner-authenticated revision check before another full transfer. */
export async function revalidateV14Library(libraryId: string, token: string) {
  const { conditionalRead } = await import("./conditional-read");
  const client = await createV14Client();
  return conditionalRead({
    authenticatedOwner: async () => {
      const { data, error } = await client.auth.getUser();
      return error ? null : data.user?.id ?? null;
    },
    manifest: async id => {
      const { data, error } = await client.rpc("cdl_v14_snapshot_guard", { p_library_id: id });
      if (error) throw new Error("Fresh library revision check failed");
      return data;
    },
    snapshot: id => readBoundedRendererSnapshot((name, args) => client.rpc(name, args), id),
  }, libraryId, token);
}
