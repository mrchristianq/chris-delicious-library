"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchMediaSearch } from "../lib/mediaSearchClient";
import { MediaEditDialog } from "./MediaEditDialog";
import type { EditorArtworkDraft } from "../lib/v14/editor-layout";
import { editorDelta } from "../lib/v14/editor-delta";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";

type BookDetailsEditModalProps = {
  open: boolean;
  item: Record<string, unknown> | null;
  popupCoverMode?: "custom" | "default";
  isReplacingCover?: boolean;
  replaceCoverError?: string | null;
  onClose: () => void;
  onSave: (item: Record<string, unknown>, updates: Record<string, string>, artwork?: EditorArtworkDraft) => Promise<void> | void;
  onSaved?: () => void;
  onReplaceCover: (item: Record<string, unknown>, file: File) => Promise<void> | void;
  onSyncCoverToR2?: (item: Record<string, unknown>, sourceUrl: string) => Promise<void> | void;
  onCoverModeChange: (item: Record<string, unknown>, mode: "custom" | "default") => void;
  isNew?: boolean;
  isDark?: boolean;
  statusOptions?: Array<{ value: string; label: string }>;
};

type FieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
  options?: readonly string[];
  isDate?: boolean;
  placeholder?: string;
};

type DiffRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  selected: boolean;
};

type BookSyncSource = "audnexus" | "hardcover";
type SyncFieldDef = { key: string; label: string };

const TYPE_OPTIONS = ["Physical", "Audiobook", "eBook"] as const;
const DEFAULT_STATUS_OPTIONS = ["Want to Read", "Reading", "Completed", "Abandoned", "Did Not Finish"] as const;
const OWNERSHIP_OPTIONS = ["Owned", "Wishlist", "Ripped", "Borrowed"] as const;
const BOOK_TYPE_GENRE_VALUES = new Set(["Strategy Guide"]);

// Helper function to create BOOK_FIELDS with dynamic status options
const createBookFields = (statusOptions?: Array<{ value: string; label: string }>): FieldDef[] => {
  const statusLabels = statusOptions?.map(s => s.label) || DEFAULT_STATUS_OPTIONS;
  return [
    { key: "title",              label: "Title" },
    { key: "subtitle",           label: "Subtitle" },
    { key: "series",             label: "Series" },
    { key: "author",             label: "Author" },
    { key: "narrator",           label: "Narrator" },
    { key: "ownership",          label: "Ownership",         options: OWNERSHIP_OPTIONS },
    { key: "type",               label: "Type",              options: TYPE_OPTIONS },
    { key: "status",             label: "Status",            options: statusLabels },
    { key: "completedDate",      label: "Completed Date",    isDate: true },
    { key: "isbn",               label: "ISBN" },
    { key: "releaseDate",        label: "Release Date",      isDate: true },
    { key: "imageUrl",           label: "Image URL" },
    { key: "userRating",         label: "User Rating" },
    { key: "myRating",           label: "My Rating" },
    { key: "pages",              label: "Pages" },
    { key: "audiobookDuration",  label: "Audiobook Duration" },
    { key: "genre",              label: "Genre" },
    { key: "tags",               label: "Tags" },
    { key: "audibleAsin",        label: "Audible ASIN" },
    { key: "audnexusAsin",       label: "Audnexus ASIN" },
    { key: "description",        label: "Description",       multiline: true },
    { key: "notes",               label: "My Review / Notes", multiline: true, placeholder: "Add your thoughts, review, or personal notes…" },
  ];
};

const AUDNEXUS_SYNC_FIELDS: SyncFieldDef[] = [
  { key: "title",             label: "Title" },
  { key: "subtitle",          label: "Subtitle" },
  { key: "series",            label: "Series" },
  { key: "author",            label: "Author" },
  { key: "narrator",          label: "Narrator" },
  { key: "publisher",         label: "Publisher" },
  { key: "description",       label: "Description" },
  { key: "genre",             label: "Genre" },
  { key: "releaseDate",       label: "Release Date" },
  { key: "imageUrl",          label: "Image URL" },
  { key: "audiobookDuration", label: "Audiobook Duration" },
  { key: "isbn",              label: "ISBN" },
  { key: "userRating",        label: "User Rating" },
  { key: "type",              label: "Type" },
  { key: "audibleAsin",       label: "Audible ASIN" },
  { key: "audnexusAsin",      label: "Audnexus ASIN" },
];

