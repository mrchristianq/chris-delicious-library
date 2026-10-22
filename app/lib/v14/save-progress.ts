import { readLibrary, type LibraryReader } from "./read-library";

export type EpisodeChange = { episode_id: string; revision: number | null; watched: boolean; watched_at: string | null };
export type ProgressWriter = LibraryReader & {
  write(libraryId: string, requestId: string, changes: EpisodeChange[]): Promise<unknown>;
};
type SavedProgress = EpisodeChange & { library_id: string; revision: number };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sameTime = (a: string | null, b: string | null) => a === b || (a !== null && b !== null && Date.parse(a) === Date.parse(b));

export async function saveEpisodeProgress(writer: ProgressWriter, libraryId: string, requestId: string, changes: EpisodeChange[]) {
  if (!uuid.test(libraryId) || !uuid.test(requestId) || !Array.isArray(changes) || changes.length < 1 || changes.length > 1000) throw new Error("Invalid episode save");
  const ids = new Set<string>();
  for (const change of changes) {
    if (!uuid.test(change.episode_id) || ids.has(change.episode_id) || typeof change.watched !== "boolean" ||
      (change.revision !== null && (!Number.isSafeInteger(change.revision) || change.revision < 1)) ||
      (change.watched_at !== null && (!change.watched || !Number.isFinite(Date.parse(change.watched_at))))) throw new Error("Invalid episode change");
    ids.add(change.episode_id);
  }
  const owner = await writer.authenticatedOwner();
  if (!owner) throw new Error("Authentication required");
  const saved = await writer.write(libraryId, requestId, changes);
  if (!Array.isArray(saved) || saved.length !== changes.length) throw new Error("Save not confirmed: incomplete write response");
  const receipts = new Map<string, SavedProgress>();
  for (const receipt of saved as SavedProgress[]) {
    if (!receipt || !ids.has(receipt.episode_id) || receipts.has(receipt.episode_id) || receipt.library_id !== libraryId || !Number.isSafeInteger(receipt.revision)) throw new Error("Save not confirmed: invalid receipt");
    receipts.set(receipt.episode_id, receipt);
  }
  const snapshot = await readLibrary(writer, libraryId);
  if (snapshot.owner_id !== owner) throw new Error("Save not confirmed: session changed");
  const episodes = new Map(snapshot.episodes.map(episode => [episode.id, episode]));
  for (const change of changes) {
    const receipt = receipts.get(change.episode_id)!;
    const progress = episodes.get(change.episode_id)?.progress;
    if (receipt.revision !== (change.revision ?? 0) + 1 || receipt.watched !== change.watched || !sameTime(receipt.watched_at, change.watched_at) ||
        !progress || progress.revision !== receipt.revision || progress.watched !== change.watched || !sameTime(progress.watched_at, change.watched_at)) {
      throw new Error("Save not confirmed: episode readback mismatch; reload before retrying");
    }
  }
  return { requestId, confirmed: true as const, snapshot };
}
