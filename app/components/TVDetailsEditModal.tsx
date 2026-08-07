"use client";

import { useEffect, useRef, useState } from "react";
import { fetchMediaSearch } from "../lib/mediaSearchClient";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";

type TVDetailsEditModalProps = {
  open: boolean;
  item: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (item: Record<string, unknown>, updates: Record<string, string>) => Promise<void> | void;
  onSaved?: () => void;
  onReplaceCover?: (item: Record<string, unknown>, file: File) => Promise<void> | void;
  onSyncCoverToR2?: (item: Record<string, unknown>, sourceUrl: string) => Promise<void> | void;
  isReplacingCover?: boolean;
  replaceCoverError?: string | null;
  isNew?: boolean;
};

type FieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
  options?: readonly string[];
  isDate?: boolean;
  wide?: boolean;
  placeholder?: string;
};

type DiffRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  selected: boolean;
};

const WATCH_STATUS_OPTIONS = [
  "Started", "Completed", "Backlog", "Abandoned", "Watch Next", "Paused", "Pending Return",
] as const;
const SHOW_STATUS_OPTIONS = ["Ended", "Returning Series", "Canceled"] as const;

const TV_FIELDS: FieldDef[] = [
  { key: "title",            label: "Title",            wide: true },
  { key: "year",             label: "Year" },
  { key: "watchStatus",      label: "Watch Status",      options: WATCH_STATUS_OPTIONS },
  { key: "showStatus",       label: "Show Status",       options: SHOW_STATUS_OPTIONS },
  { key: "dateCompleted",    label: "Date Completed",    isDate: true },
  { key: "firstAirDate",     label: "First Air Date",    isDate: true },
  { key: "lastAirDate",      label: "Last Air Date",     isDate: true },
  { key: "numberOfSeasons",  label: "Seasons" },
  { key: "numberOfEpisodes", label: "Episodes" },
  { key: "myRating",         label: "My Rating" },
  { key: "tmdbRating",       label: "TMDB Rating" },
  { key: "tmdbId",           label: "TMDB ID" },
  { key: "networks",         label: "Networks" },
  { key: "streamingUS",      label: "Streaming US" },
  { key: "genres",           label: "Genres" },
  { key: "tags",             label: "Tags" },
  { key: "posterUrl",        label: "Poster URL" },
  { key: "backdropUrl",      label: "Backdrop URL" },
  { key: "overview",         label: "Overview",          multiline: true },
  { key: "notes",            label: "My Review / Notes", multiline: true, placeholder: "Add your thoughts, review, or personal notes…" },
];

// Fields TMDB can fill in for TV shows
const TMDB_SYNC_FIELDS: { key: string; label: string }[] = [
  { key: "title",            label: "Title" },
  { key: "year",             label: "Year" },
  { key: "tmdbId",           label: "TMDB ID" },
  { key: "firstAirDate",     label: "First Air Date" },
  { key: "lastAirDate",      label: "Last Air Date" },
  { key: "numberOfSeasons",  label: "Seasons" },
  { key: "numberOfEpisodes", label: "Episodes" },
  { key: "showStatus",       label: "Show Status" },
  { key: "genres",           label: "Genres" },
  { key: "tmdbRating",       label: "TMDB Rating" },
  { key: "overview",         label: "Overview" },
  { key: "posterUrl",        label: "Poster URL" },
  { key: "backdropUrl",      label: "Backdrop URL" },
];

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function firstNonEmpty(item: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const s = safeStr(item[k]);
    if (s) return s;
  }
  return "";
}

function normalizeDateInputValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const sep = trimmed.match(/^(\d{1,2})([/.-])(\d{1,2})[/.-](\d{2,4})$/);
  if (sep) {
    const month = Number(sep[1]), day = Number(sep[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = Number(sep[4]);
      if (sep[4].length === 2) year = year <= 50 ? 2000 + year : 1900 + year;
      if (Number.isFinite(year) && year >= 1000 && year <= 9999)
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return trimmed;
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function buildValues(item: Record<string, unknown>): Record<string, string> {
  const raw: Record<string, string> = {
    title:            firstNonEmpty(item, ["title", "Title"]),
    year:             firstNonEmpty(item, ["year", "Year"]),
    watchStatus:      firstNonEmpty(item, ["watchStatus", "Watch Status", "WatchStatus", "watched", "Watched"]),
    showStatus:       firstNonEmpty(item, ["showStatus", "Status"]),
    dateCompleted:    firstNonEmpty(item, ["dateCompleted", "Date Completed", "CompletedDate", "completedDate"]),
    firstAirDate:     firstNonEmpty(item, ["firstAirDate", "FirstAirDate"]),
    lastAirDate:      firstNonEmpty(item, ["lastAirDate", "LastAirDate"]),
    numberOfSeasons:  firstNonEmpty(item, ["numberOfSeasons", "NumberOfSeasons"]),
    numberOfEpisodes: firstNonEmpty(item, ["numberOfEpisodes", "NumberOfEpisodes"]),
    myRating:         firstNonEmpty(item, ["myRating", "MyRating"]),
    tmdbRating:       firstNonEmpty(item, ["tmdbRating", "TMDB_Rating"]),
    tmdbId:           firstNonEmpty(item, ["tmdbId", "TMDB_ID"]),
    networks:         firstNonEmpty(item, ["networks", "Networks"]),
    streamingUS:      firstNonEmpty(item, ["streamingUS", "StreamingUS"]),
    genres:           firstNonEmpty(item, ["genres", "Genres"]),
    tags:             firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]),
    posterUrl:        firstNonEmpty(item, ["posterUrl", "PosterURL"]),
    backdropUrl:      firstNonEmpty(item, ["backdropUrl", "BackdropURL"]),
    overview:         firstNonEmpty(item, ["overview", "Overview"]),
    notes:            firstNonEmpty(item, ["notes", "Notes"]),
  };
  // Normalize date fields to YYYY-MM-DD for <input type="date">
  for (const key of Object.keys(raw)) {
    if (key.toLowerCase().includes("date")) {
      const norm = normalizeDateInputValue(raw[key]);
      if (norm) raw[key] = norm;
    }
  }
  return raw;
}

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
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} placeholder={field.placeholder} style={{ ...INPUT_STYLE, resize: "vertical" }} />;
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

