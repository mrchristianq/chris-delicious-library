import React from "react";

interface MediaModalProps {
  item: Record<string, any> | null;
  open: boolean;
  onClose: () => void;
  onReplaceCover?: (item: Record<string, any>, file: File) => Promise<void> | void;
  onSaveBookEdits?: (item: Record<string, any>, updates: Record<string, string>) => Promise<void> | void;
  onSaveShowEdits?: (item: Record<string, any>, updates: Record<string, string>) => Promise<void> | void;
  isReplacingCover?: boolean;
  replaceCoverError?: string | null;
}

type InfoRow = {
  label: string;
  value: React.ReactNode;
  fullWidth?: boolean;
};

type BookEditField = {
  key: string;
  label: string;
  multiline?: boolean;
};

type ShowEditField = {
  key: string;
  label: string;
  multiline?: boolean;
};

const BOOK_EDIT_FIELDS: BookEditField[] = [
  { key: "series", label: "Series" },
  { key: "author", label: "Author" },
  { key: "ownership", label: "Ownership" },
  { key: "type", label: "Type" },
  { key: "status", label: "Status" },
  { key: "completedDate", label: "Completed Date" },
  { key: "isbn", label: "ISBN" },
  { key: "releaseDate", label: "Release Date" },
  { key: "imageUrl", label: "Image URL" },
  { key: "userRating", label: "User Rating" },
  { key: "myRating", label: "My Rating" },
  { key: "pages", label: "Pages" },
  { key: "audiobookDuration", label: "Audiobook Duration" },
  { key: "genre", label: "Genre" },
  { key: "tags", label: "Tags" },
  { key: "openLibraryWorkKey", label: "OpenLibrary Work Key" },
  { key: "googleBooksVolumeId", label: "Google Books Volume ID" },
  { key: "description", label: "Description", multiline: true },
];

const BOOK_STATUS_OPTIONS = ["Reading", "Completed", "Backlog", "Abandoned", "Paused", "Wishlist"];
const SHOW_EDIT_FIELDS: ShowEditField[] = [
  { key: "watchStatus", label: "Watch Status" },
  { key: "showStatus", label: "Show Status" },
  { key: "year", label: "Year" },
  { key: "tmdbId", label: "TMDB ID" },
  { key: "firstAirDate", label: "First Air Date" },
  { key: "lastAirDate", label: "Last Air Date" },
  { key: "numberOfSeasons", label: "Number Of Seasons" },
  { key: "numberOfEpisodes", label: "Number Of Episodes" },
  { key: "watched", label: "Watched" },
  { key: "caughtUp", label: "Caught Up" },
  { key: "networks", label: "Networks" },
  { key: "streamingUS", label: "Streaming US" },
  { key: "genres", label: "Genres" },
  { key: "tmdbRating", label: "TMDB Rating" },
  { key: "myRating", label: "My Rating" },
  { key: "ownership", label: "Ownership" },
  { key: "tags", label: "Tags" },
  { key: "backdropUrl", label: "Backdrop URL" },
  { key: "posterUrl", label: "Poster URL" },
  { key: "overview", label: "Overview", multiline: true },
];

const DASH = "—";

function firstNonEmpty(item: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    const value = item[key];
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function splitTags(value: string): string[] {
  return value
    .split(/[\/,|]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitCommaList(value: string): string[] {
  return value
    .split(/[,|]/g)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildBookEditValues(item: Record<string, any>): Record<string, string> {
  return {
    title: firstNonEmpty(item, ["title"]),
    subtitle: firstNonEmpty(item, ["subtitle", "Subtitle"]),
    series: firstNonEmpty(item, ["series"]),
    author: firstNonEmpty(item, ["author", "Author"]),
    ownership: firstNonEmpty(item, ["ownership", "Ownership"]),
    type: firstNonEmpty(item, ["types", "type", "Type"]),
    status: firstNonEmpty(item, ["status", "Status"]),
    completedDate: firstNonEmpty(item, ["completedDate", "CompletedDate"]),
    isbn: firstNonEmpty(item, ["isbn", "ISBN", "isbn13", "ISBN13", "isbn10", "ISBN10"]),
    releaseDate: firstNonEmpty(item, ["releaseDate", "ReleaseDate"]),
    imageUrl: firstNonEmpty(item, ["imageUrl", "ImageURL", "Image URL"]),
    userRating: firstNonEmpty(item, ["userRating", "UserRating"]),
    myRating: firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]),
    pages: firstNonEmpty(item, ["pages", "Pages"]),
    audiobookDuration: firstNonEmpty(item, ["audiobookDuration", "AudiobookDuration"]),
    genre: firstNonEmpty(item, ["genre", "Genre", "categories", "Categories"]),
    tags: firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]),
    openLibraryWorkKey: firstNonEmpty(item, ["openLibraryWorkKey", "OpenLibraryWorkKey"]),
    googleBooksVolumeId: firstNonEmpty(item, ["googleBooksVolumeId", "GoogleBooksVolumeId"]),
    description: firstNonEmpty(item, ["description", "Description"]),
  };
}

