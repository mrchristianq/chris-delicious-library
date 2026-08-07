"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";
import { scaledPx, useDesktopDetailScale, useFitToViewportScale } from "./detailScale";
import { handleExternalLinkClick, openExternalUrl } from "../native/externalLinks";

type TVDetailsPageProps = {
  item: Record<string, unknown>;
  isMobileLayout: boolean;
  usePageBackground?: boolean;
  onBack: () => void;
  onEdit?: (item: Record<string, unknown>) => void;
  onDelete?: (item: Record<string, unknown>) => Promise<void> | void;
  onRate?: (item: Record<string, unknown>) => void;
  getDisplayCoverUrl: (item: Record<string, unknown>) => string;
  getDisplayBackdropUrl: (item: Record<string, unknown>) => string;
  onPaletteChange?: (palette: { start: string; end: string } | null) => void;
  relatedShows?: Record<string, unknown>[];
  relatedShowsLabel?: string;
  recommendedShows?: Record<string, unknown>[];
  episodeRows?: TVEpisodeRow[];
  onRefreshEpisodes?: (item: Record<string, unknown>, force?: boolean) => Promise<TVEpisodeRow[]>;
  onUpdateEpisodeProgress?: (episode: TVEpisodeRow, watched: boolean) => Promise<void>;
  onBulkUpdateEpisodeProgress?: (
    episodes: TVEpisodeRow[],
    watched: boolean,
    onProgress?: (progress: TVEpisodeBulkSaveProgress) => void
  ) => Promise<void>;
  suppressRemoteRelatedCovers?: boolean;
  onSelectRelated?: (item: Record<string, unknown>) => void;
  highlightColor?: string;
};

type TVEpisodeBulkSaveProgress = {
  total: number;
  confirmed: number;
  chunkIndex?: number;
  chunkCount?: number;
  message?: string;
};

type TVEpisodeRow = Record<string, string> & {
  EpisodeKey?: string;
  ShowTMDB_ID?: string;
  ShowTitle?: string;
  SeasonNumber?: string;
  SeasonTitle?: string;
  SeasonPosterURL?: string;
  EpisodeNumber?: string;
  EpisodeTitle?: string;
  AirDate?: string;
  StillURL?: string;
  Overview?: string;
  Runtime?: string;
  Watched?: string;
  WatchedAt?: string;
  UpdatedAt?: string;
};

type PaletteState = {
  start: string;
  end: string;
  text: string;
  mutedText: string;
  surface: string;
  surfaceBorder: string;
  chip: string;
};

const FALLBACK_PALETTE: PaletteState = {
  start: "#141a28",
  end: "#1e1530",
  text: "#f6f4f2",
  mutedText: "rgba(246, 244, 242, 0.70)",
  surface: "rgba(255, 255, 255, 0.09)",
  surfaceBorder: "rgba(255, 255, 255, 0.12)",
  chip: "rgba(255, 255, 255, 0.13)",
};

function clampChannel(v: number): number { return Math.max(0, Math.min(255, Math.round(v))); }
function safeStr(v: unknown): string { return String(v ?? "").trim(); }
function isRemoteHttpUrl(value: string): boolean { return /^https?:\/\//i.test(value); }
function splitList(v: unknown): string[] { return safeStr(v).split(/[,|/]/g).map(p => p.trim()).filter(Boolean); }
function upgradeTmdbProfileImageSize(url: string, size: string = "h632"): string {
  if (!url || !/image\.tmdb\.org\/t\/p\//.test(url)) return url;
  return url.replace(/\/t\/p\/(w\d+|h\d+|original)\//, `/t/p/${size}/`);
}
function formatYear(v: unknown): string { const r = safeStr(v); const m = r.match(/\b((?:19|20)\d{2})\b/); return m ? m[1] : r; }
function formatMmDdYyyy(v: unknown): string {
  const raw = safeStr(v);
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    const mm = iso[2].padStart(2, "0");
    const dd = iso[3].padStart(2, "0");
    return `${mm}-${dd}-${iso[1]}`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const yyyy = String(parsed.getFullYear());
  return `${mm}-${dd}-${yyyy}`;
}

function normalizeName(value: unknown): string {
  return safeStr(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function parseCreatorTokens(value: unknown): string[] {
  const raw = safeStr(value);
  if (!raw) return [];
  return raw
    .split(/,|\/|;|\band\b|&/gi)
    .map((token) => normalizeName(token))
    .filter(Boolean);
}

function getTmdbTvUrl(item: Record<string, unknown>): string {
  const id = safeStr((item as Record<string, unknown>).tmdbId || (item as Record<string, unknown>).TMDB_ID || (item as Record<string, unknown>).id);
  if (!id) return "";
  return `https://www.themoviedb.org/tv/${encodeURIComponent(id)}`;
}

function toScorePct(raw: string): number {
  const n = parseFloat(raw);
  if (!isFinite(n) || n <= 0) return 0;
  if (n > 10) return Math.min(100, Math.round(n));
  return Math.round(n * 10);
}

function scoreColor(pct: number): string {
  if (pct < 40) return "#dc2626";
  if (pct < 60) return "#f87171";
  if (pct < 70) return "#f59e0b";
  if (pct < 80) return "#84cc16";
  return "#22c55e";
}

function ScoreCircle({ raw, label, labelColor, layout = "stacked" }: { raw: string; label: string; labelColor?: string; layout?: "stacked" | "inline" | "inline-stack" }) {
  const pct = toScorePct(raw);
  if (!pct) return null;
  const r = 22, size = 56, stroke = 3.5;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = scoreColor(pct);
  const inline = layout === "inline";
  const inlineStack = layout === "inline-stack";
  const sideways = inline || inlineStack;
  const labelWords = label.trim().split(/\s+/);
  return (
    <div style={{ display: "flex", flexDirection: sideways ? "row" : "column", alignItems: "center", gap: sideways ? 10 : 5, flexShrink: 0 }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 800, color: "#fff",
        }}>
          {pct}%
        </div>
      </div>
      {inlineStack ? (
        <div style={{ display: "flex", flexDirection: "column", fontSize: 13, fontWeight: 700, color: labelColor || "rgba(255,255,255,0.6)", textAlign: "left", lineHeight: 1.2 }}>
          {labelWords.map((w, i) => <span key={i}>{w}</span>)}
        </div>
      ) : (
        <div style={{ fontSize: inline ? 14 : 10, fontWeight: 700, color: labelColor || "rgba(255,255,255,0.6)", textAlign: inline ? "left" : "center", lineHeight: 1.2 }}>
          {label}
        </div>
      )}
    </div>
  );
}

function hexToRgb(hex: string) { const n = hex.replace("#", ""); return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) }; }
function rgba(hex: string, a: number) { const { r, g, b } = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function rgbToHex(r: number, g: number, b: number) { const h = (c: number) => clampChannel(c).toString(16).padStart(2, "0"); return `#${h(r)}${h(g)}${h(b)}`; }
function mixHex(a: string, b: string, w: number) { const ca = hexToRgb(a), cb = hexToRgb(b), t = Math.max(0, Math.min(1, w)); return rgbToHex(ca.r * (1 - t) + cb.r * t, ca.g * (1 - t) + cb.g * t, ca.b * (1 - t) + cb.b * t); }
function getLum(hex: string) { const { r, g, b } = hexToRgb(hex); const l = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * l(r) + 0.7152 * l(g) + 0.0722 * l(b); }
function getTextColor(colors: string[]) { return colors.reduce((s, c) => s + getLum(c), 0) / colors.length > 0.46 ? "#18202b" : "#f6f4f2"; }

function buildPalette(start: string, end: string): PaletteState {
  const text = getTextColor([start, end]);
  const light = text === "#f6f4f2";
  return {
    start, end, text,
    mutedText: light ? "rgba(246,244,242,0.70)" : "rgba(24,32,43,0.70)",
    surface: light ? "rgba(255,255,255,0.09)" : "rgba(255,255,255,0.24)",
    surfaceBorder: light ? "rgba(255,255,255,0.12)" : "rgba(24,32,43,0.08)",
    chip: light ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.32)",
  };
}

function isLocalUrl(url: string) {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("data:") || url.startsWith("blob:")) return true;
  try { return new URL(url, window.location.href).origin === window.location.origin; } catch { return false; }
}

function proxied(url: string) { const n = safeStr(url); if (!n) return ""; return isLocalUrl(n) ? n : `/api/cover-proxy?src=${encodeURIComponent(n)}`; }

function tryExtract(url: string): Promise<PaletteState | null> {
  return new Promise(resolve => {
    if (!url || typeof window === "undefined") { resolve(null); return; }
    const img = new Image();
    img.crossOrigin = "anonymous"; img.decoding = "async";
    img.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = 64; c.height = 36;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, 64, 36);
        const px = ctx.getImageData(0, 0, 64, 36).data;
        const buckets = new Map<string, { count: number; r: number; g: number; b: number; sat: number }>();
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] < 200) continue;
          const r = px[i], g = px[i + 1], b = px[i + 2];
          const max = Math.max(r, g, b), min = Math.min(r, g, b), br = (r + g + b) / 3, sat = max === 0 ? 0 : (max - min) / max;
          if (br < 10 || br > 250) continue;
          const key = `${Math.round(r / 22)}-${Math.round(g / 22)}-${Math.round(b / 22)}`;
          const w = 1 + sat * 4.5 + (br > 40 && br < 220 ? 0.6 : 0);
          const bk = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, sat: 0 };
          bk.count += w; bk.r += r * w; bk.g += g * w; bk.b += b * w; bk.sat += sat * w;
          buckets.set(key, bk);
        }
        const cols = Array.from(buckets.values()).map(bk => { const c = Math.max(bk.count, 1); return { color: rgbToHex(bk.r / c, bk.g / c, bk.b / c), score: bk.count * (1 + bk.sat / c) }; }).sort((a, b) => b.score - a.score);
        const first = cols[0]?.color ?? FALLBACK_PALETTE.start;
        const fr = hexToRgb(first);
        const second = cols.find(({ color }) => { const c = hexToRgb(color); return Math.abs(c.r - fr.r) + Math.abs(c.g - fr.g) + Math.abs(c.b - fr.b) > 70; })?.color ?? mixHex(first, getLum(first) > 0.45 ? "#1a2840" : "#8fa8c8", 0.26);
        const start = getLum(first) > 0.58 ? mixHex(first, "#18273a", 0.24) : mixHex(first, "#ffffff", 0.02);
        const end = getLum(second) > 0.58 ? mixHex(second, "#1e2e44", 0.22) : mixHex(second, "#ffffff", 0.02);
        resolve(buildPalette(start, end));
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = proxied(url);
  });
}

