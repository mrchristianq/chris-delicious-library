"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

type StatsMediaType = "book" | "movie" | "tv" | "game";
type StatsFilter = "all" | StatsMediaType;
type StatsTab = StatsFilter | "yearReview";
type StatsYearFilter = "all" | number;
type StatusBucket = "completed" | "inProgress" | "backlog" | "wishlist" | "abandoned" | "other";

type BookStatsItem = {
  title?: string;
  author?: string;
  authors?: string;
  releaseDate?: string;
  completedDate?: string;
  status?: string;
  categories?: string;
  genre?: string;
  types?: string;
  myRating?: string;
  externalAverageRating?: string;
  userRating?: string;
  tag?: string;
  tags?: string;
  posterUrl?: string;
  metadataCoverUrl?: string;
  posterUrlFallback?: string;
  cover?: string;
  imageUrl?: string;
  customImageUrl?: string;
  audiobookDuration?: string;
  githubCoverUrl?: string;
};

type MovieStatsItem = {
  title?: string;
  releaseDate?: string;
  watchDate?: string;
  watchStatus?: string;
  watched?: string;
  status?: string;
  movieStatus?: string;
  genres?: string;
  myRating?: string;
  tmdbRating?: string;
  tag?: string;
  tags?: string;
  posterUrl?: string;
  metadataCoverUrl?: string;
  poster?: string;
  runtime?: string;
  director?: string;
};

type ShowStatsItem = {
  title?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  dateCompleted?: string;
  numberOfEpisodes?: string;
  runtime?: string;
  episodeRuntime?: string;
  averageEpisodeRuntime?: string;
  watchStatus?: string;
  watched?: string;
  showStatus?: string;
  genres?: string;
  myRating?: string;
  tmdbRating?: string;
  tag?: string;
  posterUrl?: string;
  metadataCoverUrl?: string;
  posterUrlFallback?: string;
};

type GameStatsItem = {
  title?: string;
  releaseDate?: string;
  releaseDateAlt?: string;
  dateAdded?: string;
  dateCompleted?: string;
  yearPlayed?: string;
  status?: string;
  playStatus?: string;
  gameStatus?: string;
  completed?: string;
  genres?: string;
  platform?: string;
  platforms?: string;
  format?: string;
  myRating?: string;
  igdbRating?: string;
  rating?: string;
  tag?: string;
  tags?: string;
  posterUrl?: string;
  metadataCoverUrl?: string;
  posterUrlFallback?: string;
  cover?: string;
  coverUrl?: string;
  localCoverUrl?: string;
  hoursPlayed?: string;
  "Hours Played"?: string;
  HoursPlayed?: string;
  playtime?: string;
  Playtime?: string;
};

type UnifiedStatsItem = {
  mediaType: StatsMediaType;
  title: string;
  activityDate: Date | null;
  releaseDate: Date | null;
  completionDate: Date | null;
  playedYears: number[];
  statusBucket: StatusBucket;
  primaryStatusToken: string;
  rating: number | null;
  externalRating: number | null;
  genres: string[];
  platforms: string[];
  formats: string[];
  tags: string[];
  authors: string[];
  directors: string[];
  coverUrl: string | null;
  audiobookMinutes: number;
  runtimeMinutes: number;
  gameplayHours: number;
};

type StatisticsViewProps = {
  books: BookStatsItem[];
  movies: MovieStatsItem[];
  shows: ShowStatsItem[];
  games: GameStatsItem[];
  coverOverrides?: Record<string, string>;
  onExit?: () => void;
  themeMode?: "light" | "dark" | "classic";
  mediaTabColors?: Partial<Record<StatsTab, string>>;
};

type SummaryMetric = {
  id: string;
  label: string;
  value: string;
  subLabel: string;
  accent: string;
  summary: string;
  calculation: string;
  items: UnifiedStatsItem[];
};

type StatisticDetail = {
  id: string;
  title: string;
  value: string;
  summary: string;
  calculation: string;
  items: UnifiedStatsItem[];
};

type WrappedSlide = {
  id: string;
  kicker: string;
  title: string;
  value: string;
  note: string;
  mediaType?: StatsMediaType;
  coverShape?: "poster" | "square";
  preferTextOverlay?: boolean;
  coverUrl: string | null;
  backdropUrl: string | null;
};

type MonthlyPoint = {
  key: string;
  label: string;
  counts: Record<StatsMediaType, number>;
  total: number;
};

type NamedValue = {
  name: string;
  value: number;
};

const MEDIA_LABELS: Record<StatsMediaType, string> = {
  book: "Books",
  movie: "Movies",
  tv: "TV Shows",
  game: "Games",
};

const EXTERNAL_RATING_LABELS: Record<StatsMediaType, string> = {
  book: "Top 10 Rated by Readers",
  movie: "Top 10 Rated by TMDB Users",
  tv: "Top 10 Rated by TMDB Users",
  game: "Top 10 Rated by IGDB Users",
};

const MEDIA_COLORS: Record<StatsMediaType, string> = {
  book: "#ffd166",
  movie: "#ff6b6b",
  tv: "#4cc9f0",
  game: "#7ae582",
};

const STATUS_COLORS: Record<StatusBucket, string> = {
  completed: "#4adf86",
  inProgress: "#47c4ff",
  backlog: "#92a8ff",
  wishlist: "#ff8cd3",
  abandoned: "#ff7a7a",
  other: "#f5d66d",
};

const STATUS_LABELS: Record<StatusBucket, string> = {
  completed: "Completed",
  inProgress: "In Progress",
  backlog: "Backlog",
  wishlist: "Wishlist",
  abandoned: "Abandoned",
  other: "Other",
};

