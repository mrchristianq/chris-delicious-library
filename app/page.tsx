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

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Papa from "papaparse";
import { RolodexCounter } from "./components/RolodexCounter";
import { MediaModal } from "./components/MediaModal";

type Row = Record<string, string>;
type CoverCandidate = { label: string; url: string };
type MediaType = "book" | "movie" | "tv" | "game";
type QuickInsetMode = "insetPosition" | "overlayPosition" | "overlayScale" | "coverPosition" | "coverScale";

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


const APP_TITLE = "Chris’ Delicious Library";
const APP_VERSION = "4.1.2";
const VERSION_HISTORY = [
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
const SETTINGS_ENV_KEY = "NEXT_PUBLIC_SETTINGS_SHEET_CSV_URL";

// ✅ Put these in /public
const DEFAULT_SHELF_IMAGE = "/shelf-dark-walnut.png";
const DARK_WALNUT_TOP_HEADER_IMAGE = "/wood_beam_header_dark_walnut.png";
const CASE_FRAME_IMAGE = "/dvd-case-frame.png";
const MOVIE_FRAME_IMAGE = "/movie-frame.png";
const BOOK_FRAME_IMAGE = "/book-frame-overlay.png";
const GAME_FRAME_IMAGE = "/game-frame.png";
const APP_ICON = "/logo4.png";
const SHOW_HEADER_DEBUG_CONTROLS = false;

// Helper function to convert platform name to frame filename
function getPlatformFrameFilename(platform?: string): string {
  if (!platform || platform === "Default") {
    return GAME_FRAME_IMAGE;
  }
  const normalizedToken = safeStr(platform)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  const canonicalToken =
    normalizedToken === "ps5"
      ? "playstation5"
      : normalizedToken === "ps4"
        ? "playstation4"
        : normalizedToken === "ps3"
          ? "playstation3"
          : normalizedToken === "ps2"
            ? "playstation2"
            : normalizedToken === "xboxseriesxs"
              ? "xboxseriesx"
              : normalizedToken === "xboxseriesx|s"
                ? "xboxseriesx"
                : normalizedToken;

  const explicitSlugMap: Record<string, string> = {
    playstation5: "playstation-5",
    playstation4: "playstation-4",
    playstation3: "playstation-3",
    playstation2: "playstation-2",
    xboxseriesx: "xbox-series-x",
    xboxone: "xbox-one",
    xbox360: "xbox-360",
    epicgamesstore: "epic-games-store",
    windows11: "windows-11",
    steam: "steam",
    dreamcast: "dreamcast",
  };
  const mappedSlug = explicitSlugMap[canonicalToken];
  if (mappedSlug) return `/${mappedSlug}-frame.png`;
  // Unknown platforms should fall back immediately to the default frame
  // to avoid repeated 404 requests on every rerender.
  return GAME_FRAME_IMAGE;
}

function safeStr(v: unknown) {
  return (v ?? "").toString().trim();
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
  return `${type}:${normalizeTitleKey(item?.title || "")}`;
}

const BOOK_GENRE_CANONICAL = [
  "Mystery",
  "Thriller / Suspense",
  "Horror",
  "Science Fiction",
  "Fantasy",
  "Romance",
  "Historical Fiction",
  "Literary / Contemporary Fiction",
  "Humor / Comedy",
  "Adventure / Action",
  "Young Adult (YA)",
  "Children's",
  "Biography / Memoir",
  "History",
  "Self-Help",
  "Science / Popular Science",
  "Business",
  "True Crime",
  "Strategy Guide",
] as const;

function mapBookGenre(input: string): (typeof BOOK_GENRE_CANONICAL)[number] | null {
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
    watched: safeStr(r["Watched"]) || undefined,
    watchDate: safeStr(r["WatchDate"]) || undefined,
    tags: safeStr(r["Tags"]) || undefined,
    releaseDate: safeStr(r["ReleaseDate"]) || undefined,
    runtime: safeStr(r["Runtime"]) || undefined,
    watchStatus: safeStr(r["WatchStatus"]) || safeStr(r["Watched"]) || undefined,
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

type NavKey = "home" | "search" | "books" | "movies" | "tv" | "games" | "wishlist" | "watchlist" | "settings" | "year-this" | "year-previous";

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
  
  // In-memory cache for settings to avoid repeated localStorage parsing
  const settingsCacheRef = useRef<Record<string, string> | null>(null);
  
  // Debounce timers for inset adjustments to prevent render lag
  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

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
  const [settingsPopupOpen, setSettingsPopupOpen] = useState<boolean>(false);
  const [sortPopupOpen, setSortPopupOpen] = useState<boolean>(false);
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
  const [gamePlatformFilter, setGamePlatformFilter] = useState<string | null>(null);
  const [gameStatusFilter, setGameStatusFilter] = useState<string | null>(null);
  const [gameOwnershipFilter, setGameOwnershipFilter] = useState<string | null>(null);
  const [gameFormatFilter, setGameFormatFilter] = useState<string | null>(null);
  const [gameYearPlayedFilter, setGameYearPlayedFilter] = useState<string | null>(null);
  const [gameGenreFilter, setGameGenreFilter] = useState<string | null>(null);
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
  const [gamePlatformOpen, setGamePlatformOpen] = useState<boolean>(false);
  const [gameStatusOpen, setGameStatusOpen] = useState<boolean>(false);
  const [gameOwnershipOpen, setGameOwnershipOpen] = useState<boolean>(false);
  const [gameFormatOpen, setGameFormatOpen] = useState<boolean>(false);
  const [gameYearPlayedOpen, setGameYearPlayedOpen] = useState<boolean>(false);
  const [gameGenresOpen, setGameGenresOpen] = useState<boolean>(false);
  const [wishlistOpen, setWishlistOpen] = useState<boolean>(false);
  const [viewportH, setViewportH] = useState(0);

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
  }, []);

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
  
  // Sidebar theme
  const [sidebarTheme, setSidebarTheme] = useState<string>("winterGray");
  
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
      rolodexColor: "#b7c9ef",
      rolodexDigitColor: "#d7e4ff",
      rolodexLabelColor: "#dbe7ff",
      rolodexTileBg: "linear-gradient(180deg, rgba(30, 49, 82, 0.92) 0%, rgba(22, 36, 63, 0.92) 100%)",
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
  
  const [posterSizeGames, setPosterSizeGames] = useState<number>(108);
  
  const [showInsetGuide, setShowInsetGuide] = useState(false);


  // Modal state for cover popup
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState<any>(null);
  const [coverOverrides, setCoverOverrides] = useState<Record<string, string>>({});
  const [failedCoverUrls, setFailedCoverUrls] = useState<Record<string, string[]>>({});
  const [failedCoverAttempts, setFailedCoverAttempts] = useState<Record<string, Record<string, number>>>({});
  const [uploadingCoverForKey, setUploadingCoverForKey] = useState<string | null>(null);
  const [coverUploadError, setCoverUploadError] = useState<string | null>(null);
  const debugHeaderLayerRef = useRef<HTMLDivElement | null>(null);
  const debugHeaderReadoutRef = useRef<HTMLDivElement | null>(null);
  const debugHeaderOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const { ref: stageRef, width: stageWidth } = useElementWidth<HTMLDivElement>();

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

  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight || 0);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!settingsPopupOpen && !sortPopupOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSettingsPopupOpen(false);
        setSortPopupOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [settingsPopupOpen, sortPopupOpen]);

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
    if (!settingsRows.length) return;
    const fromSheet: Record<string, string> = {};
    settingsRows.forEach((r) => {
      const key = safeStr(r["Key"]);
      if (!key.startsWith("coverOverride:")) return;
      const mediaKey = key.slice("coverOverride:".length);
      const value = safeStr(r["Value"]);
      if (mediaKey && value) {
        fromSheet[mediaKey] = value;
      }
    });
    if (!Object.keys(fromSheet).length) return;
    setCoverOverrides((prev) => ({ ...fromSheet, ...prev }));
  }, [settingsRows]);

  useEffect(() => {
    if (!modalItem) return;
    setModalItem((prev: any) => (prev ? buildItemWithCoverSelection(prev, coverOverrides) : prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coverOverrides]);

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

  const postSheetWrite = async (url: string, payload: Record<string, unknown>, fallbackMessage: string) => {
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
  };

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
        NumberOfSeasons: safeStr(updates.numberOfSeasons),
        NumberOfEpisodes: safeStr(updates.numberOfEpisodes),
        WatchStatus: safeStr(updates.watchStatus),
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
        numberOfSeasons: safeStr(updates.numberOfSeasons),
        numberOfEpisodes: safeStr(updates.numberOfEpisodes),
        watchStatus: safeStr(updates.watchStatus),
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
        Poster: safeStr(updates.poster),
        MyRating: safeStr(updates.myRating),
        TMDB_Rating: safeStr(updates.tmdbRating),
        TMDB_ID: safeStr(updates.tmdbId),
        Watched: safeStr(updates.watched),
        WatchDate: safeStr(updates.watchDate),
        Tags: safeStr(updates.tags),
        ReleaseDate: safeStr(updates.releaseDate),
        Runtime: safeStr(updates.runtime),
        Status: safeStr(updates.status),
        Genres: safeStr(updates.genres),
        Overview: safeStr(updates.overview),
        PosterURL: safeStr(updates.posterUrl),
        BackdropURL: safeStr(updates.backdropUrl),
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
        poster: safeStr(updates.poster),
        myRating: safeStr(updates.myRating),
        tmdbRating: safeStr(updates.tmdbRating),
        tmdbId: safeStr(updates.tmdbId),
        watched: safeStr(updates.watched),
        watchDate: safeStr(updates.watchDate),
        tags: safeStr(updates.tags),
        tag: safeStr(updates.tags),
        releaseDate: safeStr(updates.releaseDate),
        runtime: safeStr(updates.runtime),
        status: safeStr(updates.status),
        movieStatus: safeStr(updates.status),
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

    const payload = {
      action: "updateGame",
      match: {
        igdbId: matchIgdbId,
        title: matchTitle,
      },
      updates: {
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
        Backlog: safeStr(updates.backlog),
        Completed: safeStr(updates.completed),
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
      },
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
      // Use in-memory cache if available, otherwise load from localStorage
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      
      const settingsCache = settingsCacheRef.current;
      if (settingsCache && settingsCache[key] !== undefined && settingsCache[key] !== "") {
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

  const saveSetting = (key: string, value: any, category: string = "", description: string = "") => {
    // Save to localStorage only - no auto-sync to Google Sheet
    // Use saveSettingToSheet() for manual Google Sheet syncs
    try {
      // Initialize cache from localStorage if not already loaded
      if (settingsCacheRef.current === null) {
        settingsCacheRef.current = JSON.parse(localStorage.getItem("cdlSettingsCache") || "{}");
      }
      
      // Update in-memory cache
      if (settingsCacheRef.current) {
        settingsCacheRef.current[key] = String(value);
        
        // Write to localStorage (this is the slow part, but only happens once per change)
        localStorage.setItem("cdlSettingsCache", JSON.stringify(settingsCacheRef.current));
      }
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
    
    // Load settings for any platforms found in settings
    settingsRows.forEach(row => {
      const key = safeStr(row["Key"]);
      const match = key.match(/^(.+)InsetTopPx$/);
      if (match && match[1] !== "Default") {
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
      if (overlayMatch && overlayMatch[1] !== "Default") {
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
      if (coverScaleMatch && coverScaleMatch[1] !== "Default") {
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
      if (coverOffsetMatch && coverOffsetMatch[1] !== "Default") {
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
    
    setSidebarTheme(getSetting("sidebarTheme", "winterGray"));
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
      { key: "sidebarTheme", value: sidebarTheme, category: "Themes", description: "Sidebar Theme" },
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
        
        setIconSize(getNum("iconSize", 16));
        setSidebarFontSize(getNum("sidebarFontSize", 13));
        setSidebarFontWeight(getStr("sidebarFontWeight", "400"));
        setSidebarGap(getNum("sidebarGap", 10));
        setSidebarHeaderFontSize(getNum("sidebarHeaderFontSize", 11));
        setSidebarHeaderFontWeight(getStr("sidebarHeaderFontWeight", "600"));
        setShelfTheme(getStr("shelfTheme", DEFAULT_SHELF_IMAGE));
        setSidebarTheme(getStr("sidebarTheme", "winterGray"));
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
  
  // Debounced update helper for number inputs (prevents render lag on rapid changes)
  const debouncedUpdate = useCallback((key: string, value: number, setter: (v: number) => void, category: string, description: string) => {
    // Clear existing timer for this key
    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }
    
    // Save to localStorage immediately (fast)
    saveSetting(key, value, category, description);
    
    // Debounce the state update (which triggers expensive re-renders)
    debounceTimers.current[key] = setTimeout(() => {
      setter(value);
      delete debounceTimers.current[key];
    }, 150); // 150ms delay feels instant but batches rapid changes
  }, []);
  
  const updateCaseInsetTopPx = (value: number) => {
    debouncedUpdate("caseInsetTopPx", value, setCaseInsetTopPx, "TV Insets", "TV Case Top Inset (px)");
  };
  const updateCaseInsetRightPx = (value: number) => {
    debouncedUpdate("caseInsetRightPx", value, setCaseInsetRightPx, "TV Insets", "TV Case Right Inset (px)");
  };
  const updateCaseInsetBottomPx = (value: number) => {
    debouncedUpdate("caseInsetBottomPx", value, setCaseInsetBottomPx, "TV Insets", "TV Case Bottom Inset (px)");
  };
  const updateCaseInsetLeftPx = (value: number) => {
    debouncedUpdate("caseInsetLeftPx", value, setCaseInsetLeftPx, "TV Insets", "TV Case Left Inset (px)");
  };
  const updateBookInsetTopPx = (value: number) => {
    debouncedUpdate("bookInsetTopPx", value, setBookInsetTopPx, "Book Insets", "Book Top Inset (px)");
  };
  const updateBookInsetRightPx = (value: number) => {
    debouncedUpdate("bookInsetRightPx", value, setBookInsetRightPx, "Book Insets", "Book Right Inset (px)");
  };
  const updateBookInsetBottomPx = (value: number) => {
    debouncedUpdate("bookInsetBottomPx", value, setBookInsetBottomPx, "Book Insets", "Book Bottom Inset (px)");
  };
  const updateBookInsetLeftPx = (value: number) => {
    debouncedUpdate("bookInsetLeftPx", value, setBookInsetLeftPx, "Book Insets", "Book Left Inset (px)");
  };
  const updateMovieInsetTopPx = (value: number) => {
    debouncedUpdate("movieInsetTopPx", value, setMovieInsetTopPx, "Movie Insets", "Movie Top Inset (px)");
  };
  const updateMovieInsetRightPx = (value: number) => {
    debouncedUpdate("movieInsetRightPx", value, setMovieInsetRightPx, "Movie Insets", "Movie Right Inset (px)");
  };
  const updateMovieInsetBottomPx = (value: number) => {
    debouncedUpdate("movieInsetBottomPx", value, setMovieInsetBottomPx, "Movie Insets", "Movie Bottom Inset (px)");
  };
  const updateMovieInsetLeftPx = (value: number) => {
    debouncedUpdate("movieInsetLeftPx", value, setMovieInsetLeftPx, "Movie Insets", "Movie Left Inset (px)");
  };
  const updatePosterSizeGames = (value: number) => {
    setPosterSizeGames(value);
    saveSetting("posterSizeGames", value, "Cover Sizes", "Game Cover Size");
  };
  const updateShelfTheme = (value: string) => {
    setShelfTheme(value);
    saveSetting("shelfTheme", value, "Themes", "Shelf Wood Type");
    const shelfThemeNames: Record<string, string> = {
      "/shelves-light-single2.png": "Default (Light Oak)",
      "/shelf-dark-walnut.png": "Dark Walnut",
      "/shelf-weathered-oak.png": "Weathered Oak",
      "/shelf-honey-oak.png": "Honey Oak",
      "/shelf-teak.png": "Teak",
    };
    setThemeSaveNotice(`Saved theme: ${shelfThemeNames[value] || "Shelf theme"}. This will be used next time.`);
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
  
  // Update platform-specific insets
  const updatePlatformInset = (platform: string, edge: 'top' | 'right' | 'bottom' | 'left', value: number) => {
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
  };
  
  // Update platform-specific overlay settings
  const updatePlatformOverlay = (platform: string, property: 'width' | 'height' | 'top' | 'left', value: number) => {
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
  };
  
  // Update platform-specific cover scale
  const updatePlatformCoverScale = (platform: string, axis: "x" | "y", value: number) => {
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
  };
  
  // Update platform-specific cover offset (crop position inside inset)
  const updatePlatformCoverOffset = (platform: string, axis: 'x' | 'y', value: number) => {
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
  const deduplicateGames = (games: Game[]): Game[] => {
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
  };

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
      ...Object.keys(platformInsets),
      ...Object.keys(platformOverlaySettings),
      ...Object.keys(platformCoverScale),
      ...Object.keys(platformCoverOffset),
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
  }, [allGames, customizedPlatforms, platformCoverOffset, platformCoverScale, platformInsets, platformOverlaySettings]);

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

  const quickInsetSnapshot = useMemo(() => {
    const tvInset = { top: caseInsetTopPx, right: caseInsetRightPx, bottom: caseInsetBottomPx, left: caseInsetLeftPx };
    const movieInset = { top: movieInsetTopPx, right: movieInsetRightPx, bottom: movieInsetBottomPx, left: movieInsetLeftPx };
    const bookInset = { top: bookInsetTopPx, right: bookInsetRightPx, bottom: bookInsetBottomPx, left: bookInsetLeftPx };
    const gameInset = platformInsets[quickTargetPlatformKey] || platformInsets["Default"] || { top: 5, right: 5, bottom: 5, left: 5 };
    const gameOverlay = platformOverlaySettings[quickTargetPlatformKey] || platformOverlaySettings["Default"] || { width: 100, height: 100, top: 0, left: 0 };
    const gameCoverOffset = platformCoverOffset[quickTargetPlatformKey] || platformCoverOffset["Default"] || { x: 0, y: 0 };
    const gameCoverScale = platformCoverScale[quickTargetPlatformKey] || platformCoverScale["Default"] || { x: 100, y: 100 };
    return {
      inset: quickTargetType === "tv" ? tvInset : quickTargetType === "movie" ? movieInset : quickTargetType === "book" ? bookInset : gameInset,
      overlay: gameOverlay,
      coverOffset: gameCoverOffset,
      coverScale: gameCoverScale,
      sourceWidth: quickTargetType === "tv" ? CASE_SRC_W : quickTargetType === "movie" ? MOVIE_SRC_W : quickTargetType === "book" ? BOOK_SRC_W : GAME_SRC_W,
      sourceHeight: quickTargetType === "tv" ? CASE_SRC_H : quickTargetType === "movie" ? MOVIE_SRC_H : quickTargetType === "book" ? BOOK_SRC_H : GAME_SRC_H,
    };
  }, [
    BOOK_SRC_H,
    BOOK_SRC_W,
    CASE_SRC_H,
    CASE_SRC_W,
    GAME_SRC_H,
    GAME_SRC_W,
    MOVIE_SRC_H,
    MOVIE_SRC_W,
    bookInsetBottomPx,
    bookInsetLeftPx,
    bookInsetRightPx,
    bookInsetTopPx,
    caseInsetBottomPx,
    caseInsetLeftPx,
    caseInsetRightPx,
    caseInsetTopPx,
    movieInsetBottomPx,
    movieInsetLeftPx,
    movieInsetRightPx,
    movieInsetTopPx,
    platformCoverOffset,
    platformCoverScale,
    platformInsets,
    platformOverlaySettings,
    quickTargetPlatformKey,
    quickTargetType,
  ]);

  useEffect(() => {
    if (quickTargetType !== "game" && quickInsetMode !== "insetPosition") {
      setQuickInsetMode("insetPosition");
    }
    if (quickTargetType === "game") {
      setSelectedPlatformForInsets(quickTargetPlatform);
    }
  }, [quickInsetMode, quickTargetPlatform, quickTargetType]);

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

      if (quickTargetType !== "game") return;

      if (quickInsetMode === "overlayPosition") {
        if (isUp) updatePlatformOverlay(quickTargetPlatform, "top", overlay.top - step);
        if (isDown) updatePlatformOverlay(quickTargetPlatform, "top", overlay.top + step);
        if (isLeft) updatePlatformOverlay(quickTargetPlatform, "left", overlay.left - step);
        if (isRight) updatePlatformOverlay(quickTargetPlatform, "left", overlay.left + step);
        return;
      }

      if (quickInsetMode === "overlayScale") {
        if (isUp) updatePlatformOverlay(quickTargetPlatform, "height", overlay.height + step);
        if (isDown) updatePlatformOverlay(quickTargetPlatform, "height", overlay.height - step);
        if (isLeft) updatePlatformOverlay(quickTargetPlatform, "width", overlay.width - step);
        if (isRight) updatePlatformOverlay(quickTargetPlatform, "width", overlay.width + step);
        return;
      }

      if (quickInsetMode === "coverPosition") {
        if (isUp) updatePlatformCoverOffset(quickTargetPlatform, "y", cover.y - step);
        if (isDown) updatePlatformCoverOffset(quickTargetPlatform, "y", cover.y + step);
        if (isLeft) updatePlatformCoverOffset(quickTargetPlatform, "x", cover.x - step);
        if (isRight) updatePlatformCoverOffset(quickTargetPlatform, "x", cover.x + step);
        return;
      }

      if (isLeft) updatePlatformCoverScale(quickTargetPlatform, "x", quickInsetSnapshot.coverScale.x - step);
      if (isRight) updatePlatformCoverScale(quickTargetPlatform, "x", quickInsetSnapshot.coverScale.x + step);
      if (isUp) updatePlatformCoverScale(quickTargetPlatform, "y", quickInsetSnapshot.coverScale.y + step);
      if (isDown) updatePlatformCoverScale(quickTargetPlatform, "y", quickInsetSnapshot.coverScale.y - step);
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

  const normalizeStatus = (value?: string) =>
    safeStr(value)
      .toLowerCase()
      .replace("cancelled", "canceled");

  const hasWishlistOwnership = (value?: string) => normalizeStatus(value) === "wishlist";
  const hasOwnedOwnership = (value?: string) => normalizeStatus(value) === "owned";

  const isMovieWatched = (movie: Movie) => {
    const status = normalizeStatus(movie.movieStatus || movie.status);
    const watched = normalizeStatus(movie.watchStatus || movie.watched);
    const watchedValues = new Set(["watched", "completed", "true", "yes", "1"]);
    return watchedValues.has(watched) || watchedValues.has(status);
  };

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
      const hasBookFilters = Boolean(readingStatusFilter || formatFilter || seriesFilter || genreFilter || wishlistFilter);
      const bookBase = hasBookFilters ? allBooks : allBooks.filter((b) => hasOwnedOwnership(b.ownership));
      let filtered = q ? bookBase.filter((b) => b.title.toLowerCase().includes(q)) : bookBase;
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
      const qbBase = allBooks.filter((b) => hasOwnedOwnership(b.ownership));
      const qgBase = allGames.filter((g) => hasOwnedOwnership(g.ownership));
      const qb = q ? qbBase.filter((b) => b.title.toLowerCase().includes(q)) : qbBase;
      const qs = q ? allShows.filter((s) => s.title.toLowerCase().includes(q) && normalizeStatus(s.watchStatus) !== "wishlist") : allShows.filter((s) => normalizeStatus(s.watchStatus) !== "wishlist");
      const qm = q ? allMovies.filter((m) => m.title.toLowerCase().includes(q) && normalizeStatus(m.watchStatus) !== "wishlist") : allMovies.filter((m) => normalizeStatus(m.watchStatus) !== "wishlist");
      const qg = q ? qgBase.filter((g) => g.title.toLowerCase().includes(q)) : qgBase;
      
      // Deduplicate games by title - keep only primary platform version
      const deduplicatedGames = deduplicateGames(qg);

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
        ...deduplicatedGames.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" }) | (Movie & { __type: "movie" }) | (Game & { __type: "game" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    // Wishlist: books and games only
    if (nav === "wishlist") {
      const qb = allBooks.filter((b) => hasWishlistOwnership(b.ownership));
      const qg = allGames.filter((g) => hasWishlistOwnership(g.ownership));
      const deduplicatedGames = deduplicateGames(qg);

      const queryFilteredBooks = q ? qb.filter((b) => b.title.toLowerCase().includes(q)) : qb;
      const queryFilteredGames = q ? deduplicatedGames.filter((g) => g.title.toLowerCase().includes(q)) : deduplicatedGames;

      const combined = [
        ...queryFilteredBooks.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...queryFilteredGames.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
      ] as Array<(Book & { __type: "book" }) | (Game & { __type: "game" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    // Watchlist: movies not watched + TV not completed/abandoned
    if (nav === "watchlist") {
      const qs = allShows.filter((s) => {
        const status = normalizeStatus(s.watchStatus);
        return status !== "completed" && status !== "abandoned";
      });
      const qm = allMovies.filter((m) => !isMovieWatched(m));

      const queryFilteredShows = q ? qs.filter((s) => s.title.toLowerCase().includes(q)) : qs;
      const queryFilteredMovies = q ? qm.filter((m) => m.title.toLowerCase().includes(q)) : qm;

      const combined = [
        ...queryFilteredShows.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...queryFilteredMovies.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
      ] as Array<(Show & { __type: "tv" }) | (Movie & { __type: "movie" })>;

      const sorted = applySorting(combined, sortField, sortOrder);
      return sorted as any[];
    }

    // Movies path
    if (nav === "movies") {
      let filtered = allMovies;
      
      // Apply watch status filter if set
      if (movieWatchFilter) {
        filtered = filtered.filter((m) => (movieWatchFilter === "Watched" ? isMovieWatched(m) : !isMovieWatched(m)));
      } else {
        // Default Movies view: watched-only. Unwatched items live in Watchlist unless specifically filtered.
        filtered = filtered.filter((m) => isMovieWatched(m));
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
      const hasGameFilters = Boolean(
        gamePlatformFilter || gameStatusFilter || gameOwnershipFilter || gameFormatFilter || gameYearPlayedFilter || gameGenreFilter
      );
      let filtered = hasGameFilters ? allGames : allGames.filter((g) => hasOwnedOwnership(g.ownership));

      if (gamePlatformFilter) {
        filtered = filtered.filter((g) => {
          const values = safeStr(g.platform)
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          return values.includes(gamePlatformFilter);
        });
      }

      if (gameStatusFilter) {
        filtered = filtered.filter((g) => safeStr(g.status || g.playStatus || g.gameStatus) === gameStatusFilter);
      }

      if (gameOwnershipFilter) {
        filtered = filtered.filter((g) => safeStr(g.ownership) === gameOwnershipFilter);
      }

      if (gameFormatFilter) {
        filtered = filtered.filter((g) => {
          const values = safeStr(g.format)
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          return values.includes(gameFormatFilter);
        });
      }

      if (gameYearPlayedFilter) {
        filtered = filtered.filter((g) => safeStr(g.yearPlayed) === gameYearPlayedFilter);
      }

      if (gameGenreFilter) {
        filtered = filtered.filter((g) => {
          const values = safeStr(g.genres)
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
          return values.includes(gameGenreFilter);
        });
      }

      const filteredByQuery = q ? filtered.filter((g) => safeStr(g.title).toLowerCase().includes(q)) : filtered;
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
      const qg = q 
        ? allGames.filter((g) => g.title.toLowerCase().includes(q) && safeStr(g.yearPlayed) === currentYear)
        : allGames.filter((g) => safeStr(g.yearPlayed) === currentYear);
      
      // Deduplicate games by title - keep only primary platform version
      const deduplicatedGames = deduplicateGames(qg);

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
        ...qm.map((m) => ({ ...m, __type: "movie" } as Movie & { __type: "movie" })),
        ...deduplicatedGames.map((g) => ({ ...g, __type: "game" } as Game & { __type: "game" })),
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
    const hasTvFilters = Boolean(watchFilter || showFilter || tagFilter);
    const tvBase = hasTvFilters ? allShows : allShows.filter((s) => normalizeStatus(s.watchStatus) !== "backlog");
    const filteredByWatch = watchFilter
      ? tvBase.filter((s) => normalizeStatus(s.watchStatus) === normalizeStatus(watchFilter))
      : tvBase;
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
  }, [allShows, allBooks, allMovies, allGames, watchFilter, showFilter, tagFilter, movieWatchFilter, movieGenreFilter, readingStatusFilter, formatFilter, seriesFilter, genreFilter, wishlistFilter, gamePlatformFilter, gameStatusFilter, gameOwnershipFilter, gameFormatFilter, gameYearPlayedFilter, gameGenreFilter, nav, query, sortField, sortOrder]);

  const stats = useMemo(() => {
    const wishlistBooks = allBooks.filter((b) => hasWishlistOwnership(b.ownership)).length;
    const wishlistGames = deduplicateGames(allGames.filter((g) => hasWishlistOwnership(g.ownership))).length;
    const watchlistShows = allShows.filter((s) => {
      const status = normalizeStatus(s.watchStatus);
      return status !== "completed" && status !== "abandoned";
    }).length;
    const watchlistMovies = allMovies.filter((m) => !isMovieWatched(m)).length;

    return {
      movies: allMovies.filter((m) => isMovieWatched(m)).length,
      tv: allShows.filter((s) => normalizeStatus(s.watchStatus) !== "backlog").length,
      books: allBooks.filter((b) => hasOwnedOwnership(b.ownership)).length,
      games: allGames.filter((g) => hasOwnedOwnership(g.ownership)).length,
      wishlist: wishlistBooks + wishlistGames,
      watchlist: watchlistShows + watchlistMovies,
    };
  }, [allShows, allBooks, allMovies, allGames]);

  const postersPerShelf = useMemo(() => {
    const size = nav === "books" ? posterSizeBooks : nav === "movies" ? posterSizeMovies : nav === "games" ? posterSizeGames : posterSizeTv;
    const usable = Math.max(0, stageWidth - SHELF_SIDE_PADDING * 2);
    return Math.max(1, Math.floor((usable + gap) / (size + gap)));
  }, [stageWidth, posterSizeTv, posterSizeMovies, posterSizeBooks, posterSizeGames, nav, gap]);

  const shelves = useMemo(() => {
    const usable = Math.max(0, stageWidth - SHELF_SIDE_PADDING * 2);
    const out: any[][] = [];
    
    // For mixed-item views, calculate shelf distribution based on actual item sizes
    if (nav === "home" || nav === "wishlist" || nav === "watchlist") {
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
    <div style={{ minHeight: "100vh", background: "#f4f1ea", color: "#111", position: "relative" }}>
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: 45,
          zIndex: 1300,
          pointerEvents: "none",
          backgroundImage: `url(${DARK_WALNUT_TOP_HEADER_IMAGE})`,
          backgroundRepeat: "repeat-x",
          backgroundPosition: "0 0",
          backgroundSize: "auto 45px",
          boxShadow: "inset 0 16px 24px rgba(0, 0, 0, 0.42)",
        }}
      />
      {/* Main layout: Sidebar + Content */}
      <div
        style={{
          position: "relative",
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
            zIndex: settingsPopupOpen ? 6000 : 1400,
            alignSelf: "start",
            height: "100vh",
            minHeight: "100vh",
            borderRadius: "0 0 0 0",
            isolation: "isolate",
            overflowY: "auto",
            overflowX: "hidden",
            background: "transparent",
            border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
            borderTop: "none",
            borderLeft: "none",
            borderRight: "none",
            boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
            padding: "6px",
          }}
        >
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 45,
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
              backgroundImage: `url(${DARK_WALNUT_TOP_HEADER_IMAGE})`,
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
              clipPath: "inset(1px 0 0 0 round 16px)",
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
              boxShadow: "0 8px 18px rgba(0, 0, 0, 0.42), 0 3px 8px rgba(0, 0, 0, 0.28)",
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
                labelColor={currentTheme.rolodexLabelColor}
                commaColor={currentTheme.rolodexColor}
                digitNumberColor={currentTheme.rolodexDigitColor}
                digitTileBackground={currentTheme.rolodexTileBg}
                digitTileBorder={currentTheme.rolodexTileBorder}
              />
            </div>
          )}

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
                        width: 20,
                        height: 18,
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
                        height: 18,
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
                        width: 48,
                        height: 24,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Reading Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Formats</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Series</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Categories</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{genreOpen ? "−" : "+"}</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Wishlist</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{wishlistOpen ? "−" : "+"}</span>
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
                              minWidth: 20,
                              height: 18,
                              padding: "0 6px",
                              borderRadius: 10,
                              fontSize: 11,
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
                        width: 20,
                        height: 18,
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
                        width: 48,
                        height: 24,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Watch Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{movieWatchStatusOpen ? "−" : "+"}</span>
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
                              <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(230, 242, 255, 0.97)" : "rgba(0,0,0,0.7)" }}>
                                {status}
                              </span>
                              <span
                                style={{
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Genre</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{movieGenreOpen ? "−" : "+"}</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                        width: 20,
                        height: 18,
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
                        width: 48,
                        height: 24,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Watch Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Show Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>+</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Tags</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{tagOpen ? "−" : "+"}</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                        width: 20,
                        height: 18,
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
                        width: 48,
                        height: 24,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Platform</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{gamePlatformOpen ? "−" : "+"}</span>
                    </button>
                    {gamePlatformOpen ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Status</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{gameStatusOpen ? "−" : "+"}</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Ownership</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{gameOwnershipOpen ? "−" : "+"}</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Format</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{gameFormatOpen ? "−" : "+"}</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Year Played</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{gameYearPlayedOpen ? "−" : "+"}</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                      <span style={{ fontSize: 13, fontWeight: 700, color: sidebarTheme === "darkBlue" ? "rgba(233, 245, 255, 0.98)" : "#4A4A4A", fontFamily: "Nunito, sans-serif" }}>Genres</span>
                      <span style={{ color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A", fontWeight: 600, fontSize: 14, fontFamily: "Nunito, sans-serif" }}>{gameGenresOpen ? "−" : "+"}</span>
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
                                  minWidth: 20,
                                  height: 18,
                                  padding: "0 6px",
                                  borderRadius: 10,
                                  fontSize: 11,
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
                        width: 20,
                        height: 18,
                        borderRadius: 4,
                        background: nav === "wishlist" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-wishlist.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    Wishlist
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 48,
                        height: 24,
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

                <button
                  onClick={() => {
                    setNav("watchlist");
                    setOpenSection((s) => (s === "watchlist" ? null : "watchlist"));
                  }}
                  className={`sideItem ${nav === "watchlist" ? "active" : ""}`}
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
                  <span style={{ display: "flex", alignItems: "center", gap: sidebarGap, fontWeight: nav === "watchlist" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight, fontSize: sidebarFontSize }}>
                    <span
                      aria-hidden
                      style={{
                        width: 20,
                        height: 18,
                        borderRadius: 4,
                        background: nav === "watchlist" ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-watchlist.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
                    </span>
                    Watchlist
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        width: 48,
                        height: 24,
                        borderRadius: 999,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: sidebarFontSize,
                        fontWeight: nav === "watchlist" ? Math.min(Number(sidebarFontWeight) + 200, 900) : sidebarFontWeight,
                        background:
                          sidebarTheme === "darkBlue"
                            ? "rgba(56, 142, 173, 0.95)"
                            : sidebarTheme === "winterGray"
                              ? currentTheme.countBubbleColor
                              : "#333",
                        color: "#fff",
                      }}
                    >
                      {stats.watchlist}
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
                  color: currentTheme.primaryColor,
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
                        height: 18,
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
                        height: 18,
                        borderRadius: 4,
                        background: otherMenuOpen ? "rgba(0,0,0,0.05)" : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flex: "0 0 auto",
                        overflow: "visible",
                      }}
                    >
                      <img src="/icon-other.png" alt="" width={iconSize} height={iconSize} style={{ display: "block", background: "transparent", maxWidth: "none", maxHeight: "none" }} />
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
                        color: sidebarTheme === "darkBlue" ? "rgba(221, 236, 255, 0.95)" : "#4A4A4A",
                        background: nav === "year-previous" ? currentTheme.activeHighlight : "transparent",
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
                  color: currentTheme.primaryColor,
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
                        height: 18,
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
                        height: 18,
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
                    const nextOpen = !showSettings;
                    setShowSettings(nextOpen);
                    if (!nextOpen) setSettingsPopupOpen(false);
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
                        height: 18,
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
                {themeSaveNotice ? (
                  <div
                    style={{
                      fontSize: 10,
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
                <div style={{ fontSize: 10, color: "rgba(0,0,0,0.68)" }}>
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
                    onClick={() => updateShelfTheme("/shelf-weathered-oak.png")}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "8px 12px",
                      border: shelfTheme === "/shelf-weathered-oak.png" ? `2px solid ${currentTheme.primaryColor}` : "1px solid rgba(0,0,0,0.1)",
                      borderRadius: 8,
                      background: shelfTheme === "/shelf-weathered-oak.png" ? `${currentTheme.primaryColor}1A` : "rgba(255,255,255,0.5)",
                      cursor: "pointer",
                      fontSize: 11,
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
                </div>
              </div>
            ) : null}

            {showSettings || settingsPopupOpen ? (
              <div
                style={
                  settingsPopupOpen
                    ? {
                        position: "fixed",
                        top: 84,
                        right: 20,
                        width: "min(560px, calc(100vw - 40px))",
                        maxHeight: "calc(100vh - 110px)",
                        overflowY: "auto",
                        zIndex: 5000,
                        padding: 14,
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        background: "rgba(248, 244, 236, 0.98)",
                        border: "1px solid rgba(58, 37, 24, 0.38)",
                        borderRadius: 14,
                        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.35)",
                        backdropFilter: "blur(2px)",
                      }
                    : { padding: 12, display: "flex", flexDirection: "column", gap: 6 }
                }
              >
                {settingsPopupOpen ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 4,
                      paddingBottom: 8,
                      borderBottom: "1px solid rgba(0,0,0,0.12)",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 800, color: "#5c3c38" }}>Settings</span>
                    <button
                      onClick={() => setSettingsPopupOpen(false)}
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
                ) : null}
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
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, fontWeight: 700, color: "#7f7f7f" }}>
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
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 10, fontWeight: 700, color: "#7f7f7f" }}>
                        MODE
                        <select
                          value={quickInsetMode}
                          onChange={(e) => setQuickInsetMode(e.target.value as QuickInsetMode)}
                          style={{ padding: "7px 8px", fontSize: 11, borderRadius: 6, border: "1px solid rgba(0,0,0,0.15)" }}
                        >
                          {(quickTargetType === "game"
                            ? [
                                { value: "insetPosition", label: "Inset Position" },
                                { value: "overlayPosition", label: "Overlay Position" },
                                { value: "overlayScale", label: "Overlay Scale" },
                                { value: "coverPosition", label: "Cover Position" },
                                { value: "coverScale", label: "Cover Scale" },
                              ]
                            : [{ value: "insetPosition", label: "Inset Position" }]
                          ).map((option) => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </label>
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
                          if (quickTargetType !== "game" || quickInsetMode !== "overlayPosition") return;
                          quickOverlayDragRef.current = {
                            x: e.clientX,
                            y: e.clientY,
                            top: quickInsetSnapshot.overlay.top,
                            left: quickInsetSnapshot.overlay.left,
                          };
                        }}
                        onMouseMove={(e) => {
                          const drag = quickOverlayDragRef.current;
                          if (!drag || quickTargetType !== "game" || quickInsetMode !== "overlayPosition") return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const dxPct = ((e.clientX - drag.x) / rect.width) * 100;
                          const dyPct = ((e.clientY - drag.y) / rect.height) * 100;
                          updatePlatformOverlay(quickTargetPlatform, "left", Number((drag.left + dxPct).toFixed(2)));
                          updatePlatformOverlay(quickTargetPlatform, "top", Number((drag.top + dyPct).toFixed(2)));
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
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.2)",
                          background: "linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.03) 100%)",
                          overflow: "hidden",
                          cursor: quickTargetType === "game" && quickInsetMode === "overlayPosition" ? "move" : "default",
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
                        {quickTargetType === "game" ? (
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
                        ) : null}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "46px 46px 46px", gridTemplateRows: "46px 46px 46px", gap: 6, justifyContent: "center" }}>
                        <span />
                        <button onClick={() => applyQuickInsetNudge("up")} style={{ fontSize: 18, borderRadius: 8, border: "1px solid #bbb", background: "rgba(255,255,255,0.9)", cursor: "pointer" }}>↑</button>
                        <span />
                        <button onClick={() => applyQuickInsetNudge("left")} style={{ fontSize: 18, borderRadius: 8, border: "1px solid #bbb", background: "rgba(255,255,255,0.9)", cursor: "pointer" }}>←</button>
                        <div style={{ display: "grid", placeItems: "center", fontSize: 10, color: "#777", fontWeight: 700 }}>NUDGE</div>
                        <button onClick={() => applyQuickInsetNudge("right")} style={{ fontSize: 18, borderRadius: 8, border: "1px solid #bbb", background: "rgba(255,255,255,0.9)", cursor: "pointer" }}>→</button>
                        <span />
                        <button onClick={() => applyQuickInsetNudge("down")} style={{ fontSize: 18, borderRadius: 8, border: "1px solid #bbb", background: "rgba(255,255,255,0.9)", cursor: "pointer" }}>↓</button>
                        <span />
                      </div>
                    </div>

                    <div style={{ fontSize: 10, opacity: 0.75, padding: "6px 8px", borderRadius: 6, background: "rgba(0,0,0,0.05)" }}>
                      Insets T/R/B/L: {Math.round(quickInsetSnapshot.inset.top)} / {Math.round(quickInsetSnapshot.inset.right)} / {Math.round(quickInsetSnapshot.inset.bottom)} / {Math.round(quickInsetSnapshot.inset.left)}
                      {quickTargetType === "game" ? (
                        <span> · Overlay W/H/T/L: {quickInsetSnapshot.overlay.width.toFixed(1)} / {quickInsetSnapshot.overlay.height.toFixed(1)} / {quickInsetSnapshot.overlay.top.toFixed(1)} / {quickInsetSnapshot.overlay.left.toFixed(1)} · Cover W/H/X/Y: {quickInsetSnapshot.coverScale.x.toFixed(1)} / {quickInsetSnapshot.coverScale.y.toFixed(1)} / {quickInsetSnapshot.coverOffset.x.toFixed(1)} / {quickInsetSnapshot.coverOffset.y.toFixed(1)}</span>
                      ) : null}
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                      {quickInsetSaveStatus === "saving" ? <span style={{ fontSize: 10, color: "#555" }}>Saving inset settings...</span> : null}
                      {quickInsetSaveStatus === "saved" ? <span style={{ fontSize: 10, color: "#0a7f2e" }}>Saved. These inset settings will be used next time.</span> : null}
                      {quickInsetSaveStatus === "error" ? <span style={{ fontSize: 10, color: "#b42318" }}>Save failed</span> : null}
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
                  borderRadius: 10,
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
                  <div style={{ minWidth: 0, position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "nowrap", whiteSpace: "nowrap" }}>
                      <div style={{ color: currentTheme.syncedTextColor, fontSize: 14, fontWeight: 500, fontFamily: "Nunito, sans-serif" }}>
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
                      <button
                        onClick={() => setShowVersionNotes((prev) => !prev)}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "rgba(0,0,0,0.6)",
                          fontSize: 10,
                          fontWeight: 500,
                          whiteSpace: "nowrap",
                          padding: 0,
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                        title="Show recent version notes"
                      >
                        · v{APP_VERSION}
                      </button>
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
                    {showVersionNotes ? (
                      <div
                        style={{
                          position: "absolute",
                          top: "100%",
                          right: 0,
                          width: "min(280px, calc(100vw - 70px))",
                          zIndex: 30,
                          marginTop: 6,
                          borderRadius: 10,
                          border: "1px solid rgba(0,0,0,0.14)",
                          background: "rgba(249, 245, 236, 0.97)",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
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
                            <ul style={{ margin: "4px 0 0 16px", padding: 0, fontSize: 10, lineHeight: 1.35, color: "#4b3c31" }}>
                              {entry.notes.map((note) => (
                                <li key={note}>{note}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
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
          <div
            aria-hidden
            style={{
              position: "fixed",
              top: 0,
              left: 320,
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
          {SHOW_HEADER_DEBUG_CONTROLS ? (
            <div
              style={{
                position: "fixed",
                right: 20,
                bottom: 20,
                zIndex: 9000,
                background: "rgba(20, 20, 20, 0.88)",
                color: "#fff",
                borderRadius: 10,
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
                borderRadius: 10,
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
                border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
                borderRadius: 10,
                padding: 14,
                fontWeight: 700,
                marginBottom: 16,
              }}
            >
              Loading…
            </div>
          ) : null}

          {settingsPopupOpen || sortPopupOpen ? (
            <button
              aria-label="Close popup"
              onClick={() => {
                setSettingsPopupOpen(false);
                setSortPopupOpen(false);
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 4000,
                border: "none",
                margin: 0,
                padding: 0,
                background: "rgba(0, 0, 0, 0.28)",
                cursor: "pointer",
              }}
            />
          ) : null}

          {sortPopupOpen ? (
            <div
              style={{
                position: "fixed",
                top: 84,
                right: 74,
                width: "min(320px, calc(100vw - 40px))",
                zIndex: 5000,
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
                  onChange={(e) => setSortField(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: 10,
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
                      <option value="MyRatingSort">My Rating</option>
                      <option value="ExternalRatingSort">User Rating</option>
                    </>
                  )}
                  {(nav === "home" || nav === "wishlist" || nav === "watchlist" || nav === "year-this" || nav === "year-previous") && (
                    <>
                      <option value="Title">Title</option>
                      <option value="ReleaseDate">Release Date</option>
                    </>
                  )}
                </select>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11, fontWeight: 700, color: "#8A8A8A" }}>
                ORDER
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as "Asc" | "Desc")}
                  style={{
                    width: "100%",
                    padding: "9px 10px",
                    borderRadius: 10,
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

          {/* Stage measures width so shelves always align */}
          <div ref={stageRef} style={{ width: "100%" }}>
            {/* IMPORTANT: no vertical gap between shelves */}
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {shelfTheme === DEFAULT_SHELF_IMAGE ? (
                <div
                  style={{
                    position: "sticky",
                    top: 0,
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
                    <div style={{ display: "flex", alignItems: "center", gap: 5, width: "min(260px, calc(100% - 220px))" }}>
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
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Clear
                      </button>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
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
                      }}
                      title="Open sort options"
                      aria-label="Open sort options"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 24,
                        minWidth: 20,
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
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setSortPopupOpen(false);
                        setSettingsPopupOpen((prev) => !prev);
                      }}
                      title="Open settings"
                      aria-label="Open settings"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: 24,
                        minWidth: 20,
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
              ) : null}
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
                      const gamePlatform = isGame ? getRenderPlatform(gamePlatformRaw) : undefined;
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
                      
                      // Get overlay settings and cover scale for games
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
                      }
                      
                      const srcW = isBook ? BOOK_SRC_W : isMovie ? MOVIE_SRC_W : isGame ? GAME_SRC_W : CASE_SRC_W;
                      const srcH = isBook ? BOOK_SRC_H : isMovie ? MOVIE_SRC_H : isGame ? GAME_SRC_H : CASE_SRC_H;

                      const insetTop = Math.round((insetTopVal / srcH) * caseHeight);
                      const insetRight = Math.round((insetRightVal / srcW) * caseWidth);
                      const insetBottom = Math.round((insetBottomVal / srcH) * caseHeight);
                      const insetLeft = Math.round((insetLeftVal / srcW) * caseWidth);
                      const selectedCoverUrl = getDisplayCoverUrl(show);

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
                          onClick={() => {
                            setModalItem(buildItemWithCoverSelection(show, coverOverrides));
                            setModalOpen(true);
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
                                      objectFit: "cover",
                                      display: "block",
                                      transform: `translate(${coverOffsetX}%, ${coverOffsetY}%) scale(${coverScale.x / 100}, ${coverScale.y / 100})`,
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
                                    transform: `translate(${coverOffsetX}%, ${coverOffsetY}%) scale(${coverScale.x / 100}, ${coverScale.y / 100})`,
                                    transformOrigin: "center",
                                  }}
                                />
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
                                  src={getPlatformFrameFilename(gamePlatform)}
                                  onError={(e) => {
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
                                      display: "block",
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
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={isBook ? BOOK_FRAME_IMAGE : isMovie ? MOVIE_FRAME_IMAGE : CASE_FRAME_IMAGE}
                                alt=""
                                style={{
                                  position: "absolute",
                                  top: 0,
                                  left: 0,
                                  width: "100%",
                                  height: "100%",
                                  objectFit: "fill",
                                  pointerEvents: "none",
                                  userSelect: "none",
                                }}
                                draggable={false}
                              />
                            </>
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
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 10, fontSize: 11, opacity: 0.65 }}>
              View: {nav} · Shelves: {shelves.length} · {postersPerShelf} per shelf · lip offset {LIP_FROM_BOTTOM}px
            </div>
          </div>
        </main>
      </div>

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
        gamePlatformOptions={gamePlatformOptions}
        gameOwnershipOptions={gameOwnershipOptions}
        gameFormatOptions={gameFormatOptions}
        gameStatusOptions={gameStatusOptions}
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
          padding: 3px 12px;
          border-radius: 8px;
          border: 1px solid transparent;
          background: transparent;
          color: ${sidebarTheme === "darkBlue" ? "rgba(230, 239, 255, 0.92)" : "#2A2A2A"};
          font-size: 17px;
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
          padding: 5px 8px;
          border-radius: 8px;
          border: ${sidebarTheme === "darkBlue" ? "1px solid rgba(142, 178, 234, 0.42)" : "1px solid rgba(0, 0, 0, 0.06)"};
          background: ${sidebarTheme === "darkBlue" ? "rgba(19, 39, 72, 0.62)" : "rgba(255, 255, 255, 0.6)"};
          color: ${sidebarTheme === "darkBlue" ? "rgba(233, 243, 255, 0.98)" : "rgba(0, 0, 0, 0.7)"};
          font-size: 14px;
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
        borderRadius: 10,
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
          padding: "0 6px",
          borderRadius: 999,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 900,
          background: "rgba(0,0,0,0.08)",
          border: sidebarTheme === "darkBlue" ? "1px solid rgba(146, 181, 235, 0.45)" : "1px solid rgba(0,0,0,0.12)",
          color: "rgba(0,0,0,0.72)",
        }}
      >
        {count}
      </span>
    </button>
  );
}
