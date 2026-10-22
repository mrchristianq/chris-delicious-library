import type { V14Item } from "./items";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const text = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const titleToken = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const platformToken = (value: unknown) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
type Fields = Record<string, unknown>;

/** No change to v13 items: only database-tagged rows have a stable key. */
export function stableItemKey(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const item = value as Fields;
  const identity = item.__cdlIdentity as Fields | undefined;
  const id = text(identity?.itemId ?? item.__cdlItemId);
  const library = text(identity?.libraryId ?? item.__cdlLibraryId);
  const type = text(identity?.mediaType ?? item.__cdlMediaType);
  if (!uuid.test(id) || !uuid.test(library) || !["book", "movie", "tv", "game"].includes(type)) return null;
  return `${type}:db:${library}:${id}`;
}

function aliases(fields: Fields, type: V14Item["media_type"]): string[] {
  const title = titleToken(fields.title || fields.Title || fields.name);
  if (!title) return [];
  if (type === "game") return [`game:${title}:${platformToken(fields.__renderPlatform || fields.platform || fields.Platform) || "default"}`];
  if (type === "book") {
    const tokens = text(fields.types || fields.Types || fields.type || fields.Type).toLowerCase().split(/[,;|/]+/).map(t => t.trim()).filter(Boolean);
    const format = tokens.includes("audiobook") ? "audiobook" : tokens.some(t => t === "ebook" || t === "e-book") ? "ebook" : tokens.includes("physical") ? "physical"
      : tokens.length ? platformToken(tokens[0]) : text(fields.audiobookDuration || fields.AudiobookDuration) ? "audiobook" : "default";
    return [`book:${title}:${format}`, `book:${title}`];
  }
  const id = text(fields.tmdbId || fields.TMDB_ID);
  const date = titleToken(fields.releaseDate || fields.ReleaseDate || fields.firstAirDate || fields.FirstAirDate || fields["First Air Date"] || fields.year || fields.Year) || "unknown";
  return [...(id ? [`${type}:tmdb:${id}`] : []), `${type}:${title}:${date}`, `${type}:${title}`];
}

/** Imported metadata retains original spreadsheet keys; full edits overlay
 * user_fields. Register both original and current aliases without guessing when
 * distinct records collide (including different editions of the same title).
 */
export function legacyKeyResolver(items: V14Item[], libraryId: string) {
  const candidates = new Map<string, Set<string>>();
  for (const item of items) {
    const target = stableItemKey({ __cdlItemId: item.id, __cdlLibraryId: libraryId, __cdlMediaType: item.media_type });
    if (!target) throw new Error("Invalid stable item identity");
    const keys = [...aliases(item.metadata, item.media_type), ...aliases({ ...item.metadata, ...item.user_fields, Title: item.title, title: item.title }, item.media_type)];
    for (const key of keys) {
      const matches = candidates.get(key) ?? new Set<string>();
      matches.add(target); candidates.set(key, matches);
    }
  }
  return (key: string) => {
    const matches = candidates.get(key);
    return matches?.size === 1 ? [...matches][0] : key;
  };
}

export function reconcileOrderValue(key: string, value: string, resolveKey: (key: string) => string): string {
  if (!key.startsWith("viewManualOrder:") && !key.startsWith("smartListManualOrder:")) return value;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed) || !parsed.every(entry => typeof entry === "string")) return value;
    return JSON.stringify([...new Set(parsed.map(resolveKey))]);
  } catch { return value; }
}
