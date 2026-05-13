"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type BookDetailsPageProps = {
  item: Record<string, unknown>;
  allBooks: Record<string, unknown>[];
  isMobileLayout: boolean;
  usePageBackground?: boolean;
  onBack: () => void;
  onEdit?: (item: Record<string, unknown>) => void;
  onDelete?: (item: Record<string, unknown>) => Promise<void> | void;
  onSelectRelated: (item: Record<string, unknown>) => void;
  getDisplayCoverUrl: (item: Record<string, unknown>) => string;
  isAudiobookItem: (item: Record<string, unknown>) => boolean;
  onPaletteChange?: (palette: { start: string; end: string } | null) => void;
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
  start: "#8e6e67",
  end: "#6277a3",
  text: "#f6f4f2",
  mutedText: "rgba(246, 244, 242, 0.78)",
  surface: "rgba(255, 255, 255, 0.14)",
  surfaceBorder: "rgba(255, 255, 255, 0.16)",
  chip: "rgba(255, 255, 255, 0.18)",
};

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function splitList(value: unknown): string[] {
  return safeStr(value)
    .split(/[,\|/]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function formatLongDate(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(parsed);
}

function formatRating(value: string): string {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return value;
  return parsed.toFixed(1);
}

function getStarRatingValue(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(5, parsed > 5 ? parsed / 2 : parsed));
}

function StarRating({ value, color }: { value: string; color: string }) {
  const rating = getStarRatingValue(value);
  return (
    <span style={{ display: "inline-flex", gap: 2, alignItems: "center" }} aria-label={`${value} star rating`}>
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, rating - index));
        return (
          <span key={index} style={{ position: "relative", width: 14, height: 14, display: "inline-block" }}>
            <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden style={{ display: "block", color: "rgba(255,255,255,0.24)" }}>
              <path fill="currentColor" d="M12 2.7l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.7z" />
            </svg>
            <span style={{ position: "absolute", inset: 0, width: `${fill * 100}%`, overflow: "hidden" }}>
              <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden style={{ display: "block", color }}>
                <path fill="currentColor" d="M12 2.7l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.5l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9L12 2.7z" />
              </svg>
            </span>
          </span>
        );
      })}
    </span>
  );
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const normalized = hex.replace("#", "");
  return {
    r: Number.parseInt(normalized.slice(0, 2), 16),
    g: Number.parseInt(normalized.slice(2, 4), 16),
    b: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function rgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (channel: number) => clampChannel(channel).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const h = ((hue % 360) + 360) % 360;
  const s = Math.max(0, Math.min(1, saturation));
  const l = Math.max(0, Math.min(1, lightness));

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  return rgbToHex(
    (r + m) * 255,
    (g + m) * 255,
    (b + m) * 255
  );
}

function mixHex(first: string, second: string, weight: number): string {
  const a = hexToRgb(first);
  const b = hexToRgb(second);
  const w = Math.max(0, Math.min(1, weight));
  return rgbToHex(
    a.r * (1 - w) + b.r * w,
    a.g * (1 - w) + b.g * w,
    a.b * (1 - w) + b.b * w
  );
}

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (value: number) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function getReadableTextColor(colors: string[]): string {
  const average = colors.reduce((sum, color) => sum + getLuminance(color), 0) / colors.length;
  return average > 0.46 ? "#18202b" : "#f6f4f2";
}

function buildPalette(start: string, end: string): PaletteState {
  const text = getReadableTextColor([start, end]);
  const lightText = text === "#f6f4f2";
  return {
    start,
    end,
    text,
    mutedText: lightText ? "rgba(246, 244, 242, 0.78)" : "rgba(24, 32, 43, 0.72)",
    surface: lightText ? "rgba(255, 255, 255, 0.12)" : "rgba(255, 255, 255, 0.26)",
    surfaceBorder: lightText ? "rgba(255, 255, 255, 0.14)" : "rgba(24, 32, 43, 0.08)",
    chip: lightText ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.34)",
  };
}

