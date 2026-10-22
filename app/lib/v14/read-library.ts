import { projectLibrarySnapshot, type LibrarySnapshot } from "./library-snapshot";

export type LibraryReader = {
  authenticatedOwner(): Promise<string | null>;
  snapshot(libraryId: string): Promise<unknown>;
};

/** No cache or old-data fallback. Every call authenticates and obtains one fresh
 * database snapshot. The RPC independently authorizes the requested library. */
export async function readLibrary(reader: LibraryReader, libraryId: string): Promise<LibrarySnapshot> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(libraryId)) throw new Error("Invalid library identity");
  const owner = await reader.authenticatedOwner();
  if (!owner) throw new Error("Authentication required");
  const result = await reader.snapshot(libraryId);
  // Validation is all-or-nothing; nothing reaches the UI until it succeeds.
  projectLibrarySnapshot(result as LibrarySnapshot, owner, libraryId);
  return result as LibrarySnapshot;
}
