import { createV14Client } from "./server";
import { readLibrary } from "./read-library";
import { readBoundedSnapshot } from "./bounded-snapshot";

export async function readV14Library(libraryId: string) {
  const client = await createV14Client();
  return readWithClient(client, async () => {
    const { data, error } = await client.auth.getUser();
    return error ? null : data.user?.id ?? null;
  }, libraryId);
}

/** Server render only: reuse the user already verified on this same request.
 * No identity/snapshot cache. RPC authorization and owner projection still run.
 * API callers use readV14Library above and authenticate independently. */
export async function readV14LibraryForVerifiedOwner(
  client: Awaited<ReturnType<typeof createV14Client>>,
  ownerId: string | null,
  libraryId: string,
) {
  return readWithClient(client, async () => ownerId, libraryId);
}

function readWithClient(
  client: Awaited<ReturnType<typeof createV14Client>>,
  authenticatedOwner: () => Promise<string | null>,
  libraryId: string,
) {
  return readLibrary({
    authenticatedOwner,
    async snapshot(id) {
      return readBoundedSnapshot((name, args) => client.rpc(name, args), id);
    },
  }, libraryId);
}
