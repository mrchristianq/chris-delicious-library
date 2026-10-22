import type { V14Item } from "./items";

export type LegacyProjection = {
  row: Record<string, string>;
  identity: Readonly<{ itemId: string; libraryId: string; revision: number }>;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const dateAliases = ["Completed Date", "Date Completed", "CompletedDate", "Completd Date", "CompletdDate", "DateCompleted", "completedDate", "dateCompleted", "WatchDate", "Watch Date", "Date Watched", "watchDate"];

/** Pure input adapter for the ORIGINAL v13 row parsers; not a replacement renderer.
 * Identity stays separate until the parser boundary explicitly propagates it.
 * This function does not authenticate, fetch a snapshot, or perform writes.
 */
export function projectLegacyRow(item: V14Item, libraryId: string): LegacyProjection {
  if (!uuid.test(libraryId) || !uuid.test(item.id) || !Number.isSafeInteger(item.revision) || item.revision < 1) {
    throw new Error("Missing or invalid database identity");
  }
  if (!["book", "movie", "tv", "game"].includes(item.media_type)) throw new Error("Unsupported media type");
  if (item.completed_on !== null) {
    const date = item.completed_on;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) {
      throw new Error("Invalid canonical completion date");
    }
  }
  const maxRating = item.media_type === "book" ? 5 : 10;
  if (item.personal_rating !== null && (!Number.isFinite(item.personal_rating) || item.personal_rating < 0 || item.personal_rating > maxRating)) {
    throw new Error("Invalid canonical personal rating");
  }
  const row: Record<string, string> = {};
  // Imported metadata uses the original spreadsheet headers. Private provenance
  // and nested payloads are deliberately not leaked into renderer inputs.
  for (const fields of [item.metadata, item.user_fields]) {
    for (const [key, value] of Object.entries(fields)) {
      if (key.startsWith("_") || ["__proto__", "constructor", "prototype"].includes(key)) continue;
      if (value === null) row[key] = "";
      else if (["string", "number", "boolean"].includes(typeof value)) row[key] = String(value);
    }
  }
  // The import preserves evaluated Sheet cells, including numeric date serials.
  // The unchanged v13 parser expects the formatted Date Added cell. Normalize
  // this known date column only, after explicit user overrides (including clears).
  // Ignore fractional time, as the original Sheet formats this as a calendar day.
  const added = row["Date Added"];
  if (added && /^\d{5}(?:\.\d+)?$/.test(added)) {
    const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(added)) * 86400000);
    row["Date Added"] = `${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
  }
  const set = (keys: string[], value: string) => { for (const key of keys) row[key] = value; };
  set(["Title", "title"], item.title);
  set(["Notes", "notes"], item.notes);
  set(["My Rating", "MyRating", "myRating"], item.personal_rating === null ? "" : String(item.personal_rating));
  // The original book details formatter parses ISO dates as UTC instants and
  // formats them locally. Give that unchanged parser a local calendar cell,
  // matching the formatted Book Sheet, without changing canonical storage.
  const [year, month, day] = (item.completed_on ?? "").split("-");
  const completedCell = item.media_type === "book" && item.completed_on
    ? `${Number(month)}/${Number(day)}/${year}` : item.completed_on ?? "";
  set(dateAliases, completedCell);
  const status = item.user_status ?? "";
  if (item.media_type === "book" || item.media_type === "game") set(["Status", "status"], status);
  if (item.media_type === "game") {
    set(["PlayStatus", "playStatus", "gameStatus"], status);
    set(["Completed", "completed"], !status.trim() ? "" : ["completed", "done", "beaten", "finished"].includes(status.trim().toLowerCase()) ? "true" : "false");
  }
  if (item.media_type === "movie" || item.media_type === "tv") {
    set(["WatchStatus", "Watch Status", "watchStatus"], status);
    set(["Watched", "watched"], !status.trim() ? "" : ["watched", "completed", "true", "yes", "1"].includes(status.trim().toLowerCase()) ? "true" : "false");
    // Status is provider release/production metadata, NOT viewing progress.
  }
  return { row, identity: Object.freeze({ itemId: item.id, libraryId, revision: item.revision }) };
}