function buildShowEditValues(item: Record<string, any>): Record<string, string> {
  return {
    title: firstNonEmpty(item, ["title", "Title"]),
    year: firstNonEmpty(item, ["year", "Year"]),
    tmdbId: firstNonEmpty(item, ["tmdbId", "TMDB_ID"]),
    firstAirDate: firstNonEmpty(item, ["firstAirDate", "FirstAirDate"]),
    lastAirDate: firstNonEmpty(item, ["lastAirDate", "LastAirDate"]),
    numberOfSeasons: firstNonEmpty(item, ["numberOfSeasons", "NumberOfSeasons"]),
    numberOfEpisodes: firstNonEmpty(item, ["numberOfEpisodes", "NumberOfEpisodes"]),
    watchStatus: firstNonEmpty(item, ["watchStatus", "WatchStatus"]),
    watched: firstNonEmpty(item, ["watched", "Watched"]),
    caughtUp: firstNonEmpty(item, ["caughtUp", "CaughtUp"]),
    showStatus: firstNonEmpty(item, ["showStatus", "Status"]),
    networks: firstNonEmpty(item, ["networks", "Networks"]),
    streamingUS: firstNonEmpty(item, ["streamingUS", "StreamingUS"]),
    genres: firstNonEmpty(item, ["genres", "Genres"]),
    tmdbRating: firstNonEmpty(item, ["tmdbRating", "TMDB_Rating"]),
    myRating: firstNonEmpty(item, ["myRating", "MyRating"]),
    backdropUrl: firstNonEmpty(item, ["backdropUrl", "BackdropURL"]),
    overview: firstNonEmpty(item, ["overview", "Overview"]),
    ownership: firstNonEmpty(item, ["ownership", "Ownership"]),
    tags: firstNonEmpty(item, ["tag", "tags", "Tag", "Tags"]),
    posterUrl: firstNonEmpty(item, ["posterUrl", "PosterURL", "poster", "Poster"]),
  };
}

function renderRating(value: string) {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return value || DASH;

  const normalized = n > 5 ? n / 2 : n;
  const clamped = Math.max(0, Math.min(5, normalized));

  return (
    <span className="ratingValue">
      <span className="stars">
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, clamped - i));
          return (
            <span key={i} className="star">
              <span className="starBase">★</span>
              <span className="starFill" style={{ width: `${fill * 100}%` }}>
                ★
              </span>
            </span>
          );
        })}
      </span>
      <span className="score">{n.toFixed(1)}</span>
    </span>
  );
}

