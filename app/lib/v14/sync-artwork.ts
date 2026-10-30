import type { EditorArtworkDraft } from "./editor-layout";
import type { ActivityContext } from "./activity-context";
import type { LibraryBackend } from "./backend-context";

/** Display parsers can invent a local fallback filename even when no image was
 * supplied. It is not an upload source. Keep real artwork and explicit requests
 * intact so an actual upload failure still reports failure rather than success. */
export function automaticArtworkSources(
  item: Record<string, unknown>,
  sources: { cover: string; backdrop: string },
  explicitCover = "",
) {
  const override = explicitCover.trim();
  const cover = override || sources.cover;
  const fallback = String(item.posterUrlFallback ?? "").trim();
  return { cover: !override && fallback && cover === fallback ? "" : cover, backdrop: sources.backdrop };
}

/** Match the existing Edit forms' source fields, not the displayed R2 cover.
 * Unrelated edits must not re-upload provider artwork over a custom cover. */
export function editedArtworkSources(
  mediaType: "book" | "movie" | "tv" | "game",
  original: Record<string, unknown>,
  updates: Record<string, string>,
) {
  const coverKey = mediaType === "book" ? "imageUrl" : mediaType === "game" ? "coverUrl" : "posterUrl";
  const coverAliases = mediaType === "book" ? ["imageUrl", "ImageURL", "Image URL", "Image"]
    : mediaType === "game" ? ["coverUrl", "CoverURL"] : ["posterUrl", "PosterURL"];
  const changed = (key: string, aliases: string[]) => {
    if (!Object.hasOwn(updates, key)) return "";
    const next = updates[key].trim();
    const previous = aliases.map(alias => String(original[alias] ?? "").trim()).find(Boolean) ?? "";
    return next && next !== previous ? next : "";
  };
  return {
    cover: changed(coverKey, coverAliases),
    backdrop: mediaType === "book" ? "" : changed("backdropUrl", ["backdropUrl", "BackdropURL"]),
  };
}

/** Artwork associations advance item revisions. Always use the confirmed
 * result of the cover save for the subsequent backdrop, never the old editor. */
export async function syncDatabaseArtwork(
  backend: Pick<LibraryBackend, "artwork">,
  item: Record<string, unknown>,
  sources: { cover: File | string; backdrop: File | string },
  onConfirmed: (row: Record<string, string>, kind: "cover" | "backdrop") => Record<string, unknown>,
  activity?: ActivityContext,
) {
  let current = item;
  let context=activity;
  let coverUrl = String(item.r2CoverUrl || item.R2CoverUrl || "");
  for (const kind of ["cover", "backdrop"] as const) {
    const source = sources[kind];
    const existing = kind === "cover" ? coverUrl : String(current.r2BackdropUrl || current.R2BackdropUrl || "");
    if (!source || source === existing) continue;
    const row = await backend.artwork(current, source, kind,context);
    if(row.__cdlActivityId)context={id:row.__cdlActivityId,role:"artwork"};
    current = onConfirmed(row, kind);
    if (kind === "cover") coverUrl = row.R2CoverUrl;
  }
  return coverUrl;
}

/** Keep a failed artwork continuation across the existing editor's prop reset.
 * Confirmed text/cover changes are not replayed or silently treated as an entirely
 * successful save. The backend still checks the last confirmed item revision. */