const HARDCOVER_SYNC_FIELDS: SyncFieldDef[] = [
  { key: "title",             label: "Title" },
  { key: "subtitle",          label: "Subtitle" },
  { key: "series",            label: "Series" },
  { key: "author",            label: "Author" },
  { key: "description",       label: "Description" },
  { key: "genre",             label: "Genre" },
  { key: "releaseDate",       label: "Release Date" },
  { key: "imageUrl",          label: "Image URL" },
  { key: "pages",             label: "Pages" },
  { key: "audiobookDuration", label: "Audiobook Duration" },
  { key: "isbn",              label: "ISBN" },
  { key: "userRating",        label: "User Rating" },
  { key: "type",              label: "Type" },
];


function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeBookTypeForSheet(value: unknown): string {
  const raw = safeStr(value);
  const normalized = raw.toLowerCase();

  if (!raw) return "";
  if (normalized === "audiobook" || normalized === "audio book" || normalized === "audio") return "Audiobook";
  if (normalized === "ebook" || normalized === "e-book" || normalized === "e book" || normalized === "kindle") return "eBook";

  return "Physical";
}

function shouldMoveBookTypeToGenre(value: unknown): boolean {
  return BOOK_TYPE_GENRE_VALUES.has(safeStr(value));
}

function appendUniqueCsvValue(source: string, value: string): string {
  const nextValue = safeStr(value);
  if (!nextValue) return source;

  const parts = safeStr(source)
    .split(/[,|;/]+/g)
    .map((part) => part.trim())
    .filter(Boolean);
  const existing = new Set(parts.map((part) => part.toLowerCase()));

  if (!existing.has(nextValue.toLowerCase())) {
    parts.push(nextValue);
  }

  return parts.join(", ");
}

function firstNonEmpty(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key as keyof typeof item];
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function formatDateForInput(dateStr: string): string {
  if (!dateStr) return "";

  // Try to parse various date formats and convert to YYYY-MM-DD
  // Handle formats like: 4/25/26, 04/25/2026, 4/25/2026, 2025-12-01, 12/1/2025, etc.
  const trimmed = dateStr.trim();

  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // Try M/DD/YY or MM/DD/YY or M/D/YY or M/D/YYYY format
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, month, day] = slashMatch;
    let year = slashMatch[3];
    // Convert 2-digit year to 4-digit
    if (year.length === 2) {
      const yNum = parseInt(year, 10);
      year = (yNum > 50 ? "19" : "20") + year;
    }
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

function buildBookEditValues(item: Record<string, unknown>): Record<string, string> {
  const rawType = firstNonEmpty(item, ["types", "type", "Type"]);
  const rawGenre = firstNonEmpty(item, ["genre", "Genre", "categories", "Categories"]);

  return {
    title: firstNonEmpty(item, ["title", "Title"]),
    subtitle: firstNonEmpty(item, ["subtitle", "Subtitle"]),
    series: firstNonEmpty(item, ["series", "Series"]),
    author: firstNonEmpty(item, ["author", "Author"]),
    narrator: firstNonEmpty(item, ["narrator", "Narrator"]),
    publisher: firstNonEmpty(item, ["publisher", "Publisher"]),
    ownership: firstNonEmpty(item, ["ownership", "Ownership"]),
    type: normalizeBookTypeForSheet(rawType),
    status: firstNonEmpty(item, ["status", "Status"]),
    completedDate: formatDateForInput(firstNonEmpty(item, ["completedDate", "CompletedDate", "Completed Date", "Date Completed"])),
    isbn: firstNonEmpty(item, ["isbn", "ISBN", "isbn13", "ISBN13", "isbn10", "ISBN10"]),
    releaseDate: formatDateForInput(firstNonEmpty(item, ["releaseDate", "ReleaseDate"])),
    imageUrl: firstNonEmpty(item, ["imageUrl", "ImageURL", "Image URL"]),
    userRating: firstNonEmpty(item, ["userRating", "UserRating", "externalAverageRating"]),
    myRating: firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]),
    pages: firstNonEmpty(item, ["pages", "Pages"]),
    audiobookDuration: firstNonEmpty(item, ["audiobookDuration", "AudiobookDuration"]),
    genre: shouldMoveBookTypeToGenre(rawType) ? appendUniqueCsvValue(rawGenre, rawType) : rawGenre,
    tags: firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]),
    openLibraryWorkKey: firstNonEmpty(item, ["openLibraryWorkKey", "OpenLibraryWorkKey"]),
    googleBooksVolumeId: firstNonEmpty(item, ["googleBooksVolumeId", "GoogleBooksVolumeId"]),
    audibleAsin: firstNonEmpty(item, ["audibleAsin", "AudibleASIN", "Audible Asin", "Audible_ASIN"]),
    audnexusAsin: firstNonEmpty(item, ["audnexusAsin", "AudnexusASIN", "Audnexus Asin", "Audnexus_ASIN"]),
    description: firstNonEmpty(item, ["description", "Description"]),
    notes: firstNonEmpty(item, ["notes", "Notes"]),
  };
}