export function buildSeedDetailPalette(item: Record<string, unknown>, coverUrl: string): PaletteState {
  const seedSource = [
    safeStr(item.title),
    safeStr(item.author || item.Author),
    safeStr(item.series || item.Series),
    coverUrl,
  ]
    .filter(Boolean)
    .join("|");

  if (!seedSource) return FALLBACK_PALETTE;

  const hash = hashString(seedSource);
  const hue = hash % 360;
  const companionHue = (hue + 28 + (hash % 42)) % 360;
  const saturation = 0.34 + ((hash >> 3) % 18) / 100;
  const lightness = 0.3 + ((hash >> 7) % 10) / 100;

  const start = hslToHex(hue, saturation, lightness);
  const end = hslToHex(companionHue, Math.min(0.68, saturation + 0.1), Math.min(0.44, lightness + 0.07));
  return buildPalette(start, end);
}

function isLocalLikeUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/") || url.startsWith("./") || url.startsWith("../")) return true;
  if (url.startsWith("data:") || url.startsWith("blob:")) return true;
  if (typeof window === "undefined") return false;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function getPaletteSampleUrl(url: string): string {
  const normalized = safeStr(url);
  if (!normalized) return "";
  if (isLocalLikeUrl(normalized)) return normalized;
  return `/api/cover-proxy?src=${encodeURIComponent(normalized)}`;
}

function normalizePaletteCandidateUrls(item: Record<string, unknown>, primaryUrl: string): string[] {
  const rawCoverCandidates = Array.isArray(item.coverCandidates)
    ? item.coverCandidates
        .map((candidate) => {
          if (candidate && typeof candidate === "object" && "url" in candidate) {
            return safeStr((candidate as { url?: unknown }).url);
          }
          return "";
        })
        .filter(Boolean)
    : [];

  const candidates = [
    ...rawCoverCandidates.filter(isLocalLikeUrl),
    primaryUrl,
    safeStr(item.githubCoverUrl),
    safeStr(item.customImageUrl),
    safeStr(item.imageUrl),
    safeStr(item.metadataCoverUrl),
    safeStr(item.posterUrl),
    safeStr(item.posterUrlFallback),
    ...rawCoverCandidates,
  ].filter(Boolean);

  return Array.from(new Set(candidates));
}

function tryExtractPalette(imageUrl: string): Promise<PaletteState | null> {
  return new Promise((resolve) => {
    if (!imageUrl || typeof window === "undefined") {
      resolve(null);
      return;
    }

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.decoding = "async";

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const width = 40;
        const height = 40;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve(null);
          return;
        }

        context.drawImage(image, 0, 0, width, height);
        const pixels = context.getImageData(0, 0, width, height).data;
        const buckets = new Map<string, { count: number; r: number; g: number; b: number; saturation: number }>();

        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3];
          if (alpha < 200) continue;

          const r = pixels[index];
          const g = pixels[index + 1];
          const b = pixels[index + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const brightness = (r + g + b) / 3;
          const saturation = max === 0 ? 0 : (max - min) / max;
          if (brightness < 12 || brightness > 248) continue;

          const key = `${Math.round(r / 24)}-${Math.round(g / 24)}-${Math.round(b / 24)}`;
          const greenBias = g > r && g > b ? 0.7 : 0;
          const warmBias = r > g && r > b ? 0.35 : 0;
          const coolBias = b > r && b > g ? 0.35 : 0;
          const weight = 1 + saturation * 4 + (brightness > 48 && brightness < 220 ? 0.65 : 0) + greenBias + warmBias + coolBias;
          const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0, saturation: 0 };
          bucket.count += weight;
          bucket.r += r * weight;
          bucket.g += g * weight;
          bucket.b += b * weight;
          bucket.saturation += saturation * weight;
          buckets.set(key, bucket);
        }

        const colors = Array.from(buckets.values())
          .map((bucket) => {
            const count = Math.max(bucket.count, 1);
            const color = rgbToHex(bucket.r / count, bucket.g / count, bucket.b / count);
            return {
              color,
              score: bucket.count * (1 + bucket.saturation / count),
            };
          })
          .sort((left, right) => right.score - left.score);

        const first = colors[0]?.color ?? FALLBACK_PALETTE.start;
        const firstRgb = hexToRgb(first);
        const second =
          colors.find(({ color }) => {
            const candidate = hexToRgb(color);
            const distance =
              Math.abs(candidate.r - firstRgb.r) +
              Math.abs(candidate.g - firstRgb.g) +
              Math.abs(candidate.b - firstRgb.b);
            return distance > 74;
          })?.color ?? mixHex(first, getLuminance(first) > 0.45 ? "#2d4c2d" : "#9fc29f", 0.22);

        const start = getLuminance(first) > 0.62 ? mixHex(first, "#2a3444", 0.18) : mixHex(first, "#ffffff", 0.04);
        const end = getLuminance(second) > 0.62 ? mixHex(second, "#32445e", 0.16) : mixHex(second, "#ffffff", 0.03);
        resolve(buildPalette(start, end));
      } catch {
        resolve(null);
      }
    };

    image.onerror = () => resolve(null);
    image.src = getPaletteSampleUrl(imageUrl);
  });
}

