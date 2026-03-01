"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";

type StatsMediaType = "book" | "movie" | "tv" | "game";
type StatsFilter = "all" | StatsMediaType;
type StatsTab = StatsFilter | "yearReview";
type StatsYearFilter = "all" | number;
type StatusBucket = "completed" | "inProgress" | "backlog" | "wishlist" | "abandoned" | "other";

type BookStatsItem = {
  title?: string;
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
};

type ShowStatsItem = {
  title?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  dateCompleted?: string;
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
  if (!Number.isFinite(value) || value <= 0) return "0h";
  if (value >= 100) return `${Math.round(value)}h`;
  if (value >= 10) return `${value.toFixed(1)}h`;
  return `${value.toFixed(2)}h`;
}

function formatMinutesAsHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0h";
  return formatHours(value / 60);
}

function formatScoreValue(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "-";
  return (Math.round(value * 10) / 10).toFixed(1);
}

function formatStarRowFive(valueOutOfFive: number): string {
  const clamped = Math.max(0, Math.min(5, valueOutOfFive));
  const filled = Math.round(clamped);
  const empty = 5 - filled;
  return `${"★".repeat(filled)}${"☆".repeat(empty)}`;
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

function getStatsItemKey(mediaType: StatsMediaType, title: string, platform?: string): string {
  const normalizedTitle = normalizeTitleKey(title);
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
  platform?: string
): string | null {
  const itemKey = getStatsItemKey(mediaType, title, platform);
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

function buildReleaseChartPaths(values: number[], width: number, height: number): { linePath: string; areaPath: string } {
  if (!values.length) {
    return { linePath: "", areaPath: "" };
  }

  if (values.length === 1) {
    const x = width / 2;
    const y = height / 2;
    return {
      linePath: `M${x},${y} L${x},${y}`,
      areaPath: `M${x},${y} L${x},${height} L${x},${height} Z`,
    };
  }

  const maxValue = Math.max(1, ...values);
  const step = width / (values.length - 1);

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - (value / maxValue) * (height - 16) - 8;
    return { x, y };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(" ");

  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = `${linePath} L${last.x.toFixed(2)},${height} L${first.x.toFixed(2)},${height} Z`;

  return { linePath, areaPath };
}

function compareRankedItems(
  a: UnifiedStatsItem,
  b: UnifiedStatsItem,
  scoreKey: "rating" | "externalRating"
): number {
  const aScore = a[scoreKey] || 0;
  const bScore = b[scoreKey] || 0;
  const scoreDelta = bScore - aScore;
  if (scoreDelta !== 0) return scoreDelta;

  const aDate = (a.activityDate || a.completionDate || a.releaseDate)?.getTime() || 0;
  const bDate = (b.activityDate || b.completionDate || b.releaseDate)?.getTime() || 0;
  if (bDate !== aDate) return bDate - aDate;

  return a.title.localeCompare(b.title);
}

export function StatisticsView({ books, movies, shows, games, coverOverrides = {}, onExit }: StatisticsViewProps) {
  const currentYear = new Date().getUTCFullYear();
  const [activeTab, setActiveTab] = useState<StatsTab>("all");
  const [statsYear, setStatsYear] = useState<StatsYearFilter>(ALL_STATS_YEARS);
  const [reviewYear, setReviewYear] = useState<number>(currentYear);
  const [activeStatDetail, setActiveStatDetail] = useState<StatisticDetail | null>(null);
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
      const rating = parseRatingValue(book.myRating, "ten");
      const externalRating = parseRatingValue(firstNonEmpty([book.externalAverageRating, book.userRating]), "five");
      const genres = splitList(book.categories || book.genre);
      const formats = splitList(book.types);
      const tags = [...splitList(book.tag), ...splitList(book.tags)];
      const statusBucket = inferStatusBucket(book.status || "", Boolean(completionDate));
      const primaryStatusToken = normalizeToken(book.status || "");
      const coverUrl = resolveCoverUrl(
        "book",
        title,
        [
          book.customImageUrl,
          book.cover,
          book.githubCoverUrl,
          book.posterUrl,
          book.metadataCoverUrl,
          book.imageUrl,
          book.posterUrlFallback,
        ],
        coverOverrides
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
        statusBucket,
        primaryStatusToken,
        coverUrl,
        audiobookMinutes: 0,
        runtimeMinutes: 0,
        gameplayHours: 0,
      };
    });

    const mappedGames: UnifiedStatsItem[] = games.map((game) => {
      const title = safeText(game.title) || "Untitled Game";
      const releaseDate = parseDateValue(game.releaseDate) || parseDateValue(game.releaseDateAlt);
      const completionDate = parseDateValue(game.dateCompleted) || parseDateValue(game.yearPlayed);
      const activityDate =
        parseDateValue(game.dateAdded) ||
        completionDate ||
        parseDateValue(game.yearPlayed) ||
        releaseDate;
      const rating = parseRatingValue(game.myRating, "ten");
      const externalRating = parseRatingValue(firstNonEmpty([game.igdbRating, game.rating]));
      const genres = splitList(game.genres);
      const platforms = splitList(game.platform);
      const formats = splitList(game.format);
      const tags = splitList(game.tag);
      const gameStatusRaw = firstNonEmpty([game.status, game.playStatus, game.gameStatus, game.completed]);
      const completionHint = isTruthyToken(game.completed) || Boolean(completionDate);
      const statusBucket = inferStatusBucket(gameStatusRaw, completionHint);
      const primaryStatusToken = normalizeToken(gameStatusRaw);
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
    const map = new Map<number, number>();

    filteredItems.forEach((item) => {
      if (!item.releaseDate) return;
      const year = item.releaseDate.getUTCFullYear();
      map.set(year, (map.get(year) || 0) + 1);
    });

    return [...map.entries()]
      .map(([year, value]) => ({ year, value }))
      .sort((a, b) => a.year - b.year)
      .slice(-18);
  }, [filteredItems]);

  const releaseYearLabelStep = useMemo(() => {
    const count = releaseYearSeries.length;
    if (count <= 6) return 1;
    // Keep roughly 6 readable year labels across the timeline.
    return Math.ceil((count - 1) / 5);
  }, [releaseYearSeries.length]);

  const releasePaths = useMemo(() => {
    const values = releaseYearSeries.map((entry) => entry.value);
    return buildReleaseChartPaths(values, 520, 168);
  }, [releaseYearSeries]);

  const releasePeakRows = useMemo(() => {
    return [...releaseYearSeries]
      .filter((entry) => entry.value > 0)
      .sort((a, b) => b.value - a.value || b.year - a.year)
      .slice(0, 5);
  }, [releaseYearSeries]);

  const releasePeakYearSet = useMemo(() => {
    return new Set(releasePeakRows.map((entry) => entry.year));
  }, [releasePeakRows]);

  const releaseLowRows = useMemo(() => {
    return [...releaseYearSeries]
      .filter((entry) => entry.value > 0 && !releasePeakYearSet.has(entry.year))
      .sort((a, b) => a.value - b.value || a.year - b.year)
      .slice(0, 5);
  }, [releasePeakYearSet, releaseYearSeries]);

  const releaseLowYearSet = useMemo(() => {
    return new Set(releaseLowRows.map((entry) => entry.year));
  }, [releaseLowRows]);

  const releasePointCoords = useMemo(() => {
    const values = releaseYearSeries.map((entry) => entry.value);
    if (!values.length) return [];

    const width = 520;
    const height = 168;
    const maxValue = Math.max(1, ...values);
    const step = values.length > 1 ? width / (values.length - 1) : 0;

    return values.map((value, index) => {
      const x = values.length === 1 ? width / 2 : index * step;
      const y = height - (value / maxValue) * (height - 16) - 8;
      return {
        year: releaseYearSeries[index].year,
        value,
        x,
        y,
      };
    });
  }, [releaseYearSeries]);

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

    return {
      yearLogged,
      yearCompleted,
      bestMonth,
      topGenre,
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
    const audiobookItems = yearItems.filter((item) => item.mediaType === "book" && item.audiobookMinutes > 0);
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
        const ratingDelta = (b.rating || 0) - (a.rating || 0);
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
        const ratingDelta = (a.rating || 0) - (b.rating || 0);
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
      audiobookMinutes,
      audiobookCount: audiobookItems.length,
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
    };
  }, [previousReviewYear, selectedReviewYear, unifiedItems]);

  const yearReviewMetrics = useMemo<SummaryMetric[]>(() => {
    const gameDelta = yearReview.completedGames - yearReview.completedGamesPrev;
    const completedDelta = yearReview.completedTotal - yearReview.completedPrevTotal;
    const abandonedRate = yearReview.yearItems.length ? (yearReview.abandonedCount / yearReview.yearItems.length) * 100 : 0;
    const previousBooks = yearReview.completedBooksPrev;
    const previousTv = yearReview.previousYearItems.filter((item) => item.mediaType === "tv").length;
    const bookDelta = yearReview.completedBooks - previousBooks;
    const tvDelta = yearReview.mediaCounts.tv - previousTv;
    const ratedItems = yearReview.yearItems.filter((item) => typeof item.rating === "number");
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
    const tvLoggedItems = yearReview.yearItems.filter((item) => item.mediaType === "tv");
    const moviesWatchedItems = yearReview.watchedMovieItems;
    const audiobookItems = yearReview.yearItems.filter(
      (item) => item.mediaType === "book" && item.audiobookMinutes > 0
    );
    const gamePlaytimeItems = yearReview.yearItems.filter(
      (item) =>
        item.mediaType === "game" &&
        item.gameplayHours > 0 &&
        item.playedYears.includes(selectedReviewYear)
    );
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
        summary: "Totals audiobook listening duration for books that include audiobook duration metadata.",
        calculation: "Filter year books with audiobookMinutes>0; value=sum(audiobookMinutes).",
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
    ];
  }, [previousReviewYear, selectedReviewYear, yearReview]);

  const metrics = useMemo<SummaryMetric[]>(() => {
    const total = filteredItems.length;
    const completed = statusCounts.completed;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;
    const ratedItems = filteredItems.filter((item) => typeof item.rating === "number" && Number.isFinite(item.rating));
    const genreItems = filteredItems.filter((item) => item.genres.length > 0);
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
      {
        id: `BASE_${scopeId}_GENRE_SPREAD`,
        label: "Genre Spread",
        value: `${genreCounts.size}`,
        subLabel: "distinct genres",
        accent: "var(--stats-accent-4)",
        summary: `Distinct genre count across ${scopeLabel}.`,
        calculation: "Count distinct genre strings across filteredItems.genres.",
        items: genreItems,
      },
    ];
  }, [averageRating, filter, filteredItems, genreCounts.size, ratingValues.length, selectedStatsYear, statusCounts.completed]);

  const filterOptions: Array<{ key: StatsTab; label: string }> = [
    { key: "all", label: "Everything" },
    { key: "book", label: "Books" },
    { key: "movie", label: "Movies" },
    { key: "tv", label: "TV Shows" },
    { key: "game", label: "Games" },
    { key: "yearReview", label: "Year in Review" },
  ];

  return (
    <section className="statsRoot">
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
          <div className="statsTabs" role="tablist" aria-label="Media filter">
            {filterOptions.map((option) => {
              const active = option.key === activeTab;
              return (
                <button
                  key={option.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  className={`statsTab ${active ? "active" : ""}`}
                  onClick={() => setActiveTab(option.key)}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {activeTab === "yearReview" ? (
        <>
          <div className="yearReviewControls">
            <div>
              <h2 className="yearReviewTitle">{selectedReviewYear} Year in Review</h2>
              <p className="yearReviewSubtitle">
                A yearly snapshot of what you watched, read, played, completed, and dropped.
              </p>
            </div>
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
                <div className="metricValue">{metric.value}</div>
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
                  {selectedReviewYear} included <strong>{yearReview.yearItems.length}</strong> logged titles, with{" "}
                  <strong>{yearReview.completedTotal}</strong> marked completed and{" "}
                  <strong>{yearReview.abandonedCount}</strong> marked abandoned.
                </p>
                <p>
                  {yearReview.busiestMonth && !isExcludedBusiestMonthKey(yearReview.busiestMonth.key)
                    ? `${yearReview.busiestMonth.label} was your busiest month with ${yearReview.busiestMonth.count} logs.`
                    : "No monthly activity trend is available for this year yet."}
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
                    <span>Leading Genre</span>
                    <strong>{yearReview.topGenre ? yearReview.topGenre.name : "-"}</strong>
                  </div>
                  <div
                    className="yearStoryChip yearStoryChipInteractive"
                    role="button"
                    tabIndex={0}
                    aria-label="Open details for media mix"
                    onClick={(event) => {
                      event.stopPropagation();
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_STORY_MEDIA_MIX`,
                        title: "Storyline: Media Mix",
                        value: `${yearReview.mediaCounts.book}B / ${yearReview.mediaCounts.movie}M / ${yearReview.mediaCounts.tv}TV / ${yearReview.mediaCounts.game}G`,
                        summary: "All items in the selected review year, segmented by media type.",
                        calculation: "Count yearReview.yearItems by mediaType (book/movie/tv/game).",
                        items: yearReview.yearItems,
                      });
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                      handleInteractiveKeyDown(event, () =>
                        openStatisticDetail({
                          id: `YR_${selectedReviewYear}_STORY_MEDIA_MIX`,
                          title: "Storyline: Media Mix",
                          value: `${yearReview.mediaCounts.book}B / ${yearReview.mediaCounts.movie}M / ${yearReview.mediaCounts.tv}TV / ${yearReview.mediaCounts.game}G`,
                          summary: "All items in the selected review year, segmented by media type.",
                          calculation: "Count yearReview.yearItems by mediaType (book/movie/tv/game).",
                          items: yearReview.yearItems,
                        })
                      );
                    }}
                  >
                    <span>Media Mix</span>
                    <strong>
                      {yearReview.mediaCounts.book}B / {yearReview.mediaCounts.movie}M / {yearReview.mediaCounts.tv}TV /{" "}
                      {yearReview.mediaCounts.game}G
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
                    <span>vs {previousReviewYear}</span>
                    <strong>
                      {yearReview.completedGames === yearReview.completedGamesPrev
                        ? "Games completed flat"
                        : yearReview.completedGames > yearReview.completedGamesPrev
                          ? `Games +${yearReview.completedGames - yearReview.completedGamesPrev}`
                          : `Games -${yearReview.completedGamesPrev - yearReview.completedGames}`}
                    </strong>
                  </div>
                </div>
              </div>
            </article>

            <article className="statsCard">
              <div className="cardHeader">
                <h2>Top Rated Pick</h2>
                <span>{yearReview.topRated?.rating ? `${yearReview.topRated.rating.toFixed(1)}/10` : "-"}</span>
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
                      value: yearReview.topRated?.rating ? `${yearReview.topRated.rating.toFixed(1)}/10` : "-",
                      summary: "Highest-rated item in the selected review year.",
                      calculation: "Sort rated year items by rating desc, then date desc, then title; pick first.",
                      items: yearReview.topRated ? [yearReview.topRated] : [],
                    })
                  }
                  onKeyDown={(event) =>
                    handleInteractiveKeyDown(event, () =>
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_TOP_RATED_PICK`,
                        title: "Top Rated Pick",
                        value: yearReview.topRated?.rating ? `${yearReview.topRated.rating.toFixed(1)}/10` : "-",
                        summary: "Highest-rated item in the selected review year.",
                        calculation: "Sort rated year items by rating desc, then date desc, then title; pick first.",
                        items: yearReview.topRated ? [yearReview.topRated] : [],
                      })
                    )
                  }
                >
                  <div className="yearSpotlightCover">
                    {yearReview.topRated.coverUrl ? (
                      <img src={yearReview.topRated.coverUrl} alt={`${yearReview.topRated.title} cover`} loading="lazy" />
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
                      calculation: "Filter year books with audiobookMinutes>0, sort descending by audiobookMinutes, pick first.",
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
                        calculation: "Filter year books with audiobookMinutes>0, sort descending by audiobookMinutes, pick first.",
                        items: yearReview.longestAudiobook ? [yearReview.longestAudiobook] : [],
                      })
                    )
                  }
                >
                  <div className="yearSpotlightCover">
                    {yearReview.longestAudiobook.coverUrl ? (
                      <img src={yearReview.longestAudiobook.coverUrl} alt={`${yearReview.longestAudiobook.title} cover`} loading="lazy" />
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
                      <img src={yearReview.mostPlayedGame.coverUrl} alt={`${yearReview.mostPlayedGame.title} cover`} loading="lazy" />
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
                <span>{yearReview.lowestRated?.rating ? `${yearReview.lowestRated.rating.toFixed(1)}/10` : "-"}</span>
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
                      value: yearReview.lowestRated?.rating ? `${yearReview.lowestRated.rating.toFixed(1)}/10` : "-",
                      summary: "Lowest-rated item in the selected review year.",
                      calculation: "Sort rated year items by rating asc, then date desc, then title; pick first.",
                      items: yearReview.lowestRated ? [yearReview.lowestRated] : [],
                    })
                  }
                  onKeyDown={(event) =>
                    handleInteractiveKeyDown(event, () =>
                      openStatisticDetail({
                        id: `YR_${selectedReviewYear}_LOWEST_RATED_ITEM`,
                        title: "Lowest Rated Item",
                        value: yearReview.lowestRated?.rating ? `${yearReview.lowestRated.rating.toFixed(1)}/10` : "-",
                        summary: "Lowest-rated item in the selected review year.",
                        calculation: "Sort rated year items by rating asc, then date desc, then title; pick first.",
                        items: yearReview.lowestRated ? [yearReview.lowestRated] : [],
                      })
                    )
                  }
                >
                  <div className="yearSpotlightCover">
                    {yearReview.lowestRated.coverUrl ? (
                      <img src={yearReview.lowestRated.coverUrl} alt={`${yearReview.lowestRated.title} cover`} loading="lazy" />
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
                  calculation: "Sort rated year items by rating desc, then date desc, then title; take top 20.",
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
                    calculation: "Sort rated year items by rating desc, then date desc, then title; take top 20.",
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
                      title={`${index + 1}. ${item.title} (${MEDIA_LABELS[item.mediaType]})`}
                      role="button"
                      tabIndex={0}
                      onClick={(event) => {
                        event.stopPropagation();
                        openStatisticDetail({
                          id: `YR_${selectedReviewYear}_TOP20_ITEM_${index + 1}`,
                          title: `Top 20 Item #${index + 1}`,
                          value: item.rating ? `${item.rating.toFixed(1)}/10` : "-",
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
                            value: item.rating ? `${item.rating.toFixed(1)}/10` : "-",
                            summary: "Single item from the Year in Review top-20 rated list.",
                            calculation: "Selected index from sorted year top-rated list.",
                            items: [item],
                          })
                        );
                      }}
                    >
                      <div className="yearTopRatedRank">#{index + 1}</div>
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt={`${item.title} cover`} loading="lazy" />
                      ) : (
                        <div className="yearSpotlightFallback">No Cover</div>
                      )}
                      <figcaption>
                        <span className="yearTopRatedTitle">{item.title}</span>
                        <span className="yearTopRatedMeta">
                          {item.rating ? `${item.rating.toFixed(1)}/10` : "-"} · {MEDIA_LABELS[item.mediaType]}
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
            <div className="metricValue">{metric.value}</div>
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

        <article className="statsCard">
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

        <article className="statsCard">
          <div className="cardHeader">
            <h2>Status Pulse</h2>
            <span>{statusRows.length} active buckets</span>
          </div>

          {statusRows.length > 0 ? (
            <div className="barList">
              {statusRows.map((entry) => {
                const total = Math.max(1, filteredItems.length);
                const pct = (entry.value / total) * 100;
                return (
                  <div
                    key={entry.bucket}
                    className="barRow barRowInteractive"
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
                    <div className="barRowLabel">{STATUS_LABELS[entry.bucket]}</div>
                    <div className="barTrack">
                      <div className="barFill" style={{ width: `${pct}%`, background: STATUS_COLORS[entry.bucket] }} />
                    </div>
                    <div className="barRowValue">{entry.value}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="cardEmpty">No status values available.</div>
          )}
        </article>

        <article className="statsCard">
          <div className="cardHeader">
            <h2>Rating Profile</h2>
            <span>{ratingValues.length} ratings</span>
          </div>

          {ratingValues.length > 0 ? (
            <div className="ratingsChart">
              {ratingBuckets.map((bucket) => {
                const pct = ratingValues.length ? (bucket.value / ratingValues.length) * 100 : 0;
                const bucketValue = Number.parseInt(bucket.name, 10);
                const bucketItems = filteredItems.filter((item) => {
                  if (typeof item.rating !== "number" || !Number.isFinite(item.rating)) return false;
                  const rounded = Math.max(1, Math.min(10, Math.round(item.rating)));
                  return rounded === bucketValue;
                });
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
                    <div className="ratingBarTrack">
                      <div className="ratingBar" style={{ height: `${pct}%` }} />
                    </div>
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
            <h2>Release Timeline</h2>
            <span>{releaseYearSeries.length ? `${releaseYearSeries[0].year} - ${releaseYearSeries[releaseYearSeries.length - 1].year}` : "No dates"}</span>
          </div>

          {releaseYearSeries.length > 0 ? (
            <div className="timelineWrap">
              <svg viewBox="0 0 520 168" className="releaseSvg" role="img" aria-label="Release year trend">
                <defs>
                  <linearGradient id="releaseAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(255, 115, 87, 0.72)" />
                    <stop offset="100%" stopColor="rgba(255, 115, 87, 0.08)" />
                  </linearGradient>
                </defs>
                <path d={releasePaths.areaPath} fill="url(#releaseAreaGradient)" />
                <path d={releasePaths.linePath} fill="none" stroke="#ff7357" strokeWidth="3" />
                {releasePointCoords.map((point) => {
                  const isPeak = releasePeakYearSet.has(point.year);
                  const isLow = !isPeak && releaseLowYearSet.has(point.year);
                  const releaseYearItems = filteredItems.filter(
                    (item) => item.releaseDate?.getUTCFullYear() === point.year
                  );
                  return (
                    <g
                      key={`release-point-${point.year}`}
                      className="releasePointGroup"
                      role="button"
                      tabIndex={0}
                      aria-label={`Open release timeline details for ${point.year}`}
                      onClick={() =>
                        openStatisticDetail({
                          id: `RELEASE_YEAR_${point.year}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                          title: `Release Timeline: ${point.year}`,
                          value: `${point.value}`,
                          summary: `Items with release date in ${point.year} for current scope.`,
                          calculation: "Filter items where releaseDate year equals selected timeline year.",
                          items: releaseYearItems,
                        })
                      }
                      onKeyDown={(event) =>
                        handleInteractiveKeyDown(event, () =>
                          openStatisticDetail({
                            id: `RELEASE_YEAR_${point.year}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                            title: `Release Timeline: ${point.year}`,
                            value: `${point.value}`,
                            summary: `Items with release date in ${point.year} for current scope.`,
                            calculation: "Filter items where releaseDate year equals selected timeline year.",
                            items: releaseYearItems,
                          })
                        )
                      }
                    >
                      <circle
                        className={`releasePoint ${isPeak ? "peak" : isLow ? "low" : ""}`}
                        cx={point.x}
                        cy={point.y}
                        r={isPeak ? 4.2 : isLow ? 3.8 : 2.6}
                      >
                        <title>{`${point.year}: ${point.value}`}</title>
                      </circle>
                      {isPeak ? (
                        <text
                          className="releasePeakValue"
                          x={point.x}
                          y={Math.max(12, point.y - 7)}
                          textAnchor="middle"
                        >
                          {point.value}
                        </text>
                      ) : null}
                      {isLow ? (
                        <text
                          className="releaseLowValue"
                          x={point.x}
                          y={Math.min(164, point.y + 13)}
                          textAnchor="middle"
                        >
                          {point.value}
                        </text>
                      ) : null}
                    </g>
                  );
                })}
              </svg>
              <div className="timelineYears">
                {releaseYearSeries.map((entry, index) => {
                  const releaseYearCount = releaseYearSeries.length;
                  const isFirst = index === 0;
                  const isLast = index === releaseYearCount - 1;
                  const isPenultimateInDenseSeries =
                    releaseYearCount > 6 && index === releaseYearCount - 2;
                  const showLabel =
                    isFirst ||
                    isLast ||
                    (!isPenultimateInDenseSeries && index % releaseYearLabelStep === 0);
                  return (
                    <span
                      key={entry.year}
                      className={`timelineYear ${showLabel ? "visible" : "hidden"}`}
                      title={`${entry.year}`}
                    >
                      {entry.year}
                    </span>
                  );
                })}
              </div>
              {releasePeakRows.length > 0 ? (
                <div className="timelinePeaks" aria-label="Top release year peaks">
                  {releasePeakRows.map((entry) => (
                    <button
                      key={`release-peak-${entry.year}`}
                      type="button"
                      className="timelinePeakTag timelineTagButton"
                      onClick={() =>
                        openStatisticDetail({
                          id: `RELEASE_PEAK_${entry.year}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                          title: `Release Peak Year: ${entry.year}`,
                          value: `${entry.value}`,
                          summary: `Release-year peak entry for ${entry.year} in current scope.`,
                          calculation: "Top years by count of items where releaseDate year equals each year.",
                          items: filteredItems.filter((item) => item.releaseDate?.getUTCFullYear() === entry.year),
                        })
                      }
                    >
                      {entry.year}: {entry.value}
                    </button>
                  ))}
                </div>
              ) : null}
              {releaseLowRows.length > 0 ? (
                <div className="timelineLows" aria-label="Lowest release year counts">
                  {releaseLowRows.map((entry) => (
                    <button
                      key={`release-low-${entry.year}`}
                      type="button"
                      className="timelineLowTag timelineTagButton"
                      onClick={() =>
                        openStatisticDetail({
                          id: `RELEASE_LOW_${entry.year}_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}`,
                          title: `Release Low Year: ${entry.year}`,
                          value: `${entry.value}`,
                          summary: `Release-year low entry for ${entry.year} in current scope.`,
                          calculation: "Lowest non-zero years by count of items where releaseDate year equals each year.",
                          items: filteredItems.filter((item) => item.releaseDate?.getUTCFullYear() === entry.year),
                        })
                      }
                    >
                      {entry.year}: {entry.value}
                    </button>
                  ))}
                </div>
              ) : null}
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
          </div>
        </article>

        {filter !== "all" ? (
          <article className="statsCard spanFull">
            <div className="cardHeader">
              <h2>Top 10 Comparison</h2>
              <span>{MEDIA_LABELS[filter]} · {statsYearLabel}</span>
            </div>
            <div className="topRatedComparison">
              <section className="topRatedColumn">
                <div className="topRatedColumnHeader">
                  <h3>Top 10 Rated by Me</h3>
                  <span>{topMyRatedItems.length} ranked</span>
                </div>
                {topMyRatedItems.length > 0 ? (
                  <div className="topRatedGrid">
                    {topMyRatedItems.map((item, index) => (
                      <figure
                        key={`my-${item.mediaType}-${item.title}-${index + 1}`}
                        className="topRatedTile topRatedTileInteractive"
                        title={`${index + 1}. ${item.title}`}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          openStatisticDetail({
                            id: `TOP10_MY_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}_${index + 1}`,
                            title: `Top Rated by Me #${index + 1}`,
                            value: formatScoreValue(item.rating),
                            summary: "Individual entry from the Top 10 Rated by Me list.",
                            calculation: "Rank by personal rating desc with date/title tie-breakers.",
                            items: [item],
                          })
                        }
                        onKeyDown={(event) =>
                          handleInteractiveKeyDown(event, () =>
                            openStatisticDetail({
                              id: `TOP10_MY_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}_${index + 1}`,
                              title: `Top Rated by Me #${index + 1}`,
                              value: formatScoreValue(item.rating),
                              summary: "Individual entry from the Top 10 Rated by Me list.",
                              calculation: "Rank by personal rating desc with date/title tie-breakers.",
                              items: [item],
                            })
                          )
                        }
                      >
                        <div className="topRatedScore">{formatScoreValue(item.rating)}</div>
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={`${item.title} cover`} loading="lazy" />
                        ) : (
                          <div className="topRatedFallback">No Cover</div>
                        )}
                        <figcaption>
                          <span className="topRatedTitle">{item.title}</span>
                          <span className="topRatedMeta">{formatScoreValue(item.rating)}</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <div className="cardEmpty compactEmpty">No personal ratings in the {statsYearScopePhrase}.</div>
                )}
              </section>

              <section className="topRatedColumn">
                <div className="topRatedColumnHeader">
                  <h3>{EXTERNAL_RATING_LABELS[filter]}</h3>
                  <span>{topExternalRatedItems.length} ranked</span>
                </div>
                {topExternalRatedItems.length > 0 ? (
                  <div className="topRatedGrid">
                    {topExternalRatedItems.map((item, index) => (
                      <figure
                        key={`ext-${item.mediaType}-${item.title}-${index + 1}`}
                        className="topRatedTile topRatedTileInteractive"
                        title={`${index + 1}. ${item.title}`}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          openStatisticDetail({
                            id: `TOP10_EXTERNAL_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}_${index + 1}`,
                            title: `Top External Rated #${index + 1}`,
                            value: formatScoreValue(item.externalRating),
                            summary: "Individual entry from the Top 10 external rating list.",
                            calculation: "Rank by external rating desc with date/title tie-breakers.",
                            items: [item],
                          })
                        }
                        onKeyDown={(event) =>
                          handleInteractiveKeyDown(event, () =>
                            openStatisticDetail({
                              id: `TOP10_EXTERNAL_${filter.toUpperCase()}_${selectedStatsYear === ALL_STATS_YEARS ? "ALL_YEARS" : selectedStatsYear}_${index + 1}`,
                              title: `Top External Rated #${index + 1}`,
                              value: formatScoreValue(item.externalRating),
                              summary: "Individual entry from the Top 10 external rating list.",
                              calculation: "Rank by external rating desc with date/title tie-breakers.",
                              items: [item],
                            })
                          )
                        }
                      >
                        <div className="topRatedScore">{formatScoreValue(item.externalRating)}</div>
                        {item.coverUrl ? (
                          <img src={item.coverUrl} alt={`${item.title} cover`} loading="lazy" />
                        ) : (
                          <div className="topRatedFallback">No Cover</div>
                        )}
                        <figcaption>
                          <span className="topRatedTitle">{item.title}</span>
                          <span className="topRatedMeta">{formatScoreValue(item.externalRating)}</span>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <div className="cardEmpty compactEmpty">No external ratings in the {statsYearScopePhrase}.</div>
                )}
              </section>
            </div>
          </article>
        ) : null}
      </div>
        </div>
      )}

      {activeStatDetail ? (
        <div
          className="statDetailOverlay"
          role="presentation"
          onClick={() => setActiveStatDetail(null)}
        >
          <div
            className="statDetailDialog"
            role="dialog"
            aria-modal="true"
            aria-label={`Statistic details for ${activeStatDetail.title}`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="statDetailHeader">
              <div className="statDetailHeaderMain">
                <div className="statDetailId">ID: {activeStatDetail.id}</div>
                <h3>{activeStatDetail.title}</h3>
                <div className="statDetailValue">{activeStatDetail.value}</div>
              </div>
              <button
                type="button"
                className="statDetailClose"
                onClick={() => setActiveStatDetail(null)}
              >
                Close
              </button>
            </div>

            <div className="statDetailSummaryGrid">
              <div className="statDetailSummaryCard">
                <div className="statDetailSummaryLabel">What This Tracks</div>
                <p>{activeStatDetail.summary}</p>
              </div>
              <div className="statDetailSummaryCard">
                <div className="statDetailSummaryLabel">How It Is Calculated</div>
                <p>{activeStatDetail.calculation}</p>
              </div>
            </div>

            <div className="statDetailItemsHeader">
              Matching Items <span>{activeStatDetail.items.length}</span>
            </div>

            <div className="statDetailItemsList">
              {activeStatDetail.items.length > 0 ? (
                activeStatDetail.items.map((item, index) => {
                  const anchorDate = item.activityDate || item.completionDate || item.releaseDate;
                  const anchorLabel = item.activityDate
                    ? "Activity"
                    : item.completionDate
                      ? "Completed"
                      : "Release";
                  return (
                    <div
                      key={`${activeStatDetail.id}-${item.mediaType}-${item.title}-${index}`}
                      className="statDetailItemRow"
                    >
                      <div className="statDetailItemRank">{index + 1}</div>
                      <div className="statDetailItemMain">
                        <div className="statDetailItemTitle">{item.title}</div>
                        <div className="statDetailItemMeta">
                          <span>{MEDIA_LABELS[item.mediaType]}</span>
                          <span>{STATUS_LABELS[item.statusBucket]}</span>
                          <span>
                            {anchorLabel}: {formatDetailDate(anchorDate)}
                          </span>
                          <span>Rating: {typeof item.rating === "number" ? item.rating.toFixed(1) : "-"}</span>
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
      ) : null}

      <style jsx>{`
        .statsRoot {
          --stats-bg: rgba(8, 20, 44, 0.86);
          --stats-card: linear-gradient(156deg, rgba(30, 59, 106, 0.82), rgba(16, 34, 70, 0.9));
          --stats-border: rgba(125, 171, 242, 0.3);
          --stats-text: rgba(233, 243, 255, 0.96);
          --stats-muted: rgba(191, 211, 240, 0.8);
          --stats-accent-1: #5ee0ff;
          --stats-accent-2: #62f39b;
          --stats-accent-3: #ffca66;
          --stats-accent-4: #ff87d7;
          position: relative;
          min-height: calc(100vh - 12px);
          margin: 8px 10px 0 10px;
          border-radius: 20px;
          padding: clamp(14px, 2vw, 24px);
          overflow: hidden;
          color: var(--stats-text);
          background:
            radial-gradient(circle at 12% -8%, rgba(78, 144, 250, 0.25), transparent 42%),
            radial-gradient(circle at 96% 12%, rgba(43, 218, 170, 0.19), transparent 34%),
            var(--stats-bg);
          border: 1px solid rgba(117, 160, 228, 0.36);
          box-shadow:
            inset 0 1px 0 rgba(214, 234, 255, 0.22),
            0 26px 70px rgba(4, 12, 29, 0.54),
            0 6px 18px rgba(0, 0, 0, 0.35);
          animation: statsFadeRise 480ms cubic-bezier(0.22, 1, 0.36, 1);
        }

        .statsBackgroundGlow {
          position: absolute;
          width: 460px;
          height: 460px;
          right: -130px;
          bottom: -210px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(117, 148, 255, 0.3), rgba(117, 148, 255, 0));
          pointer-events: none;
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
          color: #f4f8ff;
          text-shadow: 0 4px 24px rgba(53, 116, 244, 0.4);
        }

        .statsSubtitle {
          margin: 6px 0 0 0;
          font-size: 12px;
          font-weight: 600;
          color: var(--stats-muted);
          letter-spacing: 0.02em;
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
          align-items: flex-end;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .statsYearPicker {
          min-width: 96px;
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
          background: linear-gradient(140deg, rgba(56, 111, 211, 0.9), rgba(46, 90, 168, 0.94));
          border-color: rgba(169, 212, 255, 0.9);
          box-shadow: 0 10px 22px rgba(12, 39, 92, 0.45), inset 0 1px 0 rgba(220, 242, 255, 0.35);
          color: #f6fbff;
        }

        .yearReviewControls {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .yearReviewTitle {
          margin: 0;
          font-size: clamp(20px, 3.5vw, 28px);
          line-height: 1.1;
          font-weight: 900;
          color: #f7fbff;
          letter-spacing: 0.01em;
        }

        .yearReviewSubtitle {
          margin: 6px 0 0 0;
          color: rgba(194, 214, 242, 0.86);
          font-size: 12px;
          font-weight: 600;
        }

        .yearReviewPicker {
          display: inline-flex;
          flex-direction: column;
          gap: 6px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgba(189, 211, 243, 0.86);
          font-weight: 800;
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
          padding: 9px 10px;
          display: flex;
          flex-direction: column;
          gap: 4px;
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
          color: rgba(182, 206, 237, 0.8);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .yearStoryChip strong {
          color: #f5faff;
          font-size: 13px;
          line-height: 1.25;
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
          width: 100%;
          aspect-ratio: 3 / 4;
          border-radius: 10px;
          overflow: hidden;
          border: 1px solid rgba(137, 175, 236, 0.44);
          background: rgba(9, 20, 42, 0.85);
          box-shadow: 0 10px 22px rgba(0, 0, 0, 0.35);
        }

        .yearSpotlightCover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
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
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
          position: relative;
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
          width: 100%;
          aspect-ratio: 3 / 4;
          object-fit: cover;
          border-radius: 9px;
          border: 1px solid rgba(136, 174, 237, 0.42);
          background: rgba(9, 19, 41, 0.76);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
          display: block;
        }

        .yearTopRatedTile figcaption {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .yearTopRatedTitle {
          font-size: 10px;
          color: rgba(186, 210, 240, 0.82);
          font-weight: 700;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .yearTopRatedMeta {
          font-size: 9px;
          color: rgba(166, 196, 233, 0.76);
          font-weight: 700;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
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
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          position: relative;
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
          width: 100%;
          aspect-ratio: 3 / 4;
          object-fit: cover;
          border-radius: 9px;
          border: 1px solid rgba(136, 174, 237, 0.42);
          background: rgba(9, 19, 41, 0.76);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
          display: block;
        }

        .topRatedScore {
          position: absolute;
          top: 4px;
          right: 4px;
          z-index: 2;
          font-size: 10px;
          font-weight: 900;
          color: #f9fcff;
          background: rgba(8, 18, 40, 0.8);
          border: 1px solid rgba(151, 188, 245, 0.6);
          border-radius: 999px;
          padding: 2px 6px;
          line-height: 1.1;
          backdrop-filter: blur(2px);
        }

        .topRatedFallback {
          width: 100%;
          aspect-ratio: 3 / 4;
          border-radius: 9px;
          border: 1px solid rgba(136, 174, 237, 0.42);
          background: rgba(9, 19, 41, 0.76);
          display: grid;
          place-items: center;
          font-size: 9px;
          color: rgba(184, 207, 240, 0.8);
          font-weight: 700;
        }

        .topRatedTile figcaption {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .topRatedTitle {
          font-size: 10px;
          color: rgba(186, 210, 240, 0.82);
          font-weight: 700;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .topRatedMeta {
          font-size: 9px;
          color: rgba(166, 196, 233, 0.76);
          font-weight: 700;
          line-height: 1.2;
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
          font-size: clamp(26px, 4vw, 34px);
          line-height: 1;
          font-weight: 900;
          color: #ffffff;
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

        .ratingsChart {
          display: grid;
          grid-template-columns: repeat(10, minmax(0, 1fr));
          gap: 6px;
          align-items: end;
          flex: 1;
          min-height: 148px;
        }

        .ratingCol {
          display: flex;
          flex-direction: column;
          align-items: center;
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

        .ratingBar {
          width: 100%;
          height: 0;
          border-radius: 5px 5px 2px 2px;
          background: linear-gradient(180deg, #ffe067, #ff8f65);
          border: 1px solid rgba(255, 255, 255, 0.28);
          box-shadow: 0 8px 16px rgba(0, 0, 0, 0.28);
        }

        .ratingLabel {
          font-size: 10px;
          color: rgba(194, 214, 242, 0.82);
          font-weight: 800;
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
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
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
          font-size: 20px;
          font-weight: 900;
          color: #ffffff;
          line-height: 1.15;
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

        .statDetailOverlay {
          position: fixed;
          inset: 0;
          z-index: 2500;
          background: rgba(3, 9, 20, 0.6);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 14px;
        }

        .statDetailDialog {
          width: min(980px, 100%);
          max-height: min(88vh, 860px);
          overflow: auto;
          border-radius: 16px;
          border: 1px solid rgba(123, 177, 245, 0.46);
          background: linear-gradient(165deg, rgba(15, 33, 65, 0.97), rgba(7, 18, 38, 0.98));
          box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5);
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .statDetailHeader {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 10px;
          border-bottom: 1px solid rgba(111, 158, 230, 0.36);
          padding-bottom: 10px;
        }

        .statDetailHeaderMain {
          min-width: 0;
        }

        .statDetailId {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(157, 201, 255, 0.9);
        }

        .statDetailHeaderMain h3 {
          margin: 6px 0 0 0;
          font-size: 18px;
          font-weight: 900;
          color: #f3f9ff;
        }

        .statDetailValue {
          margin-top: 4px;
          font-size: 28px;
          line-height: 1;
          font-weight: 900;
          color: #fff;
        }

        .statDetailClose {
          border: 1px solid rgba(152, 196, 250, 0.7);
          background: linear-gradient(160deg, rgba(42, 90, 164, 0.92), rgba(25, 58, 109, 0.92));
          color: #e9f4ff;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.03em;
          padding: 6px 10px;
          cursor: pointer;
        }

        .statDetailSummaryGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .statDetailSummaryCard {
          border: 1px solid rgba(118, 162, 233, 0.35);
          border-radius: 10px;
          background: rgba(9, 21, 44, 0.78);
          padding: 10px;
          min-height: 78px;
        }

        .statDetailSummaryLabel {
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: rgba(161, 203, 255, 0.9);
        }

        .statDetailSummaryCard p {
          margin: 7px 0 0 0;
          font-size: 12px;
          color: rgba(215, 231, 251, 0.94);
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
          color: rgba(177, 214, 255, 0.9);
        }

        .statDetailItemsHeader span {
          color: #f8fcff;
        }

        .statDetailItemsList {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-height: 120px;
        }

        .statDetailItemRow {
          display: grid;
          grid-template-columns: 28px 1fr;
          gap: 8px;
          border: 1px solid rgba(121, 169, 238, 0.33);
          border-radius: 10px;
          background: rgba(9, 21, 44, 0.7);
          padding: 8px 9px;
        }

        .statDetailItemRank {
          width: 28px;
          height: 28px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 10px;
          font-weight: 900;
          color: rgba(239, 249, 255, 0.98);
          border: 1px solid rgba(142, 191, 255, 0.52);
          background: rgba(28, 63, 118, 0.8);
        }

        .statDetailItemMain {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .statDetailItemTitle {
          font-size: 13px;
          font-weight: 800;
          color: #f7fbff;
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
          color: rgba(201, 223, 249, 0.94);
          background: rgba(12, 30, 60, 0.65);
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

          .yearReviewControls {
            align-items: flex-start;
          }

          .yearReviewPicker {
            width: 100%;
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

          .barRow {
            grid-template-columns: minmax(60px, 78px) 1fr auto;
          }

          .statDetailSummaryGrid {
            grid-template-columns: minmax(0, 1fr);
          }

          .releaseSvg {
            height: 158px;
          }
        }
      `}</style>
    </section>
  );
}
