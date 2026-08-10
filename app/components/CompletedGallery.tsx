"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type MediaType = "book" | "movie" | "tv" | "game";

export type CompletedGalleryEntry = {
  item: Record<string, unknown>;
  mediaType: MediaType;
  completionDate: string;
  itemKey: string;
};

type CompletedGalleryProps = {
  items: CompletedGalleryEntry[];
  isDark: boolean;
  isMobileLayout: boolean;
  searchQuery?: string;
  getDisplayCoverUrl: (item: Record<string, unknown>) => string;
  isAudiobookItem?: (item: Record<string, unknown>) => boolean;
  onSelectItem: (item: Record<string, unknown>, mediaType: MediaType) => void;
  onEditItem: (item: Record<string, unknown>, mediaType: MediaType) => void;
  onRateItem: (item: Record<string, unknown>, mediaType: MediaType) => void;
  onBack: () => void;
};

const MEDIA_TYPE_FILTER_OPTIONS: Array<{ key: MediaType | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "book", label: "Books" },
  { key: "movie", label: "Movies" },
  { key: "tv", label: "TV Shows" },
  { key: "game", label: "Games" },
];

const DEFAULT_CAROUSEL_HEIGHT = 168;
const MIN_CAROUSEL_HEIGHT = 96;
const MAX_CAROUSEL_HEIGHT = 340;

// Base "resting" tilt for the featured cover — matches the angle requested,
// then mouse movement nudges it further, the same way the library grid's
// hover-tilt effect works (see handleCaseMouseMove in app/page.tsx).
const COVER_BASE_TILT_Y = 10;
const COVER_BASE_TILT_X = 2;

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif';
const REVIEW_FONT = 'Georgia, "Iowan Old Style", "Palatino Linotype", "Book Antiqua", Palatino, serif';

const MEDIA_ACCENTS: Record<MediaType, string> = {
  book: "#3fa66b",
  movie: "#8b6fd6",
  tv: "#e0973f",
  game: "#3d7fd9",
};

function text(value: unknown): string {
  return (value ?? "").toString().trim();
}

function first(item: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = text(item?.[key]);
    if (value) return value;
  }
  return "";
}

function splitTags(value: string): string[] {
  return value
    .split(/\s*[,|]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function mediaLabel(mediaType: MediaType): string {
  if (mediaType === "tv") return "TV Show";
  return `${mediaType.slice(0, 1).toUpperCase()}${mediaType.slice(1)}`;
}

function getYear(value: string): string {
  const match = value.match(/\b(?:19|20)\d{2}\b/);
  return match ? match[0] : "";
}

function formatDisplayDate(raw: string): string {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  }
  return raw;
}

function formatCompactDate(raw: string): string {
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const dd = String(parsed.getDate()).padStart(2, "0");
  const month = parsed.getMonth() + 1;
  return `${month}/${dd}/${parsed.getFullYear()}`;
}

type DateRangePreset = "all" | "this-year" | "last-year" | "last-30" | "custom";

const DATE_RANGE_PRESETS: Array<{ key: DateRangePreset; label: string }> = [
  { key: "all", label: "All Time" },
  { key: "this-year", label: "This Year" },
  { key: "last-year", label: "Last Year" },
  { key: "last-30", label: "Last 30 Days" },
  { key: "custom", label: "Custom Range" },
];

function matchesDateRange(raw: string, preset: DateRangePreset, customFrom: string, customTo: string): boolean {
  if (preset === "all") return true;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return false;
  const now = new Date();
  if (preset === "this-year") return parsed.getFullYear() === now.getFullYear();
  if (preset === "last-year") return parsed.getFullYear() === now.getFullYear() - 1;
  if (preset === "last-30") {
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - 30);
    return parsed >= cutoff && parsed <= now;
  }
  // custom
  if (customFrom) {
    const from = new Date(customFrom);
    if (!Number.isNaN(from.getTime()) && parsed < from) return false;
  }
  if (customTo) {
    const to = new Date(customTo);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      if (parsed > to) return false;
    }
  }
  return true;
}