export function BookDetailsEditModal({
  open,
  item,
  replaceCoverError,
  onClose,
  onSave,
  onSaved,
  isNew,
  isDark,
  statusOptions,
}: BookDetailsEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Create BOOK_FIELDS with dynamic status options
  const BOOK_FIELDS = useMemo(() => createBookFields(statusOptions), [statusOptions]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncDiff, setSyncDiff] = useState<DiffRow[] | null>(null);
  const [syncSource, setSyncSource] = useState<BookSyncSource | null>(null);
  const [syncStep, setSyncStep] = useState<"books" | "editions" | null>(null);
  const [syncBookResults, setSyncBookResults] = useState<Array<{ id: string; title: string; author: string; imageUrl: string; year: string; data: Record<string, string> }>>([]);
  const [syncEditionResults, setSyncEditionResults] = useState<Array<{ id: string; format: string; isbn: string; pages: string; imageUrl: string; releaseDate: string; publisher: string; data: Record<string, string> }>>([]);
  const [selectedBookData, setSelectedBookData] = useState<Record<string, string>>({});


  useEffect(() => {
    if (!open || !item) return;
    setValues(buildBookEditValues(item));
    setSaveError(null);
    setSaveSuccess(null);
    setSyncError(null);
    setSyncNotice(null);
    setSyncDiff(null);
    setSyncSource(null);
    setSyncStep(null);
    setSyncBookResults([]);
    setSyncEditionResults([]);
    setSelectedBookData({});
  }, [open, item]);


  const coverCandidates = useMemo(() => {
    if (!item || !Array.isArray(item.coverCandidates)) return [] as Array<{ label?: string; url?: string }>;
    return item.coverCandidates
      .map((candidate) => {
        if (!candidate || typeof candidate !== "object") return null;
        const c = candidate as { label?: unknown; url?: unknown };
        const url = safeStr(c.url);
        if (!url) return null;
        return { label: safeStr(c.label), url };
      })
      .filter(Boolean) as Array<{ label?: string; url?: string }>;
  }, [item]);

  const customCoverCandidate = useMemo(
    () => coverCandidates.find((candidate) => {
      const label = safeStr(candidate.label).toLowerCase();
      return label.includes("override") || label.includes("custom");
    }),
    [coverCandidates]
  );

  const customUrl = safeStr(customCoverCandidate?.url);
  const defaultUrl = safeStr(values.imageUrl || item?.imageUrl || item?.ImageURL || item?.["Image URL"] || item?.Image);
  const r2CoverUrl = safeStr(item?.r2CoverUrl || item?.R2CoverUrl);
  const backupUrl = safeStr(item?.coverOverrideUrl || customUrl);
  const previewUrl = r2CoverUrl || defaultUrl || backupUrl;


  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  const buildDiff = (incoming: Record<string, string>, syncFields: SyncFieldDef[]): DiffRow[] => {
    const proposed: Record<string, string> = { ...values };
    for (const { key } of syncFields) {
      const v = key === "type" ? normalizeBookTypeForSheet(incoming[key]) : safeStr(incoming[key]);
      if (v) proposed[key] = v;
    }
    return syncFields.map(({ key, label }) => {
      const before = safeStr(values[key]);
      const after = safeStr(proposed[key]);
      if (before === after) return null;
      return { key, label, before: before || "—", after: after || "—", selected: !["imageUrl", "posterUrl", "coverUrl", "backdropUrl", "screenshotsUrl", "platform", "type"].includes(key) };
    }).filter(Boolean) as DiffRow[];
  };

  const handleSync = async (source: BookSyncSource) => {
    if (isSyncing || isSaving) return;
    setSyncError(null);
    setSyncNotice(null);
    setSyncDiff(null);
    setSyncStep(null);
    setSyncSource(source);
    setIsSyncing(true);
    try {
      const title = values.title || safeStr(item?.title) || safeStr(item?.Title);
      if (!title) throw new Error("No title to search with.");

      const type = source === "audnexus" ? "book-audnexus" : "book-hardcover";
      const params = new URLSearchParams({ type, query: title });
      if (values.type) params.set("bookFormat", values.type);
      const res = await fetchMediaSearch(params);
      const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; results?: Array<{ id?: string; title?: string; subtitle?: string; year?: string; imageUrl?: string; data?: Record<string, string> }> };

      if (!res.ok || !payload.ok) throw new Error(payload.error || "Sync failed.");
      if (!payload.results?.length) { setSyncNotice("No results found."); return; }

      setSyncBookResults(payload.results.map((r) => ({
        id: source === "audnexus"
          ? safeStr(r.data?.audibleAsin || r.data?.audnexusAsin || r.id)
          : safeStr(r.data?.hardcoverBookId || r.id),
        title: safeStr(r.title),
        author: safeStr(r.subtitle),
        imageUrl: safeStr(r.imageUrl),
        year: safeStr(r.year),
        data: r.data ?? {},
      })));
      setSyncStep("books");
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectProviderBook = async (bookId: string, bookData: Record<string, string>) => {
    if (isSyncing) return;
    setSyncError(null);
    setSelectedBookData(bookData);
    setIsSyncing(true);
    try {
      const source = syncSource || "hardcover";
      const params = new URLSearchParams({
        type: source === "audnexus" ? "book-audnexus" : "book-hardcover",
        lookupId: bookId,
      });
      if (source === "audnexus") {
        params.set("bookFormat", "Audiobook");
      } else if (values.type) {
        params.set("bookFormat", values.type);
      }
      const res = await fetchMediaSearch(params);
      const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; results?: Array<{ id?: string; title?: string; subtitle?: string; imageUrl?: string; year?: string; data?: Record<string, string> }> };

      if (!res.ok || !payload.ok) throw new Error(payload.error || "Failed to fetch editions.");
      if (!payload.results?.length) { setSyncNotice("No edition details found for this book."); setSyncStep(null); return; }

      setSyncEditionResults(payload.results.map((r) => ({
        id: safeStr(r.id),
        format: safeStr(r.data?.editionFormat || r.data?.type || r.title),
        isbn: safeStr(r.data?.isbn),
        pages: safeStr(r.data?.pages),
        imageUrl: safeStr(r.imageUrl || r.data?.imageUrl),
        releaseDate: safeStr(r.data?.releaseDate),
        publisher: safeStr(r.data?.publisher),
        data: r.data ?? {},
      })));
      setSyncStep("editions");
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Failed to fetch edition details.");
      setSyncStep(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectProviderEdition = (editionData: Record<string, string>) => {
    // Merge: book-level fields + edition overrides
    const merged: Record<string, string> = { ...selectedBookData };
    for (const [k, v] of Object.entries(editionData)) {
      if (v) merged[k] = v;
    }
    const diff = buildDiff(merged, syncSource === "audnexus" ? AUDNEXUS_SYNC_FIELDS : HARDCOVER_SYNC_FIELDS);
    setSyncStep(null);
    if (!diff.length) { setSyncNotice("Everything is already up to date."); return; }
    setSyncDiff(diff);
  };

  const toggleDiffRow = (key: string) =>
    setSyncDiff((prev) => prev ? prev.map((r) => r.key === key ? { ...r, selected: !r.selected } : r) : prev);

  const applyDiff = () => {
    if (!syncDiff) return;
    const patch: Record<string, string> = {};
    for (const row of syncDiff) {
      if (row.selected) patch[row.key] = row.after === "—" ? "" : row.after;
    }
    if (patch.type !== undefined) {
      patch.type = normalizeBookTypeForSheet(patch.type);
    }
    setValues((prev) => ({ ...prev, ...patch }));
    const count = syncDiff.filter((r) => r.selected).length;
    setSyncDiff(null);
    setSyncNotice(`Applied ${count} field(s) from ${syncSource === "audnexus" ? "Audnexus" : "Hardcover"}.`);
  };

  const selectedCount = syncDiff ? syncDiff.filter((r) => r.selected).length : 0;
  const syncLabel = syncSource === "audnexus" ? "Audnexus" : "Hardcover";
  const syncAccent = syncSource === "audnexus" ? "#0f766e" : "#7c3aed";
  const syncBookThumbnailSize = syncSource === "audnexus"
    ? { width: 44, height: 44 }
    : { width: 36, height: 52 };
  const syncEditionImageHeight = syncSource === "audnexus" ? "auto" : 100;
  const handleSave = async (artwork?: EditorArtworkDraft) => {
    if (!item) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const nextValues = { ...values, type: normalizeBookTypeForSheet(values.type) };
      const initial = buildBookEditValues(item);
      initial.type = normalizeBookTypeForSheet(initial.type);
      await Promise.resolve(onSave(item, editorDelta(item, nextValues, initial), artwork));
      onSaved?.();
      onClose();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to save book changes";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!open || !item) return null;

  return <MediaEditDialog media="book" isDark={isDark} isNew={isNew} fields={BOOK_FIELDS} initialValues={buildBookEditValues(item)} values={values} onChange={set} onClose={onClose} onSave={handleSave}
    cover={previewUrl} defaultCover={defaultUrl} saving={isSaving} syncing={isSyncing} error={saveError || syncError || replaceCoverError} notice={syncNotice || saveSuccess}
    refresh={[{label:"Find on Hardcover",onClick:()=>handleSync("hardcover")},{label:"Find on Audnexus",onClick:()=>handleSync("audnexus")}]} review={(syncDiff || syncStep) ? <>{syncStep === "books" ? (
          <div style={{ margin: "12px 12px 0", border: `1px solid ${syncAccent}33`, borderRadius: 12, background: `${syncAccent}08`, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${syncAccent}22`, background: `${syncAccent}0a` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: syncAccent }}>Select the correct book from {syncLabel}</div>
              <button type="button" onClick={() => setSyncStep(null)} style={{ border: "none", background: "transparent", fontSize: 11, color: "rgba(0,0,0,0.45)", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>Cancel</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {syncBookResults.map((book) => (
                <button key={book.id} type="button" onClick={() => handleSelectProviderBook(book.id, book.data)} disabled={isSyncing}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "none", borderBottom: "1px solid #7c3aed14", background: "transparent", cursor: isSyncing ? "default" : "pointer", textAlign: "left", transition: "background 100ms" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = `${syncAccent}0a`)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {book.imageUrl ? (
                    <img src={book.imageUrl} alt={book.title} style={{ ...syncBookThumbnailSize, objectFit: "cover", flexShrink: 0, ...COVER_IMAGE_RADIUS_STYLE }} />
                  ) : (
                    <div style={{ ...syncBookThumbnailSize, borderRadius: 4, background: "#e8eaf0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8a95a3" }}>?</div>
                  )}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1c2738" }}>{book.title}</div>
                    <div style={{ fontSize: 11, color: "#516279", marginTop: 2 }}>{book.author}{book.year ? ` · ${book.year}` : ""}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: syncAccent, fontWeight: 600 }}>Select →</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Step 2: Edition picker */}
        {syncStep === "editions" ? (
          <div style={{ margin: "12px 12px 0", border: `1px solid ${syncAccent}33`, borderRadius: 12, background: `${syncAccent}08`, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${syncAccent}22`, background: `${syncAccent}0a` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: syncAccent }}>Select an edition</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setSyncStep("books")} style={{ border: "none", background: "transparent", fontSize: 11, color: syncAccent, cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>← Back</button>
                <button type="button" onClick={() => setSyncStep(null)} style={{ border: "none", background: "transparent", fontSize: 11, color: "rgba(0,0,0,0.45)", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>Cancel</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, padding: 12 }}>
              {syncEditionResults.map((ed) => (
                <button key={ed.id} type="button" onClick={() => handleSelectProviderEdition(ed.data)}
                  style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, border: `1px solid ${syncAccent}22`, borderRadius: 10, background: "rgba(255,255,255,0.7)", cursor: "pointer", textAlign: "left", transition: "border-color 100ms, background 100ms" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${syncAccent}66`; e.currentTarget.style.background = `${syncAccent}08`; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = `${syncAccent}22`; e.currentTarget.style.background = "rgba(255,255,255,0.7)"; }}
                >
                  {ed.imageUrl ? (
                    <img src={ed.imageUrl} alt={ed.format} style={{ width: "100%", aspectRatio: syncSource === "audnexus" ? "1 / 1" : undefined, height: syncEditionImageHeight, objectFit: "cover", ...COVER_IMAGE_RADIUS_STYLE }} />
                  ) : (
                    <div style={{ width: "100%", height: syncEditionImageHeight, borderRadius: 6, background: "#e8eaf0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8a95a3" }}>No cover</div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: syncAccent }}>{ed.format}</div>
                  {ed.publisher ? <div style={{ fontSize: 10, color: "#516279" }}>{ed.publisher}</div> : null}
                  <div style={{ fontSize: 10, color: "#8a95a3", display: "flex", flexDirection: "column", gap: 2 }}>
                    {ed.isbn ? <span>ISBN: {ed.isbn}</span> : null}
                    {ed.pages ? <span>{ed.pages} pages</span> : null}
                    {ed.releaseDate ? <span>{ed.releaseDate.slice(0, 4)}</span> : null}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Step 3: Diff panel */}
        {syncDiff ? (
          <div style={{ margin: "12px 12px 0", border: `1px solid ${syncAccent}33`, borderRadius: 12, background: `${syncAccent}08`, overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: `1px solid ${syncAccent}22`, background: `${syncAccent}0a` }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: syncAccent }}>
                {syncLabel} returned {syncDiff.length} change{syncDiff.length !== 1 ? "s" : ""} — choose what to apply
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setSyncDiff((prev) => prev?.map((r) => ({ ...r, selected: true })) ?? null)} style={{ border: "none", background: "transparent", fontSize: 11, color: syncAccent, cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>Select All</button>
                <button type="button" onClick={() => setSyncDiff((prev) => prev?.map((r) => ({ ...r, selected: false })) ?? null)} style={{ border: "none", background: "transparent", fontSize: 11, color: "rgba(0,0,0,0.45)", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>Deselect All</button>
              </div>
            </div>
            <div style={{ padding: "6px 0" }}>
              {syncDiff.map((row) => {
                const isImg = row.key === "imageUrl";
                return (
                  <label key={row.key} style={{ display: "grid", gridTemplateColumns: "28px 110px 1fr auto 1fr", alignItems: "start", gap: 8, padding: "7px 14px", cursor: "pointer", background: row.selected ? `${syncAccent}08` : "transparent", transition: "background 100ms" }}>
                    <input type="checkbox" checked={row.selected} onChange={() => toggleDiffRow(row.key)} style={{ marginTop: 2, accentColor: syncAccent, cursor: "pointer" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#516279", letterSpacing: 0.2, paddingTop: 1 }}>{row.label.toUpperCase()}</span>
                    {isImg && row.before !== "—" ? (
                      <img src={row.before} alt="current" style={{ height: 60, width: "auto", objectFit: "cover", opacity: row.selected ? 0.4 : 1, transition: "opacity 100ms", ...COVER_IMAGE_RADIUS_STYLE }} />
                    ) : (
                      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", textDecoration: row.selected ? "line-through" : "none", wordBreak: "break-word", lineHeight: 1.4 }}>{row.before}</span>
                    )}
                    <span style={{ fontSize: 11, color: "rgba(0,0,0,0.3)", alignSelf: "center" }}>→</span>
                    {isImg && row.after !== "—" ? (
                      <img src={row.after} alt="new" style={{ height: 60, width: "auto", objectFit: "cover", outline: row.selected ? `2px solid ${syncAccent}` : "none", transition: "outline 100ms", ...COVER_IMAGE_RADIUS_STYLE }} />
                    ) : (
                      <span style={{ fontSize: 11, color: row.selected ? syncAccent : "rgba(0,0,0,0.55)", fontWeight: row.selected ? 600 : 400, wordBreak: "break-word", lineHeight: 1.4 }}>{row.after}</span>
                    )}
                  </label>
                );
              })}
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, padding: "10px 14px", borderTop: `1px solid ${syncAccent}22` }}>
              <button type="button" onClick={() => setSyncDiff(null)} style={{ border: "1px solid rgba(149,161,178,0.5)", borderRadius: 8, padding: "7px 14px", background: "rgba(255,255,255,0.86)", color: "#243244", cursor: "pointer", fontSize: 12, fontWeight: 650 }}>Cancel</button>
              <button type="button" disabled={selectedCount === 0} onClick={applyDiff}
                style={{ border: `1px solid ${syncAccent}80`, borderRadius: 8, padding: "7px 16px", background: selectedCount === 0 ? `${syncAccent}20` : `linear-gradient(180deg,${syncAccent}f0 0%,${syncAccent} 100%)`, color: selectedCount === 0 ? `${syncAccent}80` : "#fff", cursor: selectedCount === 0 ? "default" : "pointer", fontSize: 12, fontWeight: 700 }}
              >
                Apply {selectedCount > 0 ? selectedCount : ""} Selected
              </button>
            </div>
          </div>
        ) : null}</> : null} />;
}
