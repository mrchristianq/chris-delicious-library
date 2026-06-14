"use client";

import React, { useEffect, useRef, useState } from "react";
import { fetchMediaSearch } from "../lib/mediaSearchClient";
import { COVER_IMAGE_RADIUS_STYLE } from "./coverStyles";

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

const TYPE_OPTIONS: Array<{ type: AddExtendedType; label: string; sub?: string; emoji: string }> = [
  { type: "movie",          label: "Movie",   emoji: "🎬" },
  { type: "tv",             label: "TV Show", emoji: "📺" },
  { type: "game",           label: "Game",    emoji: "🎮" },
  { type: "book-audnexus",  label: "Book",    sub: "Audnexus",     emoji: "🎧" },
  { type: "book-hardcover", label: "Book",    sub: "Hardcover",    emoji: "📖" },
];

const BOOK_FORMAT_OPTIONS = [
  { value: "Physical",  label: "Physical",  emoji: "📖" },
  { value: "Audiobook", label: "Audiobook", emoji: "🎧" },
  { value: "eBook",     label: "eBook",     emoji: "📱" },
];

const FONT = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif';

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
  }, [open, selectedType, query, isSearching, onClose]);

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed", inset: 0, zIndex: isMobileLayout ? 2400 : 9200,
        background: isMobileLayout ? "transparent" : "rgba(7,10,16,0.48)",
        backdropFilter: isMobileLayout ? "none" : "blur(16px) saturate(1.1)",
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
          width: isMobileLayout ? "100%" : "min(580px, 100%)",
          height: isMobileLayout ? "100%" : "auto",
          borderRadius: isMobileLayout ? 0 : 18,
          border: "1px solid rgba(255,255,255,0.58)",
          background: "linear-gradient(180deg, rgba(251,252,254,0.97) 0%, rgba(241,244,249,0.99) 100%)",
          boxShadow: isMobileLayout ? "none" : "0 28px 56px rgba(10,18,36,0.30), inset 0 1px 0 rgba(255,255,255,0.90)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Title bar */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "11px 16px",
          borderBottom: "1px solid rgba(167,177,191,0.38)",
          background: "linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(246,248,252,0.60) 100%)",
          userSelect: "none",
        }}>
          <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
            <button onClick={onClose} aria-label="Close" style={trafficBtn("#ff5f57", "#ff3b30")} />
            <button style={trafficBtn("#febc2e", "#ffab00")} />
            <button style={trafficBtn("#28c840", "#25b335")} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#374151", letterSpacing: 0.1, flex: 1, textAlign: "center", marginRight: 60 }}>
            {selectedType ? `Add ${typeLabel(selectedType)}` : "Add to Library"}
          </span>
        </div>

        <div style={{ padding: isMobileLayout ? "16px 16px calc(env(safe-area-inset-bottom, 0px) + 112px)" : "20px 20px 24px", display: "flex", flexDirection: "column", gap: 20, overflow: "auto", maxHeight: isMobileLayout ? "none" : "calc(100vh - 120px)" }}>

          {/* ── Step 1: Type picker ── */}
          {!selectedType && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ margin: 0, fontSize: 12, color: "#6b7280", textAlign: "center", fontWeight: 500 }}>
                What type of media would you like to add?
              </p>
              <div style={{ display: "grid", gridTemplateColumns: isMobileLayout ? "1fr" : "repeat(5, 1fr)", gap: isMobileLayout ? 10 : 8 }}>
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.type}
                    onClick={() => {
                      setSelectedType(opt.type);
                      if (opt.type === "book-audnexus") setBookFormat("Audiobook");
                    }}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: isMobileLayout ? 12 : 10,
                      padding: isMobileLayout ? "12px 12px 10px" : "14px 10px",
                      minHeight: isMobileLayout ? 96 : undefined,
                      background: "rgba(255,255,255,0.85)",
                      border: "1px solid rgba(149,161,178,0.36)",
                      borderRadius: 13,
                      boxShadow: "0 1px 4px rgba(10,18,36,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                      fontFamily: FONT,
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,1)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 12px rgba(10,18,36,0.12), inset 0 1px 0 rgba(255,255,255,0.9)";
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.85)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 4px rgba(10,18,36,0.07), inset 0 1px 0 rgba(255,255,255,0.9)";
                      (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{ fontSize: isMobileLayout ? 34 : 24, lineHeight: 1 }}>{opt.emoji}</span>
                    <span style={{ fontSize: isMobileLayout ? 18 : 12, fontWeight: 700, color: "#1e293b", letterSpacing: 0.1, textAlign: "center" }}>{opt.label}</span>
                    {opt.sub && (
                      <span style={{ fontSize: isMobileLayout ? 13 : 10, fontWeight: 500, color: "#6b7280", letterSpacing: 0.1, textAlign: "center" }}>{opt.sub}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Edition/detail view (provider-backed books, after a result is picked) ── */}
          {hardcoverBook && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <button
                onClick={() => { setHardcoverBook(null); setEditionResults([]); setEditionsError(null); }}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 4,
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 11.5, fontWeight: 600, color: "#6b7280",
                  padding: "2px 0", alignSelf: "flex-start", fontFamily: FONT,
                }}
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
                        style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                          background: "rgba(255,255,255,0.80)",
                          border: "1px solid rgba(149,161,178,0.28)",
                          borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%",
                          fontFamily: FONT, transition: "all 0.1s ease",
                          boxShadow: "0 1px 3px rgba(10,18,36,0.05)",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,1)";
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 3px 10px rgba(10,18,36,0.10)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,130,246,0.40)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.80)";
                          (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 3px rgba(10,18,36,0.05)";
                          (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(149,161,178,0.28)";
                        }}
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
                        padding: "9px 12px",
                        background: active ? "linear-gradient(180deg, rgba(59,130,246,0.14) 0%, rgba(37,99,235,0.10) 100%)" : "rgba(255,255,255,0.80)",
                        border: active ? "1px solid rgba(59,130,246,0.55)" : "1px solid rgba(149,161,178,0.36)",
                        borderRadius: 10,
                        boxShadow: active ? "0 2px 8px rgba(37,99,235,0.12), inset 0 1px 0 rgba(255,255,255,0.9)" : "0 1px 3px rgba(10,18,36,0.06)",
                        cursor: "pointer",
                        fontFamily: FONT,
                        transition: "all 0.1s ease",
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{opt.emoji}</span>
                      <span style={{ fontSize: 12, fontWeight: active ? 700 : 500, color: active ? "#1d4ed8" : "#374151" }}>
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
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: 11.5, fontWeight: 600, color: "#6b7280",
                    padding: "2px 0", alignSelf: "flex-start", fontFamily: FONT,
                  }}
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
                  style={{
                    flex: 1,
                    border: "1px solid rgba(149,161,178,0.52)",
                    borderRadius: 10,
                    padding: "9px 12px",
                    background: "rgba(255,255,255,0.94)",
                    fontSize: isMobileLayout ? 16 : 13,
                    color: "#1c2738",
                    fontFamily: FONT,
                    outline: "none",
                    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.06)",
                  }}
                />
                {!isMobileLayout && (
                  <button
                    onClick={handleSearch}
                    disabled={!query.trim() || isSearching}
                    style={{
                      padding: "9px 18px",
                      background: (!query.trim() || isSearching)
                        ? "rgba(149,161,178,0.22)"
                        : "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                      border: "none",
                      borderRadius: 10,
                      color: (!query.trim() || isSearching) ? "#9ca3af" : "#fff",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: (!query.trim() || isSearching) ? "not-allowed" : "pointer",
                      fontFamily: FONT,
                      boxShadow: (!query.trim() || isSearching) ? "none" : "0 2px 8px rgba(37,99,235,0.28)",
                      whiteSpace: "nowrap",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {isSearching ? "Searching…" : "Search"}
                  </button>
                )}
              </div>

              {isMobileLayout && (
                <button
                  onClick={handleSearch}
                  disabled={!query.trim() || isSearching}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    background: (!query.trim() || isSearching)
                      ? "rgba(149,161,178,0.22)"
                      : "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                    border: "none",
                    borderRadius: 10,
                    color: (!query.trim() || isSearching) ? "#9ca3af" : "#fff",
                    fontSize: 13,
                    fontWeight: 650,
                    cursor: (!query.trim() || isSearching) ? "not-allowed" : "pointer",
                    fontFamily: FONT,
                    boxShadow: (!query.trim() || isSearching) ? "none" : "0 2px 8px rgba(37,99,235,0.28)",
                    transition: "all 0.1s ease",
                  }}
                >
                  {isSearching ? "Searching…" : "Search"}
                </button>
              )}

              {/* Add manually link */}
              <button
                onClick={handleAddManually}
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 11.5, fontWeight: 600, color: "#6b7280",
                  textDecoration: "underline", textDecorationStyle: "dotted",
                  alignSelf: "flex-start", padding: "2px 0", fontFamily: FONT,
                }}
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
              <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "#516279", letterSpacing: 0.25, textTransform: "uppercase" }}>
                {results.length} Result{results.length !== 1 ? "s" : ""}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {results.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                      background: "rgba(255,255,255,0.80)", border: "1px solid rgba(149,161,178,0.28)",
                      borderRadius: 12, cursor: "pointer", textAlign: "left", width: "100%",
                      fontFamily: FONT, transition: "all 0.1s ease",
                      boxShadow: "0 1px 3px rgba(10,18,36,0.05)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,1)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 3px 10px rgba(10,18,36,0.10)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(59,130,246,0.40)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.80)";
                      (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 1px 3px rgba(10,18,36,0.05)";
                      (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(149,161,178,0.28)";
                    }}
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

function trafficBtn(bg: string, shadow: string): React.CSSProperties {
  return {
    width: 12, height: 12, borderRadius: "50%",
    background: bg, border: "none", cursor: "pointer", padding: 0,
    boxShadow: `0 0 0 0.5px ${shadow}44`,
    flexShrink: 0,
  };
}