const DONUT_COLORS = ["#ffcf5c", "#6de7ff", "#ff7baf", "#7df592", "#9fa7ff", "#ff9756", "#8fe2d3"];
const ALL_STATS_YEARS = "all" as const;
const UNRATED_TOKENS = new Set([
  "na",
  "n/a",
  "none",
  "not rated",
  "null",
  "nr",
  "tbd",
  "unrated",
  "unknown",
  "undefined",
]);
const WRAPPED_AUDIO_TRACKS = [
  {
    title: "Helix One",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    title: "Helix Two",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    title: "Helix Three",
    src: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
] as const;

const monthLabelFormatter = new Intl.DateTimeFormat("en-US", { month: "short" });

type RatingScaleHint = "auto" | "five" | "ten";

function safeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstNonEmpty(values: unknown[]): string {
  for (const value of values) {
    const text = safeText(value);
    if (!text) continue;
    if (UNRATED_TOKENS.has(normalizeToken(text))) continue;
    return text;
  }
  return "";
}

function pickCoverUrl(values: unknown[]): string | null {
  const url = firstNonEmpty(values);
  return url || null;
}

function normalizeToken(value: unknown): string {
  return safeText(value)
    .toLowerCase()
    .replace(/[\s_\-]+/g, " ")
    .trim();
}

function isTruthyToken(value: unknown): boolean {
  const token = normalizeToken(value);
  return token === "true" || token === "yes" || token === "1" || token === "y";
}

function splitList(value: unknown): string[] {
  return safeText(value)
    .split(/[,;|]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function splitAuthorList(value: unknown): string[] {
  return safeText(value)
    .split(/[,;&/]+/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseClockTimeToMinutes(raw: string): number {
  const match = raw.match(/^(\d{1,3}):(\d{1,2})(?::\d{1,2})?$/);
  if (!match) return 0;
  const hours = Number.parseFloat(match[1]);
  const minutes = Number.parseFloat(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return Math.max(0, hours * 60 + minutes);
}

function parseDurationToMinutes(value: unknown, fallbackUnit: "hours" | "minutes"): number {
  const raw = safeText(value).toLowerCase();
  const compactRaw = raw.replace(/,/g, "");
  if (!raw) return 0;

  const clockMinutes = parseClockTimeToMinutes(compactRaw);
  if (clockMinutes > 0) return clockMinutes;

  let totalMinutes = 0;
  let foundExplicitUnit = false;

  const hourMatch = compactRaw.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (hourMatch) {
    const hours = Number.parseFloat(hourMatch[1]);
    if (Number.isFinite(hours) && hours > 0) {
      totalMinutes += hours * 60;
      foundExplicitUnit = true;
    }
  }

  const minuteMatch = compactRaw.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\b/);
  if (minuteMatch) {
    const minutes = Number.parseFloat(minuteMatch[1]);
    if (Number.isFinite(minutes) && minutes > 0) {
      totalMinutes += minutes;
      foundExplicitUnit = true;
    }
  }

  if (foundExplicitUnit) return totalMinutes;

  const numberMatch = compactRaw.match(/\d+(?:\.\d+)?/);
  if (!numberMatch) return 0;

  const number = Number.parseFloat(numberMatch[0]);
  if (!Number.isFinite(number) || number <= 0) return 0;
  if (fallbackUnit === "hours") {
    // Heuristic: large unitless numbers are usually minute totals already.
    return number > 40 ? number : number * 60;
  }
  return number;
}

function parseRuntimeToMinutes(value: unknown): number {
  const raw = safeText(value).toLowerCase();
  const compactRaw = raw.replace(/,/g, "");
  if (!raw) return 0;
  if (/[h:]/.test(compactRaw) || compactRaw.includes("min")) {
    return parseDurationToMinutes(compactRaw, "minutes");
  }

  const numeric = Number.parseFloat(compactRaw.match(/\d+(?:\.\d+)?/)?.[0] || "");
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric;
}

function parsePositiveNumber(value: unknown): number {
  const raw = safeText(value).replace(/,/g, "");
  if (!raw) return 0;
  const numeric = Number.parseFloat(raw.match(/\d+(?:\.\d+)?/)?.[0] || "");
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

function parseTvRuntimeToMinutes(show: ShowStatsItem): number {
  const explicitRuntime = parseRuntimeToMinutes(show.runtime);
  if (explicitRuntime > 0) return explicitRuntime;

  const episodeRuntime =
    parseRuntimeToMinutes(show.episodeRuntime) || parseRuntimeToMinutes(show.averageEpisodeRuntime);
  const episodeCount = parsePositiveNumber(show.numberOfEpisodes);
  if (episodeRuntime > 0 && episodeCount > 0) return episodeRuntime * episodeCount;

  // Fallback for TV rows that only have an episode count in the sheet.
  if (episodeCount > 0) return episodeCount * 45;
  return 0;
}

function parseHoursValue(value: unknown): number {
  const raw = safeText(value).toLowerCase();
  const compactRaw = raw.replace(/,/g, "");
  if (!raw) return 0;

  const clockMinutes = parseClockTimeToMinutes(compactRaw);
  if (clockMinutes > 0) return clockMinutes / 60;

  let totalHours = 0;
  let foundExplicitUnit = false;

  const hourMatch = compactRaw.match(/(\d+(?:\.\d+)?)\s*(h|hr|hrs|hour|hours)\b/);
  if (hourMatch) {
    const hours = Number.parseFloat(hourMatch[1]);
    if (Number.isFinite(hours) && hours > 0) {
      totalHours += hours;
      foundExplicitUnit = true;
    }
  }

  const minuteMatch = compactRaw.match(/(\d+(?:\.\d+)?)\s*(m|min|mins|minute|minutes)\b/);
  if (minuteMatch) {
    const minutes = Number.parseFloat(minuteMatch[1]);
    if (Number.isFinite(minutes) && minutes > 0) {
      totalHours += minutes / 60;
      foundExplicitUnit = true;
    }
  }

  if (foundExplicitUnit) return totalHours;

  const numeric = Number.parseFloat(compactRaw.match(/\d+(?:\.\d+)?/)?.[0] || "");
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return numeric;
}

function formatHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 hours";
  if (value >= 100) return `${Math.round(value)} hours`;
  if (value >= 10) return `${value.toFixed(1)} hours`;
  return `${value.toFixed(2)} hours`;
}

function formatMinutesAsHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 hours";
  return formatHours(value / 60);
}

const COVER_IMAGE_RADIUS_STYLE: CSSProperties = {
  borderRadius: 6,
  clipPath: "inset(0 round 6px)",
  WebkitClipPath: "inset(0 round 6px)",
  overflow: "hidden",
  display: "block",
};

function getTop20CoverClass(item: UnifiedStatsItem): string {
  if (item.mediaType === "game") return "yearTopRatedCover yearTopRatedCoverGame";
  if (item.mediaType === "tv") return "yearTopRatedCover yearTopRatedCoverTv";
  if (
    item.mediaType === "book" &&
    (item.audiobookMinutes > 0 ||
      item.formats.some((format) => normalizeToken(format).includes("audiobook")))
  ) {
    return "yearTopRatedCover yearTopRatedCoverAudiobook";
  }
  return "yearTopRatedCover";
}

function formatScoreValue(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "-";
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatStarRowFive(valueOutOfFive: number): string {
  const clamped = Math.max(0, Math.min(5, valueOutOfFive));
  const filled = Math.round(clamped);
  const empty = 5 - filled;
  return `${"★".repeat(filled)}${"☆".repeat(empty)}`;
}

function formatPersonalRatingDisplay(
  item: Pick<UnifiedStatsItem, "mediaType" | "rating"> | null | undefined
): string {
  if (!item || typeof item.rating !== "number" || !Number.isFinite(item.rating) || item.rating <= 0) return "-";
  if (item.mediaType === "book") {
    const valueOutOfFive = item.rating > 5 ? item.rating / 2 : item.rating;
    return `${(Math.round(valueOutOfFive * 10) / 10).toFixed(1)}/5`;
  }
  return `${(Math.round(item.rating * 10) / 10).toFixed(1)}/10`;
}

function getPersonalRatingBadgeLabel(
  item: Pick<UnifiedStatsItem, "mediaType" | "rating"> | null | undefined
): string | null {
  if (!item || typeof item.rating !== "number" || !Number.isFinite(item.rating) || item.rating <= 0) return null;
  const tenScaleValue = item.mediaType === "book" && item.rating <= 5 ? item.rating * 2 : item.rating;
  return (Math.round(tenScaleValue * 10) / 10).toFixed(1);
}

function getComparablePersonalRating(item: Pick<UnifiedStatsItem, "mediaType" | "rating"> | null | undefined): number {
  if (!item || typeof item.rating !== "number" || !Number.isFinite(item.rating) || item.rating <= 0) return 0;
  if (item.mediaType === "book" && item.rating <= 5) {
    return item.rating * 2;
  }
  return item.rating;
}

function formatDetailDate(value: Date | null): string {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function normalizeTitleKey(value: string): string {
  return safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePlatformToken(value: string): string {
  return safeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function getStatsBookFormatKeyToken(types?: string, audiobookDuration?: string): string {
  const typeTokens = safeText(types)
    .split(/[,;|/]+/g)
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  // Explicit type should win over duration heuristics.
  if (typeTokens.includes("audiobook")) return "audiobook";
  if (typeTokens.includes("ebook") || typeTokens.includes("e-book")) return "ebook";
  if (typeTokens.includes("physical")) return "physical";
  if (typeTokens.length > 0) {
    const normalized = typeTokens[0].replace(/[^a-z0-9]+/g, "");
    if (normalized) return normalized;
  }
  if (safeText(audiobookDuration)) return "audiobook";
  return "default";
}

function getStatsItemKey(
  mediaType: StatsMediaType,
  title: string,
  platform?: string,
  bookTypes?: string,
  audiobookDuration?: string
): string {
  const normalizedTitle = normalizeTitleKey(title);
  if (mediaType === "book") {
    const bookFormat = getStatsBookFormatKeyToken(bookTypes, audiobookDuration);
    return `${mediaType}:${normalizedTitle}:${bookFormat}`;
  }
  if (mediaType === "game") {
    const normalizedPlatform = normalizePlatformToken(platform || "");
    return `${mediaType}:${normalizedTitle}:${normalizedPlatform || "default"}`;
  }
  return `${mediaType}:${normalizedTitle}`;
}

function resolveCoverUrl(
  mediaType: StatsMediaType,
  title: string,
  candidates: unknown[],
  coverOverrides: Record<string, string>,
  platform?: string,
  bookTypes?: string,
  audiobookDuration?: string
): string | null {
  const itemKey = getStatsItemKey(mediaType, title, platform, bookTypes, audiobookDuration);
  const override = safeText(coverOverrides[itemKey]);
  if (override) return override;
  return pickCoverUrl(candidates);
}

function parseDateValue(value: unknown): Date | null {
  const raw = safeText(value);
  if (!raw) return null;

  if (/^\d{4}$/.test(raw)) {
    return new Date(Date.UTC(Number(raw), 0, 1));
  }

  if (/^\d{4}-\d{2}$/.test(raw)) {
    const [yearStr, monthStr] = raw.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    if (Number.isFinite(year) && Number.isFinite(month) && month >= 1 && month <= 12) {
      return new Date(Date.UTC(year, month - 1, 1));
    }
    return null;
  }

  // Preserve explicit calendar dates and ignore timezone offsets/time fragments
  // so month bucketing remains aligned with the entered date.
  const isoDateMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/);
  if (isoDateMatch) {
    const year = Number(isoDateMatch[1]);
    const month = Number(isoDateMatch[2]);
    const day = Number(isoDateMatch[3]);
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(Date.UTC(year, month - 1, day));
    }
    return null;
  }

  const usDateMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[T\s].*)?$/);
  if (usDateMatch) {
    const month = Number(usDateMatch[1]);
    const day = Number(usDateMatch[2]);
    const year = Number(usDateMatch[3]);
    if (
      Number.isFinite(year) &&
      Number.isFinite(month) &&
      Number.isFinite(day) &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= 31
    ) {
      return new Date(Date.UTC(year, month - 1, day));
    }
    return null;
  }

  const ms = Date.parse(raw);
  if (Number.isNaN(ms)) return null;
  return new Date(ms);
}

function parseYearTokens(value: unknown): number[] {
  const raw = safeText(value);
  if (!raw) return [];
  const matches = raw.match(/(19|20)\d{2}/g) || [];
  const years = matches
    .map((token) => Number.parseInt(token, 10))
    .filter((year) => Number.isFinite(year));
  return [...new Set(years)];
}

function parseRatingValue(value: unknown, scaleHint: RatingScaleHint = "auto"): number | null {
  const raw = safeText(value);
  if (!raw) return null;
  if (UNRATED_TOKENS.has(normalizeToken(raw))) return null;

  const slashMatch = raw.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (slashMatch) {
    const numerator = Number.parseFloat(slashMatch[1]);
    const denominator = Number.parseFloat(slashMatch[2]);
    if (!Number.isNaN(numerator) && !Number.isNaN(denominator) && denominator > 0 && numerator > 0) {
      const normalized = (numerator / denominator) * 10;
      return Math.min(10, normalized);
    }
  }

  const numberMatch = raw.match(/\d+(?:\.\d+)?/);
  if (!numberMatch) return null;

  const parsed = Number.parseFloat(numberMatch[0]);
  if (Number.isNaN(parsed)) return null;
  if (parsed <= 0) return null;

  let normalized = parsed;
  if (raw.includes("%") || normalized > 10) {
    normalized = normalized / 10;
  } else if (scaleHint === "five" && normalized <= 5) {
    normalized = normalized * 2;
  }

  if (!Number.isFinite(normalized) || normalized <= 0) return null;
  return Math.min(10, normalized);
}

function toMonthKey(date: Date): string {
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthFromKey(key: string): string {
  const [yearStr, monthStr] = key.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return key;
  const stamp = new Date(year, month - 1, 1);
  return `${monthLabelFormatter.format(stamp)} '${String(year).slice(-2)}`;
}

function getMonthPartsFromKey(key: string): { month: string; year: string } {
  const [yearStr, monthStr] = key.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!Number.isFinite(year) || !Number.isFinite(month)) {
    return { month: key, year: "" };
  }
  const stamp = new Date(year, month - 1, 1);
  return {
    month: monthLabelFormatter.format(stamp),
    year: `'${String(year).slice(-2)}`,
  };
}

function isExcludedBusiestMonthKey(key: string): boolean {
  const match = key.trim().match(/^(\d{4})-(\d{1,2})$/);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  return year === 2025 && month === 7;
}

function inferStatusBucket(rawStatus: string, completionHint: boolean): StatusBucket {
  const token = normalizeToken(rawStatus);

  if (
    completionHint ||
    token === "completed" ||
    token === "watched" ||
    token === "finished" ||
    token === "done" ||
    token === "read" ||
    token === "beat" ||
    token === "beaten"
  ) {
    return "completed";
  }

  if (
    token.includes("abandon") ||
    token.includes("drop") ||
    token.includes("quit") ||
    token === "dnf" ||
    token.includes("cancel")
  ) {
    return "abandoned";
  }

  if (token.includes("wishlist") || token.includes("wish list")) {
    return "wishlist";
  }

  if (
    token.includes("watching") ||
    token.includes("reading") ||
    token.includes("playing") ||
    token.includes("in progress") ||
    token.includes("current") ||
    token.includes("ongoing") ||
    token.includes("paused") ||
    token.includes("watch next") ||
    token.includes("now playing") ||
    token.includes("pending return")
  ) {
    return "inProgress";
  }

  if (
    token.includes("backlog") ||
    token.includes("queue") ||
    token.includes("to watch") ||
    token.includes("to play") ||
    token.includes("to read") ||
    token.includes("planned")
  ) {
    return "backlog";
  }

  if (!token) {
    return "backlog";
  }

  return "other";
}

function getTopN(entries: Map<string, number>, maxItems = 7): NamedValue[] {
  return [...entries.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
    .slice(0, maxItems);
}

function buildDonutGradient(items: NamedValue[]): string {
  if (!items.length) {
    return "conic-gradient(#2f4974 0deg 360deg)";
  }

  const total = items.reduce((acc, item) => acc + item.value, 0);
  let start = 0;
  const stops = items.map((item, index) => {
    const delta = total ? (item.value / total) * 360 : 0;
    const end = start + delta;
    const stop = `${DONUT_COLORS[index % DONUT_COLORS.length]} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    start = end;
    return stop;
  });

  return `conic-gradient(${stops.join(", ")})`;
}

function compareRankedItems(
  a: UnifiedStatsItem,
  b: UnifiedStatsItem,
  scoreKey: "rating" | "externalRating"
): number {
  const aScore = scoreKey === "rating" ? getComparablePersonalRating(a) : a[scoreKey] || 0;
  const bScore = scoreKey === "rating" ? getComparablePersonalRating(b) : b[scoreKey] || 0;
  const scoreDelta = bScore - aScore;
  if (scoreDelta !== 0) return scoreDelta;

  const aDate = (a.activityDate || a.completionDate || a.releaseDate)?.getTime() || 0;
  const bDate = (b.activityDate || b.completionDate || b.releaseDate)?.getTime() || 0;
  if (bDate !== aDate) return bDate - aDate;

  return a.title.localeCompare(b.title);
}

type TopRatedColumnProps = {
  title: string;
  items: UnifiedStatsItem[];
  scoreKey: "rating" | "externalRating";
  filter: StatsFilter;
  selectedStatsYear: StatsYearFilter;
  detailIdPrefix: string;
  detailTitlePrefix: string;
  detailSummary: string;
  detailCalculation: string;
  emptyMessage: string;
  onOpenDetail: (detail: StatisticDetail) => void;
};

type StatDetailModalProps = {
  detail: StatisticDetail;
  onClose: () => void;
};

function getTopRatedShapeClasses(item: UnifiedStatsItem) {
  const coverClass = getTop20CoverClass(item);
  const isAudiobookSquare = coverClass.includes("yearTopRatedCoverAudiobook");
  const isBookCover = item.mediaType === "book" && !isAudiobookSquare;
  const isGameCover = item.mediaType === "game";
  const isPosterCover = !isAudiobookSquare && !isBookCover && !isGameCover;

  return {
    coverClass,
    tileShapeClass: isAudiobookSquare
      ? "topRatedTileAudiobook"
      : isGameCover
        ? "topRatedTileGame"
        : isPosterCover
          ? "topRatedTilePoster"
          : "",
    mediaClassName: `topRatedMedia ${isAudiobookSquare ? "topRatedMediaAudiobook" : ""} ${isBookCover ? "topRatedMediaBook" : ""} ${isGameCover ? "topRatedMediaGame" : ""} ${isPosterCover ? "topRatedMediaPoster" : ""}`,
    wrapClassName: `topRatedCoverWrap ${isAudiobookSquare ? "topRatedCoverWrapAudiobook" : ""} ${isBookCover ? "topRatedCoverWrapBook" : ""} ${isGameCover ? "topRatedCoverWrapGame" : ""} ${isPosterCover ? "topRatedCoverWrapPoster" : ""}`,
    clipClassName: `topRatedImageClip ${isAudiobookSquare ? "topRatedImageClipAudiobook" : ""} ${isBookCover ? "topRatedImageClipBook" : ""} ${isGameCover ? "topRatedImageClipGame" : ""} ${isPosterCover ? "topRatedImageClipPoster" : ""}`,
  };
}

function TopRatedColumn({
  title,
  items,
  scoreKey,
  filter,
  selectedStatsYear,
  detailIdPrefix,
  detailTitlePrefix,
  detailSummary,
  detailCalculation,
  emptyMessage,
  onOpenDetail,
}: TopRatedColumnProps) {
  const openDetail = (item: UnifiedStatsItem, index: number) => {
    onOpenDetail({
      id: `${detailIdPrefix}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}_${index + 1}`,
      title: `${detailTitlePrefix} #${index + 1}`,
      value: formatScoreValue(item[scoreKey]),
      summary: detailSummary,
      calculation: detailCalculation,
      items: [item],
    });
  };

  return (
    <section className="topRatedColumn">
      <div className="topRatedColumnHeader">
        <h3>{title}</h3>
        <span>{items.length} ranked</span>
      </div>
      {items.length > 0 ? (
        <div className="topRatedGrid">
          {items.map((item, index) => {
            const shape = getTopRatedShapeClasses(item);
            return (
              <figure
                key={`${detailIdPrefix}-${item.mediaType}-${item.title}-${index + 1}`}
                className={`topRatedTile topRatedTileInteractive ${shape.tileShapeClass}`}
                title={`${index + 1}. ${item.title}`}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(item, index)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  openDetail(item, index);
                }}
              >
                <div className={shape.mediaClassName}>
                  <div className={shape.wrapClassName}>
                    {item.coverUrl ? (
                      <div className={shape.clipClassName} style={COVER_IMAGE_RADIUS_STYLE}>
                        <img
                          className={shape.coverClass}
                          src={item.coverUrl}
                          alt={`${item.title} cover`}
                          loading="lazy"
                          style={COVER_IMAGE_RADIUS_STYLE}
                        />
                      </div>
                    ) : (
                      <div className="topRatedFallback">No Cover</div>
                    )}
                    <div className="statsCoverRatingBadge topRatedScoreBubble">{formatScoreValue(item[scoreKey])}</div>
                  </div>
                </div>
                <figcaption>
                  <span className="topRatedTitle">{item.title}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      ) : (
        <div className="cardEmpty compactEmpty">{emptyMessage}</div>
      )}
    </section>
  );
}

function StatDetailModal({ detail, onClose }: StatDetailModalProps) {
  return (
    <div
      className="statDetailOverlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="statDetailDialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Statistic details for ${detail.title}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="statDetailHeader">
          <div className="statDetailHeaderMain">
            <div className="statDetailId">ID: {detail.id}</div>
            <h3>{detail.title}</h3>
            <div className="statDetailValue">{detail.value}</div>
          </div>
          <button
            type="button"
            className="statDetailClose"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="statDetailSummaryGrid">
          <div className="statDetailSummaryCard">
            <div className="statDetailSummaryLabel">What This Tracks</div>
            <p>{detail.summary}</p>
          </div>
          <div className="statDetailSummaryCard">
            <div className="statDetailSummaryLabel">How It Is Calculated</div>
            <p>{detail.calculation}</p>
          </div>
        </div>

        <div className="statDetailItemsHeader">
          Matching Items <span>{detail.items.length}</span>
        </div>

        <div className="statDetailItemsList">
          {detail.items.length > 0 ? (
            detail.items.map((item, index) => {
              const anchorDate = item.activityDate || item.completionDate || item.releaseDate;
              const anchorLabel = item.activityDate
                ? "Activity"
                : item.completionDate
                  ? "Completed"
                  : "Release";
              return (
                <div
                  key={`${detail.id}-${item.mediaType}-${item.title}-${index}`}
                  className="statDetailItemRow"
                >
                  <div className="statDetailItemRank">{index + 1}</div>
                  <div className="statDetailItemCover">
                    {item.coverUrl ? (
                      <>
                        <img
                          src={item.coverUrl}
                          alt={`Cover for ${item.title}`}
                          className="statDetailItemCoverImage"
                          loading="lazy"
                          style={COVER_IMAGE_RADIUS_STYLE}
                        />
                        {getPersonalRatingBadgeLabel(item) ? (
                          <div className="statsCoverRatingBadge statDetailItemCoverBadge">
                            {getPersonalRatingBadgeLabel(item)}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="statDetailItemCoverPlaceholder" aria-hidden="true">
                        {item.mediaType.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="statDetailItemMain">
                    <div className="statDetailItemTitle">{item.title}</div>
                    <div className="statDetailItemMeta">
                      <span>{STATUS_LABELS[item.statusBucket]}</span>
                      <span>
                        {anchorLabel}: {formatDetailDate(anchorDate)}
                      </span>
                      <span>Rating: {formatPersonalRatingDisplay(item)}</span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="cardEmpty">No matching items for this statistic.</div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StatisticsView({
  books,
  movies,
  shows,
  games,
  coverOverrides = {},
  onExit,
  themeMode = "dark",
  mediaTabColors = {},
}: StatisticsViewProps) {
  const currentYear = new Date().getUTCFullYear();
  const [activeTab, setActiveTab] = useState<StatsTab>("all");
  const [statsYear, setStatsYear] = useState<StatsYearFilter>(ALL_STATS_YEARS);
  const [reviewYear, setReviewYear] = useState<number>(currentYear);
  const [activeStatDetail, setActiveStatDetail] = useState<StatisticDetail | null>(null);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [wrappedSlideIndex, setWrappedSlideIndex] = useState(0);
  const [wrappedTrackIndex, setWrappedTrackIndex] = useState(0);
  const [wrappedMuted, setWrappedMuted] = useState(false);
  const [wrappedPlaybackBlocked, setWrappedPlaybackBlocked] = useState(false);
  const [wrappedIsPlaying, setWrappedIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const filter: StatsFilter = activeTab === "yearReview" ? "all" : activeTab;

  const sortDetailItems = (items: UnifiedStatsItem[]): UnifiedStatsItem[] => {
    return [...items].sort((a, b) => {
      const aDate = (a.activityDate || a.completionDate || a.releaseDate)?.getTime() || 0;
      const bDate = (b.activityDate || b.completionDate || b.releaseDate)?.getTime() || 0;
      if (bDate !== aDate) return bDate - aDate;
      if (a.mediaType !== b.mediaType) return a.mediaType.localeCompare(b.mediaType);
      return a.title.localeCompare(b.title);
    });
  };

  const openStatisticDetail = (detail: StatisticDetail) => {
    setActiveStatDetail({
      ...detail,
      items: sortDetailItems(detail.items),
    });
  };

  const handleInteractiveKeyDown = (event: KeyboardEvent<Element>, onActivate: () => void) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onActivate();
    }
  };

  useEffect(() => {
    if (!activeStatDetail) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveStatDetail(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeStatDetail]);

  useEffect(() => {
    setActiveStatDetail(null);
  }, [activeTab, statsYear, reviewYear]);

  const unifiedItems = useMemo<UnifiedStatsItem[]>(() => {
    const mappedBooks: UnifiedStatsItem[] = books.map((book) => {
      const title = safeText(book.title) || "Untitled Book";
      const completionDate = parseDateValue(book.completedDate);
      const releaseDate = parseDateValue(book.releaseDate);
      const activityDate = completionDate || releaseDate;
      const rating = parseRatingValue(book.myRating, "five");
      const externalRating = parseRatingValue(firstNonEmpty([book.externalAverageRating, book.userRating]), "five");
      const genres = splitList(book.categories || book.genre);
      const formats = splitList(book.types);
      const tags = [...splitList(book.tag), ...splitList(book.tags)];
      const authors = [...splitAuthorList(book.author), ...splitAuthorList(book.authors)];
      const statusBucket = inferStatusBucket(book.status || "", Boolean(completionDate));
      const primaryStatusToken = normalizeToken(book.status || "");
      const coverUrl = resolveCoverUrl(
        "book",
        title,
        [
          // Prefer concrete metadata/poster candidates first; local GitHub fallback last.
          book.metadataCoverUrl,
          book.posterUrl,
          book.posterUrlFallback,
          book.customImageUrl,
          book.imageUrl,
          book.cover,
          book.githubCoverUrl,
        ],
        coverOverrides,
        undefined,
        book.types,
        book.audiobookDuration
      );
      const audiobookMinutes = parseDurationToMinutes(book.audiobookDuration, "hours");

      return {
        mediaType: "book",
        title,
        activityDate,
        releaseDate,
        completionDate,
        playedYears: [],
        rating,
        externalRating,
        genres,
        platforms: [],
        formats,
        tags,
        authors,
        directors: [],
        statusBucket,
        primaryStatusToken,
        coverUrl,
        audiobookMinutes,
        runtimeMinutes: 0,
        gameplayHours: 0,
      };
    });

    const mappedMovies: UnifiedStatsItem[] = movies.map((movie) => {
      const title = safeText(movie.title) || "Untitled Movie";
      const releaseDate = parseDateValue(movie.releaseDate);
      const watchDate = parseDateValue(movie.watchDate);
      const activityDate = watchDate || releaseDate;
      const rating = parseRatingValue(movie.myRating, "ten");
      const externalRating = parseRatingValue(movie.tmdbRating);
      const genres = splitList(movie.genres);
      const tags = [...splitList(movie.tag), ...splitList(movie.tags)];
      const directors = splitList(movie.director);
      const movieStatusRaw = firstNonEmpty([movie.watchStatus, movie.watched, movie.status, movie.movieStatus]);
      const completionHint = isTruthyToken(movie.watched) || normalizeToken(movie.watchStatus) === "watched";
      const statusBucket = inferStatusBucket(movieStatusRaw, completionHint);
      const primaryStatusToken = normalizeToken(movieStatusRaw);
      const coverUrl = resolveCoverUrl(
        "movie",
        title,
        [movie.posterUrl, movie.metadataCoverUrl, movie.poster],
        coverOverrides
      );
      const runtimeMinutes = parseRuntimeToMinutes(movie.runtime);

      return {
        mediaType: "movie",
        title,
        activityDate,
        releaseDate,
        completionDate: watchDate,
        playedYears: [],
        rating,
        externalRating,
        genres,
        platforms: [],
        formats: [],
        tags,
        authors: [],
        directors,
        statusBucket,
        primaryStatusToken,
        coverUrl,
        audiobookMinutes: 0,
        runtimeMinutes,
        gameplayHours: 0,
      };
    });

    const mappedShows: UnifiedStatsItem[] = shows.map((show) => {
      const title = safeText(show.title) || "Untitled Show";
      const releaseDate = parseDateValue(show.firstAirDate) || parseDateValue(show.lastAirDate);
      const completionDate = parseDateValue(show.dateCompleted);
      const activityDate = completionDate || parseDateValue(show.lastAirDate) || releaseDate;
      const rating = parseRatingValue(show.myRating, "ten");
      const externalRating = parseRatingValue(show.tmdbRating);
      const genres = splitList(show.genres);
      const tags = splitList(show.tag);
      const showStatusRaw = firstNonEmpty([show.watchStatus, show.showStatus, show.watched]);
      const completionHint = Boolean(completionDate) || isTruthyToken(show.watched);
      const statusBucket = inferStatusBucket(showStatusRaw, completionHint);
      const primaryStatusToken = normalizeToken(showStatusRaw);
      const runtimeMinutes = parseTvRuntimeToMinutes(show);
      const coverUrl = resolveCoverUrl(
        "tv",
        title,
        [show.posterUrl, show.metadataCoverUrl, show.posterUrlFallback],
        coverOverrides
      );

      return {
        mediaType: "tv",
        title,
        activityDate,
        releaseDate,
        completionDate,
        playedYears: [],
        rating,
        externalRating,
        genres,
        platforms: [],
        formats: [],
        tags,
        authors: [],
        directors: [],
        statusBucket,
        primaryStatusToken,
        coverUrl,
        audiobookMinutes: 0,
        runtimeMinutes,
        gameplayHours: 0,
      };
    });

    const mappedGames: UnifiedStatsItem[] = games.map((game) => {
      const title = safeText(game.title) || "Untitled Game";
      const releaseDate = parseDateValue(game.releaseDate) || parseDateValue(game.releaseDateAlt);
      const dateAdded = parseDateValue(game.dateAdded);
      const yearPlayedDate = parseDateValue(game.yearPlayed);
      const explicitCompletionDate = parseDateValue(game.dateCompleted);
      const explicitGameStatusRaw = firstNonEmpty([game.status, game.playStatus, game.gameStatus]);
      const hasExplicitGameStatus = Boolean(normalizeToken(explicitGameStatusRaw));
      const gameStatusRaw = firstNonEmpty([game.status, game.playStatus, game.gameStatus, game.completed]);
      const primaryStatusToken = normalizeToken(gameStatusRaw);
      const statusIndicatesCompleted =
        primaryStatusToken === "completed" ||
        primaryStatusToken === "finished" ||
        primaryStatusToken === "done" ||
        primaryStatusToken === "beat" ||
        primaryStatusToken === "beaten";
      const completedFlagOnly = !hasExplicitGameStatus && isTruthyToken(game.completed);
      const completionDate =
        explicitCompletionDate ||
        (statusIndicatesCompleted || completedFlagOnly ? yearPlayedDate : null);
      const activityDate =
        dateAdded ||
        completionDate ||
        yearPlayedDate ||
        releaseDate;
      const rating = parseRatingValue(game.myRating, "ten");
      const externalRating = parseRatingValue(firstNonEmpty([game.igdbRating, game.rating]));
      const genres = splitList(game.genres);
      const platforms = splitList(game.platform);
      const formats = splitList(game.format);
      const tags = [...splitList(game.tag), ...splitList(game.tags), ...splitList(game.yearPlayed)];
      const completionHint = statusIndicatesCompleted || completedFlagOnly;
      const statusBucket = inferStatusBucket(gameStatusRaw, completionHint);
      const platformRaw = firstNonEmpty([game.platform, game.platforms]);
      const coverUrl = resolveCoverUrl(
        "game",
        title,
        [
          game.localCoverUrl,
          game.coverUrl,
          game.posterUrl,
          game.metadataCoverUrl,
          game.cover,
          game.posterUrlFallback,
        ],
        coverOverrides,
        platformRaw
      );
      const gameplayHours = parseHoursValue(
        firstNonEmpty([game.hoursPlayed, game["Hours Played"], game.HoursPlayed, game.playtime, game.Playtime])
      );
      const playedYears = parseYearTokens(game.yearPlayed);

      return {
        mediaType: "game",
        title,
        activityDate,
        releaseDate,
        completionDate,
        playedYears,
        rating,
        externalRating,
        genres,
        platforms,
        formats,
        tags,
        authors: [],
        directors: [],
        statusBucket,
        primaryStatusToken,
        coverUrl,
        audiobookMinutes: 0,
        runtimeMinutes: 0,
        gameplayHours,
      };
    });

    return [...mappedBooks, ...mappedMovies, ...mappedShows, ...mappedGames];
  }, [books, coverOverrides, games, movies, shows]);

  const reviewYearOptions = useMemo(() => {
    const years = new Set<number>([currentYear]);
    unifiedItems.forEach((item) => {
      const anchorDate = item.activityDate || item.completionDate || item.releaseDate;
      if (anchorDate) {
        years.add(anchorDate.getUTCFullYear());
      }
      item.playedYears.forEach((year) => years.add(year));
    });
    return [...years].sort((a, b) => b - a);
  }, [currentYear, unifiedItems]);

  const selectedStatsYear: StatsYearFilter =
    statsYear === ALL_STATS_YEARS
      ? ALL_STATS_YEARS
      : reviewYearOptions.includes(statsYear)
        ? statsYear
        : ALL_STATS_YEARS;
  const statsYearLabel = selectedStatsYear === ALL_STATS_YEARS ? "All Years" : `${selectedStatsYear}`;
  const statsYearScopePhrase = selectedStatsYear === ALL_STATS_YEARS ? "all-years scope" : `${selectedStatsYear} scope`;
  const mediaYearScopeLabel = filter === "all" ? "media entries" : MEDIA_LABELS[filter].toLowerCase();
  const mediaYearLabel =
    filter === "all" ? "Most Popular Media Year" : `Most Popular ${MEDIA_LABELS[filter].replace("TV Shows", "TV Show")} Year`;
  const selectedReviewYear = reviewYearOptions.includes(reviewYear)
    ? reviewYear
    : (reviewYearOptions[0] || currentYear);
  const previousReviewYear = selectedReviewYear - 1;

  const baseFilteredItems = useMemo(() => {
    if (filter === "all") return unifiedItems;
    return unifiedItems.filter((item) => item.mediaType === filter);
  }, [filter, unifiedItems]);

  const filteredItems = useMemo(() => {
    if (activeTab === "yearReview" || selectedStatsYear === ALL_STATS_YEARS) return baseFilteredItems;

    return baseFilteredItems.filter((item) => {
      const anchorDate = item.activityDate || item.completionDate || item.releaseDate;
      const anchorInYear = anchorDate?.getUTCFullYear() === selectedStatsYear;
      const playedInYear = item.mediaType === "game" && item.playedYears.includes(selectedStatsYear);
      return anchorInYear || playedInYear;
    });
  }, [activeTab, baseFilteredItems, selectedStatsYear]);

  const mediaCounts = useMemo(() => {
    const counts: Record<StatsMediaType, number> = { book: 0, movie: 0, tv: 0, game: 0 };
    filteredItems.forEach((item) => {
      counts[item.mediaType] += 1;
    });
    return counts;
  }, [filteredItems]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusBucket, number> = {
      completed: 0,
      inProgress: 0,
      backlog: 0,
      wishlist: 0,
      abandoned: 0,
      other: 0,
    };

    filteredItems.forEach((item) => {
      counts[item.statusBucket] += 1;
    });

    return counts;
  }, [filteredItems]);

  const genreCounts = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach((item) => {
      item.genres.forEach((genre) => {
        map.set(genre, (map.get(genre) || 0) + 1);
      });
    });
    return map;
  }, [filteredItems]);

  const platformCounts = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach((item) => {
      item.platforms.forEach((platform) => {
        map.set(platform, (map.get(platform) || 0) + 1);
      });
    });
    return map;
  }, [filteredItems]);

  const formatCounts = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach((item) => {
      item.formats.forEach((format) => {
        map.set(format, (map.get(format) || 0) + 1);
      });
    });
    return map;
  }, [filteredItems]);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    filteredItems.forEach((item) => {
      item.tags.forEach((tag) => {
        map.set(tag, (map.get(tag) || 0) + 1);
      });
    });
    return map;
  }, [filteredItems]);

  const topGenres = useMemo(() => getTopN(genreCounts, 7), [genreCounts]);

  const statusRows = useMemo(() => {
    return (Object.keys(statusCounts) as StatusBucket[])
      .map((bucket) => ({ bucket, value: statusCounts[bucket] }))
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [statusCounts]);

  const ratingValues = useMemo(() => {
    return filteredItems
      .map((item) => item.rating)
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  }, [filteredItems]);

  const averageRating = useMemo(() => {
    if (!ratingValues.length) return null;
    const total = ratingValues.reduce((sum, value) => sum + value, 0);
    return total / ratingValues.length;
  }, [ratingValues]);

  const ratingBuckets = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, index) => ({ name: `${index + 1}`, value: 0 }));
    ratingValues.forEach((rating) => {
      const bucket = Math.max(1, Math.min(10, Math.round(rating)));
      bins[bucket - 1].value += 1;
    });
    return bins;
  }, [ratingValues]);

  const monthlyWindowMonths = 12;

  const monthlySeries = useMemo<MonthlyPoint[]>(() => {
    const completedItems = filteredItems.filter((item) => item.completionDate);

    const timeline: MonthlyPoint[] = [];
    if (selectedStatsYear === ALL_STATS_YEARS) {
      const anchor = new Date();
      const anchorYear = anchor.getUTCFullYear();
      const anchorMonth = anchor.getUTCMonth();
      for (let offset = monthlyWindowMonths - 1; offset >= 0; offset -= 1) {
        const monthIndex = anchorMonth - offset;
        const cursor = new Date(Date.UTC(anchorYear, monthIndex, 1));
        const key = toMonthKey(cursor);
        timeline.push({
          key,
          label: formatMonthFromKey(key),
          counts: { book: 0, movie: 0, tv: 0, game: 0 },
          total: 0,
        });
      }
    } else {
      for (let monthIndex = 0; monthIndex < monthlyWindowMonths; monthIndex += 1) {
        const cursor = new Date(Date.UTC(selectedStatsYear, monthIndex, 1));
        const key = toMonthKey(cursor);
        timeline.push({
          key,
          label: formatMonthFromKey(key),
          counts: { book: 0, movie: 0, tv: 0, game: 0 },
          total: 0,
        });
      }
    }

    const byKey = new Map(timeline.map((point) => [point.key, point]));

    completedItems.forEach((item) => {
      if (!item.completionDate) return;
      const key = toMonthKey(item.completionDate);
      const monthRow = byKey.get(key);
      if (!monthRow) return;
      monthRow.counts[item.mediaType] += 1;
      monthRow.total += 1;
    });

    return timeline;
  }, [filteredItems, monthlyWindowMonths, selectedStatsYear]);
  const monthlySeriesLabel = selectedStatsYear === ALL_STATS_YEARS ? "Last 12 months" : `${selectedStatsYear}`;

  const monthlyMax = useMemo(() => {
    const max = Math.max(...monthlySeries.map((point) => point.total), 0);
    return Math.max(1, max);
  }, [monthlySeries]);

  const monthlyMediaTotals = useMemo(() => {
    const totals: Record<StatsMediaType, number> = { book: 0, movie: 0, tv: 0, game: 0 };
    monthlySeries.forEach((point) => {
      (Object.keys(totals) as StatsMediaType[]).forEach((mediaType) => {
        totals[mediaType] += point.counts[mediaType];
      });
    });
    return totals;
  }, [monthlySeries]);

  const releaseYearSeries = useMemo(() => {
    const yearToTitleSet = new Map<number, Set<string>>();

    filteredItems.forEach((item) => {
      if (!item.releaseDate) return;
      const year = item.releaseDate.getUTCFullYear();
      const normalizedTitle = normalizeTitleKey(item.title);
      const releaseIdentity = `${item.mediaType}:${normalizedTitle}`;
      const bucket = yearToTitleSet.get(year) || new Set<string>();
      bucket.add(releaseIdentity);
      yearToTitleSet.set(year, bucket);
    });

    return [...yearToTitleSet.entries()]
      .map(([year, keys]) => ({ year, value: keys.size }))
      .sort((a, b) => a.year - b.year)
      .slice(-18);
  }, [filteredItems]);

  const releaseLinePoints = useMemo(() => {
    if (!releaseYearSeries.length) return [];
    const width = 560;
    const height = 120;
    const maxValue = Math.max(1, ...releaseYearSeries.map((entry) => entry.value));
    const step = releaseYearSeries.length > 1 ? width / (releaseYearSeries.length - 1) : 0;
    return releaseYearSeries.map((entry, index) => {
      const x = releaseYearSeries.length === 1 ? width / 2 : index * step;
      const y = height - (entry.value / maxValue) * (height - 14) - 7;
      return { year: entry.year, value: entry.value, x, y };
    });
  }, [releaseYearSeries]);

  const releaseLinePath = useMemo(() => {
    if (!releaseLinePoints.length) return "";
    return releaseLinePoints
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
      .join(" ");
  }, [releaseLinePoints]);

  const topDimension = useMemo(() => {
    if (filter === "game") {
      return {
        label: "Top Platforms",
        rows: getTopN(platformCounts, 6),
      };
    }

    if (filter === "book") {
      return {
        label: "Top Formats",
        rows: getTopN(formatCounts, 6),
      };
    }

    if (filter === "movie" || filter === "tv") {
      const tags = getTopN(tagCounts, 6);
      if (tags.length > 0) {
        return {
          label: "Top Tags",
          rows: tags,
        };
      }
      return {
        label: "Top Genres",
        rows: getTopN(genreCounts, 6),
      };
    }

    return {
      label: "Media Mix",
      rows: [
        { name: "Books", value: mediaCounts.book },
        { name: "Movies", value: mediaCounts.movie },
        { name: "TV Shows", value: mediaCounts.tv },
        { name: "Games", value: mediaCounts.game },
      ].filter((entry) => entry.value > 0),
    };
  }, [filter, formatCounts, genreCounts, mediaCounts.book, mediaCounts.game, mediaCounts.movie, mediaCounts.tv, platformCounts, tagCounts]);

  const comparisonYearItems = useMemo(() => {
    if (filter === "all") return [];
    if (selectedStatsYear === ALL_STATS_YEARS) return filteredItems;
    return filteredItems.filter((item) => {
      const completedOrWatchedInYear = item.completionDate?.getUTCFullYear() === selectedStatsYear;
      const releasedInYear = item.releaseDate?.getUTCFullYear() === selectedStatsYear;
      const playedInYear = item.mediaType === "game" && item.playedYears.includes(selectedStatsYear);
      return completedOrWatchedInYear || playedInYear || releasedInYear;
    });
  }, [filter, filteredItems, selectedStatsYear]);

  const topMyRatedItems = useMemo(() => {
    return comparisonYearItems
      .filter((item) => typeof item.rating === "number" && Number.isFinite(item.rating))
      .sort((a, b) => compareRankedItems(a, b, "rating"))
      .slice(0, 10);
  }, [comparisonYearItems]);

  const topExternalRatedItems = useMemo(() => {
    return comparisonYearItems
      .filter((item) => typeof item.externalRating === "number" && Number.isFinite(item.externalRating))
      .sort((a, b) => compareRankedItems(a, b, "externalRating"))
      .slice(0, 10);
  }, [comparisonYearItems]);

  const highlightStats = useMemo(() => {
    const yearLogged =
      selectedStatsYear === ALL_STATS_YEARS
        ? filteredItems.length
        : filteredItems.filter((item) => {
            const activityInYear = item.activityDate?.getUTCFullYear() === selectedStatsYear;
            const playedInYear = item.mediaType === "game" && item.playedYears.includes(selectedStatsYear);
            return activityInYear || playedInYear;
          }).length;
    const yearCompleted =
      selectedStatsYear === ALL_STATS_YEARS
        ? filteredItems.filter((item) => Boolean(item.completionDate)).length
        : filteredItems.filter((item) => item.completionDate?.getUTCFullYear() === selectedStatsYear).length;

    const monthPool = monthlySeries.filter((month) => !isExcludedBusiestMonthKey(month.key));
    const bestMonth = [...monthPool].sort((a, b) => b.total - a.total).find((month) => month.total > 0) || null;

    const topGenre = topGenres[0] || null;
    const releaseYearCounts = new Map<string, number>();
    filteredItems.forEach((item) => {
      const releaseYear = item.releaseDate?.getUTCFullYear();
      if (!releaseYear) return;
      const key = String(releaseYear);
      releaseYearCounts.set(key, (releaseYearCounts.get(key) || 0) + 1);
    });
    const mostPopularMediaYear = getTopN(releaseYearCounts, 1)[0] || null;

    return {
      yearLogged,
      yearCompleted,
      bestMonth,
      topGenre,
      mostPopularMediaYear,
    };
  }, [filteredItems, monthlySeries, selectedStatsYear, topGenres]);

  const yearReview = useMemo(() => {
    const getAnchorDate = (item: UnifiedStatsItem) => item.activityDate || item.completionDate || item.releaseDate;
    const isInYear = (item: UnifiedStatsItem, year: number) => getAnchorDate(item)?.getUTCFullYear() === year;
    const selectedYearTagToken = normalizeToken(String(selectedReviewYear));

    const yearItems = unifiedItems.filter((item) => isInYear(item, selectedReviewYear));
    const previousYearItems = unifiedItems.filter((item) => isInYear(item, previousReviewYear));
    const completedThisYear = unifiedItems.filter(
      (item) =>
        item.completionDate?.getUTCFullYear() === selectedReviewYear &&
        item.statusBucket === "completed"
    );
    const completedPrevYear = unifiedItems.filter(
      (item) =>
        item.completionDate?.getUTCFullYear() === previousReviewYear &&
        item.statusBucket === "completed"
    );

    const mediaCounts: Record<StatsMediaType, number> = { book: 0, movie: 0, tv: 0, game: 0 };
    yearItems.forEach((item) => {
      mediaCounts[item.mediaType] += 1;
    });

    const watchedMovieItems = yearItems.filter(
      (item) => item.mediaType === "movie" && item.primaryStatusToken === "watched"
    );
    const moviesWatched = watchedMovieItems.length;
    const movieMinutes = watchedMovieItems.reduce((sum, item) => sum + item.runtimeMinutes, 0);
    const audiobookItems = completedThisYear.filter(
      (item) =>
        item.mediaType === "book" &&
        item.primaryStatusToken === "completed" &&
        item.audiobookMinutes > 0
    );
    const audiobookMinutes = audiobookItems.reduce((sum, item) => sum + item.audiobookMinutes, 0);
    const gamePlaytimeItems = unifiedItems.filter(
      (item) =>
        item.mediaType === "game" &&
        item.gameplayHours > 0 &&
        item.playedYears.includes(selectedReviewYear)
    );
    const gameHours = gamePlaytimeItems.reduce((sum, item) => sum + item.gameplayHours, 0);
    const abandonedTaggedItems = unifiedItems.filter(
      (item) =>
        item.statusBucket === "abandoned" &&
        item.tags.some((tag) => normalizeToken(tag) === selectedYearTagToken)
    );
    const abandonedCount = abandonedTaggedItems.length;

    const completedGameItems = completedThisYear.filter(
      (item) => item.mediaType === "game" && item.primaryStatusToken === "completed"
    );
    const completedGameItemsPrev = completedPrevYear.filter(
      (item) => item.mediaType === "game" && item.primaryStatusToken === "completed"
    );
    const completedBookItems = completedThisYear.filter(
      (item) => item.mediaType === "book" && item.primaryStatusToken === "completed"
    );
    const completedBookItemsPrev = completedPrevYear.filter(
      (item) => item.mediaType === "book" && item.primaryStatusToken === "completed"
    );
    const completedGames = completedGameItems.length;
    const completedGamesPrev = completedGameItemsPrev.length;
    const completedBooks = completedBookItems.length;
    const completedBooksPrev = completedBookItemsPrev.length;

    const monthMap = new Map<string, number>();
    yearItems.forEach((item) => {
      const monthDate = item.activityDate || item.completionDate;
      if (!monthDate) return;
      const key = toMonthKey(monthDate);
      if (isExcludedBusiestMonthKey(key)) return;
      monthMap.set(key, (monthMap.get(key) || 0) + 1);
    });

    const busiestMonthEntry = [...monthMap.entries()]
      .filter(([key]) => !isExcludedBusiestMonthKey(key))
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
    const busiestMonth = busiestMonthEntry
      ? { key: busiestMonthEntry[0], label: formatMonthFromKey(busiestMonthEntry[0]), count: busiestMonthEntry[1] }
      : null;

    const yearGenreCounts = new Map<string, number>();
    yearItems.forEach((item) => {
      item.genres.forEach((genre) => {
        yearGenreCounts.set(genre, (yearGenreCounts.get(genre) || 0) + 1);
      });
    });
    const topGenre = getTopN(yearGenreCounts, 1)[0] || null;

    const ratedYearItems = unifiedItems.filter(
      (item) =>
        typeof item.rating === "number" &&
        item.completionDate?.getUTCFullYear() === selectedReviewYear
    );

    const topRatedItems = [...ratedYearItems]
      .sort((a, b) => {
        const ratingDelta = getComparablePersonalRating(b) - getComparablePersonalRating(a);
        if (ratingDelta !== 0) return ratingDelta;
        const aDate = a.completionDate?.getTime() || 0;
        const bDate = b.completionDate?.getTime() || 0;
        if (bDate !== aDate) return bDate - aDate;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 20);
    const bottomRatedItems = [...ratedYearItems]
      .sort((a, b) => {
        const ratingDelta = getComparablePersonalRating(a) - getComparablePersonalRating(b);
        if (ratingDelta !== 0) return ratingDelta;
        const aDate = a.completionDate?.getTime() || 0;
        const bDate = b.completionDate?.getTime() || 0;
        if (bDate !== aDate) return bDate - aDate;
        return a.title.localeCompare(b.title);
      })
      .slice(0, 20);
    const topRated = topRatedItems[0] || null;
    const lowestRated = [...ratedYearItems]
      .sort((a, b) => {
        const ratingDelta = getComparablePersonalRating(a) - getComparablePersonalRating(b);
        if (ratingDelta !== 0) return ratingDelta;
        const aDate = a.completionDate?.getTime() || 0;
        const bDate = b.completionDate?.getTime() || 0;
        if (bDate !== aDate) return bDate - aDate;
        return a.title.localeCompare(b.title);
      })[0] || null;

    const longestAudiobook = [...audiobookItems].sort((a, b) => b.audiobookMinutes - a.audiobookMinutes)[0] || null;
    const mostPlayedGame = [...gamePlaytimeItems].sort((a, b) => b.gameplayHours - a.gameplayHours)[0] || null;

    return {
      yearItems,
      previousYearItems,
      mediaCounts,
      watchedMovieItems,
      moviesWatched,
      movieMinutes,
      audiobookItems,
      audiobookMinutes,
      audiobookCount: audiobookItems.length,
      gamePlaytimeItems,
      gameHours,
      abandonedTaggedItems,
      abandonedCount,
      completedGameItems,
      completedGames,
      completedGamesPrev,
      completedBookItems,
      completedBooks,
      completedBooksPrev,
      completedTotal: completedThisYear.length,
      completedPrevTotal: completedPrevYear.length,
      busiestMonth,
      topGenre,
      topRated,
      lowestRated,
      longestAudiobook,
      mostPlayedGame,
      topRatedItems,
      bottomRatedItems,
    };
  }, [previousReviewYear, selectedReviewYear, unifiedItems]);

  const yearReviewMetrics = useMemo<SummaryMetric[]>(() => {
    const gameDelta = yearReview.completedGames - yearReview.completedGamesPrev;
    const completedDelta = yearReview.completedTotal - yearReview.completedPrevTotal;
    const abandonedRate = yearReview.yearItems.length ? (yearReview.abandonedCount / yearReview.yearItems.length) * 100 : 0;
    const previousBooks = yearReview.completedBooksPrev;
    const previousMovies = yearReview.previousYearItems.filter((item) => item.mediaType === "movie").length;
    const previousTv = yearReview.previousYearItems.filter((item) => item.mediaType === "tv").length;
    const previousGames = yearReview.previousYearItems.filter((item) => item.mediaType === "game").length;
    const bookDelta = yearReview.completedBooks - previousBooks;
    const movieDelta = yearReview.mediaCounts.movie - previousMovies;
    const tvDelta = yearReview.mediaCounts.tv - previousTv;
    const gamesDelta = yearReview.mediaCounts.game - previousGames;
    const ratedItems = yearReview.yearItems.filter((item) => typeof item.rating === "number");
    const ratedCoverage = yearReview.yearItems.length ? (ratedItems.length / yearReview.yearItems.length) * 100 : 0;
    const averageYearRating = ratedItems.length
      ? ratedItems.reduce((sum, item) => sum + (item.rating || 0), 0) / ratedItems.length
      : null;
    const completionRate = yearReview.yearItems.length
      ? (yearReview.completedTotal / yearReview.yearItems.length) * 100
      : 0;
    const completedThisYearItems = yearReview.yearItems.filter(
      (item) =>
        item.completionDate?.getUTCFullYear() === selectedReviewYear &&
        item.statusBucket === "completed"
    );
    const abandonedItems = yearReview.abandonedTaggedItems;
    const booksLoggedItems = yearReview.completedBookItems;
    const moviesLoggedItems = yearReview.yearItems.filter((item) => item.mediaType === "movie");
    const tvLoggedItems = yearReview.yearItems.filter((item) => item.mediaType === "tv");
    const gamesLoggedItems = yearReview.yearItems.filter((item) => item.mediaType === "game");
    const moviesWatchedItems = yearReview.watchedMovieItems;
    const audiobookItems = yearReview.audiobookItems;
    const gamePlaytimeItems = yearReview.gamePlaytimeItems;
    const completedGamesItems = yearReview.completedGameItems;
    const busiestMonthItems =
      yearReview.busiestMonth && !isExcludedBusiestMonthKey(yearReview.busiestMonth.key)
        ? yearReview.yearItems.filter((item) => {
            const monthDate = item.activityDate || item.completionDate;
            return monthDate ? toMonthKey(monthDate) === yearReview.busiestMonth?.key : false;
          })
        : [];
    const gameDeltaLabel =
      gameDelta > 0
        ? `up ${gameDelta} vs ${previousReviewYear}`
        : gameDelta < 0
          ? `down ${Math.abs(gameDelta)} vs ${previousReviewYear}`
          : `same as ${previousReviewYear}`;
    const completionDeltaLabel =
      completedDelta > 0
        ? `up ${completedDelta} vs ${previousReviewYear}`
        : completedDelta < 0
          ? `down ${Math.abs(completedDelta)} vs ${previousReviewYear}`
          : `same as ${previousReviewYear}`;
    const bookDeltaLabel =
      bookDelta > 0
        ? `up ${bookDelta} vs ${previousReviewYear}`
        : bookDelta < 0
          ? `down ${Math.abs(bookDelta)} vs ${previousReviewYear}`
          : `same as ${previousReviewYear}`;
    const tvDeltaLabel =
      tvDelta > 0
        ? `up ${tvDelta} vs ${previousReviewYear}`
        : tvDelta < 0
          ? `down ${Math.abs(tvDelta)} vs ${previousReviewYear}`
          : `same as ${previousReviewYear}`;
    const movieDeltaLabel =
      movieDelta > 0
        ? `up ${movieDelta} vs ${previousReviewYear}`
        : movieDelta < 0
          ? `down ${Math.abs(movieDelta)} vs ${previousReviewYear}`
          : `same as ${previousReviewYear}`;
    const gamesDeltaLabel =
      gamesDelta > 0
        ? `up ${gamesDelta} vs ${previousReviewYear}`
        : gamesDelta < 0
          ? `down ${Math.abs(gamesDelta)} vs ${previousReviewYear}`
          : `same as ${previousReviewYear}`;

    return [
      {
        id: `YR_${selectedReviewYear}_LOGGED_THIS_YEAR`,
        label: "Logged This Year",
        value: `${yearReview.yearItems.length}`,
        subLabel: `tracked in ${selectedReviewYear}`,
        accent: "var(--stats-accent-1)",
        summary: `Counts every item whose activity date (or fallback date) lands in ${selectedReviewYear}.`,
        calculation: "Items where anchor date (activityDate || completionDate || releaseDate) year equals selected review year.",
        items: yearReview.yearItems,
      },
      {
        id: `YR_${selectedReviewYear}_MOVIES_WATCHED`,
        label: "Movies Watched",
        value: `${yearReview.moviesWatched}`,
        subLabel: `${formatMinutesAsHours(yearReview.movieMinutes)} watch time`,
        accent: "var(--stats-accent-2)",
        summary: `Counts movies logged in ${selectedReviewYear} whose normalized status is exactly "watched".`,
        calculation: 'Filter year items where mediaType=movie and primaryStatusToken=="watched"; value=count and watch time=sum(runtimeMinutes).',
        items: moviesWatchedItems,
      },
      {
        id: `YR_${selectedReviewYear}_AUDIOBOOK_TIME`,
        label: "Audiobook Time",
        value: formatMinutesAsHours(yearReview.audiobookMinutes),
        subLabel: `${yearReview.audiobookCount} audiobook entries`,
        accent: "var(--stats-accent-3)",
        summary: `Totals audiobook listening duration for books completed in ${selectedReviewYear}.`,
        calculation:
          'Filter items where mediaType=book, primaryStatusToken=="completed", completionDate year==selected review year, and audiobookMinutes>0; value=sum(audiobookMinutes).',
        items: audiobookItems,
      },
      {
        id: `YR_${selectedReviewYear}_GAME_HOURS`,
        label: "Game Hours",
        value: formatHours(yearReview.gameHours),
        subLabel: "logged playtime",
        accent: "var(--stats-accent-4)",
        summary: `Totals gameplay hours for games with playtime data tagged as played in ${selectedReviewYear}.`,
        calculation: "Filter games where gameplayHours>0 and playedYears includes selected review year; value=sum(gameplayHours).",
        items: gamePlaytimeItems,
      },
      {
        id: `YR_${selectedReviewYear}_GAMES_COMPLETED`,
        label: "Games Completed",
        value: `${yearReview.completedGames}`,
        subLabel: gameDeltaLabel,
        accent: "var(--stats-accent-1)",
        summary: `Counts games with status exactly "completed" and completion date in ${selectedReviewYear}.`,
        calculation: 'Filter items where mediaType=game, primaryStatusToken=="completed", and completionDate year==selected review year.',
        items: completedGamesItems,
      },
      {
        id: `YR_${selectedReviewYear}_COMPLETION_MOMENTUM`,
        label: "Completion Momentum",
        value: `${yearReview.completedTotal}`,
        subLabel: completionDeltaLabel,
        accent: "var(--stats-accent-4)",
        summary: `Counts items completed in ${selectedReviewYear} where status resolves to the Completed bucket, then compares to ${previousReviewYear}.`,
        calculation: 'Filter items where completionDate year==selected review year AND statusBucket=="completed".',
        items: completedThisYearItems,
      },
      {
        id: `YR_${selectedReviewYear}_ABANDONED_MEDIA`,
        label: "Abandoned Media",
        value: `${yearReview.abandonedCount}`,
        subLabel: `${abandonedRate.toFixed(0)}% of yearly logs`,
        accent: "var(--stats-accent-2)",
        summary: `Counts items with status mapped to Abandoned and a tag matching ${selectedReviewYear}.`,
        calculation:
          "Filter all items where statusBucket==abandoned and tags include selected review year token; value=count.",
        items: abandonedItems,
      },
      {
        id: `YR_${selectedReviewYear}_BOOKS_LOGGED`,
        label: "Books Logged",
        value: `${yearReview.completedBooks}`,
        subLabel: bookDeltaLabel,
        accent: "var(--stats-accent-3)",
        summary: `Counts books with status exactly "completed" and completion date in ${selectedReviewYear}.`,
        calculation: 'Filter items where mediaType=book, primaryStatusToken=="completed", and completionDate year==selected review year.',
        items: booksLoggedItems,
      },
      {
        id: `YR_${selectedReviewYear}_TV_LOGGED`,
        label: "TV Logged",
        value: `${yearReview.mediaCounts.tv}`,
        subLabel: tvDeltaLabel,
        accent: "var(--stats-accent-1)",
        summary: `Counts all TV entries logged in ${selectedReviewYear}.`,
        calculation: "Filter year items where mediaType == tv.",
        items: tvLoggedItems,
      },
      {
        id: `YR_${selectedReviewYear}_AVERAGE_RATING`,
        label: "Average Rating",
        value: averageYearRating ? averageYearRating.toFixed(1) : "-",
        subLabel: `${ratedItems.length} rated titles`,
        accent: "var(--stats-accent-4)",
        summary: "Shows the average of personal ratings for rated items in the selected review year.",
        calculation: "Mean of rating for year items where rating is numeric.",
        items: ratedItems,
      },
      {
        id: `YR_${selectedReviewYear}_COMPLETION_RATE`,
        label: "Completion Rate",
        value: `${completionRate.toFixed(0)}%`,
        subLabel: `${yearReview.completedTotal} completed`,
        accent: "var(--stats-accent-2)",
        summary: "Percent of yearly logged items that were completed in the selected review year.",
        calculation: "completionRate = completedThisYearCount / yearItemsCount * 100.",
        items: yearReview.yearItems,
      },
      {
        id: `YR_${selectedReviewYear}_BUSIEST_MONTH`,
        label: "Busiest Month",
        value: yearReview.busiestMonth ? `${yearReview.busiestMonth.count}` : "0",
        subLabel: yearReview.busiestMonth ? yearReview.busiestMonth.label : "no month data",
        accent: "var(--stats-accent-3)",
        summary: "Month with the highest number of logged items in the selected review year.",
        calculation: "Group year items by month key from activityDate || completionDate, then choose max count.",
        items: busiestMonthItems,
      },
      {
        id: `YR_${selectedReviewYear}_MOVIES_LOGGED`,
        label: "Movies Logged",
        value: `${yearReview.mediaCounts.movie}`,
        subLabel: movieDeltaLabel,
        accent: "var(--stats-accent-1)",
        summary: `Counts all movie entries logged in ${selectedReviewYear}.`,
        calculation: "Filter year items where mediaType == movie.",
        items: moviesLoggedItems,
      },
      {
        id: `YR_${selectedReviewYear}_GAMES_LOGGED`,
        label: "Games Logged",
        value: `${yearReview.mediaCounts.game}`,
        subLabel: gamesDeltaLabel,
        accent: "var(--stats-accent-4)",
        summary: `Counts all game entries logged in ${selectedReviewYear}.`,
        calculation: "Filter year items where mediaType == game.",
        items: gamesLoggedItems,
      },
      {
        id: `YR_${selectedReviewYear}_RATED_TITLES`,
        label: "Rated Titles",
        value: `${ratedItems.length}`,
        subLabel: `${ratedCoverage.toFixed(0)}% of yearly logs`,
        accent: "var(--stats-accent-2)",
        summary: `Counts logged items in ${selectedReviewYear} that have a personal rating.`,
        calculation: "Filter year items where rating is numeric.",
        items: ratedItems,
      },
    ];
  }, [previousReviewYear, selectedReviewYear, yearReview]);

  const wrappedSlides = useMemo<WrappedSlide[]>(() => {
    const featuredCovers = [
      yearReview.topRated?.coverUrl || null,
      yearReview.mostPlayedGame?.coverUrl || null,
      yearReview.longestAudiobook?.coverUrl || null,
      yearReview.lowestRated?.coverUrl || null,
      yearReview.topRatedItems.find((item) => item.coverUrl)?.coverUrl || null,
    ].filter((value): value is string => Boolean(value));
    const fallbackBackdrop = featuredCovers[0] || null;
    const getBackdrop = (coverUrl: string | null, offset = 0) =>
      coverUrl || featuredCovers[offset % Math.max(1, featuredCovers.length)] || fallbackBackdrop;

    return [
      {
        id: "intro",
        kicker: "CDL Wrapped",
        title: `${selectedReviewYear} in one story`,
        value: `${yearReview.yearItems.length} titles logged`,
        note: `${yearReview.completedTotal} completed • ${yearReview.abandonedCount} abandoned`,
        coverUrl: yearReview.topRated?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.topRated?.coverUrl || null, 0),
      },
      {
        id: "favorite",
        kicker: "Top Rated",
        title: yearReview.topRated?.title || "No top-rated title yet",
        value: getPersonalRatingBadgeLabel(yearReview.topRated) || "-",
        note: yearReview.topRated ? MEDIA_LABELS[yearReview.topRated.mediaType] : "Add ratings to unlock this card",
        mediaType: yearReview.topRated?.mediaType,
        coverShape:
          yearReview.topRated?.mediaType === "book" &&
          Boolean(yearReview.topRated?.formats.some((format) => normalizeToken(format).includes("audiobook")))
            ? "square"
            : "poster",
        coverUrl: yearReview.topRated?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.topRated?.coverUrl || null, 1),
      },
      {
        id: "watch-time",
        kicker: "Screen Time",
        title: "Movies Watched",
        value: `${yearReview.moviesWatched}`,
        note: `${formatMinutesAsHours(yearReview.movieMinutes)} total watch time`,
        mediaType: "movie",
        preferTextOverlay: true,
        coverUrl: yearReview.topRatedItems.find((item) => item.mediaType === "movie" && item.coverUrl)?.coverUrl || null,
        backdropUrl: getBackdrop(null, 2),
      },
      {
        id: "audio",
        kicker: "Listening",
        title: yearReview.longestAudiobook?.title || "Longest Audiobook",
        value: yearReview.longestAudiobook ? formatMinutesAsHours(yearReview.longestAudiobook.audiobookMinutes) : "0 hours",
        note: `${yearReview.audiobookCount} audiobook entries completed`,
        mediaType: "book",
        coverShape: "square",
        coverUrl: yearReview.longestAudiobook?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.longestAudiobook?.coverUrl || null, 3),
      },
      {
        id: "games",
        kicker: "Play Session",
        title: yearReview.mostPlayedGame?.title || "Most Played Game",
        value: formatHours(yearReview.gameHours),
        note: `${yearReview.completedGames} games completed`,
        mediaType: "game",
        preferTextOverlay: true,
        coverUrl: yearReview.mostPlayedGame?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.mostPlayedGame?.coverUrl || null, 4),
      },
      {
        id: "completion-rate",
        kicker: "Consistency",
        title: "Completion Rate",
        value: yearReview.yearItems.length
          ? `${Math.round((yearReview.completedTotal / yearReview.yearItems.length) * 100)}%`
          : "0%",
        note: `${yearReview.completedTotal} of ${yearReview.yearItems.length} logged titles completed`,
        coverUrl: yearReview.topRatedItems[1]?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.topRatedItems[1]?.coverUrl || null, 5),
      },
      {
        id: "genre",
        kicker: "Your Vibe",
        title: yearReview.topGenre?.name || "Top Genre",
        value: yearReview.topGenre ? `${yearReview.topGenre.value} logs` : "-",
        note: "Most frequent genre in your Year in Review",
        coverUrl: yearReview.topRatedItems[2]?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.topRatedItems[2]?.coverUrl || null, 6),
      },
      {
        id: "busiest-month",
        kicker: "Peak Month",
        title: yearReview.busiestMonth?.label || "No month data",
        value: `${yearReview.busiestMonth?.count || 0} logged`,
        note: "Your most active month for logging titles",
        coverUrl: yearReview.topRatedItems[3]?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.topRatedItems[3]?.coverUrl || null, 7),
      },
      {
        id: "lowest-rated",
        kicker: "Tough Watch",
        title: yearReview.lowestRated?.title || "Lowest Rated",
        value: getPersonalRatingBadgeLabel(yearReview.lowestRated) || "-",
        note: yearReview.lowestRated ? MEDIA_LABELS[yearReview.lowestRated.mediaType] : "No low-rated entries yet",
        mediaType: yearReview.lowestRated?.mediaType,
        coverShape:
          yearReview.lowestRated?.mediaType === "book" &&
          Boolean(yearReview.lowestRated?.formats.some((format) => normalizeToken(format).includes("audiobook")))
            ? "square"
            : "poster",
        preferTextOverlay:
          yearReview.lowestRated?.mediaType === "movie" || yearReview.lowestRated?.mediaType === "game",
        coverUrl: yearReview.lowestRated?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.lowestRated?.coverUrl || null, 8),
      },
      {
        id: "ratings-depth",
        kicker: "Critic Mode",
        title: "Rated Titles",
        value: `${yearReview.topRatedItems.length}`,
        note: `${yearReview.bottomRatedItems.length} titles in bottom picks list`,
        coverUrl: yearReview.topRatedItems[4]?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.topRatedItems[4]?.coverUrl || null, 9),
      },
      {
        id: "outro",
        kicker: "See You Next Year",
        title: `${selectedReviewYear} highlights complete`,
        value: `${yearReview.topRatedItems.length} rated picks`,
        note: `Busiest month: ${yearReview.busiestMonth?.label || "N/A"}`,
        coverUrl: yearReview.lowestRated?.coverUrl || null,
        backdropUrl: getBackdrop(yearReview.lowestRated?.coverUrl || null, 5),
      },
    ];
  }, [selectedReviewYear, yearReview]);

  const activeWrappedSlide = wrappedSlides[wrappedSlideIndex] || null;
  const wrappedBackdropFirst =
    Boolean(activeWrappedSlide?.backdropUrl) &&
    (activeWrappedSlide?.preferTextOverlay ||
      activeWrappedSlide?.mediaType === "movie" ||
      activeWrappedSlide?.mediaType === "game");
  const wrappedCoverShape = activeWrappedSlide?.coverShape || "poster";

  useEffect(() => {
    if (!isWrappedOpen) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsWrappedOpen(false);
        return;
      }
      if (event.key === "ArrowRight") {
        setWrappedSlideIndex((current) => (current + 1) % Math.max(1, wrappedSlides.length));
        return;
      }
      if (event.key === "ArrowLeft") {
        setWrappedSlideIndex((current) => (current - 1 + Math.max(1, wrappedSlides.length)) % Math.max(1, wrappedSlides.length));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isWrappedOpen, wrappedSlides.length]);

  useEffect(() => {
    if (!isWrappedOpen || wrappedSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setWrappedSlideIndex((current) => (current + 1) % wrappedSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [isWrappedOpen, wrappedSlides.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = wrappedMuted;
    if (!isWrappedOpen) {
      audio.pause();
      audio.currentTime = 0;
      setWrappedIsPlaying(false);
      setWrappedPlaybackBlocked(false);
      return;
    }
    audio
      .play()
      .then(() => {
        setWrappedIsPlaying(true);
        setWrappedPlaybackBlocked(false);
      })
      .catch(() => {
        setWrappedIsPlaying(false);
        setWrappedPlaybackBlocked(true);
      });
  }, [isWrappedOpen, wrappedMuted, wrappedTrackIndex]);

  const metrics = useMemo<SummaryMetric[]>(() => {
    const total = filteredItems.length;
    const completed = statusCounts.completed;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const ratedItems = filteredItems.filter((item) => typeof item.rating === "number" && Number.isFinite(item.rating));
    const audiobookItems = filteredItems.filter((item) => item.mediaType === "book" && item.audiobookMinutes > 0);
    const completedAudiobookItems = audiobookItems.filter((item) => item.statusBucket === "completed");
    const watchedMovieItems = filteredItems.filter(
      (item) =>
        item.mediaType === "movie" &&
        item.runtimeMinutes > 0 &&
        (item.statusBucket === "completed" || item.primaryStatusToken === "watched")
    );
    const watchedTvItems = filteredItems.filter(
      (item) =>
        item.mediaType === "tv" &&
        item.runtimeMinutes > 0 &&
        (item.statusBucket === "completed" || item.primaryStatusToken === "watched")
    );
    const completedGameItems = filteredItems.filter(
      (item) => item.mediaType === "game" && item.gameplayHours > 0 && item.statusBucket === "completed"
    );
    const consumedDurationItems = [
      ...completedAudiobookItems,
      ...watchedMovieItems,
      ...watchedTvItems,
      ...completedGameItems,
    ];
    const totalConsumedMinutes =
      completedAudiobookItems.reduce((sum, item) => sum + item.audiobookMinutes, 0) +
      watchedMovieItems.reduce((sum, item) => sum + item.runtimeMinutes, 0) +
      watchedTvItems.reduce((sum, item) => sum + item.runtimeMinutes, 0) +
      completedGameItems.reduce((sum, item) => sum + item.gameplayHours * 60, 0);
    const isBookScope = filter === "book";
    const averageRatingDisplay =
      typeof averageRating === "number" && Number.isFinite(averageRating)
        ? (() => {
            if (!isBookScope) return averageRating.toFixed(1);
            const fiveScaleAverage = averageRating > 5 ? averageRating / 2 : averageRating;
            return `${formatStarRowFive(fiveScaleAverage)} ${fiveScaleAverage.toFixed(1)}/5`;
          })()
        : "-";
    const scopeLabel =
      filter === "all"
        ? selectedStatsYear === ALL_STATS_YEARS
          ? "all media across all years"
          : `all media in ${selectedStatsYear}`
        : selectedStatsYear === ALL_STATS_YEARS
          ? `${MEDIA_LABELS[filter]} across all years`
          : `${MEDIA_LABELS[filter]} in ${selectedStatsYear}`;
    const scopeId =
      filter === "all"
        ? selectedStatsYear === ALL_STATS_YEARS
          ? "ALL_ALL_YEARS"
          : `ALL_${selectedStatsYear}`
        : selectedStatsYear === ALL_STATS_YEARS
          ? `${filter.toUpperCase()}_ALL_YEARS`
          : `${filter.toUpperCase()}_${selectedStatsYear}`;
    const durationMetricByFilter = {
      all: {
        label: "Total Hours Consumed",
        items: consumedDurationItems,
        minutes: totalConsumedMinutes,
        subLabel: `${consumedDurationItems.length} completed entries with duration`,
        summary: `Total consumed hours from completed or watched media in ${scopeLabel}.`,
        calculation: "Sum completed audiobook minutes, watched movie runtime, watched TV runtime where available, and completed game hours played.",
      },
      book: {
        label: "Audiobook Hours Listened",
        items: completedAudiobookItems,
        minutes: completedAudiobookItems.reduce((sum, item) => sum + item.audiobookMinutes, 0),
        subLabel: `${completedAudiobookItems.length} completed audiobook entries`,
        summary: `Total audiobook hours listened from completed audiobooks in ${scopeLabel}.`,
        calculation: "Sum audiobookMinutes for completed audiobook items in the current scope.",
      },
      movie: {
        label: "Movie Hours Watched",
        items: watchedMovieItems,
        minutes: watchedMovieItems.reduce((sum, item) => sum + item.runtimeMinutes, 0),
        subLabel: `${watchedMovieItems.length} watched movies with runtime`,
        summary: `Total movie hours watched in ${scopeLabel}.`,
        calculation: "Sum movie runtimeMinutes for watched or completed movies in the current scope.",
      },
      tv: {
        label: "TV Show Hours Consumed",
        items: watchedTvItems,
        minutes: watchedTvItems.reduce((sum, item) => sum + item.runtimeMinutes, 0),
        subLabel: `${watchedTvItems.length} completed TV shows with runtime`,
        summary: `Total TV show hours consumed in ${scopeLabel}.`,
        calculation: "Sum TV runtimeMinutes for completed or watched TV shows. If total runtime is missing, estimate from episode count and episode runtime; if episode runtime is missing, estimate 45 minutes per episode.",
      },
      game: {
        label: "Game Hours Played",
        items: completedGameItems,
        minutes: completedGameItems.reduce((sum, item) => sum + item.gameplayHours * 60, 0),
        subLabel: `${completedGameItems.length} completed games with hours`,
        summary: `Total game hours played for completed games in ${scopeLabel}.`,
        calculation: "Sum gameplayHours for completed games in the current scope.",
      },
    }[filter];
    const mediaYearScopeLabel = filter === "all" ? "media entries" : MEDIA_LABELS[filter].toLowerCase();
    const mediaYearLabel =
      filter === "all" ? "Most Popular Media Year" : `Most Popular ${MEDIA_LABELS[filter].replace("TV Shows", "TV Show")} Year`;
    const consumedHoursMetric = {
      id: `BASE_${scopeId}_TOTAL_HOURS_CONSUMED`,
      label: durationMetricByFilter.label,
      value: formatMinutesAsHours(durationMetricByFilter.minutes),
      subLabel: durationMetricByFilter.subLabel,
      accent: "var(--stats-accent-4)",
      summary: durationMetricByFilter.summary,
      calculation: durationMetricByFilter.calculation,
      items: durationMetricByFilter.items,
    };

    return [
      {
        id: `BASE_${scopeId}_LIBRARY_SIZE`,
        label: "Library Size",
        value: `${total}`,
        subLabel:
          filter === "all"
            ? selectedStatsYear === ALL_STATS_YEARS
              ? "all media items across all years"
              : `all media items in ${selectedStatsYear}`
            : selectedStatsYear === ALL_STATS_YEARS
              ? `${MEDIA_LABELS[filter]} across all years`
              : `${MEDIA_LABELS[filter]} in ${selectedStatsYear}`,
        accent: "var(--stats-accent-1)",
        summary: `Counts all items in scope: ${scopeLabel}.`,
        calculation: "Count(filteredItems).",
        items: filteredItems,
      },
      {
        id: `BASE_${scopeId}_COMPLETION`,
        label: "Completion",
        value: `${completionRate.toFixed(0)}%`,
        subLabel: `${completed} completed`,
        accent: "var(--stats-accent-2)",
        summary: `Completion ratio for ${scopeLabel}.`,
        calculation: "completion % = completedCount / totalCount * 100, where completed=statusBucket=completed.",
        items: filteredItems.filter((item) => item.statusBucket === "completed"),
      },
      {
        id: `BASE_${scopeId}_AVERAGE_RATING`,
        label: "Average Rating",
        value: averageRatingDisplay,
        subLabel: `${ratingValues.length} rated titles`,
        accent: "var(--stats-accent-3)",
        summary: isBookScope
          ? `Average personal rating for rated books in ${scopeLabel}, shown as a 5-star value.`
          : `Average personal rating for rated items in ${scopeLabel}.`,
        calculation: isBookScope
          ? "Mean(filteredItems.rating where rating is numeric); for books, display as /5 with stars."
          : "Mean(filteredItems.rating where rating is numeric).",
        items: ratedItems,
      },
      consumedHoursMetric,
    ];
  }, [averageRating, filter, filteredItems, ratingValues.length, selectedStatsYear, statusCounts.completed]);

  const filterOptions: Array<{ key: StatsTab; label: string }> = [
    { key: "all", label: "Everything" },
    { key: "book", label: "Books" },
    { key: "movie", label: "Movies" },
    { key: "tv", label: "TV Shows" },
    { key: "game", label: "Games" },
    { key: "yearReview", label: "Year in Review" },
  ];

  const statsThemeVars = useMemo(() => {
    const themeMap: Record<"light" | "dark" | "classic", Record<string, string>> = {
      light: {
        "--stats-bg": "#ecececf0",
        "--stats-card": "linear-gradient(156deg, rgba(30, 59, 106, 0.84), rgba(16, 34, 70, 0.92))",
        "--stats-border": "rgba(122, 156, 201, 0.38)",
        "--stats-text": "rgba(233, 243, 255, 0.96)",
        "--stats-muted": "rgba(191, 211, 240, 0.84)",
        "--stats-heading-primary": "rgba(48, 78, 122, 0.96)",
        "--stats-heading-secondary": "rgba(72, 101, 142, 0.95)",
        "--stats-glow-1": "rgba(140, 158, 186, 0.18)",
        "--stats-glow-2": "rgba(176, 188, 206, 0.14)",
      },
      dark: {
        "--stats-bg": "#1b1f26f0",
        "--stats-card": "linear-gradient(156deg, rgba(30, 59, 106, 0.82), rgba(16, 34, 70, 0.9))",
        "--stats-border": "rgba(125, 171, 242, 0.3)",
        "--stats-text": "rgba(233, 243, 255, 0.96)",
        "--stats-muted": "rgba(191, 211, 240, 0.8)",
        "--stats-heading-primary": "rgba(222, 235, 252, 0.98)",
        "--stats-heading-secondary": "rgba(192, 212, 242, 0.95)",
        "--stats-glow-1": "rgba(78, 144, 250, 0.25)",
        "--stats-glow-2": "rgba(43, 218, 170, 0.19)",
      },
      classic: {
        "--stats-bg": "#d8cdb8f0",
        "--stats-card": "linear-gradient(156deg, rgba(30, 59, 106, 0.84), rgba(16, 34, 70, 0.92))",
        "--stats-border": "rgba(140, 175, 228, 0.34)",
        "--stats-text": "rgba(236, 243, 252, 0.96)",
        "--stats-muted": "rgba(196, 212, 236, 0.82)",
        "--stats-heading-primary": "rgba(236, 228, 210, 0.98)",
        "--stats-heading-secondary": "rgba(222, 212, 193, 0.95)",
        "--stats-glow-1": "rgba(192, 120, 0, 0.14)",
        "--stats-glow-2": "rgba(139, 146, 13, 0.1)",
      },
    };

    return {
      ...themeMap[themeMode],
      // App/logo-inspired accents for consistent branding across stats modules.
      "--stats-accent-1": "#8baff4",
      "--stats-accent-2": "#8b920d",
      "--stats-accent-3": "#c07800",
      "--stats-accent-4": "#8baff4",
    } as CSSProperties;
  }, [themeMode]);

  return (
    <section className="statsRoot" style={statsThemeVars}>
      <div className="statsBackgroundGlow" aria-hidden />

      <header className="statsHeader">
        <div className="statsHeaderIntro">
          {onExit ? (
            <button type="button" className="statsExitButton" onClick={onExit}>
              Back to Library
            </button>
          ) : null}
          <h1 className="statsTitle">Statistics</h1>
          <p className="statsSubtitle">
            {activeTab === "yearReview"
              ? `Your ${selectedReviewYear} annual wrap-up with year-over-year comparisons.`
              : filter === "all"
              ? selectedStatsYear === ALL_STATS_YEARS
                ? "High-level trends across your full library."
                : `High-level trends across your full library in ${selectedStatsYear}.`
              : selectedStatsYear === ALL_STATS_YEARS
                ? `Focused stats for ${MEDIA_LABELS[filter]} across all years.`
                : `Focused stats for ${MEDIA_LABELS[filter]} in ${selectedStatsYear}.`}
          </p>
        </div>
        <div className="statsHeaderControls">
          <div className="statsTabs" role="tablist" aria-label="Media filter">
            {filterOptions.map((option) => {
              const active = option.key === activeTab;
              const tabColor = mediaTabColors[option.key];
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`statsTab ${active ? "active" : ""}`}
                  onClick={() => setActiveTab(option.key)}
                  style={
                    tabColor
                      ? ({
                          ["--stats-tab-active-bg" as string]: tabColor,
                        } as CSSProperties)
                      : undefined
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          {activeTab === "yearReview" ? null : (
            <label className="yearReviewPicker statsYearPicker">
              <span>Year</span>
              <select
                value={selectedStatsYear}
                onChange={(event) => {
                  const value = event.target.value;
                  setStatsYear(value === ALL_STATS_YEARS ? ALL_STATS_YEARS : Number(value));
                }}
              >
                <option value={ALL_STATS_YEARS}>All</option>
                {reviewYearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      </header>

      {activeTab === "yearReview" ? (
        <>
          <div className="yearReviewHero">
            <div className="yearReviewHeroMain">
              <span className="yearReviewEyebrow">Year in Review</span>
              <h2 className="yearReviewTitle">{selectedReviewYear} Year in Review</h2>
              <p className="yearReviewSubtitle">
                Your media story for the year: what you watched, read, played, finished, and dropped.
              </p>
            </div>
            <div className="yearReviewHeroControls">
              <div className="yearReviewHeroActions">
                <button
                  type="button"
                  className="wrappedLaunchButton"
                  onClick={() => {
                    setWrappedSlideIndex(0);
                    setIsWrappedOpen(true);
                  }}
                >
                  CDL Wrapped v1
                </button>
                <label className="yearReviewPicker">
                  <span>Year</span>
                  <select value={selectedReviewYear} onChange={(event) => setReviewYear(Number(event.target.value))}>
                    {reviewYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <span className="yearReviewPickerHint">Switch years to compare your trends and highlights.</span>
            </div>
          </div>

          <div className="statsSummaryGrid">
            {yearReviewMetrics.map((metric, index) => (
              <article
                key={`${metric.label}-${selectedReviewYear}`}
                className="metricCard metricCardInteractive"
                role="button"
                tabIndex={0}
                aria-label={`Open details for ${metric.label}`}
                onClick={() =>
                  openStatisticDetail({
                    id: metric.id,
                    title: metric.label,
                    value: metric.value,
                    summary: metric.summary,
                    calculation: metric.calculation,
                    items: metric.items,
                  })
                }
                onKeyDown={(event) =>
                  handleInteractiveKeyDown(event, () =>
                    openStatisticDetail({
                      id: metric.id,
                      title: metric.label,
                      value: metric.value,
                      summary: metric.summary,
                      calculation: metric.calculation,
                      items: metric.items,
                    })
                  )
                }
                style={{
                  animationDelay: `${index * 80}ms`,
                  ["--metric-accent" as string]: metric.accent,
                }}
              >
                <div className="metricLabel">{metric.label}</div>
                <div className={`metricValue ${metric.id.includes("_AVERAGE_RATING") ? "metricValueCompact" : ""}`}>{metric.value}</div>
                <div className="metricSubLabel">{metric.subLabel}</div>
              </article>
            ))}
          </div>

          <div className="statsGrid">
            <article
              className="statsCard spanTwo statsCardInteractive"
              role="button"
              tabIndex={0}
              aria-label="Open details for Year in Review storyline"
              onClick={() =>
                openStatisticDetail({
                  id: `YR_${selectedReviewYear}_STORYLINE`,
                  title: `${selectedReviewYear} Storyline`,
                  value: `${yearReview.yearItems.length}`,
                  summary: `All items logged in ${selectedReviewYear} using the Year in Review anchor date logic.`,
                  calculation: "Items where (activityDate || completionDate || releaseDate) is in selected review year.",
                  items: yearReview.yearItems,
                })
              }
              onKeyDown={(event) =>
                handleInteractiveKeyDown(event, () =>
                  openStatisticDetail({
                    id: `YR_${selectedReviewYear}_STORYLINE`,
                    title: `${selectedReviewYear} Storyline`,
                    value: `${yearReview.yearItems.length}`,
                    summary: `All items logged in ${selectedReviewYear} using the Year in Review anchor date logic.`,
                    calculation: "Items where (activityDate || completionDate || releaseDate) is in selected review year.",
                    items: yearReview.yearItems,
                  })
                )
              }
            >
              <div className="cardHeader">
                <h2>Storyline</h2>
                <span>{yearReview.yearItems.length} logged</span>
              </div>
              <div className="yearStoryBody">
                <p>
                  You logged <strong>{yearReview.yearItems.length}</strong> titles in {selectedReviewYear}, with{" "}
                  <strong>{yearReview.completedTotal}</strong> completed and <strong>{yearReview.abandonedCount}</strong>{" "}
                  abandoned.
                </p>
                <p>
                  {yearReview.busiestMonth && !isExcludedBusiestMonthKey(yearReview.busiestMonth.key)
                    ? `Peak month: ${yearReview.busiestMonth.label} with ${yearReview.busiestMonth.count} logged titles.`
                    : "No monthly trend data yet for this year."}
                </p>
                <div className="yearStoryChips">
                  <div
                    className="yearStoryChip yearStoryChipInteractive"
                    role="button"
                    tabIndex={0}
                    aria-label="Open details for leading genre"
                    onClick={(event) => {
                      event.stopPropagation();
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_STORY_LEADING_GENRE`,
                        title: "Storyline: Leading Genre",
                        value: yearReview.topGenre ? yearReview.topGenre.name : "-",
                        summary: "Most frequent genre among items logged this review year.",
                        calculation: "Count genre occurrences across yearReview.yearItems and take highest count.",
                        items: yearReview.topGenre
                          ? yearReview.yearItems.filter((item) => item.genres.includes(yearReview.topGenre?.name || ""))
                          : [],
                      });
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `YR_${selectedReviewYear}_STORY_LEADING_GENRE`,
                          title: "Storyline: Leading Genre",
                          value: yearReview.topGenre ? yearReview.topGenre.name : "-",
                          summary: "Most frequent genre among items logged this review year.",
                          calculation: "Count genre occurrences across yearReview.yearItems and take highest count.",
                          items: yearReview.topGenre
                            ? yearReview.yearItems.filter((item) => item.genres.includes(yearReview.topGenre?.name || ""))
                            : [],
                        })
                      );
                    }}
                  >
                    <span>Genre of the Year</span>
                    <strong>{yearReview.topGenre ? yearReview.topGenre.name : "-"}</strong>
                  </div>
                  <div
                    className="yearStoryChip yearStoryChipInteractive"
                    role="button"
                    tabIndex={0}
                    aria-label="Open details for favorite medium"
                    onClick={(event) => {
                      event.stopPropagation();
                      const mediumRows = [
                        { key: "book" as const, label: "Books", value: yearReview.mediaCounts.book },
                        { key: "movie" as const, label: "Movies", value: yearReview.mediaCounts.movie },
                        { key: "tv" as const, label: "TV Shows", value: yearReview.mediaCounts.tv },
                        { key: "game" as const, label: "Games", value: yearReview.mediaCounts.game },
                      ];
                      const favorite = [...mediumRows].sort((a, b) => b.value - a.value)[0];
                      const total = Math.max(1, yearReview.yearItems.length);
                      const share = Math.round((favorite.value / total) * 100);
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_STORY_FAVORITE_MEDIUM`,
                        title: "Storyline: Favorite Medium",
                        value: `${favorite.label} (${share}%)`,
                        summary: "Media type with the highest share of your yearly logs.",
                        calculation: "Count yearReview.yearItems by mediaType, then select the highest-share bucket.",
                        items: yearReview.yearItems.filter((item) => item.mediaType === favorite.key),
                      });
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      const mediumRows = [
                        { key: "book" as const, label: "Books", value: yearReview.mediaCounts.book },
                        { key: "movie" as const, label: "Movies", value: yearReview.mediaCounts.movie },
                        { key: "tv" as const, label: "TV Shows", value: yearReview.mediaCounts.tv },
                        { key: "game" as const, label: "Games", value: yearReview.mediaCounts.game },
                      ];
                      const favorite = [...mediumRows].sort((a, b) => b.value - a.value)[0];
                      const total = Math.max(1, yearReview.yearItems.length);
                      const share = Math.round((favorite.value / total) * 100);
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `YR_${selectedReviewYear}_STORY_FAVORITE_MEDIUM`,
                          title: "Storyline: Favorite Medium",
                          value: `${favorite.label} (${share}%)`,
                          summary: "Media type with the highest share of your yearly logs.",
                          calculation: "Count yearReview.yearItems by mediaType, then select the highest-share bucket.",
                          items: yearReview.yearItems.filter((item) => item.mediaType === favorite.key),
                        })
                      );
                    }}
                  >
                    <span>Favorite Medium</span>
                    <strong>
                      {(() => {
                        const mediumRows = [
                          { label: "Books", value: yearReview.mediaCounts.book },
                          { label: "Movies", value: yearReview.mediaCounts.movie },
                          { label: "TV Shows", value: yearReview.mediaCounts.tv },
                          { label: "Games", value: yearReview.mediaCounts.game },
                        ];
                        const favorite = [...mediumRows].sort((a, b) => b.value - a.value)[0];
                        const total = Math.max(1, yearReview.yearItems.length);
                        const share = Math.round((favorite.value / total) * 100);
                        return `${favorite.label} (${share}%)`;
                      })()}
                    </strong>
                  </div>
                  <div
                    className="yearStoryChip yearStoryChipInteractive"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for games completed vs ${previousReviewYear}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_STORY_GAMES_VS_${previousReviewYear}`,
                        title: `Storyline: Games Completed vs ${previousReviewYear}`,
                        value: `${yearReview.completedGames}`,
                        summary: `Games completed in ${selectedReviewYear} compared against ${previousReviewYear}.`,
                        calculation: "Filter year items where mediaType=game and completionDate year equals selected review year.",
                        items: yearReview.yearItems.filter(
                          (item) => item.mediaType === "game" && item.completionDate?.getUTCFullYear() === selectedReviewYear
                        ),
                      });
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `YR_${selectedReviewYear}_STORY_GAMES_VS_${previousReviewYear}`,
                          title: `Storyline: Games Completed vs ${previousReviewYear}`,
                          value: `${yearReview.completedGames}`,
                          summary: `Games completed in ${selectedReviewYear} compared against ${previousReviewYear}.`,
                          calculation: "Filter year items where mediaType=game and completionDate year equals selected review year.",
                          items: yearReview.yearItems.filter(
                            (item) => item.mediaType === "game" && item.completionDate?.getUTCFullYear() === selectedReviewYear
                          ),
                        })
                      );
                    }}
                  >
                    <span>Games vs {previousReviewYear}</span>
                    <strong>
                      {yearReview.completedGames === yearReview.completedGamesPrev
                        ? "No change"
                        : yearReview.completedGames > yearReview.completedGamesPrev
                          ? `Up ${yearReview.completedGames - yearReview.completedGamesPrev}`
                          : `Down ${yearReview.completedGamesPrev - yearReview.completedGames}`}
                    </strong>
                  </div>
                </div>
              </div>
            </article>

            <article className="statsCard">
              <div className="cardHeader">
                <h2>Top Rated Pick</h2>
                <span>{getPersonalRatingBadgeLabel(yearReview.topRated) || "-"}</span>
              </div>
              {yearReview.topRated ? (
                <div
                  className="yearSpotlightBody yearSpotlightBodyInteractive"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open details for top rated pick ${yearReview.topRated.title}`}
                  onClick={() =>
                    openStatisticDetail({
                      id: `YR_${selectedReviewYear}_TOP_RATED_PICK`,
                      title: "Top Rated Pick",
                      value: formatPersonalRatingDisplay(yearReview.topRated),
                      summary: "Highest-rated item in the selected review year.",
                      calculation: "Sort rated year items by normalized rating desc (books mapped from /5 to /10), then date desc, then title; pick first.",
                      items: yearReview.topRated ? [yearReview.topRated] : [],
                    })
                  }
                  onKeyDown={(event) =>
                    handleInteractiveKeyDown(event, () =>
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_TOP_RATED_PICK`,
                        title: "Top Rated Pick",
                        value: formatPersonalRatingDisplay(yearReview.topRated),
                        summary: "Highest-rated item in the selected review year.",
                        calculation: "Sort rated year items by normalized rating desc (books mapped from /5 to /10), then date desc, then title; pick first.",
                        items: yearReview.topRated ? [yearReview.topRated] : [],
                      })
                    )
                  }
                >
                  <div className="yearSpotlightCover">
                    {getPersonalRatingBadgeLabel(yearReview.topRated) ? (
                      <div className="statsCoverRatingBadge">
                        {getPersonalRatingBadgeLabel(yearReview.topRated)}
                      </div>
                    ) : null}
                    {yearReview.topRated.coverUrl ? (
                      <img
                        src={yearReview.topRated.coverUrl}
                        alt={`${yearReview.topRated.title} cover`}
                        loading="lazy"
                        style={COVER_IMAGE_RADIUS_STYLE}
                      />
                    ) : (
                      <div className="yearSpotlightFallback">No Cover</div>
                    )}
                  </div>
                  <div className="yearSpotlightMeta">
                    <div className="yearSpotlightTitle">{yearReview.topRated.title}</div>
                    <div className="yearSpotlightNote">{MEDIA_LABELS[yearReview.topRated.mediaType]}</div>
                  </div>
                </div>
              ) : (
                <div className="cardEmpty">No rated items logged in {selectedReviewYear}.</div>
              )}
            </article>

            <article className="statsCard">
              <div className="cardHeader">
                <h2>Longest Audiobook</h2>
                <span>{yearReview.longestAudiobook ? formatMinutesAsHours(yearReview.longestAudiobook.audiobookMinutes) : "-"}</span>
              </div>
              {yearReview.longestAudiobook ? (
                <div
                  className="yearSpotlightBody yearSpotlightBodyInteractive"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open details for longest audiobook ${yearReview.longestAudiobook.title}`}
                  onClick={() =>
                    openStatisticDetail({
                      id: `YR_${selectedReviewYear}_LONGEST_AUDIOBOOK`,
                      title: "Longest Audiobook",
                      value: formatMinutesAsHours(yearReview.longestAudiobook?.audiobookMinutes || 0),
                      summary: "Book with the greatest audiobook duration in the selected review year.",
                      calculation:
                        'Filter items where mediaType=book, primaryStatusToken=="completed", completionDate year==selected review year, and audiobookMinutes>0; sort descending by audiobookMinutes, pick first.',
                      items: yearReview.longestAudiobook ? [yearReview.longestAudiobook] : [],
                    })
                  }
                  onKeyDown={(event) =>
                    handleInteractiveKeyDown(event, () =>
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_LONGEST_AUDIOBOOK`,
                        title: "Longest Audiobook",
                        value: formatMinutesAsHours(yearReview.longestAudiobook?.audiobookMinutes || 0),
                        summary: "Book with the greatest audiobook duration in the selected review year.",
                        calculation:
                          'Filter items where mediaType=book, primaryStatusToken=="completed", completionDate year==selected review year, and audiobookMinutes>0; sort descending by audiobookMinutes, pick first.',
                        items: yearReview.longestAudiobook ? [yearReview.longestAudiobook] : [],
                      })
                    )
                  }
                >
                  <div className="yearSpotlightCover">
                    {yearReview.longestAudiobook.coverUrl ? (
                      <img
                        src={yearReview.longestAudiobook.coverUrl}
                        alt={`${yearReview.longestAudiobook.title} cover`}
                        loading="lazy"
                        style={COVER_IMAGE_RADIUS_STYLE}
                      />
                    ) : (
                      <div className="yearSpotlightFallback">No Cover</div>
                    )}
                  </div>
                  <div className="yearSpotlightMeta">
                    <div className="yearSpotlightTitle">{yearReview.longestAudiobook.title}</div>
                    <div className="yearSpotlightNote">{formatMinutesAsHours(yearReview.longestAudiobook.audiobookMinutes)} listened</div>
                  </div>
                </div>
              ) : (
                <div className="cardEmpty">No audiobook duration data in {selectedReviewYear}.</div>
              )}
            </article>

            <article className="statsCard">
              <div className="cardHeader">
                <h2>Most Played Game</h2>
                <span>{yearReview.mostPlayedGame ? formatHours(yearReview.mostPlayedGame.gameplayHours) : "-"}</span>
              </div>
              {yearReview.mostPlayedGame ? (
                <div
                  className="yearSpotlightBody yearSpotlightBodyInteractive"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open details for most played game ${yearReview.mostPlayedGame.title}`}
                  onClick={() =>
                    openStatisticDetail({
                      id: `YR_${selectedReviewYear}_MOST_PLAYED_GAME`,
                      title: "Most Played Game",
                      value: formatHours(yearReview.mostPlayedGame?.gameplayHours || 0),
                      summary: "Game with the highest logged playtime in the selected review year.",
                      calculation: "Filter year games where playedYears includes selected year and gameplayHours>0, sort desc by gameplayHours, pick first.",
                      items: yearReview.mostPlayedGame ? [yearReview.mostPlayedGame] : [],
                    })
                  }
                  onKeyDown={(event) =>
                    handleInteractiveKeyDown(event, () =>
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_MOST_PLAYED_GAME`,
                        title: "Most Played Game",
                        value: formatHours(yearReview.mostPlayedGame?.gameplayHours || 0),
                        summary: "Game with the highest logged playtime in the selected review year.",
                        calculation: "Filter year games where playedYears includes selected year and gameplayHours>0, sort desc by gameplayHours, pick first.",
                        items: yearReview.mostPlayedGame ? [yearReview.mostPlayedGame] : [],
                      })
                    )
                  }
                >
                  <div className="yearSpotlightCover">
                    {yearReview.mostPlayedGame.coverUrl ? (
                      <img
                        src={yearReview.mostPlayedGame.coverUrl}
                        alt={`${yearReview.mostPlayedGame.title} cover`}
                        loading="lazy"
                        style={COVER_IMAGE_RADIUS_STYLE}
                      />
                    ) : (
                      <div className="yearSpotlightFallback">No Cover</div>
                    )}
                  </div>
                  <div className="yearSpotlightMeta">
                    <div className="yearSpotlightTitle">{yearReview.mostPlayedGame.title}</div>
                    <div className="yearSpotlightNote">{formatHours(yearReview.mostPlayedGame.gameplayHours)} played</div>
                  </div>
                </div>
              ) : (
                <div className="cardEmpty">No game playtime data in {selectedReviewYear}.</div>
              )}
            </article>

            <article className="statsCard">
              <div className="cardHeader">
                <h2>Lowest Rated Item</h2>
                <span>{getPersonalRatingBadgeLabel(yearReview.lowestRated) || "-"}</span>
              </div>
              {yearReview.lowestRated ? (
                <div
                  className="yearSpotlightBody yearSpotlightBodyInteractive"
                  role="button"
                  tabIndex={0}
                  aria-label={`Open details for lowest rated item ${yearReview.lowestRated.title}`}
                  onClick={() =>
                    openStatisticDetail({
                      id: `YR_${selectedReviewYear}_LOWEST_RATED_ITEM`,
                      title: "Lowest Rated Item",
                      value: formatPersonalRatingDisplay(yearReview.lowestRated),
                      summary: "Lowest-rated item in the selected review year.",
                      calculation: "Sort rated year items by normalized rating asc (books mapped from /5 to /10), then date desc, then title; pick first.",
                      items: yearReview.lowestRated ? [yearReview.lowestRated] : [],
                    })
                  }
                  onKeyDown={(event) =>
                    handleInteractiveKeyDown(event, () =>
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_LOWEST_RATED_ITEM`,
                        title: "Lowest Rated Item",
                        value: formatPersonalRatingDisplay(yearReview.lowestRated),
                        summary: "Lowest-rated item in the selected review year.",
                        calculation: "Sort rated year items by normalized rating asc (books mapped from /5 to /10), then date desc, then title; pick first.",
                        items: yearReview.lowestRated ? [yearReview.lowestRated] : [],
                      })
                    )
                  }
                >
                  <div className="yearSpotlightCover">
                    {getPersonalRatingBadgeLabel(yearReview.lowestRated) ? (
                      <div className="statsCoverRatingBadge">
                        {getPersonalRatingBadgeLabel(yearReview.lowestRated)}
                      </div>
                    ) : null}
                    {yearReview.lowestRated.coverUrl ? (
                      <img
                        src={yearReview.lowestRated.coverUrl}
                        alt={`${yearReview.lowestRated.title} cover`}
                        loading="lazy"
                        style={COVER_IMAGE_RADIUS_STYLE}
                      />
                    ) : (
                      <div className="yearSpotlightFallback">No Cover</div>
                    )}
                  </div>
                  <div className="yearSpotlightMeta">
                    <div className="yearSpotlightTitle">{yearReview.lowestRated.title}</div>
                    <div className="yearSpotlightNote">{MEDIA_LABELS[yearReview.lowestRated.mediaType]}</div>
                  </div>
                </div>
              ) : (
                <div className="cardEmpty">No rated items logged in {selectedReviewYear}.</div>
              )}
            </article>

            <article
              className="statsCard spanFull statsCardInteractive"
              role="button"
              tabIndex={0}
              aria-label={`Open details for Top 20 rated in ${selectedReviewYear}`}
              onClick={() =>
                openStatisticDetail({
                  id: `YR_${selectedReviewYear}_TOP20_RATED`,
                  title: `Top 20 Rated in ${selectedReviewYear}`,
                  value: `${yearReview.topRatedItems.length}`,
                  summary: "Top-rated items in the selected review year using personal rating.",
                  calculation: "Sort rated year items by normalized rating desc (books mapped from /5 to /10), then date desc, then title; take top 20.",
                  items: yearReview.topRatedItems,
                })
              }
              onKeyDown={(event) =>
                handleInteractiveKeyDown(event, () =>
                  openStatisticDetail({
                    id: `YR_${selectedReviewYear}_TOP20_RATED`,
                    title: `Top 20 Rated in ${selectedReviewYear}`,
                    value: `${yearReview.topRatedItems.length}`,
                    summary: "Top-rated items in the selected review year using personal rating.",
                    calculation: "Sort rated year items by normalized rating desc (books mapped from /5 to /10), then date desc, then title; take top 20.",
                    items: yearReview.topRatedItems,
                  })
                )
              }
            >
              <div className="cardHeader">
                <h2>Top 20 Rated in {selectedReviewYear}</h2>
                <span>{yearReview.topRatedItems.length} ranked</span>
              </div>
              {yearReview.topRatedItems.length > 0 ? (
                <div className="yearTopRatedGrid">
                  {yearReview.topRatedItems.map((item, index) => (
                    <figure
                      key={`${index + 1}-${item.mediaType}-${item.title}`}
                      className="yearTopRatedTile yearTopRatedTileInteractive"
                      title={`${index + 1}. ${item.title} ($)`}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        openStatisticDetail({
                          id: `YR_${selectedReviewYear}_TOP20_ITEM_${index + 1}`,
                          title: `Top 20 Item #${index + 1}`,
                          value: formatPersonalRatingDisplay(item),
                          summary: "Single item from the Year in Review top-20 rated list.",
                          calculation: "Selected index from sorted year top-rated list.",
                          items: [item],
                        });
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        handleInteractiveKeyDown(event, () =>
                          openStatisticDetail({
                            id: `YR_${selectedReviewYear}_TOP20_ITEM_${index + 1}`,
                            title: `Top 20 Item #${index + 1}`,
                            value: formatPersonalRatingDisplay(item),
                            summary: "Single item from the Year in Review top-20 rated list.",
                            calculation: "Selected index from sorted year top-rated list.",
                            items: [item],
                          })
                        );
                      }}
                    >
                      <div className="yearTopRatedMedia">
                        <div className="yearTopRatedRank">#{index + 1}</div>
                        {getPersonalRatingBadgeLabel(item) ? (
                          <div className="statsCoverRatingBadge">
                            {getPersonalRatingBadgeLabel(item)}
                          </div>
                        ) : null}
                        {item.coverUrl ? (
                          <img
                            className={getTop20CoverClass(item)}
                            src={item.coverUrl}
                            alt={`${item.title} cover`}
                            loading="lazy"
                            style={COVER_IMAGE_RADIUS_STYLE}
                          />
                        ) : (
                          <div className="yearSpotlightFallback">No Cover</div>
                        )}
                      </div>
                      <figcaption>
                        <span className="yearTopRatedTitle">{item.title}</span>
                        <span className="yearTopRatedMeta">
                          
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="cardEmpty">No rated items available for {selectedReviewYear}.</div>
              )}
            </article>

            <article
              className="statsCard spanFull statsCardInteractive"
              role="button"
              tabIndex={0}
              aria-label={`Open details for Bottom 20 rated in ${selectedReviewYear}`}
              onClick={() =>
                openStatisticDetail({
                  id: `YR_${selectedReviewYear}_BOTTOM20_RATED`,
                  title: `Bottom 20 Rated in ${selectedReviewYear}`,
                  value: `${yearReview.bottomRatedItems.length}`,
                  summary: "Lowest-rated items in the selected review year using personal rating.",
                  calculation: "Sort rated year items by normalized rating asc (books mapped from /5 to /10), then date desc, then title; take bottom 20.",
                  items: yearReview.bottomRatedItems,
                })
              }
              onKeyDown={(event) =>
                handleInteractiveKeyDown(event, () =>
                  openStatisticDetail({
                    id: `YR_${selectedReviewYear}_BOTTOM20_RATED`,
                    title: `Bottom 20 Rated in ${selectedReviewYear}`,
                    value: `${yearReview.bottomRatedItems.length}`,
                    summary: "Lowest-rated items in the selected review year using personal rating.",
                    calculation: "Sort rated year items by normalized rating asc (books mapped from /5 to /10), then date desc, then title; take bottom 20.",
                    items: yearReview.bottomRatedItems,
                  })
                )
              }
            >
              <div className="cardHeader">
                <h2>Bottom 20 Rated in {selectedReviewYear}</h2>
                <span>{yearReview.bottomRatedItems.length} ranked</span>
              </div>
              {yearReview.bottomRatedItems.length > 0 ? (
                <div className="yearTopRatedGrid">
                  {yearReview.bottomRatedItems.map((item, index) => (
                    <figure
                      key={`${index + 1}-${item.mediaType}-${item.title}-bottom`}
                      className="yearTopRatedTile yearTopRatedTileInteractive"
                      title={`${index + 1}. ${item.title} ($)`}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        openStatisticDetail({
                          id: `YR_${selectedReviewYear}_BOTTOM20_ITEM_${index + 1}`,
                          title: `Bottom 20 Item #${index + 1}`,
                          value: formatPersonalRatingDisplay(item),
                          summary: "Single item from the Year in Review bottom-20 rated list.",
                          calculation: "Selected index from sorted year bottom-rated list.",
                          items: [item],
                        });
                      }}
                      onKeyDown={(event) => {
                        event.stopPropagation();
                        handleInteractiveKeyDown(event, () =>
                          openStatisticDetail({
                            id: `YR_${selectedReviewYear}_BOTTOM20_ITEM_${index + 1}`,
                            title: `Bottom 20 Item #${index + 1}`,
                            value: formatPersonalRatingDisplay(item),
                            summary: "Single item from the Year in Review bottom-20 rated list.",
                            calculation: "Selected index from sorted year bottom-rated list.",
                            items: [item],
                          })
                        );
                      }}
                    >
                      <div className="yearTopRatedMedia">
                        <div className="yearTopRatedRank">#{index + 1}</div>
                        {getPersonalRatingBadgeLabel(item) ? (
                          <div className="statsCoverRatingBadge">
                            {getPersonalRatingBadgeLabel(item)}
                          </div>
                        ) : null}
                        {item.coverUrl ? (
                          <img
                            className={getTop20CoverClass(item)}
                            src={item.coverUrl}
                            alt={`${item.title} cover`}
                            loading="lazy"
                            style={COVER_IMAGE_RADIUS_STYLE}
                          />
                        ) : (
                          <div className="yearSpotlightFallback">No Cover</div>
                        )}
                      </div>
                      <figcaption>
                        <span className="yearTopRatedTitle">{item.title}</span>
                        <span className="yearTopRatedMeta">
                          
                        </span>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              ) : (
                <div className="cardEmpty">No rated items available for {selectedReviewYear}.</div>
              )}
            </article>
          </div>
        </>
      ) : (
        <div className="statsModeDefault">
      <div className="statsSummaryGrid">
        {metrics.map((metric, index) => (
          <article
            key={metric.label}
            className="metricCard metricCardInteractive"
            role="button"
            tabIndex={0}
            aria-label={`Open details for ${metric.label}`}
            onClick={() =>
              openStatisticDetail({
                id: metric.id,
                title: metric.label,
                value: metric.value,
                summary: metric.summary,
                calculation: metric.calculation,
                items: metric.items,
              })
            }
            onKeyDown={(event) =>
              handleInteractiveKeyDown(event, () =>
                openStatisticDetail({
                  id: metric.id,
                  title: metric.label,
                  value: metric.value,
                  summary: metric.summary,
                  calculation: metric.calculation,
                  items: metric.items,
                })
              )
            }
            style={{
              animationDelay: `${index * 80}ms`,
              ["--metric-accent" as string]: metric.accent,
            }}
          >
            <div className="metricLabel">{metric.label}</div>
            <div className={`metricValue ${metric.id.includes("_AVERAGE_RATING") ? "metricValueCompact" : ""}`}>{metric.value}</div>
            <div className="metricSubLabel">{metric.subLabel}</div>
          </article>
        ))}
      </div>

      <div className="statsGrid">
        <article className="statsCard spanTwo">
          <div className="cardHeader">
            <h2>Activity by Month</h2>
            <span>{monthlySeriesLabel}</span>
          </div>

          {monthlySeries.some((point) => point.total > 0) ? (
            <div className="monthChart">
              {monthlySeries.map((month) => {
                const monthParts = getMonthPartsFromKey(month.key);
                const monthItems = filteredItems.filter((item) => {
                  if (!item.completionDate) return false;
                  return toMonthKey(item.completionDate) === month.key;
                });
                return (
                  <div
                    key={month.key}
                    className="monthColumn monthColumnInteractive"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${month.label}`}
                    onClick={() =>
                      openStatisticDetail({
                        id: `MONTH_${month.key}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                        title: `Activity by Month: ${month.label}`,
                        value: `${month.total}`,
                        summary: `Completed items counted in ${month.label} for the current statistics scope.`,
                        calculation: "Filter items where completionDate month/year equals this month key.",
                        items: monthItems,
                      })
                    }
                    onKeyDown={(event) =>
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `MONTH_${month.key}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                          title: `Activity by Month: ${month.label}`,
                          value: `${month.total}`,
                          summary: `Completed items counted in ${month.label} for the current statistics scope.`,
                          calculation: "Filter items where completionDate month/year equals this month key.",
                          items: monthItems,
                        })
                      )
                    }
                  >
                    <div className="monthBar" title={`${month.label}: ${month.total}`}>
                      {(filter === "all"
                        ? (Object.keys(month.counts) as StatsMediaType[])
                        : ([filter] as StatsMediaType[])
                      ).map((mediaType) => {
                        const value = month.counts[mediaType];
                        if (!value) return null;
                        const pct = (value / monthlyMax) * 100;
                        return (
                          <span
                            key={`${month.key}-${mediaType}`}
                            style={{ height: `${pct}%`, background: MEDIA_COLORS[mediaType] }}
                          />
                        );
                      })}
                    </div>
                    <div className="monthCount" title={`${month.label}: ${month.total} completed`}>
                      {month.total}
                    </div>
                    <div className="monthLabel">
                      <span>{monthParts.month}</span>
                      <span>{monthParts.year}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cardEmpty">Not enough dated activity yet.</div>
          )}

          {filter === "all" ? (
            <div className="legendRow">
              {(Object.keys(MEDIA_LABELS) as StatsMediaType[]).map((mediaType) => (
                <div key={mediaType} className="legendItem">
                  <span className="legendSwatch" style={{ background: MEDIA_COLORS[mediaType] }} />
                  <span>{MEDIA_LABELS[mediaType]}</span>
                  <span className="legendCount">{monthlyMediaTotals[mediaType]}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="statsCard statsCardCompactMini">
          <div className="cardHeader">
            <h2>Genre Orbit</h2>
            <span>{topGenres.reduce((sum, genre) => sum + genre.value, 0)} entries</span>
          </div>

          {topGenres.length > 0 ? (
            <>
              <div className="donutWrap">
                <div className="donut" style={{ background: buildDonutGradient(topGenres) }}>
                  <div className="donutCenter">
                    <div className="donutCenterLabel">Top Genre</div>
                    <div className="donutCenterValue">{topGenres[0]?.name || "-"}</div>
                  </div>
                </div>
              </div>
              <div className="legendList compact">
                {topGenres.map((genre, index) => (
                  <div
                    key={genre.name}
                    className="legendListItem legendListItemInteractive"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for genre ${genre.name}`}
                    onClick={() =>
                      openStatisticDetail({
                        id: `GENRE_${genre.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
                        title: `Genre Orbit: ${genre.name}`,
                        value: `${genre.value}`,
                        summary: `Items in scope tagged with genre "${genre.name}".`,
                        calculation: "Filter items where genres list contains the selected genre.",
                        items: filteredItems.filter((item) => item.genres.includes(genre.name)),
                      })
                    }
                    onKeyDown={(event) =>
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `GENRE_${genre.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
                          title: `Genre Orbit: ${genre.name}`,
                          value: `${genre.value}`,
                          summary: `Items in scope tagged with genre "${genre.name}".`,
                          calculation: "Filter items where genres list contains the selected genre.",
                          items: filteredItems.filter((item) => item.genres.includes(genre.name)),
                        })
                      )
                    }
                  >
                    <span className="legendSwatch" style={{ background: DONUT_COLORS[index % DONUT_COLORS.length] }} />
                    <span className="legendName">{genre.name}</span>
                    <span className="legendValue">{genre.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="cardEmpty">No genre metadata in this selection.</div>
          )}
        </article>

        <article className="statsCard statsCardCompactMini">
          <div className="cardHeader">
            <h2>Status Pulse</h2>
            <span>{statusRows.length} active buckets</span>
          </div>

          {statusRows.length > 0 ? (
            <div
              className="statusVerticalChart"
              style={{ gridTemplateColumns: `repeat(${Math.max(1, statusRows.length)}, minmax(0, 1fr))` }}
            >
              {statusRows.map((entry) => {
                const total = Math.max(1, filteredItems.length);
                const pct = (entry.value / total) * 100;
                return (
                  <div
                    key={entry.bucket}
                    className="statusVerticalCol statusVerticalColInteractive"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${STATUS_LABELS[entry.bucket]} status`}
                    onClick={() =>
                      openStatisticDetail({
                        id: `STATUS_${entry.bucket.toUpperCase()}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                        title: `Status Pulse: ${STATUS_LABELS[entry.bucket]}`,
                        value: `${entry.value}`,
                        summary: `Items in the ${STATUS_LABELS[entry.bucket]} status bucket for the current scope.`,
                        calculation: "Filter items where inferred statusBucket equals selected bucket.",
                        items: filteredItems.filter((item) => item.statusBucket === entry.bucket),
                      })
                    }
                    onKeyDown={(event) =>
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `STATUS_${entry.bucket.toUpperCase()}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                          title: `Status Pulse: ${STATUS_LABELS[entry.bucket]}`,
                          value: `${entry.value}`,
                          summary: `Items in the ${STATUS_LABELS[entry.bucket]} status bucket for the current scope.`,
                          calculation: "Filter items where inferred statusBucket equals selected bucket.",
                          items: filteredItems.filter((item) => item.statusBucket === entry.bucket),
                        })
                      )
                    }
                  >
                    <div className="statusVerticalTrack">
                      <div className="statusVerticalFill" style={{ height: `${pct}%`, background: STATUS_COLORS[entry.bucket] }} />
                    </div>
                    <div className="statusVerticalValue">{entry.value}</div>
                    <div className="statusVerticalLabel">{STATUS_LABELS[entry.bucket]}</div>
                    <div className="statusVerticalPct">{pct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cardEmpty">No status values available.</div>
          )}
        </article>

        <article className="statsCard statsCardCompactMini">
          <div className="cardHeader">
            <h2>Rating Profile</h2>
            <span>{ratingValues.length} ratings</span>
          </div>

          {ratingValues.length > 0 ? (
            <div className="ratingsChart">
              {ratingBuckets.map((bucket) => {
                const pct = ratingValues.length ? (bucket.value / ratingValues.length) * 100 : 0;
                const bucketValue = Number.parseInt(bucket.name, 10);
                const maxBucketValue = Math.max(1, ...ratingBuckets.map((entry) => entry.value));
                const bucketItems = filteredItems.filter((item) => {
                  if (typeof item.rating !== "number" || !Number.isFinite(item.rating)) return false;
                  const rounded = Math.max(1, Math.min(10, Math.round(item.rating)));
                  return rounded === bucketValue;
                });
                const scaledHeight = `${(bucket.value / maxBucketValue) * 100}%`;
                const hasData = bucket.value > 0;
                return (
                  <div
                    key={bucket.name}
                    className="ratingCol ratingColInteractive"
                    title={`${bucket.name}: ${bucket.value} (${pct.toFixed(1)}%)`}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for rating bucket ${bucket.name}`}
                    onClick={() =>
                      openStatisticDetail({
                        id: `RATING_BUCKET_${bucket.name}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                        title: `Rating Profile: ${bucket.name}/10`,
                        value: `${bucket.value}`,
                        summary: `Items whose personal rating rounds to ${bucket.name} in this scope.`,
                        calculation: "Round each numeric personal rating to nearest integer (1-10), then count matches for bucket.",
                        items: bucketItems,
                      })
                    }
                    onKeyDown={(event) =>
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `RATING_BUCKET_${bucket.name}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                          title: `Rating Profile: ${bucket.name}/10`,
                          value: `${bucket.value}`,
                          summary: `Items whose personal rating rounds to ${bucket.name} in this scope.`,
                          calculation: "Round each numeric personal rating to nearest integer (1-10), then count matches for bucket.",
                          items: bucketItems,
                        })
                      )
                    }
                  >
                    <div className="ratingBarTrack scaledTrack">
                      <div className={`ratingBar ${hasData ? "hasData" : "noData"}`} style={{ height: scaledHeight }} />
                    </div>
                    <div className="ratingCount">{bucket.value}</div>
                    <div className="ratingLabel">{bucket.name}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cardEmpty">No ratings in this view.</div>
          )}
        </article>

        <article className="statsCard">
          <div className="cardHeader">
            <h2>Release by Year</h2>
            <span>{releaseYearSeries.length ? `${releaseYearSeries[0].year} - ${releaseYearSeries[releaseYearSeries.length - 1].year}` : "No dates"}</span>
          </div>

          {releaseYearSeries.length > 0 ? (
            <div className="releaseLineChartWrap">
              <svg viewBox="0 0 560 120" className="releaseLineSvg" role="img" aria-label="Release count by year">
                <path d={releaseLinePath} className="releaseLinePath" />
                {releaseLinePoints.map((point, index) => {
                  const yearItems = filteredItems.filter((item) => item.releaseDate?.getUTCFullYear() === point.year);
                  const showValueLabel = index % 4 === 0;
                  const valueLabelX = Math.max(14, Math.min(546, point.x));
                  const valueLabelY = Math.max(12, point.y - (index === 0 ? 16 : 10));
                  return (
                    <g
                      key={point.year}
                      className="releaseLinePointGroup"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open details for release year ${point.year}`}
                      onClick={() =>
                        openStatisticDetail({
                          id: `RELEASE_YEAR_${point.year}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                          title: `Release by Year: ${point.year}`,
                          value: `${point.value}`,
                          summary: `Items released in ${point.year}.`,
                          calculation: "Count items where releaseDate year equals selected year.",
                          items: yearItems,
                        })
                      }
                      onKeyDown={(event) =>
                        handleInteractiveKeyDown(event, () =>
                          openStatisticDetail({
                            id: `RELEASE_YEAR_${point.year}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                            title: `Release by Year: ${point.year}`,
                            value: `${point.value}`,
                            summary: `Items released in ${point.year}.`,
                            calculation: "Count items where releaseDate year equals selected year.",
                            items: yearItems,
                          })
                        )
                      }
                    >
                      <circle cx={point.x} cy={point.y} r="3.6" className="releaseLinePoint" />
                      {showValueLabel ? (
                        <text x={valueLabelX} y={valueLabelY} textAnchor="middle" className="releaseLineValueLabel">
                          {point.value}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
              <div className="releaseLineYears">
                {releaseYearSeries.map((entry) => {
                  const isFiveYearMark = entry.year % 5 === 0;
                  return (
                    <span key={entry.year} className={`releaseLineYear ${isFiveYearMark ? "major" : "minor"}`}>
                      {isFiveYearMark ? entry.year : ""}
                    </span>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="cardEmpty">No release dates in this selection.</div>
          )}
        </article>

        <article className="statsCard">
          <div className="cardHeader">
            <h2>{topDimension.label}</h2>
            <span>{topDimension.rows.length} groups</span>
          </div>

          {topDimension.rows.length > 0 ? (
            <div className="barList compactBars">
              {topDimension.rows.map((row) => {
                const max = Math.max(1, ...topDimension.rows.map((entry) => entry.value));
                const pct = (row.value / max) * 100;
                const rowItems = (() => {
                  if (topDimension.label === "Top Platforms") {
                    return filteredItems.filter((item) => item.platforms.includes(row.name));
                  }
                  if (topDimension.label === "Top Formats") {
                    return filteredItems.filter((item) => item.formats.includes(row.name));
                  }
                  if (topDimension.label === "Top Tags") {
                    return filteredItems.filter((item) => item.tags.includes(row.name));
                  }
                  if (topDimension.label === "Top Genres") {
                    return filteredItems.filter((item) => item.genres.includes(row.name));
                  }
                  if (topDimension.label === "Media Mix") {
                    if (row.name === "Books") return filteredItems.filter((item) => item.mediaType === "book");
                    if (row.name === "Movies") return filteredItems.filter((item) => item.mediaType === "movie");
                    if (row.name === "TV Shows") return filteredItems.filter((item) => item.mediaType === "tv");
                    if (row.name === "Games") return filteredItems.filter((item) => item.mediaType === "game");
                  }
                  return [];
                })();
                return (
                  <div
                    key={row.name}
                    className="barRow barRowInteractive"
                    role="button"
                    tabIndex={0}
                    aria-label={`Open details for ${topDimension.label} ${row.name}`}
                    onClick={() =>
                      openStatisticDetail({
                        id: `GROUP_${topDimension.label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${row.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
                        title: `${topDimension.label}: ${row.name}`,
                        value: `${row.value}`,
                        summary: `Items matching group "${row.name}" in ${topDimension.label}.`,
                        calculation: "Group current-scope items by the section dimension and return the selected bucket.",
                        items: rowItems,
                      })
                    }
                    onKeyDown={(event) =>
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `GROUP_${topDimension.label.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${row.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
                          title: `${topDimension.label}: ${row.name}`,
                          value: `${row.value}`,
                          summary: `Items matching group "${row.name}" in ${topDimension.label}.`,
                          calculation: "Group current-scope items by the section dimension and return the selected bucket.",
                          items: rowItems,
                        })
                      )
                    }
                  >
                    <div className="barRowLabel">{row.name}</div>
                    <div className="barTrack">
                      <div className="barFill gradient" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="barRowValue">{row.value}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cardEmpty">No grouped data available yet.</div>
          )}
        </article>

        <article className="statsCard spanTwo">
          <div className="cardHeader">
            <h2>Highlights</h2>
            <span>{statsYearLabel}</span>
          </div>
          <div className="highlightsGrid">
            <div className="highlightItem">
              <div className="highlightLabel">
                {selectedStatsYear === ALL_STATS_YEARS ? "Logged (all years)" : `Logged in ${selectedStatsYear}`}
              </div>
              <button
                type="button"
                className="highlightValueButton"
                onClick={() =>
                  openStatisticDetail({
                    id: `HIGHLIGHT_LOGGED_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                    title: selectedStatsYear === ALL_STATS_YEARS ? "Logged (all years)" : `Logged in ${selectedStatsYear}`,
                    value: `${highlightStats.yearLogged}`,
                    summary: "Count of items logged in the selected stats scope.",
                    calculation:
                      selectedStatsYear === ALL_STATS_YEARS
                        ? "Count all filtered items."
                        : "Count filtered items where activityDate year matches selected year, plus games with playedYears containing selected year.",
                    items:
                      selectedStatsYear === ALL_STATS_YEARS
                        ? filteredItems
                        : filteredItems.filter((item) => {
                            const activityInYear = item.activityDate?.getUTCFullYear() === selectedStatsYear;
                            const playedInYear = item.mediaType === "game" && item.playedYears.includes(selectedStatsYear);
                            return activityInYear || playedInYear;
                          }),
                  })
                }
              >
                {highlightStats.yearLogged}
              </button>
            </div>
            <div className="highlightItem">
              <div className="highlightLabel">
                {selectedStatsYear === ALL_STATS_YEARS ? "Completed (all years)" : `Completed in ${selectedStatsYear}`}
              </div>
              <button
                type="button"
                className="highlightValueButton"
                onClick={() =>
                  openStatisticDetail({
                    id: `HIGHLIGHT_COMPLETED_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                    title: selectedStatsYear === ALL_STATS_YEARS ? "Completed (all years)" : `Completed in ${selectedStatsYear}`,
                    value: `${highlightStats.yearCompleted}`,
                    summary: "Count of items with a completion date in the selected scope.",
                    calculation:
                      selectedStatsYear === ALL_STATS_YEARS
                        ? "Count filtered items where completionDate exists."
                        : "Count filtered items where completionDate year equals selected year.",
                    items:
                      selectedStatsYear === ALL_STATS_YEARS
                        ? filteredItems.filter((item) => Boolean(item.completionDate))
                        : filteredItems.filter((item) => item.completionDate?.getUTCFullYear() === selectedStatsYear),
                  })
                }
              >
                {highlightStats.yearCompleted}
              </button>
            </div>
            <div className="highlightItem">
              <div className="highlightLabel">Busiest month</div>
              <button
                type="button"
                className="highlightValueButton"
                onClick={() =>
                  openStatisticDetail({
                    id: `HIGHLIGHT_BUSIEST_MONTH_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                    title: "Busiest month",
                    value:
                      highlightStats.bestMonth && !isExcludedBusiestMonthKey(highlightStats.bestMonth.key)
                        ? highlightStats.bestMonth.label
                        : "-",
                    summary: "Month with the highest completion count in the current stats scope.",
                    calculation:
                      "Group monthlySeries by month key using completionDate and choose highest total (excluding protected month keys).",
                    items:
                      highlightStats.bestMonth && !isExcludedBusiestMonthKey(highlightStats.bestMonth.key)
                        ? filteredItems.filter((item) => {
                            if (!item.completionDate) return false;
                            return toMonthKey(item.completionDate) === highlightStats.bestMonth?.key;
                          })
                        : [],
                  })
                }
              >
                {highlightStats.bestMonth && !isExcludedBusiestMonthKey(highlightStats.bestMonth.key)
                  ? highlightStats.bestMonth.label
                  : "-"}
              </button>
            </div>
            <div className="highlightItem">
              <div className="highlightLabel">Leading genre</div>
              <button
                type="button"
                className="highlightValueButton"
                onClick={() =>
                  openStatisticDetail({
                    id: `HIGHLIGHT_LEADING_GENRE_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                    title: "Leading genre",
                    value: highlightStats.topGenre ? highlightStats.topGenre.name : "-",
                    summary: "Most frequent genre in the current stats scope.",
                    calculation: "Count genre occurrences across filtered items and select the highest.",
                    items: highlightStats.topGenre
                      ? filteredItems.filter((item) => item.genres.includes(highlightStats.topGenre?.name || ""))
                      : [],
                  })
                }
              >
                {highlightStats.topGenre ? highlightStats.topGenre.name : "-"}
              </button>
            </div>
            <div className="highlightItem">
              <div className="highlightLabel">{mediaYearLabel}</div>
              <button
                type="button"
                className="highlightValueButton"
                onClick={() =>
                  openStatisticDetail({
                    id: `HIGHLIGHT_MEDIA_YEAR_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                    title: mediaYearLabel,
                    value: highlightStats.mostPopularMediaYear ? highlightStats.mostPopularMediaYear.name : "-",
                    summary: `Release year with the most ${mediaYearScopeLabel} in the current stats scope.`,
                    calculation: `Count releaseDate year across filtered ${mediaYearScopeLabel} and select the highest.`,
                    items: highlightStats.mostPopularMediaYear
                      ? filteredItems.filter(
                          (item) => String(item.releaseDate?.getUTCFullYear() || "") === highlightStats.mostPopularMediaYear?.name
                        )
                      : [],
                  })
                }
              >
                {highlightStats.mostPopularMediaYear
                  ? `${highlightStats.mostPopularMediaYear.name}`
                  : "-"}
              </button>
            </div>
            <div className="highlightItem">
              <div className="highlightLabel">Average Score</div>
              <div className="highlightValue">
                {typeof averageRating === "number" && Number.isFinite(averageRating)
                  ? `${averageRating.toFixed(1)}/10`
                  : "-"}
              </div>
            </div>
          </div>
        </article>

        {filter !== "all" ? (
          <article className="statsCard spanFull">
            <div className="cardHeader">
              <h2>Top 10 Comparison</h2>
              <span>{MEDIA_LABELS[filter]} · {statsYearLabel}</span>
            </div>
            <div className="topRatedComparison">
              <TopRatedColumn
                title="Top 10 Rated by Me"
                items={topMyRatedItems}
                scoreKey="rating"
                filter={filter}
                selectedStatsYear={selectedStatsYear}
                detailIdPrefix="TOP10_MY"
                detailTitlePrefix="Top Rated by Me"
                detailSummary="Individual entry from the Top 10 Rated by Me list."
                detailCalculation="Rank by personal rating desc with date/title tie-breakers."
                emptyMessage={`No personal ratings in the ${statsYearScopePhrase}.`}
                onOpenDetail={openStatisticDetail}
              />

              <TopRatedColumn
                title={EXTERNAL_RATING_LABELS[filter]}
                items={topExternalRatedItems}
                scoreKey="externalRating"
                filter={filter}
                selectedStatsYear={selectedStatsYear}
                detailIdPrefix="TOP10_EXTERNAL"
                detailTitlePrefix="Top External Rated"
                detailSummary="Individual entry from the Top 10 external rating list."
                detailCalculation="Rank by external rating desc with date/title tie-breakers."
                emptyMessage={`No external ratings in the ${statsYearScopePhrase}.`}
                onOpenDetail={openStatisticDetail}
              />
            </div>
          </article>
        ) : null}
      </div>
        </div>
      )}

      {isWrappedOpen && activeWrappedSlide
        ? typeof document !== "undefined"
          ? createPortal(
        <div
          className="wrappedOverlay"
          role="dialog"
          aria-modal="true"
          aria-label={`CDL Wrapped for ${selectedReviewYear}`}
          onClick={() => setIsWrappedOpen(false)}
        >
          <div
            className="wrappedDialog"
            onClick={(event) => event.stopPropagation()}
            style={
              activeWrappedSlide.backdropUrl
                ? ({
                    ["--wrapped-backdrop" as string]: `url("${activeWrappedSlide.backdropUrl}")`,
                  } as CSSProperties)
                : undefined
            }
          >
            <audio ref={audioRef} src={WRAPPED_AUDIO_TRACKS[wrappedTrackIndex].src} loop preload="none" />
            <div className="wrappedHeader">
              <span>{selectedReviewYear} Wrapped</span>
              <button type="button" className="wrappedClose" onClick={() => setIsWrappedOpen(false)}>
                Close
              </button>
            </div>

            <div className={`wrappedStory ${wrappedBackdropFirst ? "wrappedStoryBackdropFirst" : ""}`}>
              <button
                type="button"
                className="wrappedNavEdge wrappedNavEdgeLeft"
                aria-label="Previous slide"
                onClick={() =>
                  setWrappedSlideIndex((current) => (current - 1 + wrappedSlides.length) % wrappedSlides.length)
                }
              >
                ←
              </button>
              <button
                type="button"
                className="wrappedNavEdge wrappedNavEdgeRight"
                aria-label="Next slide"
                onClick={() => setWrappedSlideIndex((current) => (current + 1) % wrappedSlides.length)}
              >
                →
              </button>
              <div
                className="wrappedProgress"
                style={{ gridTemplateColumns: `repeat(${Math.max(1, wrappedSlides.length)}, minmax(0, 1fr))` }}
              >
                {wrappedSlides.map((slide, index) => (
                  <span key={slide.id} className={index === wrappedSlideIndex ? "active" : ""} />
                ))}
              </div>
              <div className="wrappedSlideCount">
                {wrappedSlideIndex + 1} / {wrappedSlides.length}
              </div>
              <div className="wrappedKicker">{activeWrappedSlide.kicker}</div>
              <h3 className="wrappedTitle">{activeWrappedSlide.title}</h3>
              <div className={`wrappedValue ${wrappedIsPlaying ? "isBeat" : ""}`}>{activeWrappedSlide.value}</div>
              <p className="wrappedNote">{activeWrappedSlide.note}</p>
              {activeWrappedSlide.coverUrl && !wrappedBackdropFirst ? (
                <div
                  key={activeWrappedSlide.id}
                  className={`wrappedCoverFrame wrappedCoverSlideIn ${wrappedCoverShape === "square" ? "isSquare" : ""}`}
                >
                  <img
                    src={activeWrappedSlide.coverUrl}
                    alt={`${activeWrappedSlide.title} cover`}
                    loading="lazy"
                    style={COVER_IMAGE_RADIUS_STYLE}
                  />
                </div>
              ) : null}
              <p className="wrappedHint">Use ← / → keys, side arrows, or Prev/Next buttons.</p>
            </div>

            <div className="wrappedControls">
              <div className="wrappedNavButtons">
                <button
                  type="button"
                  onClick={() =>
                    setWrappedSlideIndex((current) => (current - 1 + wrappedSlides.length) % wrappedSlides.length)
                  }
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setWrappedSlideIndex((current) => (current + 1) % wrappedSlides.length)}
                >
                  Next
                </button>
              </div>
              <div className="wrappedAudioButtons">
                <button
                  type="button"
                  onClick={() => {
                    const audio = audioRef.current;
                    if (!audio) return;
                    if (audio.paused) {
                      audio
                        .play()
                        .then(() => {
                          setWrappedIsPlaying(true);
                          setWrappedPlaybackBlocked(false);
                        })
                        .catch(() => {
                          setWrappedIsPlaying(false);
                          setWrappedPlaybackBlocked(true);
                        });
                      return;
                    }
                    audio.pause();
                    setWrappedIsPlaying(false);
                  }}
                >
                  {wrappedIsPlaying ? "Pause Music" : "Play Music"}
                </button>
                <button type="button" onClick={() => setWrappedMuted((current) => !current)}>
                  {wrappedMuted ? "Unmute" : "Mute"}
                </button>
                <button
                  type="button"
                  onClick={() => setWrappedTrackIndex((current) => (current + 1) % WRAPPED_AUDIO_TRACKS.length)}
                >
                  Next Track
                </button>
                <span className="wrappedTrackLabel">{WRAPPED_AUDIO_TRACKS[wrappedTrackIndex].title}</span>
                {wrappedPlaybackBlocked ? (
                  <span className="wrappedTrackLabel">Tap Play Music to start audio</span>
                ) : null}
              </div>
            </div>
          </div>
        </div>,
            document.body
          )
          : null
        : null}

      {activeStatDetail ? (
        <StatDetailModal detail={activeStatDetail} onClose={() => setActiveStatDetail(null)} />
      ) : null}

      <style jsx>{`
        .statsRoot {
          --stats-bg: rgba(8, 20, 44, 0.86);
          --stats-card: linear-gradient(156deg, rgba(30, 59, 106, 0.82), rgba(16, 34, 70, 0.9));
          --stats-border: rgba(125, 171, 242, 0.3);
          --stats-text: rgba(233, 243, 255, 0.96);
          --stats-muted: rgba(191, 211, 240, 0.8);
          --stats-accent-1: #8baff4;
          --stats-accent-2: #8b920d;
          --stats-accent-3: #c07800;
          --stats-accent-4: #8baff4;
          --stats-glow-1: rgba(78, 144, 250, 0.25);
          --stats-glow-2: rgba(43, 218, 170, 0.19);
          position: relative;
          min-height: 100vh;
          margin: 0;
          border-radius: 0;
          padding: clamp(14px, 2vw, 24px);
          overflow: hidden;
          color: var(--stats-text);
          background: transparent;
          border: none;
          box-shadow: none;
          animation: statsFadeRise 480ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .statsBackgroundGlow {
          display: none;
        }

        .statsHeader {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .statsHeaderIntro {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: min(100%, 320px);
        }

        .statsExitButton {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          align-self: flex-start;
          border: 1px solid rgba(154, 198, 255, 0.64);
          background: linear-gradient(165deg, rgba(39, 78, 140, 0.82), rgba(21, 48, 94, 0.88));
          color: #e7f2ff;
          border-radius: 999px;
          padding: 6px 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.03em;
          cursor: pointer;
          box-shadow: 0 8px 16px rgba(7, 20, 44, 0.4), inset 0 1px 0 rgba(220, 241, 255, 0.3);
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        }

        .statsExitButton:hover {
          transform: translateY(-1px);
          border-color: rgba(194, 226, 255, 0.82);
          background: linear-gradient(165deg, rgba(48, 92, 162, 0.9), rgba(28, 62, 119, 0.92));
        }

        .statsTitle {
          margin: 0;
          font-size: clamp(24px, 4vw, 34px);
          line-height: 1;
          letter-spacing: 0.02em;
          font-weight: 900;
          color: #c07800;
          text-shadow: 0 4px 24px rgba(192, 120, 0, 0.42);
        }

        .statsSubtitle {
          margin: 6px 0 0 0;
          font-size: 12px;
          font-weight: 700;
          color: var(--stats-heading-secondary);
          letter-spacing: 0.02em;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.1);
        }

        .statsTabs {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .statsHeaderControls {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
          margin-left: auto;
        }

        .statsYearPicker {
          min-width: 96px;
          align-self: flex-end;
        }

        .statsTab {
          border: 1px solid rgba(114, 155, 228, 0.45);
          background: rgba(13, 29, 57, 0.66);
          border-radius: 999px;
          color: rgba(214, 229, 251, 0.93);
          padding: 7px 12px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease, background 140ms ease;
        }

        .statsTab:hover {
          transform: translateY(-1px);
          border-color: rgba(156, 193, 250, 0.75);
        }

        .statsTab.active {
          background: linear-gradient(
            140deg,
            color-mix(in srgb, var(--stats-tab-active-bg, #3b77dc) 92%, #ffffff 8%),
            color-mix(in srgb, var(--stats-tab-active-bg, #355f9d) 84%, #0d1d38 16%)
          );
          border-color: rgba(169, 212, 255, 0.9);
          box-shadow: 0 10px 22px rgba(12, 39, 92, 0.45), inset 0 1px 0 rgba(220, 242, 255, 0.35);
          color: #f6fbff;
        }

        .yearReviewHero {
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 14px;
          flex-wrap: wrap;
          padding: 12px;
          border-radius: 14px;
          border: 1px solid rgba(131, 172, 235, 0.42);
          background: linear-gradient(140deg, rgba(23, 48, 87, 0.68), rgba(13, 28, 56, 0.74));
          box-shadow: inset 0 1px 0 rgba(214, 232, 255, 0.17), 0 10px 24px rgba(4, 12, 29, 0.28);
        }

        .yearReviewHeroMain {
          min-width: min(100%, 320px);
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .yearReviewEyebrow {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 3px 9px;
          border-radius: 999px;
          border: 1px solid rgba(160, 198, 251, 0.52);
          background: rgba(38, 77, 135, 0.58);
          color: rgba(229, 242, 255, 0.96);
          font-size: 10px;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .yearReviewHeroControls {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
          gap: 6px;
          margin-left: auto;
        }

        .yearReviewHeroActions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wrappedLaunchButton {
          border: 1px solid rgba(202, 222, 255, 0.74);
          background: linear-gradient(135deg, rgba(139, 175, 244, 0.9), rgba(65, 110, 189, 0.92));
          color: #f5faff;
          border-radius: 999px;
          padding: 9px 14px;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
          box-shadow: 0 10px 20px rgba(8, 22, 45, 0.34);
        }

        .wrappedLaunchButton:hover {
          transform: translateY(-1px);
          filter: brightness(1.06);
        }

        .yearReviewTitle {
          margin: 0;
          font-size: clamp(24px, 4.1vw, 34px);
          line-height: 1.1;
          font-weight: 900;
          color: #c9fbdd;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.16);
        }

        .wrappedOverlay {
          position: fixed;
          inset: 0;
          z-index: 99999;
          background: linear-gradient(145deg, rgba(16, 42, 92, 0.86), rgba(7, 19, 45, 0.92));
          backdrop-filter: blur(10px) saturate(1.2);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .wrappedDialog {
          position: relative;
          width: min(980px, 100%);
          min-height: min(760px, 92vh);
          border-radius: 24px;
          overflow: hidden;
          border: 1px solid rgba(191, 223, 255, 0.38);
          background:
            linear-gradient(150deg, rgba(11, 26, 54, 0.82), rgba(7, 18, 40, 0.9)),
            var(--wrapped-backdrop);
          background-size: cover;
          background-position: center;
          box-shadow: 0 34px 80px rgba(0, 0, 0, 0.56);
          display: flex;
          flex-direction: column;
        }

        .wrappedDialog::before {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(170deg, rgba(6, 15, 35, 0.24), rgba(4, 11, 28, 0.82));
          pointer-events: none;
        }

        .wrappedHeader,
        .wrappedStory,
        .wrappedControls {
          position: relative;
          z-index: 2;
        }

        .wrappedHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 18px 22px;
          color: rgba(218, 236, 255, 0.92);
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .wrappedClose {
          border: 1px solid rgba(179, 211, 255, 0.56);
          background: rgba(11, 26, 54, 0.74);
          color: #d9ebff;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .wrappedStory {
          flex: 1;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          gap: 10px;
          padding: 16px 30px 10px;
        }

        .wrappedStoryBackdropFirst {
          gap: 14px;
        }

        .wrappedStoryBackdropFirst .wrappedTitle {
          font-size: clamp(34px, 6vw, 64px);
          text-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
        }

        .wrappedStoryBackdropFirst .wrappedValue {
          text-shadow: 0 8px 24px rgba(12, 26, 56, 0.7);
        }

        .wrappedStoryBackdropFirst .wrappedNote {
          font-size: 16px;
          max-width: 760px;
          text-shadow: 0 8px 22px rgba(0, 0, 0, 0.62);
        }

        .wrappedNavEdge {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 44px;
          height: 44px;
          border-radius: 999px;
          border: 1px solid rgba(193, 220, 255, 0.5);
          background: rgba(9, 24, 54, 0.76);
          color: #f2f8ff;
          font-size: 22px;
          font-weight: 900;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .wrappedNavEdgeLeft {
          left: 16px;
        }

        .wrappedNavEdgeRight {
          right: 16px;
        }

        .wrappedProgress {
          width: min(560px, 100%);
          display: grid;
          gap: 6px;
          margin-bottom: 16px;
        }

        .wrappedProgress span {
          height: 4px;
          border-radius: 999px;
          background: rgba(197, 220, 252, 0.26);
        }

        .wrappedProgress span.active {
          background: rgba(228, 244, 255, 0.95);
        }

        .wrappedKicker {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #c9fbdd;
        }

        .wrappedSlideCount {
          font-size: 11px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: rgba(206, 226, 252, 0.84);
          margin-top: -2px;
        }

        .wrappedTitle {
          margin: 0;
          font-size: clamp(28px, 5vw, 52px);
          line-height: 1.06;
          color: #ffffff;
          max-width: 760px;
        }

        .wrappedValue {
          font-size: clamp(20px, 3.5vw, 34px);
          font-weight: 900;
          color: #8baff4;
        }

        .wrappedValue.isBeat {
          animation: wrappedBeatPulse 1s ease-in-out infinite;
        }

        .wrappedNote {
          margin: 0;
          font-size: 14px;
          color: rgba(228, 239, 255, 0.9);
          max-width: 680px;
        }

        .wrappedHint {
          margin: 4px 0 0;
          font-size: 11px;
          color: rgba(198, 220, 250, 0.9);
          letter-spacing: 0.03em;
          text-transform: uppercase;
        }

        .wrappedCoverFrame {
          width: min(220px, 50vw);
          aspect-ratio: 2 / 3;
          margin-top: 8px;
          border-radius: 16px;
          overflow: hidden;
          border: 1px solid rgba(203, 228, 255, 0.42);
          box-shadow: 0 18px 38px rgba(0, 0, 0, 0.42);
          background: rgba(12, 25, 48, 0.75);
        }

        .wrappedCoverFrame.isSquare {
          width: min(260px, 56vw);
          aspect-ratio: 1 / 1;
        }

        .wrappedCoverFrame img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .wrappedCoverSlideIn {
          animation: wrappedCoverSlideIn 1100ms cubic-bezier(0.2, 0.85, 0.2, 1);
        }

        .wrappedControls {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 16px 18px 18px;
          border-top: 1px solid rgba(161, 199, 250, 0.22);
          background: rgba(7, 17, 36, 0.66);
          flex-wrap: wrap;
        }

        .wrappedNavButtons,
        .wrappedAudioButtons {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .wrappedNavButtons button,
        .wrappedAudioButtons button {
          border: 1px solid rgba(171, 205, 255, 0.5);
          background: rgba(19, 38, 73, 0.74);
          color: #ebf5ff;
          border-radius: 999px;
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
        }

        .wrappedTrackLabel {
          color: rgba(220, 238, 255, 0.86);
          font-size: 11px;
          font-weight: 700;
        }

        .yearReviewSubtitle {
          margin: 2px 0 0 0;
          color: #8baff4;
          font-size: 13px;
          font-weight: 700;
          max-width: 68ch;
        }

        .yearReviewPicker {
          display: inline-flex;
          flex-direction: column;
          gap: 6px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #8baff4;
          font-weight: 900;
          background: rgba(13, 27, 52, 0.64);
          border: 1px solid rgba(146, 184, 236, 0.45);
          border-radius: 10px;
          padding: 8px 9px 9px;
          box-shadow: inset 0 1px 0 rgba(220, 236, 255, 0.15);
        }

        .yearReviewPicker > span {
          color: #8baff4;
        }

        .yearReviewPickerHint {
          font-size: 11px;
          font-weight: 700;
          color: rgba(198, 218, 246, 0.92);
          text-align: right;
          max-width: 280px;
        }

        .yearReviewPicker select {
          border: 1px solid rgba(117, 163, 234, 0.5);
          background: rgba(12, 28, 54, 0.72);
          color: #f3f8ff;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 13px;
          font-weight: 700;
          min-width: 124px;
        }

        .yearStoryBody {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .yearStoryBody p {
          margin: 0;
          font-size: 13px;
          color: rgba(206, 224, 248, 0.92);
          line-height: 1.45;
        }

        .yearStoryChips {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 8px;
        }

        .yearStoryChip {
          border: 1px solid rgba(126, 169, 238, 0.34);
          border-radius: 10px;
          background: rgba(10, 24, 50, 0.58);
          padding: 10px 10px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: center;
          text-align: center;
        }

        .yearStoryChipInteractive {
          cursor: pointer;
          transition: background 120ms ease, border-color 120ms ease;
        }

        .yearStoryChipInteractive:hover {
          background: rgba(19, 40, 74, 0.72);
          border-color: rgba(155, 198, 255, 0.52);
        }

        .yearStoryChipInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.95);
          outline-offset: 2px;
        }

        .yearStoryChip span {
          color: rgba(195, 219, 252, 0.9);
          font-size: 10px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          font-family: "Avenir Next", "Segoe UI", sans-serif;
        }

        .yearStoryChip strong {
          color: #f8fbff;
          font-size: 16px;
          font-weight: 900;
          line-height: 1.25;
          font-family: "Avenir Next", "Segoe UI", sans-serif;
          text-wrap: balance;
        }

        .yearSpotlightBody {
          display: grid;
          grid-template-columns: minmax(70px, 92px) 1fr;
          gap: 10px;
          align-items: center;
          flex: 1;
          min-height: 0;
        }

        .yearSpotlightBodyInteractive {
          cursor: pointer;
          border-radius: 10px;
          padding: 4px;
          transition: background 120ms ease;
        }

        .yearSpotlightBodyInteractive:hover {
          background: rgba(118, 171, 246, 0.12);
        }

        .yearSpotlightBodyInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.95);
          outline-offset: 2px;
        }

        .yearSpotlightCover {
          position: relative;
          width: 100%;
          aspect-ratio: 3 / 4;
          border-radius: 6px;
          overflow: visible;
          border: none;
          background: transparent;
          box-shadow: none;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .yearSpotlightCover img {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 6px;
          display: block;
        }

        .yearSpotlightFallback {
          width: 100%;
          height: 100%;
          display: grid;
          place-items: center;
          font-size: 10px;
          color: rgba(184, 207, 240, 0.8);
          font-weight: 700;
        }

        .yearSpotlightMeta {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
        }

        .yearSpotlightTitle {
          font-size: 14px;
          font-weight: 800;
          color: #f7fbff;
          line-height: 1.25;
          text-wrap: balance;
        }

        .yearSpotlightNote {
          font-size: 11px;
          color: rgba(190, 214, 246, 0.86);
          font-weight: 700;
        }

        .yearTopRatedGrid {
          display: grid;
          grid-template-columns: repeat(10, minmax(0, 1fr));
          gap: 8px;
          width: 100%;
        }

        .yearTopRatedTile {
          margin: 0;
          display: grid;
          grid-template-rows: clamp(92px, 8vw, 132px) minmax(3.6em, auto);
          gap: 5px;
          min-width: 0;
          position: relative;
        }

        .yearTopRatedMedia {
          position: relative;
          width: 100%;
          height: clamp(92px, 8vw, 132px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: visible;
          border-radius: 6px;
        }

        .yearTopRatedTileInteractive {
          cursor: pointer;
          border-radius: 10px;
          padding: 2px;
          transition: background 120ms ease;
        }

        .yearTopRatedTileInteractive:hover {
          background: rgba(115, 169, 245, 0.14);
        }

        .yearTopRatedTileInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.95);
          outline-offset: 2px;
        }

        .yearTopRatedRank {
          position: absolute;
          top: 5px;
          left: 5px;
          z-index: 2;
          font-size: 10px;
          font-weight: 900;
          color: #f9fcff;
          background: rgba(8, 18, 40, 0.78);
          border: 1px solid rgba(151, 188, 245, 0.6);
          border-radius: 999px;
          padding: 2px 6px;
          line-height: 1.1;
          backdrop-filter: blur(2px);
        }

        .yearTopRatedTile img {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 6px !important;
          border: none;
          background: transparent;
          box-shadow: none;
          display: block;
        }

        .statsCoverRatingBadge {
          position: absolute;
          top: 6px;
          right: 6px;
          z-index: 2;
          font-size: 9px;
          font-weight: 900;
          color: #173a66;
          background: rgba(255, 255, 255, 0.96);
          border: 1px solid rgba(214, 231, 255, 0.95);
          border-radius: 999px;
          padding: 1px 4px;
          line-height: 1.1;
          letter-spacing: 0.02em;
          transform: translateY(1px);
          box-shadow: 0 4px 10px rgba(3, 13, 31, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(3px);
        }

        .yearTopRatedTile figcaption {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-height: 3.6em;
        }

        .yearTopRatedTitle {
          font-size: 10px;
          color: rgba(186, 210, 240, 0.82);
          font-weight: 700;
          line-height: 1.2;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          white-space: normal;
          min-height: 3.6em;
        }

        .yearTopRatedMeta {
          display: none;
        }

        .yearTopRatedCover {
          width: auto;
          height: auto;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 6px;
          border: none;
          background: transparent;
          box-shadow: none;
          display: block;
        }

        .yearTopRatedCoverAudiobook {
          aspect-ratio: 1 / 1;
          width: 100%;
          height: auto;
          align-self: flex-end;
        }

        .yearTopRatedCoverGame {
          aspect-ratio: 1.4 / 1;
          object-fit: contain;
          background: transparent;
          padding: 0;
        }

        .yearTopRatedCoverTv {
          transform: scale(0.93);
          transform-origin: top center;
        }

        .topRatedComparison {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          flex: 1;
        }

        .topRatedColumn {
          border: 1px solid rgba(121, 163, 233, 0.34);
          border-radius: 12px;
          background: rgba(8, 21, 46, 0.44);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
        }

        .topRatedColumnHeader {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        .topRatedColumnHeader h3 {
          margin: 0;
          font-size: 12px;
          font-weight: 900;
          color: #f5f9ff;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .topRatedColumnHeader span {
          color: rgba(186, 208, 238, 0.82);
          font-size: 10px;
          font-weight: 700;
        }

        .topRatedGrid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        .topRatedTile {
          margin: 0;
          display: grid;
          grid-template-rows: clamp(92px, 8vw, 132px) minmax(3.6em, auto);
          gap: 4px;
          min-width: 0;
          position: relative;
        }

        .topRatedMedia {
          position: relative;
          width: 100%;
          height: clamp(92px, 8vw, 132px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: visible;
          border-radius: 6px;
        }

        .topRatedMediaPoster {
          border-radius: 6px;
        }

        .topRatedMediaBook {
          height: clamp(92px, 8vw, 132px);
        }

        .topRatedTileGame {
          grid-template-rows: clamp(126px, 10.5vw, 178px) minmax(3.6em, auto);
        }

        .topRatedMediaGame {
          height: clamp(126px, 10.5vw, 178px);
        }

        .topRatedCoverWrap {
          position: relative;
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
          max-width: 100%;
          height: 100%;
          width: fit-content;
          line-height: 0;
          border-radius: 6px;
        }

        .topRatedImageClip {
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
          width: auto;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          line-height: 0;
          border-radius: 6px !important;
          overflow: hidden;
          clip-path: inset(0 round 6px) !important;
          -webkit-clip-path: inset(0 round 6px) !important;
          transform: translateZ(0);
        }

        .topRatedImageClipPoster {
          width: 100%;
          height: 100%;
          aspect-ratio: 2 / 3;
        }

        .topRatedImageClipAudiobook {
          width: 100%;
          height: auto;
          aspect-ratio: 1 / 1;
        }

        .topRatedImageClipGame {
          width: auto;
          height: 100%;
        }

        .topRatedImageClipBook {
          width: auto;
          height: auto;
        }

        .topRatedCoverWrapAudiobook {
          width: min(100%, clamp(92px, 8vw, 132px));
          height: auto;
        }

        .topRatedCoverWrapBook {
          align-items: flex-start;
        }

        .topRatedCoverWrapPoster {
          width: auto;
          height: 100%;
          aspect-ratio: 2 / 3;
          overflow: visible;
          isolation: isolate;
          border-radius: 6px;
        }

        .topRatedCoverWrapGame {
          width: fit-content;
          height: 100%;
          align-items: flex-end;
          max-width: 100%;
        }

        .topRatedTileInteractive {
          cursor: pointer;
          border-radius: 10px;
          padding: 2px;
          transition: background 120ms ease;
        }

        .topRatedTileInteractive:hover {
          background: rgba(115, 169, 245, 0.14);
        }

        .topRatedTileInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.95);
          outline-offset: 2px;
        }

        .topRatedTile img {
          width: auto;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: 2 / 3;
          object-fit: contain;
          border-radius: 6px !important;
          border: none;
          background: transparent;
          box-shadow: none;
          display: block;
          clip-path: inset(0 round 6px);
          overflow: hidden;
          transform: translateZ(0);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          mask-image: radial-gradient(white, black);
        }

        .topRatedCoverWrapPoster img.yearTopRatedCover {
          width: 100%;
          height: 100%;
          max-width: none;
          max-height: none;
          object-fit: contain;
          border-radius: 6px !important;
          clip-path: inset(0 round 6px) !important;
          -webkit-clip-path: inset(0 round 6px) !important;
          overflow: hidden;
          transform: translateZ(0);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          mask-image: radial-gradient(white, black);
        }

        .topRatedMediaBook img.yearTopRatedCover {
          height: auto;
          width: auto;
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: auto;
          object-fit: contain;
          overflow: hidden;
        }

        .topRatedTile img.yearTopRatedCoverAudiobook {
          aspect-ratio: 1 / 1;
          width: 100%;
          display: block;
          height: auto;
          align-self: flex-end;
        }

        .topRatedTile img.yearTopRatedCoverGame {
          aspect-ratio: auto;
          width: auto;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 6px !important;
          clip-path: inset(0 round 6px);
          background: transparent;
          padding: 0;
        }

        .topRatedCoverWrapGame img.yearTopRatedCoverGame {
          flex: 0 1 auto;
          border-radius: 6px !important;
          clip-path: inset(0 round 6px);
          overflow: hidden;
        }

        .topRatedTile img.yearTopRatedCoverTv {
          transform: scale(0.93);
          transform-origin: top center;
        }

        .topRatedScoreBubble {
          position: absolute;
          top: 2px;
          right: 5px;
          z-index: 3;
          font-size: 8px;
          min-width: 22px;
          text-align: center;
          transform: none;
        }

        .topRatedFallback {
          width: 100%;
          height: 100%;
          aspect-ratio: 2 / 3;
          border-radius: 6px;
          border: 1px solid rgba(136, 174, 237, 0.22);
          background: rgba(9, 19, 41, 0.35);
          display: grid;
          place-items: center;
          font-size: 9px;
          color: rgba(184, 207, 240, 0.8);
          font-weight: 700;
        }

        .topRatedMediaAudiobook .topRatedScoreBubble {
          top: 2px;
        }

        .topRatedCoverWrapBook .topRatedScoreBubble {
          top: 3px;
          right: 5px;
        }

        .topRatedTile figcaption {
          display: flex;
          flex-direction: column;
          gap: 2px;
          justify-self: center;
          width: 100%;
        }

        .topRatedTilePoster figcaption {
          width: min(100%, calc(clamp(116px, 9.8vw, 164px) * 0.6667));
        }

        .topRatedTileAudiobook figcaption {
          width: min(100%, clamp(92px, 8vw, 132px));
        }

        .topRatedTileGame figcaption {
          width: 100%;
        }

        .topRatedTitle {
          font-size: 10px;
          color: rgba(186, 210, 240, 0.82);
          font-weight: 700;
          line-height: 1.2;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          white-space: normal;
          min-height: 3.6em;
        }

        .topRatedMeta {
          display: none;
        }

        :global(.statsRoot img) {
          border-radius: 6px;
        }

        :global(.topRatedColumn) {
          border: 1px solid rgba(121, 163, 233, 0.34);
          border-radius: 12px;
          background: rgba(8, 21, 46, 0.44);
          padding: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 0;
        }

        :global(.topRatedColumnHeader) {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
        }

        :global(.topRatedColumnHeader h3) {
          margin: 0;
          font-size: 12px;
          font-weight: 900;
          color: #f5f9ff;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        :global(.topRatedColumnHeader span) {
          color: rgba(186, 208, 238, 0.82);
          font-size: 10px;
          font-weight: 700;
        }

        :global(.topRatedGrid) {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 8px;
        }

        :global(.topRatedTile) {
          margin: 0;
          display: grid;
          grid-template-rows: clamp(82px, 7vw, 118px) minmax(3.45em, auto);
          gap: 4px;
          min-width: 0;
          position: relative;
        }

        :global(.topRatedMedia) {
          position: relative;
          width: 100%;
          height: clamp(82px, 7vw, 118px);
          display: flex;
          align-items: flex-end;
          justify-content: center;
          overflow: visible;
          border-radius: 6px;
        }

        :global(.topRatedTilePoster) {
          grid-template-rows: clamp(116px, 9.8vw, 164px) minmax(3.45em, auto);
        }

        :global(.topRatedMediaPoster) {
          height: clamp(116px, 9.8vw, 164px);
        }

        :global(.topRatedImageClip) {
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
          width: auto;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          line-height: 0;
          border-radius: 6px !important;
          overflow: hidden;
          clip-path: inset(0 round 6px) !important;
          -webkit-clip-path: inset(0 round 6px) !important;
          transform: translateZ(0);
        }

        :global(.topRatedImageClipPoster) {
          width: 100%;
          height: 100%;
          aspect-ratio: 2 / 3;
        }

        :global(.topRatedImageClipAudiobook) {
          width: 100%;
          height: auto;
          aspect-ratio: 1 / 1;
        }

        :global(.topRatedImageClipGame) {
          width: auto;
          height: 100%;
        }

        :global(.topRatedImageClipBook) {
          width: auto;
          height: auto;
        }

        :global(.topRatedTileGame) {
          grid-template-rows: clamp(104px, 8.7vw, 148px) minmax(3.45em, auto);
        }

        :global(.topRatedMediaGame) {
          height: clamp(104px, 8.7vw, 148px);
        }

        :global(.topRatedCoverWrap) {
          position: relative;
          display: inline-flex;
          align-items: flex-end;
          justify-content: center;
          max-width: 100%;
          height: 100%;
          width: fit-content;
          line-height: 0;
          border-radius: 6px;
        }

        :global(.topRatedCoverWrapAudiobook) {
          width: min(100%, clamp(82px, 7vw, 118px));
          height: auto;
        }

        :global(.topRatedCoverWrapPoster) {
          width: auto;
          height: 100%;
          aspect-ratio: 2 / 3;
          overflow: visible;
          isolation: isolate;
          border-radius: 6px;
        }

        :global(.topRatedCoverWrapGame) {
          width: fit-content;
          height: 100%;
          align-items: flex-end;
          max-width: 100%;
        }

        :global(.topRatedTileInteractive) {
          cursor: pointer;
          border-radius: 10px;
          padding: 2px;
          transition: background 120ms ease;
        }

        :global(.topRatedTileInteractive:hover) {
          background: rgba(115, 169, 245, 0.14);
        }

        :global(.topRatedTileInteractive:focus-visible) {
          outline: 2px solid rgba(157, 208, 255, 0.95);
          outline-offset: 2px;
        }

        :global(.topRatedTile img) {
          width: auto;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: 2 / 3;
          object-fit: contain;
          border-radius: 6px !important;
          border: none;
          background: transparent;
          box-shadow: none;
          display: block;
          clip-path: inset(0 round 6px);
          overflow: hidden;
          transform: translateZ(0);
          -webkit-mask-image: -webkit-radial-gradient(white, black);
          mask-image: radial-gradient(white, black);
        }

        :global(.topRatedCoverWrapPoster img.yearTopRatedCover) {
          width: 100%;
          height: 100%;
          max-width: none;
          max-height: none;
          object-fit: contain;
          border-radius: 6px !important;
          clip-path: inset(0 round 6px) !important;
          -webkit-clip-path: inset(0 round 6px) !important;
        }

        :global(.topRatedMediaBook img.yearTopRatedCover) {
          height: auto;
          width: auto;
          max-width: 100%;
          max-height: 100%;
          aspect-ratio: auto;
        }

        :global(.topRatedTile img.yearTopRatedCoverAudiobook) {
          aspect-ratio: 1 / 1;
          width: 100%;
          display: block;
          height: auto;
          align-self: flex-end;
        }

        :global(.topRatedTile img.yearTopRatedCoverGame) {
          aspect-ratio: auto;
          width: auto;
          height: 100%;
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          background: transparent;
          padding: 0;
        }

        :global(.topRatedScoreBubble) {
          position: absolute;
          top: 2px;
          right: 5px;
          z-index: 3;
          font-size: 8px;
          min-width: 22px;
          text-align: center;
          transform: none;
        }

        :global(.topRatedFallback) {
          width: 100%;
          height: 100%;
          aspect-ratio: 2 / 3;
          border-radius: 6px;
          border: 1px solid rgba(136, 174, 237, 0.22);
          background: rgba(9, 19, 41, 0.35);
          display: grid;
          place-items: center;
          font-size: 9px;
          color: rgba(184, 207, 240, 0.8);
          font-weight: 700;
        }

        :global(.topRatedTile figcaption) {
          display: flex;
          flex-direction: column;
          gap: 2px;
          justify-self: center;
          width: 100%;
        }

        :global(.topRatedTilePoster figcaption) {
          width: min(100%, calc(clamp(116px, 9.8vw, 164px) * 0.6667));
        }

        :global(.topRatedTileAudiobook figcaption) {
          width: min(100%, clamp(82px, 7vw, 118px));
        }

        :global(.topRatedTitle) {
          font-size: 10px;
          color: rgba(186, 210, 240, 0.82);
          font-weight: 700;
          line-height: 1.15;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          white-space: normal;
          min-height: 3.45em;
        }

        .cardEmpty.compactEmpty {
          flex: 1;
          min-height: 120px;
        }

        .statsSummaryGrid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
          gap: 10px;
          margin-bottom: 14px;
        }

        .metricCard {
          background: linear-gradient(145deg, rgba(24, 52, 96, 0.72), rgba(13, 28, 56, 0.76));
          border: 1px solid rgba(121, 165, 236, 0.34);
          border-radius: 14px;
          padding: 12px 13px;
          box-shadow: inset 0 1px 0 rgba(190, 220, 255, 0.2), 0 8px 22px rgba(1, 10, 27, 0.3);
          animation: statsFadeRise 420ms ease both;
        }

        .metricCardInteractive {
          cursor: pointer;
          transition: transform 130ms ease, box-shadow 130ms ease, border-color 130ms ease;
        }

        .metricCardInteractive:hover {
          transform: translateY(-2px);
          border-color: rgba(157, 196, 250, 0.58);
          box-shadow: inset 0 1px 0 rgba(190, 220, 255, 0.2), 0 14px 28px rgba(1, 10, 27, 0.38);
        }

        .metricCardInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.9);
          outline-offset: 2px;
        }

        .metricCard::before {
          content: "";
          display: block;
          width: 100%;
          height: 3px;
          border-radius: 999px;
          background: var(--metric-accent);
          margin-bottom: 10px;
          box-shadow: 0 0 16px color-mix(in srgb, var(--metric-accent) 60%, transparent);
        }

        .metricLabel {
          color: var(--stats-muted);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        .metricValue {
          margin-top: 8px;
          font-size: clamp(22px, 3.2vw, 34px);
          line-height: 1.02;
          font-weight: 900;
          color: #ffffff;
          white-space: nowrap;
        }

        .metricValueCompact {
          font-size: clamp(24px, 2.2vw, 34px);
          line-height: 1.02;
          max-width: 100%;
          overflow: hidden;
        }

        .metricValueCompact * {
          font-size: inherit !important;
          line-height: inherit !important;
        }

        .metricSubLabel {
          margin-top: 4px;
          color: rgba(190, 214, 246, 0.88);
          font-size: 12px;
          font-weight: 600;
        }

        .statsGrid {
          position: relative;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
          gap: 12px;
          padding-bottom: 14px;
        }

        .statsCard {
          background: var(--stats-card);
          border: 1px solid var(--stats-border);
          border-radius: 16px;
          padding: 12px;
          box-shadow: inset 0 1px 0 rgba(204, 230, 255, 0.17), 0 14px 30px rgba(0, 12, 29, 0.35);
          display: flex;
          flex-direction: column;
          min-height: 210px;
        }

        .statsCardInteractive {
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
        }

        .statsCardInteractive:hover {
          transform: translateY(-1px);
          border-color: rgba(159, 200, 255, 0.62);
          box-shadow: inset 0 1px 0 rgba(204, 230, 255, 0.2), 0 16px 32px rgba(0, 12, 29, 0.4);
        }

        .statsCardInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.95);
          outline-offset: 2px;
        }

        .statsCard.spanTwo {
          grid-column: span 2;
        }

        .statsCard.spanFull {
          grid-column: 1 / -1;
        }

        .statsCardCompactMini {
          min-height: 128px;
          padding: 10px;
        }

        .cardHeader {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 12px;
        }

        .cardHeader h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 900;
          letter-spacing: 0.01em;
          color: #f3f8ff;
        }

        .cardHeader span {
          color: var(--stats-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .cardEmpty {
          border: 1px dashed rgba(131, 171, 236, 0.44);
          border-radius: 12px;
          color: rgba(189, 210, 241, 0.74);
          font-size: 12px;
          font-weight: 700;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 12px;
        }

        .monthChart {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 8px;
          align-items: stretch;
          min-height: 188px;
          flex: 1;
        }

        .monthColumn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          min-height: 0;
          gap: 6px;
        }

        .monthColumnInteractive {
          cursor: pointer;
          border-radius: 10px;
          padding: 4px 3px;
          transition: background 120ms ease;
        }

        .monthColumnInteractive:hover {
          background: rgba(122, 168, 239, 0.14);
        }

        .monthColumnInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.9);
          outline-offset: 1px;
        }

        .monthBar {
          width: 100%;
          min-width: 18px;
          max-width: 42px;
          height: auto;
          min-height: 112px;
          flex: 1 1 auto;
          border-radius: 8px;
          background: rgba(13, 24, 52, 0.65);
          border: 1px solid rgba(107, 149, 217, 0.36);
          display: flex;
          flex-direction: column-reverse;
          justify-content: flex-start;
          overflow: hidden;
          box-shadow: inset 0 1px 0 rgba(183, 218, 255, 0.15);
        }

        .monthBar > span {
          width: 100%;
          min-height: 3px;
        }

        .monthLabel {
          display: flex;
          flex-direction: column;
          align-items: center;
          line-height: 1.1;
          color: rgba(189, 210, 238, 0.82);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .monthCount {
          min-height: 14px;
          font-size: 10px;
          line-height: 1;
          font-weight: 900;
          color: #f7fbff;
          text-shadow: 0 1px 3px rgba(2, 8, 23, 0.8);
        }

        .legendRow {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .legendItem {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(201, 220, 245, 0.88);
          font-weight: 700;
        }

        .legendCount {
          min-width: 18px;
          text-align: right;
          color: #f7fbff;
          font-weight: 900;
        }

        .legendSwatch {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.2);
          flex: 0 0 auto;
        }

        .donutWrap {
          display: flex;
          justify-content: center;
          margin-top: 2px;
          margin-bottom: 8px;
        }

        .donut {
          width: 186px;
          height: 186px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(154, 189, 244, 0.45);
          box-shadow: 0 18px 32px rgba(0, 0, 0, 0.28);
        }

        .donutCenter {
          width: 112px;
          height: 112px;
          border-radius: 50%;
          background: rgba(9, 21, 48, 0.88);
          border: 1px solid rgba(151, 188, 243, 0.45);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 8px;
          box-shadow: inset 0 1px 0 rgba(225, 239, 255, 0.24);
        }

        .donutCenterLabel {
          font-size: 10px;
          letter-spacing: 0.03em;
          color: var(--stats-muted);
          font-weight: 800;
          text-transform: uppercase;
        }

        .donutCenterValue {
          margin-top: 6px;
          font-size: 13px;
          font-weight: 900;
          color: #f8fbff;
          line-height: 1.15;
          text-wrap: balance;
        }

        .legendList {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .legendList.compact {
          max-height: 172px;
          overflow-y: auto;
          padding-right: 4px;
        }

        .legendListItem {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(205, 224, 248, 0.92);
        }

        .legendListItemInteractive {
          cursor: pointer;
          border-radius: 8px;
          padding: 4px 5px;
          transition: background 120ms ease;
        }

        .legendListItemInteractive:hover {
          background: rgba(112, 162, 240, 0.14);
        }

        .legendListItemInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.9);
          outline-offset: 1px;
        }

        .legendName {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 700;
        }

        .legendValue {
          font-weight: 900;
          color: #f7fbff;
        }

        .barList {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .barList.compactBars {
          margin-top: 2px;
        }

        .barRow {
          display: grid;
          grid-template-columns: minmax(70px, 100px) 1fr auto;
          align-items: center;
          gap: 8px;
        }

        .barRowInteractive {
          cursor: pointer;
          border-radius: 8px;
          padding: 3px 5px;
          transition: background 120ms ease;
        }

        .barRowInteractive:hover {
          background: rgba(110, 158, 235, 0.14);
        }

        .barRowInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.9);
          outline-offset: 1px;
        }

        .barRowLabel {
          font-size: 11px;
          font-weight: 700;
          color: rgba(207, 224, 248, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .barTrack {
          position: relative;
          height: 10px;
          background: rgba(11, 24, 52, 0.72);
          border: 1px solid rgba(128, 167, 231, 0.3);
          border-radius: 999px;
          overflow: hidden;
        }

        .barFill {
          height: 100%;
          border-radius: inherit;
          box-shadow: 0 0 14px rgba(255, 255, 255, 0.24);
        }

        .barFill.gradient {
          background: linear-gradient(90deg, #61d0ff, #64f2c9, #ffe170);
        }

        .barRowValue {
          min-width: 22px;
          text-align: right;
          color: #f7fbff;
          font-size: 12px;
          font-weight: 900;
        }

        .statusVerticalChart {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 6px;
          align-items: stretch;
          min-height: 0;
          flex: 1;
          width: min(100%, 560px);
          margin-left: auto;
          margin-right: auto;
          margin-top: 0;
        }

        .statusVerticalCol {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          gap: 3px;
        }

        .statusVerticalColInteractive {
          cursor: pointer;
          border-radius: 8px;
          padding: 4px;
          transition: background 120ms ease;
        }

        .statusVerticalColInteractive:hover {
          background: rgba(117, 171, 247, 0.14);
        }

        .statusVerticalColInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.9);
          outline-offset: 1px;
        }

        .statusVerticalTrack {
          width: 100%;
          max-width: 34px;
          height: auto;
          flex: 1;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          border-radius: 8px;
          background: rgba(13, 31, 62, 0.72);
          border: 1px solid rgba(108, 153, 228, 0.35);
          padding: 3px;
        }

        .statusVerticalFill {
          width: 100%;
          border-radius: 5px;
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.25);
          min-height: 3px;
        }

        .statusVerticalValue {
          font-size: 11px;
          font-weight: 900;
          color: #f7fbff;
          line-height: 1;
        }

        .statusVerticalLabel {
          font-size: 9px;
          font-weight: 700;
          color: rgba(194, 214, 242, 0.88);
          text-align: center;
          line-height: 1.1;
        }

        .statusVerticalPct {
          font-size: 8px;
          font-weight: 700;
          color: rgba(168, 198, 236, 0.82);
        }

        .ratingsChart {
          display: grid;
          grid-template-columns: repeat(10, minmax(0, 1fr));
          gap: 6px;
          align-items: stretch;
          flex: 1;
          min-height: 0;
        }

        .ratingCol {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          height: 100%;
          gap: 4px;
        }

        .ratingColInteractive {
          cursor: pointer;
          border-radius: 8px;
          padding: 4px 2px;
          transition: background 120ms ease;
        }

        .ratingColInteractive:hover {
          background: rgba(117, 171, 247, 0.14);
        }

        .ratingColInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.9);
          outline-offset: 1px;
        }

        .ratingBarTrack {
          width: 100%;
          height: 124px;
          display: flex;
          align-items: flex-end;
        }

        .ratingBarTrack.scaledTrack {
          height: auto;
          flex: 1;
          border-radius: 8px;
          background: linear-gradient(180deg, rgba(17, 40, 78, 0.22), rgba(11, 25, 50, 0.62));
          border: 1px solid rgba(119, 163, 233, 0.28);
          padding: 2px;
        }

        .ratingBar {
          width: 100%;
          height: 0;
          border-radius: 5px 5px 2px 2px;
          background: linear-gradient(180deg, #ffe067, #ff8f65);
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.28);
        }

        .ratingBar.noData {
          opacity: 0.22;
          background: linear-gradient(180deg, rgba(131, 159, 204, 0.55), rgba(92, 117, 158, 0.48));
        }

        .ratingBar.hasData {
          opacity: 1;
        }

        .ratingCount {
          font-size: 9px;
          font-weight: 800;
          color: rgba(224, 240, 255, 0.92);
          line-height: 1;
        }

        .ratingLabel {
          font-size: 9px;
          color: rgba(194, 214, 242, 0.82);
          font-weight: 800;
        }

        .releaseMomentumChart {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(34px, 1fr));
          gap: 5px;
          min-height: 122px;
          align-items: end;
        }

        .releaseLineChartWrap {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-height: 0;
          flex: 1;
        }

        .releaseLineSvg {
          width: 100%;
          height: auto;
          min-height: 170px;
          flex: 1;
          border-radius: 8px;
          border: 1px solid rgba(128, 170, 234, 0.35);
          background: rgba(12, 30, 60, 0.5);
        }

        .releaseLinePath {
          fill: none;
          stroke: #ffb36b;
          stroke-width: 2.4;
          stroke-linecap: round;
          stroke-linejoin: round;
        }

        .releaseLinePoint {
          fill: #ffd66a;
          stroke: rgba(22, 49, 92, 0.85);
          stroke-width: 1.5;
        }

        .releaseLinePointGroup {
          cursor: pointer;
        }

        .releaseLinePointGroup:focus-visible .releaseLinePoint {
          stroke: rgba(183, 224, 255, 0.98);
          stroke-width: 2.3;
        }

        .releaseLineValueLabel {
          fill: rgba(239, 248, 255, 0.98);
          font-size: 36px;
          font-weight: 900;
          paint-order: stroke;
          stroke: rgba(8, 23, 49, 0.9);
          stroke-width: 8px;
          stroke-linejoin: round;
          letter-spacing: 0.01em;
        }

        .releaseLineYears {
          display: grid;
          grid-template-columns: repeat(${Math.max(1, releaseYearSeries.length)}, minmax(0, 1fr));
          gap: 4px;
        }

        .releaseLineYear {
          font-size: 8px;
          font-weight: 700;
          color: rgba(188, 208, 237, 0.86);
          text-align: center;
          line-height: 1.1;
          min-height: 12px;
        }

        .releaseLineYear.major {
          font-size: 11px;
          font-weight: 900;
          color: rgba(227, 240, 255, 0.98);
          text-shadow: 0 1px 0 rgba(0, 0, 0, 0.35);
        }

        .releaseLineYear.minor {
          color: transparent;
        }

        .releaseMomentumCol {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          min-width: 0;
        }

        .releaseMomentumColInteractive {
          cursor: pointer;
          border-radius: 8px;
          padding: 4px;
          transition: background 120ms ease;
        }

        .releaseMomentumColInteractive:hover {
          background: rgba(117, 171, 247, 0.14);
        }

        .releaseMomentumColInteractive:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.9);
          outline-offset: 1px;
        }

        .releaseMomentumTrack {
          width: 100%;
          max-width: 30px;
          height: 74px;
          display: flex;
          align-items: flex-end;
          padding: 3px;
          border-radius: 8px;
          border: 1px solid rgba(128, 170, 234, 0.35);
          background: rgba(12, 30, 60, 0.64);
        }

        .releaseMomentumFill {
          width: 100%;
          border-radius: 5px;
          min-height: 4px;
          background: linear-gradient(180deg, #ffd06c, #ff8f61);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.28);
        }

        .releaseMomentumValue {
          font-size: 9px;
          font-weight: 900;
          color: #f7fbff;
          line-height: 1;
        }

        .releaseMomentumLabel {
          font-size: 8px;
          font-weight: 700;
          color: rgba(188, 208, 237, 0.86);
          text-align: center;
          line-height: 1.1;
        }

        .timelineWrap {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex: 1;
        }

        .releaseSvg {
          width: 100%;
          height: 178px;
          border-radius: 10px;
          border: 1px solid rgba(126, 167, 232, 0.35);
          background: linear-gradient(180deg, rgba(8, 18, 40, 0.72), rgba(8, 20, 46, 0.54));
        }

        .releasePoint {
          fill: rgba(255, 207, 140, 0.92);
          stroke: rgba(12, 26, 56, 0.72);
          stroke-width: 1.1;
        }

        .releasePointGroup {
          cursor: pointer;
        }

        .releasePointGroup:focus-visible .releasePoint {
          stroke: rgba(177, 220, 255, 0.98);
          stroke-width: 2;
        }

        .releasePoint.peak {
          fill: #ffd95a;
          stroke: rgba(255, 247, 220, 0.72);
          stroke-width: 1.4;
        }

        .releasePoint.low {
          fill: #8ad8ff;
          stroke: rgba(212, 240, 255, 0.75);
          stroke-width: 1.3;
        }

        .releasePeakValue {
          fill: #ffe88b;
          font-size: 10px;
          font-weight: 900;
          paint-order: stroke;
          stroke: rgba(4, 14, 34, 0.88);
          stroke-width: 2px;
          stroke-linejoin: round;
        }

        .releaseLowValue {
          fill: #9fe5ff;
          font-size: 10px;
          font-weight: 900;
          paint-order: stroke;
          stroke: rgba(5, 15, 35, 0.9);
          stroke-width: 2px;
          stroke-linejoin: round;
        }

        .timelineYears {
          display: grid;
          grid-template-columns: repeat(${Math.max(1, releaseYearSeries.length)}, minmax(0, 1fr));
          gap: 4px;
          font-size: 10px;
          color: rgba(188, 208, 237, 0.78);
          font-weight: 700;
          text-align: center;
        }

        .timelineYear {
          display: block;
          min-height: 12px;
          line-height: 1.15;
          white-space: nowrap;
        }

        .timelineYear.hidden {
          visibility: hidden;
        }

        .timelineYear.visible {
          visibility: visible;
        }

        .timelinePeaks {
          margin-top: 4px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .timelinePeakTag {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          color: #fff9e3;
          border: 1px solid rgba(255, 216, 132, 0.45);
          background: linear-gradient(165deg, rgba(255, 147, 99, 0.3), rgba(255, 206, 114, 0.2));
        }

        .timelineLows {
          margin-top: 2px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          align-items: center;
        }

        .timelineLowTag {
          display: inline-flex;
          align-items: center;
          padding: 2px 7px;
          border-radius: 999px;
          font-size: 10px;
          font-weight: 800;
          color: #e8f7ff;
          border: 1px solid rgba(140, 213, 247, 0.45);
          background: linear-gradient(165deg, rgba(90, 165, 219, 0.28), rgba(111, 203, 237, 0.18));
        }

        .timelineTagButton {
          cursor: pointer;
        }

        .timelineTagButton:focus-visible {
          outline: 2px solid rgba(180, 222, 255, 0.96);
          outline-offset: 2px;
        }

        .highlightsGrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 9px;
        }

        .highlightItem {
          border-radius: 12px;
          background: linear-gradient(160deg, rgba(23, 49, 90, 0.66), rgba(10, 25, 55, 0.7));
          border: 1px solid rgba(118, 160, 230, 0.37);
          padding: 11px;
        }

        .highlightLabel {
          color: var(--stats-muted);
          font-size: 11px;
          font-weight: 700;
        }

        .highlightValue {
          margin-top: 5px;
          font-size: 16px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.15;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .highlightValueButton {
          margin-top: 5px;
          border: none;
          background: transparent;
          color: #ffffff;
          font-size: 20px;
          font-weight: 900;
          line-height: 1.15;
          padding: 0;
          text-align: left;
          cursor: pointer;
        }

        .highlightValueButton:hover {
          color: #d7efff;
        }

        .highlightValueButton:focus-visible {
          outline: 2px solid rgba(157, 208, 255, 0.9);
          outline-offset: 3px;
          border-radius: 6px;
        }

        @media (max-width: 980px) {
          .highlightsGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .statDetailOverlay {
          position: fixed;
          inset: 0;
          z-index: 2500;
          background: rgba(27, 31, 38, 0.32);
          backdrop-filter: blur(18px) saturate(1.12);
          -webkit-backdrop-filter: blur(18px) saturate(1.12);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
        }

        .statDetailDialog {
          width: min(980px, 100%);
          max-height: min(88vh, 860px);
          overflow: auto;
          border-radius: 18px;
          border: 1px solid rgba(255, 255, 255, 0.72);
          background:
            linear-gradient(180deg, rgba(249, 250, 252, 0.97), rgba(232, 236, 242, 0.96));
          box-shadow:
            0 28px 76px rgba(27, 31, 38, 0.36),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          color: #242a32;
        }

        .statDetailHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
          border-bottom: 1px solid rgba(160, 169, 183, 0.34);
          padding: 2px 2px 12px 2px;
        }

        .statDetailHeaderMain {
          min-width: 0;
        }

        .statDetailId {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(84, 109, 143, 0.86);
        }

        .statDetailHeaderMain h3 {
          margin: 6px 0 0 0;
          font-size: 20px;
          font-weight: 900;
          color: #20242b;
        }

        .statDetailValue {
          margin-top: 4px;
          font-size: 28px;
          line-height: 1;
          font-weight: 900;
          color: #2f7bd7;
        }

        .statDetailClose {
          border: 1px solid rgba(110, 116, 126, 0.28);
          background: linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(226, 229, 234, 0.94));
          color: #555d68;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.03em;
          padding: 7px 14px;
          cursor: pointer;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.9),
            0 1px 2px rgba(23, 28, 36, 0.08);
        }

        .statDetailSummaryGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .statDetailSummaryCard {
          border: 1px solid rgba(174, 184, 198, 0.46);
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.62);
          padding: 12px;
          min-height: 78px;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.76);
        }

        .statDetailSummaryLabel {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(60, 121, 204, 0.88);
        }

        .statDetailSummaryCard p {
          margin: 7px 0 0 0;
          font-size: 12px;
          color: rgba(45, 54, 66, 0.88);
          line-height: 1.42;
        }

        .statDetailItemsHeader {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          color: rgba(82, 96, 116, 0.9);
        }

        .statDetailItemsHeader span {
          color: #2f7bd7;
        }

        .statDetailItemsList {
          display: flex;
          flex-direction: column;
          gap: 0;
          min-height: 120px;
          border-top: 1px solid rgba(164, 174, 188, 0.28);
          border-bottom: 1px solid rgba(164, 174, 188, 0.28);
        }

        .statDetailItemRow {
          display: grid;
          grid-template-columns: 44px 63px minmax(0, 1fr);
          gap: 12px;
          border: 0;
          border-radius: 0;
          background: transparent;
          padding: 12px 2px;
          box-shadow: none;
          border-bottom: 1px solid rgba(164, 174, 188, 0.28);
        }

        .statDetailItemRow:last-child {
          border-bottom: 0;
        }

        .statDetailItemRank {
          width: 44px;
          min-height: 63px;
          border-radius: 0;
          display: grid;
          place-items: start center;
          padding-top: 4px;
          font-size: 22px;
          line-height: 1;
          font-weight: 900;
          color: #2f7bd7;
          border: 0;
          background: transparent;
        }

        .statDetailItemMain {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .statDetailItemCover {
          position: relative;
          width: 63px;
          align-self: start;
        }

        .statDetailItemCoverBadge {
          top: -4px;
          right: -4px;
          font-size: 8px;
          padding: 2px 5px;
        }

        .statDetailItemCoverImage,
        .statDetailItemCoverPlaceholder {
          display: block;
          width: 63px;
          aspect-ratio: 2 / 3;
          border-radius: 6px;
          border: 1px solid rgba(156, 168, 184, 0.45);
          background: rgba(238, 241, 245, 0.8);
          box-shadow: 0 5px 12px rgba(26, 32, 42, 0.16);
        }

        .statDetailItemCoverImage {
          object-fit: contain;
        }

        .statDetailItemCoverPlaceholder {
          display: grid;
          place-items: center;
          padding: 4px;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: rgba(82, 96, 116, 0.72);
        }

        .statDetailItemTitle {
          font-size: 13px;
          font-weight: 800;
          color: #232832;
          line-height: 1.25;
        }

        .statDetailItemMeta {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .statDetailItemMeta span {
          display: inline-flex;
          align-items: center;
          border: 1px solid rgba(120, 166, 236, 0.34);
          border-radius: 999px;
          padding: 2px 7px;
          font-size: 10px;
          font-weight: 700;
          color: rgba(54, 75, 105, 0.9);
          background: rgba(239, 244, 250, 0.86);
        }

        @keyframes statsFadeRise {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes wrappedCoverSlideIn {
          0% {
            opacity: 0;
            transform: translateX(46px) scale(0.96);
          }
          100% {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        @keyframes wrappedBeatPulse {
          0% {
            transform: translateY(0) scale(1);
            text-shadow: 0 0 0 rgba(139, 175, 244, 0);
          }
          35% {
            transform: translateY(-2px) scale(1.035);
            text-shadow: 0 0 22px rgba(139, 175, 244, 0.45);
          }
          100% {
            transform: translateY(0) scale(1);
            text-shadow: 0 0 0 rgba(139, 175, 244, 0);
          }
        }

        @media (max-width: 1100px) {
          .statsCard.spanTwo {
            grid-column: span 1;
          }

          .topRatedComparison {
            grid-template-columns: minmax(0, 1fr);
          }
        }

        @media (max-width: 760px) {
          .statsRoot {
            margin: 6px 6px 0 6px;
            padding: 12px;
            border-radius: 14px;
          }

          .statsHeaderIntro {
            width: 100%;
          }

          .statsExitButton {
            width: 100%;
          }

          .statsHeaderControls {
            width: 100%;
            justify-content: flex-start;
          }

          .statsTabs {
            justify-content: flex-start;
          }

          .statsTab {
            padding: 6px 10px;
            font-size: 11px;
          }

          .yearReviewHero {
            align-items: flex-start;
          }

          .yearReviewHero {
            padding: 10px;
          }

          .yearReviewHeroControls {
            align-items: stretch;
            width: 100%;
            margin-left: 0;
          }

          .yearReviewHeroActions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }

          .wrappedLaunchButton {
            width: 100%;
            text-align: center;
          }

          .yearReviewPicker {
            width: 100%;
          }

          .yearReviewPickerHint {
            text-align: left;
            max-width: none;
          }

          .yearReviewPicker select {
            width: 100%;
          }

          .yearSpotlightBody {
            grid-template-columns: minmax(62px, 76px) 1fr;
          }

          .yearTopRatedGrid {
            grid-template-columns: repeat(5, minmax(0, 1fr));
          }

          .topRatedGrid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }

          .highlightsGrid {
            grid-template-columns: minmax(0, 1fr);
          }

          .barRow {
            grid-template-columns: minmax(60px, 78px) 1fr auto;
          }

          .statDetailSummaryGrid {
            grid-template-columns: minmax(0, 1fr);
          }

          .releaseSvg {
            height: 158px;
          }

          .wrappedOverlay {
            padding: 8px;
          }

          .wrappedDialog {
            min-height: min(700px, 94vh);
            border-radius: 16px;
          }

          .wrappedStory {
            padding: 10px 14px;
          }

          .wrappedControls {
            justify-content: center;
          }
        }
      `}</style>
    </section>
  );
}
