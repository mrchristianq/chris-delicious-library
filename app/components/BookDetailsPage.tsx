"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";
import { scaledPx, useDesktopDetailScale, useFitToViewportScale } from "./detailScale";
import { handleExternalLinkClick, openExternalUrl } from "../native/externalLinks";

type BookDetailsPageProps = {
  item: Record<string, unknown>;
  allBooks: Record<string, unknown>[];
  isMobileLayout: boolean;
  usePageBackground?: boolean;
  onBack: () => void;
  onEdit?: (item: Record<string, unknown>) => void;
  onDelete?: (item: Record<string, unknown>) => Promise<void> | void;
  onRate?: (item: Record<string, unknown>) => void;
  onSelectRelated: (item: Record<string, unknown>) => void;
  recommendedBooks?: Record<string, unknown>[];
  suppressRemoteRelatedCovers?: boolean;
  getDisplayCoverUrl: (item: Record<string, unknown>) => string;
  isAudiobookItem: (item: Record<string, unknown>) => boolean;
  onPaletteChange?: (palette: { start: string; end: string } | null) => void;
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

function isRemoteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
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

function getGoodreadsBookUrl(book: Record<string, unknown>): string {
  const directUrl = safeStr((book as any).goodreadsUrl || (book as any).GoodreadsUrl || (book as any).GoodreadsURL);
  if (directUrl) return directUrl;

  const isbn = safeStr((book as any).isbn13 || (book as any).ISBN13 || (book as any).isbn || (book as any).ISBN);
  const title = safeStr((book as any).title || (book as any).Title);
  const author = safeStr((book as any).author || (book as any).Author || (book as any).authors || (book as any).Authors);
  const query = isbn || [title, author].filter(Boolean).join(" ");
  if (!query) return "";
  return `https://www.goodreads.com/search?q=${encodeURIComponent(query)}`;
}

function getHardcoverBookUrl(book: Record<string, unknown>): string {
  const directUrl = safeStr((book as any).hardcoverUrl || (book as any).url || (book as any).bookUrl);
  if (directUrl) return directUrl;
  const slug = safeStr((book as any).slug || (book as any).hardcoverSlug);
  if (slug) return `https://hardcover.app/book/${encodeURIComponent(slug)}`;
  const id = safeStr((book as any).id || (book as any).hardcoverId || (book as any).HardcoverID);
  if (!id) return "";
  return `https://hardcover.app/book/${encodeURIComponent(id)}`;
}

function normalizeBookTitle(value: unknown): string {
  return safeStr(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(a novel|audiobook|audio book|book \d+)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeBookAuthor(value: unknown): string {
  return safeStr(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseBookRatingOutOfFive(value: string): number | null {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return Math.max(0, Math.min(5, parsed > 5 ? parsed / 2 : parsed));
}

function BookScoreCircle({ value, label, color }: { value: number; label: string; color: string }) {
  const pct = Math.max(0, Math.min(1, value / 5));
  const r = 27;
  const size = 72;
  const stroke = 5;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const labelWords = label.trim().split(/\s+/);
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 850, color: "#fff" }}>
          {value.toFixed(1)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.62)", textAlign: "left", lineHeight: 1.2 }}>
        {labelWords.map((w, i) => <span key={i}>{w}</span>)}
      </div>
    </div>
  );
}

function getBookScoreColor(value: number): string {
  if (value >= 4) return "#7ed321";
  if (value >= 3) return "#f5a623";
  return "#ff6b6b";
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
  onRate,
  onSelectRelated,
  recommendedBooks,
  suppressRemoteRelatedCovers = false,
  getDisplayCoverUrl,
  isAudiobookItem,
  onPaletteChange,
  highlightColor,
}: BookDetailsPageProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [failedRelatedCoverUrls, setFailedRelatedCoverUrls] = useState<Set<string>>(() => new Set());
  const detailScale = useDesktopDetailScale(isMobileLayout);
  const { ref: stageRef, scale: fitScale } = useFitToViewportScale<HTMLDivElement>(isMobileLayout);
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
  const recommendationItems = useMemo(
    () => (recommendedBooks ?? []).filter((book) => safeStr(book.title)),
    [recommendedBooks]
  );
  const displayBooksModule = useMemo(() => {
    const normalizedTitle = title.toLowerCase();
    const sameAuthorItems = allBooks
      .filter((book) => safeStr(book.title).toLowerCase() !== normalizedTitle)
      .filter((book) => safeStr(book.author || book.Author) === author);

    const sameAuthorKeys = new Set(
      sameAuthorItems.map((book) =>
        `${safeStr((book as any).hardcoverId || (book as any).HardcoverID || book.isbn13 || book.isbn || book.title)}::${safeStr(book.title).toLowerCase()}`
      )
    );
    const recommendationFill = recommendationItems.filter((book) => {
      const key = `${safeStr((book as any).hardcoverId || (book as any).HardcoverID || book.isbn13 || book.isbn || book.title)}::${safeStr(book.title).toLowerCase()}`;
      return !sameAuthorKeys.has(key);
    });

    if (!sameAuthorItems.length && !recommendationFill.length) {
      return relatedBooksModule;
    }

    const dedupeByTitle = (items: Record<string, unknown>[]) => {
      const seen = new Set<string>();
      return items.filter((book) => {
        const key = safeStr(book.title).toLowerCase();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    };
    const combined = dedupeByTitle([...sameAuthorItems, ...recommendationFill]).slice(0, 6);
    const label = recommendationFill.length > 0 ? "You May Also Like" : `More by ${author}`;
    return { label, items: combined };
  }, [allBooks, author, recommendationItems, relatedBooksModule, title]);
  const inLibraryHardcoverIds = useMemo(() => {
    const ids = new Set<string>();
    for (const book of allBooks) {
      const id = safeStr((book as any).hardcoverId || (book as any).HardcoverID || (book as any).id);
      if (id) ids.add(id);
    }
    return ids;
  }, [allBooks]);
  const inLibraryTitleAuthorKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const book of allBooks) {
      const titleKey = normalizeBookTitle((book as any).title);
      const authorKey = normalizeBookAuthor((book as any).author || (book as any).Author);
      if (!titleKey) continue;
      keys.add(`${titleKey}|||${authorKey}`);
    }
    return keys;
  }, [allBooks]);

  const chips = [typeLabel, statusLabel, ownershipLabel].filter(Boolean);
  const metaLine = [author, releaseDate, ...genres].filter(Boolean).join(" • ");
  const myRatingValue = parseBookRatingOutOfFive(myRatingLabel);
  const userRatingValue = parseBookRatingOutOfFive(userRatingLabel);
  const isAudiobook = typeLabel === "Audiobook";
  const lengthFact = isAudiobook
    ? (durationLabel ? { label: "Length", value: durationLabel } : null)
    : (pagesLabel ? { label: "Pages", value: pagesLabel } : null);
  const detailFacts = [
    { label: "Format", value: typeLabel },
    lengthFact,
    { label: "Released", value: releaseDate },
    { label: "Completed", value: showCompletedDate ? completedDateLabel : "" },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact?.value));
  const descriptionText = description || "No description yet for this title.";
  const descriptionFontSize = isMobileLayout
    ? 17
    : descriptionText.length > 1100
      ? 14
      : descriptionText.length > 850
        ? 15
        : descriptionText.length > 620
          ? 16
          : 17;
  const titleFontSize = isMobileLayout
    ? 34
    : scaledPx(
      title.length > 48
        ? 42
        : title.length > 32
          ? 48
          : 56,
      detailScale
    );
  const desktopSideColumnW = scaledPx(338, detailScale);
  const desktopHeroCoverMaxW = scaledPx(210, detailScale);
  const desktopHeroCoverMaxH = scaledPx(258, detailScale);
  const desktopHeroMinCoverColW = scaledPx(155, detailScale);
  const desktopRecommendationCardW = scaledPx(104, detailScale);
  const desktopRecommendationCardH = scaledPx(132, detailScale);
  const desktopGridHeaderH = scaledPx(64, detailScale);
  const desktopGridFeatureMinH = scaledPx(280, detailScale);
  const desktopGridFactsMinH = scaledPx(204, detailScale);
  const desktopGridRelatedMinH = scaledPx(300, detailScale);
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

    const handleWheel = (event: WheelEvent) => {
      const maxOffset = getMaxOffset();
      if (maxOffset <= 2) return;
      event.preventDefault();
      setOffset(Math.max(0, Math.min(maxOffset, offset + event.deltaY)));
      pauseUntil = Date.now() + 20000;
      lastTime = 0;
      window.clearTimeout(resetTimeout);
    };

    setOffset(0);
    viewport.addEventListener("wheel", handleWheel, { passive: false });
    animationFrame = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(resetTimeout);
      viewport.removeEventListener("wheel", handleWheel);
      content.style.transform = "translate3d(0, 0, 0)";
    };
  }, [descriptionFontSize, descriptionText, isMobileLayout]);

  return (
    <div
      style={{
        opacity: paletteReady ? 1 : 0,
        height: isMobileLayout ? "auto" : "100vh",
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
          position: "relative",
          zIndex: 1,
          width: "100%",
          height: isMobileLayout ? "auto" : "100%",
          display: isMobileLayout ? "block" : "flex",
          justifyContent: isMobileLayout ? undefined : "center",
          alignItems: isMobileLayout ? undefined : "flex-start",
        }}
      >
      <div
        ref={stageRef}
        style={{
          width: isMobileLayout ? "100%" : 1500,
          maxWidth: isMobileLayout ? 1500 : 1500,
          margin: isMobileLayout ? "0 auto" : 0,
          borderRadius: isMobileLayout ? 24 : 28,
          padding: isMobileLayout ? "12px" : "12px 12px 14px",
          background: usePageBackground
            ? `linear-gradient(180deg, ${rgba("#ffffff", 0.09)} 0%, ${rgba("#000000", 0.03)} 100%)`
            : `linear-gradient(180deg, ${rgba("#ffffff", 0.06)} 0%, ${rgba("#000000", 0.04)} 100%)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)",
          backdropFilter: "blur(12px) saturate(1.05)",
          minHeight: isMobileLayout ? undefined : "calc(100vh - 24px)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          transform: isMobileLayout ? undefined : `scale(${fitScale})`,
          transformOrigin: "top center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobileLayout ? "1fr" : `minmax(0, 1fr) ${desktopSideColumnW}px`,
            gridTemplateRows: isMobileLayout
              ? undefined
              : `${desktopGridHeaderH}px minmax(${desktopGridFeatureMinH}px, 0.82fr) minmax(${desktopGridFactsMinH}px, 0.53fr) minmax(${desktopGridRelatedMinH}px, 1fr)`,
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
            <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
              {onRate ? (
                <button
                  type="button"
                  onClick={() => onRate(item)}
                  style={{
                    borderRadius: 999,
                    padding: isMobileLayout ? "6px 11px" : "8px 14px",
                    fontSize: isMobileLayout ? 11 : 12,
                    lineHeight: 1,
                    fontWeight: 750,
                    border: `1px solid rgba(255,255,255,0.3)`,
                    background: `${highlightColor || "#007AFF"}`,
                    color: "#fff",
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.32), 0 8px 18px rgba(10, 14, 24, 0.14)",
                    backdropFilter: "blur(8px)",
                  }}
                  aria-label="Rate this book"
                >
                  Rate It
                </button>
              ) : null}
              {onEdit ? (
                <button
                  type="button"
                  onClick={() => onEdit(item)}
                  style={{
                    borderRadius: 999,
                    padding: isMobileLayout ? "6px 11px" : "8px 14px",
                    fontSize: isMobileLayout ? 11 : 12,
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
                    padding: isMobileLayout ? "6px 11px" : "8px 14px",
                    fontSize: isMobileLayout ? 11 : 12,
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
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", minWidth: 0 }}>
              <button
                type="button"
                onClick={onBack}
                style={{
                  width: 32,
                  height: 32,
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
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              {chips.length > 0
                ? chips.map((chip, index) => {
                  const isCompletedChip = chip.toLowerCase() === "completed";
                  return (
                    <span
                      key={`${chip}-${index}`}
                      style={{
                        borderRadius: 999,
                        padding: isMobileLayout ? "6px 10px" : "8px 13px",
                        fontSize: isMobileLayout ? 11 : 12,
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
              gridTemplateColumns: isMobileLayout
                ? "1fr"
                : `minmax(${desktopHeroMinCoverColW}px, ${desktopHeroCoverMaxW}px) minmax(0, 1fr)`,
              gap: isMobileLayout ? 16 : 22,
              alignItems: "center",
              padding: isMobileLayout ? "8px 4px" : "6px 6px",
            }}
          >
            <div style={{ minWidth: 0, justifySelf: isMobileLayout ? "center" : "stretch" }}>
              <div
                style={{
                  width: isMobileLayout ? 210 : "100%",
                  maxWidth: isMobileLayout ? 210 : desktopHeroCoverMaxW,
                }}
              >
                {(() => {
                  const externalHref = getGoodreadsBookUrl(item);
                  return externalHref ? (
                    <a
                      href={externalHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open on Goodreads"
                      onClick={(event) => handleExternalLinkClick(event, externalHref)}
                      style={{ display: "block", lineHeight: 0 }}
                    >
                      <img
                        src={coverUrl}
                        alt={title}
                        style={{
                          display: "block",
                          margin: "0 auto",
                          width: "auto",
                          height: "auto",
                          maxWidth: isMobileLayout ? 210 : "100%",
                          maxHeight: isMobileLayout ? undefined : desktopHeroCoverMaxH,
                          objectFit: "contain",
                          filter: "drop-shadow(0 5px 9px rgba(5, 9, 16, 0.34))",
                          cursor: "pointer",
                          ...COVER_IMAGE_RADIUS_STYLE,
                        }}
                      />
                    </a>
                  ) : (
                    <img
                      src={coverUrl}
                      alt={title}
                      style={{
                        display: "block",
                        margin: "0 auto",
                        width: "auto",
                        height: "auto",
                        maxWidth: isMobileLayout ? 210 : "100%",
                        maxHeight: isMobileLayout ? undefined : desktopHeroCoverMaxH,
                        objectFit: "contain",
                        filter: "drop-shadow(0 5px 9px rgba(5, 9, 16, 0.34))",
                        ...COVER_IMAGE_RADIUS_STYLE,
                      }}
                    />
                  );
                })()}
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
              gridRow: isMobileLayout ? undefined : "2",
              gridColumn: isMobileLayout ? undefined : "2",
              minWidth: 0,
              minHeight: 0,
              overflow: "hidden",
              borderRadius: 20,
              padding: isMobileLayout ? "16px" : "18px",
              background: `linear-gradient(${rgba("#000000", 0.22)}, ${rgba("#000000", 0.22)}), linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.035)} 100%)`,
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
                justifyItems: "stretch",
                minHeight: 0,
                paddingTop: isMobileLayout ? 0 : 10,
              }}
            >
              {detailFacts.length > 0 ? (
                <div
                  style={{
                    width: "100%",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px 14px",
                  }}
                >
                  {detailFacts.map((fact) => (
                    <div
                      key={`${fact.label}-${fact.value}`}
                      style={{
                        minWidth: 0,
                        display: "flex",
                        flexDirection: "column",
                        gap: 5,
                        textAlign: "left",
                      }}
                    >
                      <div style={{ fontSize: 11, lineHeight: 1, fontWeight: 800, color: palette.mutedText }}>
                        {fact.label}
                      </div>
                      <div style={{ fontSize: 15, lineHeight: 1.18, fontWeight: 850, color: palette.text, whiteSpace: "nowrap" }}>
                        {fact.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {(myRatingValue !== null || userRatingValue !== null) ? (
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    gap: 14,
                    marginTop: 8,
                    transform: "translateX(-20px)",
                  }}
                >
                  {userRatingValue !== null ? (
                    <BookScoreCircle value={userRatingValue} label="User Rating" color={getBookScoreColor(userRatingValue)} />
                  ) : null}
                  {myRatingValue !== null ? (
                    <BookScoreCircle value={myRatingValue} label="My Rating" color={getBookScoreColor(myRatingValue)} />
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <div
            style={{
              gridColumn: isMobileLayout ? undefined : "1 / -1",
              minWidth: 0,
              minHeight: 0,
              height: "100%",
              maxHeight: "100%",
              overflow: "hidden",
              borderRadius: 20,
              padding: isMobileLayout ? "16px 16px 18px" : "16px 18px",
              background: `linear-gradient(${rgba("#000000", 0.22)}, ${rgba("#000000", 0.22)}), linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.04)} 100%)`,
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

          {displayBooksModule.items.length > 0 ? (
            <div
              style={{
                gridColumn: isMobileLayout ? undefined : "1 / -1",
                minWidth: 0,
                minHeight: 0,
                overflow: "hidden",
                borderRadius: 20,
                padding: isMobileLayout ? "16px 16px 18px" : "14px 18px",
                background: `linear-gradient(${rgba("#000000", 0.22)}, ${rgba("#000000", 0.22)}), linear-gradient(180deg, ${palette.surface} 0%, ${rgba("#ffffff", 0.04)} 100%)`,
                border: `1px solid ${palette.surfaceBorder}`,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
              }}
            >
              <div style={{ fontSize: isMobileLayout ? 16 : 14, lineHeight: 1.1, fontWeight: 850, color: palette.text }}>
                {displayBooksModule.label}
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: isMobileLayout
                    ? "repeat(2, minmax(0, 1fr))"
                    : `repeat(${Math.min(displayBooksModule.items.length, 6)}, ${desktopRecommendationCardW}px)`,
                  gap: isMobileLayout ? 13 : 13,
                  height: isMobileLayout ? undefined : "calc(100% - 26px)",
                  alignItems: "start",
                  alignContent: "start",
                  justifyContent: "start",
                }}
              >
                {(() => {
                  const currentSeriesNorm = seriesLabel.toLowerCase();
                  const currentGenreSet = new Set(genres.map((g) => g.toLowerCase()));
                  const tokenizeAuthors = (raw: string) =>
                    safeStr(raw)
                      .toLowerCase()
                      .split(/\s*(?:,|;|&| and )\s*/)
                      .map((t) => t.replace(/\s+/g, " ").trim())
                      .filter(Boolean);
                  const currentAuthorTokens = new Set(tokenizeAuthors(author));
                  const computeReason = (book: any): string => {
                    const bookAuthorTokens = tokenizeAuthors(safeStr(book.author || book.Author));
                    if (currentAuthorTokens.size > 0 && bookAuthorTokens.some((t) => currentAuthorTokens.has(t))) return "Same Author";
                    const bookSeries = safeStr(book.series || book.Series).toLowerCase();
                    if (currentSeriesNorm && bookSeries && bookSeries === currentSeriesNorm) return "Same Series";
                    const bookGenreList: string[] = Array.isArray(book.genres)
                      ? (book.genres as unknown[]).map((g) => safeStr(g))
                      : splitList(book.genre || book.categories || book.Genre);
                    if (bookGenreList.some((g) => currentGenreSet.has(g.toLowerCase()))) return "Same Genre";
                    return Boolean(book.__isRecommendation) ? "Recommended" : "Suggested";
                  };
                  return (isMobileLayout ? displayBooksModule.items : displayBooksModule.items.slice(0, 6)).map((book) => {
                  const isRecommendation = Boolean((book as any).__isRecommendation);
                  const fallbackCover = safeStr((book as any).posterUrl || (book as any).imageUrl || (book as any).ImageURL);
                  const coverSrcRaw = getDisplayCoverUrl(book) || fallbackCover;
                  const coverSrc = ((suppressRemoteRelatedCovers && isRemoteHttpUrl(coverSrcRaw)) || failedRelatedCoverUrls.has(coverSrcRaw)) ? "" : coverSrcRaw;
                  const hardcoverUrl = getHardcoverBookUrl(book);
                  const hardcoverId = safeStr((book as any).hardcoverId || (book as any).HardcoverID || (book as any).id);
                  const titleAuthorKey = `${normalizeBookTitle((book as any).title)}|||${normalizeBookAuthor((book as any).author || (book as any).Author)}`;
                  const isInLibrary =
                    (hardcoverId && inLibraryHardcoverIds.has(hardcoverId)) ||
                    inLibraryTitleAuthorKeys.has(titleAuthorKey);
                  const hasExternalTarget = Boolean(hardcoverUrl);
                  const showNotInLibrary = hasExternalTarget && (isRecommendation || !isInLibrary);
                  const reason = computeReason(book);
                  return (
                  <button
                    key={`${safeStr(book.title)}-${safeStr((book as any).id || book.isbn || book.isbn13)}`}
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
                      width: isMobileLayout ? "100%" : desktopRecommendationCardW,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div
                      onClick={(event) => {
                        if (!showNotInLibrary || !hardcoverUrl) return;
                        event.preventDefault();
                        event.stopPropagation();
                        void openExternalUrl(hardcoverUrl);
                      }}
                      style={{
                        borderRadius: 6,
                        overflow: "hidden",
                        filter: "drop-shadow(0 4px 8px rgba(5, 9, 16, 0.28))",
                        cursor: showNotInLibrary && hardcoverUrl ? "pointer" : "default",
                        height: isMobileLayout ? 148 : desktopRecommendationCardH,
                        display: "flex",
                        alignItems: "flex-end",
                        justifyContent: "flex-start",
                      }}
                    >
                      {coverSrc ? (
                        <img
                          src={coverSrc}
                          alt={safeStr(book.title)}
                          onError={() => {
                            setFailedRelatedCoverUrls((prev) => {
                              if (prev.has(coverSrc)) return prev;
                              const next = new Set(prev);
                              next.add(coverSrc);
                              return next;
                            });
                          }}
                          style={{
                            width: "auto",
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain",
                            objectPosition: "left bottom",
                            display: "block",
                            ...COVER_IMAGE_RADIUS_STYLE,
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: isMobileLayout ? "100%" : desktopRecommendationCardW,
                            height: isMobileLayout ? 148 : desktopRecommendationCardH,
                            borderRadius: 6,
                            background: "rgba(255,255,255,0.16)",
                            border: `1px solid ${palette.surfaceBorder}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 8px",
                            textAlign: "center",
                          }}
                        >
                          <span style={{ fontSize: 11, fontWeight: 700, color: palette.mutedText, lineHeight: 1.2 }}>
                            No Cover
                          </span>
                        </div>
                      )}
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
                        minHeight: isMobileLayout ? 34 : 26,
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
                        minHeight: isMobileLayout ? 16 : 12,
                      }}
                    >
                      {formatLongDate(book.releaseDate || book.ReleaseDate)}
                    </div>
                    {(() => {
                      // "Not in Library" already implies it's a recommendation, so suppress
                      // the generic "Recommended" / "Suggested" reason pill in that case.
                      const reasonIsImpliedByNotInLibrary = showNotInLibrary && (reason === "Recommended" || reason === "Suggested");
                      const showReasonPill = !reasonIsImpliedByNotInLibrary;
                      return (
                    <div style={{ display: "flex", gap: 4, marginTop: 6, flexWrap: "wrap", minHeight: 24, alignItems: "center" }}>
                      {showReasonPill ? (
                      <span
                        style={{
                          fontSize: 9,
                          fontWeight: 800,
                          letterSpacing: "0.02em",
                          color: palette.text,
                          border: `1px solid ${palette.surfaceBorder}`,
                          borderRadius: 999,
                          padding: "2px 6px",
                          background: palette.chip,
                        }}
                      >
                        {reason}
                      </span>
                      ) : null}
                      {showNotInLibrary ? (
                        <span
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onSelectRelated(book);
                          }}
                          style={{ fontSize: 9, fontWeight: 800, color: palette.text, border: `1px solid ${palette.surfaceBorder}`, borderRadius: 999, padding: "2px 6px", background: palette.chip }}
                        >
                          Not in Library
                        </span>
                      ) : null}
                    </div>
                      );
                    })()}
                  </button>
                )})})()}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      </div>
    </div>
  );
}
