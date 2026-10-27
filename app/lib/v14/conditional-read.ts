import { readLibrary, type LibraryReader } from "./read-library";

export const validChangeToken = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{32}$/i.test(value);

/** Revalidate against the database on every activation. An unchanged response
 * is permission to reuse an already validated in-memory snapshot, never a TTL
 * cache or permission to serve data when authentication/database checks fail. */
export async function conditionalRead(
  reader: LibraryReader & { manifest(id: string): Promise<unknown> },
  libraryId: string,
  token: string,
) {
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(libraryId)) throw new Error("Invalid library identity");
  if (!validChangeToken(token)) throw new Error("Invalid change token");
  const owner = await reader.authenticatedOwner();
  if (!owner) throw new Error("Authentication required");
  const value = await reader.manifest(libraryId);
  const manifest = value as { owner_id?: string; library_id?: string; change_token?: string; observed_at?: string } | null;
  if (!manifest || manifest.owner_id !== owner || manifest.library_id !== libraryId ||
      !validChangeToken(manifest.change_token) || typeof manifest.observed_at !== "string" ||
      !Number.isFinite(Date.parse(manifest.observed_at))) throw new Error("Invalid fresh library manifest");
  if (manifest.change_token === token) return {
    unchanged: true as const, owner_id: owner, library_id: libraryId,
    change_token: token, observed_at: manifest.observed_at,
  };
  return readLibrary({ ...reader, authenticatedOwner: async () => owner }, libraryId);
}