function buildInfoRows(item: Record<string, any>, itemType: "game" | "book" | "tv" | "movie"): InfoRow[] {
  if (itemType === "game") {
    return [
      { label: "Release Date", value: firstNonEmpty(item, ["releaseDate", "Release Date"]) || DASH },
      { label: "Year Played", value: firstNonEmpty(item, ["yearPlayed", "Year Played"]) || DASH },
      {
        label: "IGDB Rating",
        value: renderRating(firstNonEmpty(item, ["igdbRating", "externalRating", "rating", "Rating"]) || ""),
      },
      {
        label: "My Rating",
        value: renderRating(firstNonEmpty(item, ["myRating", "userRating", "personalRating"]) || ""),
      },
      { label: "Hours Played", value: firstNonEmpty(item, ["hoursPlayed", "playtime"]) || DASH },
      { label: "Developer", value: firstNonEmpty(item, ["developer", "studio"]) || DASH },
      { label: "Date Added", value: firstNonEmpty(item, ["dateAdded", "addedDate"]) || DASH },
      { label: "Date Completed", value: firstNonEmpty(item, ["dateCompleted", "completedDate"]) || DASH },
    ];
  }

  if (itemType === "book") {
    return [
      { label: "Series", value: firstNonEmpty(item, ["series"]) || DASH },
      { label: "Author", value: firstNonEmpty(item, ["author", "Author"]) || DASH },
      { label: "Ownership", value: firstNonEmpty(item, ["ownership"]) || DASH },
      { label: "Type", value: firstNonEmpty(item, ["types", "type"]) || DASH },
      { label: "Status", value: firstNonEmpty(item, ["status"]) || DASH },
      { label: "Completed Date", value: firstNonEmpty(item, ["completedDate"]) || DASH },
      { label: "Release Date", value: firstNonEmpty(item, ["releaseDate"]) || DASH },
      { label: "ISBN", value: firstNonEmpty(item, ["isbn", "ISBN", "isbn13", "ISBN13", "isbn10", "ISBN10"]) || DASH },
      { label: "User Rating", value: renderRating(firstNonEmpty(item, ["userRating", "UserRating"]) || "") },
      { label: "My Rating", value: renderRating(firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]) || "") },
      { label: "Pages", value: firstNonEmpty(item, ["pages", "Pages"]) || DASH },
      {
        label: "Audiobook Duration",
        value: firstNonEmpty(item, ["audiobookDuration", "AudiobookDuration"]) || DASH,
      },
      { label: "OpenLibrary Work Key", value: firstNonEmpty(item, ["openLibraryWorkKey", "OpenLibraryWorkKey"]) || DASH },
      { label: "Google Books Volume ID", value: firstNonEmpty(item, ["googleBooksVolumeId", "GoogleBooksVolumeId"]) || DASH },
    ];
  }

  if (itemType === "tv") {
    return [
      { label: "First Air Date", value: firstNonEmpty(item, ["firstAirDate"]) || DASH },
      { label: "Last Air Date", value: firstNonEmpty(item, ["lastAirDate"]) || DASH },
      { label: "TMDB Rating", value: renderRating(firstNonEmpty(item, ["tmdbRating", "TMDB_Rating"]) || "") },
      { label: "My Rating", value: renderRating(firstNonEmpty(item, ["myRating", "MyRating", "My Rating"]) || "") },
      { label: "Seasons", value: firstNonEmpty(item, ["numberOfSeasons", "NumberOfSeasons"]) || DASH },
      { label: "Episodes", value: firstNonEmpty(item, ["numberOfEpisodes", "NumberOfEpisodes"]) || DASH },
      { label: "Show Status", value: firstNonEmpty(item, ["showStatus", "Status"]) || DASH },
      { label: "Networks", value: firstNonEmpty(item, ["networks", "Networks"]) || DASH },
      { label: "Streaming US", value: firstNonEmpty(item, ["streamingUS", "StreamingUS"]) || DASH },
      { label: "TMDB ID", value: firstNonEmpty(item, ["tmdbId", "TMDB_ID"]) || DASH },
    ];
  }

  return [
    { label: "Release Date", value: firstNonEmpty(item, ["releaseDate"]) || DASH },
    { label: "Watch Status", value: firstNonEmpty(item, ["watchStatus"]) || DASH },
    { label: "Movie Status", value: firstNonEmpty(item, ["movieStatus"]) || DASH },
    { label: "Genres", value: firstNonEmpty(item, ["genres"]) || DASH },
    { label: "TMDB ID", value: firstNonEmpty(item, ["tmdbId"]) || DASH },
    { label: "Tag", value: firstNonEmpty(item, ["tag"]) || DASH },
  ];
}

