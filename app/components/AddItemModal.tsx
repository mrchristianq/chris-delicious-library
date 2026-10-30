"use client";

import React, { useEffect, useRef, useState } from "react";
import { fetchMediaSearch } from "../lib/mediaSearchClient";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";
import "./AddItemModal.css";

export type AddExtendedType = "movie" | "tv" | "game" | "book-audnexus" | "book-apple" | "book-hardcover";

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  year?: string;
  imageUrl?: string;
  data: Record<string, unknown>;
};

type AddItemModalProps = {
  open: boolean;
  onClose: () => void;
  onSelectResult: (type: AddExtendedType, data: Record<string, unknown>, bookFormat: string) => void;
  onAddManually: (type: AddExtendedType, bookFormat: string) => void;
  initialSelection?: {
    type?: AddExtendedType;
    query?: string;
  } | null;
};

type MediaCardType = AddExtendedType | "manual";

type CardMotif = "film" | "tv" | "controller" | "wave" | "book" | "scribble";

type MediaCardDef = {
  type: MediaCardType;
  label: string;
  description: string;
  emoji: string;
  accent: string;
  tint: string;
  motif: CardMotif;
};

const MEDIA_TYPE_CARDS: MediaCardDef[] = [
  { type: "movie",          label: "Movie",              description: "Add a film to your collection",                emoji: "🎬", accent: "#a168d6", tint: "rgba(161,104,214,0.10)", motif: "film" },
  { type: "tv",             label: "TV Show",            description: "Track a series and its episodes",        emoji: "📺", accent: "#ff9934", tint: "rgba(255,153,52,0.10)", motif: "tv" },
  { type: "game",           label: "Game",               description: "Add a game to your collection",         emoji: "🎮", accent: "#3492ff", tint: "rgba(52,146,255,0.10)", motif: "controller" },
  { type: "book-audnexus",  label: "Audiobook",          description: "Add your next listen",      emoji: "🎧", accent: "#5fb85c", tint: "rgba(95,184,92,0.10)", motif: "wave" },
  { type: "book-hardcover", label: "Book (Hardcover)",   description: "Add a book to your collection",       emoji: "📕", accent: "#5fb85c", tint: "rgba(95,184,92,0.10)", motif: "book" },
  { type: "manual",         label: "Manual Entry",       description: "Enter the details yourself",     emoji: "✏️", accent: "#475569", tint: "rgba(71,85,105,0.10)", motif: "scribble" },
];

type ManualMediaType = "movie" | "tv" | "game" | "book";

const MANUAL_MEDIA_OPTIONS: Array<{ type: ManualMediaType; label: string; emoji: string; accent: string; tint: string; motif: CardMotif }> = [
  { type: "movie", label: "Movie",    emoji: "🎬", accent: "#a168d6", tint: "rgba(161,104,214,0.10)", motif: "film" },
  { type: "tv",    label: "TV Show",  emoji: "📺", accent: "#ff9934", tint: "rgba(255,153,52,0.10)", motif: "tv" },
  { type: "game",  label: "Game",     emoji: "🎮", accent: "#3492ff", tint: "rgba(52,146,255,0.10)", motif: "controller" },
  { type: "book",  label: "Book",     emoji: "📖", accent: "#5fb85c", tint: "rgba(95,184,92,0.10)", motif: "book" },
];

const BOOK_FORMAT_OPTIONS = [
  { value: "Physical",  label: "Physical",  emoji: "📖" },
  { value: "Audiobook", label: "Audiobook", emoji: "🎧" },
  { value: "eBook",     label: "eBook",     emoji: "📱" },
];

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable", "Segoe UI", "Helvetica Neue", sans-serif';

const backLinkStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 4,
  background: "none", border: "none", cursor: "pointer",
  fontSize: 14, fontWeight: 500, color: "#79869c",
  minHeight: 44, padding: "8px 0", alignSelf: "flex-start", fontFamily: FONT,
};

function sectionLabel(text: string) {
  return <div className="cdlAddSectionLabel">{text}</div>;
}

type MediaTypeCardOpt = { label: string; emoji: string; accent: string; tint: string; description?: string; motif: CardMotif };

