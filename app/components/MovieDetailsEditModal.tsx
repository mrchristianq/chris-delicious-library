"use client";

import { useEffect, useState } from "react";
import { fetchMediaSearch } from "../lib/mediaSearchClient";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";
import { MediaEditDialog } from "./MediaEditDialog";
import type { EditorArtworkDraft } from "../lib/v14/editor-layout";
import { editorDelta } from "../lib/v14/editor-delta";

type MovieDetailsEditModalProps = {
  open: boolean;
  item: Record<string, unknown> | null;
  onClose: () => void;
  onSave: (item: Record<string, unknown>, updates: Record<string, string>, artwork?: EditorArtworkDraft) => Promise<void> | void;
  onSaved?: () => void;
  onReplaceCover?: (item: Record<string, unknown>, file: File) => Promise<void> | void;
  onSyncCoverToR2?: (item: Record<string, unknown>, sourceUrl: string) => Promise<void> | void;
  isReplacingCover?: boolean;
  replaceCoverError?: string | null;
  isNew?: boolean;
  isDark?: boolean;
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

const WATCH_STATUS_OPTIONS = ["Watched", "Watching", "Backlog", "Pending Digital Release", "Abandoned"] as const;
const RELEASE_STATUS_OPTIONS = ["Released", "Upcoming"] as const;

const MOVIE_FIELDS: FieldDef[] = [
  { key: "title",       label: "Title",          wide: true },
  { key: "year",        label: "Year" },
  { key: "watchStatus", label: "Watch Status",    options: WATCH_STATUS_OPTIONS },
  { key: "watchDate",   label: "Watch Date",      isDate: true },
  { key: "myRating",    label: "My Rating" },
  { key: "tmdbRating",  label: "TMDB Rating" },
  { key: "tmdbId",      label: "TMDB ID" },
  { key: "releaseDate", label: "Release Date",    isDate: true },
  { key: "runtime",     label: "Runtime" },
  { key: "status",      label: "Release Status",  options: RELEASE_STATUS_OPTIONS },
  { key: "genres",      label: "Genres" },
  { key: "tags",        label: "Tags" },
  { key: "posterUrl",     label: "Poster URL" },
  { key: "backdropUrl",   label: "Backdrop URL" },
  { key: "overview",      label: "Overview",        multiline: true },
  { key: "notes",         label: "My Review / Notes", multiline: true, placeholder: "Add your thoughts, review, or personal notes…" },
];

// Fields TMDB can fill in
const TMDB_SYNC_FIELDS: { key: string; label: string }[] = [
  { key: "title",       label: "Title" },
  { key: "year",        label: "Year" },
  { key: "tmdbId",      label: "TMDB ID" },
  { key: "releaseDate", label: "Release Date" },
  { key: "runtime",     label: "Runtime" },
  { key: "status",      label: "Release Status" },
  { key: "genres",      label: "Genres" },
  { key: "tmdbRating",  label: "TMDB Rating" },
  { key: "overview",    label: "Overview" },
  { key: "posterUrl",   label: "Poster URL" },
  { key: "backdropUrl", label: "Backdrop URL" },
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
    title:       firstNonEmpty(item, ["title", "Title"]),
    year:        firstNonEmpty(item, ["year", "Year"]),
    myRating:    firstNonEmpty(item, ["myRating", "MyRating", "My Rating"]),
    tmdbRating:  firstNonEmpty(item, ["tmdbRating", "TMDB_Rating"]),
    tmdbId:      firstNonEmpty(item, ["tmdbId", "TMDB_ID"]),
    watchStatus: firstNonEmpty(item, ["watchStatus", "Watch Status", "WatchStatus", "watched", "Watched"]),
    watchDate:   firstNonEmpty(item, ["watchDate", "WatchDate"]),
    tags:        firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]),
    releaseDate: firstNonEmpty(item, ["releaseDate", "ReleaseDate"]),
    runtime:     firstNonEmpty(item, ["runtime", "Runtime"]),
    status:      firstNonEmpty(item, ["status", "Status", "movieStatus"]),
    genres:      firstNonEmpty(item, ["genres", "Genres"]),
    overview:    firstNonEmpty(item, ["overview", "Overview"]),
    posterUrl:      firstNonEmpty(item, ["posterUrl", "PosterURL"]),
    backdropUrl:    firstNonEmpty(item, ["backdropUrl", "BackdropURL"]),
    notes:          firstNonEmpty(item, ["notes", "Notes"]),
  };
  if (item.__cdlIdentity && raw.watchStatus === "Started") raw.watchStatus = "Watching";
  for (const key of Object.keys(raw)) {
    if (key.toLowerCase().includes("date")) {
      const norm = normalizeDateInputValue(raw[key]);
      if (norm) raw[key] = norm;
    }
  }
  return raw;
}