export const MediaModal: React.FC<MediaModalProps> = ({
  item,
  open,
  onClose,
  onReplaceCover,
  onSaveBookEdits,
  onSaveShowEdits,
  isReplacingCover = false,
  replaceCoverError,
}) => {
  const [posterIndex, setPosterIndex] = React.useState(0);
  const [isEditingBook, setIsEditingBook] = React.useState(false);
  const [isSavingBook, setIsSavingBook] = React.useState(false);
  const [bookSaveError, setBookSaveError] = React.useState<string | null>(null);
  const [bookEditValues, setBookEditValues] = React.useState<Record<string, string>>({});
  const [isEditingShow, setIsEditingShow] = React.useState(false);
  const [isSavingShow, setIsSavingShow] = React.useState(false);
  const [showSaveError, setShowSaveError] = React.useState<string | null>(null);
  const [showEditValues, setShowEditValues] = React.useState<Record<string, string>>({});
  const descriptionTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  const sourceItem = item ?? {};
  const itemType: "game" | "book" | "tv" | "movie" =
    sourceItem.__type === "game" || sourceItem.platform || sourceItem.yearPlayed || sourceItem.gameStatus
      ? "game"
      : sourceItem.__type === "book" || sourceItem.isbn || sourceItem.series
        ? "book"
        : sourceItem.__type === "tv" || sourceItem.firstAirDate || sourceItem.lastAirDate || sourceItem.showStatus
          ? "tv"
          : "movie";

  const title = firstNonEmpty(sourceItem, ["title"]) || "Untitled";
  const subtitle = firstNonEmpty(sourceItem, ["subtitle", "Subtitle"]);
  const posterUrl = firstNonEmpty(sourceItem, ["posterUrl", "coverUrl"]);
  const coverSource = firstNonEmpty(sourceItem, ["coverSource"]) || "Unknown";
  const coverCandidates = Array.isArray(sourceItem.coverCandidates)
    ? sourceItem.coverCandidates.filter((c: any) => c && typeof c.url === "string" && c.url.trim())
    : [];
  const candidateUrls = coverCandidates.map((c: any) => String(c.url).trim()).filter(Boolean);
  const heroUrl = firstNonEmpty(sourceItem, ["backgroundUrl", "backdropUrl", "screenshotUrl", "bannerUrl", "heroUrl"]);
  const description = firstNonEmpty(sourceItem, ["description", "overview", "summary", "plot"]);

  React.useEffect(() => {
    if (!open || !item) return;
    const preferredIdx = candidateUrls.findIndex((url) => url === posterUrl);
    setPosterIndex(preferredIdx >= 0 ? preferredIdx : 0);
  }, [open, item, posterUrl, candidateUrls.join("|")]);

  React.useEffect(() => {
    if (!open || !item) return;
    setIsEditingBook(false);
    setIsSavingBook(false);
    setBookSaveError(null);
    setBookEditValues(buildBookEditValues(item));
    setIsEditingShow(false);
    setIsSavingShow(false);
    setShowSaveError(null);
    setShowEditValues(buildShowEditValues(item));
  }, [open, item]);

  const autoSizeDescriptionTextarea = React.useCallback((el?: HTMLTextAreaElement | null) => {
    const target = el ?? descriptionTextareaRef.current;
    if (!target) return;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  }, []);

  React.useEffect(() => {
    if (!isEditingBook && !isEditingShow) return;
    autoSizeDescriptionTextarea();
  }, [isEditingBook, isEditingShow, bookEditValues.description, showEditValues.overview, autoSizeDescriptionTextarea]);

  const resolvedPosterUrl = candidateUrls[posterIndex] || posterUrl;
  const resolvedCoverSource = coverCandidates.find((c: any) => c.url === resolvedPosterUrl)?.label || coverSource;
  const coverLocation = (() => {
    const label = resolvedCoverSource.toLowerCase();
    if (label.includes("override") || label.includes("custom")) return "Custom Cover";
    return "Metadata Cover";
  })();

  if (!open || !item) return null;

  const statusValue =
    itemType === "tv"
      ? firstNonEmpty(sourceItem, ["watchStatus", "WatchStatus", "watched", "Watched"]) || DASH
      : firstNonEmpty(sourceItem, ["status", "gameStatus", "movieStatus", "showStatus"]) ||
        firstNonEmpty(sourceItem, ["watchStatus", "playStatus"]) ||
        DASH;
  const categoryChips = Array.from(
    new Set(
      itemType === "book"
        ? splitCommaList(firstNonEmpty(sourceItem, ["categories", "genre", "Genre"]))
        : itemType === "tv" || itemType === "movie"
          ? splitTags(firstNonEmpty(sourceItem, ["genres", "Genres", "genre", "Genre"]))
          : splitTags(firstNonEmpty(sourceItem, ["categories", "genre", "Genre"]))
    )
  );
  const tagChips =
    itemType === "book"
      ? Array.from(new Set(splitTags(firstNonEmpty(sourceItem, ["tags", "Tags", "tag", "Tag"]))))
      : Array.from(
          new Set([
            ...splitTags(firstNonEmpty(sourceItem, ["tags", "Tags", "tag", "Tag"])),
          ])
        );
  const infoRows = buildInfoRows(sourceItem, itemType);
  const editableTitle =
    itemType === "book" && isEditingBook
      ? bookEditValues.title || title
      : itemType === "tv" && isEditingShow
        ? showEditValues.title || title
        : title;
  const editableSubtitle = isEditingBook ? bookEditValues.subtitle || "" : subtitle;
  const tvYearSubtitle = itemType === "tv" ? (isEditingShow ? showEditValues.year || "" : firstNonEmpty(sourceItem, ["year", "Year"])) : "";
  const bookTagSuggestions = Array.from(
    new Set([
      ...splitTags(firstNonEmpty(sourceItem, ["tags", "Tags", "tag", "Tag"])),
      ...splitTags(bookEditValues.tags || ""),
    ])
  );

  const handleBookFieldChange = (key: string, value: string) => {
    setBookEditValues((prev) => ({ ...prev, [key]: value }));
  };
  const handleShowFieldChange = (key: string, value: string) => {
    setShowEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const normalizeCommaTags = (value: string) =>
    value
      .split(/[,\|\/]+/g)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(", ");

  const handleSaveBook = async () => {
    if (!item || !onSaveBookEdits) return;
    setBookSaveError(null);
    setIsSavingBook(true);
    try {
      await onSaveBookEdits(item, bookEditValues);
      setIsEditingBook(false);
    } catch (e: any) {
      setBookSaveError(e?.message || "Failed to save book changes");
    } finally {
      setIsSavingBook(false);
    }
  };
  const handleSaveShow = async () => {
    if (!item || !onSaveShowEdits) return;
    setShowSaveError(null);
    setIsSavingShow(true);
    try {
      await onSaveShowEdits(item, showEditValues);
      setIsEditingShow(false);
    } catch (e: any) {
      setShowSaveError(e?.message || "Failed to save show changes");
    } finally {
      setIsSavingShow(false);
    }
  };

  return (
    <div className="mediaModalOverlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="mediaModalCard">
        <div className="topRightActions">
          {itemType === "book" && onSaveBookEdits ? (
            <>
              <button
                type="button"
                className="editButton topActionButton"
                onClick={() => {
                  setBookSaveError(null);
                  setIsEditingBook((prev) => !prev);
                  if (isEditingBook) setBookEditValues(buildBookEditValues(sourceItem));
                }}
                disabled={isSavingBook}
              >
                {isEditingBook ? "Cancel" : "Edit"}
              </button>
              {isEditingBook ? (
                <button type="button" className="saveButton topActionButton" onClick={handleSaveBook} disabled={isSavingBook}>
                  {isSavingBook ? "Saving..." : "Save"}
                </button>
              ) : null}
            </>
          ) : null}
          {itemType === "tv" && onSaveShowEdits ? (
            <>
              <button
                type="button"
                className="editButton topActionButton"
                onClick={() => {
                  setShowSaveError(null);
                  setIsEditingShow((prev) => !prev);
                  if (isEditingShow) setShowEditValues(buildShowEditValues(sourceItem));
                }}
                disabled={isSavingShow}
              >
                {isEditingShow ? "Cancel" : "Edit"}
              </button>
              {isEditingShow ? (
                <button type="button" className="saveButton topActionButton" onClick={handleSaveShow} disabled={isSavingShow}>
                  {isSavingShow ? "Saving..." : "Save"}
                </button>
              ) : null}
            </>
          ) : null}
          <button type="button" className="closeButton" aria-label="Close details" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="contentLayout">
          <aside className="leftPane">
            {posterUrl ? (
              <div className="posterWrap">
                <img
                  src={resolvedPosterUrl}
                  alt={title}
                  className="poster"
                  onError={() => {
                    setPosterIndex((idx) => (idx < candidateUrls.length - 1 ? idx + 1 : idx));
                  }}
                />
              </div>
            ) : (
              <div className="posterFallback">No Cover</div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && item && onReplaceCover) {
                  onReplaceCover(item, file);
                }
                e.currentTarget.value = "";
              }}
            />
            {(itemType === "book" && isEditingBook) || (itemType === "tv" && isEditingShow) ? (
              <>
                <input
                  type="text"
                  value={itemType === "book" ? bookEditValues.title || "" : showEditValues.title || ""}
                  onChange={(e) =>
                    itemType === "book"
                      ? handleBookFieldChange("title", e.target.value)
                      : handleShowFieldChange("title", e.target.value)
                  }
                  className="titleInput"
                  placeholder="Title"
                />
                {itemType === "book" ? (
                  <input
                    type="text"
                    value={bookEditValues.subtitle || ""}
                    onChange={(e) => handleBookFieldChange("subtitle", e.target.value)}
                    className="subtitleInput"
                    placeholder="Subtitle"
                  />
                ) : (
                  <input
                    type="text"
                    value={showEditValues.year || ""}
                    onChange={(e) => handleShowFieldChange("year", e.target.value)}
                    className="subtitleInput"
                    placeholder="Year"
                  />
                )}
              </>
            ) : (
              <>
                <h2 className="title">{editableTitle}</h2>
                {itemType === "book" && editableSubtitle ? <div className="subtitle">{editableSubtitle}</div> : null}
                {itemType === "tv" && tvYearSubtitle ? <div className="subtitle">{tvYearSubtitle}</div> : null}
              </>
            )}
            <div className="coverActionsPanel">
              <div className="coverSourceRow">
                <div className="coverSourceHeading">ACTIVE COVER</div>
                <div className="activeSource">
                  {resolvedPosterUrl ? (
                    <a href={resolvedPosterUrl} target="_blank" rel="noreferrer">
                      {coverLocation}
                    </a>
                  ) : (
                    DASH
                  )}
                </div>
              </div>
              {onReplaceCover ? (
                <button
                  type="button"
                  className="replaceCoverButton"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isReplacingCover}
                >
                  {isReplacingCover ? "Uploading..." : "Replace Cover"}
                </button>
              ) : null}
              {replaceCoverError ? <div className="replaceCoverError">{replaceCoverError}</div> : null}
            </div>
            <div className="chipSection">
              <div className="chipSectionLabel">{itemType === "tv" ? "Watch Status" : "Status"}</div>
              <div className="statusValue">{statusValue}</div>
            </div>
            <div className="chipSection">
              <div className="chipSectionLabel">{itemType === "book" || itemType === "tv" || itemType === "movie" ? "Genres" : "Categories"}</div>
              {categoryChips.length > 0 ? (
                <div className="chipWrap">
                  {categoryChips.map((chip) => (
                    <span key={chip} className="chip">
                      {chip}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="statusValue">{DASH}</div>
              )}
            </div>
            {tagChips.length > 0 ? (
              <div className="chipSection">
                <div className="chipSectionLabel">Tags</div>
                <div className="chipWrap">
                  {tagChips.map((chip) => (
                    <span key={chip} className="chip">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </aside>

          <section
            className={`rightPane${itemType === "book" ? " bookRightPane" : ""}${isEditingBook || isEditingShow ? " bookEditRightPane" : ""}`}
          >
            {itemType !== "book" ? (
              heroUrl ? (
                <img src={heroUrl} alt={`${title} screenshot`} className="heroImage" />
              ) : (
                <div className="heroFallback" />
              )
            ) : null}

            {description && itemType !== "book" && !(itemType === "tv" && isEditingShow) ? (
              <div className="descriptionCard">
                <div className="label">Description</div>
                <div className="description">{description}</div>
              </div>
            ) : null}

            {itemType === "book" && description && !isEditingBook ? (
              <div className="descriptionCard bookDescriptionCard">
                <div className="label">Description</div>
                <div className="description">{description}</div>
              </div>
            ) : null}

            {itemType === "book" && isEditingBook ? (
              <div className="editGrid">
                {[...BOOK_EDIT_FIELDS]
                  .sort((a, b) => (a.key === "description" ? -1 : b.key === "description" ? 1 : 0))
                  .map((field) => (
                  <label key={field.key} className={`editField${field.key === "description" ? " editFieldFullWidth" : ""}`}>
                    <span className="editLabel">{field.label}</span>
                    {field.multiline ? (
                      <textarea
                        ref={field.key === "description" ? descriptionTextareaRef : undefined}
                        value={bookEditValues[field.key] || ""}
                        onChange={(e) => {
                          handleBookFieldChange(field.key, e.target.value);
                          if (field.key === "description") autoSizeDescriptionTextarea(e.currentTarget);
                        }}
                        className={`editTextarea${field.key === "description" ? " editDescriptionTextarea" : ""}`}
                        rows={field.key === "description" ? 8 : 4}
                      />
                    ) : field.key === "status" ? (
                      <select
                        value={bookEditValues[field.key] || ""}
                        onChange={(e) => handleBookFieldChange(field.key, e.target.value)}
                        className="editSelect"
                      >
                        <option value="">Select status</option>
                        {BOOK_STATUS_OPTIONS.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                        {bookEditValues[field.key] && !BOOK_STATUS_OPTIONS.includes(bookEditValues[field.key]) ? (
                          <option value={bookEditValues[field.key]}>{bookEditValues[field.key]}</option>
                        ) : null}
                      </select>
                    ) : field.key === "tags" ? (
                      <>
                        <input
                          type="text"
                          value={bookEditValues[field.key] || ""}
                          onChange={(e) => handleBookFieldChange(field.key, e.target.value)}
                          onBlur={(e) => handleBookFieldChange(field.key, normalizeCommaTags(e.target.value))}
                          className="editInput"
                          list="book-tag-suggestions"
                          placeholder="tag one, tag two, tag three"
                        />
                        <datalist id="book-tag-suggestions">
                          {bookTagSuggestions.map((tag) => (
                            <option key={tag} value={tag} />
                          ))}
                        </datalist>
                        <span className="editHelp">Use commas to separate tags</span>
                      </>
                    ) : (
                      <input
                        type="text"
                        value={bookEditValues[field.key] || ""}
                        onChange={(e) => handleBookFieldChange(field.key, e.target.value)}
                        className="editInput"
                      />
                    )}
                  </label>
                ))}
                {bookSaveError ? <div className="bookSaveError">{bookSaveError}</div> : null}
              </div>
            ) : itemType === "tv" && isEditingShow ? (
              <div className="editGrid">
                {[...SHOW_EDIT_FIELDS]
                  .sort((a, b) => (a.key === "overview" ? -1 : b.key === "overview" ? 1 : 0))
                  .map((field) => (
                    <label key={field.key} className={`editField${field.key === "overview" ? " editFieldFullWidth" : ""}`}>
                      <span className="editLabel">{field.label}</span>
                      {field.multiline ? (
                        <textarea
                          ref={field.key === "overview" ? descriptionTextareaRef : undefined}
                          value={showEditValues[field.key] || ""}
                          onChange={(e) => {
                            handleShowFieldChange(field.key, e.target.value);
                            if (field.key === "overview") autoSizeDescriptionTextarea(e.currentTarget);
                          }}
                          className={`editTextarea${field.key === "overview" ? " editDescriptionTextarea" : ""}`}
                          rows={field.key === "overview" ? 8 : 4}
                        />
                      ) : (
                        <input
                          type="text"
                          value={showEditValues[field.key] || ""}
                          onChange={(e) => handleShowFieldChange(field.key, e.target.value)}
                          className="editInput"
                        />
                      )}
                    </label>
                  ))}
                {showSaveError ? <div className="bookSaveError">{showSaveError}</div> : null}
              </div>
            ) : (
              <div className="infoGrid">
                {infoRows.map((row) => (
                  <div key={row.label} className={`infoCard${row.fullWidth ? " infoCardFullWidth" : ""}`}>
                    <div className="label">{row.label}</div>
                    <div className="value">{row.value || DASH}</div>
                  </div>
                ))}
              </div>
            )}

          </section>
        </div>
      </div>

      <style jsx>{`
        .mediaModalOverlay {
          position: fixed;
          inset: 0;
          z-index: 10000;
          display: grid;
          place-items: center;
          padding: 22px;
          background: rgba(6, 11, 22, 0.72);
          backdrop-filter: blur(5px);
        }

        .mediaModalCard {
          position: relative;
          width: min(1320px, 96vw);
          max-height: min(92vh, 1100px);
          overflow: auto;
          padding: 14px 16px 16px;
          border-radius: 22px;
          border: 1px solid rgba(70, 98, 152, 0.35);
          background: linear-gradient(180deg, rgba(7, 14, 32, 0.97) 0%, rgba(8, 12, 25, 0.97) 100%);
          box-shadow: 0 28px 80px rgba(0, 0, 0, 0.52);
        }

        .closeButton {
          width: 34px;
          height: 34px;
          border: 1px solid rgba(86, 110, 160, 0.5);
          border-radius: 10px;
          background: rgba(10, 22, 49, 0.9);
          color: #d6deef;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }

        .topRightActions {
          position: absolute;
          top: 10px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
          z-index: 2;
        }

        .contentLayout {
          display: grid;
          grid-template-columns: 300px minmax(0, 1fr);
          gap: 18px;
          align-items: start;
        }

        .leftPane {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-width: 0;
        }

        .poster,
        .posterFallback {
          width: 100%;
          aspect-ratio: 2 / 3;
          border-radius: 16px;
          border: 1px solid rgba(80, 108, 164, 0.35);
        }

        .poster {
          display: block;
          object-fit: cover;
          box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
        }

        .posterWrap {
          width: 100%;
        }

        .replaceCoverButton {
          border: 1px solid rgba(95, 122, 177, 0.6);
          border-radius: 10px;
          background: rgba(9, 19, 40, 0.92);
          color: #d6e2ff;
          padding: 7px 10px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          width: 100%;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .replaceCoverButton:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .replaceCoverError {
          color: #ffb6b6;
          font-size: 12px;
          margin-top: 8px;
          line-height: 1.35;
        }

        .posterFallback {
          display: grid;
          place-items: center;
          color: #dce4f7;
          background: rgba(18, 30, 56, 0.7);
          font-weight: 700;
        }

        .title {
          margin: 14px 0 10px;
          color: #f4f7ff;
          font-size: 36px;
          line-height: 1.05;
          letter-spacing: 0.01em;
          font-weight: 800;
        }

        .subtitle {
          margin: -4px 0 10px;
          color: #d7e1f8;
          font-size: 20px;
          line-height: 1.2;
          font-weight: 600;
        }

        .titleInput,
        .subtitleInput {
          width: 100%;
          border: 1px solid rgba(95, 122, 177, 0.45);
          border-radius: 10px;
          background: rgba(8, 14, 30, 0.8);
          color: #eff5ff;
          outline: none;
        }

        .titleInput {
          margin: 14px 0 8px;
          font-size: 28px;
          line-height: 1.1;
          font-weight: 800;
          padding: 8px 10px;
        }

        .subtitleInput {
          margin: 0 0 10px;
          font-size: 18px;
          line-height: 1.2;
          font-weight: 600;
          padding: 8px 10px;
        }

        .coverActionsPanel {
          width: 100%;
          margin: 2px 0 2px;
          border: 1px solid rgba(73, 102, 154, 0.35);
          border-radius: 14px;
          background: rgba(15, 24, 44, 0.62);
          padding: 10px;
        }

        .coverSourceRow {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chipWrap {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 6px;
        }

        .chip {
          border-radius: 999px;
          border: 1px solid rgba(90, 116, 170, 0.45);
          background: rgba(28, 42, 70, 0.65);
          color: #d6deef;
          font-size: 15px;
          font-weight: 700;
          line-height: 1;
          padding: 10px 16px;
        }

        .chipSection {
          width: 100%;
          margin-top: 10px;
        }

        .chipSectionLabel {
          color: rgba(178, 193, 224, 0.9);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .statusValue {
          color: #f0f4ff;
          font-size: 20px;
          font-weight: 600;
          margin-top: 6px;
        }

        .coverSourceHeading {
          color: rgba(178, 193, 224, 0.9);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0;
        }

        .activeSource {
          color: #f0f4ff;
          font-size: 13px;
          font-weight: 700;
          margin-top: 0;
          line-height: 1.35;
        }

        .activeSource a {
          color: #f0f4ff;
          text-decoration: none;
        }

        .activeSource a:hover {
          text-decoration: underline;
        }

        .bookEditToolbar {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .editButton,
        .saveButton {
          border: 1px solid rgba(95, 122, 177, 0.6);
          border-radius: 10px;
          background: rgba(9, 19, 40, 0.92);
          color: #d6e2ff;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
        }

        .topActionButton {
          padding: 6px 9px;
          font-size: 11px;
        }

        .editButton:disabled,
        .saveButton:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .editGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .editField {
          display: flex;
          flex-direction: column;
          gap: 6px;
          border-radius: 14px;
          border: 1px solid rgba(73, 102, 154, 0.35);
          background: rgba(15, 24, 44, 0.72);
          padding: 10px 12px;
        }

        .editFieldFullWidth {
          grid-column: 1 / -1;
        }

        .editLabel {
          color: rgba(178, 193, 224, 0.9);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .editHelp {
          color: rgba(178, 193, 224, 0.75);
          font-size: 11px;
          line-height: 1.2;
        }

        .editInput,
        .editSelect,
        .editTextarea {
          width: 100%;
          border: 1px solid rgba(95, 122, 177, 0.45);
          border-radius: 8px;
          background: rgba(8, 14, 30, 0.8);
          color: #eff5ff;
          padding: 8px 10px;
          font-size: 14px;
          line-height: 1.3;
          outline: none;
        }

        .editTextarea {
          resize: vertical;
          min-height: 96px;
        }

        .editDescriptionTextarea {
          min-height: 220px;
          line-height: 1.45;
        }

        .bookSaveError {
          grid-column: 1 / -1;
          color: #ffb6b6;
          font-size: 13px;
          line-height: 1.35;
        }

        .rightPane {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .bookRightPane {
          padding-top: 12px;
        }

        .bookEditRightPane {
          padding-top: 4px;
        }

        .bookDescriptionCard {
          margin-top: 8px;
        }

        .heroImage,
        .heroFallback {
          width: 100%;
          min-height: 280px;
          max-height: 420px;
          border-radius: 24px;
          border: 1px solid rgba(83, 111, 167, 0.32);
        }

        .heroImage {
          object-fit: cover;
          display: block;
        }

        .heroFallback {
          background:
            radial-gradient(circle at 70% 18%, rgba(59, 82, 128, 0.42), transparent 52%),
            linear-gradient(160deg, rgba(16, 30, 58, 0.85) 0%, rgba(9, 17, 35, 0.95) 100%);
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .infoCard,
        .descriptionCard {
          border-radius: 20px;
          border: 1px solid rgba(73, 102, 154, 0.35);
          background: rgba(15, 24, 44, 0.72);
          padding: 14px 16px;
        }

        .infoCardFullWidth {
          grid-column: 1 / -1;
        }

        .label {
          color: rgba(178, 193, 224, 0.9);
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }

        .value {
          color: #f0f4ff;
          font-size: 20px;
          line-height: 1.25;
          font-weight: 700;
          min-height: 26px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        :global(.ratingValue) {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        :global(.stars) {
          display: inline-flex;
          gap: 2px;
        }

        :global(.star) {
          position: relative;
          display: inline-block;
          width: 1em;
          height: 1em;
          line-height: 1;
        }

        :global(.starBase) {
          color: rgba(42, 181, 186, 0.32);
        }

        :global(.starFill) {
          position: absolute;
          inset: 0 auto 0 0;
          overflow: hidden;
          white-space: nowrap;
          color: #2ab5ba;
        }

        :global(.score) {
          color: #edf4ff;
          font-size: 20px;
          font-weight: 800;
        }

        .description {
          color: #e2e9fb;
          font-size: 16px;
          line-height: 1.4;
          white-space: pre-wrap;
        }

        @media (max-width: 1024px) {
          .contentLayout {
            grid-template-columns: minmax(0, 1fr);
          }

          .leftPane {
            max-width: 320px;
          }
        }

        @media (max-width: 680px) {
          .mediaModalOverlay {
            padding: 10px;
          }

          .mediaModalCard {
            width: 100%;
            padding: 10px 10px 12px;
            border-radius: 14px;
          }

          .closeButton {
            width: 30px;
            height: 30px;
            font-size: 20px;
          }

          .topRightActions {
            top: 8px;
            right: 8px;
            gap: 4px;
          }

          .topActionButton {
            padding: 5px 8px;
            font-size: 10px;
          }

          .title {
            font-size: 26px;
          }

          .subtitle {
            font-size: 18px;
          }

          .statusValue {
            font-size: 18px;
          }

          .chip {
            font-size: 14px;
            padding: 8px 12px;
          }

          .coverActionsPanel {
            padding: 8px;
          }

          .heroImage,
          .heroFallback {
            min-height: 180px;
            border-radius: 14px;
          }

          .infoGrid {
            grid-template-columns: 1fr;
          }

          .editGrid {
            grid-template-columns: 1fr;
          }

          .infoCard,
          .descriptionCard {
            border-radius: 14px;
            padding: 12px;
          }

          .value {
            font-size: 16px;
          }

          :global(.score) {
            font-size: 18px;
          }

          .description {
            font-size: 15px;
          }
        }
      `}</style>
    </div>
  );
};