function CardMotifArt({ motif, accent }: { motif: CardMotif; accent: string }) {
  const wrapStyle: React.CSSProperties = {
    position: "absolute", right: -20, bottom: -20, width: 150, height: 130,
    opacity: 0.065, pointerEvents: "none",
  };
  switch (motif) {
    case "film":
      return (
        <svg viewBox="0 0 170 140" style={wrapStyle}>
          <g transform="rotate(-14 85 70)">
            <rect x="5" y="52" width="160" height="48" rx="6" fill={accent} />
            {Array.from({ length: 8 }).map((_, i) => (
              <rect key={`t${i}`} x={13 + i * 19} y="58" width="9" height="9" rx="2" fill="#fff" />
            ))}
            {Array.from({ length: 8 }).map((_, i) => (
              <rect key={`b${i}`} x={13 + i * 19} y="87" width="9" height="9" rx="2" fill="#fff" />
            ))}
          </g>
        </svg>
      );
    case "tv":
      return (
        <svg viewBox="0 0 170 140" style={wrapStyle}>
          <g transform="rotate(-6 85 70)">
            <rect x="25" y="35" width="115" height="80" rx="10" fill={accent} />
            <rect x="70" y="118" width="30" height="8" rx="4" fill={accent} />
            <path d="M60 35 L42 12" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
            <path d="M100 35 L118 12" stroke={accent} strokeWidth="7" strokeLinecap="round" fill="none" />
          </g>
        </svg>
      );
    case "controller":
      return (
        <svg viewBox="0 0 170 140" style={wrapStyle}>
          <g transform="rotate(-8 85 70)">
            <rect x="10" y="48" width="150" height="58" rx="29" fill={accent} />
            <rect x="46" y="65" width="9" height="24" rx="3" fill="#fff" />
            <rect x="38" y="73" width="25" height="9" rx="3" fill="#fff" />
            <circle cx="122" cy="68" r="8" fill="#fff" />
            <circle cx="140" cy="84" r="8" fill="#fff" />
          </g>
        </svg>
      );
    case "wave":
      return (
        <svg viewBox="0 0 170 140" style={wrapStyle}>
          <g transform="rotate(-4 85 70)">
            {[26, 52, 80, 100, 66, 40, 20].map((h, i) => (
              <rect key={i} x={12 + i * 21} y={112 - h} width="15" height={h} rx="7.5" fill={accent} />
            ))}
          </g>
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 170 140" style={wrapStyle}>
          <g transform="rotate(-10 85 70)">
            <rect x="20" y="24" width="100" height="20" rx="4" fill={accent} />
            <rect x="20" y="50" width="135" height="20" rx="4" fill={accent} opacity="0.78" />
            <rect x="20" y="76" width="85" height="20" rx="4" fill={accent} opacity="0.56" />
          </g>
        </svg>
      );
    case "scribble":
      return (
        <svg viewBox="0 0 170 140" style={wrapStyle}>
          <g transform="rotate(-8 85 70)">
            <path d="M25 110 L95 32 L118 54 L48 132 Z" fill={accent} />
            <path d="M12 128 h140" stroke={accent} strokeWidth="8" strokeLinecap="round" opacity="0.55" />
          </g>
        </svg>
      );
    default:
      return null;
  }
}

function MediaChoiceIcon({ motif }: { motif: CardMotif }) {
  const paths: Record<CardMotif, React.ReactNode> = {
    film: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 3v18M16 3v18M4 8h4m-4 8h4m8-8h4m-4 8h4" /></>,
    tv: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="m8 2 4 4 4-4M9 22h6m-3-3v3" /></>,
    controller: <><path d="M8 6h8c3 0 4 3 5 8l1 4c0 3-3 3-5 0l-2-2H9l-2 2c-2 3-5 3-5 0l1-4C4 9 5 6 8 6Z" /><path d="M6 11h6m-3-3v6m7-3h.01M19 13h.01" /></>,
    wave: <path d="M3 10v4m4-7v10m5-14v18m5-14v10m4-7v4" />,
    book: <><path d="M12 5c-3-2-6-2-10-1v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Z" /><path d="M12 5v15" /></>,
    scribble: <><path d="m15 3 6 6-12 12-7 1 1-7L15 3Zm-3 3 6 6M3 15l6 6" /></>,
  };
  return <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[motif]}</svg>;
}