async function extractPalette(item: Record<string, unknown>, primaryUrl: string): Promise<PaletteState> {
  const candidateUrls = normalizePaletteCandidateUrls(item, primaryUrl);
  for (const url of candidateUrls) {
    const palette = await tryExtractPalette(url);
    if (palette) return palette;
  }
  return FALLBACK_PALETTE;
}

export function BookDetailsPage({
  item,
  allBooks,
  isMobileLayout,
  usePageBackground = false,
  onBack,
  onEdit,
  onDelete,
  onSelectRelated,
  getDisplayCoverUrl,
  isAudiobookItem,
  onPaletteChange,
}: BookDetailsPageProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const coverUrl = getDisplayCoverUrl(item);
  const seededPalette = useMemo(() => buildSeedDetailPalette(item, coverUrl), [coverUrl, item]);
  const paletteCacheKey = useMemo(
    () =>
      [
        safeStr(item.title),
        safeStr(item.author || item.Author),
        safeStr(item.series || item.Series),
        coverUrl,
      ].join("|"),
    [coverUrl, item]
  );
  const [paletteReady, setPaletteReady] = useState(false);
  const [extractedPaletteEntry, setExtractedPaletteEntry] = useState<{
    key: string;
    palette: PaletteState;
  } | null>(null);
  const palette =
    extractedPaletteEntry?.key === paletteCacheKey ? extractedPaletteEntry.palette : seededPalette;

  useEffect(() => {
    let cancelled = false;
    setPaletteReady(false);
    extractPalette(item, coverUrl).then((nextPalette) => {
      if (!cancelled) {
        setExtractedPaletteEntry({ key: paletteCacheKey, palette: nextPalette });
        setPaletteReady(true);
      }
    });
    return () => {
      cancelled = true;
      setPaletteReady(false);
      onPaletteChange?.(null);
    };
  }, [coverUrl, item, onPaletteChange, paletteCacheKey]);

  useEffect(() => {
    if (!paletteReady) return;
    onPaletteChange?.({ start: palette.start, end: palette.end });
  }, [onPaletteChange, palette.end, palette.start, paletteReady]);

  const author = safeStr(item.author || item.Author) || "Unknown author";
  const releaseDate = formatLongDate(item.releaseDate || item.ReleaseDate);
  const genres = splitList(item.genre || item.categories || item.Genre).slice(0, 3);
  const description = safeStr(item.description || item.Description);
  const title = safeStr(item.title) || "Untitled";
  const subtitle = safeStr(item.subtitle || item.Subtitle);
  const typeLabel = isAudiobookItem(item) ? "Audiobook" : safeStr(item.types || item.type || item.Type) || "Book";
  const statusLabel = safeStr(item.status || item.Status);
  const ownershipLabel = safeStr(item.ownership || item.Ownership);
  const pagesLabel = safeStr(item.pages || item.Pages);
  const durationLabel = safeStr(item.audiobookDuration || item.AudiobookDuration);
  const myRatingLabel = safeStr(item.myRating || item.MyRating);
  const userRatingLabel = safeStr(item.userRating || item.externalAverageRating || item.UserRating);
  const seriesLabel = safeStr(item.series || item.Series);
  const completedDateLabel = formatLongDate(item.completedDate || item.CompletedDate);
  const completionLikeStatuses = new Set(["completed", "finished", "read"]);
  const showCompletedDate = Boolean(
    completedDateLabel && completionLikeStatuses.has(statusLabel.toLowerCase())
  );

  const relatedBooksModule = useMemo(() => {
    const normalizedTitle = title.toLowerCase();
    const others = allBooks.filter((book) => safeStr(book.title).toLowerCase() !== normalizedTitle);

    const byAuthor = others.filter((book) => safeStr(book.author || book.Author) === author);
    if (byAuthor.length > 0) {
      return { label: `More by ${author}`, items: byAuthor.slice(0, 6) };
    }

    const genreSet = new Set(genres.map((g) => g.toLowerCase()));
    if (genreSet.size > 0) {
      const byGenre = others.filter((book) => {
        const bookGenres = splitList(book.genre || book.categories || book.Genre).map((g) => g.toLowerCase());
        return bookGenres.some((g) => genreSet.has(g));
      });
      if (byGenre.length > 0) {
        return { label: "Similar to this", items: byGenre.slice(0, 6) };
      }
    }

    return { label: "Similar to this", items: others.slice(0, 6) };
  }, [allBooks, author, genres, title]);

  const chips = [typeLabel, statusLabel, ownershipLabel].filter(Boolean);
  const metaLine = [author, releaseDate, ...genres].filter(Boolean).join(" • ");
  const ratingFacts = [
    { label: "My Rating", value: myRatingLabel ? formatRating(myRatingLabel) : "" },
    { label: "User Rating", value: userRatingLabel ? formatRating(userRatingLabel) : "" },
  ].filter((fact) => fact.value);
  const isAudiobook = typeLabel === "Audiobook";
  const factDetails = [
    !isAudiobook ? { label: "Pages", value: pagesLabel } : null,
    isAudiobook ? { label: "Length", value: durationLabel } : null,
    { label: "Format", value: typeLabel },
    { label: "Released", value: releaseDate },
    { label: "Completed", value: showCompletedDate ? completedDateLabel : "" },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact?.value));
  const descriptionText = description || "No description yet for this title.";
  const descriptionFontSize = isMobileLayout
    ? 15
    : descriptionText.length > 1100
      ? 12
      : descriptionText.length > 850
        ? 13
        : descriptionText.length > 620
          ? 14
          : 15;
  const titleFontSize = isMobileLayout
    ? 34
    : title.length > 48
      ? 42
      : title.length > 32
        ? 48
        : 56;
  const descriptionViewportRef = useRef<HTMLDivElement | null>(null);
  const descriptionContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const viewport = descriptionViewportRef.current;
    const content = descriptionContentRef.current;
    if (!viewport || !content || typeof window === "undefined") return;

    let animationFrame = 0;
    let resetTimeout = 0;
    let lastTime = 0;
    let offset = 0;
    let pauseUntil = Date.now() + 1200;
    const speedPxPerMs = 0.02;

    const setOffset = (nextOffset: number) => {
      offset = nextOffset;
      content.style.transform = `translate3d(0, -${offset}px, 0)`;
    };

    const getMaxOffset = () => Math.max(0, content.scrollHeight - viewport.clientHeight);

    const step = (time: number) => {
      const maxOffset = getMaxOffset();
      if (maxOffset <= 2) {
        setOffset(0);
        lastTime = 0;
        animationFrame = window.requestAnimationFrame(step);
        return;
      }

      if (Date.now() >= pauseUntil) {
        if (!lastTime) lastTime = time;
        const delta = time - lastTime;
        lastTime = time;
        const nextOffset = offset + delta * speedPxPerMs;

        if (nextOffset >= maxOffset) {
          setOffset(maxOffset);
          pauseUntil = Date.now() + 1600;
          lastTime = 0;
          window.clearTimeout(resetTimeout);
          resetTimeout = window.setTimeout(() => {
            setOffset(0);
            pauseUntil = Date.now() + 900;
          }, 1600);
        } else {
          setOffset(nextOffset);
        }
      }

      animationFrame = window.requestAnimationFrame(step);
    };

    setOffset(0);
    animationFrame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resetTimeout);
      content.style.transform = "translate3d(0, 0, 0)";
    };
  }, [descriptionFontSize, descriptionText, isMobileLayout]);

  return (
    <div
      style={{
        opacity: paletteReady ? 1 : 0,
        minHeight: isMobileLayout ? `calc(100vh - 58px)` : "100vh",
        padding: isMobileLayout ? "12px 10px 24px" : "12px 16px 16px",
        background: usePageBackground
          ? "transparent"
          : `radial-gradient(84% 88% at 12% 8%, ${rgba(mixHex(palette.start, "#ffffff", 0.08), 0.78)} 0%, ${rgba(palette.start, 0.38)} 26%, rgba(255,255,255,0) 50%), radial-gradient(96% 96% at 88% 18%, ${rgba(mixHex(palette.end, "#ffffff", 0.1), 0.52)} 0%, rgba(255,255,255,0) 46%), radial-gradient(94% 92% at 100% 100%, ${rgba(palette.end, 0.5)} 0%, ${rgba(palette.end, 0.14)} 34%, rgba(255,255,255,0) 56%), linear-gradient(145deg, ${mixHex(palette.start, "#0f141d", 0.16)} 0%, ${palette.start} 30%, ${mixHex(palette.end, palette.start, 0.18)} 58%, ${palette.end} 100%)`,
        color: palette.text,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {coverUrl && !usePageBackground ? (
        <>
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: "-12%",
              backgroundImage: `url("${coverUrl}")`,
              backgroundPosition: "center 18%",
              backgroundSize: "cover",
              opacity: 0.3,
              filter: "blur(52px) saturate(1.55) brightness(0.76)",
              transform: "scale(1.18)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(180deg, ${rgba("#05070b", 0.14)} 0%, ${rgba("#05070b", 0.22)} 100%)`,
            }}
          />
        </>
      ) : null}
      <div
        style={{
          maxWidth: 1500,
          margin: "0 auto",
          borderRadius: isMobileLayout ? 24 : 28,
          padding: isMobileLayout ? "12px" : "12px 12px 14px",
          background: usePageBackground
            ? `linear-gradient(180deg, ${rgba("#ffffff", 0.09)} 0%, ${rgba("#000000", 0.03)} 100%)`
            : `linear-gradient(180deg, ${rgba("#ffffff", 0.06)} 0%, ${rgba("#000000", 0.04)} 100%)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
          backdropFilter: "blur(12px) saturate(1.05)",
          minHeight: isMobileLayout ? undefined : "calc(100vh - 24px)",
          height: isMobileLayout ? undefined : "calc(100vh - 24px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(0, 1fr) 260px",
            gridTemplateRows: isMobileLayout ? undefined : "64px minmax(205px, 0.82fr) minmax(144px, 0.53fr) minmax(170px, 0.72fr)",
            gap: isMobileLayout ? 14 : 12,
            height: isMobileLayout ? undefined : "100%",
            minHeight: 0,
          }}
        >
          <div
            style={{
              gridColumn: isMobileLayout ? undefined : "1 / -1",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              padding: "2px 4px",
              minHeight: 0,
            }}
          >
            <button
              type="button"
              onClick={onBack}
              style={{
                width: 42,
                height: 42,
                flex: "0 0 auto",
                borderRadius: "50%",
                border: `1px solid ${palette.surfaceBorder}`,
                background: palette.surface,
                color: palette.text,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
              }}
              aria-label="Back to library"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", minWidth: 0 }}>
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  style={{
                    borderRadius: 999,
                    padding: "9px 14px",
                    fontSize: 14,
                    lineHeight: 1,
                    fontWeight: 750,
                    border: `1px solid ${palette.surfaceBorder}`,
                    background: `linear-gradient(180deg, ${rgba("#ffffff", 0.22)} 0%, ${rgba("#ffffff", 0.08)} 100%)`,
                    color: palette.text,
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.32), 0 8px 18px rgba(10, 14, 24, 0.14)",
                    backdropFilter: "blur(8px)",
                  }}
                  aria-label="Edit book details"
                >
                  Edit
                </button>
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
                      window.alert(error?.message || "Failed to delete book");
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  disabled={isDeleting}
                  style={{
                    borderRadius: 999,
                    padding: "9px 14px",
                    fontSize: 14,
                    lineHeight: 1,
                    fontWeight: 750,
                    border: "1px solid rgba(248, 113, 113, 0.55)",
                    background: "rgba(127, 29, 29, 0.85)",
                    color: "#fee2e2",
                    whiteSpace: "nowrap",
                    cursor: isDeleting ? "default" : "pointer",
                    opacity: isDeleting ? 0.75 : 1,
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.16), 0 8px 18px rgba(10, 14, 24, 0.14)",
                    backdropFilter: "blur(8px)",
                  }}
                  aria-label="Delete book"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              ) : null}
              {chips.length > 0
                ? chips.map((chip, index) => {
                  const isCompletedChip = chip.toLowerCase() === "completed";
                  return (
                    <span
                      key={`${chip}-${index}`}
                      style={{
                        borderRadius: 999,
                        padding: "9px 13px",
                        fontSize: 14,
                        lineHeight: 1,
                        fontWeight: 850,
                        background: isCompletedChip ? "rgba(34, 197, 94, 0.18)" : palette.chip,
                        border: `1px solid ${isCompletedChip ? "rgba(134, 239, 172, 0.52)" : palette.surfaceBorder}`,
                        color: isCompletedChip ? "#8df5ad" : palette.text,
                        whiteSpace: "nowrap",
                        boxShadow: isCompletedChip ? "0 0 0 1px rgba(34, 197, 94, 0.08)" : undefined,
                      }}
                    >
                      {chip}
                    </span>
                  );
                })
                : null}
            </div>
          </div>

          <div
            style={{
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              display: "grid",
              gridTemplateColumns: isMobileLayout ? "1fr" : "minmax(155px, 210px) minmax(0, 1fr)",
              gap: isMobileLayout ? 16 : 22,
              alignItems: "center",
              padding: isMobileLayout ? "8px 4px" : "6px 6px",
            }}
          >
            <div style={{ minWidth: 0, justifySelf: isMobileLayout ? "center" : "stretch" }}>
              <div
                style={{
                  width: isMobileLayout ? 210 : "100%",
                  maxWidth: 210,
                }}
              >
                <img
                  src={coverUrl}
                  alt={title}
                  style={{
                    display: "block",
                    width: "100%",
                    maxHeight: isMobileLayout ? undefined : 258,
                    objectFit: "contain",
                    borderRadius: 6,
                    filter: "drop-shadow(0 5px 9px rgba(5, 9, 16, 0.34))",
                  }}
                />
              </div>
            </div>

            <div style={{ minWidth: 0, overflow: "hidden" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: titleFontSize,
                  lineHeight: 1.02,
                  fontWeight: 850,
                  letterSpacing: 0,
                }}
              >
                {title}
              </h1>

              {subtitle ? (
                <div
                  style={{
                    marginTop: 10,
                    fontSize: isMobileLayout ? 16 : 20,
                    lineHeight: 1.2,
                    color: palette.mutedText,
                    fontWeight: 750,
                  }}
                >
                  {subtitle}
                </div>
              ) : null}

              {metaLine ? (
                <div
                  style={{
                    marginTop: 14,
                    fontSize: isMobileLayout ? 15 : 17,
                    lineHeight: 1.35,
                    color: palette.mutedText,
                    fontWeight: 700,
                  }}
                >
                  {metaLine}
                </div>
              ) : null}

              {seriesLabel ? (
                <div
                  style={{
                    marginTop: 14,
                    fontSize: isMobileLayout ? 15 : 16,
                    lineHeight: 1.35,
                    color: palette.text,
                    fontWeight: 800,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  Series: {seriesLabel}
                </div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              gridRow: isMobileLayout ? undefined : "2 / 4",
              gridColumn: isMobileLayout ? undefined : "2",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              borderRadius: 20,
              padding: isMobileLayout ? "16px" : "18px",
              background: `linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.035)} 100%)`,
              border: `1px solid ${palette.surfaceBorder}`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              display: "grid",
              gridTemplateRows: "auto 1fr",
              gap: 14,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 850, letterSpacing: "0.08em", color: palette.mutedText }}>
              DETAILS
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 11,
                alignContent: "start",
                justifyItems: "center",
                minHeight: 0,
                paddingTop: isMobileLayout ? 0 : 10,
              }}
            >
              {[...ratingFacts, ...factDetails].map((fact) => (
                <div
                  key={`${fact.label}-${fact.value}`}
                  style={{
                    minWidth: 0,
                    width: "min(100%, 180px)",
                    display: "grid",
                    gap: 5,
                    justifyItems: "start",
                    textAlign: "left",
                  }}
                >
                  <div style={{ fontSize: 11, lineHeight: 1, fontWeight: 800, color: palette.mutedText }}>
                    {fact.label}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "flex-start",
                      gap: 8,
                      fontSize: fact.label.includes("Rating") ? 22 : 15,
                      lineHeight: 1.18,
                      fontWeight: 850,
                      color: palette.text,
                      overflowWrap: "anywhere",
                    }}
                  >
                    <span>{fact.value}</span>
                    {fact.label.includes("Rating") ? <StarRating value={fact.value} color={palette.text} /> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              maxHeight: "100%",
              overflow: "hidden",
              borderRadius: 20,
              padding: isMobileLayout ? "16px 16px 18px" : "16px 18px",
              background: `linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.04)} 100%)`,
              border: `1px solid ${palette.surfaceBorder}`,
              boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 850, letterSpacing: "0.08em", color: palette.mutedText }}>
              DESCRIPTION
            </div>
            <div
              ref={descriptionViewportRef}
              style={{
                marginTop: 9,
                flex: "1 1 auto",
                minHeight: 0,
                overflow: "hidden",
                paddingRight: isMobileLayout ? undefined : 6,
              }}
            >
              <div
                ref={descriptionContentRef}
                style={{
                  fontSize: descriptionFontSize,
                  lineHeight: 1.5,
                  color: palette.text,
                  willChange: "transform",
                }}
                dangerouslySetInnerHTML={{ __html: descriptionText }}
              />
            </div>
          </div>

          {relatedBooksModule.items.length > 0 ? (
            <div
              style={{
                gridColumn: isMobileLayout ? undefined : "1 / -1",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                borderRadius: 20,
                padding: isMobileLayout ? "16px 16px 18px" : "14px 18px",
                background: `linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.04)} 100%)`,
                border: `1px solid ${palette.surfaceBorder}`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: isMobileLayout ? 16 : 14, lineHeight: 1.1, fontWeight: 850, color: palette.text }}>
                {relatedBooksModule.label}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isMobileLayout
                    ? "repeat(2, minmax(0, 1fr))"
                    : `repeat(${Math.min(relatedBooksModule.items.length, 6)}, 104px)`,
                  gap: isMobileLayout ? 13 : 13,
                  height: isMobileLayout ? undefined : "calc(100% - 26px)",
                  alignItems: "start",
                  alignContent: "start",
                  justifyContent: "start",
                }}
              >
                {(isMobileLayout ? relatedBooksModule.items : relatedBooksModule.items.slice(0, 6)).map((book) => (
                  <button
                    key={`${safeStr(book.title)}-${safeStr(book.isbn)}`}
                    type="button"
                    onClick={() => onSelectRelated(book)}
                    style={{
                      border: "none",
                      background: "transparent",
                      padding: 0,
                      textAlign: "left",
                      color: palette.text,
                      cursor: "pointer",
                      minWidth: 0,
                      width: isMobileLayout ? "100%" : 104,
                    }}
                  >
                    <div
                      style={{
                        borderRadius: 6,
                        overflow: "hidden",
                        filter: "drop-shadow(0 4px 8px rgba(5, 9, 16, 0.28))",
                      }}
                    >
                      <img
                        src={getDisplayCoverUrl(book)}
                        alt={safeStr(book.title)}
                        style={{
                          display: "block",
                          width: isMobileLayout ? "100%" : "auto",
                          maxWidth: "100%",
                          height: isMobileLayout ? "auto" : 132,
                          objectFit: "contain",
                          objectPosition: "left center",
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        fontSize: isMobileLayout ? 14 : 11,
                        lineHeight: 1.18,
                        fontWeight: 850,
                        color: palette.text,
                        width: "100%",
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2,
                      }}
                    >
                      {safeStr(book.title)}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        fontSize: isMobileLayout ? 13 : 10,
                        lineHeight: 1.2,
                        fontWeight: 700,
                        color: palette.mutedText,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {formatLongDate(book.releaseDate || book.ReleaseDate)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
