"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";
import { scaledPx, useDesktopDetailScale, useFitToViewportScale } from "./detailScale";

type MovieDetailsPageProps = {
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
  relatedMovies?: Record<string, unknown>[];
  relatedMoviesLabel?: string;
  recommendedMovies?: Record<string, unknown>[];
  onSelectRelated?: (item: Record<string, unknown>) => void;
  highlightColor?: string;
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
function splitList(v: unknown): string[] { return safeStr(v).split(/[,|/]/g).map(p => p.trim()).filter(Boolean); }
function formatYear(v: unknown): string { const r = safeStr(v); const m = r.match(/\b((?:19|20)\d{2})\b/); return m ? m[1] : r; }
function formatFullDate(v: unknown): string {
  const s = safeStr(v);
  if (!s) return "";
  // ISO date e.g. "2023-05-04" or "2023-05-04T..."
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  return s;
}
function formatMmDdYyyy(v: unknown): string {
  const raw = safeStr(v);
  if (!raw) return "";
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}-${iso[1]}`;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const yyyy = String(parsed.getFullYear());
  return `${mm}-${dd}-${yyyy}`;
}
function formatRuntime(v: string): string {
  const n = parseInt(v, 10);
  if (!isFinite(n) || n <= 0) return v || "";
  const h = Math.floor(n / 60), m = n % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function getTmdbMovieUrl(item: Record<string, unknown>): string {
  const id = safeStr((item as Record<string, unknown>).tmdbId || (item as Record<string, unknown>).TMDB_ID || (item as Record<string, unknown>).id);
  if (!id) return "";
  return `https://www.themoviedb.org/movie/${encodeURIComponent(id)}`;
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

function ScoreCircle({ raw, label }: { raw: string; label: string }) {
  const pct = toScorePct(raw);
  if (!pct) return null;
  const r = 22, size = 56, stroke = 3.5;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = scoreColor(pct);
  const words = label.split(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0 }}>
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
          fontSize: 11, fontWeight: 800, color: "#fff",
        }}>
          {pct}%
        </div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 1.2 }}>
        {label}
      </div>
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
      // Use the layout (un-transformed) width so any ancestor `transform: scale`
      // applied for viewport-fit doesn't artificially shrink the slot count.
      const w = el.clientWidth || el.scrollWidth;
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