function MediaTypeCard({ card, onSelect, compact, mobile }: { card: MediaTypeCardOpt; onSelect: () => void; compact?: boolean; mobile?: boolean }) {
  return (
    <button type="button" className={`cdlAddMediaCard${compact ? " compact" : ""}${mobile ? " mobile" : ""}`}
      style={{ "--media-accent": card.accent, "--media-tint": card.tint } as React.CSSProperties}
      onClick={onSelect}>
      <span className="cdlAddMotif" aria-hidden="true"><CardMotifArt motif={card.motif} accent="#79869c" /></span>
      <span className="cdlAddMediaIcon"><MediaChoiceIcon motif={card.motif} /></span>
      <span className="cdlAddMediaCopy"><span className="cdlAddMediaTitle">{card.label}</span>
        {card.description && <span className="cdlAddMediaDescription">{card.description}</span>}
      </span>
      <svg className="cdlAddChevron" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
    </button>
  );
}

function MediaTypeRow({ card, onSelect }: { card: MediaTypeCardOpt; onSelect: () => void }) {
  return <MediaTypeCard card={card} onSelect={onSelect} mobile />;
}

function safeStr(v: unknown): string {
  return String(v ?? "").trim();
}

function normalizeBookTypeForSheet(value: unknown): string {
  const raw = safeStr(value);
  const normalized = raw.toLowerCase().replace(/[\s_-]+/g, "");

  if (normalized === "audiobook" || normalized === "audio") return "Audiobook";
  if (normalized === "ebook" || normalized === "kindle") return "eBook";
  return "Physical";
}

function getApiType(type: AddExtendedType): string {
  if (type === "book-apple")     return "book-audnexus";
  if (type === "book-audnexus")  return "book-audnexus";
  if (type === "book-hardcover") return "book-hardcover";
  return type;
}

function typeLabel(type: AddExtendedType): string {
  if (type === "movie")          return "Movie";
  if (type === "tv")             return "TV Show";
  if (type === "game")           return "Game";
  if (type === "book-apple")     return "Book (Audnexus)";
  if (type === "book-audnexus")  return "Book (Audnexus)";
  if (type === "book-hardcover") return "Book (Hardcover)";
  return type;
}

