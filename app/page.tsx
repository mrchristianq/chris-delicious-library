/* =====================================================================================
  Chris' Delicious Library
  Version: 2.0.0
   Notes:
   - Client-side CSV load from Google Sheets (published CSV)
   - Left sidebar menu (Delicious Library style)
   - 1 shelf image per row (no gaps between shelves)
   - Posters only (no title labels)
   - Posters align to shelf lip
   - DVD case frame overlay (no left border) + glossy black edge
   
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
   - Reorganized Settings into 5 collapsible submenus (Cover Size, Frame Position, Book Insets, Logo Size & Placement, Sync Status Icon Size & Placement)
   - Changed LIBRARY section color to #954949
   - Added DISCOVER section with Settings and Statistics buttons
   - Updated logo from Logo2.png to logo4.png with full-width layout
   - Made sync icon absolutely positioned for independent movement
   - Added adjustable settings for sync icon size and position
===================================================================================== */

"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";

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
const SHELF_IMAGE = "/shelves-light-single2.png";
const CASE_FRAME_IMAGE = "/dvd-case-frame.png";
const MOVIE_FRAME_IMAGE = "/movie-frame.png";
const BOOK_FRAME_IMAGE = "/book-frame-overlay.png";
const APP_ICON = "/logo4.png";

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
  const [selectedPreviousYear, setSelectedPreviousYear] = useState<number>(2025);

  // Settings submenus
  const [settingsOpen, setSettingsOpen] = useState<{
    coverSize: boolean;
    framePosition: boolean;
    bookInsets: boolean;
    movieInsets: boolean;
    gameInsets: boolean;
    logoSize: boolean;
    syncIcon: boolean;
  }>({
    coverSize: false,
    framePosition: false,
    bookInsets: false,
    movieInsets: false,
    gameInsets: false,
    logoSize: false,
    syncIcon: false,
  });

  // UI
  const [posterSizeTv, setPosterSizeTv] = useState<number>(100);
  const [posterSizeMovies, setPosterSizeMovies] = useState<number>(108);
  const [posterSizeBooks, setPosterSizeBooks] = useState<number>(115);
  const [bookHeightMultiplier, setBookHeightMultiplier] = useState<number>(1.5);
  const [tight, setTight] = useState<boolean>(true);
  const [watchFilter, setWatchFilter] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState<string | null>(null);
  const [watchStatusOpen, setWatchStatusOpen] = useState<boolean>(false);
  const [showStatusOpen, setShowStatusOpen] = useState<boolean>(false);
  const [viewportH, setViewportH] = useState(0);

  // Logo positioning and sizing
  const [logoSize, setLogoSize] = useState<number>(230);
  const [logoTop, setLogoTop] = useState<number>(12);
  const [logoLeft, setLogoLeft] = useState<number>(-28);

  // Synced icon positioning and sizing
  const [syncIconSize, setSyncIconSize] = useState<number>(12);
  const [syncIconTop, setSyncIconTop] = useState<number>(8);

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
  
  // Game frame: separate insets for game covers
  const GAME_SRC_W = 1024;
  const GAME_SRC_H = 1536;
  const [gameInsetTopPx, setGameInsetTopPx] = useState(0);
  const [gameInsetRightPx, setGameInsetRightPx] = useState(0);
  const [gameInsetBottomPx, setGameInsetBottomPx] = useState(0);
  const [gameInsetLeftPx, setGameInsetLeftPx] = useState(0);
  
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
          console.log(`Movies CSV loaded: ${data.length} movies found`);
          console.log('First movie:', data[0]);
          setMovieRows(data);
        } else if (moviesRes && moviesRes.status === "rejected") {
          console.error('Movies CSV failed:', moviesRes.reason);
          setError((prev) => (prev ? prev + "\n" : "") + `Movies CSV: ${moviesRes.reason?.message || String(moviesRes.reason)}`);
        } else {
          console.log('Movies CSV status:', moviesRes?.status, 'value type:', typeof moviesRes?.value);
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
  const getSetting = (key: string, defaultValue: any) => {
    const setting = settingsRows.find((r) => safeStr(r["Key"]) === key);
    if (setting && setting["Value"] !== undefined && setting["Value"] !== "") {
      const value = setting["Value"];
      // Try to parse as number if it looks like one
      if (!isNaN(Number(value))) return Number(value);
      // Try to parse as boolean
      if (value === "true") return true;
      if (value === "false") return false;
      return value;
    }
    return defaultValue;
  };

  const saveSetting = async (key: string, value: any, category: string = "", description: string = "") => {
    if (!settingsWriteUrl) {
      console.warn("No settings write URL configured");
      return;
    }
    
    try {
      await fetch(settingsWriteUrl, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: String(value), category, description }),
      });
    } catch (e) {
      console.error("Failed to save setting:", e);
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
    setGameInsetTopPx(getSetting("gameInsetTopPx", 0));
    setGameInsetRightPx(getSetting("gameInsetRightPx", 0));
    setGameInsetBottomPx(getSetting("gameInsetBottomPx", 0));
    setGameInsetLeftPx(getSetting("gameInsetLeftPx", 0));
    
    setLogoSize(getSetting("logoSize", 230));
    setLogoTop(getSetting("logoTop", 12));
    setLogoLeft(getSetting("logoLeft", -28));
    
    setSyncIconSize(getSetting("syncIconSize", 12));
    setSyncIconTop(getSetting("syncIconTop", 8));
  }, [settingsRows]);

  // Function to save all current settings to spreadsheet
  const saveAllSettings = async () => {
    if (!settingsWriteUrl) {
      alert("No settings write URL configured");
      return;
    }
    
    setSyncState("saving");
    setSyncMsg("Saving settings...");
    
    const settings = [
      { key: "posterSizeTv", value: posterSizeTv, category: "Cover Sizes", description: "TV Show Cover Size" },
      { key: "posterSizeMovies", value: posterSizeMovies, category: "Cover Sizes", description: "Movie Cover Size" },
      { key: "posterSizeBooks", value: posterSizeBooks, category: "Cover Sizes", description: "Book Cover Size" },
      { key: "bookHeightMultiplier", value: bookHeightMultiplier, category: "Cover Sizes", description: "Book Height Multiplier" },
      { key: "tight", value: tight, category: "Spacing", description: "Tight spacing between items" },
      { key: "caseInsetTopPx", value: caseInsetTopPx, category: "TV Insets", description: "TV Case Top Inset (px)" },
      { key: "caseInsetRightPx", value: caseInsetRightPx, category: "TV Insets", description: "TV Case Right Inset (px)" },
      { key: "caseInsetBottomPx", value: caseInsetBottomPx, category: "TV Insets", description: "TV Case Bottom Inset (px)" },
      { key: "caseInsetLeftPx", value: caseInsetLeftPx, category: "TV Insets", description: "TV Case Left Inset (px)" },
      { key: "bookInsetTopPx", value: bookInsetTopPx, category: "Book Insets", description: "Book Top Inset (px)" },
      { key: "bookInsetRightPx", value: bookInsetRightPx, category: "Book Insets", description: "Book Right Inset (px)" },
      { key: "bookInsetBottomPx", value: bookInsetBottomPx, category: "Book Insets", description: "Book Bottom Inset (px)" },
      { key: "bookInsetLeftPx", value: bookInsetLeftPx, category: "Book Insets", description: "Book Left Inset (px)" },
      { key: "movieInsetTopPx", value: movieInsetTopPx, category: "Movie Insets", description: "Movie Top Inset (px)" },
      { key: "movieInsetRightPx", value: movieInsetRightPx, category: "Movie Insets", description: "Movie Right Inset (px)" },
      { key: "movieInsetBottomPx", value: movieInsetBottomPx, category: "Movie Insets", description: "Movie Bottom Inset (px)" },
      { key: "movieInsetLeftPx", value: movieInsetLeftPx, category: "Movie Insets", description: "Movie Left Inset (px)" },
      { key: "posterSizeGames", value: posterSizeGames, category: "Cover Sizes", description: "Game Cover Size" },
      { key: "gameInsetTopPx", value: gameInsetTopPx, category: "Game Insets", description: "Game Top Inset (px)" },
      { key: "gameInsetRightPx", value: gameInsetRightPx, category: "Game Insets", description: "Game Right Inset (px)" },
      { key: "gameInsetBottomPx", value: gameInsetBottomPx, category: "Game Insets", description: "Game Bottom Inset (px)" },
      { key: "gameInsetLeftPx", value: gameInsetLeftPx, category: "Game Insets", description: "Game Left Inset (px)" },
      { key: "logoSize", value: logoSize, category: "Logo Settings", description: "Logo Size (px)" },
      { key: "logoTop", value: logoTop, category: "Logo Settings", description: "Logo Top Position" },
      { key: "logoLeft", value: logoLeft, category: "Logo Settings", description: "Logo Left Position" },
      { key: "syncIconSize", value: syncIconSize, category: "Sync Icon", description: "Sync Icon Size (px)" },
      { key: "syncIconTop", value: syncIconTop, category: "Sync Icon", description: "Sync Icon Top Position" },
    ];
    
    try {
      for (const setting of settings) {
        await fetch(settingsWriteUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(setting),
        });
      }
      setSyncState("ok");
      setSyncMsg("Settings saved!");
      setTimeout(() => {
        setSyncMsg("Synced");
      }, 2000);
    } catch (e) {
      console.error("Failed to save settings:", e);
      setSyncState("error");
      setSyncMsg("Save failed");
    }
  };

  // Wrapper functions that update state AND save to spreadsheet
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
  const updateGameInsetTopPx = (value: number) => {
    setGameInsetTopPx(value);
    saveSetting("gameInsetTopPx", value, "Game Insets", "Game Top Inset (px)");
  };
  const updateGameInsetRightPx = (value: number) => {
    setGameInsetRightPx(value);
    saveSetting("gameInsetRightPx", value, "Game Insets", "Game Right Inset (px)");
  };
  const updateGameInsetBottomPx = (value: number) => {
    setGameInsetBottomPx(value);
    saveSetting("gameInsetBottomPx", value, "Game Insets", "Game Bottom Inset (px)");
  };
  const updateGameInsetLeftPx = (value: number) => {
    setGameInsetLeftPx(value);
    saveSetting("gameInsetLeftPx", value, "Game Insets", "Game Left Inset (px)");
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

  const allShows = useMemo(() => {
    return tvRows.map(rowToShow).filter(Boolean) as Show[];
  }, [tvRows]);

  const allBooks = useMemo(() => {
    return bookRows.map(rowToBook).filter(Boolean) as Book[];
  }, [bookRows]);

  const allMovies = useMemo(() => {
    return movieRows.map(rowToMovie).filter(Boolean) as Movie[];
  }, [movieRows]);

  const allGames = useMemo(() => {
    return gameRows.map(rowToGame).filter(Boolean) as Game[];
  }, [gameRows]);

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

  // (Placeholder logic) keep it simple for now
  const shows = useMemo(() => {
    const q = safeStr(query).toLowerCase();
    if (nav === "books") {
      const filtered = q ? allBooks.filter((b) => b.title.toLowerCase().includes(q)) : allBooks;
      return [...filtered]
        .map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" }))
        .sort((a, b) => {
          const aTime = a.releaseDate ? Date.parse(a.releaseDate) : NaN;
          const bTime = b.releaseDate ? Date.parse(b.releaseDate) : NaN;
          if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
          if (Number.isNaN(aTime)) return 1;
          if (Number.isNaN(bTime)) return -1;
          return bTime - aTime;
        }) as any[];
    }

    // Home: combine books + TV + movies + games and sort by releaseDate or lastAirDate (descending)
    // Filter out Wishlist items - only show owned items
    if (nav === "home") {
      const qb = q ? allBooks.filter((b) => b.title.toLowerCase().includes(q)) : allBooks;
      const qs = q ? allShows.filter((s) => s.title.toLowerCase().includes(q) && normalizeStatus(s.watchStatus) !== "wishlist") : allShows.filter((s) => normalizeStatus(s.watchStatus) !== "wishlist");
      const qm = q ? allMovies.filter((m) => m.title.toLowerCase().includes(q) && normalizeStatus(m.watchStatus) !== "wishlist") : allMovies.filter((m) => normalizeStatus(m.watchStatus) !== "wishlist");
      const qg = q ? allGames.filter((g) => g.title.toLowerCase().includes(q) && normalizeStatus(g.playStatus || g.gameStatus) !== "wishlist") : allGames.filter((g) => normalizeStatus(g.playStatus || g.gameStatus) !== "wishlist");

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      return combined.sort((a, b) => {
        const aTime = 
          a.__type === "book" ? (a.releaseDate ? Date.parse(a.releaseDate) : NaN) : 
          a.__type === "tv" ? (a.lastAirDate ? Date.parse(a.lastAirDate) : NaN) :
          a.__type === "game" ? (a.releaseDate ? Date.parse(a.releaseDate) : NaN) :
          (a.releaseDate ? Date.parse(a.releaseDate) : NaN);
        const bTime = 
          b.__type === "book" ? (b.releaseDate ? Date.parse(b.releaseDate) : NaN) :
          b.__type === "tv" ? (b.lastAirDate ? Date.parse(b.lastAirDate) : NaN) :
          b.__type === "game" ? (b.releaseDate ? Date.parse(b.releaseDate) : NaN) :
          (b.releaseDate ? Date.parse(b.releaseDate) : NaN);
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
      }) as any[];
    }

    // Movies path
    if (nav === "movies") {
      const filteredByQuery = q ? allMovies.filter((m) => safeStr(m.title).toLowerCase().includes(q)) : allMovies;
      return [...filteredByQuery].sort((a, b) => {
        const aTime = a.releaseDate ? Date.parse(a.releaseDate) : NaN;
        const bTime = b.releaseDate ? Date.parse(b.releaseDate) : NaN;
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
      }) as any[];
    }

    // Games path
    if (nav === "games") {
      const filteredByQuery = q ? allGames.filter((g) => safeStr(g.title).toLowerCase().includes(q)) : allGames;
      return [...filteredByQuery].sort((a, b) => {
        const aTime = a.releaseDate ? Date.parse(a.releaseDate) : NaN;
        const bTime = b.releaseDate ? Date.parse(b.releaseDate) : NaN;
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
      }) as any[];
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
      const qg = q 
        ? allGames.filter((g) => g.title.toLowerCase().includes(q) && safeStr(g.yearPlayed) === currentYear)
        : allGames.filter((g) => safeStr(g.yearPlayed) === currentYear);

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      return combined.sort((a, b) => {
        const aTime = 
          a.__type === "book" ? (a.releaseDate ? Date.parse(a.releaseDate) : NaN) : 
          a.__type === "tv" ? (a.lastAirDate ? Date.parse(a.lastAirDate) : NaN) :
          a.__type === "game" ? (a.releaseDate ? Date.parse(a.releaseDate) : NaN) :
          (a.releaseDate ? Date.parse(a.releaseDate) : NaN);
        const bTime = 
          b.__type === "book" ? (b.releaseDate ? Date.parse(b.releaseDate) : NaN) :
          b.__type === "tv" ? (b.lastAirDate ? Date.parse(b.lastAirDate) : NaN) :
          b.__type === "game" ? (b.releaseDate ? Date.parse(b.releaseDate) : NaN) :
          (b.releaseDate ? Date.parse(b.releaseDate) : NaN);
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
      }) as any[];
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
      const qg = q 
        ? allGames.filter((g) => g.title.toLowerCase().includes(q) && safeStr(g.yearPlayed) === yearStr)
        : allGames.filter((g) => safeStr(g.yearPlayed) === yearStr);

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
        ...qg.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      return combined.sort((a, b) => {
        const aTime = 
          a.__type === "book" ? (a.releaseDate ? Date.parse(a.releaseDate) : NaN) : 
          a.__type === "tv" ? (a.lastAirDate ? Date.parse(a.lastAirDate) : NaN) :
          a.__type === "game" ? (a.releaseDate ? Date.parse(a.releaseDate) : NaN) :
          (a.releaseDate ? Date.parse(a.releaseDate) : NaN);
        const bTime = 
          b.__type === "book" ? (b.releaseDate ? Date.parse(b.releaseDate) : NaN) :
          b.__type === "tv" ? (b.lastAirDate ? Date.parse(b.lastAirDate) : NaN) :
          b.__type === "game" ? (b.releaseDate ? Date.parse(b.releaseDate) : NaN) :
          (b.releaseDate ? Date.parse(b.releaseDate) : NaN);
        if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return bTime - aTime;
      }) as any[];
    }

    // TV default path
    const filteredByWatch = watchFilter
      ? allShows.filter((s) => normalizeStatus(s.watchStatus) === normalizeStatus(watchFilter))
      : allShows;
    const filteredByShow = showFilter
      ? filteredByWatch.filter((s) => normalizeStatus(s.showStatus) === normalizeStatus(showFilter))
      : filteredByWatch;
    const filteredByQuery = q ? filteredByShow.filter((s) => safeStr(s.title).toLowerCase().includes(q)) : filteredByShow;

    if (nav !== "tv") return filteredByQuery as any[];

    return [...filteredByQuery].sort((a, b) => {
      const aTime = a.lastAirDate ? Date.parse(a.lastAirDate) : NaN;
      const bTime = b.lastAirDate ? Date.parse(b.lastAirDate) : NaN;

      if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;
      return bTime - aTime;
    }) as any[];
  }, [allShows, allBooks, allMovies, allGames, watchFilter, showFilter, nav, query]);

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
    const usable = Math.max(0, stageWidth - SHELF_SIDE_PADDING * 2);
    return Math.max(1, Math.floor((usable + gap) / (size + gap)));
  }, [stageWidth, posterSizeTv, posterSizeMovies, posterSizeBooks, posterSizeGames, nav, gap]);

  const shelves = useMemo(() => {
    const out: any[][] = [];
    for (let i = 0; i < shows.length; i += postersPerShelf) {
      out.push(shows.slice(i, i + postersPerShelf));
    }

    const headerOffset = 140;
    const minShelves = Math.max(1, Math.ceil(Math.max(0, viewportH - headerOffset) / SHELF_HEIGHT));
    while (out.length < minShelves) out.push([]);

    return out;
  }, [shows, postersPerShelf, viewportH, SHELF_HEIGHT]);

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
            {/* Stats below */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr",
                columnGap: 12,
                rowGap: 6,
                padding: "8px 0 0 0",
                borderRadius: 0,
                background: "transparent",
                border: "none",
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
                width: "100%",
              }}
            >
              {[
                { label: "Movies", value: stats.movies },
                { label: "TV Shows", value: stats.tv },
                { label: "Books", value: stats.books },
                { label: "Games", value: stats.games },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color:
                        item.label === "Movies"
                          ? "#77829c"
                          : item.label === "TV Shows"
                          ? "#ac7542"
                          : item.label === "Books"
                          ? "#64663c"
                          : "#1A1A1A",
                      fontFamily: "Arial, Helvetica, sans-serif",
                      whiteSpace: "nowrap",
                      lineHeight: 1.15,
                      textAlign: "center",
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: "#8a4c4c",
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1.15,
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ padding: "10px 12px 0 12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                borderRadius: 16,
                border: "1px solid rgba(92, 60, 56, 0.2)",
                background: "linear-gradient(180deg, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 100%)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.4)",
                paddingLeft: "10px",
              }}
            >
              <span style={{ color: "#1b1b1b", fontSize: 13, marginRight: "6px" }}>🔍</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                style={{
                  flex: 1,
                  padding: "9px 10px",
                  border: "none",
                  background: "transparent",
                  color: "#1b1b1b",
                  fontSize: 13,
                  fontWeight: 500,
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            {/* Top actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            </div>

            {/* Library section */}
            <div style={{ padding: "0px 12px 0 12px", marginTop: "-6px", display: "flex", flexDirection: "column", gap: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
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
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: "400", fontSize: 13 }}>
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
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 11l9-8 9 8" />
                        <path d="M5 10v10h14V10" />
                      </svg>
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
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: "400", fontSize: 13 }}>
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
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 5h13a2 2 0 0 1 2 2v11H6a2 2 0 0 0-2 2V5z" />
                        <path d="M4 17h15" />
                      </svg>
                    </span>
                    Books
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>

                <button
                  onClick={() => {
                    setNav("movies");
                    setOpenSection((s) => (s === "movies" ? null : "movies"));
                  }}
                  className={`sideItem ${nav === "movies" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: "400", fontSize: 13 }}>
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
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="6" width="18" height="12" rx="2" />
                        <path d="M7 6v12M11 6v12M15 6v12M19 6v12" />
                      </svg>
                    </span>
                    Movies
                  </span>
                </button>

                <button
                  onClick={() => {
                    setWatchFilter(null);
                    setShowFilter(null);
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
                    gap: 10,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: "400", fontSize: 13 }}>
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
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <rect x="3" y="7" width="18" height="10" rx="2" />
                        <path d="M8 21h8M12 17v4" />
                      </svg>
                    </span>
                    TV Shows
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
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
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A" }}>Watch Status</span>
                      <span style={{ color: "#8A8A8A", fontWeight: 700, fontSize: 11 }}>+</span>
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
                              <span style={{ fontFamily: "Inter, sans-serif", color: "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 18,
                                  height: 16,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 10,
                                  lineHeight: "16px",
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
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
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A" }}>Show Status</span>
                      <span style={{ color: "#8A8A8A", fontWeight: 700, fontSize: 11 }}>+</span>
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
                              <span style={{ fontFamily: "Inter, sans-serif", color: "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 18,
                                  height: 16,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 10,
                                  lineHeight: "16px",
                                  textAlign: "center",
                                  background: active ? "rgba(140,58,58,0.25)" : "rgba(0,0,0,0.06)",
                                  color: "#333",
                                  border: "1px solid rgba(0,0,0,0.12)",
                                }}
                              >
                                {showCounts[status] ?? 0}
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
                    gap: 10,
                    borderBottom: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: "400", fontSize: 13 }}>
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
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="8" width="18" height="8" rx="4" />
                        <path d="M8 10v4M6 12h4M16 11h2M15 13h2" />
                      </svg>
                    </span>
                    Games
                  </span>
                </button>


              </div>
            </div>

            {/* SMART LISTS section */}
            <div style={{ padding: "0px 12px 0 12px", marginTop: "12px", display: "flex", flexDirection: "column", gap: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
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
                {/* Year submenu */}
                <button
                  onClick={() => setYearMenuOpen(!yearMenuOpen)}
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
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: "400", fontSize: 13 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: yearMenuOpen ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                    Year
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>
                    {yearMenuOpen ? "−" : "+"}
                  </span>
                </button>

                {yearMenuOpen && (
                  <div style={{ paddingLeft: 30, display: "flex", flexDirection: "column", gap: 0 }}>
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
                        padding: "8px 0",
                        fontSize: 12,
                      }}
                    >
                      <span style={{ fontWeight: "400" }}>{new Date().getFullYear()}</span>
                      <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                    </button>

                    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                      <button
                        onClick={() => setNav("year-previous")}
                        className={`sideItem ${nav === "year-previous" ? "active" : ""}`}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 8,
                          borderBottom: "1px solid rgba(0,0,0,0.06)",
                          padding: "8px 0",
                          fontSize: 12,
                        }}
                      >
                        <span style={{ fontWeight: "400" }}>Previous Year</span>
                        <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                      </button>

                      {nav === "year-previous" && (
                        <div style={{ paddingLeft: 16, paddingTop: 4, paddingBottom: 8 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                            Select Year:
                            <input
                              type="number"
                              min="1900"
                              max="2025"
                              value={selectedPreviousYear}
                              onChange={(e) => setSelectedPreviousYear(Number(e.target.value) || 2025)}
                              style={{ width: 80, fontSize: 11 }}
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* DISCOVER section */}
            <div style={{ padding: "0px 12px 0 12px", marginTop: "12px", display: "flex", flexDirection: "column", gap: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
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
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: "400", fontSize: 13 }}>
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
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 12h18M3 6h18M3 18h18" />
                      </svg>
                    </span>
                    Statistics
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>

                <button
                  onClick={() => setShowSettings(!showSettings)}
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
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontWeight: "400", fontSize: 13 }}>
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
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3" />
                        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-3v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-3h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h3v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21v3h-.1a1.7 1.7 0 0 0-1.5 1z" />
                      </svg>
                    </span>
                    Settings
                  </span>
                  <span style={{ color: "rgba(0,0,0,0.4)", fontSize: 15, fontWeight: 400 }}>›</span>
                </button>
              </div>
            </div>

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
                  </div>
                ) : null}

                {/* Frame Position */}
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
                  <span>FRAME POSITION</span>
                  <span>{settingsOpen.framePosition ? "−" : "+"}</span>
                </button>
                {settingsOpen.framePosition ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      <input type="checkbox" checked={tight} onChange={(e) => updateTight(e.target.checked)} />
                      Tight
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                      Top
                      <input
                        type="number"
                        value={caseInsetTopPx}
                        onChange={(e) => updateCaseInsetTopPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                      Right
                      <input
                        type="number"
                        value={caseInsetRightPx}
                        onChange={(e) => updateCaseInsetRightPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                      Bottom
                      <input
                        type="number"
                        value={caseInsetBottomPx}
                        onChange={(e) => updateCaseInsetBottomPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                      Left
                      <input
                        type="number"
                        value={caseInsetLeftPx}
                        onChange={(e) => updateCaseInsetLeftPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
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

                {/* Book Insets */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, bookInsets: !settingsOpen.bookInsets })}
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
                  <span>BOOK INSETS</span>
                  <span>{settingsOpen.bookInsets ? "−" : "+"}</span>
                </button>
                {settingsOpen.bookInsets ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, opacity: 0.85 }}>
                      Books Height
                      <input
                        type="range"
                        min={1.0}
                        max={2.0}
                        step={0.1}
                        value={bookHeightMultiplier}
                        onChange={(e) => updateBookHeightMultiplier(Number(e.target.value))}
                        style={{ flex: 1 }}
                      />
                      <span style={{ width: 28, textAlign: "right" }}>{bookHeightMultiplier.toFixed(1)}</span>
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Top
                      <input
                        type="number"
                        value={bookInsetTopPx}
                        onChange={(e) => updateBookInsetTopPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Right
                      <input
                        type="number"
                        value={bookInsetRightPx}
                        onChange={(e) => updateBookInsetRightPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Bottom
                      <input
                        type="number"
                        value={bookInsetBottomPx}
                        onChange={(e) => updateBookInsetBottomPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                      Left
                      <input
                        type="number"
                        value={bookInsetLeftPx}
                        onChange={(e) => updateBookInsetLeftPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                      Frame: {BOOK_SRC_W}×{BOOK_SRC_H}
                    </div>
                  </div>
                ) : null}

                {/* Movie Insets */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, movieInsets: !settingsOpen.movieInsets })}
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
                  <span>MOVIE INSETS</span>
                  <span>{settingsOpen.movieInsets ? "−" : "+"}</span>
                </button>
                {settingsOpen.movieInsets ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Top
                      <input
                        type="number"
                        value={movieInsetTopPx}
                        onChange={(e) => updateMovieInsetTopPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Right
                      <input
                        type="number"
                        value={movieInsetRightPx}
                        onChange={(e) => updateMovieInsetRightPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Bottom
                      <input
                        type="number"
                        value={movieInsetBottomPx}
                        onChange={(e) => updateMovieInsetBottomPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                      Left
                      <input
                        type="number"
                        value={movieInsetLeftPx}
                        onChange={(e) => updateMovieInsetLeftPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                      Frame: {MOVIE_SRC_W}×{MOVIE_SRC_H}
                    </div>
                  </div>
                ) : null}

                {/* Game Insets */}
                <button
                  onClick={() => setSettingsOpen({ ...settingsOpen, gameInsets: !settingsOpen.gameInsets })}
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
                  <span>GAME INSETS</span>
                  <span>{settingsOpen.gameInsets ? "−" : "+"}</span>
                </button>
                {settingsOpen.gameInsets ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 8 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Top
                      <input
                        type="number"
                        value={gameInsetTopPx}
                        onChange={(e) => updateGameInsetTopPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Right
                      <input
                        type="number"
                        value={gameInsetRightPx}
                        onChange={(e) => updateGameInsetRightPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                      Bottom
                      <input
                        type="number"
                        value={gameInsetBottomPx}
                        onChange={(e) => updateGameInsetBottomPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, opacity: 0.8 }}>
                      Left
                      <input
                        type="number"
                        value={gameInsetLeftPx}
                        onChange={(e) => updateGameInsetLeftPx(Number(e.target.value) || 0)}
                        style={{ width: 64 }}
                      />
                    </label>
                    <div style={{ fontSize: 11, opacity: 0.6 }}>
                      Frame: {GAME_SRC_W}×{GAME_SRC_H}
                    </div>
                  </div>
                ) : null}

                {/* Logo Size & Placement */}
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
                  <span>LOGO SIZE & PLACEMENT</span>
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

                {/* Synced Icon Size & Placement */}
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
                  <span>SYNC STATUS ICON SIZE & PLACEMENT</span>
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
        <main style={{ width: "100%", padding: "0 0 40px 0", boxSizing: "border-box" }}>
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
                    backgroundImage: `url(${SHELF_IMAGE})`,
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
                      const insetTopVal = isBook ? bookInsetTopPx : isMovie ? movieInsetTopPx : isGame ? gameInsetTopPx : caseInsetTopPx;
                      const insetRightVal = isBook ? bookInsetRightPx : isMovie ? movieInsetRightPx : isGame ? gameInsetRightPx : caseInsetRightPx;
                      const insetBottomVal = isBook ? bookInsetBottomPx : isMovie ? movieInsetBottomPx : isGame ? gameInsetBottomPx : caseInsetBottomPx;
                      const insetLeftVal = isBook ? bookInsetLeftPx : isMovie ? movieInsetLeftPx : isGame ? gameInsetLeftPx : caseInsetLeftPx;
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
                              background: "rgba(255,255,255,0.12)",
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
                            }}
                          />
                          </div>

                          {/* Case frame overlay */}
                          {!isGame && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={isBook ? BOOK_FRAME_IMAGE : isMovie ? MOVIE_FRAME_IMAGE : CASE_FRAME_IMAGE}
                              alt=""
                              style={{
                              position: "absolute",
                              inset: 0,
                              width: "100%",
                              height: "100%",
                              objectFit: "fill",
                              pointerEvents: "none",
                              userSelect: "none",
                            }}
                            draggable={false}
                          />
                          )}

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
          background: rgba(255,255,255,0.35);
          box-shadow: 0 8px 16px rgba(0,0,0,0.15);
          border-color: rgba(0,0,0,0.08);
          font-weight: 600;
          color: #555555;
        }
        .sideItem.primary { background: transparent; }
        .sideItem.primary.active { background: rgba(255,255,255,0.85); color: #1b1b1b; }
        .sideSubItem {
          width: 100%;
          padding: 5px 8px;
          border-radius: 8px;
          border: 1px solid rgba(0, 0, 0, 0.06);
          background: rgba(255, 255, 255, 0.6);
          color: #1b1b1b;
          font-size: 11.5px;
          font-weight: 600;
          cursor: pointer;
          transition: background 140ms ease, border-color 140ms ease;
        }
        .sideSubItem:hover {
          background: rgba(0, 0, 0, 0.05);
        }
        .sideSubItem.active {
          background: rgba(140, 58, 58, 0.18);
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
