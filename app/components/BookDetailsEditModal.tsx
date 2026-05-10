"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";

type BookDetailsEditModalProps = {
  open: boolean;
  item: Record<string, unknown> | null;
  popupCoverMode?: "custom" | "default";
  isReplacingCover?: boolean;
  replaceCoverError?: string | null;
  onClose: () => void;
  onSave: (item: Record<string, unknown>, updates: Record<string, string>) => Promise<void> | void;
  onSaved?: () => void;
  onReplaceCover: (item: Record<string, unknown>, file: File) => Promise<void> | void;
  onCoverModeChange: (item: Record<string, unknown>, mode: "custom" | "default") => void;
  isNew?: boolean;
};

type FieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
  options?: readonly string[];
  isDate?: boolean;
};

type DiffRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  selected: boolean;
};

const TYPE_OPTIONS = ["Book", "eBook", "Audiobook", "Hardcover", "Paperback"] as const;
const STATUS_OPTIONS = ["Want to Read", "Reading", "Completed", "Abandoned", "Did Not Finish"] as const;
const OWNERSHIP_OPTIONS = ["Own", "Borrowed", "Library", "Wishlisted"] as const;

const BOOK_FIELDS: FieldDef[] = [
  { key: "title",              label: "Title" },
  { key: "subtitle",           label: "Subtitle" },
  { key: "series",             label: "Series" },
  { key: "author",             label: "Author" },
  { key: "ownership",          label: "Ownership",         options: OWNERSHIP_OPTIONS },
  { key: "type",               label: "Type",              options: TYPE_OPTIONS },
  { key: "status",             label: "Status",            options: STATUS_OPTIONS },
  { key: "completedDate",      label: "Completed Date",    isDate: true },
  { key: "isbn",               label: "ISBN" },
  { key: "releaseDate",        label: "Release Date",      isDate: true },
  { key: "imageUrl",           label: "Image URL" },
  { key: "customImageUrl",     label: "Custom URL" },
  { key: "userRating",         label: "User Rating" },
  { key: "myRating",           label: "My Rating" },
  { key: "pages",              label: "Pages" },
  { key: "audiobookDuration",  label: "Audiobook Duration" },
  { key: "genre",              label: "Genre" },
  { key: "tags",               label: "Tags" },
  { key: "description",        label: "Description",       multiline: true },
];

const APPLE_BOOKS_SYNC_FIELDS: { key: string; label: string }[] = [
  { key: "title",       label: "Title" },
  { key: "author",      label: "Author" },
  { key: "description", label: "Description" },
  { key: "genre",       label: "Genre" },
  { key: "releaseDate", label: "Release Date" },
  { key: "imageUrl",    label: "Image URL" },
  { key: "userRating",  label: "User Rating" },
];

const HARDCOVER_SYNC_FIELDS: { key: string; label: string }[] = [
  { key: "title",       label: "Title" },
  { key: "author",      label: "Author" },
  { key: "description", label: "Description" },
  { key: "genre",       label: "Genre" },
  { key: "releaseDate", label: "Release Date" },
  { key: "imageUrl",    label: "Image URL" },
  { key: "pages",       label: "Pages" },
  { key: "isbn",        label: "ISBN" },
];

const INPUT_STYLE: React.CSSProperties = {
  border: "1px solid rgba(149,161,178,0.52)",
  borderRadius: 9,
  padding: "8px 9px",
  background: "rgba(255,255,255,0.94)",
  fontSize: 12,
  color: "#1c2738",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 800,
  letterSpacing: 0.25,
  color: "#516279",
  display: "block",
  marginBottom: 4,
};