function formatRuntimeMinutes(raw: string): string {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  const hours = Math.floor(n / 60);
  const minutes = Math.round(n % 60);
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

function formatHoursPlayed(raw: string): string {
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return "";
  return `${Number.isInteger(n) ? n : n.toFixed(1)}h`;
}

type Fact = { label: string; value: string };

function getReleaseYear(item: Record<string, unknown>, mediaType: MediaType): string {
  if (mediaType === "tv") {
    return getYear(first(item, ["firstAirDate", "FirstAirDate", "year", "Year"]));
  }
  return getYear(first(item, ["releaseDate", "ReleaseDate", "year", "Year"]));
}

function getCreatorField(item: Record<string, unknown>, mediaType: MediaType): Fact | null {
  if (mediaType === "book") {
    const value = first(item, ["author", "Author"]);
    return value ? { label: "Author", value } : null;
  }
  if (mediaType === "movie") {
    const value = first(item, ["director", "Director"]);
    return value ? { label: "Director", value } : null;
  }
  if (mediaType === "tv") {
    const value = first(item, ["creator", "Creator", "CreatedBy"]);
    return value ? { label: "Creator", value } : null;
  }
  const value = first(item, ["developer", "Developer"]);
  return value ? { label: "Developer", value } : null;
}

function getGalleryFacts(item: Record<string, unknown>, mediaType: MediaType): Fact[] {
  const entries: Array<Fact | null> =
    mediaType === "book"
      ? [
          { label: "Format", value: first(item, ["types", "type", "Type"]) },
          { label: "Pages", value: first(item, ["pages", "Pages"]) },
          { label: "Duration", value: first(item, ["audiobookDuration", "AudiobookDuration"]) },
          { label: "Series", value: first(item, ["series", "Series"]) },
        ]
      : mediaType === "movie"
        ? [
            { label: "Runtime", value: formatRuntimeMinutes(first(item, ["runtime", "Runtime"])) },
            { label: "Ownership", value: first(item, ["ownership", "Ownership"]) },
          ]
        : mediaType === "tv"
          ? [
              { label: "Seasons", value: first(item, ["numberOfSeasons", "NumberOfSeasons"]) },
              { label: "Episodes", value: first(item, ["numberOfEpisodes", "NumberOfEpisodes"]) },
              { label: "Network", value: first(item, ["networks", "Networks"]) },
            ]
          : [
              { label: "Platform", value: first(item, ["__renderPlatform", "platform", "Platform"]) },
              { label: "Time Played", value: formatHoursPlayed(first(item, ["hoursPlayed", "Hours Played"])) },
              { label: "Ownership", value: first(item, ["ownership", "Ownership"]) },
            ];
  return entries.filter((entry): entry is Fact => Boolean(entry?.value));
}

function getGenreTags(item: Record<string, unknown>): string[] {
  return splitTags(first(item, ["genres", "Genres", "genre", "Genre", "categories"])).slice(0, 8);
}

type RatingInfo = { label: string; display: string; pct: number; count?: string } | null;

function getMyRating(item: Record<string, unknown>, mediaType: MediaType): RatingInfo {
  const raw = first(item, ["myRating", "My Rating", "MyRating"]);
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const max = mediaType === "book" ? 5 : 10;
  const clamped = Math.min(max, n);
  return { label: "My Rating", display: `${clamped % 1 === 0 ? clamped : clamped.toFixed(1)}/${max}`, pct: (clamped / max) * 100 };
}

function getAverageRating(item: Record<string, unknown>, mediaType: MediaType): RatingInfo {
  if (mediaType === "book") {
    const raw = first(item, ["userRating", "UserRating", "externalAverageRating", "ExternalAverageRating"]);
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    const clamped = Math.min(5, n);
    return { label: "Average User Rating", display: `${clamped.toFixed(1)}/5`, pct: (clamped / 5) * 100 };
  }
  if (mediaType === "game") {
    const raw = first(item, ["igdbRating", "IGDB Rating", "rating", "Rating"]);
    const n = Number.parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    // IGDB ratings are stored on a 0-100 scale in this app.
    const outOf10 = Math.min(10, n / 10);
    return { label: "Average Rating", display: `${outOf10.toFixed(1)}/10`, pct: (outOf10 / 10) * 100 };
  }
  const raw = first(item, ["tmdbRating", "TMDB_Rating", "TMDB Rating"]);
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  const clamped = Math.min(10, n);
  return { label: "Average User Rating", display: `${clamped.toFixed(1)}/10`, pct: (clamped / 10) * 100 };
}

const STAR_SIZE = 24.5;

function StarRow({ pct, color, size = STAR_SIZE }: { pct: number; color: string; size?: number }) {
  const stars = [0, 1, 2, 3, 4].map((i) => {
    const starPct = Math.max(0, Math.min(100, pct - i * 20)) * 5;
    return Math.min(100, starPct);
  });
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-hidden>
      {stars.map((fillPct, i) => (
        <span key={i} style={{ position: "relative", display: "inline-block", width: size, height: size, lineHeight: `${size}px`, flexShrink: 0 }}>
          <span style={{ position: "absolute", inset: 0, color: "rgba(150,150,150,0.35)", fontSize: size }}>★</span>
          <span style={{ position: "absolute", inset: 0, color, fontSize: size, overflow: "hidden", width: `${fillPct}%` }}>★</span>
        </span>
      ))}
    </span>
  );
}