async function extractPalette(backdropUrl: string, fallback: string): Promise<PaletteState> {
  if (backdropUrl) { const p = await tryExtract(backdropUrl); if (p) return p; }
  if (fallback) { const p = await tryExtract(fallback); if (p) return p; }
  return FALLBACK_PALETTE;
}

function useFitCount(ref: React.RefObject<HTMLDivElement | null>, itemW: number, gap: number): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 0) setCount(Math.max(1, Math.floor((w + gap) / (itemW + gap))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, itemW, gap]);
  return count || 1;
}

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(0,0,0,0.52)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.10)",
};

export function TVDetailsPage({
  item, isMobileLayout, usePageBackground = false,
  onBack, onEdit, onDelete, onRate, getDisplayCoverUrl, getDisplayBackdropUrl, onPaletteChange,
  relatedShows, relatedShowsLabel, recommendedShows, episodeRows = [], onRefreshEpisodes,
  onUpdateEpisodeProgress, onBulkUpdateEpisodeProgress, onSelectRelated, highlightColor,
  suppressRemoteRelatedCovers = false,
}: TVDetailsPageProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [failedRelatedCoverUrls, setFailedRelatedCoverUrls] = useState<Set<string>>(() => new Set());
  const [failedCastPhotoUrls, setFailedCastPhotoUrls] = useState<Set<string>>(() => new Set());
  const detailScale = useDesktopDetailScale(isMobileLayout);
  const { ref: stageRef, scale: fitScale } = useFitToViewportScale<HTMLDivElement>(isMobileLayout, {
    fitMode: "width",
  });
  const coverUrl = getDisplayCoverUrl(item);
  const backdropUrl = getDisplayBackdropUrl(item);

  const cacheKey = useMemo(() => [safeStr(item.title), backdropUrl, coverUrl].join("|"), [item, backdropUrl, coverUrl]);
  const [ready, setReady] = useState(false);
  const [entry, setEntry] = useState<{ key: string; palette: PaletteState } | null>(null);
  const palette = entry?.key === cacheKey ? entry.palette : FALLBACK_PALETTE;

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    extractPalette(backdropUrl, coverUrl).then(p => {
      if (!cancelled) { setEntry({ key: cacheKey, palette: p }); setReady(true); }
    });
    return () => { cancelled = true; setReady(false); onPaletteChange?.(null); };
  }, [backdropUrl, coverUrl, cacheKey, onPaletteChange]);

  useEffect(() => {
    if (!ready) return;
    onPaletteChange?.({ start: palette.start, end: palette.end });
  }, [ready, palette.start, palette.end, onPaletteChange]);

  const title = safeStr(item.title) || "Untitled";
  const year = formatYear(item.firstAirDate || item.year);
  const lastYear = formatYear(item.lastAirDate);
  const yearRange = year && lastYear && lastYear !== year ? `${year}–${lastYear}` : year;
  const numberOfSeasons = safeStr(item.numberOfSeasons);
  const numberOfEpisodes = safeStr(item.numberOfEpisodes);
  const genres = splitList(item.genres).slice(0, 3);
  const overview = safeStr(item.overview);
  const notes = safeStr(item.notes || item.Notes);
  const myRating = safeStr(item.myRating);
  const tmdbRating = safeStr(item.tmdbRating);
  const watchStatus = safeStr(item.watchStatus || item.watched);
  const tvShowStatus = safeStr(item.showStatus);
  const firstAirDate = formatMmDdYyyy(item.firstAirDate);
  const lastAirDate = formatMmDdYyyy(item.lastAirDate);
  const dateCompleted = formatMmDdYyyy(item.dateCompleted);
  const caughtUp = safeStr(item.caughtUp);
  const networks = safeStr(item.networks);
  const creator = safeStr(item.creator);
  const topcastNames = splitList(item.topcast);
  const topcastPhotoList = safeStr(item.nativeTopcastPhotos || item.NativeTopcastPhotos || item.topcastPhotos).split(",").map(s => s.trim()).filter(Boolean);
  const castMembers = topcastNames.slice(0, 10).map((name, i) => {
    const photo = upgradeTmdbProfileImageSize(topcastPhotoList[i] || "");
    return {
      name,
      photo: ((suppressRemoteRelatedCovers && isRemoteHttpUrl(photo)) || failedCastPhotoUrls.has(photo)) ? "" : photo,
    };
  });

  const seasonsLabel = numberOfSeasons ? `${numberOfSeasons} Season${numberOfSeasons === "1" ? "" : "s"}` : "";
  const metaParts = [yearRange, seasonsLabel, networks, ...genres].filter(Boolean);
  const titleFontSize = isMobileLayout ? 22 : scaledPx(title.length > 44 ? 26 : title.length > 28 ? 32 : 38, detailScale);

  const descriptionText = overview || "";

  const castRowRef = useRef<HTMLDivElement>(null);
  const relatedRowRef = useRef<HTMLDivElement>(null);
  const DETAIL_PORTRAIT_W = isMobileLayout ? 80 : scaledPx(92, detailScale);
  const DETAIL_PORTRAIT_H = Math.round(DETAIL_PORTRAIT_W * 1.5);
  const CAST_ITEM_W = DETAIL_PORTRAIT_W;
  const CAST_IMAGE_H = DETAIL_PORTRAIT_H;
  const CAST_GAP = isMobileLayout ? 14 : scaledPx(20, detailScale);
  const RELATED_ITEM_W = DETAIL_PORTRAIT_W;
  const RELATED_GAP = isMobileLayout ? 10 : scaledPx(10, detailScale);
  const maxCast = useFitCount(castRowRef, CAST_ITEM_W, CAST_GAP);
  const maxRelated = useFitCount(relatedRowRef, RELATED_ITEM_W, RELATED_GAP);
  const visibleCast = castMembers.slice(0, maxCast);
  const recommendationItems = (recommendedShows ?? []).filter((show) => safeStr(show.title));
  const libraryRelatedItems = relatedShows ?? [];
  const relatedKey = (item: Record<string, unknown>) => safeStr((item as any).tmdbId || (item as any).TMDB_ID || item.title).toLowerCase();
  const libraryKeys = new Set(libraryRelatedItems.map(relatedKey).filter(Boolean));
  const recommendationFill = recommendationItems.filter((item) => !libraryKeys.has(relatedKey(item)));
  const effectiveRelatedItems = [...libraryRelatedItems, ...recommendationFill];
  const effectiveRelatedLabel = recommendationFill.length > 0
    ? "You May Also Like"
    : (libraryRelatedItems.length > 0 ? (relatedShowsLabel || "MORE LIKE THIS") : "You May Also Like");
  const visibleRelated = (() => {
    if (!libraryRelatedItems.length || !recommendationFill.length) {
      return effectiveRelatedItems.slice(0, maxRelated);
    }
    const librarySlots = Math.max(1, Math.floor(maxRelated / 2));
    const recSlots = Math.max(1, maxRelated - librarySlots);
    return [
      ...libraryRelatedItems.slice(0, librarySlots),
      ...recommendationFill.slice(0, recSlots),
    ].slice(0, maxRelated);
  })();

  const chipStatus = watchStatus || tvShowStatus;
  const statusColor = (() => {
    const s = chipStatus.toLowerCase();
    if (s === "watched" || s === "completed")
      return { background: "rgba(220,252,231,0.92)", border: "1px solid rgba(134,239,172,0.5)", color: "#166534" };
    if (s === "watching" || s === "started" || s === "in progress" || s === "caught up")
      return { background: "rgba(254,249,195,0.92)", border: "1px solid rgba(253,224,71,0.5)", color: "#854d0e" };
    if (s === "abandoned" || s === "dropped")
      return { background: "rgba(255,237,213,0.92)", border: "1px solid rgba(253,186,116,0.5)", color: "#9a3412" };
    return { background: "rgba(255,255,255,0.88)", border: "1px solid rgba(255,255,255,0.4)", color: "#111" };
  })();

  const ratingFacts = [
    tmdbRating ? { label: "TMDB RATING", value: tmdbRating } : null,
    myRating ? { label: "MY RATING", value: myRating } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const [episodeLoading, setEpisodeLoading] = useState(false);
  const [episodeError, setEpisodeError] = useState<string | null>(null);
  const [episodeSyncProgress, setEpisodeSyncProgress] = useState<TVEpisodeBulkSaveProgress | null>(null);
  const [expandedSeason, setExpandedSeason] = useState<string>("");
  const episodeInitialSeasonSetRef = useRef("");
  const episodeSyncJobRef = useRef(0);
  const episodeSyncJobsRef = useRef<
    Record<number, TVEpisodeBulkSaveProgress & { done?: boolean; failed?: boolean }>
  >({});
  const showEpisodeKey = safeStr((item as Record<string, unknown>).tmdbId || (item as Record<string, unknown>).TMDB_ID || title);
  const episodeKey = (episode: TVEpisodeRow) =>
    safeStr(episode.EpisodeKey) ||
    `${safeStr(episode.ShowTMDB_ID || showEpisodeKey)}:s${safeStr(episode.SeasonNumber)}:e${safeStr(episode.EpisodeNumber)}`;
  const isEpisodeWatched = (episode: TVEpisodeRow) => {
    const value = safeStr(episode.Watched).toLowerCase();
    return value === "true" || value === "yes" || value === "1" || value === "watched";
  };
  const episodeAirTime = (episode: TVEpisodeRow) => {
    const raw = safeStr(episode.AirDate);
    if (!raw) return Number.POSITIVE_INFINITY;
    const parsed = Date.parse(`${raw}T00:00:00`);
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  };
  const sortedEpisodes = useMemo(() => {
    return [...episodeRows].sort((a, b) => {
      const seasonDelta = Number(safeStr(a.SeasonNumber) || 0) - Number(safeStr(b.SeasonNumber) || 0);
      if (seasonDelta) return seasonDelta;
      return Number(safeStr(a.EpisodeNumber) || 0) - Number(safeStr(b.EpisodeNumber) || 0);
    });
  }, [episodeRows]);
  const releasedEpisodes = sortedEpisodes.filter((episode) => episodeAirTime(episode) <= Date.now());
  const watchedEpisodeCount = sortedEpisodes.filter(isEpisodeWatched).length;
  const totalEpisodeCount = sortedEpisodes.length || Number(numberOfEpisodes || 0);
  const detailFacts = [
    caughtUp ? { label: "CAUGHT UP", value: caughtUp } : null,
    tvShowStatus ? { label: "SHOW STATUS", value: tvShowStatus } : null,
    firstAirDate ? { label: "FIRST AIR DATE", value: firstAirDate, half: true } : null,
    lastAirDate ? { label: "LAST AIR DATE", value: lastAirDate, half: true } : null,
    creator ? { label: "CREATOR", value: creator, half: true } : null,
    dateCompleted ? { label: "COMPLETED", value: dateCompleted, half: true } : null,
    numberOfSeasons ? { label: "SEASONS", value: numberOfSeasons, half: true } : null,
    totalEpisodeCount ? { label: "TOTAL EPISODES", value: String(totalEpisodeCount), half: true } : null,
    totalEpisodeCount || watchedEpisodeCount ? { label: "EPISODES WATCHED", value: String(watchedEpisodeCount), half: true } : null,
  ].filter(Boolean) as { label: string; value: string; half?: boolean }[];
  const nextEpisodes = releasedEpisodes.filter((episode) => !isEpisodeWatched(episode)).slice(0, isMobileLayout ? 4 : 6);
  const episodesBySeason = useMemo(() => {
    const groups = new Map<string, TVEpisodeRow[]>();
    for (const episode of sortedEpisodes) {
      const season = safeStr(episode.SeasonNumber) || "0";
      groups.set(season, [...(groups.get(season) || []), episode]);
    }
    return Array.from(groups.entries()).sort((a, b) => Number(a[0]) - Number(b[0]));
  }, [sortedEpisodes]);
  useEffect(() => {
    if (!showEpisodeKey) return;
    if (episodeInitialSeasonSetRef.current !== showEpisodeKey) {
      episodeInitialSeasonSetRef.current = showEpisodeKey;
      const firstUnwatched = episodesBySeason.find(([, rows]) => rows.some((episode) => !isEpisodeWatched(episode)));
      setExpandedSeason(firstUnwatched?.[0] || episodesBySeason[episodesBySeason.length - 1]?.[0] || "");
    }
  }, [episodesBySeason, showEpisodeKey]);
  useEffect(() => {
    if (!onRefreshEpisodes || !showEpisodeKey) return;
    if (episodeRows.length) return;
    let cancelled = false;
    setEpisodeLoading(true);
    setEpisodeError(null);
    onRefreshEpisodes(item, false)
      .catch((error) => {
        if (!cancelled) setEpisodeError(error?.message || "Failed to load episodes.");
      })
      .finally(() => {
        if (!cancelled) setEpisodeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [episodeRows.length, item, onRefreshEpisodes, showEpisodeKey]);
  const refreshEpisodeSyncProgress = () => {
    const jobs = Object.values(episodeSyncJobsRef.current);
    if (!jobs.length) {
      setEpisodeSyncProgress(null);
      return;
    }

    const total = jobs.reduce((sum, job) => sum + job.total, 0);
    const confirmed = jobs.reduce((sum, job) => sum + Math.min(job.confirmed, job.total), 0);
    const failed = jobs.some((job) => job.failed);
    const allDone = jobs.every((job) => job.done || job.failed);

    setEpisodeSyncProgress({
      total,
      confirmed,
      message: failed
        ? "Google Sheets confirmation failed"
        : allDone
          ? "Confirmed in Google Sheets"
          : `Confirming ${total} episode change${total === 1 ? "" : "s"} in Google Sheets...`,
    });
  };
  const clearCompletedEpisodeSyncJobsSoon = () => {
    window.setTimeout(() => {
      const jobs = Object.values(episodeSyncJobsRef.current);
      if (jobs.length && jobs.every((job) => job.done && !job.failed)) {
        episodeSyncJobsRef.current = {};
        refreshEpisodeSyncProgress();
      }
    }, 1600);
  };
  const toggleEpisodeWatched = async (episode: TVEpisodeRow, nextWatched: boolean) => {
    if (!onUpdateEpisodeProgress) return;
    const syncJob = episodeSyncJobRef.current + 1;
    episodeSyncJobRef.current = syncJob;
    episodeSyncJobsRef.current[syncJob] = {
      total: 1,
      confirmed: 0,
      message: "Queued for Google Sheets confirmation...",
    };
    setEpisodeError(null);
    refreshEpisodeSyncProgress();
    try {
      await onUpdateEpisodeProgress(episode, nextWatched);
      episodeSyncJobsRef.current[syncJob] = {
        ...episodeSyncJobsRef.current[syncJob],
        total: 1,
        confirmed: 1,
        message: "Confirmed in Google Sheets",
        done: true,
      };
      refreshEpisodeSyncProgress();
      clearCompletedEpisodeSyncJobsSoon();
    } catch (error: any) {
      setEpisodeError(error?.message || "Failed to save episode progress.");
      episodeSyncJobsRef.current[syncJob] = {
        ...episodeSyncJobsRef.current[syncJob],
        total: 1,
        confirmed: 0,
        message: "Google Sheets confirmation failed",
        failed: true,
      };
      refreshEpisodeSyncProgress();
    }
  };
  const bulkSetWatched = async (episodes: TVEpisodeRow[], watched: boolean) => {
    if (!onBulkUpdateEpisodeProgress || !episodes.length) return;
    const syncJob = episodeSyncJobRef.current + 1;
    episodeSyncJobRef.current = syncJob;
    episodeSyncJobsRef.current[syncJob] = {
      total: episodes.length,
      confirmed: 0,
      message: watched ? "Marking episodes watched..." : "Marking episodes unwatched...",
    };
    setEpisodeError(null);
    refreshEpisodeSyncProgress();
    try {
      await onBulkUpdateEpisodeProgress(episodes, watched, (progress) => {
        episodeSyncJobsRef.current[syncJob] = {
          ...episodeSyncJobsRef.current[syncJob],
          ...progress,
        };
        refreshEpisodeSyncProgress();
      });
      episodeSyncJobsRef.current[syncJob] = {
        ...episodeSyncJobsRef.current[syncJob],
        total: episodes.length,
        confirmed: episodes.length,
        message: "Confirmed in Google Sheets",
        done: true,
      };
      refreshEpisodeSyncProgress();
      clearCompletedEpisodeSyncJobsSoon();
    } catch (error: any) {
      setEpisodeError(error?.message || "Failed to save episode progress.");
      episodeSyncJobsRef.current[syncJob] = {
        ...episodeSyncJobsRef.current[syncJob],
        total: episodeSyncJobsRef.current[syncJob]?.total || episodes.length,
        confirmed: episodeSyncJobsRef.current[syncJob]?.confirmed || 0,
        message: "Google Sheets confirmation failed",
        failed: true,
      };
      refreshEpisodeSyncProgress();
    }
  };
  const watchedToggleStyle = (watched: boolean, size = 28): CSSProperties => ({
    width: size,
    height: size,
    borderRadius: "50%",
    border: `1px solid ${watched ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.56)"}`,
    background: watched
      ? "rgba(255,255,255,0.42)"
      : "rgba(255,255,255,0.20)",
    color: "#ffffff",
    boxShadow: watched
      ? "0 1px 5px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.28)"
      : "inset 0 1px 0 rgba(255,255,255,0.22)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    fontSize: Math.max(11, Math.round(size * 0.48)),
    fontWeight: 800,
    lineHeight: 1,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  });

  const POSTER_W = isMobileLayout ? 120 : scaledPx(190, detailScale);
  const LEFT_COL_W = isMobileLayout ? POSTER_W + 28 : POSTER_W + scaledPx(44, detailScale);
  const DETAILS_W = isMobileLayout ? 0 : scaledPx(320, detailScale);
  const HERO_H = isMobileLayout ? "auto" : scaledPx(418, detailScale);

  const hasRelated = visibleRelated.length > 0;

  const sectionBox = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{
      borderRadius: 16,
      padding: isMobileLayout ? "14px 14px" : "12px 18px",
      background: `linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.02)} 100%)`,
      border: `1px solid ${palette.surfaceBorder}`,
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
      ...style,
    }}>
      {children}
    </div>
  );

  const sectionLabel = (text: string) => (
    <div style={{ fontSize: 10, fontWeight: 860, letterSpacing: "0.09em", color: palette.mutedText, marginBottom: 12 }}>{text}</div>
  );

  return (
    <div style={{
      opacity: ready ? 1 : 0,
      transition: "opacity 260ms ease",
      height: "auto",
      minHeight: "100vh",
      background: usePageBackground ? "transparent" : `linear-gradient(160deg, ${mixHex(palette.start, "#06080f", 0.08)} 0%, ${palette.start} 30%, ${mixHex(palette.end, palette.start, 0.18)} 58%, ${palette.end} 100%)`,
      color: palette.text,
      position: "relative",
      overflowX: "hidden",
      overflowY: "visible",
    }}>
      <style jsx global>{`
        .tvEpisodeWatchNextRow {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .tvEpisodeWatchNextRow::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      {/* Ambient blur */}
      {backdropUrl ? (
        <div aria-hidden style={{
          position: "fixed", inset: 0,
          backgroundImage: `url("${backdropUrl}")`,
          backgroundSize: "cover", backgroundPosition: "center top",
          opacity: 0.18, filter: "blur(52px) saturate(1.4) brightness(0.85)",
          transform: "scale(1.12)", zIndex: 0, pointerEvents: "none",
        }} />
      ) : null}

      <div style={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        height: "auto",
        display: isMobileLayout ? "block" : "flex",
        justifyContent: isMobileLayout ? undefined : "center",
        alignItems: isMobileLayout ? undefined : "flex-start",
      }}>
        <div
          ref={stageRef}
          style={{
            width: isMobileLayout ? "100%" : 1400,
            maxWidth: isMobileLayout ? 1600 : 1400,
            margin: isMobileLayout ? "0 auto" : 0,
            transform: isMobileLayout ? undefined : `scale(${fitScale})`,
            transformOrigin: "top center",
            flexShrink: 0,
          }}
        >

        {/* ── HERO ── */}
        <div style={{
          position: "relative",
          width: "100%",
          height: HERO_H,
          minHeight: isMobileLayout ? "auto" : 400,
          overflow: isMobileLayout ? "visible" : "hidden",
        }}>

          {/* Backdrop image */}
          {backdropUrl ? (
            <img src={backdropUrl} alt="" aria-hidden style={{
              position: "absolute", inset: 0, width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center 22%",
              display: "block",
            }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: `linear-gradient(180deg, ${rgba(palette.start, 0.7)} 0%, ${palette.start} 100%)` }} />
          )}

          {/* Darkening overlays */}
          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to right, rgba(0,0,0,0.58) 0%, rgba(0,0,0,0.36) 50%, rgba(0,0,0,0.16) 100%)",
          }} />
          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: `linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.02) 35%, ${rgba(palette.start, 0.4)} 78%, ${rgba(palette.start, 0.92)} 100%)`,
          }} />

          {/* Top bar: buttons (left) + back (right) */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "14px 16px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              {onRate ? (
                <button type="button" onClick={() => onRate(item)} style={{
                  borderRadius: 999, padding: isMobileLayout ? "6px 11px" : "8px 14px", fontSize: isMobileLayout ? 11 : 12, lineHeight: 1, fontWeight: 750,
                  border: `1px solid rgba(255,255,255,0.4)`, background: `${highlightColor || "#007AFF"}`,
                  color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                }}>Rate It</button>
              ) : null}
              {onEdit ? (
                <button type="button" onClick={() => onEdit(item)} style={{
                  borderRadius: 999, padding: isMobileLayout ? "6px 11px" : "8px 14px", fontSize: isMobileLayout ? 11 : 12, lineHeight: 1, fontWeight: 750,
                  border: "1px solid rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.88)",
                  color: "#111", cursor: "pointer", whiteSpace: "nowrap",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                }}>Edit</button>
              ) : null}
              {onDelete ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (isDeleting) return;
                    const confirmed = window.confirm(`Delete "${safeStr(item.title) || "this item"}" from library? This will remove it from the app and spreadsheet.`);
                    if (!confirmed) return;
                    setIsDeleting(true);
                    try {
                      await onDelete(item);
                    } catch (error: any) {
                      window.alert(error?.message || "Failed to delete show");
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  style={{
                    borderRadius: 999, padding: isMobileLayout ? "6px 11px" : "8px 14px", fontSize: isMobileLayout ? 11 : 12, lineHeight: 1, fontWeight: 750,
                    border: "1px solid rgba(248, 113, 113, 0.55)", background: "rgba(127, 29, 29, 0.9)",
                    color: "#fee2e2", cursor: isDeleting ? "default" : "pointer", whiteSpace: "nowrap",
                    opacity: isDeleting ? 0.75 : 1,
                    backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                  }}
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <button type="button" onClick={onBack} style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.28)", background: "rgba(0,0,0,0.45)",
                color: "#fff", cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(8px)",
              }} aria-label="Back">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              {chipStatus ? (
                <span style={{ borderRadius: 999, padding: isMobileLayout ? "6px 10px" : "8px 13px", fontSize: isMobileLayout ? 11 : 12, lineHeight: 1, fontWeight: 850, ...statusColor }}>
                  {chipStatus.charAt(0).toUpperCase() + chipStatus.slice(1)}
                </span>
              ) : null}
            </div>
          </div>

          {/* Details panel — absolute bottom-right inside hero */}
          {!isMobileLayout && (detailFacts.length > 0 || ratingFacts.length > 0) ? (
            <div style={{
              position: "absolute", bottom: 16, right: 16, width: "max-content", minWidth: 220, maxWidth: 320,
              zIndex: 5,
              ...PANEL_STYLE,
              padding: "16px 20px",
              maxHeight: HERO_H === "auto" ? undefined : (HERO_H as number) - scaledPx(74, detailScale),
              overflow: "hidden",
            }}>
              <div style={{ fontSize: 12, fontWeight: 860, letterSpacing: "0.09em", color: "rgba(255,255,255,0.5)", marginBottom: 14 }}>DETAILS</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 10px" }}>
                {detailFacts.map((f, i) => (
                  <div key={`${f.label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 3, gridColumn: f.half ? undefined : "1 / -1" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>{f.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {ratingFacts.length > 0 ? (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "12px 0" }} />
                  <div style={{ display: "flex", gap: 16 }}>
                    {tmdbRating ? <ScoreCircle raw={tmdbRating} label="User Rating" layout="inline-stack" /> : null}
                    {myRating ? <ScoreCircle raw={myRating} label="My Rating" layout="inline-stack" /> : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {/* Hero content: left column (poster) + middle (title/meta) */}
          <div style={{
            position: isMobileLayout ? "relative" : "absolute",
            top: isMobileLayout ? undefined : scaledPx(52, detailScale),
            left: 0, right: 0, bottom: isMobileLayout ? undefined : 0,
            zIndex: 2,
            display: "flex",
            alignItems: isMobileLayout ? "flex-start" : "stretch",
            flexDirection: isMobileLayout ? "column" : "row",
            paddingTop: isMobileLayout ? 56 : 0,
          }}>
            {/* Left: poster — bottom-anchored */}
            <div style={{
              width: isMobileLayout ? "100%" : LEFT_COL_W,
              flexShrink: 0,
              display: "flex",
              flexDirection: isMobileLayout ? "row" : "column",
              alignItems: isMobileLayout ? "flex-end" : "center",
              justifyContent: isMobileLayout ? undefined : "flex-end",
              padding: isMobileLayout ? "12px 14px 14px" : "0 16px 22px",
            }}>
              {coverUrl ? (() => {
                const externalHref = getTmdbTvUrl(item);
                const img = (
                  <img src={coverUrl} alt={title} style={{
                    width: POSTER_W,
                    flexShrink: 0,
                    border: "2px solid rgba(255,255,255,0.16)",
                    filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.75))",
                    cursor: externalHref ? "pointer" : "default",
                    ...COVER_IMAGE_RADIUS_STYLE,
                  }} />
                );
                return externalHref ? (
                  <a href={externalHref} target="_blank" rel="noopener noreferrer" title="Open on TMDB" onClick={(event) => handleExternalLinkClick(event, externalHref)} style={{ display: "block", lineHeight: 0, flexShrink: 0 }}>
                    {img}
                  </a>
                ) : img;
              })() : null}
            </div>

            {/* Middle: title + meta (bottom-anchored on desktop) */}
            <div style={{
              flex: 1, minWidth: 0,
              display: "flex", flexDirection: "column",
              justifyContent: isMobileLayout ? "flex-start" : "flex-end",
              padding: isMobileLayout ? "12px 14px 16px" : "0 14px 24px",
            }}>
              <h1 style={{
                margin: 0, fontSize: titleFontSize, lineHeight: 1.06, fontWeight: 860,
                letterSpacing: "-0.01em", color: "#fff",
                textShadow: "0 2px 14px rgba(0,0,0,0.6)",
              }}>
                {title}
              </h1>
              {metaParts.length > 0 ? (
                <div style={{
                  marginTop: 8, fontSize: isMobileLayout ? 12 : 14, fontWeight: 700,
                  color: "rgba(255,255,255,0.78)", letterSpacing: "0.01em",
                  textShadow: "0 1px 6px rgba(0,0,0,0.5)",
                }}>
                  {metaParts.map((part, i) => (
                    <span key={i}>
                      {i > 0 && <span style={{ color: "rgba(255,255,255,0.78)" }}>{"  ·  "}</span>}
                      <span style={part === "Netflix" ? { color: "#e60813" } : part === "Prime Video" ? { color: "#01a3db" } : (part === "Disney +" || part === "Disney+") ? { fontFamily: "var(--font-pacifico)", fontWeight: 400 } : (part === "Paramount+" || part === "Paramount +") ? { color: "#085af6" } : part === "AMC" ? { color: "#c5b95b" } : part === "Hulu" ? { color: "#1be17f" } : undefined}>
                        {part === "Peacock" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, verticalAlign: "-1.5px" }}>
                            <img src="/peacock.png" alt="Peacock" style={{ height: "1em", width: "auto", verticalAlign: "middle" }} />
                            {part}
                          </span>
                        ) : part === "Apple TV" ? (
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, verticalAlign: "-3.3px" }}>
                            <img src="/apple.png" alt="Apple TV" style={{ height: "1em", width: "auto", verticalAlign: "middle" }} />
                            {part}
                          </span>
                        ) : part}
                      </span>
                    </span>
                  ))}
                </div>
              ) : null}
              {descriptionText ? (
                <div style={{
                  marginTop: 10,
                  fontSize: isMobileLayout ? 13 : 13,
                  lineHeight: 1.6,
                  color: "rgba(255,255,255,0.72)",
                  textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                  display: "-webkit-box",
                  WebkitLineClamp: isMobileLayout ? 4 : 3,
                  WebkitBoxOrient: "vertical" as const,
                  overflow: "hidden",
                }}>
                  {descriptionText}
                </div>
              ) : null}
            </div>

            {/* Right spacer — keeps title from going under the details panel */}
            {!isMobileLayout && <div style={{ width: DETAILS_W + 16, flexShrink: 0 }} />}
          </div>
        </div>

        {/* ── BODY ── */}
        <div style={{ padding: isMobileLayout ? "8px 10px 28px" : "10px 14px 32px", display: "flex", flexDirection: "column", gap: 10 }}>

          {/* Mobile details panel */}
          {isMobileLayout && (detailFacts.length > 0 || tmdbRating || myRating) ? sectionBox(
            <>
              {sectionLabel("DETAILS")}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
                {detailFacts.map((f, i) => (
                  <div key={`${f.label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: palette.mutedText, letterSpacing: "0.06em" }}>{f.label}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: palette.text, lineHeight: 1.2 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {(tmdbRating || myRating) ? (
                <>
                  <div style={{ height: 1, background: palette.surfaceBorder, margin: "12px 0" }} />
                  <div style={{ display: "flex", gap: 12, justifyContent: "space-evenly", alignItems: "center" }}>
                    {tmdbRating ? <ScoreCircle raw={tmdbRating} label="User Rating" labelColor={palette.mutedText} layout="inline" /> : null}
                    {myRating ? <ScoreCircle raw={myRating} label="My Rating" labelColor={palette.mutedText} layout="inline" /> : null}
                  </div>
                </>
              ) : null}
            </>
          ) : null}

          {/* My Review / Notes */}
          {notes ? sectionBox(
            <>
              {sectionLabel("MY REVIEW / NOTES")}
              <div style={{ fontSize: 13, lineHeight: 1.55, color: palette.text, whiteSpace: "pre-wrap" }}>
                {notes}
              </div>
            </>
          ) : null}

          {/* Episode tracker */}
          {onRefreshEpisodes ? sectionBox(
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                {sectionLabel("EPISODES")}
                <button
                  type="button"
                  onClick={async () => {
                    setEpisodeLoading(true);
                    setEpisodeError(null);
                    try {
                      await onRefreshEpisodes(item, true);
                    } catch (error: any) {
                      setEpisodeError(error?.message || "Failed to refresh episodes.");
                    } finally {
                      setEpisodeLoading(false);
                    }
                  }}
                  disabled={episodeLoading}
                  style={{
                    border: `1px solid ${palette.surfaceBorder}`,
                    borderRadius: 999,
                    background: palette.chip,
                    color: palette.text,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "7px 11px",
                    cursor: episodeLoading ? "default" : "pointer",
                    opacity: episodeLoading ? 0.6 : 1,
                  }}
                >
                  {episodeLoading ? "Refreshing..." : "Refresh Episodes"}
                </button>
              </div>

              {episodeError ? (
                <div style={{
                  marginBottom: 10,
                  padding: "8px 10px",
                  borderRadius: 10,
                  background: "rgba(254, 226, 226, 0.16)",
                  border: "1px solid rgba(248, 113, 113, 0.34)",
                  color: "#fecaca",
                  fontSize: 12,
                  fontWeight: 700,
                }}>
                  {episodeError}
                </div>
              ) : null}

              {episodeSyncProgress ? (
                <div style={{
                  marginBottom: 12,
                  padding: "9px 10px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.10)",
                  border: `1px solid ${palette.surfaceBorder}`,
                  color: palette.text,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 12, fontWeight: 850 }}>
                    <span>{episodeSyncProgress.message || "Saving episode progress..."}</span>
                    <span>{Math.min(episodeSyncProgress.confirmed, episodeSyncProgress.total)} / {episodeSyncProgress.total}</span>
                  </div>
                  <div style={{
                    height: 6,
                    marginTop: 7,
                    borderRadius: 999,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.15)",
                  }}>
                    <div style={{
                      width: `${episodeSyncProgress.total ? Math.min(100, Math.round((episodeSyncProgress.confirmed / episodeSyncProgress.total) * 100)) : 0}%`,
                      height: "100%",
                      borderRadius: 999,
                      background: highlightColor || "#ff9934",
                      transition: "width 160ms ease",
                    }} />
                  </div>
                </div>
              ) : null}

              {nextEpisodes.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: palette.text, marginBottom: 8 }}>Watch Next</div>
                  <div
                    className="tvEpisodeWatchNextRow"
                    style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 2 }}
                  >
                    {nextEpisodes.map((episode) => {
                      const still = safeStr(episode.StillURL);
                      const key = episodeKey(episode);
                      return (
                        <button
                          key={`next-${key}`}
                          type="button"
                          onClick={() => toggleEpisodeWatched(episode, true)}
                          style={{
                            width: isMobileLayout ? 190 : 230,
                            flex: "0 0 auto",
                            border: 0,
                            background: "transparent",
                            padding: 0,
                            color: palette.text,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{
                            position: "relative",
                            height: isMobileLayout ? 96 : 116,
                            borderRadius: 14,
                            overflow: "hidden",
                            background: palette.chip,
                            border: `1px solid ${palette.surfaceBorder}`,
                          }}>
                            {still ? (
                              <img src={still} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                            ) : (
                              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: palette.mutedText, fontSize: 12, fontWeight: 800 }}>
                                No Still
                              </div>
                            )}
                            <span style={{
                              position: "absolute",
                              right: 8,
                              bottom: 8,
                              ...watchedToggleStyle(false, 26),
                            }} />
                          </div>
                          <div style={{ marginTop: 7, fontSize: 10, fontWeight: 900, color: palette.mutedText, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            S{episode.SeasonNumber} E{episode.EpisodeNumber}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 850, lineHeight: 1.2, color: palette.text }}>
                            {safeStr(episode.EpisodeTitle) || `Episode ${episode.EpisodeNumber}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
                <div style={{ fontSize: 13, fontWeight: 900, color: palette.text }}>All Episodes</div>
                <button
                  type="button"
                  onClick={() => bulkSetWatched(releasedEpisodes, true)}
                  disabled={!releasedEpisodes.length}
                  style={{
                    border: `1px solid ${palette.surfaceBorder}`,
                    borderRadius: 999,
                    background: palette.chip,
                    color: palette.text,
                    fontSize: 11,
                    fontWeight: 800,
                    padding: "7px 10px",
                    cursor: releasedEpisodes.length ? "pointer" : "default",
                    opacity: releasedEpisodes.length ? 1 : 0.5,
                  }}
                >
                  Mark Released Watched
                </button>
              </div>

              {episodeLoading && !sortedEpisodes.length ? (
                <div style={{ color: palette.mutedText, fontSize: 13, fontWeight: 700, padding: "12px 0" }}>Loading episodes...</div>
              ) : sortedEpisodes.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {episodesBySeason.map(([season, rows]) => {
                    const watchedCount = rows.filter(isEpisodeWatched).length;
                    const complete = watchedCount > 0 && watchedCount === rows.length;
                    const open = expandedSeason === season;
                    const poster = safeStr(rows[0]?.SeasonPosterURL);
                    return (
                      <div key={`season-${season}`} style={{
                        borderRadius: 16,
                        overflow: "hidden",
                        border: `1px solid ${complete ? rgba(highlightColor || "#ff9934", 0.55) : palette.surfaceBorder}`,
                        background: complete ? rgba(highlightColor || "#ff9934", 0.22) : palette.surface,
                      }}>
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => setExpandedSeason(open ? "" : season)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setExpandedSeason(open ? "" : season);
                            }
                          }}
                          style={{
                            width: "100%",
                            display: "grid",
                            gridTemplateColumns: "44px 1fr auto",
                            alignItems: "center",
                            gap: 12,
                            border: 0,
                            background: "transparent",
                            padding: 10,
                            color: palette.text,
                            textAlign: "left",
                            cursor: "pointer",
                          }}
                        >
                          <div style={{ width: 44, height: 64, borderRadius: 8, overflow: "hidden", background: palette.chip }}>
                            {poster ? <img src={poster} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                          </div>
                          <div>
                            <div style={{ fontSize: 15, fontWeight: 900 }}>Season {season}</div>
                            <div style={{ marginTop: 2, fontSize: 11, fontWeight: 750, color: palette.mutedText }}>
                              {watchedCount} of {rows.length} watched
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                void bulkSetWatched(rows, !complete);
                              }}
                              disabled={false}
                              style={watchedToggleStyle(complete, 28)}
                              aria-label={complete ? `Mark season ${season} unwatched` : `Mark season ${season} watched`}
                            >
                              {complete ? "✓" : ""}
                            </button>
                            <span style={{ fontSize: 18, fontWeight: 900, transform: open ? "rotate(90deg)" : "none", transition: "transform 120ms ease" }}>›</span>
                          </div>
                        </div>

                        {open ? (
                          <div style={{ borderTop: `1px solid ${palette.surfaceBorder}` }}>
                            {rows.map((episode) => {
                              const watched = isEpisodeWatched(episode);
                              const key = episodeKey(episode);
                              const still = safeStr(episode.StillURL);
                              return (
                                <div key={key} style={{
                                  display: "grid",
                                  gridTemplateColumns: isMobileLayout ? "84px 1fr 32px" : "128px 1fr 36px",
                                  gap: 12,
                                  alignItems: "center",
                                  padding: "10px 12px",
                                  borderBottom: `1px solid ${palette.surfaceBorder}`,
                                }}>
                                  <div style={{ height: isMobileLayout ? 48 : 72, borderRadius: 10, overflow: "hidden", background: palette.chip }}>
                                    {still ? <img src={still} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : null}
                                  </div>
                                  <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: 10, fontWeight: 900, color: palette.mutedText, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                                      Episode {episode.EpisodeNumber}
                                    </div>
                                    <div style={{ fontSize: 13, fontWeight: 850, color: palette.text, lineHeight: 1.25 }}>
                                      {safeStr(episode.EpisodeTitle) || `Episode ${episode.EpisodeNumber}`}
                                    </div>
                                    <div style={{ marginTop: 3, fontSize: 11, fontWeight: 700, color: palette.mutedText }}>
                                      {formatMmDdYyyy(episode.AirDate)}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => toggleEpisodeWatched(episode, !watched)}
                                    style={watchedToggleStyle(watched, 28)}
                                  >
                                    {watched ? "✓" : ""}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ color: palette.mutedText, fontSize: 13, fontWeight: 700, padding: "12px 0" }}>
                  No episodes cached yet.
                </div>
              )}
            </>
          ) : null}

          {/* Cast — full width */}
          {castMembers.length > 0 ? sectionBox(
            <>
              {sectionLabel("CAST")}
              <div ref={castRowRef} style={{ display: "flex", gap: CAST_GAP, justifyContent: "flex-start", overflow: "hidden" }}>
                {visibleCast.map((member, i) => (
                  <a key={i} href={`https://www.themoviedb.org/search/person?query=${encodeURIComponent(member.name)}`} target="_blank" rel="noopener noreferrer" onClick={(event) => handleExternalLinkClick(event, `https://www.themoviedb.org/search/person?query=${encodeURIComponent(member.name)}`)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0, width: CAST_ITEM_W, textDecoration: "none", cursor: "pointer" }}>
                    {member.photo ? (
                      <img src={member.photo} alt={member.name} onError={() => {
                        setFailedCastPhotoUrls((prev) => {
                          if (prev.has(member.photo)) return prev;
                          const next = new Set(prev);
                          next.add(member.photo);
                          return next;
                        });
                      }} style={{
                        width: CAST_ITEM_W, height: CAST_IMAGE_H,
                        borderRadius: 8, objectFit: "cover",
                        boxSizing: "border-box",
                        border: `2px solid ${palette.surfaceBorder}`,
                        background: palette.surface,
                      }} />
                    ) : (
                      <div style={{
                        width: CAST_ITEM_W, height: CAST_IMAGE_H,
                        borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center",
                        boxSizing: "border-box",
                        background: palette.chip, border: `2px solid ${palette.surfaceBorder}`,
                        fontSize: 20, fontWeight: 700, color: palette.mutedText,
                      }}>
                        {member.name.charAt(0)}
                      </div>
                    )}
                    <div style={{
                      fontSize: 11, fontWeight: 650, color: palette.text, textAlign: "center",
                      lineHeight: 1.25, wordBreak: "break-word", width: "100%",
                    }}>
                      {member.name}
                    </div>
                  </a>
                ))}
              </div>
            </>
          ) : null}


          {/* Similar Shows — full width */}
          {hasRelated ? sectionBox(
            <>
              {sectionLabel(effectiveRelatedLabel)}
              <div ref={relatedRowRef} style={{ display: "flex", gap: RELATED_GAP, overflow: "hidden" }}>
                {visibleRelated.map((show, i) => {
                  const sTitle = safeStr(show.title);
                  const sYear = formatYear(show.firstAirDate || show.year);
                  const sCoverRaw = getDisplayCoverUrl(show);
                  const sCover = ((suppressRemoteRelatedCovers && isRemoteHttpUrl(sCoverRaw)) || failedRelatedCoverUrls.has(sCoverRaw)) ? "" : sCoverRaw;
                  const isRecommendation = Boolean((show as any).__isRecommendation);
                  const tmdbUrl = isRecommendation ? getTmdbTvUrl(show) : "";
                  const currentCreatorTokens = new Set(parseCreatorTokens(creator));
                  const showCreatorTokens = parseCreatorTokens(show.creator);
                  const sameCreator =
                    !isRecommendation &&
                    showCreatorTokens.some((token) => currentCreatorTokens.has(token));
                  return (
                    <div key={i}
                      onClick={() => {
                        if (isRecommendation && tmdbUrl) {
                          void openExternalUrl(tmdbUrl);
                          return;
                        }
                        onSelectRelated?.(show);
                      }}
                      style={{
                        flexShrink: 0, width: RELATED_ITEM_W,
                        cursor: onSelectRelated ? "pointer" : "default",
                        display: "flex", flexDirection: "column", gap: 5,
                      }}
                    >
                      <div style={{
                        width: RELATED_ITEM_W,
                        height: DETAIL_PORTRAIT_H,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "flex-start",
                        overflow: "hidden",
                        borderRadius: 6,
                      }}>
                        {sCover ? (
                          <img src={sCover} alt={sTitle} onError={() => {
                            setFailedRelatedCoverUrls((prev) => {
                              if (prev.has(sCover)) return prev;
                              const next = new Set(prev);
                              next.add(sCover);
                              return next;
                            });
                          }} style={{
                            width: "100%",
                            height: "100%",
                            maxHeight: "100%",
                            objectFit: "cover",
                            objectPosition: "center bottom",
                            display: "block",
                            boxSizing: "border-box",
                            border: `1px solid ${palette.surfaceBorder}`,
                            ...COVER_IMAGE_RADIUS_STYLE,
                          }} />
                        ) : (
                          <div style={{
                            width: "100%", height: "100%", borderRadius: 6,
                            boxSizing: "border-box",
                            background: palette.chip, border: `1px solid ${palette.surfaceBorder}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                            padding: "0 5px", textAlign: "center",
                          }}>
                            <span style={{ fontSize: 9, color: palette.mutedText, lineHeight: 1.3 }}>{sTitle}</span>
                          </div>
                        )}
                      </div>
                      <div style={{ fontSize: 10, fontWeight: 650, color: palette.text, lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, minHeight: 25 }}>
                        {sTitle}
                      </div>
                      <div style={{ fontSize: 9, color: palette.mutedText, minHeight: 11 }}>
                        {sYear || ""}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minHeight: 20, alignItems: "center" }}>
                        <span
                          onClick={(event) => {
                            if (!isRecommendation) return;
                            event.preventDefault();
                            event.stopPropagation();
                            onSelectRelated?.(show);
                          }}
                          style={
                            isRecommendation || !sameCreator
                              ? {
                                  fontSize: 8,
                                  fontWeight: 800,
                                  color: palette.text,
                                  border: `1px solid ${palette.surfaceBorder}`,
                                  borderRadius: 999,
                                  padding: "2px 6px",
                                  background: palette.chip,
                                }
                              : {
                                  fontSize: 8,
                                  fontWeight: 800,
                                  color: "#065f46",
                                  border: "1px solid rgba(16, 185, 129, 0.45)",
                                  borderRadius: 999,
                                  padding: "2px 6px",
                                  background: "rgba(167, 243, 208, 0.82)",
                                }
                          }
                        >
                          {isRecommendation ? "Not in Library" : sameCreator ? "Same Creator" : "In Library"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

        </div>
        </div>
      </div>
    </div>
  );
}
