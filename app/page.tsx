/* =====================================================================================
  Chris' Delicious Library
  Version: 2.1.0
   Notes:
   - Client-side CSV load from Google Sheets (published CSV)
   - Left sidebar menu (Delicious Library style)
   - 1 shelf image per row (no gaps between shelves)
   - Posters only (no title labels)
   - Posters align to shelf lip
   - DVD case frame overlay (no left border) + glossy black edge
   
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

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { RolodexCounter } from "./components/RolodexCounter";

type Row = Record<string, string>;

type Show = {
  title: string;
  posterUrl: string;
  tmdbId?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  watchStatus?: string;
  showStatus?: string;
  tag?: string;
};

type Book = {
  title: string;
  posterUrl: string;
  isbn?: string;
  releaseDate?: string;
  completedDate?: string;
  status?: string;
  types?: string;
  series?: string;
  categories?: string;
  ownership?: string;
  tag?: string;
};

type Movie = {
  title: string;
  posterUrl: string;
  tmdbId?: string;
  releaseDate?: string;
  watchStatus?: string;
  movieStatus?: string;
  tag?: string;
  genres?: string;
};

type Game = {
  title: string;
  posterUrl: string;
  platform?: string;
  releaseDate?: string;
  playStatus?: string;
  gameStatus?: string;
  yearPlayed?: string;
  tag?: string;
};


const APP_TITLE = "Chris’ Delicious Library";
const ENV_KEY = "NEXT_PUBLIC_TV_SHEET_CSV_URL";
const BOOKS_ENV_KEY = "NEXT_PUBLIC_BOOKS_SHEET_CSV_URL";
const MOVIES_ENV_KEY = "NEXT_PUBLIC_MOVIES_SHEET_CSV_URL";
const GAMES_ENV_KEY = "NEXT_PUBLIC_GAMES_SHEET_CSV_URL";
const SETTINGS_ENV_KEY = "NEXT_PUBLIC_SETTINGS_SHEET_CSV_URL";

// ✅ Put these in /public
const DEFAULT_SHELF_IMAGE = "/shelves-light-single2.png";
const CASE_FRAME_IMAGE = "/dvd-case-frame.png";
const MOVIE_FRAME_IMAGE = "/movie-frame.png";
const BOOK_FRAME_IMAGE = "/book-frame-overlay.png";
const GAME_FRAME_IMAGE = "/game-frame.png";
const APP_ICON = "/logo4.png";

// Helper function to convert platform name to frame filename
function getPlatformFrameFilename(platform?: string): string {
  if (!platform || platform === "Default") {
    return GAME_FRAME_IMAGE;
  }
  // Convert platform name to lowercase and replace spaces with hyphens
  const normalizedName = platform.toLowerCase().replace(/\s+/g, '-');
  return `/${normalizedName}-frame.png`;
}

function safeStr(v: unknown) {
  return (v ?? "").toString().trim();
}

function rowToShow(r: Row): Show | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const posterUrl = safeStr(r["PosterURL"]) || safeStr(r["Poster"]) || "";
  return {
    title,
    posterUrl,
    tmdbId: safeStr(r["TMDB_ID"]) || undefined,
    firstAirDate: safeStr(r["FirstAirDate"]) || undefined,
    lastAirDate: safeStr(r["LastAirDate"]) || undefined,
    watchStatus: safeStr(r["WatchStatus"]) || undefined,
    showStatus: safeStr(r["Status"]) || undefined,
    tag: safeStr(r["Tag"]) || safeStr(r["Tags"]) || undefined,
  };
}

function rowToBook(r: Row): Book | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const posterUrl =
    safeStr(r["ImageURL"]) ||
    safeStr(r["Image URL"]) ||
    safeStr(r["Image"]) ||
    safeStr(r["CoverURL"]) ||
    safeStr(r["Cover URL"]) ||
    safeStr(r["PosterURL"]) ||
    safeStr(r["Poster URL"]) ||
    safeStr(r["Poster"]) ||
    "";
  return {
    title,
    posterUrl,
    isbn: safeStr(r["ISBN"]) || undefined,
    releaseDate: safeStr(r["ReleaseDate"]) || safeStr(r["Published"]) || undefined,
    completedDate: safeStr(r["CompletedDate"]) || undefined,
    status: safeStr(r["Status"]) || undefined,
    types: safeStr(r["Types"]) || safeStr(r["Type"]) || undefined,
    series: safeStr(r["Series"]) || undefined,
    categories: safeStr(r["categories"]) || safeStr(r["Categories"]) || safeStr(r["Category"]) || undefined,
    ownership: safeStr(r["Ownership"]) || undefined,
    tag: safeStr(r["Tag"]) || undefined,
  };
}

function rowToMovie(r: Row): Movie | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const posterUrl = safeStr(r["PosterURL"]) || safeStr(r["Poster"]) || "";
  return {
    title,
    posterUrl,
    tmdbId: safeStr(r["TMDB_ID"]) || undefined,
    releaseDate: safeStr(r["ReleaseDate"]) || undefined,
    watchStatus: safeStr(r["WatchStatus"]) || safeStr(r["Watched"]) || undefined,
    movieStatus: safeStr(r["Status"]) || undefined,
    tag: safeStr(r["Tag"]) || safeStr(r["Tags"]) || undefined,
    genres: safeStr(r["Genres"]) || safeStr(r["Genre"]) || undefined,
  };
}

function rowToGame(r: Row): Game | null {
  const title = safeStr(r["Title"]);
  if (!title) return null;

  const posterUrl = safeStr(r["PosterURL"]) || safeStr(r["Poster"]) || safeStr(r["CoverURL"]) || "";
  return {
    title,
    posterUrl,
    platform: safeStr(r["Platform"]) || undefined,
    releaseDate: safeStr(r["ReleaseDate"]) || undefined,
    playStatus: safeStr(r["PlayStatus"]) || undefined,
    gameStatus: safeStr(r["Status"]) || undefined,
    yearPlayed: safeStr(r["Year Played"]) || safeStr(r["YearPlayed"]) || safeStr(r["Year played"]) || safeStr(r["Yearplayed"]) || undefined,
    tag: safeStr(r["Tag"]) || safeStr(r["Tags"]) || undefined,
  };
}

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setWidth(Math.floor(entry.contentRect.width));
    });

    ro.observe(el);
    setWidth(Math.floor(el.getBoundingClientRect().width));

    return () => ro.disconnect();
  }, []);

  return { ref, width };
}

type NavKey = "home" | "search" | "books" | "movies" | "tv" | "games" | "settings" | "year-this" | "year-previous";

export default function Page() {
  const tvCsvUrl = (process.env as any)[ENV_KEY] as string | undefined;
  const booksCsvUrl = (process.env as any)[BOOKS_ENV_KEY] as string | undefined;
  const moviesCsvUrl = (process.env as any)[MOVIES_ENV_KEY] as string | undefined;
  const gamesCsvUrl = (process.env as any)[GAMES_ENV_KEY] as string | undefined;
  const settingsCsvUrl = (process.env as any)[SETTINGS_ENV_KEY] as string | undefined;
  const settingsWriteUrl = (process.env as any)["NEXT_PUBLIC_SETTINGS_WRITE_URL"] as string | undefined;

  const [loading, setLoading] = useState(false);
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

  // Sidebar nav
  const [nav, setNav] = useState<NavKey>("home");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [openSection, setOpenSection] = useState<NavKey | null>(null);
  const [yearMenuOpen, setYearMenuOpen] = useState<boolean>(false);
  const [otherMenuOpen, setOtherMenuOpen] = useState<boolean>(false);
  const [selectedPreviousYear, setSelectedPreviousYear] = useState<number>(2025);

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
  const [wishlistFilter, setWishlistFilter] = useState<boolean>(false);
  const [sortField, setSortField] = useState<string>("ReleaseDate");
  const [sortOrder, setSortOrder] = useState<"Asc" | "Desc">("Desc");
  const [watchStatusOpen, setWatchStatusOpen] = useState<boolean>(false);
  const [showStatusOpen, setShowStatusOpen] = useState<boolean>(false);
  const [tagOpen, setTagOpen] = useState<boolean>(false);
  const [movieWatchStatusOpen, setMovieWatchStatusOpen] = useState<boolean>(false);
  const [movieGenreOpen, setMovieGenreOpen] = useState<boolean>(false);
  const [readingStatusOpen, setReadingStatusOpen] = useState<boolean>(false);
  const [formatOpen, setFormatOpen] = useState<boolean>(false);
  const [seriesOpen, setSeriesOpen] = useState<boolean>(false);
  const [genreOpen, setGenreOpen] = useState<boolean>(false);
  const [wishlistOpen, setWishlistOpen] = useState<boolean>(false);
  const [viewportH, setViewportH] = useState(0);

  // Logo positioning and sizing
  const [logoSize, setLogoSize] = useState<number>(230);
  const [logoTop, setLogoTop] = useState<number>(12);
  const [logoLeft, setLogoLeft] = useState<number>(-28);

  // Synced icon positioning and sizing
  const [syncIconSize, setSyncIconSize] = useState<number>(12);
  const [syncIconTop, setSyncIconTop] = useState<number>(8);

  // Sidebar icon size
  const [iconSize, setIconSize] = useState<number>(16);

  // Sidebar text styling
  const [sidebarFontSize, setSidebarFontSize] = useState<number>(13);
  const [sidebarFontWeight, setSidebarFontWeight] = useState<string>("400");
  const [sidebarGap, setSidebarGap] = useState<number>(10);
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

  // Layout tuning
  const SHELF_HEIGHT = 190;
  const SHELF_SIDE_PADDING = 10;
  const LIP_FROM_BOTTOM = 5;
  const gap = tight ? 6 : 12;

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
  
  // Movie frame: separate insets for movie covers
  const MOVIE_SRC_W = 1024;
  const MOVIE_SRC_H = 1536;
  const [movieInsetTopPx, setMovieInsetTopPx] = useState(156);
  const [movieInsetRightPx, setMovieInsetRightPx] = useState(100);
  const [movieInsetBottomPx, setMovieInsetBottomPx] = useState(136);
  const [movieInsetLeftPx, setMovieInsetLeftPx] = useState(120);
  
  // Game frame: platform-based insets for game covers
  const GAME_SRC_W = 1024;
  const GAME_SRC_H = 1536;
  
  // Platform-specific insets (stored as a single object)
  const [platformInsets, setPlatformInsets] = useState<Record<string, { top: number; right: number; bottom: number; left: number }>>({
    "Default": { top: 5, right: 5, bottom: 5, left: 5 },
  });
  
  // Platform-specific overlay size and position
  const [platformOverlaySettings, setPlatformOverlaySettings] = useState<Record<string, { width: number; height: number; top: number; left: number }>>({
    "Default": { width: 100, height: 100, top: 0, left: 0 },
  });
  
  // Platform-specific cover scale (for the poster image inside the inset)
  const [platformCoverScale, setPlatformCoverScale] = useState<Record<string, number>>({
    "Default": 100,
  });
  
  // Track which platforms have been explicitly customized (not using Default)
  const [customizedPlatforms, setCustomizedPlatforms] = useState<Set<string>>(new Set());
  
  // UI: Selected platform for editing insets
  const [selectedPlatformForInsets, setSelectedPlatformForInsets] = useState<string>("Default");
  
  const [posterSizeGames, setPosterSizeGames] = useState<number>(108);
  
  const [showInsetGuide, setShowInsetGuide] = useState(false);

  const { ref: stageRef, width: stageWidth } = useElementWidth<HTMLDivElement>();

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight || 0);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
      return new Date(ts).toLocaleString();
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
  const getSetting = (key: string, defaultValue: any) => {
    // First, try to get from settingsRows (from the sheet)
    const setting = settingsRows.find((r) => safeStr(r["Key"]) === key);
    if (setting && setting["Value"] !== undefined && setting["Value"] !== "") {
      const value = setting["Value"];
      const numValue = Number(value);
      // Try to parse as number if it looks like one and is not NaN
      if (!isNaN(numValue)) return numValue;
      // Try to parse as boolean
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }
    
    // Fallback to localStorage
    try {
      const settingsCache = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      if (settingsCache[key] !== undefined && settingsCache[key] !== "") {
        const value = settingsCache[key];
        const numValue = Number(value);
        // Try to parse as number if it looks like one and is not NaN
        if (!isNaN(numValue)) return numValue;
        // Try to parse as boolean
        if (value === "true") return true;
        if (value === "false") return false;
        return value;
      }
    } catch (e) {
      console.warn("Failed to read from localStorage:", e);
    }
    
    return defaultValue;
  };

  const saveSetting = async (key: string, value: any, category: string = "", description: string = "") => {
    // Save to localStorage only - no auto-sync to Google Sheet
    // Use saveSettingToSheet() for manual Google Sheet syncs
    try {
      const settingsCache = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      settingsCache[key] = String(value);
      localStorage.setItem("cdlSettingsCache", JSON.stringify(settingsCache));
      console.log(`✓ Saved to localStorage: ${key} = ${value}`);
    } catch (e) {
      console.warn("Failed to save to localStorage:", e);
    }
  };

  // Save a specific setting to Google Sheet
  const saveSettingToSheet = async (key: string, value: any, category: string = "", description: string = "") => {
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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      try {
        await fetch(settingsWriteUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key, value, category, description }),
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log(`✓ Saved to sheet: ${key} = ${value}`);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        // Handle abort timeout gracefully
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          console.warn(`⏱ Timeout saving ${key} to sheet (5s timeout)`);
          // Don't throw, just warn - the setting is already saved locally
        } else {
          console.warn(`✗ Failed to save ${key} to sheet:`, fetchError);
        }
      }
    } catch (e) {
      console.warn(`✗ Error in saveSettingToSheet:`, e);
    }
  };

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
        ];
      } else if (insetType === 'book') {
        savePromises = [
          saveSettingToSheet("bookInsetTopPx", bookInsetTopPx, "Book Insets", "Book Top Inset (px)"),
          saveSettingToSheet("bookInsetRightPx", bookInsetRightPx, "Book Insets", "Book Right Inset (px)"),
          saveSettingToSheet("bookInsetBottomPx", bookInsetBottomPx, "Book Insets", "Book Bottom Inset (px)"),
          saveSettingToSheet("bookInsetLeftPx", bookInsetLeftPx, "Book Insets", "Book Left Inset (px)"),
        ];
      } else if (insetType === 'movie') {
        savePromises = [
          saveSettingToSheet("movieInsetTopPx", movieInsetTopPx, "Movie Insets", "Movie Top Inset (px)"),
          saveSettingToSheet("movieInsetRightPx", movieInsetRightPx, "Movie Insets", "Movie Right Inset (px)"),
          saveSettingToSheet("movieInsetBottomPx", movieInsetBottomPx, "Movie Insets", "Movie Bottom Inset (px)"),
          saveSettingToSheet("movieInsetLeftPx", movieInsetLeftPx, "Movie Insets", "Movie Left Inset (px)"),
        ];
      } else if (insetType === 'game') {
        // Save only the currently selected platform's insets, overlay settings, and cover scale
        const platform = selectedPlatformForInsets;
        const insets = platformInsets[platform] || { top: 5, right: 5, bottom: 5, left: 5 };
        const overlaySettings = platformOverlaySettings[platform] || { width: 100, height: 100, top: 0, left: 0 };
        const coverScale = platformCoverScale[platform] || 100;
        
        savePromises = [
          saveSettingToSheet(`${platform}InsetTopPx`, insets.top, `${platform} Insets`, `${platform} Top Inset (px)`),
          saveSettingToSheet(`${platform}InsetRightPx`, insets.right, `${platform} Insets`, `${platform} Right Inset (px)`),
          saveSettingToSheet(`${platform}InsetBottomPx`, insets.bottom, `${platform} Insets`, `${platform} Bottom Inset (px)`),
          saveSettingToSheet(`${platform}InsetLeftPx`, insets.left, `${platform} Insets`, `${platform} Left Inset (px)`),
          saveSettingToSheet(`${platform}OverlayWidth`, overlaySettings.width, `${platform} Overlay`, `${platform} Overlay Width (%)`),
          saveSettingToSheet(`${platform}OverlayHeight`, overlaySettings.height, `${platform} Overlay`, `${platform} Overlay Height (%)`),
          saveSettingToSheet(`${platform}OverlayTop`, overlaySettings.top, `${platform} Overlay`, `${platform} Overlay Top (%)`),
          saveSettingToSheet(`${platform}OverlayLeft`, overlaySettings.left, `${platform} Overlay`, `${platform} Overlay Left (%)`),
          saveSettingToSheet(`${platform}CoverScale`, coverScale, `${platform} Cover`, `${platform} Cover Scale (%)`),
        ];
      }

      // Run all saves in parallel instead of sequentially
      await Promise.all(savePromises);

      setSyncState("ok");
      setSyncMsg(`${insetType} insets saved!`);
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 2000);
    } catch (e) {
      console.error(`Failed to save ${insetType} insets:`, e);
      setSyncState("error");
      setSyncMsg(`Failed to save ${insetType} insets`);
    }
  };

  // Apply settings from spreadsheet on load
  useEffect(() => {
    if (settingsRows.length === 0) return;
    
    setPosterSizeTv(getSetting("posterSizeTv", 100));
    setPosterSizeMovies(getSetting("posterSizeMovies", 108));
    setPosterSizeBooks(getSetting("posterSizeBooks", 115));
    setBookHeightMultiplier(getSetting("bookHeightMultiplier", 1.5));
    setTight(getSetting("tight", true));
    
    setCaseInsetTopPx(getSetting("caseInsetTopPx", 156));
    setCaseInsetRightPx(getSetting("caseInsetRightPx", 121));
    setCaseInsetBottomPx(getSetting("caseInsetBottomPx", 136));
    setCaseInsetLeftPx(getSetting("caseInsetLeftPx", 74));
    
    setBookInsetTopPx(getSetting("bookInsetTopPx", 99));
    setBookInsetRightPx(getSetting("bookInsetRightPx", 75));
    setBookInsetBottomPx(getSetting("bookInsetBottomPx", 104));
    setBookInsetLeftPx(getSetting("bookInsetLeftPx", 62));
    
    setMovieInsetTopPx(getSetting("movieInsetTopPx", 156));
    setMovieInsetRightPx(getSetting("movieInsetRightPx", 100));
    setMovieInsetBottomPx(getSetting("movieInsetBottomPx", 136));
    setMovieInsetLeftPx(getSetting("movieInsetLeftPx", 120));
    
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
    const loadedPlatformCoverScale: Record<string, number> = {
      "Default": getSetting("DefaultCoverScale", 100),
    };
    
    // Load settings for any platforms found in settings
    settingsRows.forEach(row => {
      const key = safeStr(row["Key"]);
      const match = key.match(/^(.+)InsetTopPx$/);
      if (match && match[1] !== "Default") {
        const platform = match[1];
        if (!loadedPlatformInsets[platform]) {
          loadedPlatformInsets[platform] = {
            top: getSetting(`${platform}InsetTopPx`, 5),
            right: getSetting(`${platform}InsetRightPx`, 5),
            bottom: getSetting(`${platform}InsetBottomPx`, 5),
            left: getSetting(`${platform}InsetLeftPx`, 5),
          };
          // Mark this platform as customized since it was saved in settings
          loadedCustomizedPlatforms.add(platform);
        }
      }
      
      // Also check for overlay settings
      const overlayMatch = key.match(/^(.+)OverlayWidth$/);
      if (overlayMatch && overlayMatch[1] !== "Default") {
        const platform = overlayMatch[1];
        if (!loadedPlatformOverlaySettings[platform]) {
          loadedPlatformOverlaySettings[platform] = {
            width: getSetting(`${platform}OverlayWidth`, 100),
            height: getSetting(`${platform}OverlayHeight`, 100),
            top: getSetting(`${platform}OverlayTop`, 0),
            left: getSetting(`${platform}OverlayLeft`, 0),
          };
          loadedCustomizedPlatforms.add(platform);
        }
      }
      
      // Also check for cover scale settings
      const coverScaleMatch = key.match(/^(.+)CoverScale$/);
      if (coverScaleMatch && coverScaleMatch[1] !== "Default") {
        const platform = coverScaleMatch[1];
        loadedPlatformCoverScale[platform] = getSetting(`${platform}CoverScale`, 100);
        loadedCustomizedPlatforms.add(platform);
      }
    });
    
    setPlatformInsets(loadedPlatformInsets);
    setPlatformOverlaySettings(loadedPlatformOverlaySettings);
    setPlatformCoverScale(loadedPlatformCoverScale);
    setCustomizedPlatforms(loadedCustomizedPlatforms);
    
    setLogoSize(getSetting("logoSize", 230));
    setLogoTop(getSetting("logoTop", 12));
    setLogoLeft(getSetting("logoLeft", -28));
    
    setSyncIconSize(getSetting("syncIconSize", 12));
    setSyncIconTop(getSetting("syncIconTop", 8));
    
    setIconSize(getSetting("iconSize", 16));
    
    setSidebarFontSize(getSetting("sidebarFontSize", 13));
    setSidebarFontWeight(getSetting("sidebarFontWeight", "400"));
    setSidebarGap(getSetting("sidebarGap", 10));
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
    
    setShelfTheme(getSetting("shelfTheme", DEFAULT_SHELF_IMAGE));
  }, [settingsRows]);

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
      { key: "tight", value: tight, category: "Cover Sizes", description: "Tight spacing between items" },
      { key: "logoSize", value: logoSize, category: "Logo Settings", description: "Logo Size (px)" },
      { key: "logoTop", value: logoTop, category: "Logo Settings", description: "Logo Top Position" },
      { key: "logoLeft", value: logoLeft, category: "Logo Settings", description: "Logo Left Position" },
      { key: "syncIconSize", value: syncIconSize, category: "Sync Icon", description: "Sync Icon Size (px)" },
      { key: "syncIconTop", value: syncIconTop, category: "Sync Icon", description: "Sync Icon Top Position" },
      { key: "iconSize", value: iconSize, category: "Icons", description: "Sidebar Icon Size (px)" },
      { key: "sidebarFontSize", value: sidebarFontSize, category: "Sidebar", description: "Sidebar Font Size" },
      { key: "sidebarFontWeight", value: sidebarFontWeight, category: "Sidebar", description: "Sidebar Font Weight" },
      { key: "sidebarGap", value: sidebarGap, category: "Sidebar", description: "Sidebar Icon Gap" },
      { key: "sidebarHeaderFontSize", value: sidebarHeaderFontSize, category: "Sidebar", description: "Sidebar Header Font Size" },
      { key: "sidebarHeaderFontWeight", value: sidebarHeaderFontWeight, category: "Sidebar", description: "Sidebar Header Font Weight" },
      { key: "shelfTheme", value: shelfTheme, category: "Themes", description: "Shelf Wood Type" },
      { key: "showInsetGuide", value: showInsetGuide, category: "Cover Sizes", description: "Show inset frame guide" },
    ];
    
    try {
      let sentCount = 0;
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
          // Add timeout to prevent hanging on a single request (5 second timeout)
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          await fetch(settingsWriteUrl, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(setting),
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          sentCount++;
        } catch (fetchError) {
          console.warn(`Failed to send ${setting.key}, continuing:`, fetchError);
          // Continue with next setting even if one fails
        }
      }
      
      console.log(`Sent ${sentCount}/${settings.length} settings to Google Sheet`);
      
      clearTimeout(safetyTimeoutId);
      setSyncState("ok");
      setSyncMsg("Settings saved!");
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 2000);
    } catch (e) {
      console.error("Failed to save settings:", e);
      clearTimeout(safetyTimeoutId);
      setSyncState("error");
      setSyncMsg("Save failed");
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
      
      // Then reload all state variables with a small delay to ensure settingsRows is updated
      setTimeout(() => {
        setPosterSizeTv(newSettings.find((r) => r["Key"] === "posterSizeTv")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "posterSizeTv")?.["Value"]) : 100);
        setPosterSizeMovies(newSettings.find((r) => r["Key"] === "posterSizeMovies")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "posterSizeMovies")?.["Value"]) : 108);
        setPosterSizeBooks(newSettings.find((r) => r["Key"] === "posterSizeBooks")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "posterSizeBooks")?.["Value"]) : 115);
        setBookHeightMultiplier(newSettings.find((r) => r["Key"] === "bookHeightMultiplier")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "bookHeightMultiplier")?.["Value"]) : 1.5);
        setTight(newSettings.find((r) => r["Key"] === "tight")?.["Value"] === "true" ? true : true);
        
        setCaseInsetTopPx(newSettings.find((r) => r["Key"] === "caseInsetTopPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "caseInsetTopPx")?.["Value"]) : 156);
        setCaseInsetRightPx(newSettings.find((r) => r["Key"] === "caseInsetRightPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "caseInsetRightPx")?.["Value"]) : 5);
        setCaseInsetBottomPx(newSettings.find((r) => r["Key"] === "caseInsetBottomPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "caseInsetBottomPx")?.["Value"]) : 5);
        setCaseInsetLeftPx(newSettings.find((r) => r["Key"] === "caseInsetLeftPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "caseInsetLeftPx")?.["Value"]) : 5);
        
        setBookInsetTopPx(newSettings.find((r) => r["Key"] === "bookInsetTopPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "bookInsetTopPx")?.["Value"]) : 156);
        setBookInsetRightPx(newSettings.find((r) => r["Key"] === "bookInsetRightPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "bookInsetRightPx")?.["Value"]) : 5);
        setBookInsetBottomPx(newSettings.find((r) => r["Key"] === "bookInsetBottomPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "bookInsetBottomPx")?.["Value"]) : 5);
        setBookInsetLeftPx(newSettings.find((r) => r["Key"] === "bookInsetLeftPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "bookInsetLeftPx")?.["Value"]) : 5);
        
        setMovieInsetTopPx(newSettings.find((r) => r["Key"] === "movieInsetTopPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "movieInsetTopPx")?.["Value"]) : 156);
        setMovieInsetRightPx(newSettings.find((r) => r["Key"] === "movieInsetRightPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "movieInsetRightPx")?.["Value"]) : 5);
        setMovieInsetBottomPx(newSettings.find((r) => r["Key"] === "movieInsetBottomPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "movieInsetBottomPx")?.["Value"]) : 5);
        setMovieInsetLeftPx(newSettings.find((r) => r["Key"] === "movieInsetLeftPx")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "movieInsetLeftPx")?.["Value"]) : 5);
        
        setPosterSizeGames(newSettings.find((r) => r["Key"] === "posterSizeGames")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "posterSizeGames")?.["Value"]) : 100);
        
        setLogoSize(newSettings.find((r) => r["Key"] === "logoSize")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "logoSize")?.["Value"]) : 50);
        setLogoTop(newSettings.find((r) => r["Key"] === "logoTop")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "logoTop")?.["Value"]) : 0);
        setLogoLeft(newSettings.find((r) => r["Key"] === "logoLeft")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "logoLeft")?.["Value"]) : 0);
        
        setSyncIconSize(newSettings.find((r) => r["Key"] === "syncIconSize")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "syncIconSize")?.["Value"]) : 20);
        setSyncIconTop(newSettings.find((r) => r["Key"] === "syncIconTop")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "syncIconTop")?.["Value"]) : 0);
        
        setIconSize(newSettings.find((r) => r["Key"] === "iconSize")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "iconSize")?.["Value"]) : 32);
        setSidebarFontSize(newSettings.find((r) => r["Key"] === "sidebarFontSize")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "sidebarFontSize")?.["Value"]) : 12);
        setSidebarFontWeight(newSettings.find((r) => r["Key"] === "sidebarFontWeight")?.["Value"] || "400");
        setSidebarGap(newSettings.find((r) => r["Key"] === "sidebarGap")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "sidebarGap")?.["Value"]) : 10);
        setSidebarHeaderFontSize(newSettings.find((r) => r["Key"] === "sidebarHeaderFontSize")?.["Value"] ? Number(newSettings.find((r) => r["Key"] === "sidebarHeaderFontSize")?.["Value"]) : 14);
        setSidebarHeaderFontWeight(newSettings.find((r) => r["Key"] === "sidebarHeaderFontWeight")?.["Value"] || "600");
        setShelfTheme(newSettings.find((r) => r["Key"] === "shelfTheme")?.["Value"] || "default");
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
  const updateBookHeightMultiplier = (value: number) => {
    setBookHeightMultiplier(value);
    saveSetting("bookHeightMultiplier", value, "Cover Sizes", "Book Height Multiplier");
  };
  const updateTight = (value: boolean) => {
    setTight(value);
    saveSetting("tight", value, "Spacing", "Tight spacing between items");
  };
  const updateCaseInsetTopPx = (value: number) => {
    setCaseInsetTopPx(value);
    saveSetting("caseInsetTopPx", value, "TV Insets", "TV Case Top Inset (px)");
  };
  const updateCaseInsetRightPx = (value: number) => {
    setCaseInsetRightPx(value);
    saveSetting("caseInsetRightPx", value, "TV Insets", "TV Case Right Inset (px)");
  };
  const updateCaseInsetBottomPx = (value: number) => {
    setCaseInsetBottomPx(value);
    saveSetting("caseInsetBottomPx", value, "TV Insets", "TV Case Bottom Inset (px)");
  };
  const updateCaseInsetLeftPx = (value: number) => {
    setCaseInsetLeftPx(value);
    saveSetting("caseInsetLeftPx", value, "TV Insets", "TV Case Left Inset (px)");
  };
  const updateBookInsetTopPx = (value: number) => {
    setBookInsetTopPx(value);
    saveSetting("bookInsetTopPx", value, "Book Insets", "Book Top Inset (px)");
  };
  const updateBookInsetRightPx = (value: number) => {
    setBookInsetRightPx(value);
    saveSetting("bookInsetRightPx", value, "Book Insets", "Book Right Inset (px)");
  };
  const updateBookInsetBottomPx = (value: number) => {
    setBookInsetBottomPx(value);
    saveSetting("bookInsetBottomPx", value, "Book Insets", "Book Bottom Inset (px)");
  };
  const updateBookInsetLeftPx = (value: number) => {
    setBookInsetLeftPx(value);
    saveSetting("bookInsetLeftPx", value, "Book Insets", "Book Left Inset (px)");
  };
  const updateMovieInsetTopPx = (value: number) => {
    setMovieInsetTopPx(value);
    saveSetting("movieInsetTopPx", value, "Movie Insets", "Movie Top Inset (px)");
  };
  const updateMovieInsetRightPx = (value: number) => {
    setMovieInsetRightPx(value);
    saveSetting("movieInsetRightPx", value, "Movie Insets", "Movie Right Inset (px)");
  };
  const updateMovieInsetBottomPx = (value: number) => {
    setMovieInsetBottomPx(value);
    saveSetting("movieInsetBottomPx", value, "Movie Insets", "Movie Bottom Inset (px)");
  };
  const updateMovieInsetLeftPx = (value: number) => {
    setMovieInsetLeftPx(value);
    saveSetting("movieInsetLeftPx", value, "Movie Insets", "Movie Left Inset (px)");
  };
  const updatePosterSizeGames = (value: number) => {
    setPosterSizeGames(value);
    saveSetting("posterSizeGames", value, "Cover Sizes", "Game Cover Size");
  };
  const updateShelfTheme = (value: string) => {
    setShelfTheme(value);
    saveSetting("shelfTheme", value, "Themes", "Shelf Wood Type");
  };
  
  // Update platform-specific insets
  const updatePlatformInset = (platform: string, edge: 'top' | 'right' | 'bottom' | 'left', value: number) => {
    setPlatformInsets(prev => {
      const currentPlatformInsets = prev[platform] || { top: 5, right: 5, bottom: 5, left: 5 };
      return {
        ...prev,
        [platform]: {
          ...currentPlatformInsets,
          [edge]: value,
        }
      };
    });
    
    // Mark this platform as customized if it's not Default
    if (platform !== "Default") {
      setCustomizedPlatforms(prev => new Set(prev).add(platform));
    }
    
    const edgeCapitalized = edge.charAt(0).toUpperCase() + edge.slice(1);
    saveSetting(`${platform}Inset${edgeCapitalized}Px`, value, `${platform} Insets`, `${platform} ${edgeCapitalized} Inset (px)`);
  };
  
  // Update platform-specific overlay settings
  const updatePlatformOverlay = (platform: string, property: 'width' | 'height' | 'top' | 'left', value: number) => {
    setPlatformOverlaySettings(prev => {
      const currentOverlaySettings = prev[platform] || { width: 100, height: 100, top: 0, left: 0 };
      return {
        ...prev,
        [platform]: {
          ...currentOverlaySettings,
          [property]: value,
        }
      };
    });
    
    // Mark this platform as customized if it's not Default
    if (platform !== "Default") {
      setCustomizedPlatforms(prev => new Set(prev).add(platform));
    }
    
    const propertyCapitalized = property.charAt(0).toUpperCase() + property.slice(1);
    saveSetting(`${platform}Overlay${propertyCapitalized}`, value, `${platform} Overlay`, `${platform} Overlay ${propertyCapitalized} (%)`);
  };
  
  // Update platform-specific cover scale
  const updatePlatformCoverScale = (platform: string, value: number) => {
    setPlatformCoverScale(prev => ({
      ...prev,
      [platform]: value,
    }));
    
    // Mark this platform as customized if it's not Default
    if (platform !== "Default") {
      setCustomizedPlatforms(prev => new Set(prev).add(platform));
    }
    
    saveSetting(`${platform}CoverScale`, value, `${platform} Cover`, `${platform} Cover Scale (%)`);
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

  // Dynamically detect all unique platforms from games data
  // Parse comma-separated platform values to get individual platforms
  const detectedPlatforms = useMemo(() => {
    const platforms = new Set<string>(["Default"]); // Always include Default
    allGames.forEach(game => {
      if (game.platform) {
        // Split comma-separated platforms and add each individually
        const individualPlatforms = game.platform.split(',').map(p => p.trim()).filter(Boolean);
        individualPlatforms.forEach(p => platforms.add(p));
      }
    });
    return Array.from(platforms).sort((a, b) => {
      // Keep "Default" first
      if (a === "Default") return -1;
      if (b === "Default") return 1;
      return a.localeCompare(b);
    });
  }, [allGames]);

  // Note: We do NOT auto-initialize platformInsets for detected platforms
  // Only platforms explicitly customized (or loaded from settings) get entries
  // This ensures uncustomized platforms always inherit from Default insets

  const normalizeStatus = (value?: string) =>
    safeStr(value)
      .toLowerCase()
      .replace("cancelled", "canceled");

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
    () => ["Reading", "Completed", "Backlog", "Abandoned", "Read Next", "Paused"],
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
  }, [allBooks, readingStatuses]);

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
  }, [allBooks]);

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
    return allBooks.filter(b => normalizeStatus(b.ownership) === 'wishlist').length;
  }, [allBooks]);

  const watchCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of watchStatuses) counts[s] = 0;
    for (const show of allShows) {
      const status = normalizeStatus(show.watchStatus);
      const match = watchStatuses.find((s) => normalizeStatus(s) === status);
      if (match) counts[match] += 1;
    }
    return counts;
  }, [allShows, watchStatuses]);

  const showCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of showStatuses) counts[s] = 0;
    for (const show of allShows) {
      const status = normalizeStatus(show.showStatus);
      const match = showStatuses.find((s) => normalizeStatus(s) === status);
      if (match) counts[match] += 1;
    }
    return counts;
  }, [allShows, showStatuses]);

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

  // Movie watch status counts (Watched vs Unwatched)
  const movieWatchCounts = useMemo(() => {
    const counts: Record<string, number> = {
      "Watched": 0,
      "Unwatched": 0
    };
    for (const movie of allMovies) {
      // Check if watchStatus is truthy (checkbox marked) or has a value like "TRUE", "true", "Yes", etc.
      const watched = movie.watchStatus && 
        (movie.watchStatus.toLowerCase() === "true" || 
         movie.watchStatus.toLowerCase() === "yes" || 
         movie.watchStatus === "1" ||
         movie.watchStatus.toLowerCase() === "watched");
      if (watched) {
        counts["Watched"] += 1;
      } else {
        counts["Unwatched"] += 1;
      }
    }
    return counts;
  }, [allMovies]);

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

  // Generic sorting function
  const applySorting = <T extends any>(items: T[], field: string, order: "Asc" | "Desc"): T[] => {
    return [...items].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      // Get the appropriate field value based on sortField
      if (field === "Title") {
        aVal = safeStr((a as any).title).toLowerCase();
        bVal = safeStr((b as any).title).toLowerCase();
        const result = aVal.localeCompare(bVal);
        return order === "Asc" ? result : -result;
      } else if (field === "ReleaseDate") {
        // For TV shows, use firstAirDate; for others use releaseDate
        aVal = (a as any).firstAirDate ? Date.parse((a as any).firstAirDate) : 
               (a as any).releaseDate ? Date.parse((a as any).releaseDate) : NaN;
        bVal = (b as any).firstAirDate ? Date.parse((b as any).firstAirDate) : 
               (b as any).releaseDate ? Date.parse((b as any).releaseDate) : NaN;
      } else if (field === "CompletedDate") {
        aVal = (a as any).completedDate ? Date.parse((a as any).completedDate) : NaN;
        bVal = (b as any).completedDate ? Date.parse((b as any).completedDate) : NaN;
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
  };

  // (Placeholder logic) keep it simple for now
  const shows = useMemo(() => {
    const q = safeStr(query).toLowerCase();
    if (nav === "books") {
      let filtered = q ? allBooks.filter((b) => b.title.toLowerCase().includes(q)) : allBooks;
      // Apply reading status filter if set
      if (readingStatusFilter) {
        filtered = filtered.filter((b) => normalizeStatus(b.status) === normalizeStatus(readingStatusFilter));
      }
      // Apply format filter if set
      if (formatFilter) {
        filtered = filtered.filter((b) => {
          if (!b.types) return false;
          const individualTypes = b.types.split(',').map(t => t.trim()).filter(Boolean);
          return individualTypes.includes(formatFilter);
        });
      }
      // Apply series filter if set
      if (seriesFilter) {
        filtered = filtered.filter((b) => b.series === seriesFilter);
      }
      // Apply genre filter if set
      if (genreFilter) {
        filtered = filtered.filter((b) => {
          if (!b.categories) return false;
          const individualCategories = b.categories.split(',').map(c => c.trim()).filter(Boolean);
          return individualCategories.includes(genreFilter);
        });
      }
      // Apply wishlist filter if set
      if (wishlistFilter) {
        filtered = filtered.filter((b) => normalizeStatus(b.ownership) === 'wishlist');
      }
      const sorted = applySorting(filtered, sortField, sortOrder);
      return sorted.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })) as any[];
    }

    // Home: combine books + TV + movies + games and sort by releaseDate or lastAirDate (descending)
    // Filter out Wishlist items - only show owned items
    if (nav === "home") {
      const qb = q ? allBooks.filter((b) => b.title.toLowerCase().includes(q)) : allBooks;
      const qs = q ? allShows.filter((s) => s.title.toLowerCase().includes(q) && normalizeStatus(s.watchStatus) !== "wishlist") : allShows.filter((s) => normalizeStatus(s.watchStatus) !== "wishlist");
      const qm = q ? allMovies.filter((m) => m.title.toLowerCase().includes(q) && normalizeStatus(m.watchStatus) !== "wishlist") : allMovies.filter((m) => normalizeStatus(m.watchStatus) !== "wishlist");
      let qg = q ? allGames.filter((g) => g.title.toLowerCase().includes(q) && normalizeStatus(g.playStatus || g.gameStatus) !== "wishlist") : allGames.filter((g) => normalizeStatus(g.playStatus || g.gameStatus) !== "wishlist");
      
      // Deduplicate games by title - keep only primary platform version
      const gamesByTitle = new Map<string, Game>();
      qg.forEach(game => {
        const existingGame = gamesByTitle.get(game.title);
        if (!existingGame) {
          gamesByTitle.set(game.title, game);
        } else {
          // Compare platforms and keep the one with higher priority
          const existingPlatform = getPrimaryPlatform(existingGame.platform);
          const currentPlatform = getPrimaryPlatform(game.platform);
          
          // Priority: Steam > Epic Games Store > first listed
          const priority = (platform: string) => {
            if (platform === "Steam") return 3;
            if (platform === "Epic Games Store") return 2;
            return 1;
          };
          
          if (priority(currentPlatform) > priority(existingPlatform)) {
            gamesByTitle.set(game.title, game);
          }
        }
      });
      qg = Array.from(gamesByTitle.values());

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    // Movies path
    if (nav === "movies") {
      let filtered = allMovies;
      
      // Apply watch status filter if set
      if (movieWatchFilter) {
        filtered = filtered.filter((m) => {
          const watched = m.watchStatus && 
            (m.watchStatus.toLowerCase() === "true" || 
             m.watchStatus.toLowerCase() === "yes" || 
             m.watchStatus === "1" ||
             m.watchStatus.toLowerCase() === "watched");
          return movieWatchFilter === "Watched" ? watched : !watched;
        });
      }
      
      // Apply genre filter if set
      if (movieGenreFilter) {
        filtered = filtered.filter((m) => {
          if (!m.genres) return false;
          const individualGenres = m.genres.split(',').map(g => g.trim()).filter(Boolean);
          return individualGenres.includes(movieGenreFilter);
        });
      }
      
      const filteredByQuery = q ? filtered.filter((m) => safeStr(m.title).toLowerCase().includes(q)) : filtered;
      const sorted = applySorting(filteredByQuery, sortField, sortOrder);
      return sorted.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })) as any[];
    }

    // Games path
    if (nav === "games") {
      const filteredByQuery = q ? allGames.filter((g) => safeStr(g.title).toLowerCase().includes(q)) : allGames;
      const sorted = applySorting(filteredByQuery, sortField, sortOrder);
      return sorted.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })) as any[];
    }

    // Smart List: This Year - Filter all items with appropriate year field matching current year
    if (nav === "year-this") {
      const currentYear = new Date().getFullYear().toString();
      
      // Books: Use year from CompletedDate
      const qb = q 
        ? allBooks.filter((b) => {
            const year = b.completedDate ? new Date(b.completedDate).getFullYear().toString() : "";
            return b.title.toLowerCase().includes(q) && year === currentYear;
          })
        : allBooks.filter((b) => {
            const year = b.completedDate ? new Date(b.completedDate).getFullYear().toString() : "";
            return year === currentYear;
          });
      
      // TV Shows: Use Tags column
      const qs = q 
        ? allShows.filter((s) => s.title.toLowerCase().includes(q) && safeStr(s.tag) === currentYear)
        : allShows.filter((s) => safeStr(s.tag) === currentYear);
      
      // Movies: Use Tags column
      const qm = q 
        ? allMovies.filter((m) => m.title.toLowerCase().includes(q) && safeStr(m.tag) === currentYear)
        : allMovies.filter((m) => safeStr(m.tag) === currentYear);
      
      // Games: Use Year Played column
      let qg = q 
        ? allGames.filter((g) => g.title.toLowerCase().includes(q) && safeStr(g.yearPlayed) === currentYear)
        : allGames.filter((g) => safeStr(g.yearPlayed) === currentYear);
      
      // Deduplicate games by title - keep only primary platform version
      const gamesByTitle = new Map<string, Game>();
      qg.forEach(game => {
        const existingGame = gamesByTitle.get(game.title);
        if (!existingGame) {
          gamesByTitle.set(game.title, game);
        } else {
          const existingPlatform = getPrimaryPlatform(existingGame.platform);
          const currentPlatform = getPrimaryPlatform(game.platform);
          const priority = (platform: string) => {
            if (platform === "Steam") return 3;
            if (platform === "Epic Games Store") return 2;
            return 1;
          };
          if (priority(currentPlatform) > priority(existingPlatform)) {
            gamesByTitle.set(game.title, game);
          }
        }
      });
      qg = Array.from(gamesByTitle.values());

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    // Smart List: Previous Year - Filter all items with appropriate year field matching selected year
    if (nav === "year-previous") {
      const yearStr = selectedPreviousYear.toString();
      
      // Books: Use year from CompletedDate
      const qb = q 
        ? allBooks.filter((b) => {
            const year = b.completedDate ? new Date(b.completedDate).getFullYear().toString() : "";
            return b.title.toLowerCase().includes(q) && year === yearStr;
          })
        : allBooks.filter((b) => {
            const year = b.completedDate ? new Date(b.completedDate).getFullYear().toString() : "";
            return year === yearStr;
          });
      
      // TV Shows: Use Tags column
      const qs = q 
        ? allShows.filter((s) => s.title.toLowerCase().includes(q) && safeStr(s.tag) === yearStr)
        : allShows.filter((s) => safeStr(s.tag) === yearStr);
      
      // Movies: Use Tags column
      const qm = q 
        ? allMovies.filter((m) => m.title.toLowerCase().includes(q) && safeStr(m.tag) === yearStr)
        : allMovies.filter((m) => safeStr(m.tag) === yearStr);
      
      // Games: Use Year Played column
      let qg = q 
        ? allGames.filter((g) => g.title.toLowerCase().includes(q) && safeStr(g.yearPlayed) === yearStr)
        : allGames.filter((g) => safeStr(g.yearPlayed) === yearStr);
      
      // Deduplicate games by title - keep only primary platform version
      const gamesByTitle2 = new Map<string, Game>();
      qg.forEach(game => {
        const existingGame = gamesByTitle2.get(game.title);
        if (!existingGame) {
          gamesByTitle2.set(game.title, game);
        } else {
          const existingPlatform = getPrimaryPlatform(existingGame.platform);
          const currentPlatform = getPrimaryPlatform(game.platform);
          const priority = (platform: string) => {
            if (platform === "Steam") return 3;
            if (platform === "Epic Games Store") return 2;
            return 1;
          };
          if (priority(currentPlatform) > priority(existingPlatform)) {
            gamesByTitle2.set(game.title, game);
          }
        }
      });
      qg = Array.from(gamesByTitle2.values());

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    // TV default path
    const filteredByWatch = watchFilter
      ? allShows.filter((s) => normalizeStatus(s.watchStatus) === normalizeStatus(watchFilter))
      : allShows;
    const filteredByShow = showFilter
      ? filteredByWatch.filter((s) => normalizeStatus(s.showStatus) === normalizeStatus(showFilter))
      : filteredByWatch;
    const filteredByTag = tagFilter
      ? filteredByShow.filter((s) => {
          if (!s.tag) return false;
          const individualTags = s.tag.split(',').map(t => t.trim()).filter(Boolean);
          return individualTags.includes(tagFilter);
        })
      : filteredByShow;
    const filteredByQuery = q ? filteredByTag.filter((s) => safeStr(s.title).toLowerCase().includes(q)) : filteredByTag;

    if (nav !== "tv") return filteredByQuery as any[];

    const sorted = applySorting(filteredByQuery, sortField, sortOrder);
    return sorted as any[];
  }, [allShows, allBooks, allMovies, allGames, watchFilter, showFilter, tagFilter, movieWatchFilter, movieGenreFilter, readingStatusFilter, formatFilter, seriesFilter, genreFilter, wishlistFilter, nav, query, sortField, sortOrder]);

  const stats = useMemo(() => {
    return {
      movies: allMovies.filter((m) => normalizeStatus(m.watchStatus) !== "wishlist").length,
      tv: allShows.filter((s) => normalizeStatus(s.watchStatus) !== "wishlist").length,
      books: allBooks.length,
      games: allGames.filter((g) => normalizeStatus(g.playStatus || g.gameStatus) !== "wishlist").length,
    };
  }, [allShows, allBooks, allMovies, allGames]);

  const postersPerShelf = useMemo(() => {
    const size = nav === "books" ? posterSizeBooks : nav === "movies" ? posterSizeMovies : nav === "games" ? posterSizeGames : posterSizeTv;
    const usable = Math.max(0, stageWidth - SHELF_SIDE_PADDING * 2 - 60); // Reserve 60px for the counter
    return Math.max(1, Math.floor((usable + gap) / (size + gap)));
  }, [stageWidth, posterSizeTv, posterSizeMovies, posterSizeBooks, posterSizeGames, nav, gap]);

  const shelves = useMemo(() => {
    const usable = Math.max(0, stageWidth - SHELF_SIDE_PADDING * 2 - 60); // Reserve 60px for the counter
    const out: any[][] = [];
    
    // For home page with mixed item types, calculate shelf distribution based on actual item sizes
    if (nav === "home") {
      let currentShelf: any[] = [];
      let currentWidth = 0;
      
      for (let i = 0; i < shows.length; i++) {
        const show = shows[i];
        const isBook = show.__type === "book";
        const isMovie = show.__type === "movie";
        const isGame = show.__type === "game";
        const itemSize = isBook ? posterSizeBooks : isMovie ? posterSizeMovies : isGame ? posterSizeGames : posterSizeTv;
        const itemWidth = itemSize + (currentShelf.length > 0 ? gap : 0);
        
        // Check if adding this item would exceed the usable width
        if (currentShelf.length > 0 && currentWidth + itemWidth > usable) {
          // Start a new shelf
          out.push(currentShelf);
          currentShelf = [show];
          currentWidth = itemSize;
        } else {
          // Add to current shelf
          currentShelf.push(show);
          currentWidth += itemWidth;
        }
      }
      
      // Push the last shelf if it has items
      if (currentShelf.length > 0) {
        out.push(currentShelf);
      }
    } else {
      // For single-type views (books, movies, games, tv), use the simple fixed-size calculation
      for (let i = 0; i < shows.length; i += postersPerShelf) {
        out.push(shows.slice(i, i + postersPerShelf));
      }
    }

    const headerOffset = 140;
    const minShelves = Math.max(1, Math.ceil(Math.max(0, viewportH - headerOffset) / SHELF_HEIGHT));
    while (out.length < minShelves) out.push([]);

    return out;
  }, [shows, postersPerShelf, viewportH, SHELF_HEIGHT, stageWidth, nav, posterSizeBooks, posterSizeMovies, posterSizeGames, posterSizeTv, gap]);

  return (
    <div style={{ minHeight: "100vh", background: "#f4f1ea", color: "#111" }}>
      {/* Main layout: Sidebar + Content */}
      <div
        style={{
          width: "100%",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "320px 1fr",
          gap: 0,
          alignItems: "stretch",
        }}
      >
        {/* LEFT MENU */}
        <aside
          className="sidebar"
          style={{
            position: "sticky",
            top: 0,
            alignSelf: "start",
            height: "100vh",
            minHeight: "100vh",
            borderRadius: "0 0 0 0",
            overflowY: "auto",
            overflowX: "hidden",
            background: "url('/sidebar.png'), linear-gradient(180deg, #f4f1ea 0%, #efe7db 100%)",
            backgroundSize: "auto, 100% 100%",
            backgroundPosition: "0 0, 0 0",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRight: "none",
            boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            padding: "6px",
          }}
        >
          {/* Transparent module bubble wrapper */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.125)",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.35), 0 8px 20px rgba(0, 0, 0, 0.2), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
              border: "1px solid rgba(255, 255, 255, 0.4)",
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
              padding: "0px 12px 10px 12px",
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

          {/* Rolodex Counter */}
          {!loading && (
            <div style={{ padding: "10px 18px 0 18px", display: "flex", justifyContent: "center" }}>
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
              />
            </div>
          )}

          {/* Search */}
          <div style={{ padding: "10px 18px 0 18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 16,
                border: "1px solid rgba(138, 76, 76, 0.4)",
                background: "linear-gradient(180deg, rgba(138, 76, 76, 0.75) 0%, rgba(118, 60, 60, 0.8) 100%)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
                paddingLeft: "10px",
              }}
            >
              <img src="/icon-search.png" alt="" width={iconSize * 0.6} height={iconSize * 0.6} style={{ display: "block", background: "transparent", marginRight: "6px", filter: "brightness(0) invert(1) opacity(0.7)" }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                style={{
                  flex: 1,
                  padding: "9px 10px",
                  border: "none",
                  background: "transparent",
                  color: "rgba(255, 255, 255, 0.95)",
                  fontSize: 13,
                  fontWeight: 500,
                  outline: "none",
                }}
                className="search-input"
              />
            </div>
          </div>

          {/* Sort Module */}
          <div style={{ padding: "0 18px", marginTop: 10 }}>
            <div
              style={{
                fontSize: sidebarHeaderFontSize,
                fontWeight: sidebarHeaderFontWeight,
                letterSpacing: "0.04em",
                color: "#954949",
                marginBottom: 6,
                fontFamily: "Nunito, sans-serif",
              }}
            >
              SORT
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {/* Sort Field Dropdown */}
              <div style={{ flex: 1 }}>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(138, 76, 76, 0.4)",
                    background: "linear-gradient(180deg, rgba(138, 76, 76, 0.75) 0%, rgba(118, 60, 60, 0.8) 100%)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
                    color: "rgba(255, 255, 255, 0.95)",
                    fontSize: 13,
                    fontWeight: 500,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  {nav === "books" && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                      <option value="CompletedDate">Completed Date</option>
                    </>
                  )}
                  {nav === "movies" && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                    </>
                  )}
                  {nav === "tv" && (
                    <>
                      <option value="Title">Title</option>
                      <option value="LastAirDate">Last Air Date</option>
                      <option value="FirstAirDate">First Air Date</option>
                    </>
                  )}
                  {nav === "games" && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                    </>
                  )}
                  {(nav === "home" || nav === "year-this" || nav === "year-previous") && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                    </>
                  )}
                </select>
              </div>
              
              {/* Sort Order Dropdown */}
              <div style={{ flex: 1 }}>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "Asc" | "Desc")}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 12,
                    border: "1px solid rgba(138, 76, 76, 0.4)",
                    background: "linear-gradient(180deg, rgba(138, 76, 76, 0.75) 0%, rgba(118, 60, 60, 0.8) 100%)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.1)",
                    color: "rgba(255, 255, 255, 0.95)",
                    fontSize: 13,
                    fontWeight: 500,
                    outline: "none",
                    cursor: "pointer",
                  }}
                >
                  <option value="Asc">Asc</option>
                  <option value="Desc">Desc</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ padding: "0 12px", display: "flex", flexDirection: "column", gap: 12, flex: 1, marginTop: 14 }}>
            {/* Library Module */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.125)",
                borderRadius: 16,
                boxShadow: "0 1px 0 rgba(255, 255, 255, 0.4), 0 6px 12px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.7), inset 0 0 40px rgba(0, 0, 0, 0.08)",
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
                  color: "#954949",
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
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: nav === "home" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-home.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
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
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: nav === "books" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-books.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    Books
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "books" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background: "#6ba56a",
                        color: "#fff",
                      }}
                    >
                      {stats.books}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                {openSection === "books" ? (
                  <div style={{ marginTop: 8, paddingLeft: 28, display: "flex", flexDirection: "column", gap: 10 }}>
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Reading Status</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Formats</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {format}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Series</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {series}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Categories</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{genreOpen ? "−" : "+"}</span>
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {genre}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Wishlist</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{wishlistOpen ? "−" : "+"}</span>
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
                          <span style={{ color: "rgba(0,0,0,0.7)" }}>
                            Wishlist Books
                          </span>
                          <span
                            style={{
                              minWidth: 24,
                              height: 20,
                              padding: "0 8px",
                              borderRadius: 12,
                              fontSize: 12,
                              textAlign: "center",
                              background: wishlistFilter ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                              color: "#333",
                              border: "1px solid rgba(0,0,0,0.12)",
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
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: nav === "movies" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-movies.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    Movies
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "movies" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background: "#5b9bd5",
                        color: "#fff",
                      }}
                    >
                      {stats.movies}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                {openSection === "movies" ? (
                  <div style={{ marginTop: 8, paddingLeft: 28, display: "flex", flexDirection: "column", gap: 10 }}>
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Watch Status</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{movieWatchStatusOpen ? "−" : "+"}</span>
                    </button>
                    {movieWatchStatusOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {["Watched", "Unwatched"].map((status) => {
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Genre</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{movieGenreOpen ? "−" : "+"}</span>
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {genre}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: nav === "tv" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-tv.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    TV Shows
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "tv" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background: "#d97642",
                        color: "#fff",
                      }}
                    >
                      {stats.tv}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>

                {openSection === "tv" ? (
                  <div style={{ marginTop: 8, paddingLeft: 28, display: "flex", flexDirection: "column", gap: 10 }}>
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Watch Status</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Show Status</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Tags</span>
                      <span style={{ color: "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{tagOpen ? "−" : "+"}</span>
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
                              <span style={{ color: "rgba(0,0,0,0.7)" }}>
                                {tag}
                              </span>
                              <span
                                style={{
                                  minWidth: 24,
                                  height: 20,
                                  padding: "0 8px",
                                  borderRadius: 12,
                                  fontSize: 12,
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: nav === "games" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-games.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    Games
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 40,
                        height: 22,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "games" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background: "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.games}
                    </span>
                    <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                  </span>
                </button>


              </div>

              {/* SMART LISTS section */}
              <div style={{ marginTop: "16px" }}>
              <div
                style={{
                  fontSize: sidebarHeaderFontSize,
                  fontWeight: sidebarHeaderFontWeight,
                  letterSpacing: "0.04em",
                  color: "#954949",
                  marginBottom: 6,
                  fontFamily: "Nunito, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>SMART LISTS</span>
                <span />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
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
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: nav === "year-this" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-year.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    This Year
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>

                {/* Other submenu */}
                <button
                  onClick={() => setOtherMenuOpen(!otherMenuOpen)}
                  className="sideItem"
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
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: otherMenuOpen ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: otherMenuOpen ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-year.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    Other
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>
                    {otherMenuOpen ? "−" : "+"}
                  </span>
                </button>

                {otherMenuOpen && (
                  <div style={{ paddingLeft: 30, display: "flex", flexDirection: "column", gap: 0 }}>
                    <button
                      onClick={() => setNav("year-previous")}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                        borderBottom: "1px solid rgba(0,0,0,0.06)",
                        padding: "8px 0",
                        fontSize: 14,
                        fontFamily: "Nunito, sans-serif",
                        color: "#4A4A4A",
                        background: nav === "year-previous" ? "rgba(138, 76, 76, 0.15)" : "transparent",
                        border: "none",
                        cursor: "pointer",
                        borderRadius: 0,
                      }}
                    >
                      <span style={{ fontWeight: "600", fontFamily: "Nunito, sans-serif" }}>Previous Year</span>
                      <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                    </button>

                    {nav === "year-previous" && (
                      <div style={{ paddingLeft: 16, paddingTop: 4, paddingBottom: 8 }}>
                        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 500, fontFamily: "Nunito, sans-serif", color: "rgba(0, 0, 0, 0.7)" }}>
                          Select Year:
                          <input
                            type="number"
                            min="1900"
                            max="2025"
                            value={selectedPreviousYear}
                            onChange={(e) => setSelectedPreviousYear(Number(e.target.value) || 2025)}
                            style={{ width: 80, fontSize: 14 }}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            </div>
            </div>

            {/* DISCOVER Module */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.125)",
                borderRadius: 16,
                boxShadow: "0 1px 0 rgba(255, 255, 255, 0.4), 0 6px 12px rgba(0, 0, 0, 0.2), 0 3px 6px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1), inset 0 1px 2px rgba(255, 255, 255, 0.7), inset 0 0 40px rgba(0, 0, 0, 0.08)",
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
                  color: "#954949",
                  marginBottom: 6,
                  fontFamily: "Nunito, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>DISCOVER</span>
                <span />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                <button
                  className="sideItem"
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
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-statistics.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
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
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: showThemes ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-theme.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    Themes
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>

                <button
                  onClick={() => {
                    console.log("Settings button clicked, current state:", showSettings);
                    setShowSettings(!showSettings);
                  }}
                  className={`sideItem primary ${showSettings ? "active" : ""}`}
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
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: showSettings ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: showSettings ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-settings.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    Settings
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>
              </div>
            </div>
            </div>

            {showThemes ? (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A" }}>SHELF WOOD TYPE</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <button
                    onClick={() => updateShelfTheme("/shelves-light-single2.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelves-light-single2.png" ? "2px solid #954949" : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelves-light-single2.png" ? "rgba(149, 73, 73, 0.1)" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 12,
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
                      border: shelfTheme === "/shelf-dark-walnut.png" ? "2px solid #954949" : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-dark-walnut.png" ? "rgba(149, 73, 73, 0.1)" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: shelfTheme === "/shelf-dark-walnut.png" ? 600 : 400,
                    }}
                  >
                    Dark Walnut
                  </button>
                  <button
                    onClick={() => updateShelfTheme("/shelf-weathered-oak.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelf-weathered-oak.png" ? "2px solid #954949" : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-weathered-oak.png" ? "rgba(149, 73, 73, 0.1)" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: shelfTheme === "/shelf-weathered-oak.png" ? 600 : 400,
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
                      border: shelfTheme === "/shelf-honey-oak.png" ? "2px solid #954949" : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-honey-oak.png" ? "rgba(149, 73, 73, 0.1)" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 12,
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
                      border: shelfTheme === "/shelf-teak.png" ? "2px solid #954949" : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-teak.png" ? "rgba(149, 73, 73, 0.1)" : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: shelfTheme === "/shelf-teak.png" ? 600 : 400,
                    }}
                  >
                    Teak
                  </button>
                </div>
              </div>
            ) : null}

            {showSettings ? (
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Cover Size */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, coverSize: !settingsOpen.coverSize })}
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
                  }}
                >
                  <span>COVER SIZE</span>
                  <span>{settingsOpen.coverSize ? "−" : "+"}</span>
                </button>
                {settingsOpen.coverSize ? (
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
                        onChange={(e) => setShowInsetGuide(e.target.checked)}
                      />
                      Frame
                    </label>
                  </div>
                ) : null}

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
                    {/* TV Show Insets Sub-section - COLLAPSIBLE */}
                    <div>
                      <button
                        onClick={() => setSettingsOpen({ ...settingsOpen, tvShowInsetsCollapsed: !settingsOpen.tvShowInsetsCollapsed })}
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
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#999",
                        }}
                      >
                        <span>TV SHOWS</span>
                        <span style={{ fontSize: 12 }}>{settingsOpen.tvShowInsetsCollapsed ? "+" : "−"}</span>
                      </button>
                      {settingsOpen.tvShowInsetsCollapsed ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4, marginTop: 4 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, opacity: 0.8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Top
                              <input
                                type="number"
                                value={caseInsetTopPx}
                                onChange={(e) => updateCaseInsetTopPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Right
                              <input
                                type="number"
                                value={caseInsetRightPx}
                                onChange={(e) => updateCaseInsetRightPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Bottom
                              <input
                                type="number"
                                value={caseInsetBottomPx}
                                onChange={(e) => updateCaseInsetBottomPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Left
                              <input
                                type="number"
                                value={caseInsetLeftPx}
                                onChange={(e) => updateCaseInsetLeftPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                          </div>
                          <button
                            onClick={() => saveInsetsToSheet('tv')}
                            style={{
                              padding: "4px 8px",
                              fontSize: 10,
                              background: "#0066cc",
                              color: "white",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            Save TV Insets
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Book Insets Sub-section - COLLAPSIBLE */}
                    <div>
                      <button
                        onClick={() => setSettingsOpen({ ...settingsOpen, bookInsetsCollapsed: !settingsOpen.bookInsetsCollapsed })}
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
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#999",
                        }}
                      >
                        <span>BOOKS</span>
                        <span style={{ fontSize: 12 }}>{settingsOpen.bookInsetsCollapsed ? "+" : "−"}</span>
                      </button>
                      {settingsOpen.bookInsetsCollapsed ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4, marginTop: 4 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, opacity: 0.8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Top
                              <input
                                type="number"
                                value={bookInsetTopPx}
                                onChange={(e) => updateBookInsetTopPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Right
                              <input
                                type="number"
                                value={bookInsetRightPx}
                                onChange={(e) => updateBookInsetRightPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Bottom
                              <input
                                type="number"
                                value={bookInsetBottomPx}
                                onChange={(e) => updateBookInsetBottomPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Left
                              <input
                                type="number"
                                value={bookInsetLeftPx}
                                onChange={(e) => updateBookInsetLeftPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                          </div>
                          <button
                            onClick={() => saveInsetsToSheet('book')}
                            style={{
                              padding: "4px 8px",
                              fontSize: 10,
                              background: "#0066cc",
                              color: "white",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            Save Book Insets
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Movie Insets Sub-section - COLLAPSIBLE */}
                    <div>
                      <button
                        onClick={() => setSettingsOpen({ ...settingsOpen, movieInsetsCollapsed: !settingsOpen.movieInsetsCollapsed })}
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
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#999",
                        }}
                      >
                        <span>MOVIES</span>
                        <span style={{ fontSize: 12 }}>{settingsOpen.movieInsetsCollapsed ? "+" : "−"}</span>
                      </button>
                      {settingsOpen.movieInsetsCollapsed ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingLeft: 4, marginTop: 4 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, opacity: 0.8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Top
                              <input
                                type="number"
                                value={movieInsetTopPx}
                                onChange={(e) => updateMovieInsetTopPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Right
                              <input
                                type="number"
                                value={movieInsetRightPx}
                                onChange={(e) => updateMovieInsetRightPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Bottom
                              <input
                                type="number"
                                value={movieInsetBottomPx}
                                onChange={(e) => updateMovieInsetBottomPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Left
                              <input
                                type="number"
                                value={movieInsetLeftPx}
                                onChange={(e) => updateMovieInsetLeftPx(Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                          </div>
                          <button
                            onClick={() => saveInsetsToSheet('movie')}
                            style={{
                              padding: "4px 8px",
                              fontSize: 10,
                              background: "#0066cc",
                              color: "white",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            Save Movie Insets
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Game Insets Sub-section - COLLAPSIBLE */}
                    <div>
                      <button
                        onClick={() => setSettingsOpen({ ...settingsOpen, gameInsetsCollapsed: !settingsOpen.gameInsetsCollapsed })}
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
                          fontSize: 10,
                          fontWeight: 600,
                          color: "#999",
                        }}
                      >
                        <span>GAMES</span>
                        <span style={{ fontSize: 12 }}>{settingsOpen.gameInsetsCollapsed ? "+" : "−"}</span>
                      </button>
                      {settingsOpen.gameInsetsCollapsed ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 4, marginTop: 4 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.85 }}>
                            Platform
                            <select
                              value={selectedPlatformForInsets}
                              onChange={(e) => setSelectedPlatformForInsets(e.target.value)}
                              style={{ flex: 1, padding: "4px 8px", fontSize: 11 }}
                            >
                              {detectedPlatforms.map(platform => (
                                <option key={platform} value={platform}>{platform}</option>
                              ))}
                            </select>
                          </label>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, opacity: 0.8 }}>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Top
                              <input
                                type="number"
                                value={platformInsets[selectedPlatformForInsets]?.top ?? 5}
                                onChange={(e) => updatePlatformInset(selectedPlatformForInsets, 'top', Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Right
                              <input
                                type="number"
                                value={platformInsets[selectedPlatformForInsets]?.right ?? 5}
                                onChange={(e) => updatePlatformInset(selectedPlatformForInsets, 'right', Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Bottom
                              <input
                                type="number"
                                value={platformInsets[selectedPlatformForInsets]?.bottom ?? 5}
                                onChange={(e) => updatePlatformInset(selectedPlatformForInsets, 'bottom', Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                            <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              Left
                              <input
                                type="number"
                                value={platformInsets[selectedPlatformForInsets]?.left ?? 5}
                                onChange={(e) => updatePlatformInset(selectedPlatformForInsets, 'left', Number(e.target.value) || 0)}
                                style={{ width: 50 }}
                              />
                            </label>
                          </div>
                          <div style={{ fontSize: 11, opacity: 0.6, marginTop: 4 }}>
                            Frame: {GAME_SRC_W}×{GAME_SRC_H}
                          </div>
                          
                          {/* Overlay Size & Position Controls */}
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 4 }}>OVERLAY ADJUSTMENTS</div>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, opacity: 0.8 }}>
                              <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                Width
                                <input
                                  type="number"
                                  value={platformOverlaySettings[selectedPlatformForInsets]?.width ?? 100}
                                  onChange={(e) => updatePlatformOverlay(selectedPlatformForInsets, 'width', Number(e.target.value) || 100)}
                                  style={{ width: 50 }}
                                  min={50}
                                  max={150}
                                  step={0.1}
                                />
                                <span style={{ fontSize: 9, opacity: 0.6 }}>%</span>
                              </label>
                              <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                Height
                                <input
                                  type="number"
                                  value={platformOverlaySettings[selectedPlatformForInsets]?.height ?? 100}
                                  onChange={(e) => updatePlatformOverlay(selectedPlatformForInsets, 'height', Number(e.target.value) || 100)}
                                  style={{ width: 50 }}
                                  min={50}
                                  max={150}
                                  step={0.1}
                                />
                                <span style={{ fontSize: 9, opacity: 0.6 }}>%</span>
                              </label>
                              <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                Top
                                <input
                                  type="number"
                                  value={platformOverlaySettings[selectedPlatformForInsets]?.top ?? 0}
                                  onChange={(e) => updatePlatformOverlay(selectedPlatformForInsets, 'top', Number(e.target.value) || 0)}
                                  style={{ width: 50 }}
                                  min={-50}
                                  max={50}
                                  step={0.1}
                                />
                                <span style={{ fontSize: 9, opacity: 0.6 }}>%</span>
                              </label>
                              <label style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                Left
                                <input
                                  type="number"
                                  value={platformOverlaySettings[selectedPlatformForInsets]?.left ?? 0}
                                  onChange={(e) => updatePlatformOverlay(selectedPlatformForInsets, 'left', Number(e.target.value) || 0)}
                                  style={{ width: 50 }}
                                  min={-50}
                                  max={50}
                                  step={0.1}
                                />
                                <span style={{ fontSize: 9, opacity: 0.6 }}>%</span>
                              </label>
                            </div>
                            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                              Adjust overlay frame size and position
                            </div>
                          </div>
                          
                          {/* Cover Scale Control */}
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(0,0,0,0.1)" }}>
                            <div style={{ fontSize: 10, fontWeight: 600, color: "#999", marginBottom: 4 }}>COVER IMAGE SCALE</div>
                            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                              Scale
                              <input
                                type="number"
                                value={platformCoverScale[selectedPlatformForInsets] ?? 100}
                                onChange={(e) => updatePlatformCoverScale(selectedPlatformForInsets, Number(e.target.value) || 100)}
                                style={{ width: 60 }}
                                min={50}
                                max={200}
                                step={1}
                              />
                              <span style={{ fontSize: 9, opacity: 0.6 }}>%</span>
                            </label>
                            <div style={{ fontSize: 10, opacity: 0.6, marginTop: 4 }}>
                              Scale the cover art to prevent cutoff (100% = original size)
                            </div>
                          </div>
                          
                          <div style={{ fontSize: 11, opacity: 0.75, marginTop: 8, padding: "6px 8px", background: "rgba(0,0,0,0.05)", borderRadius: 4 }}>
                            <div style={{ fontWeight: 600, marginBottom: 2 }}>Frame File:</div>
                            <code style={{ fontSize: 10, background: "rgba(0,0,0,0.08)", padding: "2px 6px", borderRadius: 3, fontFamily: "monospace" }}>
                              {getPlatformFrameFilename(selectedPlatformForInsets)}
                            </code>
                            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>
                              Place in /public folder
                              {selectedPlatformForInsets === "Default" ? " (falls back to game-frame.png)" : ""}
                            </div>
                          </div>
                          <button
                            onClick={() => saveInsetsToSheet('game')}
                            style={{
                              padding: "4px 8px",
                              fontSize: 10,
                              background: "#0066cc",
                              color: "white",
                              border: "none",
                              borderRadius: 3,
                              cursor: "pointer",
                              fontWeight: 600,
                            }}
                          >
                            Save {selectedPlatformForInsets} Inset
                          </button>
                        </div>
                      ) : null}
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
                    fontSize: 12,
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
                    fontSize: 12,
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
              </div>
            ) : null}
            </div>

            {/* Synced Module at Bottom */}
            <div style={{ padding: "0 12px", marginTop: "auto", marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 12,
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
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0, marginLeft: syncIconSize + 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ color: "#754738", fontSize: 14, fontWeight: 500, fontFamily: "Nunito, sans-serif" }}>
                        {syncState === "saving"
                          ? "Syncing"
                          : syncState === "ok"
                          ? "Synced"
                          : syncState === "error"
                          ? "Error"
                          : "Idle"}
                      </div>
                      <div style={{ color: "rgba(0,0,0,0.6)", fontSize: 10, fontWeight: 500, whiteSpace: "nowrap" }}>
                        {lastSyncAt ? formatLastSync(lastSyncAt) : "—"}
                      </div>
                    </div>
                    {syncState === "error" && syncMsg ? (
                      <div
                        style={{
                          color: "#8b0000",
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
        <main style={{ width: "100%", padding: "0 0 40px 0", boxSizing: "border-box", position: "relative" }}>
          {/* Item Counter - Top Right */}
          <div
            style={{
              position: "fixed",
              top: 8,
              right: 12,
              fontSize: 14,
              fontWeight: 700,
              color: "#5c3c38",
              fontFamily: "Nunito, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
              textShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
              opacity: 0.75,
              letterSpacing: "-0.01em",
              pointerEvents: "none",
              zIndex: 1000,
              background: "rgba(244, 241, 234, 0.5)",
              padding: "2px 6px",
              borderRadius: 6,
              border: "1px solid rgba(92, 60, 56, 0.15)",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.08)",
            }}
          >
            {shows.length}
          </div>

          {error ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
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

          {loading ? (
            <div
              style={{
                background: "#fff",
                border: "1px solid rgba(0,0,0,0.12)",
                borderRadius: 12,
                padding: 14,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Loading…
            </div>
          ) : null}

          {/* Stage measures width so shelves always align */}
          <div ref={stageRef} style={{ width: "100%" }}>
            {/* IMPORTANT: no vertical gap between shelves */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {shelves.map((shelfShows, shelfIndex) => (
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
                    {shelfShows.map((show, i) => {
                      const isBook = show.__type === "book";
                      const isMovie = show.__type === "movie";
                      const isGame = show.__type === "game";
                      const gamePlatformRaw = isGame && 'platform' in show ? show.platform : undefined;
                      // Determine primary platform based on priority (Steam > Epic > Default)
                      const gamePlatform = isGame ? getPrimaryPlatform(gamePlatformRaw) : undefined;
                      const isSteam = gamePlatform === "Steam";
                      const itemSize = isBook ? posterSizeBooks : isMovie ? posterSizeMovies : isGame ? posterSizeGames : posterSizeTv;
                      // Calculate x as cumulative sum of all previous items + gaps
                      let x = 0;
                      for (let j = 0; j < i; j++) {
                        const prevShow = shelfShows[j];
                        const prevIsBook = prevShow.__type === "book";
                        const prevIsMovie = prevShow.__type === "movie";
                        const prevIsGame = prevShow.__type === "game";
                        const prevSize = prevIsBook ? posterSizeBooks : prevIsMovie ? posterSizeMovies : prevIsGame ? posterSizeGames : posterSizeTv;
                        x += prevSize + gap;
                      }
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
                        
                        // Use platform-specific insets ONLY if this platform exists AND is different from Default
                        const platformInset = platformInsets[platformKey];
                        const isPlatformCustomized = platformInset && 
                          (platformInset.top !== defaultInsets.top ||
                           platformInset.right !== defaultInsets.right ||
                           platformInset.bottom !== defaultInsets.bottom ||
                           platformInset.left !== defaultInsets.left);
                        
                        const insets = isPlatformCustomized && platformKey !== "Default" ? platformInset : defaultInsets;
                        
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
                      
                      // Get overlay settings and cover scale for games
                      let overlayWidth = 100;
                      let overlayHeight = 100;
                      let overlayTop = 0;
                      let overlayLeft = 0;
                      let coverScale = 100;
                      
                      if (isGame) {
                        const platformKey = gamePlatform || "Default";
                        const defaultOverlay = platformOverlaySettings["Default"] || { width: 100, height: 100, top: 0, left: 0 };
                        const platformOverlay = platformOverlaySettings[platformKey];
                        const overlay = platformOverlay || defaultOverlay;
                        
                        overlayWidth = overlay.width;
                        overlayHeight = overlay.height;
                        overlayTop = overlay.top;
                        overlayLeft = overlay.left;
                        
                        coverScale = platformCoverScale[platformKey] || platformCoverScale["Default"] || 100;
                      }
                      
                      const srcW = isBook ? BOOK_SRC_W : isMovie ? MOVIE_SRC_W : isGame ? GAME_SRC_W : CASE_SRC_W;
                      const srcH = isBook ? BOOK_SRC_H : isMovie ? MOVIE_SRC_H : isGame ? GAME_SRC_H : CASE_SRC_H;

                      const insetTop = Math.round((insetTopVal / srcH) * caseHeight);
                      const insetRight = Math.round((insetRightVal / srcW) * caseWidth);
                      const insetBottom = Math.round((insetBottomVal / srcH) * caseHeight);
                      const insetLeft = Math.round((insetLeftVal / srcW) * caseWidth);

                      return (
                        <div
                          key={`${show.tmdbId ?? show.title}-${i}`}
                          title={show.title}
                          className="case"
                          style={{
                            position: "absolute",
                            left: x,
                            bottom: LIP_FROM_BOTTOM,
                            width: caseWidth,
                            height: caseHeight,
                          }}
                          onMouseMove={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            const xRel = (e.clientX - rect.left) / rect.width - 0.5;
                            const yRel = (e.clientY - rect.top) / rect.height - 0.5;
                            const maxTilt = 20;
                            const tiltY = Math.max(-maxTilt, Math.min(maxTilt, xRel * maxTilt * 2));
                            const tiltX = Math.max(-10, Math.min(10, -yRel * 16));
                            e.currentTarget.style.setProperty("--tiltY", `${tiltY}deg`);
                            e.currentTarget.style.setProperty("--tiltX", `${tiltX}deg`);
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.setProperty("--tiltY", "0deg");
                            e.currentTarget.style.setProperty("--tiltX", "0deg");
                          }}
                        >
                          {/* soft shelf shadow (ellipse) */}
                          <div
                            aria-hidden
                            style={{
                              position: "absolute",
                              left: "6%",
                              right: "6%",
                              height: 12,
                              bottom: -2,
                              background:
                                "radial-gradient(ellipse at center, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.0) 70%)",
                              filter: "blur(2px)",
                              opacity: 0.7,
                              pointerEvents: "none",
                            }}
                          />

                          {/* Insert area (poster) */}
                          <div
                            style={{
                              position: "absolute",
                              top: insetTop,
                              right: insetRight,
                              bottom: insetBottom,
                              left: insetLeft,
                              overflow: "hidden",
                              borderRadius: 0,
                              background: isGame ? "transparent" : "rgba(255,255,255,0.12)",
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

                            {show.posterUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                className="case-poster"
                                src={show.posterUrl}
                                alt={show.title}
                                loading="lazy"
                                style={{
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "cover",
                                  display: "block",
                                  transform: isGame ? `scale(${coverScale / 100})` : "none",
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
                                  fontSize: 12,
                                  fontWeight: 800,
                                  color: "rgba(0,0,0,0.65)",
                                  background:
                                    "linear-gradient(135deg, rgba(255,255,255,0.65), rgba(0,0,0,0.08))",
                                }}
                              >
                                No poster
                              </div>
                            )}

                            {/* Subtle reflection confined to the cover art */}
                          <div
                            aria-hidden
                            className="case-reflection"
                            style={{
                              position: "absolute",
                              inset: 0,
                              pointerEvents: "none",
                              zIndex: 2,
                              background:
                                "linear-gradient(165deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.22) 30%, rgba(255,255,255,0.08) 62%, rgba(255,255,255,0.0) 85%)",
                              mixBlendMode: "screen",
                              transform: isGame ? `scale(${coverScale / 100})` : "none",
                            }}
                          />
                          </div>

                          {/* Case frame overlay */}
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              isBook ? BOOK_FRAME_IMAGE : 
                              isMovie ? MOVIE_FRAME_IMAGE : 
                              isGame ? getPlatformFrameFilename(gamePlatform) : 
                              CASE_FRAME_IMAGE
                            }
                            onError={(e) => {
                              // Fall back to default game frame if platform-specific frame fails to load
                              if (isGame && e.currentTarget.src !== GAME_FRAME_IMAGE) {
                                e.currentTarget.src = GAME_FRAME_IMAGE;
                              }
                            }}
                            alt=""
                            style={{
                            position: "absolute",
                            top: isGame ? `${50 + overlayTop}%` : 0,
                            left: isGame ? `${50 + overlayLeft}%` : 0,
                            width: isGame ? "100%" : "100%",
                            height: isGame ? "100%" : "100%",
                            transform: isGame ? `translate(-50%, -50%) scale(${overlayWidth / 100}, ${overlayHeight / 100})` : "none",
                            objectFit: "fill",
                            pointerEvents: "none",
                            userSelect: "none",
                          }}
                          draggable={false}
                        />

                          {/* Optional: extra spec highlight */}
                          <div
                            aria-hidden
                            style={{
                              position: "absolute",
                              inset: 0,
                              borderRadius: 2,
                              pointerEvents: "none",
                              background:
                                "linear-gradient(115deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 18%, rgba(255,255,255,0.00) 45%, rgba(0,0,0,0.06) 100%)",
                              mixBlendMode: "screen",
                              opacity: 0.25,
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.65 }}>
              View: {nav} · Shelves: {shelves.length} · {postersPerShelf} per shelf · lip offset {LIP_FROM_BOTTOM}px
            </div>
          </div>
        </main>
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
          font-family: "Geist Sans", "Geist", "Segoe UI", sans-serif;
          background-image: url('/sidebar-texture.png'), linear-gradient(180deg, #f4f1ea 0%, #efe7db 100%);
          background-repeat: repeat, no-repeat;
          background-size: auto 28px, cover;
          background-position: top left, center;
        }
        .sideItem {
          width: 100%;
          padding: 3px 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: #2A2A2A;
          font-size: 17px;
          font-weight: 500;
          font-family: "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          cursor: pointer;
          transition: all 150ms ease;
        }
        .sideItem:hover { 
          background: rgba(0,0,0,0.02);
        }
        .sideItem.active {
          background: rgba(138, 76, 76, 0.15);
          box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          border-color: rgba(138, 76, 76, 0.25);
          font-weight: 600;
          color: #8a4c4c;
        }
        .sideItem.primary { background: transparent; }
        .sideItem.primary:hover { background: rgba(0,0,0,0.02); }
        .sideItem.primary.active { background: rgba(138, 76, 76, 0.12); color: #8a4c4c; }
        .sideSubItem {
          width: 100%;
          padding: 5px 8px;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: rgba(255, 255, 255, 0.6);
          color: rgba(0, 0, 0, 0.7);
          font-size: 14px;
          font-weight: 500;
          font-family: "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
          cursor: pointer;
          transition: background 140ms ease, border-color 140ms ease;
        }
        .sideSubItem:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .sideSubItem.active {
          background: rgba(138, 76, 76, 0.18);
          border-color: rgba(0, 0, 0, 0.08);
          font-weight: 700;
        }
        .case {
          transition: transform 60ms ease, filter 120ms ease;
          transform: perspective(900px) rotateY(var(--tiltY, 0deg)) rotateX(var(--tiltX, 0deg));
          filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.22));
          transform-style: preserve-3d;
        }
        .case:hover {
          filter: drop-shadow(0 10px 12px rgba(0, 0, 0, 0.26));
        }
        .case-reflection {
          transition: opacity 200ms ease, transform 200ms ease;
          opacity: 0;
          transform: translateY(-6px);
        }
        .case:hover .case-reflection {
          opacity: 0.85;
          transform: translateY(0);
        }
      `}</style>
    </div>
  );
}

function NavButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        borderRadius: 12,
        border: "1px solid rgba(0,0,0,0.16)",
        background: active
          ? "linear-gradient(180deg, rgba(255,255,255,0.95), rgba(230,230,230,0.95))"
          : "linear-gradient(180deg, rgba(255,255,255,0.85), rgba(235,235,235,0.85))",
        boxShadow: active ? "0 10px 18px rgba(0,0,0,0.16)" : "0 6px 14px rgba(0,0,0,0.10)",
        padding: "10px 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        fontWeight: 900,
        color: "rgba(0,0,0,0.78)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          aria-hidden
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: active ? "rgba(0,0,0,0.55)" : "rgba(0,0,0,0.25)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        />
        {label}
      </span>

      <span
        style={{
          minWidth: 34,
          height: 22,
          padding: "0 8px",
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 900,
          background: "rgba(0,0,0,0.08)",
          border: "1px solid rgba(0,0,0,0.12)",
          color: "rgba(0,0,0,0.72)",
        }}
      >
        {count}
      </span>
    </button>
  );
}
