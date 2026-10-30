"use client";

import { useEffect, useState } from "react";
import { fetchMediaSearch } from "../lib/mediaSearchClient";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";
import { MediaEditDialog } from "./MediaEditDialog";
import type { EditorArtworkDraft } from "../lib/v14/editor-layout";
import { editorDelta } from "../lib/v14/editor-delta";

type GameDetailsEditModalProps = {
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
  statusOptions?: string[];
  platformOptions?: string[];
  ownershipOptions?: string[];
  formatOptions?: string[];
};

type FieldDef = {
  key: string;
  label: string;
  multiline?: boolean;
  options?: string[];
  isDate?: boolean;
  isFlag?: boolean;
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

// Fields IGDB can fill in — must match keys returned by /api/media-search?type=game
const IGDB_SYNC_FIELDS: { key: string; label: string }[] = [
  { key: "title",       label: "Title" },
  { key: "releaseDate", label: "Release Date" },
  { key: "platform",    label: "Platform" },
  { key: "platforms",   label: "Platforms" },
  { key: "igdbId",      label: "IGDB ID" },
  { key: "igdbRating",  label: "IGDB Rating" },
  { key: "genres",      label: "Genres" },
  { key: "developer",   label: "Developer" },
  { key: "description", label: "Description" },
  { key: "coverUrl",       label: "Cover URL" },
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

function isLocalUrl(url: string): boolean {
  const normalized = safeStr(url);
  return (
    normalized.startsWith("/") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("blob:") ||
    normalized.startsWith("asset:") ||
    normalized.startsWith("tauri:")
  );
}

function proxied(url: string): string {
  const normalized = safeStr(url);
  if (!normalized) return "";
  return isLocalUrl(normalized) ? normalized : `/api/cover-proxy?src=${encodeURIComponent(normalized)}`;
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
    // Core
    title:          firstNonEmpty(item, ["title", "Title"]),
    platform:       firstNonEmpty(item, ["platform", "Platform"]),
    status:         firstNonEmpty(item, ["status", "gameStatus", "playStatus", "Status"]),
    myRating:       firstNonEmpty(item, ["myRating", "My Rating"]),
    igdbRating:     firstNonEmpty(item, ["igdbRating", "IGDB Rating"]),
    releaseDate:    firstNonEmpty(item, ["releaseDate", "ReleaseDate"]),
    developer:      firstNonEmpty(item, ["developer", "Developer"]),
    genres:         firstNonEmpty(item, ["genres", "Genres"]),
    hoursPlayed:    firstNonEmpty(item, ["hoursPlayed", "Hours Played"]),
    ownership:      firstNonEmpty(item, ["ownership", "Ownership"]),
    format:         firstNonEmpty(item, ["format", "Format"]),
    tag:            firstNonEmpty(item, ["tag", "Tag", "tags", "Tags"]),
    // Dates
    dateCompleted:  firstNonEmpty(item, ["dateCompleted", "Completed Date", "Date Completed"]),
    yearPlayed:     firstNonEmpty(item, ["yearPlayed", "Year Played"]),
    dateAdded:      firstNonEmpty(item, ["dateAdded", "Date Added"]),
    // IDs
    igdbId:         firstNonEmpty(item, ["igdbId", "IGDB_ID"]),
    igdbIdOverride: firstNonEmpty(item, ["igdbIdOverride", "IGDB_ID_Override"]),
    // URLs
    coverUrl:       firstNonEmpty(item, ["coverUrl", "CoverURL", "metadataCoverUrl"]),
    localCoverUrl:  firstNonEmpty(item, ["localCoverUrl", "LocalCoverURL"]),
    // Less common sheet columns
    platforms:      firstNonEmpty(item, ["platforms", "Platforms"]),
    backlog:        firstNonEmpty(item, ["backlog", "Backlog"]),
    completed:      firstNonEmpty(item, ["completed", "Completed"]),
    screenshotsUrl: firstNonEmpty(item, ["screenshotsUrl", "ScreenshotsURL"]),
    // Description
    description:    firstNonEmpty(item, ["description", "Description"]),
    notes:          firstNonEmpty(item, ["notes", "Notes"]),
  };
  for (const key of ["dateCompleted", "dateAdded"] as const) {
    if (raw[key]) {
      const norm = normalizeDateInputValue(raw[key]);
      if (norm) raw[key] = norm;
    }
  }
  return raw;
}


export function GameDetailsEditModal({
  open,
  item,
  onClose,
  onSave,
  onSaved,
  replaceCoverError,
  isNew,
  isDark,
  statusOptions = [],
  platformOptions = [],
  ownershipOptions = [],
  formatOptions = [],
}: GameDetailsEditModalProps) {
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


  if (!open || !item) return null;

  const GAME_FIELDS: FieldDef[] = [
    // Primary
    { key: "title",          label: "Title",              wide: true },
    { key: "platform",       label: "Platform",           options: platformOptions },
    { key: "status",         label: "Status",             options: statusOptions },
    { key: "myRating",       label: "My Rating" },
    { key: "igdbRating",     label: "IGDB Rating" },
    { key: "releaseDate",    label: "Release Date",       isDate: true },
    { key: "developer",      label: "Developer" },
    { key: "genres",         label: "Genres" },
    { key: "hoursPlayed",    label: "Hours Played" },
    { key: "ownership",      label: "Ownership",          options: ownershipOptions },
    { key: "format",         label: "Format",             options: formatOptions },
    { key: "tag",            label: "Tags" },
    // Dates
    { key: "dateCompleted",  label: "Completed Date",     isDate: true },
    { key: "yearPlayed",     label: "Year Played" },
    { key: "dateAdded",      label: "Date Added",         isDate: true },
    // IDs
    { key: "igdbId",         label: "IGDB ID" },
    { key: "igdbIdOverride", label: "IGDB ID Override" },
    // URLs
    { key: "coverUrl",       label: "Cover URL",          wide: true },
    { key: "localCoverUrl",  label: "Local Cover URL",    wide: true },
    // Less common
    { key: "platforms",      label: "Platforms (Multi)" },
    { key: "backlog",        label: "Backlog",            isFlag: true },
    { key: "completed",      label: "Completed",          isFlag: true },
    { key: "screenshotsUrl", label: "Screenshots URL",    wide: true },
    // Description
    { key: "description",    label: "Description",        multiline: true, wide: true },
    { key: "notes",          label: "My Review / Notes",  multiline: true, wide: true, placeholder: "Add your thoughts, review, or personal notes…" },
  ];

  const r2CoverUrl = safeStr(item?.r2CoverUrl || item?.R2CoverUrl);
  const defaultCoverUrl = values.coverUrl || safeStr(item.posterUrl) || safeStr(item.metadataCoverUrl);
  const coverDisplayUrl = r2CoverUrl || values.localCoverUrl || defaultCoverUrl;
  const coverDisplaySrc = proxied(coverDisplayUrl);
  const set = (key: string, val: string) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleSave = async (artwork?: EditorArtworkDraft) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(null);
    try {
      await Promise.resolve(onSave(item, editorDelta(item, values, buildValues(item)), artwork));
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncFromIGDB = async () => {
    if (isSyncing || isSaving) return;
    setSyncError(null);
    setSyncNotice(null);
    setSyncDiff(null);
    setIsSyncing(true);
    try {
      const igdbId = values.igdbId || values.igdbIdOverride || safeStr(item.igdbId) || safeStr(item.igdbIdOverride);
      const title  = values.title || safeStr(item.title);
      if (!igdbId && !title) throw new Error("No IGDB ID or title to look up.");

      const params = new URLSearchParams({ type: "game" });
      if (igdbId) params.set("lookupId", igdbId);
      else if (title) params.set("query", title);

      const res = await fetchMediaSearch(params);
      const payload = await res.json().catch(() => ({})) as {
        ok?: boolean;
        error?: string;
        results?: Array<{ data?: Record<string, string> }>;
      };

      if (!res.ok || !payload.ok) throw new Error(payload.error || "IGDB fetch failed.");

      const incoming: Record<string, string> = payload.results?.[0]?.data ?? {};
      if (!Object.keys(incoming).length) {
        setSyncNotice("No results found on IGDB.");
        return;
      }

      const proposed: Record<string, string> = { ...values };
      for (const { key } of IGDB_SYNC_FIELDS) {
        if (key === "platform" && safeStr(values.platform)) continue;
        const v = safeStr(incoming[key]);
        if (v) proposed[key] = v;
      }

      const diff: DiffRow[] = IGDB_SYNC_FIELDS.map(({ key, label }) => {
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
    setSyncNotice(`Applied ${syncDiff.filter((r) => r.selected).length} field(s) from IGDB.`);
  };

  const selectedCount = syncDiff ? syncDiff.filter((r) => r.selected).length : 0;

  return <MediaEditDialog media="game" isDark={isDark} isNew={isNew} fields={GAME_FIELDS} initialValues={buildValues(item)} values={values} onChange={set} onClose={onClose} onSave={handleSave}
    cover={coverDisplaySrc} defaultCover={defaultCoverUrl} saving={isSaving} syncing={isSyncing} error={saveError || syncError || replaceCoverError} notice={syncNotice || saveSuccess}
    refresh={[{label:"Refresh IGDB details",onClick:handleSyncFromIGDB}]} review={syncDiff ? <>{syncDiff ? (
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
                IGDB returned {syncDiff.length} change{syncDiff.length !== 1 ? "s" : ""} — choose what to apply
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
                const isImg = row.key === "coverUrl";
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
        ) : null}</> : null} />;
}