export function MovieDetailsPage({
  item, isMobileLayout, usePageBackground = false,
  onBack, onEdit, onDelete, onRate, getDisplayCoverUrl, getDisplayBackdropUrl, onPaletteChange,
  relatedMovies, relatedMoviesLabel, onSelectRelated, highlightColor,
  recommendedMovies,
}: MovieDetailsPageProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const detailScale = useDesktopDetailScale(isMobileLayout);
  const { ref: stageRef, scale: fitScale } = useFitToViewportScale<HTMLDivElement>(isMobileLayout);
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
  const year = formatYear(item.releaseDate || item.year);
  const rawRuntime = safeStr(item.runtime);
  const runtime = rawRuntime ? formatRuntime(rawRuntime) : "";
  const genres = splitList(item.genres).slice(0, 3);
  const overview = safeStr(item.overview || item.description);
  const myRating = safeStr(item.myRating);
  const tmdbRating = safeStr(item.tmdbRating);
  const watchStatus = safeStr(item.watchStatus || item.watched);
  const watchDate = formatMmDdYyyy(item.watchDate);
  const ownership = safeStr(item.ownership);
  const tags = splitList(item.tag || item.tags);
  const director = safeStr(item.director);
  const tagline = safeStr(item.tagline);
  const budget = safeStr(item.budget);
  const revenue = safeStr(item.revenue);
  const topcastNames = splitList(item.topcast);
  const topcastPhotoList = safeStr(item.topcastPhotos).split(",").map(s => s.trim()).filter(Boolean);
  const castMembers = topcastNames.slice(0, 5).map((name, i) => ({ name, photo: topcastPhotoList[i] || "" }));

  const metaParts = [year, rawRuntime, ...genres].filter(Boolean);
  const titleFontSize = isMobileLayout ? 22 : scaledPx(title.length > 44 ? 26 : title.length > 28 ? 32 : 38, detailScale);

  const descriptionText = overview || "No description available.";
  const descFontSize = isMobileLayout ? 13 : 13;

  const descViewport = useRef<HTMLDivElement>(null);
  const descContent = useRef<HTMLDivElement>(null);
  const castRowRef = useRef<HTMLDivElement>(null);
  const relatedRowRef = useRef<HTMLDivElement>(null);
  const CAST_ITEM_W = isMobileLayout ? 68 : scaledPx(82, detailScale);
  const CAST_GAP = isMobileLayout ? 14 : scaledPx(20, detailScale);
  const RELATED_ITEM_W = isMobileLayout ? 80 : scaledPx(80, detailScale);
  const RELATED_GAP = isMobileLayout ? 10 : scaledPx(10, detailScale);
  const fittedCast = useFitCount(castRowRef, CAST_ITEM_W, CAST_GAP);
  const fittedRelated = useFitCount(relatedRowRef, RELATED_ITEM_W, RELATED_GAP);
  // Always show at least these many on desktop; the row overflows horizontally
  // (hidden) and the transform-fit scaling shrinks the whole stage to fit.
  const maxCast = isMobileLayout ? fittedCast : Math.max(5, fittedCast);
  const maxRelated = isMobileLayout ? fittedRelated : Math.max(6, fittedRelated);
  const visibleCast = castMembers.slice(0, maxCast);
  const recommendationItems = (recommendedMovies ?? []).filter((item) => safeStr(item.title));
  const libraryRelatedItems = relatedMovies ?? [];
  const relatedKey = (item: Record<string, unknown>) => safeStr((item as any).tmdbId || (item as any).TMDB_ID || item.title).toLowerCase();
  const libraryKeys = new Set(libraryRelatedItems.map(relatedKey).filter(Boolean));
  const recommendationFill = recommendationItems.filter((item) => !libraryKeys.has(relatedKey(item)));
  const effectiveRelatedItems = [...libraryRelatedItems, ...recommendationFill];
  const effectiveRelatedLabel = recommendationFill.length > 0
    ? "You May Also Like"
    : (libraryRelatedItems.length > 0 ? (relatedMoviesLabel || "More Like This") : "You May Also Like");
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

  useEffect(() => {
    const vp = descViewport.current, ct = descContent.current;
    if (!vp || !ct || typeof window === "undefined") return;
    let af = 0, rt = 0, lastT = 0, offset = 0, pause = Date.now() + 1400;
    const speed = 0.016;
    const setOff = (o: number) => { offset = o; ct.style.transform = `translate3d(0,-${o}px,0)`; };
    const getMax = () => Math.max(0, ct.scrollHeight - vp.clientHeight);
    const step = (t: number) => {
      const max = getMax();
      if (max <= 2) { setOff(0); lastT = 0; af = requestAnimationFrame(step); return; }
      if (Date.now() >= pause) {
        if (!lastT) lastT = t;
        const next = offset + (t - lastT) * speed; lastT = t;
        if (next >= max) { setOff(max); pause = Date.now() + 1800; lastT = 0; clearTimeout(rt); rt = window.setTimeout(() => { setOff(0); pause = Date.now() + 1000; }, 1800); }
        else setOff(next);
      }
      af = requestAnimationFrame(step);
    };
    setOff(0); af = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(af); clearTimeout(rt); ct.style.transform = ""; };
  }, [descriptionText, descFontSize]);

  const statusColor = (() => {
    const s = watchStatus.toLowerCase();
    if (s === "watched" || s === "completed")
      return { background: "rgba(220,252,231,0.92)", border: "1px solid rgba(134,239,172,0.5)", color: "#166534" };
    if (s === "started" || s === "watching" || s === "in progress")
      return { background: "rgba(254,249,195,0.92)", border: "1px solid rgba(253,224,71,0.5)", color: "#854d0e" };
    if (s === "abandoned" || s === "dropped")
      return { background: "rgba(255,237,213,0.92)", border: "1px solid rgba(253,186,116,0.5)", color: "#9a3412" };
    return { background: "rgba(255,255,255,0.88)", border: "1px solid rgba(255,255,255,0.4)", color: "#111" };
  })();

  const detailFacts = [
    watchDate ? { label: "WATCHED", value: watchDate } : null,
    runtime ? { label: "RUNTIME", value: runtime } : null,
    (item.releaseDate || item.year) ? { label: "RELEASE DATE", value: formatFullDate(item.releaseDate) || year } : null,
    director ? { label: "DIRECTOR", value: director } : null,
    budget ? { label: "BUDGET", value: budget } : null,
    revenue ? { label: "REVENUE", value: revenue } : null,
    ownership ? { label: "OWNERSHIP", value: ownership } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const ratingFacts = [
    tmdbRating ? { label: "TMDB RATING", value: tmdbRating } : null,
    myRating ? { label: "MY RATING", value: myRating } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const POSTER_W = isMobileLayout ? 120 : scaledPx(190, detailScale);
  const LEFT_COL_W = isMobileLayout ? POSTER_W + 28 : POSTER_W + scaledPx(44, detailScale);
  const DETAILS_W = isMobileLayout ? 0 : scaledPx(320, detailScale);
  const HERO_H = isMobileLayout ? "auto" : scaledPx(460, detailScale);

  const hasRelated = effectiveRelatedItems.length > 0;

  const sectionBox = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{
      borderRadius: 16,
      padding: isMobileLayout ? "14px 14px" : "16px 18px",
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
      height: isMobileLayout ? "auto" : "100vh",
      minHeight: "100vh",
      background: usePageBackground ? "transparent" : `linear-gradient(160deg, ${mixHex(palette.start, "#06080f", 0.08)} 0%, ${palette.start} 30%, ${mixHex(palette.end, palette.start, 0.18)} 58%, ${palette.end} 100%)`,
      color: palette.text,
      position: "relative",
      overflow: isMobileLayout ? "hidden auto" : "hidden",
    }}>
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
        height: isMobileLayout ? "auto" : "100%",
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
                  borderRadius: 999, padding: "9px 14px", fontSize: 13, lineHeight: 1, fontWeight: 750,
                  border: `1px solid rgba(255,255,255,0.4)`, background: `${highlightColor || "#007AFF"}`,
                  color: "#fff", cursor: "pointer", whiteSpace: "nowrap",
                  backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
                }}>Rate It</button>
              ) : null}
              {onEdit ? (
                <button type="button" onClick={() => onEdit(item)} style={{
                  borderRadius: 999, padding: "9px 14px", fontSize: 13, lineHeight: 1, fontWeight: 750,
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
                      window.alert(error?.message || "Failed to delete movie");
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  style={{
                    borderRadius: 999, padding: "9px 14px", fontSize: 13, lineHeight: 1, fontWeight: 750,
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
                width: 38, height: 38, borderRadius: "50%",
                border: "1px solid rgba(255,255,255,0.28)", background: "rgba(0,0,0,0.45)",
                color: "#fff", cursor: "pointer",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                backdropFilter: "blur(8px)",
              }} aria-label="Back">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              {watchStatus ? (
                <span style={{ borderRadius: 999, padding: "9px 13px", fontSize: 13, lineHeight: 1, fontWeight: 850, ...statusColor }}>
                  {watchStatus.charAt(0).toUpperCase() + watchStatus.slice(1)}
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
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {detailFacts.map((f, i) => (
                  <div key={`${f.label}-${i}`} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em" }}>{f.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: "#fff", lineHeight: 1.25 }}>{f.value}</div>
                  </div>
                ))}
              </div>
              {ratingFacts.length > 0 ? (
                <>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "12px 0" }} />
                  <div style={{ display: "flex", gap: 16 }}>
                    {tmdbRating ? <ScoreCircle raw={tmdbRating} label="User Rating" /> : null}
                    {myRating ? <ScoreCircle raw={myRating} label="My Rating" /> : null}
                  </div>
                </>
              ) : null}
            </div>
          ) : null}

          {/* Hero content: left column (poster+circles) + middle (title/meta) */}
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
                const externalHref = getTmdbMovieUrl(item);
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
                  <a href={externalHref} target="_blank" rel="noopener noreferrer" title="Open on TMDB" style={{ display: "block", lineHeight: 0, flexShrink: 0 }}>
                    {img}
                  </a>
                ) : img;
              })() : null}
            </div>

            {/* Middle: title + meta + tagline (bottom-anchored on desktop) */}
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
                  {metaParts.join("  ·  ")}
                </div>
              ) : null}
              {tagline ? (
                <div style={{
                  marginTop: 7, fontSize: isMobileLayout ? 12 : 13, fontStyle: "italic", fontWeight: 500,
                  color: "rgba(255,255,255,0.58)", letterSpacing: "0.01em",
                  textShadow: "0 1px 6px rgba(0,0,0,0.5)",
                }}>
                  {tagline}
                </div>
              ) : null}
              {overview ? (
                <div style={{
                  marginTop: isMobileLayout ? 10 : 12,
                  fontSize: isMobileLayout ? 13 : 14,
                  lineHeight: 1.45,
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.86)",
                  letterSpacing: "0.005em",
                  textShadow: "0 1px 6px rgba(0,0,0,0.55)",
                  display: "-webkit-box",
                  WebkitLineClamp: isMobileLayout ? 4 : 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}>
                  {overview}
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
          {isMobileLayout && detailFacts.length > 0 ? sectionBox(
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
            </>
          ) : null}

          {/* Cast + Related — side by side */}
          {(castMembers.length > 0 || hasRelated) ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "stretch" }}>

              {castMembers.length > 0 ? (
                <div style={{
                  flex: "1 1 260px", minWidth: 0,
                  borderRadius: 16, padding: isMobileLayout ? "14px 14px" : "16px 18px",
                  background: `linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.02)} 100%)`,
                  border: `1px solid ${palette.surfaceBorder}`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}>
                  {sectionLabel("CAST")}
                  <div ref={castRowRef} style={{ display: "flex", gap: CAST_GAP, justifyContent: "flex-start", overflow: "hidden" }}>
                    {visibleCast.map((member, i) => (
                      <a key={i} href={`https://www.themoviedb.org/search/person?query=${encodeURIComponent(member.name)}`} target="_blank" rel="noopener noreferrer" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 7, flexShrink: 0, width: CAST_ITEM_W, textDecoration: "none", cursor: "pointer" }}>
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} style={{
                            width: CAST_ITEM_W, height: CAST_ITEM_W,
                            borderRadius: "50%", objectFit: "cover",
                            border: `2px solid ${palette.surfaceBorder}`,
                            background: palette.surface,
                          }} />
                        ) : (
                          <div style={{
                            width: CAST_ITEM_W, height: CAST_ITEM_W,
                            borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
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
                </div>
              ) : null}

              {hasRelated ? (
                <div style={{
                  flex: "1 1 260px", minWidth: 0,
                  borderRadius: 16, padding: isMobileLayout ? "14px 14px" : "16px 18px",
                  background: `linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.02)} 100%)`,
                  border: `1px solid ${palette.surfaceBorder}`,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
                }}>
                  {sectionLabel(effectiveRelatedLabel)}
                  <div ref={relatedRowRef} style={{ display: "flex", gap: RELATED_GAP, overflow: "hidden" }}>
                    {visibleRelated.map((movie, i) => {
                      const mTitle = safeStr(movie.title);
                      const mYear = formatYear(movie.releaseDate || movie.year);
                      const mCover = getDisplayCoverUrl(movie);
                      const isRecommendation = Boolean((movie as any).__isRecommendation);
                      const tmdbUrl = isRecommendation ? getTmdbMovieUrl(movie) : "";
                      return (
                        <div key={i}
                          onClick={() => {
                            if (isRecommendation && tmdbUrl) {
                              if (typeof window !== "undefined") {
                                window.open(tmdbUrl, "_blank", "noopener,noreferrer");
                              }
                              return;
                            }
                            onSelectRelated?.(movie);
                          }}
                          style={{
                            flexShrink: 0, width: RELATED_ITEM_W,
                            cursor: onSelectRelated ? "pointer" : "default",
                            display: "flex", flexDirection: "column", gap: 5,
                          }}
                        >
                          <div style={{
                            width: RELATED_ITEM_W,
                            height: Math.round(RELATED_ITEM_W * 1.5),
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "flex-start",
                            overflow: "hidden",
                            borderRadius: 6,
                          }}>
                            {mCover ? (
                              <img src={mCover} alt={mTitle} style={{
                                width: "100%",
                                maxHeight: "100%",
                                objectFit: "cover",
                                objectPosition: "center bottom",
                                display: "block",
                                border: `1px solid ${palette.surfaceBorder}`,
                                ...COVER_IMAGE_RADIUS_STYLE,
                              }} />
                            ) : (
                              <div style={{
                                width: "100%", height: "100%", borderRadius: 6,
                                background: palette.chip, border: `1px solid ${palette.surfaceBorder}`,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                padding: "0 5px", textAlign: "center",
                              }}>
                                <span style={{ fontSize: 9, color: palette.mutedText, lineHeight: 1.3 }}>{mTitle}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ fontSize: 10, fontWeight: 650, color: palette.text, lineHeight: 1.25, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const, minHeight: 25 }}>
                            {mTitle}
                          </div>
                          <div style={{ fontSize: 9, color: palette.mutedText, minHeight: 11 }}>
                            {mYear || ""}
                          </div>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", minHeight: 20, alignItems: "center" }}>
                            <span
                              onClick={(event) => {
                                if (!isRecommendation) return;
                                event.preventDefault();
                                event.stopPropagation();
                                onSelectRelated?.(movie);
                              }}
                              style={
                                isRecommendation
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
                              {isRecommendation ? "Not in Library" : "Same Director"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}

            </div>
          ) : null}

        </div>
        </div>
      </div>
    </div>
  );
}