export function TVDetailsEditModal({ open, item, onClose, onSave, onSaved, onReplaceCover, onSyncCoverToR2, isReplacingCover = false, replaceCoverError, isNew }: TVDetailsEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [isMobileLayout, setIsMobileLayout] = useState(false);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncDiff, setSyncDiff] = useState<DiffRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setValues(buildValues(item));
    setSaveError(null);
    setSaveSuccess(null);
    setSyncError(null);
    setSyncNotice(null);
    setSyncDiff(null);
  }, [open, item]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving && !isSyncing) {
        if (syncDiff) { setSyncDiff(null); return; }
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [isSaving, isSyncing, onClose, open, syncDiff]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setIsMobileLayout(window.innerWidth <= 980);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (!open || !item) return null;

  const posterUrl = values.posterUrl || safeStr(item.posterUrl) || safeStr(item.PosterURL);
  const r2CoverUrl = safeStr(item?.r2CoverUrl || item?.R2CoverUrl);
  const r2BackdropUrl = safeStr(item?.r2BackdropUrl || item?.R2BackdropUrl);
  const displayedPosterUrl = r2CoverUrl || posterUrl;
  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await Promise.resolve(onSave(item, values));
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFromTMDB = async () => {
    if (isSyncing || isSaving) return;
    setSyncError(null);
    setSyncNotice(null);
    setSyncDiff(null);
    setIsSyncing(true);
    try {
      const tmdbId = values.tmdbId || safeStr(item.tmdbId) || safeStr(item.TMDB_ID);
      const title  = values.title  || safeStr(item.title)  || safeStr(item.Title);
      if (!tmdbId && !title) throw new Error("No TMDB ID or title to look up.");

      const params = new URLSearchParams({ type: "tv" });
      if (tmdbId) params.set("lookupId", tmdbId);
      if (title)  params.set("query", title);

      const res = await fetchMediaSearch(params);
      const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; results?: Array<{ data?: Record<string, string> }> };

      if (!res.ok || !payload.ok) throw new Error(payload.error || "TMDB fetch failed.");

      const incoming: Record<string, string> = payload.results?.[0]?.data ?? {};
      if (!Object.keys(incoming).length) {
        setSyncNotice("No results found on TMDB.");
        return;
      }

      // Build proposed values — only overwrite with non-empty incoming
      const proposed: Record<string, string> = { ...values };
      for (const { key } of TMDB_SYNC_FIELDS) {
        const v = safeStr(incoming[key]);
        if (v) {
          proposed[key] = key.toLowerCase().includes("date") ? normalizeDateInputValue(v) || v : v;
        }
      }

      const diff: DiffRow[] = TMDB_SYNC_FIELDS.map(({ key, label }) => {
        const before = safeStr(values[key]);
        const after  = safeStr(proposed[key]);
        if (before === after) return null;
        return { key, label, before: before || "—", after: after || "—", selected: true };
      }).filter(Boolean) as DiffRow[];

      if (diff.length === 0) {
        setSyncNotice("Everything is already up to date.");
        return;
      }
      setSyncDiff(diff);
    } catch (err: unknown) {
      setSyncError(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setIsSyncing(false);
    }
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
    setSyncDiff(null);
    setSyncNotice(`Applied ${syncDiff.filter((r) => r.selected).length} field(s) from TMDB.`);
  };

  const selectedCount = syncDiff ? syncDiff.filter((r) => r.selected).length : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: 9100,
        background: "rgba(7,10,16,0.42)",
        backdropFilter: "blur(14px) saturate(1.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: isMobileLayout ? 0 : 10,
      }}
      onClick={() => { if (!isSaving && !isSyncing) { if (syncDiff) { setSyncDiff(null); } else { onClose(); } } }}
    >
      <div
        style={{
          width: isMobileLayout ? "100%" : "min(1100px,100%)",
          maxHeight: isMobileLayout ? "100vh" : "calc(100vh - 20px)",
          overflow: "auto",
          borderRadius: isMobileLayout ? 0 : 18,
          border: "1px solid rgba(255,255,255,0.55)",
          background: "linear-gradient(180deg,rgba(251,252,254,0.96) 0%,rgba(241,244,249,0.98) 100%)",
          boxShadow: "0 24px 48px rgba(15,23,40,0.26), inset 0 1px 0 rgba(255,255,255,0.86)",
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: isMobileLayout ? "wrap" : "nowrap",
          padding: isMobileLayout ? "10px 10px" : "10px 14px", borderBottom: "1px solid rgba(167,177,191,0.42)",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: isMobileLayout ? "wrap" : "nowrap" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 650, color: "#1d2735" }}>{isNew ? "Add TV Show" : "Edit TV Show"}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {syncNotice && !syncDiff ? (
              <span style={{ fontSize: 11, color: "#335480" }}>{syncNotice}</span>
            ) : null}
            {syncError ? (
              <span style={{ fontSize: 11, color: "#b4232f" }}>{syncError}</span>
            ) : null}
            {saveError || saveSuccess ? (
              <span style={{ fontSize: 11, color: saveError ? "#b4232f" : "#335480" }}>{saveError || saveSuccess}</span>
            ) : null}
            <button
              type="button"
              disabled={isSyncing || isSaving}
              onClick={handleSyncFromTMDB}
              style={{
                border: "1px solid rgba(0,113,227,0.4)", borderRadius: 8,
                padding: isMobileLayout ? "8px 10px" : "6px 12px",
                background: "rgba(0,113,227,0.09)",
                color: "#0071e3", cursor: isSyncing || isSaving ? "default" : "pointer",
                fontSize: 12, fontWeight: 650,
                opacity: isSyncing || isSaving ? 0.6 : 1,
                transition: "opacity 120ms",
              }}
            >
              {isSyncing ? "Syncing…" : "Sync from TMDB"}
            </button>
            <button type="button" disabled={isSaving} onClick={handleSave} style={{
              border: "1px solid rgba(27,83,217,0.5)", borderRadius: 8,
              padding: isMobileLayout ? "8px 10px" : "6px 12px",
              background: "linear-gradient(180deg,rgba(86,150,255,0.95) 0%,rgba(45,109,237,0.98) 100%)",
              color: "#f6f9ff", cursor: isSaving ? "default" : "pointer", fontSize: 12, fontWeight: 750,
            }}>
              {isSaving ? "Adding…" : isNew ? "Add to Library" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                border: "1px solid rgba(149,161,178,0.5)", borderRadius: 8,
                padding: isMobileLayout ? "8px 10px" : "6px 12px", background: "rgba(255,255,255,0.86)",
                color: "#243244", cursor: "pointer", fontSize: 12, fontWeight: 650,
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* TMDB Sync diff panel */}
        {syncDiff ? (
          <div style={{
            margin: "12px 12px 0",
            border: "1px solid rgba(0,113,227,0.22)",
            borderRadius: 12,
            background: "rgba(0,113,227,0.04)",
            overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px",
              borderBottom: "1px solid rgba(0,113,227,0.14)",
              background: "rgba(0,113,227,0.06)",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0055b3" }}>
                TMDB returned {syncDiff.length} change{syncDiff.length !== 1 ? "s" : ""} — choose what to apply
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" onClick={() => setSyncDiff((p) => p?.map((r) => ({ ...r, selected: true })) ?? null)}
                  style={{ border: "none", background: "transparent", fontSize: 11, color: "#0071e3", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>
                  Select All
                </button>
                <button type="button" onClick={() => setSyncDiff((p) => p?.map((r) => ({ ...r, selected: false })) ?? null)}
                  style={{ border: "none", background: "transparent", fontSize: 11, color: "rgba(0,0,0,0.45)", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}>
                  Deselect All
                </button>
              </div>
            </div>

            <div style={{ padding: "6px 0" }}>
              {syncDiff.map((row) => {
                const isImg = row.key === "posterUrl" || row.key === "backdropUrl";
                return (
                  <label key={row.key} style={{
                    display: "grid",
                    gridTemplateColumns: "28px 130px 1fr auto 1fr",
                    alignItems: "start",
                    gap: 8,
                    padding: "7px 14px",
                    cursor: "pointer",
                    background: row.selected ? "rgba(0,113,227,0.05)" : "transparent",
                    transition: "background 100ms",
                  }}>
                    <input type="checkbox" checked={row.selected} onChange={() => toggleDiffRow(row.key)}
                      style={{ marginTop: 2, accentColor: "#0071e3", cursor: "pointer" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#516279", letterSpacing: 0.2, paddingTop: 1 }}>
                      {row.label.toUpperCase()}
                    </span>
                    {isImg && row.before !== "—" ? (
                      <img src={row.before} alt="current" style={{ height: 60, width: "auto", objectFit: "cover", opacity: row.selected ? 0.4 : 1, transition: "opacity 100ms", ...COVER_IMAGE_RADIUS_STYLE }} />
                    ) : (
                      <span style={{ fontSize: 11, color: "rgba(0,0,0,0.4)", textDecoration: row.selected ? "line-through" : "none", wordBreak: "break-word", lineHeight: 1.4 }}>{row.before}</span>
                    )}
                    <span style={{ fontSize: 11, color: "rgba(0,0,0,0.3)", alignSelf: "center" }}>→</span>
                    {isImg && row.after !== "—" ? (
                      <img src={row.after} alt="new" style={{ height: 60, width: "auto", objectFit: "cover", outline: row.selected ? "2px solid #0071e3" : "none", transition: "outline 100ms", ...COVER_IMAGE_RADIUS_STYLE }} />
                    ) : (
                      <span style={{ fontSize: 11, color: row.selected ? "#0055b3" : "rgba(0,0,0,0.55)", fontWeight: row.selected ? 600 : 400, wordBreak: "break-word", lineHeight: 1.4 }}>{row.after}</span>
                    )}
                  </label>
                );
              })}
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
              padding: "10px 14px",
              borderTop: "1px solid rgba(0,113,227,0.14)",
            }}>
              <button type="button" onClick={() => setSyncDiff(null)} style={{
                border: "1px solid rgba(149,161,178,0.5)", borderRadius: 8,
                padding: "7px 14px", background: "rgba(255,255,255,0.86)",
                color: "#243244", cursor: "pointer", fontSize: 12, fontWeight: 650,
              }}>
                Cancel
              </button>
              <button type="button" disabled={selectedCount === 0} onClick={applyDiff} style={{
                border: "1px solid rgba(0,113,227,0.5)", borderRadius: 8,
                padding: "7px 16px",
                background: selectedCount === 0 ? "rgba(0,113,227,0.12)" : "linear-gradient(180deg,rgba(86,150,255,0.95) 0%,rgba(45,109,237,0.98) 100%)",
                color: selectedCount === 0 ? "rgba(0,113,227,0.45)" : "#f6f9ff",
                cursor: selectedCount === 0 ? "default" : "pointer",
                fontSize: 12, fontWeight: 700,
              }}>
                Apply {selectedCount > 0 ? selectedCount : ""} Selected
              </button>
            </div>
          </div>
        ) : null}

        {/* Body */}
        <div style={{ display: "grid", gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(180px,210px) minmax(0,1fr)", gap: 12, padding: isMobileLayout ? 10 : 12 }}>

          {/* Poster panel */}
          <div style={{
            border: "1px solid rgba(167,177,191,0.34)", borderRadius: 14,
            background: "linear-gradient(180deg,rgba(255,255,255,0.9),rgba(246,249,253,0.88))", padding: 12,
            display: "flex", flexDirection: "column", gap: 10,
            boxShadow: "0 8px 24px rgba(31,45,61,0.08)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 850, letterSpacing: 0.35, color: "#3f4d61" }}>ARTWORK</div>
              <span style={{ borderRadius: 999, padding: "3px 8px", fontSize: 10, fontWeight: 800, color: r2CoverUrl ? "#0f766e" : "#806200", background: r2CoverUrl ? "rgba(15,118,110,0.1)" : "rgba(245,158,11,0.12)" }}>
                {r2CoverUrl ? "R2 ready" : "Needs sync"}
              </span>
            </div>
            <div style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,0.72)", border: "1px solid rgba(167,177,191,0.24)" }}>
            {displayedPosterUrl ? (
              <img src={displayedPosterUrl} alt={safeStr(item.title) || "TV show poster"}
                style={{ display: "block", margin: "0 auto", width: "auto", height: "auto", maxWidth: "100%", objectFit: "contain", maxHeight: isMobileLayout ? 360 : 280, ...COVER_IMAGE_RADIUS_STYLE }} />
            ) : (
              <div style={{
                height: 180, borderRadius: 8,
                border: "1px dashed rgba(149,161,178,0.58)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#5f6e82", fontSize: 11,
              }}>
                No poster
              </div>
            )}
            </div>
            <div style={{ display: "grid", gap: 7 }}>
              <button
                type="button"
                disabled={isReplacingCover || !posterUrl || !onSyncCoverToR2}
                onClick={async () => {
                  if (!posterUrl || !onSyncCoverToR2) return;
                  await Promise.resolve(onSyncCoverToR2(item, posterUrl));
                }}
                style={{ border: "1px solid rgba(15,118,110,0.34)", borderRadius: 10, padding: "9px 10px", fontSize: 12, fontWeight: 800, cursor: isReplacingCover || !posterUrl || !onSyncCoverToR2 ? "default" : "pointer", background: "linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.88))", color: isReplacingCover || !posterUrl || !onSyncCoverToR2 ? "#8a929d" : "#0f766e" }}
              >
                {isReplacingCover ? "Updating..." : "Use metadata artwork"}
              </button>
              <button
                type="button"
                disabled={isReplacingCover || !onReplaceCover}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: "1px solid rgba(149,161,178,0.42)", borderRadius: 10, padding: "9px 10px", background: "rgba(255,255,255,0.95)", color: isReplacingCover || !onReplaceCover ? "#8a929d" : "#243244", fontSize: 12, fontWeight: 800, cursor: isReplacingCover || !onReplaceCover ? "default" : "pointer" }}
              >
                {isReplacingCover ? "Uploading..." : "Choose custom artwork"}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file || !onReplaceCover) return;
                await Promise.resolve(onReplaceCover(item, file));
              }}
            />
            {replaceCoverError ? <div style={{ color: "#b4232f", fontSize: 11 }}>{replaceCoverError}</div> : null}
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, color: "#4b5b70" }}><span>Default artwork</span><strong style={{ color: posterUrl ? "#0f766e" : "#8a929d" }}>{posterUrl ? "Available" : "Missing"}</strong></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, color: "#4b5b70" }}><span>Displayed cover</span><strong style={{ color: r2CoverUrl ? "#0f766e" : "#8a929d" }}>{r2CoverUrl ? "Stored in R2" : "Using default"}</strong></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, color: "#4b5b70" }}><span>Backdrop</span><strong style={{ color: r2BackdropUrl ? "#0f766e" : "#8a929d" }}>{r2BackdropUrl ? "Stored in R2" : "Pending"}</strong></div>
            </div>
            <details style={{ borderTop: "1px solid rgba(149,161,178,0.24)", paddingTop: 8 }}>
              <summary style={{ cursor: "pointer", color: "#66758a", fontSize: 10.5, fontWeight: 750 }}>Source details</summary>
              <div style={{ marginTop: 7, display: "grid", gap: 5 }}>
                <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}><strong>Default:</strong> {posterUrl || "—"}</div>
                <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}><strong>R2:</strong> {r2CoverUrl || "—"}</div>
                <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}><strong>Backdrop:</strong> {r2BackdropUrl || "—"}</div>
              </div>
            </details>
          </div>

          {/* Fields panel */}
          <div style={{
            border: "1px solid rgba(167,177,191,0.42)", borderRadius: 12,
            background: "rgba(255,255,255,0.78)", padding: 12,
            display: "flex", flexDirection: "column",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobileLayout ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 8 }}>
              {TV_FIELDS.map((field) => (
                <label key={field.key} style={{
                  display: "flex", flexDirection: "column",
                  gridColumn: (field.wide || field.multiline) ? "1 / -1" : undefined,
                }}>
                  <span style={LABEL_STYLE}>{field.label}</span>
                  <FieldInput field={field} value={values[field.key] ?? ""} onChange={(v) => set(field.key, v)} />
                </label>
              ))}
            </div>

            <div style={{
              marginTop: 12, display: "flex", alignItems: isMobileLayout ? "stretch" : "center", flexDirection: isMobileLayout ? "column" : "row",
              justifyContent: "space-between", gap: 10,
            }}>
              <div style={{ fontSize: 11, color: saveError ? "#b4232f" : "#335480", minHeight: 16 }}>
                {saveError || saveSuccess || ""}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