function FieldInput({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
  if (field.multiline) {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} style={{ ...INPUT_STYLE, resize: "vertical" }} />;
  }
  if (field.options) {
    const opts = field.options as readonly string[];
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={INPUT_STYLE}>
        <option value="">— select —</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        {value && !opts.includes(value as never) ? <option value={value}>{value}</option> : null}
      </select>
    );
  }
  return <input type={field.isDate ? "date" : "text"} value={value} onChange={(e) => onChange(e.target.value)} style={INPUT_STYLE} />;
}

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function firstNonEmpty(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key as keyof typeof item];
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function buildBookEditValues(item: Record<string, unknown>): Record<string, string> {
  return {
    title: firstNonEmpty(item, ["title", "Title"]),
    subtitle: firstNonEmpty(item, ["subtitle", "Subtitle"]),
    series: firstNonEmpty(item, ["series", "Series"]),
    author: firstNonEmpty(item, ["author", "Author"]),
    ownership: firstNonEmpty(item, ["ownership", "Ownership"]),
    type: firstNonEmpty(item, ["types", "type", "Type"]),
    status: firstNonEmpty(item, ["status", "Status"]),
    completedDate: firstNonEmpty(item, ["completedDate", "CompletedDate", "Completed Date", "Date Completed"]),
    isbn: firstNonEmpty(item, ["isbn", "ISBN", "isbn13", "ISBN13", "isbn10", "ISBN10"]),
    releaseDate: firstNonEmpty(item, ["releaseDate", "ReleaseDate"]),
    imageUrl: firstNonEmpty(item, ["imageUrl", "ImageURL", "Image URL"]),
    customImageUrl: firstNonEmpty(item, ["customImageUrl", "CustomURL", "Custom URL", "CustomImageURL"]),
    userRating: firstNonEmpty(item, ["userRating", "UserRating", "externalAverageRating"]),
    myRating: firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]),
    pages: firstNonEmpty(item, ["pages", "Pages"]),
    audiobookDuration: firstNonEmpty(item, ["audiobookDuration", "AudiobookDuration"]),
    genre: firstNonEmpty(item, ["genre", "Genre", "categories", "Categories"]),
    tags: firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]),
    openLibraryWorkKey: firstNonEmpty(item, ["openLibraryWorkKey", "OpenLibraryWorkKey"]),
    googleBooksVolumeId: firstNonEmpty(item, ["googleBooksVolumeId", "GoogleBooksVolumeId"]),
    description: firstNonEmpty(item, ["description", "Description"]),
  };
}

