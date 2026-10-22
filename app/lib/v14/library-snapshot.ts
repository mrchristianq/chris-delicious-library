import type { V14Item } from "./items";
import { projectLegacyRow } from "./legacy-row";

export type SnapshotItem = V14Item & { library_id: string };
export type SnapshotEpisode = {
  id: string; library_id: string; show_id: string; season_number: number; episode_number: number;
  provider_id: string | null; metadata: Record<string, unknown>;
  progress: null | { watched: boolean; watched_at: string | null; revision: number };
};
export type SnapshotSetting = {
  key: string; revision: number;
  value: { value: unknown; legacy_profiles?: Record<string, unknown> };
};
export type LibrarySnapshot = {
  schema_version: 1; library_id: string; owner_id: string; observed_at: string;
  change_token: string; complete: true;
  counts: { items: number; episodes: number; settings: number };
  items: SnapshotItem[]; episodes: SnapshotEpisode[]; settings: SnapshotSetting[];
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const scalar = (value: unknown): string => {
  if (value == null) return "";
  if (!["string", "number", "boolean"].includes(typeof value)) throw new Error("Unsupported legacy cell value");
  return String(value);
};

/** Validate the entire response before returning any renderer inputs.
 * Ownership must ALSO be enforced by the authenticated database RPC.
 * There is deliberately no partial-page or cached-data fallback here.
 */
export function projectLibrarySnapshot(snapshot: LibrarySnapshot, ownerId: string, libraryId: string) {
  if (!snapshot || snapshot.schema_version !== 1 || snapshot.complete !== true ||
      !uuid.test(ownerId) || !uuid.test(libraryId) || snapshot.owner_id !== ownerId || snapshot.library_id !== libraryId ||
      !snapshot.change_token || !Number.isFinite(Date.parse(snapshot.observed_at))) throw new Error("Invalid library snapshot");
  for (const key of ["items", "episodes", "settings"] as const) {
    if (!Array.isArray(snapshot[key]) || snapshot.counts?.[key] !== snapshot[key].length) throw new Error("Incomplete library snapshot");
  }
  const itemIds = new Set<string>();
  const shows = new Map<string, SnapshotItem>();
  const items = snapshot.items.map(item => {
    if (item.library_id !== libraryId || itemIds.has(item.id)) throw new Error("Mixed library or duplicate item");
    itemIds.add(item.id);
    if (item.media_type === "tv") shows.set(item.id, item);
    return { mediaType: item.media_type, ...projectLegacyRow(item, libraryId) };
  });
  const episodeIds = new Set<string>();
  const episodeSlots = new Set<string>();
  const episodes = snapshot.episodes.map(episode => {
    const show = shows.get(episode.show_id);
    const slot = `${episode.show_id}:${episode.season_number}:${episode.episode_number}`;
    if (!uuid.test(episode.id) || episode.library_id !== libraryId || !show || episodeIds.has(episode.id) || episodeSlots.has(slot) ||
        !Number.isSafeInteger(episode.season_number) || episode.season_number < 0 ||
        !Number.isSafeInteger(episode.episode_number) || episode.episode_number < 0) throw new Error("Invalid episode identity");
    episodeIds.add(episode.id); episodeSlots.add(slot);
    const progress = episode.progress;
    if (progress !== null && (!progress || typeof progress.watched !== "boolean" || !Number.isSafeInteger(progress.revision) || progress.revision < 1 ||
        (progress.watched_at !== null && !Number.isFinite(Date.parse(progress.watched_at))))) throw new Error("Invalid episode progress");
    const row: Record<string, string> = {};
    for (const [key, value] of Object.entries(episode.metadata)) {
      if (!key.startsWith("_") && !["constructor", "prototype"].includes(key) && (value == null || ["string", "number", "boolean"].includes(typeof value))) row[key] = scalar(value);
    }
    // Parent identity and progress always override potentially stale import metadata.
    row.ShowTitle = show.title;
    row.ShowTMDB_ID = scalar(show.metadata.TMDB_ID);
    row.SeasonNumber = String(episode.season_number);
    row.EpisodeNumber = String(episode.episode_number);
    row.EpisodeTMDB_ID = episode.provider_id ?? "";
    row.Watched = progress === null ? "" : String(progress.watched);
    row.WatchedAt = progress?.watched_at ?? "";
    return { row, identity: { episodeId: episode.id, showId: episode.show_id, libraryId, progressRevision: progress?.revision ?? null } };
  });
  const settings = new Map<string, SnapshotSetting>();
  for (const setting of snapshot.settings) {
    if (!setting.key || settings.has(setting.key) || !Number.isSafeInteger(setting.revision) || setting.revision < 1 || !setting.value || !Object.hasOwn(setting.value, "value")) throw new Error("Invalid setting");
    settings.set(setting.key, structuredClone(setting));
  }
  return {
    items, episodes, observedAt: snapshot.observed_at, changeToken: snapshot.change_token,
    // Keep consumer-specific imported behavior; do not flatten these profiles.
    settingValue(key: string, consumer = "general_getSetting"): unknown {
      const setting = settings.get(key);
      if (!setting) return undefined;
      const profiles = setting.value.legacy_profiles;
      return structuredClone(profiles && Object.hasOwn(profiles, consumer) ? profiles[consumer] : setting.value.value);
    },
  };
}