export function CompletedGallery({
  items,
  isDark,
  isMobileLayout,
  searchQuery,
  getDisplayCoverUrl,
  isAudiobookItem,
  onSelectItem,
  onEditItem,
  onRateItem,
  onBack,
}: CompletedGalleryProps) {
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaType | "all">("all");
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [dateRangePreset, setDateRangePreset] = useState<DateRangePreset>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!filterOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterPanelRef.current?.contains(target)) return;
      if (filterButtonRef.current?.contains(target)) return;
      setFilterOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFilterOpen(false);
    };
    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [filterOpen]);

  const q = text(searchQuery).toLowerCase();
  const searchedItems = useMemo(
    () => (q ? items.filter((entry) => first(entry.item, ["title", "Title"]).toLowerCase().includes(q)) : items),
    [items, q]
  );

  const mediaTypeCounts = useMemo(() => {
    const counts: Record<MediaType | "all", number> = { all: searchedItems.length, book: 0, movie: 0, tv: 0, game: 0 };
    for (const entry of searchedItems) counts[entry.mediaType] += 1;
    return counts;
  }, [searchedItems]);

  const typeFilteredItems = useMemo(
    () => (mediaTypeFilter === "all" ? searchedItems : searchedItems.filter((entry) => entry.mediaType === mediaTypeFilter)),
    [searchedItems, mediaTypeFilter]
  );

  const genreOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of typeFilteredItems) {
      for (const g of getGenreTags(entry.item)) {
        counts.set(g, (counts.get(g) || 0) + 1);
      }
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [typeFilteredItems]);

  // If the selected genre no longer exists among the current (search/type
  // filtered) options — e.g. the user switched media type — treat it as
  // cleared. Derived during render instead of an effect so it takes effect
  // immediately, in the same pass, rather than one render late.
  const effectiveGenreFilter = genreFilter && genreOptions.some(([g]) => g === genreFilter) ? genreFilter : null;

  const genreFilteredItems = useMemo(
    () =>
      effectiveGenreFilter
        ? typeFilteredItems.filter((entry) => getGenreTags(entry.item).includes(effectiveGenreFilter))
        : typeFilteredItems,
    [typeFilteredItems, effectiveGenreFilter]
  );

  const filteredItems = useMemo(
    () =>
      dateRangePreset === "all"
        ? genreFilteredItems
        : genreFilteredItems.filter((entry) => matchesDateRange(entry.completionDate, dateRangePreset, customFrom, customTo)),
    [genreFilteredItems, dateRangePreset, customFrom, customTo]
  );

  const isFiltering = Boolean(q || mediaTypeFilter !== "all" || effectiveGenreFilter || dateRangePreset !== "all");
  const activeFilterCount =
    (mediaTypeFilter !== "all" ? 1 : 0) + (effectiveGenreFilter ? 1 : 0) + (dateRangePreset !== "all" ? 1 : 0);

  const [selectedIndexRaw, setSelectedIndex] = useState(0);
  const [lastFilterSignature, setLastFilterSignature] = useState("");
  const filterSignature = `${q}|${mediaTypeFilter}|${effectiveGenreFilter ?? ""}|${dateRangePreset}|${customFrom}|${customTo}`;
  if (filterSignature !== lastFilterSignature) {
    setLastFilterSignature(filterSignature);
    if (selectedIndexRaw !== 0) setSelectedIndex(0);
  }
  const selectedIndex = filteredItems.length > 0 ? Math.min(selectedIndexRaw, filteredItems.length - 1) : 0;
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [carouselHeight, setCarouselHeight] = useState(DEFAULT_CAROUSEL_HEIGHT);
  const [coverTilt, setCoverTilt] = useState({ y: COVER_BASE_TILT_Y, x: COVER_BASE_TILT_X });
  const [coverHovering, setCoverHovering] = useState(false);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null);
  const coverTiltRafRef = useRef<number | null>(null);
  const coverTiltPendingRef = useRef<{ y: number; x: number } | null>(null);

  const flushCoverTilt = () => {
    coverTiltRafRef.current = null;
    const pending = coverTiltPendingRef.current;
    if (!pending) return;
    setCoverTilt(pending);
    coverTiltPendingRef.current = null;
  };

  const handleCoverMouseMove = (event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const xRel = (event.clientX - rect.left) / rect.width - 0.5;
    const yRel = (event.clientY - rect.top) / rect.height - 0.5;
    const maxTiltDelta = 14;
    const tiltYDelta = Math.max(-maxTiltDelta, Math.min(maxTiltDelta, xRel * maxTiltDelta * 2));
    const tiltXDelta = Math.max(-9, Math.min(9, -yRel * 14));
    coverTiltPendingRef.current = { y: COVER_BASE_TILT_Y + tiltYDelta, x: COVER_BASE_TILT_X + tiltXDelta };
    if (coverTiltRafRef.current === null) {
      coverTiltRafRef.current = window.requestAnimationFrame(flushCoverTilt);
    }
  };

  const handleCoverMouseEnter = () => setCoverHovering(true);

  const handleCoverMouseLeave = () => {
    coverTiltPendingRef.current = null;
    if (coverTiltRafRef.current !== null) {
      window.cancelAnimationFrame(coverTiltRafRef.current);
      coverTiltRafRef.current = null;
    }
    setCoverHovering(false);
    setCoverTilt({ y: COVER_BASE_TILT_Y, x: COVER_BASE_TILT_X });
  };

  useEffect(() => {
    return () => {
      if (coverTiltRafRef.current !== null) window.cancelAnimationFrame(coverTiltRafRef.current);
    };
  }, []);

  const selected = filteredItems[selectedIndex] || null;

  const [notesExpandedForKey, setNotesExpandedForKey] = useState<string | undefined>(selected?.itemKey);
  if (selected?.itemKey !== notesExpandedForKey) {
    setNotesExpandedForKey(selected?.itemKey);
    setNotesExpanded(false);
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setSelectedIndex((i) => Math.min(filteredItems.length - 1, i + 1));
      } else if (event.key === "ArrowLeft") {
        setSelectedIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [filteredItems.length]);

  useEffect(() => {
    itemRefs.current[selectedIndex]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedIndex]);

  const handleResizeStart = (clientY: number) => {
    resizeStateRef.current = { startY: clientY, startHeight: carouselHeight };
    const handleMove = (moveEvent: PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      const delta = moveEvent.clientY - state.startY;
      // Carousel is anchored to the bottom of the screen, so its top edge (the
      // separator) tracks the cursor when height moves opposite to the drag.
      const next = Math.max(MIN_CAROUSEL_HEIGHT, Math.min(MAX_CAROUSEL_HEIGHT, state.startHeight - delta));
      setCarouselHeight(next);
    };
    const handleUp = () => {
      resizeStateRef.current = null;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  const bg = isDark ? "#050505" : "#ffffff";
  const textPrimary = isDark ? "#f5f5f3" : "#141210";
  const textSecondary = isDark ? "rgba(255,255,255,0.56)" : "rgba(30,26,22,0.58)";
  const textMuted = isDark ? "rgba(255,255,255,0.38)" : "rgba(30,26,22,0.40)";
  const hairline = isDark ? "rgba(255,255,255,0.10)" : "rgba(20,16,12,0.10)";
  const cardBg = isDark ? "rgba(255,255,255,0.045)" : "rgba(20,16,12,0.035)";
  const accent = isDark ? "#8baff4" : "#3461ad";
  // Keeps the floating header legible no matter how bright the spotlight
  // gets behind it, without needing an opaque bar.
  const headerTextShadow = isDark
    ? "0 1px 8px rgba(0,0,0,0.85), 0 0 22px rgba(0,0,0,0.55)"
    : "0 1px 8px rgba(255,255,255,0.92), 0 0 22px rgba(255,255,255,0.65)";

  const title = selected ? first(selected.item, ["title", "Title"]) || "Untitled" : "";
  const year = selected ? getReleaseYear(selected.item, selected.mediaType) : "";
  const creator = selected ? getCreatorField(selected.item, selected.mediaType) : null;
  const facts = selected ? getGalleryFacts(selected.item, selected.mediaType) : [];
  const genres = selected ? getGenreTags(selected.item) : [];
  const myRating = selected ? getMyRating(selected.item, selected.mediaType) : null;
  const avgRating = selected ? getAverageRating(selected.item, selected.mediaType) : null;
  const notes = selected ? first(selected.item, ["notes", "Notes"]) : "";
  const completionDisplay = selected ? formatDisplayDate(selected.completionDate) : "";
  const coverUrl = selected ? getDisplayCoverUrl(selected.item) : "";
  const mediaAccent = selected ? MEDIA_ACCENTS[selected.mediaType] : accent;

  const headerBlock = (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: isMobileLayout ? "14px 16px" : "16px 28px",
        zIndex: 2,
      }}
    >
      <button
        type="button"
        onClick={onBack}
        aria-label="Back to library"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 32,
          height: 32,
          borderRadius: 8,
          border: `1px solid ${hairline}`,
          background: isDark ? "rgba(10,10,10,0.5)" : "rgba(255,255,255,0.65)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          color: textPrimary,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: textMuted, textShadow: headerTextShadow }}>Completed</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: textPrimary, lineHeight: 1.2, textShadow: headerTextShadow }}>Gallery</div>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: textSecondary, whiteSpace: "nowrap", textShadow: headerTextShadow }}>
          {filteredItems.length}
          {isFiltering ? ` of ${items.length}` : ""} completed item{filteredItems.length === 1 && !isFiltering ? "" : "s"}
        </div>
        {items.length > 0 ? (
          <button
            ref={filterButtonRef}
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            aria-pressed={filterOpen}
            aria-expanded={filterOpen}
            style={{
              position: "relative",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 999,
              border: filterOpen || isFiltering ? `1px solid ${accent}` : `1px solid ${hairline}`,
              background: filterOpen || isFiltering ? `${accent}1f` : isDark ? "rgba(10,10,10,0.5)" : "rgba(255,255,255,0.65)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              color: filterOpen || isFiltering ? accent : textSecondary,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            Filter
            {activeFilterCount > 0 ? (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 16,
                  height: 16,
                  padding: "0 4px",
                  borderRadius: 999,
                  background: accent,
                  color: isDark ? "#050505" : "#ffffff",
                  fontSize: 10,
                  fontWeight: 800,
                }}
              >
                {activeFilterCount}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>

      {filterOpen ? (
        <div
          ref={filterPanelRef}
          style={{
            position: "absolute",
            top: "100%",
            right: isMobileLayout ? 16 : 28,
            marginTop: 8,
            width: isMobileLayout ? "calc(100vw - 32px)" : 320,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 14,
            border: `1px solid ${hairline}`,
            background: isDark ? "#111111" : "#ffffff",
            boxShadow: isDark ? "0 20px 40px rgba(0,0,0,0.6)" : "0 20px 40px rgba(30,24,18,0.18)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            zIndex: 20,
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>
              Media Type
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {MEDIA_TYPE_FILTER_OPTIONS.map((option) => {
                const active = mediaTypeFilter === option.key;
                const count = mediaTypeCounts[option.key];
                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setMediaTypeFilter(option.key)}
                    aria-pressed={active}
                    disabled={count === 0 && !active}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "5px 11px",
                      borderRadius: 999,
                      border: active ? `1px solid ${accent}` : `1px solid ${hairline}`,
                      background: active ? `${accent}1f` : "transparent",
                      color: active ? accent : count === 0 ? textMuted : textSecondary,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: count === 0 && !active ? "default" : "pointer",
                      opacity: count === 0 && !active ? 0.5 : 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {option.label}
                    <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.75 }}>{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {genreOptions.length ? (
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>
                Genre
              </div>
              <select
                value={effectiveGenreFilter ?? ""}
                onChange={(event) => setGenreFilter(event.target.value || null)}
                style={{
                  width: "100%",
                  padding: "7px 9px",
                  borderRadius: 8,
                  border: effectiveGenreFilter ? `1px solid ${accent}` : `1px solid ${hairline}`,
                  background: isDark ? "#0c0c0c" : "#ffffff",
                  color: effectiveGenreFilter ? accent : textPrimary,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <option value="">All Genres</option>
                {genreOptions.map(([g, count]) => (
                  <option key={g} value={g}>
                    {g} ({count})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>
              Completed Date
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {DATE_RANGE_PRESETS.map((preset) => {
                const active = dateRangePreset === preset.key;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => setDateRangePreset(preset.key)}
                    aria-pressed={active}
                    style={{
                      padding: "5px 11px",
                      borderRadius: 999,
                      border: active ? `1px solid ${accent}` : `1px solid ${hairline}`,
                      background: active ? `${accent}1f` : "transparent",
                      color: active ? accent : textSecondary,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            {dateRangePreset === "custom" ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: `1px solid ${hairline}`,
                    background: isDark ? "#0c0c0c" : "#ffffff",
                    color: textPrimary,
                    fontSize: 12,
                    minWidth: 0,
                  }}
                />
                <span style={{ color: textMuted, fontSize: 11 }}>to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    borderRadius: 8,
                    border: `1px solid ${hairline}`,
                    background: isDark ? "#0c0c0c" : "#ffffff",
                    color: textPrimary,
                    fontSize: 12,
                    minWidth: 0,
                  }}
                />
              </div>
            ) : null}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: `1px solid ${hairline}` }}>
            <button
              type="button"
              onClick={() => {
                setMediaTypeFilter("all");
                setGenreFilter(null);
                setDateRangePreset("all");
                setCustomFrom("");
                setCustomTo("");
              }}
              disabled={!isFiltering}
              style={{
                border: "none",
                background: "none",
                color: isFiltering ? accent : textMuted,
                fontSize: 12,
                fontWeight: 700,
                cursor: isFiltering ? "pointer" : "default",
                padding: "8px 4px 0",
              }}
            >
              Clear filters
            </button>
            <button
              type="button"
              onClick={() => setFilterOpen(false)}
              style={{
                padding: "7px 16px",
                borderRadius: 999,
                border: "none",
                background: accent,
                color: isDark ? "#050505" : "#ffffff",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Done
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  if (!selected) {
    return (
      <div style={{ position: "relative", display: "flex", flexDirection: "column", height: isMobileLayout ? "auto" : "calc(100vh - 40px)", minHeight: isMobileLayout ? "100vh" : undefined, maxHeight: isMobileLayout ? undefined : "calc(100vh - 40px)", overflow: isMobileLayout ? "visible" : "hidden", background: bg, fontFamily: FONT }}>
        {headerBlock}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: textSecondary, fontSize: 14, textAlign: "center", padding: 24 }}>
          {items.length === 0
            ? "Nothing completed yet. Finish a book, movie, show, or game and it will show up here."
            : "No completed items match your filters."}
        </div>
      </div>
    );
  }

  const spotlightStage = (
    <div
      style={{
        position: "relative",
        flex: "0 0 auto",
        minHeight: isMobileLayout ? 260 : 0,
        height: isMobileLayout ? "38vh" : "100%",
        maxHeight: isMobileLayout ? undefined : "100%",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        padding: isMobileLayout ? "16px 16px 20px" : "24px 24px 36px",
        boxSizing: "border-box",
        overflow: "visible",
      }}
    >
      {/* Single soft, wide ambient glow — no hard shape, no cone, no defined
          edges. Just one big radial falloff, wide enough to spread well past
          the cover on both sides and fade smoothly in every direction, the
          way real bounced/ambient light actually looks (matching the
          reference: a broad soft glow behind the subject, not a beam). */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "-20%",
          width: "190%",
          height: "85%",
          transform: "translateX(-50%)",
          background: isDark
            ? "radial-gradient(ellipse 68% 55% at 50% 28%, rgba(255,255,255,0.5), rgba(255,255,255,0.2) 38%, rgba(255,255,255,0.08) 62%, rgba(255,255,255,0) 85%)"
            : "radial-gradient(ellipse 68% 55% at 50% 28%, rgba(255,252,244,0.58), rgba(255,252,244,0.22) 38%, rgba(215,196,164,0.09) 62%, rgba(215,196,164,0) 85%)",
          filter: "blur(28px)",
          pointerEvents: "none",
        }}
      />
      {/* Reflected light bleed: a faint, blurred echo of the cover's own colors,
          layered inside the same soft glow so its colors tint the ambient
          light without creating a separate visible shape. */}
      {coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          aria-hidden
          src={coverUrl}
          alt=""
          style={{
            position: "absolute",
            left: "50%",
            top: "34%",
            display: "block",
            width: "auto",
            height: "auto",
            maxHeight: "60%",
            maxWidth: "78%",
            objectFit: "contain",
            borderRadius: 10,
            filter: `blur(60px) saturate(1.05) brightness(${isDark ? 1.05 : 1})`,
            opacity: isDark ? 0.22 : 0.15,
            transform: "translate(-50%, -50%) scale(1.05)",
            pointerEvents: "none",
          }}
        />
      ) : null}
      {/* Floor: soft reflected light pool plus a grounding contact shadow, contained near the bottom of the stage */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          bottom: 4,
          width: "min(86%, 480px)",
          height: 60,
          transform: "translateX(-50%)",
          background: isDark
            ? [
                "radial-gradient(ellipse 64% 100% at 50% 38%, rgba(255,255,255,0.4), rgba(255,255,255,0) 70%)",
                "radial-gradient(ellipse 40% 65% at 50% 58%, rgba(0,0,0,0.85), transparent 74%)",
              ].join(", ")
            : [
                "radial-gradient(ellipse 64% 100% at 50% 38%, rgba(255,250,240,0.85), rgba(255,250,240,0) 70%)",
                "radial-gradient(ellipse 40% 65% at 50% 58%, rgba(0,0,0,0.34), transparent 74%)",
              ].join(", "),
          filter: "blur(9px)",
          pointerEvents: "none",
        }}
      />
      {coverUrl ? (
        <div
          style={{
            position: "relative",
            display: "inline-block",
            height: "calc(100% - 16px)",
            maxWidth: "100%",
          }}
        >
          <div
            onMouseEnter={handleCoverMouseEnter}
            onMouseMove={handleCoverMouseMove}
            onMouseLeave={handleCoverMouseLeave}
            style={{
              position: "relative",
              height: "100%",
              transformStyle: "preserve-3d",
              transform: `perspective(1400px) rotateY(${coverTilt.y}deg) rotateX(${coverTilt.x}deg)`,
              transition: "transform 70ms ease",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt=""
              style={{
                position: "relative",
                display: "block",
                height: "100%",
                width: "auto",
                maxWidth: "100%",
                objectFit: "contain",
                borderRadius: 6,
                // Layered box-shadows fake a glossy, reflective case: an outer drop
                // shadow + solid edge for depth, an inset top-left "glancing light"
                // streak, an inset left spine, and a bright inset highlight along
                // the top where the spotlight lands.
                boxShadow: isDark
                  ? "0 12px 22px rgba(0,0,0,0.75), -5px 5px 0 rgba(0,0,0,0.35), inset 8px 0 14px -6px rgba(0,0,0,0.7), inset -30px -46px 50px -40px rgba(255,255,255,0.55), inset 0 8px 14px -8px rgba(255,255,255,0.5)"
                  : "0 10px 18px rgba(30,24,18,0.32), -4px 4px 0 rgba(30,24,18,0.18), inset 8px 0 14px -6px rgba(0,0,0,0.44), inset -30px -46px 50px -40px rgba(255,255,255,0.7), inset 0 8px 14px -8px rgba(255,255,255,0.9)",
              }}
            />
            {/* Glossy hover sheen: two soft bands that fade in on hover, tracking with the tilt like the library's cover hover effect */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 6,
                opacity: coverHovering ? 1 : 0,
                transition: "opacity 140ms ease",
                background: "linear-gradient(180deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.02) 63%, rgba(0,0,0,0.06) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -1px 0 rgba(0,0,0,0.2)",
                pointerEvents: "none",
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: "42%",
                borderRadius: "6px 6px 0 0",
                opacity: coverHovering ? 1 : 0,
                transition: "opacity 140ms ease",
                background: "linear-gradient(180deg, rgba(255,255,255,0.34) 0%, rgba(255,255,255,0.1) 55%, rgba(255,255,255,0) 100%)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      ) : (
        <div style={{ position: "relative", width: 220, height: 320, borderRadius: 8, background: cardBg, display: "grid", placeItems: "center", color: textMuted, fontSize: 12, fontWeight: 700 }}>
          No artwork
        </div>
      )}
    </div>
  );

  const notesClampable = notes.length > 220;
  const detailsPanel = (
    <div
      style={{
        flex: isMobileLayout ? "1 1 auto" : "0 0 420px",
        maxWidth: isMobileLayout ? undefined : 420,
        marginLeft: isMobileLayout ? undefined : 60,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: isMobileLayout ? "20px 20px 8px" : "36px 40px 20px 0",
        overflowY: "auto",
        scrollbarWidth: "none",
        minHeight: 0,
      }}
      className="completedGalleryNoScrollbar"
    >
      <div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10.5,
            fontWeight: 800,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            color: mediaAccent,
            marginBottom: 8,
          }}
        >
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: "50%", background: mediaAccent, display: "inline-block" }} />
          {mediaLabel(selected.mediaType)}
        </div>
        <h1 style={{ margin: 0, fontSize: isMobileLayout ? 24 : 30, fontWeight: 800, lineHeight: 1.15, color: textPrimary }}>{title}</h1>
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: textSecondary }}>
          {[year, creator?.value].filter(Boolean).join(" • ")}
        </div>
      </div>

      {myRating || avgRating ? (
        <div style={{ display: "flex", gap: isMobileLayout ? 12 : 24, flexWrap: "nowrap", paddingTop: 4 }}>
          {myRating ? (
            <div style={{ flex: "1 1 0%", minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {myRating.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: isMobileLayout ? 5 : 8, minWidth: 0 }}>
                <StarRow pct={myRating.pct} color="#f4b23f" size={isMobileLayout ? 15 : STAR_SIZE} />
                <span style={{ fontSize: isMobileLayout ? 12 : 13, fontWeight: 700, color: textPrimary, whiteSpace: "nowrap" }}>{myRating.display}</span>
              </div>
            </div>
          ) : null}
          {avgRating ? (
            <div style={{ flex: "1 1 0%", minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {avgRating.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: isMobileLayout ? 5 : 8, minWidth: 0 }}>
                <StarRow pct={avgRating.pct} color="#f4b23f" size={isMobileLayout ? 15 : STAR_SIZE} />
                <span style={{ fontSize: isMobileLayout ? 12 : 13, fontWeight: 700, color: textPrimary, whiteSpace: "nowrap" }}>{avgRating.display}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {notes ? (
        <div style={{ borderTop: `1px solid ${hairline}`, paddingTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted }}>
              My Review / Notes
            </div>
            <button
              type="button"
              onClick={() => onEditItem(selected.item, selected.mediaType)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                border: `1px solid ${accent}55`,
                background: `${accent}14`,
                color: accent,
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                padding: "5px 11px",
                borderRadius: 999,
              }}
            >
              ✏️ Edit Review
            </button>
          </div>
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: textPrimary,
              fontFamily: REVIEW_FONT,
              whiteSpace: "pre-wrap",
              display: notesClampable && !notesExpanded ? "-webkit-box" : "block",
              WebkitLineClamp: notesClampable && !notesExpanded ? 4 : undefined,
              WebkitBoxOrient: notesClampable && !notesExpanded ? "vertical" : undefined,
              overflow: notesClampable && !notesExpanded ? "hidden" : "visible",
            }}
          >
            {notes}
          </div>
          {notesClampable ? (
            <button
              type="button"
              onClick={() => setNotesExpanded((v) => !v)}
              style={{ marginTop: 6, border: "none", background: "none", color: accent, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: 0 }}
            >
              {notesExpanded ? "Show Less" : "Read More"}
            </button>
          ) : null}
        </div>
      ) : (
        <div style={{ borderTop: `1px solid ${hairline}`, paddingTop: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 6 }}>
            My Review / Notes
          </div>
          <div style={{ fontSize: 13, color: textMuted, fontStyle: "italic", fontFamily: REVIEW_FONT }}>No review or notes added.</div>
        </div>
      )}

      {completionDisplay || facts.length ? (
        <div style={{ borderTop: `1px solid ${hairline}`, paddingTop: 14, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {completionDisplay ? (
            <div>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 4 }}>
                Completed
              </div>
              <div style={{ fontSize: 13, fontWeight: 650, color: textPrimary }}>{completionDisplay}</div>
            </div>
          ) : null}
          {facts.map((fact) => (
            <div key={fact.label}>
              <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 4 }}>
                {fact.label}
              </div>
              <div style={{ fontSize: 13, fontWeight: 650, color: textPrimary, overflowWrap: "anywhere" }}>{fact.value}</div>
            </div>
          ))}
        </div>
      ) : null}

      {genres.length ? (
        <div style={{ borderTop: `1px solid ${hairline}`, paddingTop: 14 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase", color: textMuted, marginBottom: 8 }}>
            Genre Tags
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {genres.map((g) => (
              <span
                key={g}
                style={{
                  fontSize: 11.5,
                  fontWeight: 650,
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: cardBg,
                  border: `1px solid ${hairline}`,
                  color: textSecondary,
                }}
              >
                {g}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, paddingTop: 6, marginTop: "auto" }}>
        <button
          type="button"
          onClick={() => onSelectItem(selected.item, selected.mediaType)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 9,
            border: `1px solid ${hairline}`,
            background: "transparent",
            color: textPrimary,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Full Details
        </button>
        <button
          type="button"
          onClick={() => onRateItem(selected.item, selected.mediaType)}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 9,
            border: `1px solid ${mediaAccent}66`,
            background: `${mediaAccent}1a`,
            color: textPrimary,
            fontSize: 12.5,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Rate It
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ position: "relative", display: "flex", flexDirection: "column", height: isMobileLayout ? "auto" : "calc(100vh - 40px)", minHeight: isMobileLayout ? "100vh" : undefined, maxHeight: isMobileLayout ? undefined : "calc(100vh - 40px)", overflow: isMobileLayout ? "visible" : "hidden", background: bg, fontFamily: FONT, color: textPrimary }}>
      {headerBlock}
      <div style={{ flex: "1 1 auto", display: "flex", flexDirection: isMobileLayout ? "column" : "row", justifyContent: isMobileLayout ? undefined : "center", minHeight: 0, overflowY: "hidden", overflowX: "visible", paddingLeft: isMobileLayout ? undefined : 24, paddingTop: isMobileLayout ? 58 : 64 }}>
        {spotlightStage}
        {detailsPanel}
      </div>
      {!isMobileLayout ? (
        <div
          onPointerDown={(event) => {
            event.preventDefault();
            handleResizeStart(event.clientY);
          }}
          style={{
            flex: "0 0 auto",
            height: 10,
            marginTop: -5,
            marginBottom: -5,
            cursor: "ns-resize",
            position: "relative",
            zIndex: 2,
            touchAction: "none",
          }}
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize carousel"
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 36,
              height: 4,
              borderRadius: 999,
              background: hairline,
            }}
          />
        </div>
      ) : null}
      <div
        ref={carouselRef}
        role="listbox"
        aria-label="Completed items"
        style={{
          flex: isMobileLayout ? "0 0 auto" : `0 0 ${carouselHeight}px`,
          display: "flex",
          alignItems: "center",
          gap: 14,
          overflowX: "auto",
          overflowY: "hidden",
          padding: isMobileLayout ? "12px 16px 20px" : "16px 32px 26px",
          borderTop: `1px solid ${hairline}`,
          scrollbarWidth: "none",
        }}
        className="completedGalleryNoScrollbar"
      >
        {filteredItems.map((entry, index) => {
          const isSelected = index === selectedIndex;
          const thumbUrl = getDisplayCoverUrl(entry.item);
          const entryTitle = first(entry.item, ["title", "Title"]) || "Untitled";
          const isSquareCover = Boolean(isAudiobookItem?.(entry.item));
          const dateLabel = formatCompactDate(entry.completionDate);
          const labelHeight = 15;
          const thumbHeight = isMobileLayout
            ? 96
            : Math.max(56, carouselHeight - 42 - 14 - labelHeight);
          return (
            <div
              key={entry.itemKey}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flex: "0 0 auto" }}
            >
              <button
                ref={(el) => { itemRefs.current[index] = el; }}
                type="button"
                role="option"
                aria-selected={isSelected}
                title={entryTitle}
                onClick={() => setSelectedIndex(index)}
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  height: thumbHeight,
                  width: "auto",
                  aspectRatio: isSquareCover ? "1 / 1" : "2 / 3",
                  borderRadius: 8,
                  overflow: "hidden",
                  padding: 0,
                  cursor: "pointer",
                  background: cardBg,
                  border: isSelected ? `2px solid ${accent}` : `1px solid ${hairline}`,
                  boxShadow: isSelected ? `0 0 0 4px ${accent}2e, 0 14px 26px rgba(0,0,0,0.32)` : "0 4px 10px rgba(0,0,0,0.16)",
                  transform: isSelected ? "translateY(-6px)" : "translateY(0)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
                }}
              >
                {thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                ) : null}
              </button>
              {dateLabel ? (
                <div
                  style={{
                    fontSize: 9.5,
                    fontWeight: isSelected ? 750 : 600,
                    color: isSelected ? accent : textMuted,
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    transition: "color 0.15s ease",
                  }}
                >
                  {dateLabel}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <style jsx>{`
        .completedGalleryNoScrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
