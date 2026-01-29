/* =====================================================================================
  Chris' Delicious Library
  Version: 1.1.0
   Notes:
   - Client-side CSV load from Google Sheets (published CSV)
   - Left sidebar menu (Delicious Library style)
   - 1 shelf image per row (no gaps between shelves)
   - Posters only (no title labels)
   - Posters align to shelf lip
   - DVD case frame overlay (no left border) + glossy black edge
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
};

type Book = {
  title: string;
  posterUrl: string;
  isbn?: string;
  releaseDate?: string;
};

const APP_TITLE = "Chris’ Delicious Library";
const ENV_KEY = "NEXT_PUBLIC_TV_SHEET_CSV_URL";
const BOOKS_ENV_KEY = "NEXT_PUBLIC_BOOKS_SHEET_CSV_URL";

// ✅ Put these in /public
const SHELF_IMAGE = "/shelves-light-single2.png";
const CASE_FRAME_IMAGE = "/dvd-case-frame.png";
const BOOK_FRAME_IMAGE = "/book-frame-overlay.png";
const APP_ICON = "/logo.png";

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

type NavKey = "home" | "search" | "books" | "movies" | "tv" | "games" | "settings";

export default function Page() {
  const tvCsvUrl = (process.env as any)[ENV_KEY] as string | undefined;
  const booksCsvUrl = (process.env as any)[BOOKS_ENV_KEY] as string | undefined;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tvRows, setTvRows] = useState<Row[]>([]);
  const [bookRows, setBookRows] = useState<Row[]>([]);
  const [syncState, setSyncState] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [syncMsg, setSyncMsg] = useState<string>("");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [query, setQuery] = useState("");

  // Sidebar nav
  const [nav, setNav] = useState<NavKey>("home");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [openSection, setOpenSection] = useState<NavKey | null>(null);

  // UI
  const [posterSizeTv, setPosterSizeTv] = useState<number>(100);
  const [posterSizeBooks, setPosterSizeBooks] = useState<number>(115);
  const [bookHeightMultiplier, setBookHeightMultiplier] = useState<number>(1.5);
  const [tight, setTight] = useState<boolean>(true);
  const [watchFilter, setWatchFilter] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState<string | null>(null);
  const [watchStatusOpen, setWatchStatusOpen] = useState<boolean>(false);
  const [showStatusOpen, setShowStatusOpen] = useState<boolean>(false);
  const [viewportH, setViewportH] = useState(0);

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
    if (!tvCsvUrl && !booksCsvUrl) {
      setError(
        `No CSV URL(s) found in env.\n\nCreate / update .env.local in project root and add at least one of:\n${ENV_KEY}=PASTE_YOUR_TV_PUBLISHED_CSV_URL_HERE\n${BOOKS_ENV_KEY}=PASTE_YOUR_BOOKS_PUBLISHED_CSV_URL_HERE\n\nThen stop + restart dev server.`
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
    ])
      .then((results) => {
        if (cancelled) return;

        const [tvRes, booksRes] = results;

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
  }, [tvCsvUrl, booksCsvUrl, refreshNonce]);

  function formatLastSync(ts: number | null) {
    if (!ts) return "—";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return "—";
    }
  }

  const allShows = useMemo(() => {
    return tvRows.map(rowToShow).filter(Boolean) as Show[];
  }, [tvRows]);

  const allBooks = useMemo(() => {
    return bookRows.map(rowToBook).filter(Boolean) as Book[];
  }, [bookRows]);

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

    // Home: combine books + TV and sort by book.releaseDate or show.lastAirDate (descending)
    if (nav === "home") {
      const qb = q ? allBooks.filter((b) => b.title.toLowerCase().includes(q)) : allBooks;
      const qs = q ? allShows.filter((s) => s.title.toLowerCase().includes(q)) : allShows;

      const combined = [
        ...qb.map((b) => ({ ...b, __type: "book" } as Book & { __type: "book" })),
        ...qs.map((s) => ({ ...s, __type: "tv" } as Show & { __type: "tv" })),
      ] as Array<(Book & { __type: "book" }) | (Show & { __type: "tv" })>;

      return combined.sort((a, b) => {
        const aTime = a.__type === "book" ? (a.releaseDate ? Date.parse(a.releaseDate) : NaN) : (a.lastAirDate ? Date.parse(a.lastAirDate) : NaN);
        const bTime = b.__type === "book" ? (b.releaseDate ? Date.parse(b.releaseDate) : NaN) : (b.lastAirDate ? Date.parse(b.lastAirDate) : NaN);
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
  }, [allShows, allBooks, watchFilter, showFilter, nav, query]);

  const stats = useMemo(() => {
    return {
      movies: 0,
      tv: allShows.length,
      books: allBooks.length,
      games: 0,
    };
  }, [allShows.length, allBooks.length]);

  const postersPerShelf = useMemo(() => {
    const size = nav === "books" ? posterSizeBooks : posterSizeTv;
    const usable = Math.max(0, stageWidth - SHELF_SIDE_PADDING * 2);
    return Math.max(1, Math.floor((usable + gap) / (size + gap)));
  }, [stageWidth, posterSizeTv, posterSizeBooks, nav, gap]);

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
            overflow: "hidden",
            background: "linear-gradient(180deg, #f4f1ea 0%, #efe7db 100%)",
            border: "1px solid rgba(0,0,0,0.12)",
            borderRight: "none",
            boxShadow: "0 10px 18px rgba(0,0,0,0.12)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Logo header + stats */}
          <div
            style={{
              background: "transparent",
              borderBottom: "none",
              position: "relative",
              padding: 0,
              border: "1px solid rgba(0,0,0,0.08)",
              borderLeft: "none",
              borderRight: "none",
              overflow: "hidden",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={APP_ICON}
              alt={APP_TITLE}
              style={{
                width: "100%",
                height: "auto",
                objectFit: "contain",
                objectPosition: "center",
                display: "block",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "50%",
                transform: "translateY(-50%)",
                right: 10,
                display: "grid",
                gridTemplateColumns: "1fr",
                rowGap: 2,
                padding: "0 8px",
                borderRadius: 0,
                background: "transparent",
                border: "none",
                backdropFilter: "none",
                WebkitBackdropFilter: "none",
                width: "40%",
              }}
            >
              {[
                { label: "Movies", value: stats.movies },
                { label: "TV Shows", value: stats.tv },
                { label: "Books", value: stats.books },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "max-content 1fr",
                    alignItems: "baseline",
                    columnGap: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color:
                        item.label === "Movies"
                          ? "#549cfa"
                          : item.label === "TV Shows"
                          ? "#fa8c07"
                          : item.label === "Books"
                          ? "#638818"
                          : "#1A1A1A",
                      fontFamily: "Inter, sans-serif",
                      whiteSpace: "nowrap",
                      lineHeight: 1.15,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 800,
                      color: "#8a4c4c",
                      textAlign: "right",
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
                justifyContent: "space-between",
                gap: 10,
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(255,255,255,0.7)",
                border: "1px solid rgba(0,0,0,0.12)",
                boxShadow: "0 10px 18px rgba(0,0,0,0.08)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background:
                      syncState === "saving"
                        ? "#d08a2c"
                        : syncState === "ok"
                        ? "#2f8f5b"
                        : syncState === "error"
                        ? "#b23b3b"
                        : "rgba(0,0,0,0.35)",
                    opacity: 0.9,
                    flex: "0 0 auto",
                  }}
                />
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ color: "#1b1b1b", fontSize: 12, fontWeight: 500 }}>
                      {syncState === "saving"
                        ? "Syncing"
                        : syncState === "ok"
                        ? "Synced"
                        : syncState === "error"
                        ? "Error"
                        : "Idle"}
                    </div>
                    <div style={{ color: "rgba(0,0,0,0.6)", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
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
                  color: "#1b1b1b",
                  borderRadius: 999,
                  padding: "7px 10px",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  flex: "0 0 auto",
                  whiteSpace: "nowrap",
                }}
                title="Re-sync (re-fetch CSV)"
              >
                Re-sync
                </button>
            </div>
          </div>

          <div style={{ padding: "10px 12px 0 12px" }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              style={{
                width: "100%",
                padding: "9px 10px",
                borderRadius: 12,
                border: "1px solid rgba(0,0,0,0.16)",
                background: "rgba(255,255,255,0.9)",
                color: "#1b1b1b",
                fontSize: 12,
                fontWeight: 600,
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            />
          </div>

          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
            {/* Top actions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <button
                onClick={() => setNav("home")}
                className={`sideItem ${nav === "home" ? "active" : ""}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.06)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 11l9-8 9 8" />
                    <path d="M5 10v10h14V10" />
                  </svg>
                </span>
                HOME
              </button>
              <button
                onClick={() => setNav("search")}
                className={`sideItem ${nav === "search" ? "active" : ""}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    background: "rgba(0,0,0,0.06)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path d="M20 20l-3.5-3.5" />
                  </svg>
                </span>
                Search
              </button>
            </div>

            {/* Library section */}
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 0.4,
                  opacity: 0.55,
                  marginBottom: 6,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span>LIBRARY</span>
                <span />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <button
                  onClick={() => setNav("books")}
                  className={`sideItem ${nav === "books" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: "rgba(0,0,0,0.06)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 5h13a2 2 0 0 1 2 2v11H6a2 2 0 0 0-2 2V5z" />
                      <path d="M4 17h15" />
                    </svg>
                  </span>
                  Books
                </button>

                <button
                  onClick={() => setNav("movies")}
                  className={`sideItem ${nav === "movies" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: "rgba(0,0,0,0.06)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="6" width="18" height="12" rx="2" />
                      <path d="M7 6v12M11 6v12M15 6v12M19 6v12" />
                    </svg>
                  </span>
                  Movies
                </button>

                <button
                  onClick={() => {
                    setWatchFilter(null);
                    setShowFilter(null);
                    setNav("tv");
                  }}
                  className={`sideItem primary ${nav === "tv" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      aria-hidden
                      style={{
                        width: 18,
                        height: 18,
                        borderRadius: 6,
                        background: nav === "tv" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <svg
                        width="12"
                        height="12"
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
                  <span />
                </button>

                {nav === "tv" ? (
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
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8A" }}>Watch Status</span>
                      <span style={{ color: "#8A8A8A", fontWeight: 700, fontSize: 12 }}>+</span>
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
                                  fontSize: 11,
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
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#8A8A8A" }}>Show Status</span>
                      <span style={{ color: "#8A8A8A", fontWeight: 700, fontSize: 12 }}>+</span>
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
                                  fontSize: 11,
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
                  onClick={() => setNav("games")}
                  className={`sideItem ${nav === "games" ? "active" : ""}`}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 6,
                      background: "rgba(0,0,0,0.06)",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="8" width="18" height="8" rx="4" />
                      <path d="M8 10v4M6 12h4M16 11h2M15 13h2" />
                    </svg>
                  </span>
                  Games
                </button>
              </div>
            </div>

            {/* Alignment section */}
            <div style={{ marginTop: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, opacity: 0.55, marginBottom: 6 }}>
                SETTINGS
              </div>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`sideItem primary ${showSettings ? "active" : ""}`}
                style={{
                  width: "100%",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 6,
                    background: showSettings ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.06)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2 2-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21h-3v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-2-2 .1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3v-3h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1 2-2 .1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.5V3h3v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1 2 2-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21v3h-.1a1.7 1.7 0 0 0-1.5 1z" />
                  </svg>
                </span>
                Settings
              </button>

              {showSettings ? (
                <div style={{ marginTop: 8, paddingLeft: 8, display: "flex", flexDirection: "column", gap: 8 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.85 }}>
                    TV Size
                    <input
                      type="range"
                      min={70}
                      max={125}
                      step={5}
                      value={posterSizeTv}
                      onChange={(e) => setPosterSizeTv(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: "right" }}>{posterSizeTv}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.85 }}>
                    Books Size
                    <input
                      type="range"
                      min={70}
                      max={125}
                      step={5}
                      value={posterSizeBooks}
                      onChange={(e) => setPosterSizeBooks(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: "right" }}>{posterSizeBooks}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.85 }}>
                    Books Height
                    <input
                      type="range"
                      min={1.0}
                      max={2.0}
                      step={0.1}
                      value={bookHeightMultiplier}
                      onChange={(e) => setBookHeightMultiplier(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: 28, textAlign: "right" }}>{bookHeightMultiplier.toFixed(1)}</span>
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.85 }}>
                    <input type="checkbox" checked={tight} onChange={(e) => setTight(e.target.checked)} />
                    Tight
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    Top
                    <input
                      type="number"
                      value={caseInsetTopPx}
                      onChange={(e) => setCaseInsetTopPx(Number(e.target.value) || 0)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    Right
                    <input
                      type="number"
                      value={caseInsetRightPx}
                      onChange={(e) => setCaseInsetRightPx(Number(e.target.value) || 0)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    Bottom
                    <input
                      type="number"
                      value={caseInsetBottomPx}
                      onChange={(e) => setCaseInsetBottomPx(Number(e.target.value) || 0)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    Left
                    <input
                      type="number"
                      value={caseInsetLeftPx}
                      onChange={(e) => setCaseInsetLeftPx(Number(e.target.value) || 0)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    <input
                      type="checkbox"
                      checked={showInsetGuide}
                      onChange={(e) => setShowInsetGuide(e.target.checked)}
                    />
                    Frame
                  </label>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    Frame: {CASE_SRC_W}×{CASE_SRC_H}
                  </div>
                  
                  <div style={{ fontSize: 11, fontWeight: 700, marginTop: 8, opacity: 0.7 }}>BOOK INSETS</div>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    Top
                    <input
                      type="number"
                      value={bookInsetTopPx}
                      onChange={(e) => setBookInsetTopPx(Number(e.target.value) || 0)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    Right
                    <input
                      type="number"
                      value={bookInsetRightPx}
                      onChange={(e) => setBookInsetRightPx(Number(e.target.value) || 0)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    Bottom
                    <input
                      type="number"
                      value={bookInsetBottomPx}
                      onChange={(e) => setBookInsetBottomPx(Number(e.target.value) || 0)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: 0.8 }}>
                    Left
                    <input
                      type="number"
                      value={bookInsetLeftPx}
                      onChange={(e) => setBookInsetLeftPx(Number(e.target.value) || 0)}
                      style={{ width: 64 }}
                    />
                  </label>
                  <div style={{ fontSize: 11, opacity: 0.6 }}>
                    Frame: {BOOK_SRC_W}×{BOOK_SRC_H}
                  </div>
                </div>
              ) : null}
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
                    boxShadow: shelfIndex === 0 ? "0 12px 26px rgba(0,0,0,0.18)" : "none",
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
                      const itemSize = isBook ? posterSizeBooks : posterSizeTv;
                      // Calculate x as cumulative sum of all previous items + gaps
                      let x = 0;
                      for (let j = 0; j < i; j++) {
                        const prevShow = shelfShows[j];
                        const prevIsBook = prevShow.__type === "book";
                        const prevSize = prevIsBook ? posterSizeBooks : posterSizeTv;
                        x += prevSize + gap;
                      }
                      const caseWidth = itemSize;
                      const caseHeight = isBook ? Math.round(itemSize * bookHeightMultiplier) : Math.round(itemSize * 1.5);

                      // Use appropriate insets based on item type
                      const insetTopVal = isBook ? bookInsetTopPx : caseInsetTopPx;
                      const insetRightVal = isBook ? bookInsetRightPx : caseInsetRightPx;
                      const insetBottomVal = isBook ? bookInsetBottomPx : caseInsetBottomPx;
                      const insetLeftVal = isBook ? bookInsetLeftPx : caseInsetLeftPx;
                      const srcW = isBook ? BOOK_SRC_W : CASE_SRC_W;
                      const srcH = isBook ? BOOK_SRC_H : CASE_SRC_H;

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
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={isBook ? BOOK_FRAME_IMAGE : CASE_FRAME_IMAGE}
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
        }
        .sideItem {
          width: 100%;
          padding: 6px 8px;
          border-radius: 10px;
          border: 1px solid transparent;
          background: transparent;
          color: #1b1b1b;
          font-size: 13px;
          font-weight: 500;
          font-family: "Nunito", "Inter", "Segoe UI", sans-serif;
          cursor: pointer;
          transition: background 140ms ease, border-color 140ms ease, box-shadow 140ms ease;
        }
        .sideItem:hover {
          background: rgba(0, 0, 0, 0.04);
        }
        .sideItem.active {
          background: rgba(140, 58, 58, 0.18);
          border-color: rgba(0, 0, 0, 0.08);
          font-weight: 700;
        }
        .sideItem.primary {
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(0, 0, 0, 0.06);
        }
        .sideItem.primary.active {
          background: #8a4c4c;
          color: #fff;
          box-shadow: 0 6px 12px rgba(0, 0, 0, 0.18);
        }
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
