"use client";

import { useEffect, useRef, useState } from "react";
import { fetchMediaSearch } from "../lib/mediaSearchClient";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";

type GameDetailsEditModalProps = {
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
  if (field.isFlag) {
    const checked = value === "TRUE" || value === "true" || value === "1" || value === "yes";
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 34 }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "TRUE" : "")}
          style={{ width: 16, height: 16, accentColor: "#0071e3", cursor: "pointer" }}
        />
      </div>
    );
  }
  if (field.multiline) {
    return <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} placeholder={field.placeholder} style={{ ...INPUT_STYLE, resize: "vertical" }} />;
  }
  if (field.options && field.options.length > 0) {
    const opts = field.options;
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={INPUT_STYLE}>
        <option value="">— select —</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
        {value && !opts.includes(value) ? <option value={value}>{value}</option> : null}
      </select>
    );
  }
  return <input type={field.isDate ? "date" : "text"} value={value} onChange={(e) => onChange(e.target.value)} style={INPUT_STYLE} />;
}

export function GameDetailsEditModal({
  open,
  item,
  onClose,
  onSave,
  onSaved,
  onReplaceCover,
  onSyncCoverToR2,
  isReplacingCover = false,
  replaceCoverError,
  isNew,
  statusOptions = [],
  platformOptions = [],
  ownershipOptions = [],
  formatOptions = [],
}: GameDetailsEditModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [syncDiff, setSyncDiff] = useState<DiffRow[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateLayout = () => setIsMobileLayout(window.innerWidth <= 980);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

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
    setSyncNotice(`Applied ${syncDiff.filter((r) => r.selected).length} field(s) from IGDB.`);
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
        padding: 10,
      }}
      onClick={() => { if (!isSaving && !isSyncing) { if (syncDiff) { setSyncDiff(null); } else { onClose(); } } }}
    >
      <div
        style={{
          width: "min(1100px,100%)",
          maxHeight: "calc(100vh - 20px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.55)",
          background: "linear-gradient(180deg,rgba(251,252,254,0.96) 0%,rgba(241,244,249,0.98) 100%)",
          boxShadow: "0 24px 48px rgba(15,23,40,0.26), inset 0 1px 0 rgba(255,255,255,0.86)",
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div style={{
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
          flexWrap: "wrap",
          padding: "10px 14px", borderBottom: "1px solid rgba(167,177,191,0.42)",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", marginLeft: "auto" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} />
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} />
            <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 650, color: "#1d2735" }}>
              {isNew ? "Add Game" : "Edit Game"}
            </span>
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
              onClick={handleSyncFromIGDB}
              style={{
                border: "1px solid rgba(0,113,227,0.4)", borderRadius: 8,
                padding: "5px 10px",
                background: "rgba(0,113,227,0.09)",
                color: "#0071e3", cursor: isSyncing || isSaving ? "default" : "pointer",
                fontSize: 11, fontWeight: 650,
                opacity: isSyncing || isSaving ? 0.6 : 1,
                transition: "opacity 120ms",
              }}
            >
              {isSyncing ? "Syncing…" : "Sync from IGDB"}
            </button>
            <button type="button" disabled={isSaving} onClick={handleSave} style={{
              border: "1px solid rgba(27,83,217,0.5)", borderRadius: 8,
              padding: "5px 10px",
              background: "linear-gradient(180deg,rgba(86,150,255,0.95) 0%,rgba(45,109,237,0.98) 100%)",
              color: "#f6f9ff", fontSize: 11, fontWeight: 750,
              cursor: isSaving ? "default" : "pointer",
            }}>
              {isSaving ? "Saving…" : isNew ? "Add to Library" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              style={{
                border: "1px solid rgba(149,161,178,0.5)", borderRadius: 8,
                padding: "5px 10px", background: "rgba(255,255,255,0.86)",
                color: "#243244", cursor: "pointer", fontSize: 11, fontWeight: 650,
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* IGDB sync diff panel */}
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
        ) : null}

        {/* Body */}
        <div style={{ display: "grid", gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(180px,210px) minmax(0,1fr)", gap: 12, padding: isMobileLayout ? 10 : 12 }}>

          {/* Cover panel */}
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
            {coverDisplaySrc ? (
              <img
                src={coverDisplaySrc}
                alt={safeStr(item.title) || "Game cover"}
                style={{ display: "block", margin: "0 auto", width: "auto", height: "auto", maxWidth: "100%", objectFit: "contain", maxHeight: isMobileLayout ? 360 : 280, ...COVER_IMAGE_RADIUS_STYLE }}
              />
            ) : (
              <div style={{
                height: 180, borderRadius: 8,
                border: "1px dashed rgba(149,161,178,0.58)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#5f6e82", fontSize: 11,
              }}>
                No cover
              </div>
            )}
            </div>
            <div style={{ display: "grid", gap: 7 }}>
              <button
                type="button"
                disabled={isReplacingCover || !defaultCoverUrl || !onSyncCoverToR2}
                onClick={async () => {
                  if (!defaultCoverUrl || !onSyncCoverToR2) return;
                  await Promise.resolve(onSyncCoverToR2(item, defaultCoverUrl));
                }}
                style={{ border: "1px solid rgba(15,118,110,0.34)", borderRadius: 10, padding: "9px 10px", fontSize: 12, fontWeight: 800, cursor: isReplacingCover || !defaultCoverUrl || !onSyncCoverToR2 ? "default" : "pointer", background: "linear-gradient(180deg,rgba(236,253,245,0.98),rgba(209,250,229,0.88))", color: isReplacingCover || !defaultCoverUrl || !onSyncCoverToR2 ? "#8a929d" : "#0f766e" }}
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
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, color: "#4b5b70" }}><span>Default artwork</span><strong style={{ color: defaultCoverUrl ? "#0f766e" : "#8a929d" }}>{defaultCoverUrl ? "Available" : "Missing"}</strong></div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 11, color: "#4b5b70" }}><span>Displayed cover</span><strong style={{ color: r2CoverUrl ? "#0f766e" : "#8a929d" }}>{r2CoverUrl ? "Stored in R2" : "Using default"}</strong></div>
            </div>
            <details style={{ borderTop: "1px solid rgba(149,161,178,0.24)", paddingTop: 8 }}>
              <summary style={{ cursor: "pointer", color: "#66758a", fontSize: 10.5, fontWeight: 750 }}>Source details</summary>
              <div style={{ marginTop: 7, display: "grid", gap: 5 }}>
                <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}><strong>Default:</strong> {defaultCoverUrl || "—"}</div>
                <div style={{ fontSize: 10, color: "#3f4d61", wordBreak: "break-all" }}><strong>R2:</strong> {r2CoverUrl || "—"}</div>
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
              {GAME_FIELDS.map((field) => (
                <label key={field.key} style={{
                  display: "flex", flexDirection: "column",
                  gridColumn: (field.wide || field.multiline) ? "1 / -1" : undefined,
                  alignItems: field.isFlag ? "center" : undefined,
                }}>
                  <span style={{ ...LABEL_STYLE, textAlign: field.isFlag ? "center" : undefined }}>{field.label}</span>
                  <FieldInput field={field} value={values[field.key] ?? ""} onChange={(v) => set(field.key, v)} />
                </label>
              ))}
            </div>

            <div style={{
              marginTop: 12, display: "flex", alignItems: "center",
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
