/* =====================================================================================
  Chris' Delicious Library
  Version: 4.1.2
   Notes:
   - Client-side CSV load from Google Sheets (published CSV)
   - Left sidebar menu (Delicious Library style)
   - 1 shelf image per row (no gaps between shelves)
   - Posters only (no title labels)
   - Posters align to shelf lip
   - DVD case frame overlay (no left border) + glossy black edge
   
   v4.1.2 Changes:
   - Added keyboard arrow key nudging for the quick inset editor

   v4.1.1 Changes:
   - Rebuilt Cover Insets into one fast quick editor
   - Added target dropdown for TV, Movies, Books, and Game platforms
   - Added mode-based nudge controls with live transparent preview

   v4.1.0 Changes:
   - Removed Inset Studio to reset this feature from scratch
   - Added visible in-app version badge in sidebar
   - Added clickable recent version notes panel

   v4.0.0 Changes:
   - Added platform-specific game overlay and inset controls
   - Reduced Media popup density (smaller typography/padding) so more fields fit onscreen

   v3.0.0 Changes:
   - Added Sidebar Theme system with two themes: Standard and Winter Gray
   - New "Sidebar Theme" section under Themes menu for easy switching
   - Winter Gray theme features sage green/teal color scheme (#769795, #4e7470)
   - Winter Gray uses gray sidebar background (sidebar_gray.png)
   - Theme-specific colors for highlights, search bar, sort dropdowns, and rolodex
   - Winter Gray has unified sage green count bubbles for all media types
   - Winter Gray rolodex has dark teal digits and black label text
   - Winter Gray rolodex tiles have gray gradient background
   - All theme settings persist to Google Sheets
   - Standard theme maintains original reddish-brown color scheme
   - Fixed React warnings by changing sidebar background to backgroundImage
   
   v2.1.0 Changes:
   - Fixed AbortError in saveSettingToSheet when timeout fires (graceful handling)
   - Optimized saveInsetsToSheet to use Promise.all() for parallel requests (~5s instead of 30s)
   - Platform-specific game inset saving now saves only selected platform (not all)
   - Game inset button label dynamically shows selected platform
   - Improved performance: 4 parallel requests instead of 4 sequential
   
   v2.0.0 Changes:
   - Added full Games support with CSV integration
   - Games now display in library alongside TV shows, movies, and books
   - Games tracked in statistics and filterable
   - Games have dedicated cover size and inset settings
   
   v1.11.0 Changes:
   - Enhanced settings spreadsheet with Category and Description columns
   - Settings now organized by category for easier management
   - Human-readable descriptions for all settings
   
   v1.10.1 Changes:
   - Added "Save All Settings to Sheet" button in Settings
   - Allows manual saving of all current settings to spreadsheet
   
   v1.10.0 Changes:
   - Added settings sync with Google Sheets
   - Settings are loaded from settings spreadsheet on startup
   - Settings can be written back to Google Sheets (requires API setup)
   - All cover sizes, insets, and positioning now persistable
   
   v1.9.3 Changes:
   - Changed movie left inset to 120 and right inset to 100
   
   v1.9.2 Changes:
   - Changed default movies poster size to 108
   
   v1.9.1 Changes:
   - Changed default movie left inset to 100
   
   v1.9.0 Changes:
   - Added Movie Insets settings section to customize movie poster positioning within frame
   - Movies now have independent inset controls separate from TV shows and books
   
   v1.8.3 Changes:
   - Changed default movies poster size to 110
   
   v1.8.2 Changes:
   - Changed default movies poster size to 115 (same as books)
   
   v1.8.1 Changes:
   - Movies now use movie-frame.png overlay instead of DVD case frame
   
   v1.8.0 Changes:
   - Added full Movies support with CSV integration
   - Movies now display in library alongside TV shows and books
   - Movies tracked in statistics and filterable
   - Movies use DVD case frame overlay like TV shows
   
   v1.7.5 Changes:
   - Reorganized Settings into 5 collapsible submenus (Cover Size, Frame Position, Book Insets, Logo Customization, Sync Status Customization)
   - Changed LIBRARY section color to #954949
   - Added DISCOVER section with Settings and Statistics buttons
   - Updated logo from Logo2.png to logo4.png with full-width layout
   - Made sync icon absolutely positioned for independent movement
   - Added adjustable settings for sync icon size and position
===================================================================================== */

"use client";

import { type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Papa from "papaparse";
import { RolodexCounter } from "./components/RolodexCounter";
import { MediaModal } from "./components/MediaModal";
import { AddItemModal, type AddItemPayload } from "./components/AddItemModal";
import { StatisticsView } from "./components/StatisticsView";

type Row = Record<string, string>;
type CoverCandidate = { label: string; url: string };
type MediaType = "book" | "movie" | "tv" | "game";
type QuickInsetMode = "insetPosition" | "overlayPosition" | "overlayScale" | "coverPosition" | "coverScale";
type InsetEditableMediaType = "tv" | "movie" | "book";
type OverlaySettings = { width: number; height: number; top: number; left: number };
type CoverScaleSettings = { x: number; y: number };
type CoverOffsetSettings = { x: number; y: number };
type WishlistPointerDrag = {
  pointerId: number;
  key: string;
  startX: number;
  startY: number;
  pointerX: number;
  pointerY: number;
  grabOffsetX: number;
  grabOffsetY: number;
  dragWidth: number;
  dragHeight: number;
  momentumX: number;
  momentumY: number;
  active: boolean;
};

type Show = {
  title: string;
  posterUrl: string;
  metadataCoverUrl?: string;
  posterUrlFallback?: string;
  coverSource?: string;
  coverCandidates?: CoverCandidate[];
  year?: string;
  tmdbId?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  numberOfSeasons?: string;
  numberOfEpisodes?: string;
  watchStatus?: string;
  watched?: string;
  dateCompleted?: string;
  caughtUp?: string;
  showStatus?: string;
  networks?: string;
  streamingUS?: string;
  genres?: string;
  tmdbRating?: string;
  myRating?: string;
  backdropUrl?: string;
  overview?: string;
  ownership?: string;
  tag?: string;
};

type Book = {
  title: string;
  posterUrl: string;
  metadataCoverUrl?: string;
  coverSource?: string;
  coverCandidates?: CoverCandidate[];
  posterUrlFallback?: string;
  cover?: string;
  subtitle?: string;
  author?: string;
  isbn?: string;
  isbn10?: string;
  isbn13?: string;
  releaseDate?: string;
  completedDate?: string;
  status?: string;
  types?: string;
  series?: string;
  categories?: string;
  genre?: string;
  ownership?: string;
  tag?: string;
  tags?: string;
  openLibraryWorkKey?: string;
  googleBooksVolumeId?: string;
  description?: string;
  imageUrl?: string;
  customImageUrl?: string;
  externalAverageRating?: string;
  userRating?: string;
  myRating?: string;
  pages?: string;
  audiobookDuration?: string;
  githubCoverUrl?: string;
  coverSyncStatus?: string;
  wishlistOrder?: string;
  queuedOrder?: string;
};

type Movie = {
  title: string;
  posterUrl: string;
  metadataCoverUrl?: string;
  coverSource?: string;
  coverCandidates?: CoverCandidate[];
  csvUrl?: string;
  year?: string;
  poster?: string;
  myRating?: string;
  tmdbRating?: string;
  tmdbId?: string;
  watched?: string;
  watchDate?: string;
  tags?: string;
  releaseDate?: string;
  runtime?: string;
  watchStatus?: string;
  status?: string;
  movieStatus?: string;
  ownership?: string;
  tag?: string;
  overview?: string;
  backdropUrl?: string;
  genres?: string;
};

type Game = {
  title: string;
  posterUrl: string;
  metadataCoverUrl?: string;
  posterUrlFallback?: string;
  coverSource?: string;
  coverCandidates?: CoverCandidate[];
  cover?: string;
  platform?: string;
  status?: string;
  name?: string;
  releaseDate?: string;
  releaseDateAlt?: string;
  platforms?: string;
  coverUrl?: string;
  rating?: string;
  igdbRating?: string;
  myRating?: string;
  playStatus?: string;
  gameStatus?: string;
  ownership?: string;
  format?: string;
  backlog?: string;
  completed?: string;
  dateCompleted?: string;
  yearPlayed?: string;
  dateAdded?: string;
  description?: string;
  genres?: string;
  hoursPlayed?: string;
  coverCachedAt?: string;
  developer?: string;
  screensotsUrl?: string;
  wishlistOrder?: string;
  queuedOrder?: string;
  igdbId?: string;
  igdbIdOverride?: string;
  localCoverUrl?: string;
  tag?: string;
};

type SmartListMediaType = "book" | "movie" | "tv" | "game";
type SmartListYearSourceKey =
  | "book_completed_date"
  | "book_release_date"
  | "movie_release_date"
  | "tv_first_air_date"
  | "tv_tag"
  | "game_completed_year"
  | "game_release_date";
type SmartListYearFilters = Partial<Record<SmartListYearSourceKey, string[]>>;
type SmartListYearFiltersByMedia = Partial<Record<SmartListMediaType, SmartListYearFilters>>;

type SmartList = {
  id: string;
  name: string;
  mediaTypes: SmartListMediaType[];
  statuses: Partial<Record<SmartListMediaType, string[]>>;
  yearFilters: SmartListYearFiltersByMedia;
  tags: string[];
  icon: string;
  defaultSortField: string;
  defaultSortOrder: "Asc" | "Desc";
  allowManualSort: boolean;
};

type SmartListDraft = Omit<SmartList, "id">;

type SmartListStatusOption = {
  value: string;
  label: string;
};

type SmartListTagOption = {
  value: string;
  label: string;
};

type SmartListYearSourceOption = {
  key: SmartListYearSourceKey;
  label: string;
  columnLabel: string;
};

const APP_TITLE = "Chris’ Delicious Library";
const APP_VERSION = "5.3.4";
const SPLASH_MIN_DURATION_MS = 1500;
const MANUAL_SORT_FIELD = "Manual";
const SMART_LISTS_SETTING_KEY = "smartLists:v1";
const SMART_LIST_MANUAL_ORDER_SETTING_PREFIX = "smartListManualOrder:";
const SMART_LIST_ALLOWED_SORT_FIELDS = new Set([
  "Title",
  "ReleaseDate",
  "CompletedDate",
  "CompletedDateOrReleaseDate",
  "MyRatingSort",
  "ExternalRatingSort",
  MANUAL_SORT_FIELD,
]);
const SMART_LIST_MEDIA_LABELS: Record<SmartListMediaType, string> = {
  book: "Books",
  movie: "Movies",
  tv: "TV Shows",
  game: "Games",
};
const SMART_LIST_YEAR_SOURCE_OPTIONS_BY_MEDIA: Record<SmartListMediaType, SmartListYearSourceOption[]> = {
  book: [
    { key: "book_completed_date", label: "Completed Year", columnLabel: "CompletedDate" },
    { key: "book_release_date", label: "Release Year", columnLabel: "ReleaseDate" },
  ],
  movie: [
    { key: "movie_release_date", label: "Release Year", columnLabel: "ReleaseDate" },
  ],
  tv: [
    { key: "tv_first_air_date", label: "First Air Year", columnLabel: "FirstAirDate" },
    { key: "tv_tag", label: "Tag Year", columnLabel: "Tags" },
  ],
  game: [
    { key: "game_completed_year", label: "Completed Year", columnLabel: "Date Completed / Year Played" },
    { key: "game_release_date", label: "Release Year", columnLabel: "ReleaseDate" },
  ],
};
const SMART_LIST_YEAR_SOURCE_KEYS = new Set<SmartListYearSourceKey>(
  Object.values(SMART_LIST_YEAR_SOURCE_OPTIONS_BY_MEDIA)
    .flat()
    .map((source) => source.key)
);
const SMART_LIST_LEGACY_YEAR_SOURCE_BY_MEDIA: Record<SmartListMediaType, SmartListYearSourceKey> = {
  book: "book_completed_date",
  movie: "movie_release_date",
  tv: "tv_tag",
  game: "game_completed_year",
};
const SMART_LIST_ICON_OPTIONS = [
  { value: "", label: "Placeholder" },
  { value: "/icon-other.png", label: "Other" },
  { value: "/icon-year.png", label: "Year" },
  { value: "/icon-current.png", label: "Current" },
  { value: "/icon-completed.png", label: "Completed" },
  { value: "/icon-abaonded.png", label: "Abandoned" },
  { value: "/icon-books.png", label: "Books" },
  { value: "/icon-movies.png", label: "Movies" },
  { value: "/icon-tv.png", label: "TV" },
  { value: "/icon-games.png", label: "Games" },
  { value: "/icon-watchlist.png", label: "Watchlist" },
  { value: "/icon-wishlist.png", label: "Wishlist" },
] as const;
const WISHLIST_SORT_FIELD_SETTING_KEY = "viewSortField:wishlist";
const WISHLIST_SORT_ORDER_SETTING_KEY = "viewSortOrder:wishlist";
const WISHLIST_MANUAL_ORDER_SETTING_KEY = "viewManualOrder:wishlist";
const READ_NEXT_SORT_FIELD_SETTING_KEY = "viewSortField:wishlist-books";
const READ_NEXT_SORT_ORDER_SETTING_KEY = "viewSortOrder:wishlist-books";
const READ_NEXT_MANUAL_ORDER_SETTING_KEY = "viewManualOrder:wishlist-books";
const PLAY_NEXT_SORT_FIELD_SETTING_KEY = "viewSortField:play-next";
const PLAY_NEXT_SORT_ORDER_SETTING_KEY = "viewSortOrder:play-next";
const PLAY_NEXT_MANUAL_ORDER_SETTING_KEY = "viewManualOrder:play-next";
const WATCHLIST_MOVIES_SORT_FIELD_SETTING_KEY = "viewSortField:watchlist-movies";
const WATCHLIST_MOVIES_SORT_ORDER_SETTING_KEY = "viewSortOrder:watchlist-movies";
const WATCHLIST_MOVIES_MANUAL_ORDER_SETTING_KEY = "viewManualOrder:watchlist-movies";
const WATCHLIST_TV_SORT_FIELD_SETTING_KEY = "viewSortField:watchlist-tv";
const WATCHLIST_TV_SORT_ORDER_SETTING_KEY = "viewSortOrder:watchlist-tv";
const WATCHLIST_TV_MANUAL_ORDER_SETTING_KEY = "viewManualOrder:watchlist-tv";
const SIDEBAR_ICON_OVERRIDES_LOCAL_KEY = "cdlSidebarIconOverrides";
const SIDEBAR_ICON_SETTING_PREFIX = "sidebarIcon:";
const POPUP_OVERLAY_Z_INDEX = 2147483000;
const POPUP_PANEL_Z_INDEX = 2147483200;
const POPUP_FAQ_Z_INDEX = 2147483300;
const VERSION_HISTORY = [
  {
    version: "5.3.4",
    date: "2026-02-20",
    notes: [
      "Fixed game rating rendering so game scores are consistently treated as a 10-point scale.",
      "A game rating of 5.0 now displays as 2.5 stars (5.0/10) instead of 5 stars.",
    ],
  },
  {
    version: "5.3.3",
    date: "2026-02-20",
    notes: [
      "Moved splash overlay to render first so it is the first painted element.",
      "Inlined critical splash panel/logo/spinner styling to prevent any initial unstyled flash.",
    ],
  },
  {
    version: "5.3.2",
    date: "2026-02-20",
    notes: [
      "Redesigned startup splash to a near full-screen rounded dark-blue translucent panel.",
      "Increased splash logo and spinner sizes to better match the mock layout.",
    ],
  },
  {
    version: "5.3.1",
    date: "2026-02-20",
    notes: [
      "Updated the startup splash style to use the dark-blue transparent popup theme.",
      "Replaced splash loading text with a blue animated spinner/throbber.",
    ],
  },
  {
    version: "5.3.0",
    date: "2026-02-20",
    notes: [
      "Added a startup splash screen so the app loads behind it without flashing intermediate loading states.",
      "Splash now stays visible for at least 1.5 seconds and then dismisses when the initial data sync is complete.",
    ],
  },
  {
    version: "5.2.0",
    date: "2026-02-18",
    notes: [
      "Fixed Smart List deletion from the header Delete List button with confirmation and proper list removal.",
      "Preserved Smart List manual ordering when reopening lists that have saved manual order keys.",
      "Moved + Add Smart List to the bottom of the Smart Lists section.",
      "Improved Create Smart List popup responsiveness by suspending heavy shelf rendering while the popup is open.",
    ],
  },
  {
    version: "5.1.0",
    date: "2026-02-18",
    notes: [
      "Added custom Smart List creation and removal directly from the Smart Lists section.",
      "New Smart List builder popup supports media selection, per-media status filters, and optional year filtering (ex: completed in 2026).",
      "Added Smart List icon selection with placeholder support.",
      "Added per-Smart-List default sort settings and optional manual sorting support.",
    ],
  },
  {
    version: "5.0.1",
    date: "2026-02-17",
    notes: [
      "Fixed game status indicator mapping so \"Now Playing\" shows yellow (active) instead of red.",
      "Updated shelf row packing so Books, Movies, TV Shows, and Games fill shelf width consistently without extra right-side gaps.",
    ],
  },
  {
    version: "5.0.0",
    date: "2026-02-15",
    notes: [
      "Added a full in-app Add Item flow with a new + icon in the top header.",
      "New add modal supports Book, TV Show, Movie, and Game.",
      "Search integration now pulls candidates from Google Books, TMDB, and IGDB.",
      "Selected search results can be edited before saving to library and spreadsheet.",
      "Added manual-entry fallback for cases with no API match.",
    ],
  },
  {
    version: "4.6.0",
    date: "2026-02-15",
    notes: [
      "Reworked shelf spacing to use visible cover/overlay bounds so mixed cover types have consistent edge-to-edge gaps.",
      "Added Cover Gap Size setting in popup Cover Size controls.",
      "Improved settings save feedback with explicit save/sync status messaging.",
      "Fixed Save All settings boolean persistence and verification for show inset guide/status indicators.",
      "Forced consistent blue slider styling in standalone app mode.",
      "Updated settings load precedence to prefer local cached values over stale sheet reads on reopen.",
    ],
  },
  {
    version: "4.5.0",
    date: "2026-02-13",
    notes: [
      "Fixed Xbox One game covers getting clipped at the top by using platform-aware contain fit.",
      "Updated Games platform filtering so selected platforms render with matching platform overlays while Home still shows one deduplicated game per title.",
      "Made Games > Platform sidebar options denser and uniform-width (matching the widest item) so more platforms fit in view.",
      "Reduced sidebar module spacing for a tighter layout.",
    ],
  },
  {
    version: "4.1.2",
    date: "2026-02-11",
    notes: [
      "Added keyboard arrow key support for quick inset nudging.",
    ],
  },
  {
    version: "4.1.1",
    date: "2026-02-11",
    notes: [
      "Rebuilt Cover Insets into a single quick editor.",
      "Target dropdown now includes TV, Movies, Books, and game platforms.",
      "Added faster directional nudge controls with a live transparent preview.",
    ],
  },
  {
    version: "4.1.0",
    date: "2026-02-11",
    notes: [
      "Removed Inset Studio to rebuild it from scratch.",
      "Added clickable version badge on the page.",
      "Added recent version notes panel.",
    ],
  },
  {
    version: "4.0.0",
    date: "2026-02-11",
    notes: [
      "Platform-specific game frame/inset controls.",
      "General settings and layout tuning.",
    ],
  },
  {
    version: "3.0.0",
    date: "2026-02-09",
    notes: [
      "Introduced sidebar theming system.",
      "Added theme persistence settings.",
    ],
  },
] as const;
const ENV_KEY = "NEXT_PUBLIC_TV_SHEET_CSV_URL";
const BOOKS_ENV_KEY = "NEXT_PUBLIC_BOOKS_SHEET_CSV_URL";
const MOVIES_ENV_KEY = "NEXT_PUBLIC_MOVIES_SHEET_CSV_URL";
const GAMES_ENV_KEY = "NEXT_PUBLIC_GAMES_SHEET_CSV_URL";
const SETTINGS_WINDOW_DRAG_BLOCK_SELECTOR = "button, input, select, textarea, a, [role='button']";

// ✅ Put these in /public
const DEFAULT_SHELF_IMAGE = "/shelf-dark-walnut.png";
const DARK_WALNUT_TOP_HEADER_IMAGE = "/wood_beam_header_dark_walnut.png";
const LIGHT_OAK_TOP_HEADER_IMAGE = "/wood_beam_header_light_oak.png";
const WEATHERED_OAK_SHELF_IMAGE = "/shelf-weathered-gray-oak.png";
const SHELF_TOP_HEADER_IMAGES: Record<string, string> = {
  "/shelves-light-single2.png": LIGHT_OAK_TOP_HEADER_IMAGE,
  "/shelf-dark-walnut.png": "/wood_beam_header_dark_walnut.png",
  "/shelf-weathered-oak.png": "/wood_beam_header_weathered_oak.png",
  "/shelf-weathered-gray-oak.png": "/wood_beam_header_weathered_oak.png",
  "/shelf-honey-oak.png": "/wood_beam_header_honey_oak.png",
  "/shelf-teak.png": "/wood_beam_header_teak.png",
  "/shelf_white_oak.png": "/wood_beam_header_white_oak.png",
  "/shelf-reclaimed-oak.png": "/wood_beam_header_reclaimed_oak.png",
};
const normalizeShelfTheme = (theme: string): string => {
  if (theme === "/shelf-weathered-oak.png") return WEATHERED_OAK_SHELF_IMAGE;
  return theme;
};
const CASE_FRAME_IMAGE = "/dvd-case-frame.png";
const MOVIE_FRAME_IMAGE = "/movie-frame.png";
const BOOK_FRAME_IMAGE = "/book-frame-overlay.png";
const GAME_FRAME_IMAGE = "/game-frame.png";
const DEFAULT_OVERLAY_SETTINGS: OverlaySettings = { width: 100, height: 100, top: 0, left: 0 };
const DEFAULT_COVER_SCALE: CoverScaleSettings = { x: 100, y: 100 };
const DEFAULT_COVER_OFFSET: CoverOffsetSettings = { x: 0, y: 0 };
const APP_ICON = "/logo4.png";
const SHOW_HEADER_DEBUG_CONTROLS = false;

const COMPACT_GAME_FRAME_SIZE = { width: 646, height: 800 } as const;
const DEFAULT_GAME_FRAME_SIZE = { width: 1024, height: 1536 } as const;
const COMPACT_GAME_FRAME_FILES = new Set([
  "/dreamcast-frame.png",
  "/playstation-frame.png",
  "/playstation-2-frame.png",
  "/playstation-3-frame.png",
  "/playstation-4-frame.png",
  "/playstation-5-frame.png",
  "/switch-frame.png",
  "/switch-2-frame.png",
  "/xbox-360-frame.png",
  "/xbox-one-frame.png",
  "/xbox-series-x-frame.png",
]);
const KNOWN_GAME_FRAME_FILES = new Set([
  ...Array.from(COMPACT_GAME_FRAME_FILES),
  "/epic-games-store-frame.png",
  "/nes-frame.png",
  "/steam-frame.png",
  "/windows-11-frame.png",
]);

// Helper function to convert platform name to frame filename
function getPlatformFrameFilename(platform?: string): string {
  if (!platform || platform === "Default") {
    return GAME_FRAME_IMAGE;
  }
  const canonicalLabel = canonicalizePlatformLabel(platform);
  const normalizedCanonical = normalizePlatformToken(canonicalLabel);
  const frameOverrideByPlatform: Record<string, string> = {
    nintendoswitch: "/switch-frame.png",
    switch: "/switch-frame.png",
    nintendoswitch2: "/switch-2-frame.png",
    switch2: "/switch-2-frame.png",
  };
  const explicitFrame = frameOverrideByPlatform[normalizedCanonical];
  if (explicitFrame) return explicitFrame;
  const slug = safeStr(canonicalLabel)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const guessedFramePath = `/${slug || "game"}-frame.png`;
  return KNOWN_GAME_FRAME_FILES.has(guessedFramePath) ? guessedFramePath : GAME_FRAME_IMAGE;
}

function getGameFrameSourceDimensions(platform?: string): { width: number; height: number } {
  const framePath = getPlatformFrameFilename(platform).toLowerCase();
  if (COMPACT_GAME_FRAME_FILES.has(framePath)) {
    return { width: COMPACT_GAME_FRAME_SIZE.width, height: COMPACT_GAME_FRAME_SIZE.height };
  }
  return { width: DEFAULT_GAME_FRAME_SIZE.width, height: DEFAULT_GAME_FRAME_SIZE.height };
}

function safeStr(v: unknown) {
  return (v ?? "").toString().trim();
}

function sortYearValues(values: string[]): string[] {
  return [...values]
    .filter((value): value is string => /^\d{4}$/.test(value))
    .sort((a, b) => Number.parseInt(b, 10) - Number.parseInt(a, 10));
}

function getYearToken(value?: string): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const yearMatch = raw.match(/\b(?:19|20)\d{2}\b/);
  if (yearMatch) return yearMatch[0];
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) return "";
  const year = new Date(parsed).getUTCFullYear();
  return year >= 1900 && year <= 2100 ? String(year) : "";
}

function getYearTokens(value?: string): string[] {
  const raw = safeStr(value);
  if (!raw) return [];
  const directMatches = raw.match(/\b(?:19|20)\d{2}\b/g);
  if (directMatches?.length) {
    return sortYearValues(Array.from(new Set(directMatches)));
  }
  const splitYears = raw
    .split(/[,|;/]+/g)
    .map((entry) => getYearToken(entry))
    .filter(Boolean);
  return sortYearValues(Array.from(new Set(splitYears)));
}

function normalizeYearSelection(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const normalized = value
    .map((entry) => getYearToken(safeStr(entry)))
    .filter(Boolean);
  return sortYearValues(Array.from(new Set(normalized)));
}

function normalizeStatusToken(value?: string): string {
  return safeStr(value)
    .toLowerCase()
    .replace("cancelled", "canceled");
}

function normalizeTagToken(value?: string): string {
  return safeStr(value)
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseTagValues(raw?: string): string[] {
  return safeStr(raw)
    .split(/[,\|;]+/g)
    .map((entry) => safeStr(entry))
    .filter(Boolean);
}

const WATCHED_STATUS_VALUES = new Set(["watched", "completed", "true", "yes", "1"]);
const ABANDONED_STATUS_VALUES = new Set(["abandoned", "dropped", "drop", "quit", "dnf"]);
const PLAY_NEXT_STATUS_VALUES = new Set(["queued", "replay"]);

function isMovieWatchedStatus(movie: Pick<Movie, "watchStatus" | "watched">): boolean {
  const watched = normalizeStatusToken(movie.watchStatus || movie.watched);
  return WATCHED_STATUS_VALUES.has(watched);
}

function isMovieAbandonedStatus(movie: Pick<Movie, "watchStatus" | "watched">): boolean {
  const status = normalizeStatusToken(movie.watchStatus || movie.watched);
  return ABANDONED_STATUS_VALUES.has(status);
}

function parseManualOrderValue(value: unknown): number | null {
  const parsed = Number.parseFloat(safeStr(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function moveKeyRelative(
  keys: string[],
  movingKey: string,
  targetKey: string,
  placement: "before" | "after"
): string[] {
  if (!movingKey || !targetKey || movingKey === targetKey) return keys;
  const fromIndex = keys.indexOf(movingKey);
  const toIndex = keys.indexOf(targetKey);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return keys;

  const next = [...keys];
  const [moved] = next.splice(fromIndex, 1);
  const targetIndex = next.indexOf(targetKey);
  if (targetIndex === -1) return keys;
  const insertAt = placement === "after" ? targetIndex + 1 : targetIndex;
  next.splice(Math.min(insertAt, next.length), 0, moved);
  return next;
}

function moveKeyOneStepTowardTarget(
  keys: string[],
  movingKey: string,
  targetKey: string
): string[] {
  if (!movingKey || !targetKey || movingKey === targetKey) return keys;
  const fromIndex = keys.indexOf(movingKey);
  const toIndex = keys.indexOf(targetKey);
  if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return keys;

  // Move directly to the hovered target so long vertical drags stay in sync
  // with what the user is hovering over.
  const placement: "before" | "after" = toIndex > fromIndex ? "after" : "before";
  return moveKeyRelative(keys, movingKey, targetKey, placement);
}

function createDefaultSmartListDraft(): SmartListDraft {
  return {
    name: "",
    mediaTypes: ["book", "movie"],
    statuses: {},
    yearFilters: {},
    tags: [],
    icon: "",
    defaultSortField: "ReleaseDate",
    defaultSortOrder: "Desc",
    allowManualSort: false,
  };
}

function parseStringArraySetting(value: unknown): string[] {
  try {
    if (!value) return [];
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((entry) => safeStr(entry)).filter(Boolean);
  } catch {
    return [];
  }
}

function parseSmartListsSetting(value: unknown): SmartList[] {
  const parsed = typeof value === "string" ? (() => {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  })() : value;

  if (!Array.isArray(parsed)) return [];

  const allowedMediaTypes = new Set<SmartListMediaType>(["book", "movie", "tv", "game"]);
  const normalized: SmartList[] = [];
  const seenIds = new Set<string>();

  parsed.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const row = entry as Record<string, unknown>;
    const id = safeStr(row.id);
    const name = safeStr(row.name);
    if (!id || !name) return;
    if (seenIds.has(id)) return;

    const mediaTypes = Array.isArray(row.mediaTypes)
      ? (row.mediaTypes
          .map((mediaType) => safeStr(mediaType))
          .filter((mediaType): mediaType is SmartListMediaType => allowedMediaTypes.has(mediaType as SmartListMediaType)))
      : [];
    if (!mediaTypes.length) return;

    const statusSource = row.statuses && typeof row.statuses === "object"
      ? (row.statuses as Record<string, unknown>)
      : {};
    const statuses: Partial<Record<SmartListMediaType, string[]>> = {};

    mediaTypes.forEach((mediaType) => {
      const values = Array.isArray(statusSource[mediaType])
        ? (statusSource[mediaType] as unknown[])
            .map((status) => normalizeStatusToken(safeStr(status)))
            .filter(Boolean)
        : [];
      if (!values.length) return;
      statuses[mediaType] = Array.from(new Set(values));
    });

    const yearFiltersSource =
      row.yearFilters && typeof row.yearFilters === "object"
        ? (row.yearFilters as Record<string, unknown>)
        : {};
    const yearFilters: SmartListYearFiltersByMedia = {};

    mediaTypes.forEach((mediaType) => {
      const mediaYearSource =
        yearFiltersSource[mediaType] && typeof yearFiltersSource[mediaType] === "object"
          ? (yearFiltersSource[mediaType] as Record<string, unknown>)
          : {};

      const normalizedSource: SmartListYearFilters = {};
      Object.entries(mediaYearSource).forEach(([sourceKeyRaw, sourceValue]) => {
        const sourceKey = sourceKeyRaw as SmartListYearSourceKey;
        if (!SMART_LIST_YEAR_SOURCE_KEYS.has(sourceKey)) return;
        const years = normalizeYearSelection(sourceValue);
        if (!years.length) return;
        normalizedSource[sourceKey] = years;
      });
      if (Object.keys(normalizedSource).length) {
        yearFilters[mediaType] = normalizedSource;
      }
    });

    const hasExplicitYearFilters = Object.values(yearFilters).some((sourceMap) =>
      sourceMap
        ? Object.values(sourceMap).some((years) => Array.isArray(years) && years.length > 0)
        : false
    );
    if (!hasExplicitYearFilters) {
      const legacyYear = getYearToken(safeStr(row.year));
      if (/^\d{4}$/.test(legacyYear)) {
        mediaTypes.forEach((mediaType) => {
          const source = SMART_LIST_LEGACY_YEAR_SOURCE_BY_MEDIA[mediaType];
          yearFilters[mediaType] = { [source]: [legacyYear] };
        });
      }
    }

    const tags = Array.from(
      new Set(
        (Array.isArray(row.tags) ? row.tags : parseTagValues(safeStr(row.tags)))
          .map((entry) => normalizeTagToken(safeStr(entry)))
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    const icon = safeStr(row.icon);

    let defaultSortField = safeStr(row.defaultSortField);
    if (!SMART_LIST_ALLOWED_SORT_FIELDS.has(defaultSortField)) {
      defaultSortField = "ReleaseDate";
    }
    const defaultSortOrder: "Asc" | "Desc" = row.defaultSortOrder === "Asc" ? "Asc" : "Desc";
    const allowManualSort = Boolean(row.allowManualSort);
    if (!allowManualSort && defaultSortField === MANUAL_SORT_FIELD) {
      defaultSortField = "ReleaseDate";
    }

    seenIds.add(id);
    normalized.push({
      id,
      name,
      mediaTypes,
      statuses,
      yearFilters,
      tags,
      icon,
      defaultSortField,
      defaultSortOrder,
      allowManualSort,
    });
  });

  return normalized;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function normalizeOwnership(value?: string): string {
  const normalized = normalizeStatusToken(value);
  if (normalized === "ripped") return "owned";
  return normalized;
}

function normalizeShowWatchStatusForSheet(value?: string): string {
  const raw = safeStr(value);
  if (!raw) return "";
  if (normalizeStatusToken(raw) === "currently watching") return "Watching";
  return raw;
}

// Helper function to generate cover URL from title (served from /public/covers/)
function getGitHubCoverUrl(title: string, category: 'books' | 'movies' | 'tv' | 'games'): string {
  // Sanitize title to match downloaded cover filenames (must match browser utility logic)
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')  // Remove special chars (keep spaces and hyphens)
    .replace(/\s+/g, '-')           // Replace spaces with hyphens
    .replace(/-+/g, '-')            // Collapse multiple hyphens
    .substring(0, 50);
  
  return `/covers/${category}/${sanitized}.jpg`;
}

function chooseCover(candidates: CoverCandidate[]) {
  const normalized: CoverCandidate[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const url = safeStr(candidate.url);
    if (!url) continue;
    if (seen.has(url)) continue;
    seen.add(url);
    normalized.push({ label: candidate.label, url });
  }

  const chosen = normalized[0];
  return {
    posterUrl: chosen?.url ?? "",
    coverSource: chosen?.label ?? "Unknown",
    coverCandidates: normalized,
  };
}

function normalizeTitleKey(title: string): string {
  return safeStr(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePlatformToken(platform: string): string {
  return safeStr(platform)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const PLATFORM_TOKEN_ALIASES: Record<string, string> = {
  ps5: "playstation5",
  ps4: "playstation4",
  ps3: "playstation3",
  ps2: "playstation2",
  xboxseriesxs: "xboxseriesx",
  "xboxseriesx|s": "xboxseriesx",
};

const PLATFORM_CANONICAL_LABELS: Record<string, string> = {
  playstation5: "PlayStation 5",
  playstation4: "PlayStation 4",
  playstation3: "PlayStation 3",
  playstation2: "PlayStation 2",
  xboxseriesx: "Xbox Series X",
};

function canonicalizePlatformLabel(platform: string): string {
  const raw = safeStr(platform);
  if (!raw || raw === "Default") return "Default";
  const normalizedRaw = normalizePlatformToken(raw);
  const normalized = PLATFORM_TOKEN_ALIASES[normalizedRaw] || normalizedRaw;
  return PLATFORM_CANONICAL_LABELS[normalized] || raw;
}

function getGameCoverFit(platform?: string): "cover" | "contain" {
  const normalized = normalizePlatformToken(safeStr(platform));
  if (!normalized) return "cover";

  const isPlayStation = normalized.startsWith("playstation") || normalized.startsWith("ps");
  const isXboxOne =
    normalized === "xboxone" ||
    normalized === "xboxonex" ||
    normalized === "xboxones";
  const isNintendoDs =
    normalized === "nintendods" ||
    normalized === "nds" ||
    normalized === "ds";
  const isDreamcast =
    normalized === "dreamcast" ||
    normalized === "segadreamcast";
  const isNintendo64 =
    normalized === "nintendo64" ||
    normalized === "n64";

  // Square platforms should avoid side-cropping; N64 art is rectangular and should also keep full artwork.
  if (isPlayStation || isXboxOne || isNintendoDs || isDreamcast || isNintendo64) {
    return "contain";
  }

  return "cover";
}

function getMediaType(item: any): MediaType {
  if (item?.__type === "book") return "book";
  if (item?.__type === "movie") return "movie";
  if (item?.__type === "tv") return "tv";
  if (item?.__type === "game") return "game";
  if (item?.platform || item?.yearPlayed || item?.gameStatus) return "game";
  if (item?.isbn || item?.series) return "book";
  if (item?.firstAirDate || item?.lastAirDate || item?.showStatus) return "tv";
  return "movie";
}

function getMediaItemKey(item: any): string {
  const type = getMediaType(item);
  const normalizedTitle = normalizeTitleKey(item?.title || "");
  if (type === "game") {
    const normalizedPlatform = normalizePlatformToken(
      safeStr(item?.__renderPlatform || item?.platform)
    );
    return `${type}:${normalizedTitle}:${normalizedPlatform || "default"}`;
  }
  return `${type}:${normalizedTitle}`;
}

type StatusIndicator = {
  color: string;
  label: string;
};

type TvWatchlistSectionKey = "pendingReturn" | "watching" | "backlog";

type TvWatchlistSectionMeta = {
  label: string;
  badgeBackground: string;
  badgeBorder: string;
  badgeColor: string;
};

type TvWatchlistStatusSource = {
  watchStatus?: string;
  watched?: string;
  showStatus?: string;
  status?: string;
};

const STATUS_COLOR_GREEN = "#54bf3f";
const STATUS_COLOR_YELLOW = "#e6b52e";
const STATUS_COLOR_RED = "#c54848";
const STATUS_COLOR_ORANGE = "#d97a2a";
const STATUS_DOT_BASE_SIZE = 16;
const STATUS_DOT_MIN_SIZE = 8;
const STATUS_DOT_MAX_SIZE = 40;
const STATUS_DOT_NUDGE_LEFT_PX = 7;
const STATUS_DOT_NUDGE_UP_PX = 7;

const TV_WATCHLIST_SECTION_ORDER: TvWatchlistSectionKey[] = ["watching", "backlog", "pendingReturn"];
const TV_WATCHLIST_ACTIVE_STATUSES = new Set([
  "watching",
  "currently watching",
  "in progress",
  "paused",
  "watch next",
]);
const TV_WATCHLIST_BACKLOG_STATUSES = new Set(["backlog", "wishlist"]);
const TV_WATCHLIST_SECTION_META: Record<TvWatchlistSectionKey, TvWatchlistSectionMeta> = {
  pendingReturn: {
    label: "Pending Return",
    badgeBackground: "rgba(57, 117, 163, 0.9)",
    badgeBorder: "rgba(169, 221, 255, 0.82)",
    badgeColor: "rgba(238, 248, 255, 0.98)",
  },
  watching: {
    label: "Watching",
    badgeBackground: "rgba(117, 90, 34, 0.88)",
    badgeBorder: "rgba(241, 213, 141, 0.82)",
    badgeColor: "rgba(255, 247, 224, 0.98)",
  },
  backlog: {
    label: "Backlog",
    badgeBackground: "rgba(84, 55, 96, 0.9)",
    badgeBorder: "rgba(202, 167, 223, 0.82)",
    badgeColor: "rgba(249, 236, 255, 0.98)",
  },
};

function getTvWatchlistSectionKey(rawStatus?: string): TvWatchlistSectionKey {
  const status = normalizeStatusToken(rawStatus);
  if (status === "pending return") return "pendingReturn";
  if (TV_WATCHLIST_ACTIVE_STATUSES.has(status)) return "watching";
  if (TV_WATCHLIST_BACKLOG_STATUSES.has(status)) return "backlog";
  return "backlog";
}

function getTvWatchlistSectionForItem(item: TvWatchlistStatusSource): TvWatchlistSectionKey {
  return getTvWatchlistSectionKey(
    safeStr(item.watchStatus) || safeStr(item.watched) || safeStr(item.showStatus) || safeStr(item.status)
  );
}

function mapBookGenre(input: string): string | null {
  const g = safeStr(input).toLowerCase();
  if (!g) return null;

  if (g.includes("strategy guide") || g.includes("guidebook") || g.includes("game guide") || g.includes("walkthrough")) return "Strategy Guide";
  if (g.includes("true crime")) return "True Crime";
  if (g.includes("mystery") || g.includes("detective") || g.includes("whodunit")) return "Mystery";
  if (g.includes("thriller") || g.includes("suspense")) return "Thriller / Suspense";
  if (g.includes("horror") || g.includes("gothic")) return "Horror";
  if (g.includes("science fiction") || g.includes("sci-fi") || g.includes("scifi") || g.includes("dystopian") || g.includes("cyberpunk") || g.includes("space opera")) return "Science Fiction";
  if (g.includes("fantasy")) return "Fantasy";
  if (g.includes("romance")) return "Romance";
  if (g.includes("historical fiction")) return "Historical Fiction";
  if (g.includes("literary fiction") || g.includes("contemporary fiction") || g === "literary" || g === "contemporary") return "Literary / Contemporary Fiction";
  if (g.includes("humor") || g.includes("humour") || g.includes("comedy") || g.includes("satire") || g.includes("comic")) return "Humor / Comedy";
  if (g.includes("adventure") || g.includes("action")) return "Adventure / Action";
  if (g.includes("young adult") || g === "ya" || g.includes("(ya)") || g.includes("teen")) return "Young Adult (YA)";
  if (g.includes("children") || g.includes("kids") || g.includes("middle grade")) return "Children's";
  if (g.includes("biography") || g.includes("memoir") || g.includes("autobiography")) return "Biography / Memoir";
  if (g.includes("history")) return "History";
  if (g.includes("self-help") || g.includes("self help") || g.includes("personal development")) return "Self-Help";
  if (g.includes("popular science") || (g.includes("science") && !g.includes("fiction"))) return "Science / Popular Science";
  if (g.includes("business") || g.includes("leadership") || g.includes("entrepreneur") || g.includes("management") || g.includes("finance")) return "Business";
  return null;
}

function normalizeBookGenres(raw: string): string[] {
  const tokens = safeStr(raw)
    .split(/[,\|;]+/g)
    .map((v) => v.trim())
    .filter(Boolean);
  const mapped = tokens.map(mapBookGenre).filter(Boolean) as string[];
  return Array.from(new Set(mapped));
}

function rowToShow(r: Row): Show | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const githubUrl = getGitHubCoverUrl(title, 'tv');
  const csvPosterUrl = safeStr(r["PosterURL"]);
  const csvPoster = safeStr(r["Poster"]);
  const metadataCoverUrl = csvPosterUrl || csvPoster;
  const { posterUrl, coverSource, coverCandidates } = chooseCover([
    { label: "PosterURL", url: csvPosterUrl },
    { label: "Poster", url: csvPoster },
    { label: "Generated GitHub Cover", url: githubUrl },
  ]);

  return {
    title,
    posterUrl,
    metadataCoverUrl: metadataCoverUrl || undefined,
    posterUrlFallback: githubUrl,
    coverSource,
    coverCandidates,
    year: safeStr(r["Year"]) || undefined,
    tmdbId: safeStr(r["TMDB_ID"]) || undefined,
    firstAirDate: safeStr(r["FirstAirDate"]) || undefined,
    lastAirDate: safeStr(r["LastAirDate"]) || undefined,
    numberOfSeasons: safeStr(r["NumberOfSeasons"]) || undefined,
    numberOfEpisodes: safeStr(r["NumberOfEpisodes"]) || undefined,
    watchStatus: safeStr(r["WatchStatus"]) || undefined,
    watched: safeStr(r["Watched"]) || undefined,
    dateCompleted: safeStr(r["Date Completed"]) || safeStr(r["CompletedDate"]) || undefined,
    caughtUp: safeStr(r["CaughtUp"]) || undefined,
    showStatus: safeStr(r["Status"]) || undefined,
    networks: safeStr(r["Networks"]) || undefined,
    streamingUS: safeStr(r["StreamingUS"]) || undefined,
    genres: safeStr(r["Genres"]) || undefined,
    tmdbRating: safeStr(r["TMDB_Rating"]) || undefined,
    myRating: safeStr(r["MyRating"]) || undefined,
    backdropUrl: safeStr(r["BackdropURL"]) || undefined,
    overview: safeStr(r["Overview"]) || undefined,
    ownership: safeStr(r["Ownership"]) || undefined,
    tag: safeStr(r["Tags"]) || safeStr(r["Tag"]) || undefined,
  };
}

function rowToBook(r: Row): Book | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  // Try GitHub cover first, fallback to CSV poster URL
  const generatedGitHubUrl = getGitHubCoverUrl(title, 'books');
  const githubCoverUrl = safeStr(r["GitHubCoverURL"]) || undefined;
  const coverSyncStatus = safeStr(r["CoverSyncStatus"]);
  const customImageUrl =
    safeStr(r["CustomImageURL"]) ||
    safeStr(r["CustomImageUrl"]) ||
    safeStr(r["Custom Image URL"]) ||
    safeStr(r["\"CustomImageURL"]) ||
    safeStr(r["CustomImageURL\n"]);
  const cover = safeStr(r["Cover"]);
  const coverUrl = safeStr(r["Cover URL"]) || safeStr(r["CoverURL"]);
  const imageUrl = safeStr(r["ImageURL"]) || safeStr(r["Image URL"]) || safeStr(r["Image"]);
  const posterUrlCol = safeStr(r["PosterURL"]) || safeStr(r["Poster URL"]) || safeStr(r["Poster"]);
  const metadataCoverUrl = customImageUrl || imageUrl || cover || coverUrl || posterUrlCol;
  const csvUrl = metadataCoverUrl;
  const orderedCandidates: CoverCandidate[] = [
    { label: "CustomImageURL", url: customImageUrl },
    { label: "ImageURL", url: imageUrl },
    { label: "Cover", url: cover },
    { label: "Cover URL", url: coverUrl },
    { label: "PosterURL", url: posterUrlCol },
    { label: "GitHubCoverURL", url: githubCoverUrl || "" },
    { label: "Generated GitHub Cover", url: generatedGitHubUrl },
  ];
  const { posterUrl, coverSource, coverCandidates } = chooseCover(orderedCandidates);
  const rawBookGenre =
    safeStr(r["genre"]) || safeStr(r["Genre"]) || safeStr(r["categories"]) || safeStr(r["Categories"]) || safeStr(r["Category"]);
  const normalizedGenres = normalizeBookGenres(rawBookGenre);
  const normalizedGenreValue = normalizedGenres.join(", ");
  return {
    title,
    posterUrl,
    metadataCoverUrl: metadataCoverUrl || undefined,
    coverSource,
    coverCandidates,
    posterUrlFallback: csvUrl || customImageUrl || githubCoverUrl || generatedGitHubUrl || undefined,
    cover: safeStr(r["Cover"]) || safeStr(r["CoverURL"]) || undefined,
    subtitle: safeStr(r["Subtitle"]) || undefined,
    author: safeStr(r["Author"]) || undefined,
    isbn: safeStr(r["ISBN"]) || safeStr(r["isbn"]) || undefined,
    isbn10: safeStr(r["isbn10"]) || safeStr(r["ISBN10"]) || undefined,
    isbn13: safeStr(r["isbn13"]) || safeStr(r["ISBN13"]) || undefined,
    releaseDate: safeStr(r["ReleaseDate"]) || safeStr(r["Published"]) || undefined,
    completedDate: safeStr(r["CompletedDate"]) || undefined,
    status: safeStr(r["Status"]) || undefined,
    types: safeStr(r["Types"]) || safeStr(r["Type"]) || undefined,
    series: safeStr(r["Series"]) || undefined,
    categories: normalizedGenreValue || undefined,
    genre: normalizedGenreValue || undefined,
    ownership: safeStr(r["Ownership"]) || undefined,
    tag: safeStr(r["Tag"]) || undefined,
    tags: safeStr(r["tags"]) || safeStr(r["Tags"]) || undefined,
    openLibraryWorkKey: safeStr(r["OpenLibraryWorkKey"]) || undefined,
    googleBooksVolumeId: safeStr(r["GoogleBooksVolumeId"]) || undefined,
    description: safeStr(r["description"]) || safeStr(r["Description"]) || undefined,
    imageUrl: safeStr(r["ImageURL"]) || safeStr(r["Image URL"]) || safeStr(r["Image"]) || undefined,
    customImageUrl: customImageUrl || undefined,
    externalAverageRating: safeStr(r["externalAverageRating"]) || safeStr(r["ExternalAverageRating"]) || undefined,
    userRating: safeStr(r["userRating"]) || safeStr(r["UserRating"]) || undefined,
    myRating: safeStr(r["My Rating"]) || safeStr(r["MyRating"]) || undefined,
    pages: safeStr(r["pages"]) || safeStr(r["Pages"]) || undefined,
    audiobookDuration: safeStr(r["audiobookDuration"]) || safeStr(r["AudiobookDuration"]) || undefined,
    githubCoverUrl: githubCoverUrl || generatedGitHubUrl || undefined,
    coverSyncStatus: coverSyncStatus || undefined,
    wishlistOrder: safeStr(r["WishlistOrder"]) || undefined,
    queuedOrder: safeStr(r["QueuedOrder"]) || undefined,
  };
}

function rowToMovie(r: Row): Movie | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const githubUrl = getGitHubCoverUrl(title, 'movies');
  const csvPosterUrl = safeStr(r["PosterURL"]);
  const csvPoster = safeStr(r["Poster"]);
  const metadataCoverUrl = csvPosterUrl || csvPoster;
  const csvUrl = metadataCoverUrl;
  const { posterUrl, coverSource, coverCandidates } = chooseCover([
    { label: "PosterURL", url: csvPosterUrl },
    { label: "Poster", url: csvPoster },
    { label: "Generated GitHub Cover", url: githubUrl },
  ]);
  return {
    title,
    posterUrl,
    metadataCoverUrl: metadataCoverUrl || undefined,
    coverSource,
    coverCandidates,
    csvUrl,
    year: safeStr(r["Year"]) || undefined,
    poster: safeStr(r["Poster"]) || undefined,
    myRating: safeStr(r["MyRating"]) || safeStr(r["My Rating"]) || undefined,
    tmdbRating: safeStr(r["TMDB_Rating"]) || undefined,
    tmdbId: safeStr(r["TMDB_ID"]) || undefined,
    watched: safeStr(r["Watch Status"]) || safeStr(r["WatchStatus"]) || safeStr(r["Watched"]) || undefined,
    watchDate: safeStr(r["WatchDate"]) || undefined,
    tags: safeStr(r["Tags"]) || undefined,
    releaseDate: safeStr(r["ReleaseDate"]) || undefined,
    runtime: safeStr(r["Runtime"]) || undefined,
    watchStatus: safeStr(r["Watch Status"]) || safeStr(r["WatchStatus"]) || safeStr(r["Watched"]) || undefined,
    status: safeStr(r["Status"]) || undefined,
    movieStatus: safeStr(r["Status"]) || undefined,
    ownership: safeStr(r["Ownership"]) || undefined,
    tag: safeStr(r["Tag"]) || safeStr(r["Tags"]) || undefined,
    overview: safeStr(r["Overview"]) || undefined,
    backdropUrl: safeStr(r["BackdropURL"]) || undefined,
    genres: safeStr(r["Genres"]) || safeStr(r["Genre"]) || undefined,
  };
}

function rowToGame(r: Row): Game | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const githubUrl = getGitHubCoverUrl(title, 'games');
  const csvPosterUrl = safeStr(r["PosterURL"]);
  const csvPoster = safeStr(r["Poster"]);
  const csvCoverUrl = safeStr(r["CoverURL"]);
  const metadataCoverUrl = csvCoverUrl || csvPosterUrl || csvPoster;
  const { posterUrl, coverSource, coverCandidates } = chooseCover([
    { label: "CoverURL", url: csvCoverUrl },
    { label: "PosterURL", url: csvPosterUrl },
    { label: "Poster", url: csvPoster },
    { label: "Generated GitHub Cover", url: githubUrl },
  ]);
  return {
    title,
    posterUrl,
    metadataCoverUrl: metadataCoverUrl || undefined,
    posterUrlFallback: githubUrl,
    coverSource,
    coverCandidates,
    cover: safeStr(r["Cover"]) || undefined,
    platform: safeStr(r["Platform"]) || undefined,
    status: safeStr(r["Status"]) || undefined,
    name: safeStr(r["Name"]) || undefined,
    releaseDate: safeStr(r["ReleaseDate"]) || undefined,
    releaseDateAlt: safeStr(r["Release Date"]) || undefined,
    platforms: safeStr(r["Platforms"]) || undefined,
    coverUrl: safeStr(r["CoverURL"]) || undefined,
    rating: safeStr(r["Rating"]) || undefined,
    igdbRating: safeStr(r["IGDB Rating"]) || undefined,
    myRating: safeStr(r["My Rating"]) || undefined,
    playStatus: safeStr(r["PlayStatus"]) || undefined,
    gameStatus: safeStr(r["Status"]) || undefined,
    ownership: safeStr(r["Ownership"]) || undefined,
    format: safeStr(r["Format"]) || undefined,
    backlog: safeStr(r["Backlog"]) || undefined,
    completed: safeStr(r["Completed"]) || undefined,
    dateCompleted: safeStr(r["Date Completed"]) || undefined,
    yearPlayed: safeStr(r["Year Played"]) || safeStr(r["YearPlayed"]) || safeStr(r["Year played"]) || safeStr(r["Yearplayed"]) || undefined,
    dateAdded: safeStr(r["Date Added"]) || undefined,
    description: safeStr(r["Description"]) || undefined,
    genres: safeStr(r["Genres"]) || undefined,
    hoursPlayed: safeStr(r["Hours Played"]) || undefined,
    coverCachedAt: safeStr(r["CoverCachedAt"]) || undefined,
    developer: safeStr(r["Developer"]) || undefined,
    screensotsUrl: safeStr(r["ScreensotsURL"]) || undefined,
    wishlistOrder: safeStr(r["WishlistOrder"]) || undefined,
    queuedOrder: safeStr(r["QueuedOrder"]) || undefined,
    igdbId: safeStr(r["IGDB_ID"]) || undefined,
    igdbIdOverride: safeStr(r["IGDB_ID_Override"]) || undefined,
    localCoverUrl: safeStr(r["LocalCoverURL"]) || undefined,
    tag: safeStr(r["Tag"]) || safeStr(r["Tags"]) || undefined,
  };
}

function useElementWidth<T extends HTMLElement>() {
  const nodeRef = useRef<T | null>(null);
  const [node, setNode] = useState<T | null>(null);
  const [width, setWidth] = useState(0);
  const ref = useCallback((nextNode: T | null) => {
    nodeRef.current = nextNode;
    if (nextNode) {
      setWidth(Math.floor(nextNode.getBoundingClientRect().width));
    }
    setNode(nextNode);
  }, []);

  useLayoutEffect(() => {
    if (!node) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidth(Math.floor(entry.contentRect.width));
    });

    ro.observe(node);

    return () => ro.disconnect();
  }, [node]);

  return { ref, width, nodeRef };
}

type NavKey = "home" | "search" | "books" | "movies" | "tv" | "games" | "play-next" | "wishlist" | "wishlist-books" | "watchlist-movies" | "watchlist-tv" | "current" | "completed" | "abandoned" | "settings" | "year-this" | "smart-custom" | "statistics";

export default function Page() {
  const tvCsvUrl = process.env.NEXT_PUBLIC_TV_SHEET_CSV_URL;
  const booksCsvUrl = process.env.NEXT_PUBLIC_BOOKS_SHEET_CSV_URL;
  const moviesCsvUrl = process.env.NEXT_PUBLIC_MOVIES_SHEET_CSV_URL;
  const gamesCsvUrl = process.env.NEXT_PUBLIC_GAMES_SHEET_CSV_URL;
  const settingsCsvUrl = process.env.NEXT_PUBLIC_SETTINGS_SHEET_CSV_URL;
  const settingsWriteUrl = process.env.NEXT_PUBLIC_SETTINGS_WRITE_URL;
  const booksWriteUrl = process.env.NEXT_PUBLIC_BOOKS_WRITE_URL;
  const showsWriteUrl =
    process.env.NEXT_PUBLIC_SHOWS_WRITE_URL ||
    process.env.NEXT_PUBLIC_TV_WRITE_URL;
  const moviesWriteUrl = process.env.NEXT_PUBLIC_MOVIES_WRITE_URL;
  const gamesWriteUrl = process.env.NEXT_PUBLIC_GAMES_WRITE_URL;
  const writeConfigChecks = useMemo(
    () => [
      {
        key: "settings",
        label: "Settings + overlays persistence",
        configured: Boolean(settingsWriteUrl),
        env: "NEXT_PUBLIC_SETTINGS_WRITE_URL",
      },
      {
        key: "books",
        label: "Book edits",
        configured: Boolean(booksWriteUrl),
        env: "NEXT_PUBLIC_BOOKS_WRITE_URL",
      },
      {
        key: "shows",
        label: "TV/show edits",
        configured: Boolean(showsWriteUrl),
        env: "NEXT_PUBLIC_SHOWS_WRITE_URL or NEXT_PUBLIC_TV_WRITE_URL",
      },
      {
        key: "movies",
        label: "Movie edits",
        configured: Boolean(moviesWriteUrl),
        env: "NEXT_PUBLIC_MOVIES_WRITE_URL",
      },
      {
        key: "games",
        label: "Game edits",
        configured: Boolean(gamesWriteUrl),
        env: "NEXT_PUBLIC_GAMES_WRITE_URL",
      },
    ],
    [booksWriteUrl, gamesWriteUrl, moviesWriteUrl, settingsWriteUrl, showsWriteUrl]
  );
  const missingWriteConfigChecks = useMemo(
    () => writeConfigChecks.filter((entry) => !entry.configured),
    [writeConfigChecks]
  );
  
  // In-memory cache for settings to avoid repeated localStorage parsing
  const settingsCacheRef = useRef<Record<string, string> | null>(null);
  const settingsPersistTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSettingsSheetWritesRef = useRef<
    Record<string, { value: string; category: string; description: string }>
  >({});
  const settingsSheetFlushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const suppressCaseClickRef = useRef(false);
  const wishlistPointerDragRef = useRef<WishlistPointerDrag | null>(null);
  const wishlistCaseNodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const wishlistDragHoverTargetRef = useRef<string | null>(null);
  const wishlistDragVisualRafRef = useRef<number | null>(null);
  const wishlistDragVisualPendingRef = useRef<WishlistPointerDrag | null>(null);
  const wishlistDragLatestOrderRef = useRef<string[] | null>(null);
  const smartListNameInputRef = useRef<string>("");
  
  // Debounce timers for settings persistence
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const [loading, setLoading] = useState(false);
  const [splashMinDurationDone, setSplashMinDurationDone] = useState(false);
  const [initialLoadSettled, setInitialLoadSettled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tvRows, setTvRows] = useState<Row[]>([]);
  const [bookRows, setBookRows] = useState<Row[]>([]);
  const [movieRows, setMovieRows] = useState<Row[]>([]);
  const [gameRows, setGameRows] = useState<Row[]>([]);
  const [settingsRows, setSettingsRows] = useState<Row[]>([]);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState<string>("");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  // Sidebar nav
  const [nav, setNav] = useState<NavKey>("home");
  const [settingsPopupOpen, setSettingsPopupOpen] = useState<boolean>(false);
  const [sortPopupOpen, setSortPopupOpen] = useState<boolean>(false);
  const [faqPopupOpen, setFaqPopupOpen] = useState<boolean>(false);
  const [openSection, setOpenSection] = useState<NavKey | null>(null);
  const [smartListsOpen, setSmartListsOpen] = useState<boolean>(false);
  const [discoverOpen, setDiscoverOpen] = useState<boolean>(true);
  const [customSmartLists, setCustomSmartLists] = useState<SmartList[]>([]);
  const [selectedSmartListId, setSelectedSmartListId] = useState<string | null>(null);
  const [smartListBuilderOpen, setSmartListBuilderOpen] = useState<boolean>(false);
  const [smartListBuilderError, setSmartListBuilderError] = useState<string | null>(null);
  const [smartListDraft, setSmartListDraft] = useState<SmartListDraft>(() => createDefaultSmartListDraft());
  const [smartListTagQuery, setSmartListTagQuery] = useState<string>("");
  const [smartListManualOrderKeysById, setSmartListManualOrderKeysById] = useState<Record<string, string[]>>({});
  const activeSmartList = useMemo(
    () => customSmartLists.find((list) => list.id === selectedSmartListId) || null,
    [customSmartLists, selectedSmartListId]
  );

  // Settings submenus
  const [settingsOpen, setSettingsOpen] = useState<{
    coverSize: boolean;
    framePosition: boolean;
    bookInsets: boolean;
    movieInsets: boolean;
    gameInsets: boolean;
    tvShowInsetsCollapsed: boolean;
    bookInsetsCollapsed: boolean;
    movieInsetsCollapsed: boolean;
    gameInsetsCollapsed: boolean;
    logoSize: boolean;
    syncIcon: boolean;
    statusIcon: boolean;
    icons: boolean;
    sidebar: boolean;
    counter: boolean;
  }>({
    coverSize: false,
    framePosition: false,
    bookInsets: false,
    movieInsets: false,
    gameInsets: false,
    tvShowInsetsCollapsed: false,
    bookInsetsCollapsed: false,
    movieInsetsCollapsed: false,
    gameInsetsCollapsed: false,
    logoSize: false,
    syncIcon: false,
    statusIcon: false,
    icons: false,
    sidebar: false,
    counter: false,
  });

  const [showThemes, setShowThemes] = useState(false);

  // UI
  const [posterSizeTv, setPosterSizeTv] = useState<number>(100);
  const [posterSizeMovies, setPosterSizeMovies] = useState<number>(108);
  const [posterSizeBooks, setPosterSizeBooks] = useState<number>(115);
  const [bookHeightMultiplier, setBookHeightMultiplier] = useState<number>(1.5);
  const [coverGapSize, setCoverGapSize] = useState<number>(24);
  const [tight, setTight] = useState<boolean>(true);
  const [watchFilter, setWatchFilter] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [movieWatchFilter, setMovieWatchFilter] = useState<string | null>(null);
  const [movieGenreFilter, setMovieGenreFilter] = useState<string | null>(null);
  const [readingStatusFilter, setReadingStatusFilter] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  const [seriesFilter, setSeriesFilter] = useState<string | null>(null);
  const [genreFilter, setGenreFilter] = useState<string | null>(null);
  const [gamePlatformFilter, setGamePlatformFilter] = useState<string | null>(null);
  const [gameStatusFilter, setGameStatusFilter] = useState<string | null>(null);
  const [gameOwnershipFilter, setGameOwnershipFilter] = useState<string | null>(null);
  const [gameFormatFilter, setGameFormatFilter] = useState<string | null>(null);
  const [gameYearPlayedFilter, setGameYearPlayedFilter] = useState<string | null>(null);
  const [gameGenreFilter, setGameGenreFilter] = useState<string | null>(null);
  const [wishlistFilter, setWishlistFilter] = useState<boolean>(false);
  const [watchlistTvSectionFilter, setWatchlistTvSectionFilter] = useState<TvWatchlistSectionKey>("watching");
  const [sortField, setSortField] = useState<string>("ReleaseDate");
  const [sortOrder, setSortOrder] = useState<"Asc" | "Desc">("Desc");
  const [wishlistManualOrderKeys, setWishlistManualOrderKeys] = useState<string[]>([]);
  const [readNextManualOrderKeys, setReadNextManualOrderKeys] = useState<string[]>([]);
  const [playNextManualOrderKeys, setPlayNextManualOrderKeys] = useState<string[]>([]);
  const [watchlistMoviesManualOrderKeys, setWatchlistMoviesManualOrderKeys] = useState<string[]>([]);
  const [watchlistTvManualOrderKeys, setWatchlistTvManualOrderKeys] = useState<string[]>([]);
  const [draggingWishlistKey, setDraggingWishlistKey] = useState<string | null>(null);
  const [wishlistPointerDrag, setWishlistPointerDrag] = useState<WishlistPointerDrag | null>(null);
  const [wishlistDragHoverKey, setWishlistDragHoverKey] = useState<string | null>(null);
  const [watchStatusOpen, setWatchStatusOpen] = useState<boolean>(false);
  const [showStatusOpen, setShowStatusOpen] = useState<boolean>(false);
  const [tagOpen, setTagOpen] = useState<boolean>(false);
  const [movieWatchStatusOpen, setMovieWatchStatusOpen] = useState<boolean>(false);
  const [movieGenreOpen, setMovieGenreOpen] = useState<boolean>(false);
  const [readingStatusOpen, setReadingStatusOpen] = useState<boolean>(false);
  const [formatOpen, setFormatOpen] = useState<boolean>(false);
  const [seriesOpen, setSeriesOpen] = useState<boolean>(false);
  const [genreOpen, setGenreOpen] = useState<boolean>(false);
  const [gamePlatformOpen, setGamePlatformOpen] = useState<boolean>(false);
  const [gameStatusOpen, setGameStatusOpen] = useState<boolean>(false);
  const [gameOwnershipOpen, setGameOwnershipOpen] = useState<boolean>(false);
  const [gameFormatOpen, setGameFormatOpen] = useState<boolean>(false);
  const [gameYearPlayedOpen, setGameYearPlayedOpen] = useState<boolean>(false);
  const [gameGenresOpen, setGameGenresOpen] = useState<boolean>(false);
  const [wishlistOpen, setWishlistOpen] = useState<boolean>(false);
  const [showStatusIndicators, setShowStatusIndicators] = useState<boolean>(false);
  const [viewportH, setViewportH] = useState(0);
  const [windowScrollY, setWindowScrollY] = useState(0);
  const [stageTopAbs, setStageTopAbs] = useState(0);

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setWatchFilter(null);
    setShowFilter(null);
    setTagFilter(null);
    setMovieWatchFilter(null);
    setMovieGenreFilter(null);
    setReadingStatusFilter(null);
    setFormatFilter(null);
    setSeriesFilter(null);
    setGenreFilter(null);
    setGamePlatformFilter(null);
    setGameStatusFilter(null);
    setGameOwnershipFilter(null);
    setGameFormatFilter(null);
    setGameYearPlayedFilter(null);
    setGameGenreFilter(null);
    setWishlistFilter(false);
    setWatchlistTvSectionFilter("watching");
  }, []);

  // Logo positioning and sizing
  const [logoSize, setLogoSize] = useState<number>(230);
  const [logoTop, setLogoTop] = useState<number>(12);
  const [logoLeft, setLogoLeft] = useState<number>(-28);

  // Synced icon positioning and sizing
  const [syncIconSize, setSyncIconSize] = useState<number>(12);
  const [syncIconTop, setSyncIconTop] = useState<number>(8);

  // Status icon sizing and position tuning
  const [statusIconScale, setStatusIconScale] = useState<number>(100);
  const [statusIconOffsetX, setStatusIconOffsetX] = useState<number>(0);
  const [statusIconOffsetY, setStatusIconOffsetY] = useState<number>(0);

  // Sidebar icon size
  const [iconSize, setIconSize] = useState<number>(16);

  // Sidebar text styling
  const [sidebarFontSize, setSidebarFontSize] = useState<number>(11);
  const [sidebarFontWeight, setSidebarFontWeight] = useState<string>("400");
  const [sidebarGap, setSidebarGap] = useState<number>(8);
  const [sidebarHeaderFontSize, setSidebarHeaderFontSize] = useState<number>(11);
  const [sidebarHeaderFontWeight, setSidebarHeaderFontWeight] = useState<string>("600");

  // Counter configuration
  const [counterTileSize, setCounterTileSize] = useState<number>(44);
  const [counterTileSpacing, setCounterTileSpacing] = useState<number>(3);
  const [counterNumberFontSize, setCounterNumberFontSize] = useState<number>(22);
  const [counterLabelFontSize, setCounterLabelFontSize] = useState<number>(16);
  const [counterLabelFontWeight, setCounterLabelFontWeight] = useState<string>("600");
  const [counterLabelTop, setCounterLabelTop] = useState<number>(0);
  const [counterLabelLeft, setCounterLabelLeft] = useState<number>(0);
  const [counterTop, setCounterTop] = useState<number>(0);
  const [counterLeft, setCounterLeft] = useState<number>(0);

  // Shelf theme
  const [shelfTheme, setShelfTheme] = useState<string>(DEFAULT_SHELF_IMAGE);
  const currentTopHeaderImage = SHELF_TOP_HEADER_IMAGES[shelfTheme] || DARK_WALNUT_TOP_HEADER_IMAGE;
  
  // Sidebar theme
  const [sidebarTheme, setSidebarTheme] = useState<string>("darkBlue");
  
  // Theme configurations
  const sidebarThemes = {
    standard: {
      background: "url('/sidebar.png'), linear-gradient(180deg, #f4f1ea 0%, #efe7db 100%)",
      primaryColor: "#954949",
      secondaryColor: "#8a4c4c",
      textColor: "rgba(0,0,0,0.85)",
      arrowColor: "rgba(0,0,0,0.4)",
      rolodexColor: "#8a4c4c",
      rolodexDigitColor: "#8a4c4c",
      rolodexLabelColor: "#8a4c4c",
      rolodexTileBg: "linear-gradient(180deg, #f5f0e8 0%, #ebe4d8 100%)",
      rolodexTileBorder: "rgba(139,69,19,.15)",
      countBubbleColor: "#6ba56a",
      syncedTextColor: "#754738",
      highlightBg: "rgba(138, 76, 76, 0.75)",
      highlightBgEnd: "rgba(118, 60, 60, 0.8)",
      highlightBorder: "rgba(138, 76, 76, 0.4)",
      activeHighlight: "rgba(138, 76, 76, 0.15)",
    },
    winterGray: {
      background: "url('/sidebar_gray.png'), linear-gradient(180deg, #e8ecf0 0%, #d8dde3 100%)",
      primaryColor: "#5a7a8c",
      secondaryColor: "#769795",
      textColor: "rgba(0,0,0,0.85)",
      arrowColor: "rgba(0,0,0,0.4)",
      rolodexColor: "#5a7a8c",
      rolodexDigitColor: "#4e7470",
      rolodexLabelColor: "#000000",
      rolodexTileBg: "linear-gradient(180deg, #d8e2e6 0%, #c5d3d8 100%)",
      rolodexTileBorder: "rgba(78,116,112,.2)",
      countBubbleColor: "#4e7470",
      syncedTextColor: "#4e7470",
      highlightBg: "rgba(118, 151, 149, 0.92)",
      highlightBgEnd: "rgba(100, 130, 128, 0.95)",
      highlightBorder: "rgba(118, 151, 149, 0.6)",
      activeHighlight: "rgba(118, 151, 149, 0.28)",
    },
    darkBlue: {
      background:
        "linear-gradient(180deg, rgba(18, 34, 61, 0.78) 0%, rgba(12, 24, 44, 0.74) 100%), linear-gradient(180deg, rgba(10, 20, 38, 0.72) 0%, rgba(8, 15, 30, 0.72) 100%)",
      primaryColor: "#9eb8e6",
      secondaryColor: "#d7e4ff",
      textColor: "rgba(233, 240, 255, 0.9)",
      arrowColor: "rgba(210, 226, 255, 0.65)",
      rolodexColor: "#4f74b8",
      rolodexDigitColor: "#2f5fae",
      rolodexLabelColor: "#dbe8ff",
      rolodexTileBg: "linear-gradient(180deg, #eef4ff 0%, #dde9ff 100%)",
      rolodexTileBorder: "rgba(148,177,228,.35)",
      countBubbleColor: "#5a78b8",
      syncedTextColor: "#cfe0ff",
      highlightBg: "rgba(42, 69, 114, 0.92)",
      highlightBgEnd: "rgba(31, 54, 95, 0.95)",
      highlightBorder: "rgba(121, 154, 214, 0.52)",
      activeHighlight: "rgba(89, 123, 186, 0.28)",
    }
  };
  
  const currentTheme = sidebarThemes[sidebarTheme as keyof typeof sidebarThemes] || sidebarThemes.standard;
  const syncStatusTextColor =
    sidebarTheme === "darkBlue"
      ? syncState === "error"
        ? "#ffd4d4"
        : syncState === "ok"
          ? "#d6f5e3"
          : "#dbe8ff"
      : syncState === "error"
        ? "#8b0000"
        : syncState === "ok"
          ? "#0d6b3c"
          : "#754738";

  // Apply cached theme settings immediately on mount so we don't flash the default theme
  // while waiting for CSV/settings sync.
  useLayoutEffect(() => {
    try {
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      const cache = settingsCacheRef.current || {};
      const cachedSidebarTheme = safeStr(cache["sidebarTheme"]);
      const cachedShelfTheme = safeStr(cache["shelfTheme"]);
      if (cachedSidebarTheme) setSidebarTheme(cachedSidebarTheme);
      if (cachedShelfTheme) setShelfTheme(normalizeShelfTheme(cachedShelfTheme));
    } catch (e) {
      console.warn("Failed to apply cached theme settings on mount:", e);
    }
  }, []);

  // Layout tuning
  const SIDEBAR_WIDTH = 260;
  const SHELF_HEIGHT = 190;
  const SHELF_SIDE_PADDING = 10;
  const LIP_FROM_BOTTOM = 5;
  const SETTINGS_WINDOW_DEFAULT_WIDTH = 560;
  const SETTINGS_WINDOW_MARGIN = 20;
  const SETTINGS_WINDOW_START_Y = 84;
  const SETTINGS_WINDOW_Z_INDEX = 9000;
  const gap = tight ? Math.max(0, coverGapSize - 6) : coverGapSize;
  const topSafeInset = "env(safe-area-inset-top, 0px)";
  const statusDotPixelSize = useMemo(
    () =>
      Math.round(
        Math.max(
          STATUS_DOT_MIN_SIZE,
          Math.min(STATUS_DOT_MAX_SIZE, STATUS_DOT_BASE_SIZE * (statusIconScale / 100))
        )
      ),
    [statusIconScale]
  );

  // DVD case: poster inset inside the frame
  const CASE_SRC_W = 1024;
  const CASE_SRC_H = 1536;
  const [caseInsetTopPx, setCaseInsetTopPx] = useState(156);
  const [caseInsetRightPx, setCaseInsetRightPx] = useState(121);
  const [caseInsetBottomPx, setCaseInsetBottomPx] = useState(136);
  const [caseInsetLeftPx, setCaseInsetLeftPx] = useState(74);
  
  // Book frame: separate insets for book covers
  const BOOK_SRC_W = 1024;
  const BOOK_SRC_H = 1536;
  const [bookInsetTopPx, setBookInsetTopPx] = useState(99);
  const [bookInsetRightPx, setBookInsetRightPx] = useState(75);
  const [bookInsetBottomPx, setBookInsetBottomPx] = useState(104);
  const [bookInsetLeftPx, setBookInsetLeftPx] = useState(62);
  const [bookOverlaySettings, setBookOverlaySettings] = useState<OverlaySettings>({ ...DEFAULT_OVERLAY_SETTINGS });
  const [bookCoverScale, setBookCoverScale] = useState<CoverScaleSettings>({ ...DEFAULT_COVER_SCALE });
  const [bookCoverOffset, setBookCoverOffset] = useState<CoverOffsetSettings>({ ...DEFAULT_COVER_OFFSET });
  
  // Movie frame: separate insets for movie covers
  const MOVIE_SRC_W = 1024;
  const MOVIE_SRC_H = 1536;
  const [movieInsetTopPx, setMovieInsetTopPx] = useState(156);
  const [movieInsetRightPx, setMovieInsetRightPx] = useState(100);
  const [movieInsetBottomPx, setMovieInsetBottomPx] = useState(136);
  const [movieInsetLeftPx, setMovieInsetLeftPx] = useState(120);
  const [movieOverlaySettings, setMovieOverlaySettings] = useState<OverlaySettings>({ ...DEFAULT_OVERLAY_SETTINGS });
  const [movieCoverScale, setMovieCoverScale] = useState<CoverScaleSettings>({ ...DEFAULT_COVER_SCALE });
  const [movieCoverOffset, setMovieCoverOffset] = useState<CoverOffsetSettings>({ ...DEFAULT_COVER_OFFSET });
  const [tvOverlaySettings, setTvOverlaySettings] = useState<OverlaySettings>({ ...DEFAULT_OVERLAY_SETTINGS });
  const [tvCoverScale, setTvCoverScale] = useState<CoverScaleSettings>({ ...DEFAULT_COVER_SCALE });
  const [tvCoverOffset, setTvCoverOffset] = useState<CoverOffsetSettings>({ ...DEFAULT_COVER_OFFSET });
  
  // Platform-specific insets (stored as a single object)
  const [platformInsets, setPlatformInsets] = useState<Record<string, { top: number; right: number; bottom: number; left: number }>>({
    "Default": { top: 5, right: 5, bottom: 5, left: 5 },
  });
  
  // Platform-specific overlay size and position
  const [platformOverlaySettings, setPlatformOverlaySettings] = useState<Record<string, { width: number; height: number; top: number; left: number }>>({
    "Default": { width: 100, height: 100, top: 0, left: 0 },
  });
  
  // Platform-specific cover scale (for the poster image inside the inset)
  const [platformCoverScale, setPlatformCoverScale] = useState<Record<string, { x: number; y: number }>>({
    "Default": { x: 100, y: 100 },
  });
  
  // Platform-specific cover offset (crop/position inside inset)
  const [platformCoverOffset, setPlatformCoverOffset] = useState<Record<string, { x: number; y: number }>>({
    "Default": { x: 0, y: 0 },
  });
  
  // Track which platforms have been explicitly customized (not using Default)
  const [customizedPlatforms, setCustomizedPlatforms] = useState<Set<string>>(new Set());
  
  // UI: Selected platform for editing insets
  const [selectedPlatformForInsets, setSelectedPlatformForInsets] = useState<string>("Default");
  const [quickInsetTarget, setQuickInsetTarget] = useState<string>("tv");
  const [quickInsetMode, setQuickInsetMode] = useState<QuickInsetMode>("insetPosition");
  const [quickInsetStep, setQuickInsetStep] = useState<number>(5);
  const [quickInsetSaveStatus, setQuickInsetSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [themeSaveNotice, setThemeSaveNotice] = useState<string>("");
  const quickOverlayDragRef = useRef<{ x: number; y: number; top: number; left: number } | null>(null);
  const [showVersionNotes, setShowVersionNotes] = useState(false);
  const [settingsWindowPosition, setSettingsWindowPosition] = useState<{ x: number; y: number } | null>(null);
  const settingsWindowRef = useRef<HTMLDivElement | null>(null);
  const settingsWindowDragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  
  const [posterSizeGames, setPosterSizeGames] = useState<number>(108);
  const [globalCoverScalePct, setGlobalCoverScalePct] = useState<number>(100);
  const globalCoverScaleBaseRef = useRef<{ tv: number; movies: number; books: number; games: number }>({
    tv: 100,
    movies: 108,
    books: 115,
    games: 108,
  });
  const globalCoverScaleSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [showInsetGuide, setShowInsetGuide] = useState(false);


  // Modal state for cover popup
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<any>(null);
  const [coverOverrides, setCoverOverrides] = useState<Record<string, string>>({});
  const [popupCoverModes, setPopupCoverModes] = useState<Record<string, "custom" | "default">>({});
  const [overlayFrameOverrides, setOverlayFrameOverrides] = useState<Record<string, string>>({});
  const [sidebarIconOverrides, setSidebarIconOverrides] = useState<Record<string, string>>({});
  const [failedCoverUrls, setFailedCoverUrls] = useState<Record<string, string[]>>({});
  const [failedCoverAttempts, setFailedCoverAttempts] = useState<Record<string, Record<string, number>>>({});
  const [uploadingCoverForKey, setUploadingCoverForKey] = useState<string | null>(null);
  const [uploadingSidebarIconKey, setUploadingSidebarIconKey] = useState<string | null>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [addSaveError, setAddSaveError] = useState<string | null>(null);
  const [uploadingOverlayForKey, setUploadingOverlayForKey] = useState<string | null>(null);
  const [overlayUploadError, setOverlayUploadError] = useState<string | null>(null);
  const overlayFileInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarIconFileInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarIconTargetKeyRef = useRef<string | null>(null);
  const debugHeaderLayerRef = useRef<HTMLDivElement | null>(null);
  const debugHeaderReadoutRef = useRef<HTMLDivElement | null>(null);
  const debugHeaderOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const caseTiltRafRef = useRef<number | null>(null);
  const caseTiltPendingRef = useRef<{ el: HTMLDivElement; tiltY: number; tiltX: number } | null>(null);

  const applyDebugHeaderOffset = useCallback(() => {
    const { x, y } = debugHeaderOffsetRef.current;
    if (debugHeaderLayerRef.current) {
      debugHeaderLayerRef.current.style.transform = `translate3d(${x}px, ${y}px, 0) scaleX(-1)`;
    }
    if (debugHeaderReadoutRef.current) {
      debugHeaderReadoutRef.current.textContent = `X: ${x}, Y: ${y}`;
    }
  }, []);

  const nudgeDebugHeader = useCallback((dx: number, dy: number) => {
    debugHeaderOffsetRef.current = {
      x: debugHeaderOffsetRef.current.x + dx,
      y: debugHeaderOffsetRef.current.y + dy,
    };
    applyDebugHeaderOffset();
  }, [applyDebugHeaderOffset]);

  const resetDebugHeader = useCallback(() => {
    debugHeaderOffsetRef.current = { x: 0, y: 0 };
    applyDebugHeaderOffset();
  }, [applyDebugHeaderOffset]);

  const { ref: stageRef, width: stageWidth, nodeRef: stageNodeRef } = useElementWidth<HTMLDivElement>();

  const buildItemWithCoverSelection = (item: any, overrides: Record<string, string>) => {
    const itemKey = getMediaItemKey(item);
    const overrideUrl = safeStr(overrides[itemKey]);
    const metadataUrl = safeStr(item?.metadataCoverUrl) || safeStr(item?.posterUrl) || "";
    const fallbackUrl = safeStr(item?.posterUrlFallback);

    const coverCandidates: CoverCandidate[] = [];
    if (overrideUrl) coverCandidates.push({ label: "Override Cover", url: overrideUrl });
    if (metadataUrl) coverCandidates.push({ label: "Metadata Cover", url: metadataUrl });
    if (fallbackUrl && fallbackUrl !== metadataUrl) {
      coverCandidates.push({ label: "Generated Backup", url: fallbackUrl });
    }

    return {
      ...item,
      itemKey,
      posterUrl: overrideUrl || metadataUrl || fallbackUrl || "",
      metadataCoverUrl: metadataUrl || undefined,
      posterUrlFallback: metadataUrl || fallbackUrl || undefined,
      coverOverrideUrl: overrideUrl || undefined,
      coverSource: overrideUrl ? "Override Cover" : "Metadata Cover",
      coverCandidates,
    };
  };

  const getDisplayCoverUrl = (item: any) => {
    const itemKey = getMediaItemKey(item);
    const failed = new Set(failedCoverUrls[itemKey] || []);
    const overrideUrl = safeStr(coverOverrides[itemKey]);
    const candidates = [
      overrideUrl,
      safeStr(item?.metadataCoverUrl),
      safeStr(item?.posterUrl),
      safeStr(item?.posterUrlFallback),
    ].filter(Boolean);
    const uniqueCandidates = Array.from(new Set(candidates));
    return uniqueCandidates.find((url) => !failed.has(url)) || "";
  };

  const getOverlayFrameDefaultPath = useCallback(
    (itemType: "tv" | "movie" | "book" | "game", platform?: string) => {
      if (itemType === "book") return BOOK_FRAME_IMAGE;
      if (itemType === "movie") return MOVIE_FRAME_IMAGE;
      if (itemType === "tv") return CASE_FRAME_IMAGE;
      return getPlatformFrameFilename(platform);
    },
    []
  );

  const getOverlayFrameOverrideKey = useCallback(
    (itemType: "tv" | "movie" | "book" | "game", platform?: string) => {
      if (itemType !== "game") return itemType;
      const rawPlatform = safeStr(platform) || "Default";
      const canonicalPlatform = canonicalizePlatformLabel(rawPlatform);
      return `game:${canonicalPlatform || "Default"}`;
    },
    []
  );

  const getOverlayFrameUrl = useCallback(
    (itemType: "tv" | "movie" | "book" | "game", platform?: string) => {
      const overrideKey = getOverlayFrameOverrideKey(itemType, platform);
      const override = safeStr(overlayFrameOverrides[overrideKey]);
      if (override) return override;
      return getOverlayFrameDefaultPath(itemType, platform);
    },
    [getOverlayFrameDefaultPath, getOverlayFrameOverrideKey, overlayFrameOverrides]
  );

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight || 0);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    let rafId: number | null = null;
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        setWindowScrollY(window.scrollY || window.pageYOffset || 0);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const flushCaseTilt = useCallback(() => {
    caseTiltRafRef.current = null;
    const pending = caseTiltPendingRef.current;
    if (!pending) return;
    pending.el.style.setProperty("--tiltY", `${pending.tiltY}deg`);
    pending.el.style.setProperty("--tiltX", `${pending.tiltX}deg`);
    caseTiltPendingRef.current = null;
  }, []);

  const handleCaseMouseMove = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const xRel = (e.clientX - rect.left) / rect.width - 0.5;
      const yRel = (e.clientY - rect.top) / rect.height - 0.5;
      const maxTilt = 20;
      const tiltY = Math.max(-maxTilt, Math.min(maxTilt, xRel * maxTilt * 2));
      const tiltX = Math.max(-10, Math.min(10, -yRel * 16));
      caseTiltPendingRef.current = { el: e.currentTarget, tiltY, tiltX };
      if (caseTiltRafRef.current === null) {
        caseTiltRafRef.current = window.requestAnimationFrame(flushCaseTilt);
      }
    },
    [flushCaseTilt]
  );

  const handleCaseMouseLeave = useCallback((e: ReactMouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (caseTiltPendingRef.current?.el === el) {
      caseTiltPendingRef.current = null;
    }
    el.style.setProperty("--tiltY", "0deg");
    el.style.setProperty("--tiltX", "0deg");
  }, []);

  useEffect(() => {
    return () => {
      if (caseTiltRafRef.current !== null) {
        window.cancelAnimationFrame(caseTiltRafRef.current);
      }
    };
  }, []);

  const measureStageTop = useCallback(() => {
    const node = stageNodeRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setStageTopAbs(rect.top + (window.scrollY || window.pageYOffset || 0));
  }, [stageNodeRef]);

  useEffect(() => {
    measureStageTop();
  }, [measureStageTop, nav, viewportH, refreshNonce]);

  const clampSettingsWindowPosition = useCallback((x: number, y: number, width: number, height: number) => {
    const minX = SETTINGS_WINDOW_MARGIN;
    const minY = SETTINGS_WINDOW_START_Y;
    const maxX = Math.max(minX, window.innerWidth - width - SETTINGS_WINDOW_MARGIN);
    const maxY = Math.max(minY, window.innerHeight - height - SETTINGS_WINDOW_MARGIN);
    return {
      x: Math.round(Math.min(Math.max(x, minX), maxX)),
      y: Math.round(Math.min(Math.max(y, minY), maxY)),
    };
  }, [SETTINGS_WINDOW_MARGIN, SETTINGS_WINDOW_START_Y]);

  const getSettingsWindowSize = useCallback(() => {
    const width = Math.min(
      SETTINGS_WINDOW_DEFAULT_WIDTH,
      Math.max(320, window.innerWidth - SETTINGS_WINDOW_MARGIN * 2)
    );
    const maxHeight = Math.max(320, window.innerHeight - SETTINGS_WINDOW_START_Y - SETTINGS_WINDOW_MARGIN);
    const measuredHeight = settingsWindowRef.current?.getBoundingClientRect().height;
    return {
      width,
      height: measuredHeight ?? Math.min(680, maxHeight),
    };
  }, [SETTINGS_WINDOW_DEFAULT_WIDTH, SETTINGS_WINDOW_MARGIN, SETTINGS_WINDOW_START_Y]);

  useEffect(() => {
    if (!settingsPopupOpen) return;
    const syncSettingsWindowPosition = () => {
      const { width, height } = getSettingsWindowSize();
      setSettingsWindowPosition((prev) => {
        const fallbackX = window.innerWidth - width - SETTINGS_WINDOW_MARGIN;
        const fallbackY = SETTINGS_WINDOW_START_Y;
        const source = prev ?? { x: fallbackX, y: fallbackY };
        return clampSettingsWindowPosition(source.x, source.y, width, height);
      });
    };
    syncSettingsWindowPosition();
    window.addEventListener("resize", syncSettingsWindowPosition);
    return () => window.removeEventListener("resize", syncSettingsWindowPosition);
  }, [
    clampSettingsWindowPosition,
    getSettingsWindowSize,
    settingsPopupOpen,
    SETTINGS_WINDOW_MARGIN,
    SETTINGS_WINDOW_START_Y,
  ]);

  useEffect(() => {
    if (settingsPopupOpen) return;
    settingsWindowDragRef.current = null;
  }, [settingsPopupOpen]);

  const handleSettingsWindowPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement | null;
    if (!target?.closest("[data-settings-window-drag-handle='true']")) return;
    if (target.closest(SETTINGS_WINDOW_DRAG_BLOCK_SELECTOR)) return;
    const node = settingsWindowRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    settingsWindowDragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  }, []);

  const handleSettingsWindowPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = settingsWindowDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    const next = clampSettingsWindowPosition(
      event.clientX - dragState.offsetX,
      event.clientY - dragState.offsetY,
      dragState.width,
      dragState.height
    );
    setSettingsWindowPosition(next);
  }, [clampSettingsWindowPosition]);

  const handleSettingsWindowPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = settingsWindowDragRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    settingsWindowDragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    if (!settingsPopupOpen && !sortPopupOpen && !faqPopupOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsPopupOpen(false);
        setSortPopupOpen(false);
        setFaqPopupOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsPopupOpen, sortPopupOpen, faqPopupOpen]);

  const openSettingsPopup = useCallback((event?: ReactMouseEvent<HTMLButtonElement>) => {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    setSortPopupOpen(false);
    setShowVersionNotes(false);
    // Always open (not toggle) to avoid double-event close races after submenu interactions.
    setSettingsPopupOpen(true);
  }, []);

  useEffect(() => {
    if (!SHOW_HEADER_DEBUG_CONTROLS) return;
    applyDebugHeaderOffset();
  }, [applyDebugHeaderOffset]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cdlCoverOverrides");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setCoverOverrides(parsed as Record<string, string>);
      }
    } catch (e) {
      console.warn("Failed to load cover overrides from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cdlPopupCoverModes");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        const normalized: Record<string, "custom" | "default"> = {};
        Object.entries(parsed as Record<string, unknown>).forEach(([key, value]) => {
          if (value === "custom" || value === "default") {
            normalized[key] = value;
          }
        });
        setPopupCoverModes(normalized);
      }
    } catch (e) {
      console.warn("Failed to load popup cover modes from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cdlOverlayFrameOverrides");
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setOverlayFrameOverrides(parsed as Record<string, string>);
      }
    } catch (e) {
      console.warn("Failed to load overlay frame overrides from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_ICON_OVERRIDES_LOCAL_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setSidebarIconOverrides(parsed as Record<string, string>);
      }
    } catch (e) {
      console.warn("Failed to load sidebar icon overrides from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    if (!settingsRows.length) return;
    const fromSheet: Record<string, string> = {};
    const popupModesFromSheet: Record<string, "custom" | "default"> = {};
    const overlayFromSheet: Record<string, string> = {};
    const sidebarIconFromSheet: Record<string, string> = {};
    settingsRows.forEach((r) => {
      const key = safeStr(r["Key"]);
      const value = safeStr(r["Value"]);
      if (key.startsWith("coverOverride:")) {
        const mediaKey = key.slice("coverOverride:".length);
        if (mediaKey && value) {
          fromSheet[mediaKey] = value;
        }
      }
      if (key.startsWith("overlayFrameOverride:")) {
        const overlayKey = key.slice("overlayFrameOverride:".length);
        if (overlayKey && value) {
          overlayFromSheet[overlayKey] = value;
        }
      }
      if (key.startsWith("popupCoverMode:")) {
        const mediaKey = key.slice("popupCoverMode:".length);
        if (mediaKey && (value === "custom" || value === "default")) {
          popupModesFromSheet[mediaKey] = value;
        }
      }
      if (key.startsWith(SIDEBAR_ICON_SETTING_PREFIX)) {
        const iconKey = key.slice(SIDEBAR_ICON_SETTING_PREFIX.length);
        if (iconKey && value) {
          sidebarIconFromSheet[iconKey] = value;
        }
      }
    });
    if (Object.keys(fromSheet).length) {
      setCoverOverrides((prev) => ({ ...fromSheet, ...prev }));
    }
    if (Object.keys(popupModesFromSheet).length) {
      setPopupCoverModes((prev) => ({ ...popupModesFromSheet, ...prev }));
    }
    if (Object.keys(overlayFromSheet).length) {
      setOverlayFrameOverrides((prev) => ({ ...overlayFromSheet, ...prev }));
    }
    if (Object.keys(sidebarIconFromSheet).length) {
      setSidebarIconOverrides((prev) => ({ ...sidebarIconFromSheet, ...prev }));
    }
  }, [settingsRows]);

  useEffect(() => {
    if (!modalItem) return;
    setModalItem((prev: any) => (prev ? buildItemWithCoverSelection(prev, coverOverrides) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverOverrides]);

  const getSidebarIconSrc = (iconKey: string, fallbackSrc: string): string => {
    const override = safeStr(sidebarIconOverrides[iconKey]);
    return override || fallbackSrc;
  };

  const openSidebarIconFilePicker = (event: ReactMouseEvent<HTMLElement>, iconKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (uploadingSidebarIconKey) return;
    sidebarIconTargetKeyRef.current = iconKey;
    const input = sidebarIconFileInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const handleSidebarIconFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const iconKey = sidebarIconTargetKeyRef.current;
    if (!file || !iconKey) return;
    if (!safeStr(file.type).toLowerCase().startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    setUploadingSidebarIconKey(iconKey);

    try {
      let iconUrl = "";
      let uploadedToCloud = false;

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemKey", `sidebar-icon-${iconKey}`);
        formData.append("mediaType", "sidebar-icon");
        formData.append("title", iconKey);

        const res = await fetch("/api/upload-cover", {
          method: "POST",
          body: formData,
        });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) {
          throw new Error(payload?.error || `Upload failed (${res.status})`);
        }
        iconUrl = String(payload.url);
        uploadedToCloud = true;
      } catch (uploadError) {
        console.warn("Sidebar icon upload failed, using local fallback:", uploadError);
        iconUrl = await fileToDataUrl(file);
      }

      setSidebarIconOverrides((prev) => {
        const next = { ...prev, [iconKey]: iconUrl };
        try {
          localStorage.setItem(SIDEBAR_ICON_OVERRIDES_LOCAL_KEY, JSON.stringify(next));
        } catch (persistError) {
          console.warn("Failed to persist sidebar icon overrides locally:", persistError);
        }
        return next;
      });

      if (uploadedToCloud) {
        saveSetting(
          `${SIDEBAR_ICON_SETTING_PREFIX}${iconKey}`,
          iconUrl,
          "Sidebar Icons",
          `Custom sidebar icon for ${iconKey}`
        );
      }

      setSyncState("ok");
      setSyncMsg(uploadedToCloud ? "Sidebar icon saved" : "Sidebar icon saved locally");
      setLastSyncAt(Date.now());
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 1200);
    } catch (error: any) {
      const msg = error?.message || "Failed to update sidebar icon.";
      console.error("Sidebar icon update failed:", error);
      setSyncState("error");
      setSyncMsg(msg);
      alert(msg);
    } finally {
      setUploadingSidebarIconKey(null);
      sidebarIconTargetKeyRef.current = null;
      event.target.value = "";
    }
  };

  const handleReplaceCover = async (item: any, file: File) => {
    const itemKey = getMediaItemKey(item);
    const mediaType = getMediaType(item);

    setUploadingCoverForKey(itemKey);
    setCoverUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemKey", itemKey);
      formData.append("mediaType", mediaType);
      formData.append("title", safeStr(item?.title));

      const res = await fetch("/api/upload-cover", {
        method: "POST",
        body: formData,
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error || `Upload failed (${res.status})`);
      }

      const uploadedUrl = String(payload.url);
      setCoverOverrides((prev) => {
        const next = { ...prev, [itemKey]: uploadedUrl };
        try {
          localStorage.setItem("cdlCoverOverrides", JSON.stringify(next));
        } catch (e) {
          console.warn("Failed to persist cover overrides locally:", e);
        }
        return next;
      });

      if (settingsWriteUrl) {
        saveSettingToSheet(
          `coverOverride:${itemKey}`,
          uploadedUrl,
          "Cover Overrides",
          `${mediaType} cover override for ${safeStr(item?.title)}`
        );
      }

      setModalItem((prev: any) => (prev ? buildItemWithCoverSelection(prev, { ...coverOverrides, [itemKey]: uploadedUrl }) : prev));
    } catch (e: any) {
      const msg = e?.message || "Failed to upload cover";
      setCoverUploadError(msg);
      console.error("Cover upload failed:", e);
    } finally {
      setUploadingCoverForKey(null);
    }
  };

  const handlePopupCoverModeChange = (item: any, mode: "custom" | "default") => {
    const itemKey = getMediaItemKey(item);
    const mediaType = getMediaType(item);
    setPopupCoverModes((prev) => {
      const next = { ...prev, [itemKey]: mode };
      try {
        localStorage.setItem("cdlPopupCoverModes", JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist popup cover modes locally:", e);
      }
      return next;
    });
    if (settingsWriteUrl) {
      saveSettingToSheet(
        `popupCoverMode:${itemKey}`,
        mode,
        "Popup Cover Modes",
        `${mediaType} popup cover mode for ${safeStr(item?.title)}`
      );
    }
  };

  const postSheetWrite = useCallback(async (url: string, payload: Record<string, unknown>, fallbackMessage: string) => {
    const res = await fetch("/api/sheets-write", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, payload }),
    });

    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    if (!res.ok || !data?.ok) {
      const errorMessage =
        (typeof data?.error === "string" && data.error) ||
        (typeof data?.result === "string" && data.result) ||
        fallbackMessage;
      throw new Error(errorMessage);
    }
  }, []);

  const handleSaveBookEdits = async (item: any, updates: Record<string, string>) => {
    if (!booksWriteUrl) {
      throw new Error("Books write URL is not configured. Set NEXT_PUBLIC_BOOKS_WRITE_URL in .env.local.");
    }

    const matchGoogleBooksVolumeId = safeStr(updates.googleBooksVolumeId) || safeStr(item?.googleBooksVolumeId);
    const matchOpenLibraryWorkKey = safeStr(updates.openLibraryWorkKey) || safeStr(item?.openLibraryWorkKey);
    const matchIsbn = safeStr(updates.isbn) || safeStr(item?.isbn);
    const matchTitle = safeStr(item?.title);

    if (!matchGoogleBooksVolumeId && !matchOpenLibraryWorkKey && !matchIsbn && !matchTitle) {
      throw new Error("Unable to identify this book row to update.");
    }

    const payload = {
      action: "updateBook",
      match: {
        googleBooksVolumeId: matchGoogleBooksVolumeId,
        openLibraryWorkKey: matchOpenLibraryWorkKey,
        isbn: matchIsbn,
        title: matchTitle,
      },
      updates: {
        Title: safeStr(updates.title),
        Subtitle: safeStr(updates.subtitle),
        Series: safeStr(updates.series),
        Author: safeStr(updates.author),
        Ownership: safeStr(updates.ownership),
        Type: safeStr(updates.type),
        Status: safeStr(updates.status),
        CompletedDate: safeStr(updates.completedDate),
        isbn: safeStr(updates.isbn),
        ReleaseDate: safeStr(updates.releaseDate),
        description: safeStr(updates.description),
        ImageURL: safeStr(updates.imageUrl),
        userRating: safeStr(updates.userRating),
        "My Rating": safeStr(updates.myRating),
        pages: safeStr(updates.pages),
        audiobookDuration: safeStr(updates.audiobookDuration),
        genre: safeStr(updates.genre),
        tags: safeStr(updates.tags),
        OpenLibraryWorkKey: safeStr(updates.openLibraryWorkKey),
        GoogleBooksVolumeId: safeStr(updates.googleBooksVolumeId),
      },
    };

    try {
      await postSheetWrite(booksWriteUrl, payload, "Failed to save book edits");
    } catch (e: any) {
      throw new Error(e?.message || "Failed to save book edits");
    }

    setModalItem((prev: any) => {
      if (!prev) return prev;
      const nextItem = {
        ...prev,
        title: safeStr(updates.title) || prev.title,
        subtitle: safeStr(updates.subtitle),
        series: safeStr(updates.series),
        author: safeStr(updates.author),
        ownership: safeStr(updates.ownership),
        types: safeStr(updates.type),
        status: safeStr(updates.status),
        completedDate: safeStr(updates.completedDate),
        isbn: safeStr(updates.isbn),
        releaseDate: safeStr(updates.releaseDate),
        description: safeStr(updates.description),
        imageUrl: safeStr(updates.imageUrl),
        userRating: safeStr(updates.userRating),
        myRating: safeStr(updates.myRating),
        pages: safeStr(updates.pages),
        audiobookDuration: safeStr(updates.audiobookDuration),
        categories: safeStr(updates.genre),
        genre: safeStr(updates.genre),
        tags: safeStr(updates.tags),
        openLibraryWorkKey: safeStr(updates.openLibraryWorkKey),
        googleBooksVolumeId: safeStr(updates.googleBooksVolumeId),
      };
      return buildItemWithCoverSelection(nextItem, coverOverrides);
    });

    // Re-sync to pick up the canonical sheet values once published CSV refreshes.
    setRefreshNonce((n) => n + 1);
  };

  const handleSaveShowEdits = async (item: any, updates: Record<string, string>) => {
    if (!showsWriteUrl) {
      throw new Error(
        "Shows write URL is not configured. Set NEXT_PUBLIC_SHOWS_WRITE_URL (or NEXT_PUBLIC_TV_WRITE_URL) in .env.local."
      );
    }

    const matchTmdbId = safeStr(updates.tmdbId) || safeStr(item?.tmdbId);
    const matchTitle = safeStr(updates.title) || safeStr(item?.title);

    if (!matchTmdbId && !matchTitle) {
      throw new Error("Unable to identify this show row to update.");
    }

    const payload = {
      action: "updateShow",
      match: {
        tmdbId: matchTmdbId,
        title: matchTitle,
      },
      updates: {
        Title: safeStr(updates.title),
        Year: safeStr(updates.year),
        TMDB_ID: safeStr(updates.tmdbId),
        FirstAirDate: safeStr(updates.firstAirDate),
        LastAirDate: safeStr(updates.lastAirDate),
        "Date Completed": safeStr(updates.dateCompleted),
        CompletedDate: safeStr(updates.dateCompleted),
        NumberOfSeasons: safeStr(updates.numberOfSeasons),
        NumberOfEpisodes: safeStr(updates.numberOfEpisodes),
        WatchStatus: normalizeShowWatchStatusForSheet(updates.watchStatus),
        Status: safeStr(updates.showStatus),
        Networks: safeStr(updates.networks),
        StreamingUS: safeStr(updates.streamingUS),
        Genres: safeStr(updates.genres),
        TMDB_Rating: safeStr(updates.tmdbRating),
        MyRating: safeStr(updates.myRating),
        BackdropURL: safeStr(updates.backdropUrl),
        Overview: safeStr(updates.overview),
        Ownership: safeStr(updates.ownership),
        Tags: safeStr(updates.tags),
        Tag: safeStr(updates.tags),
        PosterURL: safeStr(updates.posterUrl),
      },
    };

    try {
      await postSheetWrite(showsWriteUrl, payload, "Failed to save show edits");
    } catch (e: any) {
      throw new Error(e?.message || "Failed to save show edits");
    }

    setModalItem((prev: any) => {
      if (!prev) return prev;
      const nextItem = {
        ...prev,
        title: safeStr(updates.title) || prev.title,
        year: safeStr(updates.year),
        tmdbId: safeStr(updates.tmdbId),
        firstAirDate: safeStr(updates.firstAirDate),
        lastAirDate: safeStr(updates.lastAirDate),
        dateCompleted: safeStr(updates.dateCompleted),
        numberOfSeasons: safeStr(updates.numberOfSeasons),
        numberOfEpisodes: safeStr(updates.numberOfEpisodes),
        watchStatus: normalizeShowWatchStatusForSheet(updates.watchStatus),
        showStatus: safeStr(updates.showStatus),
        networks: safeStr(updates.networks),
        streamingUS: safeStr(updates.streamingUS),
        genres: safeStr(updates.genres),
        tmdbRating: safeStr(updates.tmdbRating),
        myRating: safeStr(updates.myRating),
        backdropUrl: safeStr(updates.backdropUrl),
        overview: safeStr(updates.overview),
        ownership: safeStr(updates.ownership),
        tag: safeStr(updates.tags),
        tags: safeStr(updates.tags),
        posterUrl: safeStr(updates.posterUrl) || prev.posterUrl,
      };
      return buildItemWithCoverSelection(nextItem, coverOverrides);
    });

    setRefreshNonce((n) => n + 1);
  };

  const handleSaveMovieEdits = async (item: any, updates: Record<string, string>) => {
    if (!moviesWriteUrl) {
      throw new Error("Movies write URL is not configured. Set NEXT_PUBLIC_MOVIES_WRITE_URL in .env.local.");
    }

    const matchTmdbId = safeStr(updates.tmdbId) || safeStr(item?.tmdbId);
    const matchTitle = safeStr(updates.title) || safeStr(item?.title);

    if (!matchTmdbId && !matchTitle) {
      throw new Error("Unable to identify this movie row to update.");
    }

    const payload = {
      action: "updateMovie",
      match: {
        tmdbId: matchTmdbId,
        title: matchTitle,
      },
      updates: {
        Title: safeStr(updates.title),
        Year: safeStr(updates.year),
        MyRating: safeStr(updates.myRating),
        TMDB_Rating: safeStr(updates.tmdbRating),
        TMDB_ID: safeStr(updates.tmdbId),
        "Watch Status": safeStr(updates.watchStatus),
        WatchDate: safeStr(updates.watchDate),
        Tags: safeStr(updates.tags),
        ReleaseDate: safeStr(updates.releaseDate),
        Runtime: safeStr(updates.runtime),
        Status: safeStr(updates.status),
        Genres: safeStr(updates.genres),
        Overview: safeStr(updates.overview),
        PosterURL: safeStr(updates.posterUrl),
        BackdropURL: safeStr(updates.backdropUrl),
        Ownership: safeStr(updates.ownership),
      },
    };

    try {
      await postSheetWrite(moviesWriteUrl, payload, "Failed to save movie edits");
    } catch (e: any) {
      throw new Error(e?.message || "Failed to save movie edits");
    }

    setModalItem((prev: any) => {
      if (!prev) return prev;
      const nextItem = {
        ...prev,
        title: safeStr(updates.title) || prev.title,
        year: safeStr(updates.year),
        myRating: safeStr(updates.myRating),
        tmdbRating: safeStr(updates.tmdbRating),
        tmdbId: safeStr(updates.tmdbId),
        watched: safeStr(updates.watchStatus),
        watchStatus: safeStr(updates.watchStatus),
        watchDate: safeStr(updates.watchDate),
        tags: safeStr(updates.tags),
        tag: safeStr(updates.tags),
        releaseDate: safeStr(updates.releaseDate),
        runtime: safeStr(updates.runtime),
        status: safeStr(updates.status),
        movieStatus: safeStr(updates.status),
        ownership: safeStr(updates.ownership),
        genres: safeStr(updates.genres),
        overview: safeStr(updates.overview),
        posterUrl: safeStr(updates.posterUrl) || prev.posterUrl,
        backdropUrl: safeStr(updates.backdropUrl),
      };
      return buildItemWithCoverSelection(nextItem, coverOverrides);
    });

    setRefreshNonce((n) => n + 1);
  };

  const handleSaveGameEdits = async (item: any, updates: Record<string, string>) => {
    if (!gamesWriteUrl) {
      throw new Error("Games write URL is not configured. Set NEXT_PUBLIC_GAMES_WRITE_URL in .env.local.");
    }

    const matchIgdbId = safeStr(updates.igdbId) || safeStr(item?.igdbId);
    const matchTitle = safeStr(updates.title) || safeStr(item?.title);

    if (!matchIgdbId && !matchTitle) {
      throw new Error("Unable to identify this game row to update.");
    }

    const normalizeGameYesNo = (value: string): string => {
      const normalized = safeStr(value).toLowerCase();
      if (!normalized) return "";
      if (
        normalized === "true" ||
        normalized === "yes" ||
        normalized === "1" ||
        normalized === "checked" ||
        normalized === "completed" ||
        normalized === "backlog" ||
        normalized === "queued"
      ) {
        return "Yes";
      }
      if (
        normalized === "false" ||
        normalized === "no" ||
        normalized === "0" ||
        normalized === "unchecked" ||
        normalized === "not completed" ||
        normalized === "not backlog"
      ) {
        return "No";
      }
      return safeStr(value);
    };

    const getFirstGameValue = (source: Record<string, unknown> | null | undefined, keys: string[]): string => {
      for (const key of keys) {
        const raw = source?.[key];
        if (raw === undefined || raw === null) continue;
        const text = safeStr(raw);
        if (text) return text;
      }
      return "";
    };

    const existingKeysByColumn: Record<string, string[]> = {
      Title: ["title", "Title"],
      Cover: ["cover", "Cover"],
      Platform: ["platform", "Platform"],
      Status: ["status", "Status", "gameStatus", "playStatus"],
      Name: ["name", "Name"],
      ReleaseDate: ["releaseDate", "ReleaseDate"],
      "Release Date": ["releaseDateAlt", "Release Date", "releaseDate", "ReleaseDate"],
      Platforms: ["platforms", "Platforms"],
      CoverURL: ["coverUrl", "CoverURL"],
      Rating: ["rating", "Rating"],
      "IGDB Rating": ["igdbRating", "IGDB Rating"],
      "My Rating": ["myRating", "My Rating"],
      Ownership: ["ownership", "Ownership"],
      Format: ["format", "Format"],
      Backlog: ["backlog", "Backlog"],
      Completed: ["completed", "Completed"],
      "Date Completed": ["dateCompleted", "Date Completed"],
      "Year Played": ["yearPlayed", "Year Played"],
      "Date Added": ["dateAdded", "Date Added"],
      Description: ["description", "Description"],
      Genres: ["genres", "Genres"],
      "Hours Played": ["hoursPlayed", "Hours Played"],
      CoverCachedAt: ["coverCachedAt", "CoverCachedAt"],
      Developer: ["developer", "Developer"],
      ScreensotsURL: ["screensotsUrl", "ScreensotsURL"],
      WishlistOrder: ["wishlistOrder", "WishlistOrder"],
      QueuedOrder: ["queuedOrder", "QueuedOrder"],
      IGDB_ID: ["igdbId", "IGDB_ID"],
      IGDB_ID_Override: ["igdbIdOverride", "IGDB_ID_Override"],
      LocalCoverURL: ["localCoverUrl", "LocalCoverURL"],
    };

    const candidateUpdates: Record<string, string> = {
      Title: safeStr(updates.title),
      Cover: safeStr(updates.cover),
      Platform: safeStr(updates.platform),
      Status: safeStr(updates.status),
      Name: safeStr(updates.name),
      ReleaseDate: safeStr(updates.releaseDate),
      "Release Date": safeStr(updates.releaseDateAlt),
      Platforms: safeStr(updates.platforms),
      CoverURL: safeStr(updates.coverUrl),
      Rating: safeStr(updates.rating),
      "IGDB Rating": safeStr(updates.igdbRating),
      "My Rating": safeStr(updates.myRating),
      Ownership: safeStr(updates.ownership),
      Format: safeStr(updates.format),
      Backlog: normalizeGameYesNo(safeStr(updates.backlog)),
      Completed: normalizeGameYesNo(safeStr(updates.completed)),
      "Date Completed": safeStr(updates.dateCompleted),
      "Year Played": safeStr(updates.yearPlayed),
      "Date Added": safeStr(updates.dateAdded),
      Description: safeStr(updates.description),
      Genres: safeStr(updates.genres),
      "Hours Played": safeStr(updates.hoursPlayed),
      CoverCachedAt: safeStr(updates.coverCachedAt),
      Developer: safeStr(updates.developer),
      ScreensotsURL: safeStr(updates.screensotsUrl),
      WishlistOrder: safeStr(updates.wishlistOrder),
      QueuedOrder: safeStr(updates.queuedOrder),
      IGDB_ID: safeStr(updates.igdbId),
      IGDB_ID_Override: safeStr(updates.igdbIdOverride),
      LocalCoverURL: safeStr(updates.localCoverUrl),
    };

    const changedUpdates: Record<string, string> = {};
    Object.entries(candidateUpdates).forEach(([columnName, nextValueRaw]) => {
      const prevValue = getFirstGameValue(item, existingKeysByColumn[columnName] || [columnName]);
      let nextValue = safeStr(nextValueRaw);
      let comparablePrev = safeStr(prevValue);

      if (columnName === "Backlog" || columnName === "Completed") {
        nextValue = normalizeGameYesNo(nextValue);
        comparablePrev = normalizeGameYesNo(comparablePrev);
      }

      if (nextValue === comparablePrev) return;
      changedUpdates[columnName] = nextValue;
    });

    if (!Object.keys(changedUpdates).length) {
      return;
    }

    const payload = {
      action: "updateGame",
      match: {
        igdbId: matchIgdbId,
        title: matchTitle,
      },
      updates: changedUpdates,
    };

    try {
      await postSheetWrite(gamesWriteUrl, payload, "Failed to save game edits");
    } catch (e: any) {
      throw new Error(e?.message || "Failed to save game edits");
    }

    setModalItem((prev: any) => {
      if (!prev) return prev;
      const nextItem = {
        ...prev,
        title: safeStr(updates.title) || prev.title,
        cover: safeStr(updates.cover),
        platform: safeStr(updates.platform),
        status: safeStr(updates.status),
        name: safeStr(updates.name),
        releaseDate: safeStr(updates.releaseDate),
        releaseDateAlt: safeStr(updates.releaseDateAlt),
        platforms: safeStr(updates.platforms),
        coverUrl: safeStr(updates.coverUrl),
        rating: safeStr(updates.rating),
        igdbRating: safeStr(updates.igdbRating),
        myRating: safeStr(updates.myRating),
        ownership: safeStr(updates.ownership),
        format: safeStr(updates.format),
        backlog: safeStr(updates.backlog),
        completed: safeStr(updates.completed),
        dateCompleted: safeStr(updates.dateCompleted),
        yearPlayed: safeStr(updates.yearPlayed),
        dateAdded: safeStr(updates.dateAdded),
        description: safeStr(updates.description),
        genres: safeStr(updates.genres),
        hoursPlayed: safeStr(updates.hoursPlayed),
        coverCachedAt: safeStr(updates.coverCachedAt),
        developer: safeStr(updates.developer),
        screensotsUrl: safeStr(updates.screensotsUrl),
        wishlistOrder: safeStr(updates.wishlistOrder),
        queuedOrder: safeStr(updates.queuedOrder),
        igdbId: safeStr(updates.igdbId),
        igdbIdOverride: safeStr(updates.igdbIdOverride),
        localCoverUrl: safeStr(updates.localCoverUrl),
        gameStatus: safeStr(updates.status),
        playStatus: safeStr(updates.status),
      };
      return buildItemWithCoverSelection(nextItem, coverOverrides);
    });

    setRefreshNonce((n) => n + 1);
  };

  const handleDeleteLibraryItem = async (item: any) => {
    const mediaType = getMediaType(item);
    const title = safeStr(item?.title);

    const rowValue = (row: Row, keys: string[]): string => {
      for (const key of keys) {
        const value = safeStr(row[key]);
        if (value) return value;
      }
      return "";
    };

    if (mediaType === "book") {
      if (!booksWriteUrl) {
        throw new Error("Books write URL is not configured. Set NEXT_PUBLIC_BOOKS_WRITE_URL in .env.local.");
      }
      const matchGoogleBooksVolumeId = safeStr(item?.googleBooksVolumeId);
      const matchOpenLibraryWorkKey = safeStr(item?.openLibraryWorkKey);
      const matchIsbn = safeStr(item?.isbn);
      if (!matchGoogleBooksVolumeId && !matchOpenLibraryWorkKey && !matchIsbn && !title) {
        throw new Error("Unable to identify this book row to delete.");
      }

      await postSheetWrite(
        booksWriteUrl,
        {
          action: "deleteBook",
          match: {
            googleBooksVolumeId: matchGoogleBooksVolumeId,
            openLibraryWorkKey: matchOpenLibraryWorkKey,
            isbn: matchIsbn,
            title,
          },
        },
        "Failed to delete book"
      );

      setBookRows((prev) =>
        prev.filter((row) => {
          const rowGoogleBooksVolumeId = rowValue(row, ["GoogleBooksVolumeId", "googleBooksVolumeId"]);
          const rowOpenLibraryWorkKey = rowValue(row, ["OpenLibraryWorkKey", "openLibraryWorkKey"]);
          const rowIsbn = rowValue(row, ["isbn", "ISBN"]);
          const rowTitle = rowValue(row, ["Title"]);
          if (matchGoogleBooksVolumeId && rowGoogleBooksVolumeId === matchGoogleBooksVolumeId) return false;
          if (matchOpenLibraryWorkKey && rowOpenLibraryWorkKey === matchOpenLibraryWorkKey) return false;
          if (matchIsbn && rowIsbn === matchIsbn) return false;
          if (title && rowTitle.toLowerCase() === title.toLowerCase()) return false;
          return true;
        })
      );
    } else if (mediaType === "tv") {
      if (!showsWriteUrl) {
        throw new Error(
          "Shows write URL is not configured. Set NEXT_PUBLIC_SHOWS_WRITE_URL (or NEXT_PUBLIC_TV_WRITE_URL) in .env.local."
        );
      }
      const matchTmdbId = safeStr(item?.tmdbId);
      if (!matchTmdbId && !title) {
        throw new Error("Unable to identify this show row to delete.");
      }

      await postSheetWrite(
        showsWriteUrl,
        {
          action: "deleteShow",
          match: {
            tmdbId: matchTmdbId,
            title,
          },
        },
        "Failed to delete show"
      );

      setTvRows((prev) =>
        prev.filter((row) => {
          const rowTmdbId = rowValue(row, ["TMDB_ID", "tmdbId"]);
          const rowTitle = rowValue(row, ["Title"]);
          if (matchTmdbId && rowTmdbId === matchTmdbId) return false;
          if (title && rowTitle.toLowerCase() === title.toLowerCase()) return false;
          return true;
        })
      );
    } else if (mediaType === "movie") {
      if (!moviesWriteUrl) {
        throw new Error("Movies write URL is not configured. Set NEXT_PUBLIC_MOVIES_WRITE_URL in .env.local.");
      }
      const matchTmdbId = safeStr(item?.tmdbId);
      if (!matchTmdbId && !title) {
        throw new Error("Unable to identify this movie row to delete.");
      }

      await postSheetWrite(
        moviesWriteUrl,
        {
          action: "deleteMovie",
          match: {
            tmdbId: matchTmdbId,
            title,
          },
        },
        "Failed to delete movie"
      );

      setMovieRows((prev) =>
        prev.filter((row) => {
          const rowTmdbId = rowValue(row, ["TMDB_ID", "tmdbId"]);
          const rowTitle = rowValue(row, ["Title"]);
          if (matchTmdbId && rowTmdbId === matchTmdbId) return false;
          if (title && rowTitle.toLowerCase() === title.toLowerCase()) return false;
          return true;
        })
      );
    } else {
      if (!gamesWriteUrl) {
        throw new Error("Games write URL is not configured. Set NEXT_PUBLIC_GAMES_WRITE_URL in .env.local.");
      }
      const matchIgdbId = safeStr(item?.igdbId);
      if (!matchIgdbId && !title) {
        throw new Error("Unable to identify this game row to delete.");
      }

      await postSheetWrite(
        gamesWriteUrl,
        {
          action: "deleteGame",
          match: {
            igdbId: matchIgdbId,
            title,
          },
        },
        "Failed to delete game"
      );

      setGameRows((prev) =>
        prev.filter((row) => {
          const rowIgdbId = rowValue(row, ["IGDB_ID", "igdbId"]);
          const rowTitle = rowValue(row, ["Title"]);
          if (matchIgdbId && rowIgdbId === matchIgdbId) return false;
          if (title && rowTitle.toLowerCase() === title.toLowerCase()) return false;
          return true;
        })
      );
    }

    if (typeof window !== "undefined") {
      window.alert(`Deleted "${title || "item"}" successfully.`);
    }
    setModalOpen(false);
    setModalItem(null);
    setCoverUploadError(null);
    setRefreshNonce((n) => n + 1);
  };

  const handleAddLibraryItem = useCallback(
    async (payload: AddItemPayload) => {
      const { type, values } = payload;
      const title = safeStr(values.title);
      if (!title) {
        throw new Error("Title is required.");
      }

      setAddingItem(true);
      setAddSaveError(null);

      try {
        if (type === "book") {
          if (!booksWriteUrl) {
            throw new Error("Books write URL is not configured. Set NEXT_PUBLIC_BOOKS_WRITE_URL in .env.local.");
          }
          await postSheetWrite(
            booksWriteUrl,
            {
              action: "addBook",
              values: {
                Title: title,
                Subtitle: safeStr(values.subtitle),
                Series: safeStr(values.series),
                Author: safeStr(values.author),
                Ownership: safeStr(values.ownership),
                Type: safeStr(values.type),
                Status: safeStr(values.status),
                CompletedDate: safeStr(values.completedDate),
                isbn: safeStr(values.isbn),
                ReleaseDate: safeStr(values.releaseDate),
                description: safeStr(values.description),
                ImageURL: safeStr(values.imageUrl),
                userRating: safeStr(values.userRating),
                "My Rating": safeStr(values.myRating),
                pages: safeStr(values.pages),
                audiobookDuration: safeStr(values.audiobookDuration),
                genre: safeStr(values.genre),
                tags: safeStr(values.tags),
                OpenLibraryWorkKey: safeStr(values.openLibraryWorkKey),
                GoogleBooksVolumeId: safeStr(values.googleBooksVolumeId),
              },
            },
            "Failed to add book"
          );
          setBookRows((prev) => [
            ...prev,
            {
              Title: title,
              Subtitle: safeStr(values.subtitle),
              Series: safeStr(values.series),
              Author: safeStr(values.author),
              Ownership: safeStr(values.ownership),
              Type: safeStr(values.type),
              Status: safeStr(values.status),
              CompletedDate: safeStr(values.completedDate),
              isbn: safeStr(values.isbn),
              ReleaseDate: safeStr(values.releaseDate),
              description: safeStr(values.description),
              ImageURL: safeStr(values.imageUrl),
              userRating: safeStr(values.userRating),
              "My Rating": safeStr(values.myRating),
              pages: safeStr(values.pages),
              audiobookDuration: safeStr(values.audiobookDuration),
              genre: safeStr(values.genre),
              tags: safeStr(values.tags),
              OpenLibraryWorkKey: safeStr(values.openLibraryWorkKey),
              GoogleBooksVolumeId: safeStr(values.googleBooksVolumeId),
            },
          ]);
          setNav("books");
        } else if (type === "tv") {
          if (!showsWriteUrl) {
            throw new Error(
              "Shows write URL is not configured. Set NEXT_PUBLIC_SHOWS_WRITE_URL (or NEXT_PUBLIC_TV_WRITE_URL) in .env.local."
            );
          }
          const normalizedWatchStatus = normalizeShowWatchStatusForSheet(values.watchStatus);
          await postSheetWrite(
            showsWriteUrl,
            {
              action: "addShow",
              values: {
                Title: title,
                Year: safeStr(values.year),
                TMDB_ID: safeStr(values.tmdbId),
                FirstAirDate: safeStr(values.firstAirDate),
                LastAirDate: safeStr(values.lastAirDate),
                "Date Completed": safeStr(values.dateCompleted),
                CompletedDate: safeStr(values.dateCompleted),
                NumberOfSeasons: safeStr(values.numberOfSeasons),
                NumberOfEpisodes: safeStr(values.numberOfEpisodes),
                WatchStatus: normalizedWatchStatus,
                Status: safeStr(values.showStatus),
                Networks: safeStr(values.networks),
                StreamingUS: safeStr(values.streamingUS),
                Genres: safeStr(values.genres),
                TMDB_Rating: safeStr(values.tmdbRating),
                MyRating: safeStr(values.myRating),
                BackdropURL: safeStr(values.backdropUrl),
                Overview: safeStr(values.overview),
                Ownership: safeStr(values.ownership),
                Tags: safeStr(values.tags),
                Tag: safeStr(values.tags),
                PosterURL: safeStr(values.posterUrl),
              },
            },
            "Failed to add show"
          );
          setTvRows((prev) => [
            ...prev,
            {
              Title: title,
              Year: safeStr(values.year),
              TMDB_ID: safeStr(values.tmdbId),
              FirstAirDate: safeStr(values.firstAirDate),
              LastAirDate: safeStr(values.lastAirDate),
              "Date Completed": safeStr(values.dateCompleted),
              CompletedDate: safeStr(values.dateCompleted),
              NumberOfSeasons: safeStr(values.numberOfSeasons),
              NumberOfEpisodes: safeStr(values.numberOfEpisodes),
              WatchStatus: normalizedWatchStatus,
              Status: safeStr(values.showStatus),
              Networks: safeStr(values.networks),
              StreamingUS: safeStr(values.streamingUS),
              Genres: safeStr(values.genres),
              TMDB_Rating: safeStr(values.tmdbRating),
              MyRating: safeStr(values.myRating),
              BackdropURL: safeStr(values.backdropUrl),
              Overview: safeStr(values.overview),
              Ownership: safeStr(values.ownership),
              Tags: safeStr(values.tags),
              Tag: safeStr(values.tags),
              PosterURL: safeStr(values.posterUrl),
            },
          ]);
          setNav("tv");
        } else if (type === "movie") {
          if (!moviesWriteUrl) {
            throw new Error("Movies write URL is not configured. Set NEXT_PUBLIC_MOVIES_WRITE_URL in .env.local.");
          }
          await postSheetWrite(
            moviesWriteUrl,
            {
              action: "addMovie",
              values: {
                Title: title,
                Year: safeStr(values.year),
                MyRating: safeStr(values.myRating),
                TMDB_Rating: safeStr(values.tmdbRating),
                TMDB_ID: safeStr(values.tmdbId),
                "Watch Status": safeStr(values.watchStatus),
                WatchDate: safeStr(values.watchDate),
                Tags: safeStr(values.tags),
                ReleaseDate: safeStr(values.releaseDate),
                Runtime: safeStr(values.runtime),
                Status: safeStr(values.status),
                Genres: safeStr(values.genres),
                Overview: safeStr(values.overview),
                PosterURL: safeStr(values.posterUrl),
                BackdropURL: safeStr(values.backdropUrl),
              },
            },
            "Failed to add movie"
          );
          setMovieRows((prev) => [
            ...prev,
            {
              Title: title,
              Year: safeStr(values.year),
              MyRating: safeStr(values.myRating),
              TMDB_Rating: safeStr(values.tmdbRating),
              TMDB_ID: safeStr(values.tmdbId),
              "Watch Status": safeStr(values.watchStatus),
              WatchDate: safeStr(values.watchDate),
              Tags: safeStr(values.tags),
              ReleaseDate: safeStr(values.releaseDate),
              Runtime: safeStr(values.runtime),
              Status: safeStr(values.status),
              Genres: safeStr(values.genres),
              Overview: safeStr(values.overview),
              PosterURL: safeStr(values.posterUrl),
              BackdropURL: safeStr(values.backdropUrl),
            },
          ]);
          setNav("movies");
        } else {
          if (!gamesWriteUrl) {
            throw new Error("Games write URL is not configured. Set NEXT_PUBLIC_GAMES_WRITE_URL in .env.local.");
          }
          const dateAdded = safeStr(values.dateAdded) || new Date().toISOString().slice(0, 10);
          const releaseDatePrimary = safeStr(values.releaseDate) || safeStr(values.releaseDateAlt);
          const releaseDateAlt = safeStr(values.releaseDateAlt) || releaseDatePrimary;
          await postSheetWrite(
            gamesWriteUrl,
            {
              action: "addGame",
              values: {
                Title: title,
                Cover: safeStr(values.cover),
                Platform: safeStr(values.platform),
                Status: safeStr(values.status),
                Name: safeStr(values.name) || title,
                ReleaseDate: releaseDatePrimary,
                "Release Date": releaseDateAlt,
                Platforms: safeStr(values.platforms),
                CoverURL: safeStr(values.coverUrl),
                Rating: safeStr(values.rating),
                "IGDB Rating": safeStr(values.igdbRating),
                "My Rating": safeStr(values.myRating),
                Ownership: safeStr(values.ownership),
                Format: safeStr(values.format),
                Backlog: safeStr(values.backlog),
                Completed: safeStr(values.completed),
                "Date Completed": safeStr(values.dateCompleted),
                "Year Played": safeStr(values.yearPlayed),
                "Date Added": dateAdded,
                Description: safeStr(values.description),
                Genres: safeStr(values.genres),
                "Hours Played": safeStr(values.hoursPlayed),
                CoverCachedAt: safeStr(values.coverCachedAt),
                Developer: safeStr(values.developer),
                ScreensotsURL: safeStr(values.screensotsUrl),
                WishlistOrder: safeStr(values.wishlistOrder),
                QueuedOrder: safeStr(values.queuedOrder),
                IGDB_ID: safeStr(values.igdbId),
                IGDB_ID_Override: safeStr(values.igdbIdOverride),
                LocalCoverURL: safeStr(values.localCoverUrl),
                Tag: safeStr(values.tags),
              },
            },
            "Failed to add game"
          );
          setGameRows((prev) => [
            ...prev,
            {
              Title: title,
              Cover: safeStr(values.cover),
              Platform: safeStr(values.platform),
              Status: safeStr(values.status),
              Name: safeStr(values.name) || title,
              ReleaseDate: releaseDatePrimary,
              "Release Date": releaseDateAlt,
              Platforms: safeStr(values.platforms),
              CoverURL: safeStr(values.coverUrl),
              Rating: safeStr(values.rating),
              "IGDB Rating": safeStr(values.igdbRating),
              "My Rating": safeStr(values.myRating),
              Ownership: safeStr(values.ownership),
              Format: safeStr(values.format),
              Backlog: safeStr(values.backlog),
              Completed: safeStr(values.completed),
              "Date Completed": safeStr(values.dateCompleted),
              "Year Played": safeStr(values.yearPlayed),
              "Date Added": dateAdded,
              Description: safeStr(values.description),
              Genres: safeStr(values.genres),
              "Hours Played": safeStr(values.hoursPlayed),
              CoverCachedAt: safeStr(values.coverCachedAt),
              Developer: safeStr(values.developer),
              ScreensotsURL: safeStr(values.screensotsUrl),
              WishlistOrder: safeStr(values.wishlistOrder),
              QueuedOrder: safeStr(values.queuedOrder),
              IGDB_ID: safeStr(values.igdbId),
              IGDB_ID_Override: safeStr(values.igdbIdOverride),
              LocalCoverURL: safeStr(values.localCoverUrl),
              Tag: safeStr(values.tags),
            },
          ]);
          setNav("games");
        }

        setAddModalOpen(false);
        setAddSaveError(null);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Failed to add item";
        setAddSaveError(message);
        throw error;
      } finally {
        setAddingItem(false);
      }
    },
    [booksWriteUrl, gamesWriteUrl, moviesWriteUrl, postSheetWrite, showsWriteUrl]
  );

  useEffect(() => {
    const splashTimer = window.setTimeout(() => {
      setSplashMinDurationDone(true);
    }, SPLASH_MIN_DURATION_MS);

    return () => {
      window.clearTimeout(splashTimer);
    };
  }, []);

  useEffect(() => {
    // Need at least one CSV URL to proceed
    if (!tvCsvUrl && !booksCsvUrl && !moviesCsvUrl && !gamesCsvUrl) {
      setError(
        `No CSV URL(s) found in env.\n\nCreate / update .env.local in project root and add at least one of:\n${ENV_KEY}=PASTE_YOUR_TV_PUBLISHED_CSV_URL_HERE\n${BOOKS_ENV_KEY}=PASTE_YOUR_BOOKS_PUBLISHED_CSV_URL_HERE\n${MOVIES_ENV_KEY}=PASTE_YOUR_MOVIES_PUBLISHED_CSV_URL_HERE\n${GAMES_ENV_KEY}=PASTE_YOUR_GAMES_PUBLISHED_CSV_URL_HERE\n\nThen stop + restart dev server.`
      );
      setSyncState("error");
      setSyncMsg("Missing CSV URL(s)");
      setInitialLoadSettled(true);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setSyncState("saving");
    setSyncMsg("Syncing…");
    setError(null);

    const fetchCsv = async (url: string) => {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.status} ${res.statusText}`);
      return await res.text();
    };

    Promise.allSettled([
      tvCsvUrl ? fetchCsv(tvCsvUrl) : Promise.resolve(null),
      booksCsvUrl ? fetchCsv(booksCsvUrl) : Promise.resolve(null),
      moviesCsvUrl ? fetchCsv(moviesCsvUrl) : Promise.resolve(null),
      gamesCsvUrl ? fetchCsv(gamesCsvUrl) : Promise.resolve(null),
      settingsCsvUrl ? fetchCsv(settingsCsvUrl) : Promise.resolve(null),
    ])
      .then((results) => {
        if (cancelled) return;

        const [tvRes, booksRes, moviesRes, gamesRes, settingsRes] = results;

        if (tvRes && tvRes.status === "fulfilled" && typeof tvRes.value === "string") {
          const parsed = Papa.parse<Row>(tvRes.value, { header: true, skipEmptyLines: true });
          const data = (parsed.data || []).map((r) => r as Row).filter((r) => Boolean(safeStr(r["Title"])));
          setTvRows(data);
        } else if (tvRes && tvRes.status === "rejected") {
          setError(`TV CSV: ${tvRes.reason?.message || String(tvRes.reason)}`);
        }

        if (booksRes && booksRes.status === "fulfilled" && typeof booksRes.value === "string") {
          const parsed = Papa.parse<Row>(booksRes.value, { header: true, skipEmptyLines: true });
          const data = (parsed.data || []).map((r) => r as Row).filter((r) => Boolean(safeStr(r["Title"])));
          setBookRows(data);
        } else if (booksRes && booksRes.status === "rejected") {
          setError((prev) => (prev ? prev + "\n" : "") + `Books CSV: ${booksRes.reason?.message || String(booksRes.reason)}`);
        }

        if (moviesRes && moviesRes.status === "fulfilled" && typeof moviesRes.value === "string") {
          const parsed = Papa.parse<Row>(moviesRes.value, { header: true, skipEmptyLines: true });
          const data = (parsed.data || []).map((r) => r as Row).filter((r) => Boolean(safeStr(r["Title"])));
          setMovieRows(data);
        } else if (moviesRes && moviesRes.status === "rejected") {
          setError((prev) => (prev ? prev + "\n" : "") + `Movies CSV: ${moviesRes.reason?.message || String(moviesRes.reason)}`);
        }

        if (gamesRes && gamesRes.status === "fulfilled" && typeof gamesRes.value === "string") {
          const parsed = Papa.parse<Row>(gamesRes.value, { header: true, skipEmptyLines: true });
          const data = (parsed.data || []).map((r) => r as Row).filter((r) => Boolean(safeStr(r["Title"])));
          setGameRows(data);
        } else if (gamesRes && gamesRes.status === "rejected") {
          setError((prev) => (prev ? prev + "\n" : "") + `Games CSV: ${gamesRes.reason?.message || String(gamesRes.reason)}`);
        }

        if (settingsRes && settingsRes.status === "fulfilled" && typeof settingsRes.value === "string") {
          const parsed = Papa.parse<Row>(settingsRes.value, { header: true, skipEmptyLines: true });
          const data = (parsed.data || []).map((r) => r as Row);
          setSettingsRows(data);
        } else if (settingsRes && settingsRes.status === "rejected") {
          setError((prev) => (prev ? prev + "\n" : "") + `Settings CSV: ${settingsRes.reason?.message || String(settingsRes.reason)}`);
        }

        setSyncState("ok");
        setSyncMsg("Synced");
        setLastSyncAt(Date.now());
        setLoading(false);
        setInitialLoadSettled(true);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load CSV(s)");
        setSyncState("error");
        setSyncMsg(e?.message || "Sync failed");
        setLoading(false);
        setInitialLoadSettled(true);
      });

    return () => {
      cancelled = true;
    };
  }, [tvCsvUrl, booksCsvUrl, moviesCsvUrl, gamesCsvUrl, settingsCsvUrl, refreshNonce]);

  function formatLastSync(ts: number | null) {
    if (!ts) return "—";
    try {
      return new Intl.DateTimeFormat(undefined, {
        year: "2-digit",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(new Date(ts));
    } catch {
      return "—";
    }
  }

  // Settings helper functions
  // CORE SETTING FUNCTIONS - These provide automatic persistence for ALL settings
  // 
  // getSetting(key, defaultValue):
  //   - Reads from Google Sheet first (source of truth)
  //   - Falls back to localStorage if not in sheet
  //   - Falls back to defaultValue if nowhere else
  //   - Automatically type-converts: "true" → true, "100" → 100, etc.
  //
  // saveSetting(key, value, category, description):
  //   - Saves to localStorage IMMEDIATELY (instant local persistence)
  //   - Also auto-saves to Google Sheet via Apps Script (non-blocking)
  //   - Logs success/failure to console for debugging
  //   - Even if Google Sheet is down, data is protected in localStorage
  //
  const getSetting = useCallback((key: string, defaultValue: any) => {
    const parseStoredValue = (value: unknown) => {
      const str = String(value ?? "");
      const numValue = Number(str);
      if (!isNaN(numValue) && str !== "") return numValue;
      if (str === "true") return true;
      if (str === "false") return false;
      return str;
    };

    // Prefer local cache first so recently changed values persist across app restarts
    // even if the published sheet CSV lags behind writes.
    try {
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      const settingsCache = settingsCacheRef.current;
      if (settingsCache && settingsCache[key] !== undefined && settingsCache[key] !== "") {
        return parseStoredValue(settingsCache[key]);
      }
    } catch (e) {
      console.warn("Failed to read from localStorage:", e);
    }

    // Fallback to settingsRows (sheet values)
    const setting = settingsRows.find((r) => safeStr(r["Key"]) === key);
    if (setting && setting["Value"] !== undefined && setting["Value"] !== "") {
      return parseStoredValue(setting["Value"]);
    }
    
    return defaultValue;
  }, [settingsRows]);

  const flushPendingSettingsSheetWrites = useCallback(async () => {
    if (!settingsWriteUrl) return;
    const pending = pendingSettingsSheetWritesRef.current;
    const entries = Object.entries(pending);
    if (!entries.length) return;

    setSyncState("saving");
    setSyncMsg(`Saving ${entries.length} setting${entries.length === 1 ? "" : "s"}...`);

    // Clear queue first so new writes can continue while this batch is in flight.
    pendingSettingsSheetWritesRef.current = {};

    const results = await Promise.allSettled(
      entries.map(([key, entry]) =>
        postSheetWrite(
          settingsWriteUrl,
          {
            key,
            value: entry.value,
            category: entry.category,
            description: entry.description,
          },
          `Failed to save setting: ${key}`
        )
      )
    );

    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.length - successCount;
    if (failedCount > 0) {
      setSyncState("error");
      setSyncMsg(`Saved ${successCount}/${results.length} settings`);
      return;
    }

    setSyncState("ok");
    setSyncMsg(`Saved ${successCount} setting${successCount === 1 ? "" : "s"}`);
    setLastSyncAt(Date.now());
    setTimeout(() => {
      setSyncMsg("Synced");
    }, 1200);
  }, [postSheetWrite, settingsWriteUrl]);

  const queueSettingSheetWrite = useCallback(
    (key: string, value: any, category: string = "", description: string = "") => {
      if (!settingsWriteUrl) return;

      const valueStr = String(value);
      if (valueStr.includes("#REF!")) {
        console.log(`Skipping: ${key} (contains #REF! error)`);
        return;
      }

      pendingSettingsSheetWritesRef.current[key] = {
        value: valueStr,
        category,
        description,
      };

      if (settingsSheetFlushTimerRef.current) {
        clearTimeout(settingsSheetFlushTimerRef.current);
      }
      settingsSheetFlushTimerRef.current = setTimeout(() => {
        settingsSheetFlushTimerRef.current = null;
        void flushPendingSettingsSheetWrites();
      }, 700);
    },
    [flushPendingSettingsSheetWrites, settingsWriteUrl]
  );

  const saveSetting = useCallback((key: string, value: any, category: string = "", description: string = "") => {
    try {
      // Initialize cache from localStorage if not already loaded
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      
      // Update in-memory cache
      if (settingsCacheRef.current) {
        settingsCacheRef.current[key] = String(value);
        // Batch localStorage writes so rapid nudge/slider updates stay responsive.
        if (settingsPersistTimerRef.current) {
          clearTimeout(settingsPersistTimerRef.current);
        }
        settingsPersistTimerRef.current = setTimeout(() => {
          try {
            if (settingsCacheRef.current) {
              localStorage.setItem("cdlSettingsCache", JSON.stringify(settingsCacheRef.current));
            }
          } catch (persistError) {
            console.warn("Failed to persist settings cache:", persistError);
          } finally {
            settingsPersistTimerRef.current = null;
          }
        }, 120);
      }
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
    }
    queueSettingSheetWrite(key, value, category, description);
  }, [queueSettingSheetWrite]);

  const removeSetting = useCallback((key: string) => {
    try {
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      if (!settingsCacheRef.current) return;
      if (!(key in settingsCacheRef.current)) return;
      delete settingsCacheRef.current[key];
      if (settingsPersistTimerRef.current) {
        clearTimeout(settingsPersistTimerRef.current);
      }
      settingsPersistTimerRef.current = setTimeout(() => {
        try {
          if (settingsCacheRef.current) {
            localStorage.setItem("cdlSettingsCache", JSON.stringify(settingsCacheRef.current));
          }
        } catch (persistError) {
          console.warn("Failed to persist settings cache:", persistError);
        } finally {
          settingsPersistTimerRef.current = null;
        }
      }, 120);
    } catch (e) {
      console.warn("Failed to remove setting from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (settingsPersistTimerRef.current) {
        clearTimeout(settingsPersistTimerRef.current);
      }
      if (settingsSheetFlushTimerRef.current) {
        clearTimeout(settingsSheetFlushTimerRef.current);
      }
      // Best effort final flush on unmount/navigation.
      try {
        if (settingsCacheRef.current) {
          localStorage.setItem("cdlSettingsCache", JSON.stringify(settingsCacheRef.current));
        }
      } catch (persistError) {
        console.warn("Failed to persist settings cache on cleanup:", persistError);
      }
      void flushPendingSettingsSheetWrites();
    };
  }, [flushPendingSettingsSheetWrites]);

  useEffect(() => {
    if (!settingsWriteUrl) return;

    const flushNow = () => {
      if (settingsSheetFlushTimerRef.current) {
        clearTimeout(settingsSheetFlushTimerRef.current);
        settingsSheetFlushTimerRef.current = null;
      }
      void flushPendingSettingsSheetWrites();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushNow();
      }
    };

    window.addEventListener("beforeunload", flushNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("beforeunload", flushNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [flushPendingSettingsSheetWrites, settingsWriteUrl]);

  // Save a specific setting to Google Sheet
  const saveSettingToSheet = useCallback(async (key: string, value: any, category: string = "", description: string = "") => {
    if (!settingsWriteUrl) {
      console.warn("No settings write URL configured");
      return;
    }

    const valueStr = String(value);
    if (valueStr.includes("#REF!")) {
      console.log(`Skipping: ${key} (contains #REF! error)`);
      return;
    }

    try {
      await postSheetWrite(
        settingsWriteUrl,
        { key, value: valueStr, category, description },
        `Failed to save setting: ${key}`
      );
      console.log(`✓ Saved to sheet: ${key} = ${valueStr}`);
    } catch (e) {
      console.warn(`✗ Error in saveSettingToSheet:`, e);
    }
  }, [postSheetWrite, settingsWriteUrl]);

  // Save all insets of a specific type to Google Sheet
  const saveInsetsToSheet = async (insetType: 'tv' | 'book' | 'movie' | 'game') => {
    setSyncState("saving");
    setSyncMsg(`Saving ${insetType} insets...`);

    try {
      let savePromises: Promise<void>[] = [];

      if (insetType === 'tv') {
        savePromises = [
          saveSettingToSheet("caseInsetTopPx", caseInsetTopPx, "TV Insets", "TV Case Top Inset (px)"),
          saveSettingToSheet("caseInsetRightPx", caseInsetRightPx, "TV Insets", "TV Case Right Inset (px)"),
          saveSettingToSheet("caseInsetBottomPx", caseInsetBottomPx, "TV Insets", "TV Case Bottom Inset (px)"),
          saveSettingToSheet("caseInsetLeftPx", caseInsetLeftPx, "TV Insets", "TV Case Left Inset (px)"),
          saveSettingToSheet("tvOverlayWidth", tvOverlaySettings.width, "TV Overlay", "TV Overlay Width (%)"),
          saveSettingToSheet("tvOverlayHeight", tvOverlaySettings.height, "TV Overlay", "TV Overlay Height (%)"),
          saveSettingToSheet("tvOverlayTop", tvOverlaySettings.top, "TV Overlay", "TV Overlay Top (%)"),
          saveSettingToSheet("tvOverlayLeft", tvOverlaySettings.left, "TV Overlay", "TV Overlay Left (%)"),
          saveSettingToSheet("tvCoverScaleX", tvCoverScale.x, "TV Cover", "TV Cover Scale X (%)"),
          saveSettingToSheet("tvCoverScaleY", tvCoverScale.y, "TV Cover", "TV Cover Scale Y (%)"),
          saveSettingToSheet("tvCoverOffsetX", tvCoverOffset.x, "TV Cover", "TV Cover Offset X (%)"),
          saveSettingToSheet("tvCoverOffsetY", tvCoverOffset.y, "TV Cover", "TV Cover Offset Y (%)"),
        ];
      } else if (insetType === 'book') {
        savePromises = [
          saveSettingToSheet("bookInsetTopPx", bookInsetTopPx, "Book Insets", "Book Top Inset (px)"),
          saveSettingToSheet("bookInsetRightPx", bookInsetRightPx, "Book Insets", "Book Right Inset (px)"),
          saveSettingToSheet("bookInsetBottomPx", bookInsetBottomPx, "Book Insets", "Book Bottom Inset (px)"),
          saveSettingToSheet("bookInsetLeftPx", bookInsetLeftPx, "Book Insets", "Book Left Inset (px)"),
          saveSettingToSheet("bookOverlayWidth", bookOverlaySettings.width, "Book Overlay", "Book Overlay Width (%)"),
          saveSettingToSheet("bookOverlayHeight", bookOverlaySettings.height, "Book Overlay", "Book Overlay Height (%)"),
          saveSettingToSheet("bookOverlayTop", bookOverlaySettings.top, "Book Overlay", "Book Overlay Top (%)"),
          saveSettingToSheet("bookOverlayLeft", bookOverlaySettings.left, "Book Overlay", "Book Overlay Left (%)"),
          saveSettingToSheet("bookCoverScaleX", bookCoverScale.x, "Book Cover", "Book Cover Scale X (%)"),
          saveSettingToSheet("bookCoverScaleY", bookCoverScale.y, "Book Cover", "Book Cover Scale Y (%)"),
          saveSettingToSheet("bookCoverOffsetX", bookCoverOffset.x, "Book Cover", "Book Cover Offset X (%)"),
          saveSettingToSheet("bookCoverOffsetY", bookCoverOffset.y, "Book Cover", "Book Cover Offset Y (%)"),
        ];
      } else if (insetType === 'movie') {
        savePromises = [
          saveSettingToSheet("movieInsetTopPx", movieInsetTopPx, "Movie Insets", "Movie Top Inset (px)"),
          saveSettingToSheet("movieInsetRightPx", movieInsetRightPx, "Movie Insets", "Movie Right Inset (px)"),
          saveSettingToSheet("movieInsetBottomPx", movieInsetBottomPx, "Movie Insets", "Movie Bottom Inset (px)"),
          saveSettingToSheet("movieInsetLeftPx", movieInsetLeftPx, "Movie Insets", "Movie Left Inset (px)"),
          saveSettingToSheet("movieOverlayWidth", movieOverlaySettings.width, "Movie Overlay", "Movie Overlay Width (%)"),
          saveSettingToSheet("movieOverlayHeight", movieOverlaySettings.height, "Movie Overlay", "Movie Overlay Height (%)"),
          saveSettingToSheet("movieOverlayTop", movieOverlaySettings.top, "Movie Overlay", "Movie Overlay Top (%)"),
          saveSettingToSheet("movieOverlayLeft", movieOverlaySettings.left, "Movie Overlay", "Movie Overlay Left (%)"),
          saveSettingToSheet("movieCoverScaleX", movieCoverScale.x, "Movie Cover", "Movie Cover Scale X (%)"),
          saveSettingToSheet("movieCoverScaleY", movieCoverScale.y, "Movie Cover", "Movie Cover Scale Y (%)"),
          saveSettingToSheet("movieCoverOffsetX", movieCoverOffset.x, "Movie Cover", "Movie Cover Offset X (%)"),
          saveSettingToSheet("movieCoverOffsetY", movieCoverOffset.y, "Movie Cover", "Movie Cover Offset Y (%)"),
        ];
      } else if (insetType === 'game') {
        // Save only the currently selected platform's insets, overlay settings, and cover scale
        const platform = selectedPlatformKey;
        const insets = platformInsets[platform] || platformInsets["Default"] || { top: 5, right: 5, bottom: 5, left: 5 };
        const overlaySettings = platformOverlaySettings[platform] || platformOverlaySettings["Default"] || { width: 100, height: 100, top: 0, left: 0 };
        const coverScale = platformCoverScale[platform] || platformCoverScale["Default"] || { x: 100, y: 100 };
        const coverOffset = platformCoverOffset[platform] || platformCoverOffset["Default"] || { x: 0, y: 0 };
        
        savePromises = [
          saveSettingToSheet(`${platform}InsetTopPx`, insets.top, `${platform} Insets`, `${platform} Top Inset (px)`),
          saveSettingToSheet(`${platform}InsetRightPx`, insets.right, `${platform} Insets`, `${platform} Right Inset (px)`),
          saveSettingToSheet(`${platform}InsetBottomPx`, insets.bottom, `${platform} Insets`, `${platform} Bottom Inset (px)`),
          saveSettingToSheet(`${platform}InsetLeftPx`, insets.left, `${platform} Insets`, `${platform} Left Inset (px)`),
          saveSettingToSheet(`${platform}OverlayWidth`, overlaySettings.width, `${platform} Overlay`, `${platform} Overlay Width (%)`),
          saveSettingToSheet(`${platform}OverlayHeight`, overlaySettings.height, `${platform} Overlay`, `${platform} Overlay Height (%)`),
          saveSettingToSheet(`${platform}OverlayTop`, overlaySettings.top, `${platform} Overlay`, `${platform} Overlay Top (%)`),
          saveSettingToSheet(`${platform}OverlayLeft`, overlaySettings.left, `${platform} Overlay`, `${platform} Overlay Left (%)`),
          saveSettingToSheet(`${platform}CoverScaleX`, coverScale.x, `${platform} Cover`, `${platform} Cover Scale X (%)`),
          saveSettingToSheet(`${platform}CoverScaleY`, coverScale.y, `${platform} Cover`, `${platform} Cover Scale Y (%)`),
          saveSettingToSheet(`${platform}CoverOffsetX`, coverOffset.x, `${platform} Cover`, `${platform} Cover Offset X (%)`),
          saveSettingToSheet(`${platform}CoverOffsetY`, coverOffset.y, `${platform} Cover`, `${platform} Cover Offset Y (%)`),
        ];
      }

      // Run all saves in parallel instead of sequentially
      await Promise.all(savePromises);

      setSyncState("ok");
      setSyncMsg(`${insetType} insets saved!`);
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 2000);
      return true;
    } catch (e) {
      console.error(`Failed to save ${insetType} insets:`, e);
      setSyncState("error");
      setSyncMsg(`Failed to save ${insetType} insets`);
      return false;
    }
  };

  // Apply settings from spreadsheet on load
  useEffect(() => {
    if (settingsRows.length === 0) return;
    
    setPosterSizeTv(getSetting("posterSizeTv", 100));
    setPosterSizeMovies(getSetting("posterSizeMovies", 108));
    setPosterSizeBooks(getSetting("posterSizeBooks", 115));
    setBookHeightMultiplier(getSetting("bookHeightMultiplier", 1.5));
    setCoverGapSize(getSetting("coverGapSize", 24));
    setTight(getSetting("tight", true));
    
    setCaseInsetTopPx(getSetting("caseInsetTopPx", 156));
    setCaseInsetRightPx(getSetting("caseInsetRightPx", 121));
    setCaseInsetBottomPx(getSetting("caseInsetBottomPx", 136));
    setCaseInsetLeftPx(getSetting("caseInsetLeftPx", 74));
    setTvOverlaySettings({
      width: getSetting("tvOverlayWidth", DEFAULT_OVERLAY_SETTINGS.width),
      height: getSetting("tvOverlayHeight", DEFAULT_OVERLAY_SETTINGS.height),
      top: getSetting("tvOverlayTop", DEFAULT_OVERLAY_SETTINGS.top),
      left: getSetting("tvOverlayLeft", DEFAULT_OVERLAY_SETTINGS.left),
    });
    const tvLegacyCoverScale = getSetting("tvCoverScale", DEFAULT_COVER_SCALE.x);
    setTvCoverScale({
      x: getSetting("tvCoverScaleX", tvLegacyCoverScale),
      y: getSetting("tvCoverScaleY", tvLegacyCoverScale),
    });
    setTvCoverOffset({
      x: getSetting("tvCoverOffsetX", DEFAULT_COVER_OFFSET.x),
      y: getSetting("tvCoverOffsetY", DEFAULT_COVER_OFFSET.y),
    });
    
    setBookInsetTopPx(getSetting("bookInsetTopPx", 99));
    setBookInsetRightPx(getSetting("bookInsetRightPx", 75));
    setBookInsetBottomPx(getSetting("bookInsetBottomPx", 104));
    setBookInsetLeftPx(getSetting("bookInsetLeftPx", 62));
    setBookOverlaySettings({
      width: getSetting("bookOverlayWidth", DEFAULT_OVERLAY_SETTINGS.width),
      height: getSetting("bookOverlayHeight", DEFAULT_OVERLAY_SETTINGS.height),
      top: getSetting("bookOverlayTop", DEFAULT_OVERLAY_SETTINGS.top),
      left: getSetting("bookOverlayLeft", DEFAULT_OVERLAY_SETTINGS.left),
    });
    const bookLegacyCoverScale = getSetting("bookCoverScale", DEFAULT_COVER_SCALE.x);
    setBookCoverScale({
      x: getSetting("bookCoverScaleX", bookLegacyCoverScale),
      y: getSetting("bookCoverScaleY", bookLegacyCoverScale),
    });
    setBookCoverOffset({
      x: getSetting("bookCoverOffsetX", DEFAULT_COVER_OFFSET.x),
      y: getSetting("bookCoverOffsetY", DEFAULT_COVER_OFFSET.y),
    });
    
    setMovieInsetTopPx(getSetting("movieInsetTopPx", 156));
    setMovieInsetRightPx(getSetting("movieInsetRightPx", 100));
    setMovieInsetBottomPx(getSetting("movieInsetBottomPx", 136));
    setMovieInsetLeftPx(getSetting("movieInsetLeftPx", 120));
    setMovieOverlaySettings({
      width: getSetting("movieOverlayWidth", DEFAULT_OVERLAY_SETTINGS.width),
      height: getSetting("movieOverlayHeight", DEFAULT_OVERLAY_SETTINGS.height),
      top: getSetting("movieOverlayTop", DEFAULT_OVERLAY_SETTINGS.top),
      left: getSetting("movieOverlayLeft", DEFAULT_OVERLAY_SETTINGS.left),
    });
    const movieLegacyCoverScale = getSetting("movieCoverScale", DEFAULT_COVER_SCALE.x);
    setMovieCoverScale({
      x: getSetting("movieCoverScaleX", movieLegacyCoverScale),
      y: getSetting("movieCoverScaleY", movieLegacyCoverScale),
    });
    setMovieCoverOffset({
      x: getSetting("movieCoverOffsetX", DEFAULT_COVER_OFFSET.x),
      y: getSetting("movieCoverOffsetY", DEFAULT_COVER_OFFSET.y),
    });
    
    setPosterSizeGames(getSetting("posterSizeGames", 108));
    
    // Load platform insets from settings
    // We'll load all settings that match the pattern and dynamically populate
    const loadedPlatformInsets: Record<string, { top: number; right: number; bottom: number; left: number }> = {
      "Default": { 
        top: getSetting("DefaultInsetTopPx", 5),
        right: getSetting("DefaultInsetRightPx", 5),
        bottom: getSetting("DefaultInsetBottomPx", 5),
        left: getSetting("DefaultInsetLeftPx", 5),
      }
    };
    
    const loadedCustomizedPlatforms = new Set<string>();
    
    // Also prepare overlay settings structure
    const loadedPlatformOverlaySettings: Record<string, { width: number; height: number; top: number; left: number }> = {
      "Default": {
        width: getSetting("DefaultOverlayWidth", 100),
        height: getSetting("DefaultOverlayHeight", 100),
        top: getSetting("DefaultOverlayTop", 0),
        left: getSetting("DefaultOverlayLeft", 0),
      }
    };
    
    // Also prepare cover scale settings structure
    const defaultLegacyScale = getSetting("DefaultCoverScale", 100);
    const loadedPlatformCoverScale: Record<string, { x: number; y: number }> = {
      "Default": {
        x: getSetting("DefaultCoverScaleX", defaultLegacyScale),
        y: getSetting("DefaultCoverScaleY", defaultLegacyScale),
      },
    };
    
    const loadedPlatformCoverOffset: Record<string, { x: number; y: number }> = {
      "Default": {
        x: getSetting("DefaultCoverOffsetX", 0),
        y: getSetting("DefaultCoverOffsetY", 0),
      },
    };
    const nonGameInsetPrefixes = new Set(["case", "tv", "movie", "book"]);
    const nonGameOverlayPrefixes = new Set(["tv", "movie", "book"]);
    const nonGameCoverPrefixes = new Set(["tv", "movie", "book"]);
    
    // Load settings for any platforms found in settings
    settingsRows.forEach(row => {
      const key = safeStr(row["Key"]);
      const match = key.match(/^(.+)InsetTopPx$/);
      if (match && match[1] !== "Default" && !nonGameInsetPrefixes.has(match[1])) {
        const rawPlatform = match[1];
        const platform = canonicalizePlatformLabel(rawPlatform);
        loadedPlatformInsets[platform] = {
          top: getSetting(`${rawPlatform}InsetTopPx`, getSetting(`${platform}InsetTopPx`, 5)),
          right: getSetting(`${rawPlatform}InsetRightPx`, getSetting(`${platform}InsetRightPx`, 5)),
          bottom: getSetting(`${rawPlatform}InsetBottomPx`, getSetting(`${platform}InsetBottomPx`, 5)),
          left: getSetting(`${rawPlatform}InsetLeftPx`, getSetting(`${platform}InsetLeftPx`, 5)),
        };
        // Mark this platform as customized since it was saved in settings
        loadedCustomizedPlatforms.add(platform);
      }
      
      // Also check for overlay settings
      const overlayMatch = key.match(/^(.+)OverlayWidth$/);
      if (overlayMatch && overlayMatch[1] !== "Default" && !nonGameOverlayPrefixes.has(overlayMatch[1])) {
        const rawPlatform = overlayMatch[1];
        const platform = canonicalizePlatformLabel(rawPlatform);
        loadedPlatformOverlaySettings[platform] = {
          width: getSetting(`${rawPlatform}OverlayWidth`, getSetting(`${platform}OverlayWidth`, 100)),
          height: getSetting(`${rawPlatform}OverlayHeight`, getSetting(`${platform}OverlayHeight`, 100)),
          top: getSetting(`${rawPlatform}OverlayTop`, getSetting(`${platform}OverlayTop`, 0)),
          left: getSetting(`${rawPlatform}OverlayLeft`, getSetting(`${platform}OverlayLeft`, 0)),
        };
        loadedCustomizedPlatforms.add(platform);
      }
      
      // Also check for cover scale settings
      const coverScaleMatch = key.match(/^(.+)CoverScale(?:X|Y)?$/);
      if (coverScaleMatch && coverScaleMatch[1] !== "Default" && !nonGameCoverPrefixes.has(coverScaleMatch[1])) {
        const rawPlatform = coverScaleMatch[1];
        const platform = canonicalizePlatformLabel(rawPlatform);
        const legacyScale = getSetting(`${rawPlatform}CoverScale`, getSetting(`${platform}CoverScale`, 100));
        loadedPlatformCoverScale[platform] = {
          x: getSetting(`${rawPlatform}CoverScaleX`, getSetting(`${platform}CoverScaleX`, legacyScale)),
          y: getSetting(`${rawPlatform}CoverScaleY`, getSetting(`${platform}CoverScaleY`, legacyScale)),
        };
        loadedCustomizedPlatforms.add(platform);
      }
      
      const coverOffsetMatch = key.match(/^(.+)CoverOffsetX$/);
      if (coverOffsetMatch && coverOffsetMatch[1] !== "Default" && !nonGameCoverPrefixes.has(coverOffsetMatch[1])) {
        const rawPlatform = coverOffsetMatch[1];
        const platform = canonicalizePlatformLabel(rawPlatform);
        loadedPlatformCoverOffset[platform] = {
          x: getSetting(`${rawPlatform}CoverOffsetX`, getSetting(`${platform}CoverOffsetX`, 0)),
          y: getSetting(`${rawPlatform}CoverOffsetY`, getSetting(`${platform}CoverOffsetY`, 0)),
        };
        loadedCustomizedPlatforms.add(platform);
      }
    });
    
    setPlatformInsets(loadedPlatformInsets);
    setPlatformOverlaySettings(loadedPlatformOverlaySettings);
    setPlatformCoverScale(loadedPlatformCoverScale);
    setPlatformCoverOffset(loadedPlatformCoverOffset);
    setCustomizedPlatforms(loadedCustomizedPlatforms);
    
    setLogoSize(getSetting("logoSize", 230));
    setLogoTop(getSetting("logoTop", 12));
    setLogoLeft(getSetting("logoLeft", -28));
    
    setSyncIconSize(getSetting("syncIconSize", 12));
    setSyncIconTop(getSetting("syncIconTop", 8));
    setStatusIconScale(getSetting("statusIconScale", 100));
    setStatusIconOffsetX(getSetting("statusIconOffsetX", 0));
    setStatusIconOffsetY(getSetting("statusIconOffsetY", 0));
    
    setIconSize(getSetting("iconSize", 16));
    
    setSidebarFontSize(getSetting("sidebarFontSize", 11));
    setSidebarFontWeight(getSetting("sidebarFontWeight", "400"));
    setSidebarGap(getSetting("sidebarGap", 8));
    setSidebarHeaderFontSize(getSetting("sidebarHeaderFontSize", 11));
    setSidebarHeaderFontWeight(getSetting("sidebarHeaderFontWeight", "600"));
    
    setCounterTileSize(getSetting("counterTileSize", 44));
    setCounterTileSpacing(getSetting("counterTileSpacing", 3));
    setCounterNumberFontSize(getSetting("counterNumberFontSize", 22));
    setCounterLabelFontSize(getSetting("counterLabelFontSize", 16));
    setCounterLabelFontWeight(getSetting("counterLabelFontWeight", "600"));
    setCounterLabelTop(getSetting("counterLabelTop", 0));
    setCounterLabelLeft(getSetting("counterLabelLeft", 0));
    setCounterTop(getSetting("counterTop", 0));
    setCounterLeft(getSetting("counterLeft", 0));
    setShowStatusIndicators(getSetting("showStatusIndicators", false));

    const loadedSmartLists = parseSmartListsSetting(getSetting(SMART_LISTS_SETTING_KEY, "[]"));
    setCustomSmartLists(loadedSmartLists);

    const loadedSmartListManualOrders: Record<string, string[]> = {};
    settingsRows.forEach((row) => {
      const key = safeStr(row["Key"]);
      if (!key.startsWith(SMART_LIST_MANUAL_ORDER_SETTING_PREFIX)) return;
      const listId = safeStr(key.slice(SMART_LIST_MANUAL_ORDER_SETTING_PREFIX.length));
      if (!listId) return;
      const parsed = parseStringArraySetting(getSetting(key, safeStr(row["Value"])));
      if (!parsed.length) return;
      loadedSmartListManualOrders[listId] = parsed;
    });

    const settingsCache = settingsCacheRef.current;
    if (settingsCache && typeof settingsCache === "object") {
      Object.entries(settingsCache).forEach(([key, value]) => {
        if (!key.startsWith(SMART_LIST_MANUAL_ORDER_SETTING_PREFIX)) return;
        const listId = safeStr(key.slice(SMART_LIST_MANUAL_ORDER_SETTING_PREFIX.length));
        if (!listId || loadedSmartListManualOrders[listId]) return;
        const parsed = parseStringArraySetting(value);
        if (!parsed.length) return;
        loadedSmartListManualOrders[listId] = parsed;
      });
    }
    setSmartListManualOrderKeysById(loadedSmartListManualOrders);
    
    setSidebarTheme(getSetting("sidebarTheme", "darkBlue"));
    setShelfTheme(normalizeShelfTheme(getSetting("shelfTheme", DEFAULT_SHELF_IMAGE)));
  }, [getSetting, settingsRows]);

  const persistSmartLists = useCallback(
    (nextLists: SmartList[]) => {
      setCustomSmartLists(nextLists);
      saveSetting(
        SMART_LISTS_SETTING_KEY,
        JSON.stringify(nextLists),
        "Smart Lists",
        "Custom smart list definitions"
      );
    },
    [saveSetting]
  );

  const handleOpenSmartListBuilder = useCallback(() => {
    setSortPopupOpen(false);
    setSettingsPopupOpen(false);
    setShowVersionNotes(false);
    setSmartListBuilderError(null);
    const defaultDraft = createDefaultSmartListDraft();
    setSmartListDraft(defaultDraft);
    smartListNameInputRef.current = defaultDraft.name;
    setSmartListTagQuery("");
    setSmartListBuilderOpen(true);
  }, []);

  const handleToggleSmartListMediaType = useCallback((mediaType: SmartListMediaType) => {
    setSmartListDraft((prev) => {
      const hasType = prev.mediaTypes.includes(mediaType);
      const mediaTypes = hasType
        ? prev.mediaTypes.filter((entry) => entry !== mediaType)
        : [...prev.mediaTypes, mediaType];

      const nextStatuses = { ...prev.statuses };
      const nextYearFilters = { ...prev.yearFilters };
      if (!mediaTypes.includes(mediaType)) {
        delete nextStatuses[mediaType];
        delete nextYearFilters[mediaType];
      }

      return {
        ...prev,
        mediaTypes,
        statuses: nextStatuses,
        yearFilters: nextYearFilters,
      };
    });
  }, []);

  const handleToggleSmartListStatus = useCallback((mediaType: SmartListMediaType, statusToken: string) => {
    const normalizedStatus = normalizeStatusToken(statusToken);
    if (!normalizedStatus) return;

    setSmartListDraft((prev) => {
      const current = prev.statuses[mediaType] || [];
      const hasStatus = current.includes(normalizedStatus);
      const nextValues = hasStatus
        ? current.filter((entry) => entry !== normalizedStatus)
        : [...current, normalizedStatus];
      const nextStatuses = { ...prev.statuses };
      if (nextValues.length) {
        nextStatuses[mediaType] = nextValues;
      } else {
        delete nextStatuses[mediaType];
      }
      return { ...prev, statuses: nextStatuses };
    });
  }, []);

  const handleToggleSmartListTag = useCallback((tagToken: string) => {
    const normalizedTag = normalizeTagToken(tagToken);
    if (!normalizedTag) return;
    setSmartListDraft((prev) => {
      const current = prev.tags || [];
      const hasTag = current.includes(normalizedTag);
      const tags = hasTag
        ? current.filter((entry) => entry !== normalizedTag)
        : [...current, normalizedTag].sort((a, b) => a.localeCompare(b));
      return { ...prev, tags };
    });
  }, []);

  const handleSetSmartListYearValues = useCallback(
    (mediaType: SmartListMediaType, sourceKey: SmartListYearSourceKey, values: string[]) => {
      const normalizedValues = sortYearValues(Array.from(new Set(values.map((value) => getYearToken(value)).filter(Boolean))));

      setSmartListDraft((prev) => {
        const nextYearFilters = { ...prev.yearFilters };
        const currentMediaFilters: SmartListYearFilters = { ...(nextYearFilters[mediaType] || {}) };
        if (normalizedValues.length) {
          currentMediaFilters[sourceKey] = normalizedValues;
        } else {
          delete currentMediaFilters[sourceKey];
        }

        if (Object.keys(currentMediaFilters).length) {
          nextYearFilters[mediaType] = currentMediaFilters;
        } else {
          delete nextYearFilters[mediaType];
        }

        return { ...prev, yearFilters: nextYearFilters };
      });
    },
    []
  );

  const handleToggleSmartListYearValue = useCallback(
    (mediaType: SmartListMediaType, sourceKey: SmartListYearSourceKey, value: string) => {
      const year = getYearToken(value);
      if (!year) return;
      setSmartListDraft((prev) => {
        const nextYearFilters = { ...prev.yearFilters };
        const currentMediaFilters: SmartListYearFilters = { ...(nextYearFilters[mediaType] || {}) };
        const currentValues = currentMediaFilters[sourceKey] || [];
        const hasYear = currentValues.includes(year);
        const nextValues = hasYear
          ? currentValues.filter((entry) => entry !== year)
          : sortYearValues([...currentValues, year]);

        if (nextValues.length) {
          currentMediaFilters[sourceKey] = nextValues;
        } else {
          delete currentMediaFilters[sourceKey];
        }

        if (Object.keys(currentMediaFilters).length) {
          nextYearFilters[mediaType] = currentMediaFilters;
        } else {
          delete nextYearFilters[mediaType];
        }

        return { ...prev, yearFilters: nextYearFilters };
      });
    },
    []
  );

  const handleCreateSmartList = useCallback(() => {
    const name = safeStr(smartListNameInputRef.current || smartListDraft.name);
    if (!name) {
      setSmartListBuilderError("Please enter a smart list name.");
      return;
    }
    if (!smartListDraft.mediaTypes.length) {
      setSmartListBuilderError("Choose at least one media type.");
      return;
    }

    const listId = `smart-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const mediaTypes = Array.from(new Set(smartListDraft.mediaTypes));
    const statuses: Partial<Record<SmartListMediaType, string[]>> = {};
    const yearFilters: SmartListYearFiltersByMedia = {};
    const tags = Array.from(
      new Set((smartListDraft.tags || []).map((tag) => normalizeTagToken(tag)).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
    mediaTypes.forEach((mediaType) => {
      const values = (smartListDraft.statuses[mediaType] || [])
        .map((status) => normalizeStatusToken(status))
        .filter(Boolean);
      if (!values.length) return;
      statuses[mediaType] = Array.from(new Set(values));
    });
    mediaTypes.forEach((mediaType) => {
      const sourceMap = smartListDraft.yearFilters[mediaType];
      if (!sourceMap || typeof sourceMap !== "object") return;
      const normalizedSourceMap: SmartListYearFilters = {};
      Object.entries(sourceMap).forEach(([sourceKeyRaw, years]) => {
        const sourceKey = sourceKeyRaw as SmartListYearSourceKey;
        if (!SMART_LIST_YEAR_SOURCE_KEYS.has(sourceKey)) return;
        const normalizedYears = normalizeYearSelection(years);
        if (!normalizedYears.length) return;
        normalizedSourceMap[sourceKey] = normalizedYears;
      });
      if (!Object.keys(normalizedSourceMap).length) return;
      yearFilters[mediaType] = normalizedSourceMap;
    });

    const allowManualSort = Boolean(smartListDraft.allowManualSort);
    const defaultSortField =
      allowManualSort && smartListDraft.defaultSortField === MANUAL_SORT_FIELD
        ? MANUAL_SORT_FIELD
        : smartListDraft.defaultSortField === MANUAL_SORT_FIELD
          ? "ReleaseDate"
          : smartListDraft.defaultSortField;

    const nextList: SmartList = {
      id: listId,
      name,
      mediaTypes,
      statuses,
      yearFilters,
      tags,
      icon: safeStr(smartListDraft.icon),
      defaultSortField: SMART_LIST_ALLOWED_SORT_FIELDS.has(defaultSortField) ? defaultSortField : "ReleaseDate",
      defaultSortOrder: smartListDraft.defaultSortOrder === "Asc" ? "Asc" : "Desc",
      allowManualSort,
    };

    persistSmartLists([...customSmartLists, nextList]);
    setSmartListBuilderOpen(false);
    setSmartListBuilderError(null);
    setSmartListTagQuery("");
    setSmartListDraft(createDefaultSmartListDraft());
    smartListNameInputRef.current = "";
    setSelectedSmartListId(nextList.id);
    setNav("smart-custom");
    setSortField(nextList.defaultSortField);
    setSortOrder(nextList.defaultSortOrder);
  }, [customSmartLists, persistSmartLists, smartListDraft]);

  const handleDeleteSmartList = useCallback(
    (listId: string) => {
      const listToDelete = customSmartLists.find((list) => list.id === listId);
      if (!listToDelete) return;
      const confirmed =
        typeof window === "undefined"
          ? true
          : window.confirm(`Delete smart list "${listToDelete.name}"?`);
      if (!confirmed) return;
      const nextLists = customSmartLists.filter((list) => list.id !== listId);
      persistSmartLists(nextLists);
      setSmartListManualOrderKeysById((prev) => {
        const next = { ...prev };
        delete next[listId];
        return next;
      });
      removeSetting(`${SMART_LIST_MANUAL_ORDER_SETTING_PREFIX}${listId}`);
      saveSetting(
        `${SMART_LIST_MANUAL_ORDER_SETTING_PREFIX}${listId}`,
        "",
        "Smart Lists",
        `Manual order keys for smart list ${listId}`
      );
      if (selectedSmartListId === listId) {
        setSelectedSmartListId(null);
        if (nav === "smart-custom") {
          setNav("home");
          setSortField("ReleaseDate");
          setSortOrder("Desc");
        }
      }
      setSyncState("ok");
      setSyncMsg(`Removed smart list: ${listToDelete.name}`);
      setLastSyncAt(Date.now());
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 1200);
    },
    [customSmartLists, nav, persistSmartLists, removeSetting, saveSetting, selectedSmartListId]
  );

  useEffect(() => {
    if (!selectedSmartListId) return;
    if (customSmartLists.some((list) => list.id === selectedSmartListId)) return;
    setSelectedSmartListId(null);
    if (nav === "smart-custom") {
      setNav("home");
      setSortField("ReleaseDate");
      setSortOrder("Desc");
    }
  }, [customSmartLists, nav, selectedSmartListId]);

  useEffect(() => {
    if (
      nav !== "wishlist" &&
      nav !== "play-next" &&
      nav !== "wishlist-books" &&
      nav !== "watchlist-movies" &&
      nav !== "watchlist-tv"
    ) {
      return;
    }

    let sortFieldSettingKey = "";
    let sortOrderSettingKey = "";
    let manualSettingKey = "";
    let fallbackSortField = "ReleaseDate";
    let fallbackSortOrder: "Asc" | "Desc" = "Desc";

    if (nav === "wishlist") {
      sortFieldSettingKey = WISHLIST_SORT_FIELD_SETTING_KEY;
      sortOrderSettingKey = WISHLIST_SORT_ORDER_SETTING_KEY;
      manualSettingKey = WISHLIST_MANUAL_ORDER_SETTING_KEY;
    } else if (nav === "wishlist-books") {
      sortFieldSettingKey = READ_NEXT_SORT_FIELD_SETTING_KEY;
      sortOrderSettingKey = READ_NEXT_SORT_ORDER_SETTING_KEY;
      manualSettingKey = READ_NEXT_MANUAL_ORDER_SETTING_KEY;
    } else if (nav === "play-next") {
      sortFieldSettingKey = PLAY_NEXT_SORT_FIELD_SETTING_KEY;
      sortOrderSettingKey = PLAY_NEXT_SORT_ORDER_SETTING_KEY;
      manualSettingKey = PLAY_NEXT_MANUAL_ORDER_SETTING_KEY;
      fallbackSortField = MANUAL_SORT_FIELD;
      fallbackSortOrder = "Asc";
    } else if (nav === "watchlist-movies") {
      sortFieldSettingKey = WATCHLIST_MOVIES_SORT_FIELD_SETTING_KEY;
      sortOrderSettingKey = WATCHLIST_MOVIES_SORT_ORDER_SETTING_KEY;
      manualSettingKey = WATCHLIST_MOVIES_MANUAL_ORDER_SETTING_KEY;
      fallbackSortField = MANUAL_SORT_FIELD;
      fallbackSortOrder = "Asc";
    } else if (nav === "watchlist-tv") {
      sortFieldSettingKey = WATCHLIST_TV_SORT_FIELD_SETTING_KEY;
      sortOrderSettingKey = WATCHLIST_TV_SORT_ORDER_SETTING_KEY;
      manualSettingKey = WATCHLIST_TV_MANUAL_ORDER_SETTING_KEY;
      fallbackSortField = MANUAL_SORT_FIELD;
      fallbackSortOrder = "Asc";
    }

    const savedSortFieldRaw = sortFieldSettingKey
      ? safeStr(getSetting(sortFieldSettingKey, fallbackSortField))
      : fallbackSortField;
    const normalizedSortField = savedSortFieldRaw || fallbackSortField;
    const savedSortOrderRaw = sortOrderSettingKey
      ? safeStr(getSetting(sortOrderSettingKey, fallbackSortOrder))
      : fallbackSortOrder;
    const normalizedSortOrder: "Asc" | "Desc" = savedSortOrderRaw === "Asc" ? "Asc" : "Desc";

    setSortField(normalizedSortField);
    setSortOrder(normalizedSortOrder);

    if (!manualSettingKey) return;

    const savedManualOrderRaw = safeStr(getSetting(manualSettingKey, ""));

    if (!savedManualOrderRaw) return;
    try {
      const parsed = JSON.parse(savedManualOrderRaw);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .map((entry) => safeStr(entry))
          .filter(Boolean);
        if (nav === "play-next") {
          setPlayNextManualOrderKeys(normalized);
        } else if (nav === "wishlist-books") {
          setReadNextManualOrderKeys(normalized);
        } else if (nav === "watchlist-movies") {
          setWatchlistMoviesManualOrderKeys(normalized);
        } else if (nav === "watchlist-tv") {
          setWatchlistTvManualOrderKeys(normalized);
        } else {
          setWishlistManualOrderKeys(normalized);
        }
      }
    } catch (error) {
      const label =
        nav === "play-next"
          ? "play-next"
          : nav === "wishlist-books"
            ? "wishlist-books"
          : nav === "watchlist-movies"
            ? "watchlist-movies"
            : nav === "watchlist-tv"
              ? "watchlist-tv"
              : "wishlist";
      console.warn(`Failed to parse ${label} manual order setting:`, error);
    }
  }, [getSetting, nav]);

  useEffect(() => {
    if (nav !== "watchlist-tv") return;
    setWatchlistTvSectionFilter("watching");
  }, [nav]);

  useEffect(() => {
    const smartListSupportsManualSort = nav === "smart-custom" && Boolean(activeSmartList?.allowManualSort);
    if (
      nav === "wishlist" ||
      nav === "wishlist-books" ||
      nav === "play-next" ||
      nav === "watchlist-movies" ||
      nav === "watchlist-tv" ||
      smartListSupportsManualSort
    ) {
      return;
    }
    setDraggingWishlistKey(null);
    setWishlistPointerDrag(null);
    setWishlistDragHoverKey(null);
    wishlistPointerDragRef.current = null;
    wishlistDragHoverTargetRef.current = null;
    wishlistDragVisualPendingRef.current = null;
    wishlistDragLatestOrderRef.current = null;
    if (wishlistDragVisualRafRef.current !== null) {
      window.cancelAnimationFrame(wishlistDragVisualRafRef.current);
      wishlistDragVisualRafRef.current = null;
    }
    suppressCaseClickRef.current = false;
    if (sortField === MANUAL_SORT_FIELD) {
      setSortField("ReleaseDate");
    }
  }, [activeSmartList?.allowManualSort, nav, sortField]);

  // Function to save all current settings to spreadsheet
  const saveAllSettings = async () => {
    if (!settingsWriteUrl) {
      alert("No settings write URL configured");
      return;
    }
    
    setSyncState("saving");
    setSyncMsg("Saving settings...");
    
    // Safety timeout: if save takes more than 5 minutes, force completion
    const safetyTimeoutId = setTimeout(() => {
      console.warn("Save operation timed out after 5 minutes");
      setSyncState("error");
      setSyncMsg("Save timeout");
    }, 5 * 60 * 1000);
    
    // Build settings array WITHOUT cover insets or platform insets
    // Cover insets and platform insets auto-save individually when changed via saveSetting()
    const settings: any[] = [
      { key: "posterSizeTv", value: posterSizeTv, category: "Cover Sizes", description: "TV Show Cover Size" },
      { key: "posterSizeMovies", value: posterSizeMovies, category: "Cover Sizes", description: "Movie Cover Size" },
      { key: "posterSizeBooks", value: posterSizeBooks, category: "Cover Sizes", description: "Book Cover Size" },
      { key: "posterSizeGames", value: posterSizeGames, category: "Cover Sizes", description: "Game Cover Size" },
      { key: "bookHeightMultiplier", value: bookHeightMultiplier, category: "Cover Sizes", description: "Book Height Multiplier" },
      { key: "coverGapSize", value: coverGapSize, category: "Cover Sizes", description: "Cover Gap Size (px)" },
      { key: "tight", value: tight, category: "Cover Sizes", description: "Tight spacing between items" },
      { key: "logoSize", value: logoSize, category: "Logo Settings", description: "Logo Size (px)" },
      { key: "logoTop", value: logoTop, category: "Logo Settings", description: "Logo Top Position" },
      { key: "logoLeft", value: logoLeft, category: "Logo Settings", description: "Logo Left Position" },
      { key: "syncIconSize", value: syncIconSize, category: "Sync Icon", description: "Sync Icon Size (px)" },
      { key: "syncIconTop", value: syncIconTop, category: "Sync Icon", description: "Sync Icon Top Position" },
      { key: "statusIconScale", value: statusIconScale, category: "Status Icon", description: "Status Icon Size (%)" },
      { key: "statusIconOffsetX", value: statusIconOffsetX, category: "Status Icon", description: "Status Icon Horizontal Offset (px)" },
      { key: "statusIconOffsetY", value: statusIconOffsetY, category: "Status Icon", description: "Status Icon Vertical Offset (px)" },
      { key: "iconSize", value: iconSize, category: "Icons", description: "Sidebar Icon Size (px)" },
      { key: "sidebarFontSize", value: sidebarFontSize, category: "Sidebar", description: "Sidebar Font Size" },
      { key: "sidebarFontWeight", value: sidebarFontWeight, category: "Sidebar", description: "Sidebar Font Weight" },
      { key: "sidebarGap", value: sidebarGap, category: "Sidebar", description: "Sidebar Icon Gap" },
      { key: "sidebarHeaderFontSize", value: sidebarHeaderFontSize, category: "Sidebar", description: "Sidebar Header Font Size" },
      { key: "sidebarHeaderFontWeight", value: sidebarHeaderFontWeight, category: "Sidebar", description: "Sidebar Header Font Weight" },
      { key: "sidebarTheme", value: sidebarTheme, category: "Themes", description: "Sidebar Theme" },
      { key: "shelfTheme", value: shelfTheme, category: "Themes", description: "Shelf Wood Type" },
      { key: "showInsetGuide", value: showInsetGuide, category: "Cover Sizes", description: "Show inset frame guide" },
      { key: "showStatusIndicators", value: showStatusIndicators, category: "Display", description: "Show status indicator dots on covers" },
    ];
    
    try {
      let sentCount = 0;
      const failedKeys: string[] = [];
      const valuesMatch = (expectedRaw: unknown, actualRaw: unknown) => {
        const expected = String(expectedRaw ?? "").trim();
        const actual = String(actualRaw ?? "").trim();
        if (expected === actual) return true;
        const expectedBool = expected.toLowerCase();
        const actualBool = actual.toLowerCase();
        if ((expectedBool === "true" || expectedBool === "false") && (actualBool === "true" || actualBool === "false" || actualBool === "")) {
          const normalizedActualBool = actualBool === "" ? "false" : actualBool;
          return expectedBool === normalizedActualBool;
        }
        const expectedNum = Number(expected);
        const actualNum = Number(actual);
        if (!Number.isNaN(expectedNum) && !Number.isNaN(actualNum)) {
          return Math.abs(expectedNum - actualNum) < 1e-9;
        }
        return false;
      };
      // Send settings sequentially (one at a time) so they arrive in order on the sheet
      for (const setting of settings) {
        // Skip any settings containing "#REF!" error
        const valueStr = String(setting.value);
        if (valueStr.includes("#REF!")) {
          console.log(`Skipping: ${setting.key} (contains #REF! error)`);
          continue;
        }
        
        // Log each setting being sent for debugging
        console.log(`Sending: ${setting.key} = ${setting.value}`);
        try {
          await postSheetWrite(
            settingsWriteUrl,
            { ...setting, value: valueStr },
            `Failed to save setting: ${setting.key}`
          );
          sentCount++;
        } catch (fetchError) {
          console.warn(`Failed to send ${setting.key}, continuing:`, fetchError);
          failedKeys.push(setting.key);
          // Continue with next setting even if one fails
        }
      }
      
      console.log(`Sent ${sentCount}/${settings.length} settings to Google Sheet`);

      const verificationFailedKeys: string[] = [];
      if (settingsCsvUrl && sentCount > 0) {
        try {
          // Give the Apps Script write endpoint a moment to commit before read-back verification.
          await new Promise((resolve) => setTimeout(resolve, 900));
          const verifyRes = await fetch(settingsCsvUrl, { cache: "no-store" });
          if (!verifyRes.ok) {
            throw new Error(`Settings verify fetch failed: ${verifyRes.status}`);
          }
          const verifyCsv = await verifyRes.text();
          const parsedVerify = Papa.parse<Row>(verifyCsv, { header: true, skipEmptyLines: true });
          const verifyRows = (parsedVerify.data || []).map((r) => r as Row);
          const settingsMap = new Map<string, string>();
          for (const row of verifyRows) {
            const key = safeStr(row["Key"]).toLowerCase();
            if (!key) continue;
            settingsMap.set(key, safeStr(row["Value"]));
          }
          for (const setting of settings) {
            if (failedKeys.includes(setting.key)) continue;
            const actual = settingsMap.get(String(setting.key).toLowerCase());
            if (!valuesMatch(setting.value, actual)) {
              verificationFailedKeys.push(setting.key);
            }
          }
        } catch (verifyError) {
          console.warn("Settings save verification failed:", verifyError);
          verificationFailedKeys.push("verification");
        }
      }
      
      clearTimeout(safetyTimeoutId);
      const combinedFailedKeys = [...failedKeys, ...verificationFailedKeys];
      if (combinedFailedKeys.length > 0) {
        setSyncState("error");
        setSyncMsg(`Save completed with errors (${sentCount}/${settings.length})`);
        alert(
          `Save completed with errors.\nSaved ${sentCount}/${settings.length} settings.\nFailed: ${combinedFailedKeys.join(", ")}`
        );
      } else {
        setSyncState("ok");
        setSyncMsg(`All settings saved (${sentCount}/${settings.length})`);
        setLastSyncAt(Date.now());
        setTimeout(() => {
          setSyncMsg("Synced");
        }, 2000);
        alert(`All settings saved successfully (${sentCount}/${settings.length}).`);
      }
    } catch (e) {
      console.error("Failed to save settings:", e);
      clearTimeout(safetyTimeoutId);
      setSyncState("error");
      setSyncMsg("Save failed");
      alert("Save failed. Check sync status and console logs.");
    }
  };

  // Load settings from Google Sheet
  const loadSettingsFromSheet = async () => {
    if (!settingsCsvUrl) {
      alert("No settings sheet configured");
      return;
    }

    setSyncState("saving");
    setSyncMsg("Loading settings...");

    try {
      const res = await fetch(settingsCsvUrl, { cache: "no-store" });
      if (!res.ok) throw new Error(`Failed to fetch settings: ${res.status}`);
      
      const csv = await res.text();
      const parsed = Papa.parse<Row>(csv, { header: true, skipEmptyLines: true });
      const newSettings = (parsed.data || []).map((r) => r as Row);
      
      // Update settingsRows first
      setSettingsRows(newSettings);
      
      // Create a Map for O(1) lookups instead of repeated .find() calls
      const settingsMap = new Map(newSettings.map(r => [r["Key"], r["Value"]]));
      
      // Helper to get setting value with type conversion
      const getNum = (key: string, defaultValue: number) => {
        const val = settingsMap.get(key);
        return val ? Number(val) : defaultValue;
      };
      const getStr = (key: string, defaultValue: string) => settingsMap.get(key) || defaultValue;
      const getBool = (key: string, defaultValue: boolean) => settingsMap.get(key) === "true" ? true : settingsMap.get(key) === "false" ? false : defaultValue;
      
      // Then reload all state variables with a small delay to ensure settingsRows is updated
      setTimeout(() => {
        setPosterSizeTv(getNum("posterSizeTv", 100));
        setPosterSizeMovies(getNum("posterSizeMovies", 108));
        setPosterSizeBooks(getNum("posterSizeBooks", 115));
        setBookHeightMultiplier(getNum("bookHeightMultiplier", 1.5));
        setCoverGapSize(getNum("coverGapSize", 24));
        setTight(getBool("tight", true));
        
        setCaseInsetTopPx(getNum("caseInsetTopPx", 156));
        setCaseInsetRightPx(getNum("caseInsetRightPx", 121));
        setCaseInsetBottomPx(getNum("caseInsetBottomPx", 136));
        setCaseInsetLeftPx(getNum("caseInsetLeftPx", 74));
        
        setBookInsetTopPx(getNum("bookInsetTopPx", 99));
        setBookInsetRightPx(getNum("bookInsetRightPx", 75));
        setBookInsetBottomPx(getNum("bookInsetBottomPx", 104));
        setBookInsetLeftPx(getNum("bookInsetLeftPx", 62));
        
        setMovieInsetTopPx(getNum("movieInsetTopPx", 156));
        setMovieInsetRightPx(getNum("movieInsetRightPx", 100));
        setMovieInsetBottomPx(getNum("movieInsetBottomPx", 136));
        setMovieInsetLeftPx(getNum("movieInsetLeftPx", 120));
        
        setPosterSizeGames(getNum("posterSizeGames", 108));
        
        setLogoSize(getNum("logoSize", 230));
        setLogoTop(getNum("logoTop", 12));
        setLogoLeft(getNum("logoLeft", -28));
        
        setSyncIconSize(getNum("syncIconSize", 12));
        setSyncIconTop(getNum("syncIconTop", 8));
        setStatusIconScale(getNum("statusIconScale", 100));
        setStatusIconOffsetX(getNum("statusIconOffsetX", 0));
        setStatusIconOffsetY(getNum("statusIconOffsetY", 0));
        
        setIconSize(getNum("iconSize", 16));
        setSidebarFontSize(getNum("sidebarFontSize", 11));
        setSidebarFontWeight(getStr("sidebarFontWeight", "400"));
        setSidebarGap(getNum("sidebarGap", 8));
        setSidebarHeaderFontSize(getNum("sidebarHeaderFontSize", 11));
        setSidebarHeaderFontWeight(getStr("sidebarHeaderFontWeight", "600"));
        setShelfTheme(normalizeShelfTheme(getStr("shelfTheme", DEFAULT_SHELF_IMAGE)));
        setSidebarTheme(getStr("sidebarTheme", "darkBlue"));
        setShowStatusIndicators(getBool("showStatusIndicators", false));
      }, 100);
      
      setSyncState("ok");
      setSyncMsg("Settings loaded!");
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 2000);
    } catch (e) {
      console.error("Failed to load settings:", e);
      setSyncState("error");
      setSyncMsg("Load failed");
    }
  };

  // ============================================================================
  // HOW TO ADD NEW SETTINGS IN THE FUTURE:
  // ============================================================================
  // 
  // All settings automatically get localStorage caching and persistence by
  // following this pattern. Do NOT hardcode defaults - use getSetting() instead.
  //
  // Step 1: Add state variable at the top of the component
  //   const [newSetting, setNewSetting] = useState<number>(0);
  //
  // Step 2: Add to the useEffect that loads settings (around line 575)
  //   setNewSetting(getSetting("newSetting", 100)); // default value
  //
  // Step 3: Create an update function (follow the pattern below)
  //   const updateNewSetting = (value: number) => {
  //     setNewSetting(value);
  //     saveSetting("newSetting", value, "Category Name", "Human readable description");
  //   };
  //
  // Step 4: Add to saveAllSettings() array (around line 640)
  //   { key: "newSetting", value: newSetting, category: "Category Name", description: "..." },
  //
  // That's it! Your new setting will now:
  // - Save to Google Sheet automatically
  // - Cache to localStorage as backup
  // - Persist across page refreshes
  // - Show up in the console logs for debugging
  //
  // ============================================================================

  // Wrapper functions that update state AND save to spreadsheet
  // Each follows the pattern: setState() then saveSetting()
  // This ensures immediate UI update + background persistence
  const updatePosterSizeTv = (value: number) => {
    setPosterSizeTv(value);
    saveSetting("posterSizeTv", value, "Cover Sizes", "TV Show Cover Size");
  };
  const updatePosterSizeMovies = (value: number) => {
    setPosterSizeMovies(value);
    saveSetting("posterSizeMovies", value, "Cover Sizes", "Movie Cover Size");
  };
  const updatePosterSizeBooks = (value: number) => {
    setPosterSizeBooks(value);
    saveSetting("posterSizeBooks", value, "Cover Sizes", "Book Cover Size");
  };
  const updateTight = (value: boolean) => {
    setTight(value);
    saveSetting("tight", value, "Spacing", "Tight spacing between items");
  };
  const updateShowInsetGuide = (value: boolean) => {
    setShowInsetGuide(value);
    saveSetting("showInsetGuide", value, "Cover Sizes", "Show inset frame guide");
  };
  const updateCoverGapSize = (value: number) => {
    const next = Math.max(0, Math.min(60, Math.round(value)));
    setCoverGapSize(next);
    saveSetting("coverGapSize", next, "Cover Sizes", "Cover Gap Size (px)");
  };
  const updateShowStatusIndicators = (value: boolean) => {
    setShowStatusIndicators(value);
    saveSetting("showStatusIndicators", value, "Display", "Show status indicator dots on covers");
  };
  
  // Update UI immediately; debounce only persistence so controls remain responsive.
  const debouncedUpdate = useCallback((key: string, value: number, setter: (v: number) => void, category: string, description: string) => {
    // Apply the visual/state update immediately.
    setter(value);

    // Debounce local persistence for this specific key.
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    debounceTimers.current[key] = setTimeout(() => {
      saveSetting(key, value, category, description);
      delete debounceTimers.current[key];
    }, 150);
  }, [saveSetting]);
  
  const updateCaseInsetTopPx = useCallback((value: number) => {
    debouncedUpdate("caseInsetTopPx", value, setCaseInsetTopPx, "TV Insets", "TV Case Top Inset (px)");
  }, [debouncedUpdate]);
  const updateCaseInsetRightPx = useCallback((value: number) => {
    debouncedUpdate("caseInsetRightPx", value, setCaseInsetRightPx, "TV Insets", "TV Case Right Inset (px)");
  }, [debouncedUpdate]);
  const updateCaseInsetBottomPx = useCallback((value: number) => {
    debouncedUpdate("caseInsetBottomPx", value, setCaseInsetBottomPx, "TV Insets", "TV Case Bottom Inset (px)");
  }, [debouncedUpdate]);
  const updateCaseInsetLeftPx = useCallback((value: number) => {
    debouncedUpdate("caseInsetLeftPx", value, setCaseInsetLeftPx, "TV Insets", "TV Case Left Inset (px)");
  }, [debouncedUpdate]);
  const updateBookInsetTopPx = useCallback((value: number) => {
    debouncedUpdate("bookInsetTopPx", value, setBookInsetTopPx, "Book Insets", "Book Top Inset (px)");
  }, [debouncedUpdate]);
  const updateBookInsetRightPx = useCallback((value: number) => {
    debouncedUpdate("bookInsetRightPx", value, setBookInsetRightPx, "Book Insets", "Book Right Inset (px)");
  }, [debouncedUpdate]);
  const updateBookInsetBottomPx = useCallback((value: number) => {
    debouncedUpdate("bookInsetBottomPx", value, setBookInsetBottomPx, "Book Insets", "Book Bottom Inset (px)");
  }, [debouncedUpdate]);
  const updateBookInsetLeftPx = useCallback((value: number) => {
    debouncedUpdate("bookInsetLeftPx", value, setBookInsetLeftPx, "Book Insets", "Book Left Inset (px)");
  }, [debouncedUpdate]);
  const updateMovieInsetTopPx = useCallback((value: number) => {
    debouncedUpdate("movieInsetTopPx", value, setMovieInsetTopPx, "Movie Insets", "Movie Top Inset (px)");
  }, [debouncedUpdate]);
  const updateMovieInsetRightPx = useCallback((value: number) => {
    debouncedUpdate("movieInsetRightPx", value, setMovieInsetRightPx, "Movie Insets", "Movie Right Inset (px)");
  }, [debouncedUpdate]);
  const updateMovieInsetBottomPx = useCallback((value: number) => {
    debouncedUpdate("movieInsetBottomPx", value, setMovieInsetBottomPx, "Movie Insets", "Movie Bottom Inset (px)");
  }, [debouncedUpdate]);
  const updateMovieInsetLeftPx = useCallback((value: number) => {
    debouncedUpdate("movieInsetLeftPx", value, setMovieInsetLeftPx, "Movie Insets", "Movie Left Inset (px)");
  }, [debouncedUpdate]);
  const updateNonGameOverlay = useCallback(
    (mediaType: InsetEditableMediaType, property: "width" | "height" | "top" | "left", value: number) => {
      const propertyCapitalized = property.charAt(0).toUpperCase() + property.slice(1);
      const settingPrefix = mediaType === "tv" ? "tv" : mediaType;
      const settingLabel = mediaType === "tv" ? "TV" : mediaType === "movie" ? "Movie" : "Book";

      debouncedUpdate(
        `${settingPrefix}Overlay${propertyCapitalized}`,
        value,
        () => {
          const applyUpdate = (prev: OverlaySettings): OverlaySettings => ({ ...prev, [property]: value });
          if (mediaType === "tv") {
            setTvOverlaySettings(applyUpdate);
            return;
          }
          if (mediaType === "movie") {
            setMovieOverlaySettings(applyUpdate);
            return;
          }
          setBookOverlaySettings(applyUpdate);
        },
        `${settingLabel} Overlay`,
        `${settingLabel} Overlay ${propertyCapitalized} (%)`
      );
    },
    [debouncedUpdate]
  );
  const updateNonGameCoverScale = useCallback(
    (mediaType: InsetEditableMediaType, axis: "x" | "y", value: number) => {
      const axisLabel = axis.toUpperCase();
      const settingPrefix = mediaType === "tv" ? "tv" : mediaType;
      const settingLabel = mediaType === "tv" ? "TV" : mediaType === "movie" ? "Movie" : "Book";
      const applyUpdate = (prev: CoverScaleSettings): CoverScaleSettings => ({ ...prev, [axis]: value });

      if (mediaType === "tv") {
        setTvCoverScale(applyUpdate);
      } else if (mediaType === "movie") {
        setMovieCoverScale(applyUpdate);
      } else {
        setBookCoverScale(applyUpdate);
      }

      saveSetting(
        `${settingPrefix}CoverScale${axisLabel}`,
        value,
        `${settingLabel} Cover`,
        `${settingLabel} Cover Scale ${axisLabel} (%)`
      );
    },
    [saveSetting]
  );
  const updateNonGameCoverOffset = useCallback(
    (mediaType: InsetEditableMediaType, axis: "x" | "y", value: number) => {
      const axisLabel = axis.toUpperCase();
      const settingPrefix = mediaType === "tv" ? "tv" : mediaType;
      const settingLabel = mediaType === "tv" ? "TV" : mediaType === "movie" ? "Movie" : "Book";
      const applyUpdate = (prev: CoverOffsetSettings): CoverOffsetSettings => ({ ...prev, [axis]: value });

      if (mediaType === "tv") {
        setTvCoverOffset(applyUpdate);
      } else if (mediaType === "movie") {
        setMovieCoverOffset(applyUpdate);
      } else {
        setBookCoverOffset(applyUpdate);
      }

      saveSetting(
        `${settingPrefix}CoverOffset${axisLabel}`,
        value,
        `${settingLabel} Cover`,
        `${settingLabel} Cover Offset ${axisLabel} (%)`
      );
    },
    [saveSetting]
  );
  const updatePosterSizeGames = (value: number) => {
    setPosterSizeGames(value);
    saveSetting("posterSizeGames", value, "Cover Sizes", "Game Cover Size");
  };
  const clampUnifiedCoverSize = (value: number) => Math.max(70, Math.min(125, Math.round(value)));
  const captureGlobalCoverScaleBase = useCallback(() => {
    globalCoverScaleBaseRef.current = {
      tv: posterSizeTv,
      movies: posterSizeMovies,
      books: posterSizeBooks,
      games: posterSizeGames,
    };
  }, [posterSizeBooks, posterSizeGames, posterSizeMovies, posterSizeTv]);
  const updateGlobalCoverScale = useCallback((value: number) => {
    const scalePct = Math.max(70, Math.min(130, value));
    const scaleFactor = scalePct / 100;
    const base = globalCoverScaleBaseRef.current;
    const nextSizes = {
      tv: clampUnifiedCoverSize(base.tv * scaleFactor),
      movies: clampUnifiedCoverSize(base.movies * scaleFactor),
      books: clampUnifiedCoverSize(base.books * scaleFactor),
      games: clampUnifiedCoverSize(base.games * scaleFactor),
    };

    setGlobalCoverScalePct(scalePct);
    setPosterSizeTv(nextSizes.tv);
    setPosterSizeMovies(nextSizes.movies);
    setPosterSizeBooks(nextSizes.books);
    setPosterSizeGames(nextSizes.games);

    if (globalCoverScaleSaveTimerRef.current) {
      clearTimeout(globalCoverScaleSaveTimerRef.current);
    }

    globalCoverScaleSaveTimerRef.current = setTimeout(() => {
      saveSetting("posterSizeTv", nextSizes.tv, "Cover Sizes", "TV Show Cover Size");
      saveSetting("posterSizeMovies", nextSizes.movies, "Cover Sizes", "Movie Cover Size");
      saveSetting("posterSizeBooks", nextSizes.books, "Cover Sizes", "Book Cover Size");
      saveSetting("posterSizeGames", nextSizes.games, "Cover Sizes", "Game Cover Size");
      globalCoverScaleBaseRef.current = nextSizes;
      setGlobalCoverScalePct(100);
      globalCoverScaleSaveTimerRef.current = null;
    }, 2500);
  }, [saveSetting]);
  const updateShelfTheme = (value: string) => {
    const normalizedValue = normalizeShelfTheme(value);
    setShelfTheme(normalizedValue);
    saveSetting("shelfTheme", normalizedValue, "Themes", "Shelf Wood Type");
    const shelfThemeNames: Record<string, string> = {
      "/shelves-light-single2.png": "Default (Light Oak)",
      "/shelf-dark-walnut.png": "Dark Walnut",
      "/shelf-weathered-oak.png": "Weathered Oak",
      "/shelf-weathered-gray-oak.png": "Weathered Oak",
      "/shelf-honey-oak.png": "Honey Oak",
      "/shelf-teak.png": "Teak",
      "/shelf_white_oak.png": "White Oak",
      "/shelf-reclaimed-oak.png": "Reclaimed Oak",
    };
    setThemeSaveNotice(`Saved theme: ${shelfThemeNames[normalizedValue] || shelfThemeNames[value] || "Shelf theme"}. This will be used next time.`);
  };
  
  const updateSidebarTheme = (value: string) => {
    setSidebarTheme(value);
    saveSetting("sidebarTheme", value, "Themes", "Sidebar Theme");
    const sidebarThemeNames: Record<string, string> = {
      standard: "Standard",
      winterGray: "Winter Gray",
      darkBlue: "Dark Blue",
    };
    setThemeSaveNotice(`Saved theme: ${sidebarThemeNames[value] || "Sidebar theme"}. This will be used next time.`);
  };

  useEffect(() => {
    if (globalCoverScalePct === 100 && !globalCoverScaleSaveTimerRef.current) {
      globalCoverScaleBaseRef.current = {
        tv: posterSizeTv,
        movies: posterSizeMovies,
        books: posterSizeBooks,
        games: posterSizeGames,
      };
    }
  }, [globalCoverScalePct, posterSizeBooks, posterSizeGames, posterSizeMovies, posterSizeTv]);

  useEffect(() => {
    return () => {
      if (globalCoverScaleSaveTimerRef.current) {
        clearTimeout(globalCoverScaleSaveTimerRef.current);
      }
    };
  }, []);
  
  // Update platform-specific insets
  const updatePlatformInset = useCallback((platform: string, edge: 'top' | 'right' | 'bottom' | 'left', value: number) => {
    const platformKey = resolvePlatformAlias(platform);
    const edgeCapitalized = edge.charAt(0).toUpperCase() + edge.slice(1);
    const settingKey = `${platformKey}Inset${edgeCapitalized}Px`;
    
    debouncedUpdate(
      settingKey,
      value,
      () => {
        setPlatformInsets(prev => {
          const currentPlatformInsets = prev[platformKey] || { top: 5, right: 5, bottom: 5, left: 5 };
          return {
            ...prev,
            [platformKey]: {
              ...currentPlatformInsets,
              [edge]: value,
            }
          };
        });
        
        // Mark this platform as customized if it's not Default
        if (platformKey !== "Default") {
          setCustomizedPlatforms(prev => new Set(prev).add(platformKey));
        }
      },
      `${platformKey} Insets`,
      `${platformKey} ${edgeCapitalized} Inset (px)`
    );
  }, [debouncedUpdate]);
  
  // Update platform-specific overlay settings
  const updatePlatformOverlay = useCallback((platform: string, property: 'width' | 'height' | 'top' | 'left', value: number) => {
    const platformKey = resolvePlatformAlias(platform);
    const propertyCapitalized = property.charAt(0).toUpperCase() + property.slice(1);
    const settingKey = `${platformKey}Overlay${propertyCapitalized}`;
    
    debouncedUpdate(
      settingKey,
      value,
      () => {
        setPlatformOverlaySettings(prev => {
          const currentOverlaySettings = prev[platformKey] || { width: 100, height: 100, top: 0, left: 0 };
          return {
            ...prev,
            [platformKey]: {
              ...currentOverlaySettings,
              [property]: value,
            }
          };
        });
        
        // Mark this platform as customized if it's not Default
        if (platformKey !== "Default") {
          setCustomizedPlatforms(prev => new Set(prev).add(platformKey));
        }
      },
      `${platformKey} Overlay`,
      `${platformKey} Overlay ${propertyCapitalized} (%)`
    );
  }, [debouncedUpdate]);
  
  // Update platform-specific cover scale
  const updatePlatformCoverScale = useCallback((platform: string, axis: "x" | "y", value: number) => {
    const platformKey = resolvePlatformAlias(platform);
    const axisLabel = axis.toUpperCase();
    setPlatformCoverScale(prev => ({
      ...prev,
      [platformKey]: {
        ...(prev[platformKey] || { x: 100, y: 100 }),
        [axis]: value,
      },
    }));
    
    // Mark this platform as customized if it's not Default
    if (platformKey !== "Default") {
      setCustomizedPlatforms(prev => new Set(prev).add(platformKey));
    }
    
    saveSetting(`${platformKey}CoverScale${axisLabel}`, value, `${platformKey} Cover`, `${platformKey} Cover Scale ${axisLabel} (%)`);
  }, [saveSetting]);
  
  // Update platform-specific cover offset (crop position inside inset)
  const updatePlatformCoverOffset = useCallback((platform: string, axis: 'x' | 'y', value: number) => {
    const platformKey = resolvePlatformAlias(platform);
    const axisLabel = axis.toUpperCase();
    setPlatformCoverOffset(prev => ({
      ...prev,
      [platformKey]: {
        ...(prev[platformKey] || { x: 0, y: 0 }),
        [axis]: value,
      },
    }));
    
    if (platformKey !== "Default") {
      setCustomizedPlatforms(prev => new Set(prev).add(platformKey));
    }
    
    saveSetting(`${platformKey}CoverOffset${axisLabel}`, value, `${platformKey} Cover`, `${platformKey} Cover Offset ${axisLabel} (%)`);
  }, [saveSetting]);
  
  const updateLogoSize = (value: number) => {
    setLogoSize(value);
    saveSetting("logoSize", value, "Logo Settings", "Logo Size (px)");
  };
  const updateLogoTop = (value: number) => {
    setLogoTop(value);
    saveSetting("logoTop", value, "Logo Settings", "Logo Top Position");
  };
  const updateLogoLeft = (value: number) => {
    setLogoLeft(value);
    saveSetting("logoLeft", value, "Logo Settings", "Logo Left Position");
  };
  const updateSyncIconSize = (value: number) => {
    setSyncIconSize(value);
    saveSetting("syncIconSize", value, "Sync Icon", "Sync Icon Size (px)");
  };
  const updateSyncIconTop = (value: number) => {
    setSyncIconTop(value);
    saveSetting("syncIconTop", value, "Sync Icon", "Sync Icon Top Position");
  };
  const updateStatusIconScale = (value: number) => {
    setStatusIconScale(value);
    saveSetting("statusIconScale", value, "Status Icon", "Status Icon Size (%)");
  };
  const updateStatusIconOffsetX = (value: number) => {
    setStatusIconOffsetX(value);
    saveSetting("statusIconOffsetX", value, "Status Icon", "Status Icon Horizontal Offset (px)");
  };
  const updateStatusIconOffsetY = (value: number) => {
    setStatusIconOffsetY(value);
    saveSetting("statusIconOffsetY", value, "Status Icon", "Status Icon Vertical Offset (px)");
  };
  const updateIconSize = (value: number) => {
    setIconSize(value);
    saveSetting("iconSize", value, "Icons", "Sidebar Icon Size (px)");
  };
  const updateSidebarFontSize = (value: number) => {
    setSidebarFontSize(value);
    saveSetting("sidebarFontSize", value, "Sidebar", "Sidebar Font Size");
  };
  const updateSidebarFontWeight = (value: string) => {
    setSidebarFontWeight(value);
    saveSetting("sidebarFontWeight", value, "Sidebar", "Sidebar Font Weight");
  };
  const updateSidebarGap = (value: number) => {
    setSidebarGap(value);
    saveSetting("sidebarGap", value, "Sidebar", "Sidebar Icon Gap");
  };
  const updateSidebarHeaderFontSize = (value: number) => {
    setSidebarHeaderFontSize(value);
    saveSetting("sidebarHeaderFontSize", value, "Sidebar", "Sidebar Header Font Size");
  };
  const updateSidebarHeaderFontWeight = (value: string) => {
    setSidebarHeaderFontWeight(value);
    saveSetting("sidebarHeaderFontWeight", value, "Sidebar", "Sidebar Header Font Weight");
  };

  // Counter configuration update functions
  const updateCounterTileSize = (value: number) => {
    setCounterTileSize(value);
    saveSetting("counterTileSize", value, "Counter", "Counter Tile Size (px)");
  };
  const updateCounterTileSpacing = (value: number) => {
    setCounterTileSpacing(value);
    saveSetting("counterTileSpacing", value, "Counter", "Counter Tile Spacing (px)");
  };
  const updateCounterNumberFontSize = (value: number) => {
    setCounterNumberFontSize(value);
    saveSetting("counterNumberFontSize", value, "Counter", "Counter Number Font Size");
  };
  const updateCounterLabelFontSize = (value: number) => {
    setCounterLabelFontSize(value);
    saveSetting("counterLabelFontSize", value, "Counter", "Counter Label Font Size");
  };
  const updateCounterLabelFontWeight = (value: string) => {
    setCounterLabelFontWeight(value);
    saveSetting("counterLabelFontWeight", value, "Counter", "Counter Label Font Weight");
  };
  const updateCounterLabelTop = (value: number) => {
    setCounterLabelTop(value);
    saveSetting("counterLabelTop", value, "Counter", "Counter Label Top Offset");
  };
  const updateCounterLabelLeft = (value: number) => {
    setCounterLabelLeft(value);
    saveSetting("counterLabelLeft", value, "Counter", "Counter Label Left Offset");
  };
  const updateCounterTop = (value: number) => {
    setCounterTop(value);
    saveSetting("counterTop", value, "Counter", "Counter Top Offset");
  };
  const updateCounterLeft = (value: number) => {
    setCounterLeft(value);
    saveSetting("counterLeft", value, "Counter", "Counter Left Offset");
  };

  // Helper to check if a value contains spreadsheet error #REF!
  const hasRefError = (value: any): boolean => {
    if (value == null) return false;
    const str = String(value);
    return str.includes('#REF!');
  };

  const allShows = useMemo(() => {
    return tvRows.map(rowToShow).filter(show => {
      if (!show) return false;
      // Filter out items with #REF! errors in key fields
      if (hasRefError(show.title) || hasRefError(show.tmdbId)) return false;
      return true;
    }) as Show[];
  }, [tvRows]);

  const allBooks = useMemo(() => {
    return bookRows.map(rowToBook).filter(book => {
      if (!book) return false;
      // Filter out items with #REF! errors in key fields
      if (hasRefError(book.title) || hasRefError(book.isbn)) return false;
      return true;
    }) as Book[];
  }, [bookRows]);

  const allMovies = useMemo(() => {
    return movieRows.map(rowToMovie).filter(movie => {
      if (!movie) return false;
      // Filter out items with #REF! errors in key fields
      if (hasRefError(movie.title) || hasRefError(movie.tmdbId)) return false;
      return true;
    }) as Movie[];
  }, [movieRows]);

  const allGames = useMemo(() => {
    return gameRows.map(rowToGame).filter(game => {
      if (!game) return false;
      // Filter out items with #REF! errors in key fields
      if (hasRefError(game.title) || hasRefError(game.platform)) return false;
      return true;
    }) as Game[];
  }, [gameRows]);

  const indexedBooks = useMemo(
    () =>
      allBooks.map((book) => ({
        item: book,
        titleLC: safeStr(book.title).toLowerCase(),
        statusNorm: safeStr(book.status).toLowerCase().replace("cancelled", "canceled"),
        ownershipNorm: normalizeOwnership(book.ownership),
        types: safeStr(book.types)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        categories: safeStr(book.categories)
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean),
        tagTokens: Array.from(
          new Set(
            [...parseTagValues(book.tag), ...parseTagValues(book.tags)].map((tag) => normalizeTagToken(tag)).filter(Boolean)
          )
        ),
        completedYear: getYearToken(book.completedDate),
        releaseYear: getYearToken(book.releaseDate),
      })),
    [allBooks]
  );

  const indexedShows = useMemo(
    () =>
      allShows.map((show) => ({
        item: show,
        titleLC: safeStr(show.title).toLowerCase(),
        watchStatusNorm: safeStr(show.watchStatus).toLowerCase().replace("cancelled", "canceled"),
        showStatusNorm: safeStr(show.showStatus).toLowerCase().replace("cancelled", "canceled"),
        tagValue: safeStr(show.tag),
        firstAirYear: getYearToken(show.firstAirDate),
        tagYears: getYearTokens(show.tag),
        tagTokens: Array.from(new Set(parseTagValues(show.tag).map((tag) => normalizeTagToken(tag)).filter(Boolean))),
        tags: safeStr(show.tag)
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      })),
    [allShows]
  );

  const indexedMovies = useMemo(
    () =>
      allMovies.map((movie) => ({
        item: movie,
        titleLC: safeStr(movie.title).toLowerCase(),
        watchStatusNorm: safeStr(movie.watchStatus).toLowerCase().replace("cancelled", "canceled"),
        tagValue: safeStr(movie.tag),
        releaseYear: getYearToken(movie.releaseDate),
        tagTokens: Array.from(
          new Set(
            [...parseTagValues(movie.tag), ...parseTagValues(movie.tags)]
              .map((tag) => normalizeTagToken(tag))
              .filter(Boolean)
          )
        ),
        genres: safeStr(movie.genres)
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean),
      })),
    [allMovies]
  );

  const indexedGames = useMemo(
    () =>
      allGames.map((game) => ({
        item: game,
        titleLC: safeStr(game.title).toLowerCase(),
        ownershipNorm: normalizeOwnership(game.ownership),
        statusValue: safeStr(game.status || game.playStatus || game.gameStatus),
        ownershipValue: safeStr(game.ownership),
        yearPlayedValue: safeStr(game.yearPlayed),
        completedYear: getYearToken(game.dateCompleted) || getYearToken(game.yearPlayed),
        releaseYear: getYearToken(game.releaseDate) || getYearToken(game.releaseDateAlt),
        tagTokens: Array.from(new Set(parseTagValues(game.tag).map((tag) => normalizeTagToken(tag)).filter(Boolean))),
        platformValues: safeStr(game.platform)
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
        formatValues: safeStr(game.format)
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
        genreValues: safeStr(game.genres)
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean),
      })),
    [allGames]
  );

  const wishlistItems = useMemo(
    () =>
      [
        ...indexedGames
          .filter((game) => game.ownershipNorm === "wishlist")
          .map((game) => ({ ...game.item, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Game & { __type: "game" })>,
    [indexedGames]
  );

  const wishlistBookItems = useMemo(
    () =>
      [
        ...indexedBooks
          .filter((book) => book.ownershipNorm === "wishlist" || book.statusNorm === "backlog")
          .map((book) => ({ ...book.item, __type: "book" } as Book & { __type: "book" })),
      ] as Array<(Book & { __type: "book" }) | (Game & { __type: "game" })>,
    [indexedBooks]
  );

  const wishlistItemsByKey = useMemo(() => {
    const map = new Map<string, (Book & { __type: "book" }) | (Game & { __type: "game" })>();
    wishlistItems.forEach((item) => {
      map.set(getMediaItemKey(item), item);
    });
    return map;
  }, [wishlistItems]);

  const wishlistBookItemsByKey = useMemo(() => {
    const map = new Map<string, (Book & { __type: "book" }) | (Game & { __type: "game" })>();
    wishlistBookItems.forEach((item) => {
      map.set(getMediaItemKey(item), item);
    });
    return map;
  }, [wishlistBookItems]);

  const readNextFallbackOrderKeys = useMemo(() => {
    const sorted = [...wishlistBookItems].sort((a, b) => safeStr(a.title).localeCompare(safeStr(b.title)));
    return sorted.map((item) => getMediaItemKey(item));
  }, [wishlistBookItems]);

  const resolvedReadNextManualOrderKeys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    readNextManualOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!wishlistBookItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    readNextFallbackOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!wishlistBookItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    return ordered;
  }, [readNextFallbackOrderKeys, readNextManualOrderKeys, wishlistBookItemsByKey]);

  const wishlistFallbackOrderKeys = useMemo(() => {
    const sorted = [...wishlistItems].sort((a, b) => {
      const aOrder = parseManualOrderValue((a as any).wishlistOrder);
      const bOrder = parseManualOrderValue((b as any).wishlistOrder);
      if (aOrder !== null && bOrder !== null) return aOrder - bOrder;
      if (aOrder !== null) return -1;
      if (bOrder !== null) return 1;
      return safeStr(a.title).localeCompare(safeStr(b.title));
    });
    return sorted.map((item) => getMediaItemKey(item));
  }, [wishlistItems]);

  const resolvedWishlistManualOrderKeys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    wishlistManualOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!wishlistItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    wishlistFallbackOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!wishlistItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    return ordered;
  }, [wishlistFallbackOrderKeys, wishlistItemsByKey, wishlistManualOrderKeys]);

  const playNextItems = useMemo(
    () =>
      [
        ...indexedGames
          .filter((game) => PLAY_NEXT_STATUS_VALUES.has(normalizeStatusToken(game.statusValue)))
          .map((game) => ({ ...game.item, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Game & { __type: "game" })>,
    [indexedGames]
  );

  const playNextItemsByKey = useMemo(() => {
    const map = new Map<string, (Book & { __type: "book" }) | (Game & { __type: "game" })>();
    playNextItems.forEach((item) => {
      map.set(getMediaItemKey(item), item);
    });
    return map;
  }, [playNextItems]);

  const playNextFallbackOrderKeys = useMemo(() => {
    const sorted = [...playNextItems].sort((a, b) => {
      const aOrder = parseManualOrderValue((a as any).queuedOrder);
      const bOrder = parseManualOrderValue((b as any).queuedOrder);
      if (aOrder !== null && bOrder !== null) return aOrder - bOrder;
      if (aOrder !== null) return -1;
      if (bOrder !== null) return 1;
      return safeStr(a.title).localeCompare(safeStr(b.title));
    });
    return sorted.map((item) => getMediaItemKey(item));
  }, [playNextItems]);

  const resolvedPlayNextManualOrderKeys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    playNextManualOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!playNextItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    playNextFallbackOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!playNextItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    return ordered;
  }, [playNextFallbackOrderKeys, playNextItemsByKey, playNextManualOrderKeys]);

  const watchlistMovieItems = useMemo(
    () =>
      indexedMovies
        .filter((movie) => !isMovieWatchedStatus(movie.item) && !isMovieAbandonedStatus(movie.item))
        .map((movie) => ({ ...movie.item, __type: "movie" } as Movie & { __type: "movie" })),
    [indexedMovies]
  );

  const watchlistMovieItemsByKey = useMemo(() => {
    const map = new Map<string, Movie & { __type: "movie" }>();
    watchlistMovieItems.forEach((item) => {
      map.set(getMediaItemKey(item), item);
    });
    return map;
  }, [watchlistMovieItems]);

  const watchlistMovieFallbackOrderKeys = useMemo(() => {
    const sorted = [...watchlistMovieItems].sort((a, b) => {
      const aTime = Date.parse(safeStr((a as any).releaseDate));
      const bTime = Date.parse(safeStr((b as any).releaseDate));
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return bTime - aTime;
      if (!Number.isNaN(aTime)) return -1;
      if (!Number.isNaN(bTime)) return 1;
      return safeStr(a.title).localeCompare(safeStr(b.title));
    });
    return sorted.map((item) => getMediaItemKey(item));
  }, [watchlistMovieItems]);

  const resolvedWatchlistMovieManualOrderKeys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    watchlistMoviesManualOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!watchlistMovieItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    watchlistMovieFallbackOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!watchlistMovieItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    return ordered;
  }, [watchlistMovieFallbackOrderKeys, watchlistMovieItemsByKey, watchlistMoviesManualOrderKeys]);

  const watchlistTvItems = useMemo(
    () =>
      indexedShows
        .filter((show) => show.watchStatusNorm !== "completed" && show.watchStatusNorm !== "abandoned")
        .map((show) => ({ ...show.item, __type: "tv" } as Show & { __type: "tv" })),
    [indexedShows]
  );

  const watchlistTvItemsByKey = useMemo(() => {
    const map = new Map<string, Show & { __type: "tv" }>();
    watchlistTvItems.forEach((item) => {
      map.set(getMediaItemKey(item), item);
    });
    return map;
  }, [watchlistTvItems]);

  const watchlistTvFallbackOrderKeys = useMemo(() => {
    const sorted = [...watchlistTvItems].sort((a, b) => {
      const aDate = safeStr((a as any).lastAirDate) || safeStr((a as any).firstAirDate);
      const bDate = safeStr((b as any).lastAirDate) || safeStr((b as any).firstAirDate);
      const aTime = Date.parse(aDate);
      const bTime = Date.parse(bDate);
      if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return bTime - aTime;
      if (!Number.isNaN(aTime)) return -1;
      if (!Number.isNaN(bTime)) return 1;
      return safeStr(a.title).localeCompare(safeStr(b.title));
    });
    return sorted.map((item) => getMediaItemKey(item));
  }, [watchlistTvItems]);

  const resolvedWatchlistTvManualOrderKeys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    watchlistTvManualOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!watchlistTvItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    watchlistTvFallbackOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!watchlistTvItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    return ordered;
  }, [watchlistTvFallbackOrderKeys, watchlistTvItemsByKey, watchlistTvManualOrderKeys]);

  const gamePlatformOptions = useMemo(() => {
    const options = new Set<string>();
    allGames.forEach((game) => {
      const value = safeStr(game.platform);
      if (!value) return;
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => options.add(part));
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [allGames]);

  const gameOwnershipOptions = useMemo(() => {
    const options = new Set<string>();
    allGames.forEach((game) => {
      const value = safeStr(game.ownership);
      if (value) options.add(value);
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [allGames]);

  const gameFormatOptions = useMemo(() => {
    const options = new Set<string>();
    allGames.forEach((game) => {
      const value = safeStr(game.format);
      if (!value) return;
      value
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => options.add(part));
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [allGames]);

  const gameStatusOptions = useMemo(() => {
    const options = new Set<string>();
    allGames.forEach((game) => {
      const value = safeStr(game.status);
      if (value) options.add(value);
    });
    return Array.from(options).sort((a, b) => a.localeCompare(b));
  }, [allGames]);

  const gameStatuses = useMemo(() => {
    const values = new Set<string>();
    allGames.forEach((game) => {
      const value = safeStr(game.status || game.playStatus || game.gameStatus);
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [allGames]);

  const gameYearPlayedOptions = useMemo(() => {
    const values = new Set<string>();
    allGames.forEach((game) => {
      const value = safeStr(game.yearPlayed);
      if (value) values.add(value);
    });
    return Array.from(values).sort((a, b) => {
      const aNum = Number.parseInt(a, 10);
      const bNum = Number.parseInt(b, 10);
      const aIsNum = Number.isFinite(aNum);
      const bIsNum = Number.isFinite(bNum);
      if (aIsNum && bIsNum) return bNum - aNum;
      return a.localeCompare(b);
    });
  }, [allGames]);

  const gameGenres = useMemo(() => {
    const values = new Set<string>();
    allGames.forEach((game) => {
      const raw = safeStr(game.genres);
      if (!raw) return;
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => values.add(part));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [allGames]);

  const gamePlatformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const option of gamePlatformOptions) counts[option] = 0;
    allGames.forEach((game) => {
      const raw = safeStr(game.platform);
      if (!raw) return;
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
          if (counts[part] === undefined) counts[part] = 0;
          counts[part] += 1;
        });
    });
    return counts;
  }, [allGames, gamePlatformOptions]);

  const gameStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const option of gameStatuses) counts[option] = 0;
    allGames.forEach((game) => {
      const value = safeStr(game.status || game.playStatus || game.gameStatus);
      if (!value) return;
      if (counts[value] === undefined) counts[value] = 0;
      counts[value] += 1;
    });
    return counts;
  }, [allGames, gameStatuses]);

  const gameOwnershipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const option of gameOwnershipOptions) counts[option] = 0;
    allGames.forEach((game) => {
      const value = safeStr(game.ownership);
      if (!value) return;
      if (counts[value] === undefined) counts[value] = 0;
      counts[value] += 1;
    });
    return counts;
  }, [allGames, gameOwnershipOptions]);

  const gameFormatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const option of gameFormatOptions) counts[option] = 0;
    allGames.forEach((game) => {
      const raw = safeStr(game.format);
      if (!raw) return;
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
          if (counts[part] === undefined) counts[part] = 0;
          counts[part] += 1;
        });
    });
    return counts;
  }, [allGames, gameFormatOptions]);

  const gameYearPlayedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const option of gameYearPlayedOptions) counts[option] = 0;
    allGames.forEach((game) => {
      const value = safeStr(game.yearPlayed);
      if (!value) return;
      if (counts[value] === undefined) counts[value] = 0;
      counts[value] += 1;
    });
    return counts;
  }, [allGames, gameYearPlayedOptions]);

  const gameGenreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const option of gameGenres) counts[option] = 0;
    allGames.forEach((game) => {
      const raw = safeStr(game.genres);
      if (!raw) return;
      raw
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean)
        .forEach((part) => {
          if (counts[part] === undefined) counts[part] = 0;
          counts[part] += 1;
        });
    });
    return counts;
  }, [allGames, gameGenres]);

  // Helper to parse comma-separated platforms and determine primary platform
  // Priority: Steam > Epic Games Store > First platform in list
  const getPrimaryPlatform = (platformString: string | undefined): string => {
    if (!platformString) return "Default";
    
    // Split by comma and trim whitespace
    const platforms = platformString.split(',').map(p => p.trim()).filter(Boolean);
    
    if (platforms.length === 0) return "Default";
    
    // Check for Steam first (highest priority)
    if (platforms.some(p => p === "Steam")) return "Steam";
    
    // Check for Epic Games Store second
    if (platforms.some(p => p === "Epic Games Store")) return "Epic Games Store";
    
    // Return the first platform in the list
    return platforms[0];
  };

  // Helper to deduplicate games by title - keeps only primary platform version
  const deduplicateGames = useCallback((games: Game[]): Game[] => {
    const gamesByTitle = new Map<string, Game>();
    
    // Platform priority helper
    const getPlatformPriority = (platform: string) => {
      if (platform === "Steam") return 3;
      if (platform === "Epic Games Store") return 2;
      return 1;
    };
    
    games.forEach(game => {
      const existingGame = gamesByTitle.get(game.title);
      if (!existingGame) {
        gamesByTitle.set(game.title, game);
      } else {
        const existingPlatform = getPrimaryPlatform(existingGame.platform);
        const currentPlatform = getPrimaryPlatform(game.platform);
        
        if (getPlatformPriority(currentPlatform) > getPlatformPriority(existingPlatform)) {
          gamesByTitle.set(game.title, game);
        }
      }
    });
    
    return Array.from(gamesByTitle.values());
  }, []);

  // Dynamically detect all unique platforms from games data
  // Parse comma-separated platform values to get individual platforms
  const detectedPlatforms = useMemo(() => {
    const platforms = new Set<string>(["Default"]); // Always include Default
    allGames.forEach(game => {
      if (game.platform) {
        // Split comma-separated platforms and add each individually
        const individualPlatforms = game.platform.split(',').map(p => p.trim()).filter(Boolean);
        individualPlatforms.forEach(p => platforms.add(canonicalizePlatformLabel(p)));
      }
    });
    return Array.from(platforms).sort((a, b) => {
      // Keep "Default" first
      if (a === "Default") return -1;
      if (b === "Default") return 1;
      return a.localeCompare(b);
    });
  }, [allGames]);

  const getGameInsetDebugReadout = useCallback(
    (platformKey: string) => {
      const resolved = platformKey || "Default";
      const insets = platformInsets[resolved] || platformInsets["Default"] || { top: 5, right: 5, bottom: 5, left: 5 };
      const overlay = platformOverlaySettings[resolved] || platformOverlaySettings["Default"] || { width: 100, height: 100, top: 0, left: 0 };
      const scale = platformCoverScale[resolved] || platformCoverScale["Default"] || { x: 100, y: 100 };
      const offset = platformCoverOffset[resolved] || platformCoverOffset["Default"] || { x: 0, y: 0 };
      return `P:${resolved} | I:${insets.top}/${insets.right}/${insets.bottom}/${insets.left} | O:${overlay.width}/${overlay.height}/${overlay.top}/${overlay.left} | C:${scale.x}/${scale.y}/${offset.x}/${offset.y}`;
    },
    [platformCoverOffset, platformCoverScale, platformInsets, platformOverlaySettings]
  );

  const platformAliasMap = useMemo(() => {
    const map = new Map<string, string>();
    const knownPlatforms = new Set<string>([
      ...Array.from(customizedPlatforms),
      ...allGames.flatMap((g) =>
        safeStr(g.platform)
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean)
      ),
    ]);

    Array.from(knownPlatforms).forEach((platform) => {
      if (!platform || platform === "Default") return;
      const normalized = normalizePlatformToken(platform);
      if (!normalized) return;
      if (!map.has(normalized)) map.set(normalized, platform);
    });

    return map;
  }, [allGames, customizedPlatforms]);

  const resolvePlatformAlias = useCallback(
    (platform: string) => {
      const rawNormalized = normalizePlatformToken(platform);
      if (!rawNormalized) return "Default";
      const normalized = PLATFORM_TOKEN_ALIASES[rawNormalized] || rawNormalized;
      return PLATFORM_CANONICAL_LABELS[normalized] || platformAliasMap.get(normalized) || platform;
    },
    [platformAliasMap]
  );

  const selectedPlatformKey = useMemo(
    () => resolvePlatformAlias(selectedPlatformForInsets),
    [resolvePlatformAlias, selectedPlatformForInsets]
  );

  const quickTargetType: "tv" | "movie" | "book" | "game" = useMemo(() => {
    return quickInsetTarget.startsWith("game:") ? "game" : (quickInsetTarget as "tv" | "movie" | "book");
  }, [quickInsetTarget]);

  const quickTargetPlatform = useMemo(() => {
    if (!quickInsetTarget.startsWith("game:")) return "Default";
    return quickInsetTarget.slice("game:".length) || "Default";
  }, [quickInsetTarget]);

  const quickTargetPlatformKey = useMemo(() => {
    if (quickTargetType !== "game") return "Default";
    return resolvePlatformAlias(quickTargetPlatform);
  }, [quickTargetPlatform, quickTargetType, resolvePlatformAlias]);

  const quickInsetTargetOptions = useMemo(
    () => [
      { value: "tv", label: "TV Shows" },
      { value: "movie", label: "Movies" },
      { value: "book", label: "Books" },
      ...detectedPlatforms.map((platform) => ({
        value: `game:${platform}`,
        label: `Games: ${platform}`,
      })),
    ],
    [detectedPlatforms]
  );

  const quickOverlayTargetKey = useMemo(
    () => getOverlayFrameOverrideKey(quickTargetType, quickTargetPlatformKey),
    [getOverlayFrameOverrideKey, quickTargetPlatformKey, quickTargetType]
  );

  const quickOverlayExpectedPath = useMemo(
    () => getOverlayFrameDefaultPath(quickTargetType, quickTargetPlatformKey),
    [getOverlayFrameDefaultPath, quickTargetPlatformKey, quickTargetType]
  );

  const quickOverlayExpectedFilename = useMemo(() => {
    const parts = quickOverlayExpectedPath.split("/").filter(Boolean);
    return parts[parts.length - 1] || quickOverlayExpectedPath;
  }, [quickOverlayExpectedPath]);

  const quickOverlayOverrideUrl = useMemo(
    () => safeStr(overlayFrameOverrides[quickOverlayTargetKey]),
    [overlayFrameOverrides, quickOverlayTargetKey]
  );

  const handleReplaceOverlayForQuickTarget = useCallback(
    async (file: File | null | undefined) => {
      if (!file) return;
      const targetKey = quickOverlayTargetKey;
      setUploadingOverlayForKey(targetKey);
      setOverlayUploadError(null);
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemKey", targetKey);
        formData.append("mediaType", "overlay-frame");
        formData.append("title", targetKey);

        const res = await fetch("/api/upload-cover", {
          method: "POST",
          body: formData,
        });

        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) {
          throw new Error(payload?.error || `Overlay upload failed (${res.status})`);
        }

        const uploadedUrl = String(payload.url);
        setOverlayFrameOverrides((prev) => {
          const next = { ...prev, [targetKey]: uploadedUrl };
          try {
            localStorage.setItem("cdlOverlayFrameOverrides", JSON.stringify(next));
          } catch (e) {
            console.warn("Failed to persist overlay overrides locally:", e);
          }
          return next;
        });

        if (settingsWriteUrl) {
          saveSettingToSheet(
            `overlayFrameOverride:${targetKey}`,
            uploadedUrl,
            "Overlay Overrides",
            `Overlay frame override for ${targetKey}`
          );
        }
      } catch (e: any) {
        const msg = e?.message || "Failed to upload overlay";
        setOverlayUploadError(msg);
        console.error("Overlay upload failed:", e);
      } finally {
        setUploadingOverlayForKey(null);
      }
    },
    [quickOverlayTargetKey, saveSettingToSheet, settingsWriteUrl]
  );

  const handleResetOverlayForQuickTarget = useCallback(() => {
    const targetKey = quickOverlayTargetKey;
    setOverlayUploadError(null);
    setOverlayFrameOverrides((prev) => {
      if (!(targetKey in prev)) return prev;
      const next = { ...prev };
      delete next[targetKey];
      try {
        localStorage.setItem("cdlOverlayFrameOverrides", JSON.stringify(next));
      } catch (e) {
        console.warn("Failed to persist overlay overrides locally:", e);
      }
      return next;
    });

    if (settingsWriteUrl) {
      saveSettingToSheet(
        `overlayFrameOverride:${targetKey}`,
        "",
        "Overlay Overrides",
        `Clear overlay frame override for ${targetKey}`
      );
    }
  }, [quickOverlayTargetKey, saveSettingToSheet, settingsWriteUrl]);

  const quickInsetSnapshot = useMemo(() => {
    const tvInset = { top: caseInsetTopPx, right: caseInsetRightPx, bottom: caseInsetBottomPx, left: caseInsetLeftPx };
    const movieInset = { top: movieInsetTopPx, right: movieInsetRightPx, bottom: movieInsetBottomPx, left: movieInsetLeftPx };
    const bookInset = { top: bookInsetTopPx, right: bookInsetRightPx, bottom: bookInsetBottomPx, left: bookInsetLeftPx };
    const tvOverlay = tvOverlaySettings;
    const movieOverlay = movieOverlaySettings;
    const bookOverlay = bookOverlaySettings;
    const tvCoverOffsetSettings = tvCoverOffset;
    const movieCoverOffsetSettings = movieCoverOffset;
    const bookCoverOffsetSettings = bookCoverOffset;
    const tvCoverScaleSettings = tvCoverScale;
    const movieCoverScaleSettings = movieCoverScale;
    const bookCoverScaleSettings = bookCoverScale;
    const gameInset = platformInsets[quickTargetPlatformKey] || platformInsets["Default"] || { top: 5, right: 5, bottom: 5, left: 5 };
    const gameOverlay = platformOverlaySettings[quickTargetPlatformKey] || platformOverlaySettings["Default"] || { width: 100, height: 100, top: 0, left: 0 };
    const gameCoverOffset = platformCoverOffset[quickTargetPlatformKey] || platformCoverOffset["Default"] || { x: 0, y: 0 };
    const gameCoverScale = platformCoverScale[quickTargetPlatformKey] || platformCoverScale["Default"] || { x: 100, y: 100 };
    const gameFrameSource = getGameFrameSourceDimensions(quickTargetPlatformKey);
    return {
      inset: quickTargetType === "tv" ? tvInset : quickTargetType === "movie" ? movieInset : quickTargetType === "book" ? bookInset : gameInset,
      overlay: quickTargetType === "tv" ? tvOverlay : quickTargetType === "movie" ? movieOverlay : quickTargetType === "book" ? bookOverlay : gameOverlay,
      coverOffset:
        quickTargetType === "tv"
          ? tvCoverOffsetSettings
          : quickTargetType === "movie"
            ? movieCoverOffsetSettings
            : quickTargetType === "book"
              ? bookCoverOffsetSettings
              : gameCoverOffset,
      coverScale:
        quickTargetType === "tv"
          ? tvCoverScaleSettings
          : quickTargetType === "movie"
            ? movieCoverScaleSettings
            : quickTargetType === "book"
              ? bookCoverScaleSettings
              : gameCoverScale,
      sourceWidth: quickTargetType === "tv" ? CASE_SRC_W : quickTargetType === "movie" ? MOVIE_SRC_W : quickTargetType === "book" ? BOOK_SRC_W : gameFrameSource.width,
      sourceHeight: quickTargetType === "tv" ? CASE_SRC_H : quickTargetType === "movie" ? MOVIE_SRC_H : quickTargetType === "book" ? BOOK_SRC_H : gameFrameSource.height,
    };
  }, [
    BOOK_SRC_H,
    BOOK_SRC_W,
    CASE_SRC_H,
    CASE_SRC_W,
    MOVIE_SRC_H,
    MOVIE_SRC_W,
    bookInsetBottomPx,
    bookInsetLeftPx,
    bookInsetRightPx,
    bookInsetTopPx,
    bookOverlaySettings,
    bookCoverOffset,
    bookCoverScale,
    caseInsetBottomPx,
    caseInsetLeftPx,
    caseInsetRightPx,
    caseInsetTopPx,
    tvOverlaySettings,
    tvCoverOffset,
    tvCoverScale,
    movieInsetBottomPx,
    movieInsetLeftPx,
    movieInsetRightPx,
    movieInsetTopPx,
    movieOverlaySettings,
    movieCoverOffset,
    movieCoverScale,
    platformCoverOffset,
    platformCoverScale,
    platformInsets,
    platformOverlaySettings,
    quickTargetPlatformKey,
    quickTargetType,
  ]);

  useEffect(() => {
    if (quickTargetType === "game") {
      setSelectedPlatformForInsets(quickTargetPlatform);
    }
  }, [quickTargetPlatform, quickTargetType]);

  const applyQuickInsetNudge = useCallback(
    (direction: "up" | "down" | "left" | "right") => {
      const step = quickInsetStep;
      const inset = quickInsetSnapshot.inset;
      const overlay = quickInsetSnapshot.overlay;
      const cover = quickInsetSnapshot.coverOffset;
      const isUp = direction === "up";
      const isDown = direction === "down";
      const isLeft = direction === "left";
      const isRight = direction === "right";

      if (quickInsetMode === "insetPosition") {
        if (quickTargetType === "tv") {
          if (isUp) { updateCaseInsetTopPx(inset.top - step); updateCaseInsetBottomPx(inset.bottom + step); }
          if (isDown) { updateCaseInsetTopPx(inset.top + step); updateCaseInsetBottomPx(inset.bottom - step); }
          if (isLeft) { updateCaseInsetLeftPx(inset.left - step); updateCaseInsetRightPx(inset.right + step); }
          if (isRight) { updateCaseInsetLeftPx(inset.left + step); updateCaseInsetRightPx(inset.right - step); }
          return;
        }
        if (quickTargetType === "movie") {
          if (isUp) { updateMovieInsetTopPx(inset.top - step); updateMovieInsetBottomPx(inset.bottom + step); }
          if (isDown) { updateMovieInsetTopPx(inset.top + step); updateMovieInsetBottomPx(inset.bottom - step); }
          if (isLeft) { updateMovieInsetLeftPx(inset.left - step); updateMovieInsetRightPx(inset.right + step); }
          if (isRight) { updateMovieInsetLeftPx(inset.left + step); updateMovieInsetRightPx(inset.right - step); }
          return;
        }
        if (quickTargetType === "book") {
          if (isUp) { updateBookInsetTopPx(inset.top - step); updateBookInsetBottomPx(inset.bottom + step); }
          if (isDown) { updateBookInsetTopPx(inset.top + step); updateBookInsetBottomPx(inset.bottom - step); }
          if (isLeft) { updateBookInsetLeftPx(inset.left - step); updateBookInsetRightPx(inset.right + step); }
          if (isRight) { updateBookInsetLeftPx(inset.left + step); updateBookInsetRightPx(inset.right - step); }
          return;
        }
        if (isUp) { updatePlatformInset(quickTargetPlatform, "top", inset.top - step); updatePlatformInset(quickTargetPlatform, "bottom", inset.bottom + step); }
        if (isDown) { updatePlatformInset(quickTargetPlatform, "top", inset.top + step); updatePlatformInset(quickTargetPlatform, "bottom", inset.bottom - step); }
        if (isLeft) { updatePlatformInset(quickTargetPlatform, "left", inset.left - step); updatePlatformInset(quickTargetPlatform, "right", inset.right + step); }
        if (isRight) { updatePlatformInset(quickTargetPlatform, "left", inset.left + step); updatePlatformInset(quickTargetPlatform, "right", inset.right - step); }
        return;
      }

      if (quickInsetMode === "overlayPosition") {
        if (isUp) {
          if (quickTargetType === "game") updatePlatformOverlay(quickTargetPlatform, "top", overlay.top - step);
          else updateNonGameOverlay(quickTargetType, "top", overlay.top - step);
        }
        if (isDown) {
          if (quickTargetType === "game") updatePlatformOverlay(quickTargetPlatform, "top", overlay.top + step);
          else updateNonGameOverlay(quickTargetType, "top", overlay.top + step);
        }
        if (isLeft) {
          if (quickTargetType === "game") updatePlatformOverlay(quickTargetPlatform, "left", overlay.left - step);
          else updateNonGameOverlay(quickTargetType, "left", overlay.left - step);
        }
        if (isRight) {
          if (quickTargetType === "game") updatePlatformOverlay(quickTargetPlatform, "left", overlay.left + step);
          else updateNonGameOverlay(quickTargetType, "left", overlay.left + step);
        }
        return;
      }

      if (quickInsetMode === "overlayScale") {
        if (isUp) {
          if (quickTargetType === "game") updatePlatformOverlay(quickTargetPlatform, "height", overlay.height + step);
          else updateNonGameOverlay(quickTargetType, "height", overlay.height + step);
        }
        if (isDown) {
          if (quickTargetType === "game") updatePlatformOverlay(quickTargetPlatform, "height", overlay.height - step);
          else updateNonGameOverlay(quickTargetType, "height", overlay.height - step);
        }
        if (isLeft) {
          if (quickTargetType === "game") updatePlatformOverlay(quickTargetPlatform, "width", overlay.width - step);
          else updateNonGameOverlay(quickTargetType, "width", overlay.width - step);
        }
        if (isRight) {
          if (quickTargetType === "game") updatePlatformOverlay(quickTargetPlatform, "width", overlay.width + step);
          else updateNonGameOverlay(quickTargetType, "width", overlay.width + step);
        }
        return;
      }

      if (quickInsetMode === "coverPosition") {
        if (isUp) {
          if (quickTargetType === "game") updatePlatformCoverOffset(quickTargetPlatform, "y", cover.y - step);
          else updateNonGameCoverOffset(quickTargetType, "y", cover.y - step);
        }
        if (isDown) {
          if (quickTargetType === "game") updatePlatformCoverOffset(quickTargetPlatform, "y", cover.y + step);
          else updateNonGameCoverOffset(quickTargetType, "y", cover.y + step);
        }
        if (isLeft) {
          if (quickTargetType === "game") updatePlatformCoverOffset(quickTargetPlatform, "x", cover.x - step);
          else updateNonGameCoverOffset(quickTargetType, "x", cover.x - step);
        }
        if (isRight) {
          if (quickTargetType === "game") updatePlatformCoverOffset(quickTargetPlatform, "x", cover.x + step);
          else updateNonGameCoverOffset(quickTargetType, "x", cover.x + step);
        }
        return;
      }

      if (isLeft) {
        if (quickTargetType === "game") updatePlatformCoverScale(quickTargetPlatform, "x", quickInsetSnapshot.coverScale.x - step);
        else updateNonGameCoverScale(quickTargetType, "x", quickInsetSnapshot.coverScale.x - step);
      }
      if (isRight) {
        if (quickTargetType === "game") updatePlatformCoverScale(quickTargetPlatform, "x", quickInsetSnapshot.coverScale.x + step);
        else updateNonGameCoverScale(quickTargetType, "x", quickInsetSnapshot.coverScale.x + step);
      }
      if (isUp) {
        if (quickTargetType === "game") updatePlatformCoverScale(quickTargetPlatform, "y", quickInsetSnapshot.coverScale.y + step);
        else updateNonGameCoverScale(quickTargetType, "y", quickInsetSnapshot.coverScale.y + step);
      }
      if (isDown) {
        if (quickTargetType === "game") updatePlatformCoverScale(quickTargetPlatform, "y", quickInsetSnapshot.coverScale.y - step);
        else updateNonGameCoverScale(quickTargetType, "y", quickInsetSnapshot.coverScale.y - step);
      }
    },
    [
      quickInsetMode,
      quickInsetSnapshot,
      quickInsetStep,
      quickTargetPlatform,
      quickTargetType,
      updateBookInsetBottomPx,
      updateBookInsetLeftPx,
      updateBookInsetRightPx,
      updateBookInsetTopPx,
      updateCaseInsetBottomPx,
      updateCaseInsetLeftPx,
      updateCaseInsetRightPx,
      updateCaseInsetTopPx,
      updateMovieInsetBottomPx,
      updateMovieInsetLeftPx,
      updateMovieInsetRightPx,
      updateMovieInsetTopPx,
      updatePlatformCoverOffset,
      updatePlatformCoverScale,
      updatePlatformInset,
      updatePlatformOverlay,
      updateNonGameCoverOffset,
      updateNonGameCoverScale,
      updateNonGameOverlay,
    ]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!settingsPopupOpen || !settingsOpen.framePosition) return;
      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || active.isContentEditable) {
          return;
        }
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        applyQuickInsetNudge("up");
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        applyQuickInsetNudge("down");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        applyQuickInsetNudge("left");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        applyQuickInsetNudge("right");
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [applyQuickInsetNudge, settingsOpen.framePosition, settingsPopupOpen]);

  const quickInsetPreview = useMemo(() => {
    const inset = quickInsetSnapshot.inset;
    const top = (inset.top / quickInsetSnapshot.sourceHeight) * 100;
    const right = (inset.right / quickInsetSnapshot.sourceWidth) * 100;
    const bottom = (inset.bottom / quickInsetSnapshot.sourceHeight) * 100;
    const left = (inset.left / quickInsetSnapshot.sourceWidth) * 100;
    return {
      top,
      left,
      width: Math.max(5, 100 - left - right),
      height: Math.max(5, 100 - top - bottom),
    };
  }, [quickInsetSnapshot]);

  const quickInsetSaveType: "tv" | "movie" | "book" | "game" = quickTargetType;
  const quickInsetSaveLabel =
    quickTargetType === "tv"
      ? "Save TV Insets"
      : quickTargetType === "movie"
        ? "Save Movie Insets"
        : quickTargetType === "book"
          ? "Save Book Insets"
          : `Save ${quickTargetPlatform} Inset`;

  const resetQuickInsetTarget = useCallback(() => {
    setQuickInsetSaveStatus("idle");

    if (quickTargetType === "tv") {
      setCaseInsetTopPx(156);
      setCaseInsetRightPx(121);
      setCaseInsetBottomPx(136);
      setCaseInsetLeftPx(74);
      setTvOverlaySettings({ ...DEFAULT_OVERLAY_SETTINGS });
      setTvCoverScale({ ...DEFAULT_COVER_SCALE });
      setTvCoverOffset({ ...DEFAULT_COVER_OFFSET });
      saveSetting("caseInsetTopPx", 156, "TV Insets", "TV Case Top Inset (px)");
      saveSetting("caseInsetRightPx", 121, "TV Insets", "TV Case Right Inset (px)");
      saveSetting("caseInsetBottomPx", 136, "TV Insets", "TV Case Bottom Inset (px)");
      saveSetting("caseInsetLeftPx", 74, "TV Insets", "TV Case Left Inset (px)");
      saveSetting("tvOverlayWidth", DEFAULT_OVERLAY_SETTINGS.width, "TV Overlay", "TV Overlay Width (%)");
      saveSetting("tvOverlayHeight", DEFAULT_OVERLAY_SETTINGS.height, "TV Overlay", "TV Overlay Height (%)");
      saveSetting("tvOverlayTop", DEFAULT_OVERLAY_SETTINGS.top, "TV Overlay", "TV Overlay Top (%)");
      saveSetting("tvOverlayLeft", DEFAULT_OVERLAY_SETTINGS.left, "TV Overlay", "TV Overlay Left (%)");
      saveSetting("tvCoverScaleX", DEFAULT_COVER_SCALE.x, "TV Cover", "TV Cover Scale X (%)");
      saveSetting("tvCoverScaleY", DEFAULT_COVER_SCALE.y, "TV Cover", "TV Cover Scale Y (%)");
      saveSetting("tvCoverOffsetX", DEFAULT_COVER_OFFSET.x, "TV Cover", "TV Cover Offset X (%)");
      saveSetting("tvCoverOffsetY", DEFAULT_COVER_OFFSET.y, "TV Cover", "TV Cover Offset Y (%)");
      return;
    }

    if (quickTargetType === "movie") {
      setMovieInsetTopPx(156);
      setMovieInsetRightPx(100);
      setMovieInsetBottomPx(136);
      setMovieInsetLeftPx(120);
      setMovieOverlaySettings({ ...DEFAULT_OVERLAY_SETTINGS });
      setMovieCoverScale({ ...DEFAULT_COVER_SCALE });
      setMovieCoverOffset({ ...DEFAULT_COVER_OFFSET });
      saveSetting("movieInsetTopPx", 156, "Movie Insets", "Movie Top Inset (px)");
      saveSetting("movieInsetRightPx", 100, "Movie Insets", "Movie Right Inset (px)");
      saveSetting("movieInsetBottomPx", 136, "Movie Insets", "Movie Bottom Inset (px)");
      saveSetting("movieInsetLeftPx", 120, "Movie Insets", "Movie Left Inset (px)");
      saveSetting("movieOverlayWidth", DEFAULT_OVERLAY_SETTINGS.width, "Movie Overlay", "Movie Overlay Width (%)");
      saveSetting("movieOverlayHeight", DEFAULT_OVERLAY_SETTINGS.height, "Movie Overlay", "Movie Overlay Height (%)");
      saveSetting("movieOverlayTop", DEFAULT_OVERLAY_SETTINGS.top, "Movie Overlay", "Movie Overlay Top (%)");
      saveSetting("movieOverlayLeft", DEFAULT_OVERLAY_SETTINGS.left, "Movie Overlay", "Movie Overlay Left (%)");
      saveSetting("movieCoverScaleX", DEFAULT_COVER_SCALE.x, "Movie Cover", "Movie Cover Scale X (%)");
      saveSetting("movieCoverScaleY", DEFAULT_COVER_SCALE.y, "Movie Cover", "Movie Cover Scale Y (%)");
      saveSetting("movieCoverOffsetX", DEFAULT_COVER_OFFSET.x, "Movie Cover", "Movie Cover Offset X (%)");
      saveSetting("movieCoverOffsetY", DEFAULT_COVER_OFFSET.y, "Movie Cover", "Movie Cover Offset Y (%)");
      return;
    }

    if (quickTargetType === "book") {
      setBookInsetTopPx(99);
      setBookInsetRightPx(75);
      setBookInsetBottomPx(104);
      setBookInsetLeftPx(62);
      setBookOverlaySettings({ ...DEFAULT_OVERLAY_SETTINGS });
      setBookCoverScale({ ...DEFAULT_COVER_SCALE });
      setBookCoverOffset({ ...DEFAULT_COVER_OFFSET });
      saveSetting("bookInsetTopPx", 99, "Book Insets", "Book Top Inset (px)");
      saveSetting("bookInsetRightPx", 75, "Book Insets", "Book Right Inset (px)");
      saveSetting("bookInsetBottomPx", 104, "Book Insets", "Book Bottom Inset (px)");
      saveSetting("bookInsetLeftPx", 62, "Book Insets", "Book Left Inset (px)");
      saveSetting("bookOverlayWidth", DEFAULT_OVERLAY_SETTINGS.width, "Book Overlay", "Book Overlay Width (%)");
      saveSetting("bookOverlayHeight", DEFAULT_OVERLAY_SETTINGS.height, "Book Overlay", "Book Overlay Height (%)");
      saveSetting("bookOverlayTop", DEFAULT_OVERLAY_SETTINGS.top, "Book Overlay", "Book Overlay Top (%)");
      saveSetting("bookOverlayLeft", DEFAULT_OVERLAY_SETTINGS.left, "Book Overlay", "Book Overlay Left (%)");
      saveSetting("bookCoverScaleX", DEFAULT_COVER_SCALE.x, "Book Cover", "Book Cover Scale X (%)");
      saveSetting("bookCoverScaleY", DEFAULT_COVER_SCALE.y, "Book Cover", "Book Cover Scale Y (%)");
      saveSetting("bookCoverOffsetX", DEFAULT_COVER_OFFSET.x, "Book Cover", "Book Cover Offset X (%)");
      saveSetting("bookCoverOffsetY", DEFAULT_COVER_OFFSET.y, "Book Cover", "Book Cover Offset Y (%)");
      return;
    }

    const platformKey = quickTargetPlatformKey || "Default";
    const settingKeys = [
      `${platformKey}InsetTopPx`,
      `${platformKey}InsetRightPx`,
      `${platformKey}InsetBottomPx`,
      `${platformKey}InsetLeftPx`,
      `${platformKey}OverlayWidth`,
      `${platformKey}OverlayHeight`,
      `${platformKey}OverlayTop`,
      `${platformKey}OverlayLeft`,
      `${platformKey}CoverScaleX`,
      `${platformKey}CoverScaleY`,
      `${platformKey}CoverOffsetX`,
      `${platformKey}CoverOffsetY`,
    ];

    if (platformKey === "Default") {
      setPlatformInsets((prev) => ({ ...prev, Default: { top: 5, right: 5, bottom: 5, left: 5 } }));
      setPlatformOverlaySettings((prev) => ({ ...prev, Default: { width: 100, height: 100, top: 0, left: 0 } }));
      setPlatformCoverScale((prev) => ({ ...prev, Default: { x: 100, y: 100 } }));
      setPlatformCoverOffset((prev) => ({ ...prev, Default: { x: 0, y: 0 } }));
      saveSetting("DefaultInsetTopPx", 5, "Default Insets", "Default Top Inset (px)");
      saveSetting("DefaultInsetRightPx", 5, "Default Insets", "Default Right Inset (px)");
      saveSetting("DefaultInsetBottomPx", 5, "Default Insets", "Default Bottom Inset (px)");
      saveSetting("DefaultInsetLeftPx", 5, "Default Insets", "Default Left Inset (px)");
      saveSetting("DefaultOverlayWidth", 100, "Default Overlay", "Default Overlay Width (%)");
      saveSetting("DefaultOverlayHeight", 100, "Default Overlay", "Default Overlay Height (%)");
      saveSetting("DefaultOverlayTop", 0, "Default Overlay", "Default Overlay Top (%)");
      saveSetting("DefaultOverlayLeft", 0, "Default Overlay", "Default Overlay Left (%)");
      saveSetting("DefaultCoverScaleX", 100, "Default Cover", "Default Cover Scale X (%)");
      saveSetting("DefaultCoverScaleY", 100, "Default Cover", "Default Cover Scale Y (%)");
      saveSetting("DefaultCoverOffsetX", 0, "Default Cover", "Default Cover Offset X (%)");
      saveSetting("DefaultCoverOffsetY", 0, "Default Cover", "Default Cover Offset Y (%)");
      return;
    }

    // For platform-specific game targets, clear overrides and fall back to Default.
    setPlatformInsets((prev) => {
      const next = { ...prev };
      delete next[platformKey];
      return next;
    });
    setPlatformOverlaySettings((prev) => {
      const next = { ...prev };
      delete next[platformKey];
      return next;
    });
    setPlatformCoverScale((prev) => {
      const next = { ...prev };
      delete next[platformKey];
      return next;
    });
    setPlatformCoverOffset((prev) => {
      const next = { ...prev };
      delete next[platformKey];
      return next;
    });
    setCustomizedPlatforms((prev) => {
      const next = new Set(prev);
      next.delete(platformKey);
      return next;
    });
    settingKeys.forEach((key) => removeSetting(key));
  }, [
    quickTargetPlatformKey,
    quickTargetType,
    removeSetting,
    saveSetting,
  ]);

  // For rendering: use the first platform listed in the row as primary.
  // This keeps shelf rendering deterministic when a platform
  // (e.g. PlayStation 5) is selected.
  const getRenderPlatform = useCallback(
    (platformString: string | undefined): string => {
      if (!platformString) return "Default";
      const platforms = platformString
        .split(",")
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => resolvePlatformAlias(p));
      if (platforms.length === 0) return "Default";
      return platforms[0];
    },
    [resolvePlatformAlias]
  );

  // Note: We do NOT auto-initialize platformInsets for detected platforms
  // Only platforms explicitly customized (or loaded from settings) get entries
  // This ensures uncustomized platforms always inherit from Default insets

  const normalizeStatus = useCallback(
    (value?: string) => normalizeStatusToken(value),
    []
  );

  const hasWishlistOwnership = useCallback((value?: string) => normalizeOwnership(value) === "wishlist", []);
  const hasOwnedOwnership = useCallback((value?: string) => normalizeOwnership(value) === "owned", []);

  const isMovieWatched = useCallback((movie: Movie) => isMovieWatchedStatus(movie), []);

  const getStatusIndicator = useCallback((item: any): StatusIndicator | null => {
    const mediaType = getMediaType(item);
    const isAbandonedStatus = (value: string) =>
      value === "abandoned" || value === "dropped" || value === "drop" || value === "quit" || value === "dnf";

    if (mediaType === "tv") {
      const status = normalizeStatus(item?.watchStatus || item?.watched || item?.showStatus || item?.status);
      if (isAbandonedStatus(status)) return { color: STATUS_COLOR_ORANGE, label: "Abandoned" };
      if (
        status === "completed" ||
        status === "watched" ||
        status === "true" ||
        status === "yes" ||
        status === "1"
      ) {
        return { color: STATUS_COLOR_GREEN, label: "Watched / Completed" };
      }
      if (status === "pending return") {
        return { color: STATUS_COLOR_YELLOW, label: "Pending Return" };
      }
      if (
        status === "currently watching" ||
        status === "watching" ||
        status === "in progress" ||
        status === "paused" ||
        status === "watch next"
      ) {
        return { color: STATUS_COLOR_YELLOW, label: "Watching" };
      }
      if (status === "backlog" || status === "wishlist") {
        return { color: STATUS_COLOR_RED, label: "Backlog" };
      }
      return { color: STATUS_COLOR_RED, label: "Not Watched" };
    }

    if (mediaType === "movie") {
      const status = normalizeStatus(item?.watchStatus || item?.watched);
      if (isAbandonedStatus(status)) return { color: STATUS_COLOR_ORANGE, label: "Abandoned" };
      if (isMovieWatched(item as Movie)) return { color: STATUS_COLOR_GREEN, label: "Watched" };
      if (status === "watching" || status === "currently watching" || status === "in progress" || status === "paused") {
        return { color: STATUS_COLOR_YELLOW, label: "Watching" };
      }
      return { color: STATUS_COLOR_RED, label: "Not Watched" };
    }

    if (mediaType === "game") {
      const status = normalizeStatus(item?.status || item?.playStatus || item?.gameStatus || item?.completed);
      if (isAbandonedStatus(status)) return { color: STATUS_COLOR_ORANGE, label: "Abandoned" };
      if (status === "completed" || status === "done" || status === "beaten" || status === "finished") {
        return { color: STATUS_COLOR_GREEN, label: "Completed" };
      }
      if (
        status === "playing" ||
        status === "now playing" ||
        status === "currently playing" ||
        status === "in progress" ||
        status === "paused"
      ) {
        return { color: STATUS_COLOR_YELLOW, label: "Playing" };
      }
      return { color: STATUS_COLOR_RED, label: "Not Played" };
    }

    if (mediaType === "book") {
      const status = normalizeStatus(item?.status);
      if (isAbandonedStatus(status)) return { color: STATUS_COLOR_ORANGE, label: "Abandoned" };
      if (status === "completed" || status === "finished" || status === "read") {
        return { color: STATUS_COLOR_GREEN, label: "Completed" };
      }
      if (status === "reading" || status === "currently reading" || status === "in progress" || status === "paused") {
        return { color: STATUS_COLOR_YELLOW, label: "Reading" };
      }
      return { color: STATUS_COLOR_RED, label: "Not Read" };
    }

    return null;
  }, [isMovieWatched, normalizeStatus]);

  const watchStatuses = useMemo(
    () => [
      "Currently Watching",
      "Completed",
      "Backlog",
      "Abandoned",
      "Watch Next",
      "Paused",
      "Pending Return",
    ],
    []
  );

  const showStatuses = useMemo(() => ["Ended", "Returning Series", "Canceled"], []);

  const readingStatuses = useMemo(
    () => ["Reading", "Completed", "Backlog", "Abandoned", "Paused"],
    []
  );

  const readingStatusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of readingStatuses) counts[s] = 0;
    for (const book of allBooks) {
      const status = normalizeStatus(book.status);
      const match = readingStatuses.find((s) => normalizeStatus(s) === status);
      if (match) counts[match] += 1;
    }
    return counts;
  }, [allBooks, normalizeStatus, readingStatuses]);

  // Extract unique book formats from comma-separated types
  const bookFormats = useMemo(() => {
    const formats = new Set<string>();
    allBooks.forEach(book => {
      if (book.types) {
        const individualTypes = book.types.split(',').map(t => t.trim()).filter(Boolean);
        individualTypes.forEach(t => formats.add(t));
      }
    });
    return Array.from(formats).sort();
  }, [allBooks]);

  const formatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const f of bookFormats) counts[f] = 0;
    for (const book of allBooks) {
      if (book.types) {
        const individualTypes = book.types.split(',').map(t => t.trim()).filter(Boolean);
        individualTypes.forEach(type => {
          const match = bookFormats.find(f => f === type);
          if (match) counts[match] += 1;
        });
      }
    }
    return counts;
  }, [allBooks, bookFormats]);

  // Extract unique book series
  const bookSeries = useMemo(() => {
    const series = new Set<string>();
    allBooks.forEach(book => {
      if (book.series) {
        series.add(book.series);
      }
    });
    return Array.from(series).sort();
  }, [allBooks, normalizeStatus]);

  const seriesCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of bookSeries) counts[s] = 0;
    for (const book of allBooks) {
      if (book.series) {
        const match = bookSeries.find(s => s === book.series);
        if (match) counts[match] += 1;
      }
    }
    return counts;
  }, [allBooks, bookSeries]);

  // Extract unique book genres from comma-separated categories
  const bookGenres = useMemo(() => {
    const genres = new Set<string>();
    allBooks.forEach(book => {
      if (book.categories) {
        const individualCategories = book.categories.split(',').map(c => c.trim()).filter(Boolean);
        individualCategories.forEach(c => genres.add(c));
      }
    });
    return Array.from(genres).sort();
  }, [allBooks]);

  const genreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of bookGenres) counts[g] = 0;
    for (const book of allBooks) {
      if (book.categories) {
        const individualCategories = book.categories.split(',').map(c => c.trim()).filter(Boolean);
        individualCategories.forEach(category => {
          const match = bookGenres.find(g => g === category);
          if (match) counts[match] += 1;
        });
      }
    }
    return counts;
  }, [allBooks, bookGenres]);

  const wishlistCount = useMemo(() => {
    return allBooks.filter((b) => hasWishlistOwnership(b.ownership)).length;
  }, [allBooks, hasWishlistOwnership]);

  const watchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of watchStatuses) counts[s] = 0;
    for (const show of allShows) {
      const status = normalizeStatus(show.watchStatus);
      const match = watchStatuses.find((s) => normalizeStatus(s) === status);
      if (match) counts[match] += 1;
    }
    return counts;
  }, [allShows, normalizeStatus, watchStatuses]);

  const showCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of showStatuses) counts[s] = 0;
    for (const show of allShows) {
      const status = normalizeStatus(show.showStatus);
      const match = showStatuses.find((s) => normalizeStatus(s) === status);
      if (match) counts[match] += 1;
    }
    return counts;
  }, [allShows, normalizeStatus, showStatuses]);

  // Extract unique TV show tags
  const tvTags = useMemo(() => {
    const tags = new Set<string>();
    allShows.forEach(show => {
      if (show.tag) {
        // Split comma-separated tags and add each individually
        const individualTags = show.tag.split(',').map(t => t.trim()).filter(Boolean);
        individualTags.forEach(t => tags.add(t));
      }
    });
    return Array.from(tags).sort();
  }, [allShows]);

  const tvTagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tvTags) counts[t] = 0;
    for (const show of allShows) {
      if (show.tag) {
        const individualTags = show.tag.split(',').map(t => t.trim()).filter(Boolean);
        individualTags.forEach(tag => {
          const match = tvTags.find(t => t === tag);
          if (match) counts[match] += 1;
        });
      }
    }
    return counts;
  }, [allShows, tvTags]);

  // Movie watch status counts
  const movieWatchCounts = useMemo(() => {
    const counts: Record<string, number> = {
      Watched: 0,
      Watching: 0,
      Backlog: 0,
      Abandoned: 0,
    };
    for (const movie of allMovies) {
      const watchStatus = normalizeStatus(movie.watchStatus || movie.watched);
      if (watchStatus === "abandoned" || watchStatus === "dropped" || watchStatus === "drop" || watchStatus === "quit" || watchStatus === "dnf") {
        counts.Abandoned += 1;
      } else if (watchStatus === "watching" || watchStatus === "currently watching" || watchStatus === "in progress" || watchStatus === "paused") {
        counts.Watching += 1;
      } else if (isMovieWatched(movie)) {
        counts.Watched += 1;
      } else {
        counts.Backlog += 1;
      }
    }
    return counts;
  }, [allMovies, isMovieWatched, normalizeStatus]);

  // Extract unique movie genres from comma-separated genres
  const movieGenres = useMemo(() => {
    const genres = new Set<string>();
    allMovies.forEach(movie => {
      if (movie.genres) {
        const individualGenres = movie.genres.split(',').map(g => g.trim()).filter(Boolean);
        individualGenres.forEach(g => genres.add(g));
      }
    });
    return Array.from(genres).sort();
  }, [allMovies]);

  const movieGenreCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const g of movieGenres) counts[g] = 0;
    for (const movie of allMovies) {
      if (movie.genres) {
        const individualGenres = movie.genres.split(',').map(g => g.trim()).filter(Boolean);
        individualGenres.forEach(genre => {
          const match = movieGenres.find(g => g === genre);
          if (match) counts[match] += 1;
        });
      }
    }
    return counts;
  }, [allMovies, movieGenres]);

  const smartListStatusOptionsByMedia = useMemo(() => {
    const buildOptions = (values: string[], fallbackLabels: string[]): SmartListStatusOption[] => {
      const byToken = new Map<string, string>();

      values.forEach((value) => {
        const raw = safeStr(value);
        if (!raw) return;
        const token = normalizeStatus(raw);
        if (!token) return;
        if (!byToken.has(token)) byToken.set(token, raw);
      });

      fallbackLabels.forEach((label) => {
        const token = normalizeStatus(label);
        if (!token) return;
        if (!byToken.has(token)) byToken.set(token, label);
      });

      return Array.from(byToken.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    };

    return {
      book: buildOptions(
        allBooks.map((book) => safeStr(book.status)),
        ["Reading", "Completed", "Backlog", "Abandoned", "Paused"]
      ),
      movie: buildOptions(
        allMovies.map((movie) => safeStr(movie.watchStatus || movie.watched || movie.status || movie.movieStatus)),
        ["Watched", "Watching", "Backlog", "Abandoned", "Paused"]
      ),
      tv: buildOptions(
        allShows.map((show) => safeStr(show.watchStatus || show.showStatus || show.watched)),
        ["Currently Watching", "Completed", "Backlog", "Abandoned", "Watch Next", "Paused", "Pending Return"]
      ),
      game: buildOptions(
        allGames.map((game) => safeStr(game.status || game.playStatus || game.gameStatus || game.completed)),
        ["Now Playing", "Completed", "Backlog", "Abandoned", "Paused", "Queued", "Replay"]
      ),
    } satisfies Record<SmartListMediaType, SmartListStatusOption[]>;
  }, [allBooks, allGames, allMovies, allShows, normalizeStatus]);

  const smartListYearOptionsByMedia = useMemo(() => {
    const bookCompletedYears = new Set<string>();
    const bookReleaseYears = new Set<string>();
    const movieReleaseYears = new Set<string>();
    const tvFirstAirYears = new Set<string>();
    const tvTagYears = new Set<string>();
    const gameCompletedYears = new Set<string>();
    const gameReleaseYears = new Set<string>();

    indexedBooks.forEach((book) => {
      if (book.completedYear) bookCompletedYears.add(book.completedYear);
      if (book.releaseYear) bookReleaseYears.add(book.releaseYear);
    });
    indexedMovies.forEach((movie) => {
      if (movie.releaseYear) movieReleaseYears.add(movie.releaseYear);
    });
    indexedShows.forEach((show) => {
      if (show.firstAirYear) tvFirstAirYears.add(show.firstAirYear);
      show.tagYears.forEach((year) => tvTagYears.add(year));
    });
    indexedGames.forEach((game) => {
      if (game.completedYear) gameCompletedYears.add(game.completedYear);
      if (game.releaseYear) gameReleaseYears.add(game.releaseYear);
    });

    return {
      book: {
        book_completed_date: sortYearValues(Array.from(bookCompletedYears)),
        book_release_date: sortYearValues(Array.from(bookReleaseYears)),
      },
      movie: {
        movie_release_date: sortYearValues(Array.from(movieReleaseYears)),
      },
      tv: {
        tv_first_air_date: sortYearValues(Array.from(tvFirstAirYears)),
        tv_tag: sortYearValues(Array.from(tvTagYears)),
      },
      game: {
        game_completed_year: sortYearValues(Array.from(gameCompletedYears)),
        game_release_date: sortYearValues(Array.from(gameReleaseYears)),
      },
    } satisfies Record<SmartListMediaType, SmartListYearFilters>;
  }, [indexedBooks, indexedGames, indexedMovies, indexedShows]);

  const smartListTagOptions = useMemo<SmartListTagOption[]>(() => {
    const byToken = new Map<string, string>();
    const collect = (raw?: string) => {
      parseTagValues(raw).forEach((value) => {
        const token = normalizeTagToken(value);
        if (!token) return;
        if (!byToken.has(token)) byToken.set(token, value);
      });
    };

    allBooks.forEach((book) => {
      collect(book.tag);
      collect(book.tags);
    });
    allShows.forEach((show) => {
      collect(show.tag);
    });
    allMovies.forEach((movie) => {
      collect(movie.tag);
      collect(movie.tags);
    });
    allGames.forEach((game) => {
      collect(game.tag);
    });

    return Array.from(byToken.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [allBooks, allGames, allMovies, allShows]);

  const filteredSmartListTagOptions = useMemo(() => {
    const queryToken = normalizeTagToken(smartListTagQuery);
    if (!queryToken) return smartListTagOptions;
    return smartListTagOptions.filter((option) => {
      const labelToken = normalizeTagToken(option.label);
      return option.value.includes(queryToken) || labelToken.includes(queryToken);
    });
  }, [smartListTagOptions, smartListTagQuery]);

  // Generic sorting function
  const applySorting = useCallback(<T,>(items: T[], field: string, order: "Asc" | "Desc"): T[] => {
    const ratingNumber = (raw: unknown): number => {
      const n = Number.parseFloat(safeStr(raw));
      return Number.isNaN(n) ? NaN : n;
    };

    const getMyRating = (item: any): number =>
      ratingNumber(
        item?.myRating ??
          item?.["MyRating"] ??
          item?.["My Rating"] ??
          item?.userRating ??
          item?.personalRating
      );

    const getExternalRating = (item: any): number =>
      ratingNumber(
        item?.tmdbRating ??
          item?.["TMDB_Rating"] ??
          item?.externalAverageRating ??
          item?.externalRating ??
          item?.igdbRating ??
          item?.rating
      );

    return [...items].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      // Get the appropriate field value based on sortField
      if (field === "Title") {
        aVal = safeStr((a as any).title).toLowerCase();
        bVal = safeStr((b as any).title).toLowerCase();
        const result = aVal.localeCompare(bVal);
        return order === "Asc" ? result : -result;
      } else if (field === "MyRatingSort") {
        aVal = getMyRating(a);
        bVal = getMyRating(b);
      } else if (field === "ExternalRatingSort") {
        aVal = getExternalRating(a);
        bVal = getExternalRating(b);
      } else if (field === "ReleaseDate") {
        // For TV shows, use firstAirDate; for others use releaseDate
        aVal = (a as any).firstAirDate ? Date.parse((a as any).firstAirDate) : 
               (a as any).releaseDate ? Date.parse((a as any).releaseDate) : NaN;
        bVal = (b as any).firstAirDate ? Date.parse((b as any).firstAirDate) : 
               (b as any).releaseDate ? Date.parse((b as any).releaseDate) : NaN;
      } else if (field === "CompletedDate") {
        const aCompleted = (a as any).completedDate ?? (a as any).dateCompleted;
        const bCompleted = (b as any).completedDate ?? (b as any).dateCompleted;
        aVal = aCompleted ? Date.parse(aCompleted) : NaN;
        bVal = bCompleted ? Date.parse(bCompleted) : NaN;
      } else if (field === "CompletedDateOrReleaseDate") {
        const aCompleted = (a as any).completedDate ?? (a as any).dateCompleted;
        const bCompleted = (b as any).completedDate ?? (b as any).dateCompleted;
        const aType = (a as any).__type;
        const bType = (b as any).__type;
        const aRelease = aType === "tv"
          ? (a as any).lastAirDate ?? (a as any).firstAirDate
          : (a as any).releaseDate ?? (a as any).firstAirDate;
        const bRelease = bType === "tv"
          ? (b as any).lastAirDate ?? (b as any).firstAirDate
          : (b as any).releaseDate ?? (b as any).firstAirDate;
        aVal = aCompleted ? Date.parse(aCompleted) : aRelease ? Date.parse(aRelease) : NaN;
        bVal = bCompleted ? Date.parse(bCompleted) : bRelease ? Date.parse(bRelease) : NaN;
      } else if (field === "LastAirDate") {
        aVal = (a as any).lastAirDate ? Date.parse((a as any).lastAirDate) : NaN;
        bVal = (b as any).lastAirDate ? Date.parse((b as any).lastAirDate) : NaN;
      } else if (field === "FirstAirDate") {
        aVal = (a as any).firstAirDate ? Date.parse((a as any).firstAirDate) : NaN;
        bVal = (b as any).firstAirDate ? Date.parse((b as any).firstAirDate) : NaN;
      } else {
        // Default to releaseDate
        aVal = (a as any).releaseDate ? Date.parse((a as any).releaseDate) : NaN;
        bVal = (b as any).releaseDate ? Date.parse((b as any).releaseDate) : NaN;
      }

      // Handle NaN values (push them to the end)
      if (Number.isNaN(aVal) && Number.isNaN(bVal)) return 0;
      if (Number.isNaN(aVal)) return 1;
      if (Number.isNaN(bVal)) return -1;

      // Apply sort order
      return order === "Asc" ? aVal - bVal : bVal - aVal;
    });
  }, []);

  // (Placeholder logic) keep it simple for now
  const shows = useMemo(() => {
    const q = safeStr(deferredQuery).toLowerCase();
    if (nav === "books") {
      const hasBookFilters = Boolean(readingStatusFilter || formatFilter || seriesFilter || genreFilter || wishlistFilter);
      const bookBase = hasBookFilters ? indexedBooks : indexedBooks.filter((b) => b.ownershipNorm === "owned");
      let filtered = q ? bookBase.filter((b) => b.titleLC.includes(q)) : bookBase;
      // Apply reading status filter if set
      if (readingStatusFilter) {
        const readingStatusNorm = normalizeStatus(readingStatusFilter);
        filtered = filtered.filter((b) => b.statusNorm === readingStatusNorm);
      }
      // Apply format filter if set
      if (formatFilter) {
        filtered = filtered.filter((b) => b.types.includes(formatFilter));
      }
      // Apply series filter if set
      if (seriesFilter) {
        filtered = filtered.filter((b) => b.item.series === seriesFilter);
      }
      // Apply genre filter if set
      if (genreFilter) {
        filtered = filtered.filter((b) => b.categories.includes(genreFilter));
      }
      // Apply wishlist filter if set
      if (wishlistFilter) {
        filtered = filtered.filter((b) => b.ownershipNorm === "wishlist");
      }
      const sorted = applySorting(filtered.map((b) => b.item), sortField, sortOrder);
      return sorted.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })) as any[];
    }

    if (nav === "statistics") {
      return [
        ...indexedBooks.map((b) => ({ ...b.item, __type: "book" } as Book & { __type: "book" })),
        ...indexedShows.map((s) => ({ ...s.item, __type: "tv" } as Show & { __type: "tv" })),
        ...indexedMovies.map((m) => ({ ...m.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...indexedGames.map((g) => ({ ...g.item, __type: "game" } as Game & { __type: "game" })),
      ] as any[];
    }

    // Home: combine books + TV + movies + games and sort by releaseDate or lastAirDate (descending)
    // Games: exclude Wishlist ownership by default
    if (nav === "home") {
      const qbBase = indexedBooks.filter((b) => b.ownershipNorm === "owned");
      const qgBase = indexedGames.filter((g) => g.ownershipNorm !== "wishlist");
      const qb = q ? qbBase.filter((b) => b.titleLC.includes(q)) : qbBase;
      const qsBase = indexedShows.filter((s) => s.watchStatusNorm !== "wishlist");
      const qmBase = indexedMovies.filter((m) => m.watchStatusNorm !== "wishlist");
      const qs = q ? qsBase.filter((s) => s.titleLC.includes(q)) : qsBase;
      const qm = q ? qmBase.filter((m) => m.titleLC.includes(q)) : qmBase;
      const qg = q ? qgBase.filter((g) => g.titleLC.includes(q)) : qgBase;
      
      // Deduplicate games by title - keep only primary platform version
      const deduplicatedGames = deduplicateGames(qg.map((g) => g.item));

      const combined = [
        ...qb.map((b) => ({ ...b.item, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s.item, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...deduplicatedGames.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    // Wishlist: games only
    if (nav === "wishlist") {
      const ordered =
        sortField === MANUAL_SORT_FIELD
          ? resolvedWishlistManualOrderKeys
              .map((key) => wishlistItemsByKey.get(key))
              .filter(Boolean) as Array<(Book & { __type: "book" }) | (Game & { __type: "game" })>
          : applySorting(wishlistItems, sortField, sortOrder);

      const queryFiltered = q
        ? ordered.filter((item) => safeStr((item as any).title).toLowerCase().includes(q))
        : ordered;
      return queryFiltered as any[];
    }

    // Read Next: books with ownership "Wishlist" or status "Backlog"
    if (nav === "wishlist-books") {
      const ordered =
        sortField === MANUAL_SORT_FIELD
          ? resolvedReadNextManualOrderKeys
              .map((key) => wishlistBookItemsByKey.get(key))
              .filter(Boolean) as Array<(Book & { __type: "book" }) | (Game & { __type: "game" })>
          : applySorting(wishlistBookItems, sortField, sortOrder);
      const queryFiltered = q
        ? ordered.filter((item) => safeStr((item as any).title).toLowerCase().includes(q))
        : ordered;
      return queryFiltered as any[];
    }

    // Play Next: games with status "Queued" or "Replay"
    if (nav === "play-next") {
      const ordered =
        sortField === MANUAL_SORT_FIELD
          ? resolvedPlayNextManualOrderKeys
              .map((key) => playNextItemsByKey.get(key))
              .filter(Boolean) as Array<(Book & { __type: "book" }) | (Game & { __type: "game" })>
          : applySorting(playNextItems, sortField, sortOrder);

      const queryFiltered = q
        ? ordered.filter((item) => safeStr((item as any).title).toLowerCase().includes(q))
        : ordered;
      return queryFiltered as any[];
    }

    // Movie Watchlist: unwatched and not-abandoned movies
    if (nav === "watchlist-movies") {
      const ordered =
        sortField === MANUAL_SORT_FIELD
          ? resolvedWatchlistMovieManualOrderKeys
              .map((key) => watchlistMovieItemsByKey.get(key))
              .filter(Boolean) as Array<Movie & { __type: "movie" }>
          : applySorting(watchlistMovieItems, sortField, sortOrder);

      const queryFiltered = q
        ? ordered.filter((item) => safeStr((item as any).title).toLowerCase().includes(q))
        : ordered;
      return queryFiltered as any[];
    }

    // TV Watchlist: active shows (not completed/abandoned)
    if (nav === "watchlist-tv") {
      const ordered =
        sortField === MANUAL_SORT_FIELD
          ? resolvedWatchlistTvManualOrderKeys
              .map((key) => watchlistTvItemsByKey.get(key))
              .filter(Boolean) as Array<Show & { __type: "tv" }>
          : applySorting(watchlistTvItems, sortField, sortOrder);

      const sectionFiltered = ordered.filter(
        (item) => getTvWatchlistSectionForItem(item) === watchlistTvSectionFilter
      );
      const queryFiltered = q
        ? sectionFiltered.filter((item) => safeStr((item as any).title).toLowerCase().includes(q))
        : sectionFiltered;
      return queryFiltered as any[];
    }

    const isCurrentToken = (value?: string) => {
      const token = normalizeStatus(value);
      return (
        token === "currently watching" ||
        token === "watching" ||
        token === "watch next" ||
        token === "pending return" ||
        token === "now playing" ||
        token === "playing" ||
        token === "reading" ||
        token === "currently reading" ||
        token === "in progress" ||
        token === "paused"
      );
    };
    const isCompletedOrWatchedToken = (value?: string) => {
      const token = normalizeStatus(value);
      return token === "completed" || token === "watched";
    };
    const isAbandonedToken = (value?: string) => normalizeStatus(value) === "abandoned";

    // Current: items actively in progress (watching / now playing / reading / etc.)
    if (nav === "current") {
      const qb = indexedBooks.filter((b) => isCurrentToken(b.item.status));
      const qs = indexedShows.filter((s) => isCurrentToken(s.item.watchStatus));
      const qm = indexedMovies.filter((m) =>
        isCurrentToken(m.item.watchStatus) ||
        isCurrentToken(m.item.status) ||
        isCurrentToken(m.item.movieStatus)
      );
      const qg = indexedGames.filter((g) =>
        isCurrentToken(g.item.status) ||
        isCurrentToken(g.item.playStatus) ||
        isCurrentToken(g.item.gameStatus)
      );

      const queryFilteredBooks = q ? qb.filter((b) => b.titleLC.includes(q)) : qb;
      const queryFilteredShows = q ? qs.filter((s) => s.titleLC.includes(q)) : qs;
      const queryFilteredMovies = q ? qm.filter((m) => m.titleLC.includes(q)) : qm;
      const queryFilteredGames = q ? qg.filter((g) => g.titleLC.includes(q)) : qg;

      const combined = [
        ...queryFilteredBooks.map((b) => ({ ...b.item, __type: "book" } as Book & { __type: "book" })),
        ...queryFilteredShows.map((s) => ({ ...s.item, __type: "tv" } as Show & { __type: "tv" })),
        ...queryFilteredMovies.map((m) => ({ ...m.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...queryFilteredGames.map((g) => ({ ...g.item, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    // Completed: completed/watched items across all media types
    if (nav === "completed") {
      const qb = indexedBooks.filter((b) => isCompletedOrWatchedToken(b.item.status));
      const qs = indexedShows.filter((s) =>
        Boolean(safeStr(s.item.dateCompleted)) ||
        isCompletedOrWatchedToken(s.item.watchStatus) ||
        isCompletedOrWatchedToken(s.item.showStatus) ||
        normalizeStatus(s.item.watched) === "true"
      );
      const qm = indexedMovies.filter((m) =>
        isMovieWatched(m.item) ||
        isCompletedOrWatchedToken(m.item.watchStatus) ||
        isCompletedOrWatchedToken(m.item.status) ||
        isCompletedOrWatchedToken(m.item.movieStatus)
      );
      const qg = indexedGames.filter((g) =>
        isCompletedOrWatchedToken(g.item.status) ||
        isCompletedOrWatchedToken(g.item.playStatus) ||
        isCompletedOrWatchedToken(g.item.gameStatus) ||
        normalizeStatus(g.item.completed) === "true"
      );

      const combined = [
        ...qb.map((b) => ({ ...b.item, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s.item, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g.item, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const queryFiltered = q ? combined.filter((item) => safeStr((item as any).title).toLowerCase().includes(q)) : combined;
      const sorted = applySorting(queryFiltered, "CompletedDateOrReleaseDate", sortOrder);
      return sorted as any[];
    }

    // Abandoned: abandoned items across all media types
    if (nav === "abandoned") {
      const qb = indexedBooks.filter((b) => isAbandonedToken(b.item.status));
      const qs = indexedShows.filter((s) => isAbandonedToken(s.item.watchStatus) || isAbandonedToken(s.item.showStatus));
      const qm = indexedMovies.filter((m) =>
        isAbandonedToken(m.item.watchStatus) ||
        isAbandonedToken(m.item.watched)
      );
      const qg = indexedGames.filter((g) =>
        isAbandonedToken(g.item.status) ||
        isAbandonedToken(g.item.playStatus) ||
        isAbandonedToken(g.item.gameStatus)
      );

      const combined = [
        ...qb.map((b) => ({ ...b.item, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s.item, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g.item, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const queryFiltered = q ? combined.filter((item) => safeStr((item as any).title).toLowerCase().includes(q)) : combined;
      const sorted = applySorting(queryFiltered, sortField, sortOrder);
      return sorted as any[];
    }

    // Movies path
    if (nav === "movies") {
      let filtered = indexedMovies;
      
      // Apply watch status filter if set
      if (movieWatchFilter) {
        filtered = filtered.filter((m) => {
          const watchStatus = normalizeStatus(m.item.watchStatus || m.item.watched);
          const isAbandoned =
            watchStatus === "abandoned" ||
            watchStatus === "dropped" ||
            watchStatus === "drop" ||
            watchStatus === "quit" ||
            watchStatus === "dnf";
          const isWatching =
            watchStatus === "watching" ||
            watchStatus === "currently watching" ||
            watchStatus === "in progress" ||
            watchStatus === "paused";
          if (movieWatchFilter === "Watched") return isMovieWatched(m.item);
          if (movieWatchFilter === "Watching") return isWatching;
          if (movieWatchFilter === "Abandoned") return isAbandoned;
          return !isMovieWatched(m.item) && !isWatching && !isAbandoned;
        });
      } else {
        // Default Movies view: include watched, watching, and abandoned.
        filtered = filtered.filter((m) => {
          const watchStatus = normalizeStatus(m.item.watchStatus || m.item.watched);
          const isAbandoned =
            watchStatus === "abandoned" ||
            watchStatus === "dropped" ||
            watchStatus === "drop" ||
            watchStatus === "quit" ||
            watchStatus === "dnf";
          const isWatching =
            watchStatus === "watching" ||
            watchStatus === "currently watching" ||
            watchStatus === "in progress" ||
            watchStatus === "paused";
          return isMovieWatched(m.item) || isWatching || isAbandoned;
        });
      }
      
      // Apply genre filter if set
      if (movieGenreFilter) {
        filtered = filtered.filter((m) => m.genres.includes(movieGenreFilter));
      }
      
      const filteredByQuery = q ? filtered.filter((m) => m.titleLC.includes(q)) : filtered;
      const sorted = applySorting(filteredByQuery.map((m) => m.item), sortField, sortOrder);
      return sorted.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })) as any[];
    }

    // Games path
    if (nav === "games") {
      const hasGameFilters = Boolean(
        gamePlatformFilter || gameStatusFilter || gameOwnershipFilter || gameFormatFilter || gameYearPlayedFilter || gameGenreFilter
      );
      let filtered = hasGameFilters ? indexedGames : indexedGames.filter((g) => g.ownershipNorm !== "wishlist");

      if (gamePlatformFilter) {
        filtered = filtered.filter((g) => g.platformValues.includes(gamePlatformFilter));
      }

      if (gameStatusFilter) {
        filtered = filtered.filter((g) => g.statusValue === gameStatusFilter);
      }

      if (gameOwnershipFilter) {
        filtered = filtered.filter((g) => g.ownershipValue === gameOwnershipFilter);
      }

      if (gameFormatFilter) {
        filtered = filtered.filter((g) => g.formatValues.includes(gameFormatFilter));
      }

      if (gameYearPlayedFilter) {
        filtered = filtered.filter((g) => g.yearPlayedValue === gameYearPlayedFilter);
      }

      if (gameGenreFilter) {
        filtered = filtered.filter((g) => g.genreValues.includes(gameGenreFilter));
      }

      const filteredByQuery = q ? filtered.filter((g) => g.titleLC.includes(q)) : filtered;
      const sorted = applySorting(filteredByQuery.map((g) => g.item), sortField, sortOrder);
      return sorted.map((g) => ({
        ...g,
        __type: "game",
        __renderPlatform: gamePlatformFilter ? resolvePlatformAlias(gamePlatformFilter) : undefined,
      } as Game & { __type: "game"; __renderPlatform?: string })) as any[];
    }

    // Smart List: This Year - Filter all items with appropriate year field matching current year
    if (nav === "year-this") {
      const currentYear = new Date().getFullYear().toString();
      
      // Books: Use year from CompletedDate
      const qb = q 
        ? indexedBooks.filter((b) => b.titleLC.includes(q) && b.completedYear === currentYear)
        : indexedBooks.filter((b) => b.completedYear === currentYear);
      
      // TV Shows: Use Tags column
      const qs = q 
        ? indexedShows.filter((s) => s.titleLC.includes(q) && s.tagValue === currentYear)
        : indexedShows.filter((s) => s.tagValue === currentYear);
      
      // Movies: Use Tags column
      const qm = q 
        ? indexedMovies.filter((m) => m.titleLC.includes(q) && m.tagValue === currentYear)
        : indexedMovies.filter((m) => m.tagValue === currentYear);
      
      // Games: Use Year Played column
      const qg = q 
        ? indexedGames.filter((g) => g.titleLC.includes(q) && g.yearPlayedValue === currentYear)
        : indexedGames.filter((g) => g.yearPlayedValue === currentYear);
      
      const combined = [
        ...qb.map((b) => ({ ...b.item, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s.item, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g.item, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    if (nav === "smart-custom") {
      if (!activeSmartList) return [];

      const mediaSet = new Set(activeSmartList.mediaTypes);
      const statusFilters = activeSmartList.statuses || {};
      const yearFilters = activeSmartList.yearFilters || {};
      const tagFilters = activeSmartList.tags || [];
      const hasStatusFilter = (mediaType: SmartListMediaType) => Boolean(statusFilters[mediaType]?.length);
      const matchesStatusFilter = (mediaType: SmartListMediaType, rawStatus: string) => {
        const allowed = statusFilters[mediaType] || [];
        if (!allowed.length) return true;
        const normalized = normalizeStatus(rawStatus);
        return allowed.includes(normalized);
      };
      const hasTagFilter = tagFilters.length > 0;
      const matchesTagFilter = (candidateTags: string[]) => {
        if (!hasTagFilter) return true;
        if (!candidateTags.length) return false;
        return candidateTags.some((tag) => tagFilters.includes(normalizeTagToken(tag)));
      };
      const hasYearFilter = (mediaType: SmartListMediaType) => {
        const sourceMap = yearFilters[mediaType];
        if (!sourceMap) return false;
        return Object.values(sourceMap).some((values) => Array.isArray(values) && values.length > 0);
      };
      const matchesYearFilter = (
        mediaType: SmartListMediaType,
        candidateYearsBySource: Partial<Record<SmartListYearSourceKey, string[]>>
      ) => {
        const sourceMap = yearFilters[mediaType];
        if (!sourceMap) return true;
        const sourceEntries = Object.entries(sourceMap).filter(
          ([, values]) => Array.isArray(values) && values.length > 0
        ) as Array<[SmartListYearSourceKey, string[]]>;
        if (!sourceEntries.length) return true;
        return sourceEntries.some(([sourceKey, allowedYears]) => {
          const candidateYears = (candidateYearsBySource[sourceKey] || []).filter(Boolean);
          if (!candidateYears.length) return false;
          return candidateYears.some((year) => allowedYears.includes(year));
        });
      };

      const qb = mediaSet.has("book")
        ? indexedBooks.filter((book) => {
            if (
              hasYearFilter("book") &&
              !matchesYearFilter("book", {
                book_completed_date: book.completedYear ? [book.completedYear] : [],
                book_release_date: book.releaseYear ? [book.releaseYear] : [],
              })
            ) {
              return false;
            }
            if (!matchesTagFilter(book.tagTokens)) return false;
            if (!hasStatusFilter("book")) return true;
            return matchesStatusFilter("book", safeStr(book.item.status));
          })
        : [];

      const qs = mediaSet.has("tv")
        ? indexedShows.filter((show) => {
            if (
              hasYearFilter("tv") &&
              !matchesYearFilter("tv", {
                tv_first_air_date: show.firstAirYear ? [show.firstAirYear] : [],
                tv_tag: show.tagYears || [],
              })
            ) {
              return false;
            }
            if (!matchesTagFilter(show.tagTokens)) return false;
            if (!hasStatusFilter("tv")) return true;
            return matchesStatusFilter("tv", safeStr(show.item.watchStatus || show.item.showStatus || show.item.watched));
          })
        : [];

      const qm = mediaSet.has("movie")
        ? indexedMovies.filter((movie) => {
            if (
              hasYearFilter("movie") &&
              !matchesYearFilter("movie", {
                movie_release_date: movie.releaseYear ? [movie.releaseYear] : [],
              })
            ) {
              return false;
            }
            if (!matchesTagFilter(movie.tagTokens)) return false;
            if (!hasStatusFilter("movie")) return true;
            return matchesStatusFilter("movie", safeStr(movie.item.watchStatus || movie.item.watched || movie.item.status || movie.item.movieStatus));
          })
        : [];

      const qg = mediaSet.has("game")
        ? indexedGames.filter((game) => {
            if (
              hasYearFilter("game") &&
              !matchesYearFilter("game", {
                game_completed_year: game.completedYear ? [game.completedYear] : [],
                game_release_date: game.releaseYear ? [game.releaseYear] : [],
              })
            ) {
              return false;
            }
            if (!matchesTagFilter(game.tagTokens)) return false;
            if (!hasStatusFilter("game")) return true;
            return matchesStatusFilter("game", safeStr(game.item.status || game.item.playStatus || game.item.gameStatus || game.item.completed));
          })
        : [];

      let combined = [
        ...qb.map((book) => ({ ...book.item, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((show) => ({ ...show.item, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((movie) => ({ ...movie.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((game) => ({ ...game.item, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      if (q) {
        combined = combined.filter((item) => safeStr(item.title).toLowerCase().includes(q));
      }

      if (sortField === MANUAL_SORT_FIELD && activeSmartList.allowManualSort) {
        const itemsByKey = new Map<string, typeof combined[number]>();
        combined.forEach((item) => {
          itemsByKey.set(getMediaItemKey(item), item);
        });

        const savedOrder = (smartListManualOrderKeysById[activeSmartList.id] || []).filter((key) => itemsByKey.has(key));
        const fallbackSortField =
          activeSmartList.defaultSortField === MANUAL_SORT_FIELD
            ? "ReleaseDate"
            : activeSmartList.defaultSortField;
        const fallbackOrder = applySorting(combined, fallbackSortField, activeSmartList.defaultSortOrder)
          .map((item) => getMediaItemKey(item))
          .filter((key) => itemsByKey.has(key));
        const combinedOrder = Array.from(new Set([...savedOrder, ...fallbackOrder]));
        return combinedOrder
          .map((key) => itemsByKey.get(key))
          .filter(Boolean) as any[];
      }

      const effectiveSortField = sortField === MANUAL_SORT_FIELD ? "ReleaseDate" : sortField;
      const sorted = applySorting(combined, effectiveSortField, sortOrder);
      return sorted as any[];
    }

    // TV default path
    const hasTvFilters = Boolean(watchFilter || showFilter || tagFilter);
    const tvBase = hasTvFilters ? indexedShows : indexedShows.filter((s) => s.watchStatusNorm !== "backlog");
    const watchStatusNorm = watchFilter ? normalizeStatus(watchFilter) : "";
    const showStatusNorm = showFilter ? normalizeStatus(showFilter) : "";
    const filteredByWatch = watchFilter
      ? tvBase.filter((s) => s.watchStatusNorm === watchStatusNorm)
      : tvBase;
    const filteredByShow = showFilter
      ? filteredByWatch.filter((s) => s.showStatusNorm === showStatusNorm)
      : filteredByWatch;
    const filteredByTag = tagFilter
      ? filteredByShow.filter((s) => s.tags.includes(tagFilter))
      : filteredByShow;
    const filteredByQuery = q ? filteredByTag.filter((s) => s.titleLC.includes(q)) : filteredByTag;

    if (nav !== "tv") return filteredByQuery.map((s) => s.item) as any[];

    const sorted = applySorting(filteredByQuery.map((s) => s.item), sortField, sortOrder);
    return sorted as any[];
  }, [
    indexedShows, indexedBooks, indexedMovies, indexedGames,
    applySorting, deduplicateGames,
    formatFilter, gameFormatFilter, gameGenreFilter, gameOwnershipFilter, gamePlatformFilter, gameStatusFilter, gameYearPlayedFilter,
    genreFilter,
    isMovieWatched, movieGenreFilter, movieWatchFilter, nav, normalizeStatus, resolvePlatformAlias,
    activeSmartList, deferredQuery, playNextItems, playNextItemsByKey, readingStatusFilter, resolvedPlayNextManualOrderKeys, resolvedReadNextManualOrderKeys, resolvedWatchlistMovieManualOrderKeys, resolvedWatchlistTvManualOrderKeys, resolvedWishlistManualOrderKeys, seriesFilter, showFilter, smartListManualOrderKeysById, sortField, sortOrder, tagFilter, watchFilter, watchlistMovieItems, watchlistMovieItemsByKey, watchlistTvItems, watchlistTvItemsByKey, watchlistTvSectionFilter, wishlistBookItems, wishlistBookItemsByKey, wishlistFilter, wishlistItems, wishlistItemsByKey
  ]);

  const watchlistTvSectionByVisibleKey = useMemo(() => {
    const sections = new Map<string, TvWatchlistSectionKey>();
    if (nav !== "watchlist-tv") return sections;

    shows.forEach((item) => {
      sections.set(getMediaItemKey(item), getTvWatchlistSectionForItem(item));
    });

    return sections;
  }, [nav, shows]);

  const watchlistTvSectionCounts = useMemo(() => {
    const counts: Record<TvWatchlistSectionKey, number> = {
      pendingReturn: 0,
      watching: 0,
      backlog: 0,
    };
    watchlistTvItems.forEach((item) => {
      const section = getTvWatchlistSectionForItem(item);
      counts[section] += 1;
    });

    return counts;
  }, [watchlistTvItems]);

  const persistBacklogSortSettings = useCallback(
    (
      view: "wishlist" | "wishlist-books" | "play-next" | "watchlist-movies" | "watchlist-tv",
      field: string,
      order: "Asc" | "Desc"
    ) => {
      let sortFieldKey = WISHLIST_SORT_FIELD_SETTING_KEY;
      let sortOrderKey = WISHLIST_SORT_ORDER_SETTING_KEY;
      let descriptionPrefix = "Wishlist (Backlog)";

      if (view === "play-next") {
        sortFieldKey = PLAY_NEXT_SORT_FIELD_SETTING_KEY;
        sortOrderKey = PLAY_NEXT_SORT_ORDER_SETTING_KEY;
        descriptionPrefix = "Play Next (Backlog)";
      } else if (view === "wishlist-books") {
        sortFieldKey = READ_NEXT_SORT_FIELD_SETTING_KEY;
        sortOrderKey = READ_NEXT_SORT_ORDER_SETTING_KEY;
        descriptionPrefix = "Read Next (Books)";
      } else if (view === "watchlist-movies") {
        sortFieldKey = WATCHLIST_MOVIES_SORT_FIELD_SETTING_KEY;
        sortOrderKey = WATCHLIST_MOVIES_SORT_ORDER_SETTING_KEY;
        descriptionPrefix = "Movie Watchlist";
      } else if (view === "watchlist-tv") {
        sortFieldKey = WATCHLIST_TV_SORT_FIELD_SETTING_KEY;
        sortOrderKey = WATCHLIST_TV_SORT_ORDER_SETTING_KEY;
        descriptionPrefix = "TV Watchlist";
      }

      saveSetting(sortFieldKey, field, "View Sorting", `Sort field for ${descriptionPrefix} view`);
      saveSetting(sortOrderKey, order, "View Sorting", `Sort order for ${descriptionPrefix} view`);
    },
    [saveSetting]
  );

  const manualSortableSmartListId = nav === "smart-custom" && activeSmartList?.allowManualSort
    ? activeSmartList.id
    : null;

  const persistSmartListManualOrder = useCallback(
    (listId: string, nextKeys: string[]) => {
      const normalizedKeys = nextKeys
        .map((key) => safeStr(key))
        .filter(Boolean)
        .filter((key, index, arr) => arr.indexOf(key) === index);
      if (!listId || !normalizedKeys.length) return;
      setSmartListManualOrderKeysById((prev) => ({ ...prev, [listId]: normalizedKeys }));
      saveSetting(
        `${SMART_LIST_MANUAL_ORDER_SETTING_PREFIX}${listId}`,
        JSON.stringify(normalizedKeys),
        "Smart Lists",
        `Manual order keys for smart list ${listId}`
      );
    },
    [saveSetting]
  );

  const handleSortFieldChange = useCallback(
    (nextFieldRaw: string) => {
      const nextField =
        nextFieldRaw === MANUAL_SORT_FIELD && nav === "smart-custom" && !manualSortableSmartListId
          ? "ReleaseDate"
          : nextFieldRaw;

      setSortField(nextField);

      if (nav === "smart-custom") {
        if (!activeSmartList) return;
        if (nextField !== MANUAL_SORT_FIELD || !manualSortableSmartListId) return;
        const visibleKeys = shows.map((item) => getMediaItemKey(item));
        const previousKeys = (smartListManualOrderKeysById[activeSmartList.id] || []).filter((key) =>
          visibleKeys.includes(key)
        );
        const mergedKeys = Array.from(new Set([...previousKeys, ...visibleKeys]));
        if (!mergedKeys.length) return;
        setSmartListManualOrderKeysById((prev) => ({ ...prev, [activeSmartList.id]: mergedKeys }));
        saveSetting(
          `${SMART_LIST_MANUAL_ORDER_SETTING_PREFIX}${activeSmartList.id}`,
          JSON.stringify(mergedKeys),
          "Smart Lists",
          `Manual order keys for smart list ${activeSmartList.id}`
        );
        return;
      }

      const backlogView =
        nav === "play-next" ||
        nav === "wishlist" ||
        nav === "wishlist-books" ||
        nav === "watchlist-movies" ||
        nav === "watchlist-tv"
          ? nav
          : null;
      if (!backlogView) return;
      persistBacklogSortSettings(backlogView, nextField, sortOrder);
      if (nextField !== MANUAL_SORT_FIELD) return;

      let manualOrderKeys: string[] = resolvedWishlistManualOrderKeys;
      let manualOrderSettingKey = WISHLIST_MANUAL_ORDER_SETTING_KEY;
      let descriptionPrefix = "Wishlist (Backlog)";
      if (backlogView === "play-next") {
        manualOrderKeys = resolvedPlayNextManualOrderKeys;
        manualOrderSettingKey = PLAY_NEXT_MANUAL_ORDER_SETTING_KEY;
        descriptionPrefix = "Play Next (Backlog)";
      } else if (backlogView === "wishlist-books") {
        manualOrderKeys = resolvedReadNextManualOrderKeys;
        manualOrderSettingKey = READ_NEXT_MANUAL_ORDER_SETTING_KEY;
        descriptionPrefix = "Read Next (Books)";
      } else if (backlogView === "watchlist-movies") {
        manualOrderKeys = resolvedWatchlistMovieManualOrderKeys;
        manualOrderSettingKey = WATCHLIST_MOVIES_MANUAL_ORDER_SETTING_KEY;
        descriptionPrefix = "Movie Watchlist";
      } else if (backlogView === "watchlist-tv") {
        manualOrderKeys = resolvedWatchlistTvManualOrderKeys;
        manualOrderSettingKey = WATCHLIST_TV_MANUAL_ORDER_SETTING_KEY;
        descriptionPrefix = "TV Watchlist";
      }

      saveSetting(
        manualOrderSettingKey,
        JSON.stringify(manualOrderKeys),
        "View Sorting",
        `Manual order keys for ${descriptionPrefix} view`
      );
    },
    [
      activeSmartList,
      manualSortableSmartListId,
      nav,
      persistBacklogSortSettings,
      resolvedPlayNextManualOrderKeys,
      resolvedReadNextManualOrderKeys,
      resolvedWatchlistMovieManualOrderKeys,
      resolvedWatchlistTvManualOrderKeys,
      resolvedWishlistManualOrderKeys,
      saveSetting,
      shows,
      smartListManualOrderKeysById,
      sortOrder,
    ]
  );

  const handleSortOrderChange = useCallback(
    (nextOrder: "Asc" | "Desc") => {
      setSortOrder(nextOrder);
      const backlogView =
        nav === "play-next" ||
        nav === "wishlist" ||
        nav === "wishlist-books" ||
        nav === "watchlist-movies" ||
        nav === "watchlist-tv"
          ? nav
          : null;
      if (!backlogView) return;
      persistBacklogSortSettings(backlogView, sortField, nextOrder);
    },
    [nav, persistBacklogSortSettings, sortField]
  );

  const persistBacklogManualOrder = useCallback(
    async (
      view: "wishlist" | "wishlist-books" | "play-next" | "watchlist-movies" | "watchlist-tv",
      nextKeys: string[]
    ) => {
      const activeItemsByKey =
        view === "play-next"
          ? playNextItemsByKey
          : view === "wishlist-books"
            ? wishlistBookItemsByKey
          : view === "watchlist-movies"
            ? watchlistMovieItemsByKey
            : view === "watchlist-tv"
              ? watchlistTvItemsByKey
              : wishlistItemsByKey;
      const normalizedKeys = nextKeys
        .map((key) => safeStr(key))
        .filter(Boolean)
        .filter((key, index, arr) => arr.indexOf(key) === index)
        .filter((key) => activeItemsByKey.has(key));

      if (!normalizedKeys.length) return;

      if (view === "play-next") {
        setPlayNextManualOrderKeys(normalizedKeys);
      } else if (view === "wishlist-books") {
        setReadNextManualOrderKeys(normalizedKeys);
      } else if (view === "watchlist-movies") {
        setWatchlistMoviesManualOrderKeys(normalizedKeys);
      } else if (view === "watchlist-tv") {
        setWatchlistTvManualOrderKeys(normalizedKeys);
      } else {
        setWishlistManualOrderKeys(normalizedKeys);
      }
      setSortField(MANUAL_SORT_FIELD);
      setSortOrder("Asc");
      persistBacklogSortSettings(view, MANUAL_SORT_FIELD, "Asc");

      let manualOrderSettingKey = WISHLIST_MANUAL_ORDER_SETTING_KEY;
      let manualOrderDescription = "Manual order keys for Wishlist (Backlog) view";
      if (view === "play-next") {
        manualOrderSettingKey = PLAY_NEXT_MANUAL_ORDER_SETTING_KEY;
        manualOrderDescription = "Manual order keys for Play Next (Backlog) view";
      } else if (view === "wishlist-books") {
        manualOrderSettingKey = READ_NEXT_MANUAL_ORDER_SETTING_KEY;
        manualOrderDescription = "Manual order keys for Read Next (Books) view";
      } else if (view === "watchlist-movies") {
        manualOrderSettingKey = WATCHLIST_MOVIES_MANUAL_ORDER_SETTING_KEY;
        manualOrderDescription = "Manual order keys for Movie Watchlist view";
      } else if (view === "watchlist-tv") {
        manualOrderSettingKey = WATCHLIST_TV_MANUAL_ORDER_SETTING_KEY;
        manualOrderDescription = "Manual order keys for TV Watchlist view";
      }

      saveSetting(
        manualOrderSettingKey,
        JSON.stringify(normalizedKeys),
        "View Sorting",
        manualOrderDescription
      );

      if (view !== "wishlist") return;

      const orderByKey = new Map(normalizedKeys.map((key, index) => [key, String(index + 1)]));
      setGameRows((prev) =>
        prev.map((row) => {
          const title = safeStr(row["Title"]);
          if (!title) return row;
          const rowPlatform = normalizePlatformToken(safeStr(row["Platform"]));
          const rowKey = `game:${normalizeTitleKey(title)}:${rowPlatform || "default"}`;
          const nextOrder = orderByKey.get(rowKey);
          if (!nextOrder) return row;
          if (safeStr(row["WishlistOrder"]) === nextOrder) return row;
          return { ...row, WishlistOrder: nextOrder };
        })
      );

      const orderedItems = normalizedKeys
        .map((key) => wishlistItemsByKey.get(key))
        .filter(Boolean) as Array<(Book & { __type: "book" }) | (Game & { __type: "game" })>;

      const writes: Promise<void>[] = [];
      orderedItems.forEach((item, index) => {
        const orderValue = String(index + 1);
        const itemTitle = safeStr(item.title);
        if (item.__type !== "game" || !gamesWriteUrl) return;

        const matchIgdbId = safeStr((item as any).igdbId);
        const matchPlatform = safeStr((item as any).__renderPlatform || (item as any).platform);
        if (matchIgdbId || itemTitle) {
          writes.push(
            postSheetWrite(
              gamesWriteUrl,
              {
                action: "updateGame",
                match: {
                  igdbId: matchIgdbId,
                  title: itemTitle,
                  platform: matchPlatform,
                },
                updates: {
                  WishlistOrder: orderValue,
                },
              },
              `Failed to save wishlist order for game: ${itemTitle}`
            )
          );
        }
      });

      if (!writes.length) return;

      setSyncState("saving");
      setSyncMsg("Saving wishlist order...");
      const results = await Promise.allSettled(writes);
      const failedCount = results.filter((result) => result.status === "rejected").length;

      if (failedCount > 0) {
        setSyncState("error");
        setSyncMsg(`Saved ${writes.length - failedCount}/${writes.length} wishlist order updates`);
        return;
      }

      setSyncState("ok");
      setSyncMsg("Wishlist order saved");
      setLastSyncAt(Date.now());
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 1200);
    },
    [
      gamesWriteUrl,
      persistBacklogSortSettings,
      playNextItemsByKey,
      postSheetWrite,
      saveSetting,
      watchlistMovieItemsByKey,
      watchlistTvItemsByKey,
      wishlistBookItemsByKey,
      wishlistItemsByKey,
    ]
  );

  const wishlistVisibleKeys = useMemo(() => {
    if (
      nav !== "wishlist" &&
      nav !== "wishlist-books" &&
      nav !== "play-next" &&
      nav !== "watchlist-movies" &&
      nav !== "watchlist-tv" &&
      !manualSortableSmartListId
    ) {
      return [];
    }
    return shows.map((item) => getMediaItemKey(item));
  }, [manualSortableSmartListId, nav, shows]);

  const wishlistDragDirection = useMemo(() => {
    if (!wishlistPointerDrag?.active || !wishlistDragHoverKey) return 0;
    const dragIndex = wishlistVisibleKeys.indexOf(wishlistPointerDrag.key);
    const hoverIndex = wishlistVisibleKeys.indexOf(wishlistDragHoverKey);
    if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) return 0;
    return hoverIndex > dragIndex ? 1 : -1;
  }, [wishlistDragHoverKey, wishlistPointerDrag, wishlistVisibleKeys]);

  const wishlistDragNeighborKeys = useMemo(() => {
    const keys = new Set<string>();
    if (!wishlistPointerDrag?.active || !wishlistDragHoverKey) return keys;
    const hoverIndex = wishlistVisibleKeys.indexOf(wishlistDragHoverKey);
    if (hoverIndex === -1) return keys;
    const prevKey = wishlistVisibleKeys[hoverIndex - 1];
    const nextKey = wishlistVisibleKeys[hoverIndex + 1];
    if (prevKey) keys.add(prevKey);
    if (nextKey) keys.add(nextKey);
    keys.delete(wishlistPointerDrag.key);
    return keys;
  }, [wishlistDragHoverKey, wishlistPointerDrag, wishlistVisibleKeys]);

  const registerWishlistCaseNode = useCallback((key: string, node: HTMLDivElement | null) => {
    if (node) {
      wishlistCaseNodeMapRef.current.set(key, node);
      return;
    }
    wishlistCaseNodeMapRef.current.delete(key);
  }, []);

  const activateWishlistPointerDrag = useCallback(
    (itemKey: string) => {
      setDraggingWishlistKey(itemKey);
      suppressCaseClickRef.current = true;

      if (sortField === MANUAL_SORT_FIELD) return;

      const backlogView =
        nav === "play-next" ||
        nav === "wishlist" ||
        nav === "wishlist-books" ||
        nav === "watchlist-movies" ||
        nav === "watchlist-tv"
          ? nav
          : null;
      if (!backlogView && !manualSortableSmartListId) return;

      if (manualSortableSmartListId) {
        const nextKeys = shows.map((item) => getMediaItemKey(item));
        if (!nextKeys.length) return;
        wishlistDragLatestOrderRef.current = nextKeys;
        setSmartListManualOrderKeysById((prev) => ({
          ...prev,
          [manualSortableSmartListId]: nextKeys,
        }));
        setSortField(MANUAL_SORT_FIELD);
        setSortOrder("Asc");
        return;
      }

      if (!backlogView) return;
      const sourceItems =
        backlogView === "play-next"
          ? playNextItems
          : backlogView === "wishlist-books"
            ? wishlistBookItems
            : backlogView === "watchlist-movies"
              ? watchlistMovieItems
              : backlogView === "watchlist-tv"
                ? watchlistTvItems
                : wishlistItems;
      const sortedBacklogItems = applySorting(sourceItems as any[], sortField, sortOrder);
      const nextKeys = sortedBacklogItems.map((item) => getMediaItemKey(item));
      wishlistDragLatestOrderRef.current = nextKeys;
      if (backlogView === "play-next") {
        setPlayNextManualOrderKeys(nextKeys);
      } else if (backlogView === "wishlist-books") {
        setReadNextManualOrderKeys(nextKeys);
      } else if (backlogView === "watchlist-movies") {
        setWatchlistMoviesManualOrderKeys(nextKeys);
      } else if (backlogView === "watchlist-tv") {
        setWatchlistTvManualOrderKeys(nextKeys);
      } else {
        setWishlistManualOrderKeys(nextKeys);
      }
      setSortField(MANUAL_SORT_FIELD);
      setSortOrder("Asc");
      persistBacklogSortSettings(backlogView, MANUAL_SORT_FIELD, "Asc");
    },
    [
      applySorting,
      manualSortableSmartListId,
      nav,
      persistBacklogSortSettings,
      playNextItems,
      sortField,
      sortOrder,
      shows,
      watchlistMovieItems,
      watchlistTvItems,
      wishlistBookItems,
      wishlistItems,
    ]
  );

  const reorderWishlistDuringPointerDrag = useCallback(
    (dragKey: string, targetKey: string) => {
      if (!dragKey || !targetKey || dragKey === targetKey) return;

      const backlogView =
        nav === "play-next" ||
        nav === "wishlist" ||
        nav === "wishlist-books" ||
        nav === "watchlist-movies" ||
        nav === "watchlist-tv"
          ? nav
          : null;
      if (!backlogView && !manualSortableSmartListId) return;

      if (manualSortableSmartListId) {
        const activeItemsByKey = new Map<string, any>();
        shows.forEach((item) => {
          activeItemsByKey.set(getMediaItemKey(item), item);
        });
        const savedOrder = (smartListManualOrderKeysById[manualSortableSmartListId] || []).filter((key) =>
          activeItemsByKey.has(key)
        );
        const activeResolvedKeys = Array.from(
          new Set([...savedOrder, ...wishlistVisibleKeys.filter((key) => activeItemsByKey.has(key))])
        );
        const applyReorder = (prev: string[]) => {
          const base = prev.length
            ? prev.filter((key) => activeItemsByKey.has(key))
            : activeResolvedKeys;
          const merged = [...base];
          activeResolvedKeys.forEach((key) => {
            if (!merged.includes(key) && activeItemsByKey.has(key)) {
              merged.push(key);
            }
          });
          return moveKeyOneStepTowardTarget(merged, dragKey, targetKey);
        };
        const baseOrder =
          wishlistDragLatestOrderRef.current && wishlistDragLatestOrderRef.current.length
            ? wishlistDragLatestOrderRef.current
            : (smartListManualOrderKeysById[manualSortableSmartListId] || []);
        const nextOrder = applyReorder(baseOrder);
        wishlistDragLatestOrderRef.current = nextOrder;
        setSmartListManualOrderKeysById((prev) => ({
          ...prev,
          [manualSortableSmartListId]: nextOrder,
        }));
        return;
      }

      if (!backlogView) return;

      const activeItemsByKey =
        backlogView === "play-next"
          ? playNextItemsByKey
          : backlogView === "wishlist-books"
            ? wishlistBookItemsByKey
          : backlogView === "watchlist-movies"
            ? watchlistMovieItemsByKey
            : backlogView === "watchlist-tv"
              ? watchlistTvItemsByKey
              : wishlistItemsByKey;
      const activeResolvedKeys =
        backlogView === "play-next"
          ? resolvedPlayNextManualOrderKeys
          : backlogView === "wishlist-books"
            ? resolvedReadNextManualOrderKeys
          : backlogView === "watchlist-movies"
            ? resolvedWatchlistMovieManualOrderKeys
            : backlogView === "watchlist-tv"
              ? resolvedWatchlistTvManualOrderKeys
              : resolvedWishlistManualOrderKeys;
      const applyReorder = (prev: string[]) => {
        const base = prev.length
          ? prev.filter((key) => activeItemsByKey.has(key))
          : activeResolvedKeys;
        const merged = [...base];
        activeResolvedKeys.forEach((key) => {
          if (!merged.includes(key) && activeItemsByKey.has(key)) {
            merged.push(key);
          }
        });
        return moveKeyOneStepTowardTarget(merged, dragKey, targetKey);
      };
      const baseOrder =
        wishlistDragLatestOrderRef.current && wishlistDragLatestOrderRef.current.length
          ? wishlistDragLatestOrderRef.current
          : backlogView === "play-next"
            ? (playNextManualOrderKeys.length ? playNextManualOrderKeys : resolvedPlayNextManualOrderKeys)
            : backlogView === "wishlist-books"
              ? (readNextManualOrderKeys.length ? readNextManualOrderKeys : resolvedReadNextManualOrderKeys)
            : backlogView === "watchlist-movies"
              ? (watchlistMoviesManualOrderKeys.length ? watchlistMoviesManualOrderKeys : resolvedWatchlistMovieManualOrderKeys)
              : backlogView === "watchlist-tv"
                ? (watchlistTvManualOrderKeys.length ? watchlistTvManualOrderKeys : resolvedWatchlistTvManualOrderKeys)
                : (wishlistManualOrderKeys.length ? wishlistManualOrderKeys : resolvedWishlistManualOrderKeys);
      const nextOrder = applyReorder(baseOrder);
      wishlistDragLatestOrderRef.current = nextOrder;
      if (backlogView === "play-next") {
        setPlayNextManualOrderKeys(nextOrder);
      } else if (backlogView === "wishlist-books") {
        setReadNextManualOrderKeys(nextOrder);
      } else if (backlogView === "watchlist-movies") {
        setWatchlistMoviesManualOrderKeys(nextOrder);
      } else if (backlogView === "watchlist-tv") {
        setWatchlistTvManualOrderKeys(nextOrder);
      } else {
        setWishlistManualOrderKeys(nextOrder);
      }
    },
    [
      manualSortableSmartListId,
      nav,
      playNextManualOrderKeys,
      playNextItemsByKey,
      readNextManualOrderKeys,
      resolvedPlayNextManualOrderKeys,
      resolvedReadNextManualOrderKeys,
      resolvedWatchlistMovieManualOrderKeys,
      resolvedWatchlistTvManualOrderKeys,
      resolvedWishlistManualOrderKeys,
      shows,
      smartListManualOrderKeysById,
      watchlistMoviesManualOrderKeys,
      watchlistMovieItemsByKey,
      watchlistTvManualOrderKeys,
      watchlistTvItemsByKey,
      wishlistBookItemsByKey,
      wishlistVisibleKeys,
      wishlistManualOrderKeys,
      wishlistItemsByKey,
    ]
  );

  const findWishlistTargetKey = useCallback(
    (dragState: WishlistPointerDrag): string | null => {
      const dragKey = dragState.key;
      const dragLeft = dragState.pointerX - dragState.grabOffsetX;
      const dragTop = dragState.pointerY - dragState.grabOffsetY;
      const dragRight = dragLeft + dragState.dragWidth;
      const dragBottom = dragTop + dragState.dragHeight;
      const dragCenterX = dragLeft + dragState.dragWidth / 2;
      const dragCenterY = dragTop + dragState.dragHeight / 2;

      let centerHitKey: string | null = null;
      let centerHitScore = Number.POSITIVE_INFINITY;
      let overlapKey: string | null = null;
      let overlapArea = 0;
      let nearestKey: string | null = null;
      let nearestScore = Number.POSITIVE_INFINITY;

      wishlistVisibleKeys.forEach((key) => {
        if (key === dragKey) return;
        const node = wishlistCaseNodeMapRef.current.get(key);
        if (!node) return;
        const rect = node.getBoundingClientRect();

        const centerInsideRect =
          dragCenterX >= rect.left &&
          dragCenterX <= rect.right &&
          dragCenterY >= rect.top &&
          dragCenterY <= rect.bottom;
        if (centerInsideRect) {
          const rectCenterX = (rect.left + rect.right) / 2;
          const rectCenterY = (rect.top + rect.bottom) / 2;
          const centerScore = Math.hypot(dragCenterX - rectCenterX, (dragCenterY - rectCenterY) * 1.3);
          if (centerScore < centerHitScore) {
            centerHitScore = centerScore;
            centerHitKey = key;
          }
        }

        const overlapW = Math.max(0, Math.min(dragRight, rect.right) - Math.max(dragLeft, rect.left));
        const overlapH = Math.max(0, Math.min(dragBottom, rect.bottom) - Math.max(dragTop, rect.top));
        const nextOverlapArea = overlapW * overlapH;
        if (nextOverlapArea > overlapArea) {
          overlapArea = nextOverlapArea;
          overlapKey = key;
        }

        const dx =
          dragCenterX < rect.left ? rect.left - dragCenterX : dragCenterX > rect.right ? dragCenterX - rect.right : 0;
        const dy =
          dragCenterY < rect.top ? rect.top - dragCenterY : dragCenterY > rect.bottom ? dragCenterY - rect.bottom : 0;
        const score = Math.hypot(dx, dy * 1.6);
        if (score < nearestScore) {
          nearestScore = score;
          nearestKey = key;
        }
      });

      if (centerHitKey) return centerHitKey;
      if (overlapKey && overlapArea > 0) return overlapKey;
      const snapDistance = Math.max(16, Math.min(44, dragState.dragWidth * 0.28));
      if (!nearestKey || !Number.isFinite(nearestScore) || nearestScore > snapDistance) return null;
      return nearestKey;
    },
    [wishlistVisibleKeys]
  );

  const scheduleWishlistDragVisual = useCallback((nextDrag: WishlistPointerDrag) => {
    wishlistDragVisualPendingRef.current = nextDrag;
    if (wishlistDragVisualRafRef.current !== null) return;
    wishlistDragVisualRafRef.current = window.requestAnimationFrame(() => {
      wishlistDragVisualRafRef.current = null;
      const pending = wishlistDragVisualPendingRef.current;
      if (!pending) return;
      setWishlistPointerDrag(pending);
    });
  }, []);

  const finishWishlistPointerDrag = useCallback(
    (pointerId?: number) => {
      const drag = wishlistPointerDragRef.current;
      if (!drag) return;
      if (pointerId !== undefined && drag.pointerId !== pointerId) return;

      const draggedKey = drag.active ? drag.key : null;
      const latestDragOrder = wishlistDragLatestOrderRef.current;

      wishlistPointerDragRef.current = null;
      wishlistDragHoverTargetRef.current = null;
      wishlistDragVisualPendingRef.current = null;
      setWishlistDragHoverKey(null);
      if (wishlistDragVisualRafRef.current !== null) {
        window.cancelAnimationFrame(wishlistDragVisualRafRef.current);
        wishlistDragVisualRafRef.current = null;
      }
      setWishlistPointerDrag(null);
      setDraggingWishlistKey(null);

      const backlogView =
        nav === "play-next" ||
        nav === "wishlist" ||
        nav === "wishlist-books" ||
        nav === "watchlist-movies" ||
        nav === "watchlist-tv"
          ? nav
          : null;
      if (draggedKey && manualSortableSmartListId) {
        const finalOrder =
          latestDragOrder && latestDragOrder.length
            ? latestDragOrder
            : smartListManualOrderKeysById[manualSortableSmartListId]?.length
              ? smartListManualOrderKeysById[manualSortableSmartListId]
              : wishlistVisibleKeys;
        persistSmartListManualOrder(manualSortableSmartListId, finalOrder);
      } else if (draggedKey && backlogView) {
        const finalOrder =
          latestDragOrder && latestDragOrder.length
            ? latestDragOrder
            : backlogView === "play-next"
              ? (playNextManualOrderKeys.length ? playNextManualOrderKeys : resolvedPlayNextManualOrderKeys)
              : backlogView === "wishlist-books"
                ? (readNextManualOrderKeys.length ? readNextManualOrderKeys : resolvedReadNextManualOrderKeys)
              : backlogView === "watchlist-movies"
                ? (watchlistMoviesManualOrderKeys.length ? watchlistMoviesManualOrderKeys : resolvedWatchlistMovieManualOrderKeys)
                : backlogView === "watchlist-tv"
                  ? (watchlistTvManualOrderKeys.length ? watchlistTvManualOrderKeys : resolvedWatchlistTvManualOrderKeys)
                  : (wishlistManualOrderKeys.length ? wishlistManualOrderKeys : resolvedWishlistManualOrderKeys);
        void persistBacklogManualOrder(backlogView, finalOrder);
      }
      wishlistDragLatestOrderRef.current = null;

      if (drag.active) {
        setTimeout(() => {
          suppressCaseClickRef.current = false;
        }, 0);
      }
    },
    [
      manualSortableSmartListId,
      nav,
      persistBacklogManualOrder,
      persistSmartListManualOrder,
      playNextManualOrderKeys,
      readNextManualOrderKeys,
      resolvedPlayNextManualOrderKeys,
      resolvedReadNextManualOrderKeys,
      resolvedWatchlistMovieManualOrderKeys,
      resolvedWatchlistTvManualOrderKeys,
      resolvedWishlistManualOrderKeys,
      smartListManualOrderKeysById,
      watchlistMoviesManualOrderKeys,
      watchlistTvManualOrderKeys,
      wishlistVisibleKeys,
      wishlistManualOrderKeys,
    ]
  );

  const handleWishlistCasePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, itemKey: string) => {
      if (
        nav !== "wishlist" &&
        nav !== "wishlist-books" &&
        nav !== "play-next" &&
        nav !== "watchlist-movies" &&
        nav !== "watchlist-tv" &&
        !manualSortableSmartListId
      ) {
        return;
      }
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (wishlistPointerDragRef.current) {
        finishWishlistPointerDrag();
      }
      wishlistDragLatestOrderRef.current = null;

      const rect = event.currentTarget.getBoundingClientRect();
      const nextDrag: WishlistPointerDrag = {
        pointerId: event.pointerId,
        key: itemKey,
        startX: event.clientX,
        startY: event.clientY,
        pointerX: event.clientX,
        pointerY: event.clientY,
        grabOffsetX: event.clientX - rect.left,
        grabOffsetY: event.clientY - rect.top,
        dragWidth: rect.width,
        dragHeight: rect.height,
        momentumX: 0,
        momentumY: 0,
        active: false,
      };

      wishlistPointerDragRef.current = nextDrag;
      wishlistDragHoverTargetRef.current = null;
      setWishlistDragHoverKey(null);
      setWishlistPointerDrag(nextDrag);
      event.preventDefault();
    },
    [finishWishlistPointerDrag, manualSortableSmartListId, nav]
  );

  const handleWishlistGlobalPointerMove = useCallback(
    (event: PointerEvent) => {
      const currentDrag = wishlistPointerDragRef.current;
      if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;

      const distance = Math.hypot(event.clientX - currentDrag.startX, event.clientY - currentDrag.startY);
      const active = currentDrag.active || distance >= 2;

      const nextDrag: WishlistPointerDrag = {
        ...currentDrag,
        pointerX: event.clientX,
        pointerY: event.clientY,
        momentumX: 0,
        momentumY: 0,
        active,
      };

      wishlistPointerDragRef.current = nextDrag;
      if (!active) return;

      scheduleWishlistDragVisual(nextDrag);

      event.preventDefault();

      if (!currentDrag.active) {
        activateWishlistPointerDrag(currentDrag.key);
      }

      const targetKey = findWishlistTargetKey(nextDrag);
      if (!targetKey) {
        if (wishlistDragHoverTargetRef.current !== null) {
          wishlistDragHoverTargetRef.current = null;
          setWishlistDragHoverKey(null);
        }
        return;
      }
      if (targetKey === wishlistDragHoverTargetRef.current) return;

      wishlistDragHoverTargetRef.current = targetKey;
      setWishlistDragHoverKey(targetKey);
      reorderWishlistDuringPointerDrag(currentDrag.key, targetKey);
    },
    [activateWishlistPointerDrag, findWishlistTargetKey, reorderWishlistDuringPointerDrag, scheduleWishlistDragVisual]
  );

  const handleWishlistGlobalPointerEnd = useCallback(
    (event: PointerEvent) => {
      const currentDrag = wishlistPointerDragRef.current;
      if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;
      finishWishlistPointerDrag(event.pointerId);
    },
    [finishWishlistPointerDrag]
  );

  useEffect(() => {
    window.addEventListener("pointermove", handleWishlistGlobalPointerMove, { passive: false });
    window.addEventListener("pointerup", handleWishlistGlobalPointerEnd);
    window.addEventListener("pointercancel", handleWishlistGlobalPointerEnd);
    return () => {
      window.removeEventListener("pointermove", handleWishlistGlobalPointerMove);
      window.removeEventListener("pointerup", handleWishlistGlobalPointerEnd);
      window.removeEventListener("pointercancel", handleWishlistGlobalPointerEnd);
    };
  }, [handleWishlistGlobalPointerEnd, handleWishlistGlobalPointerMove]);

  useEffect(() => {
    return () => {
      if (wishlistDragVisualRafRef.current !== null) {
        window.cancelAnimationFrame(wishlistDragVisualRafRef.current);
      }
    };
  }, []);

  const stats = useMemo(() => {
    const wishlistBooks = allBooks.filter((b) => {
      const isWishlist = hasWishlistOwnership(b.ownership);
      const isBacklog = normalizeStatus(b.status) === "backlog";
      return isWishlist || isBacklog;
    }).length;
    const playNextGames = allGames.filter((g) =>
      PLAY_NEXT_STATUS_VALUES.has(normalizeStatus(g.status || g.playStatus || g.gameStatus))
    ).length;
    const wishlistGames = allGames.filter((g) => hasWishlistOwnership(g.ownership)).length;
    const watchlistTv = allShows.filter((s) => {
      const status = normalizeStatus(s.watchStatus);
      return status !== "completed" && status !== "abandoned";
    }).length;
    const watchlistMovies = allMovies.filter((m) => !isMovieWatched(m) && !isMovieAbandonedStatus(m)).length;

    return {
      movies: allMovies.filter((m) => isMovieWatched(m)).length,
      tv: allShows.filter((s) => normalizeStatus(s.watchStatus) !== "backlog").length,
      books: allBooks.filter((b) => hasOwnedOwnership(b.ownership)).length,
      games: allGames.filter((g) => !hasWishlistOwnership(g.ownership)).length,
      playNext: playNextGames,
      wishlistBooks,
      wishlist: wishlistGames,
      watchlistMovies,
      watchlistTv,
    };
  }, [allShows, allBooks, allMovies, allGames, hasOwnedOwnership, hasWishlistOwnership, isMovieWatched, normalizeStatus]);

  const postersPerShelf = useMemo(() => {
    const size =
      nav === "books"
        ? posterSizeBooks
        : nav === "movies"
          ? posterSizeMovies
          : nav === "games" || nav === "play-next"
            ? posterSizeGames
            : posterSizeTv;
    const usable = Math.max(0, stageWidth - SHELF_SIDE_PADDING * 2);
    return Math.max(1, Math.floor((usable + gap) / (size + gap)));
  }, [stageWidth, posterSizeTv, posterSizeMovies, posterSizeBooks, posterSizeGames, nav, gap]);

  const getItemVisualLayout = useCallback((item: any) => {
    const isBook = item.__type === "book";
    const isMovie = item.__type === "movie";
    const isGame = item.__type === "game";
    const itemSize = isBook ? posterSizeBooks : isMovie ? posterSizeMovies : isGame ? posterSizeGames : posterSizeTv;
    const caseWidth = itemSize;
    const caseHeight = isBook ? Math.round(itemSize * bookHeightMultiplier) : Math.round(itemSize * 1.5);

    const gamePlatformRaw = isGame ? safeStr(item?.__renderPlatform || item?.platform) : undefined;
    const gamePlatform = isGame ? getRenderPlatform(gamePlatformRaw) : undefined;
    const gameFrameSource = isGame ? getGameFrameSourceDimensions(gamePlatform) : DEFAULT_GAME_FRAME_SIZE;
    const srcW = isBook ? BOOK_SRC_W : isMovie ? MOVIE_SRC_W : isGame ? gameFrameSource.width : CASE_SRC_W;
    const srcH = isBook ? BOOK_SRC_H : isMovie ? MOVIE_SRC_H : isGame ? gameFrameSource.height : CASE_SRC_H;

    let insetTopVal: number;
    let insetRightVal: number;
    let insetBottomVal: number;
    let insetLeftVal: number;
    if (isBook) {
      insetTopVal = bookInsetTopPx;
      insetRightVal = bookInsetRightPx;
      insetBottomVal = bookInsetBottomPx;
      insetLeftVal = bookInsetLeftPx;
    } else if (isMovie) {
      insetTopVal = movieInsetTopPx;
      insetRightVal = movieInsetRightPx;
      insetBottomVal = movieInsetBottomPx;
      insetLeftVal = movieInsetLeftPx;
    } else if (isGame) {
      const platformKey = gamePlatform || "Default";
      const defaultInsets = platformInsets["Default"] || { top: 5, right: 5, bottom: 5, left: 5 };
      const platformInset = platformInsets[platformKey];
      const insets = platformKey !== "Default" && platformInset ? platformInset : defaultInsets;
      insetTopVal = insets.top;
      insetRightVal = insets.right;
      insetBottomVal = insets.bottom;
      insetLeftVal = insets.left;
    } else {
      insetTopVal = caseInsetTopPx;
      insetRightVal = caseInsetRightPx;
      insetBottomVal = caseInsetBottomPx;
      insetLeftVal = caseInsetLeftPx;
    }

    const insetTop = Math.round((insetTopVal / srcH) * caseHeight);
    const insetRight = Math.round((insetRightVal / srcW) * caseWidth);
    const insetBottom = Math.round((insetBottomVal / srcH) * caseHeight);
    const insetLeft = Math.round((insetLeftVal / srcW) * caseWidth);
    const insetWidth = Math.max(1, caseWidth - insetLeft - insetRight);

    if (!isGame) {
      const visualLeft = insetLeft;
      const visualWidth = insetWidth;
      return { itemSize, visualLeft, visualWidth };
    }

    const platformKey = gamePlatform || "Default";
    const coverScale = platformCoverScale[platformKey] || platformCoverScale["Default"] || { x: 100, y: 100 };
    const defaultCoverOffset = platformCoverOffset["Default"] || { x: 0, y: 0 };
    const platformCoverOffsetSettings = platformCoverOffset[platformKey] || defaultCoverOffset;
    const coverScaleX = coverScale.x / 100;
    const coverTranslateX = platformCoverOffsetSettings.x * 0.35;
    const coverTranslateXPx = (coverTranslateX / 100) * insetWidth;
    const coverVisualWidth = insetWidth * coverScaleX;
    const rawCoverLeft = insetLeft + (insetWidth - coverVisualWidth) / 2 + coverTranslateXPx;
    const rawCoverRight = rawCoverLeft + coverVisualWidth;
    const visualLeft = Math.max(0, rawCoverLeft);
    const visualRight = Math.min(caseWidth, rawCoverRight);
    const visualWidth = Math.max(1, visualRight - visualLeft);
    return { itemSize, visualLeft, visualWidth };
  }, [
    bookHeightMultiplier,
    posterSizeBooks,
    posterSizeGames,
    posterSizeMovies,
    posterSizeTv,
    getRenderPlatform,
    getGameFrameSourceDimensions,
    bookInsetTopPx,
    bookInsetRightPx,
    bookInsetBottomPx,
    bookInsetLeftPx,
    movieInsetTopPx,
    movieInsetRightPx,
    movieInsetBottomPx,
    movieInsetLeftPx,
    caseInsetTopPx,
    caseInsetRightPx,
    caseInsetBottomPx,
    caseInsetLeftPx,
    platformInsets,
    platformCoverScale,
    platformCoverOffset,
  ]);

  const shelves = useMemo(() => {
    const usable = Math.max(0, stageWidth - SHELF_SIDE_PADDING * 2);
    const out: any[][] = [];
    // Pack every shelf by rendered visual width so row edges stay consistent across all views.
    let currentShelf: any[] = [];
    let currentWidth = 0;

    for (let i = 0; i < shows.length; i++) {
      const show = shows[i];
      const { visualWidth } = getItemVisualLayout(show);
      const itemWidth = visualWidth + (currentShelf.length > 0 ? gap : 0);

      if (currentShelf.length > 0 && currentWidth + itemWidth > usable) {
        out.push(currentShelf);
        currentShelf = [show];
        currentWidth = visualWidth;
      } else {
        currentShelf.push(show);
        currentWidth += itemWidth;
      }
    }

    if (currentShelf.length > 0) out.push(currentShelf);

    const headerOffset = 140;
    const minShelves = Math.max(1, Math.ceil(Math.max(0, viewportH - headerOffset) / SHELF_HEIGHT));
    while (out.length < minShelves) out.push([]);

    return out;
  }, [shows, viewportH, SHELF_HEIGHT, stageWidth, gap, getItemVisualLayout]);

  const insetEditorOpen = settingsPopupOpen && settingsOpen.framePosition;

  const shelfRenderWindow = useMemo(() => {
    const localScroll = Math.max(0, windowScrollY - stageTopAbs);
    const viewH = Math.max(1, viewportH);
    const start = Math.max(0, Math.floor(localScroll / SHELF_HEIGHT) - 2);
    const end = Math.min(shelves.length, Math.ceil((localScroll + viewH) / SHELF_HEIGHT) + 2);
    return {
      start,
      end,
      padTop: start * SHELF_HEIGHT,
      padBottom: Math.max(0, (shelves.length - end) * SHELF_HEIGHT),
    };
  }, [shelves.length, windowScrollY, stageTopAbs, viewportH, SHELF_HEIGHT]);

  const visibleShelves = useMemo(
    () => shelves.slice(shelfRenderWindow.start, shelfRenderWindow.end),
    [shelfRenderWindow.end, shelfRenderWindow.start, shelves]
  );
  const showStartupSplash = !splashMinDurationDone || !initialLoadSettled;

  return (
    <div style={{ minHeight: "100vh", background: "#f4f1ea", color: "#111", position: "relative" }}>
      {showStartupSplash ? (
        <>
          <style>{`
            @keyframes startupSplashSpin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
          <div
            role="status"
            aria-live="polite"
            aria-label={`${APP_TITLE} is loading`}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 2147483600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(4, 8, 18, 0.12)",
              backdropFilter: "blur(2px)",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "min(calc(100vw - 18px), 1600px)",
                height: "min(calc(100vh - 18px), 980px)",
                borderRadius: "clamp(28px, 3.5vw, 52px)",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "radial-gradient(140% 90% at 50% 0%, rgba(88, 133, 215, 0.23) 0%, rgba(88, 133, 215, 0) 56%), linear-gradient(180deg, rgba(18, 34, 61, 0.82) 0%, rgba(8, 18, 38, 0.82) 100%)",
                border: "1px solid rgba(123, 165, 236, 0.42)",
                boxShadow:
                  "0 28px 80px rgba(2, 8, 18, 0.72), inset 0 0 0 1px rgba(81, 126, 201, 0.22)",
                backdropFilter: "blur(10px)",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "linear-gradient(180deg, rgba(163, 199, 255, 0.2) 0%, rgba(163, 199, 255, 0.05) 22%, rgba(163, 199, 255, 0) 58%)",
                }}
              />
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  background:
                    "radial-gradient(130% 120% at 50% 50%, rgba(10, 24, 46, 0) 42%, rgba(6, 12, 24, 0.34) 100%)",
                }}
              />
              <div
                style={{
                  position: "relative",
                  zIndex: 1,
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "clamp(30px, 5vh, 66px)",
                  padding: "clamp(22px, 5vw, 72px)",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={APP_ICON}
                  alt={APP_TITLE}
                  style={{
                    width: "clamp(420px, 56vw, 980px)",
                    maxWidth: "90%",
                    height: "auto",
                    objectFit: "contain",
                    filter: "drop-shadow(0 14px 24px rgba(0, 0, 0, 0.46))",
                  }}
                />
                <div
                  aria-hidden
                  style={{
                    width: "clamp(92px, 11vw, 160px)",
                    height: "clamp(92px, 11vw, 160px)",
                    borderRadius: "50%",
                    border: "clamp(8px, 0.9vw, 12px) solid rgba(126, 167, 243, 0.28)",
                    borderTopColor: "#82b3ff",
                    borderRightColor: "#b4d0ff",
                    boxShadow: "0 0 28px rgba(89, 141, 240, 0.48)",
                    animation: "startupSplashSpin 860ms linear infinite",
                  }}
                />
              </div>
            </div>
          </div>
        </>
      ) : null}
      {nav !== "statistics" ? (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: topSafeInset,
            left: 0,
            right: 0,
            height: 45,
            zIndex: 1300,
            pointerEvents: "none",
            backgroundImage: `url(${currentTopHeaderImage})`,
            backgroundRepeat: "repeat-x",
            backgroundPosition: "0 0",
            backgroundSize: "auto 45px",
            boxShadow: "inset 0 16px 24px rgba(0, 0, 0, 0.42)",
          }}
        />
      ) : null}
      {/* Main layout: Sidebar + Content */}
      <div
        style={{
          position: "relative",
          width: "100%",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: `${SIDEBAR_WIDTH}px 1fr`,
          gap: 0,
          alignItems: "stretch",
        }}
      >
        {/* LEFT MENU */}
        <aside
          className="sidebar"
          style={{
            position: "sticky",
            top: topSafeInset,
            zIndex: settingsPopupOpen ? POPUP_PANEL_Z_INDEX + 1 : 1400,
            alignSelf: "start",
            height: "100vh",
            minHeight: "100vh",
            borderRadius: "0 0 0 0",
            isolation: "isolate",
            overflowY: "visible",
            overflowX: "visible",
            background: "transparent",
            border: "none",
            boxShadow: "none",
            display: "flex",
            flexDirection: "column",
            padding: "6px",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 43,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 0,
              pointerEvents: "none",
              backgroundImage: `url(${shelfTheme})`,
              backgroundRepeat: "repeat-y",
              backgroundPosition: "center top",
              backgroundSize: `100% ${SHELF_HEIGHT}px`,
            }}
          />
          <div
            ref={debugHeaderLayerRef}
            aria-hidden
            style={{
              display: SHOW_HEADER_DEBUG_CONTROLS ? "block" : "none",
              position: "absolute",
              top: -1,
              left: -220,
              right: -220,
              height: 45,
              zIndex: 0,
              pointerEvents: "none",
              backgroundImage: `url(${currentTopHeaderImage})`,
              backgroundRepeat: "repeat-x",
              backgroundPosition: "0 0",
              backgroundSize: "auto 45px",
              boxShadow: "inset 0 16px 24px rgba(0, 0, 0, 0.42)",
              transform: "translate3d(0, 0, 0) scaleX(-1)",
            }}
          />
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 6,
              zIndex: 1,
              pointerEvents: "none",
              borderRadius: 16,
              overflow: "hidden",
              opacity: sidebarTheme === "winterGray" ? 0.8 : sidebarTheme === "darkBlue" ? 0.9 : 0.84,
              backgroundImage: currentTheme.background,
              backgroundSize: "auto, 100% 100%",
              backgroundPosition: "0 0, 0 0",
            }}
          />
          {/* Transparent module bubble wrapper */}
          <div
            className="sidebarScrollContent"
            style={{
              position: "relative",
              zIndex: 2,
              background: "rgba(255, 255, 255, 0.125)",
              borderRadius: 16,
              boxShadow:
                "-2px 0 5px rgba(0, 0, 0, 0.2), 2px 0 4px rgba(0, 0, 0, 0.5), 6px 0 10px rgba(0, 0, 0, 0.4), 12px 0 18px rgba(0, 0, 0, 0.3), 20px 0 30px rgba(0, 0, 0, 0.22), 30px 0 44px rgba(0, 0, 0, 0.14), 6px 8px 16px rgba(0, 0, 0, 0.14)",
              border: "none",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
              overflowY: "auto",
            }}
          >
          {/* Logo header with stats */}
          <div
            style={{
              background: "transparent",
              borderBottom: "none",
              padding: "0px 8px 10px 8px",
              border: "none",
              overflow: "visible",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 8,
              minHeight: "auto",
            }}
          >
            {/* Logo taking full width */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={sidebarTheme === "darkBlue" ? "/logo5.png" : APP_ICON}
              alt={APP_TITLE}
              style={{
                width: logoSize,
                height: "auto",
                objectFit: "contain",
                objectPosition: "center",
                flexShrink: 0,
                marginTop: logoTop,
                marginLeft: logoLeft,
                filter: "drop-shadow(0 2px 4px rgba(0, 0, 0, 0.45))",
              }}
            />
          </div>

          {/* Rolodex Counter */}
          {!loading && (
            <div style={{ padding: "10px 10px 0 10px", display: "flex", justifyContent: "center" }}>
              <RolodexCounter 
                value={shows.length} 
                digitHeight={counterTileSize}
                digitWidth={Math.round(counterTileSize * 0.73)}
                spacing={counterTileSpacing}
                numberFontSize={counterNumberFontSize}
                labelFontSize={counterLabelFontSize}
                labelFontWeight={counterLabelFontWeight}
                labelTop={counterLabelTop}
                labelLeft={counterLabelLeft}
                counterTop={counterTop}
                counterLeft={counterLeft}
                labelColor={currentTheme.rolodexLabelColor}
                commaColor={currentTheme.rolodexColor}
                digitNumberColor={currentTheme.rolodexDigitColor}
                digitTileBackground={currentTheme.rolodexTileBg}
                digitTileBorder={currentTheme.rolodexTileBorder}
              />
            </div>
          )}

          <div style={{ padding: "0 8px", display: "flex", flexDirection: "column", gap: 6, flex: 1, marginTop: 12 }}>
            {/* Library Module */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.125)",
                borderRadius: 16,
                boxShadow: "-16px 0 26px rgba(0, 0, 0, 0.28), -6px 0 10px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(255, 255, 255, 0.4), 0 6px 12px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.7), inset 0 0 40px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                borderBottom: "1px solid rgba(0, 0, 0, 0.15)",
                padding: "12px",
              }}
            >
              <div style={{ padding: "0px", display: "flex", flexDirection: "column", gap: 0 }}>
              <div
                style={{
                  fontSize: sidebarHeaderFontSize,
                  fontWeight: sidebarHeaderFontWeight,
                  letterSpacing: "0.04em",
                  color: currentTheme.primaryColor,
                  marginBottom: 6,
                  fontFamily: "Nunito, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>LIBRARY</span>
                <span />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <button
                  onClick={() => setNav("home")}
                  className={`sideItem ${nav === "home" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "home" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "home" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("home", "/icon-home.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "home")} title={uploadingSidebarIconKey === "home" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Home
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 16, fontWeight: 400 }}>›</span>
                </button>
                <button
                  onClick={() => {
                    setNav("books");
                    setOpenSection((s) => (s === "books" ? null : "books"));
                  }}
                  className={`sideItem ${nav === "books" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "books" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "books" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("books", "/icon-books.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "books")} title={uploadingSidebarIconKey === "books" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Books
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "books" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background: sidebarTheme === "winterGray" ? currentTheme.countBubbleColor : "#6ba56a",
                        color: "#fff",
                      }}
                    >
                      {stats.books}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                {openSection === "books" ? (
                  <div style={{ marginTop: 6, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => setReadingStatusOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Reading Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>+</span>
                    </button>
                    {readingStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {readingStatuses.map((status) => {
                          const active = readingStatusFilter === status;
                          return (
                            <button
                              key={`reading-${status}`}
                              onClick={() => setReadingStatusFilter(active ? null : status)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {readingStatusCounts[status] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setFormatOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Formats</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>+</span>
                    </button>
                    {formatOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {bookFormats.map((format) => {
                          const active = formatFilter === format;
                          return (
                            <button
                              key={`format-${format}`}
                              onClick={() => setFormatFilter(active ? null : format)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {format}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {formatCounts[format] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setSeriesOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Series</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>+</span>
                    </button>
                    {seriesOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {bookSeries.map((series) => {
                          const active = seriesFilter === series;
                          return (
                            <button
                              key={`series-${series}`}
                              onClick={() => setSeriesFilter(active ? null : series)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {series}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {seriesCounts[series] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setGenreOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Categories</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{genreOpen ? "−" : "+"}</span>
                    </button>
                    {genreOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {bookGenres.map((genre) => {
                          const active = genreFilter === genre;
                          return (
                            <button
                              key={`genre-${genre}`}
                              onClick={() => setGenreFilter(active ? null : genre)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {genre}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {genreCounts[genre] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setWishlistOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Wishlist</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{wishlistOpen ? "−" : "+"}</span>
                    </button>
                    {wishlistOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <button
                          onClick={() => setWishlistFilter((v) => !v)}
                          className={`sideSubItem ${wishlistFilter ? "active" : ""}`}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                            Wishlist Books
                          </span>
                          <span
                            style={{
                              minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                              textAlign: "center",
                              background: wishlistFilter ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                              color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                              border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {wishlistCount}
                          </span>
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    setMovieWatchFilter(null);
                    setMovieGenreFilter(null);
                    setNav("movies");
                    setOpenSection((s) => (s === "movies" ? null : "movies"));
                  }}
                  className={`sideItem ${nav === "movies" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "movies" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "movies" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("movies", "/icon-movies.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "movies")} title={uploadingSidebarIconKey === "movies" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Movies
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "movies" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background: sidebarTheme === "winterGray" ? currentTheme.countBubbleColor : "#5b9bd5",
                        color: "#fff",
                      }}
                    >
                      {stats.movies}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                {openSection === "movies" ? (
                  <div style={{ marginTop: 6, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => setMovieWatchStatusOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Watch Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{movieWatchStatusOpen ? "−" : "+"}</span>
                    </button>
                    {movieWatchStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {["Watched", "Watching", "Backlog", "Abandoned"].map((status) => {
                          const active = movieWatchFilter === status;
                          return (
                            <button
                              key={`movie-watch-${status}`}
                              onClick={() => setMovieWatchFilter(active ? null : status)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {movieWatchCounts[status] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setMovieGenreOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Genre</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{movieGenreOpen ? "−" : "+"}</span>
                    </button>
                    {movieGenreOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {movieGenres.map((genre) => {
                          const active = movieGenreFilter === genre;
                          return (
                            <button
                              key={`movie-genre-${genre}`}
                              onClick={() => setMovieGenreFilter(active ? null : genre)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {genre}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {movieGenreCounts[genre] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    setWatchFilter(null);
                    setShowFilter(null);
                    setTagFilter(null);
                    setNav("tv");
                    setOpenSection((s) => (s === "tv" ? null : "tv"));
                  }}
                  className={`sideItem primary ${nav === "tv" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "tv" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "tv" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("tv", "/icon-tv.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "tv")} title={uploadingSidebarIconKey === "tv" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    TV Shows
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "tv" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background: sidebarTheme === "winterGray" ? currentTheme.countBubbleColor : "#d97642",
                        color: "#fff",
                      }}
                    >
                      {stats.tv}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                {openSection === "tv" ? (
                  <div style={{ marginTop: 6, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => setWatchStatusOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Watch Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>+</span>
                    </button>
                    {watchStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {watchStatuses.map((status) => {
                          const active = watchFilter === status;
                          return (
                            <button
                              key={`watch-${status}`}
                              onClick={() => setWatchFilter(active ? null : status)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {watchCounts[status] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setShowStatusOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Show Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>+</span>
                    </button>
                    {showStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {showStatuses.map((status) => {
                          const active = showFilter === status;
                          return (
                            <button
                              key={`show-${status}`}
                              onClick={() => setShowFilter(active ? null : status)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {showCounts[status] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setTagOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Tags</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{tagOpen ? "−" : "+"}</span>
                    </button>
                    {tagOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {tvTags.map((tag) => {
                          const active = tagFilter === tag;
                          return (
                            <button
                              key={`tag-${tag}`}
                              onClick={() => setTagFilter(active ? null : tag)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {tag}
                              </span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {tvTagCounts[tag] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <button
                  onClick={() => {
                    setGamePlatformFilter(null);
                    setGameStatusFilter(null);
                    setGameOwnershipFilter(null);
                    setGameFormatFilter(null);
                    setGameYearPlayedFilter(null);
                    setGameGenreFilter(null);
                    setNav("games");
                    setOpenSection((s) => (s === "games" ? null : "games"));
                  }}
                  className={`sideItem ${nav === "games" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "games" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "games" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("games", "/icon-games.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "games")} title={uploadingSidebarIconKey === "games" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Games
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "games" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background:
                          sidebarTheme === "darkBlue"
                            ? "rgba(26, 47, 92, 0.95)"
                            : sidebarTheme === "winterGray"
                              ? currentTheme.countBubbleColor
                              : "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.games}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                {openSection === "games" ? (
                  <div style={{ marginTop: 6, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 8 }}>
                    <button
                      onClick={() => setGamePlatformOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Platform</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{gamePlatformOpen ? "−" : "+"}</span>
                    </button>
                    {gamePlatformOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 3, alignItems: "stretch", width: "fit-content", maxWidth: "100%" }}>
                        {gamePlatformOptions.map((option) => {
                          const active = gamePlatformFilter === option;
                          return (
                            <button
                              key={`game-platform-${option}`}
                              onClick={() => setGamePlatformFilter(active ? null : option)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>{option}</span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {gamePlatformCounts[option] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setGameStatusOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{gameStatusOpen ? "−" : "+"}</span>
                    </button>
                    {gameStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {gameStatuses.map((option) => {
                          const active = gameStatusFilter === option;
                          return (
                            <button
                              key={`game-status-${option}`}
                              onClick={() => setGameStatusFilter(active ? null : option)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>{option}</span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {gameStatusCounts[option] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setGameOwnershipOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Ownership</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{gameOwnershipOpen ? "−" : "+"}</span>
                    </button>
                    {gameOwnershipOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {gameOwnershipOptions.map((option) => {
                          const active = gameOwnershipFilter === option;
                          return (
                            <button
                              key={`game-ownership-${option}`}
                              onClick={() => setGameOwnershipFilter(active ? null : option)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>{option}</span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {gameOwnershipCounts[option] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setGameFormatOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Format</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{gameFormatOpen ? "−" : "+"}</span>
                    </button>
                    {gameFormatOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {gameFormatOptions.map((option) => {
                          const active = gameFormatFilter === option;
                          return (
                            <button
                              key={`game-format-${option}`}
                              onClick={() => setGameFormatFilter(active ? null : option)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>{option}</span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {gameFormatCounts[option] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setGameYearPlayedOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Year Played</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{gameYearPlayedOpen ? "−" : "+"}</span>
                    </button>
                    {gameYearPlayedOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {gameYearPlayedOptions.map((option) => {
                          const active = gameYearPlayedFilter === option;
                          return (
                            <button
                              key={`game-year-played-${option}`}
                              onClick={() => setGameYearPlayedFilter(active ? null : option)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>{option}</span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {gameYearPlayedCounts[option] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setGameGenresOpen((v) => !v)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        border: "none",
                        background: "transparent",
                        padding: 0,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Genres</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 12, fontFamily: "Nunito, sans-serif" }}>{gameGenresOpen ? "−" : "+"}</span>
                    </button>
                    {gameGenresOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {gameGenres.map((option) => {
                          const active = gameGenreFilter === option;
                          return (
                            <button
                              key={`game-genre-${option}`}
                              onClick={() => setGameGenreFilter(active ? null : option)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>{option}</span>
                              <span
                                style={{
                                  minWidth: 16,
                                  height: 14,
                                  padding: "0 4px",
                                  borderRadius: 8,
                                  fontSize: 10,
                                  textAlign: "center",
                                  background: active ? (sidebarTheme === "darkBlue" ? "rgba(92, 136, 206, 0.46)" : "rgba(140,58,58,0.25)") : (sidebarTheme === "darkBlue" ? "rgba(17, 40, 78, 0.68)" : "rgba(0,0,0,0.06)"),
                                  color: sidebarTheme === "darkBlue" ? "rgba(241, 248, 255, 0.98)" : "#333",
                                  border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {gameGenreCounts[option] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div
                  style={{
                    marginTop: 16,
                    marginBottom: 6,
                    fontSize: sidebarHeaderFontSize,
                    fontWeight: sidebarHeaderFontWeight,
                    letterSpacing: "0.04em",
                    color: currentTheme.primaryColor,
                    fontFamily: "Nunito, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <span>BACKLOG</span>
                  <span />
                </div>

                <button
                  onClick={() => {
                    setNav("play-next");
                    setOpenSection((s) => (s === "play-next" ? null : "play-next"));
                  }}
                  className={`sideItem ${nav === "play-next" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "play-next" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "play-next" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("play-next", "/icon-other.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "play-next")} title={uploadingSidebarIconKey === "play-next" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Play Next
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "play-next" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background:
                          sidebarTheme === "darkBlue"
                            ? "rgba(92, 118, 164, 0.95)"
                            : sidebarTheme === "winterGray"
                              ? currentTheme.countBubbleColor
                              : "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.playNext}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setNav("wishlist-books");
                    setOpenSection((s) => (s === "wishlist-books" ? null : "wishlist-books"));
                  }}
                  className={`sideItem ${nav === "wishlist-books" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "wishlist-books" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "wishlist-books" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("wishlist-books", "/icon-other.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "wishlist-books")} title={uploadingSidebarIconKey === "wishlist-books" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Read Next
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "wishlist-books" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background:
                          sidebarTheme === "darkBlue"
                            ? "rgba(112, 88, 174, 0.95)"
                            : sidebarTheme === "winterGray"
                              ? currentTheme.countBubbleColor
                              : "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.wishlistBooks}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setNav("watchlist-movies");
                    setOpenSection((s) => (s === "watchlist-movies" ? null : "watchlist-movies"));
                  }}
                  className={`sideItem ${nav === "watchlist-movies" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "watchlist-movies" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "watchlist-movies" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("watchlist-movies", "/icon-watchlist.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "watchlist-movies")} title={uploadingSidebarIconKey === "watchlist-movies" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Movie Watchlist
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "watchlist-movies" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background:
                          sidebarTheme === "darkBlue"
                            ? "rgba(56, 142, 173, 0.95)"
                            : sidebarTheme === "winterGray"
                              ? currentTheme.countBubbleColor
                              : "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.watchlistMovies}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                <button
                  onClick={() => {
                    setNav("watchlist-tv");
                    setOpenSection((s) => (s === "watchlist-tv" ? null : "watchlist-tv"));
                  }}
                  className={`sideItem ${nav === "watchlist-tv" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "watchlist-tv" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "watchlist-tv" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("watchlist-tv", "/icon-watchlist.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "watchlist-tv")} title={uploadingSidebarIconKey === "watchlist-tv" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    TV Watchlist
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "watchlist-tv" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background:
                          sidebarTheme === "darkBlue"
                            ? "rgba(56, 142, 173, 0.95)"
                            : sidebarTheme === "winterGray"
                              ? currentTheme.countBubbleColor
                              : "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.watchlistTv}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>
                <button
                  onClick={() => {
                    setNav("wishlist");
                    setOpenSection((s) => (s === "wishlist" ? null : "wishlist"));
                  }}
                  className={`sideItem ${nav === "wishlist" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "wishlist" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "wishlist" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("wishlist-games", "/icon-wishlist.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "wishlist-games")} title={uploadingSidebarIconKey === "wishlist-games" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Wishlist (Games)
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 38,
                        height: 18,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "wishlist" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background:
                          sidebarTheme === "darkBlue"
                            ? "rgba(112, 88, 174, 0.95)"
                            : sidebarTheme === "winterGray"
                              ? currentTheme.countBubbleColor
                              : "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.wishlist}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>
              </div>

              {/* SMART LISTS section */}
              <div style={{ marginTop: "16px" }}>
              <button
                type="button"
                onClick={() => setSmartListsOpen(!smartListsOpen)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  fontSize: sidebarHeaderFontSize,
                  fontWeight: sidebarHeaderFontWeight,
                  letterSpacing: "0.04em",
                  color: currentTheme.primaryColor,
                  marginBottom: 6,
                  fontFamily: "Nunito, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <span>SMART LISTS</span>
                <span style={{ color: "rgba(0,0,0,0.5)", fontSize: 16, fontWeight: 500 }}>{smartListsOpen ? "−" : "+"}</span>
              </button>

              {smartListsOpen ? <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                {/* This Year - Primary clickable */}
                <button
                  onClick={() => setNav("year-this")}
                  className={`sideItem ${nav === "year-this" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "year-this" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "year-this" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("year-this", "/icon-year.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "year-this")} title={uploadingSidebarIconKey === "year-this" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    This Year
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>
                <button
                  onClick={() => setNav("current")}
                  className={`sideItem ${nav === "current" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "current" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "current" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("current", "/icon-current.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "current")} title={uploadingSidebarIconKey === "current" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Current
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>
                <button
                  onClick={() => setNav("completed")}
                  className={`sideItem ${nav === "completed" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "completed" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "completed" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("completed", "/icon-completed.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "completed")} title={uploadingSidebarIconKey === "completed" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Completed
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>
                <button
                  onClick={() => setNav("abandoned")}
                  className={`sideItem ${nav === "abandoned" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "abandoned" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "abandoned" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("abandoned", "/icon-abaonded.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "abandoned")} title={uploadingSidebarIconKey === "abandoned" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Abandoned
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>

                {customSmartLists.map((smartList) => {
                  const isActive = nav === "smart-custom" && selectedSmartListId === smartList.id;
                  const iconSrc = safeStr(smartList.icon);
                  const defaultSortField =
                    smartList.allowManualSort || smartList.defaultSortField !== MANUAL_SORT_FIELD
                      ? smartList.defaultSortField
                      : "ReleaseDate";
                  const hasSavedManualOrder = Boolean(
                    smartList.allowManualSort && (smartListManualOrderKeysById[smartList.id] || []).length
                  );
                  const shouldUseManualSort =
                    smartList.allowManualSort &&
                    (defaultSortField === MANUAL_SORT_FIELD || hasSavedManualOrder);
                  return (
                    <div
                      key={smartList.id}
                      style={{
                        width: "100%",
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSmartListId(smartList.id);
                          setNav("smart-custom");
                          setSortField(shouldUseManualSort ? MANUAL_SORT_FIELD : defaultSortField);
                          setSortOrder(shouldUseManualSort ? "Asc" : smartList.defaultSortOrder);
                        }}
                        className={`sideItem ${isActive ? "active" : ""}`}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          border: "none",
                          borderRadius: 0,
                          background: "transparent",
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: isActive ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                          <span
                            aria-hidden
                            style={{
                              width: 18,
                              height: 14,
                              borderRadius: 4,
                              background: isActive ? "rgba(0,0,0,0.05)" : "transparent",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flex: "0 0 auto",
                              overflow: "hidden",
                            }}
                          >
                            {iconSrc ? (
                              <img src={iconSrc} alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                            ) : (
                              <span style={{ fontSize: 10, opacity: 0.6, lineHeight: 1 }}>□</span>
                            )}
                          </span>
                          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 126 }}>
                            {smartList.name}
                          </span>
                        </span>
                        <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                      </button>
                    </div>
                  );
                })}

                <button
                  type="button"
                  onClick={handleOpenSmartListBuilder}
                  style={{
                    width: "100%",
                    marginTop: 4,
                    marginBottom: customSmartLists.length ? 0 : 4,
                    textAlign: "left",
                    border: "1px solid rgba(118, 162, 214, 0.55)",
                    borderRadius: 10,
                    padding: "6px 8px",
                    background: "linear-gradient(180deg, rgba(26, 45, 74, 0.76) 0%, rgba(16, 30, 52, 0.8) 100%)",
                    boxShadow: "0 10px 22px rgba(4, 12, 26, 0.3), inset 0 1px 0 rgba(188, 220, 255, 0.22)",
                    color: "rgba(222, 240, 255, 0.98)",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "Nunito, sans-serif",
                    letterSpacing: "0.01em",
                    cursor: "pointer",
                  }}
                >
                  + Add Smart List
                </button>

              </div> : null}
            </div>
            </div>
            </div>

            {/* DISCOVER Module */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.125)",
                borderRadius: 16,
                boxShadow: "-16px 0 26px rgba(0, 0, 0, 0.28), -6px 0 10px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(255, 255, 255, 0.4), 0 6px 12px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.7), inset 0 0 40px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                borderBottom: "1px solid rgba(0, 0, 0, 0.15)",
                padding: "12px",
              }}
            >
              <div style={{ padding: "0px", display: "flex", flexDirection: "column", gap: 0 }}>
              <button
                type="button"
                onClick={() => {
                  if (discoverOpen) setShowThemes(false);
                  setDiscoverOpen(!discoverOpen);
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  fontSize: sidebarHeaderFontSize,
                  fontWeight: sidebarHeaderFontWeight,
                  letterSpacing: "0.04em",
                  color: currentTheme.primaryColor,
                  marginBottom: 6,
                  fontFamily: "Nunito, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  border: "none",
                  background: "transparent",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <span>DISCOVER</span>
                <span style={{ color: "rgba(0,0,0,0.5)", fontSize: 16, fontWeight: 500 }}>{discoverOpen ? "−" : "+"}</span>
              </button>

              {discoverOpen ? <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <button
                  onClick={() => {
                    setNav("statistics");
                    setShowThemes(false);
                    setSortPopupOpen(false);
                    setSettingsPopupOpen(false);
                    setFaqPopupOpen(false);
                    setShowVersionNotes(false);
                  }}
                  className={`sideItem ${nav === "statistics" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "statistics" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "statistics" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("statistics", "/icon-statistics.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "statistics")} title={uploadingSidebarIconKey === "statistics" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Statistics
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>

                <button
                  onClick={() => {
                    setShowThemes(!showThemes);
                  }}
                  className={`sideItem primary ${showThemes ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: showThemes ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: showThemes ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src={getSidebarIconSrc("themes", "/icon-theme.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "themes")} title={uploadingSidebarIconKey === "themes" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Themes
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>

              </div> : null}
            </div>
            </div>

            {discoverOpen && showThemes ? (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                {themeSaveNotice ? (
                  <div
                    style={{
                      fontSize: 11,
                      color: "#0a7f2e",
                      background: "rgba(10,127,46,0.12)",
                      border: "1px solid rgba(10,127,46,0.35)",
                      borderRadius: 6,
                      padding: "6px 8px",
                    }}
                  >
                    {themeSaveNotice}
                  </div>
                ) : null}
                <div style={{ fontSize: 11, color: "rgba(0,0,0,0.68)" }}>
                  Theme changes auto-save immediately and are used next time.
                </div>
                {/* Sidebar Theme Section */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A" }}>SIDEBAR THEME</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => updateSidebarTheme("standard")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: sidebarTheme === "standard" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: sidebarTheme === "standard" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: sidebarTheme === "standard" ? 600 : 400,
                    }}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => updateSidebarTheme("winterGray")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: sidebarTheme === "winterGray" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: sidebarTheme === "winterGray" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: sidebarTheme === "winterGray" ? 600 : 400,
                    }}
                  >
                    Winter Gray
                  </button>
                  <button
                    onClick={() => updateSidebarTheme("darkBlue")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: sidebarTheme === "darkBlue" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: sidebarTheme === "darkBlue" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: sidebarTheme === "darkBlue" ? 600 : 400,
                    }}
                  >
                    Dark Blue
                  </button>
                </div>
                
                {/* Shelf Wood Type Section */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A", marginTop: 8 }}>SHELF WOOD TYPE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => updateShelfTheme("/shelves-light-single2.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelves-light-single2.png" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelves-light-single2.png" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: shelfTheme === "/shelves-light-single2.png" ? 600 : 400,
                    }}
                  >
                    Default (Light Oak)
                  </button>
                  <button
                    onClick={() => updateShelfTheme("/shelf-dark-walnut.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelf-dark-walnut.png" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-dark-walnut.png" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: shelfTheme === "/shelf-dark-walnut.png" ? 600 : 400,
                    }}
                  >
                    Dark Walnut
                  </button>
                  <button
                    onClick={() => updateShelfTheme(WEATHERED_OAK_SHELF_IMAGE)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === WEATHERED_OAK_SHELF_IMAGE ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === WEATHERED_OAK_SHELF_IMAGE ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: shelfTheme === WEATHERED_OAK_SHELF_IMAGE ? 600 : 400,
                    }}
                  >
                    Weathered Oak
                  </button>
                  <button
                    onClick={() => updateShelfTheme("/shelf-honey-oak.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelf-honey-oak.png" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-honey-oak.png" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: shelfTheme === "/shelf-honey-oak.png" ? 600 : 400,
                    }}
                  >
                    Honey Oak
                  </button>
                  <button
                    onClick={() => updateShelfTheme("/shelf-teak.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelf-teak.png" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-teak.png" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: shelfTheme === "/shelf-teak.png" ? 600 : 400,
                    }}
                  >
                    Teak
                  </button>
                  <button
                    onClick={() => updateShelfTheme("/shelf_white_oak.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelf_white_oak.png" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf_white_oak.png" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: shelfTheme === "/shelf_white_oak.png" ? 600 : 400,
                    }}
                  >
                    White Oak
                  </button>
                  <button
                    onClick={() => updateShelfTheme("/shelf-reclaimed-oak.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelf-reclaimed-oak.png" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-reclaimed-oak.png" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: shelfTheme === "/shelf-reclaimed-oak.png" ? 600 : 400,
                    }}
                  >
                    Reclaimed Oak
                  </button>
                </div>
              </div>
            ) : null}

            {settingsPopupOpen && typeof document !== "undefined" ? createPortal(
              <div
                ref={settingsWindowRef}
                onPointerDown={handleSettingsWindowPointerDown}
                onPointerMove={handleSettingsWindowPointerMove}
                onPointerUp={handleSettingsWindowPointerUp}
                onPointerCancel={handleSettingsWindowPointerUp}
                style={{
                  position: "fixed",
                  top: settingsWindowPosition?.y ?? SETTINGS_WINDOW_START_Y,
                  ...(settingsWindowPosition ? { left: settingsWindowPosition.x } : { right: SETTINGS_WINDOW_MARGIN }),
                  width: `min(${SETTINGS_WINDOW_DEFAULT_WIDTH}px, calc(100vw - ${SETTINGS_WINDOW_MARGIN * 2}px))`,
                  maxHeight: `calc(100vh - ${SETTINGS_WINDOW_START_Y + SETTINGS_WINDOW_MARGIN}px)`,
                  overflowY: "auto",
                  zIndex: SETTINGS_WINDOW_Z_INDEX,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  background: "rgba(248, 244, 236, 0.98)",
                  border: "1px solid rgba(58, 37, 24, 0.38)",
                  borderRadius: 14,
                  boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
                  backdropFilter: "blur(2px)",
                }}
              >
                {settingsPopupOpen ? (
                  <>
                    <div
                      data-settings-window-drag-handle="true"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        paddingBottom: 8,
                        borderBottom: "1px solid rgba(0,0,0,0.12)",
                        cursor: "grab",
                        userSelect: "none",
                        touchAction: "none",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 800, color: "#5c3c38" }}>Settings</span>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <button
                          onClick={() => setShowVersionNotes((prev) => !prev)}
                          title="Show recent version notes"
                          aria-label="Show recent version notes"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: 54,
                            padding: "4px 8px",
                            background: "rgba(255,255,255,0.85)",
                            border: "1px solid rgba(0,0,0,0.2)",
                            borderRadius: 8,
                            color: "#5c3c38",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 800,
                            letterSpacing: "0.03em",
                            lineHeight: 1,
                          }}
                        >
                          v{APP_VERSION}
                        </button>
                        <button
                          onClick={() => {
                            setSettingsPopupOpen(false);
                            setShowVersionNotes(false);
                          }}
                          style={{
                            border: "1px solid rgba(0,0,0,0.2)",
                            background: "rgba(255,255,255,0.85)",
                            color: "#5c3c38",
                            borderRadius: 8,
                            padding: "4px 8px",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                    {showVersionNotes ? (
                      <div
                        style={{
                          marginTop: 2,
                          marginBottom: 10,
                          borderRadius: 9,
                          border: "1px solid rgba(0,0,0,0.14)",
                          background: "rgba(249, 245, 236, 0.97)",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.14)",
                          padding: 10,
                          textAlign: "left",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#5c3c38", marginBottom: 8 }}>Recent Version Notes</div>
                        {VERSION_HISTORY.slice(0, 3).map((entry) => (
                          <div key={entry.version} style={{ marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#3f2e1f" }}>
                              v{entry.version} <span style={{ opacity: 0.6, fontWeight: 600 }}>({entry.date})</span>
                            </div>
                            <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 11, lineHeight: 1.35, color: "#4b3c31" }}>
                              {entry.notes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : null}
                {/* Cover Size */}
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A" }}>COVER SIZE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                    TV Size
                    <input
                      type="range"
                      min={70}
                      max={125}
                      step={5}
                      value={posterSizeTv}
                      onChange={(e) => updatePosterSizeTv(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: "right" }}>{posterSizeTv}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                    Movies Size
                    <input
                      type="range"
                      min={70}
                      max={125}
                      step={5}
                      value={posterSizeMovies}
                      onChange={(e) => updatePosterSizeMovies(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: "right" }}>{posterSizeMovies}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                    Books Size
                    <input
                      type="range"
                      min={70}
                      max={125}
                      step={5}
                      value={posterSizeBooks}
                      onChange={(e) => updatePosterSizeBooks(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: "right" }}>{posterSizeBooks}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                    Games Size
                    <input
                      type="range"
                      min={70}
                      max={125}
                      step={5}
                      value={posterSizeGames}
                      onChange={(e) => updatePosterSizeGames(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: "right" }}>{posterSizeGames}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                    Cover Gap Size
                    <input
                      type="range"
                      min={0}
                      max={60}
                      step={1}
                      value={coverGapSize}
                      onChange={(e) => updateCoverGapSize(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: "right" }}>{coverGapSize}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                    <input type="checkbox" checked={tight} onChange={(e) => updateTight(e.target.checked)} />
                    Tight
                  </label>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    Frame: {CASE_SRC_W}×{CASE_SRC_H}
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                    <input
                      type="checkbox"
                      checked={showInsetGuide}
                      onChange={(e) => updateShowInsetGuide(e.target.checked)}
                    />
                    Frame
                  </label>
                </div>

                {/* COVER INSETS Parent Menu */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, framePosition: !settingsOpen.framePosition })}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8A8A",
                    marginTop: 4,
                  }}
                >
                  <span>COVER INSETS</span>
                  <span>{settingsOpen.framePosition ? "−" : "+"}</span>
                </button>

                {settingsOpen.framePosition ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#7f7f7f" }}>
                        TARGET
                        <select
                          value={quickInsetTarget}
                          onChange={(e) => setQuickInsetTarget(e.target.value)}
                          style={{ padding: "7px 8px", fontSize: 11, borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)" }}
                        >
                          {quickInsetTargetOptions.map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 11, fontWeight: 700, color: "#7f7f7f" }}>
                        MODE
                        <select
                          value={quickInsetMode}
                          onChange={(e) => setQuickInsetMode(e.target.value as QuickInsetMode)}
                          style={{ padding: "7px 8px", fontSize: 11, borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)" }}
                        >
                          {[
                            { value: "insetPosition", label: "Inset Position" },
                            { value: "overlayPosition", label: "Overlay Position" },
                            { value: "overlayScale", label: "Overlay Scale" },
                            { value: "coverPosition", label: "Cover Position" },
                            { value: "coverScale", label: "Cover Scale" },
                          ].map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "8px 9px", borderRadius: 8, background: "rgba(0,0,0,0.045)" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#6d6d6d" }}>
                        OVERLAY FILE
                      </div>
                      <div style={{ fontSize: 11, color: "#4f4f4f", display: "flex", flexDirection: "column", gap: 3 }}>
                        <span>Expected filename: <strong>{quickOverlayExpectedFilename}</strong></span>
                        <span>
                          Active source: {quickOverlayOverrideUrl ? "Custom upload" : "Bundled file"} ({quickOverlayTargetKey})
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <button
                          onClick={() => overlayFileInputRef.current?.click()}
                          disabled={uploadingOverlayForKey === quickOverlayTargetKey}
                          style={{
                            padding: "6px 9px",
                            fontSize: 11,
                            borderRadius: 6,
                            border: "1px solid rgba(0,0,0,0.2)",
                            background: "rgba(255,255,255,0.9)",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          {uploadingOverlayForKey === quickOverlayTargetKey ? "Uploading..." : "Replace Overlay File"}
                        </button>
                        {quickOverlayOverrideUrl ? (
                          <button
                            onClick={handleResetOverlayForQuickTarget}
                            style={{
                              padding: "6px 9px",
                              fontSize: 11,
                              borderRadius: 6,
                              border: "1px solid rgba(0,0,0,0.2)",
                              background: "rgba(255,255,255,0.85)",
                              cursor: "pointer",
                              fontWeight: 700,
                            }}
                          >
                            Use Expected File
                          </button>
                        ) : null}
                        <input
                          ref={overlayFileInputRef}
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            handleReplaceOverlayForQuickTarget(file);
                            e.currentTarget.value = "";
                          }}
                        />
                      </div>
                      {overlayUploadError ? (
                        <div style={{ fontSize: 11, color: "#b42318" }}>{overlayUploadError}</div>
                      ) : null}
                    </div>

                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Step
                      <input
                        type="range"
                        min={1}
                        max={12}
                        step={1}
                        value={quickInsetStep}
                        onChange={(e) => setQuickInsetStep(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 22, textAlign: "right" }}>{quickInsetStep}</span>
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 10, alignItems: "center" }}>
                      <div
                        onMouseDown={(e) => {
                          if (quickInsetMode !== "overlayPosition") return;
                          quickOverlayDragRef.current = {
                            x: e.clientX,
                            y: e.clientY,
                            top: quickInsetSnapshot.overlay.top,
                            left: quickInsetSnapshot.overlay.left,
                          };
                        }}
                        onMouseMove={(e) => {
                          const drag = quickOverlayDragRef.current;
                          if (!drag || quickInsetMode !== "overlayPosition") return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const dxPct = ((e.clientX - drag.x) / rect.width) * 100;
                          const dyPct = ((e.clientY - drag.y) / rect.height) * 100;
                          const nextLeft = Number((drag.left + dxPct).toFixed(2));
                          const nextTop = Number((drag.top + dyPct).toFixed(2));
                          if (quickTargetType === "game") {
                            updatePlatformOverlay(quickTargetPlatform, "left", nextLeft);
                            updatePlatformOverlay(quickTargetPlatform, "top", nextTop);
                          } else {
                            updateNonGameOverlay(quickTargetType, "left", nextLeft);
                            updateNonGameOverlay(quickTargetType, "top", nextTop);
                          }
                        }}
                        onMouseUp={() => {
                          quickOverlayDragRef.current = null;
                        }}
                        onMouseLeave={() => {
                          quickOverlayDragRef.current = null;
                        }}
                        style={{
                          position: "relative",
                          width: 170,
                          height: 255,
                          borderRadius: 9,
                          border: "1px solid rgba(0,0,0,0.2)",
                          background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.03) 100%)",
                          overflow: "hidden",
                          cursor: quickInsetMode === "overlayPosition" ? "move" : "default",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: `${quickInsetPreview.top}%`,
                            left: `${quickInsetPreview.left}%`,
                            width: `${quickInsetPreview.width}%`,
                            height: `${quickInsetPreview.height}%`,
                            border: "2px dashed rgba(31, 117, 221, 0.9)",
                            background: "rgba(31, 117, 221, 0.12)",
                            boxSizing: "border-box",
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            top: `${50 + quickInsetSnapshot.overlay.top}%`,
                            left: `${50 + quickInsetSnapshot.overlay.left}%`,
                            width: `${quickInsetSnapshot.overlay.width}%`,
                            height: `${quickInsetSnapshot.overlay.height}%`,
                            transform: "translate(-50%, -50%)",
                            border: "2px solid rgba(255, 189, 76, 0.95)",
                            background: "rgba(255, 189, 76, 0.14)",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "46px 46px 46px", gridTemplateRows: "46px 46px 46px", gap: 6, justifyContent: "center" }}>
                        <span />
                        <button onClick={() => applyQuickInsetNudge("up")} style={{ fontSize: 18, borderRadius: 8, border: "1px solid #bbb", background: "rgba(255,255,255,0.9)", cursor: "pointer" }}>↑</button>
                        <span />
                        <button onClick={() => applyQuickInsetNudge("left")} style={{ fontSize: 18, borderRadius: 8, border: "1px solid #bbb", background: "rgba(255,255,255,0.9)", cursor: "pointer" }}>←</button>
                        <div style={{ display: "grid", placeItems: "center", fontSize: 11, color: "#777", fontWeight: 700 }}>NUDGE</div>
                        <button onClick={() => applyQuickInsetNudge("right")} style={{ fontSize: 18, borderRadius: 8, border: "1px solid #bbb", background: "rgba(255,255,255,0.9)", cursor: "pointer" }}>→</button>
                        <span />
                        <button onClick={() => applyQuickInsetNudge("down")} style={{ fontSize: 18, borderRadius: 8, border: "1px solid #bbb", background: "rgba(255,255,255,0.9)", cursor: "pointer" }}>↓</button>
                        <span />
                      </div>
                    </div>

                    <div style={{ fontSize: 11, opacity: 0.75, padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.05)" }}>
                      Insets T/R/B/L: {Math.round(quickInsetSnapshot.inset.top)} / {Math.round(quickInsetSnapshot.inset.right)} / {Math.round(quickInsetSnapshot.inset.bottom)} / {Math.round(quickInsetSnapshot.inset.left)}
                      <span> · Overlay W/H/T/L: {quickInsetSnapshot.overlay.width.toFixed(1)} / {quickInsetSnapshot.overlay.height.toFixed(1)} / {quickInsetSnapshot.overlay.top.toFixed(1)} / {quickInsetSnapshot.overlay.left.toFixed(1)} · Cover W/H/X/Y: {quickInsetSnapshot.coverScale.x.toFixed(1)} / {quickInsetSnapshot.coverScale.y.toFixed(1)} / {quickInsetSnapshot.coverOffset.x.toFixed(1)} / {quickInsetSnapshot.coverOffset.y.toFixed(1)}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <button
                        onClick={resetQuickInsetTarget}
                        style={{
                          padding: "7px 10px",
                          fontSize: 11,
                          background: "#f2f2f2",
                          color: "#222",
                          border: "1px solid rgba(0,0,0,0.2)",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        Reset {quickTargetType === "game" ? quickTargetPlatform : quickTargetType} Insets
                      </button>
                      <button
                        onClick={async () => {
                          setQuickInsetSaveStatus("saving");
                          const ok = await saveInsetsToSheet(quickInsetSaveType);
                          setQuickInsetSaveStatus(ok ? "saved" : "error");
                        }}
                        style={{
                          padding: "7px 10px",
                          fontSize: 11,
                          background: "#0066cc",
                          color: "white",
                          border: "none",
                          borderRadius: 6,
                          cursor: "pointer",
                          fontWeight: 700,
                        }}
                      >
                        {quickInsetSaveLabel}
                      </button>
                      {quickInsetSaveStatus === "saving" ? <span style={{ fontSize: 11, color: "#555" }}>Saving inset settings...</span> : null}
                      {quickInsetSaveStatus === "saved" ? <span style={{ fontSize: 11, color: "#0a7f2e" }}>Saved. These inset settings will be used next time.</span> : null}
                      {quickInsetSaveStatus === "error" ? <span style={{ fontSize: 11, color: "#b42318" }}>Save failed</span> : null}
                    </div>
                  </div>
                ) : null}

                {/* Logo Customization */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, logoSize: !settingsOpen.logoSize })}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8A8A",
                    marginTop: 4,
                  }}
                >
                  <span>LOGO CUSTOMIZATION</span>
                  <span>{settingsOpen.logoSize ? "−" : "+"}</span>
                </button>
                {settingsOpen.logoSize ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Size
                      <input
                        type="range"
                        min={60}
                        max={500}
                        step={5}
                        value={logoSize}
                        onChange={(e) => updateLogoSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{logoSize}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Top
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        step={1}
                        value={logoTop}
                        onChange={(e) => updateLogoTop(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{logoTop}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Left
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        step={1}
                        value={logoLeft}
                        onChange={(e) => updateLogoLeft(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{logoLeft}</span>
                    </label>
                  </div>
                ) : null}

                {/* Sync Status Customization */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, syncIcon: !settingsOpen.syncIcon })}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8A8A",
                    marginTop: 4,
                  }}
                >
                  <span>SYNC STATUS CUSTOMIZATION</span>
                  <span>{settingsOpen.syncIcon ? "−" : "+"}</span>
                </button>
                {settingsOpen.syncIcon ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Size
                      <input
                        type="range"
                        min={8}
                        max={24}
                        step={1}
                        value={syncIconSize}
                        onChange={(e) => updateSyncIconSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{syncIconSize}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Top
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        step={1}
                        value={syncIconTop}
                        onChange={(e) => updateSyncIconTop(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{syncIconTop}</span>
                    </label>
                  </div>
                ) : null}

                {/* Status Icon */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, statusIcon: !settingsOpen.statusIcon })}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8A8A",
                    marginTop: 4,
                  }}
                >
                  <span>STATUS ICON</span>
                  <span>{settingsOpen.statusIcon ? "−" : "+"}</span>
                </button>
                {settingsOpen.statusIcon ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Size %
                      <input
                        type="range"
                        min={50}
                        max={220}
                        step={5}
                        value={statusIconScale}
                        onChange={(e) => updateStatusIconScale(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 40, textAlign: "right" }}>{statusIconScale}%</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Offset X
                      <input
                        type="range"
                        min={-30}
                        max={30}
                        step={1}
                        value={statusIconOffsetX}
                        onChange={(e) => updateStatusIconOffsetX(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 40, textAlign: "right" }}>{statusIconOffsetX}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Offset Y
                      <input
                        type="range"
                        min={-30}
                        max={30}
                        step={1}
                        value={statusIconOffsetY}
                        onChange={(e) => updateStatusIconOffsetY(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 40, textAlign: "right" }}>{statusIconOffsetY}</span>
                    </label>
                  </div>
                ) : null}

                {/* Sidebar Customization */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, sidebar: !settingsOpen.sidebar })}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8A8A",
                    marginTop: 4,
                  }}
                >
                  <span>SIDEBAR CUSTOMIZATION</span>
                  <span>{settingsOpen.sidebar ? "−" : "+"}</span>
                </button>
                {settingsOpen.sidebar ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Icon Size
                      <input
                        type="range"
                        min={8}
                        max={64}
                        step={1}
                        value={iconSize}
                        onChange={(e) => updateIconSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{iconSize}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Font Size
                      <input
                        type="range"
                        min={10}
                        max={20}
                        step={1}
                        value={sidebarFontSize}
                        onChange={(e) => updateSidebarFontSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{sidebarFontSize}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Font Weight
                      <select
                        value={sidebarFontWeight}
                        onChange={(e) => updateSidebarFontWeight(e.target.value)}
                        style={{ flex: 1, fontSize: 11 }}
                      >
                        <option value="300">Light (300)</option>
                        <option value="400">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">Semi-Bold (600)</option>
                        <option value="700">Bold (700)</option>
                      </select>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Icon Gap
                      <input
                        type="range"
                        min={4}
                        max={20}
                        step={1}
                        value={sidebarGap}
                        onChange={(e) => updateSidebarGap(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{sidebarGap}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Header Font Size
                      <input
                        type="range"
                        min={8}
                        max={16}
                        step={1}
                        value={sidebarHeaderFontSize}
                        onChange={(e) => updateSidebarHeaderFontSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{sidebarHeaderFontSize}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Header Font Weight
                      <select
                        value={sidebarHeaderFontWeight}
                        onChange={(e) => updateSidebarHeaderFontWeight(e.target.value)}
                        style={{ flex: 1, fontSize: 11 }}
                      >
                        <option value="300">Light (300)</option>
                        <option value="400">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">Semi-Bold (600)</option>
                        <option value="700">Bold (700)</option>
                      </select>
                    </label>
                  </div>
                ) : null}

                {/* Counter Configuration */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, counter: !settingsOpen.counter })}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    background: "transparent",
                    padding: 0,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8A8A",
                    marginTop: 4,
                  }}
                >
                  <span>COUNTER CONFIGURATION</span>
                  <span>{settingsOpen.counter ? "−" : "+"}</span>
                </button>
                {settingsOpen.counter ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Tile Size
                      <input
                        type="range"
                        min={30}
                        max={60}
                        step={2}
                        value={counterTileSize}
                        onChange={(e) => updateCounterTileSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{counterTileSize}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Tile Spacing
                      <input
                        type="range"
                        min={0}
                        max={10}
                        step={1}
                        value={counterTileSpacing}
                        onChange={(e) => updateCounterTileSpacing(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{counterTileSpacing}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Number Font Size
                      <input
                        type="range"
                        min={10}
                        max={40}
                        step={1}
                        value={counterNumberFontSize}
                        onChange={(e) => updateCounterNumberFontSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{counterNumberFontSize}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Label Font Size
                      <input
                        type="range"
                        min={10}
                        max={24}
                        step={1}
                        value={counterLabelFontSize}
                        onChange={(e) => updateCounterLabelFontSize(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{counterLabelFontSize}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Label Font Weight
                      <select
                        value={counterLabelFontWeight}
                        onChange={(e) => updateCounterLabelFontWeight(e.target.value)}
                        style={{ flex: 1, fontSize: 11 }}
                      >
                        <option value="300">Light (300)</option>
                        <option value="400">Normal (400)</option>
                        <option value="500">Medium (500)</option>
                        <option value="600">Semi-Bold (600)</option>
                        <option value="700">Bold (700)</option>
                        <option value="800">Extra-Bold (800)</option>
                      </select>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Label Top Offset
                      <input
                        type="range"
                        min={-20}
                        max={20}
                        step={1}
                        value={counterLabelTop}
                        onChange={(e) => updateCounterLabelTop(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{counterLabelTop}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Label Left Offset
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        step={1}
                        value={counterLabelLeft}
                        onChange={(e) => updateCounterLabelLeft(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{counterLabelLeft}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Counter Top Offset
                      <input
                        type="range"
                        min={-20}
                        max={20}
                        step={1}
                        value={counterTop}
                        onChange={(e) => updateCounterTop(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{counterTop}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Counter Left Offset
                      <input
                        type="range"
                        min={-50}
                        max={50}
                        step={1}
                        value={counterLeft}
                        onChange={(e) => updateCounterLeft(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{counterLeft}</span>
                    </label>
                  </div>
                ) : null}

                {/* Chris' Delicious Library FAQ */}
                <button
                  onClick={() => setFaqPopupOpen(true)}
                  style={{
                    width: "100%",
                    textAlign: "center",
                    border: "1px solid rgba(38, 62, 91, 0.28)",
                    background: "linear-gradient(180deg, rgba(84, 118, 160, 0.92) 0%, rgba(58, 89, 126, 0.92) 100%)",
                    padding: "10px 12px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#fff",
                    marginTop: 8,
                    borderRadius: 8,
                    boxShadow: "0 2px 7px rgba(0, 0, 0, 0.22)",
                  }}
                >
                  <span>CHRIS&apos; DELICIOUS LIBRARY FAQ</span>
                </button>

                {/* Save All Settings Button */}
                <button
                  onClick={saveAllSettings}
                  style={{
                    width: "100%",
                    marginTop: 12,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(92, 60, 56, 0.3)",
                    background: "linear-gradient(180deg, rgba(139, 76, 76, 0.9) 0%, rgba(115, 62, 62, 0.9) 100%)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.25)";
                  }}
                >
                  💾 Save All Settings to Sheet
                </button>

                {/* Load Settings from Sheet Button */}
                <button
                  onClick={loadSettingsFromSheet}
                  style={{
                    width: "100%",
                    marginTop: 8,
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(60, 92, 92, 0.3)",
                    background: "linear-gradient(180deg, rgba(76, 115, 115, 0.9) 0%, rgba(62, 95, 95, 0.9) 100%)",
                    color: "#fff",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    boxShadow: "0 2px 6px rgba(0, 0, 0, 0.25)",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 4px 10px rgba(0, 0, 0, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 2px 6px rgba(0, 0, 0, 0.25)";
                  }}
                >
                  📥 Load Settings from Sheet
                </button>
                {syncMsg ? (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      color: syncStatusTextColor,
                    }}
                  >
                    {syncMsg}
                  </div>
                ) : null}

              </div>,
              document.body
            ) : null}
            </div>

            {/* Synced Module at Bottom */}
            <div style={{ padding: "0 8px", marginTop: "auto", marginBottom: 12 }}>
              <div
                style={{
                  marginBottom: 8,
                  padding: "0 2px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: currentTheme.syncedTextColor }}>Cover Size</span>
                  <span style={{ minWidth: 40, textAlign: "right", fontSize: 11, fontWeight: 700, opacity: 0.85, color: currentTheme.syncedTextColor }}>
                    {`${globalCoverScalePct}%`}
                  </span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={130}
                  step={1}
                  value={globalCoverScalePct}
                  onMouseDown={captureGlobalCoverScaleBase}
                  onTouchStart={captureGlobalCoverScaleBase}
                  onFocus={captureGlobalCoverScaleBase}
                  onChange={(e) => updateGlobalCoverScale(Number(e.target.value))}
                  style={{ width: "100%" }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 9,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
                  border: "1px solid rgba(92, 60, 56, 0.2)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                  position: "relative",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    left: 12,
                    top: 10 + syncIconTop,
                    width: syncIconSize,
                    height: syncIconSize,
                    borderRadius: 999,
                    background:
                      syncState === "saving"
                        ? "#d08a2c"
                        : syncState === "ok"
                        ? "#2f8f5b"
                        : syncState === "error"
                        ? "#b23b3b"
                        : "rgba(0,0,0,0.35)",
                    opacity: 0.95,
                    flex: "0 0 auto",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.25)",
                    border: "1.5px solid rgba(255, 255, 255, 0.6)",
                  }}
                />
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, marginLeft: syncIconSize + 10, flex: "1 1 auto" }}>
                  <div style={{ minWidth: 0, position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                      <div style={{ color: currentTheme.syncedTextColor, fontSize: 14, fontWeight: 500, fontFamily: "Nunito, sans-serif" }}>
                        {syncState === "saving"
                          ? "Syncing"
                          : syncState === "ok"
                          ? "Synced"
                          : syncState === "error"
                          ? "Error"
                          : "Idle"}
                      </div>
                      <div style={{ color: sidebarTheme === "darkBlue" ? "rgba(223, 236, 255, 0.9)" : "rgba(0,0,0,0.6)", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {lastSyncAt ? formatLastSync(lastSyncAt) : "—"}
                      </div>
                    </div>
                    {syncMsg ? (
                      <div
                        style={{
                          color: syncStatusTextColor,
                          fontSize: 11,
                          fontWeight: 800,
                          marginTop: 4,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {syncMsg}
                      </div>
                    ) : null}
                  </div>
                </div>

                <button
                  onClick={() => setRefreshNonce((n) => n + 1)}
                  style={{
                    border: "1px solid rgba(0,0,0,0.18)",
                    background: "rgba(255,255,255,0.85)",
                    color: "#754738",
                    borderRadius: 999,
                    padding: "5px 6px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 500,
                    flex: "0 0 auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 28,
                    minHeight: 28,
                  }}
                  title="Re-sync (re-fetch CSV)"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 2v6h-6M3 22v-6h6M3 12c0-4.418 3.582-8 8-8 3.5 0 6.456 2.272 7.619 5.362M21 12c0 4.418-3.582 8-8 8-3.5 0-6.456-2.272-7.619-5.362" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main style={{ width: "100%", padding: "0 0 40px 0", boxSizing: "border-box", position: "relative", marginLeft: "-1px" }}>
          {nav !== "statistics" ? (
            <div
              aria-hidden
              style={{
                position: "fixed",
                top: topSafeInset,
                left: SIDEBAR_WIDTH - 1,
                right: 0,
                height: 45,
                zIndex: 1399,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "\"Great Vibes\", \"Brush Script MT\", \"Lucida Handwriting\", cursive",
                  fontSize: 24,
                  fontWeight: 500,
                  lineHeight: 1,
                  letterSpacing: "0.01em",
                  color: "rgba(76, 52, 34, 0.55)",
                  textShadow:
                    "0 1px 0 rgba(245, 225, 201, 0.22), 0 -1px 0 rgba(36, 22, 11, 0.5), 0 0 1px rgba(38, 23, 12, 0.35)",
                  mixBlendMode: "multiply",
                  opacity: 0.9,
                  transform: "translateY(-2.5px)",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                {APP_TITLE}
              </span>
            </div>
          ) : null}
          {SHOW_HEADER_DEBUG_CONTROLS ? (
            <div
              style={{
                position: "fixed",
                right: 20,
                bottom: 20,
                zIndex: 9000,
                background: "rgba(20, 20, 20, 0.88)",
                color: "#fff",
                borderRadius: 9,
                border: "1px solid rgba(255,255,255,0.2)",
                padding: 10,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                width: 160,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700 }}>Header Debug</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <span />
                <button onClick={() => nudgeDebugHeader(0, -1)} style={{ cursor: "pointer" }}>↑</button>
                <span />
                <button onClick={() => nudgeDebugHeader(-1, 0)} style={{ cursor: "pointer" }}>←</button>
                <button onClick={resetDebugHeader} style={{ cursor: "pointer" }}>Reset</button>
                <button onClick={() => nudgeDebugHeader(1, 0)} style={{ cursor: "pointer" }}>→</button>
                <span />
                <button onClick={() => nudgeDebugHeader(0, 1)} style={{ cursor: "pointer" }}>↓</button>
                <span />
              </div>
              <div ref={debugHeaderReadoutRef} style={{ fontSize: 11, opacity: 0.9 }}>X: 0, Y: 0</div>
            </div>
          ) : null}
          {error ? (
            <div
              style={{
                background: "#fff",
                border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                borderRadius: 9,
                padding: 14,
                color: "#8b0000",
                fontWeight: 700,
                marginBottom: 16,
                whiteSpace: "pre-wrap",
              }}
            >
              {error}
            </div>
          ) : null}

          {missingWriteConfigChecks.length > 0 ? (
            <div
              style={{
                background: "#fff7e6",
                border: "1px solid #d9981e",
                borderRadius: 9,
                padding: 12,
                marginBottom: 14,
                color: "#5f3a00",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                Persistence Warning
              </div>
              <div style={{ fontSize: 12, marginTop: 4, lineHeight: 1.35 }}>
                Some live edits will not persist across deployments until these write URLs are configured:
              </div>
              <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
                {missingWriteConfigChecks.map((entry) => (
                  <div key={entry.key} style={{ fontSize: 11, lineHeight: 1.3 }}>
                    <strong>{entry.label}:</strong> <code>{entry.env}</code>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div
              style={{
                background: "#fff",
                border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                borderRadius: 9,
                padding: 14,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Loading…
            </div>
          ) : null}

          {(faqPopupOpen || (sortPopupOpen && nav !== "statistics")) ? (
            <button
              aria-label="Close popup"
              onMouseDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSettingsPopupOpen(false);
                setSortPopupOpen(false);
                setFaqPopupOpen(false);
                setShowVersionNotes(false);
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: POPUP_OVERLAY_Z_INDEX,
                border: "none",
                margin: 0,
                padding: 0,
                background: "rgba(0, 0, 0, 0.28)",
                cursor: "pointer",
              }}
            />
          ) : null}

          {sortPopupOpen && nav !== "statistics" ? (
            <div
              style={{
                position: "fixed",
                top: "calc(env(safe-area-inset-top, 0px) + 84px)",
                right: 74,
                width: "min(320px, calc(100vw - 40px))",
                zIndex: POPUP_PANEL_Z_INDEX,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                background: "rgba(248, 244, 236, 0.98)",
                border: "1px solid rgba(58, 37, 24, 0.38)",
                borderRadius: 14,
                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
                backdropFilter: "blur(2px)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingBottom: 8,
                  borderBottom: "1px solid rgba(0,0,0,0.12)",
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 800, color: "#5c3c38" }}>Sort</span>
                <button
                  onClick={() => setSortPopupOpen(false)}
                  style={{
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "rgba(255,255,255,0.85)",
                    color: "#5c3c38",
                    borderRadius: 8,
                    padding: "4px 8px",
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  Close
                </button>
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 700, color: "#8A8A8A" }}>
                SORT BY
                <select
                  value={sortField}
                  onChange={(e) => handleSortFieldChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "rgba(255,255,255,0.9)",
                    color: "#3a2f28",
                    fontSize: 14,
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {nav === "books" && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                      <option value="CompletedDate">Completed Date</option>
                      <option value="MyRatingSort">My Rating</option>
                      <option value="ExternalRatingSort">User Rating</option>
                    </>
                  )}
                  {nav === "movies" && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                      <option value="MyRatingSort">My Rating</option>
                      <option value="ExternalRatingSort">User Rating</option>
                    </>
                  )}
                  {nav === "tv" && (
                    <>
                      <option value="Title">Title</option>
                      <option value="CompletedDate">Date Completed</option>
                      <option value="LastAirDate">Last Air Date</option>
                      <option value="FirstAirDate">First Air Date</option>
                      <option value="MyRatingSort">My Rating</option>
                      <option value="ExternalRatingSort">User Rating</option>
                    </>
                  )}
                  {nav === "games" && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                      <option value="CompletedDate">Date Completed</option>
                      <option value="MyRatingSort">My Rating</option>
                      <option value="ExternalRatingSort">User Rating</option>
                    </>
                  )}
                  {(nav === "home" || nav === "play-next" || nav === "wishlist" || nav === "wishlist-books" || nav === "watchlist-movies" || nav === "watchlist-tv" || nav === "current" || nav === "completed" || nav === "abandoned" || nav === "year-this" || nav === "smart-custom") && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                      {nav === "wishlist" || nav === "play-next" ? <option value="CompletedDate">Date Completed</option> : null}
                      {nav === "wishlist" || nav === "wishlist-books" || nav === "play-next" || nav === "watchlist-movies" || nav === "watchlist-tv" || (nav === "smart-custom" && activeSmartList?.allowManualSort) ? <option value={MANUAL_SORT_FIELD}>Manual</option> : null}
                    </>
                  )}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 700, color: "#8A8A8A" }}>
                ORDER
                <select
                  value={sortOrder}
                  onChange={(e) => handleSortOrderChange(e.target.value as "Asc" | "Desc")}
                  disabled={(nav === "wishlist" || nav === "wishlist-books" || nav === "play-next" || nav === "watchlist-movies" || nav === "watchlist-tv" || (nav === "smart-custom" && activeSmartList?.allowManualSort)) && sortField === MANUAL_SORT_FIELD}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: 9,
                    border: "1px solid rgba(0,0,0,0.2)",
                    background: "rgba(255,255,255,0.9)",
                    color: "#3a2f28",
                    fontSize: 14,
                    fontWeight: 600,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="Asc">Asc</option>
                  <option value="Desc">Desc</option>
                </select>
              </label>
            </div>
          ) : null}

          {smartListBuilderOpen ? (
            <div
              style={{
                position: "fixed",
                inset: "calc(env(safe-area-inset-top, 0px) + 14px) 14px 14px 14px",
                zIndex: POPUP_FAQ_Z_INDEX,
                background: "linear-gradient(180deg, rgba(18, 34, 61, 0.95) 0%, rgba(12, 24, 44, 0.95) 100%)",
                border: "1px solid rgba(108, 146, 214, 0.35)",
                borderRadius: 16,
                boxShadow: "0 24px 70px rgba(4, 12, 26, 0.65)",
                backdropFilter: "blur(8px)",
                padding: 16,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 10,
                  background: "rgba(12, 24, 44, 0.94)",
                  borderBottom: "1px solid rgba(80, 107, 158, 0.5)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: "#f0f4ff", letterSpacing: "0.02em" }}>
                    Create Smart List
                  </span>
                  <span style={{ fontSize: 11, color: "rgba(178, 193, 224, 0.9)", fontWeight: 700 }}>
                    Choose media, statuses, and year columns to build reusable filters.
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSmartListBuilderOpen(false);
                    setSmartListBuilderError(null);
                    setSmartListTagQuery("");
                  }}
                  style={{
                    border: "1px solid rgba(120, 153, 220, 0.5)",
                    background: "rgba(14, 30, 58, 0.72)",
                    color: "#dbe6fa",
                    borderRadius: 9,
                    padding: "7px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Close
                </button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    borderRadius: 12,
                    border: "1px solid rgba(73, 102, 154, 0.35)",
                    background: "rgba(15, 24, 44, 0.72)",
                    padding: "10px 11px",
                  }}
                >
                  <span style={{ color: "rgba(178, 193, 224, 0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Name
                  </span>
                  <input
                    type="text"
                    value={smartListDraft.name}
                    onChange={(event) => {
                      setSmartListDraft((prev) => ({ ...prev, name: event.target.value }));
                      setSmartListBuilderError(null);
                    }}
                    placeholder="Example: Games I Finished in 2025"
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(95, 122, 177, 0.45)",
                      background: "rgba(8, 14, 30, 0.8)",
                      color: "#eff5ff",
                      fontSize: 14,
                      fontWeight: 700,
                      outline: "none",
                    }}
                  />
                </label>
                <label
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    borderRadius: 12,
                    border: "1px solid rgba(73, 102, 154, 0.35)",
                    background: "rgba(15, 24, 44, 0.72)",
                    padding: "10px 11px",
                  }}
                >
                  <span style={{ color: "rgba(178, 193, 224, 0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Icon
                  </span>
                  <select
                    value={smartListDraft.icon}
                    onChange={(event) => setSmartListDraft((prev) => ({ ...prev, icon: event.target.value }))}
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(95, 122, 177, 0.45)",
                      background: "rgba(8, 14, 30, 0.8)",
                      color: "#eff5ff",
                      fontSize: 14,
                      fontWeight: 700,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    {SMART_LIST_ICON_OPTIONS.map((option) => (
                      <option key={`smart-list-icon-option-${option.value || "placeholder"}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  borderRadius: 12,
                  border: "1px solid rgba(73, 102, 154, 0.35)",
                  background: "rgba(15, 24, 44, 0.72)",
                  padding: "10px 11px",
                }}
              >
                <span style={{ color: "rgba(178, 193, 224, 0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Media Types
                </span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {(Object.entries(SMART_LIST_MEDIA_LABELS) as Array<[SmartListMediaType, string]>).map(([mediaType, label]) => {
                    const checked = smartListDraft.mediaTypes.includes(mediaType);
                    return (
                      <button
                        key={`smart-list-media-${mediaType}`}
                        type="button"
                        onClick={() => {
                          handleToggleSmartListMediaType(mediaType);
                          setSmartListBuilderError(null);
                        }}
                        aria-pressed={checked}
                        style={{
                          borderRadius: 999,
                          border: checked ? "1px solid rgba(153, 203, 255, 0.92)" : "1px solid rgba(90, 116, 170, 0.45)",
                          background: checked ? "rgba(46, 92, 146, 0.65)" : "rgba(28, 42, 70, 0.65)",
                          color: checked ? "#ecf5ff" : "#d6deef",
                          padding: "6px 11px",
                          fontSize: 12,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {checked ? "✓ " : ""}{label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  borderRadius: 12,
                  border: "1px solid rgba(73, 102, 154, 0.35)",
                  background: "rgba(15, 24, 44, 0.72)",
                  padding: "10px 11px",
                }}
              >
                <span style={{ color: "rgba(178, 193, 224, 0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  Tag Filters (All Spreadsheets)
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="text"
                    value={smartListTagQuery}
                    onChange={(event) => setSmartListTagQuery(event.target.value)}
                    placeholder="Filter tags..."
                    style={{
                      flex: 1,
                      minWidth: 120,
                      padding: "8px 9px",
                      borderRadius: 8,
                      border: "1px solid rgba(95, 122, 177, 0.45)",
                      background: "rgba(8, 14, 30, 0.8)",
                      color: "#eff5ff",
                      fontSize: 12,
                      fontWeight: 600,
                      outline: "none",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setSmartListDraft((prev) => ({
                        ...prev,
                        tags: smartListTagOptions.map((option) => option.value),
                      }))
                    }
                    disabled={!smartListTagOptions.length}
                    style={{
                      border: "1px solid rgba(94, 139, 200, 0.62)",
                      borderRadius: 8,
                      background: "rgba(14, 32, 57, 0.86)",
                      color: "rgba(214, 231, 255, 0.95)",
                      padding: "5px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      cursor: smartListTagOptions.length ? "pointer" : "default",
                      opacity: smartListTagOptions.length ? 1 : 0.55,
                    }}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSmartListDraft((prev) => ({
                        ...prev,
                        tags: [],
                      }))
                    }
                    disabled={!smartListDraft.tags.length}
                    style={{
                      border: "1px solid rgba(94, 139, 200, 0.62)",
                      borderRadius: 8,
                      background: "rgba(14, 32, 57, 0.86)",
                      color: "rgba(214, 231, 255, 0.95)",
                      padding: "5px 8px",
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      cursor: smartListDraft.tags.length ? "pointer" : "default",
                      opacity: smartListDraft.tags.length ? 1 : 0.55,
                    }}
                  >
                    Clear
                  </button>
                </div>
                {filteredSmartListTagOptions.length ? (
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      maxHeight: 176,
                      overflowY: "auto",
                      paddingRight: 2,
                    }}
                  >
                    {filteredSmartListTagOptions.map((option) => {
                      const checked = smartListDraft.tags.includes(option.value);
                      return (
                        <button
                          key={`smart-list-tag-option-${option.value}`}
                          type="button"
                          onClick={() => handleToggleSmartListTag(option.value)}
                          aria-pressed={checked}
                          style={{
                            borderRadius: 999,
                            border: checked ? "1px solid rgba(153, 203, 255, 0.92)" : "1px solid rgba(90, 116, 170, 0.45)",
                            background: checked ? "rgba(46, 92, 146, 0.65)" : "rgba(28, 42, 70, 0.65)",
                            color: checked ? "#ecf5ff" : "#d6deef",
                            padding: "5px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: "rgba(178, 193, 224, 0.75)" }}>
                    {smartListTagOptions.length ? "No matching tags." : "No tags found in your sheets yet."}
                  </span>
                )}
                <span style={{ fontSize: 11, color: "rgba(178, 193, 224, 0.75)" }}>
                  Leave tags unselected to include all tags.
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    borderRadius: 12,
                    border: "1px solid rgba(73, 102, 154, 0.35)",
                    background: "rgba(15, 24, 44, 0.72)",
                    padding: "10px 11px",
                  }}
                >
                  <span style={{ color: "rgba(178, 193, 224, 0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Status Filters
                  </span>
                  {smartListDraft.mediaTypes.map((mediaType) => {
                    const selectedStatuses = smartListDraft.statuses[mediaType] || [];
                    const options = smartListStatusOptionsByMedia[mediaType];
                    return (
                      <div
                        key={`smart-list-status-${mediaType}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                          padding: 8,
                          borderRadius: 10,
                          border: "1px solid rgba(80, 107, 158, 0.5)",
                          background: "rgba(24, 36, 63, 0.64)",
                        }}
                      >
                        <span style={{ color: "#f0f4ff", fontSize: 12, fontWeight: 800 }}>{SMART_LIST_MEDIA_LABELS[mediaType]}</span>
                        {options.length ? (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                            {options.map((status) => {
                              const checked = selectedStatuses.includes(status.value);
                              return (
                                <button
                                  key={`smart-list-status-option-${mediaType}-${status.value}`}
                                  type="button"
                                  onClick={() => handleToggleSmartListStatus(mediaType, status.value)}
                                  aria-pressed={checked}
                                  style={{
                                    borderRadius: 999,
                                    border: checked ? "1px solid rgba(153, 203, 255, 0.92)" : "1px solid rgba(90, 116, 170, 0.45)",
                                    background: checked ? "rgba(46, 92, 146, 0.65)" : "rgba(28, 42, 70, 0.65)",
                                    color: checked ? "#ecf5ff" : "#d6deef",
                                    padding: "5px 10px",
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  {status.label}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ fontSize: 11, color: "rgba(178, 193, 224, 0.75)" }}>
                            No statuses found yet for this media type.
                          </span>
                        )}
                      </div>
                    );
                  })}
                  <span style={{ fontSize: 11, color: "rgba(178, 193, 224, 0.75)" }}>
                    Leave statuses unselected to include all statuses for that media type.
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    borderRadius: 12,
                    border: "1px solid rgba(73, 102, 154, 0.35)",
                    background: "rgba(15, 24, 44, 0.72)",
                    padding: "10px 11px",
                  }}
                >
                  <span style={{ color: "rgba(178, 193, 224, 0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Year Filters By Column
                  </span>
                  {smartListDraft.mediaTypes.map((mediaType) => {
                    const sourceOptions = SMART_LIST_YEAR_SOURCE_OPTIONS_BY_MEDIA[mediaType];
                    return (
                      <div
                        key={`smart-list-year-${mediaType}`}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 7,
                          padding: 8,
                          borderRadius: 10,
                          border: "1px solid rgba(80, 107, 158, 0.5)",
                          background: "rgba(24, 36, 63, 0.64)",
                        }}
                      >
                        <span style={{ color: "#f0f4ff", fontSize: 12, fontWeight: 800 }}>{SMART_LIST_MEDIA_LABELS[mediaType]}</span>
                        {sourceOptions.map((source) => {
                          const selectedYears = smartListDraft.yearFilters[mediaType]?.[source.key] || [];
                          const mediaYearOptions = smartListYearOptionsByMedia[mediaType] as SmartListYearFilters | undefined;
                          const yearOptions = mediaYearOptions?.[source.key] || [];
                          const allSelected = yearOptions.length > 0 && selectedYears.length === yearOptions.length;
                          return (
                            <div key={`smart-list-year-source-${mediaType}-${source.key}`} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                                  <span style={{ color: "rgba(214, 231, 255, 0.95)", fontSize: 11, fontWeight: 700 }}>{source.label}</span>
                                  <span style={{ color: "rgba(178, 193, 224, 0.75)", fontSize: 10 }}>
                                    Column: {source.columnLabel}
                                  </span>
                                </div>
                                <span style={{ display: "inline-flex", gap: 6 }}>
                                  <button
                                    type="button"
                                    onClick={() => handleSetSmartListYearValues(mediaType, source.key, yearOptions)}
                                    disabled={!yearOptions.length || allSelected}
                                    style={{
                                      border: "1px solid rgba(94, 139, 200, 0.62)",
                                      borderRadius: 8,
                                      background: "rgba(14, 32, 57, 0.86)",
                                      color: "rgba(214, 231, 255, 0.95)",
                                      padding: "3px 7px",
                                      fontSize: 10,
                                      fontWeight: 700,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase",
                                      cursor: yearOptions.length && !allSelected ? "pointer" : "default",
                                      opacity: yearOptions.length && !allSelected ? 1 : 0.55,
                                    }}
                                  >
                                    All
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSetSmartListYearValues(mediaType, source.key, [])}
                                    disabled={!selectedYears.length}
                                    style={{
                                      border: "1px solid rgba(94, 139, 200, 0.62)",
                                      borderRadius: 8,
                                      background: "rgba(14, 32, 57, 0.86)",
                                      color: "rgba(214, 231, 255, 0.95)",
                                      padding: "3px 7px",
                                      fontSize: 10,
                                      fontWeight: 700,
                                      letterSpacing: "0.04em",
                                      textTransform: "uppercase",
                                      cursor: selectedYears.length ? "pointer" : "default",
                                      opacity: selectedYears.length ? 1 : 0.55,
                                    }}
                                  >
                                    None
                                  </button>
                                </span>
                              </div>

                              {yearOptions.length ? (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  {yearOptions.map((yearValue: string) => {
                                    const checked = selectedYears.includes(yearValue);
                                    return (
                                      <button
                                        key={`smart-list-year-value-${mediaType}-${source.key}-${yearValue}`}
                                        type="button"
                                        onClick={() => handleToggleSmartListYearValue(mediaType, source.key, yearValue)}
                                        aria-pressed={checked}
                                        style={{
                                          borderRadius: 999,
                                          border: checked ? "1px solid rgba(153, 203, 255, 0.92)" : "1px solid rgba(90, 116, 170, 0.45)",
                                          background: checked ? "rgba(46, 92, 146, 0.65)" : "rgba(28, 42, 70, 0.65)",
                                          color: checked ? "#ecf5ff" : "#d6deef",
                                          padding: "5px 10px",
                                          fontSize: 11,
                                          fontWeight: 700,
                                          cursor: "pointer",
                                        }}
                                      >
                                        {yearValue}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span style={{ fontSize: 11, color: "rgba(178, 193, 224, 0.75)" }}>
                                  No year values found in this column yet.
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                  <span style={{ fontSize: 11, color: "rgba(178, 193, 224, 0.75)" }}>
                    Select one or many years across columns. Matching uses OR logic across selected year groups.
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  borderRadius: 12,
                  border: "1px solid rgba(73, 102, 154, 0.35)",
                  background: "rgba(15, 24, 44, 0.72)",
                  padding: "10px 11px",
                }}
              >
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "#f0f4ff" }}>
                  <input
                    type="checkbox"
                    checked={smartListDraft.allowManualSort}
                    onChange={(event) => {
                      const allowManualSort = event.target.checked;
                      setSmartListDraft((prev) => ({
                        ...prev,
                        allowManualSort,
                        defaultSortField:
                          !allowManualSort && prev.defaultSortField === MANUAL_SORT_FIELD
                            ? "ReleaseDate"
                            : prev.defaultSortField,
                      }));
                    }}
                    style={{ accentColor: "#53b581" }}
                  />
                  Allow manual sorting
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ color: "rgba(178, 193, 224, 0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Default Sort
                  </span>
                  <select
                    value={smartListDraft.defaultSortField}
                    onChange={(event) =>
                      setSmartListDraft((prev) => ({
                        ...prev,
                        defaultSortField: event.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(95, 122, 177, 0.45)",
                      background: "rgba(8, 14, 30, 0.8)",
                      color: "#eff5ff",
                      fontSize: 14,
                      fontWeight: 700,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Title">Title</option>
                    <option value="ReleaseDate">Release Date</option>
                    <option value="CompletedDateOrReleaseDate">Completed/Release Date</option>
                    <option value="CompletedDate">Completed Date</option>
                    <option value="MyRatingSort">My Rating</option>
                    <option value="ExternalRatingSort">User Rating</option>
                    {smartListDraft.allowManualSort ? <option value={MANUAL_SORT_FIELD}>Manual</option> : null}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ color: "rgba(178, 193, 224, 0.9)", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    Order
                  </span>
                  <select
                    value={smartListDraft.defaultSortOrder}
                    onChange={(event) =>
                      setSmartListDraft((prev) => ({
                        ...prev,
                        defaultSortOrder: event.target.value as "Asc" | "Desc",
                      }))
                    }
                    disabled={smartListDraft.allowManualSort && smartListDraft.defaultSortField === MANUAL_SORT_FIELD}
                    style={{
                      width: "100%",
                      padding: "9px 10px",
                      borderRadius: 8,
                      border: "1px solid rgba(95, 122, 177, 0.45)",
                      background: "rgba(8, 14, 30, 0.8)",
                      color: "#eff5ff",
                      fontSize: 14,
                      fontWeight: 700,
                      outline: "none",
                      cursor: "pointer",
                    }}
                  >
                    <option value="Asc">Asc</option>
                    <option value="Desc">Desc</option>
                  </select>
                </label>
              </div>

              {smartListBuilderError ? (
                <div
                  style={{
                    borderRadius: 9,
                    border: "1px solid rgba(205, 93, 93, 0.72)",
                    background: "rgba(68, 20, 20, 0.82)",
                    color: "#ffdede",
                    fontSize: 12,
                    fontWeight: 700,
                    padding: "8px 10px",
                  }}
                >
                  {smartListBuilderError}
                </div>
              ) : null}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button
                  onClick={() => {
                    setSmartListBuilderOpen(false);
                    setSmartListBuilderError(null);
                    setSmartListTagQuery("");
                  }}
                  style={{
                    border: "1px solid rgba(120, 153, 220, 0.5)",
                    background: "rgba(14, 30, 58, 0.72)",
                    color: "#dbe6fa",
                    borderRadius: 9,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSmartList}
                  style={{
                    border: "1px solid rgba(84, 174, 134, 0.78)",
                    background: "rgba(17, 56, 38, 0.92)",
                    color: "#d9ffed",
                    borderRadius: 9,
                    padding: "8px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  Create Smart List
                </button>
              </div>
            </div>
          ) : null}

          {faqPopupOpen ? (
            <div
              style={{
                position: "fixed",
                inset: "calc(env(safe-area-inset-top, 0px) + 14px) 14px 14px 14px",
                zIndex: POPUP_FAQ_Z_INDEX,
                background: "linear-gradient(180deg, rgba(248, 244, 236, 0.99) 0%, rgba(241, 234, 222, 0.99) 100%)",
                border: "1px solid rgba(58, 37, 24, 0.4)",
                borderRadius: 16,
                boxShadow: "0 24px 70px rgba(0, 0, 0, 0.42)",
                padding: 18,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  paddingBottom: 10,
                  marginBottom: 2,
                  background: "rgba(248, 244, 236, 0.98)",
                  borderBottom: "1px solid rgba(0, 0, 0, 0.14)",
                }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: "#5c3c38", letterSpacing: "0.02em" }}>Chris&apos; Delicious Library FAQ</span>
                  <span style={{ fontSize: 12, color: "#6d5a4e", fontWeight: 600 }}>
                    Maintainer guide for updates, deployments, and troubleshooting
                  </span>
                </div>
                <button
                  onClick={() => setFaqPopupOpen(false)}
                  style={{
                    border: "1px solid rgba(0,0,0,0.25)",
                    background: "rgba(255,255,255,0.86)",
                    color: "#5c3c38",
                    borderRadius: 9,
                    padding: "7px 12px",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  Close FAQ
                </button>
              </div>

              <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                <div style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.62)" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#5c3c38", marginBottom: 6 }}>System Overview</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: "#3f3732" }}>
                    This app is a Next.js frontend hosted on Vercel, backed by Google Sheets CSV feeds for reading data and Google Apps Script web app endpoints for write/update/delete actions.
                    GitHub is the source of truth for code and static assets.
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: 10, border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.62)" }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: "#5c3c38", marginBottom: 6 }}>Where Data Lives</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: "#3f3732" }}>
                    Library rows live in Google Sheets tabs (Books, Shows, Movies, Games). App settings live in Settings tab and local browser cache.
                    App writes go through Apps Script <code>doPost</code> action routing.
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>1) First-Time Orientation</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div>1. Clone/open the project in VS Code.</div>
                <div>2. Ensure Node modules are installed with <code>npm install</code>.</div>
                <div>3. Run locally using <code>npm run dev</code> and test at <code>http://localhost:3000</code>.</div>
                <div>4. Confirm env vars are set in local <code>.env.local</code> and Vercel project settings.</div>
                <div>5. Confirm Apps Script web app URLs are valid and deployed to latest version.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>2) Required Services and Their Jobs</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div><strong>GitHub:</strong> stores source code, history, and poster/frame assets used by the app.</div>
                <div><strong>Vercel:</strong> builds and serves production from the GitHub repo.</div>
                <div><strong>Google Sheets:</strong> is the database for your media rows + settings rows.</div>
                <div><strong>Google Apps Script:</strong> exposes an HTTP web app endpoint for add/update/delete operations.</div>
                <div><strong>ChatGPT in VS Code:</strong> speeds up coding changes, refactors, and debugging in this repo.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>3) Typical Change Workflow (Safe Path)</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div>1. Create/checkout your branch.</div>
                <div>2. Make requested UI/logic changes in VS Code (with or without ChatGPT assistance).</div>
                <div>3. Test local behavior for all affected media types.</div>
                <div>4. Commit + push to GitHub.</div>
                <div>5. Verify Vercel preview deployment.</div>
                <div>6. Merge to production branch and verify live site.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>4) How to Update Apps Script Correctly</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div>1. Paste updated <code>GOOGLE_APPS_SCRIPT.gs</code> code in Apps Script editor.</div>
                <div>2. Verify <code>doPost</code> has routes for every action used by frontend (add/update/delete per media type).</div>
                <div>3. Verify handler functions exist (example: <code>deleteBookRow_</code>).</div>
                <div>4. Deploy Web App as a <strong>new version</strong> (old versions continue serving old code).</div>
                <div>5. Confirm frontend env var points to correct Apps Script <code>/exec</code> URL.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>5) Environment Variables You Should Know</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div><code>NEXT_PUBLIC_SETTINGS_SHEET_CSV_URL</code> and similar CSV URLs: read data into app.</div>
                <div><code>NEXT_PUBLIC_SETTINGS_WRITE_URL</code>, <code>NEXT_PUBLIC_BOOKS_WRITE_URL</code>, <code>NEXT_PUBLIC_SHOWS_WRITE_URL</code>, <code>NEXT_PUBLIC_MOVIES_WRITE_URL</code>, <code>NEXT_PUBLIC_GAMES_WRITE_URL</code>: write endpoints.</div>
                <div>If read works but edits do not persist, check write URL variables first.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>6) Updating Covers, Frames, and Visual Assets</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div>1. Add/replace assets in repo <code>public/</code> (or configured storage path).</div>
                <div>2. Commit and push to GitHub.</div>
                <div>3. Wait for Vercel deploy and hard refresh browser cache.</div>
                <div>4. If URLs are generated from sheet titles, verify naming conventions still match.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>7) Settings Persistence Behavior</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div>Settings are cached locally for fast load, and can sync to Google Sheets.</div>
                <div>Use <strong>Save All Settings to Sheet</strong> after major tuning.</div>
                <div>If values look stale, use <strong>Load Settings from Sheet</strong> and re-open settings.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>8) Troubleshooting Cheatsheet</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div><strong>Error: function X is not defined:</strong> deployed Apps Script version is outdated or missing that function.</div>
                <div><strong>Menu missing in Sheets:</strong> menu builder function missing or wrong function name in <code>onOpen</code>.</div>
                <div><strong>Can view data but cannot edit:</strong> write URL env var missing/wrong or Apps Script permissions/deployment issue.</div>
                <div><strong>Vercel not showing latest:</strong> check branch deployed, latest commit, and deployment logs.</div>
                <div><strong>Unexpected UI behavior:</strong> test in local dev, check browser console, then compare with production build.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>9) Using ChatGPT in VS Code (Your Workflow)</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732" }}>
                <div>1. Describe exact change request in plain language and include file names when possible.</div>
                <div>2. Ask ChatGPT to implement directly and run checks.</div>
                <div>3. Review the patch and test key user paths.</div>
                <div>4. Commit only what you intend to ship.</div>
                <div>5. Keep Apps Script changes synchronized with frontend expectations.</div>
              </div>

              <div style={{ fontSize: 13, fontWeight: 900, color: "#5c3c38" }}>10) Monthly Maintenance Checklist</div>
              <div style={{ fontSize: 12, lineHeight: 1.55, color: "#3f3732", paddingBottom: 8 }}>
                <div>1. Confirm all write URLs are valid and not revoked.</div>
                <div>2. Verify add/update/delete for Books, Shows, Movies, Games.</div>
                <div>3. Verify Google Sheet top menus are present and correct.</div>
                <div>4. Verify settings save/load and sync status messaging.</div>
                <div>5. Verify sidebar filters, overlays, and popups on desktop + mobile width.</div>
                <div>6. Check latest Vercel deployment health and runtime errors.</div>
                <div>7. Export/backup critical Sheets tabs before major schema changes.</div>
              </div>
            </div>
          ) : null}

          {nav === "statistics" ? (
            <StatisticsView books={allBooks} movies={allMovies} shows={allShows} games={allGames} coverOverrides={coverOverrides} />
          ) : (
          <>
          {/* Stage measures width so shelves always align */}
          <div ref={stageRef} style={{ width: "100%" }}>
            {/* IMPORTANT: no vertical gap between shelves */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              <div
                  style={{
                    position: "sticky",
                    top: topSafeInset,
                    height: 45,
                    overflow: "hidden",
                    background: "transparent",
                    borderRadius: 0,
                    zIndex: 2000,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      zIndex: 1401,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingLeft: 10,
                      paddingRight: 10,
                      gap: 5,
                      transform: "translateY(-4.5px)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, width: "min(340px, calc(100% - 220px))" }}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          flex: 1,
                          borderRadius: 9,
                          border: "1px solid rgba(10, 6, 3, 0.68)",
                          background: "rgba(16, 10, 6, 0.54)",
                          boxShadow: "0 3px 10px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                          paddingLeft: 7,
                        }}
                      >
                        <img
                          src="/icon-search.png"
                          alt=""
                          width={9}
                          height={9}
                          style={{ display: "block", marginRight: 4, filter: "brightness(0) invert(1) opacity(0.62)" }}
                        />
                        <input
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="Search..."
                          style={{
                            flex: 1,
                            height: 22,
                            border: "none",
                            background: "transparent",
                            color: "rgba(250, 242, 230, 0.86)",
                            fontSize: 11,
                            fontWeight: 600,
                            outline: "none",
                          }}
                        />
                      </div>
                      <button
                        onClick={clearAllFilters}
                        title="Clear filters"
                        aria-label="Clear filters"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 24,
                          minWidth: 58,
                          padding: "3px 6px",
                          background: "rgba(28, 18, 10, 0.52)",
                          border: "1px solid rgba(10, 6, 3, 0.78)",
                          borderRadius: 9,
                          color: "rgba(250, 242, 230, 0.72)",
                          boxShadow: "0 3px 8px rgba(0, 0, 0, 0.34)",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => updateShowStatusIndicators(!showStatusIndicators)}
                        title="Toggle status indicators"
                        aria-label="Toggle status indicators"
                        aria-pressed={showStatusIndicators}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          height: 24,
                          minWidth: 68,
                          padding: "3px 7px",
                          background: showStatusIndicators
                            ? "linear-gradient(180deg, rgba(84, 129, 60, 0.76), rgba(54, 92, 38, 0.78))"
                            : "rgba(28, 18, 10, 0.52)",
                          border: showStatusIndicators
                            ? "1px solid rgba(190, 221, 166, 0.75)"
                            : "1px solid rgba(10, 6, 3, 0.78)",
                          borderRadius: 9,
                          color: showStatusIndicators ? "rgba(242, 255, 228, 0.95)" : "rgba(250, 242, 230, 0.72)",
                          boxShadow: showStatusIndicators
                            ? "0 3px 10px rgba(22, 48, 14, 0.55), inset 0 1px 0 rgba(234, 255, 218, 0.35)"
                            : "0 3px 8px rgba(0, 0, 0, 0.34)",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        <span
                          aria-hidden
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: showStatusIndicators ? "rgba(194, 246, 166, 0.95)" : "rgba(250, 242, 230, 0.45)",
                            boxShadow: showStatusIndicators
                              ? "0 0 0 1px rgba(173, 237, 138, 0.8), 0 0 8px rgba(150, 223, 108, 0.55)"
                              : "0 0 0 1px rgba(255, 255, 255, 0.2)",
                          }}
                        />
                        Status
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {nav === "watchlist-tv" ? (
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 4,
                          padding: 2,
                          borderRadius: 10,
                          border: "1px solid rgba(10, 6, 3, 0.78)",
                          background: "rgba(28, 18, 10, 0.52)",
                          boxShadow: "0 3px 8px rgba(0, 0, 0, 0.34)",
                        }}
                      >
                        {TV_WATCHLIST_SECTION_ORDER.map((sectionKey) => {
                          const sectionMeta = TV_WATCHLIST_SECTION_META[sectionKey];
                          const active = watchlistTvSectionFilter === sectionKey;
                          return (
                            <button
                              key={`watchlist-tv-filter-${sectionKey}`}
                              type="button"
                              onClick={() => setWatchlistTvSectionFilter(sectionKey)}
                              title={`Show ${sectionMeta.label}`}
                              aria-label={`Show ${sectionMeta.label}`}
                              aria-pressed={active}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: 4,
                                height: 20,
                                padding: "0 6px",
                                borderRadius: 8,
                                border: active
                                  ? `1px solid ${sectionMeta.badgeBorder}`
                                  : "1px solid rgba(255,255,255,0.2)",
                                background: active ? sectionMeta.badgeBackground : "rgba(17, 10, 6, 0.36)",
                                color: active ? sectionMeta.badgeColor : "rgba(250, 242, 230, 0.72)",
                                fontSize: 9,
                                fontWeight: 900,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                cursor: "pointer",
                                lineHeight: 1,
                                boxShadow: active ? "0 2px 6px rgba(0,0,0,0.3)" : "none",
                              }}
                            >
                              <span>{sectionMeta.label}</span>
                              <span
                                style={{
                                  borderRadius: 999,
                                  border: "1px solid rgba(255,255,255,0.24)",
                                  background: active ? "rgba(0, 0, 0, 0.24)" : "rgba(255, 255, 255, 0.06)",
                                  padding: "0 4px",
                                  fontSize: 8,
                                  letterSpacing: "0.02em",
                                }}
                              >
                                {watchlistTvSectionCounts[sectionKey]}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        color: "rgba(250, 242, 230, 0.68)",
                        letterSpacing: "0.01em",
                        lineHeight: 1,
                        textShadow: "0 2px 4px rgba(0, 0, 0, 0.5)",
                        background: "rgba(28, 18, 10, 0.52)",
                        border: "1px solid rgba(10, 6, 3, 0.78)",
                        borderRadius: 9,
                        padding: "4px 7px",
                        boxShadow: "0 3px 8px rgba(0, 0, 0, 0.34)",
                      }}
                    >
                      {`${shows.length} items`}
                    </span>
                    <button
                      onClick={() => {
                        setSettingsPopupOpen(false);
                        setSortPopupOpen((prev) => !prev);
                        setShowVersionNotes(false);
                      }}
                      title="Open sort options"
                      aria-label="Open sort options"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 24,
                        minWidth: 18,
                        padding: "3px 5px",
                        background: "rgba(28, 18, 10, 0.52)",
                        border: "1px solid rgba(10, 6, 3, 0.78)",
                        borderRadius: 9,
                        color: "rgba(250, 242, 230, 0.68)",
                        boxShadow: "0 3px 8px rgba(0, 0, 0, 0.34)",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="4" y1="6" x2="14" y2="6"></line>
                        <circle cx="17" cy="6" r="2"></circle>
                        <line x1="20" y1="6" x2="21" y2="6"></line>
                        <line x1="4" y1="12" x2="7" y2="12"></line>
                        <circle cx="10" cy="12" r="2"></circle>
                        <line x1="13" y1="12" x2="21" y2="12"></line>
                        <line x1="4" y1="18" x2="11" y2="18"></line>
                        <circle cx="14" cy="18" r="2"></circle>
                        <line x1="17" y1="18" x2="21" y2="18"></line>
                        </svg>
                      </button>
                    {nav === "smart-custom" && activeSmartList ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          handleDeleteSmartList(activeSmartList.id);
                        }}
                        title={`Delete smart list: ${activeSmartList.name}`}
                        aria-label={`Delete smart list: ${activeSmartList.name}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 24,
                          minWidth: 24,
                          padding: "3px 6px",
                          background: "rgba(118, 34, 34, 0.34)",
                          border: "1px solid rgba(170, 78, 78, 0.68)",
                          borderRadius: 9,
                          color: "rgba(255, 218, 218, 0.86)",
                          boxShadow: "0 3px 8px rgba(0, 0, 0, 0.34)",
                          cursor: "pointer",
                          fontSize: 11,
                          fontWeight: 800,
                          letterSpacing: "0.03em",
                          textTransform: "uppercase",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Delete List
                      </button>
                    ) : null}
                    <button
                      onClick={() => {
                        setSortPopupOpen(false);
                        setSettingsPopupOpen(false);
                        setShowVersionNotes(false);
                        setAddSaveError(null);
                        setAddModalOpen(true);
                      }}
                      title="Add new item"
                      aria-label="Add new item"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 24,
                        minWidth: 18,
                        padding: "3px 5px",
                        background: "rgba(28, 18, 10, 0.52)",
                        border: "1px solid rgba(10, 6, 3, 0.78)",
                        borderRadius: 9,
                        color: "rgba(250, 242, 230, 0.68)",
                        boxShadow: "0 3px 8px rgba(0, 0, 0, 0.34)",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                      </svg>
                    </button>
                    <div style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <button
                        onClick={openSettingsPopup}
                        title="Open settings"
                        aria-label="Open settings"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          height: 24,
                          minWidth: 18,
                          padding: "3px 5px",
                          background: "rgba(28, 18, 10, 0.52)",
                          border: "1px solid rgba(10, 6, 3, 0.78)",
                          borderRadius: 9,
                          color: "rgba(250, 242, 230, 0.68)",
                          boxShadow: "0 3px 8px rgba(0, 0, 0, 0.34)",
                          cursor: "pointer",
                        }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c0 .68.4 1.3 1.03 1.56.17.07.35.11.53.11H21a2 2 0 1 1 0 4h-.09c-.18 0-.36.04-.53.11-.63.26-1.03.88-1.03 1.56z"></path>
                        </svg>
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              {smartListBuilderOpen ? (
                <div style={{ height: Math.max(0, shelves.length * SHELF_HEIGHT) }} />
              ) : (
                <>
              {shelfRenderWindow.padTop > 0 ? (
                <div style={{ height: shelfRenderWindow.padTop }} />
              ) : null}
              {visibleShelves.map((shelfShows, visibleShelfIndex) => {
                const shelfIndex = shelfRenderWindow.start + visibleShelfIndex;
                return (
                <div
                  key={`shelf-${shelfIndex}`}
                  style={{
                    position: "relative",
                    height: SHELF_HEIGHT,
                    overflow: "hidden",
                    backgroundImage: `url(${shelfTheme})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: "100% 100%",
                    borderRadius: 0,
                    boxShadow: `${shelfIndex === 0 ? "0 12px 26px rgba(0,0,0,0.18), " : ""}inset 0 20px 30px rgba(0,0,0,0.45), inset 16px 0 24px rgba(0,0,0,0.35), inset -16px 0 24px rgba(0,0,0,0.35)`,
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      left: SHELF_SIDE_PADDING,
                      right: SHELF_SIDE_PADDING,
                      top: 0,
                      bottom: 0,
                    }}
                  >
                    {(() => {
                      let runningVisualX = 0;
                      return shelfShows.map((show, i) => {
                      const isBook = show.__type === "book";
                      const isMovie = show.__type === "movie";
                      const isGame = show.__type === "game";
                      const gamePlatformRaw = isGame ? safeStr((show as any).__renderPlatform || show.platform) : undefined;
                      // Determine primary platform from the row to keep shelf rendering deterministic.
                      const gamePlatform = isGame ? getRenderPlatform(gamePlatformRaw) : undefined;
                      const { itemSize, visualLeft, visualWidth } = getItemVisualLayout(show);
                      const x = Math.round(runningVisualX - visualLeft);
                      runningVisualX += visualWidth + gap;
                      const caseWidth = itemSize;
                      const caseHeight = isBook ? Math.round(itemSize * bookHeightMultiplier) : Math.round(itemSize * 1.5);

                      // Use appropriate insets based on item type
                      // For games, look up platform-specific insets or use Default
                      let insetTopVal, insetRightVal, insetBottomVal, insetLeftVal;
                      if (isBook) {
                        insetTopVal = bookInsetTopPx;
                        insetRightVal = bookInsetRightPx;
                        insetBottomVal = bookInsetBottomPx;
                        insetLeftVal = bookInsetLeftPx;
                      } else if (isMovie) {
                        insetTopVal = movieInsetTopPx;
                        insetRightVal = movieInsetRightPx;
                        insetBottomVal = movieInsetBottomPx;
                        insetLeftVal = movieInsetLeftPx;
                      } else if (isGame) {
                        const platformKey = gamePlatform || "Default";
                        const defaultInsets = platformInsets["Default"] || { top: 5, right: 5, bottom: 5, left: 5 };
                        const platformInset = platformInsets[platformKey];
                        const insets = platformKey !== "Default" && platformInset ? platformInset : defaultInsets;
                        
                        insetTopVal = insets.top;
                        insetRightVal = insets.right;
                        insetBottomVal = insets.bottom;
                        insetLeftVal = insets.left;
                      } else {
                        insetTopVal = caseInsetTopPx;
                        insetRightVal = caseInsetRightPx;
                        insetBottomVal = caseInsetBottomPx;
                        insetLeftVal = caseInsetLeftPx;
                      }
                      
                      // Get overlay and cover transform settings for the active media type
                      let overlayWidth = 100;
                      let overlayHeight = 100;
                      let overlayTop = 0;
                      let overlayLeft = 0;
                      let coverScale = { x: 100, y: 100 };
                      let coverOffsetX = 0;
                      let coverOffsetY = 0;
                      
                      if (isGame) {
                        const platformKey = gamePlatform || "Default";
                        const defaultOverlay = platformOverlaySettings["Default"] || { width: 100, height: 100, top: 0, left: 0 };
                        const platformOverlay = platformOverlaySettings[platformKey];
                        const overlay = platformOverlay || defaultOverlay;
                        
                        overlayWidth = overlay.width;
                        overlayHeight = overlay.height;
                        overlayTop = overlay.top;
                        overlayLeft = overlay.left;
                        
                        coverScale = platformCoverScale[platformKey] || platformCoverScale["Default"] || { x: 100, y: 100 };
                        const defaultCoverOffset = platformCoverOffset["Default"] || { x: 0, y: 0 };
                        const platformCoverOffsetSettings = platformCoverOffset[platformKey] || defaultCoverOffset;
                        coverOffsetX = platformCoverOffsetSettings.x;
                        coverOffsetY = platformCoverOffsetSettings.y;
                      } else if (isBook) {
                        overlayWidth = bookOverlaySettings.width;
                        overlayHeight = bookOverlaySettings.height;
                        overlayTop = bookOverlaySettings.top;
                        overlayLeft = bookOverlaySettings.left;
                        coverScale = bookCoverScale;
                        coverOffsetX = bookCoverOffset.x;
                        coverOffsetY = bookCoverOffset.y;
                      } else if (isMovie) {
                        overlayWidth = movieOverlaySettings.width;
                        overlayHeight = movieOverlaySettings.height;
                        overlayTop = movieOverlaySettings.top;
                        overlayLeft = movieOverlaySettings.left;
                        coverScale = movieCoverScale;
                        coverOffsetX = movieCoverOffset.x;
                        coverOffsetY = movieCoverOffset.y;
                      } else {
                        overlayWidth = tvOverlaySettings.width;
                        overlayHeight = tvOverlaySettings.height;
                        overlayTop = tvOverlaySettings.top;
                        overlayLeft = tvOverlaySettings.left;
                        coverScale = tvCoverScale;
                        coverOffsetX = tvCoverOffset.x;
                        coverOffsetY = tvCoverOffset.y;
                      }
                      const gameCoverFit = getGameCoverFit(gamePlatform);

                      const gameOverlaySrc = isGame ? getOverlayFrameUrl("game", gamePlatform) : "";
                      const gameOverlayExpectedSrc = isGame ? getOverlayFrameDefaultPath("game", gamePlatform) : GAME_FRAME_IMAGE;
                      const nonGameOverlayType: "tv" | "movie" | "book" = isBook ? "book" : isMovie ? "movie" : "tv";
                      const nonGameOverlaySrc = getOverlayFrameUrl(nonGameOverlayType);
                      const nonGameOverlayExpectedSrc = getOverlayFrameDefaultPath(nonGameOverlayType);

                      const gameFrameSource = isGame ? getGameFrameSourceDimensions(gamePlatform) : DEFAULT_GAME_FRAME_SIZE;
                      const srcW = isBook ? BOOK_SRC_W : isMovie ? MOVIE_SRC_W : isGame ? gameFrameSource.width : CASE_SRC_W;
                      const srcH = isBook ? BOOK_SRC_H : isMovie ? MOVIE_SRC_H : isGame ? gameFrameSource.height : CASE_SRC_H;

                      const insetTop = Math.round((insetTopVal / srcH) * caseHeight);
                      const insetRight = Math.round((insetRightVal / srcW) * caseWidth);
                      const insetBottom = Math.round((insetBottomVal / srcH) * caseHeight);
                      const insetLeft = Math.round((insetLeftVal / srcW) * caseWidth);
                      const coverTranslateX = coverOffsetX * 0.35;
                      const coverTranslateY = coverOffsetY * 0.35;
                      const insetWidthPx = Math.max(1, caseWidth - insetLeft - insetRight);
                      const insetHeightPx = Math.max(1, caseHeight - insetTop - insetBottom);
                      const coverScaleX = coverScale.x / 100;
                      const coverScaleY = coverScale.y / 100;
                      const coverTranslateXPx = (coverTranslateX / 100) * insetWidthPx;
                      const coverTranslateYPx = (coverTranslateY / 100) * insetHeightPx;
                      const coverVisualWidthPx = insetWidthPx * coverScaleX;
                      const coverVisualHeightPx = insetHeightPx * coverScaleY;
                      const coverVisualLeftPx =
                        insetLeft + (insetWidthPx - coverVisualWidthPx) / 2 + coverTranslateXPx;
                      const coverVisualTopPx =
                        insetTop + (insetHeightPx - coverVisualHeightPx) / 2 + coverTranslateYPx;
                      const selectedCoverUrl = getDisplayCoverUrl(show);
                      const statusIndicator = getStatusIndicator(show);
                      const statusRegionLeftPx = coverVisualLeftPx;
                      const statusRegionTopPx = coverVisualTopPx;
                      const statusRegionWidthPx = coverVisualWidthPx;
                      const statusRegionHeightPx = coverVisualHeightPx;
                      const statusDotLeftPx = Math.round(
                        statusRegionLeftPx + statusRegionWidthPx - STATUS_DOT_NUDGE_LEFT_PX - statusDotPixelSize + statusIconOffsetX
                      );
                      const statusDotTopPx = Math.round(
                        statusRegionTopPx + statusRegionHeightPx - STATUS_DOT_NUDGE_UP_PX - statusDotPixelSize + statusIconOffsetY
                      );
                      const statusDotLeftClampedPx = Math.max(
                        insetLeft,
                        Math.min(caseWidth - insetRight - statusDotPixelSize, statusDotLeftPx)
                      );
                      const statusDotTopClampedPx = Math.max(
                        insetTop,
                        Math.min(caseHeight - insetBottom - statusDotPixelSize, statusDotTopPx)
                      );
                      const itemKey = getMediaItemKey(show);
                      const tvWatchlistSectionKey =
                        nav === "watchlist-tv" && show.__type === "tv"
                          ? watchlistTvSectionByVisibleKey.get(itemKey) || getTvWatchlistSectionForItem(show)
                          : null;
                      const tvWatchlistSectionMeta = tvWatchlistSectionKey
                        ? TV_WATCHLIST_SECTION_META[tvWatchlistSectionKey]
                        : null;
                      const isWishlistCase =
                        nav === "wishlist" ||
                        nav === "wishlist-books" ||
                        nav === "play-next" ||
                        nav === "watchlist-movies" ||
                        nav === "watchlist-tv" ||
                        Boolean(manualSortableSmartListId);
                      const isWishlistPointerDragging = Boolean(
                        isWishlistCase &&
                        wishlistPointerDrag?.active &&
                        wishlistPointerDrag.key === itemKey
                      );
                      const wishlistDragState = isWishlistPointerDragging ? wishlistPointerDrag : null;
                      const dragLeft = wishlistDragState
                        ? wishlistDragState.pointerX - wishlistDragState.grabOffsetX
                        : x;
                      const dragTop = wishlistDragState
                        ? wishlistDragState.pointerY - wishlistDragState.grabOffsetY
                        : undefined;
                      const dragShakeDeg = wishlistDragState
                        ? 0
                        : 0;
                      const isWishlistDragActive = Boolean(isWishlistCase && wishlistPointerDrag?.active);
                      const isDragHoverTarget = Boolean(
                        isWishlistDragActive && wishlistDragHoverKey === itemKey && !isWishlistPointerDragging
                      );
                      const isDragHoverNeighbor = Boolean(
                        isWishlistDragActive && wishlistDragNeighborKeys.has(itemKey) && !isWishlistPointerDragging
                      );
                      const hoverPushX =
                        wishlistDragDirection === 0
                          ? 0
                          : isDragHoverTarget
                            ? wishlistDragDirection * 1.8
                            : isDragHoverNeighbor
                              ? wishlistDragDirection * 0.8
                              : 0;
                      const hoverPushY = isDragHoverTarget ? -1.2 : isDragHoverNeighbor ? -0.6 : 0;
                      const dragPushX = wishlistDragState ? 0 : hoverPushX;
                      const dragPushY = wishlistDragState ? 0 : hoverPushY;
                      const dragScale = wishlistDragState ? 1 : isDragHoverTarget ? 1.008 : isDragHoverNeighbor ? 1.003 : 1;

                      return (
                        <div
                          key={isWishlistCase ? itemKey : `${show.tmdbId ?? show.title}-${i}`}
                          title={show.title}
                          className="case"
                          ref={(node) => {
                            registerWishlistCaseNode(itemKey, isWishlistCase ? node : null);
                          }}
                          style={{
                            position: isWishlistPointerDragging ? "fixed" : "absolute",
                            left: dragLeft,
                            top: isWishlistPointerDragging ? dragTop : undefined,
                            bottom: isWishlistPointerDragging ? undefined : LIP_FROM_BOTTOM,
                            width: caseWidth,
                            height: caseHeight,
                            overflow: "visible",
                            cursor: isWishlistCase ? (isWishlistPointerDragging ? "grabbing" : "grab") : "pointer",
                            opacity: isWishlistPointerDragging ? 0.94 : 1,
                            zIndex: isWishlistCase ? (isWishlistPointerDragging ? 60 : draggingWishlistKey ? 2 : undefined) : undefined,
                            transition: isWishlistCase
                              ? isWishlistPointerDragging
                                ? "opacity 70ms ease"
                                : "left 118ms cubic-bezier(0.22, 0.76, 0.2, 1), opacity 90ms ease, transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1)"
                              : undefined,
                            touchAction: isWishlistCase ? "none" : undefined,
                            "--dragShakeDeg": `${dragShakeDeg.toFixed(2)}deg`,
                            "--dragPushX": `${dragPushX.toFixed(2)}px`,
                            "--dragPushY": `${dragPushY.toFixed(2)}px`,
                            "--dragScale": dragScale.toFixed(3),
                          } as CSSProperties}
                          draggable={false}
                          onPointerDown={isWishlistCase ? (event) => handleWishlistCasePointerDown(event, itemKey) : undefined}
                          onClick={() => {
                            if (suppressCaseClickRef.current) return;
                            setModalItem(buildItemWithCoverSelection(show, coverOverrides));
                            setModalOpen(true);
                          }}
                          onMouseMove={handleCaseMouseMove}
                          onMouseLeave={handleCaseMouseLeave}
                        >
                          <div className="caseSurface">
                          {isGame ? (
                            <>
                              <div
                                style={{
                                  position: "absolute",
                                  top: insetTop,
                                  right: insetRight,
                                  bottom: insetBottom,
                                  left: insetLeft,
                                  overflow: "hidden",
                                  borderRadius: 0,
                                  background: "transparent",
                                }}
                              >
                                {showInsetGuide ? (
                                  <div
                                    aria-hidden
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      outline: "2px dashed rgba(255,0,0,0.75)",
                                      outlineOffset: "-2px",
                                      pointerEvents: "none",
                                    }}
                                  />
                                ) : null}

                                {selectedCoverUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    className="case-poster"
                                    src={selectedCoverUrl}
                                    alt={show.title}
                                    loading="lazy"
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: gameCoverFit,
                                      objectPosition: "center",
                                      display: "block",
                                      transform: `translate(${coverTranslateX}%, ${coverTranslateY}%) scale(${coverScale.x / 100}, ${coverScale.y / 100})`,
                                      transformOrigin: "center",
                                    }}
                                    onError={e => {
                                      const itemKey = getMediaItemKey(show);
                                      const failedUrl = safeStr(e.currentTarget.currentSrc || e.currentTarget.src);
                                      if (!failedUrl) return;
                                      const currentAttempts = failedCoverAttempts[itemKey]?.[failedUrl] || 0;
                                      const nextAttempts = currentAttempts + 1;
                                      setFailedCoverAttempts((prev) => {
                                        const itemAttempts = prev[itemKey] || {};
                                        return {
                                          ...prev,
                                          [itemKey]: {
                                            ...itemAttempts,
                                            [failedUrl]: nextAttempts,
                                          },
                                        };
                                      });
                                      if (nextAttempts < 2) return;
                                      setFailedCoverUrls((prev) => {
                                        const existing = prev[itemKey] || [];
                                        if (existing.includes(failedUrl)) return prev;
                                        return { ...prev, [itemKey]: [...existing, failedUrl] };
                                      });
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      textAlign: "center",
                                      padding: 10,
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: "rgba(0,0,0,0.65)",
                                      background:
                                        "linear-gradient(135deg, rgba(255,255,255,0.65), rgba(0,0,0,0.08))",
                                    }}
                                  >
                                    No poster
                                  </div>
                                )}
                                {selectedCoverUrl && gameCoverFit === "cover" ? (
                                  <div
                                    aria-hidden
                                    className="case-reflection"
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      pointerEvents: "none",
                                      zIndex: 2,
                                      background:
                                        "linear-gradient(165deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.04) 62%, rgba(255,255,255,0.0) 85%)",
                                      transform: `translate(${coverTranslateX}%, ${coverTranslateY}%) scale(${coverScale.x / 100}, ${coverScale.y / 100})`,
                                      transformOrigin: "center",
                                    }}
                                  />
                                ) : null}

                              </div>

                              <div
                                style={{
                                  position: "absolute",
                                  top: `${50 + overlayTop}%`,
                                  left: `${50 + overlayLeft}%`,
                                  width: "100%",
                                  height: "100%",
                                  transform: `translate(-50%, -50%) scale(${overlayWidth / 100}, ${overlayHeight / 100})`,
                                  pointerEvents: "none",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={gameOverlaySrc}
                                  onError={(e) => {
                                    const currentSrc = safeStr(e.currentTarget.getAttribute("src"));
                                    if (e.currentTarget.dataset.fallbackTried !== "1" && currentSrc !== gameOverlayExpectedSrc) {
                                      e.currentTarget.dataset.fallbackTried = "1";
                                      e.currentTarget.src = gameOverlayExpectedSrc;
                                      return;
                                    }
                                    if (e.currentTarget.src !== GAME_FRAME_IMAGE) {
                                      e.currentTarget.src = GAME_FRAME_IMAGE;
                                    }
                                  }}
                                  alt=""
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    objectFit: "fill",
                                    pointerEvents: "none",
                                    userSelect: "none",
                                  }}
                                  draggable={false}
                                />
                              </div>
                            </>
                          ) : (
                            <>
                              <div
                                style={{
                                  position: "absolute",
                                  top: insetTop,
                                  right: insetRight,
                                  bottom: insetBottom,
                                  left: insetLeft,
                                  // Allow cover translation/scale to move beyond raw inset bounds so it can
                                  // align with resized/repositioned overlays without hard clipping at inset edge.
                                  overflow: "visible",
                                  borderRadius: 0,
                                  background: "transparent",
                                }}
                              >
                                {showInsetGuide ? (
                                  <div
                                    aria-hidden
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      outline: "2px dashed rgba(255,0,0,0.75)",
                                      outlineOffset: "-2px",
                                      pointerEvents: "none",
                                    }}
                                  />
                                ) : null}

                                {selectedCoverUrl ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    className="case-poster"
                                    src={selectedCoverUrl}
                                    alt={show.title}
                                    loading="lazy"
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      objectFit: "cover",
                                      objectPosition: "center",
                                      display: "block",
                                      transform: `translate(${coverTranslateX}%, ${coverTranslateY}%) scale(${coverScale.x / 100}, ${coverScale.y / 100})`,
                                      transformOrigin: "center",
                                    }}
                                    onError={e => {
                                      const itemKey = getMediaItemKey(show);
                                      const failedUrl = safeStr(e.currentTarget.currentSrc || e.currentTarget.src);
                                      if (!failedUrl) return;
                                      const currentAttempts = failedCoverAttempts[itemKey]?.[failedUrl] || 0;
                                      const nextAttempts = currentAttempts + 1;
                                      setFailedCoverAttempts((prev) => {
                                        const itemAttempts = prev[itemKey] || {};
                                        return {
                                          ...prev,
                                          [itemKey]: {
                                            ...itemAttempts,
                                            [failedUrl]: nextAttempts,
                                          },
                                        };
                                      });
                                      if (nextAttempts < 2) return;
                                      setFailedCoverUrls((prev) => {
                                        const existing = prev[itemKey] || [];
                                        if (existing.includes(failedUrl)) return prev;
                                        return { ...prev, [itemKey]: [...existing, failedUrl] };
                                      });
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: "100%",
                                      height: "100%",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      textAlign: "center",
                                      padding: 10,
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: "rgba(0,0,0,0.65)",
                                      background:
                                        "linear-gradient(135deg, rgba(255,255,255,0.65), rgba(0,0,0,0.08))",
                                    }}
                                  >
                                    No poster
                                  </div>
                                )}
                                {selectedCoverUrl ? (
                                  <div
                                    aria-hidden
                                    className="case-reflection"
                                    style={{
                                      position: "absolute",
                                      inset: 0,
                                      pointerEvents: "none",
                                      zIndex: 2,
                                      background:
                                        "linear-gradient(165deg, rgba(255,255,255,0.24) 0%, rgba(255,255,255,0.12) 30%, rgba(255,255,255,0.04) 62%, rgba(255,255,255,0.0) 85%)",
                                      transform: `translate(${coverTranslateX}%, ${coverTranslateY}%) scale(${coverScale.x / 100}, ${coverScale.y / 100})`,
                                      transformOrigin: "center",
                                    }}
                                  />
                                ) : null}

                              </div>

                              {/* Case frame overlay */}
                              <div
                                style={{
                                  position: "absolute",
                                  top: `${50 + overlayTop}%`,
                                  left: `${50 + overlayLeft}%`,
                                  width: "100%",
                                  height: "100%",
                                  transform: `translate(-50%, -50%) scale(${overlayWidth / 100}, ${overlayHeight / 100})`,
                                  pointerEvents: "none",
                                }}
                              >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={nonGameOverlaySrc}
                                  onError={(e) => {
                                    const currentSrc = safeStr(e.currentTarget.getAttribute("src"));
                                    if (e.currentTarget.dataset.fallbackTried !== "1" && currentSrc !== nonGameOverlayExpectedSrc) {
                                      e.currentTarget.dataset.fallbackTried = "1";
                                      e.currentTarget.src = nonGameOverlayExpectedSrc;
                                    }
                                  }}
                                  alt=""
                                  style={{
                                    position: "absolute",
                                    inset: 0,
                                    objectFit: "fill",
                                    pointerEvents: "none",
                                    userSelect: "none",
                                  }}
                                  draggable={false}
                                />
                              </div>
                            </>
                          )}

                          </div>

                          {tvWatchlistSectionMeta ? (
                            <div
                              aria-label={`Watchlist status: ${tvWatchlistSectionMeta.label}`}
                              title={`Watchlist status: ${tvWatchlistSectionMeta.label}`}
                              style={{
                                position: "absolute",
                                left: Math.max(4, insetLeft + 4),
                                top: Math.max(4, insetTop + 4),
                                maxWidth: Math.max(36, caseWidth - insetLeft - insetRight - 8),
                                borderRadius: 999,
                                border: `1px solid ${tvWatchlistSectionMeta.badgeBorder}`,
                                background: tvWatchlistSectionMeta.badgeBackground,
                                color: tvWatchlistSectionMeta.badgeColor,
                                boxShadow: "0 2px 5px rgba(0,0,0,0.34)",
                                padding: "2px 6px",
                                fontSize: 8,
                                lineHeight: 1,
                                fontWeight: 900,
                                letterSpacing: "0.04em",
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                pointerEvents: "none",
                                zIndex: 28,
                              }}
                            >
                              {tvWatchlistSectionMeta.label}
                            </div>
                          ) : null}

                          {showStatusIndicators && statusIndicator ? (
                            <div
                              aria-label={`Status: ${statusIndicator.label}`}
                              title={statusIndicator.label}
                              style={{
                                position: "absolute",
                                left: statusDotLeftClampedPx,
                                top: statusDotTopClampedPx,
                                width: statusDotPixelSize,
                                height: statusDotPixelSize,
                                borderRadius: "50%",
                                border: `2px solid color-mix(in srgb, ${statusIndicator.color} 78%, black)`,
                                background: statusIndicator.color,
                                boxShadow:
                                  "inset 0 1px 1px rgba(255,255,255,0.18), 0 2px 6px rgba(0,0,0,0.35)",
                                zIndex: 26,
                                pointerEvents: "none",
                              }}
                            >
                              <div
                                aria-hidden
                                style={{
                                  position: "absolute",
                                  left: 2,
                                  top: 2,
                                  width: "40%",
                                  height: "40%",
                                  borderRadius: "50%",
                                  background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), rgba(255,255,255,0.02) 75%)",
                                }}
                              />
                            </div>
                          ) : null}

                          {showInsetGuide && isGame ? (
                            <div
                              style={{
                                position: "absolute",
                                left: 4,
                                right: 4,
                                bottom: 4,
                                zIndex: 20,
                                background: "rgba(8, 12, 18, 0.78)",
                                color: "#d8e7ff",
                                border: "1px solid rgba(150, 176, 220, 0.45)",
                                borderRadius: 4,
                                padding: "2px 4px",
                                fontSize: 8,
                                lineHeight: 1.2,
                                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                pointerEvents: "none",
                              }}
                            >
                              {getGameInsetDebugReadout(gamePlatform || "Default")}
                            </div>
                          ) : null}
                        </div>
                      );
                    });
                  })()}
                  </div>
                </div>
                  );
                })}
              {shelfRenderWindow.padBottom > 0 ? (
                <div style={{ height: shelfRenderWindow.padBottom }} />
              ) : null}
              {insetEditorOpen && shelfRenderWindow.padBottom > 0 ? (
                <div style={{ height: shelfRenderWindow.padBottom }} />
              ) : null}
                </>
              )}
            </div>

            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
              View: {nav} · Shelves: {shelves.length} · {postersPerShelf} per shelf · lip offset {LIP_FROM_BOTTOM}px
            </div>
          </div>
          </>
          )}
        </main>
      </div>

      <input
        ref={sidebarIconFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleSidebarIconFileChange}
      />

      {/* MediaModal for cover/info popup - overlays app */}
      <AddItemModal
        open={addModalOpen}
        onClose={() => {
          if (addingItem) return;
          setAddModalOpen(false);
          setAddSaveError(null);
        }}
        onSave={handleAddLibraryItem}
        isSaving={addingItem}
        saveError={addSaveError}
        gamePlatformOptions={gamePlatformOptions}
        gameOwnershipOptions={gameOwnershipOptions}
        gameFormatOptions={gameFormatOptions}
        gameStatusOptions={gameStatusOptions}
      />

      {/* MediaModal for cover/info popup - overlays app */}
      <MediaModal
        item={modalItem}
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setCoverUploadError(null);
        }}
        onReplaceCover={handleReplaceCover}
        onSaveBookEdits={handleSaveBookEdits}
        onSaveShowEdits={handleSaveShowEdits}
        onSaveMovieEdits={handleSaveMovieEdits}
        onSaveGameEdits={handleSaveGameEdits}
        onDeleteItem={handleDeleteLibraryItem}
        gamePlatformOptions={gamePlatformOptions}
        gameOwnershipOptions={gameOwnershipOptions}
        gameFormatOptions={gameFormatOptions}
        gameStatusOptions={gameStatusOptions}
        popupCoverMode={modalItem ? popupCoverModes[getMediaItemKey(modalItem)] : undefined}
        onPopupCoverModeChange={handlePopupCoverModeChange}
        isReplacingCover={Boolean(modalItem && uploadingCoverForKey === getMediaItemKey(modalItem))}
        replaceCoverError={coverUploadError}
      />

      {/* Mobile layout: sidebar collapses above */}
      <style>{`
        @media (max-width: 980px){
          .__layoutFix__{
            display: block !important;
          }
        }
      `}</style>
      <style jsx>{`
        .sidebar {
          font-family: "Geist Sans", "Geist", "Segoe UI", sans-serif;
          background-image: url('/sidebar-texture.png'), linear-gradient(180deg, #f4f1ea 0%, #efe7db 100%);
          background-repeat: repeat, no-repeat;
          background-size: auto 28px, cover;
          background-position: top left, center;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .sidebar::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
        .sidebarScrollContent {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .sidebarScrollContent::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }
        .sideItem {
          width: 100%;
          padding: 1px 4px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: ${sidebarTheme === "darkBlue" ? "rgba(230, 239, 255, 0.92)" : "#2A2A2A"};
          font-size: 13px;
          font-weight: 500;
          font-family: "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          cursor: pointer;
          transition: all 150ms ease;
        }
        .sideItem:hover { 
          background: ${sidebarTheme === "darkBlue" ? "rgba(124, 160, 224, 0.14)" : "rgba(0,0,0,0.02)"};
        }
        .sideItem.active {
          background: ${currentTheme.activeHighlight};
          box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          border-color: ${currentTheme.highlightBorder};
          font-weight: 600;
          color: ${currentTheme.secondaryColor};
        }
        .sideItem.primary { background: transparent; }
        .sideItem.primary:hover { background: rgba(0,0,0,0.02); }
        .sideItem.primary.active { background: ${currentTheme.activeHighlight}; color: ${currentTheme.secondaryColor}; }
        .sideSubItem {
          width: 100%;
          padding: 4px 6px;
          border-radius: 8px;
          border: ${sidebarTheme === "darkBlue" ? "1px solid rgba(142, 178, 234, 0.42)" : "1px solid rgba(0, 0, 0, 0.06)"};
          background: ${sidebarTheme === "darkBlue" ? "rgba(19, 39, 72, 0.62)" : "rgba(255, 255, 255, 0.6)"};
          color: ${sidebarTheme === "darkBlue" ? "rgba(233, 243, 255, 0.98)" : "rgba(0, 0, 0, 0.7)"};
          font-size: 12px;
          font-weight: 500;
          font-family: "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          cursor: pointer;
          transition: background 140ms ease, border-color 140ms ease;
        }
        .sideSubItem:hover {
          background: ${sidebarTheme === "darkBlue" ? "rgba(36, 71, 122, 0.7)" : "rgba(0, 0, 0, 0.05)"};
        }
        .sideSubItem.active {
          background: ${currentTheme.activeHighlight};
          border-color: ${currentTheme.highlightBorder};
          color: ${sidebarTheme === "darkBlue" ? "rgba(245, 250, 255, 1)" : "rgba(0, 0, 0, 0.9)"};
          font-weight: 700;
        }
        .case {
          position: relative;
          filter: drop-shadow(9px 12px 9px rgba(0, 0, 0, 0.34));
        }
        .caseSurface {
          position: absolute;
          inset: 0;
          overflow: hidden;
          transition: transform 70ms ease, filter 140ms ease;
          transform: translate3d(var(--dragPushX, 0px), var(--dragPushY, 0px), 0) perspective(900px) rotateY(var(--tiltY, 0deg)) rotateX(var(--tiltX, 0deg)) rotateZ(var(--dragShakeDeg, 0deg)) scale(var(--dragScale, 1));
          transform-style: preserve-3d;
        }
        .case-reflection {
          transition: opacity 180ms ease;
          opacity: 0;
        }
        .case:hover .case-reflection {
          opacity: 0.82;
        }
      `}</style>
    </div>
  );
}
