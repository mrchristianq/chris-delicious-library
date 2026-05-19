/* =====================================================================================
  Chris' Delicious Library
  Version metadata is defined by APP_VERSION and VERSION_HISTORY below.
===================================================================================== */

"use client";

import { type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Papa from "papaparse";
import { MediaModal } from "./components/MediaModal";
import { AddItemModal, type AddExtendedType } from "./components/AddItemModal";
import { StatisticsView } from "./components/StatisticsView";
import { RoadmapView } from "./components/RoadmapView";
import { BookDetailsPage } from "./components/BookDetailsPage";
import { MovieDetailsPage } from "./components/MovieDetailsPage";
import { TVDetailsPage } from "./components/TVDetailsPage";
import { GameDetailsPage } from "./components/GameDetailsPage";
import { BookDetailsEditModal } from "./components/BookDetailsEditModal";
import { MovieDetailsEditModal } from "./components/MovieDetailsEditModal";
import { TVDetailsEditModal } from "./components/TVDetailsEditModal";
import { GameDetailsEditModal } from "./components/GameDetailsEditModal";
import { RateItModal } from "./components/RateItModal";
import { COVER_IMAGE_RADIUS_STYLE } from "./components/coverStyles";

type Row = Record<string, string>;
type CoverCandidate = { label: string; url: string };
type MediaType = "book" | "movie" | "tv" | "game";
type CoverScaleSettings = { x: number; y: number };
type CoverOffsetSettings = { x: number; y: number };
type SidebarModuleDefaults = {
  library: {
    iconSize: number;
    fontSize: number;
    fontWeight: string;
    iconGap: number;
    headerFontSize: number;
    headerFontWeight: string;
  };
  smartLists: {
    iconSize: number;
    fontSize: number;
    fontWeight: string;
    iconGap: number;
    headerFontSize: number;
    headerFontWeight: string;
  };
  discover: {
    iconSize: number;
    fontSize: number;
    fontWeight: string;
    iconGap: number;
    headerFontSize: number;
    headerFontWeight: string;
  };
};
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
  startTimeMs?: number;
};

type WishlistDragPlacement = "before" | "after";

type WishlistDragTarget = {
  key: string;
  placement: WishlistDragPlacement;
};

type Show = {
  title: string;
  posterUrl: string;
  customImageUrl?: string;
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
  runtime?: string;
  episodeRuntime?: string;
  averageEpisodeRuntime?: string;
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
  creator?: string;
  topcast?: string;
  topcastPhotos?: string;
  r2CoverUrl?: string;
  r2CoverUrlDate?: string;
  r2BackdropUrl?: string;
  r2BackdropUrlDate?: string;
  recommendationSource?: string;
  recommendedIds?: string;
  recommendedTitles?: string;
  recommendationsLastChecked?: string;
  recommendationsHidden?: string;
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
  r2CoverUrl?: string;
  r2CoverUrlDate?: string;
  hardcoverId?: string;
  recommendationSource?: string;
  recommendedIds?: string;
  recommendedTitles?: string;
  recommendationsLastChecked?: string;
  recommendationsHidden?: string;
};

type Movie = {
  title: string;
  posterUrl: string;
  customImageUrl?: string;
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
  director?: string;
  tagline?: string;
  budget?: string;
  revenue?: string;
  topcast?: string;
  topcastPhotos?: string;
  r2CoverUrl?: string;
  r2CoverUrlDate?: string;
  r2BackdropUrl?: string;
  r2BackdropUrlDate?: string;
  recommendationSource?: string;
  recommendedIds?: string;
  recommendedTitles?: string;
  recommendationsLastChecked?: string;
  recommendationsHidden?: string;
};

type Game = {
  title: string;
  posterUrl: string;
  customImageUrl?: string;
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
  screenshotsUrl?: string;
  wishlistOrder?: string;
  queuedOrder?: string;
  igdbId?: string;
  igdbIdOverride?: string;
  localCoverUrl?: string;
  tag?: string;
  r2CoverUrl?: string;
  r2CoverUrlDate?: string;
  r2BackdropUrl?: string;
  r2BackdropUrlDate?: string;
  recommendationSource?: string;
  recommendedIds?: string;
  recommendedTitles?: string;
  recommendationsLastChecked?: string;
  recommendationsHidden?: string;
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
const APP_VERSION = "10.0";
const STATIC_SITE_WRITE_MESSAGE =
  "This GitHub Pages version is read-only for server-backed actions. Use the server-hosted version to save edits.";
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
const NOW_PLAYING_SORT_FIELD_SETTING_KEY = "viewSortField:now-playing";
const NOW_PLAYING_SORT_ORDER_SETTING_KEY = "viewSortOrder:now-playing";
const NOW_PLAYING_MANUAL_ORDER_SETTING_KEY = "viewManualOrder:now-playing";
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
// Static cache-bust tag baked into every sidebar-icon URL. The icon URLs used
// to be a fixed "?v=0", so a browser that cached a stale icon for that exact
// URL never re-fetched. This is a non-zero constant (identical on server and
// client, so no hydration mismatch); bump it if a stale icon ever sticks.
const SIDEBAR_ICON_CACHE_BUST = "2026-05-r1";
const STATUS_ICON_OVERRIDES_LOCAL_KEY = "cdlStatusIconOverrides";
const STATUS_ICON_SETTING_PREFIX = "statusIcon:";
const MOBILE_ONLY_COVER_SCALE_LOCAL_KEY = "cdlMobileCoverScalePct";
const MOBILE_COVER_SCALE_BY_GROUP_LOCAL_KEY = "cdlMobileCoverScaleByGroup";
const POPUP_OVERLAY_Z_INDEX = 2147483000;
const POPUP_PANEL_Z_INDEX = 2147483200;
const POPUP_FAQ_Z_INDEX = 2147483300;
const COVER_SCALE_SETTING_KEYS: Record<CoverScaleGroupKey, string> = {
  home: "rowHeightScalePct:home",
  books: "rowHeightScalePct:books",
  movies: "rowHeightScalePct:movies",
  tv: "rowHeightScalePct:tv",
  games: "rowHeightScalePct:games",
};
const MEDIA_COVER_SIZE_SETTING_KEYS = {
  tv: "mediaCoverSizePct:tv",
  movies: "mediaCoverSizePct:movies",
  books: "mediaCoverSizePct:books",
  games: "mediaCoverSizePct:games",
  audiobooks: "mediaCoverSizePct:audiobooks",
} as const;
const SHELF_THEME_MODE_SETTING_KEY = "shelfThemeMode";
const COVER_TITLES_VISIBLE_SETTING_KEY = "coverTitlesVisible";
const DEFAULT_MEDIA_COVER_SIZE_PCT = {
  tv: 93,
  movies: 100,
  books: 87,
  games: 75,
  audiobooks: 64,
} as const;
const DEFAULT_LOGO_SETTINGS = { size: 230, top: 12, left: -28 } as const;
const DEFAULT_SYNC_ICON_SETTINGS = { size: 12, top: 8 } as const;
const DEFAULT_STATUS_ICON_SETTINGS = { scale: 100, offsetX: 0, offsetY: 0 } as const;
const DEFAULT_RATING_BADGE_SETTINGS = { scale: 100, offsetX: 0, offsetY: 0 } as const;
const DEFAULT_SIDEBAR_SETTINGS = {
  iconSize: 16,
  fontSize: 11,
  fontWeight: "150",
  iconGap: 8,
  headerFontSize: 11,
  headerFontWeight: "600",
  smartFontSize: 12,
  smartFontWeight: "500",
  smartGap: 8,
  smartHeaderSize: 11,
  smartHeaderWeight: "700",
  smartIconSize: 16,
  discoverFontSize: 12,
  discoverFontWeight: "500",
  discoverGap: 8,
  discoverHeaderSize: 11,
  discoverHeaderWeight: "700",
  discoverIconSize: 16,
  sectionGap: 3,
  libraryItemGap: 0,
  smartItemGap: 0,
  discoverItemGap: 0,
  submenuGap: 0,
  rowDensityOffset: 0,
} as const;
const DEFAULT_SIDEBAR_HIGHLIGHT_COLORS = {
  home: "#808893",
  books: "#5fb85c",
  movies: "#a168d6",
  tv: "#ff9934",
  games: "#3492ff",
} as const;
const DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK = {
  home: "#5d6066",
  books: "#3f8f57",
  movies: "#6f4fb3",
  tv: "#cf7c2d",
  games: "#2d6fca",
} as const;
const LEGACY_DARK_HIGHLIGHT_MONO = "#5d6066";
type MediaCoverSizePctState = {
  tv: number;
  movies: number;
  books: number;
  games: number;
  audiobooks: number;
};
const getCoverScaleGroupForNav = (nav: NavKey | null | undefined): CoverScaleGroupKey | null => {
  if (nav === "books" || nav === "movies" || nav === "tv" || nav === "games") return nav;
  if (!nav || nav === "statistics" || nav === "roadmap") return null;
  return "home";
};
const VERSION_HISTORY = [
  {
    version: "10.0",
    date: "2026-05-18",
    notes: [
      "Locked the desktop Statistics layout: pages now scale uniformly with the window instead of reflowing, with each Everything-page section arranged into consistent full-width rows.",
      "Reworked the Year in Review page — removed the Busiest Month card, made the Storyline module full-width with a new this-year-vs-last-year pace card, and grouped the highlight modules into even rows.",
      "Stat detail popups now show each item's contribution to that stat (e.g. hours per audiobook) and sort the list by it.",
      "Fixed clipped stars in the mobile Rate It modal and added per-section mobile cover-size sliders for each library.",
      "Restored User/My Rating circles on mobile movie, TV, and game detail pages, and fixed newly saved ratings not appearing until refresh.",
      "Fixed sidebar icons serving a stale cached copy by giving icon URLs a real cache-busting tag.",
      "Major performance pass: removed unused code and cut full-page re-renders while scrolling for smoother navigation.",
    ],
  },
  {
    version: "9.0",
    date: "2026-05-13",
    notes: [
      "Standardized game details date display to MM-DD-YYYY for completed and release dates.",
      "Aligned TV details first-air and last-air date formatting to MM-DD-YYYY for consistent detail-page dates.",
      "Removed sidebar icon flash on initial load so uploaded icons behave as the default without briefly showing old fallback icons.",
      "Fixed game edit-save behavior so saved changes update the open details page immediately instead of waiting for a refresh.",
      "Updated save confirmation toast to explicitly show Google Sheet write success with a timestamp.",
    ],
  },
  {
    version: "8.7",
    date: "2026-05-10",
    notes: [
      "Polished Statistics top-rated layouts so Year in Review and scoped Top 10 sections show rank and rating beneath covers in a cleaner shared format.",
      "Fixed ranked-cover alignment issues in Statistics, including bottom-baseline handling for mixed cover shapes like TV posters and audiobooks.",
      "Updated game add flows to use the newer Mac-style dedicated editor instead of falling back to the legacy add/edit surface.",
      "Removed the last active app routing path that sent game creation through the older MediaModal editor.",
    ],
  },
  {
    version: "8.6",
    date: "2026-05-07",
    notes: [
      "Expanded and refined Statistics view with Year in Review enhancements and a new CDL Wrapped fullscreen story experience.",
      "Added Wrapped slide controls, autoplay progression, background audio controls, and richer visual motion for story slides.",
      "Reworked Statistics cards for clearer layout density, including refreshed Highlights metrics and compacted comparison modules.",
      "Updated Release by Year visualization to a line graph with cleaner 5-year x-axis labels and larger inline release count labels.",
      "Adjusted release-year aggregation and readability to better match expected scoped totals and improve on-chart legibility.",
    ],
  },
  {
    version: "8.5",
    date: "2026-05-06",
    notes: [
      "Restored Library category pill colors (Home/Books/Movies/TV/Games) and preserved consistent sidebar tone behavior across navigation.",
      "Applied subtler active styling for lower sidebar submenu pills across Light, Dark, and Classic themes.",
      "Made theme mode (Light/Dark/Classic) persist through settings so the selected mode loads consistently across devices.",
      "Added localhost read-only settings mode so local sessions pull latest live settings/icons but never overwrite upstream values.",
      "Updated localhost icon override precedence to favor synced settings over stale local cache for items like Roadmap and Themes.",
    ],
  },
  {
    version: "8.0",
    date: "2026-05-06",
    notes: [
      "Expanded Settings with section-level reset buttons and improved panel ergonomics for heavy customization workflows.",
      "Rebuilt Sidebar settings with independent controls for Library, Smart Lists, and Discover (font, weight, icon size, spacing, and submenu density).",
      "Added Highlight Colors settings for Home, Books, Movies, TV, and Games with live updates to sidebar active-state accents.",
      "Added per-status icon customization with upload + reset-to-default behavior, synced through settings for cross-device reuse.",
      "Added Rating pillbox controls in Status Icon settings (size and X/Y position) with live preview and persistence.",
      "Improved settings panel overflow behavior with dedicated scroll handling and visible scroll indicator for long expanded menus.",
    ],
  },
  {
    version: "7.8",
    date: "2026-05-03",
    notes: [
      "Added full TV Show details page with backdrop hero, cover poster, palette-based background extending behind sidebar, and color-coded status pill.",
      "Added full Game details page with backdrop hero, cover poster, platform/developer/hours metadata, and color-coded status pill.",
      "TV Show details page shows TV Show Status, Network, seasons, episodes, caught-up date, and first/last air dates displayed directly in the backdrop footer.",
      "Status pills on Movie, TV, and Game detail pages now use light frosted-glass color coding: green for completed/watched, yellow for in-progress, orange for abandoned.",
      "Edit pill on all detail pages updated to solid white background for readability across all palette backgrounds.",
      "Navigating via the sidebar while on a details page now correctly exits the detail view and loads the selected section.",
      "Movies sidebar: replaced 'Watching' status with 'Started', added Status (Released/Upcoming) and Tags filter sections above Genre.",
      "Genre section in Movies sidebar now defaults to closed.",
    ],
  },
  {
    version: "7.6",
    date: "2026-05-01",
    notes: [
      "Removed pill box styling from sidebar item counts — now shows plain bold numbers.",
      "Tightened sidebar sub-item spacing to 4px total vertical gap.",
      "Eliminated flash of default background color when opening book details — page now waits for cover-based palette before rendering.",
      "Redesigned cover art rating badge with gold star, white/transparent pill, and clean whole-number formatting.",
      "Rounded cover art corners from 5px to 6px.",
      "Reduced gap between header quick-link pills (Home, Now Playing, Play Next, etc.) to 0.",
      "Moved TV Watchlist section filter (Watching, Backlog, Pending Return) into the sidebar Discover section with color-coded pills matching cover badges.",
      "Removed Sandbox button from header.",
      "Replaced header search PNG icon with inline SVG magnifying glass and made the search box transparent.",
      "Removed redundant second 'Synced' label from the sidebar sync module and extended sync box closer to sidebar edges.",
      "Fixed Games sidebar platform list alignment so counts right-align consistently with other sections.",
    ],
  },
  {
    version: "7.5",
    date: "2026-05-01",
    notes: [
      "Added a rebuilt Mac-style Edit Book flow from the details page with a clean native-like popup and tighter spacing.",
      "Simplified book cover editing to two sources only: ImageURL (default) and CustomURL, and removed OpenLibrary Work Key + Google Books Volume ID from the edit form.",
      "Updated book cover rules so CustomURL always wins when present, saving default clears CustomURL, and cover selections stay consistent instead of bouncing back.",
      "Aligned book cover behavior with R2 backup flow so active covers persist reliably across details and main shelf views.",
      "Fixed book format rendering so Type overrides Audiobook Duration (eBook always renders as book format).",
      "Fixed duplicate React key warnings in book detail chips and stabilized detail/sidebar layout sizing.",
      "Extended the floating sidebar treatment across views with unified full-page background behavior (home + details).",
      "Fixed sticky header/covers overlap by introducing scroll-aware header protection with dynamic blur/opacity and consistent no-scroll appearance.",
    ],
  },
  {
    version: "7.1.0",
    date: "2026-04-29",
    notes: [
      "Saved the current Mac redesign as the stable 7.1 rollback point.",
      "Kept the sidebar in the restored working state after backing out the static-menu experiment.",
    ],
  },
  {
    version: "7.0.0",
    date: "2026-04-29",
    notes: [
      "Started the Mac redesign from a fresh 7.0 baseline.",
      "Reset the version notes so new redesign work can be tracked cleanly from here.",
    ],
  },
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
const SIMPLE_SHELF_THEME = "simpleShelf";
const DEFAULT_SIMPLE_SHELF_BACKGROUND = "#ececec";
const ELECTRIC_BLUE_TOP_BEAM_BACKGROUND =
  "linear-gradient(180deg, rgba(24, 50, 97, 0.92) 0%, rgba(12, 28, 56, 0.9) 100%), radial-gradient(130% 160% at 50% -50%, rgba(123, 184, 255, 0.58) 0%, rgba(123, 184, 255, 0) 62%)";
const APP_ICON = "/logo4.png";
const APP_PRIMARY_LOGO_COLORS = {
  amber: "#c07800",
  olive: "#8b920d",
  sky: "#8baff4",
} as const;
const SHOW_HEADER_DEBUG_CONTROLS = false;

function safeStr(v: unknown) {
  return (v ?? "").toString().trim();
}

function parseStoredSettingValue(value: unknown): string | number | boolean {
  const str = String(value ?? "");
  const numValue = Number(str);
  if (!Number.isNaN(numValue) && str !== "") return numValue;
  if (str === "true") return true;
  if (str === "false") return false;
  return str;
}

function normalizeHexColor(value: unknown, fallback = DEFAULT_SIMPLE_SHELF_BACKGROUND): string {
  const raw = safeStr(value);
  if (!raw) return fallback;
  const withHash = raw.startsWith("#") ? raw : `#${raw}`;
  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase();
  }
  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return fallback;
}

function hexToRgba(value: unknown, alpha: number, fallback = DEFAULT_SIMPLE_SHELF_BACKGROUND): string {
  const normalized = normalizeHexColor(value, fallback);
  const r = Number.parseInt(normalized.slice(1, 3), 16);
  const g = Number.parseInt(normalized.slice(3, 5), 16);
  const b = Number.parseInt(normalized.slice(5, 7), 16);
  const clampedAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clampedAlpha})`;
}

function hexToRgb(
  value: unknown,
  fallback = DEFAULT_SIMPLE_SHELF_BACKGROUND
): { r: number; g: number; b: number } {
  const normalized = normalizeHexColor(value, fallback);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clampChannel = (channel: number) => Math.max(0, Math.min(255, Math.round(channel)));
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixHexColors(
  firstColor: unknown,
  secondColor: unknown,
  secondWeight = 0.5,
  fallback = DEFAULT_SIMPLE_SHELF_BACKGROUND
): string {
  const first = hexToRgb(firstColor, fallback);
  const second = hexToRgb(secondColor, fallback);
  const clampedWeight = Math.max(0, Math.min(1, secondWeight));
  const firstWeight = 1 - clampedWeight;
  return rgbToHex(
    first.r * firstWeight + second.r * clampedWeight,
    first.g * firstWeight + second.g * clampedWeight,
    first.b * firstWeight + second.b * clampedWeight
  );
}

function buildDetailGradientBackground(startColor: string, endColor: string): string {
  return `radial-gradient(84% 88% at 12% 8%, ${hexToRgba(mixHexColors(startColor, "#ffffff", 0.08, startColor), 0.78, startColor)} 0%, ${hexToRgba(startColor, 0.38, startColor)} 26%, ${hexToRgba(startColor, 0, startColor)} 50%), radial-gradient(96% 96% at 88% 18%, ${hexToRgba(mixHexColors(endColor, "#ffffff", 0.1, endColor), 0.52, endColor)} 0%, ${hexToRgba(endColor, 0, endColor)} 46%), radial-gradient(94% 92% at 100% 100%, ${hexToRgba(endColor, 0.5, endColor)} 0%, ${hexToRgba(endColor, 0.14, endColor)} 34%, ${hexToRgba(endColor, 0, endColor)} 56%), linear-gradient(145deg, ${mixHexColors(startColor, "#0f141d", 0.16, startColor)} 0%, ${startColor} 30%, ${mixHexColors(endColor, startColor, 0.18, endColor)} 58%, ${endColor} 100%)`;
}

function getRelativeLuminance(value: unknown, fallback = DEFAULT_SIMPLE_SHELF_BACKGROUND): number {
  const { r, g, b } = hexToRgb(value, fallback);
  const toLinear = (channel: number) => {
    const srgb = channel / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  const [linearR, linearG, linearB] = [r, g, b].map(toLinear);
  return 0.2126 * linearR + 0.7152 * linearG + 0.0722 * linearB;
}

function getContrastRatio(
  firstColor: unknown,
  secondColor: unknown,
  fallback = DEFAULT_SIMPLE_SHELF_BACKGROUND
): number {
  const firstLuminance = getRelativeLuminance(firstColor, fallback);
  const secondLuminance = getRelativeLuminance(secondColor, fallback);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function getReadableTextHex(
  backgrounds: unknown[],
  fallback = DEFAULT_SIMPLE_SHELF_BACKGROUND
): string {
  const normalizedBackgrounds = (backgrounds.length ? backgrounds : [fallback]).map((value) =>
    normalizeHexColor(value, fallback)
  );
  const referenceBackground = normalizedBackgrounds[0];
  const averageLuminance =
    normalizedBackgrounds.reduce(
      (sum, value) => sum + getRelativeLuminance(value, referenceBackground),
      0
    ) / normalizedBackgrounds.length;
  const isLightBackground = averageLuminance >= 0.5;
  const preferredAnchor = isLightBackground ? "#12161d" : "#f6f7fb";
  const candidateWeights = isLightBackground
    ? [0.76, 0.84, 0.9, 0.96]
    : [0.78, 0.86, 0.92, 0.97];
  const fallbackCandidate = isLightBackground ? "#111111" : "#fbfcff";
  const targetContrast = isLightBackground ? 6.8 : 5.8;

  let bestCandidate = fallbackCandidate;
  let bestContrast = 0;

  for (const weight of candidateWeights) {
    const candidate = mixHexColors(referenceBackground, preferredAnchor, weight, referenceBackground);
    const minimumContrast = normalizedBackgrounds.reduce((lowestContrast, background) => {
      return Math.min(lowestContrast, getContrastRatio(candidate, background, referenceBackground));
    }, Number.POSITIVE_INFINITY);

    if (minimumContrast > bestContrast) {
      bestContrast = minimumContrast;
      bestCandidate = candidate;
    }

    if (minimumContrast >= targetContrast) {
      return candidate;
    }
  }

  const fallbackContrast = normalizedBackgrounds.reduce((lowestContrast, background) => {
    return Math.min(lowestContrast, getContrastRatio(fallbackCandidate, background, referenceBackground));
  }, Number.POSITIVE_INFINITY);

  return fallbackContrast > bestContrast ? fallbackCandidate : bestCandidate;
}

function buildSimpleSidebarTheme(backgroundColor: string) {
  const normalizedBackground = normalizeHexColor(backgroundColor);
  const isLightBackground = getRelativeLuminance(normalizedBackground, normalizedBackground) >= 0.5;
  const surfaceGlowHex = mixHexColors(
    normalizedBackground,
    "#ffffff",
    isLightBackground ? 0.34 : 0.24,
    normalizedBackground
  );
  const surfaceHighlightHex = mixHexColors(
    normalizedBackground,
    "#ffffff",
    isLightBackground ? 0.22 : 0.16,
    normalizedBackground
  );
  const surfaceMidHex = mixHexColors(
    normalizedBackground,
    "#ffffff",
    isLightBackground ? 0.08 : 0.1,
    normalizedBackground
  );
  const surfaceShadowHex = mixHexColors(
    normalizedBackground,
    "#000000",
    isLightBackground ? 0.18 : 0.28,
    normalizedBackground
  );
  const surfaceDeepShadowHex = mixHexColors(
    normalizedBackground,
    "#000000",
    isLightBackground ? 0.26 : 0.42,
    normalizedBackground
  );
  const baseTextHex = getReadableTextHex(
    [
      surfaceGlowHex,
      surfaceHighlightHex,
      normalizedBackground,
      surfaceMidHex,
      surfaceShadowHex,
      surfaceDeepShadowHex,
    ],
    normalizedBackground
  );
  const emphasizedTextHex = mixHexColors(
    baseTextHex,
    isLightBackground ? "#000000" : "#ffffff",
    isLightBackground ? 0.14 : 0.08,
    baseTextHex
  );
  const overlayBaseHex = isLightBackground ? "#000000" : "#ffffff";
  const tileStartHex = mixHexColors(
    normalizedBackground,
    isLightBackground ? "#ffffff" : "#000000",
    isLightBackground ? 0.3 : 0.12,
    normalizedBackground
  );
  const tileEndHex = mixHexColors(
    normalizedBackground,
    isLightBackground ? "#ffffff" : "#000000",
    isLightBackground ? 0.14 : 0.28,
    normalizedBackground
  );
  const countBubbleHex = mixHexColors(
    baseTextHex,
    "#000000",
    isLightBackground ? 0.16 : 0.62,
    baseTextHex
  );
  const surfaceBackground = `radial-gradient(140% 105% at 50% -12%, ${hexToRgba(surfaceGlowHex, isLightBackground ? 0.62 : 0.42, surfaceGlowHex)} 0%, ${hexToRgba(surfaceGlowHex, isLightBackground ? 0.2 : 0.12, surfaceGlowHex)} 34%, ${hexToRgba(surfaceGlowHex, 0, surfaceGlowHex)} 64%), radial-gradient(170% 135% at 50% 118%, ${hexToRgba(surfaceDeepShadowHex, isLightBackground ? 0.2 : 0.36, surfaceDeepShadowHex)} 0%, ${hexToRgba(surfaceDeepShadowHex, isLightBackground ? 0.08 : 0.16, surfaceDeepShadowHex)} 34%, ${hexToRgba(surfaceDeepShadowHex, 0, surfaceDeepShadowHex)} 70%), linear-gradient(180deg, ${hexToRgba(surfaceHighlightHex, 0.99, surfaceHighlightHex)} 0%, ${hexToRgba(surfaceMidHex, 0.98, surfaceMidHex)} 32%, ${hexToRgba(normalizedBackground, 0.99, normalizedBackground)} 60%, ${hexToRgba(surfaceShadowHex, 0.99, surfaceShadowHex)} 100%)`;

  return {
    background: surfaceBackground,
    primaryColor: hexToRgba(baseTextHex, isLightBackground ? 0.86 : 0.94, baseTextHex),
    secondaryColor: hexToRgba(emphasizedTextHex, 0.98, emphasizedTextHex),
    textColor: hexToRgba(baseTextHex, isLightBackground ? 0.9 : 0.94, baseTextHex),
    arrowColor: hexToRgba(baseTextHex, isLightBackground ? 0.58 : 0.62, baseTextHex),
    rolodexColor: hexToRgba(baseTextHex, 0.92, baseTextHex),
    rolodexDigitColor: mixHexColors(
      normalizedBackground,
      isLightBackground ? "#000000" : "#ffffff",
      isLightBackground ? 0.72 : 0.18,
      normalizedBackground
    ),
    rolodexLabelColor: hexToRgba(baseTextHex, 0.95, baseTextHex),
    rolodexTileBg: `linear-gradient(180deg, ${hexToRgba(tileStartHex, 0.96, tileStartHex)} 0%, ${hexToRgba(tileEndHex, 0.94, tileEndHex)} 100%)`,
    rolodexTileBorder: hexToRgba(baseTextHex, isLightBackground ? 0.14 : 0.22, baseTextHex),
    countBubbleColor: countBubbleHex,
    syncedTextColor: hexToRgba(baseTextHex, 0.9, baseTextHex),
    highlightBg: hexToRgba(overlayBaseHex, isLightBackground ? 0.06 : 0.1, overlayBaseHex),
    highlightBgEnd: hexToRgba(overlayBaseHex, isLightBackground ? 0.04 : 0.08, overlayBaseHex),
    highlightBorder: hexToRgba(baseTextHex, isLightBackground ? 0.22 : 0.18, baseTextHex),
    activeHighlight: hexToRgba(overlayBaseHex, isLightBackground ? 0.1 : 0.12, overlayBaseHex),
    baseTextHex,
    overlayBaseHex,
    isLightBackground,
  };
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

function parseReleaseDateForComparison(value?: string): Date | null {
  const raw = safeStr(value);
  if (!raw) return null;
  // YYYY-MM-DD
  const fullMatch = raw.match(/\b((?:19|20)\d{2})-(\d{2})-(\d{2})\b/);
  if (fullMatch) {
    const d = new Date(Number(fullMatch[1]), Number(fullMatch[2]) - 1, Number(fullMatch[3]));
    if (!isNaN(d.getTime())) return d;
  }
  // YYYY-MM
  const monthMatch = raw.match(/\b((?:19|20)\d{2})-(\d{2})\b/);
  if (monthMatch) return new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1);
  // M/D/YYYY (e.g. "5/12/2026")
  const slashMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const date = new Date(Number(slashMatch[3]), Number(slashMatch[1]) - 1, Number(slashMatch[2]));
    if (!isNaN(date.getTime())) return date;
  }
  // Exact year only (e.g. "2026"): use Dec 31 so current/future-year entries stay upcoming
  if (/^((?:19|20)\d{2})$/.test(raw)) return new Date(Number(raw), 11, 31);
  const yearMatch = raw.match(/\b((?:19|20)\d{2})\b/);
  if (yearMatch) return new Date(Number(yearMatch[1]), 0, 1);
  return null;
}

function dateSpecificity(dateStr?: string): number {
  const raw = safeStr(dateStr);
  if (!raw) return 0;
  if (/\b((?:19|20)\d{2})-(\d{2})-(\d{2})\b/.test(raw) || /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.test(raw)) return 3;
  if (/\b((?:19|20)\d{2})-(\d{2})\b/.test(raw)) return 2;
  if (/^((?:19|20)\d{2})$/.test(raw)) return 1;
  return 0;
}

function pickBestReleaseDate(a?: string, b?: string): string | undefined {
  const sa = dateSpecificity(a);
  const sb = dateSpecificity(b);
  if (sa === 0 && sb === 0) return a || b;
  return sa >= sb ? a : b;
}

function todayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function isNotYetReleased(dateStr?: string): boolean {
  const d = parseReleaseDateForComparison(dateStr);
  if (!d) return false;
  return d > todayMidnight();
}

function isUpcomingRelease(dateStr?: string): boolean {
  const d = parseReleaseDateForComparison(dateStr);
  if (!d) return false;
  return d >= todayMidnight();
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

function parseGameTagValues(game: Pick<Game, "tag" | "yearPlayed">): string[] {
  return [...parseTagValues(game.tag), ...parseTagValues(game.yearPlayed)];
}

const WATCHED_STATUS_VALUES = new Set(["watched", "completed", "true", "yes", "1"]);
const ABANDONED_STATUS_VALUES = new Set(["abandoned", "dropped", "drop", "quit", "dnf"]);
const NOW_PLAYING_GAME_STATUS_VALUES = new Set(["now playing"]);
const NOW_PLAYING_TV_STATUS_VALUES = new Set(["currently watching", "watching"]);
const NOW_PLAYING_MOVIE_STATUS_VALUES = new Set(["watching", "started"]);
const NOW_PLAYING_BOOK_STATUS_VALUES = new Set(["reading"]);
const PLAY_NEXT_STATUS_VALUES = new Set(["queued", "replay"]);
const MOVIE_UPCOMING_ONLY_STATUS_VALUES = new Set(["pending digital release"]);

function isMovieWatchedStatus(movie: Pick<Movie, "watchStatus" | "watched">): boolean {
  const watched = normalizeStatusToken(movie.watchStatus || movie.watched);
  return WATCHED_STATUS_VALUES.has(watched);
}

function isMovieAbandonedStatus(movie: Pick<Movie, "watchStatus" | "watched">): boolean {
  const status = normalizeStatusToken(movie.watchStatus || movie.watched);
  return ABANDONED_STATUS_VALUES.has(status);
}

function isMovieUpcomingOnlyStatus(movie: Pick<Movie, "watchStatus" | "watched">): boolean {
  const status = normalizeStatusToken(movie.watchStatus || movie.watched);
  return MOVIE_UPCOMING_ONLY_STATUS_VALUES.has(status);
}

function parsePersonalRatingValue(value: unknown): number | null {
  const parsed = Number.parseFloat(safeStr(value));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function formatItemPersonalRatingBadge(item: any): string | null {
  const mediaType = getMediaType(item);
  const rating = parsePersonalRatingValue(
    item?.myRating ??
      item?.["My Rating"] ??
      item?.["MyRating"] ??
      item?.userRating ??
      item?.personalRating
  );
  if (rating === null) return null;
  const tenScaleValue = mediaType === "book" && rating <= 5 ? rating * 2 : rating;
  const rounded = Math.round(tenScaleValue * 10) / 10;
  return rounded % 1 === 0 ? `${rounded}` : `${rounded.toFixed(1)}`;
}

function parseManualOrderValue(value: unknown): number | null {
  const parsed = Number.parseFloat(safeStr(value));
  return Number.isFinite(parsed) ? parsed : null;
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function moveKeyToTargetPlacement(
  keys: string[],
  movingKey: string,
  targetKey: string,
  placement: WishlistDragPlacement
): string[] {
  if (!movingKey || !targetKey || movingKey === targetKey) return keys;
  const fromIndex = keys.indexOf(movingKey);
  const toIndex = keys.indexOf(targetKey);
  if (fromIndex === -1 || toIndex === -1) return keys;

  const next = [...keys];
  const [moved] = next.splice(fromIndex, 1);
  let insertAt = placement === "before" ? toIndex : toIndex + 1;
  if (fromIndex < toIndex) {
    insertAt -= 1;
  }
  const clampedInsertAt = Math.max(0, Math.min(insertAt, next.length));
  next.splice(clampedInsertAt, 0, moved);
  return next;
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

function getBookFormatKeyToken(item: any): string {
  const typesRaw = [safeStr(item?.types), safeStr(item?.type), safeStr(item?.Type)].filter(Boolean).join(",");
  const typeTokens = typesRaw
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
  if (Boolean(safeStr(item?.audiobookDuration) || safeStr(item?.AudiobookDuration))) return "audiobook";
  return "default";
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

function getMediaType(item: any): MediaType {
  if (item?.__type === "book") return "book";
  if (item?.__type === "movie") return "movie";
  if (item?.__type === "tv") return "tv";
  if (item?.__type === "game") return "game";
  if (item?.platform || item?.yearPlayed || item?.gameStatus) return "game";
  if (item?.isbn || item?.series) return "book";
  if (item?.firstAirDate || item?.lastAirDate || item?.showStatus) return "tv";

  // Audiobook detection: check for Type field or iTunes/Apple Music ImageURL pattern
  const type = safeStr(item?.type || item?.Type || item?.MediaType || "").toLowerCase();
  const imageUrl = safeStr(item?.ImageURL || item?.imageUrl || "");
  const audiobookDuration = safeStr(item?.audiobookDuration || item?.AudiobookDuration || "");

  // Explicit audiobook indicators
  if (type === "audiobook" || type.includes("audio")) return "book";
  if (audiobookDuration) return "book"; // If audiobookDuration is present, it's an audiobook
  if (imageUrl.includes("mzstatic.com")) return "book"; // iTunes/Apple Music URLs indicate audiobooks
  if (imageUrl.includes("books.apple.com") || imageUrl.includes("itunes.apple.com")) return "book"; // Apple Books URLs

  return "movie";
}

function getMediaItemKey(item: any): string {
  const type = getMediaType(item);
  const normalizedTitle = normalizeTitleKey(item?.title || item?.Title || item?.name || "");
  if (type === "book") {
    const bookFormatToken = getBookFormatKeyToken(item);
    return `${type}:${normalizedTitle}:${bookFormatToken}`;
  }
  if (type === "game") {
    const normalizedPlatform = normalizePlatformToken(
      safeStr(item?.__renderPlatform || item?.platform)
    );
    return `${type}:${normalizedTitle}:${normalizedPlatform || "default"}`;
  }
  return `${type}:${normalizedTitle}`;
}

// Like getMediaItemKey but uses an explicitly-known mediaType instead of
// detecting it — required for raw CSV rows where getMediaType() misidentifies
// the type due to capitalized field names (e.g. Platform vs platform).
function buildTypedItemKey(item: any, mediaType: "book" | "movie" | "tv" | "game"): string {
  const normalizedTitle = normalizeTitleKey(item?.title || item?.Title || item?.name || "");
  if (mediaType === "book") {
    const bookFormatToken = getBookFormatKeyToken(item);
    return `book:${normalizedTitle}:${bookFormatToken}`;
  }
  if (mediaType === "game") {
    const normalizedPlatform = normalizePlatformToken(
      safeStr(item?.__renderPlatform || item?.platform || item?.Platform)
    );
    return `game:${normalizedTitle}:${normalizedPlatform || "default"}`;
  }
  return `${mediaType}:${normalizedTitle}`;
}

function getLegacyMediaItemKey(item: any): string {
  const type = getMediaType(item);
  const normalizedTitle = normalizeTitleKey(item?.title || item?.Title || item?.name || "");
  if (type === "game") {
    const normalizedPlatform = normalizePlatformToken(
      safeStr(item?.__renderPlatform || item?.platform)
    );
    return `${type}:${normalizedTitle}:${normalizedPlatform || "default"}`;
  }
  return `${type}:${normalizedTitle}`;
}

function isLegacyBookMediaKey(key: string): boolean {
  return /^book:[^:]+$/.test(safeStr(key));
}

function getBookCustomUrl(item: any): string {
  return safeStr(item?.customImageUrl || item?.CustomURL || item?.CustomImageURL);
}

function getBookImageUrl(item: any): string {
  // Check all possible field name variations
  const candidates = [
    item?.imageUrl,
    item?.ImageURL,
    item?.ImageUrl,  // Mixed case variant
    item?.["Image URL"],
    item?.Image,
    // Also try some audiobook-specific variations
    item?.image,
    item?.image_url
  ];

  return safeStr(candidates.find(c => c) || "");
}

function getBookSourceUrlByMode(item: any, _mode?: "custom" | "default"): string {
  const imageUrl = getBookImageUrl(item);
  const customUrl = getBookCustomUrl(item);

  // For books, custom URL is always the source of truth when present.
  return customUrl || imageUrl;
}

function getDisplayCover(item: any, mediaType: "book" | "movie" | "tv" | "game"): string {
  if (mediaType === "book") {
    return safeStr(item?.r2CoverUrl || item?.R2CoverUrl || item?.imageUrl || item?.ImageURL || item?.["Image URL"] || "");
  }
  if (mediaType === "movie" || mediaType === "tv") {
    return safeStr(item?.r2CoverUrl || item?.R2CoverUrl || item?.posterUrl || item?.PosterURL || item?.metadataCoverUrl || "");
  }
  return safeStr(
    item?.r2CoverUrl ||
      item?.R2CoverUrl ||
      item?.localCoverUrl ||
      item?.LocalCoverURL ||
      item?.coverUrl ||
      item?.CoverURL ||
      item?.metadataCoverUrl ||
      item?.imageUrl ||
      item?.ImageURL ||
      item?.posterUrl ||
      ""
  );
}

function upgradeTmdbImageSize(url: string, size: string = "w1280"): string {
  if (!url) return url;
  if (!/image\.tmdb\.org\/t\/p\//.test(url)) return url;
  return url.replace(/\/t\/p\/(w\d+|original)\//, `/t/p/${size}/`);
}

function upgradeIgdbScreenshotSize(url: string, size: string = "t_1080p"): string {
  if (!url) return url;
  if (!/images\.igdb\.com/.test(url)) return url;
  return url.replace(/\/(t_thumb|t_screenshot_med|t_screenshot_big|t_screenshot_huge|t_720p|t_cover_big|t_cover_small|t_micro)\//, `/${size}/`);
}

function upgradeBackdropForDisplay(url: string, mediaType: "movie" | "tv" | "game"): string {
  if (!url) return url;
  if (mediaType === "movie" || mediaType === "tv") return upgradeTmdbImageSize(url, "w1280");
  if (mediaType === "game") {
    // The game "backdrop" is an IGDB screenshot — keep TMDB upgrade as a no-op
    // for cross-pollinated rows that happen to mix sources.
    const tmdbUpgraded = upgradeTmdbImageSize(url, "w1280");
    return upgradeIgdbScreenshotSize(tmdbUpgraded, "t_1080p");
  }
  return url;
}

function getDisplayBackdrop(item: any, mediaType: "movie" | "tv" | "game"): string {
  // Prefer R2 backdrop (already saved bytes); otherwise use the upstream URL and
  // upgrade legacy lower-res references to the larger size for a sharp hero.
  const r2 = safeStr(item?.r2BackdropUrl || item?.R2BackdropUrl);
  if (r2) return r2;
  if (mediaType === "movie" || mediaType === "tv") {
    return upgradeBackdropForDisplay(safeStr(item?.backdropUrl || item?.BackdropURL || ""), mediaType);
  }
  // Game "backdrop" = first IGDB screenshot. Bump the IGDB size for HD heroes.
  const raw = safeStr(item?.screenshotsUrl || item?.ScreenshotsURL || "");
  const firstShot = raw.split(",")[0]?.trim() || "";
  return upgradeBackdropForDisplay(firstShot, "game");
}

type StatusIndicator = {
  key: string;
  color: string;
  label: string;
};

type TvWatchlistSectionKey = "watching" | "watchNext" | "paused" | "pendingReturn" | "notStarted";

type TvWatchlistSectionMeta = {
  label: string;
  headerColor: string;
  badgeBackground: string;
  badgeBorder: string;
  badgeColor: string;
};

type TvWatchlistBadgeColors = Pick<TvWatchlistSectionMeta, "badgeBackground" | "badgeBorder" | "badgeColor">;

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
const STATUS_COLOR_BLUE = "#3b82f6";
const STATUS_DOT_BASE_SIZE = 16;
const STATUS_DOT_MIN_SIZE = 8;
const STATUS_DOT_MAX_SIZE = 40;
const STATUS_DOT_NUDGE_LEFT_PX = 7;
const STATUS_DOT_NUDGE_UP_PX = 7;
const TV_WATCHLIST_SECTION_HEADER_SPACE = 42;

const TV_WATCHLIST_SECTION_ORDER: TvWatchlistSectionKey[] = ["watching", "watchNext", "paused", "pendingReturn", "notStarted"];
const TV_WATCHLIST_ACTIVE_STATUSES = new Set([
  "watching",
  "currently watching",
  "in progress",
]);
const TV_HEADER_WATCHING_STATUSES = new Set([
  "watching",
  "currently watching",
  "in progress",
  "paused",
  "pending return",
]);
const TV_WATCHLIST_PAUSED_STATUSES = new Set(["paused"]);
const TV_WATCHLIST_PENDING_RETURN_STATUSES = new Set(["pending return"]);
const TV_WATCHLIST_NOT_STARTED_STATUSES = new Set(["backlog", "wishlist"]);
const TV_WATCHLIST_SECTION_META: Record<TvWatchlistSectionKey, TvWatchlistSectionMeta> = {
  watching: {
    label: "Watching",
    headerColor: STATUS_COLOR_YELLOW,
    badgeBackground: "rgba(117, 90, 34, 0.88)",
    badgeBorder: "rgba(241, 213, 141, 0.82)",
    badgeColor: "rgba(255, 247, 224, 0.98)",
  },
  watchNext: {
    label: "Watch Next",
    headerColor: STATUS_COLOR_GREEN,
    badgeBackground: "rgba(45, 99, 74, 0.9)",
    badgeBorder: "rgba(158, 236, 193, 0.84)",
    badgeColor: "rgba(231, 255, 243, 0.98)",
  },
  paused: {
    label: "Paused",
    headerColor: STATUS_COLOR_ORANGE,
    badgeBackground: "rgba(117, 90, 34, 0.9)",
    badgeBorder: "rgba(241, 213, 141, 0.84)",
    badgeColor: "rgba(255, 247, 224, 0.98)",
  },
  pendingReturn: {
    label: "Pending Return",
    headerColor: STATUS_COLOR_BLUE,
    badgeBackground: "rgba(57, 117, 163, 0.9)",
    badgeBorder: "rgba(169, 221, 255, 0.82)",
    badgeColor: "rgba(238, 248, 255, 0.98)",
  },
  notStarted: {
    label: "Not Started",
    headerColor: STATUS_COLOR_RED,
    badgeBackground: "rgba(84, 55, 96, 0.9)",
    badgeBorder: "rgba(202, 167, 223, 0.82)",
    badgeColor: "rgba(249, 236, 255, 0.98)",
  },
};

function getTvWatchlistSectionKey(rawStatus?: string): TvWatchlistSectionKey {
  const status = normalizeStatusToken(rawStatus);
  if (status === "watch next") return "watchNext";
  if (TV_WATCHLIST_PENDING_RETURN_STATUSES.has(status)) return "pendingReturn";
  if (TV_WATCHLIST_PAUSED_STATUSES.has(status)) return "paused";
  if (TV_WATCHLIST_ACTIVE_STATUSES.has(status)) return "watching";
  if (TV_WATCHLIST_NOT_STARTED_STATUSES.has(status)) return "notStarted";
  return "notStarted";
}

function getTvWatchlistSectionForItem(item: TvWatchlistStatusSource | null | undefined): TvWatchlistSectionKey {
  return getTvWatchlistSectionKey(
    safeStr(item?.watchStatus) || safeStr(item?.watched) || safeStr(item?.showStatus) || safeStr(item?.status)
  );
}

function isTvWatchedStatus(show: Pick<Show, "watchStatus" | "showStatus" | "watched" | "dateCompleted">): boolean {
  const watchStatus = normalizeStatusToken(show.watchStatus || show.showStatus);
  const watched = normalizeStatusToken(show.watched);
  return Boolean(safeStr(show.dateCompleted)) || WATCHED_STATUS_VALUES.has(watchStatus) || WATCHED_STATUS_VALUES.has(watched);
}

function isTvAbandonedStatus(show: Pick<Show, "watchStatus" | "showStatus" | "watched">): boolean {
  const watchStatus = normalizeStatusToken(show.watchStatus || show.showStatus);
  const watched = normalizeStatusToken(show.watched);
  return ABANDONED_STATUS_VALUES.has(watchStatus) || ABANDONED_STATUS_VALUES.has(watched);
}

function isTvWatchingStatus(show: Pick<Show, "watchStatus" | "showStatus">): boolean {
  const watchStatus = normalizeStatusToken(show.watchStatus || show.showStatus);
  return TV_HEADER_WATCHING_STATUSES.has(watchStatus);
}

function isGameCompletedStatus(game: Pick<Game, "status" | "playStatus" | "gameStatus" | "completed" | "dateCompleted">): boolean {
  const status = normalizeStatusToken(game.status || game.playStatus || game.gameStatus || game.completed);
  return Boolean(safeStr(game.dateCompleted)) || status === "completed" || status === "done" || status === "beaten" || status === "finished";
}

function isGameAbandonedStatus(game: Pick<Game, "status" | "playStatus" | "gameStatus">): boolean {
  const status = normalizeStatusToken(game.status || game.playStatus || game.gameStatus);
  return ABANDONED_STATUS_VALUES.has(status);
}

function isGameBacklogHeaderMatch(game: Pick<Game, "status" | "playStatus" | "gameStatus" | "ownership">): boolean {
  const status = normalizeStatusToken(game.status || game.playStatus || game.gameStatus);
  const ownership = normalizeOwnership(game.ownership);
  return (
    status === "backlog" ||
    status === "now playing" ||
    status === "currently playing" ||
    status === "playing" ||
    status === "in progress" ||
    status === "queued" ||
    ownership === "collection"
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
  const csvCustomUrl = safeStr(r["CustomURL"]) || safeStr(r["CustomImageURL"]);
  const csvPosterUrl = safeStr(r["PosterURL"]);
  const csvPoster = safeStr(r["Poster"]);
  const metadataCoverUrl = csvCustomUrl || csvPosterUrl || csvPoster;
  const { posterUrl, coverSource, coverCandidates } = chooseCover([
    { label: "CustomURL", url: csvCustomUrl },
    { label: "PosterURL", url: csvPosterUrl },
    { label: "Poster", url: csvPoster },
    { label: "Generated GitHub Cover", url: githubUrl },
  ]);

  return {
    title,
    posterUrl,
    customImageUrl: csvCustomUrl || undefined,
    metadataCoverUrl: metadataCoverUrl || undefined,
    posterUrlFallback: githubUrl,
    coverSource,
    coverCandidates,
    year: safeStr(r["Year"]) || undefined,
    tmdbId: safeStr(r["TMDB_ID"]) || undefined,
    firstAirDate: safeStr(r["FirstAirDate"]) || safeStr(r["First Air Date"]) || undefined,
    lastAirDate: safeStr(r["LastAirDate"]) || safeStr(r["Last Air Date"]) || undefined,
    numberOfSeasons: safeStr(r["NumberOfSeasons"]) || undefined,
    numberOfEpisodes: safeStr(r["NumberOfEpisodes"]) || undefined,
    runtime: safeStr(r["Runtime"]) || safeStr(r["TotalRuntime"]) || safeStr(r["Total Runtime"]) || undefined,
    episodeRuntime:
      safeStr(r["EpisodeRuntime"]) ||
      safeStr(r["Episode Runtime"]) ||
      safeStr(r["AverageEpisodeRuntime"]) ||
      safeStr(r["Average Episode Runtime"]) ||
      undefined,
    averageEpisodeRuntime:
      safeStr(r["AverageEpisodeRuntime"]) ||
      safeStr(r["Average Episode Runtime"]) ||
      safeStr(r["EpisodeRuntime"]) ||
      safeStr(r["Episode Runtime"]) ||
      undefined,
    watchStatus: safeStr(r["WatchStatus"]) || undefined,
    watched: safeStr(r["Watched"]) || undefined,
    dateCompleted:
      safeStr(r["Completed Date"]) ||
      safeStr(r["Date Completed"]) ||
      safeStr(r["Completd Date"]) ||
      safeStr(r["CompletdDate"]) ||
      safeStr(r["CompletedDate"]) ||
      undefined,
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
    creator: safeStr(r["Creator"]) || safeStr(r["CreatedBy"]) || undefined,
    topcast: safeStr(r["Cast"]) || safeStr(r["Topcast"]) || undefined,
    topcastPhotos: safeStr(r["Cast Photos"]) || safeStr(r["Topcast Photos"]) || undefined,
    r2CoverUrl: safeStr(r["R2CoverUrl"]) || undefined,
    r2CoverUrlDate: safeStr(r["R2CoverUrl_Date"]) || undefined,
    r2BackdropUrl: safeStr(r["R2BackdropUrl"]) || undefined,
    r2BackdropUrlDate: safeStr(r["R2BackdropUrl_Date"]) || undefined,
    recommendationSource: safeStr(r["RecommendationSource"]) || undefined,
    recommendedIds: safeStr(r["RecommendedIDs"]) || undefined,
    recommendedTitles: safeStr(r["RecommendedTitles"]) || undefined,
    recommendationsLastChecked: safeStr(r["RecommendationsLastChecked"]) || undefined,
    recommendationsHidden: safeStr(r["RecommendationsHidden"]) || undefined,
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
    safeStr(r["CustomURL"]) ||
    safeStr(r["Custom URL"]) ||
    safeStr(r["CustomImageURL"]) ||
    safeStr(r["CustomImageUrl"]) ||
    safeStr(r["Custom Image URL"]) ||
    safeStr(r["\"CustomImageURL"]) ||
    safeStr(r["CustomImageURL\n"]);
  const imageUrl = safeStr(r["ImageURL"]) || safeStr(r["Image URL"]) || safeStr(r["Image"]);
  const metadataCoverUrl = customImageUrl || imageUrl;
  const csvUrl = metadataCoverUrl;
  const orderedCandidates: CoverCandidate[] = [
    { label: "CustomImageURL", url: customImageUrl },
    { label: "ImageURL", url: imageUrl },
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
    releaseDate: safeStr(r["ReleaseDate"]) || safeStr(r["Release Date"]) || safeStr(r["Published"]) || undefined,
    completedDate: safeStr(r["Completed Date"]) || safeStr(r["Date Completed"]) || safeStr(r["CompletedDate"]) || undefined,
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
    r2CoverUrl: safeStr(r["R2CoverUrl"]) || undefined,
    r2CoverUrlDate: safeStr(r["R2CoverUrl_Date"]) || undefined,
    hardcoverId: safeStr(r["HardcoverID"]) || undefined,
    recommendationSource: safeStr(r["RecommendationSource"]) || undefined,
    recommendedIds: safeStr(r["RecommendedIDs"]) || undefined,
    recommendedTitles: safeStr(r["RecommendedTitles"]) || undefined,
    recommendationsLastChecked: safeStr(r["RecommendationsLastChecked"]) || undefined,
    recommendationsHidden: safeStr(r["RecommendationsHidden"]) || undefined,
  };
}

function rowToMovie(r: Row): Movie | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const githubUrl = getGitHubCoverUrl(title, 'movies');
  const csvCustomUrl = safeStr(r["CustomURL"]) || safeStr(r["CustomImageURL"]);
  const csvPosterUrl = safeStr(r["PosterURL"]);
  const csvPoster = safeStr(r["Poster"]);
  const metadataCoverUrl = csvCustomUrl || csvPosterUrl || csvPoster;
  const csvUrl = metadataCoverUrl;
  const { posterUrl, coverSource, coverCandidates } = chooseCover([
    { label: "CustomURL", url: csvCustomUrl },
    { label: "PosterURL", url: csvPosterUrl },
    { label: "Poster", url: csvPoster },
    { label: "Generated GitHub Cover", url: githubUrl },
  ]);
  return {
    title,
    posterUrl,
    customImageUrl: csvCustomUrl || undefined,
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
    watchDate: safeStr(r["WatchDate"]) || safeStr(r["Watch Date"]) || safeStr(r["Date Watched"]) || undefined,
    tags: safeStr(r["Tags"]) || undefined,
    releaseDate: safeStr(r["ReleaseDate"]) || safeStr(r["Release Date"]) || undefined,
    runtime: safeStr(r["Runtime"]) || undefined,
    watchStatus: safeStr(r["Watch Status"]) || safeStr(r["WatchStatus"]) || safeStr(r["Watched"]) || undefined,
    status: safeStr(r["Status"]) || undefined,
    movieStatus: safeStr(r["Status"]) || undefined,
    ownership: safeStr(r["Ownership"]) || undefined,
    tag: safeStr(r["Tag"]) || safeStr(r["Tags"]) || undefined,
    overview: safeStr(r["Overview"]) || undefined,
    backdropUrl: safeStr(r["BackdropURL"]) || undefined,
    genres: safeStr(r["Genres"]) || safeStr(r["Genre"]) || undefined,
    director: safeStr(r["Director"]) || undefined,
    tagline: safeStr(r["Tagline"]) || undefined,
    budget: safeStr(r["Budget"]) || undefined,
    revenue: safeStr(r["Revenue"]) || undefined,
    topcast: safeStr(r["Topcast"]) || undefined,
    topcastPhotos: safeStr(r["Topcast Photos"]) || undefined,
    r2CoverUrl: safeStr(r["R2CoverUrl"]) || undefined,
    r2CoverUrlDate: safeStr(r["R2CoverUrl_Date"]) || undefined,
    r2BackdropUrl: safeStr(r["R2BackdropUrl"]) || undefined,
    r2BackdropUrlDate: safeStr(r["R2BackdropUrl_Date"]) || undefined,
    recommendationSource: safeStr(r["RecommendationSource"]) || undefined,
    recommendedIds: safeStr(r["RecommendedIDs"]) || undefined,
    recommendedTitles: safeStr(r["RecommendedTitles"]) || undefined,
    recommendationsLastChecked: safeStr(r["RecommendationsLastChecked"]) || undefined,
    recommendationsHidden: safeStr(r["RecommendationsHidden"]) || undefined,
  };
}

function rowToGame(r: Row): Game | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const githubUrl = getGitHubCoverUrl(title, 'games');
  const csvCustomUrl = safeStr(r["CustomURL"]) || safeStr(r["CustomImageURL"]);
  const csvPosterUrl = safeStr(r["PosterURL"]);
  const csvPoster = safeStr(r["Poster"]);
  const csvCoverUrl = safeStr(r["CoverURL"]);
  const metadataCoverUrl = csvCustomUrl || csvCoverUrl || csvPosterUrl || csvPoster;
  const { posterUrl, coverSource, coverCandidates } = chooseCover([
    { label: "CustomURL", url: csvCustomUrl },
    { label: "CoverURL", url: csvCoverUrl },
    { label: "PosterURL", url: csvPosterUrl },
    { label: "Poster", url: csvPoster },
    { label: "Generated GitHub Cover", url: githubUrl },
  ]);
  return {
    title,
    posterUrl,
    customImageUrl: csvCustomUrl || undefined,
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
    dateCompleted: safeStr(r["Completed Date"]) || safeStr(r["Date Completed"]) || undefined,
    yearPlayed: safeStr(r["Year Played"]) || safeStr(r["YearPlayed"]) || safeStr(r["Year played"]) || safeStr(r["Yearplayed"]) || undefined,
    dateAdded: safeStr(r["Date Added"]) || undefined,
    description: safeStr(r["Description"]) || undefined,
    genres: safeStr(r["Genres"]) || undefined,
    hoursPlayed: safeStr(r["Hours Played"]) || undefined,
    coverCachedAt: safeStr(r["CoverCachedAt"]) || undefined,
    developer: safeStr(r["Developer"]) || undefined,
    screenshotsUrl: safeStr(r["ScreenshotsURL"]) || undefined,
    wishlistOrder: safeStr(r["WishlistOrder"]) || undefined,
    queuedOrder: safeStr(r["QueuedOrder"]) || undefined,
    igdbId: safeStr(r["IGDB_ID"]) || undefined,
    igdbIdOverride: safeStr(r["IGDB_ID_Override"]) || undefined,
    localCoverUrl: safeStr(r["LocalCoverURL"]) || undefined,
    tag: safeStr(r["Tag"]) || safeStr(r["Tags"]) || undefined,
    r2CoverUrl: safeStr(r["R2CoverUrl"]) || undefined,
    r2CoverUrlDate: safeStr(r["R2CoverUrl_Date"]) || undefined,
    r2BackdropUrl: safeStr(r["R2BackdropUrl"]) || undefined,
    r2BackdropUrlDate: safeStr(r["R2BackdropUrl_Date"]) || undefined,
    recommendationSource: safeStr(r["RecommendationSource"]) || undefined,
    recommendedIds: safeStr(r["RecommendedIDs"]) || undefined,
    recommendedTitles: safeStr(r["RecommendedTitles"]) || undefined,
    recommendationsLastChecked: safeStr(r["RecommendationsLastChecked"]) || undefined,
    recommendationsHidden: safeStr(r["RecommendationsHidden"]) || undefined,
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

type NavKey = "home" | "search" | "books" | "movies" | "tv" | "games" | "now-playing" | "play-next" | "wishlist" | "wishlist-books" | "watchlist-movies" | "watchlist-tv" | "current" | "completed" | "abandoned" | "settings" | "year-this" | "smart-custom" | "statistics" | "upcoming" | "roadmap" | "cover-sync" | "themes" | "icons";
type LibraryNavKey = Exclude<NavKey, "statistics" | "roadmap" | "cover-sync">;
type CoverScaleGroupKey = "home" | "books" | "movies" | "tv" | "games";
type BookQuickLinkKey = "wishlist" | "library" | "completed" | "upcoming";
type MovieQuickLinkKey = "library" | "watched" | "started" | "backlog" | "abandoned" | "upcoming";
type TvQuickLinkKey = "library" | "backlog" | "watching" | "watched" | "abandoned" | "upcoming";
type TvViewMode = TvQuickLinkKey | "custom";
type GameQuickLinkKey = "library" | "backlog" | "completed" | "abandoned" | "wishlist" | "upcoming";
type GameViewMode = GameQuickLinkKey | "custom";
type BacklogQuickLinkKey = "home" | "now-playing" | "play-next" | "wishlist-books" | "watchlist-movies" | "watchlist-tv" | "upcoming";
type BuiltInSmartListKey = "year-this" | "current" | "completed" | "abandoned";
type ShelfThemeMode = "light" | "dark" | "classic";
const normalizeShelfThemeMode = (value: unknown): ShelfThemeMode =>
  value === "dark" || value === "classic" ? value : "light";
type HighlightThemeMode = "light" | "dark";

function isPersistedStandardSortView(nav: NavKey): nav is "home" | "books" | "movies" | "tv" | "games" | "current" | "completed" | "abandoned" | "year-this" {
  return (
    nav === "home" ||
    nav === "books" ||
    nav === "movies" ||
    nav === "tv" ||
    nav === "games" ||
    nav === "current" ||
    nav === "completed" ||
    nav === "abandoned" ||
    nav === "year-this"
  );
}

function getPersistedStandardSortViewLabel(nav: "home" | "books" | "movies" | "tv" | "games" | "current" | "completed" | "abandoned" | "year-this"): string {
  if (nav === "home") return "Home";
  if (nav === "books") return "Books";
  if (nav === "movies") return "Movies";
  if (nav === "tv") return "TV Shows";
  if (nav === "games") return "Games";
  if (nav === "current") return "Current";
  if (nav === "completed") return "Completed";
  if (nav === "abandoned") return "Abandoned";
  return "This Year";
}

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
  const isStaticSiteBuild = process.env.NEXT_PUBLIC_STATIC_SITE === "true";
  const localhostSettingsReadOnlyDefault = process.env.NEXT_PUBLIC_LOCALHOST_SETTINGS_READ_ONLY !== "false";
  const isLocalhostRuntime =
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1" || window.location.hostname === "::1");
  const isReadOnlySettingsMode = localhostSettingsReadOnlyDefault && isLocalhostRuntime;
  const canWriteSettings = Boolean(settingsWriteUrl) && !isReadOnlySettingsMode;
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
  const r2PrefsLoadedRef = useRef(false);
  const suppressCaseClickRef = useRef(false);
  const wishlistPointerDragRef = useRef<WishlistPointerDrag | null>(null);
  const wishlistCaseNodeMapRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const wishlistDragHoverTargetRef = useRef<string | null>(null);
  const wishlistDragHoverPlacementRef = useRef<WishlistDragPlacement | null>(null);
  const wishlistDragVisualRafRef = useRef<number | null>(null);
  const wishlistDragVisualPendingRef = useRef<WishlistPointerDrag | null>(null);
  const wishlistDragLatestOrderRef = useRef<string[] | null>(null);
  const smartListNameInputRef = useRef<string>("");

  const getCachedSettingValue = useCallback((key: string): string | number | boolean | undefined => {
    if (typeof window === "undefined") return undefined;

    try {
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      const cache = settingsCacheRef.current;
      if (!cache || cache[key] === undefined || cache[key] === "") return undefined;
      return parseStoredSettingValue(cache[key]);
    } catch (e) {
      console.warn(`Failed to read cached setting: ${key}`, e);
      return undefined;
    }
  }, []);
  const getCachedNumericSetting = useCallback((key: string): number | undefined => {
    const value = getCachedSettingValue(key);
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }, [getCachedSettingValue]);
  
  // Debounce timers for settings persistence
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const [loading, setLoading] = useState(false);
  const [startupSettingsHydrated, setStartupSettingsHydrated] = useState(false);
  const [startupLockVisible, setStartupLockVisible] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tvRows, setTvRows] = useState<Row[]>([]);
  const [bookRows, setBookRows] = useState<Row[]>([]);
  const [movieRows, setMovieRows] = useState<Row[]>([]);
  const [gameRows, setGameRows] = useState<Row[]>([]);
  const [settingsRows, setSettingsRows] = useState<Row[]>([]);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [, setSyncMsg] = useState<string>("");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [settingSyncConflicts, setSettingSyncConflicts] = useState<string[]>([]);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [coverSyncQuery, setCoverSyncQuery] = useState("");
  const [coverSyncMediaFilter, setCoverSyncMediaFilter] = useState<"all" | "movie" | "tv" | "game" | "book">("all");
  const [coverSyncStateFilter, setCoverSyncStateFilter] = useState<"all" | "unsynced" | "synced" | "missing-cover" | "missing-backdrop">("unsynced");
  const [coverSyncSortKey, setCoverSyncSortKey] = useState<"title" | "media" | "status" | "coverDate" | "backdropDate">("status");
  const [coverSyncSortDir, setCoverSyncSortDir] = useState<"asc" | "desc">("asc");
  const [backdropMigration, setBackdropMigration] = useState<{
    active: boolean;
    total: number;
    completed: number;
    failed: number;
    currentTitle: string;
    failedTitles: string[];
  }>({ active: false, total: 0, completed: 0, failed: 0, currentTitle: "", failedTitles: [] });
  const cancelBackdropMigrationRef = useRef<boolean>(false);

  // Sidebar nav
  const [nav, setNav] = useState<NavKey>("home");
  const isBacklogSidebarView =
    nav === "now-playing" ||
    nav === "play-next" ||
    nav === "wishlist-books" ||
    nav === "watchlist-movies" ||
    nav === "watchlist-tv" ||
    nav === "upcoming";
  const isSmartListOrDiscoverNav =
    nav === "current" ||
    nav === "completed" ||
    nav === "abandoned" ||
    nav === "year-this" ||
    nav === "smart-custom" ||
    nav === "statistics" ||
    nav === "roadmap" ||
    nav === "cover-sync" ||
    nav === "themes" ||
    nav === "icons";
  const isHomeSidebar = nav === "home" || isBacklogSidebarView || isSmartListOrDiscoverNav;
  const [lastLibraryNav, setLastLibraryNav] = useState<LibraryNavKey>("home");
  const [settingsPopupOpen, setSettingsPopupOpen] = useState<boolean>(false);
  const [sortPopupOpen, setSortPopupOpen] = useState<boolean>(false);
  const [faqPopupOpen, setFaqPopupOpen] = useState<boolean>(false);
  const [, setOpenSection] = useState<NavKey | null>(null);
  const [customSmartLists, setCustomSmartLists] = useState<SmartList[]>([]);
  const [smartListsEditMode, setSmartListsEditMode] = useState(false);
  const [builtInSmartListOrder, setBuiltInSmartListOrder] = useState<BuiltInSmartListKey[]>([
    "year-this",
    "current",
    "completed",
    "abandoned",
  ]);
  const [builtInSmartListLabels, setBuiltInSmartListLabels] = useState<Record<BuiltInSmartListKey, string>>({
    "year-this": "This Year",
    "current": "Current",
    "completed": "Completed",
    "abandoned": "Abandoned",
  });
  const [editingBuiltInSmartListKey, setEditingBuiltInSmartListKey] = useState<BuiltInSmartListKey | null>(null);
  const [editingCustomSmartListId, setEditingCustomSmartListId] = useState<string | null>(null);
  const [smartListNameDraft, setSmartListNameDraft] = useState<string>("");
  const [draggingBuiltInSmartListKey, setDraggingBuiltInSmartListKey] = useState<BuiltInSmartListKey | null>(null);
  const [builtInSmartListDropTargetKey, setBuiltInSmartListDropTargetKey] = useState<BuiltInSmartListKey | null>(null);
  const [draggingSmartListId, setDraggingSmartListId] = useState<string | null>(null);
  const [smartListDropTargetId, setSmartListDropTargetId] = useState<string | null>(null);
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

  const activateHomeLibrary = useCallback(() => {
    setNav("home");
    setOpenSection(null);
    setSortField("ReleaseDate");
    setSortOrder("Desc");
    setBookDetailItem(null);
    setMovieDetailItem(null);
    setTvDetailItem(null);
    setGameDetailItem(null);
  }, []);

  const openMediaSidebar = (section: "books" | "movies" | "tv" | "games") => {
    setMovieDetailItem(null);
    setTvDetailItem(null);
    setGameDetailItem(null);
    setBookDetailItem(null);
    setBookDetailPalette(null);
    if (nav === section) {
      activateHomeLibrary();
      return;
    }
    if (section === "books") {
      setWishlistFilter(false);
      setReadingStatusFilter(null);
      setFormatFilter(null);
      setSeriesFilter(null);
      setGenreFilter(null);
      setSortField("ReleaseDate");
      setSortOrder("Desc");
    }
    if (section === "movies") {
      setMovieWatchFilter(null);
      setMovieGenreFilter(null);
      setMovieTagFilter(null);
      setSortField("ReleaseDate");
      setSortOrder("Desc");
    }
    if (section === "tv") {
      setTvViewMode("library");
      setWatchFilter(null);
      setShowFilter(null);
      setTagFilter(null);
    }
    if (section === "games") {
      setGameViewMode("library");
      setGamePlatformFilter(null);
      setGameStatusFilter(null);
      setGameOwnershipFilter(null);
      setGameFormatFilter(null);
      setGameYearPlayedFilter(null);
      setGameGenreFilter(null);
      setSortField("ReleaseDate");
      setSortOrder("Desc");
    }
    setNav(section);
    setOpenSection(section);
  };

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
    logoSize: true,
    syncIcon: true,
    statusIcon: true,
    icons: false,
    sidebar: true,
    counter: false,
  });


  // UI
  const [posterSizeTv, setPosterSizeTv] = useState<number>(100);
  const [posterSizeMovies, setPosterSizeMovies] = useState<number>(108);
  const [posterSizeBooks, setPosterSizeBooks] = useState<number>(115);
  const [, setBookHeightMultiplier] = useState<number>(1.5);
  const [coverGapSize, setCoverGapSize] = useState<number>(24);
  const [tight, setTight] = useState<boolean>(true);
  const [watchFilter, setWatchFilter] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [movieWatchFilter, setMovieWatchFilter] = useState<string | null>(null);
  const [movieTagFilter, setMovieTagFilter] = useState<string | null>(null);
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
  const [gameViewMode, setGameViewMode] = useState<GameViewMode>("library");
  const [wishlistFilter, setWishlistFilter] = useState<boolean>(false);
  const [bookUpcomingFilter, setBookUpcomingFilter] = useState<boolean>(false);
  const [movieUpcomingFilter, setMovieUpcomingFilter] = useState<boolean>(false);
  const [tvViewMode, setTvViewMode] = useState<TvViewMode>("library");
  const isUpcomingView =
    nav === "upcoming" ||
    (nav === "books" && bookUpcomingFilter) ||
    (nav === "movies" && movieUpcomingFilter) ||
    (nav === "tv" && tvViewMode === "upcoming") ||
    (nav === "games" && gameViewMode === "upcoming");
  const [sortField, setSortField] = useState<string>("ReleaseDate");
  const [sortOrder, setSortOrder] = useState<"Asc" | "Desc">("Desc");
  const [wishlistManualOrderKeys, setWishlistManualOrderKeys] = useState<string[]>([]);
  const [readNextManualOrderKeys, setReadNextManualOrderKeys] = useState<string[]>([]);
  const [nowPlayingManualOrderKeys, setNowPlayingManualOrderKeys] = useState<string[]>([]);
  const [playNextManualOrderKeys, setPlayNextManualOrderKeys] = useState<string[]>([]);
  const [watchlistMoviesManualOrderKeys, setWatchlistMoviesManualOrderKeys] = useState<string[]>([]);
  const [watchlistTvManualOrderKeys, setWatchlistTvManualOrderKeys] = useState<string[]>([]);
  const [draggingWishlistKey, setDraggingWishlistKey] = useState<string | null>(null);
  const [wishlistPointerDrag, setWishlistPointerDrag] = useState<WishlistPointerDrag | null>(null);
  const [wishlistDragHoverKey, setWishlistDragHoverKey] = useState<string | null>(null);
  const [watchStatusOpen, setWatchStatusOpen] = useState<boolean>(false);
  const [showStatusOpen, setShowStatusOpen] = useState<boolean>(false);
  const [tagOpen, setTagOpen] = useState<boolean>(false);
  const [movieGenreOpen, setMovieGenreOpen] = useState<boolean>(false);
  const [movieTagOpen, setMovieTagOpen] = useState<boolean>(true);
  const [movieStatusOpen, setMovieStatusOpen] = useState<boolean>(true);
  const [seriesOpen, setSeriesOpen] = useState<boolean>(false);
  const [genreOpen, setGenreOpen] = useState<boolean>(false);
  const [gamePlatformOpen, setGamePlatformOpen] = useState<boolean>(true);
  const [gameOwnershipOpen, setGameOwnershipOpen] = useState<boolean>(false);
  const [gameFormatOpen, setGameFormatOpen] = useState<boolean>(false);
  const [gameYearPlayedOpen, setGameYearPlayedOpen] = useState<boolean>(false);
  const [gameGenresOpen, setGameGenresOpen] = useState<boolean>(false);
  const [showStatusIndicators, setShowStatusIndicators] = useState<boolean>(false);
  const [coverTitlesVisible, setCoverTitlesVisible] = useState<boolean>(false);
  const [sandboxMode] = useState<boolean>(false);
  const [coverTrimAssets, setCoverTrimAssets] = useState<Record<string, { url: string; aspect: number }>>({});
  const [viewportW, setViewportW] = useState(0);
  const [viewportH, setViewportH] = useState(0);
  const [windowScrollY, setWindowScrollY] = useState(0);
  const lastAppliedScrollYRef = useRef(0);
  const [stageTopAbs, setStageTopAbs] = useState(0);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  // Mobile-only: drag-to-reorder on manually-sortable views (Play Next,
  // Watchlists, etc.) is off until the user enables it from the Filter
  // panel, so scrolling doesn't accidentally drag covers.
  const [mobileSortEditMode, setMobileSortEditMode] = useState(false);
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [mobileFullLibraryOpen, setMobileFullLibraryOpen] = useState(false);

  const clearAllFilters = useCallback(() => {
    setQuery("");
    setTvViewMode("library");
    setWatchFilter(null);
    setShowFilter(null);
    setTagFilter(null);
    setMovieWatchFilter(null);
    setMovieGenreFilter(null);
    setMovieTagFilter(null);
    setGameViewMode("library");
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
  }, []);

  const DISABLE_INSETS = true;

  const measureCoverTrimBounds = useCallback((src: string, img: HTMLImageElement) => {
    if (!src || !img?.naturalWidth || !img?.naturalHeight) return;
    if (coverTrimAssets[src]) return;
    const naturalAsset = {
      url: src,
      aspect: img.naturalWidth / img.naturalHeight,
    };
    let nextAsset = naturalAsset;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (context) {
        context.drawImage(img, 0, 0);
        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        let top = height;
        let bottom = -1;
        let left = width;
        let right = -1;
        const alphaThreshold = 8;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const alpha = data[(y * width + x) * 4 + 3];
            if (alpha > alphaThreshold) {
              if (x < left) left = x;
              if (x > right) right = x;
              if (y < top) top = y;
              if (y > bottom) bottom = y;
            }
          }
        }
        if (right >= left && bottom >= top) {
          const cropWidth = right - left + 1;
          const cropHeight = bottom - top + 1;
          const cropCanvas = document.createElement("canvas");
          cropCanvas.width = cropWidth;
          cropCanvas.height = cropHeight;
          const cropContext = cropCanvas.getContext("2d");
          if (cropContext) {
            cropContext.drawImage(img, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
            nextAsset = {
              url: cropCanvas.toDataURL("image/png"),
              aspect: cropWidth / cropHeight,
            };
          }
        }
      }
    } catch (error) {
      console.warn("Failed to measure cover trim bounds:", error);
    }
    setCoverTrimAssets((prev) => (prev[src] ? prev : { ...prev, [src]: nextAsset }));
  }, [coverTrimAssets]);

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
  const [ratingBadgeScale, setRatingBadgeScale] = useState<number>(100);
  const [ratingBadgeOffsetX, setRatingBadgeOffsetX] = useState<number>(0);
  const [ratingBadgeOffsetY, setRatingBadgeOffsetY] = useState<number>(0);

  // Sidebar icon size
  const [iconSize, setIconSize] = useState<number>(16);

  // Sidebar text styling
  const [sidebarFontSize, setSidebarFontSize] = useState<number>(12);
  const [sidebarFontWeight, setSidebarFontWeight] = useState<string>("150");
  const [sidebarGap, setSidebarGap] = useState<number>(8);
  const [sidebarHeaderFontSize, setSidebarHeaderFontSize] = useState<number>(11);
  const [sidebarHeaderFontWeight, setSidebarHeaderFontWeight] = useState<string>("700");
  const [smartListsSidebarFontSize, setSmartListsSidebarFontSize] = useState<number>(12);
  const [smartListsSidebarFontWeight, setSmartListsSidebarFontWeight] = useState<string>("500");
  const [smartListsSidebarGap, setSmartListsSidebarGap] = useState<number>(8);
  const [smartListsSidebarHeaderFontSize, setSmartListsSidebarHeaderFontSize] = useState<number>(11);
  const [smartListsSidebarHeaderFontWeight, setSmartListsSidebarHeaderFontWeight] = useState<string>("700");
  const [smartListsSidebarIconSize, setSmartListsSidebarIconSize] = useState<number>(16);
  const [discoverSidebarFontSize, setDiscoverSidebarFontSize] = useState<number>(12);
  const [discoverSidebarFontWeight, setDiscoverSidebarFontWeight] = useState<string>("500");
  const [discoverSidebarGap, setDiscoverSidebarGap] = useState<number>(8);
  const [discoverSidebarHeaderFontSize, setDiscoverSidebarHeaderFontSize] = useState<number>(11);
  const [discoverSidebarHeaderFontWeight, setDiscoverSidebarHeaderFontWeight] = useState<string>("700");
  const [discoverSidebarIconSize, setDiscoverSidebarIconSize] = useState<number>(16);
  const [shelfThemeMode, setShelfThemeMode] = useState<ShelfThemeMode>("light");
  const [sidebarSectionGap, setSidebarSectionGap] = useState<number>(3);
  const [librarySidebarItemGap, setLibrarySidebarItemGap] = useState<number>(0);
  const [smartListsSidebarItemGap, setSmartListsSidebarItemGap] = useState<number>(0);
  const [discoverSidebarItemGap, setDiscoverSidebarItemGap] = useState<number>(0);
  const [sidebarSubmenuGap, setSidebarSubmenuGap] = useState<number>(0);
  const [sidebarRowDensityOffset, setSidebarRowDensityOffset] = useState<number>(0);
  const [sidebarHighlightColorsLight, setSidebarHighlightColorsLight] = useState<Record<CoverScaleGroupKey, string>>({
    home: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.home,
    books: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.books,
    movies: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.movies,
    tv: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.tv,
    games: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.games,
  });
  const [sidebarHighlightColorsDark, setSidebarHighlightColorsDark] = useState<Record<CoverScaleGroupKey, string>>({
    home: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.home,
    books: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.books,
    movies: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.movies,
    tv: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.tv,
    games: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.games,
  });
  const [highlightThemeEditorMode, setHighlightThemeEditorMode] = useState<HighlightThemeMode>("light");

  // Counter configuration
  const [, setCounterTileSize] = useState<number>(44);
  const [, setCounterTileSpacing] = useState<number>(3);
  const [, setCounterNumberFontSize] = useState<number>(22);
  const [, setCounterLabelFontSize] = useState<number>(16);
  const [, setCounterLabelFontWeight] = useState<string>("600");
  const [, setCounterLabelTop] = useState<number>(0);
  const [, setCounterLabelLeft] = useState<number>(0);
  const [, setCounterTop] = useState<number>(0);
  const [, setCounterLeft] = useState<number>(0);

  // Mac redesign baseline: Simple shelf is the only shelf presentation.
  const shelfTheme = SIMPLE_SHELF_THEME;
  const [simpleShelfBackgroundColor, setSimpleShelfBackgroundColor] = useState<string>(DEFAULT_SIMPLE_SHELF_BACKGROUND);
  const MOBILE_LAYOUT_MAX_WIDTH = 980;
  const isMobileLayout = viewportW > 0 && viewportW <= MOBILE_LAYOUT_MAX_WIDTH;
  const isSimpleShelfPresentation = true;
  const isElectricBlueShelfPresentation = false;
  const currentTopHeaderImage = "";
  
  // Mac redesign baseline: Mac sidebar is the only sidebar theme.
  
  // Theme configurations
  const simpleSidebarTheme = buildSimpleSidebarTheme(simpleShelfBackgroundColor);
  const sidebarThemes = {
    standard: {
      background: "url('/Sidebar.png'), linear-gradient(180deg, #f4f1ea 0%, #efe7db 100%)",
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
    mac: {
      background:
        "linear-gradient(180deg, rgba(247, 248, 250, 0.9) 0%, rgba(235, 238, 242, 0.82) 100%), linear-gradient(180deg, rgba(255, 255, 255, 0.5) 0%, rgba(240, 242, 245, 0.3) 100%)",
      primaryColor: "#707782",
      secondaryColor: "#454c56",
      textColor: "rgba(67, 72, 79, 0.9)",
      arrowColor: "rgba(95, 102, 112, 0.72)",
      rolodexColor: "#7d8794",
      rolodexDigitColor: "#5f6977",
      rolodexLabelColor: "#5b6572",
      rolodexTileBg: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(236,239,243,0.98) 100%)",
      rolodexTileBorder: "rgba(123, 132, 145, 0.26)",
      countBubbleColor: "#8b919b",
      syncedTextColor: "#5e6671",
      highlightBg: "rgba(122, 130, 141, 0.16)",
      highlightBgEnd: "rgba(113, 121, 132, 0.2)",
      highlightBorder: "rgba(146, 154, 166, 0.34)",
      activeHighlight: "rgba(120, 128, 140, 0.12)",
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
    },
    electricBlue: {
      background:
        "linear-gradient(180deg, rgba(19, 40, 78, 0.82) 0%, rgba(10, 23, 48, 0.8) 100%), linear-gradient(180deg, rgba(10, 22, 44, 0.76) 0%, rgba(7, 16, 34, 0.76) 100%)",
      primaryColor: "#8ec4ff",
      secondaryColor: "#e8f4ff",
      textColor: "rgba(234, 243, 255, 0.94)",
      arrowColor: "rgba(190, 224, 255, 0.78)",
      rolodexColor: "#3f78d8",
      rolodexDigitColor: "#2a61c7",
      rolodexLabelColor: "#dff0ff",
      rolodexTileBg: "linear-gradient(180deg, #f4f8ff 0%, #e4efff 100%)",
      rolodexTileBorder: "rgba(136,181,242,.45)",
      countBubbleColor: "#4f7fd4",
      syncedTextColor: "#d8eaff",
      highlightBg: "rgba(49, 85, 146, 0.94)",
      highlightBgEnd: "rgba(34, 64, 118, 0.96)",
      highlightBorder: "rgba(144, 192, 255, 0.6)",
      activeHighlight: "rgba(108, 159, 230, 0.34)",
    },
    simple: simpleSidebarTheme
  };
  
  const currentTheme = sidebarThemes.mac;
  const simpleSidebarIsLight = simpleSidebarTheme.isLightBackground;
  const simpleSidebarTextHex = simpleSidebarTheme.baseTextHex;
  const simpleSidebarOverlayBase = simpleSidebarTheme.overlayBaseHex;
  const simplePresentationBackground = simpleSidebarTheme.background;
  const isMacSidebarTheme = true;
  const isMacCoverMode = true;
  const isSimpleSidebarTheme = false;
  const isDarkSidebarTheme = false;
  const isDarkShelfMode = shelfThemeMode === "dark";
  const isClassicShelfMode = shelfThemeMode === "classic";
  const COVER_STAGE_BACKGROUND = isDarkShelfMode ? "#1a1d22" : "#ececec";
  const coverSurfaceBoxShadow = isDarkShelfMode
    ? "0 0 6px 0 rgba(0, 0, 0, 0.6)"
    : undefined;
  const isElectricBlueSidebarTheme = false;
  const activeSidebarHighlightColors =
    shelfThemeMode === "dark"
      ? sidebarHighlightColorsDark
      : shelfThemeMode === "classic"
        ? DEFAULT_SIDEBAR_HIGHLIGHT_COLORS
        : sidebarHighlightColorsLight;

  const sidebarAccentPalette: Record<CoverScaleGroupKey, { background: string; border: string; text: string; countBubble: string }> = {
    home: {
      background: hexToRgba(activeSidebarHighlightColors.home, 0.95, "#808893"),
      border: hexToRgba(activeSidebarHighlightColors.home, 0.98, "#6a727c"),
      text: "#ffffff",
      countBubble: "rgba(255, 255, 255, 0.2)",
    },
    books: {
      background: hexToRgba(activeSidebarHighlightColors.books, 0.96, "#5fb85c"),
      border: hexToRgba(activeSidebarHighlightColors.books, 0.98, "#4a9a47"),
      text: "#ffffff",
      countBubble: "rgba(255, 255, 255, 0.22)",
    },
    movies: {
      background: hexToRgba(activeSidebarHighlightColors.movies, 0.96, "#a168d6"),
      border: hexToRgba(activeSidebarHighlightColors.movies, 0.98, "#854fbd"),
      text: "#ffffff",
      countBubble: "rgba(255, 255, 255, 0.22)",
    },
    tv: {
      background: hexToRgba(activeSidebarHighlightColors.tv, 0.96, "#ff9934"),
      border: hexToRgba(activeSidebarHighlightColors.tv, 0.98, "#df7918"),
      text: "#ffffff",
      countBubble: "rgba(255, 255, 255, 0.22)",
    },
    games: {
      background: hexToRgba(activeSidebarHighlightColors.games, 0.96, "#3492ff"),
      border: hexToRgba(activeSidebarHighlightColors.games, 0.98, "#2377dc"),
      text: "#ffffff",
      countBubble: "rgba(255, 255, 255, 0.22)",
    },
  };
  const sidebarAccentKey: CoverScaleGroupKey = "home";
  const sidebarActiveAccent = sidebarAccentPalette[sidebarAccentKey];
  const getLibraryItemActiveStyle = (key: CoverScaleGroupKey, isActive: boolean): CSSProperties =>
    isActive
      ? {
          background: sidebarAccentPalette[key].background,
          borderColor: sidebarAccentPalette[key].border,
          color: sidebarAccentPalette[key].text,
        }
      : {};
  const usesThemeCountBubbleColor = true;
  const sidebarModuleStackGap = Math.max(0, sidebarSectionGap);
  const sidebarModuleMarginTop = isSimpleSidebarTheme ? 8 : isMacSidebarTheme ? 0 : 12;
  const sidebarPrimaryModuleMarginTop = isElectricBlueSidebarTheme ? 9 : isSimpleSidebarTheme ? 0 : isMacSidebarTheme ? 0 : 6;
  const sidebarModuleCardPadding = isSimpleSidebarTheme ? "8px 10px" : isMacSidebarTheme ? "8px 8px 4px" : "12px";
  const sidebarSectionSpacing = isSimpleSidebarTheme ? 10 : isMacSidebarTheme ? 8 : 16;
  const sidebarPrimaryModulePadding = isSimpleSidebarTheme ? "8px 10px 0" : sidebarModuleCardPadding;
  const sidebarDiscoverModulePadding = isSimpleSidebarTheme ? `${sidebarSectionSpacing}px 10px 8px` : isMacSidebarTheme ? "0px" : sidebarModuleCardPadding;
  const sidebarModuleCardBackground = isSimpleSidebarTheme
    ? "transparent"
    : isMacSidebarTheme
    ? "transparent"
    : isElectricBlueSidebarTheme
    ? "linear-gradient(180deg, rgba(33, 67, 122, 0.44) 0%, rgba(18, 36, 73, 0.5) 100%)"
    : "rgba(255, 255, 255, 0.125)";
  const sidebarModuleCardShadow = isSimpleSidebarTheme
    ? "none"
    : isMacSidebarTheme
    ? "none"
    : isElectricBlueSidebarTheme
    ? "0 0 10px rgba(110, 190, 255, 0.42), 0 0 18px rgba(68, 141, 247, 0.28), -16px 0 26px rgba(0, 0, 0, 0.22), -6px 0 10px rgba(0, 0, 0, 0.16), 0 6px 12px rgba(0, 0, 0, 0.18), 0 3px 6px rgba(0, 0, 0, 0.13), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 0 30px rgba(7, 20, 44, 0.34)"
    : "-16px 0 26px rgba(0, 0, 0, 0.28), -6px 0 10px rgba(0, 0, 0, 0.18), 0 1px 0 rgba(255, 255, 255, 0.4), 0 6px 12px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.7), inset 0 0 40px rgba(0, 0, 0, 0.08)";
  const sidebarModuleCardBorder = isSimpleSidebarTheme
    ? "none"
    : isMacSidebarTheme
    ? "none"
    : isElectricBlueSidebarTheme
    ? "1px solid transparent"
    : "1px solid rgba(255, 255, 255, 0.5)";
  const sidebarModuleCardBorderBottom = isSimpleSidebarTheme
    ? "none"
    : isMacSidebarTheme
    ? "none"
    : isElectricBlueSidebarTheme
    ? "1px solid transparent"
    : "1px solid rgba(0, 0, 0, 0.15)";
  const sidebarSectionFontFamily = isSimpleSidebarTheme
    ? "\"Geist Sans\", \"Geist\", \"Segoe UI\", sans-serif"
    : isMacSidebarTheme
    ? "-apple-system, BlinkMacSystemFont, \"SF Pro Text\", \"Helvetica Neue\", sans-serif"
    : "\"Nunito\", -apple-system, BlinkMacSystemFont, \"Segoe UI\", \"Roboto\", sans-serif";
  const sidebarSectionHeaderStyle: CSSProperties = {
    width: "100%",
    textAlign: "left",
    fontSize: sidebarHeaderFontSize,
    fontWeight: sidebarHeaderFontWeight,
    letterSpacing: "0",
    color: "#646a73",
    fontFamily: sidebarSectionFontFamily,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  };
  const sidebarSectionHeaderTextStyle: CSSProperties = {
    fontSize: sidebarHeaderFontSize,
    fontWeight: sidebarHeaderFontWeight,
    letterSpacing: "0",
    color: "#646a73",
    fontFamily: sidebarSectionFontFamily,
    textTransform: "uppercase",
  };
  const sidebarPrimaryItemRowStyle: CSSProperties = {
    width: "100%",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  };
  const sidebarPrimaryItemLabelStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: sidebarGap,
    fontSize: sidebarFontSize,
  };
  const sidebarIconSlotStyle: CSSProperties = {
    width: 18,
    height: 14,
    borderRadius: 4,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    overflow: "visible",
  };
  const sidebarSubSectionHeaderButtonStyle: CSSProperties = {
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
  };
  const sidebarSubItemRowStyle: CSSProperties = {
    width: "100%",
    textAlign: "left",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  };
  const sidebarBackplateOpacity = 1;
  const sidebarBackplateBackgroundSize = isSimpleSidebarTheme || isMacSidebarTheme ? "100% 100%" : "auto, 100% 100%";
  const sidebarBackplateBackgroundPosition = isSimpleSidebarTheme || isMacSidebarTheme ? "0 0" : "0 0, 0 0";
  const sidebarShellBackground = isDarkShelfMode
    ? "linear-gradient(180deg, rgba(182, 190, 201, 0.56) 0%, rgba(160, 168, 179, 0.5) 100%)"
    : isClassicShelfMode
      ? "linear-gradient(180deg, rgba(226, 223, 215, 0.76) 0%, rgba(214, 210, 200, 0.72) 100%)"
    : isSimpleSidebarTheme
    ? "transparent"
    : isMacSidebarTheme
      ? "linear-gradient(180deg, rgba(243, 245, 247, 0.58) 0%, rgba(231, 235, 239, 0.5) 100%)"
      : "rgba(255, 255, 255, 0.125)";
  const sidebarShellShadow = isDarkShelfMode
    ? "0 18px 42px rgba(38, 41, 46, 0.2), 0 2px 10px rgba(38, 41, 46, 0.12), inset 0 1px 0 rgba(255,255,255,0.34)"
    : isClassicShelfMode
      ? "0 18px 42px rgba(58, 50, 34, 0.12), 0 2px 10px rgba(58, 50, 34, 0.08), inset 0 1px 0 rgba(255,255,255,0.4)"
    : isSimpleSidebarTheme
    ? "none"
    : isMacSidebarTheme
      ? "0 18px 42px rgba(38, 41, 46, 0.16), 0 2px 10px rgba(38, 41, 46, 0.08), inset 0 1px 0 rgba(255,255,255,0.42)"
      : "-2px 0 5px rgba(0, 0, 0, 0.2), 2px 0 4px rgba(0, 0, 0, 0.5), 6px 0 10px rgba(0, 0, 0, 0.4), 12px 0 18px rgba(0, 0, 0, 0.3), 20px 0 30px rgba(0, 0, 0, 0.22), 30px 0 44px rgba(0, 0, 0, 0.14), 6px 8px 16px rgba(0, 0, 0, 0.14)";
  const simpleShelfColorPanelBorder =
    shelfTheme === SIMPLE_SHELF_THEME
      ? `1px solid ${hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.16 : 0.22, simpleSidebarTextHex)}`
      : isDarkSidebarTheme
        ? "1px solid rgba(232, 243, 245, 0.12)"
        : "1px solid rgba(0,0,0,0.08)";
  const simpleShelfColorPanelBackground =
    shelfTheme === SIMPLE_SHELF_THEME
      ? `linear-gradient(180deg, ${hexToRgba(simpleSidebarOverlayBase, simpleSidebarIsLight ? 0.04 : 0.08, simpleSidebarOverlayBase)} 0%, ${hexToRgba(simpleSidebarOverlayBase, simpleSidebarIsLight ? 0.12 : 0.18, simpleSidebarOverlayBase)} 100%), ${simplePresentationBackground}`
      : isDarkSidebarTheme
        ? "rgba(255,255,255,0.04)"
        : "rgba(255,255,255,0.35)";
  const simpleShelfColorPanelTitleColor = hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.7 : 0.76, simpleSidebarTextHex);
  const simpleShelfColorPanelTextColor = hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.94 : 0.96, simpleSidebarTextHex);
  const simpleShelfColorPanelMutedTextColor = hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.72 : 0.78, simpleSidebarTextHex);
  const simpleShelfColorSwatchStyle: CSSProperties = {
    width: 50,
    height: 40,
    padding: 4,
    borderRadius: 10,
    border: `1px solid ${hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.18 : 0.26, simpleSidebarTextHex)}`,
    background: `linear-gradient(180deg, ${hexToRgba(simpleSidebarOverlayBase, simpleSidebarIsLight ? 0.03 : 0.08, simpleSidebarOverlayBase)} 0%, ${hexToRgba(simpleSidebarOverlayBase, simpleSidebarIsLight ? 0.08 : 0.16, simpleSidebarOverlayBase)} 100%), ${simplePresentationBackground}`,
    boxShadow: simpleSidebarIsLight
      ? "inset 0 1px 0 rgba(255,255,255,0.36)"
      : "inset 0 1px 0 rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };
  const simpleShelfColorInputStyle: CSSProperties = {
    width: 42,
    height: 32,
    padding: 0,
    border: "1px solid rgba(0,0,0,0.16)",
    borderRadius: 8,
    background: "transparent",
    cursor: "pointer",
    display: "block",
  };
  const sidebarItemHoverBackground = isSimpleSidebarTheme
    ? hexToRgba(simpleSidebarOverlayBase, 0.06, simpleSidebarOverlayBase)
    : isMacSidebarTheme
      ? "rgba(122, 128, 138, 0.04)"
    : isDarkSidebarTheme
      ? "rgba(124, 160, 224, 0.14)"
      : "rgba(0,0,0,0.02)";
  const sidebarSubItemBorderColor = isSimpleSidebarTheme
    ? `1px solid ${hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.12 : 0.08, simpleSidebarTextHex)}`
    : isMacSidebarTheme
      ? "none"
    : isDarkSidebarTheme
      ? "1px solid rgba(142, 178, 234, 0.42)"
      : "1px solid rgba(0, 0, 0, 0.06)";
  const sidebarSubItemBackground = isSimpleSidebarTheme
    ? hexToRgba(simpleSidebarOverlayBase, 0.04, simpleSidebarOverlayBase)
    : isMacSidebarTheme
      ? "transparent"
    : isDarkSidebarTheme
      ? "rgba(19, 39, 72, 0.62)"
      : "rgba(255, 255, 255, 0.6)";
  const sidebarSubItemHoverBackground = isSimpleSidebarTheme
    ? hexToRgba(simpleSidebarOverlayBase, 0.08, simpleSidebarOverlayBase)
    : isMacSidebarTheme
      ? "rgba(120, 127, 138, 0.1)"
    : isDarkSidebarTheme
      ? "rgba(36, 71, 122, 0.7)"
      : "rgba(0, 0, 0, 0.05)";
  const sidebarSubItemTextColor = isSimpleSidebarTheme ? currentTheme.textColor : isDarkSidebarTheme ? "rgba(233, 243, 255, 0.98)" : "rgba(0, 0, 0, 0.7)";
  const sidebarSubItemActiveBackground = isSimpleSidebarTheme
    ? hexToRgba(simpleSidebarOverlayBase, 0.12, simpleSidebarOverlayBase)
    : isMacSidebarTheme
      ? "rgba(122, 128, 138, 0.16)"
      : isDarkSidebarTheme
        ? "rgba(124, 160, 224, 0.26)"
        : "rgba(0, 0, 0, 0.08)";
  const sidebarSubItemActiveBorder = isSimpleSidebarTheme
    ? `1px solid ${hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.2 : 0.16, simpleSidebarTextHex)}`
    : isMacSidebarTheme
      ? "1px solid rgba(95, 103, 114, 0.3)"
      : isDarkSidebarTheme
        ? "1px solid rgba(162, 196, 247, 0.5)"
        : "1px solid rgba(0, 0, 0, 0.14)";
  const sidebarSubItemActiveTextColor = isSimpleSidebarTheme ? currentTheme.secondaryColor : isDarkSidebarTheme ? "rgba(240, 248, 255, 0.98)" : "#2A2A2A";
  const sidebarSectionLabelColor = isSimpleSidebarTheme ? currentTheme.primaryColor : isDarkSidebarTheme ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A";
  const sidebarSectionControlColor = isSimpleSidebarTheme ? currentTheme.arrowColor : isDarkSidebarTheme ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A";
  const sidebarInlineMetaTextColor = isSimpleSidebarTheme ? currentTheme.textColor : isDarkSidebarTheme ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)";
  const sidebarSubItemLabelStyle: CSSProperties = {
    color: sidebarInlineMetaTextColor,
  };
  const smartListsSectionHeaderStyle: CSSProperties = {
    ...sidebarSectionHeaderStyle,
    fontSize: smartListsSidebarHeaderFontSize,
    fontWeight: smartListsSidebarHeaderFontWeight,
  };
  const smartListsSectionHeaderTextStyle: CSSProperties = {
    ...sidebarSectionHeaderTextStyle,
    fontSize: smartListsSidebarHeaderFontSize,
    fontWeight: smartListsSidebarHeaderFontWeight,
  };
  const smartListsRowStyle: CSSProperties = {
    ...sidebarSubItemRowStyle,
    fontSize: smartListsSidebarFontSize,
    fontWeight: smartListsSidebarFontWeight,
  };
  const discoverSectionHeaderStyle: CSSProperties = {
    ...sidebarSectionHeaderStyle,
    fontSize: discoverSidebarHeaderFontSize,
    fontWeight: discoverSidebarHeaderFontWeight,
  };
  const discoverSectionHeaderTextStyle: CSSProperties = {
    ...sidebarSectionHeaderTextStyle,
    fontSize: discoverSidebarHeaderFontSize,
    fontWeight: discoverSidebarHeaderFontWeight,
  };
  const discoverRowStyle: CSSProperties = {
    ...sidebarSubItemRowStyle,
    fontSize: discoverSidebarFontSize,
    fontWeight: discoverSidebarFontWeight,
  };
  const discoverLabelStyle: CSSProperties = {
    ...sidebarSubItemLabelStyle,
    fontSize: discoverSidebarFontSize,
    fontWeight: discoverSidebarFontWeight,
  };
  useEffect(() => {
    if (shelfThemeMode === "dark") {
      setSimpleShelfBackgroundColor("#151a22");
      return;
    }
    if (shelfThemeMode === "classic") {
      setSimpleShelfBackgroundColor("#d8cdb8");
      return;
    }
    setSimpleShelfBackgroundColor(DEFAULT_SIMPLE_SHELF_BACKGROUND);
  }, [shelfThemeMode]);
  const sidebarInlineCountColor = isSimpleSidebarTheme ? currentTheme.secondaryColor : isDarkSidebarTheme ? "rgba(241, 248, 255, 0.98)" : isMacSidebarTheme ? "#58606b" : "#333";
  const sidebarInlineCountBorder = isSimpleSidebarTheme
    ? `1px solid ${currentTheme.highlightBorder}`
    : isMacSidebarTheme
      ? "1px solid rgba(164, 170, 180, 0.3)"
    : isDarkSidebarTheme
      ? "1px solid rgba(146, 181, 235, 0.45)"
      : "1px solid rgba(0,0,0,0.12)";
  const sandboxOverlayText = "rgba(255, 248, 214, 0.96)";
  const sandboxOverlayBg = "rgba(83, 54, 0, 0.84)";
  const sandboxOverlayBorder = "1px solid rgba(255, 214, 102, 0.7)";
  const isSimpleHeaderTheme = isSimpleShelfPresentation;
  const simpleHeaderTextColor = hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.78 : 0.86, simpleSidebarTextHex);
  const simpleHeaderStrongTextColor = hexToRgba(simpleSidebarTextHex, 0.94, simpleSidebarTextHex);
  const simpleHeaderBorderColor = "none";
  const simpleHeaderBackground = "transparent";
  const simpleHeaderElevatedBackground = "transparent";
  const simpleHeaderShadow = "none";
  const simpleHeaderAccentBackground = "transparent";
  const simpleHeaderAccentBorder = "none";
  const simpleHeaderStatusOnColor = simpleSidebarIsLight ? "#2f8f5b" : "#6fd88b";
  const simpleHeaderStatusOffColor = simpleSidebarIsLight ? "#b23b3b" : "#f07a7a";
  const topSafeInset = "env(safe-area-inset-top, 0px)";
  const bottomSafeInset = "env(safe-area-inset-bottom, 0px)";
  const MOBILE_BOTTOM_DOCK_HEIGHT = 56;
  const MOBILE_BOTTOM_DOCK_SIDE_MARGIN = 12;
  const MOBILE_BOTTOM_DOCK_BOTTOM_MARGIN = 17;
  const MOBILE_BOTTOM_DOCK_PANEL_GAP = 10;
  const mobileBottomDockBottom = `calc(${bottomSafeInset} + ${MOBILE_BOTTOM_DOCK_BOTTOM_MARGIN}px)`;
  const mobileBottomDockReservedSpace = `calc(${bottomSafeInset} + ${MOBILE_BOTTOM_DOCK_HEIGHT + MOBILE_BOTTOM_DOCK_BOTTOM_MARGIN + MOBILE_BOTTOM_DOCK_PANEL_GAP}px)`;
  const mobileContentBottomPadding = `calc(40px + ${bottomSafeInset} + ${MOBILE_BOTTOM_DOCK_HEIGHT + MOBILE_BOTTOM_DOCK_BOTTOM_MARGIN + MOBILE_BOTTOM_DOCK_PANEL_GAP}px)`;
  const mobilePanelBackground = simplePresentationBackground;
  const mobilePanelBorder = `1px solid ${hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.18 : 0.24, simpleSidebarTextHex)}`;
  const mobilePanelDivider = `1px solid ${hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.12 : 0.18, simpleSidebarTextHex)}`;
  const mobilePanelCardBackground = hexToRgba(simpleSidebarOverlayBase, simpleSidebarIsLight ? 0.05 : 0.12, simpleSidebarOverlayBase);
  const mobilePanelCardBorder = `1px solid ${hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.14 : 0.18, simpleSidebarTextHex)}`;
  const mobilePanelSectionLabelColor = hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.62 : 0.68, simpleSidebarTextHex);
  const mobilePanelTextColor = simpleHeaderStrongTextColor;
  const mobilePanelButtonBackground = simpleHeaderBackground;
  const mobilePanelButtonBorder = simpleHeaderBorderColor;
  const mobilePanelButtonTextColor = simpleHeaderStrongTextColor;
  const mobilePanelActiveButtonBackground = simpleHeaderAccentBackground;
  const mobilePanelActiveButtonBorder = simpleHeaderAccentBorder;
  const mobilePanelActiveButtonTextColor = simpleHeaderStrongTextColor;
  const mobilePanelCountBackground = hexToRgba(simpleSidebarTextHex, simpleSidebarIsLight ? 0.12 : 0.18, simpleSidebarTextHex);
  const mobilePanelCountTextColor = simpleHeaderStrongTextColor;
  const mobilePanelLeftShadow = simpleSidebarIsLight
    ? "18px 0 34px rgba(0,0,0,0.18)"
    : "18px 0 34px rgba(0,0,0,0.34)";
  const mobilePanelRightShadow = simpleSidebarIsLight
    ? "-18px 0 34px rgba(0,0,0,0.18)"
    : "-18px 0 34px rgba(0,0,0,0.34)";
  const mobilePanelSectionHeadingStyle: CSSProperties = {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: "0.04em",
    color: mobilePanelSectionLabelColor,
  };
  const mobilePanelCardStyle: CSSProperties = {
    border: mobilePanelCardBorder,
    borderRadius: 10,
    background: mobilePanelCardBackground,
    padding: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };
  const mobilePanelButtonStyle: CSSProperties = {
    width: "100%",
    border: mobilePanelButtonBorder,
    background: mobilePanelButtonBackground,
    color: mobilePanelButtonTextColor,
    borderRadius: 10,
    padding: "9px 10px",
    fontSize: 13,
    fontWeight: 700,
    textAlign: "left",
    cursor: "pointer",
  };
  const mobilePanelPrimaryButtonStyle: CSSProperties = {
    ...mobilePanelButtonStyle,
    border: mobilePanelActiveButtonBorder,
    background: mobilePanelActiveButtonBackground,
    color: mobilePanelActiveButtonTextColor,
    fontWeight: 800,
  };
  const mobileBottomDockStyle: CSSProperties = {
    position: "fixed",
    left: MOBILE_BOTTOM_DOCK_SIDE_MARGIN,
    right: MOBILE_BOTTOM_DOCK_SIDE_MARGIN,
    bottom: mobileBottomDockBottom,
    height: MOBILE_BOTTOM_DOCK_HEIGHT,
    zIndex: 2510,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: "0 4px",
  };
  const mobileBottomDockMainRailStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: MOBILE_BOTTOM_DOCK_HEIGHT,
    border: "1px solid rgba(255,255,255,0.7)",
    borderRadius: 999,
    background: "rgba(248, 248, 252, 0.74)",
    boxShadow: simpleSidebarIsLight
      ? "0 12px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.72)"
      : "0 14px 30px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.14)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 8px",
  };
  const mobileBottomDockIconButtonStyle: CSSProperties = {
    height: "100%",
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    background: "transparent",
    color: "#141725",
    borderRadius: 999,
    cursor: "pointer",
  };
  const mobileBottomDockSearchButtonStyle: CSSProperties = {
    width: MOBILE_BOTTOM_DOCK_HEIGHT,
    height: MOBILE_BOTTOM_DOCK_HEIGHT,
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.72)",
    borderRadius: "50%",
    background: "rgba(248, 248, 252, 0.74)",
    color: "#141725",
    boxShadow: simpleSidebarIsLight
      ? "0 12px 28px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.72)"
      : "0 14px 30px rgba(0,0,0,0.34), inset 0 1px 0 rgba(255,255,255,0.14)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    cursor: "pointer",
  };
  const mobileBottomDockSearchStyle: CSSProperties = {
    flex: 1,
    minWidth: 0,
    height: 40,
    display: "flex",
    alignItems: "center",
    borderRadius: 12,
    border: mobilePanelButtonBorder,
    background: mobilePanelButtonBackground,
    boxShadow: simpleSidebarIsLight
      ? "0 6px 14px rgba(0,0,0,0.1)"
      : "0 8px 18px rgba(0,0,0,0.2)",
    paddingLeft: 10,
    paddingRight: 10,
    gap: 6,
  };
  const mobilePanelCountBadgeStyle: CSSProperties = {
    minWidth: 22,
    height: 18,
    borderRadius: 999,
    padding: "0 6px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 10,
    fontWeight: 800,
    color: mobilePanelCountTextColor,
    background: mobilePanelCountBackground,
  };
  const mobilePanelSelectStyle: CSSProperties = {
    width: "100%",
    padding: "9px 10px",
    borderRadius: 9,
    border: mobilePanelButtonBorder,
    background: mobilePanelButtonBackground,
    color: mobilePanelButtonTextColor,
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
    cursor: "pointer",
  };
  const getMobileMenuButtonStyle = (active: boolean): CSSProperties => ({
    ...mobilePanelButtonStyle,
    border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder,
    background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground,
    color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor,
    fontWeight: active ? 800 : 700,
  });
  const neonSyncStartOffset = useMemo(() => `-${(Math.random() * 96).toFixed(3)}s`, []);

  // Apply cached theme settings immediately on mount so we don't flash the default theme
  // while waiting for CSV/settings sync.
  useLayoutEffect(() => {
    try {
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      const cache = settingsCacheRef.current || {};
      const cachedSimpleShelfBackgroundColor = safeStr(cache["simpleShelfBackgroundColor"]);
      const cachedCoverScaleFallback = Math.max(
        0,
        Math.min(200, Math.round(getCachedNumericSetting("rowHeightScalePct") ?? 100))
      );
      const cachedCoverScales: Record<CoverScaleGroupKey, number> = {
        home: Math.max(0, Math.min(200, Math.round(getCachedNumericSetting(COVER_SCALE_SETTING_KEYS.home) ?? cachedCoverScaleFallback))),
        books: Math.max(0, Math.min(200, Math.round(getCachedNumericSetting(COVER_SCALE_SETTING_KEYS.books) ?? cachedCoverScaleFallback))),
        movies: Math.max(0, Math.min(200, Math.round(getCachedNumericSetting(COVER_SCALE_SETTING_KEYS.movies) ?? cachedCoverScaleFallback))),
        tv: Math.max(0, Math.min(200, Math.round(getCachedNumericSetting(COVER_SCALE_SETTING_KEYS.tv) ?? cachedCoverScaleFallback))),
        games: Math.max(0, Math.min(200, Math.round(getCachedNumericSetting(COVER_SCALE_SETTING_KEYS.games) ?? cachedCoverScaleFallback))),
      };
      if (cachedSimpleShelfBackgroundColor) {
        setSimpleShelfBackgroundColor(normalizeHexColor(cachedSimpleShelfBackgroundColor));
      }
      setCoverScaleByGroup((prev) => ({ ...prev, ...cachedCoverScales }));
    } catch (e) {
      console.warn("Failed to apply cached theme settings on mount:", e);
    }
  }, [getCachedNumericSetting]);

  // Layout tuning
  const SIDEBAR_WIDTH = 260;
  const SHELF_HEIGHT = 190;
  const SHELF_SIDE_PADDING = 10;
  const UPCOMING_LABEL_SPACE = -3;
  const COVER_TITLE_LABEL_SPACE = 28;
  const RAW_COVER_STANDARD_GAP = 10;
  const LIP_FROM_BOTTOM = 5;
  const SETTINGS_WINDOW_DEFAULT_WIDTH = 784;
  const SETTINGS_WINDOW_DEFAULT_HEIGHT = 680;
  const SETTINGS_WINDOW_MARGIN = 16;
  const SETTINGS_WINDOW_Z_INDEX = 9000;
  const { ref: stageRef, width: stageWidth, nodeRef: stageNodeRef } = useElementWidth<HTMLDivElement>();
  const baseGap = tight ? Math.max(0, coverGapSize - 6) : coverGapSize;
  const gap = isMobileLayout ? Math.max(0, baseGap - 4) : baseGap;
  const shelfGap = isMacCoverMode || DISABLE_INSETS
    ? RAW_COVER_STANDARD_GAP
    : isSimpleShelfPresentation
      ? Math.max(0, gap - (isMobileLayout ? 2 : 4))
      : gap;
  const simpleShelfVerticalPadding = isSimpleShelfPresentation ? Math.max(0, Math.round(shelfGap * 0.5)) : 0;
  const shelfSidePadding = isSimpleShelfPresentation ? shelfGap : SHELF_SIDE_PADDING;
  const shelfBottomOffset = isSimpleShelfPresentation ? simpleShelfVerticalPadding : LIP_FROM_BOTTOM;
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

  // Track known platforms for game filters.
  const [customizedPlatforms] = useState<Set<string>>(new Set());
  const [, setThemeSaveNotice] = useState<string>("");
  const [showVersionNotes, setShowVersionNotes] = useState(false);
  const [settingsWindowPosition, setSettingsWindowPosition] = useState<{ x: number; y: number } | null>(null);
  const settingsWindowRef = useRef<HTMLDivElement | null>(null);
  const settingsBodyRef = useRef<HTMLDivElement | null>(null);
  const sidebarModuleDefaultsRef = useRef<SidebarModuleDefaults | null>(null);
  const settingsWindowDragRef = useRef<{
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
  } | null>(null);
  const [, setSettingsScrollMetrics] = useState({
    hasOverflow: false,
    thumbTop: 0,
    thumbHeight: 24,
  });
  
  const [posterSizeGames, setPosterSizeGames] = useState<number>(108);
  const [mobileCoverScaleByGroup, setMobileCoverScaleByGroup] = useState<Record<CoverScaleGroupKey, number>>({
    home: 100,
    books: 100,
    movies: 100,
    tv: 100,
    games: 100,
  });
  const mobileCoverScaleGroup = getCoverScaleGroupForNav(nav) || getCoverScaleGroupForNav(lastLibraryNav) || "home";
  const mobileCoverScalePct = mobileCoverScaleByGroup[mobileCoverScaleGroup];
  const mobileCoverScaleFactor = isMobileLayout ? mobileCoverScalePct / 100 : 1;
  const mobileShelfWidthForDefaultCoverSizing = stageWidth > 0 ? stageWidth : viewportW;
  const mobileUsableWidthForDefaultCoverSizing = Math.max(0, mobileShelfWidthForDefaultCoverSizing - shelfSidePadding * 2);
  const mobileDefaultCoversPerRow = 4;
  const mobileMaxPosterSizeForDefaultRows =
    isMobileLayout && mobileUsableWidthForDefaultCoverSizing > 0
      ? Math.floor((mobileUsableWidthForDefaultCoverSizing + shelfGap) / mobileDefaultCoversPerRow - shelfGap)
      : 0;
  const defaultLargestPosterSize = Math.max(posterSizeTv, posterSizeMovies, posterSizeBooks, posterSizeGames);
  const mobileAutoFitScale =
    isMobileLayout && mobileMaxPosterSizeForDefaultRows > 0 && defaultLargestPosterSize > 0
      ? Math.min(1, mobileMaxPosterSizeForDefaultRows / defaultLargestPosterSize)
      : 1;
  const mobileCoverRenderScale = isMobileLayout ? mobileAutoFitScale * mobileCoverScaleFactor : 1;
  const mobileAdjustedPosterSizeTv = Math.max(52, Math.round(posterSizeTv * mobileCoverRenderScale));
  const mobileAdjustedPosterSizeMovies = Math.max(54, Math.round(posterSizeMovies * mobileCoverRenderScale));
  const mobileAdjustedPosterSizeBooks = Math.max(56, Math.round(posterSizeBooks * mobileCoverRenderScale));
  const mobileAdjustedPosterSizeGames = Math.max(54, Math.round(posterSizeGames * mobileCoverRenderScale));
  const simpleShelfPosterSize = Math.max(
    mobileAdjustedPosterSizeTv,
    mobileAdjustedPosterSizeMovies,
    mobileAdjustedPosterSizeBooks,
    mobileAdjustedPosterSizeGames
  );
  const simpleShelfCaseHeight = Math.round(simpleShelfPosterSize * 1.5);
  const rawCoverHeightScaleByMedia = {
    movie: 1.85,
    tv: 1.8,
    book: 1.6,
    game: 1.55,
    audiobook: 1.38,
  } as const;
  const [mediaCoverSizePct, setMediaCoverSizePct] = useState<MediaCoverSizePctState>({
    tv: DEFAULT_MEDIA_COVER_SIZE_PCT.tv,
    movies: DEFAULT_MEDIA_COVER_SIZE_PCT.movies,
    books: DEFAULT_MEDIA_COVER_SIZE_PCT.books,
    games: DEFAULT_MEDIA_COVER_SIZE_PCT.games,
    audiobooks: DEFAULT_MEDIA_COVER_SIZE_PCT.audiobooks,
  });
  const shelfContentHeight = Math.max(
    Math.round(posterSizeTv * rawCoverHeightScaleByMedia.tv),
    Math.round(posterSizeMovies * rawCoverHeightScaleByMedia.movie),
    Math.round(posterSizeGames * rawCoverHeightScaleByMedia.game),
    Math.round(posterSizeBooks * rawCoverHeightScaleByMedia.book),
    Math.round(posterSizeBooks * rawCoverHeightScaleByMedia.audiobook)
  );
  const [coverScaleByGroup, setCoverScaleByGroup] = useState<Record<CoverScaleGroupKey, number>>({
    home: 100,
    books: 100,
    movies: 100,
    tv: 100,
    games: 100,
  });
  const activeCoverScaleGroup = getCoverScaleGroupForNav(nav) || getCoverScaleGroupForNav(lastLibraryNav) || "home";
  const activeCoverScalePct = coverScaleByGroup[activeCoverScaleGroup];
  const rowHeightScaleFactor = activeCoverScalePct / 100;
  const shelfRowHeight = isSimpleShelfPresentation
    ? Math.max(1, Math.round((simpleShelfCaseHeight + simpleShelfVerticalPadding * 2) * rowHeightScaleFactor))
    : Math.max(1, Math.round(Math.max(SHELF_HEIGHT, shelfContentHeight + 18) * rowHeightScaleFactor));
  const isAudiobookItem = useCallback((item: any) => {
    if (!item || item.__type !== "book") return false;
    return getBookFormatKeyToken(item) === "audiobook";
  }, []);
  // Modal state for cover popup
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<any>(null);
  const [bookDetailItem, setBookDetailItem] = useState<any>(null);
  const [bookDetailsEditOpen, setBookDetailsEditOpen] = useState(false);
  const [movieDetailItem, setMovieDetailItem] = useState<any>(null);
  const [movieDetailsEditOpen, setMovieDetailsEditOpen] = useState(false);
  const [movieDetailPalette, setMovieDetailPalette] = useState<{ key: string; start: string; end: string } | null>(null);
  const [tvDetailItem, setTvDetailItem] = useState<any>(null);
  const [tvDetailsEditOpen, setTvDetailsEditOpen] = useState(false);
  const [tvDetailPalette, setTvDetailPalette] = useState<{ key: string; start: string; end: string } | null>(null);
  const [gameDetailItem, setGameDetailItem] = useState<any>(null);
  const [gameDetailsEditOpen, setGameDetailsEditOpen] = useState(false);
  const [gameDetailEditItem, setGameDetailEditItem] = useState<any>(null);
  const [saveToast, setSaveToast] = useState(false);
  const [lastSheetSaveAt, setLastSheetSaveAt] = useState<number | null>(null);
  const saveToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const triggerSaveToast = () => {
    if (saveToastTimer.current) clearTimeout(saveToastTimer.current);
    setLastSheetSaveAt(Date.now());
    setSaveToast(true);
    saveToastTimer.current = setTimeout(() => setSaveToast(false), 5000);
  };
  const [gameDetailPalette, setGameDetailPalette] = useState<{ key: string; start: string; end: string } | null>(null);
  const [bookDetailPalette, setBookDetailPalette] = useState<{ key: string; start: string; end: string } | null>(null);
  const [coverOverrides, setCoverOverrides] = useState<Record<string, string>>({});
  const [popupCoverModes, setPopupCoverModes] = useState<Record<string, "custom" | "default">>({});
  const [sidebarIconOverrides, setSidebarIconOverrides] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(SIDEBAR_ICON_OVERRIDES_LOCAL_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>;
    } catch {}
    return {};
  });
  const [statusIconOverrides, setStatusIconOverrides] = useState<Record<string, string>>(() => {
    if (isReadOnlySettingsMode) return {};
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(STATUS_ICON_OVERRIDES_LOCAL_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, string>;
    } catch {}
    return {};
  });
  const [failedCoverUrls, setFailedCoverUrls] = useState<Record<string, string[]>>({});
  const [failedCoverAttempts, setFailedCoverAttempts] = useState<Record<string, Record<string, number>>>({});
  const [uploadingCoverForKey, setUploadingCoverForKey] = useState<string | null>(null);
  const [uploadingSidebarIconKey, setUploadingSidebarIconKey] = useState<string | null>(null);
  const [uploadingStatusIconKey, setUploadingStatusIconKey] = useState<string | null>(null);
  type IconCropEditorState = {
    iconKind: "sidebar" | "status" | "smartlist";
    iconKey: string;
    iconLabel: string;
    sourceUrl: string;
    natural: { width: number; height: number };
    baseScale: number;
    zoomX: number;
    zoomY: number;
    offsetX: number;
    offsetY: number;
    saving: boolean;
  };
  const [iconCropEditor, setIconCropEditor] = useState<IconCropEditorState | null>(null);
  type IconCropPickerTarget = { iconKind: "sidebar" | "status" | "smartlist"; iconKey: string; iconLabel: string };
  const [iconCropPickerTarget, setIconCropPickerTarget] = useState<IconCropPickerTarget | null>(null);
  // Starts at 0 (identical on server + client, so the first render hydrates
  // cleanly). It only becomes non-zero after an in-session icon upload, which
  // forces the just-changed icon to reload immediately.
  const [sidebarIconRefreshVersion, setSidebarIconRefreshVersion] = useState<number>(0);
  const bumpSidebarIconVersion = useCallback(() => {
    setSidebarIconRefreshVersion(Date.now());
  }, []);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  type SyncCategory =
    | "book"
    | "movieCover"
    | "movieBackdrop"
    | "tvCover"
    | "tvBackdrop"
    | "gameCover"
    | "gameBackdrop";

  type SyncStatus = "pending" | "synced" | "missing" | "syncing" | "success" | "error";
  type SyncItem = {
    item: any;
    itemKey: string;
    title: string;
    category: SyncCategory;
    mediaType: "book" | "movie" | "tv" | "game";
    imageType: "cover" | "backdrop";
    sourceUrl: string;
    r2Url: string;
    status: SyncStatus;
    lastSync?: string;
    error?: string;
  };

  const [rateItModalOpen, setRateItModalOpen] = useState(false);
  const [rateItItem, setRateItItem] = useState<any>(null);
  const [rateItMediaType, setRateItMediaType] = useState<"movie" | "tv" | "book" | "game" | null>(null);
  const [rateItHighlightColor, setRateItHighlightColor] = useState<string>("#007AFF");
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addModalInitialSelection, setAddModalInitialSelection] = useState<{ type?: AddExtendedType; query?: string } | null>(null);
  const [isAddingNewItem, setIsAddingNewItem] = useState(false);
  const [addNewItemType, setAddNewItemType] = useState<"movie" | "tv" | "book" | "game" | null>(null);
  const [movieRecommendationPreview, setMovieRecommendationPreview] = useState<Record<string, unknown> | null>(null);
  const [tvRecommendationPreview, setTvRecommendationPreview] = useState<Record<string, unknown> | null>(null);
  const sidebarIconFileInputRef = useRef<HTMLInputElement | null>(null);
  const sidebarIconTargetKeyRef = useRef<string | null>(null);
  const statusIconFileInputRef = useRef<HTMLInputElement | null>(null);
  const statusIconTargetKeyRef = useRef<string | null>(null);
  const iconCropPickerInputRef = useRef<HTMLInputElement | null>(null);
  const debugHeaderLayerRef = useRef<HTMLDivElement | null>(null);
  const debugHeaderReadoutRef = useRef<HTMLDivElement | null>(null);
  const debugHeaderOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const caseTiltRafRef = useRef<number | null>(null);
  const caseTiltPendingRef = useRef<{ el: HTMLDivElement; tiltY: number; tiltX: number } | null>(null);

  useEffect(() => {
    setBookDetailItem(null);
    setBookDetailsEditOpen(false);
    setBookDetailPalette(null);
    setMovieDetailItem(null);
    setMovieDetailPalette(null);
  }, [nav, selectedSmartListId]);

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

  const buildItemWithCoverSelection = (item: any, overrides: Record<string, string>) => {
    const itemKey = getMediaItemKey(item);
    const coverMode = getPopupCoverModeForItem(item);
    const overrideUrl = safeStr(overrides[itemKey]);
    const metadataUrl =
      getMediaType(item) === "book"
        ? getBookSourceUrlByMode(item, coverMode)
        : safeStr(item?.metadataCoverUrl) || safeStr(item?.posterUrl) || "";
    const fallbackUrl = safeStr(item?.posterUrlFallback);
    const existingCandidates = Array.isArray(item?.coverCandidates)
      ? item.coverCandidates.filter(
          (candidate: any) => candidate && typeof candidate === "object" && safeStr(candidate.url)
        )
      : [];

    const coverCandidates: CoverCandidate[] = [];
    const seen = new Set<string>();
    const addCandidate = (label: string, url: string) => {
      const normalizedUrl = safeStr(url);
      if (!normalizedUrl || seen.has(normalizedUrl)) return;
      seen.add(normalizedUrl);
      coverCandidates.push({ label, url: normalizedUrl });
    };

    if (overrideUrl) addCandidate("Override Cover", overrideUrl);
    if (metadataUrl) addCandidate("Metadata Cover", metadataUrl);
    if (fallbackUrl && fallbackUrl !== metadataUrl) addCandidate("Generated Backup", fallbackUrl);
    for (const candidate of existingCandidates) {
      addCandidate(safeStr(candidate.label) || "Cover Candidate", safeStr(candidate.url));
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

  const getDisplayCoverUrl = (item: any, skipFailedFilter?: boolean) => {
    const itemKey = getMediaItemKey(item);
    const failed = skipFailedFilter ? new Set<string>() : new Set(failedCoverUrls[itemKey] || []);
    const mediaType = getMediaType(item);
    const baseCover = getDisplayCover(item, mediaType);
    const overrideUrl = safeStr(coverOverrides[itemKey]);
    const candidates = [overrideUrl, baseCover, safeStr(item?.posterUrlFallback)].filter(Boolean);
    const uniqueCandidates = Array.from(new Set(candidates));
    return uniqueCandidates.find((url) => !failed.has(url)) || "";
  };

  const getDisplayBackdropUrl = (item: any) => {
    const mediaType = getMediaType(item);
    if (mediaType !== "movie" && mediaType !== "tv" && mediaType !== "game") return "";
    return getDisplayBackdrop(item, mediaType);
  };

  const getPopupCoverModeForItem = (item: any): "custom" | "default" | undefined => {
    const itemKey = getMediaItemKey(item);
    return popupCoverModes[itemKey];
  };

  const openBookDetailItem = useCallback((item: any) => {
    const nextItem = buildItemWithCoverSelection(item, coverOverrides);
    setBookDetailPalette(null);
    setBookDetailItem(nextItem);
    setModalOpen(false);
    setModalItem(null);
  }, [coverOverrides, getDisplayCoverUrl]);

  const clearAllDetailItems = useCallback(() => {
    setMovieDetailItem(null);
    setTvDetailItem(null);
    setGameDetailItem(null);
    setBookDetailItem(null);
    setBookDetailPalette(null);
    setModalItem(null);
    setModalOpen(false);
  }, []);

  const openSelectedItem = useCallback((item: any) => {
    const nextItem = buildItemWithCoverSelection(item, coverOverrides);
    const mediaType = getMediaType(nextItem);
    if (mediaType === "book") {
      openBookDetailItem(nextItem);
      setMovieDetailItem(null);
      setTvDetailItem(null);
      setGameDetailItem(null);
      return;
    }
    if (mediaType === "movie") {
      setMovieDetailItem(nextItem);
      setTvDetailItem(null);
      setGameDetailItem(null);
      setBookDetailItem(null);
      setBookDetailPalette(null);
      setModalItem(null);
      setModalOpen(false);
      return;
    }
    if (mediaType === "tv") {
      setTvDetailItem(nextItem);
      setMovieDetailItem(null);
      setGameDetailItem(null);
      setBookDetailItem(null);
      setBookDetailPalette(null);
      setModalItem(null);
      setModalOpen(false);
      return;
    }
    if (mediaType === "game") {
      setGameDetailItem(nextItem);
      setMovieDetailItem(null);
      setTvDetailItem(null);
      setBookDetailItem(null);
      setBookDetailPalette(null);
      setModalItem(null);
      setModalOpen(false);
      return;
    }
    clearAllDetailItems();
    setModalItem(nextItem);
    setModalOpen(true);
  }, [coverOverrides, openBookDetailItem, clearAllDetailItems]);

  const openBookEditModalFromDetails = useCallback((item: any) => {
    const nextItem = buildItemWithCoverSelection(item, coverOverrides);
    setBookDetailItem(nextItem);
    setModalOpen(false);
    setModalItem(null);
    setCoverUploadError(null);
    setBookDetailsEditOpen(true);
  }, [coverOverrides]);

  const openMovieEditModalFromDetails = useCallback((item: any) => {
    const nextItem = buildItemWithCoverSelection(item, coverOverrides);
    setMovieDetailItem(nextItem);
    setMovieDetailsEditOpen(true);
  }, [coverOverrides]);

  const openTVEditModalFromDetails = useCallback((item: any) => {
    const nextItem = buildItemWithCoverSelection(item, coverOverrides);
    setTvDetailItem(nextItem);
    setTvDetailsEditOpen(true);
  }, [coverOverrides]);

  useEffect(() => {
    const onResize = () => {
      setViewportH(window.innerHeight || 0);
      setViewportW(window.innerWidth || 0);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) {
      setMobileSidebarOpen(false);
      setMobileSettingsOpen(false);
    }
  }, [isMobileLayout]);

  useEffect(() => {
    if (isMobileLayout) {
      setMobileSidebarOpen(false);
      setMobileSettingsOpen(false);
    }
  }, [isMobileLayout, nav]);

  useEffect(() => {
    if (!isMobileLayout) setMobileSearchOpen(false);
  }, [isMobileLayout]);

  useEffect(() => {
    setMovieDetailItem(null);
    setTvDetailItem(null);
    setGameDetailItem(null);
    setBookDetailItem(null);
    setBookDetailPalette(null);
  }, [nav]);

  useEffect(() => {
    const hasDetailOpen =
      Boolean(bookDetailItem && getMediaType(bookDetailItem) === "book") ||
      Boolean(movieDetailItem) ||
      Boolean(tvDetailItem) ||
      Boolean(gameDetailItem);
    if (!hasDetailOpen) return;

    const scrollTopNow = () => {
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
      if (typeof document !== "undefined") {
        if (document.documentElement) document.documentElement.scrollTop = 0;
        if (document.body) document.body.scrollTop = 0;
      }
    };

    scrollTopNow();
    const rafId = window.requestAnimationFrame(scrollTopNow);
    return () => window.cancelAnimationFrame(rafId);
  }, [bookDetailItem, movieDetailItem, tvDetailItem, gameDetailItem]);

  useEffect(() => {
    let rafId: number | null = null;
    // Performance: scrolling stores its position in React state, which
    // re-renders the whole page. The scroll position only affects two
    // things — the shelf virtualization window and the sticky-header fade.
    // The header fade completes within the first ~28px of scroll, and the
    // virtualization window has a multi-row buffer. So we keep full
    // precision near the top (smooth header fade) and only commit a new
    // value every SCROLL_BUCKET_PX once scrolled past the header zone,
    // cutting re-renders dramatically during normal reading-scroll.
    const SCROLL_PRECISION_ZONE_PX = 600;
    const SCROLL_BUCKET_PX = 96;
    const apply = () => {
      rafId = null;
      const y = window.scrollY || window.pageYOffset || 0;
      const last = lastAppliedScrollYRef.current;
      const nearTop = y < SCROLL_PRECISION_ZONE_PX || last < SCROLL_PRECISION_ZONE_PX;
      const bucketChanged =
        Math.floor(y / SCROLL_BUCKET_PX) !== Math.floor(last / SCROLL_BUCKET_PX);
      if (nearTop || bucketChanged) {
        lastAppliedScrollYRef.current = y;
        setWindowScrollY(y);
      }
    };
    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(apply);
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
    const minY = SETTINGS_WINDOW_MARGIN;
    const maxX = Math.max(minX, window.innerWidth - width - SETTINGS_WINDOW_MARGIN);
    const maxY = Math.max(minY, window.innerHeight - height - SETTINGS_WINDOW_MARGIN);
    return {
      x: Math.round(Math.min(Math.max(x, minX), maxX)),
      y: Math.round(Math.min(Math.max(y, minY), maxY)),
    };
  }, [SETTINGS_WINDOW_MARGIN]);

  const getSettingsWindowSize = useCallback(() => {
    const width = Math.min(
      SETTINGS_WINDOW_DEFAULT_WIDTH,
      Math.max(320, window.innerWidth - SETTINGS_WINDOW_MARGIN * 2)
    );
    const maxHeight = Math.max(320, window.innerHeight - SETTINGS_WINDOW_MARGIN * 2);
    const measuredHeight = settingsWindowRef.current?.getBoundingClientRect().height;
    return {
      width,
      height: measuredHeight ?? Math.min(SETTINGS_WINDOW_DEFAULT_HEIGHT, maxHeight),
    };
  }, [SETTINGS_WINDOW_DEFAULT_HEIGHT, SETTINGS_WINDOW_DEFAULT_WIDTH, SETTINGS_WINDOW_MARGIN]);

  useEffect(() => {
    if (!settingsPopupOpen) return;
    const syncSettingsWindowPosition = () => {
      const { width, height } = getSettingsWindowSize();
      setSettingsWindowPosition((prev) => {
        const fallbackX = Math.round((window.innerWidth - width) / 2);
        const fallbackY = SETTINGS_WINDOW_MARGIN;
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

  const updateSettingsScrollMetrics = useCallback(() => {
    const node = settingsBodyRef.current;
    if (!node) {
      setSettingsScrollMetrics({ hasOverflow: false, thumbTop: 0, thumbHeight: 24 });
      return;
    }
    const visible = node.clientHeight;
    const total = node.scrollHeight;
    const overflow = total > visible + 1;
    if (!overflow) {
      setSettingsScrollMetrics({ hasOverflow: false, thumbTop: 0, thumbHeight: 24 });
      return;
    }
    const trackHeight = Math.max(40, visible - 16);
    const ratio = Math.max(0, Math.min(1, node.scrollTop / Math.max(1, total - visible)));
    const thumbHeight = Math.max(24, Math.round((visible / total) * trackHeight));
    const thumbTop = Math.round(ratio * Math.max(0, trackHeight - thumbHeight));
    setSettingsScrollMetrics({ hasOverflow: true, thumbTop, thumbHeight });
  }, []);

  useEffect(() => {
    if (!settingsPopupOpen) return;
    const node = settingsBodyRef.current;
    if (!node) return;
    updateSettingsScrollMetrics();
    const onResize = () => updateSettingsScrollMetrics();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [settingsPopupOpen, updateSettingsScrollMetrics]);

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
    sidebarModuleDefaultsRef.current = {
      library: {
        iconSize,
        fontSize: sidebarFontSize,
        fontWeight: sidebarFontWeight,
        iconGap: sidebarGap,
        headerFontSize: sidebarHeaderFontSize,
        headerFontWeight: sidebarHeaderFontWeight,
      },
      smartLists: {
        iconSize: smartListsSidebarIconSize,
        fontSize: smartListsSidebarFontSize,
        fontWeight: smartListsSidebarFontWeight,
        iconGap: smartListsSidebarGap,
        headerFontSize: smartListsSidebarHeaderFontSize,
        headerFontWeight: smartListsSidebarHeaderFontWeight,
      },
      discover: {
        iconSize: discoverSidebarIconSize,
        fontSize: discoverSidebarFontSize,
        fontWeight: discoverSidebarFontWeight,
        iconGap: discoverSidebarGap,
        headerFontSize: discoverSidebarHeaderFontSize,
        headerFontWeight: discoverSidebarHeaderFontWeight,
      },
    };
    setSettingsOpen((prev) => ({
      ...prev,
      logoSize: true,
      syncIcon: true,
      statusIcon: true,
      sidebar: true,
    }));
    // Always open (not toggle) to avoid double-event close races after submenu interactions.
    setSettingsPopupOpen(true);
  }, [
    discoverSidebarFontSize,
    discoverSidebarFontWeight,
    discoverSidebarGap,
    discoverSidebarHeaderFontSize,
    discoverSidebarHeaderFontWeight,
    discoverSidebarIconSize,
    iconSize,
    sidebarFontSize,
    sidebarFontWeight,
    sidebarGap,
    sidebarHeaderFontSize,
    sidebarHeaderFontWeight,
    smartListsSidebarFontSize,
    smartListsSidebarFontWeight,
    smartListsSidebarGap,
    smartListsSidebarHeaderFontSize,
    smartListsSidebarHeaderFontWeight,
    smartListsSidebarIconSize,
  ]);

  const handleMobileNavSelect = useCallback((nextNav: NavKey) => {
    setMobileFullLibraryOpen(false);
    setNav(nextNav);
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
    setMobileSearchOpen(false);
  }, []);

  useEffect(() => {
    if (nav !== "home" && mobileFullLibraryOpen) {
      setMobileFullLibraryOpen(false);
    }
  }, [mobileFullLibraryOpen, nav]);

  useEffect(() => {
    if (nav !== "statistics" && nav !== "roadmap" && nav !== "cover-sync") {
      setLastLibraryNav(nav);
    }
  }, [nav]);

  const openStatisticsView = useCallback(() => {
    setNav("statistics");
    setSortPopupOpen(false);
    setSettingsPopupOpen(false);
    setFaqPopupOpen(false);
    setShowVersionNotes(false);
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, []);

  const handleExitStatistics = useCallback(() => {
    setNav(lastLibraryNav || "home");
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, [lastLibraryNav]);

  const openRoadmapView = useCallback(() => {
    setNav("roadmap");
    setSortPopupOpen(false);
    setSettingsPopupOpen(false);
    setFaqPopupOpen(false);
    setShowVersionNotes(false);
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, []);

  const handleExitRoadmap = useCallback(() => {
    setNav(lastLibraryNav || "home");
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, [lastLibraryNav]);

  const openCoverSyncView = useCallback(() => {
    setNav("cover-sync");
    setSortPopupOpen(false);
    setSettingsPopupOpen(false);
    setFaqPopupOpen(false);
    setShowVersionNotes(false);
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, []);

  const openThemesView = useCallback(() => {
    setNav("themes");
    setSortPopupOpen(false);
    setSettingsPopupOpen(false);
    setFaqPopupOpen(false);
    setShowVersionNotes(false);
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, []);

  const handleExitThemes = useCallback(() => {
    setNav(lastLibraryNav || "home");
  }, [lastLibraryNav]);

  const openIconsView = useCallback(() => {
    setNav("icons");
    setSortPopupOpen(false);
    setSettingsPopupOpen(false);
    setFaqPopupOpen(false);
    setShowVersionNotes(false);
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, []);

  const handleExitIcons = useCallback(() => {
    setNav(lastLibraryNav || "home");
  }, [lastLibraryNav]);

  const handleExitCoverSync = useCallback(() => {
    setNav(lastLibraryNav || "home");
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, [lastLibraryNav]);

  const handleMobileSmartListSelect = useCallback((smartList: SmartList) => {
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
    setSelectedSmartListId(smartList.id);
    setNav("smart-custom");
    setSortField(shouldUseManualSort ? MANUAL_SORT_FIELD : defaultSortField);
    setSortOrder(shouldUseManualSort ? "Asc" : smartList.defaultSortOrder);
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
  }, [smartListManualOrderKeysById]);

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
        const cleaned = Object.fromEntries(
          Object.entries(parsed as Record<string, string>).filter(([key]) => !isLegacyBookMediaKey(key))
        );
        setCoverOverrides(cleaned);
        if (Object.keys(cleaned).length !== Object.keys(parsed as Record<string, string>).length) {
          localStorage.setItem("cdlCoverOverrides", JSON.stringify(cleaned));
        }
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
          if (isLegacyBookMediaKey(key)) return;
          if (value === "custom" || value === "default") {
            normalized[key] = value;
          }
        });
        setPopupCoverModes(normalized);
        if (Object.keys(normalized).length !== Object.keys(parsed as Record<string, unknown>).length) {
          localStorage.setItem("cdlPopupCoverModes", JSON.stringify(normalized));
        }
      }
    } catch (e) {
      console.warn("Failed to load popup cover modes from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    if (!settingsRows.length) return;
    const fromSheet: Record<string, string> = {};
    const popupModesFromSheet: Record<string, "custom" | "default"> = {};
    const sidebarIconFromSheet: Record<string, string> = {};
    const statusIconFromSheet: Record<string, string> = {};
    settingsRows.forEach((r) => {
      const key = safeStr(r["Key"]);
      const value = safeStr(r["Value"]);
      if (key.startsWith("coverOverride:")) {
        const mediaKey = key.slice("coverOverride:".length);
        if (isLegacyBookMediaKey(mediaKey)) return;
        if (mediaKey && value) {
          fromSheet[mediaKey] = value;
          // Debug: log cover overrides from sheet
          if (mediaKey.toLowerCase().includes("beacon") || mediaKey.toLowerCase().includes("midnight")) {
            console.log(`[Settings Load] Found cover override for ${mediaKey}:`, value.substring(0, 50));
          }
        }
      }
      if (key.startsWith("popupCoverMode:")) {
        const mediaKey = key.slice("popupCoverMode:".length);
        if (isLegacyBookMediaKey(mediaKey)) return;
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
      if (key.startsWith(STATUS_ICON_SETTING_PREFIX)) {
        const iconKey = key.slice(STATUS_ICON_SETTING_PREFIX.length);
        if (iconKey && value) {
          statusIconFromSheet[iconKey] = value;
        }
      }
    });
    if (Object.keys(fromSheet).length) {
      console.log(`[Settings Load] Updating coverOverrides with ${Object.keys(fromSheet).length} overrides from sheet:`, Object.keys(fromSheet));
      setCoverOverrides((prev) => {
        const next = { ...fromSheet, ...prev };
        console.log(`[Settings Load] New coverOverrides:`, Object.keys(next));
        return next;
      });
    }
    if (Object.keys(popupModesFromSheet).length) {
      setPopupCoverModes((prev) => ({ ...popupModesFromSheet, ...prev }));
    }
    if (isReadOnlySettingsMode) {
      setSidebarIconOverrides(sidebarIconFromSheet);
      setStatusIconOverrides(statusIconFromSheet);
      return;
    }
    if (Object.keys(sidebarIconFromSheet).length) {
      setSidebarIconOverrides((prev) => ({ ...prev, ...sidebarIconFromSheet }));
    }
    if (Object.keys(statusIconFromSheet).length) {
      setStatusIconOverrides((prev) => ({ ...prev, ...statusIconFromSheet }));
    }
  }, [isReadOnlySettingsMode, settingsRows]);

  // NOTE: A legacy "migrate sidebar icons to R2" effect used to live here. It
  // re-uploaded the sheet's sidebarIcon:* URLs to icons/sidebar/{key} whenever
  // its localStorage flag was missing (e.g. on a fresh clone) — which clobbered
  // newer crop-modal uploads with stale sheet URLs. Sidebar icons now upload
  // straight to the fixed R2 key from commitIconCrop, so the migration is gone.

  useEffect(() => {
    if (!modalItem && !bookDetailItem) return;

    if (modalItem) {
      setModalItem((prev: any) => {
        if (!prev) return prev;
        const itemKey = getMediaItemKey(prev);
        const activeOverride = safeStr(coverOverrides[itemKey]);
        const updated = buildItemWithCoverSelection(prev, coverOverrides);
        // If there's a pending override, auto-sync it to the CustomURL field
        if (activeOverride && !safeStr(prev.customImageUrl || prev.CustomURL || prev.CustomImageURL)) {
          return { ...updated, customImageUrl: activeOverride, CustomURL: activeOverride, CustomImageURL: activeOverride };
        }
        return updated;
      });
    }

    if (bookDetailItem) {
      setBookDetailItem((prev: any) => {
        if (!prev) return prev;
        const updated = buildItemWithCoverSelection(prev, coverOverrides);
        // If there's a pending override, auto-sync it to the CustomURL field
        const itemKey = getMediaItemKey(prev);
        const activeOverride = safeStr(coverOverrides[itemKey]);
        if (activeOverride && !safeStr(prev.customImageUrl || prev.CustomURL || prev.CustomImageURL)) {
          return { ...updated, customImageUrl: activeOverride, CustomURL: activeOverride, CustomImageURL: activeOverride };
        }
        return updated;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverOverrides]);

  const getSidebarIconSrc = (iconKey: string, fallbackSrc: string): string => {
    const safeIconKey = safeStr(iconKey)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    if (!safeIconKey) return fallbackSrc;
    // v carries a static cache-bust tag (so the URL is never the old "v=0"
    // that pinned stale icons) plus, after an in-session upload, a timestamp
    // suffix so the changed icon reloads right away.
    const versionTag =
      sidebarIconRefreshVersion > 0
        ? `${SIDEBAR_ICON_CACHE_BUST}.${sidebarIconRefreshVersion}`
        : SIDEBAR_ICON_CACHE_BUST;
    return `/api/sidebar-icon?iconKey=${encodeURIComponent(safeIconKey)}&fallback=${encodeURIComponent(fallbackSrc)}&v=${encodeURIComponent(versionTag)}`;
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
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemKey", `sidebar-icon-${iconKey}`);
      formData.append("mediaType", "sidebar-icon");
      formData.append("title", iconKey);
      formData.append("objectKey", `icons/sidebar/${iconKey}`);

      const res = await fetch("/api/upload-cover", {
        method: "POST",
        body: formData,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.url) {
        throw new Error(payload?.error || `Upload failed (${res.status})`);
      }

      bumpSidebarIconVersion();

      setSyncState("ok");
      setSyncMsg("Sidebar icon saved");
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

  const getStatusIconSrc = (statusKey: string): string => safeStr(statusIconOverrides[statusKey]);

  const openStatusIconFilePicker = (event: ReactMouseEvent<HTMLElement>, statusKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    if (uploadingStatusIconKey) return;
    statusIconTargetKeyRef.current = statusKey;
    const input = statusIconFileInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const handleStatusIconFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const statusKey = statusIconTargetKeyRef.current;
    if (!file || !statusKey) return;
    if (!safeStr(file.type).toLowerCase().startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }

    setUploadingStatusIconKey(statusKey);
    try {
      let iconUrl = "";
      let uploadedToCloud = false;

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("itemKey", `status-icon-${statusKey}`);
        formData.append("mediaType", "status-icon");
        formData.append("title", statusKey);
        const res = await fetch("/api/upload-cover", { method: "POST", body: formData });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) {
          throw new Error(payload?.error || `Upload failed (${res.status})`);
        }
        iconUrl = String(payload.url);
        uploadedToCloud = true;
      } catch (uploadError) {
        console.warn("Status icon upload failed, using local fallback:", uploadError);
        iconUrl = await fileToDataUrl(file);
      }

      setStatusIconOverrides((prev) => {
        const next = { ...prev, [statusKey]: iconUrl };
        try {
          localStorage.setItem(STATUS_ICON_OVERRIDES_LOCAL_KEY, JSON.stringify(next));
        } catch (persistError) {
          console.warn("Failed to persist status icon overrides locally:", persistError);
        }
        return next;
      });

      if (uploadedToCloud) {
        saveSetting(
          `${STATUS_ICON_SETTING_PREFIX}${statusKey}`,
          iconUrl,
          "Status Icons",
          `Custom status icon for ${statusKey}`
        );
      }

      setSyncState("ok");
      setSyncMsg(uploadedToCloud ? "Status icon saved" : "Status icon saved locally");
      setLastSyncAt(Date.now());
      setTimeout(() => setSyncMsg("Synced"), 1200);
    } catch (error: any) {
      const msg = error?.message || "Failed to update status icon.";
      console.error("Status icon update failed:", error);
      setSyncState("error");
      setSyncMsg(msg);
      alert(msg);
    } finally {
      setUploadingStatusIconKey(null);
      statusIconTargetKeyRef.current = null;
      event.target.value = "";
    }
  };

  const ICON_CROP_VIEWPORT = 280;
  const ICON_CROP_OUTPUT = 512;

  const beginIconCrop = (target: IconCropPickerTarget) => {
    setIconCropPickerTarget(target);
    const input = iconCropPickerInputRef.current;
    if (!input) return;
    input.value = "";
    input.click();
  };

  const loadIconImageDataUrl = async (url: string): Promise<string> => {
    // Determine whether the URL is absolute (cross-origin) — if so route through
    // /api/cover-proxy so the response is same-origin and safe for canvas draws.
    let fetchUrl = url;
    try {
      if (typeof window !== "undefined") {
        const parsed = new URL(url, window.location.origin);
        if (parsed.origin !== window.location.origin) {
          fetchUrl = `/api/cover-proxy?src=${encodeURIComponent(parsed.toString())}`;
        }
      }
    } catch {
      // Not a parseable URL — fall through to direct fetch.
    }
    let res: Response;
    try {
      res = await fetch(fetchUrl, { cache: "no-cache" });
    } catch (e) {
      // Direct fetch threw (likely network/CORS). If we didn't already use the proxy, try it.
      if (fetchUrl === url) {
        res = await fetch(`/api/cover-proxy?src=${encodeURIComponent(url)}`, { cache: "no-cache" });
      } else {
        throw e;
      }
    }
    if (!res.ok) {
      // Proxy fallback for same-origin URLs that 4xx'd (rare, but safe).
      if (fetchUrl === url) {
        res = await fetch(`/api/cover-proxy?src=${encodeURIComponent(url)}`, { cache: "no-cache" });
        if (!res.ok) throw new Error(`Failed to load icon image (${res.status}).`);
      } else {
        throw new Error(`Failed to load icon image (${res.status}).`);
      }
    }
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("Failed to decode icon image."));
      reader.readAsDataURL(blob);
    });
  };

  const openIconEditorWithUrl = async (target: IconCropPickerTarget, url: string) => {
    try {
      const dataUrl = await loadIconImageDataUrl(url);
      const img = new Image();
      const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
        img.onerror = () => reject(new Error("Failed to load image."));
        img.src = dataUrl;
      });
      const baseScale = ICON_CROP_VIEWPORT / Math.max(dims.width, dims.height);
      setIconCropEditor({
        iconKind: target.iconKind,
        iconKey: target.iconKey,
        iconLabel: target.iconLabel,
        sourceUrl: dataUrl,
        natural: dims,
        baseScale,
        zoomX: 1,
        zoomY: 1,
        offsetX: 0,
        offsetY: 0,
        saving: false,
      });
    } catch (e: any) {
      console.warn("Falling back to file picker for icon edit:", e);
      beginIconCrop(target);
    }
  };

  const handleIconCropFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const target = iconCropPickerTarget;
    setIconCropPickerTarget(null);
    if (!file || !target) {
      event.target.value = "";
      return;
    }
    if (!safeStr(file.type).toLowerCase().startsWith("image/")) {
      alert("Please select an image file.");
      event.target.value = "";
      return;
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const img = new Image();
      const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        img.onload = () => resolve({ width: img.naturalWidth || 1, height: img.naturalHeight || 1 });
        img.onerror = () => reject(new Error("Failed to load image."));
        img.src = dataUrl;
      });
      const baseScale = ICON_CROP_VIEWPORT / Math.max(dims.width, dims.height);
      setIconCropEditor((prev) => {
        // If an editor is already open for this same icon, replace the image in place.
        if (prev && prev.iconKind === target.iconKind && prev.iconKey === target.iconKey) {
          return {
            ...prev,
            sourceUrl: dataUrl,
            natural: dims,
            baseScale,
            zoomX: 1,
            zoomY: 1,
            offsetX: 0,
            offsetY: 0,
            saving: false,
          };
        }
        return {
          iconKind: target.iconKind,
          iconKey: target.iconKey,
          iconLabel: target.iconLabel,
          sourceUrl: dataUrl,
          natural: dims,
          baseScale,
          zoomX: 1,
          zoomY: 1,
          offsetX: 0,
          offsetY: 0,
          saving: false,
        };
      });
    } catch (e: any) {
      alert(e?.message || "Could not read that image.");
    } finally {
      event.target.value = "";
    }
  };

  const renderCroppedIconBlob = async (state: IconCropEditorState): Promise<Blob> => {
    const canvas = document.createElement("canvas");
    canvas.width = ICON_CROP_OUTPUT;
    canvas.height = ICON_CROP_OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable.");
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to draw image."));
      img.src = state.sourceUrl;
    });
    const ratio = ICON_CROP_OUTPUT / ICON_CROP_VIEWPORT;
    const scaleX = state.baseScale * state.zoomX * ratio;
    const scaleY = state.baseScale * state.zoomY * ratio;
    const displayedW = state.natural.width * scaleX;
    const displayedH = state.natural.height * scaleY;
    const centerX = ICON_CROP_OUTPUT / 2 + state.offsetX * ratio;
    const centerY = ICON_CROP_OUTPUT / 2 + state.offsetY * ratio;
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.clearRect(0, 0, ICON_CROP_OUTPUT, ICON_CROP_OUTPUT);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      0, 0, state.natural.width, state.natural.height,
      centerX - displayedW / 2, centerY - displayedH / 2, displayedW, displayedH
    );
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to encode image."))), "image/png", 0.95);
    });
  };

  const commitIconCrop = async () => {
    const state = iconCropEditor;
    if (!state || state.saving) return;
    setIconCropEditor({ ...state, saving: true });
    try {
      const blob = await renderCroppedIconBlob(state);
      const filename = `${state.iconKind}-${state.iconKey}.png`;
      const formData = new FormData();
      formData.append("file", new File([blob], filename, { type: "image/png" }));
      if (state.iconKind === "sidebar") {
        formData.append("itemKey", `sidebar-icon-${state.iconKey}`);
        formData.append("mediaType", "sidebar-icon");
        formData.append("title", state.iconKey);
        formData.append("objectKey", `icons/sidebar/${state.iconKey}`);
        const res = await fetch("/api/upload-cover", { method: "POST", body: formData });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) throw new Error(payload?.error || `Upload failed (${res.status})`);
        const iconUrl = String(payload.url);
        // Persist the override so the Custom badge is correct and the sheet
        // record stays current (no stale URL for any future re-sync to replay).
        setSidebarIconOverrides((prev) => {
          const next = { ...prev, [state.iconKey]: iconUrl };
          try { localStorage.setItem(SIDEBAR_ICON_OVERRIDES_LOCAL_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
        saveSetting(`${SIDEBAR_ICON_SETTING_PREFIX}${state.iconKey}`, iconUrl, "Sidebar Icons", `Custom sidebar icon for ${state.iconKey}`);
        bumpSidebarIconVersion();
      } else if (state.iconKind === "smartlist") {
        // Smart-list icons are stored directly on the smart list record. The
        // upload goes to a fixed R2 key per list; a ?v= timestamp on the
        // saved URL makes a re-uploaded icon refresh immediately.
        formData.append("itemKey", `smartlist-icon-${state.iconKey}`);
        formData.append("mediaType", "sidebar-icon");
        formData.append("title", state.iconKey);
        formData.append("objectKey", `icons/sidebar/smartlist-${state.iconKey}`);
        const res = await fetch("/api/upload-cover", { method: "POST", body: formData });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) throw new Error(payload?.error || `Upload failed (${res.status})`);
        const iconUrl = `${String(payload.url)}?v=${Date.now()}`;
        persistSmartLists(
          customSmartLists.map((list) =>
            list.id === state.iconKey ? { ...list, icon: iconUrl } : list
          )
        );
      } else {
        formData.append("itemKey", `status-icon-${state.iconKey}`);
        formData.append("mediaType", "status-icon");
        formData.append("title", state.iconKey);
        const res = await fetch("/api/upload-cover", { method: "POST", body: formData });
        const payload = await res.json().catch(() => ({}));
        if (!res.ok || !payload?.url) throw new Error(payload?.error || `Upload failed (${res.status})`);
        const iconUrl = String(payload.url);
        setStatusIconOverrides((prev) => {
          const next = { ...prev, [state.iconKey]: iconUrl };
          try { localStorage.setItem(STATUS_ICON_OVERRIDES_LOCAL_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
        saveSetting(`${STATUS_ICON_SETTING_PREFIX}${state.iconKey}`, iconUrl, "Status Icons", `Custom status icon for ${state.iconKey}`);
      }
      setSyncState("ok");
      setSyncMsg("Icon saved");
      setLastSyncAt(Date.now());
      setTimeout(() => setSyncMsg("Synced"), 1200);
      setIconCropEditor(null);
    } catch (e: any) {
      const msg = e?.message || "Failed to save icon.";
      setSyncState("error");
      setSyncMsg(msg);
      alert(msg);
      setIconCropEditor((prev) => (prev ? { ...prev, saving: false } : prev));
    }
  };

  const cancelIconCrop = () => setIconCropEditor(null);

  const resetStatusIconOverride = useCallback((statusKey: string) => {
    setStatusIconOverrides((prev) => {
      if (!(statusKey in prev)) return prev;
      const next = { ...prev };
      delete next[statusKey];
      try {
        localStorage.setItem(STATUS_ICON_OVERRIDES_LOCAL_KEY, JSON.stringify(next));
      } catch (persistError) {
        console.warn("Failed to persist status icon overrides locally:", persistError);
      }
      return next;
    });
    removeSetting(`${STATUS_ICON_SETTING_PREFIX}${statusKey}`);
    setSyncState("ok");
    setSyncMsg("Status icon reset");
    setTimeout(() => setSyncMsg("Synced"), 1200);
  }, []);

  const resetAllStatusIconOverrides = useCallback(() => {
    setStatusIconOverrides({});
    try {
      localStorage.removeItem(STATUS_ICON_OVERRIDES_LOCAL_KEY);
    } catch (persistError) {
      console.warn("Failed to clear status icon overrides locally:", persistError);
    }
    ["completed", "watching", "abandoned", "not-started", "pending-return", "paused"].forEach((key) => {
      removeSetting(`${STATUS_ICON_SETTING_PREFIX}${key}`);
    });
    setSyncState("ok");
    setSyncMsg("All status icons reset");
    setTimeout(() => setSyncMsg("Synced"), 1200);
  }, []);

  const handleReplaceCover = async (item: any, file: File) => {
    const itemKey = getMediaItemKey(item);
    const mediaType = getMediaType(item);

    console.log(`[Cover Upload] Starting upload for "${safeStr(item?.title)}"`, {
      itemKey,
      mediaType,
      type: item?.type || item?.Type,
      imageUrl: item?.imageUrl || item?.ImageURL,
    });

    setUploadingCoverForKey(itemKey);
    setCoverUploadError(null);
    try {
      if (isStaticSiteBuild) {
        const localUrl = await fileToDataUrl(file);
        setCoverOverrides((prev) => {
          const next = { ...prev, [itemKey]: localUrl };
          try {
            localStorage.setItem("cdlCoverOverrides", JSON.stringify(next));
          } catch (e) {
            console.warn("Failed to persist cover overrides locally:", e);
          }
          return next;
        });
        setModalItem((prev: any) =>
          prev ? buildItemWithCoverSelection(prev, { ...coverOverrides, [itemKey]: localUrl }) : prev
        );
        setBookDetailItem((prev: any) => {
          if (!prev || getMediaItemKey(prev) !== itemKey) return prev;
          return buildItemWithCoverSelection(prev, { ...coverOverrides, [itemKey]: localUrl });
        });
        setSyncState("ok");
        setSyncMsg("Cover saved locally");
        setLastSyncAt(Date.now());
        setTimeout(() => {
          setSyncMsg("Synced");
        }, 1200);
        return;
      }

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
      console.log(`[Cover Upload] Got uploaded URL: ${uploadedUrl}`);

      setCoverOverrides((prev) => {
        const next = { ...prev, [itemKey]: uploadedUrl };
        console.log(`[Cover Upload] Updated coverOverrides:`, { itemKey, uploadedUrl });
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

      // Persist replacement as R2 cover override in sheet (do not overwrite source metadata URLs)
      const title = safeStr(item?.title || item?.Title);
      const replacementDate = new Date().toISOString();
      if (mediaType === "movie" && moviesWriteUrl) {
        postSheetWrite(moviesWriteUrl, {
          action: "updateMovie",
          match: { tmdbId: safeStr(item?.tmdbId), title },
          updates: { R2CoverUrl: uploadedUrl, r2CoverUrl: uploadedUrl, R2CoverUrl_Date: replacementDate },
        }, "Failed to save movie R2 cover").catch(() => {});
      } else if (mediaType === "tv" && showsWriteUrl) {
        postSheetWrite(showsWriteUrl, {
          action: "updateShow",
          match: { tmdbId: safeStr(item?.tmdbId), title },
          updates: { R2CoverUrl: uploadedUrl, r2CoverUrl: uploadedUrl, R2CoverUrl_Date: replacementDate },
        }, "Failed to save TV show R2 cover").catch(() => {});
      } else if (mediaType === "game" && gamesWriteUrl) {
        postSheetWrite(gamesWriteUrl, {
          action: "updateGame",
          match: { igdbId: safeStr(item?.igdbId || item?.IGDB_ID), title },
          updates: { R2CoverUrl: uploadedUrl, R2CoverUrl_Date: replacementDate },
        }, "Failed to save game R2 cover").catch(() => {});
      } else if (mediaType === "book" && booksWriteUrl) {
        postSheetWrite(booksWriteUrl, {
          action: "updateBook",
          match: {
            title,
            type: safeStr(item?.types || item?.type || item?.Type),
            imageUrl: safeStr(item?.imageUrl || item?.ImageURL || item?.["Image URL"] || item?.Image),
            isbn: safeStr(item?.isbn || item?.ISBN),
            googleBooksVolumeId: safeStr(item?.googleBooksVolumeId || item?.GoogleBooksVolumeId),
            openLibraryWorkKey: safeStr(item?.openLibraryWorkKey || item?.OpenLibraryWorkKey),
          },
          updates: { R2CoverUrl: uploadedUrl, r2CoverUrl: uploadedUrl, R2CoverUrl_Date: replacementDate },
        }, "Failed to save book R2 cover").catch(() => {});
      }

      setModalItem((prev: any) => {
        if (!prev) return prev;
        const newCoverOverrides = { ...coverOverrides, [itemKey]: uploadedUrl };
        console.log(`[Cover Upload] Setting modal item with override:`, {
          itemKey,
          uploadedUrl: uploadedUrl.substring(0, 50),
          newCoverOverridesCount: Object.keys(newCoverOverrides).length
        });
        const updatedItem = buildItemWithCoverSelection(prev, newCoverOverrides);
        console.log(`[Cover Upload] Modal item updated:`, {
          itemKey: getMediaItemKey(updatedItem),
          posterUrl: updatedItem?.posterUrl?.substring(0, 50),
          coverOverrideUrl: updatedItem?.coverOverrideUrl?.substring(0, 50),
          hasOverride: Boolean(updatedItem?.coverOverrideUrl)
        });
        return updatedItem;
      });

      setBookDetailItem((prev: any) => {
        if (!prev) return prev;
        const matchesKey = getMediaItemKey(prev) === itemKey;
        console.log(`[Cover Upload] BookDetail itemKey match:`, matchesKey, getMediaItemKey(prev), itemKey);
        if (!matchesKey) return prev;
        const updatedItem = buildItemWithCoverSelection(prev, { ...coverOverrides, [itemKey]: uploadedUrl });
        console.log(`[Cover Upload] BookDetail item updated, displayUrl:`, updatedItem?.posterUrl);
        return updatedItem;
      });
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

  const persistBookSelectedSourceToR2 = async (item: any, mode: "custom" | "default") => {
    if (!item || getMediaType(item) !== "book" || isStaticSiteBuild) return "";
    const sourceUrl = getBookSourceUrlByMode(item, mode);
    if (!sourceUrl) return "";

    const itemKey = getMediaItemKey(item);
    const formData = new FormData();
    formData.append("sourceUrl", sourceUrl);
    formData.append("itemKey", itemKey);
    formData.append("mediaType", "book");
    formData.append("title", safeStr(item?.title));

    const res = await fetch("/api/upload-cover", {
      method: "POST",
      body: formData,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.url) {
      throw new Error(payload?.error || `Backup upload failed (${res.status})`);
    }

    return String(payload.url);
  };

  const uploadCoverToR2 = async (
    item: any,
    sourceUrl: string,
    mediaType: "book" | "movie" | "tv" | "game",
    imageType: "cover" | "backdrop" = "cover",
    requireSheetWrite = false
  ) => {
    if (!item || !sourceUrl) throw new Error("Missing item or source URL");

    const itemKey = getMediaItemKey(item);
    const formData = new FormData();
    formData.append("sourceUrl", sourceUrl);
    formData.append("itemKey", itemKey);
    formData.append("mediaType", mediaType);
    formData.append("imageType", imageType);
    formData.append("title", safeStr(item?.title));

    const res = await fetch("/api/upload-cover", {
      method: "POST",
      body: formData,
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok || !payload?.url) {
      throw new Error(payload?.error || `Upload failed (${res.status})`);
    }

    // Update the sheet with the R2 URL
    const fieldName = payload.fieldName || (imageType === "backdrop" ? "R2BackdropUrl" : "R2CoverUrl");

    // Determine which write URL to use based on media type
    let writeUrl: string | null = null;
    switch (mediaType) {
      case "book":
        writeUrl = booksWriteUrl || null;
        break;
      case "movie":
        writeUrl = moviesWriteUrl || null;
        break;
      case "tv":
        writeUrl = showsWriteUrl || null;
        break;
      case "game":
        writeUrl = gamesWriteUrl || null;
        break;
    }

    if (writeUrl) {
      try {
        const action =
          mediaType === "book" ? "updateBook" :
          mediaType === "movie" ? "updateMovie" :
          mediaType === "tv" ? "updateShow" :
          "updateGame";
        const title = safeStr(item?.title || item?.Title || item?.name);
        const bookMatch = mediaType === "book"
          ? {
              type: safeStr(item?.types || item?.type || item?.Type),
              googleBooksVolumeId: safeStr(item?.googleBooksVolumeId || item?.GoogleBooksVolumeId),
              openLibraryWorkKey: safeStr(item?.openLibraryWorkKey || item?.OpenLibraryWorkKey),
              isbn: safeStr(item?.isbn || item?.ISBN),
              imageUrl: safeStr(item?.imageUrl || item?.ImageURL || item?.["Image URL"] || item?.Image),
            }
          : {};
        const gameMatch = mediaType === "game"
          ? {
              igdbId: safeStr(item?.igdbId || item?.IGDB_ID),
              platform: safeStr(item?.platform || item?.Platform || item?.__renderPlatform),
            }
          : {};
        const lowerCamelFieldName = fieldName ? fieldName.charAt(0).toLowerCase() + fieldName.slice(1) : fieldName;
        const syncedAtField = imageType === "backdrop" ? "R2BackdropUrl_Date" : "R2CoverUrl_Date";
        const syncedAtValue = new Date().toISOString();
        const updates: Record<string, string> = {
          [fieldName]: payload.url,
          [syncedAtField]: syncedAtValue,
        };
        if (lowerCamelFieldName && lowerCamelFieldName !== fieldName) {
          updates[lowerCamelFieldName] = payload.url;
        }

        console.log(`[R2] Writing ${fieldName} to sheet for "${title}" (${mediaType}):`, payload.url);
        await postSheetWrite(writeUrl, {
          action,
          match: { ...bookMatch, ...gameMatch, title },
          updates
        }, `Failed to save ${fieldName}`);
        console.log(`✓ Successfully saved ${fieldName} to sheet for "${title}"`);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(`Failed to save ${fieldName} to sheet:`, errorMsg);
        // Check if it's a column not found error
        if (errorMsg.includes("column") || errorMsg.includes("not found") || errorMsg.includes("INVALID_ARGUMENT")) {
          console.warn(`⚠️ Column "${fieldName}" may not exist in your sheet. Please add this column manually.`);
        }
        if (requireSheetWrite) {
          throw new Error(`Uploaded to R2 but failed to save ${fieldName} to sheet: ${errorMsg}`);
        }
      }
    } else {
      console.warn(`[R2] No write URL available for ${mediaType}`);
      if (requireSheetWrite) {
        throw new Error(`No write URL configured for ${mediaType}`);
      }
    }

    return payload.url;
  };

  // One-off automatic R2 sync for a single newly added/edited item.
  const runBackdropMigrationToW1280 = async () => {
    if (backdropMigration.active) return;
    cancelBackdropMigrationRef.current = false;
    // Collect every movie/TV row with a TMDB backdrop and every game row with a
    // first IGDB screenshot. The display-time upgrade helper bumps each URL to
    // its larger size (w1280 / t_1080p) before re-upload.
    const targets: Array<{ row: any; mediaType: "movie" | "tv" | "game"; source: string }> = [];
    for (const row of movieRows) {
      const src = safeStr((row as any)?.backdropUrl || (row as any)?.BackdropURL);
      if (src) targets.push({ row, mediaType: "movie", source: upgradeBackdropForDisplay(src, "movie") });
    }
    for (const row of tvRows) {
      const src = safeStr((row as any)?.backdropUrl || (row as any)?.BackdropURL);
      if (src) targets.push({ row, mediaType: "tv", source: upgradeBackdropForDisplay(src, "tv") });
    }
    for (const row of gameRows) {
      const raw = safeStr((row as any)?.screenshotsUrl || (row as any)?.ScreenshotsURL);
      const firstShot = raw.split(",")[0]?.trim() || "";
      if (firstShot) targets.push({ row, mediaType: "game", source: upgradeBackdropForDisplay(firstShot, "game") });
    }
    if (!targets.length) {
      alert("No movie, TV, or game rows have a backdrop / screenshot URL to migrate.");
      return;
    }
    if (!confirm(`Migrate ${targets.length} backdrop(s) to HD?\n\nMovies & TV will re-download at TMDB w1280.\nGames will re-download the first IGDB screenshot at t_1080p.\n\nThis overwrites the R2 copy and can take several minutes.`)) {
      return;
    }
    setBackdropMigration({ active: true, total: targets.length, completed: 0, failed: 0, currentTitle: "", failedTitles: [] });
    let completed = 0;
    let failed = 0;
    const failedTitles: string[] = [];
    for (const { row, mediaType, source } of targets) {
      if (cancelBackdropMigrationRef.current) break;
      const title = safeStr((row as any)?.title || (row as any)?.Title) || "(untitled)";
      setBackdropMigration((prev) => ({ ...prev, currentTitle: title }));
      try {
        await uploadCoverToR2(row, source, mediaType, "backdrop", true);
        completed += 1;
      } catch (e) {
        console.warn("Backdrop migration failed for", title, e);
        failed += 1;
        failedTitles.push(title);
      }
      setBackdropMigration((prev) => ({ ...prev, completed, failed, failedTitles: [...failedTitles] }));
    }
    setBackdropMigration((prev) => ({ ...prev, active: false, currentTitle: "" }));
    setRefreshNonce((n) => n + 1);
    const tail = cancelBackdropMigrationRef.current ? " (canceled)" : "";
    alert(`Backdrop migration complete${tail}.\n\nUpgraded: ${completed}\nFailed: ${failed}${failedTitles.length ? `\n\nFailed:\n${failedTitles.slice(0, 10).join("\n")}${failedTitles.length > 10 ? `\n…and ${failedTitles.length - 10} more` : ""}` : ""}`);
  };

  const cancelBackdropMigration = () => {
    cancelBackdropMigrationRef.current = true;
  };

  const syncSingleItemCoverToR2 = async (item: any, mediaType: "book" | "movie" | "tv" | "game") => {
    try {
      const displayUrl = getDisplayCover(item, mediaType);
      const existingR2Url = safeStr(item?.r2CoverUrl || item?.R2CoverUrl);

      if (!displayUrl) return;
      if (existingR2Url && existingR2Url === displayUrl) return;

      const r2Url = await uploadCoverToR2(item, displayUrl, mediaType, "cover", true);
      const itemKey = buildTypedItemKey(item, mediaType);
      const nowIso = new Date().toISOString();

      // Update the local row data with the synced R2CoverUrl
      if (mediaType === "book") {
        setBookRows((prev) =>
          prev.map((row) =>
            buildTypedItemKey(row, "book") === itemKey ? { ...row, R2CoverUrl: r2Url, R2CoverUrl_Date: nowIso } : row
          )
        );
      } else if (mediaType === "movie") {
        setMovieRows((prev) =>
          prev.map((row) =>
            buildTypedItemKey(row, "movie") === itemKey ? { ...row, R2CoverUrl: r2Url, R2CoverUrl_Date: nowIso } : row
          )
        );
      } else if (mediaType === "tv") {
        setTvRows((prev) =>
          prev.map((row) =>
            buildTypedItemKey(row, "tv") === itemKey ? { ...row, R2CoverUrl: r2Url, R2CoverUrl_Date: nowIso } : row
          )
        );
      } else if (mediaType === "game") {
        setGameRows((prev) =>
          prev.map((row) =>
            buildTypedItemKey(row, "game") === itemKey ? { ...row, R2CoverUrl: r2Url, R2CoverUrl_Date: nowIso } : row
          )
        );
      }

      if (mediaType === "movie" || mediaType === "tv" || mediaType === "game") {
        const backdropSource = getDisplayBackdrop(item, mediaType);
        if (backdropSource) {
          try {
            const backdropR2 = await uploadCoverToR2(item, backdropSource, mediaType, "backdrop", true);
            if (mediaType === "movie") {
              setMovieRows((prev) =>
                prev.map((row) =>
                  buildTypedItemKey(row, "movie") === itemKey ? { ...row, R2BackdropUrl: backdropR2, R2BackdropUrl_Date: nowIso } : row
                )
              );
            } else if (mediaType === "tv") {
              setTvRows((prev) =>
                prev.map((row) =>
                  buildTypedItemKey(row, "tv") === itemKey ? { ...row, R2BackdropUrl: backdropR2, R2BackdropUrl_Date: nowIso } : row
                )
              );
            } else {
              setGameRows((prev) =>
                prev.map((row) =>
                  buildTypedItemKey(row, "game") === itemKey ? { ...row, R2BackdropUrl: backdropR2, R2BackdropUrl_Date: nowIso } : row
                )
              );
            }
          } catch (backdropError) {
            console.debug("Auto backdrop R2 sync failed (non-critical):", backdropError);
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "R2 sync failed";
      console.debug("Auto R2 sync failed (non-critical):", e);
      setSyncState("error");
      setSyncMsg(`Item added, but R2 sync failed. Falling back to source image. (${msg})`);
    }
  };

  const handleBookDetailsCoverModeChange = (item: any, mode: "custom" | "default") => {
    handlePopupCoverModeChange(item, mode);
    const itemKey = getMediaItemKey(item);
    const legacyItemKey = getLegacyMediaItemKey(item);

    const applyOverride = (url: string) => {
      setCoverOverrides((prev) => {
        const next = { ...prev };
        if (url) next[itemKey] = url;
        else delete next[itemKey];
        delete next[legacyItemKey];
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
          url,
          "Cover Overrides",
          `${mode === "custom" ? "Custom" : "Default"} backup cover for ${safeStr(item?.title)}`
        );
        if (legacyItemKey !== itemKey) {
          saveSettingToSheet(
            `coverOverride:${legacyItemKey}`,
            "",
            "Cover Overrides",
            `Cleared legacy cover override for ${safeStr(item?.title)}`
          );
        }
      }
    };

    void (async () => {
      try {
        const uploadedUrl = await persistBookSelectedSourceToR2(item, mode);
        applyOverride(uploadedUrl);
      } catch (e: any) {
        console.error("Failed to persist selected book source to R2:", e);
        setCoverUploadError(e?.message || "Failed to save cover backup");
      }
    })();
  };

  const postSheetWrite = useCallback(async (url: string, payload: Record<string, unknown>, fallbackMessage: string) => {
    if (isStaticSiteBuild) {
      throw new Error(STATIC_SITE_WRITE_MESSAGE);
    }

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
  }, [isStaticSiteBuild]);

  const handleSaveBookEdits = async (item: any, updates: Record<string, string>) => {
    if (!booksWriteUrl) {
      throw new Error("Books write URL is not configured. Set NEXT_PUBLIC_BOOKS_WRITE_URL in .env.local.");
    }

    const matchGoogleBooksVolumeId = safeStr(updates.googleBooksVolumeId) || safeStr(item?.googleBooksVolumeId);
    const matchOpenLibraryWorkKey = safeStr(updates.openLibraryWorkKey) || safeStr(item?.openLibraryWorkKey);
    const matchIsbn = safeStr(updates.isbn) || safeStr(item?.isbn);
    const matchTitle = safeStr(item?.title);
    const fallbackGoogleBooksVolumeId = safeStr(item?.googleBooksVolumeId);
    const fallbackOpenLibraryWorkKey = safeStr(item?.openLibraryWorkKey);
    const fallbackIsbn = safeStr(item?.isbn);
    const fallbackTitle = safeStr(item?.title);

    if (!matchGoogleBooksVolumeId && !matchOpenLibraryWorkKey && !matchIsbn && !matchTitle) {
      throw new Error("Unable to identify this book row to update.");
    }

    // If there's a pending override, add it to updates so it gets persisted to the sheet
    const itemKey = getMediaItemKey(item);
    const activeOverride = safeStr(coverOverrides[itemKey]);
    const finalUpdates = { ...updates };
    if (activeOverride && !safeStr(updates.customImageUrl)) {
      console.log(`[Save] Adding pending override to CustomURL for ${itemKey}:`, activeOverride.substring(0, 50));
      finalUpdates.customImageUrl = activeOverride;
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
        Title: safeStr(finalUpdates.title),
        Subtitle: safeStr(finalUpdates.subtitle),
        Series: safeStr(finalUpdates.series),
        Author: safeStr(finalUpdates.author),
        Ownership: safeStr(finalUpdates.ownership),
        Type: safeStr(finalUpdates.type),
        Status: safeStr(finalUpdates.status),
        "Completed Date": safeStr(finalUpdates.completedDate),
        CompletedDate: safeStr(finalUpdates.completedDate),
        "Date Completed": safeStr(finalUpdates.completedDate),
        isbn: safeStr(finalUpdates.isbn),
        ReleaseDate: safeStr(finalUpdates.releaseDate),
        description: safeStr(finalUpdates.description),
        ImageURL: safeStr(finalUpdates.imageUrl),
        CustomURL: safeStr(finalUpdates.customImageUrl),
        CustomImageURL: safeStr(finalUpdates.customImageUrl),
        userRating: safeStr(finalUpdates.userRating),
        "My Rating": safeStr(finalUpdates.myRating),
        pages: safeStr(finalUpdates.pages),
        audiobookDuration: safeStr(finalUpdates.audiobookDuration),
        genre: safeStr(finalUpdates.genre),
        tags: safeStr(finalUpdates.tags),
        OpenLibraryWorkKey: safeStr(finalUpdates.openLibraryWorkKey),
        GoogleBooksVolumeId: safeStr(finalUpdates.googleBooksVolumeId),
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
        title: safeStr(finalUpdates.title) || prev.title,
        subtitle: safeStr(finalUpdates.subtitle),
        series: safeStr(finalUpdates.series),
        author: safeStr(finalUpdates.author),
        ownership: safeStr(finalUpdates.ownership),
        types: safeStr(finalUpdates.type),
        status: safeStr(finalUpdates.status),
        completedDate: safeStr(finalUpdates.completedDate),
        isbn: safeStr(finalUpdates.isbn),
        releaseDate: safeStr(finalUpdates.releaseDate),
        description: safeStr(finalUpdates.description),
        imageUrl: safeStr(finalUpdates.imageUrl),
        customImageUrl: safeStr(finalUpdates.customImageUrl),
        userRating: safeStr(finalUpdates.userRating),
        myRating: safeStr(finalUpdates.myRating),
        pages: safeStr(finalUpdates.pages),
        audiobookDuration: safeStr(finalUpdates.audiobookDuration),
        categories: safeStr(finalUpdates.genre),
        genre: safeStr(finalUpdates.genre),
        tags: safeStr(finalUpdates.tags),
        openLibraryWorkKey: safeStr(finalUpdates.openLibraryWorkKey),
        googleBooksVolumeId: safeStr(finalUpdates.googleBooksVolumeId),
      };
      return buildItemWithCoverSelection(nextItem, coverOverrides);
    });

    setBookDetailItem((prev: any) => {
      if (!prev || getMediaType(prev) !== "book") return prev;

      const prevGoogleBooksVolumeId = safeStr(prev?.googleBooksVolumeId || prev?.GoogleBooksVolumeId);
      const prevOpenLibraryWorkKey = safeStr(prev?.openLibraryWorkKey || prev?.OpenLibraryWorkKey);
      const prevIsbn = safeStr(prev?.isbn || prev?.ISBN || prev?.isbn13 || prev?.ISBN13 || prev?.isbn10 || prev?.ISBN10);
      const prevTitle = safeStr(prev?.title || prev?.Title);
      const isSameItem =
        (matchGoogleBooksVolumeId && prevGoogleBooksVolumeId === matchGoogleBooksVolumeId) ||
        (fallbackGoogleBooksVolumeId && prevGoogleBooksVolumeId === fallbackGoogleBooksVolumeId) ||
        (matchOpenLibraryWorkKey && prevOpenLibraryWorkKey === matchOpenLibraryWorkKey) ||
        (fallbackOpenLibraryWorkKey && prevOpenLibraryWorkKey === fallbackOpenLibraryWorkKey) ||
        (matchIsbn && prevIsbn === matchIsbn) ||
        (fallbackIsbn && prevIsbn === fallbackIsbn) ||
        (matchTitle && prevTitle.toLowerCase() === matchTitle.toLowerCase()) ||
        (fallbackTitle && prevTitle.toLowerCase() === fallbackTitle.toLowerCase());

      if (!isSameItem) return prev;

      const nextItem = {
        ...prev,
        title: safeStr(finalUpdates.title) || prev.title,
        subtitle: safeStr(finalUpdates.subtitle),
        series: safeStr(finalUpdates.series),
        author: safeStr(finalUpdates.author),
        ownership: safeStr(finalUpdates.ownership),
        types: safeStr(finalUpdates.type),
        status: safeStr(finalUpdates.status),
        completedDate: safeStr(finalUpdates.completedDate),
        isbn: safeStr(finalUpdates.isbn),
        releaseDate: safeStr(finalUpdates.releaseDate),
        description: safeStr(finalUpdates.description),
        imageUrl: safeStr(finalUpdates.imageUrl),
        customImageUrl: safeStr(finalUpdates.customImageUrl),
        userRating: safeStr(finalUpdates.userRating),
        myRating: safeStr(finalUpdates.myRating),
        pages: safeStr(finalUpdates.pages),
        audiobookDuration: safeStr(finalUpdates.audiobookDuration),
        categories: safeStr(finalUpdates.genre),
        genre: safeStr(finalUpdates.genre),
        tags: safeStr(finalUpdates.tags),
        openLibraryWorkKey: safeStr(finalUpdates.openLibraryWorkKey),
        googleBooksVolumeId: safeStr(finalUpdates.googleBooksVolumeId),
      };
      return buildItemWithCoverSelection(nextItem, coverOverrides);
    });

    setBookRows((prev) =>
      prev.map((row) => {
        const rowGoogleBooksVolumeId = safeStr(row["GoogleBooksVolumeId"] || row["googleBooksVolumeId"]);
        const rowOpenLibraryWorkKey = safeStr(row["OpenLibraryWorkKey"] || row["openLibraryWorkKey"]);
        const rowIsbn = safeStr(row["ISBN"] || row["isbn"]);
        const rowTitle = safeStr(row["Title"]);
        const updatedTitle = safeStr(finalUpdates.title);
        const sameItem =
          (matchGoogleBooksVolumeId && rowGoogleBooksVolumeId === matchGoogleBooksVolumeId) ||
          (fallbackGoogleBooksVolumeId && rowGoogleBooksVolumeId === fallbackGoogleBooksVolumeId) ||
          (matchOpenLibraryWorkKey && rowOpenLibraryWorkKey === matchOpenLibraryWorkKey) ||
          (fallbackOpenLibraryWorkKey && rowOpenLibraryWorkKey === fallbackOpenLibraryWorkKey) ||
          (matchIsbn && rowIsbn === matchIsbn) ||
          (fallbackIsbn && rowIsbn === fallbackIsbn) ||
          (matchTitle && rowTitle.toLowerCase() === matchTitle.toLowerCase()) ||
          (fallbackTitle && rowTitle.toLowerCase() === fallbackTitle.toLowerCase());

        if (!sameItem) return row;

        return {
          ...row,
          Title: updatedTitle || rowTitle,
          Subtitle: safeStr(finalUpdates.subtitle),
          Series: safeStr(finalUpdates.series),
          Author: safeStr(finalUpdates.author),
          Ownership: safeStr(finalUpdates.ownership),
          Type: safeStr(finalUpdates.type),
          Status: safeStr(finalUpdates.status),
          "Completed Date": safeStr(finalUpdates.completedDate),
          CompletedDate: safeStr(finalUpdates.completedDate),
          "Date Completed": safeStr(finalUpdates.completedDate),
          isbn: safeStr(finalUpdates.isbn),
          ReleaseDate: safeStr(finalUpdates.releaseDate),
          description: safeStr(finalUpdates.description),
          ImageURL: safeStr(finalUpdates.imageUrl),
          CustomURL: safeStr(finalUpdates.customImageUrl),
          CustomImageURL: safeStr(finalUpdates.customImageUrl),
          userRating: safeStr(finalUpdates.userRating),
          "My Rating": safeStr(finalUpdates.myRating),
          pages: safeStr(finalUpdates.pages),
          audiobookDuration: safeStr(finalUpdates.audiobookDuration),
          genre: safeStr(finalUpdates.genre),
          tags: safeStr(finalUpdates.tags),
          Tag: safeStr(finalUpdates.tags),
          OpenLibraryWorkKey: safeStr(finalUpdates.openLibraryWorkKey),
          GoogleBooksVolumeId: safeStr(finalUpdates.googleBooksVolumeId),
        };
      })
    );

    // Re-sync to pick up the canonical sheet values once published CSV refreshes.
    setRefreshNonce((n) => n + 1);

    // Auto-sync cover to R2 in background (silently) if:
    // - imageUrl or customImageUrl were updated, OR
    // - there's a cover override that hasn't been synced to R2 yet
    // Note: finalUpdates includes the override if it was added above
    if (safeStr(finalUpdates.imageUrl) || safeStr(finalUpdates.customImageUrl)) {
      syncSingleItemCoverToR2(item, "book").catch(() => {
        // Silently ignore sync failures
      });
    }
  };

  const handleSaveShowEdits = async (item: any, updates: Record<string, string>) => {
    if (!showsWriteUrl) {
      throw new Error(
        "Shows write URL is not configured. Set NEXT_PUBLIC_SHOWS_WRITE_URL (or NEXT_PUBLIC_TV_WRITE_URL) in .env.local."
      );
    }

    const matchTmdbId = safeStr(updates.tmdbId) || safeStr(item?.tmdbId);
    const matchTitle = safeStr(updates.title) || safeStr(item?.title);
    const fallbackTmdbId = safeStr(item?.tmdbId);
    const fallbackTitle = safeStr(item?.title);

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
        "Completed Date": safeStr(updates.dateCompleted),
        "Date Completed": safeStr(updates.dateCompleted),
        "Completd Date": safeStr(updates.dateCompleted),
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
        CustomURL: safeStr(updates.customImageUrl),
        CustomImageURL: safeStr(updates.customImageUrl),
      },
    };

    try {
      await postSheetWrite(showsWriteUrl, payload, "Failed to save show edits");
    } catch (e: any) {
      throw new Error(e?.message || "Failed to save show edits");
    }

    const buildShowNextItem = (prev: any) => ({
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
    });

    setModalItem((prev: any) => {
      if (!prev) return prev;
      return buildItemWithCoverSelection(buildShowNextItem(prev), coverOverrides);
    });

    setTvDetailItem((prev: any) => {
      if (!prev) return prev;
      return buildItemWithCoverSelection(buildShowNextItem(prev), coverOverrides);
    });

    setTvRows((prev) =>
      prev.map((row) => {
        const rowTmdbId = safeStr(row["TMDB_ID"]);
        const rowTitle = safeStr(row["Title"]);
        const updatedTitle = safeStr(updates.title);
        const updatedDateCompleted = safeStr(updates.dateCompleted);
        const sameItem =
          (matchTmdbId && rowTmdbId === matchTmdbId) ||
          (fallbackTmdbId && rowTmdbId === fallbackTmdbId) ||
          (matchTitle && rowTitle.toLowerCase() === matchTitle.toLowerCase()) ||
          (fallbackTitle && rowTitle.toLowerCase() === fallbackTitle.toLowerCase());

        if (!sameItem) return row;

        return {
          ...row,
          Title: updatedTitle || rowTitle,
          Year: safeStr(updates.year),
          TMDB_ID: matchTmdbId || rowTmdbId,
          FirstAirDate: safeStr(updates.firstAirDate),
          LastAirDate: safeStr(updates.lastAirDate),
          "Completed Date": updatedDateCompleted,
          "Date Completed": updatedDateCompleted,
          "Completd Date": updatedDateCompleted,
          CompletedDate: updatedDateCompleted,
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
        };
      })
    );

    setRefreshNonce((n) => n + 1);

    // Auto-sync cover to R2 in background (silently) if:
    // - posterUrl was updated, OR
    // - there's a cover override that hasn't been synced to R2 yet
    const itemKey = getMediaItemKey(item);
    const activeOverride = safeStr(coverOverrides[itemKey]);
    const currentR2Url = safeStr(item?.R2CoverUrl || item?.r2CoverUrl);
    const hasPendingOverride = activeOverride && activeOverride !== currentR2Url;

    if (safeStr(updates.posterUrl) || safeStr(updates.customImageUrl) || hasPendingOverride) {
      syncSingleItemCoverToR2(item, "tv").catch(() => {
        // Silently ignore sync failures
      });
    }
  };

  const handleSaveMovieEdits = async (item: any, updates: Record<string, string>) => {
    if (!moviesWriteUrl) {
      throw new Error("Movies write URL is not configured. Set NEXT_PUBLIC_MOVIES_WRITE_URL in .env.local.");
    }

    const matchTmdbId = safeStr(updates.tmdbId) || safeStr(item?.tmdbId);
    const matchTitle = safeStr(updates.title) || safeStr(item?.title);
    const fallbackTmdbId = safeStr(item?.tmdbId);
    const fallbackTitle = safeStr(item?.title);
    const normalizedWatchStatus = normalizeShowWatchStatusForSheet(updates.watchStatus);

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
        "Watch Status": normalizedWatchStatus,
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
        CustomURL: safeStr(updates.customImageUrl),
        CustomImageURL: safeStr(updates.customImageUrl),
      },
    };

    try {
      await postSheetWrite(moviesWriteUrl, payload, "Failed to save movie edits");
    } catch (e: any) {
      throw new Error(e?.message || "Failed to save movie edits");
    }

    const buildMovieNextItem = (prev: any) => ({
      ...prev,
      title: safeStr(updates.title) || prev.title,
      year: safeStr(updates.year),
      myRating: safeStr(updates.myRating),
      tmdbRating: safeStr(updates.tmdbRating),
      tmdbId: safeStr(updates.tmdbId),
      watched: normalizedWatchStatus,
      watchStatus: normalizedWatchStatus,
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
    });

    setModalItem((prev: any) => {
      if (!prev) return prev;
      return buildItemWithCoverSelection(buildMovieNextItem(prev), coverOverrides);
    });

    setMovieDetailItem((prev: any) => {
      if (!prev) return prev;
      return buildItemWithCoverSelection(buildMovieNextItem(prev), coverOverrides);
    });

    setMovieRows((prev) =>
      prev.map((row) => {
        const rowTmdbId = safeStr(row["TMDB_ID"] || row["tmdbId"]);
        const rowTitle = safeStr(row["Title"]);
        const updatedTitle = safeStr(updates.title);
        const sameItem =
          (matchTmdbId && rowTmdbId === matchTmdbId) ||
          (fallbackTmdbId && rowTmdbId === fallbackTmdbId) ||
          (matchTitle && rowTitle.toLowerCase() === matchTitle.toLowerCase()) ||
          (fallbackTitle && rowTitle.toLowerCase() === fallbackTitle.toLowerCase());

        if (!sameItem) return row;

        return {
          ...row,
          Title: updatedTitle || rowTitle,
          Year: safeStr(updates.year),
          MyRating: safeStr(updates.myRating),
          TMDB_Rating: safeStr(updates.tmdbRating),
          TMDB_ID: safeStr(updates.tmdbId) || rowTmdbId,
          "Watch Status": normalizedWatchStatus,
          WatchStatus: normalizedWatchStatus,
          WatchDate: safeStr(updates.watchDate),
          Tags: safeStr(updates.tags),
          Tag: safeStr(updates.tags),
          ReleaseDate: safeStr(updates.releaseDate),
          Runtime: safeStr(updates.runtime),
          Status: safeStr(updates.status),
          Genres: safeStr(updates.genres),
          Overview: safeStr(updates.overview),
          PosterURL: safeStr(updates.posterUrl),
          BackdropURL: safeStr(updates.backdropUrl),
          Ownership: safeStr(updates.ownership),
        };
      })
    );

    setRefreshNonce((n) => n + 1);

    // Auto-sync cover to R2 in background (silently) if:
    // - posterUrl was updated, OR
    // - there's a cover override that hasn't been synced to R2 yet
    const itemKey = getMediaItemKey(item);
    const activeOverride = safeStr(coverOverrides[itemKey]);
    const currentR2Url = safeStr(item?.R2CoverUrl || item?.r2CoverUrl);
    const hasPendingOverride = activeOverride && activeOverride !== currentR2Url;

    if (safeStr(updates.posterUrl) || safeStr(updates.customImageUrl) || hasPendingOverride) {
      syncSingleItemCoverToR2(item, "movie").catch(() => {
        // Silently ignore sync failures
      });
    }
  };

  const handleSaveGameEdits = async (item: any, updates: Record<string, string>) => {
    if (!gamesWriteUrl) {
      throw new Error("Games write URL is not configured. Set NEXT_PUBLIC_GAMES_WRITE_URL in .env.local.");
    }

    const matchIgdbId = safeStr(updates.igdbId) || safeStr(item?.igdbId);
    const matchTitle = safeStr(updates.title) || safeStr(item?.title);
    const fallbackIgdbId = safeStr(item?.igdbId);
    const fallbackTitle = safeStr(item?.title);

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
      "Completed Date": ["dateCompleted", "Completed Date", "Date Completed"],
      "Date Completed": ["dateCompleted", "Date Completed"],
      "Year Played": ["yearPlayed", "Year Played"],
      "Date Added": ["dateAdded", "Date Added"],
      Description: ["description", "Description"],
      Genres: ["genres", "Genres"],
      "Hours Played": ["hoursPlayed", "Hours Played"],
      CoverCachedAt: ["coverCachedAt", "CoverCachedAt"],
      Developer: ["developer", "Developer"],
      ScreenshotsURL: ["ScreenshotsURL", "screenshotsUrl"],
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
      "Completed Date": safeStr(updates.dateCompleted),
      "Date Completed": safeStr(updates.dateCompleted),
      "Year Played": safeStr(updates.yearPlayed),
      "Date Added": safeStr(updates.dateAdded),
      Description: safeStr(updates.description),
      Genres: safeStr(updates.genres),
      "Hours Played": safeStr(updates.hoursPlayed),
      CoverCachedAt: safeStr(updates.coverCachedAt),
      Developer: safeStr(updates.developer),
      ScreenshotsURL: safeStr(updates.screenshotsUrl),
      WishlistOrder: safeStr(updates.wishlistOrder),
      QueuedOrder: safeStr(updates.queuedOrder),
      IGDB_ID: safeStr(updates.igdbId),
      IGDB_ID_Override: safeStr(updates.igdbIdOverride),
      LocalCoverURL: safeStr(updates.localCoverUrl),
      CustomURL: safeStr(updates.customImageUrl),
      CustomImageURL: safeStr(updates.customImageUrl),
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

    const buildGameNextItem = (prev: any) => ({
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
      screenshotsUrl: safeStr(updates.screenshotsUrl),
      wishlistOrder: safeStr(updates.wishlistOrder),
      queuedOrder: safeStr(updates.queuedOrder),
      igdbId: safeStr(updates.igdbId),
      igdbIdOverride: safeStr(updates.igdbIdOverride),
      localCoverUrl: safeStr(updates.localCoverUrl),
      gameStatus: safeStr(updates.status),
      playStatus: safeStr(updates.status),
    });

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

    // Backup game screenshot (backdrop) to R2 if it exists
    const screenshotUrl = safeStr(updates.screenshotsUrl || item?.ScreenshotsURL || item?.screenshotsUrl);
    if (screenshotUrl && !safeStr(item?.r2BackdropUrl)) {
      void (async () => {
        try {
          await uploadCoverToR2(item, screenshotUrl, "game", "backdrop");
        } catch (e) {
          console.error("Failed to backup game screenshot to R2:", e);
        }
      })();
    }

    setModalItem((prev: any) => {
      if (!prev) return prev;
      return buildItemWithCoverSelection(buildGameNextItem(prev), coverOverrides);
    });

    setGameDetailItem((prev: any) => {
      if (!prev) return prev;
      return buildItemWithCoverSelection(buildGameNextItem(prev), coverOverrides);
    });

    setGameRows((prev) =>
      prev.map((row) => {
        const rowIgdbId = safeStr(row["IGDB_ID"] || row["igdbId"]);
        const rowTitle = safeStr(row["Title"]);
        const updatedTitle = safeStr(updates.title);
        const sameItem =
          (matchIgdbId && rowIgdbId === matchIgdbId) ||
          (fallbackIgdbId && rowIgdbId === fallbackIgdbId) ||
          (matchTitle && rowTitle.toLowerCase() === matchTitle.toLowerCase()) ||
          (fallbackTitle && rowTitle.toLowerCase() === fallbackTitle.toLowerCase());

        if (!sameItem) return row;

        return {
          ...row,
          Title: updatedTitle || rowTitle,
          Cover: safeStr(updates.cover),
          Platform: safeStr(updates.platform),
          Status: safeStr(updates.status),
          Name: safeStr(updates.name) || updatedTitle || rowTitle,
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
          "Completed Date": safeStr(updates.dateCompleted),
          "Date Completed": safeStr(updates.dateCompleted),
          "Year Played": safeStr(updates.yearPlayed),
          "Date Added": safeStr(updates.dateAdded),
          Description: safeStr(updates.description),
          Genres: safeStr(updates.genres),
          "Hours Played": safeStr(updates.hoursPlayed),
          CoverCachedAt: safeStr(updates.coverCachedAt),
          Developer: safeStr(updates.developer),
          ScreenshotsURL: safeStr(updates.screenshotsUrl),
          WishlistOrder: safeStr(updates.wishlistOrder),
          QueuedOrder: safeStr(updates.queuedOrder),
          IGDB_ID: safeStr(updates.igdbId) || matchIgdbId || rowIgdbId,
          IGDB_ID_Override: safeStr(updates.igdbIdOverride),
          LocalCoverURL: safeStr(updates.localCoverUrl),
          Tag: safeStr(updates.tags),
        };
      })
    );

    setRefreshNonce((n) => n + 1);

    // Auto-sync cover to R2 in background (silently) if:
    // - coverUrl was updated, OR
    // - there's a cover override that hasn't been synced to R2 yet
    const itemKey = getMediaItemKey(item);
    const activeOverride = safeStr(coverOverrides[itemKey]);
    const currentR2Url = safeStr(item?.R2CoverUrl || item?.r2CoverUrl);
    const hasPendingOverride = activeOverride && activeOverride !== currentR2Url;

    if (safeStr(updates.coverUrl) || safeStr(updates.customImageUrl) || hasPendingOverride) {
      syncSingleItemCoverToR2(item, "game").catch(() => {
        // Silently ignore sync failures
      });
    }
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

  // ── Add-new flow: open the appropriate edit modal with prefilled data ──────────
  const handleAddItemSelectResult = useCallback((type: AddExtendedType, data: Record<string, unknown>, bookFormat: string) => {
    setAddModalOpen(false);
    setAddModalInitialSelection(null);
    const mediaType = (type === "book-apple" || type === "book-hardcover") ? "book" : type as "movie" | "tv" | "game";
    setIsAddingNewItem(true);
    setAddNewItemType(mediaType === "book" ? "book" : mediaType);
    const prefill = bookFormat && mediaType === "book" ? { ...data, type: bookFormat } : data;
    if (mediaType === "movie") {
      setMovieDetailItem(prefill);
      setMovieDetailsEditOpen(true);
    } else if (mediaType === "tv") {
      setTvDetailItem(prefill);
      setTvDetailsEditOpen(true);
    } else if (mediaType === "book") {
      setBookDetailItem(prefill);
      setBookDetailsEditOpen(true);
    } else if (mediaType === "game") {
      setGameDetailEditItem(prefill as any);
      setGameDetailsEditOpen(true);
    }
  }, []);

  const handleAddItemManually = useCallback((type: AddExtendedType, bookFormat: string) => {
    setAddModalOpen(false);
    setAddModalInitialSelection(null);
    const mediaType = (type === "book-apple" || type === "book-hardcover") ? "book" : type as "movie" | "tv" | "game";
    setIsAddingNewItem(true);
    setAddNewItemType(mediaType === "book" ? "book" : mediaType);
    const prefill: Record<string, unknown> = mediaType === "book" ? { type: bookFormat } : {};
    if (mediaType === "movie") {
      setMovieDetailItem(prefill);
      setMovieDetailsEditOpen(true);
    } else if (mediaType === "tv") {
      setTvDetailItem(prefill);
      setTvDetailsEditOpen(true);
    } else if (mediaType === "book") {
      setBookDetailItem(prefill);
      setBookDetailsEditOpen(true);
    } else if (mediaType === "game") {
      setGameDetailEditItem(prefill as any);
      setGameDetailsEditOpen(true);
    }
  }, []);

  // Navigates to the newly-added item's detail page and resets add-item state.
  const finalizeAddAndOpen = useCallback((newItem: Record<string, unknown>) => {
    setIsAddingNewItem(false);
    setAddNewItemType(null);
    openSelectedItem(newItem);
  }, [openSelectedItem]);

  const openAddFlowFromMovieRecommendation = useCallback((item: Record<string, unknown>) => {
    const prefill: Record<string, unknown> = {
      title: safeStr(item?.title),
      year: safeStr(item?.year),
      releaseDate: safeStr(item?.releaseDate),
      posterUrl: safeStr(item?.posterUrl || item?.imageUrl),
      backdropUrl: safeStr(item?.backdropUrl),
      tmdbId: safeStr(item?.tmdbId || item?.TMDB_ID || item?.id),
      tmdbRating: safeStr(item?.tmdbRating || item?.rating),
      overview: safeStr(item?.overview),
    };
    setMovieRecommendationPreview(null);
    setIsAddingNewItem(true);
    setAddNewItemType("movie");
    setMovieDetailItem(prefill);
    setMovieDetailsEditOpen(true);
  }, []);

  const openAddFlowFromTvRecommendation = useCallback((item: Record<string, unknown>) => {
    const prefill: Record<string, unknown> = {
      title: safeStr(item?.title),
      year: safeStr(item?.year),
      firstAirDate: safeStr(item?.releaseDate || item?.firstAirDate),
      posterUrl: safeStr(item?.posterUrl || item?.imageUrl),
      backdropUrl: safeStr(item?.backdropUrl),
      tmdbId: safeStr(item?.tmdbId || item?.TMDB_ID || item?.id),
      tmdbRating: safeStr(item?.tmdbRating || item?.rating),
      overview: safeStr(item?.overview),
    };
    setTvRecommendationPreview(null);
    setIsAddingNewItem(true);
    setAddNewItemType("tv");
    setTvDetailItem(prefill);
    setTvDetailsEditOpen(true);
  }, []);

  const openAddFlowFromBookRecommendation = useCallback((item: Record<string, unknown>) => {
    const title = safeStr(item?.title);
    setAddModalInitialSelection({ type: "book-hardcover", query: title });
    setAddModalOpen(true);
  }, []);

  const openAddFlowFromGameRecommendation = useCallback((item: Record<string, unknown>) => {
    const prefill: Record<string, unknown> = {
      title: safeStr(item?.title),
      year: safeStr(item?.year),
      releaseDate: safeStr(item?.releaseDate),
      coverUrl: safeStr(item?.posterUrl || item?.imageUrl),
      backdropUrl: safeStr(item?.backdropUrl),
      igdbId: safeStr(item?.igdbId || item?.IGDB_ID || item?.id),
      igdbRating: safeStr(item?.igdbRating || item?.rating),
      description: safeStr(item?.overview || item?.description),
      genres: Array.isArray(item?.genres) ? (item.genres as string[]).join(", ") : safeStr(item?.genres),
      platforms: Array.isArray(item?.platforms) ? (item.platforms as string[]).join(", ") : safeStr(item?.platforms),
    };
    setIsAddingNewItem(true);
    setAddNewItemType("game");
    setGameDetailEditItem(prefill as any);
    setGameDetailsEditOpen(true);
  }, []);

  const openNewlyAddedItemFromRow = useCallback(
    (mediaType: "movie" | "tv" | "book" | "game", row: Record<string, string>) => {
      const typedRow = row as Row;
      if (mediaType === "movie") {
        const parsed = rowToMovie(typedRow);
        if (!parsed) throw new Error("Movie was saved, but details could not be loaded.");
        finalizeAddAndOpen({ ...parsed, __type: "movie" });
        return;
      }
      if (mediaType === "tv") {
        const parsed = rowToShow(typedRow);
        if (!parsed) throw new Error("TV show was saved, but details could not be loaded.");
        finalizeAddAndOpen({ ...parsed, __type: "tv" });
        return;
      }
      if (mediaType === "book") {
        const parsed = rowToBook(typedRow);
        if (!parsed) throw new Error("Book was saved, but details could not be loaded.");
        finalizeAddAndOpen({ ...parsed, __type: "book" });
        return;
      }
      const parsed = rowToGame(typedRow);
      if (!parsed) throw new Error("Game was saved, but details could not be loaded.");
      finalizeAddAndOpen({ ...parsed, __type: "game" });
    },
    [finalizeAddAndOpen]
  );

  // Rate It handler — opens the rate it modal
  const handleOpenRateIt = useCallback((item: Record<string, unknown>, mediaType: "movie" | "tv" | "book" | "game", highlightColor: string) => {
    setRateItItem(item);
    setRateItMediaType(mediaType);
    setRateItHighlightColor(highlightColor);
    setRateItModalOpen(true);
  }, []);

  const handleRateItSave = useCallback(async (data: Record<string, unknown>) => {
    if (!rateItItem || !rateItMediaType) return;

    try {
      if (rateItMediaType === "movie") {
        if (!moviesWriteUrl) throw new Error("Movies write URL is not configured.");
        const updates: Record<string, string> = {};
        if (data.myRating) updates["My Rating"] = safeStr(data.myRating);
        if (data.watchStatus) updates["Watch Status"] = safeStr(data.watchStatus);
        if (data.watchDate) updates["WatchDate"] = safeStr(data.watchDate);
        await postSheetWrite(moviesWriteUrl, { action: "updateMovie", match: { title: safeStr(rateItItem.title) }, updates }, "Failed to save movie rating");
        setMovieDetailItem((prev: any) => ({
          ...prev,
          ...updates,
          ...(data.myRating ? { myRating: safeStr(data.myRating) } : {}),
          ...(data.watchStatus ? { watchStatus: safeStr(data.watchStatus) } : {}),
          ...(data.watchDate ? { watchDate: safeStr(data.watchDate) } : {}),
        }));
      } else if (rateItMediaType === "tv") {
        if (!showsWriteUrl) throw new Error("TV write URL is not configured.");
        const updates: Record<string, string> = {};
        if (data.myRating) updates["My Rating"] = safeStr(data.myRating);
        if (data.watchStatus) updates["Watch Status"] = safeStr(data.watchStatus);
        if (data.dateCompleted) updates["Date Completed"] = safeStr(data.dateCompleted);
        await postSheetWrite(showsWriteUrl, { action: "updateShow", match: { title: safeStr(rateItItem.title) }, updates }, "Failed to save show rating");
        setTvDetailItem((prev: any) => ({
          ...prev,
          ...updates,
          ...(data.myRating ? { myRating: safeStr(data.myRating) } : {}),
          ...(data.watchStatus ? { watchStatus: safeStr(data.watchStatus) } : {}),
          ...(data.dateCompleted ? { dateCompleted: safeStr(data.dateCompleted) } : {}),
        }));
      } else if (rateItMediaType === "book") {
        if (!booksWriteUrl) throw new Error("Books write URL is not configured.");
        const updates: Record<string, string> = {};
        // Mark As Completed flow for books:
        // persist rating/date/tag and force Status -> Completed.
        updates["Status"] = "Completed";
        if (data.myRating) {
          updates["My Rating"] = safeStr(data.myRating);
          updates["MyRating"] = safeStr(data.myRating);
        }
        if (data.dateCompleted) {
          updates["Completed Date"] = safeStr(data.dateCompleted);
          updates["Date Completed"] = safeStr(data.dateCompleted);
          updates["CompletedDate"] = safeStr(data.dateCompleted);
        }
        if (data.tags) updates["Tag"] = safeStr(data.tags);
        await postSheetWrite(booksWriteUrl, { action: "updateBook", match: { title: safeStr(rateItItem.title) }, updates }, "Failed to save book rating");
        setBookDetailItem((prev: any) => ({
          ...prev,
          ...updates,
          status: "Completed",
          myRating: safeStr(data.myRating || prev?.myRating || prev?.["My Rating"] || prev?.MyRating),
          completedDate: safeStr(data.dateCompleted || prev?.completedDate || prev?.["Completed Date"] || prev?.CompletedDate),
          tags: safeStr(data.tags || prev?.tags || prev?.Tag),
          Tag: safeStr(data.tags || prev?.Tag),
          "My Rating": safeStr(data.myRating || prev?.["My Rating"] || prev?.MyRating),
          MyRating: safeStr(data.myRating || prev?.MyRating || prev?.["My Rating"]),
          "Completed Date": safeStr(data.dateCompleted || prev?.["Completed Date"] || prev?.CompletedDate),
          CompletedDate: safeStr(data.dateCompleted || prev?.CompletedDate || prev?.["Completed Date"]),
        }));
        setBookRows((prev) =>
          prev.map((row) => {
            if (safeStr(row?.Title) !== safeStr(rateItItem.title)) return row;
            return {
              ...row,
              Status: "Completed",
              ...(data.myRating ? { "My Rating": safeStr(data.myRating), MyRating: safeStr(data.myRating) } : {}),
              ...(data.dateCompleted ? { "Completed Date": safeStr(data.dateCompleted), "Date Completed": safeStr(data.dateCompleted), CompletedDate: safeStr(data.dateCompleted) } : {}),
              ...(data.tags ? { Tag: safeStr(data.tags) } : {}),
            };
          })
        );
      } else if (rateItMediaType === "game") {
        if (!gamesWriteUrl) throw new Error("Games write URL is not configured.");
        const updates: Record<string, string> = {};
        if (data.myRating) updates["My Rating"] = safeStr(data.myRating);
        if (data.status) updates["Status"] = safeStr(data.status);
        if (data.hoursPlayed) updates["Hours Played"] = safeStr(data.hoursPlayed);
        if (data.dateCompleted) updates["Date Completed"] = safeStr(data.dateCompleted);
        if (data.yearPlayed) updates["Year Played"] = safeStr(data.yearPlayed);
        if (data.backlog !== undefined) updates["Backlog"] = data.backlog ? "Yes" : "";
        if (data.completed !== undefined) updates["Completed"] = data.completed ? "Yes" : "";
        await postSheetWrite(gamesWriteUrl, { action: "updateGame", match: { title: safeStr(rateItItem.title || rateItItem.name) }, updates }, "Failed to save game rating");
        setGameDetailItem((prev: any) => ({
          ...prev,
          ...updates,
          ...(data.myRating ? { myRating: safeStr(data.myRating) } : {}),
          ...(data.status ? { status: safeStr(data.status) } : {}),
          ...(data.hoursPlayed ? { hoursPlayed: safeStr(data.hoursPlayed) } : {}),
          ...(data.dateCompleted ? { dateCompleted: safeStr(data.dateCompleted) } : {}),
          ...(data.yearPlayed ? { yearPlayed: safeStr(data.yearPlayed) } : {}),
        }));
      }
      setRateItModalOpen(false);
      triggerSaveToast();
    } catch (e: any) {
      window.alert(e?.message || "Failed to save rating");
    }
  }, [rateItItem, rateItMediaType, moviesWriteUrl, showsWriteUrl, booksWriteUrl, gamesWriteUrl, postSheetWrite, triggerSaveToast]);

  // Save handlers for "Add New" mode — each mirrors handleAddLibraryItem's persistence
  // but then navigates to the new item's detail page instead of just switching nav tabs.
  const handleSaveNewMovie = useCallback(async (_item: Record<string, unknown>, values: Record<string, string>) => {
    if (!moviesWriteUrl) throw new Error("Movies write URL is not configured.");
    const title = safeStr(values.title);
    if (!title) throw new Error("Title is required.");
    const row: Record<string, string> = {
      Title: title, Year: safeStr(values.year),
      MyRating: safeStr(values.myRating), TMDB_Rating: safeStr(values.tmdbRating),
      TMDB_ID: safeStr(values.tmdbId), "Watch Status": safeStr(values.watchStatus) || "Backlog",
      WatchDate: safeStr(values.watchDate), Tags: safeStr(values.tags),
      ReleaseDate: safeStr(values.releaseDate), Runtime: safeStr(values.runtime),
      Status: safeStr(values.status), Genres: safeStr(values.genres),
      Overview: safeStr(values.overview), PosterURL: safeStr(values.posterUrl),
      BackdropURL: safeStr(values.backdropUrl),
    };
    await postSheetWrite(moviesWriteUrl, { action: "addMovie", values: row }, "Failed to add movie");
    setMovieRows((prev) => [...prev, row]);
    setMovieDetailsEditOpen(false);
    openNewlyAddedItemFromRow("movie", row);
    // Auto-sync cover to R2 in background (silently)
    syncSingleItemCoverToR2(row, "movie").catch(() => {
      // Silently ignore sync failures
    });
  }, [moviesWriteUrl, postSheetWrite, openNewlyAddedItemFromRow, syncSingleItemCoverToR2]);

  const handleSaveNewTV = useCallback(async (_item: Record<string, unknown>, values: Record<string, string>) => {
    if (!showsWriteUrl) throw new Error("Shows write URL is not configured.");
    const title = safeStr(values.title);
    if (!title) throw new Error("Title is required.");
    const watchStatus = normalizeShowWatchStatusForSheet(values.watchStatus);
    const row: Record<string, string> = {
      Title: title, Year: safeStr(values.year), TMDB_ID: safeStr(values.tmdbId),
      FirstAirDate: safeStr(values.firstAirDate), LastAirDate: safeStr(values.lastAirDate),
      "Date Completed": safeStr(values.dateCompleted), CompletedDate: safeStr(values.dateCompleted),
      NumberOfSeasons: safeStr(values.numberOfSeasons), NumberOfEpisodes: safeStr(values.numberOfEpisodes),
      WatchStatus: watchStatus, Status: safeStr(values.showStatus),
      Networks: safeStr(values.networks), StreamingUS: safeStr(values.streamingUS),
      Genres: safeStr(values.genres), TMDB_Rating: safeStr(values.tmdbRating),
      MyRating: safeStr(values.myRating), BackdropURL: safeStr(values.backdropUrl),
      Overview: safeStr(values.overview), Tags: safeStr(values.tags),
      Tag: safeStr(values.tags), PosterURL: safeStr(values.posterUrl),
    };
    await postSheetWrite(showsWriteUrl, { action: "addShow", values: row }, "Failed to add show");
    setTvRows((prev) => [...prev, row]);
    setTvDetailsEditOpen(false);
    openNewlyAddedItemFromRow("tv", row);
    // Auto-sync cover to R2 in background (silently)
    syncSingleItemCoverToR2(row, "tv").catch(() => {
      // Silently ignore sync failures
    });
  }, [showsWriteUrl, postSheetWrite, openNewlyAddedItemFromRow, syncSingleItemCoverToR2]);

  const handleSaveNewBook = useCallback(async (_item: Record<string, unknown>, values: Record<string, string>) => {
    if (!booksWriteUrl) throw new Error("Books write URL is not configured.");
    const title = safeStr(values.title);
    if (!title) throw new Error("Title is required.");
    const row: Record<string, string> = {
      Title: title, Subtitle: safeStr(values.subtitle), Series: safeStr(values.series),
      Author: safeStr(values.author), Ownership: safeStr(values.ownership) || "Owned",
      Type: safeStr(values.type) || "Physical", Status: safeStr(values.status) || "Backlog",
      CompletedDate: safeStr(values.completedDate), isbn: safeStr(values.isbn),
      ReleaseDate: safeStr(values.releaseDate), description: safeStr(values.description),
      ImageURL: safeStr(values.imageUrl), userRating: safeStr(values.userRating),
      "My Rating": safeStr(values.myRating), pages: safeStr(values.pages),
      audiobookDuration: safeStr(values.audiobookDuration), genre: safeStr(values.genre),
      tags: safeStr(values.tags), OpenLibraryWorkKey: safeStr(values.openLibraryWorkKey),
      GoogleBooksVolumeId: safeStr(values.googleBooksVolumeId),
    };
    await postSheetWrite(booksWriteUrl, { action: "addBook", values: row }, "Failed to add book");
    setBookRows((prev) => [...prev, row]);
    setBookDetailsEditOpen(false);
    openNewlyAddedItemFromRow("book", row);
    // Auto-sync cover to R2 in background (silently)
    syncSingleItemCoverToR2(row, "book").catch(() => {
      // Silently ignore sync failures
    });
  }, [booksWriteUrl, postSheetWrite, openNewlyAddedItemFromRow, syncSingleItemCoverToR2]);

  const handleSaveNewGame = useCallback(async (_item: any, values: Record<string, string>) => {
    if (!gamesWriteUrl) throw new Error("Games write URL is not configured.");
    const title = safeStr(values.title);
    if (!title) throw new Error("Title is required.");
    const dateAdded = safeStr(values.dateAdded) || new Date().toISOString().slice(0, 10);
    const releaseDatePrimary = safeStr(values.releaseDate) || safeStr(values.releaseDateAlt);
    const releaseDateAlt = safeStr(values.releaseDateAlt) || releaseDatePrimary;
    const row: Record<string, string> = {
      Title: title, Cover: safeStr(values.cover),
      Platform: safeStr(values.platform), Status: safeStr(values.status),
      Name: safeStr(values.name) || title, ReleaseDate: releaseDatePrimary,
      "Release Date": releaseDateAlt, Platforms: safeStr(values.platforms),
      CoverURL: safeStr(values.coverUrl), Rating: safeStr(values.rating),
      "IGDB Rating": safeStr(values.igdbRating), "My Rating": safeStr(values.myRating),
      Ownership: safeStr(values.ownership), Format: safeStr(values.format),
      Backlog: safeStr(values.backlog), Completed: safeStr(values.completed),
      "Date Completed": safeStr(values.dateCompleted), "Year Played": safeStr(values.yearPlayed),
      "Date Added": dateAdded, Description: safeStr(values.description),
      Genres: safeStr(values.genres), "Hours Played": safeStr(values.hoursPlayed),
      CoverCachedAt: safeStr(values.coverCachedAt), Developer: safeStr(values.developer),
      ScreenshotsURL: safeStr(values.screenshotsUrl), WishlistOrder: safeStr(values.wishlistOrder),
      QueuedOrder: safeStr(values.queuedOrder), IGDB_ID: safeStr(values.igdbId),
      IGDB_ID_Override: safeStr(values.igdbIdOverride), LocalCoverURL: safeStr(values.localCoverUrl),
      Tag: safeStr(values.tags),
    };
    await postSheetWrite(gamesWriteUrl, { action: "addGame", values: row }, "Failed to add game");
    setGameRows((prev) => [...prev, row]);
    setGameDetailsEditOpen(false);
    openNewlyAddedItemFromRow("game", row);
    // Auto-sync cover to R2 in background (silently)
    syncSingleItemCoverToR2(row, "game").catch(() => {
      // Silently ignore sync failures
    });
  }, [gamesWriteUrl, postSheetWrite, openNewlyAddedItemFromRow, syncSingleItemCoverToR2]);

  useEffect(() => {
    // Need at least one CSV URL to proceed
    if (!tvCsvUrl && !booksCsvUrl && !moviesCsvUrl && !gamesCsvUrl) {
      setError(
        `No CSV URL(s) found in env.\n\nCreate / update .env.local in project root and add at least one of:\n${ENV_KEY}=PASTE_YOUR_TV_PUBLISHED_CSV_URL_HERE\n${BOOKS_ENV_KEY}=PASTE_YOUR_BOOKS_PUBLISHED_CSV_URL_HERE\n${MOVIES_ENV_KEY}=PASTE_YOUR_MOVIES_PUBLISHED_CSV_URL_HERE\n${GAMES_ENV_KEY}=PASTE_YOUR_GAMES_PUBLISHED_CSV_URL_HERE\n\nThen stop + restart dev server.`
      );
      setSyncState("error");
      setSyncMsg("Missing CSV URL(s)");
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
        console.log("[CSV LOAD] Starting CSV parsing...");
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

          // Debug: Log all column headers from books CSV
          if (data.length > 0) {
            const allColumns = Object.keys(data[0]);
            console.log(`[CSV Load] Books columns (${allColumns.length} total):`, allColumns);

            // Specifically check for R2/Cover related columns
            const r2Related = allColumns.filter(col =>
              col.toLowerCase().includes('r2') ||
              col.toLowerCase().includes('cover') ||
              col.toLowerCase().includes('backdrop')
            );
            console.log(`[CSV Load] R2/Cover/Backdrop columns:`, r2Related);

            // Log sample values for those columns from first row
            if (r2Related.length > 0) {
              const sampleValues: Record<string, any> = {};
              r2Related.forEach(col => {
                sampleValues[col] = data[0][col];
              });
              console.log(`[CSV Load] Sample values from first book:`, sampleValues);
            }
          }

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

          // Debug: Log all column headers from games CSV
          if (data.length > 0) {
            const allColumns = Object.keys(data[0]);
            console.log(`[CSV Load] Games columns (${allColumns.length} total):`, allColumns);

            // Specifically check for R2/Cover related columns
            const r2Related = allColumns.filter(col =>
              col.toLowerCase().includes('r2') ||
              col.toLowerCase().includes('cover') ||
              col.toLowerCase().includes('backdrop') ||
              col.toLowerCase().includes('poster')
            );
            console.log(`[CSV Load] R2/Cover/Backdrop/Poster columns:`, r2Related);

            // Log sample values for those columns from first row
            if (r2Related.length > 0) {
              const sampleValues: Record<string, any> = {};
              r2Related.forEach(col => {
                sampleValues[col] = data[0][col];
              });
              console.log(`[CSV Load] Sample values from first game:`, sampleValues);
            }
          }

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
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e?.message || "Failed to load CSV(s)");
        setSyncState("error");
        setSyncMsg(e?.message || "Sync failed");
        setLoading(false);
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
  //   - Reads from Google Sheet first (source of truth for consistency)
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
    // Prefer sheet value first for cross-device consistency.
    const setting = settingsRows.find((r) => safeStr(r["Key"]) === key);
    if (setting) {
      const rawValue = safeStr(setting["Value"]);
      return rawValue === "" ? defaultValue : parseStoredSettingValue(rawValue);
    }

    // Fallback to local cache only if the key is not present in sheet.
    try {
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      const settingsCache = settingsCacheRef.current;
      if (settingsCache && settingsCache[key] !== undefined && settingsCache[key] !== "") {
        return parseStoredSettingValue(settingsCache[key]);
      }
    } catch (e) {
      console.warn("Failed to read from localStorage:", e);
    }
    
    return defaultValue;
  }, [settingsRows]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("cdlSettingsCache");
      if (!raw) {
        setSettingSyncConflicts([]);
        return;
      }

      const localCache = JSON.parse(raw);
      if (!localCache || typeof localCache !== "object") {
        setSettingSyncConflicts([]);
        return;
      }

      const normalizeForConflict = (value: unknown) => {
        const str = String(value ?? "").trim();
        if (!str) return "";
        try {
          return JSON.stringify(JSON.parse(str));
        } catch {
          return str;
        }
      };

      const conflicts = settingsRows.reduce((keys: string[], row) => {
        const key = safeStr(row["Key"]);
        if (!key) return keys;
        const localValue = normalizeForConflict(localCache[key]);
        if (!localValue) return keys;
        const sheetValue = normalizeForConflict(row["Value"]);
        if (localValue === sheetValue) return keys;
        keys.push(key);
        return keys;
      }, []);

      setSettingSyncConflicts(conflicts);
    } catch (e) {
      console.warn("Failed to detect setting sync conflicts:", e);
      setSettingSyncConflicts([]);
    }
  }, [settingsRows]);

  const clearSettingSyncConflicts = useCallback(() => {
    if (!settingSyncConflicts.length) return;

    try {
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }

      const cache = settingsCacheRef.current;
      if (!cache || typeof cache !== "object") {
        setSettingSyncConflicts([]);
        return;
      }

      const nextCache = { ...cache };
      let mutated = false;
      settingSyncConflicts.forEach((key) => {
        if (Object.prototype.hasOwnProperty.call(nextCache, key)) {
          delete nextCache[key];
          mutated = true;
        }
      });

      settingsCacheRef.current = nextCache;
      localStorage.setItem("cdlSettingsCache", JSON.stringify(nextCache));

      setSettingSyncConflicts([]);

      if (mutated) {
        setSyncState("ok");
        setSyncMsg("Cleared conflicting local settings.");
        setLastSyncAt(Date.now());
        setTimeout(() => {
          setSyncMsg("Synced");
        }, 1200);
      }
    } catch (e) {
      console.warn("Failed to clear setting sync conflicts:", e);
      setSyncState("error");
      setSyncMsg("Failed to clear local settings cache.");
    }
  }, [settingSyncConflicts]);

  const flushPendingSettingsSheetWrites = useCallback(async () => {
    if (!canWriteSettings || !settingsWriteUrl) return;
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
  }, [canWriteSettings, postSheetWrite, settingsWriteUrl]);

  const queueSettingSheetWrite = useCallback(
    (key: string, value: any, category: string = "", description: string = "") => {
      if (!canWriteSettings || !settingsWriteUrl) return;

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
    [canWriteSettings, flushPendingSettingsSheetWrites, settingsWriteUrl]
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
    if (!canWriteSettings || !settingsWriteUrl) return;

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
  }, [canWriteSettings, flushPendingSettingsSheetWrites, settingsWriteUrl]);

  // Save a specific setting to Google Sheet
  const saveSettingToSheet = useCallback(async (key: string, value: any, category: string = "", description: string = "") => {
    if (!canWriteSettings || !settingsWriteUrl) {
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
  }, [canWriteSettings, postSheetWrite, settingsWriteUrl]);

  // Load UI prefs from R2 on mount — authoritative cross-device source for UI toggles
  useEffect(() => {
    fetch("/api/ui-prefs", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (!data.ok || !data.prefs) return;
        if (typeof data.prefs.showStatusIndicators === "boolean") {
          setShowStatusIndicators(data.prefs.showStatusIndicators);
          r2PrefsLoadedRef.current = true;
        }
      })
      .catch(() => {});
  }, []);

  // Apply settings from spreadsheet on load
  useEffect(() => {
    if (settingsRows.length === 0) return;
    
    setPosterSizeTv(getSetting("posterSizeTv", 100));
    setPosterSizeMovies(getSetting("posterSizeMovies", 108));
    setPosterSizeBooks(getSetting("posterSizeBooks", 115));
    let localMobileCoverScalePct: number | null = null;
    try {
      const rawMobileScale = localStorage.getItem(MOBILE_ONLY_COVER_SCALE_LOCAL_KEY);
      if (rawMobileScale !== null) {
        const parsed = Number(rawMobileScale);
        if (Number.isFinite(parsed)) {
          localMobileCoverScalePct = parsed;
        }
      }
    } catch {}
    const cachedMobileCoverScalePct = getCachedNumericSetting("mobileCoverScalePct");
    const clampMobileCoverScale = (value: number) => Math.max(50, Math.min(250, Math.round(value)));
    const legacyMobileCoverScalePct = clampMobileCoverScale(
      localMobileCoverScalePct ?? cachedMobileCoverScalePct ?? Number(getSetting("mobileCoverScalePct", 100))
    );
    let perGroupMobileCoverScale: Record<CoverScaleGroupKey, number> = {
      home: legacyMobileCoverScalePct,
      books: legacyMobileCoverScalePct,
      movies: legacyMobileCoverScalePct,
      tv: legacyMobileCoverScalePct,
      games: legacyMobileCoverScalePct,
    };
    try {
      const rawByGroup = localStorage.getItem(MOBILE_COVER_SCALE_BY_GROUP_LOCAL_KEY);
      if (rawByGroup) {
        const parsedByGroup = JSON.parse(rawByGroup);
        if (parsedByGroup && typeof parsedByGroup === "object") {
          (["home", "books", "movies", "tv", "games"] as CoverScaleGroupKey[]).forEach((group) => {
            const value = Number(parsedByGroup[group]);
            if (Number.isFinite(value)) {
              perGroupMobileCoverScale[group] = clampMobileCoverScale(value);
            }
          });
        }
      }
    } catch {}
    setMobileCoverScaleByGroup(perGroupMobileCoverScale);
    setBookHeightMultiplier(getSetting("bookHeightMultiplier", 1.5));
    setCoverGapSize(getSetting("coverGapSize", 24));
    setTight(getSetting("tight", true));

    setPosterSizeGames(getSetting("posterSizeGames", 108));
    setMediaCoverSizePct({
      tv: Math.max(40, Math.min(140, Math.round(Number(getSetting(MEDIA_COVER_SIZE_SETTING_KEYS.tv, DEFAULT_MEDIA_COVER_SIZE_PCT.tv))))),
      movies: Math.max(40, Math.min(140, Math.round(Number(getSetting(MEDIA_COVER_SIZE_SETTING_KEYS.movies, DEFAULT_MEDIA_COVER_SIZE_PCT.movies))))),
      books: Math.max(40, Math.min(140, Math.round(Number(getSetting(MEDIA_COVER_SIZE_SETTING_KEYS.books, DEFAULT_MEDIA_COVER_SIZE_PCT.books))))),
      games: Math.max(40, Math.min(140, Math.round(Number(getSetting(MEDIA_COVER_SIZE_SETTING_KEYS.games, DEFAULT_MEDIA_COVER_SIZE_PCT.games))))),
      audiobooks: Math.max(40, Math.min(140, Math.round(Number(getSetting(MEDIA_COVER_SIZE_SETTING_KEYS.audiobooks, DEFAULT_MEDIA_COVER_SIZE_PCT.audiobooks))))),
    });
    
    setLogoSize(getSetting("logoSize", 230));
    setLogoTop(getSetting("logoTop", 12));
    setLogoLeft(getSetting("logoLeft", -28));
    
    setSyncIconSize(getSetting("syncIconSize", 12));
    setSyncIconTop(getSetting("syncIconTop", 8));
    setStatusIconScale(getSetting("statusIconScale", 100));
    setStatusIconOffsetX(getSetting("statusIconOffsetX", 0));
    setStatusIconOffsetY(getSetting("statusIconOffsetY", 0));
    setRatingBadgeScale(getSetting("ratingBadgeScale", 100));
    setRatingBadgeOffsetX(getSetting("ratingBadgeOffsetX", 0));
    setRatingBadgeOffsetY(getSetting("ratingBadgeOffsetY", 0));
    setShelfThemeMode(normalizeShelfThemeMode(getSetting(SHELF_THEME_MODE_SETTING_KEY, "light")));
    setCoverTitlesVisible(getSetting(COVER_TITLES_VISIBLE_SETTING_KEY, false));

    setIconSize(getSetting("iconSize", 16));
    
    setSidebarFontSize(getSetting("sidebarFontSize", 11));
    setSidebarFontWeight(getSetting("sidebarFontWeight", "150"));
    setSidebarGap(getSetting("sidebarGap", 8));
    setSidebarHeaderFontSize(getSetting("sidebarHeaderFontSize", 11));
    setSidebarHeaderFontWeight(getSetting("sidebarHeaderFontWeight", "600"));
    setSmartListsSidebarFontSize(getSetting("smartListsSidebarFontSize", 12));
    setSmartListsSidebarFontWeight(getSetting("smartListsSidebarFontWeight", "500"));
    setSmartListsSidebarGap(getSetting("smartListsSidebarGap", 8));
    setSmartListsSidebarHeaderFontSize(getSetting("smartListsSidebarHeaderFontSize", 11));
    setSmartListsSidebarHeaderFontWeight(getSetting("smartListsSidebarHeaderFontWeight", "700"));
    setSmartListsSidebarIconSize(getSetting("smartListsSidebarIconSize", 16));
    setDiscoverSidebarFontSize(getSetting("discoverSidebarFontSize", 12));
    setDiscoverSidebarFontWeight(getSetting("discoverSidebarFontWeight", "500"));
    setDiscoverSidebarGap(getSetting("discoverSidebarGap", 8));
    setDiscoverSidebarHeaderFontSize(getSetting("discoverSidebarHeaderFontSize", 11));
    setDiscoverSidebarHeaderFontWeight(getSetting("discoverSidebarHeaderFontWeight", "700"));
    setDiscoverSidebarIconSize(getSetting("discoverSidebarIconSize", 16));
    setSidebarSectionGap(getSetting("sidebarSectionGap", 3));
    setLibrarySidebarItemGap(getSetting("librarySidebarItemGap", 0));
    setSmartListsSidebarItemGap(getSetting("smartListsSidebarItemGap", 0));
    setDiscoverSidebarItemGap(getSetting("discoverSidebarItemGap", 0));
    setSidebarSubmenuGap(getSetting("sidebarSubmenuGap", 0));
    setSidebarRowDensityOffset(getSetting("sidebarRowDensityOffset", 0));
    setSidebarHighlightColorsLight({
      home: normalizeHexColor(getSetting("sidebarHighlightColorLight:home", getSetting("sidebarHighlightColor:home", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.home))),
      books: normalizeHexColor(getSetting("sidebarHighlightColorLight:books", getSetting("sidebarHighlightColor:books", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.books))),
      movies: normalizeHexColor(getSetting("sidebarHighlightColorLight:movies", getSetting("sidebarHighlightColor:movies", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.movies))),
      tv: normalizeHexColor(getSetting("sidebarHighlightColorLight:tv", getSetting("sidebarHighlightColor:tv", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.tv))),
      games: normalizeHexColor(getSetting("sidebarHighlightColorLight:games", getSetting("sidebarHighlightColor:games", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.games))),
    });
    const loadedDarkHighlightColors = {
      home: normalizeHexColor(getSetting("sidebarHighlightColorDark:home", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.home)),
      books: normalizeHexColor(getSetting("sidebarHighlightColorDark:books", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.books)),
      movies: normalizeHexColor(getSetting("sidebarHighlightColorDark:movies", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.movies)),
      tv: normalizeHexColor(getSetting("sidebarHighlightColorDark:tv", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.tv)),
      games: normalizeHexColor(getSetting("sidebarHighlightColorDark:games", DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.games)),
    };
    const hasLegacyMonoDarkHighlights =
      loadedDarkHighlightColors.home.toLowerCase() === LEGACY_DARK_HIGHLIGHT_MONO &&
      loadedDarkHighlightColors.books.toLowerCase() === LEGACY_DARK_HIGHLIGHT_MONO &&
      loadedDarkHighlightColors.movies.toLowerCase() === LEGACY_DARK_HIGHLIGHT_MONO &&
      loadedDarkHighlightColors.tv.toLowerCase() === LEGACY_DARK_HIGHLIGHT_MONO &&
      loadedDarkHighlightColors.games.toLowerCase() === LEGACY_DARK_HIGHLIGHT_MONO;
    setSidebarHighlightColorsDark(hasLegacyMonoDarkHighlights ? { ...DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK } : loadedDarkHighlightColors);
    
    setCounterTileSize(getSetting("counterTileSize", 44));
    setCounterTileSpacing(getSetting("counterTileSpacing", 3));
    setCounterNumberFontSize(getSetting("counterNumberFontSize", 22));
    setCounterLabelFontSize(getSetting("counterLabelFontSize", 16));
    setCounterLabelFontWeight(getSetting("counterLabelFontWeight", "600"));
    setCounterLabelTop(getSetting("counterLabelTop", 0));
    setCounterLabelLeft(getSetting("counterLabelLeft", 0));
    setCounterTop(getSetting("counterTop", 0));
    setCounterLeft(getSetting("counterLeft", 0));
    if (!r2PrefsLoadedRef.current) {
      setShowStatusIndicators(getSetting("showStatusIndicators", false));
    }

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
    
    setSimpleShelfBackgroundColor("#ececec");
    setStartupSettingsHydrated(true);
  }, [getCachedNumericSetting, getSetting, settingsRows]);

  useEffect(() => {
    if (!loading && settingsRows.length === 0) {
      setStartupSettingsHydrated(true);
    }
  }, [loading, settingsRows.length]);

  useEffect(() => {
    if (!startupLockVisible) return;
    if (!loading && startupSettingsHydrated) {
      setStartupLockVisible(false);
    }
  }, [loading, startupLockVisible, startupSettingsHydrated]);

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
          activateHomeLibrary();
        }
      }
      setSyncState("ok");
      setSyncMsg(`Removed smart list: ${listToDelete.name}`);
      setLastSyncAt(Date.now());
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 1200);
    },
    [activateHomeLibrary, customSmartLists, nav, persistSmartLists, removeSetting, saveSetting, selectedSmartListId]
  );

  const handleMoveSmartList = useCallback(
    (listId: string, direction: "up" | "down") => {
      const index = customSmartLists.findIndex((list) => list.id === listId);
      if (index === -1) return;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= customSmartLists.length) return;
      const next = [...customSmartLists];
      const [moved] = next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      persistSmartLists(next);
      setSyncState("ok");
      setSyncMsg("Synced");
      setLastSyncAt(Date.now());
    },
    [customSmartLists, persistSmartLists]
  );

  const handleReorderSmartLists = useCallback(
    (fromListId: string, toListId: string) => {
      if (!fromListId || !toListId || fromListId === toListId) return;
      const fromIndex = customSmartLists.findIndex((list) => list.id === fromListId);
      const toIndex = customSmartLists.findIndex((list) => list.id === toListId);
      if (fromIndex === -1 || toIndex === -1) return;
      const next = [...customSmartLists];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      persistSmartLists(next);
      setSyncState("ok");
      setSyncMsg("Synced");
      setLastSyncAt(Date.now());
    },
    [customSmartLists, persistSmartLists]
  );

  const handleReorderBuiltInSmartLists = useCallback(
    (fromKey: BuiltInSmartListKey, toKey: BuiltInSmartListKey) => {
      if (fromKey === toKey) return;
      const fromIndex = builtInSmartListOrder.indexOf(fromKey);
      const toIndex = builtInSmartListOrder.indexOf(toKey);
      if (fromIndex === -1 || toIndex === -1) return;
      const next = [...builtInSmartListOrder];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      setBuiltInSmartListOrder(next);
    },
    [builtInSmartListOrder]
  );

  const startInlineRenameBuiltInSmartList = useCallback((key: BuiltInSmartListKey) => {
    setEditingCustomSmartListId(null);
    setEditingBuiltInSmartListKey(key);
    setSmartListNameDraft(builtInSmartListLabels[key]);
  }, [builtInSmartListLabels]);

  const startInlineRenameCustomSmartList = useCallback((listId: string, currentName: string) => {
    setEditingBuiltInSmartListKey(null);
    setEditingCustomSmartListId(listId);
    setSmartListNameDraft(currentName);
  }, []);

  const commitInlineSmartListRename = useCallback(() => {
    const nextName = smartListNameDraft.trim();
    if (!nextName) {
      setEditingBuiltInSmartListKey(null);
      setEditingCustomSmartListId(null);
      return;
    }
    if (editingBuiltInSmartListKey) {
      setBuiltInSmartListLabels((prev) => ({ ...prev, [editingBuiltInSmartListKey]: nextName }));
    } else if (editingCustomSmartListId) {
      const next = customSmartLists.map((list) =>
        list.id === editingCustomSmartListId ? { ...list, name: nextName } : list
      );
      persistSmartLists(next);
      setSyncState("ok");
      setSyncMsg("Synced");
      setLastSyncAt(Date.now());
    }
    setEditingBuiltInSmartListKey(null);
    setEditingCustomSmartListId(null);
  }, [customSmartLists, editingBuiltInSmartListKey, editingCustomSmartListId, persistSmartLists, smartListNameDraft]);

  useEffect(() => {
    if (!selectedSmartListId) return;
    if (customSmartLists.some((list) => list.id === selectedSmartListId)) return;
    setSelectedSmartListId(null);
    if (nav === "smart-custom") {
      activateHomeLibrary();
    }
  }, [activateHomeLibrary, customSmartLists, nav, selectedSmartListId]);

  useEffect(() => {
    if (
      nav !== "wishlist" &&
      nav !== "now-playing" &&
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
    } else if (nav === "now-playing") {
      sortFieldSettingKey = NOW_PLAYING_SORT_FIELD_SETTING_KEY;
      sortOrderSettingKey = NOW_PLAYING_SORT_ORDER_SETTING_KEY;
      manualSettingKey = NOW_PLAYING_MANUAL_ORDER_SETTING_KEY;
      fallbackSortField = MANUAL_SORT_FIELD;
      fallbackSortOrder = "Asc";
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
        if (nav === "now-playing") {
          setNowPlayingManualOrderKeys(normalized);
        } else if (nav === "play-next") {
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
        nav === "now-playing"
          ? "now-playing"
          : nav === "play-next"
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
    if (!isPersistedStandardSortView(nav)) return;

    const sortFieldSettingKey = `viewSortField:${nav}`;
    const sortOrderSettingKey = `viewSortOrder:${nav}`;
    const savedSortFieldRaw = safeStr(getSetting(sortFieldSettingKey, "ReleaseDate"));
    const normalizedSortField = savedSortFieldRaw || "ReleaseDate";
    const savedSortOrderRaw = safeStr(getSetting(sortOrderSettingKey, "Desc"));
    const normalizedSortOrder: "Asc" | "Desc" = savedSortOrderRaw === "Asc" ? "Asc" : "Desc";

    setSortField(normalizedSortField);
    setSortOrder(normalizedSortOrder);
  }, [getSetting, nav]);

  useEffect(() => {
    const smartListSupportsManualSort = nav === "smart-custom" && Boolean(activeSmartList?.allowManualSort);
    if (
      nav === "wishlist" ||
      nav === "now-playing" ||
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
    wishlistDragHoverPlacementRef.current = null;
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
  const updateShowStatusIndicators = (value: boolean) => {
    setShowStatusIndicators(value);
    saveSetting("showStatusIndicators", value, "Display", "Show status indicator dots on covers");
    fetch("/api/ui-prefs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefs: { showStatusIndicators: value } }),
    }).catch(() => {});
  };
  const updateShelfThemeMode = (value: ShelfThemeMode) => {
    const nextMode = normalizeShelfThemeMode(value);
    setShelfThemeMode(nextMode);
    saveSetting(SHELF_THEME_MODE_SETTING_KEY, nextMode, "Themes", "Shelf Theme Mode");
  };
  const updateCoverTitlesVisible = (value: boolean) => {
    setCoverTitlesVisible(value);
    saveSetting(COVER_TITLES_VISIBLE_SETTING_KEY, value, "Themes", "Show item titles under covers");
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
  
  const updateMediaCoverSizePct = useCallback(
    (key: keyof typeof mediaCoverSizePct, value: number) => {
      const nextValue = Math.max(40, Math.min(140, Math.round(value)));
      setMediaCoverSizePct((prev) => ({ ...prev, [key]: nextValue }));
      const settingKey =
        key === "tv"
          ? MEDIA_COVER_SIZE_SETTING_KEYS.tv
          : key === "movies"
            ? MEDIA_COVER_SIZE_SETTING_KEYS.movies
            : key === "books"
              ? MEDIA_COVER_SIZE_SETTING_KEYS.books
              : key === "games"
                ? MEDIA_COVER_SIZE_SETTING_KEYS.games
                : MEDIA_COVER_SIZE_SETTING_KEYS.audiobooks;
      saveSetting(settingKey, nextValue, "Cover Sizes", `${key === "audiobooks" ? "Audiobook" : key === "movies" ? "Movie" : key === "books" ? "Book" : key === "games" ? "Game" : "TV"} Cover Size (%)`);
    },
    [saveSetting]
  );
  const resetMediaCoverSizesToDefault = useCallback(() => {
    const defaults = {
      tv: DEFAULT_MEDIA_COVER_SIZE_PCT.tv,
      movies: DEFAULT_MEDIA_COVER_SIZE_PCT.movies,
      books: DEFAULT_MEDIA_COVER_SIZE_PCT.books,
      games: DEFAULT_MEDIA_COVER_SIZE_PCT.games,
      audiobooks: DEFAULT_MEDIA_COVER_SIZE_PCT.audiobooks,
    };
    setMediaCoverSizePct(defaults);
    saveSetting(MEDIA_COVER_SIZE_SETTING_KEYS.tv, defaults.tv, "Cover Sizes", "TV Cover Size (%)");
    saveSetting(MEDIA_COVER_SIZE_SETTING_KEYS.movies, defaults.movies, "Cover Sizes", "Movie Cover Size (%)");
    saveSetting(MEDIA_COVER_SIZE_SETTING_KEYS.books, defaults.books, "Cover Sizes", "Book Cover Size (%)");
    saveSetting(MEDIA_COVER_SIZE_SETTING_KEYS.games, defaults.games, "Cover Sizes", "Game Cover Size (%)");
    saveSetting(MEDIA_COVER_SIZE_SETTING_KEYS.audiobooks, defaults.audiobooks, "Cover Sizes", "Audiobook Cover Size (%)");
  }, [saveSetting]);
  const updateMobileCoverScalePct = useCallback((group: CoverScaleGroupKey, value: number) => {
    const nextValue = Math.max(50, Math.min(250, Math.round(value)));
    setMobileCoverScaleByGroup((prev) => {
      const next = { ...prev, [group]: nextValue };
      try {
        localStorage.setItem(MOBILE_COVER_SCALE_BY_GROUP_LOCAL_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);
  const updateCoverScaleForGroup = useCallback((group: CoverScaleGroupKey, value: number) => {
    const scalePct = Math.max(0, Math.min(200, Math.round(value)));
    const settingKey = COVER_SCALE_SETTING_KEYS[group];
    setCoverScaleByGroup((prev) => ({ ...prev, [group]: scalePct }));
    debouncedUpdate(settingKey, scalePct, (nextValue) => {
      setCoverScaleByGroup((prev) => ({ ...prev, [group]: nextValue }));
    }, "Cover Sizes", `${group === "home" ? "Home" : group === "tv" ? "TV Shows" : group === "books" ? "Books" : group === "movies" ? "Movies" : "Games"} Cover Scale (%)`);
  }, [debouncedUpdate]);
  const updateCurrentCoverScale = useCallback((value: number) => {
    if (nav === "statistics" || nav === "roadmap" || nav === "cover-sync" || nav === "themes" || nav === "icons") return;
    const currentGroup = activeCoverScaleGroup;
    updateCoverScaleForGroup(currentGroup, value);
  }, [activeCoverScaleGroup, nav, updateCoverScaleForGroup]);
  const updateSimpleShelfBackgroundColor = (value: string) => {
    const normalizedColor = normalizeHexColor(value);
    setSimpleShelfBackgroundColor(normalizedColor);
    saveSetting("simpleShelfBackgroundColor", normalizedColor, "Themes", "Simple Shelf Background Color");
    setThemeSaveNotice(`Saved Simple Shelf background: ${normalizedColor.toUpperCase()}. This will be used next time.`);
  };
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
  const updateRatingBadgeScale = (value: number) => {
    setRatingBadgeScale(value);
    saveSetting("ratingBadgeScale", value, "Status Icon", "Rating Badge Size (%)");
  };
  const updateRatingBadgeOffsetX = (value: number) => {
    setRatingBadgeOffsetX(value);
    saveSetting("ratingBadgeOffsetX", value, "Status Icon", "Rating Badge Horizontal Offset (px)");
  };
  const updateRatingBadgeOffsetY = (value: number) => {
    setRatingBadgeOffsetY(value);
    saveSetting("ratingBadgeOffsetY", value, "Status Icon", "Rating Badge Vertical Offset (px)");
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
  const updateSmartListsSidebarFontSize = (value: number) => {
    setSmartListsSidebarFontSize(value);
    saveSetting("smartListsSidebarFontSize", value, "Sidebar", "Smart Lists Sidebar Font Size");
  };
  const updateSmartListsSidebarFontWeight = (value: string) => {
    setSmartListsSidebarFontWeight(value);
    saveSetting("smartListsSidebarFontWeight", value, "Sidebar", "Smart Lists Sidebar Font Weight");
  };
  const updateSmartListsSidebarGap = (value: number) => {
    setSmartListsSidebarGap(value);
    saveSetting("smartListsSidebarGap", value, "Sidebar", "Smart Lists Sidebar Icon Gap");
  };
  const updateSmartListsSidebarHeaderFontSize = (value: number) => {
    setSmartListsSidebarHeaderFontSize(value);
    saveSetting("smartListsSidebarHeaderFontSize", value, "Sidebar", "Smart Lists Sidebar Header Font Size");
  };
  const updateSmartListsSidebarHeaderFontWeight = (value: string) => {
    setSmartListsSidebarHeaderFontWeight(value);
    saveSetting("smartListsSidebarHeaderFontWeight", value, "Sidebar", "Smart Lists Sidebar Header Font Weight");
  };
  const updateSmartListsSidebarIconSize = (value: number) => {
    setSmartListsSidebarIconSize(value);
    saveSetting("smartListsSidebarIconSize", value, "Sidebar", "Smart Lists Sidebar Icon Size (px)");
  };
  const updateDiscoverSidebarFontSize = (value: number) => {
    setDiscoverSidebarFontSize(value);
    saveSetting("discoverSidebarFontSize", value, "Sidebar", "Discover Sidebar Font Size");
  };
  const updateDiscoverSidebarFontWeight = (value: string) => {
    setDiscoverSidebarFontWeight(value);
    saveSetting("discoverSidebarFontWeight", value, "Sidebar", "Discover Sidebar Font Weight");
  };
  const updateDiscoverSidebarGap = (value: number) => {
    setDiscoverSidebarGap(value);
    saveSetting("discoverSidebarGap", value, "Sidebar", "Discover Sidebar Icon Gap");
  };
  const updateDiscoverSidebarHeaderFontSize = (value: number) => {
    setDiscoverSidebarHeaderFontSize(value);
    saveSetting("discoverSidebarHeaderFontSize", value, "Sidebar", "Discover Sidebar Header Font Size");
  };
  const updateDiscoverSidebarHeaderFontWeight = (value: string) => {
    setDiscoverSidebarHeaderFontWeight(value);
    saveSetting("discoverSidebarHeaderFontWeight", value, "Sidebar", "Discover Sidebar Header Font Weight");
  };
  const updateDiscoverSidebarIconSize = (value: number) => {
    setDiscoverSidebarIconSize(value);
    saveSetting("discoverSidebarIconSize", value, "Sidebar", "Discover Sidebar Icon Size (px)");
  };
  const updateSidebarSectionGap = (value: number) => {
    setSidebarSectionGap(value);
    saveSetting("sidebarSectionGap", value, "Sidebar", "Sidebar Vertical Gap Between Sections");
  };
  const updateLibrarySidebarItemGap = (value: number) => {
    setLibrarySidebarItemGap(value);
    saveSetting("librarySidebarItemGap", value, "Sidebar", "Library Sidebar Item Gap");
  };
  const updateSmartListsSidebarItemGap = (value: number) => {
    setSmartListsSidebarItemGap(value);
    saveSetting("smartListsSidebarItemGap", value, "Sidebar", "Smart Lists Sidebar Item Gap");
  };
  const updateDiscoverSidebarItemGap = (value: number) => {
    setDiscoverSidebarItemGap(value);
    saveSetting("discoverSidebarItemGap", value, "Sidebar", "Discover Sidebar Item Gap");
  };
  const updateSidebarSubmenuGap = (value: number) => {
    setSidebarSubmenuGap(value);
    saveSetting("sidebarSubmenuGap", value, "Sidebar", "Sidebar Submenu Group Gap");
  };
  const updateSidebarRowDensityOffset = (value: number) => {
    setSidebarRowDensityOffset(value);
    saveSetting("sidebarRowDensityOffset", value, "Sidebar", "Sidebar Row Density Offset");
  };
  const updateSidebarHighlightColor = (group: CoverScaleGroupKey, value: string, mode: HighlightThemeMode = highlightThemeEditorMode) => {
    const normalized = normalizeHexColor(value);
    if (mode === "dark") {
      setSidebarHighlightColorsDark((prev) => ({ ...prev, [group]: normalized }));
      saveSetting(`sidebarHighlightColorDark:${group}`, normalized, "Sidebar", `${group} Highlight Color (Dark)`);
      return;
    }
    setSidebarHighlightColorsLight((prev) => ({ ...prev, [group]: normalized }));
    saveSetting(`sidebarHighlightColorLight:${group}`, normalized, "Sidebar", `${group} Highlight Color (Light)`);
  };
  const resetLibrarySidebarDefaults = useCallback(() => {
    const defaults = sidebarModuleDefaultsRef.current?.library;
    if (!defaults) return;
    updateIconSize(defaults.iconSize);
    updateSidebarFontSize(defaults.fontSize);
    updateSidebarFontWeight(defaults.fontWeight);
    updateSidebarGap(defaults.iconGap);
    updateSidebarHeaderFontSize(defaults.headerFontSize);
    updateSidebarHeaderFontWeight(defaults.headerFontWeight);
  }, [updateIconSize, updateSidebarFontSize, updateSidebarFontWeight, updateSidebarGap, updateSidebarHeaderFontSize, updateSidebarHeaderFontWeight]);
  const resetSmartListsSidebarDefaults = useCallback(() => {
    const defaults = sidebarModuleDefaultsRef.current?.smartLists;
    if (!defaults) return;
    updateSmartListsSidebarIconSize(defaults.iconSize);
    updateSmartListsSidebarFontSize(defaults.fontSize);
    updateSmartListsSidebarFontWeight(defaults.fontWeight);
    updateSmartListsSidebarGap(defaults.iconGap);
    updateSmartListsSidebarHeaderFontSize(defaults.headerFontSize);
    updateSmartListsSidebarHeaderFontWeight(defaults.headerFontWeight);
  }, [
    updateSmartListsSidebarFontSize,
    updateSmartListsSidebarFontWeight,
    updateSmartListsSidebarGap,
    updateSmartListsSidebarHeaderFontSize,
    updateSmartListsSidebarHeaderFontWeight,
    updateSmartListsSidebarIconSize,
  ]);
  const resetDiscoverSidebarDefaults = useCallback(() => {
    const defaults = sidebarModuleDefaultsRef.current?.discover;
    if (!defaults) return;
    updateDiscoverSidebarIconSize(defaults.iconSize);
    updateDiscoverSidebarFontSize(defaults.fontSize);
    updateDiscoverSidebarFontWeight(defaults.fontWeight);
    updateDiscoverSidebarGap(defaults.iconGap);
    updateDiscoverSidebarHeaderFontSize(defaults.headerFontSize);
    updateDiscoverSidebarHeaderFontWeight(defaults.headerFontWeight);
  }, [
    updateDiscoverSidebarFontSize,
    updateDiscoverSidebarFontWeight,
    updateDiscoverSidebarGap,
    updateDiscoverSidebarHeaderFontSize,
    updateDiscoverSidebarHeaderFontWeight,
    updateDiscoverSidebarIconSize,
  ]);
  const resetLogoDefaults = () => {
    setLogoSize(DEFAULT_LOGO_SETTINGS.size);
    setLogoTop(DEFAULT_LOGO_SETTINGS.top);
    setLogoLeft(DEFAULT_LOGO_SETTINGS.left);
    saveSetting("logoSize", DEFAULT_LOGO_SETTINGS.size, "Logo Settings", "Logo Size (px)");
    saveSetting("logoTop", DEFAULT_LOGO_SETTINGS.top, "Logo Settings", "Logo Top Position");
    saveSetting("logoLeft", DEFAULT_LOGO_SETTINGS.left, "Logo Settings", "Logo Left Position");
  };
  const resetSyncDefaults = () => {
    setSyncIconSize(DEFAULT_SYNC_ICON_SETTINGS.size);
    setSyncIconTop(DEFAULT_SYNC_ICON_SETTINGS.top);
    saveSetting("syncIconSize", DEFAULT_SYNC_ICON_SETTINGS.size, "Sync Icon", "Sync Icon Size (px)");
    saveSetting("syncIconTop", DEFAULT_SYNC_ICON_SETTINGS.top, "Sync Icon", "Sync Icon Top Position");
  };
  const resetStatusIconDefaults = () => {
    setStatusIconScale(DEFAULT_STATUS_ICON_SETTINGS.scale);
    setStatusIconOffsetX(DEFAULT_STATUS_ICON_SETTINGS.offsetX);
    setStatusIconOffsetY(DEFAULT_STATUS_ICON_SETTINGS.offsetY);
    setRatingBadgeScale(DEFAULT_RATING_BADGE_SETTINGS.scale);
    setRatingBadgeOffsetX(DEFAULT_RATING_BADGE_SETTINGS.offsetX);
    setRatingBadgeOffsetY(DEFAULT_RATING_BADGE_SETTINGS.offsetY);
    saveSetting("statusIconScale", DEFAULT_STATUS_ICON_SETTINGS.scale, "Status Icon", "Status Icon Size (%)");
    saveSetting("statusIconOffsetX", DEFAULT_STATUS_ICON_SETTINGS.offsetX, "Status Icon", "Status Icon Horizontal Offset (px)");
    saveSetting("statusIconOffsetY", DEFAULT_STATUS_ICON_SETTINGS.offsetY, "Status Icon", "Status Icon Vertical Offset (px)");
    saveSetting("ratingBadgeScale", DEFAULT_RATING_BADGE_SETTINGS.scale, "Status Icon", "Rating Badge Size (%)");
    saveSetting("ratingBadgeOffsetX", DEFAULT_RATING_BADGE_SETTINGS.offsetX, "Status Icon", "Rating Badge Horizontal Offset (px)");
    saveSetting("ratingBadgeOffsetY", DEFAULT_RATING_BADGE_SETTINGS.offsetY, "Status Icon", "Rating Badge Vertical Offset (px)");
    resetAllStatusIconOverrides();
  };
  const resetSidebarDefaults = () => {
    setIconSize(DEFAULT_SIDEBAR_SETTINGS.iconSize);
    setSidebarFontSize(DEFAULT_SIDEBAR_SETTINGS.fontSize);
    setSidebarFontWeight(DEFAULT_SIDEBAR_SETTINGS.fontWeight);
    setSidebarGap(DEFAULT_SIDEBAR_SETTINGS.iconGap);
    setSidebarHeaderFontSize(DEFAULT_SIDEBAR_SETTINGS.headerFontSize);
    setSidebarHeaderFontWeight(DEFAULT_SIDEBAR_SETTINGS.headerFontWeight);
    setSmartListsSidebarFontSize(DEFAULT_SIDEBAR_SETTINGS.smartFontSize);
    setSmartListsSidebarFontWeight(DEFAULT_SIDEBAR_SETTINGS.smartFontWeight);
    setSmartListsSidebarGap(DEFAULT_SIDEBAR_SETTINGS.smartGap);
    setSmartListsSidebarHeaderFontSize(DEFAULT_SIDEBAR_SETTINGS.smartHeaderSize);
    setSmartListsSidebarHeaderFontWeight(DEFAULT_SIDEBAR_SETTINGS.smartHeaderWeight);
    setSmartListsSidebarIconSize(DEFAULT_SIDEBAR_SETTINGS.smartIconSize);
    setDiscoverSidebarFontSize(DEFAULT_SIDEBAR_SETTINGS.discoverFontSize);
    setDiscoverSidebarFontWeight(DEFAULT_SIDEBAR_SETTINGS.discoverFontWeight);
    setDiscoverSidebarGap(DEFAULT_SIDEBAR_SETTINGS.discoverGap);
    setDiscoverSidebarHeaderFontSize(DEFAULT_SIDEBAR_SETTINGS.discoverHeaderSize);
    setDiscoverSidebarHeaderFontWeight(DEFAULT_SIDEBAR_SETTINGS.discoverHeaderWeight);
    setDiscoverSidebarIconSize(DEFAULT_SIDEBAR_SETTINGS.discoverIconSize);
    setSidebarSectionGap(DEFAULT_SIDEBAR_SETTINGS.sectionGap);
    setLibrarySidebarItemGap(DEFAULT_SIDEBAR_SETTINGS.libraryItemGap);
    setSmartListsSidebarItemGap(DEFAULT_SIDEBAR_SETTINGS.smartItemGap);
    setDiscoverSidebarItemGap(DEFAULT_SIDEBAR_SETTINGS.discoverItemGap);
    setSidebarSubmenuGap(DEFAULT_SIDEBAR_SETTINGS.submenuGap);
    setSidebarRowDensityOffset(DEFAULT_SIDEBAR_SETTINGS.rowDensityOffset);
    setSidebarHighlightColorsLight({
      home: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.home,
      books: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.books,
      movies: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.movies,
      tv: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.tv,
      games: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.games,
    });
    setSidebarHighlightColorsDark({
      home: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.home,
      books: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.books,
      movies: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.movies,
      tv: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.tv,
      games: DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.games,
    });
    Object.entries({
      iconSize: DEFAULT_SIDEBAR_SETTINGS.iconSize,
      sidebarFontSize: DEFAULT_SIDEBAR_SETTINGS.fontSize,
      sidebarFontWeight: DEFAULT_SIDEBAR_SETTINGS.fontWeight,
      sidebarGap: DEFAULT_SIDEBAR_SETTINGS.iconGap,
      sidebarHeaderFontSize: DEFAULT_SIDEBAR_SETTINGS.headerFontSize,
      sidebarHeaderFontWeight: DEFAULT_SIDEBAR_SETTINGS.headerFontWeight,
      smartListsSidebarFontSize: DEFAULT_SIDEBAR_SETTINGS.smartFontSize,
      smartListsSidebarFontWeight: DEFAULT_SIDEBAR_SETTINGS.smartFontWeight,
      smartListsSidebarGap: DEFAULT_SIDEBAR_SETTINGS.smartGap,
      smartListsSidebarHeaderFontSize: DEFAULT_SIDEBAR_SETTINGS.smartHeaderSize,
      smartListsSidebarHeaderFontWeight: DEFAULT_SIDEBAR_SETTINGS.smartHeaderWeight,
      smartListsSidebarIconSize: DEFAULT_SIDEBAR_SETTINGS.smartIconSize,
      discoverSidebarFontSize: DEFAULT_SIDEBAR_SETTINGS.discoverFontSize,
      discoverSidebarFontWeight: DEFAULT_SIDEBAR_SETTINGS.discoverFontWeight,
      discoverSidebarGap: DEFAULT_SIDEBAR_SETTINGS.discoverGap,
      discoverSidebarHeaderFontSize: DEFAULT_SIDEBAR_SETTINGS.discoverHeaderSize,
      discoverSidebarHeaderFontWeight: DEFAULT_SIDEBAR_SETTINGS.discoverHeaderWeight,
      discoverSidebarIconSize: DEFAULT_SIDEBAR_SETTINGS.discoverIconSize,
      sidebarSectionGap: DEFAULT_SIDEBAR_SETTINGS.sectionGap,
      librarySidebarItemGap: DEFAULT_SIDEBAR_SETTINGS.libraryItemGap,
      smartListsSidebarItemGap: DEFAULT_SIDEBAR_SETTINGS.smartItemGap,
      discoverSidebarItemGap: DEFAULT_SIDEBAR_SETTINGS.discoverItemGap,
      sidebarSubmenuGap: DEFAULT_SIDEBAR_SETTINGS.submenuGap,
      sidebarRowDensityOffset: DEFAULT_SIDEBAR_SETTINGS.rowDensityOffset,
      "sidebarHighlightColorLight:home": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.home,
      "sidebarHighlightColorLight:books": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.books,
      "sidebarHighlightColorLight:movies": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.movies,
      "sidebarHighlightColorLight:tv": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.tv,
      "sidebarHighlightColorLight:games": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS.games,
      "sidebarHighlightColorDark:home": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.home,
      "sidebarHighlightColorDark:books": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.books,
      "sidebarHighlightColorDark:movies": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.movies,
      "sidebarHighlightColorDark:tv": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.tv,
      "sidebarHighlightColorDark:games": DEFAULT_SIDEBAR_HIGHLIGHT_COLORS_DARK.games,
    }).forEach(([key, value]) => saveSetting(key, value, "Sidebar", key));
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

  const sampleRandomItems = useCallback(<T,>(items: T[], count: number): T[] => {
    if (items.length <= count) return items;
    const shuffled = [...items];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }, []);

  const parseCreatorTokens = useCallback((value: unknown): string[] => {
    return safeStr(value)
      .split(/,|\/|;|\band\b|&/gi)
      .map((token) => token.toLowerCase().replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }, []);

  const movieRelated = useMemo(() => {
    if (!movieDetailItem) return { movies: [] as Record<string, unknown>[], label: "Similar Movies" };
    const dir = safeStr(movieDetailItem?.director);
    const movieTitle = safeStr(movieDetailItem?.title);
    const genres = safeStr(movieDetailItem?.genres);
    if (dir) {
      const byDir = allMovies
        .filter(m => safeStr(m?.director) === dir && safeStr(m?.title) !== movieTitle);
      const randomByDir = sampleRandomItems(byDir, 12);
      if (randomByDir.length > 0) return { movies: randomByDir as unknown as Record<string, unknown>[], label: `More by ${dir}` };
    }
    const genreSet = new Set(genres.split(/[,|]/).map(g => g.trim().toLowerCase()).filter(Boolean));
    if (genreSet.size > 0) {
      const similar = allMovies
        .filter(m => {
          if (safeStr(m?.title) === movieTitle) return false;
          return safeStr(m?.genres).split(/[,|]/).some(g => genreSet.has(g.trim().toLowerCase()));
        });
      const randomSimilar = sampleRandomItems(similar, 12);
      if (randomSimilar.length > 0) return { movies: randomSimilar as unknown as Record<string, unknown>[], label: "Similar Movies" };
    }
    return { movies: [] as Record<string, unknown>[], label: "Similar Movies" };
  }, [movieDetailItem, allMovies, sampleRandomItems]);

  const tvRelated = useMemo(() => {
    if (!tvDetailItem) return { shows: [] as Record<string, unknown>[], label: "Similar Shows" };
    const creator = safeStr(tvDetailItem?.creator);
    const showTitle = safeStr(tvDetailItem?.title);
    const genres = safeStr(tvDetailItem?.genres);
    if (creator) {
      const creatorSet = new Set(parseCreatorTokens(creator));
      const byCreator = allShows
        .filter(s => {
          if (safeStr(s?.title) === showTitle) return false;
          const showCreators = parseCreatorTokens(s?.creator);
          return showCreators.some((token) => creatorSet.has(token));
        })
        .slice(0, 20);
      if (byCreator.length > 0) return { shows: byCreator as unknown as Record<string, unknown>[], label: `More by ${creator}` };
    }
    const genreSet = new Set(genres.split(/[,|]/).map(g => g.trim().toLowerCase()).filter(Boolean));
    if (genreSet.size > 0) {
      const similar = allShows
        .filter(s => {
          if (safeStr(s?.title) === showTitle) return false;
          return safeStr(s?.genres).split(/[,|]/).some(g => genreSet.has(g.trim().toLowerCase()));
        })
        .slice(0, 20);
      if (similar.length > 0) return { shows: similar as unknown as Record<string, unknown>[], label: "Similar Shows" };
    }
    return { shows: [] as Record<string, unknown>[], label: "Similar Shows" };
  }, [tvDetailItem, allShows, parseCreatorTokens]);

  const allGames = useMemo(() => {
    return gameRows.map(rowToGame).filter(game => {
      if (!game) return false;
      // Filter out items with #REF! errors in key fields
      if (hasRefError(game.title) || hasRefError(game.platform)) return false;
      return true;
    }) as Game[];
  }, [gameRows]);

  const gameRelated = useMemo(() => {
    if (!gameDetailItem) return { games: [] as Record<string, unknown>[], label: "Similar Games" };
    const developer = safeStr(gameDetailItem?.developer);
    const gameTitle = safeStr(gameDetailItem?.title);
    const genres = safeStr(gameDetailItem?.genres);
    const platform = safeStr(gameDetailItem?.platform || gameDetailItem?.platforms);
    if (developer) {
      const byDeveloper = allGames
        .filter(g => safeStr(g?.developer) === developer && safeStr(g?.title) !== gameTitle)
        .slice(0, 20);
      if (byDeveloper.length > 0) return { games: byDeveloper as unknown as Record<string, unknown>[], label: `More from ${developer}` };
    }
    const genreSet = new Set(genres.split(/[,|]/).map(g => g.trim().toLowerCase()).filter(Boolean));
    if (genreSet.size > 0) {
      const similar = allGames
        .filter(g => {
          if (safeStr(g?.title) === gameTitle) return false;
          return safeStr(g?.genres).split(/[,|]/).some(g2 => genreSet.has(g2.trim().toLowerCase()));
        })
        .slice(0, 20);
      if (similar.length > 0) return { games: similar as unknown as Record<string, unknown>[], label: "Similar Games" };
    }
    if (platform) {
      const byPlatform = allGames
        .filter(g => safeStr(g?.title) !== gameTitle)
        .filter(g => {
          const gPlatform = safeStr(g?.platform || g?.platforms);
          return gPlatform.toLowerCase() === platform.toLowerCase();
        })
        .slice(0, 20);
      if (byPlatform.length > 0) return { games: byPlatform as unknown as Record<string, unknown>[], label: `More on ${platform}` };
    }
    const anyOthers = allGames
      .filter(g => safeStr(g?.title) !== gameTitle)
      .slice(0, 20);
    if (anyOthers.length > 0) return { games: anyOthers as unknown as Record<string, unknown>[], label: "More Games" };
    return { games: [] as Record<string, unknown>[], label: "Similar Games" };
  }, [gameDetailItem, allGames]);

  const [bookRecommendations, setBookRecommendations] = useState<Record<string, unknown>[]>([]);
  const [movieRecommendations, setMovieRecommendations] = useState<Record<string, unknown>[]>([]);
  const [tvRecommendations, setTvRecommendations] = useState<Record<string, unknown>[]>([]);
  const [gameRecommendations, setGameRecommendations] = useState<Record<string, unknown>[]>([]);

  const loadRecommendations = useCallback(
    async (
      mediaType: "book" | "movie" | "tv" | "game",
      currentItem: Record<string, unknown> | null,
      onSuccess: (items: Record<string, unknown>[]) => void
    ) => {
      if (!currentItem) {
        onSuccess([]);
        return;
      }

      try {
        const res = await fetch("/api/recommendations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mediaType,
            item: currentItem,
            libraryIds: {
              movieTmdbIds: allMovies.map((m) => safeStr(m.tmdbId)).filter(Boolean),
              tvTmdbIds: allShows.map((s) => safeStr(s.tmdbId)).filter(Boolean),
              gameIgdbIds: allGames.map((g) => safeStr(g.igdbId || g.igdbIdOverride)).filter(Boolean),
              bookHardcoverIds: allBooks.map((b) => safeStr((b as any).hardcoverId || (b as any).HardcoverID)).filter(Boolean),
              bookIsbn13s: allBooks.map((b) => safeStr(b.isbn13 || (b as any).ISBN13)).filter(Boolean),
              bookTitleAuthorPairs: allBooks.map((b) => `${safeStr(b.title)}|||${safeStr((b as any).author || (b as any).Author)}`).filter(Boolean),
            },
          }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          recommendations?: Array<Record<string, unknown>>;
        };
        if (!res.ok || !payload.ok || !Array.isArray(payload.recommendations)) {
          onSuccess([]);
          return;
        }

        const normalized = payload.recommendations.map((item) => ({
          ...item,
          title: safeStr(item.title),
          posterUrl: safeStr(item.imageUrl),
          releaseDate: safeStr(item.releaseDate),
          year: safeStr(item.year),
        }));
        const toEpoch = (entry: Record<string, unknown>) => {
          const dateRaw = safeStr(entry.releaseDate);
          if (dateRaw) {
            const parsed = new Date(dateRaw);
            if (!Number.isNaN(parsed.getTime())) return parsed.getTime();
          }
          const yearRaw = safeStr(entry.year);
          const yearNum = Number.parseInt(yearRaw, 10);
          if (Number.isFinite(yearNum) && yearNum > 0) return new Date(yearNum, 0, 1).getTime();
          return 0;
        };
        if (mediaType !== "book") {
          normalized.sort((a, b) => toEpoch(b) - toEpoch(a));
        }
        onSuccess(normalized);
      } catch {
        onSuccess([]);
      }
    },
    [allBooks, allGames, allMovies, allShows]
  );

  useEffect(() => {
    void loadRecommendations("book", bookDetailItem, setBookRecommendations);
  }, [bookDetailItem, loadRecommendations]);

  useEffect(() => {
    void loadRecommendations("movie", movieDetailItem, setMovieRecommendations);
  }, [movieDetailItem, loadRecommendations]);

  useEffect(() => {
    void loadRecommendations("tv", tvDetailItem, setTvRecommendations);
  }, [tvDetailItem, loadRecommendations]);

  useEffect(() => {
    void loadRecommendations("game", gameDetailItem, setGameRecommendations);
  }, [gameDetailItem, loadRecommendations]);

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
        completedYear: getYearToken(show.dateCompleted),
        firstAirYear: getYearToken(show.firstAirDate),
        tagYears: getYearTokens(show.tag),
        watchYears: Array.from(new Set([getYearToken(show.dateCompleted), ...getYearTokens(show.tag)].filter(Boolean))),
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
        movieStatusNorm: safeStr(movie.status || movie.movieStatus).toLowerCase().replace("cancelled", "canceled"),
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
        tagTokens: Array.from(new Set(parseGameTagValues(game).map((tag) => normalizeTagToken(tag)).filter(Boolean))),
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

  const nowPlayingItems = useMemo(
    () =>
      [
        ...indexedBooks
          .filter((book) => NOW_PLAYING_BOOK_STATUS_VALUES.has(normalizeStatusToken(book.statusNorm)))
          .map((book) => ({ ...book.item, __type: "book" } as Book & { __type: "book" })),
        ...indexedShows
          .filter((show) =>
            NOW_PLAYING_TV_STATUS_VALUES.has(
              normalizeStatusToken(show.item.watchStatus || show.item.watched || show.item.showStatus)
            )
          )
          .map((show) => ({ ...show.item, __type: "tv" } as Show & { __type: "tv" })),
        ...indexedMovies
          .filter((movie) =>
            NOW_PLAYING_MOVIE_STATUS_VALUES.has(
              normalizeStatusToken(
                movie.item.watchStatus || movie.item.watched || movie.item.status || movie.item.movieStatus
              )
            )
          )
          .map((movie) => ({ ...movie.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...indexedGames
          .filter((game) =>
            NOW_PLAYING_GAME_STATUS_VALUES.has(
              normalizeStatusToken(game.item.status || game.item.playStatus || game.item.gameStatus)
            )
          )
          .map((game) => ({ ...game.item, __type: "game" } as Game & { __type: "game" })),
      ] as Array<
        | (Book & { __type: "book" })
        | (Show & { __type: "tv" })
        | (Movie & { __type: "movie" })
        | (Game & { __type: "game" })
      >,
    [indexedBooks, indexedGames, indexedMovies, indexedShows]
  );

  const nowPlayingItemsByKey = useMemo(() => {
    const map = new Map<
      string,
      | (Book & { __type: "book" })
      | (Show & { __type: "tv" })
      | (Movie & { __type: "movie" })
      | (Game & { __type: "game" })
    >();
    nowPlayingItems.forEach((item) => {
      map.set(getMediaItemKey(item), item);
    });
    return map;
  }, [nowPlayingItems]);

  const nowPlayingFallbackOrderKeys = useMemo(() => {
    const sorted = [...nowPlayingItems].sort((a, b) => safeStr(a.title).localeCompare(safeStr(b.title)));
    return sorted.map((item) => getMediaItemKey(item));
  }, [nowPlayingItems]);

  const resolvedNowPlayingManualOrderKeys = useMemo(() => {
    const seen = new Set<string>();
    const ordered: string[] = [];

    nowPlayingManualOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!nowPlayingItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    nowPlayingFallbackOrderKeys.forEach((key) => {
      if (!key || seen.has(key)) return;
      if (!nowPlayingItemsByKey.has(key)) return;
      seen.add(key);
      ordered.push(key);
    });

    return ordered;
  }, [nowPlayingFallbackOrderKeys, nowPlayingItemsByKey, nowPlayingManualOrderKeys]);

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
        .filter(
          (movie) =>
            !isMovieWatchedStatus(movie.item) &&
            !isMovieAbandonedStatus(movie.item) &&
            !isMovieUpcomingOnlyStatus(movie.item)
        )
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
      if (isAbandonedStatus(status)) return { key: "abandoned", color: STATUS_COLOR_ORANGE, label: "Abandoned" };
      if (
        status === "completed" ||
        status === "watched" ||
        status === "true" ||
        status === "yes" ||
        status === "1"
      ) {
        return { key: "completed", color: STATUS_COLOR_GREEN, label: "Watched / Completed" };
      }
      if (status === "pending return") {
        return { key: "pending-return", color: STATUS_COLOR_YELLOW, label: "Pending Return" };
      }
      if (status === "paused") {
        return { key: "paused", color: STATUS_COLOR_YELLOW, label: "Paused" };
      }
      if (
        status === "currently watching" ||
        status === "watching" ||
        status === "in progress" ||
        status === "watch next"
      ) {
        return { key: "watching", color: STATUS_COLOR_YELLOW, label: "Watching" };
      }
      if (status === "backlog" || status === "wishlist") {
        return { key: "not-started", color: STATUS_COLOR_RED, label: "Not Started" };
      }
      return { key: "not-started", color: STATUS_COLOR_RED, label: "Not Watched" };
    }

    if (mediaType === "movie") {
      const status = normalizeStatus(item?.watchStatus || item?.watched);
      if (isAbandonedStatus(status)) return { key: "abandoned", color: STATUS_COLOR_ORANGE, label: "Abandoned" };
      if (isMovieWatched(item as Movie)) return { key: "completed", color: STATUS_COLOR_GREEN, label: "Watched" };
      if (status === "started" || status === "watching" || status === "currently watching" || status === "in progress" || status === "paused") {
        return { key: "watching", color: STATUS_COLOR_YELLOW, label: "Started" };
      }
      return { key: "not-started", color: STATUS_COLOR_RED, label: "Not Watched" };
    }

    if (mediaType === "game") {
      const status = normalizeStatus(item?.status || item?.playStatus || item?.gameStatus || item?.completed);
      if (isAbandonedStatus(status)) return { key: "abandoned", color: STATUS_COLOR_ORANGE, label: "Abandoned" };
      if (status === "completed" || status === "done" || status === "beaten" || status === "finished") {
        return { key: "completed", color: STATUS_COLOR_GREEN, label: "Completed" };
      }
      if (
        status === "playing" ||
        status === "now playing" ||
        status === "currently playing" ||
        status === "in progress" ||
        status === "paused"
      ) {
        return { key: "watching", color: STATUS_COLOR_YELLOW, label: "Playing" };
      }
      return { key: "not-started", color: STATUS_COLOR_RED, label: "Not Played" };
    }

    if (mediaType === "book") {
      const status = normalizeStatus(item?.status);
      if (isAbandonedStatus(status)) return { key: "abandoned", color: STATUS_COLOR_ORANGE, label: "Abandoned" };
      if (status === "completed" || status === "finished" || status === "read") {
        return { key: "completed", color: STATUS_COLOR_GREEN, label: "Completed" };
      }
      if (status === "reading" || status === "currently reading" || status === "in progress" || status === "paused") {
        return { key: "watching", color: STATUS_COLOR_YELLOW, label: "Reading" };
      }
      return { key: "not-started", color: STATUS_COLOR_RED, label: "Not Read" };
    }

    return null;
  }, [isMovieWatched, normalizeStatus]);

  const statusIconOptions = useMemo(
    () => [
      { key: "completed", label: "Completed / Watched", color: STATUS_COLOR_GREEN },
      { key: "watching", label: "In Progress", color: STATUS_COLOR_YELLOW },
      { key: "abandoned", label: "Abandoned", color: STATUS_COLOR_ORANGE },
      { key: "not-started", label: "Not Started", color: STATUS_COLOR_RED },
      { key: "pending-return", label: "Pending Return", color: STATUS_COLOR_YELLOW },
      { key: "paused", label: "Paused", color: STATUS_COLOR_YELLOW },
    ],
    []
  );

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
      const completedYear = getYearToken(show.dateCompleted);
      if (completedYear) tags.add(completedYear);
    });
    return Array.from(tags).sort();
  }, [allShows]);

  const tvTagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tvTags) counts[t] = 0;
    for (const show of allShows) {
      const showTags = new Set<string>();
      if (show.tag) {
        const individualTags = show.tag.split(',').map(t => t.trim()).filter(Boolean);
        individualTags.forEach(tag => showTags.add(tag));
      }
      const completedYear = getYearToken(show.dateCompleted);
      if (completedYear) showTags.add(completedYear);
      showTags.forEach(tag => {
        const match = tvTags.find(t => t === tag);
        if (match) counts[match] += 1;
      });
    }
    return counts;
  }, [allShows, tvTags]);

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

  const movieTags = useMemo(() => {
    const tags = new Set<string>();
    allMovies.forEach(movie => {
      [...parseTagValues(movie.tag), ...parseTagValues(movie.tags)].forEach(t => {
        const v = t.trim();
        if (v) tags.add(v);
      });
    });
    return Array.from(tags).sort();
  }, [allMovies]);

  const movieTagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of movieTags) counts[t] = 0;
    for (const movie of allMovies) {
      [...parseTagValues(movie.tag), ...parseTagValues(movie.tags)].forEach(t => {
        const v = t.trim();
        if (counts[v] !== undefined) counts[v] += 1;
      });
    }
    return counts;
  }, [allMovies, movieTags]);

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
        ["Watched", "Started", "Backlog", "Abandoned", "Paused"]
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
      show.watchYears.forEach((year) => tvTagYears.add(year));
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
      collect(game.yearPlayed);
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
      if (bookUpcomingFilter) {
        const upcoming = indexedBooks.filter((b) => isUpcomingRelease(b.item.releaseDate));
        const sorted = applySorting(upcoming.map((b) => b.item), sortField, sortOrder);
        const qf = q ? sorted.filter((b) => safeStr(b.title).toLowerCase().includes(q)) : sorted;
        return qf.map((b) => ({ ...b, __type: "book" })) as any[];
      }
      const hasBookFilters = Boolean(readingStatusFilter || formatFilter || seriesFilter || genreFilter || wishlistFilter);
      const bookBase = hasBookFilters
        ? (wishlistFilter ? indexedBooks : indexedBooks.filter((b) => b.ownershipNorm !== "wishlist" && !isNotYetReleased(b.item.releaseDate)))
        : indexedBooks.filter((b) => b.ownershipNorm === "owned" && !isNotYetReleased(b.item.releaseDate));
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

    if (nav === "statistics" || nav === "roadmap" || nav === "cover-sync" || nav === "themes" || nav === "icons") {
      return [
        ...indexedBooks.map((b) => ({ ...b.item, __type: "book" } as Book & { __type: "book" })),
        ...indexedShows.map((s) => ({ ...s.item, __type: "tv" } as Show & { __type: "tv" })),
        ...indexedMovies.map((m) => ({ ...m.item, __type: "movie" } as Movie & { __type: "movie" })),
        ...indexedGames.map((g) => ({ ...g.item, __type: "game" } as Game & { __type: "game" })),
      ] as any[];
    }

    // Home: combine all non-wishlist, already-released media and sort by release date.
    if (nav === "home") {
      const qbBase = indexedBooks.filter((b) => !hasWishlistOwnership(b.item.ownership) && !isNotYetReleased(b.item.releaseDate));
      const qgBase = indexedGames.filter((g) => g.ownershipNorm !== "wishlist" && !isNotYetReleased(g.item.releaseDate));
      const qb = q ? qbBase.filter((b) => b.titleLC.includes(q)) : qbBase;
      const qsBase = indexedShows.filter(
        (s) =>
          s.watchStatusNorm !== "wishlist" &&
          normalizeStatus(s.item.watchStatus) !== "wishlist" &&
          !isNotYetReleased(s.item.firstAirDate)
      );
      const qmBase = indexedMovies.filter(
        (m) =>
          m.watchStatusNorm !== "wishlist" &&
          normalizeStatus(m.item.watchStatus) !== "wishlist" &&
          !isMovieUpcomingOnlyStatus(m.item) &&
          !isNotYetReleased(m.item.releaseDate)
      );
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

    // Upcoming: all items across types with a future or today release date
    if (nav === "upcoming") {
      const upcomingBooks = indexedBooks
        .filter((b) => isUpcomingRelease(b.item.releaseDate))
        .map((b) => ({ ...b.item, __type: "book" } as Book & { __type: "book" }));
      const upcomingShows = indexedShows
        .filter((s) => isUpcomingRelease(s.item.firstAirDate))
        .map((s) => ({ ...s.item, __type: "tv" } as Show & { __type: "tv" }));
      const upcomingMovies = indexedMovies
        .filter((m) => isUpcomingRelease(m.item.releaseDate) || isMovieUpcomingOnlyStatus(m.item))
        .map((m) => ({ ...m.item, __type: "movie" } as Movie & { __type: "movie" }));
      const upcomingGames = indexedGames
        .filter((g) => isUpcomingRelease(pickBestReleaseDate(g.item.releaseDate, g.item.releaseDateAlt)))
        .map((g) => ({ ...g.item, __type: "game" } as Game & { __type: "game" }));
      const combined = [...upcomingBooks, ...upcomingShows, ...upcomingMovies, ...upcomingGames] as any[];
      const effectiveSortField = sortField === MANUAL_SORT_FIELD ? "ReleaseDate" : sortField;
      const sorted = applySorting(combined, effectiveSortField, sortOrder);
      const queryFiltered = q ? sorted.filter((item) => safeStr((item as any).title).toLowerCase().includes(q)) : sorted;
      return queryFiltered as any[];
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

    // Now Playing: mixed media with active "now playing" statuses
    if (nav === "now-playing") {
      const ordered =
        sortField === MANUAL_SORT_FIELD
          ? resolvedNowPlayingManualOrderKeys
              .map((key) => nowPlayingItemsByKey.get(key))
              .filter(Boolean) as Array<
                | (Book & { __type: "book" })
                | (Show & { __type: "tv" })
                | (Movie & { __type: "movie" })
                | (Game & { __type: "game" })
              >
          : applySorting(nowPlayingItems, sortField, sortOrder);

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

      const queryFiltered = q
        ? ordered.filter((item) => safeStr((item as any).title).toLowerCase().includes(q))
        : ordered;
      return TV_WATCHLIST_SECTION_ORDER.flatMap((sectionKey) =>
        queryFiltered.filter((item) => getTvWatchlistSectionForItem(item) === sectionKey)
      ) as any[];
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
        token === "paused" ||
        token === "started"
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
      if (movieUpcomingFilter) {
        const upcoming = indexedMovies.filter((m) => isUpcomingRelease(m.item.releaseDate) || isMovieUpcomingOnlyStatus(m.item));
        const sorted = applySorting(upcoming.map((m) => m.item), sortField, sortOrder);
        const qf = q ? sorted.filter((m) => safeStr(m.title).toLowerCase().includes(q)) : sorted;
        return qf.map((m) => ({ ...m, __type: "movie" })) as any[];
      }
      let filtered = indexedMovies.filter(
        (m) => m.watchStatusNorm !== "wishlist" && !isMovieUpcomingOnlyStatus(m.item) && !isNotYetReleased(m.item.releaseDate)
      );

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
            watchStatus === "started" ||
            watchStatus === "watching" ||
            watchStatus === "currently watching" ||
            watchStatus === "in progress" ||
            watchStatus === "paused";
          if (movieWatchFilter === "Watched") return isMovieWatched(m.item);
          if (movieWatchFilter === "Started") return isWatching;
          if (movieWatchFilter === "Abandoned") return isAbandoned;
          return !isMovieWatched(m.item) && !isWatching && !isAbandoned;
        });
      }

      // Apply genre filter if set
      if (movieGenreFilter) {
        filtered = filtered.filter((m) => m.genres.includes(movieGenreFilter));
      }

      // Apply tag filter if set
      if (movieTagFilter) {
        filtered = filtered.filter((m) => m.tagTokens.includes(normalizeTagToken(movieTagFilter)));
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
      let filtered = indexedGames;
      if (gameViewMode === "backlog") {
        filtered = indexedGames.filter((g) => isGameBacklogHeaderMatch(g.item));
      } else if (gameViewMode === "completed") {
        filtered = indexedGames.filter((g) => isGameCompletedStatus(g.item));
      } else if (gameViewMode === "abandoned") {
        filtered = indexedGames.filter((g) => isGameAbandonedStatus(g.item));
      } else if (gameViewMode === "wishlist") {
        filtered = indexedGames.filter((g) => g.ownershipNorm === "wishlist");
      } else if (gameViewMode === "upcoming") {
        const upcoming = indexedGames.filter((g) => isUpcomingRelease(pickBestReleaseDate(g.item.releaseDate, g.item.releaseDateAlt)));
        const sorted = applySorting(upcoming.map((g) => g.item), sortField, sortOrder);
        const qf = q ? sorted.filter((g) => safeStr(g.title).toLowerCase().includes(q)) : sorted;
        return qf.map((g) => ({ ...g, __type: "game" })) as any[];
      } else if (gameViewMode === "library") {
        filtered = indexedGames.filter((g) => g.ownershipNorm !== "wishlist" && !isNotYetReleased(g.item.releaseDate));
      } else if (!hasGameFilters) {
        filtered = indexedGames.filter((g) => g.ownershipNorm !== "wishlist" && !isNotYetReleased(g.item.releaseDate));
      }

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
        ? indexedShows.filter((s) => s.titleLC.includes(q) && s.watchYears.includes(currentYear))
        : indexedShows.filter((s) => s.watchYears.includes(currentYear));
      
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
                tv_tag: show.watchYears || [],
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
    if (nav === "tv" && tvViewMode === "upcoming") {
      const upcoming = indexedShows.filter((s) => isUpcomingRelease(s.item.firstAirDate));
      const sorted = applySorting(upcoming.map((s) => s.item), sortField, sortOrder);
      const qf = q ? sorted.filter((s) => safeStr(s.title).toLowerCase().includes(q)) : sorted;
      return qf as any[];
    }
    const hasTvFilters = Boolean(watchFilter || showFilter || tagFilter);
    const tvLibraryBase = indexedShows.filter((s) => s.watchStatusNorm !== "wishlist" && !isNotYetReleased(s.item.firstAirDate));
    let tvBase = tvLibraryBase;
    if (nav === "tv") {
      if (tvViewMode === "backlog") {
        tvBase = tvLibraryBase.filter((s) => !isTvWatchedStatus(s.item) && !isTvWatchingStatus(s.item) && !isTvAbandonedStatus(s.item));
      } else if (tvViewMode === "watching") {
        tvBase = tvLibraryBase.filter((s) => isTvWatchingStatus(s.item));
      } else if (tvViewMode === "watched") {
        tvBase = tvLibraryBase.filter((s) => isTvWatchedStatus(s.item));
      } else if (tvViewMode === "abandoned") {
        tvBase = tvLibraryBase.filter((s) => isTvAbandonedStatus(s.item));
      }
    } else if (hasTvFilters) {
      tvBase = tvLibraryBase;
    } else {
      tvBase = tvLibraryBase.filter((s) => s.watchStatusNorm !== "backlog");
    }
    const watchStatusNorm = watchFilter ? normalizeStatus(watchFilter) : "";
    const showStatusNorm = showFilter ? normalizeStatus(showFilter) : "";
    const filteredByWatch = watchFilter
      ? tvBase.filter((s) => s.watchStatusNorm === watchStatusNorm)
      : tvBase;
    const filteredByShow = showFilter
      ? filteredByWatch.filter((s) => s.showStatusNorm === showStatusNorm)
      : filteredByWatch;
    const filteredByTag = tagFilter
      ? filteredByShow.filter((s) => s.tags.includes(tagFilter) || s.watchYears.includes(tagFilter))
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
    isGameAbandonedStatus, isGameBacklogHeaderMatch, isGameCompletedStatus, isMovieWatched, isTvAbandonedStatus, isTvWatchedStatus, isTvWatchingStatus, movieGenreFilter, movieTagFilter, movieWatchFilter, nav, normalizeStatus, resolvePlatformAlias,
    activeSmartList, bookUpcomingFilter, deferredQuery, gameViewMode, movieUpcomingFilter, nowPlayingItems, nowPlayingItemsByKey, playNextItems, playNextItemsByKey, readingStatusFilter, resolvedNowPlayingManualOrderKeys, resolvedPlayNextManualOrderKeys, resolvedReadNextManualOrderKeys, resolvedWatchlistMovieManualOrderKeys, resolvedWatchlistTvManualOrderKeys, resolvedWishlistManualOrderKeys, seriesFilter, showFilter, smartListManualOrderKeysById, sortField, sortOrder, tagFilter, tvViewMode, watchFilter, watchlistMovieItems, watchlistMovieItemsByKey, watchlistTvItems, watchlistTvItemsByKey, wishlistBookItems, wishlistBookItemsByKey, wishlistFilter, wishlistItems, wishlistItemsByKey
  ]);

  const watchlistTvSectionCounts = useMemo(() => {
    const counts: Record<TvWatchlistSectionKey, number> = {
      watching: 0,
      watchNext: 0,
      paused: 0,
      pendingReturn: 0,
      notStarted: 0,
    };
    watchlistTvItems.forEach((item) => {
      const section = getTvWatchlistSectionForItem(item);
      counts[section] += 1;
    });

    return counts;
  }, [watchlistTvItems]);

  const persistBacklogSortSettings = useCallback(
    (
      view: "wishlist" | "now-playing" | "wishlist-books" | "play-next" | "watchlist-movies" | "watchlist-tv",
      field: string,
      order: "Asc" | "Desc"
    ) => {
      let sortFieldKey = WISHLIST_SORT_FIELD_SETTING_KEY;
      let sortOrderKey = WISHLIST_SORT_ORDER_SETTING_KEY;
      let descriptionPrefix = "Wishlist (Backlog)";

      if (view === "now-playing") {
        sortFieldKey = NOW_PLAYING_SORT_FIELD_SETTING_KEY;
        sortOrderKey = NOW_PLAYING_SORT_ORDER_SETTING_KEY;
        descriptionPrefix = "Now Playing (Backlog)";
      } else if (view === "play-next") {
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

  const persistStandardViewSortSettings = useCallback(
    (
      view: "home" | "books" | "movies" | "tv" | "games" | "current" | "completed" | "abandoned" | "year-this",
      field: string,
      order: "Asc" | "Desc"
    ) => {
      const label = getPersistedStandardSortViewLabel(view);
      saveSetting(`viewSortField:${view}`, field, "View Sorting", `Sort field for ${label} view`);
      saveSetting(`viewSortOrder:${view}`, order, "View Sorting", `Sort order for ${label} view`);
    },
    [saveSetting]
  );

  const manualSortableSmartListId = nav === "smart-custom" && activeSmartList?.allowManualSort
    ? activeSmartList.id
    : null;

  const persistActiveSmartListSortDefaults = useCallback(
    (field: string, order: "Asc" | "Desc") => {
      if (!activeSmartList) return;
      const normalizedField =
        field === MANUAL_SORT_FIELD && !activeSmartList.allowManualSort
          ? "ReleaseDate"
          : field;
      if (
        activeSmartList.defaultSortField === normalizedField &&
        activeSmartList.defaultSortOrder === order
      ) {
        return;
      }
      const nextLists = customSmartLists.map((list) =>
        list.id === activeSmartList.id
          ? {
              ...list,
              defaultSortField: normalizedField,
              defaultSortOrder: order,
            }
          : list
      );
      persistSmartLists(nextLists);
    },
    [activeSmartList, customSmartLists, persistSmartLists]
  );

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
        persistActiveSmartListSortDefaults(nextField, sortOrder);
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
        nav === "now-playing" ||
        nav === "play-next" ||
        nav === "wishlist" ||
        nav === "wishlist-books" ||
        nav === "watchlist-movies" ||
        nav === "watchlist-tv"
          ? nav
          : null;
      if (!backlogView) {
        if (isPersistedStandardSortView(nav)) {
          persistStandardViewSortSettings(nav, nextField, sortOrder);
        }
        return;
      }
      persistBacklogSortSettings(backlogView, nextField, sortOrder);
      if (nextField !== MANUAL_SORT_FIELD) return;

      let manualOrderKeys: string[] = resolvedWishlistManualOrderKeys;
      let manualOrderSettingKey = WISHLIST_MANUAL_ORDER_SETTING_KEY;
      let descriptionPrefix = "Wishlist (Backlog)";
      if (backlogView === "now-playing") {
        manualOrderKeys = resolvedNowPlayingManualOrderKeys;
        manualOrderSettingKey = NOW_PLAYING_MANUAL_ORDER_SETTING_KEY;
        descriptionPrefix = "Now Playing (Backlog)";
      } else if (backlogView === "play-next") {
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
      persistActiveSmartListSortDefaults,
      manualSortableSmartListId,
      nav,
      persistBacklogSortSettings,
      persistStandardViewSortSettings,
      resolvedNowPlayingManualOrderKeys,
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
      if (nav === "smart-custom") {
        persistActiveSmartListSortDefaults(sortField, nextOrder);
        return;
      }
      const backlogView =
        nav === "now-playing" ||
        nav === "play-next" ||
        nav === "wishlist" ||
        nav === "wishlist-books" ||
        nav === "watchlist-movies" ||
        nav === "watchlist-tv"
          ? nav
          : null;
      if (backlogView) {
        persistBacklogSortSettings(backlogView, sortField, nextOrder);
        return;
      }
      if (isPersistedStandardSortView(nav)) {
        persistStandardViewSortSettings(nav, sortField, nextOrder);
      }
    },
    [nav, persistActiveSmartListSortDefaults, persistBacklogSortSettings, persistStandardViewSortSettings, sortField]
  );

  const activeBookQuickLink: BookQuickLinkKey =
    nav === "books" && bookUpcomingFilter
      ? "upcoming"
      : nav === "books" && wishlistFilter
        ? "wishlist"
        : nav === "books" && normalizeStatus(readingStatusFilter || undefined) === "completed"
          ? "completed"
          : "library";

  const activeMovieQuickLink: MovieQuickLinkKey | null =
    nav === "movies"
      ? movieUpcomingFilter
        ? "upcoming"
        : movieWatchFilter === "Watched"
          ? "watched"
          : movieWatchFilter === "Started"
            ? "started"
            : movieWatchFilter === "Backlog"
              ? "backlog"
              : movieWatchFilter === "Abandoned"
                ? "abandoned"
                : "library"
      : null;

  const activeTvQuickLink: TvQuickLinkKey | null =
    nav === "tv" && tvViewMode !== "custom"
      ? tvViewMode
      : null;

  const activeGameQuickLink: GameQuickLinkKey | null =
    nav === "games" && gameViewMode !== "custom"
      ? gameViewMode
      : null;

  const activateBookQuickLink = useCallback((nextView: BookQuickLinkKey) => {
    setNav("books");
    setOpenSection("books");
    setBookUpcomingFilter(nextView === "upcoming");
    setWishlistFilter(nextView === "wishlist");
    setReadingStatusFilter(nextView === "completed" ? "Completed" : null);
    setFormatFilter(null);
    setSeriesFilter(null);
    setGenreFilter(null);
    setSortField(nextView === "completed" ? "CompletedDate" : "ReleaseDate");
    setSortOrder(nextView === "upcoming" ? "Asc" : "Desc");
  }, []);

  const activateMovieQuickLink = useCallback((nextView: MovieQuickLinkKey) => {
    setNav("movies");
    setOpenSection("movies");
    setMovieUpcomingFilter(nextView === "upcoming");
    setMovieWatchFilter(
      nextView === "library" || nextView === "upcoming"
        ? null
        : nextView === "watched"
          ? "Watched"
          : nextView === "started"
            ? "Started"
            : nextView === "abandoned"
              ? "Abandoned"
              : "Backlog"
    );
    setMovieGenreFilter(null);
    setMovieTagFilter(null);
    setSortField("ReleaseDate");
    setSortOrder(nextView === "upcoming" ? "Asc" : "Desc");
  }, []);

  const activateTvQuickLink = useCallback((nextView: TvQuickLinkKey) => {
    setNav("tv");
    setOpenSection("tv");
    setTvViewMode(nextView);
    setWatchFilter(null);
    setShowFilter(null);
    setTagFilter(null);
    if (nextView === "upcoming") { setSortField("ReleaseDate"); setSortOrder("Asc"); }
  }, []);

  const activateGameQuickLink = useCallback((nextView: GameQuickLinkKey) => {
    setNav("games");
    setOpenSection("games");
    setGameViewMode(nextView);
    setGamePlatformFilter(null);
    setGameStatusFilter(null);
    setGameOwnershipFilter(null);
    setGameFormatFilter(null);
    setGameYearPlayedFilter(null);
    setGameGenreFilter(null);
    setSortField("ReleaseDate");
    setSortOrder(nextView === "upcoming" ? "Asc" : "Desc");
  }, []);

  const backlogHeaderQuickLinks: Array<{ key: BacklogQuickLinkKey; label: string }> = [
    { key: "home", label: "Library" },
    { key: "upcoming", label: "Upcoming" },
    { key: "now-playing", label: "Now Playing" },
    { key: "play-next", label: "Play Next" },
    { key: "wishlist-books", label: "Read Next" },
    { key: "watchlist-movies", label: "Movie Watchlist" },
    { key: "watchlist-tv", label: "TV Watchlist" },
  ];

  const activeBacklogQuickLink: BacklogQuickLinkKey | null =
    nav === "home" ||
    nav === "upcoming" ||
    nav === "now-playing" ||
    nav === "play-next" ||
    nav === "wishlist-books" ||
    nav === "watchlist-movies" ||
    nav === "watchlist-tv"
      ? nav
      : null;

  const showBacklogHeaderQuickLinks = nav === "home" || activeBacklogQuickLink !== null;
  const useHomeHeaderWrapLayout =
    (showBacklogHeaderQuickLinks ||
      nav === "books" ||
      nav === "movies" ||
      nav === "tv" ||
      nav === "games") && !isMobileLayout;

  const persistBacklogManualOrder = useCallback(
    async (
      view: "wishlist" | "now-playing" | "wishlist-books" | "play-next" | "watchlist-movies" | "watchlist-tv",
      nextKeys: string[]
    ) => {
      const activeItemsByKey =
        view === "now-playing"
          ? nowPlayingItemsByKey
          : view === "play-next"
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
      } else if (view === "now-playing") {
        setNowPlayingManualOrderKeys(normalizedKeys);
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
      if (view === "now-playing") {
        manualOrderSettingKey = NOW_PLAYING_MANUAL_ORDER_SETTING_KEY;
        manualOrderDescription = "Manual order keys for Now Playing (Backlog) view";
      } else if (view === "play-next") {
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
      nowPlayingItemsByKey,
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
      nav !== "now-playing" &&
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
        nav === "now-playing" ||
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
        backlogView === "now-playing"
          ? nowPlayingItems
          : backlogView === "play-next"
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
      if (backlogView === "now-playing") {
        setNowPlayingManualOrderKeys(nextKeys);
      } else if (backlogView === "play-next") {
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
      nowPlayingItems,
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
    (dragKey: string, targetKey: string, targetPlacement: WishlistDragPlacement) => {
      if (!dragKey || !targetKey || dragKey === targetKey) return;

      const backlogView =
        nav === "now-playing" ||
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
          return moveKeyToTargetPlacement(merged, dragKey, targetKey, targetPlacement);
        };
        const baseOrder =
          wishlistDragLatestOrderRef.current && wishlistDragLatestOrderRef.current.length
            ? wishlistDragLatestOrderRef.current
            : (smartListManualOrderKeysById[manualSortableSmartListId] || []);
        const nextOrder = applyReorder(baseOrder);
        if (areStringArraysEqual(nextOrder, baseOrder)) return;
        wishlistDragLatestOrderRef.current = nextOrder;
        setSmartListManualOrderKeysById((prev) => ({
          ...prev,
          [manualSortableSmartListId]: nextOrder,
        }));
        return;
      }

      if (!backlogView) return;

      const activeItemsByKey =
        backlogView === "now-playing"
          ? nowPlayingItemsByKey
          : backlogView === "play-next"
          ? playNextItemsByKey
          : backlogView === "wishlist-books"
            ? wishlistBookItemsByKey
          : backlogView === "watchlist-movies"
            ? watchlistMovieItemsByKey
            : backlogView === "watchlist-tv"
              ? watchlistTvItemsByKey
              : wishlistItemsByKey;
      const activeResolvedKeys =
        backlogView === "now-playing"
          ? resolvedNowPlayingManualOrderKeys
          : backlogView === "play-next"
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
        return moveKeyToTargetPlacement(merged, dragKey, targetKey, targetPlacement);
      };
      const baseOrder =
        wishlistDragLatestOrderRef.current && wishlistDragLatestOrderRef.current.length
          ? wishlistDragLatestOrderRef.current
          : backlogView === "now-playing"
            ? (nowPlayingManualOrderKeys.length ? nowPlayingManualOrderKeys : resolvedNowPlayingManualOrderKeys)
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
      if (areStringArraysEqual(nextOrder, baseOrder)) return;
      wishlistDragLatestOrderRef.current = nextOrder;
      if (backlogView === "now-playing") {
        setNowPlayingManualOrderKeys(nextOrder);
      } else if (backlogView === "play-next") {
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
      nowPlayingItemsByKey,
      nowPlayingManualOrderKeys,
      playNextManualOrderKeys,
      playNextItemsByKey,
      readNextManualOrderKeys,
      resolvedNowPlayingManualOrderKeys,
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

  const findWishlistDragTarget = useCallback(
    (
      pointerX: number,
      pointerY: number,
      dragKey: string,
      dragWidth: number,
      dragHeight: number
    ): WishlistDragTarget | null => {
      let pointerInsideKey: string | null = null;
      let pointerInsideScore = Number.POSITIVE_INFINITY;
      let nearestKey: string | null = null;
      let nearestScore = Number.POSITIVE_INFINITY;
      let boundsLeft = Number.POSITIVE_INFINITY;
      let boundsTop = Number.POSITIVE_INFINITY;
      let boundsRight = Number.NEGATIVE_INFINITY;
      let boundsBottom = Number.NEGATIVE_INFINITY;

      wishlistVisibleKeys.forEach((key) => {
        if (key === dragKey) return;
        const node = wishlistCaseNodeMapRef.current.get(key);
        if (!node) return;
        const rect = node.getBoundingClientRect();

        boundsLeft = Math.min(boundsLeft, rect.left);
        boundsTop = Math.min(boundsTop, rect.top);
        boundsRight = Math.max(boundsRight, rect.right);
        boundsBottom = Math.max(boundsBottom, rect.bottom);

        const pointerInsideRect =
          pointerX >= rect.left &&
          pointerX <= rect.right &&
          pointerY >= rect.top &&
          pointerY <= rect.bottom;
        if (pointerInsideRect) {
          const rectCenterX = (rect.left + rect.right) / 2;
          const rectCenterY = (rect.top + rect.bottom) / 2;
          const score = Math.hypot(pointerX - rectCenterX, (pointerY - rectCenterY) * 1.2);
          if (score < pointerInsideScore) {
            pointerInsideScore = score;
            pointerInsideKey = key;
          }
        }

        const dx = pointerX < rect.left ? rect.left - pointerX : pointerX > rect.right ? pointerX - rect.right : 0;
        const dy = pointerY < rect.top ? rect.top - pointerY : pointerY > rect.bottom ? pointerY - rect.bottom : 0;
        const score = Math.hypot(dx, dy * 1.45);
        if (score < nearestScore) {
          nearestScore = score;
          nearestKey = key;
        }
      });

      const hasBounds = Number.isFinite(boundsLeft) && Number.isFinite(boundsTop);
      if (!hasBounds) return null;

      const marginX = Math.max(48, dragWidth * 0.65);
      const marginY = Math.max(48, dragHeight * 0.8);
      const pointerWithinDragZone =
        pointerX >= boundsLeft - marginX &&
        pointerX <= boundsRight + marginX &&
        pointerY >= boundsTop - marginY &&
        pointerY <= boundsBottom + marginY;
      if (!pointerWithinDragZone) return null;

      const resolveTarget = (key: string | null): WishlistDragTarget | null => {
        if (!key) return null;
        const node = wishlistCaseNodeMapRef.current.get(key);
        if (!node) return { key, placement: "after" };
        const rect = node.getBoundingClientRect();
        const rectCenterX = (rect.left + rect.right) / 2;
        const rectCenterY = (rect.top + rect.bottom) / 2;
        const normX = Math.abs(pointerX - rectCenterX) / Math.max(1, rect.width);
        const normY = Math.abs(pointerY - rectCenterY) / Math.max(1, rect.height);
        const preferVertical = normY > normX * 0.95;
        const placement: WishlistDragPlacement = preferVertical
          ? pointerY < rectCenterY ? "before" : "after"
          : pointerX < rectCenterX ? "before" : "after";
        return { key, placement };
      };

      return resolveTarget(pointerInsideKey ?? nearestKey);
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
      wishlistDragHoverPlacementRef.current = null;
      wishlistDragVisualPendingRef.current = null;
      setWishlistDragHoverKey(null);
      if (wishlistDragVisualRafRef.current !== null) {
        window.cancelAnimationFrame(wishlistDragVisualRafRef.current);
        wishlistDragVisualRafRef.current = null;
      }
      setWishlistPointerDrag(null);
      setDraggingWishlistKey(null);

      const backlogView =
        nav === "now-playing" ||
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
            : backlogView === "now-playing"
              ? (nowPlayingManualOrderKeys.length ? nowPlayingManualOrderKeys : resolvedNowPlayingManualOrderKeys)
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
      nowPlayingManualOrderKeys,
      persistBacklogManualOrder,
      persistSmartListManualOrder,
      playNextManualOrderKeys,
      readNextManualOrderKeys,
      resolvedNowPlayingManualOrderKeys,
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
        nav !== "now-playing" &&
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
        startTimeMs: performance.now(),
      };

      wishlistPointerDragRef.current = nextDrag;
      wishlistDragHoverTargetRef.current = null;
      wishlistDragHoverPlacementRef.current = null;
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
      const isTouchLike = event.pointerType === "touch" || event.pointerType === "pen" || isMobileLayout;
      const dragActivationThreshold = isTouchLike ? 22 : 2;
      const elapsedMs = performance.now() - (currentDrag.startTimeMs ?? 0);
      const meetsTouchActivation = !isTouchLike || (distance >= dragActivationThreshold && elapsedMs >= 180);
      const active = currentDrag.active || meetsTouchActivation;

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

      const target = findWishlistDragTarget(
        nextDrag.pointerX,
        nextDrag.pointerY,
        currentDrag.key,
        nextDrag.dragWidth,
        nextDrag.dragHeight
      );
      if (!target) {
        if (wishlistDragHoverTargetRef.current !== null) {
          wishlistDragHoverTargetRef.current = null;
          wishlistDragHoverPlacementRef.current = null;
          setWishlistDragHoverKey(null);
        }
        return;
      }
      if (
        target.key === wishlistDragHoverTargetRef.current &&
        target.placement === wishlistDragHoverPlacementRef.current
      ) {
        return;
      }
      if (target.key !== wishlistDragHoverTargetRef.current) {
        setWishlistDragHoverKey(target.key);
      }
      wishlistDragHoverTargetRef.current = target.key;
      wishlistDragHoverPlacementRef.current = target.placement;
      reorderWishlistDuringPointerDrag(currentDrag.key, target.key, target.placement);
    },
    [activateWishlistPointerDrag, findWishlistDragTarget, isMobileLayout, reorderWishlistDuringPointerDrag, scheduleWishlistDragVisual]
  );

  const handleWishlistGlobalPointerEnd = useCallback(
    (event: PointerEvent) => {
      const currentDrag = wishlistPointerDragRef.current;
      if (!currentDrag || currentDrag.pointerId !== event.pointerId) return;
      const dropDrag: WishlistPointerDrag = {
        ...currentDrag,
        pointerX: event.clientX,
        pointerY: event.clientY,
      };
      if (dropDrag.active) {
        const finalTarget = findWishlistDragTarget(
          dropDrag.pointerX,
          dropDrag.pointerY,
          currentDrag.key,
          dropDrag.dragWidth,
          dropDrag.dragHeight
        );
        if (finalTarget) {
          reorderWishlistDuringPointerDrag(
            currentDrag.key,
            finalTarget.key,
            finalTarget.placement
          );
        }
      }
      finishWishlistPointerDrag(event.pointerId);
    },
    [findWishlistDragTarget, finishWishlistPointerDrag, reorderWishlistDuringPointerDrag]
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
    const isCurrentToken = (value?: string) => {
      const token = normalizeStatus(value);
      return (
        token === "now playing" ||
        token === "playing" ||
        token === "reading" ||
        token === "currently reading" ||
        token === "in progress" ||
        token === "paused" ||
        token === "watching" ||
        token === "currently watching" ||
        token === "started" ||
        token === "watch next" ||
        token === "pending return"
      );
    };
    const isCompletedOrWatchedToken = (value?: string) => {
      const token = normalizeStatus(value);
      return token === "completed" || token === "watched";
    };
    const isAbandonedToken = (value?: string) => normalizeStatus(value) === "abandoned";
    const currentYear = new Date().getFullYear().toString();

    const wishlistBooks = allBooks.filter((b) => {
      const isWishlist = hasWishlistOwnership(b.ownership);
      const isBacklog = normalizeStatus(b.status) === "backlog";
      return isWishlist || isBacklog;
    }).length;
    const nowPlayingItemsCount =
      allBooks.filter((b) => NOW_PLAYING_BOOK_STATUS_VALUES.has(normalizeStatus(b.status))).length +
      allShows.filter((s) =>
        NOW_PLAYING_TV_STATUS_VALUES.has(normalizeStatus(s.watchStatus || s.watched || s.showStatus))
      ).length +
      allMovies.filter((m) =>
        NOW_PLAYING_MOVIE_STATUS_VALUES.has(
          normalizeStatus(m.watchStatus || m.watched || m.status || m.movieStatus)
        )
      ).length +
      allGames.filter((g) =>
        NOW_PLAYING_GAME_STATUS_VALUES.has(normalizeStatus(g.status || g.playStatus || g.gameStatus))
      ).length;
    const playNextGames = allGames.filter((g) =>
      PLAY_NEXT_STATUS_VALUES.has(normalizeStatus(g.status || g.playStatus || g.gameStatus))
    ).length;
    const wishlistGames = allGames.filter((g) => hasWishlistOwnership(g.ownership)).length;
    const watchlistTv = allShows.filter((s) => {
      const status = normalizeStatus(s.watchStatus);
      return status !== "completed" && status !== "abandoned";
    }).length;
    const watchlistMovies = allMovies.filter((m) => !isMovieWatched(m) && !isMovieAbandonedStatus(m)).length;
    const current = allBooks.filter((b) => isCurrentToken(b.status)).length + allShows.filter((s) => isCurrentToken(s.watchStatus)).length + allMovies.filter((m) => isCurrentToken(m.watchStatus) || isCurrentToken(m.status) || isCurrentToken(m.movieStatus)).length + allGames.filter((g) => isCurrentToken(g.status) || isCurrentToken(g.playStatus) || isCurrentToken(g.gameStatus)).length;
    const completed = allBooks.filter((b) => isCompletedOrWatchedToken(b.status)).length + allShows.filter((s) => Boolean(safeStr(s.dateCompleted)) || isCompletedOrWatchedToken(s.watchStatus) || isCompletedOrWatchedToken(s.showStatus) || normalizeStatus(s.watched) === "true").length + allMovies.filter((m) => isMovieWatched(m) || isCompletedOrWatchedToken(m.watchStatus) || isCompletedOrWatchedToken(m.status) || isCompletedOrWatchedToken(m.movieStatus)).length + allGames.filter((g) => isCompletedOrWatchedToken(g.status) || isCompletedOrWatchedToken(g.playStatus) || isCompletedOrWatchedToken(g.gameStatus) || normalizeStatus(g.completed) === "true").length;
    const abandoned = allBooks.filter((b) => isAbandonedToken(b.status)).length + allShows.filter((s) => isAbandonedToken(s.watchStatus) || isAbandonedToken(s.showStatus)).length + allMovies.filter((m) => isAbandonedToken(m.watchStatus) || isAbandonedToken(m.watched)).length + allGames.filter((g) => isAbandonedToken(g.status) || isAbandonedToken(g.playStatus) || isAbandonedToken(g.gameStatus)).length;
    const yearThis =
      allBooks.filter((b) => getYearToken(b.completedDate) === currentYear).length +
      allShows.filter((s) => {
        const watchYears = new Set([getYearToken(s.dateCompleted), ...getYearTokens(s.tag)].filter(Boolean));
        return watchYears.has(currentYear);
      }).length +
      allMovies.filter((m) => safeStr(m.tag) === currentYear).length +
      allGames.filter((g) => safeStr(g.yearPlayed) === currentYear).length;

    return {
      movies: allMovies.filter((m) => isMovieWatched(m)).length,
      tv: allShows.filter((s) => normalizeStatus(s.watchStatus) !== "backlog").length,
      books: allBooks.filter((b) => hasOwnedOwnership(b.ownership)).length,
      games: allGames.filter((g) => !hasWishlistOwnership(g.ownership)).length,
      nowPlaying: nowPlayingItemsCount,
      playNext: playNextGames,
      wishlistBooks,
      wishlist: wishlistGames,
      watchlistMovies,
      watchlistTv,
      current,
      completed,
      abandoned,
      yearThis,
    };
  }, [allShows, allBooks, allMovies, allGames, hasOwnedOwnership, hasWishlistOwnership, isMovieWatched, normalizeStatus]);

  const postersPerShelf = useMemo(() => {
    const size = isSimpleShelfPresentation
      ? simpleShelfPosterSize
      : nav === "books"
        ? mobileAdjustedPosterSizeBooks
        : nav === "movies"
          ? mobileAdjustedPosterSizeMovies
          : nav === "games" || nav === "play-next"
            ? mobileAdjustedPosterSizeGames
            : mobileAdjustedPosterSizeTv;
    const usable = Math.max(0, stageWidth - shelfSidePadding * 2);
    return Math.max(1, Math.floor((usable + shelfGap) / (size + shelfGap)));
  }, [
    isSimpleShelfPresentation,
    mobileAdjustedPosterSizeBooks,
    mobileAdjustedPosterSizeGames,
    mobileAdjustedPosterSizeMovies,
    mobileAdjustedPosterSizeTv,
    nav,
    shelfSidePadding,
    shelfGap,
    simpleShelfPosterSize,
    stageWidth,
  ]);

  const getItemVisualLayout = useCallback((item: any) => {
    const isBook = item.__type === "book";
    const isMovie = item.__type === "movie";
    const isGame = item.__type === "game";
    const isAudiobook = isAudiobookItem(item);
    const coverRowHeight = activeCoverScalePct <= 0 ? 0 : shelfRowHeight;
    const targetHeight = isAudiobook
      ? Math.round(coverRowHeight * (mediaCoverSizePct.audiobooks / 100))
      : isBook
        ? Math.round(coverRowHeight * (mediaCoverSizePct.books / 100))
        : isMovie
          ? Math.round(coverRowHeight * (mediaCoverSizePct.movies / 100))
          : isGame
            ? Math.round(coverRowHeight * (mediaCoverSizePct.games / 100))
            : Math.round(coverRowHeight * (mediaCoverSizePct.tv / 100));
    const coverSrc = getDisplayCoverUrl(item);
    const coverAsset = coverSrc ? coverTrimAssets[coverSrc] : null;
    const fallbackAspect = isAudiobook
      ? 1
      : isBook
        ? 0.66
        : isGame
          ? 1.25
          : 0.67;
    const coverAspect = isAudiobook ? 1 : coverAsset?.aspect || fallbackAspect;
    const caseHeight = Math.max(0, targetHeight);
    const caseWidth = Math.max(0, Math.round(caseHeight * coverAspect));
    return { caseWidth, caseHeight, visualLeft: 0, visualWidth: caseWidth };
  }, [
    isAudiobookItem,
    activeCoverScalePct,
    mediaCoverSizePct,
    shelfRowHeight,
    coverTrimAssets,
    getDisplayCoverUrl,
  ]);

  const shelves = useMemo(() => {
    const usable = Math.max(0, stageWidth - shelfSidePadding * 2);
    const out: any[][] = [];
    // Pack every shelf by rendered visual width so row edges stay consistent across all views.
    let currentShelf: any[] = [];
    let currentWidth = 0;
    let currentTvWatchlistSection: TvWatchlistSectionKey | null = null;
    const isGroupedTvWatchlist = nav === "watchlist-tv";

    for (let i = 0; i < shows.length; i++) {
      const show = shows[i];
      const { caseWidth } = getItemVisualLayout(show);
      const itemWidth = caseWidth + (currentShelf.length > 0 ? shelfGap : 0);
      const nextTvWatchlistSection = isGroupedTvWatchlist ? getTvWatchlistSectionForItem(show) : null;
      const shouldStartNewTvWatchlistSection =
        isGroupedTvWatchlist &&
        currentShelf.length > 0 &&
        nextTvWatchlistSection !== currentTvWatchlistSection;

      if (shouldStartNewTvWatchlistSection || (currentShelf.length > 0 && currentWidth + itemWidth > usable)) {
        out.push(currentShelf);
        currentShelf = [show];
        currentWidth = caseWidth;
        currentTvWatchlistSection = nextTvWatchlistSection;
      } else {
        currentShelf.push(show);
        currentWidth += itemWidth;
        currentTvWatchlistSection = currentTvWatchlistSection ?? nextTvWatchlistSection;
      }
    }

    if (currentShelf.length > 0) out.push(currentShelf);

    const headerOffset = 140;
    const minShelves = Math.max(1, Math.ceil(Math.max(0, viewportH - headerOffset) / shelfRowHeight));
    while (out.length < minShelves) out.push([]);

    return out;
  }, [shows, viewportH, shelfRowHeight, stageWidth, shelfSidePadding, shelfGap, getItemVisualLayout, nav]);

  const shelfHeights = useMemo(() => {
    const upcomingExtra = isUpcomingView ? UPCOMING_LABEL_SPACE : 0;
    const titleExtra = coverTitlesVisible ? COVER_TITLE_LABEL_SPACE : 0;
    // For upcoming, compute a fixed offset that matches the current look for the
    // most common (game) cover type, then apply it per-shelf based on each row's
    // tallest cover so the gap between label text and the next row's tallest cover
    // stays consistent regardless of media type.
    const upcomingFixedOffset = isUpcomingView
      ? (shelfRowHeight + UPCOMING_LABEL_SPACE) - Math.round(shelfRowHeight * (mediaCoverSizePct.games / 100))
      : 0;
    return shelves.map((shelfShows, shelfIndex) => {
      const tvWatchlistSectionSpace =
        nav === "watchlist-tv" &&
        shelfShows.length > 0 &&
        (
          shelfIndex === 0 ||
          getTvWatchlistSectionForItem(shelfShows[0]) !== getTvWatchlistSectionForItem(shelves[shelfIndex - 1]?.[0])
        )
          ? TV_WATCHLIST_SECTION_HEADER_SPACE
          : 0;
      if (isUpcomingView) {
        if (!shelfShows.length) return shelfRowHeight + upcomingExtra + tvWatchlistSectionSpace + titleExtra;
        const maxCoverH = shelfShows.reduce((max, show) => {
          const { caseHeight } = getItemVisualLayout(show);
          return Math.max(max, caseHeight);
        }, 0);
        return Math.max(1, maxCoverH + upcomingFixedOffset + tvWatchlistSectionSpace + titleExtra);
      }
      if (nav !== "books" && nav !== "games") return shelfRowHeight + tvWatchlistSectionSpace + titleExtra;
      if (!shelfShows.length) return shelfRowHeight + tvWatchlistSectionSpace + titleExtra;
      const tallestCover = shelfShows.reduce((maxHeight, show) => {
        const { caseHeight } = getItemVisualLayout(show);
        return Math.max(maxHeight, caseHeight);
      }, 0);
      return Math.max(1, tallestCover + 15 + tvWatchlistSectionSpace + titleExtra);
    });
  }, [coverTitlesVisible, getItemVisualLayout, isUpcomingView, mediaCoverSizePct.games, nav, shelfRowHeight, shelves]);

  const shelfOffsets = useMemo(() => {
    const offsets: number[] = [];
    let runningOffset = 0;
    for (const height of shelfHeights) {
      offsets.push(runningOffset);
      runningOffset += height;
    }
    return { offsets, totalHeight: runningOffset };
  }, [shelfHeights]);

  const insetEditorOpen = settingsPopupOpen && settingsOpen.framePosition;

  const shelfRenderWindow = useMemo(() => {
    const localScroll = Math.max(0, windowScrollY - stageTopAbs);
    const viewH = Math.max(1, viewportH);
    if (nav !== "books" && nav !== "watchlist-tv" && !isUpcomingView) {
      const effectiveRowH = shelfRowHeight;
      const start = Math.max(0, Math.floor(localScroll / effectiveRowH) - 4);
      const end = Math.min(shelves.length, Math.ceil((localScroll + viewH) / effectiveRowH) + 4);
      return {
        start,
        end,
        padTop: start * effectiveRowH,
        padBottom: Math.max(0, (shelves.length - end) * effectiveRowH),
      };
    }
    const rowCount = shelves.length;
    const offsets = shelfOffsets.offsets;
    const heights = shelfHeights;
    let start = 0;
    let end = rowCount;
    let low = 0;
    let high = rowCount - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const rowBottom = offsets[mid] + heights[mid];
      if (rowBottom < localScroll) {
        low = mid + 1;
      } else {
        start = mid;
        high = mid - 1;
      }
    }
    start = Math.max(0, start - 4);
    low = 0;
    high = rowCount - 1;
    const targetBottom = localScroll + viewH;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (offsets[mid] > targetBottom) {
        high = mid - 1;
      } else {
        end = mid + 1;
        low = mid + 1;
      }
    }
    end = Math.min(rowCount, end + 4);
    const padTop = offsets[start] || 0;
    const padBottom = Math.max(0, shelfOffsets.totalHeight - (end < rowCount ? offsets[end] : shelfOffsets.totalHeight));
    return {
      start,
      end,
      padTop,
      padBottom,
    };
  }, [isUpcomingView, nav, shelfHeights, shelfOffsets.totalHeight, shelfOffsets.offsets, shelfRowHeight, shelves.length, stageTopAbs, viewportH, windowScrollY]);

  const visibleShelves = useMemo(
    () => shelves.slice(shelfRenderWindow.start, shelfRenderWindow.end),
    [shelfRenderWindow.end, shelfRenderWindow.start, shelves]
  );
  const headerLocalScrollY = Math.max(0, windowScrollY - stageTopAbs);
  const stickyHeaderOverlayOpacityRaw = Math.max(0, Math.min(1, (headerLocalScrollY + 6) / 28));
  const stickyHeaderOverlayOpacity =
    windowScrollY > 2 ? Math.max(0.26, stickyHeaderOverlayOpacityRaw) : stickyHeaderOverlayOpacityRaw;
  const stickyHeaderSimpleBackground = hexToRgba(
    simpleShelfBackgroundColor,
    0.8 * stickyHeaderOverlayOpacity,
    simpleShelfBackgroundColor
  );
  const stickyHeaderDarkBackground = `rgba(8, 16, 28, ${0.78 * stickyHeaderOverlayOpacity})`;
  const stickyHeaderBlurPx = 7 * stickyHeaderOverlayOpacity;
  const mobileLibraryMenuItems: Array<{ key: NavKey; label: string; count?: number }> = [
    { key: "home", label: "Home" },
    { key: "books", label: "Books", count: stats.books },
    { key: "movies", label: "Movies", count: stats.movies },
    { key: "tv", label: "TV Shows", count: stats.tv },
    { key: "games", label: "Games", count: stats.games },
  ];
  const mobileBacklogMenuItems: Array<{ key: NavKey; label: string; count?: number }> = [
    { key: "now-playing", label: "Now Playing", count: stats.nowPlaying },
    { key: "play-next", label: "Play Next", count: stats.playNext },
    { key: "wishlist-books", label: "Read Next", count: stats.wishlistBooks },
    { key: "watchlist-movies", label: "Watchlist Movies", count: stats.watchlistMovies },
    { key: "watchlist-tv", label: "Watchlist TV", count: stats.watchlistTv },
    { key: "wishlist", label: "Wishlist Games", count: stats.wishlist },
  ];
  const mobileSmartListMenuItems: Array<{ key: NavKey; label: string }> = [
    { key: "year-this", label: "This Year" },
    { key: "current", label: "Current" },
    { key: "completed", label: "Completed" },
    { key: "abandoned", label: "Abandoned" },
  ];
  const mobileBottomDockVisible = isMobileLayout && nav !== "statistics" && nav !== "cover-sync";
  const mobileSidebarShowsMediaFiltersOnly = nav === "books" || nav === "movies" || nav === "tv" || nav === "games";
  const isManualSortView =
    nav === "wishlist" ||
    nav === "now-playing" ||
    nav === "wishlist-books" ||
    nav === "play-next" ||
    nav === "watchlist-movies" ||
    nav === "watchlist-tv" ||
    Boolean(manualSortableSmartListId);
  const closeAllDetails = useCallback(() => {
    setBookDetailItem(null);
    setMovieDetailItem(null);
    setTvDetailItem(null);
    setGameDetailItem(null);
  }, []);
  const handleMobileBack = useCallback(() => {
    if (bookDetailItem || movieDetailItem || tvDetailItem || gameDetailItem) {
      closeAllDetails();
      return;
    }
    if (mobileSidebarOpen) {
      setMobileSidebarOpen(false);
      return;
    }
    if (mobileSettingsOpen) {
      setMobileSettingsOpen(false);
      return;
    }
    if (mobileSearchOpen) {
      setMobileSearchOpen(false);
      return;
    }
    // The mobile Library view runs with nav === "home" + mobileFullLibraryOpen,
    // so closing it (not a nav change) is what returns to the home landing.
    if (mobileFullLibraryOpen) {
      setMobileFullLibraryOpen(false);
      setQuery("");
      return;
    }
    if (nav !== "home") setNav("home");
  }, [bookDetailItem, closeAllDetails, gameDetailItem, mobileFullLibraryOpen, mobileSearchOpen, mobileSettingsOpen, mobileSidebarOpen, movieDetailItem, nav, tvDetailItem]);
  // Reorder mode is per-visit: leaving the view always turns it back off.
  useEffect(() => {
    setMobileSortEditMode(false);
  }, [nav]);
  const handleMobileHome = useCallback(() => {
    closeAllDetails();
    setMobileFullLibraryOpen(false);
    setNav("home");
    setQuery("");
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
    setMobileSearchOpen(false);
  }, [closeAllDetails]);
  const handleMobileFullLibrary = useCallback(() => {
    closeAllDetails();
    activateHomeLibrary();
    setMobileFullLibraryOpen(true);
    setMobileSidebarOpen(false);
    setMobileSettingsOpen(false);
    setMobileSearchOpen(false);
  }, [activateHomeLibrary, closeAllDetails]);
  const mobileLandingVisible =
    isMobileLayout &&
    nav === "home" &&
    !mobileFullLibraryOpen &&
    !query &&
    !bookDetailItem &&
    !movieDetailItem &&
    !tvDetailItem &&
    !gameDetailItem;
  const [mobileLandingCoverSeed] = useState<number>(() => Math.floor(Math.random() * 2147483647));
  const buildMobileCardCovers = useCallback((items: any[], count = 3): string[] => {
    const hash = (value: string) => {
      let h = 2166136261;
      for (let i = 0; i < value.length; i += 1) {
        h ^= value.charCodeAt(i);
        h = Math.imul(h, 16777619);
      }
      return h >>> 0;
    };
    const ranked = items
      .map((entry, index) => {
        const url = safeStr(getDisplayCoverUrl(entry));
        if (!url) return null;
        const score = hash(`${mobileLandingCoverSeed}:${index}:${url}`);
        return { url, score };
      })
      .filter((entry): entry is { url: string; score: number } => Boolean(entry))
      .sort((a, b) => a.score - b.score);
    return ranked.slice(0, count).map((entry) => entry.url);
  }, [getDisplayCoverUrl, mobileLandingCoverSeed]);
  const mobileLandingCards = useMemo(() => {
    const allLibraryItems = [
      ...allBooks.map((item) => ({ ...item, __type: "book" })),
      ...allMovies.map((item) => ({ ...item, __type: "movie" })),
      ...allShows.map((item) => ({ ...item, __type: "tv" })),
      ...allGames.map((item) => ({ ...item, __type: "game" })),
    ];
    const cards = [
      { key: "library", label: "Library", iconKey: "home", iconFallback: "/icon-home.png", navKey: "home" as NavKey, items: allLibraryItems, action: "library" as const },
      { key: "books", label: "Books", iconKey: "books", iconFallback: "/icon-books.png", navKey: "books" as NavKey, items: allBooks },
      { key: "movies", label: "Movies", iconKey: "movies", iconFallback: "/icon-movies.png", navKey: "movies" as NavKey, items: allMovies },
      { key: "tv", label: "TV Shows", iconKey: "tv", iconFallback: "/icon-tv.png", navKey: "tv" as NavKey, items: allShows },
      { key: "games", label: "Games", iconKey: "games", iconFallback: "/icon-games.png", navKey: "games" as NavKey, items: allGames },
      { key: "year-this", label: "This Year", iconKey: "year-this", iconFallback: "/icon-current.png", navKey: "year-this" as NavKey, items: allLibraryItems },
      { key: "current", label: "Current", iconKey: "current", iconFallback: "/icon-current.png", navKey: "current" as NavKey, items: nowPlayingItems },
      { key: "completed", label: "Completed", iconKey: "completed", iconFallback: "/icon-completed.png", navKey: "completed" as NavKey, items: allBooks },
      { key: "abandoned", label: "Abandoned", iconKey: "abandoned", iconFallback: "/icon-abandoned.png", navKey: "abandoned" as NavKey, items: allLibraryItems },
    ];
    return cards.map((card) => ({
      ...card,
      icon: getSidebarIconSrc(card.iconKey, card.iconFallback),
      covers: buildMobileCardCovers(card.items || [], 3),
    }));
  }, [allBooks, allGames, allMovies, allShows, buildMobileCardCovers, nowPlayingItems, getSidebarIconSrc]);
  const activeBookDetailKey =
    bookDetailItem && getMediaType(bookDetailItem) === "book" ? getMediaItemKey(bookDetailItem) : "";
  const activeBookDetailPalette =
    bookDetailPalette?.key === activeBookDetailKey ? bookDetailPalette : null;
  const activeBookDetailBackground =
    bookDetailItem && getMediaType(bookDetailItem) === "book" && activeBookDetailPalette
      ? buildDetailGradientBackground(activeBookDetailPalette.start, activeBookDetailPalette.end)
      : null;
  const handleBookDetailPaletteChange = useCallback((nextPalette: { start: string; end: string } | null) => {
    if (!nextPalette || !bookDetailItem || getMediaType(bookDetailItem) !== "book") {
      setBookDetailPalette(null);
      return;
    }
    setBookDetailPalette({
      key: getMediaItemKey(bookDetailItem),
      start: nextPalette.start,
      end: nextPalette.end,
    });
  }, [bookDetailItem]);

  const activeMovieDetailKey = movieDetailItem ? getMediaItemKey(movieDetailItem) : "";
  const activeMovieDetailPalette = movieDetailPalette?.key === activeMovieDetailKey ? movieDetailPalette : null;
  const activeMovieDetailBackground = movieDetailItem && activeMovieDetailPalette
    ? buildDetailGradientBackground(activeMovieDetailPalette.start, activeMovieDetailPalette.end)
    : null;
  const handleMovieDetailPaletteChange = useCallback((nextPalette: { start: string; end: string } | null) => {
    if (!nextPalette || !movieDetailItem) { setMovieDetailPalette(null); return; }
    setMovieDetailPalette({ key: getMediaItemKey(movieDetailItem), start: nextPalette.start, end: nextPalette.end });
  }, [movieDetailItem]);

  const activeTvDetailKey = tvDetailItem ? getMediaItemKey(tvDetailItem) : "";
  const activeTvDetailPalette = tvDetailPalette?.key === activeTvDetailKey ? tvDetailPalette : null;
  const activeTvDetailBackground = tvDetailItem && activeTvDetailPalette
    ? buildDetailGradientBackground(activeTvDetailPalette.start, activeTvDetailPalette.end)
    : null;
  const handleTvDetailPaletteChange = useCallback((nextPalette: { start: string; end: string } | null) => {
    if (!nextPalette || !tvDetailItem) { setTvDetailPalette(null); return; }
    setTvDetailPalette({ key: getMediaItemKey(tvDetailItem), start: nextPalette.start, end: nextPalette.end });
  }, [tvDetailItem]);

  const activeGameDetailKey = gameDetailItem ? getMediaItemKey(gameDetailItem) : "";
  const activeGameDetailPalette = gameDetailPalette?.key === activeGameDetailKey ? gameDetailPalette : null;
  const activeGameDetailBackground = gameDetailItem && activeGameDetailPalette
    ? buildDetailGradientBackground(activeGameDetailPalette.start, activeGameDetailPalette.end)
    : null;
  const handleGameDetailPaletteChange = useCallback((nextPalette: { start: string; end: string } | null) => {
    if (!nextPalette || !gameDetailItem) { setGameDetailPalette(null); return; }
    setGameDetailPalette({ key: getMediaItemKey(gameDetailItem), start: nextPalette.start, end: nextPalette.end });
  }, [gameDetailItem]);

  const sidebarFloatOverPageBackground =
    Boolean(activeBookDetailBackground) ||
    Boolean(activeMovieDetailBackground) ||
    Boolean(activeTvDetailBackground) ||
    Boolean(activeGameDetailBackground);
  const sidebarDetailGradientActive = sidebarFloatOverPageBackground;
  const sidebarDetailShellBackground = sidebarShellBackground;
  const sidebarDetailBackplateOpacity = sidebarBackplateOpacity;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: activeMovieDetailBackground
          ? activeMovieDetailBackground
          : activeTvDetailBackground
          ? activeTvDetailBackground
          : activeGameDetailBackground
          ? activeGameDetailBackground
          : activeBookDetailBackground
          ? activeBookDetailBackground
          : isSimpleShelfPresentation
            ? simplePresentationBackground
            : "#ececec",
        color: isSimpleShelfPresentation ? simpleHeaderStrongTextColor : "#111",
        position: "relative",
        overflowX: isMobileLayout ? "hidden" : undefined,
        "--neon-sync-offset": isElectricBlueSidebarTheme ? neonSyncStartOffset : "0s",
      } as CSSProperties}
    >
      {startupLockVisible ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99999,
            background: "linear-gradient(180deg, rgba(12, 18, 31, 0.98) 0%, rgba(7, 11, 20, 0.98) 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              border: "4px solid rgba(117, 161, 234, 0.32)",
              borderTopColor: "rgba(117, 161, 234, 0.98)",
              animation: "cdlSpin 1s linear infinite",
            }}
          />
        </div>
      ) : null}
      {nav !== "statistics" && nav !== "cover-sync" ? (
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
            background: "transparent",
            boxShadow: "none",
          }}
        />
      ) : null}
      {isMobileLayout && (mobileSidebarOpen || mobileSettingsOpen) ? (
        <button
          aria-label="Close mobile panel"
          onClick={() => {
            setMobileSidebarOpen(false);
            setMobileSettingsOpen(false);
          }}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: mobileBottomDockVisible ? mobileBottomDockReservedSpace : 0,
            border: "none",
            margin: 0,
            padding: 0,
            background: "rgba(0, 0, 0, 0.42)",
            zIndex: 2490,
            cursor: "pointer",
          }}
        />
      ) : null}
      {isMobileLayout && mobileSidebarOpen ? (
        <div
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 45px)",
            left: 0,
            bottom: mobileBottomDockVisible ? mobileBottomDockReservedSpace : 0,
            width: "min(90vw, 360px)",
            zIndex: 2500,
            background: mobilePanelBackground,
            borderRight: mobilePanelBorder,
            boxShadow: mobilePanelLeftShadow,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: mobilePanelDivider,
              background: mobilePanelCardBackground,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800, color: mobilePanelTextColor, letterSpacing: "0.03em" }}>
              {mobileSidebarShowsMediaFiltersOnly ? "FILTERS" : "MENU"}
            </span>
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              style={{
                ...mobilePanelButtonStyle,
                width: "auto",
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Close
            </button>
          </div>
          <div style={{ overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            {isManualSortView ? (
              <button
                type="button"
                onClick={() => setMobileSortEditMode((v) => !v)}
                aria-pressed={mobileSortEditMode}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  padding: "11px 12px",
                  borderRadius: 12,
                  border: mobileSortEditMode ? "1px solid rgba(91, 158, 72, 0.55)" : mobilePanelBorder,
                  background: mobileSortEditMode ? "rgba(105, 190, 88, 0.18)" : mobilePanelCardBackground,
                  color: mobilePanelTextColor,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.04em" }}>REORDER COVERS</span>
                  <span style={{ fontSize: 10.5, fontWeight: 500, opacity: 0.7 }}>
                    Turn on to drag-sort. Off keeps scrolling safe.
                  </span>
                </span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 900, color: mobileSortEditMode ? "#1f6f35" : undefined }}>
                  <span
                    aria-hidden
                    style={{ width: 9, height: 9, borderRadius: "50%", background: mobileSortEditMode ? "#41b65c" : "#9aa5b1" }}
                  />
                  {mobileSortEditMode ? "On" : "Off"}
                </span>
              </button>
            ) : null}
            {mobileSidebarShowsMediaFiltersOnly && nav === "movies" ? (
              <>
                <div style={mobilePanelSectionHeadingStyle}>STATUS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {["Started", "Watched", "Backlog", "Abandoned"].map((status) => {
                    const active = movieWatchFilter === status;
                    return (
                      <button
                        key={`mobile-movie-status-${status}`}
                        type="button"
                        onClick={() => setMovieWatchFilter(active ? null : status)}
                        style={{
                          border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder,
                          background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground,
                          color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor,
                          borderRadius: 999,
                          padding: "5px 9px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {status}
                      </button>
                    );
                  })}
                </div>
                <div style={mobilePanelSectionHeadingStyle}>TAGS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                  {movieTags.map((tag) => {
                    const active = movieTagFilter === tag;
                    return (
                      <button
                        key={`mobile-movie-tag-${tag}`}
                        type="button"
                        onClick={() => setMovieTagFilter(active ? null : tag)}
                        style={{
                          border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder,
                          background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground,
                          color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor,
                          borderRadius: 999,
                          padding: "5px 9px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {tag} ({movieTagCounts[tag] ?? 0})
                      </button>
                    );
                  })}
                </div>
                <div style={mobilePanelSectionHeadingStyle}>GENRE</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                  {movieGenres.map((genre) => {
                    const active = movieGenreFilter === genre;
                    return (
                      <button
                        key={`mobile-movie-genre-${genre}`}
                        type="button"
                        onClick={() => setMovieGenreFilter(active ? null : genre)}
                        style={{
                          border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder,
                          background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground,
                          color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor,
                          borderRadius: 999,
                          padding: "5px 9px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        {genre} ({movieGenreCounts[genre] ?? 0})
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
            {mobileSidebarShowsMediaFiltersOnly && nav === "games" ? (
              <>
                <div style={mobilePanelSectionHeadingStyle}>PLATFORM</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                  {gamePlatformOptions.map((option) => {
                    const active = gamePlatformFilter === option;
                    return (
                      <button key={`mobile-game-platform-${option}`} type="button" onClick={() => setGamePlatformFilter(active ? null : option)} style={{ border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder, background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground, color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {option} ({gamePlatformCounts[option] ?? 0})
                      </button>
                    );
                  })}
                </div>
                <div style={mobilePanelSectionHeadingStyle}>OWNERSHIP</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {gameOwnershipOptions.map((option) => {
                    const active = gameOwnershipFilter === option;
                    return (
                      <button key={`mobile-game-ownership-${option}`} type="button" onClick={() => setGameOwnershipFilter(active ? null : option)} style={{ border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder, background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground, color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {option} ({gameOwnershipCounts[option] ?? 0})
                      </button>
                    );
                  })}
                </div>
                <div style={mobilePanelSectionHeadingStyle}>FORMAT</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {gameFormatOptions.map((option) => {
                    const active = gameFormatFilter === option;
                    return (
                      <button key={`mobile-game-format-${option}`} type="button" onClick={() => setGameFormatFilter(active ? null : option)} style={{ border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder, background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground, color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {option} ({gameFormatCounts[option] ?? 0})
                      </button>
                    );
                  })}
                </div>
                <div style={mobilePanelSectionHeadingStyle}>YEAR PLAYED</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 140, overflowY: "auto", paddingRight: 2 }}>
                  {gameYearPlayedOptions.map((option) => {
                    const active = gameYearPlayedFilter === option;
                    return (
                      <button key={`mobile-game-year-${option}`} type="button" onClick={() => setGameYearPlayedFilter(active ? null : option)} style={{ border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder, background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground, color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {option} ({gameYearPlayedCounts[option] ?? 0})
                      </button>
                    );
                  })}
                </div>
                <div style={mobilePanelSectionHeadingStyle}>GENRES</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                  {gameGenres.map((option) => {
                    const active = gameGenreFilter === option;
                    return (
                      <button key={`mobile-game-genre-${option}`} type="button" onClick={() => setGameGenreFilter(active ? null : option)} style={{ border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder, background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground, color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {option} ({gameGenreCounts[option] ?? 0})
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
            {mobileSidebarShowsMediaFiltersOnly && nav === "tv" ? (
              <>
                <div style={mobilePanelSectionHeadingStyle}>STATUS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {watchStatuses.map((status) => {
                    const active = watchFilter === status;
                    return (
                      <button key={`mobile-tv-watch-status-${status}`} type="button" onClick={() => setWatchFilter(active ? null : status)} style={{ border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder, background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground, color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {status}
                      </button>
                    );
                  })}
                </div>
                <div style={mobilePanelSectionHeadingStyle}>SHOW STATUS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {showStatuses.map((status) => {
                    const active = showFilter === status;
                    return (
                      <button key={`mobile-tv-show-status-${status}`} type="button" onClick={() => setShowFilter(active ? null : status)} style={{ border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder, background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground, color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {status}
                      </button>
                    );
                  })}
                </div>
                <div style={mobilePanelSectionHeadingStyle}>TAGS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 180, overflowY: "auto", paddingRight: 2 }}>
                  {tvTags.map((tag) => {
                    const active = tagFilter === tag;
                    return (
                      <button key={`mobile-tv-tag-${tag}`} type="button" onClick={() => setTagFilter(active ? null : tag)} style={{ border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder, background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground, color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor, borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                        {tag} ({tvTagCounts[tag] ?? 0})
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
            <div style={mobilePanelCardStyle}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <span style={mobilePanelSectionHeadingStyle}>
                  {`${mobileCoverScaleGroup === "home" ? "HOME" : mobileCoverScaleGroup === "tv" ? "TV" : mobileCoverScaleGroup.toUpperCase()} COVER SIZE`}
                </span>
                <span style={{ fontSize: 11, fontWeight: 800, color: mobilePanelTextColor }}>
                  {`${mobileCoverScalePct}%`}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={250}
                step={1}
                value={mobileCoverScalePct}
                onChange={(event) => updateMobileCoverScalePct(mobileCoverScaleGroup, Number(event.target.value))}
                aria-label={`Scale ${mobileCoverScaleGroup} covers for mobile view`}
                style={{ width: "100%" }}
              />
            </div>
            {!mobileSidebarShowsMediaFiltersOnly ? <div style={mobilePanelSectionHeadingStyle}>LIBRARY</div> : null}
            {!mobileSidebarShowsMediaFiltersOnly ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mobileLibraryMenuItems.map((item) => {
                const active = nav === item.key;
                return (
                  <button
                    key={`mobile-library-${item.key}`}
                    type="button"
                    onClick={() => handleMobileNavSelect(item.key)}
                    style={{
                      ...getMobileMenuButtonStyle(active),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{item.label}</span>
                    {typeof item.count === "number" ? (
                      <span style={mobilePanelCountBadgeStyle}>
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div> : null}
            {nav === "books" ? (
              <>
                <div style={mobilePanelSectionHeadingStyle}>BOOK FILTERS</div>
                <div style={mobilePanelCardStyle}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: mobilePanelSectionLabelColor }}>Reading Status</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {readingStatuses.map((status) => {
                      const active = readingStatusFilter === status;
                      return (
                        <button
                          key={`mobile-reading-status-${status}`}
                          type="button"
                          onClick={() => setReadingStatusFilter(active ? null : status)}
                          style={{
                            border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder,
                            background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground,
                            color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor,
                            borderRadius: 999,
                            padding: "5px 9px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {status} ({readingStatusCounts[status] ?? 0})
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: mobilePanelSectionLabelColor }}>Formats</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {bookFormats.map((format) => {
                      const active = formatFilter === format;
                      return (
                        <button
                          key={`mobile-book-format-${format}`}
                          type="button"
                          onClick={() => setFormatFilter(active ? null : format)}
                          style={{
                            border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder,
                            background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground,
                            color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor,
                            borderRadius: 999,
                            padding: "5px 9px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {format} ({formatCounts[format] ?? 0})
                        </button>
                      );
                    })}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: mobilePanelSectionLabelColor }}>Series</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 140, overflowY: "auto", paddingRight: 2 }}>
                    {bookSeries.map((series) => {
                      const active = seriesFilter === series;
                      return (
                        <button
                          key={`mobile-book-series-${series}`}
                          type="button"
                          onClick={() => setSeriesFilter(active ? null : series)}
                          style={{
                            border: active ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder,
                            background: active ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground,
                            color: active ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor,
                            borderRadius: 999,
                            padding: "5px 9px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {series} ({seriesCounts[series] ?? 0})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}

            {!mobileSidebarShowsMediaFiltersOnly ? <div style={mobilePanelSectionHeadingStyle}>BACKLOG</div> : null}
            {!mobileSidebarShowsMediaFiltersOnly ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mobileBacklogMenuItems.map((item) => {
                const active = nav === item.key;
                return (
                  <button
                    key={`mobile-backlog-${item.key}`}
                    type="button"
                    onClick={() => handleMobileNavSelect(item.key)}
                    style={{
                      ...getMobileMenuButtonStyle(active),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{item.label}</span>
                    {typeof item.count === "number" ? (
                      <span style={mobilePanelCountBadgeStyle}>
                        {item.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div> : null}

            {!mobileSidebarShowsMediaFiltersOnly ? <div style={mobilePanelSectionHeadingStyle}>SMART LISTS</div> : null}
            {!mobileSidebarShowsMediaFiltersOnly ? <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {mobileSmartListMenuItems.map((item) => {
                const active = nav === item.key;
                return (
                  <button
                    key={`mobile-smart-${item.key}`}
                    type="button"
                    onClick={() => handleMobileNavSelect(item.key)}
                    style={{
                      ...getMobileMenuButtonStyle(active),
                      textAlign: "left",
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
              {customSmartLists.map((smartList) => {
                const active = nav === "smart-custom" && selectedSmartListId === smartList.id;
                return (
                  <button
                    key={`mobile-custom-smart-${smartList.id}`}
                    type="button"
                    onClick={() => handleMobileSmartListSelect(smartList)}
                    style={{
                      ...getMobileMenuButtonStyle(active),
                      textAlign: "left",
                    }}
                  >
                    {smartList.name}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => {
                  handleOpenSmartListBuilder();
                  setMobileSidebarOpen(false);
                  setMobileSettingsOpen(false);
                }}
                style={mobilePanelPrimaryButtonStyle}
              >
                + Add Smart List
              </button>
            </div> : null}

            {!mobileSidebarShowsMediaFiltersOnly ? <div style={mobilePanelSectionHeadingStyle}>DISCOVER</div> : null}
            {!mobileSidebarShowsMediaFiltersOnly ? <button
              type="button"
              onClick={openStatisticsView}
              style={{
                ...getMobileMenuButtonStyle(nav === "statistics"),
                textAlign: "left",
              }}
            >
              Statistics
            </button> : null}
            {!mobileSidebarShowsMediaFiltersOnly ? <button
              type="button"
              onClick={openRoadmapView}
              style={{
                ...getMobileMenuButtonStyle(nav === "roadmap"),
                textAlign: "left",
              }}
            >
              Roadmap
            </button> : null}
          </div>
        </div>
      ) : null}
      {isMobileLayout && mobileSettingsOpen ? (
        <div
          style={{
            position: "fixed",
            top: "calc(env(safe-area-inset-top, 0px) + 45px)",
            right: 0,
            bottom: mobileBottomDockVisible ? mobileBottomDockReservedSpace : 0,
            width: "min(90vw, 340px)",
            zIndex: 2500,
            background: mobilePanelBackground,
            borderLeft: mobilePanelBorder,
            boxShadow: mobilePanelRightShadow,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 12px",
              borderBottom: mobilePanelDivider,
              background: mobilePanelCardBackground,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 800, color: mobilePanelTextColor, letterSpacing: "0.03em" }}>
              SETTINGS
            </span>
            <button
              type="button"
              onClick={() => setMobileSettingsOpen(false)}
              style={{
                ...mobilePanelButtonStyle,
                width: "auto",
                borderRadius: 8,
                padding: "4px 8px",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              Close
            </button>
          </div>
          <div style={{ overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <button
              type="button"
              onClick={() => updateShowStatusIndicators(!showStatusIndicators)}
              style={{
                ...mobilePanelButtonStyle,
                border: showStatusIndicators ? mobilePanelActiveButtonBorder : mobilePanelButtonBorder,
                background: showStatusIndicators ? mobilePanelActiveButtonBackground : mobilePanelButtonBackground,
                color: showStatusIndicators ? mobilePanelActiveButtonTextColor : mobilePanelButtonTextColor,
                textAlign: "left",
              }}
            >
              Status Indicators: {showStatusIndicators ? "On" : "Off"}
            </button>
            <button
              type="button"
              onClick={clearAllFilters}
              style={mobilePanelButtonStyle}
            >
              Clear All Filters
            </button>
            <div
              style={{
                ...mobilePanelCardStyle,
                border: simpleShelfColorPanelBorder,
                background: simpleShelfColorPanelBackground,
              }}
            >
              <div style={{ ...mobilePanelSectionHeadingStyle, color: simpleShelfColorPanelTitleColor }}>SIMPLE BACKGROUND</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={simpleShelfColorSwatchStyle}>
                  <input
                    type="color"
                    value={simpleShelfBackgroundColor}
                    onChange={(event) => updateSimpleShelfBackgroundColor(event.target.value)}
                    aria-label="Simple mobile background color"
                    style={simpleShelfColorInputStyle}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: simpleShelfColorPanelTextColor }}>
                    {simpleShelfBackgroundColor.toUpperCase()}
                  </span>
                  <span style={{ fontSize: 10, color: simpleShelfColorPanelMutedTextColor }}>
                    Used to generate the Simple mobile and shelf gradient.
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setSortPopupOpen(true);
                setSettingsPopupOpen(false);
                setShowVersionNotes(false);
                setMobileSettingsOpen(false);
                setMobileSidebarOpen(false);
              }}
              style={mobilePanelButtonStyle}
            >
              Sort
            </button>
            <button
              type="button"
              onClick={() => {
                setSortPopupOpen(false);
                setSettingsPopupOpen(false);
                setShowVersionNotes(false);
                setAddModalOpen(true);
                setMobileSettingsOpen(false);
                setMobileSidebarOpen(false);
              }}
              style={mobilePanelButtonStyle}
            >
              Add New Item
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileSettingsOpen(false);
                setMobileSidebarOpen(false);
                openSettingsPopup();
              }}
              style={mobilePanelPrimaryButtonStyle}
            >
              Advanced Settings
            </button>
          </div>
        </div>
      ) : null}
      {mobileBottomDockVisible ? (
        <div style={mobileBottomDockStyle}>
          <div style={mobileBottomDockMainRailStyle}>
            <button
              type="button"
              onClick={handleMobileBack}
              title="Back"
              aria-label="Back"
              style={{
                ...mobileBottomDockIconButtonStyle,
                flex: 1,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleMobileHome}
              title="Home"
              aria-label="Home"
              style={{
                ...mobileBottomDockIconButtonStyle,
                flex: 1,
                background: nav === "home" && !mobileSidebarOpen && !mobileSettingsOpen ? "rgba(190, 194, 210, 0.46)" : "transparent",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5L12 3l9 7.5" />
                <path d="M5 9.5V21h14V9.5" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileSearchOpen(false);
                setMobileSettingsOpen(false);
                setMobileSidebarOpen((prev) => !prev);
              }}
              title={mobileSidebarOpen ? "Close Filters" : "Open Filters"}
              aria-label={mobileSidebarOpen ? "Close Filters" : "Open Filters"}
              style={{
                ...mobileBottomDockIconButtonStyle,
                flex: 1,
                background: mobileSidebarOpen ? "rgba(190, 194, 210, 0.46)" : "transparent",
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="3 4 21 4 14 12 14 19 10 21 10 12 3 4" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => {
                setSortPopupOpen(false);
                setSettingsPopupOpen(false);
                setShowVersionNotes(false);
                setMobileSettingsOpen(false);
                setMobileSidebarOpen(false);
                setAddModalOpen(true);
              }}
              title="Add New Item"
              aria-label="Add New Item"
              style={{
                ...mobileBottomDockIconButtonStyle,
                flex: 1,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setMobileSidebarOpen(false);
              setMobileSettingsOpen(false);
              setMobileSearchOpen((prev) => !prev);
            }}
            title="Search"
            aria-label="Search"
            style={{
              ...mobileBottomDockSearchButtonStyle,
              background: mobileSearchOpen ? "rgba(226, 233, 253, 0.92)" : mobileBottomDockSearchButtonStyle.background,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      ) : null}
      {mobileBottomDockVisible && mobileSearchOpen ? (
        <div style={{
          position: "fixed",
          left: MOBILE_BOTTOM_DOCK_SIDE_MARGIN,
          right: MOBILE_BOTTOM_DOCK_SIDE_MARGIN,
          bottom: `calc(${mobileBottomDockBottom} + ${MOBILE_BOTTOM_DOCK_HEIGHT + 8}px)`,
          zIndex: 2510,
          ...mobileBottomDockSearchStyle,
          background: `linear-gradient(180deg, ${hexToRgba(simpleSidebarOverlayBase, simpleSidebarIsLight ? 0.04 : 0.12, simpleSidebarOverlayBase)} 0%, ${hexToRgba(simpleSidebarOverlayBase, simpleSidebarIsLight ? 0.1 : 0.2, simpleSidebarOverlayBase)} 100%), ${mobilePanelBackground}`,
        }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            style={{ display: "block", flexShrink: 0, color: mobilePanelButtonTextColor, opacity: 0.72 }}
          >
            <circle cx="11" cy="11" r="7"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search library..."
            aria-label="Search library"
            style={{
              flex: 1,
              minWidth: 0,
              height: "100%",
              border: "none",
              background: "transparent",
              color: mobilePanelTextColor,
              fontSize: 13,
              fontWeight: 700,
              outline: "none",
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              style={{ border: "none", background: "transparent", color: mobilePanelButtonTextColor, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}
      {/* Main layout: Sidebar + Content */}
      <div
        style={{
          position: "relative",
          width: "100%",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: isMobileLayout ? "1fr" : `${SIDEBAR_WIDTH}px 1fr`,
          gap: 0,
          alignItems: "stretch",
        }}
      >
        {sandboxMode && !isMobileLayout ? (
          <div
            aria-hidden
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 6000,
              pointerEvents: "none",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: topSafeInset + 6,
                left: SIDEBAR_WIDTH + 12,
                right: 12,
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {[
                `HEADER ${Math.round(45)}px`,
                `SIDEBAR ${SIDEBAR_WIDTH}px`,
                `STAGE ${Math.max(0, viewportW - SIDEBAR_WIDTH)}px`,
                `ROW H ${Math.round(shelfRowHeight)}px`,
                `GAP ${Math.round(shelfGap)}px`,
                `CARD RADIUS ${5}px`,
              ].map((label) => (
                <span
                  key={label}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "4px 8px",
                    borderRadius: 999,
                    border: sandboxOverlayBorder,
                    background: sandboxOverlayBg,
                    color: sandboxOverlayText,
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    boxShadow: "0 3px 10px rgba(0, 0, 0, 0.28)",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                top: topSafeInset + 50,
                left: SIDEBAR_WIDTH + 12,
                right: 12,
                bottom: 12,
                border: "1px dashed rgba(255, 214, 102, 0.52)",
                borderRadius: 10,
                boxShadow: "inset 0 0 0 1px rgba(255, 214, 102, 0.08)",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 8,
                  left: 8,
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: sandboxOverlayBorder,
                  background: sandboxOverlayBg,
                  color: sandboxOverlayText,
                  fontSize: 10,
                  fontWeight: 900,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Main content / shelf area
              </span>
            </div>
          </div>
        ) : null}
        {/* LEFT MENU */}
        <aside
          className="sidebar"
          style={{
            position: "sticky",
            top: topSafeInset,
            zIndex: settingsPopupOpen ? POPUP_PANEL_Z_INDEX + 1 : 1400,
            alignSelf: "start",
            width: SIDEBAR_WIDTH,
            height: "100vh",
            minHeight: "100vh",
            borderRadius: "0 0 0 0",
            isolation: "isolate",
            overflowY: "visible",
            overflowX: "visible",
            background: "transparent",
            border: "none",
            boxShadow: "none",
            display: isMobileLayout ? "none" : "flex",
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
              backgroundImage: sidebarDetailGradientActive
                ? "none"
                : isSimpleShelfPresentation
                  ? simplePresentationBackground
                  : `url(${shelfTheme})`,
              backgroundRepeat: sidebarDetailGradientActive ? "no-repeat" : "repeat-y",
              backgroundPosition: "center top",
              backgroundSize: sidebarDetailGradientActive
                ? "100% 100%"
                : isElectricBlueShelfPresentation
                  ? `calc(100% + 2px) ${shelfRowHeight + 2}px`
                  : isSimpleShelfPresentation
                    ? "100% 100%"
                    : `100% ${shelfRowHeight}px`,
              backgroundColor: sidebarDetailGradientActive
                ? "transparent"
                : isElectricBlueShelfPresentation
                  ? "rgba(5, 13, 30, 0.88)"
                  : isSimpleShelfPresentation
                    ? simpleShelfBackgroundColor
                    : "transparent",
              boxShadow: isElectricBlueShelfPresentation
                ? "0 0 26px rgba(58, 125, 232, 0.2), inset 0 0 0 1px rgba(7, 21, 45, 0.6)"
                : isSimpleShelfPresentation
                  ? "none"
                  : "none",
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
              backgroundImage: isElectricBlueShelfPresentation ? ELECTRIC_BLUE_TOP_BEAM_BACKGROUND : isSimpleShelfPresentation ? simplePresentationBackground : `url(${currentTopHeaderImage})`,
              backgroundRepeat: isElectricBlueShelfPresentation ? "no-repeat, no-repeat" : isSimpleShelfPresentation ? "no-repeat" : "repeat-x",
              backgroundPosition: "0 0",
              backgroundSize: isElectricBlueShelfPresentation ? "100% 100%, 100% 100%" : isSimpleShelfPresentation ? "100% 100%" : "auto 45px",
              backgroundColor: isSimpleShelfPresentation ? simpleShelfBackgroundColor : "transparent",
              boxShadow: isElectricBlueShelfPresentation
                ? "inset 0 14px 24px rgba(4, 12, 26, 0.58), inset 0 -1px 0 rgba(168, 213, 255, 0.42)"
                : isSimpleShelfPresentation
                  ? "none"
                  : "inset 0 16px 24px rgba(0, 0, 0, 0.42)",
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
              borderRadius: isSimpleSidebarTheme ? 12 : 16,
              overflow: "hidden",
              opacity: sidebarDetailGradientActive ? 0 : sidebarDetailBackplateOpacity,
              backgroundImage: isDarkShelfMode
                ? "linear-gradient(180deg, rgba(201, 208, 218, 0.58) 0%, rgba(176, 184, 195, 0.54) 100%)"
                : isClassicShelfMode
                  ? "linear-gradient(180deg, rgba(235, 232, 224, 0.82) 0%, rgba(220, 216, 206, 0.78) 100%)"
                : currentTheme.background,
              backgroundSize: sidebarBackplateBackgroundSize,
              backgroundPosition: sidebarBackplateBackgroundPosition,
            }}
          />
          {/* Transparent module bubble wrapper */}
          <div
            className="sidebarScrollContent"
            style={{
              position: "relative",
              zIndex: 2,
              background: sidebarDetailShellBackground,
              borderRadius: isSimpleSidebarTheme ? 12 : isMacSidebarTheme ? 18 : 16,
              boxShadow: sidebarShellShadow,
              border: isMacSidebarTheme ? "1px solid rgba(255, 255, 255, 0.38)" : "none",
              backdropFilter: isMacSidebarTheme ? "blur(22px) saturate(1.2)" : "none",
              WebkitBackdropFilter: isMacSidebarTheme ? "blur(22px) saturate(1.2)" : "none",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              overflow: "hidden",
              overflowY: "auto",
              "--neon-sync-offset": isElectricBlueSidebarTheme ? neonSyncStartOffset : "0s",
            } as CSSProperties}
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
              src={APP_ICON}
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

          {!isMobileLayout && (
            <div style={{ padding: "0 8px 8px 8px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: 8,
                  border: isSimpleHeaderTheme ? "1px solid rgba(0,0,0,0.1)" : "1px solid rgba(255,255,255,0.18)",
                  background: isSimpleHeaderTheme ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.08)",
                  paddingLeft: 8,
                  gap: 6,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  style={{ flexShrink: 0, color: isSimpleHeaderTheme ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.5)" }}
                >
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search"
                  style={{
                    flex: 1,
                    height: 26,
                    border: "none",
                    background: "transparent",
                    color: isSimpleHeaderTheme ? simpleHeaderStrongTextColor : "rgba(255,255,255,0.9)",
                    fontSize: 12,
                    fontWeight: 500,
                    minWidth: 0,
                    outline: "none",
                  }}
                />
              </div>
            </div>
          )}
          <div
            style={{
              padding: "0 8px",
              display: "flex",
              flexDirection: "column",
              gap: sidebarModuleStackGap,
              flex: 1,
              marginTop: sidebarModuleMarginTop,
            }}
          >
            {/* Library Module */}
            <div
              className={`sidebarModuleCard${isElectricBlueSidebarTheme ? " neon" : ""}`}
              style={{
                background: sidebarModuleCardBackground,
                borderRadius: 16,
                boxShadow: sidebarModuleCardShadow,
                border: sidebarModuleCardBorder,
                borderBottom: sidebarModuleCardBorderBottom,
                marginTop: sidebarPrimaryModuleMarginTop,
                padding: sidebarPrimaryModulePadding,
              }}
            >
              <div style={{ padding: "0px", display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
              <div style={{ ...sidebarSectionHeaderStyle, marginBottom: 6 }}>
                <span>LIBRARY</span>
                <span />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: librarySidebarItemGap }}>
                <button
                  onClick={activateHomeLibrary}
                  className={`sideItem ${nav === "home" ? "active" : ""}`}
                  style={{ ...sidebarPrimaryItemRowStyle, ...getLibraryItemActiveStyle("home", nav === "home") }}
                >
                  <span style={sidebarPrimaryItemLabelStyle}>
                    <span
                      aria-hidden
                      style={{
                        ...sidebarIconSlotStyle,
                        background: nav === "home" ? "rgba(0,0,0,0.05)" : "transparent",
                      }}
                    >
                      <img src={getSidebarIconSrc("home", "/icon-home.png")} alt="" width={iconSize} height={iconSize} onClick={(event) => openSidebarIconFilePicker(event, "home")} title={uploadingSidebarIconKey === "home" ? "Uploading..." : "Change icon"} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }} />
                    </span>
                    Home
                  </span>
                </button>
                <button
                  onClick={() => openMediaSidebar("books")}
                  className={`sideItem ${nav === "books" ? "active" : ""}`}
                  style={{ ...sidebarPrimaryItemRowStyle, ...getLibraryItemActiveStyle("books", nav === "books") }}
                >
                  <span style={sidebarPrimaryItemLabelStyle}>
                    <span
                      aria-hidden
                      style={{
                        ...sidebarIconSlotStyle,
                        background: nav === "books" ? "rgba(0,0,0,0.05)" : "transparent",
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
                        background: nav === "books" ? sidebarAccentPalette.books.countBubble : usesThemeCountBubbleColor ? currentTheme.countBubbleColor : "#6ba56a",
                        color: "#fff",
                      }}
                    >
                      {stats.books}
                    </span>
                  </span>
                </button>

                {nav === "books" ? (
                  <div style={{ marginTop: 4, paddingLeft: 0, display: "flex", flexDirection: "column", gap: 5, order: 10 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                      <div style={{ ...sidebarSectionHeaderStyle, marginBottom: 0 }}>
                        <span style={sidebarSectionHeaderTextStyle}>Reading Status</span>
                        <span />
                      </div>
                      {readingStatuses.map((status) => {
                        const active = readingStatusFilter === status;
                        return (
                          <button
                            key={`reading-${status}`}
                            onClick={() => setReadingStatusFilter(active ? null : status)}
                            className={`sideSubItem ${active ? "active" : ""}`}
                            style={sidebarSubItemRowStyle}
                          >
                            <span style={sidebarSubItemLabelStyle}>
                              {status}
                            </span>
                            <span
                              style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
                            >
                              {readingStatusCounts[status] ?? 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                      <div style={{ ...sidebarSectionHeaderStyle, marginBottom: 0, paddingTop: 3 }}>
                        <span style={sidebarSectionHeaderTextStyle}>Formats</span>
                        <span />
                      </div>
                      {bookFormats.map((format) => {
                        const active = formatFilter === format;
                        return (
                          <button
                            key={`format-${format}`}
                            onClick={() => setFormatFilter(active ? null : format)}
                            className={`sideSubItem ${active ? "active" : ""}`}
                            style={sidebarSubItemRowStyle}
                          >
                            <span style={sidebarSubItemLabelStyle}>
                              {format}
                            </span>
                            <span
                              style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
                            >
                              {formatCounts[format] ?? 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setSeriesOpen((v) => !v)}
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Series</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{seriesOpen ? "−" : "+"}</span>
                    </button>
                    {seriesOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {bookSeries.map((series) => {
                          const active = seriesFilter === series;
                          return (
                          <button
                            key={`series-${series}`}
                            onClick={() => setSeriesFilter(active ? null : series)}
                            className={`sideSubItem ${active ? "active" : ""}`}
                            style={sidebarSubItemRowStyle}
                          >
                              <span style={sidebarSubItemLabelStyle}>
                                {series}
                              </span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Genres</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{genreOpen ? "−" : "+"}</span>
                    </button>
                    {genreOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {bookGenres.map((genre) => {
                          const active = genreFilter === genre;
                          return (
                          <button
                            key={`genre-${genre}`}
                            onClick={() => setGenreFilter(active ? null : genre)}
                            className={`sideSubItem ${active ? "active" : ""}`}
                            style={sidebarSubItemRowStyle}
                          >
                              <span style={sidebarSubItemLabelStyle}>
                                {genre}
                              </span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
                              >
                                {genreCounts[genre] ?? 0}
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
                    setMovieWatchFilter(null);
                    setMovieGenreFilter(null);
                    openMediaSidebar("movies");
                  }}
                  className={`sideItem ${nav === "movies" ? "active" : ""}`}
                  style={{ ...sidebarPrimaryItemRowStyle, ...getLibraryItemActiveStyle("movies", nav === "movies") }}
                >
                  <span style={sidebarPrimaryItemLabelStyle}>
                    <span
                      aria-hidden
                      style={{
                        ...sidebarIconSlotStyle,
                        background: nav === "movies" ? "rgba(0,0,0,0.05)" : "transparent",
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
                        fontWeight: nav === "movies" ? Math.min(Number(sidebarFontWeight) + 150, 900) : sidebarFontWeight,
                        background: nav === "movies" ? sidebarAccentPalette.movies.countBubble : usesThemeCountBubbleColor ? currentTheme.countBubbleColor : "#5b9bd5",
                        color: "#fff",
                      }}
                    >
                      {stats.movies}
                    </span>
                  </span>
                </button>

                {nav === "movies" ? (
                  <div style={{ marginTop: 6, paddingLeft: 0, display: "flex", flexDirection: "column", gap: 8, order: 10 }}>
                    {/* Status */}
                    <button
                      onClick={() => setMovieStatusOpen((v) => !v)}
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Status</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{movieStatusOpen ? "−" : "+"}</span>
                    </button>
                    {movieStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {(["Released", "Upcoming"] as const).map((option) => {
                          const active = option === "Upcoming" ? movieUpcomingFilter : !movieUpcomingFilter;
                          return (
                            <button
                              key={`movie-status-${option}`}
                              onClick={() => setMovieUpcomingFilter(option === "Upcoming")}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "1px 6px" }}
                            >
                              <span style={{ color: sidebarInlineMetaTextColor }}>{option}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Tags */}
                    <button
                      onClick={() => setMovieTagOpen((v) => !v)}
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Tags</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{movieTagOpen ? "−" : "+"}</span>
                    </button>
                    {movieTagOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {movieTags.map((tag) => {
                          const active = movieTagFilter === tag;
                          return (
                            <button
                              key={`movie-tag-${tag}`}
                              onClick={() => setMovieTagFilter(active ? null : tag)}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "1px 6px" }}
                            >
                              <span style={{ color: sidebarInlineMetaTextColor }}>{tag}</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}>{movieTagCounts[tag] ?? 0}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    {/* Genre */}
                    <button
                      onClick={() => setMovieGenreOpen((v) => !v)}
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Genre</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{movieGenreOpen ? "−" : "+"}</span>
                    </button>
                    {movieGenreOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
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
                                padding: "1px 6px",
                              }}
                            >
                              <span style={{ color: sidebarInlineMetaTextColor }}>
                                {genre}
                              </span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
                    setTvViewMode("library");
                    setWatchFilter(null);
                    setShowFilter(null);
                    setTagFilter(null);
                    openMediaSidebar("tv");
                  }}
                  className={`sideItem primary ${nav === "tv" ? "active" : ""}`}
                  style={{ ...sidebarPrimaryItemRowStyle, ...getLibraryItemActiveStyle("tv", nav === "tv") }}
                >
                  <span style={sidebarPrimaryItemLabelStyle}>
                    <span
                      aria-hidden
                      style={{
                        ...sidebarIconSlotStyle,
                        background: nav === "tv" ? "rgba(0,0,0,0.05)" : "transparent",
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
                        fontWeight: nav === "tv" ? Math.min(Number(sidebarFontWeight) + 150, 900) : sidebarFontWeight,
                        background: nav === "tv" ? sidebarAccentPalette.tv.countBubble : usesThemeCountBubbleColor ? currentTheme.countBubbleColor : "#d97642",
                        color: "#fff",
                      }}
                    >
                      {stats.tv}
                    </span>
                  </span>
                </button>

                {nav === "tv" ? (
                  <div style={{ marginTop: 6, paddingLeft: 0, display: "flex", flexDirection: "column", gap: 8, order: 10 }}>
                    <button
                      onClick={() => setWatchStatusOpen((v) => !v)}
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Watch Status</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{nav === "tv" || watchStatusOpen ? "−" : "+"}</span>
                    </button>
                    {nav === "tv" || watchStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {watchStatuses.map((status) => {
                          const active = watchFilter === status;
                          return (
                            <button
                              key={`watch-${status}`}
                              onClick={() => {
                                const nextWatchFilter = active ? null : status;
                                setTvViewMode(!nextWatchFilter && !showFilter && !tagFilter ? "library" : "custom");
                                setWatchFilter(nextWatchFilter);
                              }}
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
                              <span style={{ color: sidebarInlineMetaTextColor }}>
                                {status}
                              </span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Show Status</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{nav === "tv" || showStatusOpen ? "−" : "+"}</span>
                    </button>
                    {nav === "tv" || showStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {showStatuses.map((status) => {
                          const active = showFilter === status;
                          return (
                            <button
                              key={`show-${status}`}
                              onClick={() => {
                                const nextShowFilter = active ? null : status;
                                setTvViewMode(!watchFilter && !nextShowFilter && !tagFilter ? "library" : "custom");
                                setShowFilter(nextShowFilter);
                              }}
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
                              <span style={{ color: sidebarInlineMetaTextColor }}>
                                {status}
                              </span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Tags</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{nav === "tv" || tagOpen ? "−" : "+"}</span>
                    </button>
                    {nav === "tv" || tagOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {tvTags.map((tag) => {
                          const active = tagFilter === tag;
                          return (
                            <button
                              key={`tag-${tag}`}
                              onClick={() => {
                                const nextTagFilter = active ? null : tag;
                                setTvViewMode(!watchFilter && !showFilter && !nextTagFilter ? "library" : "custom");
                                setTagFilter(nextTagFilter);
                              }}
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
                              <span style={{ color: sidebarInlineMetaTextColor }}>
                                {tag}
                              </span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
                    setGameViewMode("library");
                    setGamePlatformFilter(null);
                    setGameStatusFilter(null);
                    setGameOwnershipFilter(null);
                    setGameFormatFilter(null);
                    setGameYearPlayedFilter(null);
                    setGameGenreFilter(null);
                    setGamePlatformOpen(true);
                    setGameOwnershipOpen(false);
                    setGameFormatOpen(false);
                    setGameYearPlayedOpen(false);
                    setGameGenresOpen(false);
                    openMediaSidebar("games");
                  }}
                  className={`sideItem ${nav === "games" ? "active" : ""}`}
                  style={{ ...sidebarPrimaryItemRowStyle, ...getLibraryItemActiveStyle("games", nav === "games"), marginBottom: 15 }}
                >
                  <span style={sidebarPrimaryItemLabelStyle}>
                    <span
                      aria-hidden
                      style={{
                        ...sidebarIconSlotStyle,
                        background: nav === "games" ? "rgba(0,0,0,0.05)" : "transparent",
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
                        fontWeight: nav === "games" ? Math.min(Number(sidebarFontWeight) + 150, 900) : sidebarFontWeight,
                        background:
                          nav === "games"
                            ? sidebarAccentPalette.games.countBubble
                            : usesThemeCountBubbleColor
                                ? currentTheme.countBubbleColor
                                : "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.games}
                    </span>
                  </span>
                </button>

                {nav === "games" ? (
                  <div style={{ marginTop: 6, paddingLeft: 0, display: "flex", flexDirection: "column", gap: 8, order: 10 }}>
                    <button
                      onClick={() => setGamePlatformOpen((v) => !v)}
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Platform</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{gamePlatformOpen ? "−" : "+"}</span>
                    </button>
                    {gamePlatformOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {gamePlatformOptions.map((option, index) => {
                          const active = gamePlatformFilter === option;
                          return (
                            <button
                              key={`game-platform-${option}`}
                              onClick={() => {
                                const nextGamePlatformFilter = active ? null : option;
                                setGameViewMode(
                                  !nextGamePlatformFilter && !gameStatusFilter && !gameOwnershipFilter && !gameFormatFilter && !gameYearPlayedFilter && !gameGenreFilter
                                    ? "library"
                                    : "custom"
                                );
                                setGamePlatformFilter(nextGamePlatformFilter);
                              }}
                              className={`sideSubItem ${active ? "active" : ""}`}
                              style={{
                                width: "100%",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                                marginTop: index === 0 ? 0 : -6,
                              }}
                            >
                              <span style={{ color: sidebarInlineMetaTextColor }}>{option}</span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
                              >
                                {gamePlatformCounts[option] ?? 0}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}

                    <button
                      onClick={() => setGameOwnershipOpen((v) => !v)}
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Ownership</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{gameOwnershipOpen ? "−" : "+"}</span>
                    </button>
                    {gameOwnershipOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {gameOwnershipOptions.map((option) => {
                          const active = gameOwnershipFilter === option;
                          return (
                            <button
                              key={`game-ownership-${option}`}
                              onClick={() => {
                                const nextGameOwnershipFilter = active ? null : option;
                                setGameViewMode(
                                  !gamePlatformFilter && !gameStatusFilter && !nextGameOwnershipFilter && !gameFormatFilter && !gameYearPlayedFilter && !gameGenreFilter
                                    ? "library"
                                    : "custom"
                                );
                                setGameOwnershipFilter(nextGameOwnershipFilter);
                              }}
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
                              <span style={{ color: sidebarInlineMetaTextColor }}>{option}</span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Format</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{gameFormatOpen ? "−" : "+"}</span>
                    </button>
                    {gameFormatOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {gameFormatOptions.map((option) => {
                          const active = gameFormatFilter === option;
                          return (
                            <button
                              key={`game-format-${option}`}
                              onClick={() => {
                                const nextGameFormatFilter = active ? null : option;
                                setGameViewMode(
                                  !gamePlatformFilter && !gameStatusFilter && !gameOwnershipFilter && !nextGameFormatFilter && !gameYearPlayedFilter && !gameGenreFilter
                                    ? "library"
                                    : "custom"
                                );
                                setGameFormatFilter(nextGameFormatFilter);
                              }}
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
                              <span style={{ color: sidebarInlineMetaTextColor }}>{option}</span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Year Played</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{gameYearPlayedOpen ? "−" : "+"}</span>
                    </button>
                    {gameYearPlayedOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {gameYearPlayedOptions.map((option) => {
                          const active = gameYearPlayedFilter === option;
                          return (
                            <button
                              key={`game-year-played-${option}`}
                              onClick={() => {
                                const nextGameYearPlayedFilter = active ? null : option;
                                setGameViewMode(
                                  !gamePlatformFilter && !gameStatusFilter && !gameOwnershipFilter && !gameFormatFilter && !nextGameYearPlayedFilter && !gameGenreFilter
                                    ? "library"
                                    : "custom"
                                );
                                setGameYearPlayedFilter(nextGameYearPlayedFilter);
                              }}
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
                              <span style={{ color: sidebarInlineMetaTextColor }}>{option}</span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
                      style={sidebarSubSectionHeaderButtonStyle}
                    >
                      <span style={sidebarSectionHeaderTextStyle}>Genres</span>
                      <span style={{ color: sidebarSectionControlColor, fontWeight: 600, fontSize: 12, fontFamily: sidebarSectionFontFamily }}>{gameGenresOpen ? "−" : "+"}</span>
                    </button>
                    {gameGenresOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                        {gameGenres.map((option) => {
                          const active = gameGenreFilter === option;
                          return (
                            <button
                              key={`game-genre-${option}`}
                              onClick={() => {
                                const nextGameGenreFilter = active ? null : option;
                                setGameViewMode(
                                  !gamePlatformFilter && !gameStatusFilter && !gameOwnershipFilter && !gameFormatFilter && !gameYearPlayedFilter && !nextGameGenreFilter
                                    ? "library"
                                    : "custom"
                                );
                                setGameGenreFilter(nextGameGenreFilter);
                              }}
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
                              <span style={{ color: sidebarInlineMetaTextColor }}>{option}</span>
                              <span
                                style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
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
              {/* SMART LISTS section */}
              <div
                className="sidebarTextOnlySection"
                style={{ display: isHomeSidebar ? "block" : "none", marginTop: 8 }}
              >
                <div
                  style={{ ...smartListsSectionHeaderStyle, marginBottom: 6 }}
                >
                  <span style={smartListsSectionHeaderTextStyle}>SMART LISTS</span>
                  <span />
                </div>

              <div style={{ display: "flex", flexDirection: "column", gap: smartListsSidebarItemGap }}>
                {builtInSmartListOrder.map((key) => {
                  const item = {
                    key,
                    label: builtInSmartListLabels[key],
                    count:
                      key === "year-this"
                        ? stats.yearThis
                        : key === "current"
                          ? stats.current
                          : key === "completed"
                            ? stats.completed
                            : stats.abandoned,
                  };
                  const active = nav === item.key;
                  const subtleActiveBackground = "rgba(120, 128, 140, 0.09)";
                  const subtleActiveBorder = "1px solid rgba(146, 154, 166, 0.26)";
                  const subtleActiveText = "rgba(62, 70, 80, 0.92)";
                  const iconKey =
                    item.key === "year-this"
                      ? "year-this"
                      : item.key === "current"
                        ? "current"
                        : item.key === "completed"
                          ? "completed"
                          : "abandoned";
                  const iconFallback =
                    item.key === "year-this"
                      ? "/icon-year.png"
                      : item.key === "current"
                        ? "/icon-current.png"
                        : item.key === "completed"
                          ? "/icon-completed.png"
                          : "/icon-abandoned.png";
                  return (
                    <div
                      key={`smart-list-${item.key}`}
                      style={{
                        width: "100%",
                        opacity: draggingBuiltInSmartListKey === item.key ? 0.75 : 1,
                        borderRadius: 10,
                        outline: builtInSmartListDropTargetKey === item.key ? "1px dashed rgba(80, 128, 196, 0.55)" : "none",
                      }}
                      draggable={smartListsEditMode}
                      onDragStart={() => {
                        if (!smartListsEditMode) return;
                        setDraggingBuiltInSmartListKey(item.key);
                      }}
                      onDragOver={(event) => {
                        if (!smartListsEditMode || !draggingBuiltInSmartListKey || draggingBuiltInSmartListKey === item.key) return;
                        event.preventDefault();
                        setBuiltInSmartListDropTargetKey(item.key);
                      }}
                      onDrop={(event) => {
                        if (!smartListsEditMode || !draggingBuiltInSmartListKey || draggingBuiltInSmartListKey === item.key) return;
                        event.preventDefault();
                        handleReorderBuiltInSmartLists(draggingBuiltInSmartListKey, item.key);
                        setDraggingBuiltInSmartListKey(null);
                        setBuiltInSmartListDropTargetKey(null);
                      }}
                      onDragEnd={() => {
                        setDraggingBuiltInSmartListKey(null);
                        setBuiltInSmartListDropTargetKey(null);
                      }}
                    >
                    <button
                      onClick={() => {
                        if (smartListsEditMode) return;
                        setNav(item.key);
                      }}
                      className={`sideSubItem ${active ? "active" : ""}`}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 6,
                        padding: "3px 4px",
                        fontSize: smartListsSidebarFontSize,
                        fontWeight: smartListsSidebarFontWeight,
                        background: active ? subtleActiveBackground : "transparent",
                        border: active ? subtleActiveBorder : "1px solid transparent",
                        borderRadius: 10,
                        color: active ? subtleActiveText : undefined,
                      }}
                    >
                      <span style={{ display: "flex", alignItems: "center", gap: smartListsSidebarGap, minWidth: 0 }}>
                        <span
                          aria-hidden
                          style={{
                            width: 18,
                            height: 14,
                            borderRadius: 4,
                            background: active ? "rgba(0,0,0,0.05)" : "transparent",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flex: "0 0 auto",
                            overflow: "visible",
                          }}
                        >
                          <img
                            src={getSidebarIconSrc(iconKey, iconFallback)}
                            alt=""
                            width={smartListsSidebarIconSize}
                            height={smartListsSidebarIconSize}
                            onClick={(event) => openSidebarIconFilePicker(event, iconKey)}
                            title={uploadingSidebarIconKey === iconKey ? "Uploading..." : "Change icon"}
                            style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }}
                          />
                        </span>
                        {smartListsEditMode && editingBuiltInSmartListKey === item.key ? (
                          <input
                            value={smartListNameDraft}
                            onChange={(event) => setSmartListNameDraft(event.target.value)}
                            onBlur={commitInlineSmartListRename}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") commitInlineSmartListRename();
                              if (event.key === "Escape") {
                                setEditingBuiltInSmartListKey(null);
                                setEditingCustomSmartListId(null);
                              }
                            }}
                            autoFocus
                            style={{
                              width: 118,
                              border: "1px solid rgba(0,0,0,0.2)",
                              borderRadius: 6,
                              fontSize: smartListsSidebarFontSize,
                              fontWeight: smartListsSidebarFontWeight,
                              padding: "1px 5px",
                              background: "rgba(255,255,255,0.86)",
                              color: "#2f3338",
                            }}
                          />
                        ) : (
                          <span
                            onClick={() => {
                              if (!smartListsEditMode) return;
                              startInlineRenameBuiltInSmartList(item.key);
                            }}
                            style={{
                              color: sidebarInlineMetaTextColor,
                              fontSize: smartListsSidebarFontSize,
                              fontWeight: smartListsSidebarFontWeight,
                              cursor: smartListsEditMode ? "text" : "default",
                            }}
                          >
                            {item.label}
                          </span>
                        )}
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <span
                          style={{ fontSize: 11, fontWeight: 600, color: sidebarInlineCountColor }}
                        >
                          {item.count}
                        </span>
                        {null}
                      </span>
                    </button>
                    </div>
                  );
                })}

                {customSmartLists.map((smartList, smartListIndex) => {
                  const isActive = nav === "smart-custom" && selectedSmartListId === smartList.id;
                  const subtleActiveBackground = "rgba(120, 128, 140, 0.09)";
                  const subtleActiveBorder = "1px solid rgba(146, 154, 166, 0.26)";
                  const subtleActiveText = "rgba(62, 70, 80, 0.92)";
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
                        opacity: draggingSmartListId === smartList.id ? 0.75 : 1,
                        borderRadius: 10,
                        outline: smartListDropTargetId === smartList.id ? "1px dashed rgba(80, 128, 196, 0.55)" : "none",
                      }}
                      draggable={smartListsEditMode}
                      onDragStart={() => {
                        if (!smartListsEditMode) return;
                        setDraggingSmartListId(smartList.id);
                      }}
                      onDragOver={(event) => {
                        if (!smartListsEditMode || !draggingSmartListId || draggingSmartListId === smartList.id) return;
                        event.preventDefault();
                        setSmartListDropTargetId(smartList.id);
                      }}
                      onDrop={(event) => {
                        if (!smartListsEditMode || !draggingSmartListId || draggingSmartListId === smartList.id) return;
                        event.preventDefault();
                        handleReorderSmartLists(draggingSmartListId, smartList.id);
                        setDraggingSmartListId(null);
                        setSmartListDropTargetId(null);
                      }}
                      onDragEnd={() => {
                        setDraggingSmartListId(null);
                        setSmartListDropTargetId(null);
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (smartListsEditMode) return;
                          setSelectedSmartListId(smartList.id);
                          setNav("smart-custom");
                          setSortField(shouldUseManualSort ? MANUAL_SORT_FIELD : defaultSortField);
                          setSortOrder(shouldUseManualSort ? "Asc" : smartList.defaultSortOrder);
                        }}
                        className={`sideItem ${isActive ? "active" : ""}`}
                        style={{
                          ...smartListsRowStyle,
                          background: isActive ? subtleActiveBackground : "transparent",
                          border: isActive ? subtleActiveBorder : "1px solid transparent",
                          borderRadius: 10,
                          color: isActive ? subtleActiveText : undefined,
                        }}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: smartListsSidebarGap, fontWeight: isActive ? Math.min(Number(smartListsSidebarFontWeight) + 150, 900) : smartListsSidebarFontWeight, fontSize: smartListsSidebarFontSize + 1 }}>
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
                              <img src={iconSrc} alt="" width={smartListsSidebarIconSize} height={smartListsSidebarIconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                            ) : (
                              <span style={{ fontSize: 10, opacity: 0.6, lineHeight: 1 }}>□</span>
                            )}
                          </span>
                          {smartListsEditMode && editingCustomSmartListId === smartList.id ? (
                            <input
                              value={smartListNameDraft}
                              onChange={(event) => setSmartListNameDraft(event.target.value)}
                              onBlur={commitInlineSmartListRename}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") commitInlineSmartListRename();
                                if (event.key === "Escape") {
                                  setEditingBuiltInSmartListKey(null);
                                  setEditingCustomSmartListId(null);
                                }
                              }}
                              autoFocus
                              style={{
                                width: 118,
                                border: "1px solid rgba(0,0,0,0.2)",
                                borderRadius: 6,
                                fontSize: smartListsSidebarFontSize,
                                fontWeight: smartListsSidebarFontWeight,
                                padding: "1px 5px",
                                background: "rgba(255,255,255,0.86)",
                                color: "#2f3338",
                              }}
                            />
                          ) : (
                            <span
                              onClick={() => {
                                if (!smartListsEditMode) return;
                                startInlineRenameCustomSmartList(smartList.id, smartList.name);
                              }}
                              style={{
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                maxWidth: 126,
                                cursor: smartListsEditMode ? "text" : "default",
                              }}
                            >
                              {smartList.name}
                            </span>
                          )}
                        </span>
                        {smartListsEditMode ? (
                          <span
                            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8 }}
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => handleMoveSmartList(smartList.id, "up")}
                              disabled={smartListIndex === 0}
                              title="Move up"
                              aria-label={`Move ${smartList.name} up`}
                              style={{
                                border: "1px solid rgba(0,0,0,0.16)",
                                background: "rgba(255,255,255,0.78)",
                                color: "#3a3a3c",
                                borderRadius: 6,
                                width: 22,
                                height: 20,
                                lineHeight: 1,
                                padding: 0,
                                cursor: smartListIndex === 0 ? "default" : "pointer",
                                opacity: smartListIndex === 0 ? 0.45 : 1,
                              }}
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveSmartList(smartList.id, "down")}
                              disabled={smartListIndex === customSmartLists.length - 1}
                              title="Move down"
                              aria-label={`Move ${smartList.name} down`}
                              style={{
                                border: "1px solid rgba(0,0,0,0.16)",
                                background: "rgba(255,255,255,0.78)",
                                color: "#3a3a3c",
                                borderRadius: 6,
                                width: 22,
                                height: 20,
                                lineHeight: 1,
                                padding: 0,
                                cursor: smartListIndex === customSmartLists.length - 1 ? "default" : "pointer",
                                opacity: smartListIndex === customSmartLists.length - 1 ? 0.45 : 1,
                              }}
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSmartList(smartList.id)}
                              title={`Delete ${smartList.name}`}
                              aria-label={`Delete ${smartList.name}`}
                              style={{
                                border: "1px solid rgba(176,65,65,0.5)",
                                background: "rgba(145, 52, 52, 0.14)",
                                color: "#8a2f2f",
                                borderRadius: 6,
                                padding: "0 6px",
                                height: 20,
                                lineHeight: 1,
                                cursor: "pointer",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              Del
                            </button>
                          </span>
                        ) : null}
                      </button>
                    </div>
                  );
                })}

                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, marginBottom: customSmartLists.length ? 0 : 4 }}>
                  <button
                    type="button"
                    onClick={handleOpenSmartListBuilder}
                    style={{
                      width: "fit-content",
                      marginLeft: 10,
                      textAlign: "left",
                      border: "none",
                      borderRadius: 0,
                      padding: 0,
                      background: "transparent",
                      boxShadow: "none",
                      color: sidebarSectionLabelColor,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: sidebarSectionFontFamily,
                      letterSpacing: "0",
                      cursor: "pointer",
                    }}
                  >
                    + Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSmartListsEditMode((prev) => !prev);
                      setEditingBuiltInSmartListKey(null);
                      setEditingCustomSmartListId(null);
                      setDraggingBuiltInSmartListKey(null);
                      setBuiltInSmartListDropTargetKey(null);
                      setDraggingSmartListId(null);
                      setSmartListDropTargetId(null);
                    }}
                    style={{
                      width: "fit-content",
                      textAlign: "left",
                      border: "none",
                      borderRadius: 0,
                      padding: 0,
                      background: "transparent",
                      boxShadow: "none",
                      color: sidebarSectionLabelColor,
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: sidebarSectionFontFamily,
                      letterSpacing: "0",
                      cursor: "pointer",
                    }}
                  >
                    {smartListsEditMode ? "Done" : "Edit"}
                  </button>
                </div>

              </div>
            </div>
            </div>
            </div>

            {/* DISCOVER Module */}
            <div
              className={`sidebarModuleCard sidebarTextOnlySection${isElectricBlueSidebarTheme ? " neon" : ""}`}
              style={{
                display: isHomeSidebar ? "block" : "none",
                marginTop: 6,
                background: sidebarModuleCardBackground,
                borderRadius: 16,
                boxShadow: sidebarModuleCardShadow,
                border: sidebarModuleCardBorder,
                borderBottom: sidebarModuleCardBorderBottom,
                padding: sidebarDiscoverModulePadding,
              }}
            >
              <div style={{ padding: "0px", display: "flex", flexDirection: "column", gap: sidebarSubmenuGap }}>
                <div
                  style={{ ...discoverSectionHeaderStyle, marginBottom: 6 }}
                >
                  <span style={discoverSectionHeaderTextStyle}>DISCOVER</span>
                  <span />
                </div>

              <div style={{ display: "flex", flexDirection: "column", gap: discoverSidebarItemGap }}>
                <button
                  onClick={openStatisticsView}
                  className={`sideSubItem ${nav === "statistics" ? "active" : ""}`}
                  style={{
                    ...discoverRowStyle,
                    background: nav === "statistics" ? "rgba(120, 128, 140, 0.09)" : "transparent",
                    border: nav === "statistics" ? "1px solid rgba(146, 154, 166, 0.26)" : "1px solid transparent",
                    borderRadius: 10,
                    color: nav === "statistics" ? "rgba(62, 70, 80, 0.92)" : undefined,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: discoverSidebarGap }}>
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
                      <img
                        src={getSidebarIconSrc("statistics", "/icon-statistics.png")}
                        alt=""
                        width={discoverSidebarIconSize}
                        height={discoverSidebarIconSize}
                        onClick={(event) => openSidebarIconFilePicker(event, "statistics")}
                        title={uploadingSidebarIconKey === "statistics" ? "Uploading..." : "Change icon"}
                        style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }}
                      />
                    </span>
                    <span style={discoverLabelStyle}>Statistics</span>
                  </span>
                </button>

                <button
                  onClick={openRoadmapView}
                  className={`sideSubItem ${nav === "roadmap" ? "active" : ""}`}
                  style={{
                    ...discoverRowStyle,
                    background: nav === "roadmap" ? "rgba(120, 128, 140, 0.09)" : "transparent",
                    border: nav === "roadmap" ? "1px solid rgba(146, 154, 166, 0.26)" : "1px solid transparent",
                    borderRadius: 10,
                    color: nav === "roadmap" ? "rgba(62, 70, 80, 0.92)" : undefined,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: discoverSidebarGap }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "roadmap" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img
                        src={getSidebarIconSrc("roadmap", "/icon-statistics.png")}
                        alt=""
                        width={discoverSidebarIconSize}
                        height={discoverSidebarIconSize}
                        onClick={(event) => openSidebarIconFilePicker(event, "roadmap")}
                        title={uploadingSidebarIconKey === "roadmap" ? "Uploading..." : "Change icon"}
                        style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }}
                      />
                    </span>
                    <span style={discoverLabelStyle}>Roadmap</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openThemesView}
                  className={`sideSubItem ${nav === "themes" ? "active" : ""}`}
                  style={{
                    ...discoverRowStyle,
                    background: nav === "themes" ? "rgba(120, 128, 140, 0.09)" : "transparent",
                    border: nav === "themes" ? "1px solid rgba(146, 154, 166, 0.26)" : "1px solid transparent",
                    borderRadius: 10,
                    color: nav === "themes" ? "rgba(62, 70, 80, 0.92)" : undefined,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: discoverSidebarGap }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "themes" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img
                        src={getSidebarIconSrc("themes", "/icon-theme.png")}
                        alt=""
                        width={discoverSidebarIconSize}
                        height={discoverSidebarIconSize}
                        onClick={(event) => openSidebarIconFilePicker(event, "themes")}
                        title={uploadingSidebarIconKey === "themes" ? "Uploading..." : "Change icon"}
                        style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }}
                      />
                    </span>
                    <span style={discoverLabelStyle}>Themes</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openIconsView}
                  className={`sideSubItem ${nav === "icons" ? "active" : ""}`}
                  style={{
                    ...discoverRowStyle,
                    background: nav === "icons" ? "rgba(120, 128, 140, 0.09)" : "transparent",
                    border: nav === "icons" ? "1px solid rgba(146, 154, 166, 0.26)" : "1px solid transparent",
                    borderRadius: 10,
                    color: nav === "icons" ? "rgba(62, 70, 80, 0.92)" : undefined,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: discoverSidebarGap }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "icons" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img
                        src={getSidebarIconSrc("icons", "/icon-settings.png")}
                        alt=""
                        width={discoverSidebarIconSize}
                        height={discoverSidebarIconSize}
                        onClick={(event) => openSidebarIconFilePicker(event, "icons")}
                        title={uploadingSidebarIconKey === "icons" ? "Uploading..." : "Change icon"}
                        style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }}
                      />
                    </span>
                    <span style={discoverLabelStyle}>Icons</span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={openCoverSyncView}
                  className={`sideSubItem ${nav === "cover-sync" ? "active" : ""}`}
                  style={{
                    ...discoverRowStyle,
                    background: nav === "cover-sync" ? "rgba(120, 128, 140, 0.09)" : "transparent",
                    border: nav === "cover-sync" ? "1px solid rgba(146, 154, 166, 0.26)" : "1px solid transparent",
                    borderRadius: 10,
                    color: nav === "cover-sync" ? "rgba(62, 70, 80, 0.92)" : undefined,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: discoverSidebarGap }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 14,
                        borderRadius: 4,
                        background: nav === "cover-sync" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img
                        src={getSidebarIconSrc("r2-sync", "/icon-statistics.png")}
                        alt=""
                        width={discoverSidebarIconSize}
                        height={discoverSidebarIconSize}
                        onClick={(event) => openSidebarIconFilePicker(event, "r2-sync")}
                        title={uploadingSidebarIconKey === "r2-sync" ? "Uploading..." : "Change icon"}
                        style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none", cursor: "pointer" }}
                      />
                    </span>
                    <span style={discoverLabelStyle}>Cover Sync</span>
                  </span>
                </button>

              </div>

            </div>
            </div>


            {settingsPopupOpen && typeof document !== "undefined" ? createPortal(
              <div
                style={{
                  position: "fixed",
                  zIndex: SETTINGS_WINDOW_Z_INDEX,
                  display: "flex",
                  inset: 0,
                  justifyContent: "center",
                  alignItems: "stretch",
                  padding: `${SETTINGS_WINDOW_MARGIN}px`,
                  pointerEvents: "none",
                }}
              >
                <div
                  ref={settingsWindowRef}
                  onPointerDown={handleSettingsWindowPointerDown}
                  onPointerMove={handleSettingsWindowPointerMove}
                  onPointerUp={handleSettingsWindowPointerUp}
                  onPointerCancel={handleSettingsWindowPointerUp}
                  style={{
                    position: "fixed",
                    top: settingsWindowPosition?.y ?? SETTINGS_WINDOW_MARGIN,
                    left: settingsWindowPosition?.x ?? `calc((100vw - min(${SETTINGS_WINDOW_DEFAULT_WIDTH}px, calc(100vw - ${SETTINGS_WINDOW_MARGIN * 2}px))) / 2)`,
                    display: "flex",
                    flexDirection: "column",
                    width: `min(${SETTINGS_WINDOW_DEFAULT_WIDTH}px, calc(100vw - ${SETTINGS_WINDOW_MARGIN * 2}px))`,
                    height: `min(${SETTINGS_WINDOW_DEFAULT_HEIGHT}px, calc(100dvh - ${SETTINGS_WINDOW_MARGIN * 2}px))`,
                    maxHeight: `min(${SETTINGS_WINDOW_DEFAULT_HEIGHT}px, calc(100dvh - ${SETTINGS_WINDOW_MARGIN * 2}px))`,
                    minHeight: 0,
                    background: "rgba(246, 245, 243, 0.76)",
                    border: "1px solid rgba(255, 255, 255, 0.42)",
                    borderRadius: 16,
                    boxShadow: "0 28px 70px rgba(0, 0, 0, 0.32), 0 2px 8px rgba(139, 175, 244, 0.16)",
                    backdropFilter: "blur(18px) saturate(1.12)",
                    WebkitBackdropFilter: "blur(18px) saturate(1.12)",
                    overflow: "hidden",
                    pointerEvents: "auto",
                  }}
                >
                {/* Title bar */}
                <div
                  data-settings-window-drag-handle="true"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "13px 16px 12px",
                    borderBottom: "1px solid rgba(139, 175, 244, 0.18)",
                    cursor: "grab",
                    userSelect: "none",
                    touchAction: "none",
                    background: "rgba(255,255,255,0.48)",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ opacity: 0.55 }}>
                      <circle cx="7" cy="7" r="6" stroke="#8baff4" strokeWidth="1.5" />
                      <path d="M7 4v3l2 1.5" stroke="#8baff4" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#2c2c2e", letterSpacing: "-0.01em" }}>Settings</span>
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <button
                      onClick={() => setShowVersionNotes((prev) => !prev)}
                      title="Show recent version notes"
                      aria-label="Show recent version notes"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "3px 9px",
                        background: showVersionNotes ? "#8baff4" : "rgba(139, 175, 244, 0.14)",
                        border: "1px solid rgba(139, 175, 244, 0.4)",
                        borderRadius: 20,
                        color: showVersionNotes ? "#fff" : "#4a7ed4",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 700,
                        letterSpacing: "0.02em",
                        lineHeight: 1,
                        transition: "all 0.15s",
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
                        border: "1px solid rgba(0,0,0,0.14)",
                        background: "rgba(0,0,0,0.06)",
                        color: "#636366",
                        borderRadius: 20,
                        padding: "3px 10px",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: "0.02em",
                        transition: "all 0.15s",
                      }}
                    >
                      Close
                    </button>
                  </div>
                </div>

                {/* Scrollable body */}
                <div
                  ref={settingsBodyRef}
                  onScroll={updateSettingsScrollMetrics}
                  style={{
                    overflowY: "auto",
                    overflowX: "hidden",
                    overscrollBehavior: "contain",
                    WebkitOverflowScrolling: "touch",
                    scrollbarWidth: "thin",
                    scrollbarGutter: "stable",
                    position: "relative",
                    flex: 1,
                    minHeight: 0,
                    padding: "14px 16px 28px",
                    display: "grid",
                    gridTemplateColumns: isMobileLayout ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    alignContent: "start",
                    alignItems: "start",
                    gap: 12,
                  }}
                  className="settingsScrollArea"
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
                {/* Version Notes */}
                {showVersionNotes ? (
                  <div
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(139, 175, 244, 0.22)",
                      background: "rgba(139, 175, 244, 0.07)",
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#8baff4", letterSpacing: "0.06em", marginBottom: 8, textTransform: "uppercase" }}>Recent Updates</div>
                    {VERSION_HISTORY.slice(0, 3).map((entry) => (
                      <div key={entry.version} style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#2c2c2e" }}>
                          v{entry.version} <span style={{ opacity: 0.45, fontWeight: 500, fontSize: 10 }}>{entry.date}</span>
                        </div>
                        <ul style={{ margin: "3px 0 0 14px", padding: 0, fontSize: 10.5, lineHeight: 1.4, color: "#48484a" }}>
                          {entry.notes.map((note) => (
                            <li key={note}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Cover Sizes section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(139, 175, 244, 0.2)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "10px 14px 10px", borderBottom: "1px solid rgba(139, 175, 244, 0.14)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#8baff4", letterSpacing: "0.07em", textTransform: "uppercase" }}>Cover Sizes</div>
                      <button
                        type="button"
                        onClick={resetMediaCoverSizesToDefault}
                        style={{
                          border: "1px solid rgba(139, 175, 244, 0.35)",
                          background: "rgba(139,175,244,0.1)",
                          color: "#4a7ed4",
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 999,
                          padding: "3px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Reset Defaults
                      </button>
                    </div>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                    {(
                      [
                        { label: "Movies", key: "movies", value: mediaCoverSizePct.movies, min: 40, max: 140, step: 1 },
                        { label: "TV", key: "tv", value: mediaCoverSizePct.tv, min: 40, max: 140, step: 1 },
                        { label: "Books", key: "books", value: mediaCoverSizePct.books, min: 40, max: 140, step: 1 },
                        { label: "Audiobooks", key: "audiobooks", value: mediaCoverSizePct.audiobooks, min: 40, max: 140, step: 1 },
                        { label: "Games", key: "games", value: mediaCoverSizePct.games, min: 40, max: 140, step: 1 },
                      ] as { label: string; key: keyof typeof mediaCoverSizePct; value: number; min: number; max: number; step: number }[]
                    ).map(({ label, key, value, min, max, step }) => (
                      <label key={label} style={{ display: "grid", gridTemplateColumns: "64px 1fr 32px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>{label}</span>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={value}
                          onChange={(e) => updateMediaCoverSizePct(key, Number(e.target.value))}
                          style={{ width: "100%", accentColor: "#8baff4" }}
                        />
                        <span style={{ textAlign: "right", fontWeight: 600, color: "#4a7ed4", fontSize: 11 }}>{value}%</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Logo section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(244, 153, 16, 0.2)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSettingsOpen({ ...settingsOpen, logoSize: !settingsOpen.logoSize })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSettingsOpen({ ...settingsOpen, logoSize: !settingsOpen.logoSize });
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderBottom: settingsOpen.logoSize ? "1px solid rgba(244, 153, 16, 0.14)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#f49910", letterSpacing: "0.07em", textTransform: "uppercase" }}>Logo</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); resetLogoDefaults(); }} style={{ border: "1px solid rgba(244, 153, 16, 0.35)", background: "rgba(244,153,16,0.1)", color: "#c07800", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>Reset</button>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: settingsOpen.logoSize ? "rotate(180deg)" : "none", transition: "transform 0.2s", opacity: 0.5 }}>
                          <path d="M2 4l4 4 4-4" stroke="#f49910" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {settingsOpen.logoSize ? (
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                      {(
                        [
                          { label: "Size", value: logoSize, min: 60, max: 500, step: 5, update: updateLogoSize },
                          { label: "Top", value: logoTop, min: -50, max: 50, step: 1, update: updateLogoTop },
                          { label: "Left", value: logoLeft, min: -50, max: 50, step: 1, update: updateLogoLeft },
                        ] as { label: string; value: number; min: number; max: number; step: number; update: (v: number) => void }[]
                      ).map(({ label, value, min, max, step, update }) => (
                        <label key={label} style={{ display: "grid", gridTemplateColumns: "64px 1fr 32px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                          <span style={{ fontWeight: 500 }}>{label}</span>
                          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))} style={{ width: "100%", accentColor: "#f49910" }} />
                          <span style={{ textAlign: "right", fontWeight: 600, color: "#c07800", fontSize: 11 }}>{value}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Sync Status section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(139, 146, 14, 0.2)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSettingsOpen({ ...settingsOpen, syncIcon: !settingsOpen.syncIcon })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSettingsOpen({ ...settingsOpen, syncIcon: !settingsOpen.syncIcon });
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderBottom: settingsOpen.syncIcon ? "1px solid rgba(139, 146, 14, 0.14)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#8b920e", letterSpacing: "0.07em", textTransform: "uppercase" }}>Sync Status</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); resetSyncDefaults(); }} style={{ border: "1px solid rgba(139, 146, 14, 0.35)", background: "rgba(139,146,14,0.1)", color: "#6a7006", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>Reset</button>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: settingsOpen.syncIcon ? "rotate(180deg)" : "none", transition: "transform 0.2s", opacity: 0.5 }}>
                          <path d="M2 4l4 4 4-4" stroke="#8b920e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {settingsOpen.syncIcon ? (
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                      {(
                        [
                          { label: "Size", value: syncIconSize, min: 8, max: 24, step: 1, update: updateSyncIconSize },
                          { label: "Top", value: syncIconTop, min: -50, max: 50, step: 1, update: updateSyncIconTop },
                        ] as { label: string; value: number; min: number; max: number; step: number; update: (v: number) => void }[]
                      ).map(({ label, value, min, max, step, update }) => (
                        <label key={label} style={{ display: "grid", gridTemplateColumns: "64px 1fr 32px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                          <span style={{ fontWeight: 500 }}>{label}</span>
                          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))} style={{ width: "100%", accentColor: "#8b920e" }} />
                          <span style={{ textAlign: "right", fontWeight: 600, color: "#5c6200", fontSize: 11 }}>{value}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>
                {/* Status Icon section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(139, 175, 244, 0.2)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSettingsOpen({ ...settingsOpen, statusIcon: !settingsOpen.statusIcon })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSettingsOpen({ ...settingsOpen, statusIcon: !settingsOpen.statusIcon });
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderBottom: settingsOpen.statusIcon ? "1px solid rgba(139, 175, 244, 0.14)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#8baff4", letterSpacing: "0.07em", textTransform: "uppercase" }}>Status Icon</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); resetStatusIconDefaults(); }} style={{ border: "1px solid rgba(139, 175, 244, 0.35)", background: "rgba(139,175,244,0.1)", color: "#4a7ed4", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>Reset</button>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: settingsOpen.statusIcon ? "rotate(180deg)" : "none", transition: "transform 0.2s", opacity: 0.5 }}>
                          <path d="M2 4l4 4 4-4" stroke="#8baff4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {settingsOpen.statusIcon ? (
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                      <label style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Size</span>
                        <input type="range" min={50} max={220} step={5} value={statusIconScale} onChange={(e) => updateStatusIconScale(Number(e.target.value))} style={{ width: "100%", accentColor: "#8baff4" }} />
                        <span style={{ textAlign: "right", fontWeight: 600, color: "#4a7ed4", fontSize: 11 }}>{statusIconScale}%</span>
                      </label>
                      <label style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Offset X</span>
                        <input type="range" min={-30} max={30} step={1} value={statusIconOffsetX} onChange={(e) => updateStatusIconOffsetX(Number(e.target.value))} style={{ width: "100%", accentColor: "#8baff4" }} />
                        <span style={{ textAlign: "right", fontWeight: 600, color: "#4a7ed4", fontSize: 11 }}>{statusIconOffsetX}</span>
                      </label>
                      <label style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Offset Y</span>
                        <input type="range" min={-30} max={30} step={1} value={statusIconOffsetY} onChange={(e) => updateStatusIconOffsetY(Number(e.target.value))} style={{ width: "100%", accentColor: "#8baff4" }} />
                        <span style={{ textAlign: "right", fontWeight: 600, color: "#4a7ed4", fontSize: 11 }}>{statusIconOffsetY}</span>
                      </label>
                      <label style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Rating Sz</span>
                        <input type="range" min={50} max={180} step={5} value={ratingBadgeScale} onChange={(e) => updateRatingBadgeScale(Number(e.target.value))} style={{ width: "100%", accentColor: "#8baff4" }} />
                        <span style={{ textAlign: "right", fontWeight: 600, color: "#4a7ed4", fontSize: 11 }}>{ratingBadgeScale}%</span>
                      </label>
                      <label style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Rating X</span>
                        <input type="range" min={-30} max={30} step={1} value={ratingBadgeOffsetX} onChange={(e) => updateRatingBadgeOffsetX(Number(e.target.value))} style={{ width: "100%", accentColor: "#8baff4" }} />
                        <span style={{ textAlign: "right", fontWeight: 600, color: "#4a7ed4", fontSize: 11 }}>{ratingBadgeOffsetX}</span>
                      </label>
                      <label style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Rating Y</span>
                        <input type="range" min={-30} max={30} step={1} value={ratingBadgeOffsetY} onChange={(e) => updateRatingBadgeOffsetY(Number(e.target.value))} style={{ width: "100%", accentColor: "#8baff4" }} />
                        <span style={{ textAlign: "right", fontWeight: 600, color: "#4a7ed4", fontSize: 11 }}>{ratingBadgeOffsetY}</span>
                      </label>
                      <div style={{ height: 1, background: "rgba(139, 175, 244, 0.18)", margin: "4px 0" }} />
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#4a7ed4", letterSpacing: "0.05em", textTransform: "uppercase" }}>Status Icon Files</div>
                      {statusIconOptions.map((option) => {
                        const customSrc = getStatusIconSrc(option.key);
                        return (
                          <div key={`status-icon-option-${option.key}`} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, alignItems: "center" }}>
                            <button
                              type="button"
                              onClick={(event) => openStatusIconFilePicker(event, option.key)}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                width: "100%",
                                border: "1px solid rgba(139, 175, 244, 0.35)",
                                background: "rgba(255,255,255,0.9)",
                                borderRadius: 8,
                                padding: "6px 8px",
                                cursor: "pointer",
                              }}
                              title={uploadingStatusIconKey === option.key ? "Uploading..." : `Replace ${option.label} icon`}
                            >
                              <span style={{ width: 18, height: 18, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: option.color, border: `1px solid color-mix(in srgb, ${option.color} 75%, black)` }}>
                                {customSrc ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={customSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                ) : null}
                              </span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#3a3a3c", textAlign: "left" }}>{option.label}</span>
                            </button>
                            <span style={{ fontSize: 10, color: customSrc ? "#2f8f5b" : "#6a7484", fontWeight: 700 }}>{customSrc ? "Custom" : "Default"}</span>
                            <button
                              type="button"
                              onClick={() => resetStatusIconOverride(option.key)}
                              disabled={!customSrc}
                              style={{
                                border: "1px solid rgba(139, 175, 244, 0.35)",
                                background: customSrc ? "rgba(139, 175, 244, 0.12)" : "rgba(200,200,200,0.15)",
                                color: customSrc ? "#4a7ed4" : "#9aa3af",
                                borderRadius: 7,
                                padding: "5px 7px",
                                cursor: customSrc ? "pointer" : "default",
                                fontSize: 10,
                                fontWeight: 700,
                              }}
                            >
                              Reset
                            </button>
                          </div>
                        );
                      })}
                      <button
                        type="button"
                        onClick={resetAllStatusIconOverrides}
                        style={{
                          border: "1px solid rgba(139, 175, 244, 0.35)",
                          background: "rgba(139, 175, 244, 0.12)",
                          color: "#4a7ed4",
                          borderRadius: 8,
                          padding: "7px 8px",
                          cursor: "pointer",
                          fontSize: 10,
                          fontWeight: 800,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        Reset All To Default
                      </button>
                    </div>
                  ) : null}
                </div>

                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: 0 }}>
                {/* Sidebar section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(244, 153, 16, 0.2)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setSettingsOpen({ ...settingsOpen, sidebar: !settingsOpen.sidebar })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") setSettingsOpen({ ...settingsOpen, sidebar: !settingsOpen.sidebar });
                    }}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      border: "none",
                      background: "transparent",
                      cursor: "pointer",
                      borderBottom: settingsOpen.sidebar ? "1px solid rgba(244, 153, 16, 0.14)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", gap: 8 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#f49910", letterSpacing: "0.07em", textTransform: "uppercase" }}>Sidebar Spacing</div>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                        <button type="button" onClick={(e) => { e.stopPropagation(); resetSidebarDefaults(); }} style={{ border: "1px solid rgba(244, 153, 16, 0.35)", background: "rgba(244,153,16,0.1)", color: "#c07800", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>Reset</button>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: settingsOpen.sidebar ? "rotate(180deg)" : "none", transition: "transform 0.2s", opacity: 0.5 }}>
                          <path d="M2 4l4 4 4-4" stroke="#f49910" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  {settingsOpen.sidebar ? (
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#c07800", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>Sidebar Spacing</div>
                      {(
                        [
                          { label: "Between", value: sidebarSectionGap, min: -8, max: 20, step: 1, update: updateSidebarSectionGap },
                          { label: "Library", value: librarySidebarItemGap, min: -8, max: 12, step: 1, update: updateLibrarySidebarItemGap },
                          { label: "Smart", value: smartListsSidebarItemGap, min: -8, max: 12, step: 1, update: updateSmartListsSidebarItemGap },
                          { label: "Discover", value: discoverSidebarItemGap, min: -8, max: 12, step: 1, update: updateDiscoverSidebarItemGap },
                          { label: "Submenus", value: sidebarSubmenuGap, min: -8, max: 12, step: 1, update: updateSidebarSubmenuGap },
                          { label: "Rows", value: sidebarRowDensityOffset, min: -8, max: 8, step: 1, update: updateSidebarRowDensityOffset },
                        ] as { label: string; value: number; min: number; max: number; step: number; update: (v: number) => void }[]
                      ).map(({ label, value, min, max, step, update }) => (
                        <label key={`global-gap-${label}`} style={{ display: "grid", gridTemplateColumns: "72px 1fr 32px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                          <span style={{ fontWeight: 500 }}>{label}</span>
                          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))} style={{ width: "100%", accentColor: "#f49910" }} />
                          <span style={{ textAlign: "right", fontWeight: 600, color: "#c07800", fontSize: 11 }}>{value}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                </div>

                {/* Library Sidebar section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(244, 153, 16, 0.2)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(244, 153, 16, 0.14)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#f49910", letterSpacing: "0.07em", textTransform: "uppercase" }}>Library</div>
                    <button type="button" onClick={resetLibrarySidebarDefaults} style={{ border: "1px solid rgba(244, 153, 16, 0.35)", background: "rgba(244,153,16,0.1)", color: "#c07800", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>Reset</button>
                  </div>
                  {settingsOpen.sidebar ? (
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#c07800", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>Library</div>
                      {(
                        [
                          { label: "Icon Size", value: iconSize, min: 8, max: 64, step: 1, update: updateIconSize },
                          { label: "Font Size", value: sidebarFontSize, min: 10, max: 20, step: 1, update: updateSidebarFontSize },
                          { label: "Icon Gap", value: sidebarGap, min: 4, max: 20, step: 1, update: updateSidebarGap },
                          { label: "Header Sz", value: sidebarHeaderFontSize, min: 8, max: 16, step: 1, update: updateSidebarHeaderFontSize },
                        ] as { label: string; value: number; min: number; max: number; step: number; update: (v: number) => void }[]
                      ).map(({ label, value, min, max, step, update }) => (
                        <label key={`library-${label}`} style={{ display: "grid", gridTemplateColumns: "72px 1fr 32px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                          <span style={{ fontWeight: 500 }}>{label}</span>
                          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))} style={{ width: "100%", accentColor: "#f49910" }} />
                          <span style={{ textAlign: "right", fontWeight: 600, color: "#c07800", fontSize: 11 }}>{value}</span>
                        </label>
                      ))}
                      <label style={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Font Wt</span>
                        <select value={sidebarFontWeight} onChange={(e) => updateSidebarFontWeight(e.target.value)} style={{ fontSize: 11, borderRadius: 6, border: "1px solid rgba(244, 153, 16, 0.3)", padding: "3px 6px", background: "rgba(255,255,255,0.8)", color: "#3a3a3c" }}>
                          <option value="300">Light (300)</option>
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </label>
                      <label style={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Header Wt</span>
                        <select value={sidebarHeaderFontWeight} onChange={(e) => updateSidebarHeaderFontWeight(e.target.value)} style={{ fontSize: 11, borderRadius: 6, border: "1px solid rgba(244, 153, 16, 0.3)", padding: "3px 6px", background: "rgba(255,255,255,0.8)", color: "#3a3a3c" }}>
                          <option value="300">Light (300)</option>
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </label>

                    </div>
                  ) : null}
                </div>

                {/* Smart Lists Sidebar section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(244, 153, 16, 0.2)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(244, 153, 16, 0.14)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#f49910", letterSpacing: "0.07em", textTransform: "uppercase" }}>Smart Lists</div>
                    <button type="button" onClick={resetSmartListsSidebarDefaults} style={{ border: "1px solid rgba(244, 153, 16, 0.35)", background: "rgba(244,153,16,0.1)", color: "#c07800", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>Reset</button>
                  </div>
                  {settingsOpen.sidebar ? (
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#c07800", letterSpacing: "0.05em", textTransform: "uppercase" }}>Smart Lists</div>
                      {(
                        [
                          { label: "Icon Size", value: smartListsSidebarIconSize, min: 8, max: 64, step: 1, update: updateSmartListsSidebarIconSize },
                          { label: "Font Size", value: smartListsSidebarFontSize, min: 10, max: 20, step: 1, update: updateSmartListsSidebarFontSize },
                          { label: "Icon Gap", value: smartListsSidebarGap, min: 4, max: 20, step: 1, update: updateSmartListsSidebarGap },
                          { label: "Header Sz", value: smartListsSidebarHeaderFontSize, min: 8, max: 16, step: 1, update: updateSmartListsSidebarHeaderFontSize },
                        ] as { label: string; value: number; min: number; max: number; step: number; update: (v: number) => void }[]
                      ).map(({ label, value, min, max, step, update }) => (
                        <label key={`smart-${label}`} style={{ display: "grid", gridTemplateColumns: "72px 1fr 32px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                          <span style={{ fontWeight: 500 }}>{label}</span>
                          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))} style={{ width: "100%", accentColor: "#f49910" }} />
                          <span style={{ textAlign: "right", fontWeight: 600, color: "#c07800", fontSize: 11 }}>{value}</span>
                        </label>
                      ))}
                      <label style={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Font Wt</span>
                        <select value={smartListsSidebarFontWeight} onChange={(e) => updateSmartListsSidebarFontWeight(e.target.value)} style={{ fontSize: 11, borderRadius: 6, border: "1px solid rgba(244, 153, 16, 0.3)", padding: "3px 6px", background: "rgba(255,255,255,0.8)", color: "#3a3a3c" }}>
                          <option value="300">Light (300)</option>
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </label>
                      <label style={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Header Wt</span>
                        <select value={smartListsSidebarHeaderFontWeight} onChange={(e) => updateSmartListsSidebarHeaderFontWeight(e.target.value)} style={{ fontSize: 11, borderRadius: 6, border: "1px solid rgba(244, 153, 16, 0.3)", padding: "3px 6px", background: "rgba(255,255,255,0.8)", color: "#3a3a3c" }}>
                          <option value="300">Light (300)</option>
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </label>

                    </div>
                  ) : null}
                </div>

                {/* Discover Sidebar section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(244, 153, 16, 0.2)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(244, 153, 16, 0.14)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#f49910", letterSpacing: "0.07em", textTransform: "uppercase" }}>Discover</div>
                    <button type="button" onClick={resetDiscoverSidebarDefaults} style={{ border: "1px solid rgba(244, 153, 16, 0.35)", background: "rgba(244,153,16,0.1)", color: "#c07800", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>Reset</button>
                  </div>
                  {settingsOpen.sidebar ? (
                    <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                      <div style={{ fontSize: 10, fontWeight: 800, color: "#c07800", letterSpacing: "0.05em", textTransform: "uppercase" }}>Discover</div>
                      {(
                        [
                          { label: "Icon Size", value: discoverSidebarIconSize, min: 8, max: 64, step: 1, update: updateDiscoverSidebarIconSize },
                          { label: "Font Size", value: discoverSidebarFontSize, min: 10, max: 20, step: 1, update: updateDiscoverSidebarFontSize },
                          { label: "Icon Gap", value: discoverSidebarGap, min: 4, max: 20, step: 1, update: updateDiscoverSidebarGap },
                          { label: "Header Sz", value: discoverSidebarHeaderFontSize, min: 8, max: 16, step: 1, update: updateDiscoverSidebarHeaderFontSize },
                        ] as { label: string; value: number; min: number; max: number; step: number; update: (v: number) => void }[]
                      ).map(({ label, value, min, max, step, update }) => (
                        <label key={`discover-${label}`} style={{ display: "grid", gridTemplateColumns: "72px 1fr 32px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                          <span style={{ fontWeight: 500 }}>{label}</span>
                          <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => update(Number(e.target.value))} style={{ width: "100%", accentColor: "#f49910" }} />
                          <span style={{ textAlign: "right", fontWeight: 600, color: "#c07800", fontSize: 11 }}>{value}</span>
                        </label>
                      ))}
                      <label style={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Font Wt</span>
                        <select value={discoverSidebarFontWeight} onChange={(e) => updateDiscoverSidebarFontWeight(e.target.value)} style={{ fontSize: 11, borderRadius: 6, border: "1px solid rgba(244, 153, 16, 0.3)", padding: "3px 6px", background: "rgba(255,255,255,0.8)", color: "#3a3a3c" }}>
                          <option value="300">Light (300)</option>
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </label>
                      <label style={{ display: "grid", gridTemplateColumns: "72px 1fr", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>Header Wt</span>
                        <select value={discoverSidebarHeaderFontWeight} onChange={(e) => updateDiscoverSidebarHeaderFontWeight(e.target.value)} style={{ fontSize: 11, borderRadius: 6, border: "1px solid rgba(244, 153, 16, 0.3)", padding: "3px 6px", background: "rgba(255,255,255,0.8)", color: "#3a3a3c" }}>
                          <option value="300">Light (300)</option>
                          <option value="400">Normal (400)</option>
                          <option value="500">Medium (500)</option>
                          <option value="600">Semi-Bold (600)</option>
                          <option value="700">Bold (700)</option>
                        </select>
                      </label>
                    </div>
                  ) : null}
                </div>

                {/* Highlight Colors section */}
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(123, 132, 145, 0.25)",
                    background: "rgba(255,255,255,0.7)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderBottom: "1px solid rgba(123, 132, 145, 0.14)",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#66707d", letterSpacing: "0.07em", textTransform: "uppercase" }}>Highlight Colors</div>
                    <button type="button" onClick={resetSidebarDefaults} style={{ border: "1px solid rgba(123, 132, 145, 0.35)", background: "rgba(123,132,145,0.1)", color: "#53606f", fontSize: 10, fontWeight: 700, borderRadius: 999, padding: "3px 9px", cursor: "pointer" }}>Reset</button>
                  </div>
                  <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "inline-flex", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => setHighlightThemeEditorMode("light")}
                        style={{
                          borderRadius: 999,
                          border: highlightThemeEditorMode === "light" ? "1px solid rgba(123, 132, 145, 0.46)" : "1px solid rgba(123, 132, 145, 0.26)",
                          background: highlightThemeEditorMode === "light" ? "rgba(123,132,145,0.16)" : "rgba(255,255,255,0.64)",
                          color: "#53606f",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Light
                      </button>
                      <button
                        type="button"
                        onClick={() => setHighlightThemeEditorMode("dark")}
                        style={{
                          borderRadius: 999,
                          border: highlightThemeEditorMode === "dark" ? "1px solid rgba(123, 132, 145, 0.46)" : "1px solid rgba(123, 132, 145, 0.26)",
                          background: highlightThemeEditorMode === "dark" ? "rgba(123,132,145,0.16)" : "rgba(255,255,255,0.64)",
                          color: "#53606f",
                          fontSize: 10,
                          fontWeight: 700,
                          padding: "3px 10px",
                          cursor: "pointer",
                        }}
                      >
                        Dark
                      </button>
                    </div>
                    {(
                      [
                        { label: "Home", key: "home" as CoverScaleGroupKey },
                        { label: "Books", key: "books" as CoverScaleGroupKey },
                        { label: "Movies", key: "movies" as CoverScaleGroupKey },
                        { label: "TV", key: "tv" as CoverScaleGroupKey },
                        { label: "Games", key: "games" as CoverScaleGroupKey },
                      ]
                    ).map(({ label, key }) => (
                      <label key={`highlight-${key}`} style={{ display: "grid", gridTemplateColumns: "64px 1fr 64px", alignItems: "center", gap: 10, fontSize: 11, color: "#3a3a3c" }}>
                        <span style={{ fontWeight: 500 }}>{label}</span>
                        <input
                          type="color"
                          value={(highlightThemeEditorMode === "dark" ? sidebarHighlightColorsDark : sidebarHighlightColorsLight)[key]}
                          onChange={(e) => updateSidebarHighlightColor(key, e.target.value, highlightThemeEditorMode)}
                          style={{ width: "100%", height: 28, border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, background: "transparent", padding: 2, cursor: "pointer" }}
                        />
                        <span style={{ textAlign: "right", fontWeight: 600, color: "#53606f", fontSize: 10 }}>
                          {(highlightThemeEditorMode === "dark" ? sidebarHighlightColorsDark : sidebarHighlightColorsLight)[key].toUpperCase()}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sync conflicts */}
                {settingSyncConflicts.length ? (
                  <div
                    style={{
                      borderRadius: 10,
                      border: "1px solid rgba(255, 100, 100, 0.35)",
                      background: "rgba(255, 240, 240, 0.9)",
                      padding: "10px 12px",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#c0392b", letterSpacing: "0.05em", marginBottom: 4, textTransform: "uppercase" }}>
                      {settingSyncConflicts.length} Sync Conflict{settingSyncConflicts.length === 1 ? "" : "s"}
                    </div>
                    <div style={{ fontSize: 10, marginBottom: 8, lineHeight: 1.4, color: "#7b2020" }}>
                      {`Local ${settingSyncConflicts.length === 1 ? "value" : "values"} for ${settingSyncConflicts[0]}${settingSyncConflicts.length > 1 ? ", etc." : ""} differ from sheet values.`}
                    </div>
                    <button
                      onClick={clearSettingSyncConflicts}
                      style={{
                        width: "100%",
                        border: "1px solid rgba(192, 57, 43, 0.4)",
                        background: "rgba(192, 57, 43, 0.12)",
                        color: "#c0392b",
                        borderRadius: 7,
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: 10,
                        fontWeight: 700,
                      }}
                    >
                      Clear conflicting local cache values
                    </button>
                  </div>
                ) : null}

                  </div>
                </div>
              </div>
            </div>,
              document.body
            ) : null}


            </div>

            {/* Synced Module at Bottom */}
            {nav === "statistics" || nav === "roadmap" || nav === "cover-sync" || nav === "themes" || nav === "icons" ? null : (
            <div style={{ padding: "0 4px", marginTop: "auto", marginBottom: 12 }}>
              <div
                className={`sidebarModuleCard${isElectricBlueSidebarTheme ? " neon" : ""}`}
                style={{
                  background: sidebarModuleCardBackground,
                  borderRadius: 16,
                  boxShadow: sidebarModuleCardShadow,
                  border: sidebarModuleCardBorder,
                  borderBottom: sidebarModuleCardBorderBottom,
                  padding: "12px",
                }}
              >
              <div
                style={{
                  marginBottom: 8,
                  padding: "0 2px",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto minmax(0, 1fr) auto",
                    alignItems: "center",
                    columnGap: 8,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: currentTheme.syncedTextColor, whiteSpace: "nowrap" }}>
                    Cover Size
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={200}
                    step={1}
                    value={activeCoverScalePct}
                    onChange={(e) => updateCurrentCoverScale(Number(e.target.value))}
                    style={{ width: "100%", minWidth: 0 }}
                  />
                  <span style={{ minWidth: 36, textAlign: "right", fontSize: 11, fontWeight: 700, opacity: 0.85, color: currentTheme.syncedTextColor, whiteSpace: "nowrap" }}>
                    {`${activeCoverScalePct}%`}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 9,
                  background: isElectricBlueSidebarTheme
                    ? "linear-gradient(180deg, rgba(33, 67, 122, 0.46) 0%, rgba(19, 37, 76, 0.5) 100%)"
                    : "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
                  border: isElectricBlueSidebarTheme
                    ? "1px solid rgba(186, 223, 255, 0.7)"
                    : "1px solid rgba(92, 60, 56, 0.2)",
                  boxShadow: isElectricBlueSidebarTheme
                    ? "0 0 0 1px rgba(126, 191, 255, 0.24), 0 8px 16px rgba(3, 10, 22, 0.32), inset 0 1px 2px rgba(210, 236, 255, 0.34)"
                    : "0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
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
                      <div style={{ color: currentTheme.syncedTextColor, fontSize: 14, fontWeight: 500, fontFamily: sidebarSectionFontFamily }}>
                        {syncState === "saving"
                          ? "Syncing"
                          : syncState === "ok"
                          ? "Synced"
                          : syncState === "error"
                          ? "Error"
                          : "Idle"}
                      </div>
                      <div style={{ color: isDarkSidebarTheme ? "rgba(223, 236, 255, 0.9)" : "rgba(0,0,0,0.6)", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
                        {lastSyncAt ? formatLastSync(lastSyncAt) : "—"}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setRefreshNonce((n) => n + 1)}
                  style={{
                    border: isElectricBlueSidebarTheme ? "1px solid rgba(151, 196, 255, 0.62)" : "1px solid rgba(0,0,0,0.18)",
                    background: isElectricBlueSidebarTheme ? "rgba(18, 43, 82, 0.9)" : "rgba(255,255,255,0.85)",
                    color: isElectricBlueSidebarTheme ? "rgba(224, 239, 255, 0.98)" : "#754738",
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
            )}
          </div>
          </div>
        </aside>

        {/* RIGHT CONTENT */}
        <main
          style={{
            width: "100%",
            padding: isMobileLayout ? `0 0 ${mobileContentBottomPadding} 0` : "0 0 40px 0",
            boxSizing: "border-box",
            position: "relative",
            marginLeft: isMobileLayout ? 0 : "-1px",
            minWidth: 0,
            background: "transparent",
          }}
        >
          {nav !== "statistics" ? null : null}
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
                border: sidebarInlineCountBorder,
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
                border: sidebarInlineCountBorder,
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
                right: isMobileLayout ? 12 : 74,
                width: "min(320px, calc(100vw - 40px))",
	                zIndex: POPUP_PANEL_Z_INDEX,
	                padding: 14,
	                display: "flex",
	                flexDirection: "column",
	                gap: 10,
	                background: mobilePanelBackground,
	                border: mobilePanelBorder,
	                borderRadius: 14,
	                boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
	                backdropFilter: "blur(14px) saturate(1.15)",
                  WebkitBackdropFilter: "blur(14px) saturate(1.15)",
              }}
            >
              <div
                style={{
	                  display: "flex",
	                  alignItems: "center",
	                  justifyContent: "space-between",
	                  paddingBottom: 8,
	                  borderBottom: mobilePanelDivider,
	                }}
	              >
	                <span style={{ fontSize: 14, fontWeight: 800, color: mobilePanelTextColor }}>
	                  Sort
	                </span>
	                <button
	                  onClick={() => setSortPopupOpen(false)}
	                  style={{
	                    border: mobilePanelButtonBorder,
	                    background: mobilePanelButtonBackground,
	                    color: mobilePanelButtonTextColor,
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
	              <label
	                style={{
	                  display: "flex",
	                  flexDirection: "column",
	                  gap: 6,
	                  fontSize: 11,
	                  fontWeight: 700,
	                  color: mobilePanelSectionLabelColor,
	                }}
	              >
	                SORT BY
	                <select
	                  value={sortField}
                  onChange={(e) => handleSortFieldChange(e.target.value)}
	                  style={mobilePanelSelectStyle}
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
	                  {(nav === "home" || nav === "upcoming" || nav === "now-playing" || nav === "play-next" || nav === "wishlist" || nav === "wishlist-books" || nav === "watchlist-movies" || nav === "watchlist-tv" || nav === "current" || nav === "completed" || nav === "abandoned" || nav === "year-this" || nav === "smart-custom") && (
	                    <>
	                      <option value="Title">Title</option>
	                      <option value="ReleaseDate">Release Date</option>
	                      {nav === "wishlist" || nav === "play-next" ? <option value="CompletedDate">Date Completed</option> : null}
	                      {nav === "wishlist" || nav === "now-playing" || nav === "wishlist-books" || nav === "play-next" || nav === "watchlist-movies" || nav === "watchlist-tv" || (nav === "smart-custom" && activeSmartList?.allowManualSort) ? <option value={MANUAL_SORT_FIELD}>Manual</option> : null}
	                    </>
		                  )}
	                </select>
	              </label>
	              <label
	                style={{
	                  display: "flex",
	                  flexDirection: "column",
	                  gap: 6,
	                  fontSize: 11,
	                  fontWeight: 700,
	                  color: mobilePanelSectionLabelColor,
	                }}
	              >
	                ORDER
	                <select
	                  value={sortOrder}
                  onChange={(e) => handleSortOrderChange(e.target.value as "Asc" | "Desc")}
	                  disabled={(nav === "wishlist" || nav === "now-playing" || nav === "wishlist-books" || nav === "play-next" || nav === "watchlist-movies" || nav === "watchlist-tv" || (nav === "smart-custom" && activeSmartList?.allowManualSort)) && sortField === MANUAL_SORT_FIELD}
	                  style={mobilePanelSelectStyle}
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
            <StatisticsView
              books={allBooks}
              movies={allMovies}
              shows={allShows}
              games={allGames}
              coverOverrides={coverOverrides}
              onExit={handleExitStatistics}
              themeMode={shelfThemeMode}
              isMobileLayout={isMobileLayout}
              mediaTabColors={{
                book: activeSidebarHighlightColors.books,
                movie: activeSidebarHighlightColors.movies,
                tv: activeSidebarHighlightColors.tv,
                game: activeSidebarHighlightColors.games,
                yearReview: APP_PRIMARY_LOGO_COLORS.sky,
              }}
            />
          ) : nav === "roadmap" ? (
            <RoadmapView onExit={handleExitRoadmap} />
          ) : nav === "themes" ? (
            (() => {
              const themeChoices: Array<{
                key: ShelfThemeMode;
                label: string;
                description: string;
                shelfBg: string;
                tileBg: string;
                titleColor: string;
                accent: string;
              }> = [
                { key: "light", label: "Light", description: "Bright off-white shelves with crisp covers and dark titles.", shelfBg: "linear-gradient(180deg, #f6f5f3 0%, #e9e8e4 100%)", tileBg: "linear-gradient(135deg, #e6edf3 0%, #c6d4e3 100%)", titleColor: "rgba(48, 56, 70, 0.92)", accent: "#41b65c" },
                { key: "dark", label: "Dark", description: "Deep slate shelves with soft halos around covers and light titles.", shelfBg: "linear-gradient(180deg, #1c2128 0%, #14181d 100%)", tileBg: "linear-gradient(135deg, #3a4554 0%, #1f2731 100%)", titleColor: "rgba(232, 236, 244, 0.86)", accent: "#5fb3ff" },
                { key: "classic", label: "Classic", description: "Warm wood-tone shelves echoing the original Delicious Library look.", shelfBg: "linear-gradient(180deg, #8b6a44 0%, #614528 100%)", tileBg: "linear-gradient(135deg, #d6b58a 0%, #9a6f3e 100%)", titleColor: "rgba(247, 235, 215, 0.92)", accent: "#f0b463" },
              ];
              const preview = themeChoices.find((c) => c.key === shelfThemeMode) || themeChoices[0];
              const previewTextOnLight = "#2b3445";
              const previewTextOnDark = "rgba(235, 240, 248, 0.94)";
              const previewMutedOnLight = "rgba(70, 78, 90, 0.72)";
              const previewMutedOnDark = "rgba(220, 226, 236, 0.66)";
              const previewIsDark = preview.key === "dark";
              const previewPrimaryText = previewIsDark || preview.key === "classic" ? previewTextOnDark : previewTextOnLight;
              const previewMutedText = previewIsDark || preview.key === "classic" ? previewMutedOnDark : previewMutedOnLight;

              type PreviewSample = { key: string; title: string; coverUrl: string; mediaType: "book" | "movie" | "tv" | "game" };
              const previewSamples: PreviewSample[] = [];
              const collectSamples = (
                source: Array<{ item: any }>,
                mediaType: PreviewSample["mediaType"],
                max: number
              ) => {
                let added = 0;
                for (let i = 0; i < source.length && added < max; i++) {
                  const raw = source[i]?.item;
                  if (!raw) continue;
                  const typedItem = { ...raw, __type: mediaType };
                  const url = getDisplayCoverUrl(typedItem, true);
                  if (!url) continue;
                  previewSamples.push({
                    key: `${mediaType}-${added}-${safeStr(raw.title) || i}`,
                    title: safeStr(raw.title),
                    coverUrl: url,
                    mediaType,
                  });
                  added += 1;
                }
              };
              collectSamples(indexedBooks, "book", 2);
              collectSamples(indexedMovies, "movie", 2);
              collectSamples(indexedShows, "tv", 2);
              collectSamples(indexedGames, "game", 2);
              // Interleave by media type so each row mixes formats.
              const interleaved: PreviewSample[] = [];
              const buckets: Record<PreviewSample["mediaType"], PreviewSample[]> = { book: [], movie: [], tv: [], game: [] };
              for (const s of previewSamples) buckets[s.mediaType].push(s);
              const order: Array<PreviewSample["mediaType"]> = ["book", "movie", "tv", "game"];
              while (interleaved.length < previewSamples.length) {
                let advanced = false;
                for (const t of order) {
                  const next = buckets[t].shift();
                  if (next) { interleaved.push(next); advanced = true; }
                }
                if (!advanced) break;
              }
              const previewRows: PreviewSample[][] = [interleaved.slice(0, 4), interleaved.slice(4, 8)].filter((row) => row.length > 0);
              const previewHasItems = previewRows.length > 0;
              return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "linear-gradient(180deg, rgba(247,248,250,0.96) 0%, rgba(236,240,246,0.94) 100%)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobileLayout ? "12px 14px 10px" : "20px 28px 16px", borderBottom: "1px solid rgba(152, 162, 171, 0.22)", background: "rgba(252,253,255,0.78)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: isMobileLayout ? 10 : 14, minWidth: 0 }}>
                      <button type="button" onClick={handleExitThemes} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#576371", fontSize: isMobileLayout ? 20 : 22, padding: "0 4px", lineHeight: 1, flex: "0 0 auto" }} aria-label="Back">←</button>
                      <img src={getSidebarIconSrc("themes", "/icon-theme.png")} alt="" width={isMobileLayout ? 26 : 32} height={isMobileLayout ? 26 : 32} style={{ display: "block", borderRadius: 8, flex: "0 0 auto" }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: isMobileLayout ? 17 : 22, fontWeight: 750, color: "#1d2735", lineHeight: 1.1 }}>Themes</div>
                        <div style={{ fontSize: isMobileLayout ? 11 : 12, fontWeight: 500, color: "rgba(80, 90, 105, 0.78)", marginTop: 2, lineHeight: 1.3, display: isMobileLayout ? "-webkit-box" : "block", WebkitLineClamp: isMobileLayout ? 1 : undefined, WebkitBoxOrient: isMobileLayout ? "vertical" : undefined, overflow: isMobileLayout ? "hidden" : undefined }}>
                          {isMobileLayout ? "Choose a shelf look." : "Choose a shelf look and decide whether titles appear under each cover."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flex: 1, minHeight: 0, padding: isMobileLayout ? 14 : "24px 28px", gap: isMobileLayout ? 16 : 24, overflow: isMobileLayout ? "auto" : "hidden", flexDirection: isMobileLayout ? "column" : "row" }}>
                    {/* Options column */}
                    <div style={{ flex: isMobileLayout ? "0 0 auto" : "0 0 360px", display: "flex", flexDirection: "column", gap: isMobileLayout ? 12 : 18, overflowY: isMobileLayout ? "visible" : "auto", paddingRight: isMobileLayout ? 0 : 4 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(80,90,105,0.7)", textTransform: "uppercase" }}>Shelf Mode</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {themeChoices.map((choice) => {
                          const active = shelfThemeMode === choice.key;
                          return (
                            <button
                              key={`theme-choice-${choice.key}`}
                              type="button"
                              onClick={() => updateShelfThemeMode(choice.key)}
                              aria-pressed={active}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "14px 16px",
                                borderRadius: 14,
                                border: active ? "2px solid #41b65c" : "1px solid rgba(150, 160, 175, 0.32)",
                                background: active ? "rgba(65, 182, 92, 0.06)" : "rgba(255, 255, 255, 0.86)",
                                boxShadow: active ? "0 6px 18px rgba(65, 182, 92, 0.14)" : "0 2px 6px rgba(40, 50, 70, 0.05)",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "background 120ms ease, border-color 120ms ease, box-shadow 120ms ease",
                              }}
                            >
                              <span aria-hidden style={{ width: 64, height: 44, borderRadius: 10, background: choice.shelfBg, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 4, flex: "0 0 auto" }}>
                                <span style={{ width: 22, height: 30, borderRadius: 3, background: choice.tileBg, boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
                              </span>
                              <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                                <span style={{ fontSize: 16, fontWeight: 750, color: "#1d2735", letterSpacing: "-0.01em" }}>{choice.label}</span>
                                <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(80, 90, 105, 0.78)", lineHeight: 1.35 }}>{choice.description}</span>
                              </span>
                              <span aria-hidden style={{ width: 22, height: 22, borderRadius: 999, border: active ? "2px solid #41b65c" : "2px solid rgba(150,160,175,0.4)", display: "flex", alignItems: "center", justifyContent: "center", flex: "0 0 auto", background: active ? "#41b65c" : "transparent" }}>
                                {active ? <span style={{ width: 8, height: 8, borderRadius: 999, background: "#fff" }} /> : null}
                              </span>
                            </button>
                          );
                        })}
                      </div>

                      <div style={{ height: 1, background: "rgba(152, 162, 171, 0.2)", margin: "6px 0" }} />

                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(80,90,105,0.7)", textTransform: "uppercase" }}>Cover Labels</div>
                      <button
                        type="button"
                        onClick={() => updateCoverTitlesVisible(!coverTitlesVisible)}
                        aria-pressed={coverTitlesVisible}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 14,
                          padding: "14px 16px",
                          borderRadius: 14,
                          border: coverTitlesVisible ? "2px solid #41b65c" : "1px solid rgba(150, 160, 175, 0.32)",
                          background: coverTitlesVisible ? "rgba(65, 182, 92, 0.06)" : "rgba(255, 255, 255, 0.86)",
                          boxShadow: coverTitlesVisible ? "0 6px 18px rgba(65, 182, 92, 0.14)" : "0 2px 6px rgba(40, 50, 70, 0.05)",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span aria-hidden style={{ width: 64, height: 44, borderRadius: 10, background: "linear-gradient(180deg, #f6f5f3 0%, #e9e8e4 100%)", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", padding: 4, gap: 2, flex: "0 0 auto" }}>
                          <span style={{ width: 22, height: 26, borderRadius: 3, background: "linear-gradient(135deg, #e6edf3 0%, #c6d4e3 100%)", boxShadow: "0 1px 3px rgba(0,0,0,0.35)" }} />
                          {coverTitlesVisible ? <span style={{ width: 26, height: 3, borderRadius: 1, background: "rgba(48, 56, 70, 0.62)" }} /> : null}
                        </span>
                        <span style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 16, fontWeight: 750, color: "#1d2735", letterSpacing: "-0.01em" }}>Show Titles</span>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(80, 90, 105, 0.78)", lineHeight: 1.35 }}>
                            {coverTitlesVisible ? "Titles appear under every cover." : "Covers only — clean, exact spacing."}
                          </span>
                        </span>
                        <span aria-hidden style={{ width: 44, height: 24, borderRadius: 999, background: coverTitlesVisible ? "#41b65c" : "rgba(150,160,175,0.5)", padding: 2, display: "flex", flex: "0 0 auto", boxShadow: coverTitlesVisible ? "0 0 0 3px rgba(65,182,92,0.16)" : "none", transition: "background 140ms ease" }}>
                          <span style={{ width: 20, height: 20, borderRadius: 999, background: "#fff", marginLeft: coverTitlesVisible ? 20 : 0, transition: "margin-left 160ms cubic-bezier(0.22, 0.76, 0.2, 1)", boxShadow: "0 1px 3px rgba(0,0,0,0.28)" }} />
                        </span>
                      </button>
                    </div>

                    {/* Preview column */}
                    <div style={{ flex: isMobileLayout ? "0 0 auto" : 1, minWidth: 0, display: "flex", flexDirection: "column", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(152, 162, 171, 0.28)", background: "rgba(255,255,255,0.55)", boxShadow: "0 12px 28px rgba(40, 50, 70, 0.08)" }}>
                      <div style={{ padding: isMobileLayout ? "10px 14px" : "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(152, 162, 171, 0.24)", background: "rgba(252,253,255,0.85)", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ fontSize: isMobileLayout ? 11 : 12, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(80,90,105,0.75)", textTransform: "uppercase" }}>Live Preview</div>
                        <div style={{ fontSize: isMobileLayout ? 11 : 12, fontWeight: 700, color: "#1d2735" }}>{preview.label}{coverTitlesVisible ? " · Titles On" : " · Titles Off"}</div>
                      </div>
                      <div style={{ flex: isMobileLayout ? "0 0 auto" : 1, minHeight: 0, overflow: isMobileLayout ? "auto" : "auto", padding: isMobileLayout ? 16 : 24, background: preview.shelfBg, WebkitOverflowScrolling: "touch" }}>
                        {previewHasItems ? (
                          <div style={{ display: "flex", flexDirection: "column", gap: isMobileLayout ? 20 : 28 }}>
                            {previewRows.map((row, rowIdx) => {
                              const coverHeight = isMobileLayout ? 104 : 132;
                              const coverMaxW = isMobileLayout ? 132 : 160;
                              return (
                                <div key={`preview-row-${rowIdx}`} style={{ display: "flex", alignItems: "flex-end", gap: isMobileLayout ? 10 : 18, paddingBottom: 12, borderBottom: previewIsDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.08)", flexWrap: isMobileLayout ? "wrap" : "nowrap" }}>
                                  {row.map((sample) => {
                                    const coverShadow = previewIsDark
                                      ? "0 0 6px 0 rgba(0, 0, 0, 0.6)"
                                      : preview.key === "classic"
                                        ? "8px 10px 14px rgba(40, 22, 8, 0.32)"
                                        : "8px 10px 14px rgba(40, 50, 70, 0.22)";
                                    return (
                                      <div key={sample.key} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, maxWidth: coverMaxW }}>
                                        <img
                                          src={sample.coverUrl}
                                          alt={sample.title}
                                          loading="lazy"
                                          style={{
                                            height: coverHeight,
                                            width: "auto",
                                            maxWidth: coverMaxW,
                                            display: "block",
                                            borderRadius: 6,
                                            objectFit: "cover",
                                            boxShadow: coverShadow,
                                            background: preview.tileBg,
                                          }}
                                          onError={(e) => {
                                            e.currentTarget.style.display = "none";
                                          }}
                                        />
                                        {coverTitlesVisible ? (
                                          <div
                                            title={sample.title}
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 600,
                                              lineHeight: 1.2,
                                              color: previewPrimaryText,
                                              textAlign: "center",
                                              maxWidth: coverMaxW - 12,
                                              display: "-webkit-box",
                                              WebkitLineClamp: 2,
                                              WebkitBoxOrient: "vertical",
                                              overflow: "hidden",
                                            }}
                                          >
                                            {sample.title}
                                          </div>
                                        ) : null}
                                      </div>
                                    );
                                  })}
                                  {!isMobileLayout ? (
                                    <div style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: previewMutedText, alignSelf: "flex-end", paddingBottom: 6 }}>Shelf {rowIdx + 1}</div>
                                  ) : null}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 160, color: previewMutedText, fontSize: 13, fontWeight: 600, textAlign: "center", padding: 24 }}>
                            No covers available yet — add items to your library to see the preview here.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : nav === "icons" ? (
            (() => {
              const sidebarCatalog: Array<{ key: string; label: string; fallback: string }> = [
                { key: "home", label: "Home", fallback: "/icon-home.png" },
                { key: "books", label: "Books", fallback: "/icon-books.png" },
                { key: "movies", label: "Movies", fallback: "/icon-movies.png" },
                { key: "tv", label: "TV", fallback: "/icon-tv.png" },
                { key: "games", label: "Games", fallback: "/icon-games.png" },
                { key: "statistics", label: "Statistics", fallback: "/icon-statistics.png" },
                { key: "roadmap", label: "Roadmap", fallback: "/icon-year.png" },
                { key: "themes", label: "Themes", fallback: "/icon-theme.png" },
                { key: "icons", label: "Icons", fallback: "/icon-settings.png" },
                { key: "r2-sync", label: "Cover Sync", fallback: "/icon-statistics.png" },
              ];
              // Built-in Smart Lists use the sidebar-icon system (keyed by
              // their nav key), so they are managed exactly like sidebar icons.
              const builtInSmartListCatalog: Array<{ key: string; label: string; fallback: string }> = [
                { key: "year-this", label: builtInSmartListLabels["year-this"], fallback: "/icon-year.png" },
                { key: "current", label: builtInSmartListLabels["current"], fallback: "/icon-current.png" },
                { key: "completed", label: builtInSmartListLabels["completed"], fallback: "/icon-completed.png" },
                { key: "abandoned", label: builtInSmartListLabels["abandoned"], fallback: "/icon-abandoned.png" },
              ];
              const statusCatalog = statusIconOptions;
              const cardGridStyle: CSSProperties = { display: "grid", gridTemplateColumns: isMobileLayout ? "repeat(auto-fill, minmax(140px, 1fr))" : "repeat(auto-fill, minmax(180px, 1fr))", gap: isMobileLayout ? 12 : 16 };
              return (
                <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "linear-gradient(180deg, rgba(247,248,250,0.96) 0%, rgba(236,240,246,0.94) 100%)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: isMobileLayout ? "12px 14px 10px" : "20px 28px 16px", borderBottom: "1px solid rgba(152, 162, 171, 0.22)", background: "rgba(252,253,255,0.78)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", flexShrink: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: isMobileLayout ? 10 : 14, minWidth: 0 }}>
                      <button type="button" onClick={handleExitIcons} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#576371", fontSize: isMobileLayout ? 20 : 22, padding: "0 4px", lineHeight: 1, flex: "0 0 auto" }} aria-label="Back">←</button>
                      <img src={getSidebarIconSrc("icons", "/icon-settings.png")} alt="" width={isMobileLayout ? 26 : 32} height={isMobileLayout ? 26 : 32} style={{ display: "block", borderRadius: 8, flex: "0 0 auto" }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: isMobileLayout ? 17 : 22, fontWeight: 750, color: "#1d2735", lineHeight: 1.1 }}>Icons</div>
                        <div style={{ fontSize: isMobileLayout ? 11 : 12, fontWeight: 500, color: "rgba(80, 90, 105, 0.78)", marginTop: 2 }}>
                          {isMobileLayout ? "Tap any icon to replace it." : "Tap any icon to replace it — you'll be able to zoom and reposition before saving."}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ flex: 1, minHeight: 0, overflow: "auto", padding: isMobileLayout ? 14 : "24px 28px", WebkitOverflowScrolling: "touch" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: isMobileLayout ? 22 : 28 }}>
                      <section>
                        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(80,90,105,0.7)", textTransform: "uppercase", marginBottom: 12 }}>Sidebar Icons</div>
                        <div style={cardGridStyle}>
                          {sidebarCatalog.map((entry) => {
                            const url = getSidebarIconSrc(entry.key, entry.fallback);
                            const isUploading = uploadingSidebarIconKey === entry.key || (iconCropEditor?.iconKind === "sidebar" && iconCropEditor.iconKey === entry.key && iconCropEditor.saving);
                            const target: IconCropPickerTarget = { iconKind: "sidebar", iconKey: entry.key, iconLabel: entry.label };
                            return (
                              <button
                                key={`sidebar-icon-card-${entry.key}`}
                                type="button"
                                onClick={() => {
                                  if (url) {
                                    void openIconEditorWithUrl(target, url);
                                  } else {
                                    beginIconCrop(target);
                                  }
                                }}
                                disabled={isUploading}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: 14,
                                  borderRadius: 14,
                                  border: "1px solid rgba(150, 160, 175, 0.32)",
                                  background: "rgba(255,255,255,0.86)",
                                  boxShadow: "0 2px 6px rgba(40, 50, 70, 0.05)",
                                  cursor: isUploading ? "wait" : "pointer",
                                  opacity: isUploading ? 0.55 : 1,
                                  transition: "border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
                                }}
                                title={isUploading ? "Saving…" : `Replace ${entry.label} icon`}
                                aria-label={`Replace ${entry.label} icon`}
                              >
                                <div style={{ width: isMobileLayout ? 56 : 72, height: isMobileLayout ? 56 : 72, borderRadius: 12, background: "rgba(232, 237, 244, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid rgba(0,0,0,0.04)" }}>
                                  <img src={url} alt="" width={isMobileLayout ? 48 : 60} height={isMobileLayout ? 48 : 60} style={{ display: "block", objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }} />
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2735", lineHeight: 1.15, textAlign: "center" }}>{entry.label}</div>
                                <div style={{ fontSize: 11, fontWeight: 600, color: sidebarIconOverrides[entry.key] ? "#2f8f5b" : "rgba(80, 90, 105, 0.7)" }}>
                                  {sidebarIconOverrides[entry.key] ? "Custom" : "Default"}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      <section>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(80,90,105,0.7)", textTransform: "uppercase" }}>Status Icons</div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(80,90,105,0.6)" }}>Shown on covers when status indicators are on.</div>
                        </div>
                        <div style={cardGridStyle}>
                          {statusCatalog.map((option) => {
                            const customSrc = getStatusIconSrc(option.key);
                            const isUploading = uploadingStatusIconKey === option.key || (iconCropEditor?.iconKind === "status" && iconCropEditor.iconKey === option.key && iconCropEditor.saving);
                            const target: IconCropPickerTarget = { iconKind: "status", iconKey: option.key, iconLabel: option.label };
                            return (
                              <button
                                key={`status-icon-card-${option.key}`}
                                type="button"
                                onClick={() => {
                                  if (customSrc) {
                                    void openIconEditorWithUrl(target, customSrc);
                                  } else {
                                    beginIconCrop(target);
                                  }
                                }}
                                disabled={isUploading}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  alignItems: "center",
                                  gap: 10,
                                  padding: 14,
                                  borderRadius: 14,
                                  border: "1px solid rgba(150, 160, 175, 0.32)",
                                  background: "rgba(255,255,255,0.86)",
                                  boxShadow: "0 2px 6px rgba(40, 50, 70, 0.05)",
                                  cursor: isUploading ? "wait" : "pointer",
                                  opacity: isUploading ? 0.55 : 1,
                                }}
                                title={isUploading ? "Saving…" : customSrc ? `Edit ${option.label} icon` : `Choose ${option.label} icon`}
                                aria-label={customSrc ? `Edit ${option.label} icon` : `Choose ${option.label} icon`}
                              >
                                <div
                                  style={{
                                    width: isMobileLayout ? 56 : 72,
                                    height: isMobileLayout ? 56 : 72,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                                    background: customSrc ? "transparent" : option.color,
                                    border: customSrc
                                      ? "2px solid rgba(150, 160, 175, 0.32)"
                                      : `2px solid color-mix(in srgb, ${option.color} 70%, black)`,
                                    boxShadow: customSrc
                                      ? "0 2px 8px rgba(40, 50, 70, 0.18)"
                                      : `0 0 0 4px color-mix(in srgb, ${option.color} 22%, transparent)`,
                                  }}
                                >
                                  {customSrc ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={customSrc} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                                  ) : null}
                                </div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2735", lineHeight: 1.15, textAlign: "center" }}>{option.label}</div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: customSrc ? "#2f8f5b" : "rgba(80, 90, 105, 0.7)" }}>
                                    {customSrc ? "Custom" : "Default"}
                                  </span>
                                  {customSrc ? (
                                    <span
                                      role="button"
                                      tabIndex={0}
                                      onClick={(e) => { e.stopPropagation(); resetStatusIconOverride(option.key); }}
                                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); resetStatusIconOverride(option.key); } }}
                                      style={{ fontSize: 11, fontWeight: 700, color: "#4a7ed4", cursor: "pointer", textDecoration: "underline" }}
                                    >
                                      Reset
                                    </span>
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </section>

                      <section>
                        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(80,90,105,0.7)", textTransform: "uppercase" }}>Smart List Icons</div>
                          <div style={{ fontSize: 11, fontWeight: 500, color: "rgba(80,90,105,0.6)" }}>One icon per Smart List — built-in lists plus any you create.</div>
                        </div>
                          <div style={cardGridStyle}>
                            {builtInSmartListCatalog.map((entry) => {
                              const url = getSidebarIconSrc(entry.key, entry.fallback);
                              const isUploading = uploadingSidebarIconKey === entry.key || (iconCropEditor?.iconKind === "sidebar" && iconCropEditor.iconKey === entry.key && iconCropEditor.saving);
                              const target: IconCropPickerTarget = { iconKind: "sidebar", iconKey: entry.key, iconLabel: entry.label };
                              return (
                                <button
                                  key={`builtin-smartlist-icon-card-${entry.key}`}
                                  type="button"
                                  onClick={() => {
                                    if (url) {
                                      void openIconEditorWithUrl(target, url);
                                    } else {
                                      beginIconCrop(target);
                                    }
                                  }}
                                  disabled={isUploading}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: 14,
                                    borderRadius: 14,
                                    border: "1px solid rgba(150, 160, 175, 0.32)",
                                    background: "rgba(255,255,255,0.86)",
                                    boxShadow: "0 2px 6px rgba(40, 50, 70, 0.05)",
                                    cursor: isUploading ? "wait" : "pointer",
                                    opacity: isUploading ? 0.55 : 1,
                                    transition: "border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
                                  }}
                                  title={isUploading ? "Saving…" : `Replace ${entry.label} icon`}
                                  aria-label={`Replace ${entry.label} icon`}
                                >
                                  <div style={{ width: isMobileLayout ? 56 : 72, height: isMobileLayout ? 56 : 72, borderRadius: 12, background: "rgba(232, 237, 244, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid rgba(0,0,0,0.04)" }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={url} alt="" width={isMobileLayout ? 48 : 60} height={isMobileLayout ? 48 : 60} style={{ display: "block", objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }} />
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2735", lineHeight: 1.15, textAlign: "center" }}>{entry.label}</div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: sidebarIconOverrides[entry.key] ? "#2f8f5b" : "rgba(80, 90, 105, 0.7)" }}>
                                    {sidebarIconOverrides[entry.key] ? "Custom" : "Default"}
                                  </div>
                                </button>
                              );
                            })}
                            {customSmartLists.map((list) => {
                              const iconUrl = safeStr(list.icon);
                              const hasCustom = iconUrl.includes("/icons/sidebar/smartlist-");
                              const displayUrl = iconUrl || "/icon-other.png";
                              const isUploading = iconCropEditor?.iconKind === "smartlist" && iconCropEditor.iconKey === list.id && iconCropEditor.saving;
                              const target: IconCropPickerTarget = { iconKind: "smartlist", iconKey: list.id, iconLabel: list.name };
                              return (
                                <button
                                  key={`smartlist-icon-card-${list.id}`}
                                  type="button"
                                  onClick={() => {
                                    if (iconUrl) {
                                      void openIconEditorWithUrl(target, iconUrl);
                                    } else {
                                      beginIconCrop(target);
                                    }
                                  }}
                                  disabled={isUploading}
                                  style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    alignItems: "center",
                                    gap: 10,
                                    padding: 14,
                                    borderRadius: 14,
                                    border: "1px solid rgba(150, 160, 175, 0.32)",
                                    background: "rgba(255,255,255,0.86)",
                                    boxShadow: "0 2px 6px rgba(40, 50, 70, 0.05)",
                                    cursor: isUploading ? "wait" : "pointer",
                                    opacity: isUploading ? 0.55 : 1,
                                    transition: "border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
                                  }}
                                  title={isUploading ? "Saving…" : `Replace ${list.name} icon`}
                                  aria-label={`Replace ${list.name} icon`}
                                >
                                  <div style={{ width: isMobileLayout ? 56 : 72, height: isMobileLayout ? 56 : 72, borderRadius: 12, background: "rgba(232, 237, 244, 0.6)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: "1px solid rgba(0,0,0,0.04)" }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={displayUrl} alt="" width={isMobileLayout ? 48 : 60} height={isMobileLayout ? 48 : 60} style={{ display: "block", objectFit: "contain", maxWidth: "100%", maxHeight: "100%" }} />
                                  </div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1d2735", lineHeight: 1.15, textAlign: "center" }}>{list.name}</div>
                                  <div style={{ fontSize: 11, fontWeight: 600, color: hasCustom ? "#2f8f5b" : "rgba(80, 90, 105, 0.7)" }}>
                                    {hasCustom ? "Custom" : "Default"}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                      </section>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : nav === "cover-sync" ? (
            <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "linear-gradient(180deg, rgba(247,248,250,0.94) 0%, rgba(238,241,246,0.92) 100%)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px 14px", borderBottom: "1px solid rgba(152, 162, 171, 0.2)", background: "rgba(252,253,255,0.76)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button type="button" onClick={handleExitCoverSync} style={{ border: "none", background: "transparent", cursor: "pointer", color: "#576371", fontSize: 20, padding: "0 4px", lineHeight: 1 }}>←</button>
                  <div style={{ fontSize: 18, fontWeight: 750, color: "#1d2735" }}>Cover Sync Status</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={runBackdropMigrationToW1280}
                    disabled={backdropMigration.active || loading}
                    style={{
                      border: "1px solid rgba(74, 126, 212, 0.55)",
                      borderRadius: 9,
                      padding: "7px 12px",
                      background: backdropMigration.active
                        ? "rgba(74, 126, 212, 0.18)"
                        : "linear-gradient(180deg, rgba(110, 156, 232, 1) 0%, rgba(74, 126, 212, 1) 100%)",
                      color: backdropMigration.active ? "#274a82" : "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: backdropMigration.active ? "default" : "pointer",
                      opacity: loading ? 0.68 : 1,
                      boxShadow: backdropMigration.active ? "none" : "0 4px 10px rgba(74, 126, 212, 0.25)",
                    }}
                    title="Re-download every TMDB backdrop at w1280 and overwrite the R2 copy"
                  >
                    {backdropMigration.active ? `Migrating… ${backdropMigration.completed}/${backdropMigration.total}` : "Migrate Backdrops to HD"}
                  </button>
                  {backdropMigration.active ? (
                    <button
                      type="button"
                      onClick={cancelBackdropMigration}
                      style={{
                        border: "1px solid rgba(195, 80, 80, 0.45)",
                        borderRadius: 9,
                        padding: "7px 10px",
                        background: "rgba(195, 80, 80, 0.08)",
                        color: "#a4382f",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setRefreshNonce((n) => n + 1)}
                    disabled={loading || backdropMigration.active}
                    style={{
                      border: "1px solid rgba(121,131,145,0.44)",
                      borderRadius: 9,
                      padding: "7px 12px",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(241,244,249,0.95) 100%)",
                      color: "#2f3c4d",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: loading || backdropMigration.active ? "default" : "pointer",
                      opacity: loading || backdropMigration.active ? 0.68 : 1,
                    }}
                  >
                    {loading ? "Refreshing..." : "Refresh Sync Status"}
                  </button>
                </div>
              </div>

              {backdropMigration.active || backdropMigration.completed > 0 || backdropMigration.failed > 0 ? (
                <div style={{ padding: "8px 24px", borderBottom: "1px solid rgba(152, 162, 171, 0.15)", color: "#4e5a66", fontSize: 12, fontWeight: 600, background: "rgba(74, 126, 212, 0.06)", display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: 800, color: "#274a82" }}>Backdrop HD migration:</span>
                  <span>{backdropMigration.completed} / {backdropMigration.total} uploaded</span>
                  {backdropMigration.failed > 0 ? <span style={{ color: "#a4382f", fontWeight: 700 }}>· {backdropMigration.failed} failed</span> : null}
                  {backdropMigration.active && backdropMigration.currentTitle ? (
                    <span style={{ color: "#6a7484", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      · {backdropMigration.currentTitle}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div style={{ padding: "10px 24px", borderBottom: "1px solid rgba(152, 162, 171, 0.15)", color: "#4e5a66", fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.5)" }}>
                Bulk sync is now handled from the Google Sheet menu.
              </div>

              <div style={{ flex: 1, overflow: "auto", padding: "16px 24px" }}>
                {(() => {
                  const buildStatusRows = (rows: any[], mediaType: "book" | "movie" | "tv" | "game") =>
                    rows
                      .map((item) => {
                        const title = safeStr(item?.title || item?.Title || item?.name || "Untitled");
                        const coverSource = mediaType === "book"
                          ? safeStr(item?.imageUrl || item?.ImageURL || item?.["Image URL"])
                          : mediaType === "game"
                          ? safeStr(item?.coverUrl || item?.CoverURL)
                          : safeStr(item?.posterUrl || item?.PosterURL);
                        const backdropSource = mediaType === "book"
                          ? ""
                          : mediaType === "game"
                          ? safeStr(item?.screenshotsUrl || item?.ScreenshotsURL)
                          : safeStr(item?.backdropUrl || item?.BackdropURL);
                        const r2Cover = safeStr(item?.r2CoverUrl || item?.R2CoverUrl);
                        const r2Backdrop = safeStr(item?.r2BackdropUrl || item?.R2BackdropUrl);
                        const r2CoverDate = safeStr(item?.r2CoverUrlDate || item?.R2CoverUrl_Date);
                        const r2BackdropDate = safeStr(item?.r2BackdropUrlDate || item?.R2BackdropUrl_Date);
                        const missingCover = !r2Cover;
                        const missingBackdrop = mediaType !== "book" && !r2Backdrop;
                        return {
                          mediaType,
                          title,
                          missingCover,
                          missingBackdrop,
                          coverSource,
                          backdropSource,
                          r2Cover,
                          r2Backdrop,
                          r2CoverDate,
                          r2BackdropDate,
                          fullySynced: !missingCover && !missingBackdrop,
                        };
                      })
                      .filter((row) => Boolean(row.title));

                  const movieRowsStatus = buildStatusRows(movieRows, "movie");
                  const tvRowsStatus = buildStatusRows(tvRows, "tv");
                  const gameRowsStatus = buildStatusRows(gameRows, "game");
                  const bookRowsStatus = buildStatusRows(bookRows, "book");
                  const allRowsStatus = [...movieRowsStatus, ...tvRowsStatus, ...gameRowsStatus, ...bookRowsStatus];

                  const total = allRowsStatus.length;
                  const fullySynced = allRowsStatus.filter((r) => r.fullySynced).length;
                  const missingCover = allRowsStatus.filter((r) => r.missingCover).length;
                  const missingBackdrop = allRowsStatus.filter((r) => r.mediaType !== "book" && r.missingBackdrop).length;
                  const mediaLabel = (m: string) => (m === "movie" ? "Movies" : m === "tv" ? "Shows" : m === "game" ? "Games" : "Books");
                  const statusRank = (row: any) => (row.fullySynced ? 3 : row.missingCover && row.missingBackdrop ? 0 : row.missingCover || row.missingBackdrop ? 1 : 2);
                  const searchable = allRowsStatus.map((row) => ({
                    ...row,
                    mediaLabel: mediaLabel(row.mediaType),
                    statusLabel: row.fullySynced ? "Synced" : row.missingCover && row.missingBackdrop ? "Missing cover + backdrop" : row.missingCover ? "Missing cover" : row.missingBackdrop ? "Missing backdrop" : "Partial",
                  }));
                  const filteredRows = searchable.filter((row) => {
                    if (coverSyncMediaFilter !== "all" && row.mediaType !== coverSyncMediaFilter) return false;
                    if (coverSyncStateFilter === "unsynced" && row.fullySynced) return false;
                    if (coverSyncStateFilter === "synced" && !row.fullySynced) return false;
                    if (coverSyncStateFilter === "missing-cover" && !row.missingCover) return false;
                    if (coverSyncStateFilter === "missing-backdrop" && !row.missingBackdrop) return false;
                    const q = coverSyncQuery.trim().toLowerCase();
                    if (!q) return true;
                    return `${row.title} ${row.mediaType} ${row.statusLabel}`.toLowerCase().includes(q);
                  });
                  const sortedRows = [...filteredRows].sort((a, b) => {
                    const direction = coverSyncSortDir === "asc" ? 1 : -1;
                    if (coverSyncSortKey === "title") return a.title.localeCompare(b.title) * direction;
                    if (coverSyncSortKey === "media") return a.mediaLabel.localeCompare(b.mediaLabel) * direction;
                    if (coverSyncSortKey === "status") return (statusRank(a) - statusRank(b)) * direction;
                    if (coverSyncSortKey === "coverDate") return (safeStr(a.r2CoverDate).localeCompare(safeStr(b.r2CoverDate))) * direction;
                    return (safeStr(a.r2BackdropDate).localeCompare(safeStr(b.r2BackdropDate))) * direction;
                  });

                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10 }}>
                        {[
                          { label: "Total Media Items", value: String(total), accent: activeSidebarHighlightColors.home },
                          { label: "Fully Synced", value: String(fullySynced), accent: activeSidebarHighlightColors.books },
                          { label: "Missing R2 Cover", value: String(missingCover), accent: activeSidebarHighlightColors.movies },
                          { label: "Missing R2 Backdrop", value: String(missingBackdrop), accent: activeSidebarHighlightColors.games },
                        ].map((card) => (
                          <div key={card.label} style={{ border: `1px solid ${hexToRgba(card.accent, 0.42, "#96a2b0")}`, borderRadius: 10, background: `linear-gradient(180deg, ${hexToRgba(card.accent, 0.2, "#ffffff")} 0%, ${hexToRgba(card.accent, 0.1, "#f7faff")} 100%)`, boxShadow: "0 1px 6px rgba(31,41,55,0.06)", padding: "10px 12px" }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#4a5868" }}>{card.label}</div>
                            <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: "#1d2735" }}>{card.value}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ border: "1px solid rgba(152, 162, 171, 0.22)", borderRadius: 12, background: "rgba(255,255,255,0.94)", overflow: "hidden" }}>
                        <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(152, 162, 171, 0.18)", background: "rgba(245,246,248,0.92)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: "#445262" }}>Library Image Sync List</div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#5b6675" }}>{sortedRows.length} rows</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 120px 160px 130px 130px 130px 130px", gap: 8, padding: "10px 14px", background: "rgba(251,252,255,0.94)", borderBottom: "1px solid rgba(152, 162, 171, 0.16)", alignItems: "center" }}>
                          <input
                            value={coverSyncQuery}
                            onChange={(e) => setCoverSyncQuery(e.target.value)}
                            placeholder="Filter title or status…"
                            style={{ border: "1px solid rgba(145,157,172,0.45)", borderRadius: 8, padding: "7px 9px", background: "rgba(255,255,255,0.95)", fontSize: 12, color: "#1c2738" }}
                          />
                          <select value={coverSyncMediaFilter} onChange={(e) => setCoverSyncMediaFilter(e.target.value as any)} style={{ border: "1px solid rgba(145,157,172,0.45)", borderRadius: 8, padding: "7px 8px", background: "rgba(255,255,255,0.95)", fontSize: 12 }}>
                            <option value="all">All Media</option>
                            <option value="movie">Movies</option>
                            <option value="tv">Shows</option>
                            <option value="game">Games</option>
                            <option value="book">Books</option>
                          </select>
                          <select value={coverSyncStateFilter} onChange={(e) => setCoverSyncStateFilter(e.target.value as any)} style={{ border: "1px solid rgba(145,157,172,0.45)", borderRadius: 8, padding: "7px 8px", background: "rgba(255,255,255,0.95)", fontSize: 12 }}>
                            <option value="unsynced">Unsynced</option>
                            <option value="all">All Status</option>
                            <option value="synced">Synced only</option>
                            <option value="missing-cover">Missing cover</option>
                            <option value="missing-backdrop">Missing backdrop</option>
                          </select>
                          <select value={coverSyncSortKey} onChange={(e) => setCoverSyncSortKey(e.target.value as any)} style={{ border: "1px solid rgba(145,157,172,0.45)", borderRadius: 8, padding: "7px 8px", background: "rgba(255,255,255,0.95)", fontSize: 12 }}>
                            <option value="status">Sort: Status</option>
                            <option value="title">Sort: Title</option>
                            <option value="media">Sort: Media</option>
                            <option value="coverDate">Sort: Cover Date</option>
                            <option value="backdropDate">Sort: Backdrop Date</option>
                          </select>
                          <button type="button" onClick={() => setCoverSyncSortDir((prev) => prev === "asc" ? "desc" : "asc")} style={{ border: "1px solid rgba(121,131,145,0.5)", borderRadius: 8, padding: "7px 8px", background: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: 700, color: "#2f3c4d", cursor: "pointer" }}>
                            {coverSyncSortDir === "asc" ? "Asc" : "Desc"}
                          </button>
                          <button type="button" onClick={() => { setCoverSyncQuery(""); setCoverSyncMediaFilter("all"); setCoverSyncStateFilter("unsynced"); setCoverSyncSortKey("status"); setCoverSyncSortDir("asc"); }} style={{ border: "1px solid rgba(121,131,145,0.5)", borderRadius: 8, padding: "7px 8px", background: "rgba(255,255,255,0.95)", fontSize: 12, fontWeight: 700, color: "#2f3c4d", cursor: "pointer" }}>
                            Reset
                          </button>
                          <div style={{ display: "inline-flex", justifyContent: "center" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#4d5a6b", border: "1px solid rgba(152,162,171,0.35)", borderRadius: 999, padding: "4px 10px", background: "rgba(255,255,255,0.9)" }}>Airtable Mode</span>
                          </div>
                        </div>
                        <div style={{ overflow: "auto", maxHeight: "60vh" }}>
                          <div style={{ minWidth: 1180 }}>
                            <div style={{ display: "grid", gridTemplateColumns: "2.2fr 0.9fr 1.4fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "9px 14px", borderBottom: "1px solid rgba(152, 162, 171, 0.2)", background: "rgba(247,249,252,0.96)", fontSize: 11, fontWeight: 750, color: "#5a6676", position: "sticky", top: 0, zIndex: 2 }}>
                              <div>Title</div>
                              <div>Media</div>
                              <div>Status</div>
                              <div>Source Cover</div>
                              <div>Source Backdrop</div>
                              <div>R2 Cover</div>
                              <div>R2 Backdrop</div>
                              <div>Last Sync</div>
                            </div>
                            {sortedRows.length === 0 ? (
                              <div style={{ padding: "22px 14px", color: "#758191", fontSize: 12 }}>No rows match current filters.</div>
                            ) : (
                              sortedRows.map((row, idx) => {
                                const accent = row.mediaType === "movie" ? activeSidebarHighlightColors.movies : row.mediaType === "tv" ? activeSidebarHighlightColors.tv : row.mediaType === "game" ? activeSidebarHighlightColors.games : activeSidebarHighlightColors.books;
                                const statusText = row.fullySynced ? "Synced" : row.missingCover && row.missingBackdrop ? "Missing cover + backdrop" : row.missingCover ? "Missing cover" : row.missingBackdrop ? "Missing backdrop" : "Partial";
                                return (
                                  <div key={`${row.mediaType}-${row.title}-${idx}`} style={{ display: "grid", gridTemplateColumns: "2.2fr 0.9fr 1.4fr 1fr 1fr 1fr 1fr 1fr", gap: 8, padding: "9px 14px", borderBottom: "1px solid rgba(152, 162, 171, 0.1)", background: idx % 2 === 0 ? "rgba(255,255,255,0.92)" : "rgba(250,252,255,0.92)", fontSize: 12, color: "#263342", alignItems: "center" }}>
                                    <div style={{ fontWeight: 700, color: "#1f2a38", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.title}</div>
                                    <div><span style={{ fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "3px 8px", border: `1px solid ${accent}5a`, background: `${accent}1a`, color: "#334054" }}>{row.mediaLabel}</span></div>
                                    <div style={{ color: row.fullySynced ? "#0b7f3f" : "#9a4b00", fontWeight: 650 }}>{statusText}</div>
                                    <div style={{ color: row.coverSource ? "#0b7f3f" : "#9b1c1c", fontWeight: 650 }}>{row.coverSource ? "Yes" : "No"}</div>
                                    <div style={{ color: row.mediaType === "book" ? "#8390a0" : row.backdropSource ? "#0b7f3f" : "#9b1c1c", fontWeight: 650 }}>{row.mediaType === "book" ? "N/A" : row.backdropSource ? "Yes" : "No"}</div>
                                    <div style={{ color: row.r2Cover ? "#0b7f3f" : "#9b1c1c", fontWeight: 650 }}>{row.r2Cover ? "Yes" : "No"}</div>
                                    <div style={{ color: row.mediaType === "book" ? "#8390a0" : row.r2Backdrop ? "#0b7f3f" : "#9b1c1c", fontWeight: 650 }}>{row.mediaType === "book" ? "N/A" : row.r2Backdrop ? "Yes" : "No"}</div>
                                    <div style={{ color: "#58677a", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.r2CoverDate || row.r2BackdropDate || "—"}</div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()} 
              </div>
            </div>
          ) : bookDetailItem && getMediaType(bookDetailItem) === "book" ? (
            <BookDetailsPage
              key={getMediaItemKey(bookDetailItem)}
              item={bookDetailItem}
              allBooks={allBooks}
              isMobileLayout={isMobileLayout}
              usePageBackground
              onBack={() => setBookDetailItem(null)}
              onEdit={openBookEditModalFromDetails}
              onDelete={async (item) => {
                await handleDeleteLibraryItem(item);
                setBookDetailItem(null);
              }}
              onRate={(item) => handleOpenRateIt(item, "book", sidebarHighlightColorsLight.books)}
              onSelectRelated={(book) => {
                if (Boolean((book as any)?.__isRecommendation)) {
                  openAddFlowFromBookRecommendation(book);
                  return;
                }
                openBookDetailItem(book);
              }}
              recommendedBooks={bookRecommendations}
              getDisplayCoverUrl={getDisplayCoverUrl}
              isAudiobookItem={isAudiobookItem}
              onPaletteChange={handleBookDetailPaletteChange}
              highlightColor={sidebarHighlightColorsLight.books}
            />
          ) : movieDetailItem ? (
            <MovieDetailsPage
              key={getMediaItemKey(movieDetailItem)}
              item={movieDetailItem}
              isMobileLayout={isMobileLayout}
              usePageBackground={Boolean(activeMovieDetailBackground)}
              onBack={() => setMovieDetailItem(null)}
              onEdit={openMovieEditModalFromDetails}
              onDelete={async (item) => {
                await handleDeleteLibraryItem(item);
                setMovieDetailItem(null);
              }}
              onRate={(item) => handleOpenRateIt(item, "movie", sidebarHighlightColorsLight.movies)}
              getDisplayCoverUrl={getDisplayCoverUrl}
              getDisplayBackdropUrl={getDisplayBackdropUrl}
              onPaletteChange={handleMovieDetailPaletteChange}
              relatedMovies={movieRelated.movies}
              relatedMoviesLabel={movieRelated.label}
              recommendedMovies={movieRecommendations}
              onSelectRelated={(m) => {
                if (Boolean((m as any)?.__isRecommendation)) {
                  openAddFlowFromMovieRecommendation(m);
                  return;
                }
                setMovieDetailItem(m);
              }}
              highlightColor={sidebarHighlightColorsLight.movies}
            />
          ) : tvDetailItem ? (
            <TVDetailsPage
              key={getMediaItemKey(tvDetailItem)}
              item={tvDetailItem}
              isMobileLayout={isMobileLayout}
              usePageBackground={Boolean(activeTvDetailBackground)}
              onBack={() => setTvDetailItem(null)}
              onEdit={openTVEditModalFromDetails}
              onDelete={async (item) => {
                await handleDeleteLibraryItem(item);
                setTvDetailItem(null);
              }}
              onRate={(item) => handleOpenRateIt(item, "tv", sidebarHighlightColorsLight.tv)}
              getDisplayCoverUrl={getDisplayCoverUrl}
              getDisplayBackdropUrl={getDisplayBackdropUrl}
              onPaletteChange={handleTvDetailPaletteChange}
              relatedShows={tvRelated.shows}
              relatedShowsLabel={tvRelated.label}
              recommendedShows={tvRecommendations}
              onSelectRelated={(s) => {
                if (Boolean((s as any)?.__isRecommendation)) {
                  openAddFlowFromTvRecommendation(s);
                  return;
                }
                setTvDetailItem(s);
              }}
              highlightColor={sidebarHighlightColorsLight.tv}
            />
          ) : gameDetailItem ? (
            <GameDetailsPage
              key={getMediaItemKey(gameDetailItem)}
              item={gameDetailItem}
              isMobileLayout={isMobileLayout}
              usePageBackground={Boolean(activeGameDetailBackground)}
              onBack={() => setGameDetailItem(null)}
              onEdit={(item) => { setGameDetailEditItem(buildItemWithCoverSelection(item, coverOverrides)); setGameDetailsEditOpen(true); }}
              onDelete={async (item) => {
                await handleDeleteLibraryItem(item);
                setGameDetailItem(null);
              }}
              onRate={(item) => handleOpenRateIt(item, "game", sidebarHighlightColorsLight.games)}
              getDisplayCoverUrl={getDisplayCoverUrl}
              getDisplayBackdropUrl={getDisplayBackdropUrl}
              onPaletteChange={handleGameDetailPaletteChange}
              relatedGames={gameRelated.games}
              relatedGamesLabel={gameRelated.label}
              recommendedGames={gameRecommendations}
              onSelectRelatedGame={(g) => {
                if (Boolean((g as any)?.__isRecommendation)) {
                  openAddFlowFromGameRecommendation(g);
                  return;
                }
                setGameDetailItem(g);
              }}
              highlightColor={sidebarHighlightColorsLight.games}
            />
          ) : mobileLandingVisible ? (
            <div style={{ padding: "58px 14px 0", display: "flex", flexDirection: "column", gap: 14 }}>
              {mobileLandingCards.map((card) => (
                (() => {
                  const isTightIconCard =
                    card.key === "library" ||
                    card.key === "books" ||
                    card.key === "movies" ||
                    card.key === "tv" ||
                    card.key === "games";
                  const iconSizePx = isTightIconCard ? 72 : 84;
                  const labelMarginTop = (isTightIconCard ? -10 : -1) + 10;
                  return (
                <button
                  key={`mobile-landing-card-${card.key}`}
                  type="button"
                  onClick={() => {
                    if (card.action === "library") {
                      handleMobileFullLibrary();
                      return;
                    }
                    handleMobileNavSelect(card.navKey);
                  }}
                  style={{
                    border: "1px solid rgba(172, 178, 188, 0.34)",
                    borderRadius: 18,
                    background: "rgba(248, 250, 253, 0.86)",
                    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                    minHeight: 118,
                    padding: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 8,
                    alignItems: "center",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 3, minWidth: 96, width: 96 }}>
                    <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={card.icon} alt="" width={iconSizePx} height={iconSizePx} style={{ display: "block", objectFit: "contain" }} />
                    </div>
                    <div style={{ marginTop: labelMarginTop, width: "100%", textAlign: "center", fontSize: 17, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
                      {card.label}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", minHeight: 92, minWidth: 120, paddingRight: 4 }}>
                    {card.covers.map((coverUrl, index) => (
                      <div
                        key={`${card.key}-cover-${index}`}
                        style={{
                          width: 68,
                          height: 92,
                          borderRadius: 14,
                          overflow: "hidden",
                          border: "1px solid rgba(255,255,255,0.65)",
                          boxShadow: "0 8px 18px rgba(15, 23, 42, 0.28)",
                          marginLeft: index === 0 ? 0 : -30,
                          background: "rgba(226, 232, 240, 0.65)",
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={coverUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      </div>
                    ))}
                  </div>
                </button>
                );
                })()
              ))}
              <div
                style={{
                  border: "1px solid rgba(172, 178, 188, 0.34)",
                  borderRadius: 18,
                  background: "rgba(248, 250, 253, 0.86)",
                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 900, color: "#415168", letterSpacing: "0.04em" }}>
                  DISCOVER
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {[
                    {
                      key: "statistics",
                      label: "Statistics",
                      icon: getSidebarIconSrc("statistics", "/icon-statistics.png"),
                      action: () => {
                        setMobileSidebarOpen(false);
                        setMobileSettingsOpen(false);
                        setMobileSearchOpen(false);
                        setNav("statistics");
                      },
                    },
                    {
                      key: "roadmap",
                      label: "Roadmap",
                      icon: getSidebarIconSrc("roadmap", "/icon-statistics.png"),
                      action: () => {
                        setMobileSidebarOpen(false);
                        setMobileSettingsOpen(false);
                        setMobileSearchOpen(false);
                        setNav("roadmap");
                      },
                    },
                    {
                      key: "themes",
                      label: "Themes",
                      icon: getSidebarIconSrc("themes", "/icon-theme.png"),
                      action: () => {
                        setMobileSidebarOpen(false);
                        setMobileSearchOpen(false);
                        setMobileSettingsOpen(false);
                        openThemesView();
                      },
                    },
                    {
                      key: "cover-sync",
                      label: "Cover Sync",
                      icon: getSidebarIconSrc("r2-sync", "/icon-statistics.png"),
                      action: () => {
                        setMobileSidebarOpen(false);
                        setMobileSettingsOpen(false);
                        setMobileSearchOpen(false);
                        setNav("cover-sync");
                      },
                    },
                  ].map((item) => (
                    <button
                      key={`mobile-discover-card-${item.key}`}
                      type="button"
                      onClick={item.action}
                      style={{ border: "1px solid rgba(145, 160, 182, 0.42)", borderRadius: 12, background: "rgba(255,255,255,0.68)", color: "#1f2c3f", padding: "12px 11px", fontSize: 16, fontWeight: 800, textAlign: "left", display: "flex", alignItems: "center", gap: 10 }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.icon} alt="" width={32} height={32} style={{ display: "block", objectFit: "contain", flex: "0 0 auto" }} />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div
                style={{
                  border: "1px solid rgba(172, 178, 188, 0.34)",
                  borderRadius: 18,
                  background: "rgba(248, 250, 253, 0.86)",
                  boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => updateShowStatusIndicators(!showStatusIndicators)}
                  aria-label="Toggle status indicators"
                  aria-pressed={showStatusIndicators}
                  style={{
                    border: showStatusIndicators ? "1px solid rgba(91, 158, 72, 0.52)" : "1px solid rgba(145, 160, 182, 0.42)",
                    borderRadius: 14,
                    background: showStatusIndicators ? "rgba(105, 190, 88, 0.18)" : "rgba(255,255,255,0.68)",
                    color: showStatusIndicators ? "#1f6f35" : "#1f2c3f",
                    padding: "10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    gap: 5,
                    cursor: "pointer",
                    minHeight: 74,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#415168", letterSpacing: "0.04em" }}>STATUS</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 16, fontWeight: 900 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: showStatusIndicators ? "#41b65c" : "#9aa5b1",
                        boxShadow: showStatusIndicators ? "0 0 0 3px rgba(65, 182, 92, 0.16)" : "none",
                      }}
                    />
                    {showStatusIndicators ? "On" : "Off"}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => { if (!loading) setRefreshNonce((n) => n + 1); }}
                  disabled={loading}
                  aria-label="Refresh library data"
                  style={{
                    border: "1px solid rgba(145, 160, 182, 0.42)",
                    borderRadius: 14,
                    background: "rgba(255,255,255,0.68)",
                    color: "#1f2c3f",
                    padding: "10px 8px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    gap: 5,
                    cursor: loading ? "wait" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    minHeight: 74,
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 900, color: "#415168", letterSpacing: "0.04em" }}>REFRESH</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, fontSize: 16, fontWeight: 900 }}>
                    <span aria-hidden style={{ fontSize: 15 }}>↻</span>
                    {loading ? "Syncing…" : "Sync"}
                  </span>
                </button>
                </div>
                <div style={{ border: "1px solid rgba(145, 160, 182, 0.42)", borderRadius: 14, background: "rgba(255,255,255,0.68)", padding: "10px 9px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8, minWidth: 0, minHeight: 74 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: "#415168", letterSpacing: "0.04em" }}>{`${mobileCoverScaleGroup === "home" ? "HOME" : mobileCoverScaleGroup === "tv" ? "TV" : mobileCoverScaleGroup.toUpperCase()} COVER SIZE`}</span>
                    <span style={{ fontSize: 12, fontWeight: 900, color: "#1f2c3f" }}>{mobileCoverScalePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={250}
                    step={1}
                    value={mobileCoverScalePct}
                    onChange={(event) => updateMobileCoverScalePct(mobileCoverScaleGroup, Number(event.target.value))}
                    aria-label={`Scale ${mobileCoverScaleGroup} covers for mobile view`}
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
            </div>
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
		                    height: useHomeHeaderWrapLayout
		                      ? "auto"
		                      : isMobileLayout && (nav === "books" || nav === "movies" || nav === "tv" || nav === "games" || showBacklogHeaderQuickLinks) ? 56 : 45,
		                    minHeight: useHomeHeaderWrapLayout ? 45 : undefined,
		                    overflow: useHomeHeaderWrapLayout ? "visible" : "hidden",
		                    display: useHomeHeaderWrapLayout ? "flex" : undefined,
		                    flexWrap: useHomeHeaderWrapLayout ? "wrap" : undefined,
		                    alignItems: useHomeHeaderWrapLayout ? "center" : undefined,
		                    columnGap: useHomeHeaderWrapLayout ? 8 : undefined,
		                    rowGap: useHomeHeaderWrapLayout ? 4 : undefined,
		                    padding: useHomeHeaderWrapLayout ? "6px 10px" : undefined,
		                    background: isSimpleHeaderTheme
		                      ? stickyHeaderSimpleBackground
		                      : stickyHeaderDarkBackground,
		                    backdropFilter: stickyHeaderBlurPx > 0 ? `blur(${stickyHeaderBlurPx.toFixed(2)}px)` : "none",
		                    WebkitBackdropFilter: stickyHeaderBlurPx > 0 ? `blur(${stickyHeaderBlurPx.toFixed(2)}px)` : "none",
		                    isolation: "isolate",
		                    borderRadius: 0,
			                    zIndex: 2000,
			                  }}
			                >
                      {isMobileLayout && nav === "books" ? (
                        <div style={{ position: "absolute", left: 8, right: 8, top: 8, zIndex: 1402, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                          {([
                            ["library", "Library"],
                            ["upcoming", "Upcoming"],
                            ["completed", "Completed"],
                            ["wishlist", "Wishlist"],
                          ] as Array<[BookQuickLinkKey, string]>).map(([key, label]) => {
                            const active = activeBookQuickLink === key;
                            return (
                              <button
                                key={`mobile-book-quick-link-${key}`}
                                type="button"
                                onClick={() => activateBookQuickLink(key)}
                                style={{
                                  height: 28,
                                  padding: "0 10px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.books.border}` : "1px solid rgba(120,130,145,0.35)",
                                  background: active ? sidebarAccentPalette.books.background : "rgba(255,255,255,0.55)",
                                  color: active ? sidebarAccentPalette.books.text : "#4d5b6a",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {isMobileLayout && nav === "movies" ? (
                        <div style={{ position: "absolute", left: 8, right: 8, top: 8, zIndex: 1402, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                          {([
                            ["library", "Library"],
                            ["upcoming", "Upcoming"],
                            ["backlog", "Backlog"],
                            ["started", "Started"],
                            ["watched", "Watched"],
                            ["abandoned", "Abandoned"],
                          ] as Array<[MovieQuickLinkKey, string]>).map(([key, label]) => {
                            const active = activeMovieQuickLink === key;
                            return (
                              <button
                                key={`mobile-movie-quick-link-${key}`}
                                type="button"
                                onClick={() => activateMovieQuickLink(key)}
                                style={{
                                  height: 28,
                                  padding: "0 10px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.movies.border}` : "1px solid rgba(120,130,145,0.35)",
                                  background: active ? sidebarAccentPalette.movies.background : "rgba(255,255,255,0.55)",
                                  color: active ? sidebarAccentPalette.movies.text : "#4d5b6a",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {isMobileLayout && nav === "tv" ? (
                        <div style={{ position: "absolute", left: 8, right: 8, top: 8, zIndex: 1402, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                          {([
                            ["library", "Library"],
                            ["upcoming", "Upcoming"],
                            ["backlog", "Backlog"],
                            ["watching", "Watching"],
                            ["watched", "Watched"],
                            ["abandoned", "Abandoned"],
                          ] as Array<[TvQuickLinkKey, string]>).map(([key, label]) => {
                            const active = activeTvQuickLink === key;
                            return (
                              <button
                                key={`mobile-tv-quick-link-${key}`}
                                type="button"
                                onClick={() => activateTvQuickLink(key)}
                                style={{
                                  height: 28,
                                  padding: "0 10px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.tv.border}` : "1px solid rgba(120,130,145,0.35)",
                                  background: active ? sidebarAccentPalette.tv.background : "rgba(255,255,255,0.55)",
                                  color: active ? sidebarAccentPalette.tv.text : "#4d5b6a",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {isMobileLayout && nav === "games" ? (
                        <div style={{ position: "absolute", left: 8, right: 8, top: 8, zIndex: 1402, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                          {([
                            ["library", "Library"],
                            ["upcoming", "Upcoming"],
                            ["backlog", "Backlog"],
                            ["started", "Started"],
                            ["completed", "Completed"],
                            ["abandoned", "Abandoned"],
                          ] as Array<[GameQuickLinkKey, string]>).map(([key, label]) => {
                            const active = activeGameQuickLink === key;
                            return (
                              <button
                                key={`mobile-game-quick-link-${key}`}
                                type="button"
                                onClick={() => activateGameQuickLink(key)}
                                style={{
                                  height: 28,
                                  padding: "0 10px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.games.border}` : "1px solid rgba(120,130,145,0.35)",
                                  background: active ? sidebarAccentPalette.games.background : "rgba(255,255,255,0.55)",
                                  color: active ? sidebarAccentPalette.games.text : "#4d5b6a",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {showBacklogHeaderQuickLinks && isMobileLayout ? (
                        <div style={{ position: "absolute", left: 8, right: 8, top: 8, zIndex: 1402, display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                          {backlogHeaderQuickLinks.map(({ key, label }) => {
                            const active = activeBacklogQuickLink === key;
                            return (
                              <button
                                key={`mobile-backlog-quick-link-${key}`}
                                type="button"
                                onClick={() => {
                                  if (key === "home") {
                                    activateHomeLibrary();
                                    return;
                                  }
                                  if (key === "upcoming") {
                                    setSortField("ReleaseDate");
                                    setSortOrder("Asc");
                                  }
                                  setNav(key);
                                }}
                                style={{
                                  height: 28,
                                  padding: "0 10px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.home.border}` : "1px solid rgba(120,130,145,0.35)",
                                  background: active ? sidebarAccentPalette.home.background : "rgba(255,255,255,0.55)",
                                  color: active ? "#ffffff" : "#4d5b6a",
                                  fontSize: 11,
                                  fontWeight: 800,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {showBacklogHeaderQuickLinks && !isMobileLayout ? (
                        <div
                          style={{
                            position: useHomeHeaderWrapLayout ? "relative" : "absolute",
                            left: useHomeHeaderWrapLayout ? undefined : 12,
                            top: useHomeHeaderWrapLayout ? undefined : 8,
                            zIndex: 1402,
                            display: "flex",
                            alignItems: "center",
                            flexWrap: useHomeHeaderWrapLayout ? "wrap" : "nowrap",
                            flex: useHomeHeaderWrapLayout ? "1 1 auto" : undefined,
                            minWidth: useHomeHeaderWrapLayout ? 0 : undefined,
                            rowGap: useHomeHeaderWrapLayout ? 4 : undefined,
                            columnGap: 0,
                          }}
                        >
                          {backlogHeaderQuickLinks.map(({ key, label }) => {
                            const active = activeBacklogQuickLink === key;
                            return (
                              <button
                                key={`backlog-quick-link-${key}`}
                                type="button"
                                onClick={() => {
                                  if (key === "home") {
                                    activateHomeLibrary();
                                    return;
                                  }
                                  if (key === "upcoming") {
                                    setSortField("ReleaseDate");
                                    setSortOrder("Asc");
                                  }
                                  setNav(key);
                                }}
                                aria-pressed={active}
                                style={{
                                  height: 26,
                                  minWidth: 0,
                                  padding: "0 12px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.home.border}` : "1px solid transparent",
                                  background: active ? sidebarAccentPalette.home.background : "transparent",
                                  color: active ? "#ffffff" : "#6f7780",
                                  boxShadow: active ? "0 2px 7px rgba(122, 130, 141, 0.2)" : "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {nav === "movies" && !isMobileLayout ? (
                        <div
                          style={{
                            position: useHomeHeaderWrapLayout ? "relative" : "absolute",
                            left: useHomeHeaderWrapLayout ? undefined : 12,
                            top: useHomeHeaderWrapLayout ? undefined : 8,
                            zIndex: 1402,
                            display: "flex",
                            alignItems: "center",
                            flexWrap: useHomeHeaderWrapLayout ? "wrap" : "nowrap",
                            flex: useHomeHeaderWrapLayout ? "1 1 auto" : undefined,
                            minWidth: useHomeHeaderWrapLayout ? 0 : undefined,
                            rowGap: useHomeHeaderWrapLayout ? 4 : undefined,
                            columnGap: 0,
                          }}
                        >
                          {([
                            ["library", "Library"],
                            ["upcoming", "Upcoming"],
                            ["backlog", "Backlog"],
                            ["started", "Started"],
                            ["watched", "Watched"],
                            ["abandoned", "Abandoned"],
                          ] as Array<[MovieQuickLinkKey, string]>).map(([key, label]) => {
                            const active = activeMovieQuickLink === key;
                            return (
                              <button
                                key={`movie-quick-link-${key}`}
                                type="button"
                                onClick={() => activateMovieQuickLink(key)}
                                aria-pressed={active}
                                style={{
                                  height: 26,
                                  minWidth: 0,
                                  padding: "0 12px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.movies.border}` : "1px solid transparent",
                                  background: active ? sidebarAccentPalette.movies.background : "transparent",
                                  color: active ? sidebarAccentPalette.movies.text : "#6f7780",
                                  boxShadow: active ? "0 2px 7px rgba(92, 127, 196, 0.22)" : "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {nav === "tv" && !isMobileLayout ? (
                        <div
                          style={{
                            position: useHomeHeaderWrapLayout ? "relative" : "absolute",
                            left: useHomeHeaderWrapLayout ? undefined : 12,
                            top: useHomeHeaderWrapLayout ? undefined : 8,
                            zIndex: 1402,
                            display: "flex",
                            alignItems: "center",
                            flexWrap: useHomeHeaderWrapLayout ? "wrap" : "nowrap",
                            flex: useHomeHeaderWrapLayout ? "1 1 auto" : undefined,
                            minWidth: useHomeHeaderWrapLayout ? 0 : undefined,
                            rowGap: useHomeHeaderWrapLayout ? 4 : undefined,
                            columnGap: 0,
                          }}
                        >
                          {([
                            ["library", "Library"],
                            ["upcoming", "Upcoming"],
                            ["backlog", "Backlog"],
                            ["watching", "Watching"],
                            ["watched", "Watched"],
                            ["abandoned", "Abandoned"],
                          ] as Array<[TvQuickLinkKey, string]>).map(([key, label]) => {
                            const active = activeTvQuickLink === key;
                            return (
                              <button
                                key={`tv-quick-link-${key}`}
                                type="button"
                                onClick={() => activateTvQuickLink(key)}
                                aria-pressed={active}
                                style={{
                                  height: 26,
                                  minWidth: 0,
                                  padding: "0 12px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.tv.border}` : "1px solid transparent",
                                  background: active ? sidebarAccentPalette.tv.background : "transparent",
                                  color: active ? sidebarAccentPalette.tv.text : "#6f7780",
                                  boxShadow: active ? "0 2px 7px rgba(223, 121, 24, 0.22)" : "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {nav === "games" && !isMobileLayout ? (
                        <div
                          style={{
                            position: useHomeHeaderWrapLayout ? "relative" : "absolute",
                            left: useHomeHeaderWrapLayout ? undefined : 12,
                            top: useHomeHeaderWrapLayout ? undefined : 8,
                            zIndex: 1402,
                            display: "flex",
                            alignItems: "center",
                            flexWrap: useHomeHeaderWrapLayout ? "wrap" : "nowrap",
                            flex: useHomeHeaderWrapLayout ? "1 1 auto" : undefined,
                            minWidth: useHomeHeaderWrapLayout ? 0 : undefined,
                            rowGap: useHomeHeaderWrapLayout ? 4 : undefined,
                            columnGap: 0,
                          }}
                        >
                          {([
                            ["library", "Library"],
                            ["upcoming", "Upcoming"],
                            ["backlog", "Backlog"],
                            ["completed", "Completed"],
                            ["abandoned", "Abandoned"],
                            ["wishlist", "Wishlist"],
                          ] as Array<[GameQuickLinkKey, string]>).map(([key, label]) => {
                            const active = activeGameQuickLink === key;
                            return (
                              <button
                                key={`game-quick-link-${key}`}
                                type="button"
                                onClick={() => activateGameQuickLink(key)}
                                aria-pressed={active}
                                style={{
                                  height: 26,
                                  minWidth: 0,
                                  padding: "0 12px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.games.border}` : "1px solid transparent",
                                  background: active ? sidebarAccentPalette.games.background : "transparent",
                                  color: active ? sidebarAccentPalette.games.text : "#6f7780",
                                  boxShadow: active ? "0 2px 7px rgba(35, 119, 220, 0.22)" : "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      {nav === "books" && !isMobileLayout ? (
                        <div
                          style={{
                            position: useHomeHeaderWrapLayout ? "relative" : "absolute",
                            left: useHomeHeaderWrapLayout ? undefined : 12,
                            top: useHomeHeaderWrapLayout ? undefined : 8,
                            zIndex: 1402,
                            display: "flex",
                            alignItems: "center",
                            flexWrap: useHomeHeaderWrapLayout ? "wrap" : "nowrap",
                            flex: useHomeHeaderWrapLayout ? "1 1 auto" : undefined,
                            minWidth: useHomeHeaderWrapLayout ? 0 : undefined,
                            rowGap: useHomeHeaderWrapLayout ? 4 : undefined,
                            columnGap: 8,
                          }}
                        >
                          {([
                            ["library", "Library"],
                            ["upcoming", "Upcoming"],
                            ["completed", "Completed"],
                            ["wishlist", "Wishlist"],
                          ] as Array<[BookQuickLinkKey, string]>).map(([key, label]) => {
                            const active = activeBookQuickLink === key;
                            return (
                              <button
                                key={`book-quick-link-${key}`}
                                type="button"
                                onClick={() => activateBookQuickLink(key)}
                                aria-pressed={active}
                                style={{
                                  height: 26,
                                  minWidth: 0,
                                  padding: "0 12px",
                                  borderRadius: 999,
                                  border: active ? `1px solid ${sidebarAccentPalette.books.border}` : "1px solid transparent",
                                  background: active ? sidebarAccentPalette.books.background : "transparent",
                                  color: active ? sidebarAccentPalette.books.text : "#6f7780",
                                  boxShadow: active ? "0 2px 7px rgba(76, 154, 71, 0.22)" : "none",
                                  cursor: "pointer",
                                  fontSize: 12,
                                  fontWeight: 800,
                                  lineHeight: 1,
                                }}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
			                  <div
				                    style={{
				                      position: useHomeHeaderWrapLayout ? "relative" : "absolute",
			                      inset: useHomeHeaderWrapLayout ? undefined : 0,
			                      marginLeft: useHomeHeaderWrapLayout ? "auto" : undefined,
			                      flexShrink: useHomeHeaderWrapLayout ? 0 : undefined,
			                      zIndex: 1401,
			                      display: isMobileLayout ? "none" : "flex",
			                      flexDirection: "row",
			                      alignItems: "center",
			                      justifyContent: isMobileLayout ? "space-between" : "flex-end",
		                      paddingLeft: useHomeHeaderWrapLayout ? 0 : (isMobileLayout ? 6 : 10),
		                      paddingRight: useHomeHeaderWrapLayout ? 0 : (isMobileLayout ? 6 : 10),
		                      gap: 5,
		                      transform: useHomeHeaderWrapLayout ? undefined : "translateY(-4.5px)",
		                    }}
		                  >
		                    <div style={{ display: "flex", alignItems: "center", gap: 5, width: isMobileLayout ? "100%" : "auto" }}>
		                      {isMobileLayout ? (
		                        <button
		                          type="button"
		                          onClick={() => {
		                            setMobileSettingsOpen(false);
		                            setMobileSidebarOpen((prev) => !prev);
		                          }}
		                          title={mobileSidebarOpen ? "Close menu" : "Open menu"}
		                          aria-label={mobileSidebarOpen ? "Close menu" : "Open menu"}
		                          aria-expanded={mobileSidebarOpen}
		                          style={{
			                            display: "inline-flex",
			                            alignItems: "center",
			                            justifyContent: "center",
			                            height: 24,
			                            minWidth: 24,
			                            padding: "3px 6px",
			                            order: 2,
			                            background: isSimpleHeaderTheme ? "transparent" : "rgba(14, 30, 58, 0.82)",
			                            border: "none",
			                            borderRadius: 9,
		                            color: isSimpleHeaderTheme ? simpleHeaderTextColor : "rgba(250, 242, 230, 0.78)",
		                            boxShadow: isSimpleHeaderTheme ? simpleHeaderShadow : "0 3px 8px rgba(0, 0, 0, 0.42)",
		                            cursor: "pointer",
		                          }}
	                        >
	                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
	                            <line x1="4" y1="7" x2="20" y2="7" />
	                            <line x1="4" y1="12" x2="20" y2="12" />
	                            <line x1="4" y1="17" x2="20" y2="17" />
	                          </svg>
	                        </button>
	                      ) : null}
                      {isMobileLayout ? (
                        <button
                          type="button"
                          onClick={() => {
                            setMobileSidebarOpen(false);
                            setMobileSettingsOpen((prev) => !prev);
                          }}
                          title={mobileSettingsOpen ? "Close settings menu" : "Open settings menu"}
                          aria-label={mobileSettingsOpen ? "Close settings menu" : "Open settings menu"}
                          aria-expanded={mobileSettingsOpen}
	                          style={{
	                            display: "inline-flex",
	                            alignItems: "center",
	                            justifyContent: "center",
	                            height: 24,
	                            minWidth: 24,
	                            padding: "3px 6px",
	                            order: 3,
	                            background: isSimpleHeaderTheme ? simpleHeaderElevatedBackground : "rgba(14, 30, 58, 0.82)",
	                            border: isSimpleHeaderTheme ? simpleHeaderBorderColor : "1px solid rgba(146, 181, 235, 0.52)",
	                            borderRadius: 9,
	                            color: isSimpleHeaderTheme ? simpleHeaderTextColor : "rgba(250, 242, 230, 0.78)",
	                            boxShadow: isSimpleHeaderTheme ? simpleHeaderShadow : "0 3px 8px rgba(0, 0, 0, 0.42)",
	                            cursor: "pointer",
	                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c0 .68.4 1.3 1.03 1.56.17.07.35.11.53.11H21a2 2 0 1 1 0 4h-.09c-.18 0-.36.04-.53.11-.63.26-1.03.88-1.03 1.56z"></path>
                          </svg>
                        </button>
                      ) : (
                        <>
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
                              background: isSimpleHeaderTheme ? "transparent" : "rgba(28, 18, 10, 0.52)",
                              border: "none",
                              borderRadius: 9,
                              color: isSimpleHeaderTheme ? simpleHeaderTextColor : "rgba(250, 242, 230, 0.72)",
                              boxShadow: isSimpleHeaderTheme ? simpleHeaderShadow : "0 3px 8px rgba(0, 0, 0, 0.34)",
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
                              background: isSimpleHeaderTheme
                                ? "transparent"
                                : showStatusIndicators
                                ? "linear-gradient(180deg, rgba(84, 129, 60, 0.76), rgba(54, 92, 38, 0.78))"
                                : "rgba(28, 18, 10, 0.52)",
                              border: isSimpleHeaderTheme
                                ? "none"
                                : showStatusIndicators
                                ? "1px solid rgba(190, 221, 166, 0.75)"
                                : "1px solid rgba(10, 6, 3, 0.78)",
                              borderRadius: 9,
                              color: isSimpleHeaderTheme
                                ? showStatusIndicators
                                  ? simpleHeaderStrongTextColor
                                  : simpleHeaderTextColor
                                : showStatusIndicators
                                  ? "rgba(242, 255, 228, 0.95)"
                                  : "rgba(250, 242, 230, 0.72)",
                              boxShadow: isSimpleHeaderTheme
                                ? "none"
                                : showStatusIndicators
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
                                background: isSimpleHeaderTheme
                                  ? showStatusIndicators
                                    ? simpleHeaderStatusOnColor
                                    : simpleHeaderStatusOffColor
                                  : showStatusIndicators
                                    ? "rgba(194, 246, 166, 0.95)"
                                    : "rgba(250, 242, 230, 0.45)",
                                boxShadow: isSimpleHeaderTheme
                                  ? showStatusIndicators
                                    ? "0 0 0 1px rgba(255, 255, 255, 0.16), 0 0 8px rgba(47, 143, 91, 0.28)"
                                    : "0 0 0 1px rgba(255, 255, 255, 0.16), 0 0 8px rgba(178, 59, 59, 0.22)"
                                  : showStatusIndicators
                                  ? "0 0 0 1px rgba(173, 237, 138, 0.8), 0 0 8px rgba(150, 223, 108, 0.55)"
                                  : "0 0 0 1px rgba(255, 255, 255, 0.2)",
                              }}
                            />
                            Status
                          </button>
                        </>
                      )}
	                    </div>
		                    <div
		                      style={{
		                        display: isMobileLayout ? "none" : "flex",
		                        alignItems: "center",
		                        gap: 5,
		                      }}
		                    >
                    <span
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          color: isSimpleHeaderTheme ? simpleHeaderTextColor : "rgba(250, 242, 230, 0.68)",
                          letterSpacing: "0.01em",
                          lineHeight: 1,
                          textShadow: isSimpleHeaderTheme ? "none" : "0 2px 4px rgba(0, 0, 0, 0.5)",
                          background: isSimpleHeaderTheme ? simpleHeaderBackground : "rgba(28, 18, 10, 0.52)",
                          border: isSimpleHeaderTheme ? simpleHeaderBorderColor : "1px solid rgba(10, 6, 3, 0.78)",
                          borderRadius: 9,
                          padding: "4px 7px",
                          boxShadow: isSimpleHeaderTheme ? simpleHeaderShadow : "0 3px 8px rgba(0, 0, 0, 0.34)",
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
                        height: 30,
                        minWidth: 24,
                        padding: "5px 8px",
                        background: isSimpleHeaderTheme ? simpleHeaderBackground : "rgba(28, 18, 10, 0.52)",
                        border: isSimpleHeaderTheme ? simpleHeaderBorderColor : "1px solid rgba(10, 6, 3, 0.78)",
                        borderRadius: 9,
                        color: isSimpleHeaderTheme ? simpleHeaderTextColor : "rgba(250, 242, 230, 0.68)",
                        boxShadow: isSimpleHeaderTheme ? simpleHeaderShadow : "0 3px 8px rgba(0, 0, 0, 0.34)",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                        setAddModalOpen(true);
                      }}
                      title="Add new item"
                      aria-label="Add new item"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 30,
                        minWidth: 24,
                        padding: "5px 8px",
                        background: isSimpleHeaderTheme ? simpleHeaderBackground : "rgba(28, 18, 10, 0.52)",
                        border: isSimpleHeaderTheme ? simpleHeaderBorderColor : "1px solid rgba(10, 6, 3, 0.78)",
                        borderRadius: 9,
                        color: isSimpleHeaderTheme ? simpleHeaderTextColor : "rgba(250, 242, 230, 0.68)",
                        boxShadow: isSimpleHeaderTheme ? simpleHeaderShadow : "0 3px 8px rgba(0, 0, 0, 0.34)",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                          height: 30,
                          minWidth: 24,
                          padding: "5px 8px",
                          background: isSimpleHeaderTheme ? simpleHeaderBackground : "rgba(28, 18, 10, 0.52)",
                          border: isSimpleHeaderTheme ? simpleHeaderBorderColor : "1px solid rgba(10, 6, 3, 0.78)",
                          borderRadius: 9,
                          color: isSimpleHeaderTheme ? simpleHeaderTextColor : "rgba(250, 242, 230, 0.68)",
                          boxShadow: isSimpleHeaderTheme ? simpleHeaderShadow : "0 3px 8px rgba(0, 0, 0, 0.34)",
                          cursor: "pointer",
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c0 .68.4 1.3 1.03 1.56.17.07.35.11.53.11H21a2 2 0 1 1 0 4h-.09c-.18 0-.36.04-.53.11-.63.26-1.03.88-1.03 1.56z"></path>
                        </svg>
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              {smartListBuilderOpen ? (
                <div style={{ height: Math.max(0, shelfOffsets.totalHeight) }} />
              ) : (
                <div style={{ position: "relative" }}>
              {isSimpleShelfPresentation ? (
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    backgroundImage: simplePresentationBackground,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center top",
                    backgroundSize: "100% 100%",
                    backgroundColor: simpleShelfBackgroundColor,
                  }}
                />
              ) : null}
              {shelfRenderWindow.padTop > 0 ? (
                <div style={{ height: shelfRenderWindow.padTop }} />
              ) : null}
              {visibleShelves.map((shelfShows, visibleShelfIndex) => {
                const shelfIndex = shelfRenderWindow.start + visibleShelfIndex;
                const tvWatchlistShelfSection =
                  nav === "watchlist-tv" && shelfShows.length > 0
                    ? getTvWatchlistSectionForItem(shelfShows[0])
                    : null;
                const tvWatchlistPreviousShelfSection =
                  nav === "watchlist-tv" && shelfIndex > 0
                    ? getTvWatchlistSectionForItem(shelves[shelfIndex - 1]?.[0])
                    : null;
                const showTvWatchlistSectionHeader =
                  Boolean(tvWatchlistShelfSection) && tvWatchlistShelfSection !== tvWatchlistPreviousShelfSection;
                const tvWatchlistSectionMeta = tvWatchlistShelfSection
                  ? TV_WATCHLIST_SECTION_META[tvWatchlistShelfSection]
                  : null;
                return (
                <div
                  key={`shelf-${shelfIndex}`}
                  style={{
                    position: "relative",
                    height: shelfHeights[shelfIndex] || shelfRowHeight,
                    overflow: isUpcomingView ? "visible" : "hidden",
                    backgroundImage: isSimpleShelfPresentation ? "none" : `url(${shelfTheme})`,
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "center",
                    backgroundSize: isElectricBlueShelfPresentation
                      ? "calc(100% + 2px) calc(100% + 2px)"
                      : isSimpleShelfPresentation
                        ? "auto"
                        : "100% 100%",
                    backgroundColor: isElectricBlueShelfPresentation ? "rgba(5, 13, 30, 0.9)" : "transparent",
                    borderRadius: 0,
                    boxShadow: isElectricBlueShelfPresentation
                      ? `${shelfIndex === 0 ? "0 14px 28px rgba(4,12,24,0.52), " : "0 10px 20px rgba(4,12,24,0.4), "}0 0 22px rgba(78,150,255,0.18), inset 0 0 0 1px rgba(8,24,50,0.72), inset 0 20px 30px rgba(2,6,18,0.58), inset 0 -1px 0 rgba(168, 213, 255, 0.32), inset 16px 0 24px rgba(2,10,24,0.42), inset -16px 0 24px rgba(2,10,24,0.42)`
                      : isSimpleShelfPresentation
                        ? "none"
                        : `${shelfIndex === 0 ? "0 12px 26px rgba(0,0,0,0.18), " : ""}inset 0 20px 30px rgba(0,0,0,0.45), inset 16px 0 24px rgba(0,0,0,0.35), inset -16px 0 24px rgba(0,0,0,0.35)`,
                    outline: sandboxMode ? "1px dashed rgba(255, 214, 102, 0.34)" : "none",
                  }}
                >
                  {sandboxMode ? (
                    <div
                      aria-hidden
                      style={{
                        position: "absolute",
                        left: 10,
                        top: 8,
                        zIndex: 40,
                        padding: "3px 7px",
                        borderRadius: 999,
                        border: sandboxOverlayBorder,
                        background: sandboxOverlayBg,
                        color: sandboxOverlayText,
                        fontSize: 9,
                        fontWeight: 900,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
                      }}
                    >
                      Row {shelfIndex + 1} · h {Math.round(shelfHeights[shelfIndex] || shelfRowHeight)}px · gap {Math.round(shelfGap)}px
                    </div>
                  ) : null}
                  {showTvWatchlistSectionHeader && tvWatchlistSectionMeta ? (
                    <div
                      style={{
                        position: "absolute",
                        left: shelfSidePadding,
                        right: shelfSidePadding,
                        top: 8,
                        zIndex: 38,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        pointerEvents: "none",
                      }}
                    >
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 9,
                          padding: "0 2px",
                          color: tvWatchlistSectionMeta.headerColor,
                          textShadow: isSimpleShelfPresentation ? "none" : "0 2px 10px rgba(0,0,0,0.45)",
                          fontSize: 18,
                          fontWeight: 900,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        <span>{tvWatchlistSectionMeta.label}</span>
                        <span
                          style={{
                            opacity: 0.72,
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: 0,
                            color: isSimpleShelfPresentation ? "rgba(45,55,72,0.72)" : "rgba(255,255,255,0.74)",
                          }}
                        >
                          {tvWatchlistShelfSection ? watchlistTvSectionCounts[tvWatchlistShelfSection] : 0} shows
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <div
                    style={{
                      position: "absolute",
                      left: shelfSidePadding,
                      right: shelfSidePadding,
                      top: showTvWatchlistSectionHeader ? TV_WATCHLIST_SECTION_HEADER_SPACE : 0,
                      bottom: 0,
                    }}
                  >
                    {(() => {
                      let runningVisualX = 0;
                      return shelfShows.map((show, i) => {
                      const isAudiobook = isAudiobookItem(show);
                      const { caseWidth, caseHeight } = getItemVisualLayout(show);
                      const x = Math.round(runningVisualX);
                      runningVisualX += caseWidth + shelfGap;

                      const insetTop = 0;
                      const insetRight = 0;
                      const insetBottom = 0;
                      const insetLeft = 0;
                      const coverVisualLeftPx = 0;
                      const coverVisualTopPx = 0;
                      const coverVisualWidthPx = caseWidth;
                      const coverVisualHeightPx = caseHeight;
                      // skipFailedFilter: shelf covers ignore the failed-URL
                      // blacklist. Safari aborts image loads during virtualized
                      // scrolling, which fired false onError events and
                      // permanently blanked covers that actually load fine.
                      const selectedCoverUrl = getDisplayCoverUrl(show, true);
                      const statusIndicator = getStatusIndicator(show);
                      const ratingBadgeLabel = formatItemPersonalRatingBadge(show);
                      const completedStatusToken = (() => {
                        if (show.__type === "book") return normalizeStatusToken(show.status);
                        if (show.__type === "tv") {
                          return normalizeStatusToken(show.watchStatus || show.watched || show.showStatus || show.status);
                        }
                        if (show.__type === "movie") {
                          return normalizeStatusToken(show.watchStatus || show.watched || show.status || show.movieStatus);
                        }
                        return normalizeStatusToken(show.status || show.playStatus || show.gameStatus || show.completed);
                      })();
                      const isCompletedForRatingBadge =
                        show.__type === "tv"
                          ? Boolean(safeStr(show.dateCompleted)) ||
                            completedStatusToken === "completed" ||
                            completedStatusToken === "watched" ||
                            completedStatusToken === "true" ||
                            completedStatusToken === "yes" ||
                            completedStatusToken === "1"
                          : show.__type === "movie"
                            ? isMovieWatched(show as Movie) ||
                              completedStatusToken === "completed" ||
                              completedStatusToken === "watched"
                            : show.__type === "game"
                              ? completedStatusToken === "completed" ||
                                completedStatusToken === "watched" ||
                                completedStatusToken === "true" ||
                                completedStatusToken === "yes" ||
                                completedStatusToken === "1"
                              : completedStatusToken === "completed" || completedStatusToken === "watched";
                      const shouldShowRatingBadge =
                        showStatusIndicators &&
                        isCompletedForRatingBadge &&
                        Boolean(ratingBadgeLabel);
                      const statusRegionLeftPx = coverVisualLeftPx;
                      const statusRegionTopPx = coverVisualTopPx;
                      const statusRegionWidthPx = coverVisualWidthPx;
                      const statusRegionHeightPx = coverVisualHeightPx;
                      const coverImageRadiusPx = 6;
                      const coverTrimAsset = selectedCoverUrl ? coverTrimAssets[selectedCoverUrl] : null;
                      const macDisplayCoverUrl = (DISABLE_INSETS || isMacCoverMode) && coverTrimAsset ? coverTrimAsset.url : selectedCoverUrl;
                      const rawCoverObjectFit = coverTrimAsset ? "cover" : "contain";
                      const coverTransform = undefined;
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
                      const ratingBadgeTopPx = Math.max(4, insetTop + 4 + ratingBadgeOffsetY);
                      const ratingBadgeRightPx = Math.max(4, insetRight + 4 - ratingBadgeOffsetX);
                      const ratingBadgeScaleFactor = Math.max(0.5, Math.min(1.8, ratingBadgeScale / 100));
                      const itemKey = getMediaItemKey(show);
                      const itemReleaseDateStr = show.__type === "tv"
                        ? safeStr((show as any).firstAirDate)
                        : safeStr((show as any).releaseDate) || (show.__type === "game" ? safeStr((show as any).releaseDateAlt) : "");
                      const itemReleaseDate = isUpcomingView ? parseReleaseDateForComparison(itemReleaseDateStr) : null;
                      const upcomingDaysRaw = itemReleaseDate
                        ? Math.round((itemReleaseDate.getTime() - todayMidnight().getTime()) / 86400000)
                        : null;
                      const statusForUpcomingLabel = (
                        safeStr((show as any).watchStatus) ||
                        safeStr((show as any).watched) ||
                        safeStr((show as any).status) ||
                        safeStr((show as any).movieStatus)
                      ).trim().toLowerCase();
                      const showPendingDigitalReleaseLabel =
                        isUpcomingView &&
                        upcomingDaysRaw !== null &&
                        upcomingDaysRaw < 0 &&
                        statusForUpcomingLabel === "pending digital release";
                      const upcomingLabel = upcomingDaysRaw === null ? null
                        : showPendingDigitalReleaseLabel ? "Pending Digital Release"
                        : upcomingDaysRaw === 0 ? "Today"
                        : upcomingDaysRaw === 1 ? "Tomorrow"
                        : `In ${upcomingDaysRaw} days`;
                      const upcomingDateDisplay = itemReleaseDate
                        ? itemReleaseDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : null;
                      const isWishlistCase =
                        nav === "wishlist" ||
                        nav === "now-playing" ||
                        nav === "wishlist-books" ||
                        nav === "play-next" ||
                        nav === "watchlist-movies" ||
                        nav === "watchlist-tv" ||
                        Boolean(manualSortableSmartListId);
                      // On mobile, drag-to-reorder is only live while the
                      // user has turned on Reorder mode from the Filter panel.
                      const wishlistDragEnabled =
                        isWishlistCase && (!isMobileLayout || mobileSortEditMode);
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
                            bottom: isWishlistPointerDragging ? undefined : shelfBottomOffset + (isUpcomingView ? UPCOMING_LABEL_SPACE : 0) + (coverTitlesVisible ? COVER_TITLE_LABEL_SPACE : 0),
                            width: caseWidth,
                            height: caseHeight,
                            overflow: "visible",
                            cursor: wishlistDragEnabled ? (isWishlistPointerDragging ? "grabbing" : "grab") : "pointer",
                            opacity: isWishlistPointerDragging ? 0.94 : 1,
                            filter: isSimpleShelfPresentation
                              ? "none"
                              : undefined,
                            zIndex: isWishlistCase ? (isWishlistPointerDragging ? 60 : draggingWishlistKey ? 2 : undefined) : undefined,
                            transition: isWishlistCase
                              ? isWishlistPointerDragging
                                ? "opacity 70ms ease"
                                : "left 118ms cubic-bezier(0.22, 0.76, 0.2, 1), opacity 90ms ease, transform 120ms cubic-bezier(0.2, 0.8, 0.2, 1)"
                              : undefined,
                            touchAction: wishlistDragEnabled ? "none" : undefined,
                            "--dragShakeDeg": `${dragShakeDeg.toFixed(2)}deg`,
                            "--dragPushX": `${dragPushX.toFixed(2)}px`,
                            "--dragPushY": `${dragPushY.toFixed(2)}px`,
                            "--dragScale": dragScale.toFixed(3),
                            outline: sandboxMode ? "1px dashed rgba(255, 214, 102, 0.3)" : "none",
                          } as CSSProperties}
                          draggable={false}
                          onPointerDown={wishlistDragEnabled ? (event) => handleWishlistCasePointerDown(event, itemKey) : undefined}
                          onClick={() => {
                            if (suppressCaseClickRef.current) return;
                            openSelectedItem(show);
                          }}
                          onMouseMove={handleCaseMouseMove}
                          onMouseLeave={handleCaseMouseLeave}
                          >
                          <div
                            className="caseSurface"
                            style={{
                              borderRadius: coverImageRadiusPx,
                              background: "transparent",
                              overflow: "visible",
                              outline: sandboxMode ? "1px dashed rgba(255, 214, 102, 0.35)" : "none",
                            }}
                          >
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
                                      overflow: "hidden",
                                      borderRadius: coverImageRadiusPx,
                                      clipPath: undefined,
                                      background: COVER_STAGE_BACKGROUND,
                                      boxShadow: coverSurfaceBoxShadow,
                                    }}
                                  >
                                {sandboxMode ? (
                                  <div
                                    aria-hidden
                                    style={{
                                      position: "absolute",
                                      left: 6,
                                      top: 6,
                                      zIndex: 30,
                                      maxWidth: Math.max(88, caseWidth - 12),
                                      padding: "4px 6px",
                                      borderRadius: 8,
                                      border: sandboxOverlayBorder,
                                      background: sandboxOverlayBg,
                                      color: sandboxOverlayText,
                                      fontSize: 10,
                                      fontWeight: 900,
                                      letterSpacing: "0.03em",
                                      lineHeight: 1.15,
                                      textTransform: "uppercase",
                                      whiteSpace: "nowrap",
                                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.32)",
                                      pointerEvents: "none",
                                    }}
                                  >
                                    {show.title}
                                    <br />
                                    W {Math.round(caseWidth)}px
                                    <br />
                                    H {Math.round(caseHeight)}px
                                  </div>
                                ) : null}

                                {selectedCoverUrl ? (
                                  DISABLE_INSETS ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      className="case-poster"
                                      src={macDisplayCoverUrl}
                                      alt={show.title}
                                      decoding="async"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: rawCoverObjectFit,
                                        objectPosition: "center",
                                        display: "block",
                                        borderRadius: coverImageRadiusPx,
                                        transform: undefined,
                                        transformOrigin: "center",
                                      }}
                                      onLoad={(e) => {
                                        measureCoverTrimBounds(selectedCoverUrl, e.currentTarget);
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
                                  ) : isMacCoverMode ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      className="case-poster"
                                      src={macDisplayCoverUrl}
                                      alt={show.title}
                                      decoding="async"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                        objectFit: rawCoverObjectFit,
                                        objectPosition: "center",
                                        display: "block",
                                        borderRadius: coverImageRadiusPx,
                                        transform: undefined,
                                        transformOrigin: "center",
                                      }}
                                      onLoad={(e) => {
                                        measureCoverTrimBounds(selectedCoverUrl, e.currentTarget);
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
                                  ) : isAudiobook ? (
                                  <div
                                      style={{
                                        position: "absolute",
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        height: "100%",
                                        overflow: "hidden",
                                        borderRadius: coverImageRadiusPx,
                                        transform: coverTransform,
                                        transformOrigin: "center bottom",
                                      }}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        className="case-poster"
                                        src={selectedCoverUrl}
                                        alt={show.title}
                                        decoding="async"
                                        style={{
                                          width: "100%",
                                          height: "100%",
                                          objectFit: "contain",
                                          objectPosition: "center bottom",
                                          display: "block",
                                          borderRadius: coverImageRadiusPx,
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
                                    </div>
                                  ) : (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      className="case-poster"
                                      src={selectedCoverUrl}
                                      alt={show.title}
                                      decoding="async"
                                      style={{
                                        width: "100%",
                                        height: "100%",
                                      objectFit: "cover",
                                      objectPosition: "center",
                                      display: "block",
                                      borderRadius: coverImageRadiusPx,
                                      transform: coverTransform,
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
                                  )
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
                              </div>
                            </>

                          </div>

                          {sandboxMode && i < shelfShows.length - 1 ? (
                            <div
                              aria-hidden
                              style={{
                                position: "absolute",
                                left: x + caseWidth + Math.max(2, Math.round(shelfGap * 0.25)),
                                top: Math.max(10, Math.round(caseHeight * 0.12)),
                                zIndex: 45,
                                padding: "2px 6px",
                                borderRadius: 999,
                                border: sandboxOverlayBorder,
                                background: sandboxOverlayBg,
                                color: sandboxOverlayText,
                                fontSize: 8,
                                fontWeight: 900,
                                letterSpacing: "0.03em",
                                textTransform: "uppercase",
                                whiteSpace: "nowrap",
                                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.28)",
                              }}
                            >
                              Gap {Math.round(shelfGap)}px
                            </div>
                          ) : null}

                          {shouldShowRatingBadge ? (
                            <div
                              aria-label={`Rating: ${ratingBadgeLabel}`}
                              title={`Rating: ${ratingBadgeLabel}`}
                              style={{
                                position: "absolute",
                                top: Math.max(4, ratingBadgeTopPx - 1),
                                right: Math.max(4, ratingBadgeRightPx - 1),
                                maxWidth: Math.max(44, caseWidth - insetLeft - insetRight - 8),
                                borderRadius: 999,
                                border: "1px solid rgba(255, 255, 255, 0.5)",
                                background: "rgba(255, 255, 255, 0.78)",
                                color: "#1a1206",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
                                padding: `${Math.max(1, Math.round(2 * ratingBadgeScaleFactor))}px ${Math.max(4, Math.round(6 * ratingBadgeScaleFactor))}px ${Math.max(1, Math.round(2 * ratingBadgeScaleFactor))}px ${Math.max(4, Math.round(5 * ratingBadgeScaleFactor))}px`,
                                fontSize: Math.max(8, Math.round(10 * ratingBadgeScaleFactor)),
                                lineHeight: 1.1,
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: Math.max(2, Math.round(3 * ratingBadgeScaleFactor)),
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                pointerEvents: "none",
                                zIndex: 28,
                                backdropFilter: "blur(3px)",
                              }}
                            >
                              <span style={{ color: "#1a1206", fontSize: Math.max(8, Math.round(10 * ratingBadgeScaleFactor)), lineHeight: 1, flexShrink: 0 }}>★</span>
                              {ratingBadgeLabel}
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
                                border: getStatusIconSrc(statusIndicator.key)
                                  ? "none"
                                  : `2px solid color-mix(in srgb, ${statusIndicator.color} 78%, black)`,
                                background: getStatusIconSrc(statusIndicator.key) ? "transparent" : statusIndicator.color,
                                boxShadow: getStatusIconSrc(statusIndicator.key)
                                  ? "0 2px 6px rgba(0,0,0,0.35)"
                                  : "inset 0 1px 1px rgba(255,255,255,0.18), 0 2px 6px rgba(0,0,0,0.35)",
                                zIndex: 26,
                                pointerEvents: "none",
                              }}
                            >
                              {getStatusIconSrc(statusIndicator.key) ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={getStatusIconSrc(statusIndicator.key)}
                                  alt=""
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    borderRadius: "50%",
                                    objectFit: "cover",
                                    display: "block",
                                  }}
                                />
                              ) : (
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
                              )}
                            </div>
                          ) : null}

                          {isUpcomingView && upcomingLabel ? (
                            <div
                              aria-hidden
                              style={{
                                position: "absolute",
                                top: caseHeight + 5,
                                left: 0,
                                width: caseWidth,
                                textAlign: "center",
                                pointerEvents: "none",
                                zIndex: 10,
                              }}
                            >
                              <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(140,140,140,0.9)", lineHeight: 1.3 }}>
                                {upcomingLabel}
                              </div>
                              {upcomingDateDisplay ? (
                                <div style={{ fontSize: 10, color: "rgba(160,160,160,0.75)", marginTop: 1 }}>
                                  {upcomingDateDisplay}
                                </div>
                              ) : null}
                            </div>
                          ) : null}

                          {coverTitlesVisible && show.title ? (
                            <div
                              title={show.title}
                              style={{
                                position: "absolute",
                                top: caseHeight + (isUpcomingView && upcomingLabel ? 32 : 6),
                                left: 0,
                                width: caseWidth,
                                textAlign: "center",
                                pointerEvents: "none",
                                zIndex: 10,
                                fontSize: 11,
                                fontWeight: 600,
                                lineHeight: 1.2,
                                color: isDarkShelfMode ? "rgba(232, 236, 244, 0.86)" : "rgba(60, 70, 84, 0.86)",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                wordBreak: "break-word",
                                padding: "0 2px",
                              }}
                            >
                              {show.title}
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
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
              View: {nav} · Shelves: {shelves.length} · {postersPerShelf} per shelf · edge gap {shelfBottomOffset}px
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
      <input
        ref={statusIconFileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleStatusIconFileChange}
      />
      <input
        ref={iconCropPickerInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleIconCropFileChange}
      />

      {iconCropEditor ? (() => {
        const state = iconCropEditor;
        const hasImage = Boolean(state.sourceUrl);
        const scaleX = state.baseScale * state.zoomX;
        const scaleY = state.baseScale * state.zoomY;
        const displayedW = state.natural.width * scaleX;
        const displayedH = state.natural.height * scaleY;
        const clampOffset = (next: { x: number; y: number }) => {
          const maxX = Math.max(0, (displayedW - ICON_CROP_VIEWPORT) / 2);
          const maxY = Math.max(0, (displayedH - ICON_CROP_VIEWPORT) / 2);
          return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
        };
        const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
          if (state.saving || !hasImage) return;
          const target = e.currentTarget;
          target.setPointerCapture(e.pointerId);
          const startX = e.clientX;
          const startY = e.clientY;
          const startOffsetX = state.offsetX;
          const startOffsetY = state.offsetY;
          const move = (ev: PointerEvent) => {
            const next = clampOffset({ x: startOffsetX + (ev.clientX - startX), y: startOffsetY + (ev.clientY - startY) });
            setIconCropEditor((prev) => prev ? { ...prev, offsetX: next.x, offsetY: next.y } : prev);
          };
          const up = (ev: PointerEvent) => {
            try { target.releasePointerCapture(ev.pointerId); } catch {}
            target.removeEventListener("pointermove", move);
            target.removeEventListener("pointerup", up);
            target.removeEventListener("pointercancel", up);
          };
          target.addEventListener("pointermove", move);
          target.addEventListener("pointerup", up);
          target.addEventListener("pointercancel", up);
        };
        return (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`Edit ${state.iconLabel} icon`}
            style={{ position: "fixed", inset: 0, zIndex: 5000, background: "rgba(10, 14, 24, 0.62)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
            onClick={(e) => { if (e.target === e.currentTarget && !state.saving) cancelIconCrop(); }}
          >
            <div style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,247,251,0.98) 100%)", borderRadius: 18, boxShadow: "0 24px 56px rgba(10, 18, 36, 0.45)", width: "min(540px, 100%)", maxHeight: "calc(100vh - 32px)", overflow: "auto", padding: 22, display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "rgba(80,90,105,0.7)", textTransform: "uppercase" }}>{state.iconKind === "sidebar" ? "Sidebar Icon" : "Status Icon"}</div>
                  <div style={{ fontSize: 19, fontWeight: 750, color: "#1d2735", lineHeight: 1.15, marginTop: 2 }}>{state.iconLabel}</div>
                </div>
                <button type="button" onClick={cancelIconCrop} disabled={state.saving} style={{ border: "none", background: "transparent", cursor: state.saving ? "default" : "pointer", color: "#576371", fontSize: 22, lineHeight: 1, padding: "0 6px" }} aria-label="Close">×</button>
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  onPointerDown={handlePointerDown}
                  style={{
                    width: ICON_CROP_VIEWPORT,
                    height: ICON_CROP_VIEWPORT,
                    maxWidth: "100%",
                    borderRadius: 16,
                    border: "1px solid rgba(152, 162, 171, 0.32)",
                    background: "linear-gradient(135deg, #e6edf3 0%, #c6d4e3 100%)",
                    overflow: "hidden",
                    position: "relative",
                    cursor: state.saving ? "default" : hasImage ? "grab" : "default",
                    touchAction: "none",
                    userSelect: "none",
                  }}
                >
                  {hasImage ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={state.sourceUrl}
                        alt=""
                        draggable={false}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "50%",
                          width: state.natural.width,
                          height: state.natural.height,
                          transformOrigin: "center center",
                          transform: `translate(-50%, -50%) translate(${state.offsetX}px, ${state.offsetY}px) scale(${scaleX}, ${scaleY})`,
                          pointerEvents: "none",
                          maxWidth: "none",
                          maxHeight: "none",
                        }}
                      />
                      <div aria-hidden style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.65), inset 0 0 0 3px rgba(35, 50, 80, 0.35)", borderRadius: 16, pointerEvents: "none" }} />
                    </>
                  ) : (
                    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center", color: "#3a4554" }}>
                      <div style={{ width: 56, height: 56, borderRadius: "50%", border: "2px dashed rgba(74, 126, 212, 0.55)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 800, color: "#4a7ed4" }}>+</div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#1d2735" }}>No image yet</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(80, 90, 105, 0.78)", lineHeight: 1.35, maxWidth: 220 }}>
                        Click <strong>Replace image…</strong> below to pick a file. You'll be able to zoom and reposition before saving.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1d2735" }}>Horizontal Zoom</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(80, 90, 105, 0.78)" }}>{Math.round(state.zoomX * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={state.zoomX}
                    disabled={state.saving || !hasImage}
                    onChange={(e) => {
                      const nextZoom = Number(e.target.value);
                      setIconCropEditor((prev) => {
                        if (!prev) return prev;
                        const newScaleX = prev.baseScale * nextZoom;
                        const newW = prev.natural.width * newScaleX;
                        const newScaleY = prev.baseScale * prev.zoomY;
                        const newH = prev.natural.height * newScaleY;
                        const maxX = Math.max(0, (newW - ICON_CROP_VIEWPORT) / 2);
                        const maxY = Math.max(0, (newH - ICON_CROP_VIEWPORT) / 2);
                        return {
                          ...prev,
                          zoomX: nextZoom,
                          offsetX: Math.max(-maxX, Math.min(maxX, prev.offsetX)),
                          offsetY: Math.max(-maxY, Math.min(maxY, prev.offsetY)),
                        };
                      });
                    }}
                    style={{ width: "100%", accentColor: "#41b65c", opacity: hasImage ? 1 : 0.45 }}
                    aria-label="Horizontal zoom"
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#1d2735" }}>Vertical Zoom</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(80, 90, 105, 0.78)" }}>{Math.round(state.zoomY * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={0.01}
                    value={state.zoomY}
                    disabled={state.saving || !hasImage}
                    onChange={(e) => {
                      const nextZoom = Number(e.target.value);
                      setIconCropEditor((prev) => {
                        if (!prev) return prev;
                        const newScaleY = prev.baseScale * nextZoom;
                        const newH = prev.natural.height * newScaleY;
                        const newScaleX = prev.baseScale * prev.zoomX;
                        const newW = prev.natural.width * newScaleX;
                        const maxX = Math.max(0, (newW - ICON_CROP_VIEWPORT) / 2);
                        const maxY = Math.max(0, (newH - ICON_CROP_VIEWPORT) / 2);
                        return {
                          ...prev,
                          zoomY: nextZoom,
                          offsetX: Math.max(-maxX, Math.min(maxX, prev.offsetX)),
                          offsetY: Math.max(-maxY, Math.min(maxY, prev.offsetY)),
                        };
                      });
                    }}
                    style={{ width: "100%", accentColor: "#41b65c", opacity: hasImage ? 1 : 0.45 }}
                    aria-label="Vertical zoom"
                  />
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 11, color: "rgba(80, 90, 105, 0.7)", lineHeight: 1.35 }}>
                    Drag inside the box to reposition. The visible square will be saved.
                  </div>
                  <button
                    type="button"
                    disabled={state.saving}
                    onClick={() => {
                      setIconCropEditor((prev) => {
                        if (!prev) return prev;
                        const avg = (prev.zoomX + prev.zoomY) / 2;
                        const newScale = prev.baseScale * avg;
                        const newW = prev.natural.width * newScale;
                        const newH = prev.natural.height * newScale;
                        const maxX = Math.max(0, (newW - ICON_CROP_VIEWPORT) / 2);
                        const maxY = Math.max(0, (newH - ICON_CROP_VIEWPORT) / 2);
                        return {
                          ...prev,
                          zoomX: avg,
                          zoomY: avg,
                          offsetX: Math.max(-maxX, Math.min(maxX, prev.offsetX)),
                          offsetY: Math.max(-maxY, Math.min(maxY, prev.offsetY)),
                        };
                      });
                    }}
                    style={{ fontSize: 11, fontWeight: 700, color: "#4a7ed4", background: "transparent", border: "1px solid rgba(74, 126, 212, 0.4)", padding: "4px 10px", borderRadius: 999, cursor: state.saving ? "default" : "pointer" }}
                    title="Match horizontal and vertical zoom"
                  >
                    Match X = Y
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", paddingTop: 4, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    type="button"
                    onClick={() => beginIconCrop({ iconKind: state.iconKind, iconKey: state.iconKey, iconLabel: state.iconLabel })}
                    disabled={state.saving}
                    style={{
                      border: hasImage ? "1px solid rgba(74, 126, 212, 0.45)" : "1px solid #3461ad",
                      background: hasImage ? "rgba(74, 126, 212, 0.08)" : "linear-gradient(180deg, #6aa0f1 0%, #3461ad 100%)",
                      color: hasImage ? "#3461ad" : "#fff",
                      padding: "10px 14px",
                      borderRadius: 10,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: state.saving ? "default" : "pointer",
                      boxShadow: hasImage ? "none" : "0 6px 16px rgba(52, 97, 173, 0.32)",
                    }}
                    title="Pick an image file"
                  >
                    {hasImage ? "Replace image…" : "Choose image…"}
                  </button>
                  {state.iconKind === "status" && getStatusIconSrc(state.iconKey) ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (state.saving) return;
                        resetStatusIconOverride(state.iconKey);
                        cancelIconCrop();
                      }}
                      disabled={state.saving}
                      style={{ border: "1px solid rgba(195, 80, 80, 0.45)", background: "rgba(195, 80, 80, 0.08)", color: "#a4382f", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: state.saving ? "default" : "pointer" }}
                      title="Remove custom icon and restore the colored dot"
                    >
                      Reset to Default
                    </button>
                  ) : null}
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <button type="button" onClick={cancelIconCrop} disabled={state.saving} style={{ border: "1px solid rgba(150, 160, 175, 0.4)", background: "rgba(255,255,255,0.9)", color: "#3a4554", padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: state.saving ? "default" : "pointer" }}>Cancel</button>
                  <button
                    type="button"
                    onClick={commitIconCrop}
                    disabled={state.saving || !hasImage}
                    style={{
                      border: "1px solid #2f8a4a",
                      background: state.saving || !hasImage ? "rgba(65,182,92,0.45)" : "linear-gradient(180deg, #4cc36b 0%, #2f8a4a 100%)",
                      color: "#fff",
                      padding: "10px 22px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: state.saving || !hasImage ? "default" : "pointer",
                      boxShadow: state.saving || !hasImage ? "none" : "0 6px 16px rgba(47, 138, 74, 0.32)",
                      opacity: !hasImage ? 0.7 : 1,
                    }}
                    title={!hasImage ? "Pick an image first" : undefined}
                  >
                    {state.saving ? "Saving…" : "Save Icon"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {movieRecommendationPreview ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9300,
            background: "rgba(7,10,16,0.42)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setMovieRecommendationPreview(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(620px, 100%)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.38)",
              background: "linear-gradient(180deg, rgba(251,252,254,0.98) 0%, rgba(241,244,249,0.99) 100%)",
              boxShadow: "0 24px 48px rgba(10,18,36,0.30)",
              padding: 16,
              display: "grid",
              gridTemplateColumns: isMobileLayout ? "1fr" : "136px 1fr",
              gap: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getDisplayCoverUrl(movieRecommendationPreview)}
              alt={safeStr(movieRecommendationPreview?.title) || "Recommendation cover"}
              style={{
                width: isMobileLayout ? 128 : 136,
                maxWidth: "100%",
                height: "auto",
                margin: isMobileLayout ? "0 auto" : undefined,
                border: "1px solid rgba(107,117,134,0.35)",
                boxShadow: "0 8px 18px rgba(15,23,42,0.2)",
                ...COVER_IMAGE_RADIUS_STYLE,
              }}
            />
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 24, lineHeight: 1.12, fontWeight: 800, color: "#0f172a" }}>
                {safeStr(movieRecommendationPreview?.title) || "Untitled"}
              </div>
              {safeStr(movieRecommendationPreview?.releaseDate || movieRecommendationPreview?.year) ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
                  Release: {safeStr(movieRecommendationPreview?.releaseDate || movieRecommendationPreview?.year)}
                </div>
              ) : null}
              {safeStr(movieRecommendationPreview?.overview) ? (
                <div style={{ fontSize: 14, lineHeight: 1.45, color: "#334155" }}>
                  {safeStr(movieRecommendationPreview?.overview)}
                </div>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.45, color: "#64748b" }}>
                  No description available yet.
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: isMobileLayout ? "stretch" : "flex-end", marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setMovieRecommendationPreview(null)}
                  style={{ border: "1px solid rgba(150,160,175,0.4)", background: "rgba(255,255,255,0.9)", color: "#334155", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openAddFlowFromMovieRecommendation(movieRecommendationPreview)}
                  style={{ border: "1px solid #3461ad", background: "linear-gradient(180deg, #6aa0f1 0%, #3461ad 100%)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                >
                  Add to Library
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tvRecommendationPreview ? (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9300,
            background: "rgba(7,10,16,0.42)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setTvRecommendationPreview(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(620px, 100%)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.38)",
              background: "linear-gradient(180deg, rgba(251,252,254,0.98) 0%, rgba(241,244,249,0.99) 100%)",
              boxShadow: "0 24px 48px rgba(10,18,36,0.30)",
              padding: 16,
              display: "grid",
              gridTemplateColumns: isMobileLayout ? "1fr" : "136px 1fr",
              gap: 14,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getDisplayCoverUrl(tvRecommendationPreview)}
              alt={safeStr(tvRecommendationPreview?.title) || "Recommendation cover"}
              style={{
                width: isMobileLayout ? 128 : 136,
                maxWidth: "100%",
                height: "auto",
                margin: isMobileLayout ? "0 auto" : undefined,
                border: "1px solid rgba(107,117,134,0.35)",
                boxShadow: "0 8px 18px rgba(15,23,42,0.2)",
                ...COVER_IMAGE_RADIUS_STYLE,
              }}
            />
            <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 24, lineHeight: 1.12, fontWeight: 800, color: "#0f172a" }}>
                {safeStr(tvRecommendationPreview?.title) || "Untitled"}
              </div>
              {safeStr(tvRecommendationPreview?.releaseDate || tvRecommendationPreview?.year) ? (
                <div style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>
                  First Air Date: {safeStr(tvRecommendationPreview?.releaseDate || tvRecommendationPreview?.year)}
                </div>
              ) : null}
              {safeStr(tvRecommendationPreview?.overview) ? (
                <div style={{ fontSize: 14, lineHeight: 1.45, color: "#334155" }}>
                  {safeStr(tvRecommendationPreview?.overview)}
                </div>
              ) : (
                <div style={{ fontSize: 14, lineHeight: 1.45, color: "#64748b" }}>
                  No description available yet.
                </div>
              )}
              <div style={{ display: "flex", gap: 10, justifyContent: isMobileLayout ? "stretch" : "flex-end", marginTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setTvRecommendationPreview(null)}
                  style={{ border: "1px solid rgba(150,160,175,0.4)", background: "rgba(255,255,255,0.9)", color: "#334155", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => openAddFlowFromTvRecommendation(tvRecommendationPreview)}
                  style={{ border: "1px solid #3461ad", background: "linear-gradient(180deg, #6aa0f1 0%, #3461ad 100%)", color: "#fff", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer" }}
                >
                  Add to Library
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <AddItemModal
        open={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setAddModalInitialSelection(null);
        }}
        onSelectResult={handleAddItemSelectResult}
        onAddManually={handleAddItemManually}
        initialSelection={addModalInitialSelection}
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
        onDeleteItem={handleDeleteLibraryItem}
        popupCoverMode={modalItem ? getPopupCoverModeForItem(modalItem) : undefined}
        onPopupCoverModeChange={handlePopupCoverModeChange}
        isReplacingCover={Boolean(modalItem && uploadingCoverForKey === getMediaItemKey(modalItem))}
        replaceCoverError={coverUploadError}
      />

      <BookDetailsEditModal
        open={bookDetailsEditOpen && Boolean(bookDetailItem)}
        item={bookDetailItem}
        onClose={() => {
          if (uploadingCoverForKey) return;
          setBookDetailsEditOpen(false);
          setCoverUploadError(null);
          if (isAddingNewItem) { setIsAddingNewItem(false); setAddNewItemType(null); }
        }}
        onSave={isAddingNewItem && addNewItemType === "book" ? handleSaveNewBook : handleSaveBookEdits}
        onSaved={triggerSaveToast}
        onReplaceCover={handleReplaceCover}
        onCoverModeChange={handleBookDetailsCoverModeChange}
        popupCoverMode={bookDetailItem ? getPopupCoverModeForItem(bookDetailItem) : undefined}
        isReplacingCover={Boolean(bookDetailItem && uploadingCoverForKey === getMediaItemKey(bookDetailItem))}
        statusOptions={smartListStatusOptionsByMedia.book}
        replaceCoverError={coverUploadError}
        isNew={isAddingNewItem && addNewItemType === "book"}
      />

      <MovieDetailsEditModal
        open={movieDetailsEditOpen && Boolean(movieDetailItem)}
        item={movieDetailItem}
        onClose={() => {
          setMovieDetailsEditOpen(false);
          if (isAddingNewItem) { setIsAddingNewItem(false); setAddNewItemType(null); }
        }}
        onSave={isAddingNewItem && addNewItemType === "movie" ? handleSaveNewMovie : handleSaveMovieEdits}
        onSaved={triggerSaveToast}
        isNew={isAddingNewItem && addNewItemType === "movie"}
      />

      <TVDetailsEditModal
        open={tvDetailsEditOpen && Boolean(tvDetailItem)}
        item={tvDetailItem}
        onClose={() => {
          setTvDetailsEditOpen(false);
          if (isAddingNewItem) { setIsAddingNewItem(false); setAddNewItemType(null); }
        }}
        onSave={isAddingNewItem && addNewItemType === "tv" ? handleSaveNewTV : handleSaveShowEdits}
        onSaved={triggerSaveToast}
        isNew={isAddingNewItem && addNewItemType === "tv"}
      />

      <GameDetailsEditModal
        open={gameDetailsEditOpen && Boolean(gameDetailEditItem)}
        item={gameDetailEditItem}
        onClose={() => {
          setGameDetailsEditOpen(false);
          setGameDetailEditItem(null);
          if (isAddingNewItem) { setIsAddingNewItem(false); setAddNewItemType(null); }
        }}
        onSave={isAddingNewItem && addNewItemType === "game" ? handleSaveNewGame : handleSaveGameEdits}
        onSaved={triggerSaveToast}
        isNew={isAddingNewItem && addNewItemType === "game"}
        statusOptions={gameStatusOptions}
        platformOptions={gamePlatformOptions}
        ownershipOptions={gameOwnershipOptions}
        formatOptions={gameFormatOptions}
      />

      <RateItModal
        open={rateItModalOpen}
        onClose={() => setRateItModalOpen(false)}
        onSave={handleRateItSave}
        item={rateItItem}
        mediaType={rateItMediaType || "movie"}
        highlightColor={rateItHighlightColor}
      />

      {/* Save toast */}
      <div style={{
        position: "fixed", bottom: 28, left: "50%", transform: `translateX(-50%) translateY(${saveToast ? 0 : 24}px)`,
        zIndex: 99999,
        pointerEvents: "none",
        opacity: saveToast ? 1 : 0,
        transition: "opacity 220ms ease, transform 220ms ease",
      }}>
        <div style={{
          background: "rgba(18,24,35,0.94)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.13)",
          borderRadius: 14,
          padding: "12px 22px",
          display: "flex", alignItems: "center", gap: 10,
          boxShadow: "0 8px 28px rgba(0,0,0,0.38)",
          whiteSpace: "nowrap",
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", letterSpacing: "0.01em" }}>
            {`Saved to Google Sheet${lastSheetSaveAt ? ` • ${new Date(lastSheetSaveAt).toLocaleTimeString()}` : ""}`}
          </span>
        </div>
      </div>

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
          font-family: ${sidebarSectionFontFamily};
          background: ${sidebarDetailGradientActive
            ? "transparent"
            : isMacSidebarTheme
            ? "linear-gradient(180deg, rgba(247, 248, 250, 0.34) 0%, rgba(232, 236, 241, 0.26) 100%)"
            : "url('/sidebar-texture.png'), linear-gradient(180deg, #f4f1ea 0%, #efe7db 100%)"};
          background-repeat: ${sidebarDetailGradientActive ? "no-repeat" : isMacSidebarTheme ? "no-repeat" : "repeat, no-repeat"};
          background-size: ${sidebarDetailGradientActive ? "100% 100%" : isMacSidebarTheme ? "cover" : "auto 28px, cover"};
          background-position: ${sidebarDetailGradientActive ? "0 0" : isMacSidebarTheme ? "center" : "top left, center"};
          backdrop-filter: ${sidebarDetailGradientActive ? "none" : isMacSidebarTheme ? "blur(10px) saturate(1.15)" : "none"};
          -webkit-backdrop-filter: ${sidebarDetailGradientActive ? "none" : isMacSidebarTheme ? "blur(10px) saturate(1.15)" : "none"};
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
        .sidebarModuleCard {
          position: relative;
          isolation: isolate;
        }
        .sidebarModuleCard > * {
          position: relative;
          z-index: 1;
        }
        .sidebarModuleCard.neon::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          pointer-events: none;
          z-index: 0;
          border: 1px solid rgba(255, 255, 255, 0.82);
          box-shadow:
            0 0 2px rgba(255, 255, 255, 0.45),
            0 0 4px rgba(151, 207, 255, 0.4);
          opacity: 0.86;
          transform: scale(1);
          animation: moduleNeonPulseColor 96s ease-in-out infinite;
          animation-delay: var(--neon-sync-offset, 0s);
        }
        .sidebarModuleCard.neon:hover::before {
          opacity: 0.98;
          animation-duration: 72s;
        }
        @keyframes cdlSpin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        @keyframes moduleNeonPulseColor {
          0% {
            transform: scale(1);
            border-color: rgba(255, 255, 255, 0.84);
            box-shadow:
              0 0 2px rgba(255, 255, 255, 0.48),
              0 0 4px rgba(196, 229, 255, 0.32);
          }
          20% {
            transform: scale(1.006);
            border-color: rgba(168, 214, 255, 0.84);
            box-shadow:
              0 0 2px rgba(176, 221, 255, 0.46),
              0 0 4px rgba(79, 152, 255, 0.34);
          }
          40% {
            transform: scale(1.004);
            border-color: rgba(255, 183, 230, 0.84);
            box-shadow:
              0 0 2px rgba(255, 189, 232, 0.45),
              0 0 4px rgba(232, 112, 196, 0.33);
          }
          60% {
            transform: scale(1.008);
            border-color: rgba(173, 244, 195, 0.84);
            box-shadow:
              0 0 2px rgba(178, 246, 199, 0.45),
              0 0 4px rgba(76, 188, 126, 0.33);
          }
          80% {
            transform: scale(1.005);
            border-color: rgba(214, 179, 255, 0.84);
            box-shadow:
              0 0 2px rgba(220, 191, 255, 0.46),
              0 0 4px rgba(143, 102, 223, 0.34);
          }
          100% {
            transform: scale(1);
            border-color: rgba(255, 255, 255, 0.84);
            box-shadow:
              0 0 2px rgba(255, 255, 255, 0.48),
              0 0 4px rgba(196, 229, 255, 0.32);
          }
        }
        :global(.rolodexCounterNeonSync .rolodexCounterComma),
        :global(.rolodexCounterNeonSync .rolodexCounterDigitNumber) {
          animation: rolodexNeonDigitPulseColor 96s ease-in-out infinite;
          animation-delay: var(--neon-sync-offset, 0s);
        }
        :global(.rolodexCounterNeonSync .rolodexCounterTile) {
          animation: rolodexNeonTilePulseColor 96s ease-in-out infinite;
          animation-delay: var(--neon-sync-offset, 0s);
          outline: 1px solid rgba(236, 248, 255, 0.55);
          outline-offset: -1px;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
          will-change: border-color, box-shadow;
        }
	        :global(.rolodexCounterNeonSync .rolodexCounterTileHighlight) {
	          animation: rolodexNeonHighlightPulseColor 96s ease-in-out infinite;
	          animation-delay: var(--neon-sync-offset, 0s);
	        }
	        .headerTitleNeonSync {
	          animation: rolodexNeonDigitPulseColor 96s ease-in-out infinite;
	          animation-delay: var(--neon-sync-offset, 0s);
	        }
        @keyframes rolodexNeonDigitPulseColor {
          0% {
            color: rgba(236, 248, 255, 0.98);
            text-shadow:
              0 0 3px rgba(244, 252, 255, 0.82),
              0 0 10px rgba(196, 229, 255, 0.66),
              0 0 18px rgba(132, 188, 255, 0.44);
          }
          20% {
            color: rgba(214, 237, 255, 0.98);
            text-shadow:
              0 0 3px rgba(226, 242, 255, 0.82),
              0 0 10px rgba(163, 214, 255, 0.69),
              0 0 18px rgba(79, 152, 255, 0.46);
          }
          40% {
            color: rgba(255, 216, 241, 0.98);
            text-shadow:
              0 0 3px rgba(255, 226, 244, 0.81),
              0 0 10px rgba(255, 189, 232, 0.68),
              0 0 18px rgba(232, 112, 196, 0.46);
          }
          60% {
            color: rgba(222, 251, 232, 0.98);
            text-shadow:
              0 0 3px rgba(233, 255, 241, 0.81),
              0 0 10px rgba(178, 246, 199, 0.67),
              0 0 18px rgba(76, 188, 126, 0.46);
          }
          80% {
            color: rgba(232, 217, 255, 0.98);
            text-shadow:
              0 0 3px rgba(243, 228, 255, 0.82),
              0 0 10px rgba(220, 191, 255, 0.69),
              0 0 18px rgba(143, 102, 223, 0.46);
          }
          100% {
            color: rgba(236, 248, 255, 0.98);
            text-shadow:
              0 0 3px rgba(244, 252, 255, 0.82),
              0 0 10px rgba(196, 229, 255, 0.66),
              0 0 18px rgba(132, 188, 255, 0.44);
          }
        }
        @keyframes rolodexNeonTilePulseColor {
          0% {
            border-color: rgba(255, 255, 255, 0.94);
            box-shadow:
              0 1px 2px rgba(0, 0, 0, 0.48),
              0 0 7px rgba(196, 229, 255, 0.24),
              inset 0 0 0 1px rgba(214, 236, 255, 0.46),
              inset 0 -12px 18px rgba(16, 54, 104, 0.44);
          }
          20% {
            border-color: rgba(168, 214, 255, 0.94);
            box-shadow:
              0 1px 2px rgba(0, 0, 0, 0.48),
              0 0 7px rgba(79, 152, 255, 0.26),
              inset 0 0 0 1px rgba(170, 216, 255, 0.45),
              inset 0 -12px 18px rgba(14, 47, 97, 0.44);
          }
          40% {
            border-color: rgba(255, 183, 230, 0.94);
            box-shadow:
              0 1px 2px rgba(0, 0, 0, 0.48),
              0 0 7px rgba(232, 112, 196, 0.25),
              inset 0 0 0 1px rgba(255, 198, 236, 0.45),
              inset 0 -12px 18px rgba(90, 24, 82, 0.4);
          }
          60% {
            border-color: rgba(173, 244, 195, 0.94);
            box-shadow:
              0 1px 2px rgba(0, 0, 0, 0.48),
              0 0 7px rgba(76, 188, 126, 0.25),
              inset 0 0 0 1px rgba(186, 250, 210, 0.45),
              inset 0 -12px 18px rgba(12, 67, 50, 0.4);
          }
          80% {
            border-color: rgba(214, 179, 255, 0.94);
            box-shadow:
              0 1px 2px rgba(0, 0, 0, 0.48),
              0 0 7px rgba(143, 102, 223, 0.26),
              inset 0 0 0 1px rgba(227, 206, 255, 0.45),
              inset 0 -12px 18px rgba(53, 26, 93, 0.4);
          }
          100% {
            border-color: rgba(255, 255, 255, 0.94);
            box-shadow:
              0 1px 2px rgba(0, 0, 0, 0.48),
              0 0 7px rgba(196, 229, 255, 0.24),
              inset 0 0 0 1px rgba(214, 236, 255, 0.46),
              inset 0 -12px 18px rgba(16, 54, 104, 0.44);
          }
        }
        @keyframes rolodexNeonHighlightPulseColor {
          0% {
            background: linear-gradient(rgba(230, 243, 255, 0.21), rgba(230, 243, 255, 0));
          }
          20% {
            background: linear-gradient(rgba(170, 221, 255, 0.2), rgba(170, 221, 255, 0));
          }
          40% {
            background: linear-gradient(rgba(255, 198, 236, 0.2), rgba(255, 198, 236, 0));
          }
          60% {
            background: linear-gradient(rgba(186, 250, 210, 0.2), rgba(186, 250, 210, 0));
          }
          80% {
            background: linear-gradient(rgba(227, 206, 255, 0.2), rgba(227, 206, 255, 0));
          }
          100% {
            background: linear-gradient(rgba(230, 243, 255, 0.21), rgba(230, 243, 255, 0));
          }
        }
	        @media (prefers-reduced-motion: reduce) {
	          .sidebarModuleCard.neon::before {
	            animation: none;
	          }
	          .headerTitleNeonSync {
	            animation: none;
	          }
	          :global(.rolodexCounterNeonSync .rolodexCounterComma),
	          :global(.rolodexCounterNeonSync .rolodexCounterDigitNumber),
	          :global(.rolodexCounterNeonSync .rolodexCounterTile),
          :global(.rolodexCounterNeonSync .rolodexCounterTileHighlight) {
            animation: none;
          }
        }
        .sideItem {
          width: 100%;
          margin-top: ${sidebarRowDensityOffset}px;
          padding: ${isMacSidebarTheme ? "4px 6px" : "1px 4px"};
          border-radius: ${isMacSidebarTheme ? "10px" : "8px"};
          border: 1px solid transparent;
          background: transparent;
          color: ${isMacSidebarTheme ? currentTheme.textColor : isDarkSidebarTheme ? currentTheme.textColor : "#2A2A2A"};
          font-size: ${isMacSidebarTheme ? "12px" : "13px"};
          font-weight: ${isMacSidebarTheme ? 450 : 500};
          font-family: ${sidebarSectionFontFamily};
          letter-spacing: ${isMacSidebarTheme ? "-0.01em" : "normal"};
          cursor: pointer;
          transition: all 150ms ease;
        }
        .sideItem:hover { 
          background: ${sidebarItemHoverBackground};
        }
        .sideItem.active {
          background: ${sidebarActiveAccent.background};
          box-shadow: ${isSimpleSidebarTheme ? "none" : isMacSidebarTheme ? "inset 0 1px 0 rgba(255,255,255,0.42)" : "0 8px 16px rgba(0,0,0,0.15)"};
          border-color: ${sidebarActiveAccent.border};
          font-weight: 600;
          color: ${sidebarActiveAccent.text};
        }
        .sideItem.primary { background: transparent; }
        .sideItem.primary:hover { background: ${sidebarItemHoverBackground}; }
        .sideItem.primary.active { background: ${sidebarActiveAccent.background}; color: ${sidebarActiveAccent.text}; }
        .sideSubItem {
          width: 100%;
          margin-top: ${sidebarRowDensityOffset}px;
          padding: ${isMacSidebarTheme ? "3px 7px" : "2px 6px"};
          border-radius: ${isMacSidebarTheme ? "10px" : "8px"};
          border: ${sidebarSubItemBorderColor};
          background: ${sidebarSubItemBackground};
          color: ${sidebarSubItemTextColor};
          font-size: 12px;
          font-weight: ${isMacSidebarTheme ? 450 : 500};
          font-family: ${sidebarSectionFontFamily};
          cursor: pointer;
          transition: background 140ms ease, border-color 140ms ease;
        }
        .sideSubItem:hover {
          background: ${sidebarSubItemHoverBackground};
        }
        .sideSubItem.active {
          background: ${sidebarSubItemActiveBackground};
          border: ${sidebarSubItemActiveBorder};
          color: ${sidebarSubItemActiveTextColor};
          font-weight: 700;
        }
        .sidebarTextOnlySection .sideItem > span:first-child {
          gap: 0 !important;
        }
        .sidebarTextOnlySection .sideItem > span:first-child > span[aria-hidden] {
          display: none !important;
        }
        .settingsScrollArea::-webkit-scrollbar {
          width: 10px;
        }
        .settingsScrollArea::-webkit-scrollbar-track {
          background: rgba(139, 175, 244, 0.12);
          border-radius: 999px;
        }
        .settingsScrollArea::-webkit-scrollbar-thumb {
          background: rgba(74, 126, 212, 0.5);
          border-radius: 999px;
          border: 2px solid rgba(246, 245, 243, 0.95);
        }
        .settingsScrollArea::-webkit-scrollbar-thumb:hover {
          background: rgba(74, 126, 212, 0.72);
        }
        .case {
          position: relative;
          filter: drop-shadow(9px 12px 9px rgba(0, 0, 0, 0.34));
        }
        .caseSurface {
          position: absolute;
          inset: 0;
          overflow: hidden;
          background: #ececec;
          transition: transform 70ms ease, filter 140ms ease;
          /* At rest: flat 2D transform only. An always-on 3D transform here
             (perspective + rotateX/Y) triggered a Safari bug where covers
             scrolled into view after first paint stayed black until a repaint.
             The 3D tilt is applied only on hover (below) — by then the cover
             is already painted and being interacted with, so the bug can't
             bite, and the tilt only matters on hover anyway. */
          transform: translate(var(--dragPushX, 0px), var(--dragPushY, 0px)) rotate(var(--dragShakeDeg, 0deg)) scale(var(--dragScale, 1));
        }
        .case:hover .caseSurface {
          /* No transform-style: preserve-3d. The surface itself rotates in 3D
             via perspective + rotateX/Y, which is the whole tilt effect; the
             cover content is flat and just projects onto it. preserve-3d only
             matters for nested 3D children, and it made Safari black out the
             game cover's overflow:hidden container when the 3D layer formed. */
          transform: translate3d(var(--dragPushX, 0px), var(--dragPushY, 0px), 0) perspective(900px) rotateY(var(--tiltY, 0deg)) rotateX(var(--tiltX, 0deg)) rotateZ(var(--dragShakeDeg, 0deg)) scale(var(--dragScale, 1));
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