export function MovieDetailsEditModal({ open, item, onClose, onSave, onSaved, replaceCoverError, isNew, isDark,  }: MovieDetailsEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncDiff, setSyncDiff] = useState<DiffRow[] | null>(null);

  useEffect(() => {
    if (!open || !item) return;
    setValues(buildValues(item));
    setSaveError(null);
    setSaveSuccess(null);
    setSyncError(null);
    setSyncNotice(null);
    setSyncDiff(null);
  }, [open, item]);



  // Auto-derive Release Status from Release Date
  useEffect(() => {
    const rd = values.releaseDate;
    if (!rd) return;
    const derived = new Date(rd) > new Date() ? "Upcoming" : "Released";
    setValues((prev) => prev.status === derived ? prev : { ...prev, status: derived });
  }, [values.releaseDate]);

  if (!open || !item) return null;

  const posterUrl = values.posterUrl || safeStr(item.posterUrl) || safeStr(item.PosterURL);
  const r2CoverUrl = safeStr(item?.r2CoverUrl || item?.R2CoverUrl);
  const displayedPosterUrl = r2CoverUrl || posterUrl;
  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = async (artwork?: EditorArtworkDraft) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      const initial = buildValues(item);
      // Match the existing automatic initial release-status calculation.
      if (initial.releaseDate) initial.status = new Date(initial.releaseDate) > new Date() ? "Upcoming" : "Released";
      await Promise.resolve(onSave(item, editorDelta(item, values, initial), artwork));
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

      const params = new URLSearchParams({ type: "movie" });
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

      // Build proposed values from TMDB, only overwriting non-empty incoming
      const proposed: Record<string, string> = { ...values };
      for (const { key } of TMDB_SYNC_FIELDS) {
        const v = safeStr(incoming[key]);
        if (v) proposed[key] = v;
      }

      // Diff
      const diff: DiffRow[] = TMDB_SYNC_FIELDS.map(({ key, label }) => {
        const before = safeStr(values[key]);
        const after  = safeStr(proposed[key]);
        if (before === after) return null;
        return { key, label, before: before || "—", after: after || "—", selected: !["imageUrl", "posterUrl", "coverUrl", "backdropUrl", "screenshotsUrl", "platform", "type"].includes(key) };
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

  const initialEditorValues=buildValues(item);
  if(initialEditorValues.releaseDate) initialEditorValues.status=new Date(initialEditorValues.releaseDate)>new Date()?"Upcoming":"Released";
  return <MediaEditDialog media="movie" isDark={isDark} isNew={isNew} fields={MOVIE_FIELDS} initialValues={initialEditorValues} values={values} onChange={set} onClose={onClose} onSave={handleSave}
    cover={displayedPosterUrl} defaultCover={posterUrl} saving={isSaving} syncing={isSyncing} error={saveError || syncError || replaceCoverError} notice={syncNotice || saveSuccess}
    refresh={[{label:"Refresh TMDB details",onClick:handleSyncFromTMDB}]} review={syncDiff ? <>{syncDiff ? (
          <div style={{
            margin: "12px 12px 0",
            border: "1px solid rgba(0,113,227,0.22)",
            borderRadius: 12,
            background: "rgba(0,113,227,0.04)",
            overflow: "hidden",
          }}>
            {/* Diff header */}
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
                <button
                  type="button"
                  onClick={() => setSyncDiff((prev) => prev?.map((r) => ({ ...r, selected: true })) ?? null)}
                  style={{ border: "none", background: "transparent", fontSize: 11, color: "#0071e3", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={() => setSyncDiff((prev) => prev?.map((r) => ({ ...r, selected: false })) ?? null)}
                  style={{ border: "none", background: "transparent", fontSize: 11, color: "rgba(0,0,0,0.45)", cursor: "pointer", fontWeight: 600, padding: "4px 6px" }}
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Diff rows */}
            <div style={{ padding: "6px 0" }}>
              {syncDiff.map((row) => {
                const isImg = row.key === "posterUrl" || row.key === "backdropUrl";
                return (
                  <label
                    key={row.key}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 110px 1fr auto 1fr",
                      alignItems: "start",
                      gap: 8,
                      padding: "7px 14px",
                      cursor: "pointer",
                      background: row.selected ? "rgba(0,113,227,0.05)" : "transparent",
                      transition: "background 100ms",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={row.selected}
                      onChange={() => toggleDiffRow(row.key)}
                      style={{ marginTop: 2, accentColor: "#0071e3", cursor: "pointer" }}
                    />
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

            {/* Diff actions */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8,
              padding: "10px 14px",
              borderTop: "1px solid rgba(0,113,227,0.14)",
            }}>
              <button
                type="button"
                onClick={() => setSyncDiff(null)}
                style={{
                  border: "1px solid rgba(149,161,178,0.5)", borderRadius: 8,
                  padding: "7px 14px", background: "rgba(255,255,255,0.86)",
                  color: "#243244", cursor: "pointer", fontSize: 12, fontWeight: 650,
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={applyDiff}
                style={{
                  border: "1px solid rgba(0,113,227,0.5)", borderRadius: 8,
                  padding: "7px 16px",
                  background: selectedCount === 0 ? "rgba(0,113,227,0.12)" : "linear-gradient(180deg,rgba(86,150,255,0.95) 0%,rgba(45,109,237,0.98) 100%)",
                  color: selectedCount === 0 ? "rgba(0,113,227,0.45)" : "#f6f9ff",
                  cursor: selectedCount === 0 ? "default" : "pointer",
                  fontSize: 12, fontWeight: 700,
                }}
              >
                Apply {selectedCount > 0 ? selectedCount : ""} Selected
              </button>
            </div>
          </div>
        ) : null}</> : null} />;
}
