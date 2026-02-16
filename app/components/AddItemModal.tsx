"use client";

import React, { useEffect, useMemo, useState } from "react";

export type AddMediaType = "book" | "tv" | "movie" | "game";

export type AddItemPayload = {
  type: AddMediaType;
  values: Record<string, string>;
};

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  year?: string;
  imageUrl?: string;
  data: Record<string, string>;
};

type AddItemModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (payload: AddItemPayload) => Promise<void>;
  isSaving?: boolean;
  saveError?: string | null;
  gamePlatformOptions?: string[];
  gameStatusOptions?: string[];
  gameOwnershipOptions?: string[];
  gameFormatOptions?: string[];
};

const TYPE_OPTIONS: Array<{ type: AddMediaType; label: string; source: string }> = [
  { type: "book", label: "Book", source: "Google Books" },
  { type: "tv", label: "TV Show", source: "TMDB" },
  { type: "movie", label: "Movie", source: "TMDB" },
  { type: "game", label: "Game", source: "IGDB" },
];

const BOOK_STATUS_OPTIONS = ["Reading", "Completed", "Backlog", "Abandoned", "Paused", "Wishlist"];
const BOOK_OWNERSHIP_OPTIONS = ["Owned", "Wishlist", "Borrowed", "Library", "Kindle Unlimited", "Gifted"];
const BOOK_TYPE_OPTIONS = ["Physical", "eBook", "Audiobook", "Graphic Novel"];
const SHOW_WATCH_STATUS_OPTIONS = ["Watching", "Completed", "Backlog", "Abandoned", "Watch Next", "Paused", "Pending Return"];
const SHOW_STATUS_OPTIONS = ["Ended", "Returning Series", "Canceled"];
const MOVIE_WATCH_STATUS_OPTIONS = ["Watched", "Watching", "Backlog", "Abandoned"];
const MOVIE_STATUS_OPTIONS = ["Released", "Upcoming", "In Production", "Canceled"];

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function currentDateIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function splitCommaValues(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function isTruthyOption(value: string): boolean {
  const normalized = safeStr(value).toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "1";
}

function getDefaultValues(type: AddMediaType): Record<string, string> {
  if (type === "book") {
    return {
      title: "",
      subtitle: "",
      author: "",
      series: "",
      releaseDate: "",
      completedDate: "",
      isbn: "",
      pages: "",
      genre: "",
      status: "Backlog",
      ownership: "Owned",
      type: "Physical",
      description: "",
      imageUrl: "",
      googleBooksVolumeId: "",
      openLibraryWorkKey: "",
      tags: "",
      myRating: "",
      userRating: "",
      audiobookDuration: "",
    };
  }
  if (type === "tv") {
    return {
      title: "",
      year: "",
      firstAirDate: "",
      lastAirDate: "",
      numberOfSeasons: "",
      numberOfEpisodes: "",
      watchStatus: "Backlog",
      showStatus: "",
      networks: "",
      streamingUS: "",
      genres: "",
      tmdbRating: "",
      myRating: "",
      overview: "",
      posterUrl: "",
      backdropUrl: "",
      tmdbId: "",
      tags: "",
      dateCompleted: "",
    };
  }
  if (type === "movie") {
    return {
      title: "",
      year: "",
      releaseDate: "",
      runtime: "",
      watchStatus: "Backlog",
      watchDate: "",
      status: "Released",
      genres: "",
      tmdbRating: "",
      myRating: "",
      overview: "",
      posterUrl: "",
      backdropUrl: "",
      tmdbId: "",
      ownership: "Owned",
      tags: "",
    };
  }
    return {
      title: "",
      platform: "",
      platforms: "",
      releaseDate: "",
      releaseDateAlt: "",
      status: "Backlog",
      ownership: "Owned",
      format: "Digital",
    genres: "",
    developer: "",
    igdbRating: "",
    myRating: "",
    description: "",
    coverUrl: "",
      igdbId: "",
      igdbIdOverride: "",
      dateAdded: currentDateIso(),
      backlog: "No",
      completed: "No",
      dateCompleted: "",
      yearPlayed: "",
      hoursPlayed: "",
      screensotsUrl: "",
      tags: "",
    };
}

function mergeValues(type: AddMediaType, incoming?: Record<string, string>): Record<string, string> {
  return {
    ...getDefaultValues(type),
    ...(incoming || {}),
  };
}

function FieldRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="addFieldRow">
      <div className="addFieldLabel">{label}</div>
      {children}
    </label>
  );
}