export function AddItemModal({ open, onClose, onSelectResult, onAddManually, initialSelection }: AddItemModalProps) {
  const [selectedType, setSelectedType]   = useState<AddExtendedType | null>(null);
  const [bookFormat, setBookFormat]       = useState<string>("Physical");
  const [query, setQuery]                 = useState("");
  const [results, setResults]             = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching]     = useState(false);
  const [searchError, setSearchError]     = useState<string | null>(null);
  const [searched, setSearched]           = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [hardcoverBook, setHardcoverBook] = useState<SearchResult | null>(null);
  const [editionResults, setEditionResults] = useState<SearchResult[]>([]);
  const [isLoadingEditions, setIsLoadingEditions] = useState(false);
  const [editionsError, setEditionsError] = useState<string | null>(null);
  const [manualPicking, setManualPicking] = useState(false);
  const [manualBookPicking, setManualBookPicking] = useState(false);
  const [manualBookFormat, setManualBookFormat] = useState<string>("Physical");
  const inputRef                          = useRef<HTMLInputElement>(null);

  // Reset when opening
  useEffect(() => {
    if (!open) return;
    const initialType = initialSelection?.type ?? null;
    setSelectedType(initialType);
    setBookFormat(initialType === "book-audnexus" || initialType === "book-apple" ? "Audiobook" : "Physical");
    setQuery(safeStr(initialSelection?.query));
    setResults([]);
    setIsSearching(false);
    setSearchError(null);
    setSearched(false);
    setHardcoverBook(null);
    setEditionResults([]);
    setIsLoadingEditions(false);
    setEditionsError(null);
    setManualPicking(false);
    setManualBookPicking(false);
    setManualBookFormat("Physical");
  }, [open, initialSelection]);

  // Focus input after type selected
  useEffect(() => {
    if (selectedType) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [selectedType]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const updateLayout = () => setIsMobileLayout(window.innerWidth <= 980);
    updateLayout();
    window.addEventListener("resize", updateLayout);
    return () => window.removeEventListener("resize", updateLayout);
  }, []);

  // Keyboard dismiss
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (hardcoverBook) {
          setHardcoverBook(null);
          setEditionResults([]);
          setEditionsError(null);
        } else if (selectedType) {
          setSelectedType(null);
          setQuery("");
          setResults([]);
          setSearched(false);
        } else if (manualBookPicking) {
          setManualBookPicking(false);
        } else if (manualPicking) {
          setManualPicking(false);
        } else {
          onClose();
        }
      }
      if (e.key === "Enter" && selectedType && query.trim() && !isSearching && !hardcoverBook) {
        handleSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, selectedType, query, isSearching, onClose, manualPicking, manualBookPicking, hardcoverBook]);

  if (!open) return null;

  const isBook = selectedType === "book-audnexus" || selectedType === "book-apple" || selectedType === "book-hardcover";
  const isAudnexusBook = selectedType === "book-audnexus" || selectedType === "book-apple";
  const showBookFormatPicker = false;
  const providerThumbnailSize = isAudnexusBook
    ? { width: 48, height: 48 }
    : { width: 48, height: 70 };
  const editionThumbnailSize = isAudnexusBook
    ? { width: 56, height: 56 }
    : { width: 56, height: 82 };
  const resultThumbnailSize = isAudnexusBook
    ? { width: 66, height: 66 }
    : { width: 66, height: 96 };

  const handleSearch = async () => {
    if (!selectedType || !query.trim()) return;
    setIsSearching(true);
    setSearchError(null);
    setResults([]);
    setSearched(false);
    try {
      const params = new URLSearchParams({ type: getApiType(selectedType), query: query.trim() });
      const res = await fetchMediaSearch(params);
      const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; results?: SearchResult[] };
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Search failed.");
      setResults(Array.isArray(payload.results) ? payload.results : []);
      setSearched(true);
    } catch (e: unknown) {
      setSearchError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (result: SearchResult) => {
    if (!selectedType) return;

    // For provider-backed books, drill into a detail/edition confirmation step
    // instead of blindly filling the edit form from the first search result.
    if (selectedType === "book-hardcover" || isAudnexusBook) {
      const lookupId = selectedType === "book-hardcover"
        ? safeStr((result.data as Record<string, unknown>)?.hardcoverBookId)
        : safeStr((result.data as Record<string, unknown>)?.audibleAsin || (result.data as Record<string, unknown>)?.audnexusAsin);
      if (lookupId) {
        setHardcoverBook(result);
        setEditionResults([]);
        setEditionsError(null);
        setIsLoadingEditions(true);
        try {
          const params = new URLSearchParams({
            type: selectedType === "book-hardcover" ? "book-hardcover" : "book-audnexus",
            lookupId,
            bookFormat: selectedType === "book-hardcover" ? bookFormat : "Audiobook",
          });
          const res = await fetchMediaSearch(params);
          const payload = await res.json().catch(() => ({})) as { ok?: boolean; error?: string; results?: SearchResult[] };
          if (!res.ok || !payload.ok) throw new Error(payload.error || "Failed to load edition details.");
          setEditionResults(Array.isArray(payload.results) ? payload.results : []);
        } catch (e: unknown) {
          setEditionsError(e instanceof Error ? e.message : "Failed to load edition details.");
        } finally {
          setIsLoadingEditions(false);
        }
        return;
      }
    }

    const data: Record<string, unknown> = {
      ...result.data,
      type: isAudnexusBook ? "Audiobook" : isBook ? bookFormat : undefined,
    };
    onSelectResult(selectedType, data, isAudnexusBook ? "Audiobook" : bookFormat);
  };

  const handleSelectEdition = (edition: SearchResult) => {
    if (!selectedType || !hardcoverBook) return;
    const editionData = edition.data as Record<string, unknown>;
    // Merge the canonical book fields with the edition-specific fields (isbn, pages,
    // releaseDate, edition cover, publisher). Edition data wins on conflict, and the
    // API already derived a normalized `type` string from the edition format.
    const data: Record<string, unknown> = {
      ...(hardcoverBook.data as Record<string, unknown>),
      ...editionData,
    };
    const derivedType = normalizeBookTypeForSheet(editionData?.type);
    if (!safeStr(data.type)) data.type = derivedType;
    // Forward the derived type as bookFormat so downstream prefill stores the right thing.
    onSelectResult(selectedType, data, derivedType);
  };

  const handleAddManually = () => {
    if (!selectedType) return;
    onAddManually(selectedType, isAudnexusBook ? "Audiobook" : bookFormat);
  };

  const handleManualMediaSelect = (type: ManualMediaType) => {
    if (type === "book") {
      setManualBookPicking(true);
      return;
    }
    onAddManually(type, "");
  };

  const handleManualBookContinue = () => {
    onAddManually("book-hardcover", manualBookFormat);
  };

  return (
    <div
      className="cdlAddDialog"
      role="dialog"
      aria-label="Add to Library"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: isMobileLayout ? 2400 : 9200,
        background: isMobileLayout ? "transparent" : "rgba(7,10,16,0.48)",
        backdropFilter: isMobileLayout ? "none" : "blur(16px) saturate(1.1)",
        WebkitBackdropFilter: isMobileLayout ? "none" : "blur(16px) saturate(1.1)",
        display: "flex",
        alignItems: isMobileLayout ? "stretch" : "center",
        justifyContent: isMobileLayout ? "stretch" : "center",
        padding: isMobileLayout ? 0 : 16,
        fontFamily: FONT,
      }}
      onClick={isMobileLayout ? undefined : onClose}
    >
      <div
        onClick={isMobileLayout ? undefined : (e) => e.stopPropagation()}
        style={{
          width: isMobileLayout ? "100%" : selectedType || manualPicking ? "min(600px, 100%)" : "min(940px, 94vw)",
          height: isMobileLayout ? "100%" : "auto",
          borderRadius: isMobileLayout ? 0 : 30,
          border: "1px solid rgba(218,223,231,0.85)",
          background: "#f1f2f4",
          boxShadow: isMobileLayout ? "none" : "0 28px 90px rgba(15,23,42,0.28)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Hero header */}
        <div style={{
          position: "relative", flexShrink: 0,
          padding: isMobileLayout ? "24px 72px 22px 20px" : "36px 86px 30px 32px",

          userSelect: "none",
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute", top: isMobileLayout ? 20 : 28, right: isMobileLayout ? 18 : 28,
              width: 48, height: 48, borderRadius: "50%",
              background: "#ffffff", border: "1px solid #e1e5ec",
              boxShadow: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="#475569" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: isMobileLayout ? 10 : 14 }}>
            <img src="/icon-books.png" alt="" aria-hidden="true" width={64} height={64} style={{ width: isMobileLayout ? 48 : 64, height: isMobileLayout ? 48 : 64, objectFit: "contain", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontSize: isMobileLayout ? 24 : 32, fontWeight: 650, letterSpacing: -0.6, lineHeight: 1.15, color: "#202a39",
              }}>
                Add to Library
              </div>
              <div style={{ fontSize: isMobileLayout ? 14 : 15, color: "#79869c", fontWeight: 400, marginTop: 8 }}>
                {manualBookPicking
                  ? "Choose a format for your book."
                  : manualPicking
                  ? "What would you like to add manually?"
                  : selectedType
                  ? (hardcoverBook ? "Choose an edition to add." : `Search for the ${typeLabel(selectedType)} you want to add.`)
                  : "Choose what you’d like to add."}
              </div>
            </div>
          </div>
        </div>

        <div style={{ padding: isMobileLayout ? "18px 16px calc(env(safe-area-inset-bottom, 0px) + 112px)" : "4px 32px 32px", display: "flex", flexDirection: "column", gap: 20, overflow: "auto", maxHeight: isMobileLayout ? "none" : "calc(100vh - 160px)" }}>

          {/* ── Step 1: Media type picker ── */}
          {!selectedType && !manualPicking && (
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {isMobileLayout ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {MEDIA_TYPE_CARDS.map((card) => (
                    <MediaTypeRow key={card.type} card={card} onSelect={() => {
                      if (card.type === "manual") { setManualPicking(true); return; }
                      setSelectedType(card.type as AddExtendedType);
                      if (card.type === "book-audnexus") setBookFormat("Audiobook");
                    }} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
                  {MEDIA_TYPE_CARDS.map((card) => (
                    <MediaTypeCard key={card.type} card={card} onSelect={() => {
                      if (card.type === "manual") { setManualPicking(true); return; }
                      setSelectedType(card.type as AddExtendedType);
                      if (card.type === "book-audnexus") setBookFormat("Audiobook");
                    }} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Manual entry: choose media type ── */}
          {manualPicking && !manualBookPicking && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <button onClick={() => setManualPicking(false)} style={backLinkStyle}>
                ← Back to media types
              </button>
              {sectionLabel("Choose What To Add")}
              {isMobileLayout ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {MANUAL_MEDIA_OPTIONS.map((opt) => (
                    <MediaTypeRow key={opt.type} card={opt} onSelect={() => handleManualMediaSelect(opt.type)} />
                  ))}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
                  {MANUAL_MEDIA_OPTIONS.map((opt) => (
                    <MediaTypeCard key={opt.type} card={opt} onSelect={() => handleManualMediaSelect(opt.type)} compact />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Manual entry: choose book format ── */}
          {manualPicking && manualBookPicking && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <button onClick={() => setManualBookPicking(false)} style={backLinkStyle}>
                ← Back
              </button>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "#516279", letterSpacing: 0.2, textTransform: "uppercase" }}>
                Format
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {BOOK_FORMAT_OPTIONS.map((opt) => {
                  const active = manualBookFormat === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setManualBookFormat(opt.value)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "12px 14px", minHeight: 48,
                        background: active ? "#e8f2ff" : "#fff",
                        border: active ? "1px solid rgba(59,130,246,0.55)" : "1px solid rgba(149,161,178,0.36)",
                        borderRadius: 10,
                        boxShadow: active ? "0 2px 8px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.9)" : "0 1px 3px rgba(10,18,36,0.06)",
                        cursor: "pointer",
                        fontFamily: FONT,
                        transition: "all 0.1s ease",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                      <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? "#1d4ed8" : "#374151" }}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={handleManualBookContinue}
                style={{
                  padding: "12px 16px", minHeight: 48,
                  background: "linear-gradient(180deg, #4d9bff 0%, #3188ed 100%)",
                  border: "none", borderRadius: 10,
                  color: "#fff", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: FONT,
                  boxShadow: "0 2px 8px rgba(37,99,235,0.28)",
                }}
              >
                Continue
              </button>
            </div>
          )}

          {/* ── Edition/detail view (provider-backed books, after a result is picked) ── */}
          {hardcoverBook && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => { setHardcoverBook(null); setEditionResults([]); setEditionsError(null); }}
                style={backLinkStyle}
              >
                ← Back to results
              </button>

              <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "10px 12px", background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 12 }}>
                <div style={{ ...providerThumbnailSize, borderRadius: 6, overflow: "hidden", flexShrink: 0, background: "rgba(149,161,178,0.18)", boxShadow: "0 2px 6px rgba(0,0,0,0.16)" }}>
                  {hardcoverBook.imageUrl ? (
                    <img src={hardcoverBook.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : null}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#1e293b", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hardcoverBook.title}</div>
                  {hardcoverBook.subtitle && (
                    <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{hardcoverBook.subtitle}</div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", marginTop: 4 }}>
                    {isLoadingEditions ? "Loading details…" : `${editionResults.length} edition${editionResults.length !== 1 ? "s" : ""}`}
                  </div>
                </div>
              </div>

              {editionsError && (
                <div style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)",
                  borderRadius: 10, padding: "10px 14px",
                  fontSize: 12, color: "#b91c1c", fontWeight: 500,
                }}>
                  {editionsError}
                </div>
              )}

              {!isLoadingEditions && !editionsError && editionResults.length === 0 && (
                <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>
                  No edition details found for this book.
                </div>
              )}

              {editionResults.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {editionResults.map((edition) => {
                    const editionData = edition.data as Record<string, unknown>;
                    const fmt = safeStr(editionData?.editionFormat);
                    const isAudio = fmt.toLowerCase().includes("audio");
                    return (
                      <button
                        key={edition.id}
                        onClick={() => handleSelectEdition(edition)}
                        className="cdlAddResult"
                  >
                        <div style={{
                          ...editionThumbnailSize, borderRadius: 6,
                          overflow: "hidden", flexShrink: 0,
                          background: "rgba(149,161,178,0.18)",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
                        }}>
                          {edition.imageUrl ? (
                            <img src={edition.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", ...COVER_IMAGE_RADIUS_STYLE }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, opacity: 0.4 }}>{isAudio ? "🎧" : "📖"}</div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "#1e293b" }}>{fmt || "Unknown format"}</span>
                          </div>
                          {edition.subtitle && (
                            <div style={{ fontSize: 11.5, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{edition.subtitle}</div>
                          )}
                          {(() => {
                            const isbn = safeStr(editionData?.isbn);
                            const pages = safeStr(editionData?.pages);
                            const duration = safeStr(editionData?.audiobookDuration);
                            const bits = [isbn && `ISBN ${isbn}`, pages && `${pages} pages`, duration && duration].filter(Boolean);
                            if (!bits.length) return null;
                            return <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 500, marginTop: 3 }}>{bits.join(" · ")}</div>;
                          })()}
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
                          <path d="M9 18l6-6-6-6" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Step 2: Book format picker ── */}
          {selectedType && showBookFormatPicker && !searched && !hardcoverBook && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: "#516279", letterSpacing: 0.2, textTransform: "uppercase" }}>
                Format
              </p>
              <div style={{ display: "flex", gap: 8 }}>
                {BOOK_FORMAT_OPTIONS.map((opt) => {
                  const active = bookFormat === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => setBookFormat(opt.value)}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "12px 14px", minHeight: 48,
                        background: active ? "#e8f2ff" : "#fff",
                        border: active ? "1px solid rgba(59,130,246,0.55)" : "1px solid rgba(149,161,178,0.36)",
                        borderRadius: 10,
                        boxShadow: active ? "0 2px 8px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.9)" : "0 1px 3px rgba(10,18,36,0.06)",
                        cursor: "pointer",
                        fontFamily: FONT,
                        transition: "all 0.1s ease",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                      <span style={{ fontSize: 14, fontWeight: active ? 600 : 500, color: active ? "#1d4ed8" : "#374151" }}>
                        {opt.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Step 2+: Search input ── */}
          {selectedType && !hardcoverBook && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                {/* Back link */}
                <button
                  onClick={() => { setSelectedType(null); setQuery(""); setResults([]); setSearched(false); }}
                  style={backLinkStyle}
                >
                  ← Change type
                </button>
              </div>

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`Search for a ${typeLabel(selectedType)}…`}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
                  className="cdlAddSearchInput"
                  aria-label={`Search for a ${typeLabel(selectedType)}`}
                />
                {!isMobileLayout && (
                  <button
                    onClick={handleSearch}
                    disabled={!query.trim() || isSearching}
                    className="cdlAddPrimary"
                  >
                    {isSearching ? "Searching…" : "Search"}
                  </button>
                )}
              </div>

              {isMobileLayout && (
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || isSearching}
                  className="cdlAddPrimary"
                >
                  {isSearching ? "Searching…" : "Search"}
                </button>
              )}

              {/* Add manually link */}
              <button
                onClick={handleAddManually}
                className="cdlAddManualAction"
              >
                + Add manually without searching
              </button>

              {/* Error */}
              {searchError && (
                <div style={{
                  background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.28)",
                  borderRadius: 10, padding: "10px 14px",
                  fontSize: 12, color: "#b91c1c", fontWeight: 500,
                }}>
                  {searchError}
                </div>
              )}
            </div>
          )}

          {/* ── Results ── */}
          {searched && !hardcoverBook && results.length === 0 && !isSearching && !searchError && (
            <div style={{
              textAlign: "center", padding: "20px 0",
              fontSize: 13, color: "#9ca3af", fontWeight: 500,
            }}>
              No results found.{" "}
              <button
                onClick={handleAddManually}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6", fontWeight: 600, fontSize: 13, fontFamily: FONT, textDecoration: "underline" }}
              >
                Add manually?
              </button>
            </div>
          )}

          {results.length > 0 && !hardcoverBook && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: "#79869c" }}>
                {results.length} Result{results.length !== 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className="cdlAddResult"
                  >
                    {/* Cover thumbnail */}
                    <div style={{
                      ...resultThumbnailSize, borderRadius: 8,
                      overflow: "hidden", flexShrink: 0,
                      background: "rgba(149,161,178,0.18)",
                      border: "1px solid rgba(149,161,178,0.22)",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
                    }}>
                      {result.imageUrl ? (
                        <img
                          src={result.imageUrl}
                          alt=""
                          style={{ width: "100%", height: "100%", objectFit: "cover", ...COVER_IMAGE_RADIUS_STYLE }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, opacity: 0.4 }}>
                          {selectedType === "movie" ? "🎬" : selectedType === "tv" ? "📺" : selectedType === "game" ? "🎮" : "📚"}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#1e293b", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {result.title}
                      </div>
                      {result.subtitle && (
                        <div style={{ fontSize: 11.5, color: "#6b7280", fontWeight: 400, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                          {result.subtitle}
                        </div>
                      )}
                      {result.year && (
                        <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500, marginTop: 2 }}>
                          {result.year}
                        </div>
                      )}
                    </div>

                    {/* Arrow */}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.35 }}>
                      <path d="M9 18l6-6-6-6" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