export function BookDetailsEditModal({
  open,
  item,
  popupCoverMode,
  isReplacingCover = false,
  replaceCoverError,
  onClose,
  onSave,
  onSaved,
  onReplaceCover,
  onCoverModeChange,
  isNew,
}: BookDetailsEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<"custom" | "default">("default");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncDiff, setSyncDiff] = useState<DiffRow[] | null>(null);
  const [syncSource, setSyncSource] = useState<"apple" | "hardcover" | null>(null);
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

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving && !isSyncing) {
        if (syncDiff) { setSyncDiff(null); return; }
        if (syncStep === "editions") { setSyncStep("books"); return; }
        if (syncStep === "books") { setSyncStep(null); return; }
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isSaving, isSyncing, onClose, open, syncDiff]);

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
  const defaultUrl = safeStr(item?.imageUrl || item?.ImageURL || item?.["Image URL"] || item?.Image);
  const customSourceUrl = safeStr(item?.customImageUrl || item?.CustomURL || item?.CustomImageURL);
  const backupUrl = safeStr(item?.coverOverrideUrl || customUrl);
  const activeMode = selectedMode;
  const previewUrl = activeMode === "custom" ? customSourceUrl || defaultUrl || backupUrl : defaultUrl || customSourceUrl || backupUrl;
  const hasCustomCover = Boolean(customSourceUrl);

  useEffect(() => {
    if (!open) return;
    const nextMode = popupCoverMode || (customSourceUrl ? "custom" : "default");
    setSelectedMode(nextMode);
  }, [customSourceUrl, open, popupCoverMode]);

  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  const buildDiff = (incoming: Record<string, string>, syncFields: typeof APPLE_BOOKS_SYNC_FIELDS): DiffRow[] => {
    const proposed: Record<string, string> = { ...values };
    for (const { key } of syncFields) {
      const v = safeStr(incoming[key]);
      if (v) proposed[key] = v;
    }
    return syncFields.map(({ key, label }) => {
      const before = safeStr(values[key]);
      const after = safeStr(proposed[key]);
      if (before === after) return null;
      return { key, label, before: before || "—", after: after || "—", selected: true };
    }).filter(Boolean) as DiffRow[];
  };

  const handleSync = async (source: "apple" | "hardcover") => {
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

      const type = source === "apple" ? "book-apple" : "book-hardcover";
      const params = new URLSearchParams({ type, query: title });
      if (values.type) params.set("bookFormat", values.type);
      const res = await fetch(`/api/media-search?${params.toString()}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; results?: Array<{ id?: string; title?: string; subtitle?: string; year?: string; imageUrl?: string; data?: Record<string, string> }> };

      if (!res.ok || !payload.ok) throw new Error(payload.error || "Sync failed.");
      if (!payload.results?.length) { setSyncNotice("No results found."); return; }

      if (source === "hardcover") {
        // Show book picker
        setSyncBookResults(payload.results.map((r) => ({
          id: safeStr(r.data?.hardcoverBookId || r.id),
          title: safeStr(r.title),
          author: safeStr(r.subtitle),
          imageUrl: safeStr(r.imageUrl),
          year: safeStr(r.year),
          data: r.data ?? {},
        })));
        setSyncStep("books");
        return;
      }

      // Apple Books: go straight to diff
      const incoming = payload.results[0].data ?? {};
      const diff = buildDiff(incoming, APPLE_BOOKS_SYNC_FIELDS);
      if (!diff.length) { setSyncNotice("Everything is already up to date."); return; }
      setSyncDiff(diff);
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectHardcoverBook = async (bookId: string, bookData: Record<string, string>) => {
    if (isSyncing) return;
    setSyncError(null);
    setSelectedBookData(bookData);
    setIsSyncing(true);
    try {
      const params = new URLSearchParams({ type: "book-hardcover", lookupId: bookId });
      if (values.type) params.set("bookFormat", values.type);
      const res = await fetch(`/api/media-search?${params.toString()}`, { cache: "no-store" });
      const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; results?: Array<{ id?: string; title?: string; subtitle?: string; imageUrl?: string; year?: string; data?: Record<string, string> }> };

      if (!res.ok || !payload.ok) throw new Error(payload.error || "Failed to fetch editions.");
      if (!payload.results?.length) { setSyncNotice("No editions found for this book."); setSyncStep(null); return; }

      setSyncEditionResults(payload.results.map((r) => ({
        id: safeStr(r.id),
        format: safeStr(r.data?.editionFormat || r.title),
        isbn: safeStr(r.data?.isbn),
        pages: safeStr(r.data?.pages),
        imageUrl: safeStr(r.imageUrl || r.data?.imageUrl),
        releaseDate: safeStr(r.data?.releaseDate),
        publisher: safeStr(r.data?.publisher),
        data: r.data ?? {},
      })));
      setSyncStep("editions");
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Failed to fetch editions.");
      setSyncStep(null);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelectHardcoverEdition = (editionData: Record<string, string>) => {
    // Merge: book-level fields + edition overrides
    const merged: Record<string, string> = { ...selectedBookData };
    for (const [k, v] of Object.entries(editionData)) {
      if (v) merged[k] = v;
    }
    const diff = buildDiff(merged, HARDCOVER_SYNC_FIELDS);
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
    setValues((prev) => ({ ...prev, ...patch }));
    const count = syncDiff.filter((r) => r.selected).length;
    setSyncDiff(null);
    setSyncNotice(`Applied ${count} field(s) from ${syncSource === "apple" ? "Apple Books" : "Hardcover"}.`);
  };

  const selectedCount = syncDiff ? syncDiff.filter((r) => r.selected).length : 0;
  const syncLabel = syncSource === "apple" ? "Apple Books" : "Hardcover";
  const syncAccent = syncSource === "apple" ? "#0071e3" : "#7c3aed";

  if (!open || !item) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 9000,
        background: "rgba(7, 10, 16, 0.42)",
        backdropFilter: "blur(14px) saturate(1.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 10,
      }}
      onClick={() => {
        if (!isSaving && !isSyncing) {
          if (syncDiff) { setSyncDiff(null); }
          else if (syncStep === "editions") { setSyncStep("books"); }
          else if (syncStep === "books") { setSyncStep(null); }
          else { onClose(); }
        }
      }}
    >
      <div
        style={{
          width: "min(1300px, 100%)",
          maxHeight: "calc(100vh - 20px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.55)",
          background: "linear-gradient(180deg, rgba(251,252,254,0.96) 0%, rgba(241,244,249,0.98) 100%)",
          boxShadow: "0 24px 48px rgba(15,23,40,0.26), inset 0 1px 0 rgba(255,255,255,0.86)",
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Title bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid rgba(167,177,191,0.42)", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            <div style={{ marginLeft: 8, fontSize: 13, fontWeight: 650, color: "#1d2735" }}>{isNew ? "Add Book" : "Edit Book"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {syncNotice && !syncDiff ? <span style={{ fontSize: 11, color: "#335480" }}>{syncNotice}</span> : null}
            {syncError ? <span style={{ fontSize: 11, color: "#b4232f" }}>{syncError}</span> : null}
            <button
              type="button"
              disabled={isSyncing || isSaving}
              onClick={() => handleSync("apple")}
              style={{
                border: "1px solid rgba(0,113,227,0.4)", borderRadius: 8,
                padding: "6px 12px",
                background: isSyncing && syncSource === "apple" ? "rgba(0,113,227,0.07)" : "rgba(0,113,227,0.09)",
                color: "#0071e3", cursor: isSyncing || isSaving ? "default" : "pointer",
                fontSize: 12, fontWeight: 650,
                opacity: isSyncing || isSaving ? 0.6 : 1,
                transition: "opacity 120ms",
              }}
            >
              {isSyncing && syncSource === "apple" ? "Syncing…" : "Sync from Apple Books"}
            </button>
            <button
              type="button"
              disabled={isSyncing || isSaving}
              onClick={() => handleSync("hardcover")}
              style={{
                border: "1px solid rgba(124,58,237,0.4)", borderRadius: 8,
                padding: "6px 12px",
                background: isSyncing && syncSource === "hardcover" ? "rgba(124,58,237,0.07)" : "rgba(124,58,237,0.09)",
                color: "#7c3aed", cursor: isSyncing || isSaving ? "default" : "pointer",
                fontSize: 12, fontWeight: 650,
                opacity: isSyncing || isSaving ? 0.6 : 1,
                transition: "opacity 120ms",
              }}
            >
              {isSyncing && syncSource === "hardcover" ? "Syncing…" : "Sync from Hardcover"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{ border: "1px solid rgba(149,161,178,0.5)", borderRadius: 8, padding: "6px 10px", background: "rgba(255,255,255,0.86)", color: "#243244", cursor: "pointer", fontSize: 12, fontWeight: 650 }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Step 1: Book picker */}
        {syncStep === "books" ? (
          <div style={{ margin: "12px 12px 0", border: "1px solid #7c3aed33", borderRadius: 12, background: "#7c3aed08", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #7c3aed22", background: "#7c3aed0a" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>Select the correct book from Hardcover</div>
              <button type="button" onClick={() => setSyncStep(null)} style={{ border: "none", background: "transparent", fontSize: 11, color: "rgba(0,0,0,0.45)", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>Cancel</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {syncBookResults.map((book) => (
                <button key={book.id} type="button" onClick={() => handleSelectHardcoverBook(book.id, book.data)} disabled={isSyncing}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", border: "none", borderBottom: "1px solid #7c3aed14", background: "transparent", cursor: isSyncing ? "default" : "pointer", textAlign: "left", transition: "background 100ms" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#7c3aed0a")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {book.imageUrl ? (
                    <img src={book.imageUrl} alt={book.title} style={{ width: 36, height: 52, objectFit: "cover", flexShrink: 0, ...COVER_IMAGE_RADIUS_STYLE }} />
                  ) : (
                    <div style={{ width: 36, height: 52, borderRadius: 4, background: "#e8eaf0", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8a95a3" }}>?</div>
                  )}
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#1c2738" }}>{book.title}</div>
                    <div style={{ fontSize: 11, color: "#516279", marginTop: 2 }}>{book.author}{book.year ? ` · ${book.year}` : ""}</div>
                  </div>
                  <div style={{ marginLeft: "auto", fontSize: 11, color: "#7c3aed", fontWeight: 600 }}>Select →</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* Step 2: Edition picker */}
        {syncStep === "editions" ? (
          <div style={{ margin: "12px 12px 0", border: "1px solid #7c3aed33", borderRadius: 12, background: "#7c3aed08", overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #7c3aed22", background: "#7c3aed0a" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#7c3aed" }}>Select an edition</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" onClick={() => setSyncStep("books")} style={{ border: "none", background: "transparent", fontSize: 11, color: "#7c3aed", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>← Back</button>
                <button type="button" onClick={() => setSyncStep(null)} style={{ border: "none", background: "transparent", fontSize: 11, color: "rgba(0,0,0,0.45)", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>Cancel</button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 8, padding: 12 }}>
              {syncEditionResults.map((ed) => (
                <button key={ed.id} type="button" onClick={() => handleSelectHardcoverEdition(ed.data)}
                  style={{ display: "flex", flexDirection: "column", gap: 6, padding: 8, border: "1px solid #7c3aed22", borderRadius: 10, background: "rgba(255,255,255,0.7)", cursor: "pointer", textAlign: "left", transition: "border-color 100ms, background 100ms" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#7c3aed66"; e.currentTarget.style.background = "#7c3aed08"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#7c3aed22"; e.currentTarget.style.background = "rgba(255,255,255,0.7)"; }}
                >
                  {ed.imageUrl ? (
                    <img src={ed.imageUrl} alt={ed.format} style={{ width: "100%", height: 100, objectFit: "cover", ...COVER_IMAGE_RADIUS_STYLE }} />
                  ) : (
                    <div style={{ width: "100%", height: 100, borderRadius: 6, background: "#e8eaf0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#8a95a3" }}>No cover</div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed" }}>{ed.format}</div>
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
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "minmax(184px, 220px) minmax(0,1fr)", gap: 12, padding: 12 }}>
          {/* Cover panel */}
          <div style={{ border: "1px solid rgba(167,177,191,0.42)", borderRadius: 12, background: "rgba(255,255,255,0.78)", padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.3, color: "#516279" }}>COVER</div>
            <div style={{ marginTop: 8 }}>
              {previewUrl ? (
                <img src={previewUrl} alt={safeStr(item.title) || "Book cover"} style={{ width: "100%", objectFit: activeMode === "custom" ? "contain" : "cover", maxHeight: 250, ...COVER_IMAGE_RADIUS_STYLE }} />
              ) : (
                <div style={{ height: 180, borderRadius: 8, border: "1px dashed rgba(149,161,178,0.58)", display: "flex", alignItems: "center", justifyContent: "center", color: "#5f6e82", fontSize: 11 }}>
                  No cover
                </div>
              )}
            </div>
            <div style={{ marginTop: 8, display: "inline-flex", border: "1px solid rgba(149,161,178,0.5)", borderRadius: 999, overflow: "hidden" }}>
              <button type="button" onClick={() => setSelectedMode("default")} style={{ border: "none", padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: activeMode === "default" ? "rgba(32,94,252,0.14)" : "transparent", color: activeMode === "default" ? "#1a4dd7" : "#394b62" }}>Default</button>
              <button type="button" onClick={() => setSelectedMode("custom")} style={{ border: "none", borderLeft: "1px solid rgba(149,161,178,0.5)", padding: "6px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer", background: activeMode === "custom" ? "rgba(32,94,252,0.14)" : "transparent", color: activeMode === "custom" ? "#1a4dd7" : "#394b62" }}>Custom</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 10.5, color: "#5f6e82" }}>
              {activeMode === "default" ? "Using spreadsheet cover." : hasCustomCover ? "Using custom uploaded cover." : "No custom cover yet. Upload one below."}
            </div>
            <div style={{ marginTop: 8, display: "grid", gap: 5 }}>
              <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}><strong>ImageURL:</strong> {defaultUrl || "—"}</div>
              <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}><strong>CustomURL:</strong> {customSourceUrl || "—"}</div>
              <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}><strong>R2 Backup:</strong> {backupUrl || "—"}</div>
            </div>
            <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px solid rgba(149,161,178,0.3)", display: "grid", gap: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#516279", letterSpacing: 0.3 }}>R2 BACKUP STATUS</div>
              <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all", display: "flex", alignItems: "flex-start", gap: 6 }}>
                <span style={{ flex: "0 0 auto", marginTop: 2 }}>{safeStr(item?.r2CoverUrl) ? "✓" : "○"}</span>
                <span><strong>R2 Cover URL:</strong> {safeStr(item?.r2CoverUrl) ? <span style={{ color: "#0b7f3f" }}>{safeStr(item?.r2CoverUrl)}</span> : <span style={{ color: "#8a929d" }}>Not backed up yet</span>}</span>
              </div>
              {!safeStr(item?.r2CoverUrl) && (defaultUrl || customSourceUrl) && (
                <div style={{ fontSize: 10, color: "#8a929d" }}>Will be backed up when you save this item.</div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.currentTarget.value = "";
                if (!file) return;
                await Promise.resolve(onReplaceCover(item, file));
              }}
            />
            <button
              type="button"
              disabled={isReplacingCover}
              onClick={() => fileInputRef.current?.click()}
              style={{ marginTop: 8, width: "100%", border: "1px solid rgba(149,161,178,0.5)", borderRadius: 9, padding: "8px 9px", background: "rgba(255,255,255,0.9)", color: "#243244", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              {isReplacingCover ? "Uploading..." : "Upload Custom Cover"}
            </button>
            {replaceCoverError ? <div style={{ marginTop: 6, color: "#b4232f", fontSize: 11 }}>{replaceCoverError}</div> : null}
          </div>

          {/* Fields panel */}
          <div style={{ border: "1px solid rgba(167,177,191,0.42)", borderRadius: 12, background: "rgba(255,255,255,0.78)", padding: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8 }}>
              {BOOK_FIELDS.map((field) => (
                <label key={field.key} style={{ display: "flex", flexDirection: "column", gap: 4, gridColumn: field.multiline ? "1 / -1" : undefined }}>
                  <span style={LABEL_STYLE}>{field.label}</span>
                  <FieldInput field={field} value={values[field.key] ?? ""} onChange={(v) => set(field.key, v)} />
                </label>
              ))}
            </div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 11, color: saveError ? "#b4232f" : "#335480" }}>{saveError || saveSuccess || " "}</div>
              <button
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  setIsSaving(true);
                  setSaveError(null);
                  setSaveSuccess(null);
                  try {
                    const nextValues = { ...values };
                    if (activeMode === "default") {
                      nextValues.customImageUrl = "";
                    } else if (!safeStr(nextValues.customImageUrl)) {
                      throw new Error("Custom mode requires a Custom URL (or upload a custom cover first).");
                    }
                    await Promise.resolve(onSave(item, nextValues));
                    if (!isNew) {
                      onCoverModeChange(
                        {
                          ...item,
                          imageUrl: nextValues.imageUrl,
                          customImageUrl: nextValues.customImageUrl,
                          ImageURL: nextValues.imageUrl,
                          CustomURL: nextValues.customImageUrl,
                          CustomImageURL: nextValues.customImageUrl,
                        },
                        activeMode
                      );
                    }
                    onSaved?.();
                    onClose();
                  } catch (error: unknown) {
                    const message = error instanceof Error ? error.message : "Failed to save book changes";
                    setSaveError(message);
                  } finally {
                    setIsSaving(false);
                  }
                }}
                style={{ border: "1px solid rgba(27,83,217,0.5)", borderRadius: 9, padding: "8px 12px", background: "linear-gradient(180deg, rgba(86,150,255,0.95) 0%, rgba(45,109,237,0.98) 100%)", color: "#f6f9ff", fontSize: 12, fontWeight: 750, cursor: "pointer" }}
              >
                {isSaving ? "Adding…" : isNew ? "Add to Library" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