export function createDatabaseEditSaver(
  backend: Pick<LibraryBackend, "edit" | "artwork"> & Partial<Pick<LibraryBackend, "storage">>,
  apply: (type: "book" | "movie" | "tv" | "game", row: Record<string, string>) => Record<string, unknown>,
) {
  type Pending = { current: Record<string, unknown>; sources: { cover: File | string; backdrop: File | string }; activityId?:string };
  const unfinished = new Map<string, Pending>();
  return async (type: "book" | "movie" | "tv" | "game", item: Record<string, unknown>, updates: Record<string, string>, artwork?: EditorArtworkDraft, activityId?: string) => {
    const identity = item.__cdlIdentity as { itemId?: string; libraryId?: string; revision?: number } | undefined;
    if (!identity?.itemId || !identity.libraryId) throw new Error("Missing database item identity. Reload before saving.");
    const key = JSON.stringify([identity.libraryId, type, identity.itemId]);
    const journalKey = `artwork-retry:v1:${key}`;
    let previous = unfinished.get(key);
    if (!previous && backend.storage) {
      const raw = backend.storage.getItem(journalKey);
      if (raw !== null) {
        let entry;
        try { entry = JSON.parse(raw); } catch { throw new Error("Artwork retry record is unreadable; save was not confirmed."); }
        if (entry?.version !== 1 || !Number.isSafeInteger(entry.revision) || entry.revision < 1
          || (entry.activityId !== undefined && (typeof entry.activityId !== "string" || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(entry.activityId)))
          || (entry.fileKinds !== undefined && (!Array.isArray(entry.fileKinds) || entry.fileKinds.some((kind:unknown)=>kind!=="cover")))
          || typeof entry.sources?.cover !== "string" || typeof entry.sources?.backdrop !== "string") {
          throw new Error("Artwork retry record is invalid; save was not confirmed.");
        }
        if (entry.revision !== identity.revision) {
          // Only an explicit replacement/clear of every unfinished source may
          // supersede an old intent after another writer advanced the revision.
          const coverKey = type === "book" ? "imageUrl" : type === "game" ? "coverUrl" : "posterUrl";
          if (((entry.sources.cover || entry.fileKinds?.includes("cover")) && !Object.hasOwn(updates, coverKey) && !artwork?.cover)
            || (entry.sources.backdrop && !Object.hasOwn(updates, "backdropUrl"))) {
            throw new Error("Artwork retry conflicts with a newer item revision. Re-select or clear the unfinished artwork sources before saving.");
          }
          backend.storage.removeItem(journalKey);
        } else {
          if (entry.fileKinds?.length && !artwork?.cover) throw new Error("Choose the custom artwork file again to finish this saved item. No duplicate item was added.");
          previous = { current: item, sources: entry.sources,activityId:entry.activityId };
        }
      }
    }
    const sources = previous ? { ...previous.sources } : editedArtworkSources(type, item, updates);
    if (previous) {
      // A deliberate new source/clear supersedes only that pending source.
      const coverKey = type === "book" ? "imageUrl" : type === "game" ? "coverUrl" : "posterUrl";
      if (Object.hasOwn(updates, coverKey)) sources.cover = updates[coverKey].trim();
      if (type !== "book" && Object.hasOwn(updates, "backdropUrl")) sources.backdrop = updates.backdropUrl.trim();
    }
    if (artwork?.cover) sources.cover = artwork.cover;
    if (artwork?.backdrop) sources.backdrop = artwork.backdrop;
    const saved = apply(type, await backend.edit(previous?.current ?? item, updates));
    const pending: Pending = { current: saved, sources,activityId:typeof saved.__cdlActivityId==="string"?saved.__cdlActivityId:activityId ?? previous?.activityId };
    unfinished.set(key, pending);
    // This owner/library-scoped journal stores retry intent only, never a cached
    // item/notes or an authoritative read. The backend still requires fresh
    // confirmation and matching revisions; nothing runs automatically on load.
    const remember = () => {
      if (!backend.storage) return;
      const revision = (pending.current.__cdlIdentity as { revision?: number } | undefined)?.revision;
      if (!Number.isSafeInteger(revision)) throw new Error("Artwork retry revision is missing.");
      backend.storage.setItem(journalKey, JSON.stringify({ version: 1, revision, sources: {cover:typeof pending.sources.cover==="string"?pending.sources.cover:"",backdrop:typeof pending.sources.backdrop==="string"?pending.sources.backdrop:""},...(pending.sources.cover instanceof File?{fileKinds:["cover"]}:{}),activityId:pending.activityId }));
    };
    try {
      if (sources.cover || sources.backdrop) remember();
      await syncDatabaseArtwork(backend, saved, sources, (row, kind) => {
        if (row.__cdlActivityId) pending.activityId = row.__cdlActivityId;
        pending.current = apply(type, row);
        pending.sources[kind] = "";
        remember();
        return pending.current;
      },pending.activityId?{id:pending.activityId,role:"artwork"}:undefined);
      backend.storage?.removeItem(journalKey);
      unfinished.delete(key);
      return pending.current;
    } catch (error) {
      throw new Error(`Item changes saved, but artwork was not confirmed: ${error instanceof Error ? error.message : "Please retry artwork sync."}`);
    }
  };
}

/** Add retries use the confirmed item's identity after a partial artwork save.
 * A failed upload must never cause another create request for the same editor. */
export function createDatabaseAddSaver(
  backend: Pick<LibraryBackend,"create">,
  apply: Parameters<typeof createDatabaseEditSaver>[1],
  save: ReturnType<typeof createDatabaseEditSaver>,
) {
  // Per-mounted backend/editor, never keyed by title or shared between accounts.
  const pendingCreates=new WeakMap<Record<string,unknown>,{current:Record<string,unknown>;values:Record<string,string>;activityId?:string}>();
  return async (type:"book"|"movie"|"tv"|"game",item:Record<string,unknown>,values:Record<string,string>,artwork?:EditorArtworkDraft) => {
    let pending=pendingCreates.get(item);
    let createdNow=false;
    if(!item.__cdlIdentity && !pending) {
      const row=await backend.create(type,values);
      pending={current:apply(type,row),values:{...values},activityId:row.__cdlActivityId};
      pendingCreates.set(item,pending);
      createdNow=true;
    }
    const current=item.__cdlIdentity?item:pending!.current;
    // The Add form can still hold its original draft after creation. Do not
    // replay unchanged provider URLs over a pending custom upload on retry.
    const updates=createdNow?{}:pending?Object.fromEntries(Object.entries(values).filter(([key,value])=>pending!.values[key]!==value)):values;
    const cover=type==="book"?values.imageUrl:type==="game"?values.coverUrl:values.posterUrl;
    const backdrop=type==="book"?"":type==="game"?values.screenshotsUrl?.split(",")[0]?.trim():values.backdropUrl;
    const confirmed=await save(type,current,updates,createdNow?{cover,backdrop,...artwork}:artwork,pending?.activityId);
    pendingCreates.delete(item);
    return confirmed;
  };
}