export const AddItemModal: React.FC<AddItemModalProps> = ({
  open,
  onClose,
  onSave,
  isSaving = false,
  saveError,
  gamePlatformOptions = [],
  gameStatusOptions = [],
  gameOwnershipOptions = [],
  gameFormatOptions = [],
}) => {
  const [type, setType] = useState<AddMediaType>("book");
  const [query, setQuery] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [values, setValues] = useState<Record<string, string>>(getDefaultValues("book"));
  const [editMode, setEditMode] = useState(false);

  const typeMeta = useMemo(
    () => TYPE_OPTIONS.find((entry) => entry.type === type) || TYPE_OPTIONS[0],
    [type]
  );
  const gamePlatformChoices = useMemo(() => {
    const values = gamePlatformOptions
      .flatMap((option) => splitCommaValues(safeStr(option)))
      .map((option) => option.trim())
      .filter(Boolean);
    return Array.from(new Set(values));
  }, [gamePlatformOptions]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSearchError(null);
    setValidationError(null);
    setResults([]);
    setEditMode(false);
    setType("book");
    setValues(getDefaultValues("book"));
  }, [open]);

  const setTypeAndReset = (nextType: AddMediaType) => {
    setType(nextType);
    setResults([]);
    setQuery("");
    setSearchError(null);
    setValidationError(null);
    setEditMode(false);
    setValues(getDefaultValues(nextType));
  };

  const runSearch = async () => {
    const q = safeStr(query);
    if (!q) {
      setSearchError("Enter a title to search.");
      return;
    }
    setSearchLoading(true);
    setSearchError(null);
    try {
      const params = new URLSearchParams({ type, query: q });
      const res = await fetch(`/api/media-search?${params.toString()}`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        results?: SearchResult[];
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || "Search failed");
      }
      setResults(Array.isArray(payload.results) ? payload.results : []);
      if (!payload.results?.length) {
        setSearchError("No results found. You can add this item manually.");
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Search failed";
      setSearchError(message);
      setResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const chooseResult = (result: SearchResult) => {
    setValues(mergeValues(type, result.data));
    setEditMode(true);
  };

  const startManual = () => {
    setValues((prev) => mergeValues(type, { ...prev, title: safeStr(prev.title) || safeStr(query) }));
    setEditMode(true);
  };

  const handleChange = (key: string, value: string) => {
    if (validationError) setValidationError(null);
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!safeStr(values.title)) {
      setValidationError("Title is required.");
      return;
    }
    if (type === "book") {
      const missing = ["status", "ownership", "type"].filter((key) => !safeStr(values[key]));
      if (missing.length) {
        setValidationError("Status, Ownership, and Type are required for books.");
        return;
      }
    }
    if (type === "tv") {
      const missing = ["watchStatus"].filter((key) => !safeStr(values[key]));
      if (missing.length) {
        setValidationError("Watch Status is required for TV shows.");
        return;
      }
    }
    if (type === "movie") {
      const missing = ["watchStatus"].filter((key) => !safeStr(values[key]));
      if (missing.length) {
        setValidationError("Watch Status is required for movies.");
        return;
      }
    }
    if (type === "game") {
      const missing = ["platform", "status", "ownership", "format"].filter((key) => !safeStr(values[key]));
      if (missing.length) {
        setValidationError("Platform, Status, Ownership, and Format are required for games.");
        return;
      }
    }
    try {
      await onSave({ type, values });
    } catch {
      // Parent sets and displays saveError.
    }
  };

  if (!open) return null;

  return (
    <div className="addModalOverlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="addModalCard">
        <button type="button" className="addCloseButton" onClick={onClose} aria-label="Close add item modal">
          ×
        </button>

        <div className="addHeader">Add New Item</div>
        <div className="addSubheader">Choose type, search, then edit before saving.</div>

        {!editMode ? (
          <>
            <div className="addTypeGrid">
              {TYPE_OPTIONS.map((option) => {
                const active = option.type === type;
                return (
                  <button
                    key={option.type}
                    type="button"
                    className={`addTypeButton${active ? " active" : ""}`}
                    onClick={() => setTypeAndReset(option.type)}
                  >
                    <div>{option.label}</div>
                    <div className="addTypeSource">{option.source}</div>
                  </button>
                );
              })}
            </div>

            <div className="addSearchRow">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void runSearch();
                  }
                }}
                placeholder={`Search ${typeMeta.label} title...`}
                className="addSearchInput"
              />
              <button type="button" className="addSearchButton" onClick={() => void runSearch()} disabled={searchLoading}>
                {searchLoading ? "Searching..." : "Search"}
              </button>
            </div>

            {searchError ? <div className="addSearchError">{searchError}</div> : null}

            {results.length ? (
              <div className="addResultsList">
                {results.map((result) => (
                  <button key={result.id} type="button" className="addResultItem" onClick={() => chooseResult(result)}>
                    {result.imageUrl ? <img src={result.imageUrl} alt="" className="addResultImage" /> : <div className="addResultImagePlaceholder">No image</div>}
                    <div className="addResultText">
                      <div className="addResultTitle">{result.title}</div>
                      <div className="addResultMeta">{[result.subtitle, result.year].filter(Boolean).join(" · ") || "No extra details"}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}

            <button type="button" className="addManualButton" onClick={startManual}>
              Add Manually Instead
            </button>
          </>
        ) : (
          <>
            <div className="addEditHeader">Editing {typeMeta.label} Details</div>
            <div className={`addFormGrid${type === "book" || type === "tv" || type === "movie" || type === "game" ? " bookAddFormGrid" : ""}`}>
              <FieldRow label="Title">
                <input
                  value={values.title || ""}
                  onChange={(event) => handleChange("title", event.target.value)}
                  className="addFieldInput requiredField"
                />
              </FieldRow>

              {type === "book" ? (
                <>
                  <div className="bookCoverDescriptionRow">
                    <div className="addFieldRow bookCoverFieldRow">
                      <div className="addFieldLabel">Cover</div>
                      <div className="bookCoverPane">
                        {safeStr(values.imageUrl) ? (
                          <img src={safeStr(values.imageUrl)} alt="Book cover preview" className="bookCoverPreview" />
                        ) : (
                          <div className="bookCoverPlaceholder">Cover Preview</div>
                        )}
                      </div>
                    </div>
                    <FieldRow label="Description">
                      <textarea value={values.description || ""} onChange={(event) => handleChange("description", event.target.value)} className="addFieldTextarea bookDescriptionTextarea" />
                    </FieldRow>
                  </div>
                  <FieldRow label="Subtitle"><input value={values.subtitle || ""} onChange={(event) => handleChange("subtitle", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Series (Optional)"><input value={values.series || ""} onChange={(event) => handleChange("series", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Author"><input value={values.author || ""} onChange={(event) => handleChange("author", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Status">
                    <select value={values.status || ""} onChange={(event) => handleChange("status", event.target.value)} className="addFieldInput requiredField">
                      {BOOK_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Ownership">
                    <select value={values.ownership || ""} onChange={(event) => handleChange("ownership", event.target.value)} className="addFieldInput requiredField">
                      {BOOK_OWNERSHIP_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Type">
                    <select value={values.type || ""} onChange={(event) => handleChange("type", event.target.value)} className="addFieldInput requiredField">
                      {BOOK_TYPE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Release Date"><input value={values.releaseDate || ""} onChange={(event) => handleChange("releaseDate", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Completed Date"><input value={values.completedDate || ""} onChange={(event) => handleChange("completedDate", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="ISBN"><input value={values.isbn || ""} onChange={(event) => handleChange("isbn", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Pages"><input value={values.pages || ""} onChange={(event) => handleChange("pages", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Audiobook Duration (Optional)"><input value={values.audiobookDuration || ""} onChange={(event) => handleChange("audiobookDuration", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Genre"><input value={values.genre || ""} onChange={(event) => handleChange("genre", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Image URL"><input value={values.imageUrl || ""} onChange={(event) => handleChange("imageUrl", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Google Books ID"><input value={values.googleBooksVolumeId || ""} onChange={(event) => handleChange("googleBooksVolumeId", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="OpenLibrary Work Key"><input value={values.openLibraryWorkKey || ""} onChange={(event) => handleChange("openLibraryWorkKey", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Tags (Optional)"><input value={values.tags || ""} onChange={(event) => handleChange("tags", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="User Rating"><input value={values.userRating || ""} onChange={(event) => handleChange("userRating", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="My Rating (Optional)"><input value={values.myRating || ""} onChange={(event) => handleChange("myRating", event.target.value)} className="addFieldInput" /></FieldRow>
                </>
              ) : null}

              {type === "tv" ? (
                <>
                  <div className="bookCoverDescriptionRow">
                    <div className="addFieldRow bookCoverFieldRow">
                      <div className="addFieldLabel">Poster</div>
                      <div className="bookCoverPane">
                        {safeStr(values.posterUrl) ? (
                          <img src={safeStr(values.posterUrl)} alt="TV show poster preview" className="bookCoverPreview" />
                        ) : (
                          <div className="bookCoverPlaceholder">Poster Preview</div>
                        )}
                      </div>
                    </div>
                    <FieldRow label="Overview">
                      <textarea value={values.overview || ""} onChange={(event) => handleChange("overview", event.target.value)} className="addFieldTextarea bookDescriptionTextarea" />
                    </FieldRow>
                  </div>
                  <FieldRow label="Year"><input value={values.year || ""} onChange={(event) => handleChange("year", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="First Air Date"><input value={values.firstAirDate || ""} onChange={(event) => handleChange("firstAirDate", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Last Air Date"><input value={values.lastAirDate || ""} onChange={(event) => handleChange("lastAirDate", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="# Seasons"><input value={values.numberOfSeasons || ""} onChange={(event) => handleChange("numberOfSeasons", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="# Episodes"><input value={values.numberOfEpisodes || ""} onChange={(event) => handleChange("numberOfEpisodes", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Watch Status">
                    <select value={values.watchStatus || ""} onChange={(event) => handleChange("watchStatus", event.target.value)} className="addFieldInput requiredField">
                      {SHOW_WATCH_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Show Status">
                    <select value={values.showStatus || ""} onChange={(event) => handleChange("showStatus", event.target.value)} className="addFieldInput">
                      <option value="">(none)</option>
                      {SHOW_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Genres"><input value={values.genres || ""} onChange={(event) => handleChange("genres", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Networks"><input value={values.networks || ""} onChange={(event) => handleChange("networks", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Streaming US"><input value={values.streamingUS || ""} onChange={(event) => handleChange("streamingUS", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Poster URL"><input value={values.posterUrl || ""} onChange={(event) => handleChange("posterUrl", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Backdrop URL"><input value={values.backdropUrl || ""} onChange={(event) => handleChange("backdropUrl", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="TMDB ID"><input value={values.tmdbId || ""} onChange={(event) => handleChange("tmdbId", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="TMDB Rating"><input value={values.tmdbRating || ""} onChange={(event) => handleChange("tmdbRating", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="My Rating"><input value={values.myRating || ""} onChange={(event) => handleChange("myRating", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Tags"><input value={values.tags || ""} onChange={(event) => handleChange("tags", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Date Completed"><input value={values.dateCompleted || ""} onChange={(event) => handleChange("dateCompleted", event.target.value)} className="addFieldInput" /></FieldRow>
                </>
              ) : null}

              {type === "movie" ? (
                <>
                  <div className="bookCoverDescriptionRow">
                    <div className="addFieldRow bookCoverFieldRow">
                      <div className="addFieldLabel">Poster</div>
                      <div className="bookCoverPane">
                        {safeStr(values.posterUrl) || safeStr(values.poster) ? (
                          <img src={safeStr(values.posterUrl) || safeStr(values.poster)} alt="Movie poster preview" className="bookCoverPreview" />
                        ) : (
                          <div className="bookCoverPlaceholder">Poster Preview</div>
                        )}
                      </div>
                    </div>
                    <FieldRow label="Overview">
                      <textarea value={values.overview || ""} onChange={(event) => handleChange("overview", event.target.value)} className="addFieldTextarea bookDescriptionTextarea" />
                    </FieldRow>
                  </div>
                  <FieldRow label="Year"><input value={values.year || ""} onChange={(event) => handleChange("year", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Release Date"><input value={values.releaseDate || ""} onChange={(event) => handleChange("releaseDate", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Runtime"><input value={values.runtime || ""} onChange={(event) => handleChange("runtime", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Watch Status">
                    <select value={values.watchStatus || ""} onChange={(event) => handleChange("watchStatus", event.target.value)} className="addFieldInput requiredField">
                      {MOVIE_WATCH_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Release Status">
                    <select value={values.status || ""} onChange={(event) => handleChange("status", event.target.value)} className="addFieldInput">
                      <option value="">(none)</option>
                      {MOVIE_STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                      {values.status && !MOVIE_STATUS_OPTIONS.includes(values.status) ? (
                        <option value={values.status}>{values.status}</option>
                      ) : null}
                    </select>
                  </FieldRow>
                  <FieldRow label="Genres"><input value={values.genres || ""} onChange={(event) => handleChange("genres", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Poster URL"><input value={values.posterUrl || ""} onChange={(event) => handleChange("posterUrl", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Backdrop URL"><input value={values.backdropUrl || ""} onChange={(event) => handleChange("backdropUrl", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="TMDB ID"><input value={values.tmdbId || ""} onChange={(event) => handleChange("tmdbId", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="TMDB Rating"><input value={values.tmdbRating || ""} onChange={(event) => handleChange("tmdbRating", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="My Rating"><input value={values.myRating || ""} onChange={(event) => handleChange("myRating", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Watch Date"><input value={values.watchDate || ""} onChange={(event) => handleChange("watchDate", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Tags"><input value={values.tags || ""} onChange={(event) => handleChange("tags", event.target.value)} className="addFieldInput" /></FieldRow>
                </>
              ) : null}

              {type === "game" ? (
                <>
                  <div className="bookCoverDescriptionRow">
                    <div className="addFieldRow bookCoverFieldRow">
                      <div className="addFieldLabel">Cover</div>
                      <div className="bookCoverPane">
                        {safeStr(values.coverUrl) || safeStr(values.cover) ? (
                          <img src={safeStr(values.coverUrl) || safeStr(values.cover)} alt="Game cover preview" className="bookCoverPreview" />
                        ) : (
                          <div className="bookCoverPlaceholder">Cover Preview</div>
                        )}
                      </div>
                    </div>
                    <FieldRow label="Description">
                      <textarea value={values.description || ""} onChange={(event) => handleChange("description", event.target.value)} className="addFieldTextarea bookDescriptionTextarea" />
                    </FieldRow>
                  </div>
                  <FieldRow label="Platform">
                    <select value={values.platform || ""} onChange={(event) => handleChange("platform", event.target.value)} className="addFieldInput requiredField">
                      <option value="">(select platform)</option>
                      {gamePlatformChoices.map((option) => <option key={option} value={option}>{option}</option>)}
                      {values.platform && !gamePlatformChoices.includes(values.platform) ? (
                        <option value={values.platform}>{values.platform}</option>
                      ) : null}
                    </select>
                  </FieldRow>
                  <FieldRow label="Available Platforms">
                    <input
                      value={values.platforms || ""}
                      onChange={(event) => handleChange("platforms", event.target.value)}
                      className="addFieldInput"
                    />
                  </FieldRow>
                  <FieldRow label="Release Date"><input value={values.releaseDateAlt || values.releaseDate || ""} onChange={(event) => handleChange("releaseDateAlt", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Status">
                    <select value={values.status || ""} onChange={(event) => handleChange("status", event.target.value)} className="addFieldInput requiredField">
                      <option value="">(none)</option>
                      {[...new Set(["Backlog", ...gameStatusOptions])].map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Ownership">
                    <select value={values.ownership || ""} onChange={(event) => handleChange("ownership", event.target.value)} className="addFieldInput requiredField">
                      {[...new Set(["Owned", ...gameOwnershipOptions])].map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Format">
                    <select value={values.format || ""} onChange={(event) => handleChange("format", event.target.value)} className="addFieldInput requiredField">
                      {[...new Set(["Digital", ...gameFormatOptions])].map((option) => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </FieldRow>
                  <FieldRow label="Genres"><input value={values.genres || ""} onChange={(event) => handleChange("genres", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Developer"><input value={values.developer || ""} onChange={(event) => handleChange("developer", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Cover URL"><input value={values.coverUrl || ""} onChange={(event) => handleChange("coverUrl", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="IGDB ID"><input value={values.igdbId || ""} onChange={(event) => handleChange("igdbId", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="IGDB ID Override"><input value={values.igdbIdOverride || ""} onChange={(event) => handleChange("igdbIdOverride", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="IGDB Rating"><input value={values.igdbRating || ""} onChange={(event) => handleChange("igdbRating", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="My Rating"><input value={values.myRating || ""} onChange={(event) => handleChange("myRating", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Date Completed"><input value={values.dateCompleted || ""} onChange={(event) => handleChange("dateCompleted", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Date Added"><input value={values.dateAdded || ""} onChange={(event) => handleChange("dateAdded", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Year Played"><input value={values.yearPlayed || ""} onChange={(event) => handleChange("yearPlayed", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Hours Played"><input value={values.hoursPlayed || ""} onChange={(event) => handleChange("hoursPlayed", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Screensots URL"><input value={values.screensotsUrl || ""} onChange={(event) => handleChange("screensotsUrl", event.target.value)} className="addFieldInput" /></FieldRow>
                  <FieldRow label="Backlog">
                    <div className="addBooleanChoiceGroup">
                      <label className="addBooleanOption">
                        <input
                          type="checkbox"
                          checked={isTruthyOption(values.backlog || "")}
                          onChange={() => handleChange("backlog", "Yes")}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="addBooleanOption">
                        <input
                          type="checkbox"
                          checked={!isTruthyOption(values.backlog || "")}
                          onChange={() => handleChange("backlog", "No")}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </FieldRow>
                  <FieldRow label="Completed">
                    <div className="addBooleanChoiceGroup">
                      <label className="addBooleanOption">
                        <input
                          type="checkbox"
                          checked={isTruthyOption(values.completed || "")}
                          onChange={() => handleChange("completed", "Yes")}
                        />
                        <span>Yes</span>
                      </label>
                      <label className="addBooleanOption">
                        <input
                          type="checkbox"
                          checked={!isTruthyOption(values.completed || "")}
                          onChange={() => handleChange("completed", "No")}
                        />
                        <span>No</span>
                      </label>
                    </div>
                  </FieldRow>
                </>
              ) : null}
            </div>

            {validationError ? <div className="addSearchError">{validationError}</div> : null}
            {saveError ? <div className="addSearchError">{saveError}</div> : null}

            <div className="addFooterActions">
              <button type="button" className="addManualButton" onClick={() => setEditMode(false)} disabled={isSaving}>
                Back to Search
              </button>
              <button
                type="button"
                className="addSearchButton"
                onClick={() => void handleSubmit()}
                disabled={isSaving || !safeStr(values.title)}
              >
                {isSaving ? "Saving..." : "Save and Add to Library"}
              </button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .addModalOverlay {
          position: fixed;
          inset: 0;
          z-index: 12000;
          background: rgba(5, 10, 18, 0.72);
          backdrop-filter: blur(4px);
          display: grid;
          place-items: center;
          padding: 16px;
        }
        .addModalCard {
          width: min(940px, 96vw);
          max-height: 94vh;
          overflow: auto;
          border-radius: 16px;
          border: 1px solid rgba(130, 165, 219, 0.4);
          background: linear-gradient(180deg, rgba(10, 24, 44, 0.95) 0%, rgba(8, 19, 36, 0.95) 100%);
          color: rgba(235, 244, 255, 0.94);
          box-shadow: 0 22px 55px rgba(0, 0, 0, 0.5);
          padding: 16px;
          position: relative;
        }
        .addCloseButton {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: 1px solid rgba(141, 172, 224, 0.44);
          background: rgba(20, 39, 69, 0.9);
          color: #e7f0ff;
          cursor: pointer;
          font-size: 24px;
          line-height: 1;
        }
        .addHeader {
          font-size: 20px;
          font-weight: 800;
        }
        .addSubheader {
          margin-top: 4px;
          font-size: 12px;
          color: rgba(205, 225, 255, 0.75);
        }
        .addTypeGrid {
          margin-top: 14px;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 8px;
        }
        .addTypeButton {
          border-radius: 10px;
          border: 1px solid rgba(141, 172, 224, 0.32);
          background: rgba(21, 41, 73, 0.72);
          color: rgba(223, 237, 255, 0.92);
          padding: 10px;
          text-align: left;
          cursor: pointer;
          font-weight: 700;
        }
        .addTypeButton.active {
          border-color: rgba(168, 205, 255, 0.95);
          background: rgba(44, 83, 139, 0.92);
          box-shadow: 0 0 0 1px rgba(194, 222, 255, 0.55);
        }
        .addTypeSource {
          font-size: 11px;
          font-weight: 500;
          opacity: 0.78;
          margin-top: 3px;
        }
        .addSearchRow {
          margin-top: 12px;
          display: flex;
          gap: 8px;
        }
        .addSearchInput,
        .addFieldInput,
        .addFieldTextarea {
          width: 100%;
          border-radius: 9px;
          border: 1px solid rgba(136, 168, 220, 0.36);
          background: rgba(15, 31, 56, 0.84);
          color: #ebf4ff;
          padding: 9px 10px;
          font-size: 13px;
        }
        .addFieldTextarea {
          min-height: 74px;
          resize: vertical;
        }
        .addFieldInput.requiredField {
          border-color: rgba(255, 119, 198, 0.95);
          box-shadow: 0 0 0 1px rgba(255, 119, 198, 0.35);
        }
        .addSearchButton,
        .addManualButton {
          border-radius: 9px;
          border: 1px solid rgba(141, 172, 224, 0.5);
          background: rgba(38, 72, 120, 0.9);
          color: #f2f8ff;
          font-weight: 700;
          padding: 9px 12px;
          cursor: pointer;
          white-space: nowrap;
        }
        .addSearchButton:disabled,
        .addManualButton:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }
        .addSearchError {
          margin-top: 8px;
          padding: 8px 10px;
          border-radius: 8px;
          border: 1px solid rgba(242, 124, 124, 0.42);
          color: rgba(255, 203, 203, 0.95);
          background: rgba(116, 23, 23, 0.35);
          font-size: 12px;
          font-weight: 700;
        }
        .addResultsList {
          margin-top: 10px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow: auto;
        }
        .addResultItem {
          border-radius: 10px;
          border: 1px solid rgba(137, 170, 224, 0.3);
          background: rgba(20, 38, 66, 0.86);
          display: grid;
          grid-template-columns: 52px minmax(0, 1fr);
          gap: 10px;
          padding: 8px;
          color: inherit;
          text-align: left;
          cursor: pointer;
        }
        .addResultImage,
        .addResultImagePlaceholder {
          width: 52px;
          height: 72px;
          border-radius: 6px;
          object-fit: cover;
          background: rgba(255, 255, 255, 0.1);
          display: grid;
          place-items: center;
          font-size: 10px;
          color: rgba(219, 234, 255, 0.75);
        }
        .addResultTitle {
          font-size: 14px;
          font-weight: 700;
        }
        .addResultMeta {
          margin-top: 3px;
          font-size: 12px;
          opacity: 0.78;
        }
        .addManualButton {
          margin-top: 10px;
          background: rgba(24, 52, 88, 0.95);
        }
        .addEditHeader {
          margin-top: 12px;
          font-size: 14px;
          font-weight: 800;
          color: rgba(224, 238, 255, 0.92);
        }
        .addFormGrid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .bookAddFormGrid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .bookCoverDescriptionRow {
          grid-column: 1 / -1;
          display: grid;
          grid-template-columns: 170px minmax(0, 1fr);
          gap: 12px;
          align-items: start;
        }
        .bookCoverPane {
          border-radius: 10px;
          border: 1px solid rgba(138, 171, 224, 0.34);
          background: rgba(12, 27, 50, 0.82);
          overflow: hidden;
          min-height: 250px;
        }
        .bookCoverFieldRow {
          height: 100%;
        }
        .bookCoverPreview {
          display: block;
          width: 100%;
          height: 250px;
          object-fit: cover;
          background: rgba(255, 255, 255, 0.08);
        }
        .bookCoverPlaceholder {
          width: 100%;
          min-height: 250px;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 700;
          color: rgba(208, 224, 255, 0.7);
          background: linear-gradient(180deg, rgba(20, 42, 76, 0.9) 0%, rgba(13, 30, 56, 0.9) 100%);
        }
        .bookDescriptionTextarea {
          min-height: 250px;
        }
        .addFieldRow {
          display: flex;
          flex-direction: column;
          gap: 5px;
          min-width: 0;
        }
        .addFieldLabel {
          font-size: 11px;
          font-weight: 700;
          color: rgba(203, 223, 255, 0.82);
        }
        .addBooleanChoiceGroup {
          display: flex;
          align-items: center;
          gap: 14px;
          min-height: 36px;
          padding: 0 2px;
        }
        .addBooleanOption {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: rgba(227, 238, 255, 0.9);
        }
        .addBooleanOption input {
          accent-color: rgba(255, 119, 198, 0.95);
          width: 14px;
          height: 14px;
        }
        .addFooterActions {
          margin-top: 12px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
        }
        @media (max-width: 860px) {
          .addTypeGrid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .addFormGrid {
            grid-template-columns: minmax(0, 1fr);
          }
          .bookAddFormGrid {
            grid-template-columns: minmax(0, 1fr);
          }
          .bookCoverDescriptionRow {
            grid-template-columns: minmax(0, 1fr);
          }
          .bookCoverPane {
            max-width: 220px;
          }
          .addFooterActions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};
