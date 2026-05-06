import React from "react";

interface MediaModalProps {
  item: Record<string, any> | null;
  open: boolean;
  onClose: () => void;
  onReplaceCover?: (item: Record<string, any>, file: File) => Promise<void> | void;
  onSaveBookEdits?: (item: Record<string, any>, updates: Record<string, string>) => Promise<void> | void;
  onSaveShowEdits?: (item: Record<string, any>, updates: Record<string, string>) => Promise<void> | void;
  onSaveMovieEdits?: (item: Record<string, any>, updates: Record<string, string>) => Promise<void> | void;
  onSaveGameEdits?: (item: Record<string, any>, updates: Record<string, string>) => Promise<void> | void;
  onDeleteItem?: (item: Record<string, any>) => Promise<void> | void;
  gamePlatformOptions?: string[];
  gameStatusOptions?: string[];
  gameOwnershipOptions?: string[];
  gameFormatOptions?: string[];
  isReplacingCover?: boolean;
  replaceCoverError?: string | null;
  popupCoverMode?: "custom" | "default";
  onPopupCoverModeChange?: (item: Record<string, any>, mode: "custom" | "default") => void;
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

type MovieEditField = {
  key: string;
  label: string;
  multiline?: boolean;
};

type GameEditField = {
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
const BOOK_OWNERSHIP_OPTIONS = ["Owned", "Ripped", "Wishlist", "Borrowed"];
const BOOK_TYPE_OPTIONS = ["Physical", "eBook", "Audiobook", "Graphic Novel"];
const STATIC_SITE_RESYNC_MESSAGE =
  "Metadata resync isn't available on the GitHub Pages version of the library.";
const SHOW_WATCH_STATUS_OPTIONS = [
  "Watching",
  "Completed",
  "Backlog",
  "Abandoned",
  "Watch Next",
  "Paused",
  "Pending Return",
];
const SHOW_STATUS_OPTIONS = ["Ended", "Returning Series", "Canceled"];
const SHOW_OWNERSHIP_OPTIONS = ["Owned", "Wishlist", "Borrowed", "Library", "Subscription"];
const MOVIE_WATCH_STATUS_OPTIONS = ["Watched", "Watching", "Backlog", "Pending Digital Release", "Abandoned"];
const MOVIE_STATUS_OPTIONS = ["Released", "Upcoming", "In Production", "Canceled"];
const MOVIE_OWNERSHIP_OPTIONS = ["Owned", "Wishlist", "Borrowed", "Library", "Subscription"];
const GAME_STATUS_FALLBACK_OPTIONS = ["Backlog", "Playing", "Completed", "Paused", "Dropped", "Wishlist"];
const GAME_PLATFORM_FALLBACK_OPTIONS = ["PC", "PlayStation 5", "Xbox Series X|S", "Nintendo Switch", "Steam Deck", "Mobile"];
const GAME_OWNERSHIP_FALLBACK_OPTIONS = ["Owned", "Wishlist", "Borrowed", "Library", "Subscription"];
const GAME_FORMAT_FALLBACK_OPTIONS = ["Digital", "Physical", "Cloud", "Subscription"];
const SHOW_EDIT_FIELDS: ShowEditField[] = [
  { key: "watchStatus", label: "Watch Status" },
  { key: "showStatus", label: "Show Status" },
  { key: "dateCompleted", label: "Completed Date" },
  { key: "year", label: "Year" },
  { key: "tmdbId", label: "TMDB ID" },
  { key: "firstAirDate", label: "First Air Date" },
  { key: "myRating", label: "My Rating" },
  { key: "lastAirDate", label: "Last Air Date" },
  { key: "numberOfSeasons", label: "Number Of Seasons" },
  { key: "numberOfEpisodes", label: "Number Of Episodes" },
  { key: "networks", label: "Networks" },
  { key: "streamingUS", label: "Streaming US" },
  { key: "genres", label: "Genres" },
  { key: "tmdbRating", label: "TMDB Rating" },
  { key: "ownership", label: "Ownership" },
  { key: "tags", label: "Tags" },
  { key: "backdropUrl", label: "Backdrop URL" },
  { key: "posterUrl", label: "Poster URL" },
  { key: "overview", label: "Overview", multiline: true },
];
const MOVIE_EDIT_FIELDS: MovieEditField[] = [
  { key: "year", label: "Year" },
  { key: "myRating", label: "My Rating" },
  { key: "tmdbRating", label: "TMDB Rating" },
  { key: "tmdbId", label: "TMDB ID" },
  { key: "watchStatus", label: "Watch Status" },
  { key: "watchDate", label: "Watch Date" },
  { key: "ownership", label: "Ownership" },
  { key: "tags", label: "Tags" },
  { key: "releaseDate", label: "Release Date" },
  { key: "runtime", label: "Runtime" },
  { key: "status", label: "Status" },
  { key: "genres", label: "Genres" },
  { key: "posterUrl", label: "Poster URL" },
  { key: "backdropUrl", label: "Backdrop URL" },
  { key: "overview", label: "Overview", multiline: true },
];
const GAME_EDIT_FIELDS: GameEditField[] = [
  { key: "status", label: "Status" },
  { key: "releaseDateAlt", label: "Release Date" },
  { key: "platforms", label: "Platforms" },
  { key: "igdbRating", label: "IGDB Rating" },
  { key: "myRating", label: "My Rating" },
  { key: "ownership", label: "Ownership" },
  { key: "backlog", label: "Backlog" },
  { key: "completed", label: "Completed" },
  { key: "dateCompleted", label: "Completed Date" },
  { key: "yearPlayed", label: "Year Played" },
  { key: "dateAdded", label: "Date Added" },
  { key: "genres", label: "Genres" },
  { key: "hoursPlayed", label: "Hours Played" },
  { key: "developer", label: "Developer" },
  { key: "igdbId", label: "IGDB_ID" },
  { key: "platform", label: "Platform" },
  { key: "format", label: "Format" },
  { key: "description", label: "Description", multiline: true },
];

const DASH = "—";
type MediaItemType = "game" | "book" | "tv" | "movie";
type ResyncDiffRow = {
  key: string;
  label: string;
  before: string;
  after: string;
  selected: boolean;
};
type ResyncPreview = {
  sourceLabel: string;
  baseValues: Record<string, string>;
  updates: Record<string, string>;
  changes: ResyncDiffRow[];
};

type SaveResultDialog = {
  tone: "success" | "error";
  title: string;
  message: string;
  details: string[];
};

const RESYNC_SOURCE_LABELS: Record<MediaItemType, string> = {
  book: "Google Books",
  tv: "TMDB",
  movie: "TMDB",
  game: "IGDB",
};

const RESYNC_FIELDS: Record<MediaItemType, string[]> = {
  book: [
    "title",
    "subtitle",
    "author",
    "releaseDate",
    "description",
    "genre",
    "pages",
    "imageUrl",
    "isbn",
    "googleBooksVolumeId",
  ],
  tv: [
    "title",
    "year",
    "tmdbId",
    "firstAirDate",
    "lastAirDate",
    "numberOfSeasons",
    "numberOfEpisodes",
    "showStatus",
    "genres",
    "tmdbRating",
    "overview",
    "posterUrl",
    "backdropUrl",
  ],
  movie: [
    "title",
    "year",
    "tmdbId",
    "releaseDate",
    "runtime",
    "status",
    "genres",
    "tmdbRating",
    "overview",
    "posterUrl",
    "backdropUrl",
  ],
  game: [
    "title",
    "releaseDate",
    "releaseDateAlt",
    "platforms",
    "igdbId",
    "igdbRating",
    "genres",
    "developer",
    "description",
    "coverUrl",
  ],
};

const SAVE_NOTICE_AUTO_DISMISS_MS = 5000;

function isDateEditFieldKey(key: string): boolean {
  return key.toLowerCase().includes("date");
}

function getMediaItemFingerprint(item: Record<string, any>): string {
  const mediaType =
    item?.__type === "book" || item?.isbn || item?.series
      ? "book"
      : item?.__type === "tv" || item?.firstAirDate || item?.lastAirDate || item?.showStatus
        ? "tv"
        : item?.__type === "game" || item?.platform || item?.yearPlayed || item?.gameStatus
          ? "game"
          : "movie";

  if (mediaType === "book") {
    const googleBooksVolumeId = safeStr(item.googleBooksVolumeId);
    const openLibraryWorkKey = safeStr(item.openLibraryWorkKey);
    const isbn = safeStr(item.isbn);
    if (googleBooksVolumeId || openLibraryWorkKey || isbn) {
      return `book:${googleBooksVolumeId}:${openLibraryWorkKey}:${isbn}`;
    }
    return `book:${safeStr(item.title).toLowerCase()}`;
  }

  if (mediaType === "game") {
    const igdbId = safeStr(item.igdbId);
    const igdbIdOverride = safeStr(item.igdbIdOverride);
    if (igdbId || igdbIdOverride) {
      return `game:${igdbId}:${igdbIdOverride}`;
    }
    return `game:${safeStr(item.title).toLowerCase()}`;
  }

  const tmdbId = safeStr(item.tmdbId);
  if (tmdbId) {
    return `${mediaType}:${tmdbId}`;
  }
  return `${mediaType}:${safeStr(item.title).toLowerCase()}`;
}

function normalizeDateInputValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const separatorMatch = trimmed.match(/^(\d{1,2})([/.-])(\d{1,2})([/.-])(\d{2,4})$/);
  if (separatorMatch) {
    const month = Number(separatorMatch[1]);
    const day = Number(separatorMatch[3]);
    const yearText = separatorMatch[4];
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = Number(yearText);
      if (yearText.length === 2) year = year <= 50 ? 2000 + year : 1900 + year;
      if (Number.isFinite(year) && year >= 1000 && year <= 9999) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
}

function normalizeDateEditableValues(values: Record<string, string>): Record<string, string> {
  const next = { ...values };
  for (const key of Object.keys(next)) {
    if (!isDateEditFieldKey(key)) continue;
    const normalized = normalizeDateInputValue(next[key]);
    if (normalized) next[key] = normalized;
  }
  return next;
}

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

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

function formatEditFieldLabel(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function getEditableFieldLabels(itemType: MediaItemType): Record<string, string> {
  const fields =
    itemType === "book"
      ? BOOK_EDIT_FIELDS
      : itemType === "tv"
        ? SHOW_EDIT_FIELDS
        : itemType === "movie"
          ? MOVIE_EDIT_FIELDS
          : GAME_EDIT_FIELDS;

  const labelMap = fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = field.label;
    return acc;
  }, {});

  labelMap.title = "Title";
  if (itemType === "book") {
    labelMap.subtitle = "Subtitle";
  }

  return labelMap;
}

function buildEditableValuesForItem(itemType: MediaItemType, item: Record<string, any>): Record<string, string> {
  if (itemType === "book") return buildBookEditValues(item);
  if (itemType === "tv") return buildShowEditValues(item);
  if (itemType === "movie") return buildMovieEditValues(item);
  return buildGameEditValues(item);
}

function getChangedFieldLabels(itemType: MediaItemType, item: Record<string, any>, nextValues: Record<string, string>): string[] {
  const previousValues = normalizeDateEditableValues(buildEditableValuesForItem(itemType, item));
  const submittedValues = normalizeDateEditableValues({ ...nextValues });
  const labelMap = getEditableFieldLabels(itemType);

  return Object.keys(submittedValues)
    .filter((key) => safeStr(submittedValues[key]) !== safeStr(previousValues[key]))
    .map((key) => labelMap[key] || formatEditFieldLabel(key));
}

function summarizeChangedFieldLabels(changedFieldLabels: string[], prefix: string, emptyMessage: string): string {
  if (!changedFieldLabels.length) return emptyMessage;
  const visibleLabels = changedFieldLabels.slice(0, 6);
  const remainder = changedFieldLabels.length - visibleLabels.length;
  if (remainder > 0) {
    return `${prefix}: ${visibleLabels.join(", ")} and ${remainder} more.`;
  }
  return `${prefix}: ${visibleLabels.join(", ")}.`;
}

function buildSaveResultDialog(
  itemType: MediaItemType,
  item: Record<string, any>,
  values: Record<string, string>,
  tone: "success" | "error",
  errorMessage?: string
): SaveResultDialog {
  const itemTitle = safeStr(values.title) || safeStr(item.title) || "This item";
  const changedFieldLabels = getChangedFieldLabels(itemType, item, values);

  if (tone === "success") {
    return {
      tone,
      title: "Save successful",
      message: `"${itemTitle}" was saved to the spreadsheet.`,
      details: [
        summarizeChangedFieldLabels(
          changedFieldLabels,
          "Updated fields",
          "No field differences were detected, but the spreadsheet accepted the save request."
        ),
        "The spreadsheet write endpoint returned success.",
      ],
    };
  }

  return {
    tone,
    title: "Save failed",
    message: `"${itemTitle}" was not saved to the spreadsheet.`,
    details: [
      safeStr(errorMessage) || "The spreadsheet write request failed before the change could be confirmed.",
      summarizeChangedFieldLabels(
        changedFieldLabels,
        "Attempted fields",
        "No field differences were detected before the save failed."
      ),
    ],
  };
}

function splitCommaValues(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function normalizeYesNoValue(value: string): string {
  const normalized = value.trim();
  if (!normalized) return "";
  return isTruthyValue(value) ? "Yes" : "No";
}

function humanizeFieldKey(key: string): string {
  if (!key) return key;
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function getFieldLabelForType(itemType: MediaItemType, key: string): string {
  if (key === "title") return "Title";
  if (key === "subtitle") return "Subtitle";
  if (key === "releaseDateAlt") return "Release Date";
  if (key === "coverUrl") return "Cover URL";
  if (key === "imageUrl") return "Image URL";

  const field =
    itemType === "book"
      ? BOOK_EDIT_FIELDS.find((entry) => entry.key === key)
      : itemType === "tv"
        ? SHOW_EDIT_FIELDS.find((entry) => entry.key === key)
        : itemType === "movie"
          ? MOVIE_EDIT_FIELDS.find((entry) => entry.key === key)
          : GAME_EDIT_FIELDS.find((entry) => entry.key === key);

  return field?.label || humanizeFieldKey(key);
}

function isTruthyValue(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return (
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "1" ||
    normalized === "completed" ||
    normalized === "done" ||
    normalized === "backlog" ||
    normalized === "queued"
  );
}

function normalizeStatusToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function getStatusTone(value: string): "positive" | "warning" | "active" | "neutral" | "" {
  const normalized = normalizeStatusToken(value);
  if (!normalized || normalized === DASH.toLowerCase()) return "";

  if (
    normalized.includes("completed") ||
    normalized.includes("watched") ||
    normalized.includes("finished")
  ) {
    return "positive";
  }

  if (
    normalized.includes("abandoned") ||
    normalized.includes("dropped") ||
    normalized.includes("canceled") ||
    normalized.includes("cancelled") ||
    normalized.includes("quit") ||
    normalized.includes("dnf")
  ) {
    return "warning";
  }

  if (
    normalized.includes("now playing") ||
    normalized.includes("playing") ||
    normalized.includes("currently watching")
  ) {
    return "active";
  }

  return "neutral";
}

function renderTwoStateToggle(isOn: boolean, onText: string, offText: string) {
  return (
    <span
      className={`twoStateTextOnly ${isOn ? "on" : "off"}`}
      style={
        isOn
          ? undefined
          : {
              color: "rgba(240, 244, 255, 0.34)",
              opacity: 0.5,
              fontWeight: 600,
            }
      }
    >
      {isOn ? onText : offText}
    </span>
  );
}

function buildBookEditValues(item: Record<string, any>): Record<string, string> {
  const values = {
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

  return normalizeDateEditableValues(values);
}

function buildShowEditValues(item: Record<string, any>): Record<string, string> {
  const values = {
    title: firstNonEmpty(item, ["title", "Title"]),
    year: firstNonEmpty(item, ["year", "Year"]),
    tmdbId: firstNonEmpty(item, ["tmdbId", "TMDB_ID"]),
    dateCompleted: firstNonEmpty(item, ["dateCompleted", "Date Completed", "CompletedDate"]),
    firstAirDate: firstNonEmpty(item, ["firstAirDate", "FirstAirDate"]),
    lastAirDate: firstNonEmpty(item, ["lastAirDate", "LastAirDate"]),
    numberOfSeasons: firstNonEmpty(item, ["numberOfSeasons", "NumberOfSeasons"]),
    numberOfEpisodes: firstNonEmpty(item, ["numberOfEpisodes", "NumberOfEpisodes"]),
    watchStatus: firstNonEmpty(item, ["watchStatus", "WatchStatus"]),
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

  return normalizeDateEditableValues(values);
}

function buildMovieEditValues(item: Record<string, any>): Record<string, string> {
  const values = {
    title: firstNonEmpty(item, ["title", "Title"]),
    year: firstNonEmpty(item, ["year", "Year"]),
    myRating: firstNonEmpty(item, ["myRating", "MyRating", "My Rating"]),
    tmdbRating: firstNonEmpty(item, ["tmdbRating", "TMDB_Rating"]),
    tmdbId: firstNonEmpty(item, ["tmdbId", "TMDB_ID"]),
    watchStatus: firstNonEmpty(item, ["watchStatus", "Watch Status", "WatchStatus", "watched", "Watched"]),
    watchDate: firstNonEmpty(item, ["watchDate", "WatchDate"]),
    ownership: firstNonEmpty(item, ["ownership", "Ownership"]),
    tags: firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]),
    releaseDate: firstNonEmpty(item, ["releaseDate", "ReleaseDate"]),
    runtime: firstNonEmpty(item, ["runtime", "Runtime"]),
    status: firstNonEmpty(item, ["status", "Status", "movieStatus"]),
    genres: firstNonEmpty(item, ["genres", "Genres"]),
    overview: firstNonEmpty(item, ["overview", "Overview"]),
    posterUrl: firstNonEmpty(item, ["posterUrl", "PosterURL"]),
    backdropUrl: firstNonEmpty(item, ["backdropUrl", "BackdropURL"]),
  };

  return normalizeDateEditableValues(values);
}

function buildGameEditValues(item: Record<string, any>): Record<string, string> {
  const values = {
    title: firstNonEmpty(item, ["title", "Title"]),
    cover: firstNonEmpty(item, ["cover", "Cover"]),
    platform: firstNonEmpty(item, ["platform", "Platform"]),
    status: firstNonEmpty(item, ["status", "Status", "gameStatus", "playStatus"]),
    name: firstNonEmpty(item, ["name", "Name"]),
    releaseDate: firstNonEmpty(item, ["releaseDate", "ReleaseDate"]),
    releaseDateAlt: firstNonEmpty(item, ["releaseDateAlt", "Release Date"]),
    platforms: firstNonEmpty(item, ["platforms", "Platforms"]),
    coverUrl: firstNonEmpty(item, ["coverUrl", "CoverURL"]),
    rating: firstNonEmpty(item, ["rating", "Rating"]),
    igdbRating: firstNonEmpty(item, ["igdbRating", "IGDB Rating"]),
    myRating: firstNonEmpty(item, ["myRating", "My Rating"]),
    ownership: firstNonEmpty(item, ["ownership", "Ownership"]),
    format: firstNonEmpty(item, ["format", "Format"]),
    backlog: normalizeYesNoValue(firstNonEmpty(item, ["backlog", "Backlog"])),
    completed: normalizeYesNoValue(firstNonEmpty(item, ["completed", "Completed"])),
    dateCompleted: firstNonEmpty(item, ["dateCompleted", "Date Completed"]),
    yearPlayed: firstNonEmpty(item, ["yearPlayed", "Year Played"]),
    dateAdded: firstNonEmpty(item, ["dateAdded", "Date Added"]),
    description: firstNonEmpty(item, ["description", "Description"]),
    genres: firstNonEmpty(item, ["genres", "Genres"]),
    hoursPlayed: firstNonEmpty(item, ["hoursPlayed", "Hours Played"]),
    coverCachedAt: firstNonEmpty(item, ["coverCachedAt", "CoverCachedAt"]),
    developer: firstNonEmpty(item, ["developer", "Developer"]),
    screensotsUrl: firstNonEmpty(item, ["screensotsUrl", "ScreensotsURL"]),
    wishlistOrder: firstNonEmpty(item, ["wishlistOrder", "WishlistOrder"]),
    queuedOrder: firstNonEmpty(item, ["queuedOrder", "QueuedOrder"]),
    igdbId: firstNonEmpty(item, ["igdbId", "IGDB_ID"]),
    igdbIdOverride: firstNonEmpty(item, ["igdbIdOverride", "IGDB_ID_Override"]),
    localCoverUrl: firstNonEmpty(item, ["localCoverUrl", "LocalCoverURL"]),
  };

  return normalizeDateEditableValues(values);
}

type RatingScale = "five" | "ten";

function normalizeRatingValue(value: string, scale: RatingScale): number | null {
  const parsed = Number.parseFloat(value);
  if (Number.isNaN(parsed)) return null;

  if (scale === "ten") {
    let normalized = parsed;
    if (value.includes("%") || normalized > 10) {
      normalized = normalized / 10;
    }
    if (!Number.isFinite(normalized)) return null;
    return Math.max(0, Math.min(10, normalized));
  }

  let normalized = parsed;
  if (value.includes("%")) {
    normalized = normalized / 20;
  } else if (normalized > 5) {
    normalized = normalized / 2;
  }
  if (!Number.isFinite(normalized)) return null;
  return Math.max(0, Math.min(5, normalized));
}

function renderRating(value: string, scale: RatingScale) {
  const score = normalizeRatingValue(value, scale);
  if (score === null) return value || DASH;

  const starScore = scale === "ten" ? score / 2 : score;

  return (
    <span className="ratingValue">
      <span className="stars">
        {Array.from({ length: 5 }, (_, i) => {
          const fill = Math.max(0, Math.min(1, starScore - i));
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
      <span className="score">
        {score.toFixed(1)}/{scale === "ten" ? 10 : 5}
      </span>
    </span>
  );
}

function renderGameUserRating(value: string) {
  return renderRating(value, "ten");
}

function buildInfoRows(item: Record<string, any>, itemType: "game" | "book" | "tv" | "movie"): InfoRow[] {
  if (itemType === "game") {
    const statusRaw = firstNonEmpty(item, ["status", "Status", "gameStatus", "playStatus"]);
    const completedRaw = firstNonEmpty(item, ["completed", "Completed"]);
    const completedDate = firstNonEmpty(item, ["dateCompleted", "Date Completed", "completedDate"]);
    const completedChecked = isTruthyValue(completedRaw) || Boolean(completedDate) || statusRaw.toLowerCase() === "completed";
    return [
      { label: "Release Date", value: firstNonEmpty(item, ["releaseDate", "Release Date"]) || DASH },
      { label: "Platforms", value: firstNonEmpty(item, ["platforms", "Platforms"]) || DASH },
      { label: "Ownership", value: firstNonEmpty(item, ["ownership", "Ownership"]) || DASH },
      { label: "Year Played", value: firstNonEmpty(item, ["yearPlayed", "Year Played"]) || DASH },
      { label: "Hours Played", value: firstNonEmpty(item, ["hoursPlayed", "playtime"]) || DASH },
      { label: "Developer", value: firstNonEmpty(item, ["developer", "studio"]) || DASH },
      { label: "IGDB ID", value: firstNonEmpty(item, ["igdbId", "IGDB_ID"]) || DASH },
      { label: "Date Added", value: firstNonEmpty(item, ["dateAdded", "addedDate"]) || DASH },
      {
        label: "Completion Status",
        value: renderTwoStateToggle(completedChecked, "Completed", "Not Completed"),
      },
      { label: "Date Completed", value: completedDate || DASH },
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
      { label: "User Rating", value: renderRating(firstNonEmpty(item, ["userRating", "UserRating"]) || "", "five") },
      { label: "My Rating", value: renderRating(firstNonEmpty(item, ["myRating", "My Rating", "MyRating"]) || "", "ten") },
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
      { label: "Date Completed", value: firstNonEmpty(item, ["dateCompleted", "Date Completed", "CompletedDate"]) || DASH },
      { label: "First Air Date", value: firstNonEmpty(item, ["firstAirDate"]) || DASH },
      { label: "TMDB Rating", value: renderRating(firstNonEmpty(item, ["tmdbRating", "TMDB_Rating"]) || "", "ten") },
      { label: "Last Air Date", value: firstNonEmpty(item, ["lastAirDate"]) || DASH },
      { label: "My Rating", value: renderRating(firstNonEmpty(item, ["myRating", "MyRating", "My Rating"]) || "", "ten") },
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
    { label: "Watched Date", value: firstNonEmpty(item, ["watchDate", "WatchDate"]) || DASH },
    { label: "Release Status", value: firstNonEmpty(item, ["movieStatus", "status"]) || DASH },
    { label: "Genres", value: firstNonEmpty(item, ["genres"]) || DASH },
    { label: "TMDB ID", value: firstNonEmpty(item, ["tmdbId"]) || DASH },
  ];
}

export const MediaModal: React.FC<MediaModalProps> = ({
  item,
  open,
  onClose,
  onReplaceCover,
  onSaveBookEdits,
  onSaveShowEdits,
  onSaveMovieEdits,
  onSaveGameEdits,
  onDeleteItem,
  gamePlatformOptions = [],
  gameStatusOptions = [],
  gameOwnershipOptions = [],
  gameFormatOptions = [],
  isReplacingCover = false,
  replaceCoverError,
  popupCoverMode,
  onPopupCoverModeChange,
}) => {
  const isStaticSiteBuild = process.env.NEXT_PUBLIC_STATIC_SITE === "true";
  const [posterIndex, setPosterIndex] = React.useState(0);
  const [isEditingBook, setIsEditingBook] = React.useState(false);
  const [isSavingBook, setIsSavingBook] = React.useState(false);
  const [bookSaveError, setBookSaveError] = React.useState<string | null>(null);
  const [bookSaveSuccess, setBookSaveSuccess] = React.useState<string | null>(null);
  const [bookEditValues, setBookEditValues] = React.useState<Record<string, string>>({});
  const [isEditingShow, setIsEditingShow] = React.useState(false);
  const [isSavingShow, setIsSavingShow] = React.useState(false);
  const [showSaveError, setShowSaveError] = React.useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = React.useState<string | null>(null);
  const [showEditValues, setShowEditValues] = React.useState<Record<string, string>>({});
  const [isEditingMovie, setIsEditingMovie] = React.useState(false);
  const [isSavingMovie, setIsSavingMovie] = React.useState(false);
  const [movieSaveError, setMovieSaveError] = React.useState<string | null>(null);
  const [movieSaveSuccess, setMovieSaveSuccess] = React.useState<string | null>(null);
  const [movieEditValues, setMovieEditValues] = React.useState<Record<string, string>>({});
  const [isEditingGame, setIsEditingGame] = React.useState(false);
  const [isSavingGame, setIsSavingGame] = React.useState(false);
  const [gameSaveError, setGameSaveError] = React.useState<string | null>(null);
  const [gameSaveSuccess, setGameSaveSuccess] = React.useState<string | null>(null);
  const [gameEditValues, setGameEditValues] = React.useState<Record<string, string>>({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);
  const [isResyncing, setIsResyncing] = React.useState(false);
  const [isApplyingResync, setIsApplyingResync] = React.useState(false);
  const [resyncError, setResyncError] = React.useState<string | null>(null);
  const [resyncNotice, setResyncNotice] = React.useState<string | null>(null);
  const [resyncPreview, setResyncPreview] = React.useState<ResyncPreview | null>(null);
  const [isCoverDropActive, setIsCoverDropActive] = React.useState(false);
  const [saveResultDialog, setSaveResultDialog] = React.useState<SaveResultDialog | null>(null);
  const currentItemFingerprint = React.useRef("");
  const saveNoticeTimerRef = React.useRef<number | null>(null);
  const coverDragDepthRef = React.useRef(0);
  const descriptionTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const clearSaveNoticeTimer = React.useCallback(() => {
    if (saveNoticeTimerRef.current !== null) {
      window.clearTimeout(saveNoticeTimerRef.current);
      saveNoticeTimerRef.current = null;
    }
  }, []);

  const scheduleSaveNoticeClear = React.useCallback(
    (setter: React.Dispatch<React.SetStateAction<string | null>>) => {
      clearSaveNoticeTimer();
      saveNoticeTimerRef.current = window.setTimeout(() => {
        setter(null);
        saveNoticeTimerRef.current = null;
      }, SAVE_NOTICE_AUTO_DISMISS_MS);
    },
    [clearSaveNoticeTimer]
  );

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
  const resolvedGamePlatformOptions = React.useMemo(() => {
    const values = gamePlatformOptions.filter(Boolean);
    return values.length > 0 ? values : GAME_PLATFORM_FALLBACK_OPTIONS;
  }, [gamePlatformOptions]);
  const resolvedGameStatusOptions = React.useMemo(() => {
    const values = gameStatusOptions.filter(Boolean);
    return values.length > 0 ? values : GAME_STATUS_FALLBACK_OPTIONS;
  }, [gameStatusOptions]);
  const resolvedGameOwnershipOptions = React.useMemo(() => {
    const values = gameOwnershipOptions.filter(Boolean);
    return values.length > 0 ? values : GAME_OWNERSHIP_FALLBACK_OPTIONS;
  }, [gameOwnershipOptions]);
  const resolvedGameFormatOptions = React.useMemo(() => {
    const values = gameFormatOptions.filter(Boolean);
    return values.length > 0 ? values : GAME_FORMAT_FALLBACK_OPTIONS;
  }, [gameFormatOptions]);
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
  const customCoverCandidateUrl = (() => {
    for (const candidate of coverCandidates) {
      const label = String(candidate?.label || "").toLowerCase();
      const url = String(candidate?.url || "").trim();
      if (!url) continue;
      if (label.includes("override") || label.includes("custom")) return url;
    }
    return "";
  })();
  const defaultCoverCandidateUrl = (() => {
    for (const candidate of coverCandidates) {
      const label = String(candidate?.label || "").toLowerCase();
      const url = String(candidate?.url || "").trim();
      if (!url) continue;
      if (label.includes("metadata") || label.includes("default")) return url;
    }
    return "";
  })();
  const canChooseCustomCover = Boolean(customCoverCandidateUrl);
  const canChooseDefaultCover = Boolean(defaultCoverCandidateUrl);
  const preferredPosterUrl =
    popupCoverMode === "default"
      ? defaultCoverCandidateUrl || customCoverCandidateUrl || posterUrl
      : customCoverCandidateUrl || defaultCoverCandidateUrl || posterUrl;
  const heroUrl =
    itemType === "game"
      ? firstNonEmpty(sourceItem, ["screensotsUrl", "ScreensotsURL", "screenshotUrl", "backgroundUrl", "heroUrl"])
      : firstNonEmpty(sourceItem, ["backgroundUrl", "backdropUrl", "screenshotUrl", "bannerUrl", "heroUrl"]);
  const description = firstNonEmpty(sourceItem, ["description", "overview", "summary", "plot"]);

  React.useEffect(() => {
    if (!open || !item) return;
    const preferredIdx = candidateUrls.findIndex((url) => url === preferredPosterUrl);
    setPosterIndex(preferredIdx >= 0 ? preferredIdx : 0);
  }, [open, item, preferredPosterUrl, candidateUrls.join("|")]);

  React.useEffect(() => {
    if (!open || !item) {
      if (!open) {
        clearSaveNoticeTimer();
        setSaveResultDialog(null);
        setBookSaveSuccess(null);
        setShowSaveSuccess(null);
        setMovieSaveSuccess(null);
        setGameSaveSuccess(null);
      }
      return;
    }

    const nextFingerprint = getMediaItemFingerprint(item);
    const isSameItem = nextFingerprint === currentItemFingerprint.current;

    setIsEditingBook(false);
    setIsSavingBook(false);
    setBookEditValues(buildBookEditValues(item));
    setIsEditingShow(false);
    setIsSavingShow(false);
    setShowEditValues(buildShowEditValues(item));
    setIsEditingMovie(false);
    setIsSavingMovie(false);
    setMovieEditValues(buildMovieEditValues(item));
    setIsEditingGame(false);
    setIsSavingGame(false);
    setGameEditValues(buildGameEditValues(item));
    setIsDeleting(false);
    setDeleteError(null);
    setIsResyncing(false);
    setIsApplyingResync(false);
    setResyncError(null);
    setResyncPreview(null);

    if (!isSameItem) {
      setBookSaveError(null);
      setBookSaveSuccess(null);
      setShowSaveError(null);
      setShowSaveSuccess(null);
      setMovieSaveError(null);
      setMovieSaveSuccess(null);
      setGameSaveError(null);
      setGameSaveSuccess(null);
      setResyncNotice(null);
      setSaveResultDialog(null);
    } else {
      clearSaveNoticeTimer();
    }

    currentItemFingerprint.current = nextFingerprint;
  }, [open, item]);

  React.useEffect(() => {
    return () => {
      clearSaveNoticeTimer();
    };
  }, [clearSaveNoticeTimer]);

  const autoSizeDescriptionTextarea = React.useCallback((el?: HTMLTextAreaElement | null) => {
    const target = el ?? descriptionTextareaRef.current;
    if (!target) return;
    target.style.height = "auto";
    target.style.height = `${target.scrollHeight}px`;
  }, []);

  React.useEffect(() => {
    if (!isEditingBook && !isEditingShow && !isEditingMovie && !isEditingGame) return;
    autoSizeDescriptionTextarea();
  }, [isEditingBook, isEditingShow, isEditingMovie, isEditingGame, bookEditValues.description, showEditValues.overview, movieEditValues.overview, gameEditValues.description, autoSizeDescriptionTextarea]);

  const resolvedPosterUrl = candidateUrls[posterIndex] || posterUrl;
  const resolvedCoverSource = coverCandidates.find((c: any) => c.url === resolvedPosterUrl)?.label || coverSource;
  const coverLocation = (() => {
    const label = resolvedCoverSource.toLowerCase();
    if (label.includes("override") || label.includes("custom")) return "Custom Cover";
    return "Metadata Cover";
  })();
  const shouldContainPoster = coverLocation === "Custom Cover";

  if (!open || !item) return null;

  const statusValue =
    itemType === "tv"
      ? firstNonEmpty(sourceItem, ["watchStatus", "WatchStatus", "watched", "Watched"]) || DASH
      : itemType === "movie"
        ? firstNonEmpty(sourceItem, ["watchStatus", "Watch Status", "WatchStatus", "watched", "Watched"]) || DASH
      : firstNonEmpty(sourceItem, ["status", "gameStatus", "movieStatus", "showStatus"]) ||
        firstNonEmpty(sourceItem, ["watchStatus", "playStatus"]) ||
        DASH;
  const statusTone = getStatusTone(String(statusValue || ""));
  const statusDisplayText = statusValue && statusValue !== DASH ? String(statusValue).toUpperCase() : statusValue;
  const categoryChips = Array.from(
    new Set(
      itemType === "book"
        ? splitCommaList(firstNonEmpty(sourceItem, ["categories", "genre", "Genre"]))
        : itemType === "tv" || itemType === "movie" || itemType === "game"
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
            ...(itemType === "game" ? splitTags(firstNonEmpty(sourceItem, ["yearPlayed", "Year Played"])) : []),
          ])
        );
  const infoRows = buildInfoRows(sourceItem, itemType);
  const editableTitle =
    itemType === "book" && isEditingBook
      ? bookEditValues.title || title
      : itemType === "tv" && isEditingShow
        ? showEditValues.title || title
        : itemType === "movie" && isEditingMovie
          ? movieEditValues.title || title
          : itemType === "game" && isEditingGame
            ? gameEditValues.title || title
        : title;
  const editableSubtitle = isEditingBook ? bookEditValues.subtitle || "" : subtitle;
  const tvYearSubtitle = itemType === "tv" ? (isEditingShow ? showEditValues.year || "" : firstNonEmpty(sourceItem, ["year", "Year"])) : "";
  const movieYearSubtitle = itemType === "movie" ? (isEditingMovie ? movieEditValues.year || "" : firstNonEmpty(sourceItem, ["year", "Year"])) : "";
  const gamePlatformSubtitle = itemType === "game" ? firstNonEmpty(sourceItem, ["platform", "Platform"]) : "";
  const gameStatusRaw = itemType === "game" ? firstNonEmpty(sourceItem, ["status", "Status", "gameStatus", "playStatus"]) : "";
  const gameBacklogRaw = itemType === "game" ? firstNonEmpty(sourceItem, ["backlog", "Backlog"]) : "";
  const isGameBacklog = itemType === "game" ? isTruthyValue(gameBacklogRaw) || gameStatusRaw.toLowerCase() === "backlog" : false;
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
  const handleMovieFieldChange = (key: string, value: string) => {
    setMovieEditValues((prev) => ({ ...prev, [key]: value }));
  };
  const handleGameFieldChange = (key: string, value: string) => {
    setGameEditValues((prev) => ({ ...prev, [key]: value }));
  };

  const normalizeCommaTags = (value: string) =>
    value
      .split(/[,\|\/]+/g)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(", ");

  const uploadReplacementCover = async (file: File | null | undefined) => {
    if (!file || !item || !onReplaceCover || isReplacingCover) return;
    await Promise.resolve(onReplaceCover(item, file));
  };

  const handleCoverDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    coverDragDepthRef.current = 0;
    setIsCoverDropActive(false);
    const file = e.dataTransfer?.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await uploadReplacementCover(file);
  };

  const handleSaveBook = async () => {
    if (!item || !onSaveBookEdits) return;
    setSaveResultDialog(null);
    setBookSaveError(null);
    setBookSaveSuccess(null);
    setIsSavingBook(true);
    try {
      await onSaveBookEdits(item, bookEditValues);
      setBookSaveSuccess("Saved to Google Sheet.");
      setSaveResultDialog(buildSaveResultDialog("book", item, bookEditValues, "success"));
      scheduleSaveNoticeClear(setBookSaveSuccess);
      setIsEditingBook(false);
    } catch (e: any) {
      const errorMessage = e?.message || "Failed to save book changes";
      setBookSaveError(errorMessage);
      setSaveResultDialog(buildSaveResultDialog("book", item, bookEditValues, "error", errorMessage));
    } finally {
      setIsSavingBook(false);
    }
  };
  const handleSaveShow = async () => {
    if (!item || !onSaveShowEdits) return;
    setSaveResultDialog(null);
    setShowSaveError(null);
    setShowSaveSuccess(null);
    setIsSavingShow(true);
    try {
      await onSaveShowEdits(item, showEditValues);
      setShowSaveSuccess("Saved to Google Sheet.");
      setSaveResultDialog(buildSaveResultDialog("tv", item, showEditValues, "success"));
      scheduleSaveNoticeClear(setShowSaveSuccess);
      setIsEditingShow(false);
    } catch (e: any) {
      const errorMessage = e?.message || "Failed to save show changes";
      setShowSaveError(errorMessage);
      setSaveResultDialog(buildSaveResultDialog("tv", item, showEditValues, "error", errorMessage));
    } finally {
      setIsSavingShow(false);
    }
  };
  const handleSaveMovie = async () => {
    if (!item || !onSaveMovieEdits) return;
    setSaveResultDialog(null);
    setMovieSaveError(null);
    setMovieSaveSuccess(null);
    setIsSavingMovie(true);
    try {
      await onSaveMovieEdits(item, movieEditValues);
      setMovieSaveSuccess("Saved to Google Sheet.");
      setSaveResultDialog(buildSaveResultDialog("movie", item, movieEditValues, "success"));
      scheduleSaveNoticeClear(setMovieSaveSuccess);
      setIsEditingMovie(false);
    } catch (e: any) {
      const errorMessage = e?.message || "Failed to save movie changes";
      setMovieSaveError(errorMessage);
      setSaveResultDialog(buildSaveResultDialog("movie", item, movieEditValues, "error", errorMessage));
    } finally {
      setIsSavingMovie(false);
    }
  };
  const handleSaveGame = async () => {
    if (!item || !onSaveGameEdits) return;
    setSaveResultDialog(null);
    setGameSaveError(null);
    setGameSaveSuccess(null);
    setIsSavingGame(true);
    try {
      await onSaveGameEdits(item, gameEditValues);
      setGameSaveSuccess("Saved to Google Sheet.");
      setSaveResultDialog(buildSaveResultDialog("game", item, gameEditValues, "success"));
      scheduleSaveNoticeClear(setGameSaveSuccess);
      setIsEditingGame(false);
    } catch (e: any) {
      const errorMessage = e?.message || "Failed to save game changes";
      setGameSaveError(errorMessage);
      setSaveResultDialog(buildSaveResultDialog("game", item, gameEditValues, "error", errorMessage));
    } finally {
      setIsSavingGame(false);
    }
  };
  const handleDeleteItem = async () => {
    if (!item || !onDeleteItem || isDeleting) return;
    const confirmed = window.confirm(`Delete "${title}" from library? This will remove it from the app and spreadsheet.`);
    if (!confirmed) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await onDeleteItem(item);
    } catch (e: any) {
      setDeleteError(e?.message || "Failed to delete item");
    } finally {
      setIsDeleting(false);
    }
  };

  const isAnyEditing = isEditingBook || isEditingShow || isEditingMovie || isEditingGame;
  const isAnySaving = isSavingBook || isSavingShow || isSavingMovie || isSavingGame;
  const canResync =
    itemType === "book"
      ? Boolean(onSaveBookEdits)
      : itemType === "tv"
        ? Boolean(onSaveShowEdits)
        : itemType === "movie"
          ? Boolean(onSaveMovieEdits)
          : Boolean(onSaveGameEdits);

  const buildCurrentValues = (): Record<string, string> => {
    if (itemType === "book") return buildBookEditValues(sourceItem);
    if (itemType === "tv") return buildShowEditValues(sourceItem);
    if (itemType === "movie") return buildMovieEditValues(sourceItem);
    return buildGameEditValues(sourceItem);
  };

  const applyIncomingValue = (target: Record<string, string>, key: string, value: unknown) => {
    const incoming = safeStr(value);
    if (!incoming) return;
    target[key] = incoming;
  };

  const buildResyncUpdates = (currentValues: Record<string, string>, incoming: Record<string, string>) => {
    const next = { ...currentValues };
    if (itemType === "book") {
      applyIncomingValue(next, "title", incoming.title);
      applyIncomingValue(next, "subtitle", incoming.subtitle);
      applyIncomingValue(next, "author", incoming.author);
      applyIncomingValue(next, "releaseDate", incoming.releaseDate);
      applyIncomingValue(next, "description", incoming.description);
      applyIncomingValue(next, "genre", incoming.genre);
      applyIncomingValue(next, "pages", incoming.pages);
      applyIncomingValue(next, "imageUrl", incoming.imageUrl);
      applyIncomingValue(next, "isbn", incoming.isbn);
      applyIncomingValue(next, "googleBooksVolumeId", incoming.googleBooksVolumeId);
      return next;
    }

    if (itemType === "tv") {
      applyIncomingValue(next, "title", incoming.title);
      applyIncomingValue(next, "year", incoming.year);
      applyIncomingValue(next, "tmdbId", incoming.tmdbId);
      applyIncomingValue(next, "firstAirDate", incoming.firstAirDate);
      applyIncomingValue(next, "lastAirDate", incoming.lastAirDate);
      applyIncomingValue(next, "numberOfSeasons", incoming.numberOfSeasons);
      applyIncomingValue(next, "numberOfEpisodes", incoming.numberOfEpisodes);
      applyIncomingValue(next, "showStatus", incoming.showStatus);
      applyIncomingValue(next, "genres", incoming.genres);
      applyIncomingValue(next, "tmdbRating", incoming.tmdbRating);
      applyIncomingValue(next, "overview", incoming.overview);
      applyIncomingValue(next, "posterUrl", incoming.posterUrl);
      applyIncomingValue(next, "backdropUrl", incoming.backdropUrl);
      return next;
    }

    if (itemType === "movie") {
      applyIncomingValue(next, "title", incoming.title);
      applyIncomingValue(next, "year", incoming.year);
      applyIncomingValue(next, "tmdbId", incoming.tmdbId);
      applyIncomingValue(next, "releaseDate", incoming.releaseDate);
      applyIncomingValue(next, "runtime", incoming.runtime);
      applyIncomingValue(next, "status", incoming.status);
      applyIncomingValue(next, "genres", incoming.genres);
      applyIncomingValue(next, "tmdbRating", incoming.tmdbRating);
      applyIncomingValue(next, "overview", incoming.overview);
      applyIncomingValue(next, "posterUrl", incoming.posterUrl);
      applyIncomingValue(next, "backdropUrl", incoming.backdropUrl);
      return next;
    }

    applyIncomingValue(next, "title", incoming.title);
    applyIncomingValue(next, "releaseDate", incoming.releaseDate);
    applyIncomingValue(next, "releaseDateAlt", incoming.releaseDate);
    applyIncomingValue(next, "platforms", incoming.platforms);
    applyIncomingValue(next, "igdbId", incoming.igdbId);
    applyIncomingValue(next, "igdbRating", incoming.igdbRating);
    applyIncomingValue(next, "genres", incoming.genres);
    applyIncomingValue(next, "developer", incoming.developer);
    applyIncomingValue(next, "description", incoming.description);
    applyIncomingValue(next, "coverUrl", incoming.coverUrl);
    return next;
  };

  const handleResyncMetadata = async () => {
    if (!item || !canResync || isResyncing || isApplyingResync || isDeleting || isAnySaving) return;
    setResyncError(null);
    setResyncNotice(null);
    setResyncPreview(null);

    if (isAnyEditing) {
      setResyncError("Save or cancel current edits before running metadata resync.");
      return;
    }

    const queryTitle = safeStr(sourceItem.title);
    const bookIsbn = safeStr(sourceItem.isbn);
    const lookupId =
      itemType === "book"
        ? safeStr(sourceItem.googleBooksVolumeId)
        : itemType === "tv" || itemType === "movie"
          ? safeStr(sourceItem.tmdbId)
          : safeStr(sourceItem.igdbIdOverride || sourceItem.igdbId);
    const fallbackQuery = itemType === "book" ? queryTitle || (bookIsbn ? `isbn:${bookIsbn}` : "") : queryTitle;

    if (!lookupId && !fallbackQuery) {
      setResyncError("Unable to resync: missing metadata identifier and title.");
      return;
    }
    if (isStaticSiteBuild) {
      setResyncError(STATIC_SITE_RESYNC_MESSAGE);
      return;
    }

    setIsResyncing(true);
    try {
      const params = new URLSearchParams({ type: itemType });
      if (lookupId) params.set("lookupId", lookupId);
      if (fallbackQuery) params.set("query", fallbackQuery);
      const res = await fetch(`/api/media-search?${params.toString()}`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        results?: Array<{ data?: Record<string, string> }>;
      };
      if (!res.ok || !payload.ok) {
        throw new Error(payload.error || "Metadata resync failed.");
      }
      const matched = Array.isArray(payload.results) ? payload.results[0] : null;
      const incomingData = matched?.data || {};
      if (!matched || !incomingData || typeof incomingData !== "object") {
        setResyncNotice(`No metadata result found from ${RESYNC_SOURCE_LABELS[itemType]}.`);
        return;
      }

      const currentValues = buildCurrentValues();
      const nextValues = buildResyncUpdates(currentValues, incomingData);
      const changes = RESYNC_FIELDS[itemType]
        .map((key) => {
          const before = safeStr(currentValues[key]);
          const after = safeStr(nextValues[key]);
          if (before === after) return null;
          return {
            key,
            label: getFieldLabelForType(itemType, key),
            before: before || DASH,
            after: after || DASH,
            selected: true,
          } as ResyncDiffRow;
        })
        .filter(Boolean) as ResyncDiffRow[];

      if (changes.length === 0) {
        setResyncNotice(`No metadata changes found from ${RESYNC_SOURCE_LABELS[itemType]}.`);
        return;
      }

      setResyncPreview({
        sourceLabel: RESYNC_SOURCE_LABELS[itemType],
        baseValues: currentValues,
        updates: nextValues,
        changes,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Metadata resync failed.";
      setResyncError(message);
    } finally {
      setIsResyncing(false);
    }
  };

  const handleApplyResync = async () => {
    if (!item || !resyncPreview || isApplyingResync || isDeleting || isAnySaving) return;
    const selectedChanges = resyncPreview.changes.filter((change) => change.selected);
    if (selectedChanges.length === 0) {
      setResyncError("Select at least one changed field to apply.");
      return;
    }
    const selectedKeys = new Set(selectedChanges.map((change) => change.key));
    const finalUpdates = { ...resyncPreview.baseValues };
    Object.keys(resyncPreview.updates).forEach((key) => {
      if (selectedKeys.has(key)) {
        finalUpdates[key] = resyncPreview.updates[key];
      }
    });

    setIsApplyingResync(true);
    setResyncError(null);
    try {
      if (itemType === "book") {
        if (!onSaveBookEdits) throw new Error("Book save handler is unavailable.");
        await onSaveBookEdits(item, finalUpdates);
      } else if (itemType === "tv") {
        if (!onSaveShowEdits) throw new Error("TV save handler is unavailable.");
        await onSaveShowEdits(item, finalUpdates);
      } else if (itemType === "movie") {
        if (!onSaveMovieEdits) throw new Error("Movie save handler is unavailable.");
        await onSaveMovieEdits(item, finalUpdates);
      } else {
        if (!onSaveGameEdits) throw new Error("Game save handler is unavailable.");
        await onSaveGameEdits(item, finalUpdates);
      }

      setResyncNotice(
        `Metadata updated from ${resyncPreview.sourceLabel}. Applied ${selectedChanges.length} change${
          selectedChanges.length === 1 ? "" : "s"
        }.`
      );
      setResyncPreview(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Failed to apply metadata changes.";
      setResyncError(message);
    } finally {
      setIsApplyingResync(false);
    }
  };

  const selectedResyncCount = resyncPreview
    ? resyncPreview.changes.filter((change) => change.selected).length
    : 0;

  const setAllResyncSelections = (selected: boolean) => {
    setResyncPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        changes: prev.changes.map((change) => ({ ...change, selected })),
      };
    });
  };

  const toggleResyncSelection = (key: string) => {
    setResyncPreview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        changes: prev.changes.map((change) =>
          change.key === key ? { ...change, selected: !change.selected } : change
        ),
      };
    });
  };

  const activeSaveError =
    itemType === "book"
      ? bookSaveError
      : itemType === "tv"
        ? showSaveError
        : itemType === "movie"
          ? movieSaveError
          : gameSaveError;
  const activeSaveSuccess =
    itemType === "book"
      ? bookSaveSuccess
      : itemType === "tv"
        ? showSaveSuccess
        : itemType === "movie"
          ? movieSaveSuccess
          : gameSaveSuccess;

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
                  setBookSaveSuccess(null);
                  setIsEditingBook((prev) => !prev);
                  if (isEditingBook) setBookEditValues(buildBookEditValues(sourceItem));
                }}
                disabled={isSavingBook || isDeleting}
              >
                {isEditingBook ? "Cancel" : "Edit"}
              </button>
              {isEditingBook ? (
                <button type="button" className="saveButton topActionButton" onClick={handleSaveBook} disabled={isSavingBook || isDeleting}>
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
                  setShowSaveSuccess(null);
                  setIsEditingShow((prev) => !prev);
                  if (isEditingShow) setShowEditValues(buildShowEditValues(sourceItem));
                }}
                disabled={isSavingShow || isDeleting}
              >
                {isEditingShow ? "Cancel" : "Edit"}
              </button>
              {isEditingShow ? (
                <button type="button" className="saveButton topActionButton" onClick={handleSaveShow} disabled={isSavingShow || isDeleting}>
                  {isSavingShow ? "Saving..." : "Save"}
                </button>
              ) : null}
            </>
          ) : null}
          {itemType === "movie" && onSaveMovieEdits ? (
            <>
              <button
                type="button"
                className="editButton topActionButton"
                onClick={() => {
                  setMovieSaveError(null);
                  setMovieSaveSuccess(null);
                  setIsEditingMovie((prev) => !prev);
                  if (isEditingMovie) setMovieEditValues(buildMovieEditValues(sourceItem));
                }}
                disabled={isSavingMovie || isDeleting}
              >
                {isEditingMovie ? "Cancel" : "Edit"}
              </button>
              {isEditingMovie ? (
                <button type="button" className="saveButton topActionButton" onClick={handleSaveMovie} disabled={isSavingMovie || isDeleting}>
                  {isSavingMovie ? "Saving..." : "Save"}
                </button>
              ) : null}
            </>
          ) : null}
          {itemType === "game" && onSaveGameEdits ? (
            <>
              <button
                type="button"
                className="editButton topActionButton"
                onClick={() => {
                  setGameSaveError(null);
                  setGameSaveSuccess(null);
                  setIsEditingGame((prev) => !prev);
                  if (isEditingGame) setGameEditValues(buildGameEditValues(sourceItem));
                }}
                disabled={isSavingGame || isDeleting}
              >
                {isEditingGame ? "Cancel" : "Edit"}
              </button>
              {isEditingGame ? (
                <button type="button" className="saveButton topActionButton" onClick={handleSaveGame} disabled={isSavingGame || isDeleting}>
                  {isSavingGame ? "Saving..." : "Save"}
                </button>
              ) : null}
            </>
          ) : null}
          {canResync ? (
            <button
              type="button"
              className="resyncButton topActionButton"
              onClick={() => void handleResyncMetadata()}
              disabled={isResyncing || isApplyingResync || isDeleting || isAnySaving || isAnyEditing}
              title={isAnyEditing ? "Save or cancel current edits first" : "Fetch latest metadata and preview changes"}
            >
              {isResyncing ? "Resyncing..." : "Resync"}
            </button>
          ) : null}
          {onDeleteItem ? (
            <button type="button" className="deleteButton topActionButton" onClick={handleDeleteItem} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          ) : null}
          <button type="button" className="closeButton" aria-label="Close details" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="modalSaveNoticeStack">
          {!saveResultDialog && activeSaveSuccess ? <div className="bookSaveSuccess">{activeSaveSuccess}</div> : null}
          {!saveResultDialog && activeSaveError ? <div className="bookSaveError">{activeSaveError}</div> : null}
          {deleteError ? <div className="bookSaveError">{deleteError}</div> : null}
          {resyncNotice ? <div className="bookSaveSuccess">{resyncNotice}</div> : null}
          {resyncError ? <div className="bookSaveError">{resyncError}</div> : null}
        </div>
        {saveResultDialog ? (
          <div className="saveResultDialogOverlay" onMouseDown={() => setSaveResultDialog(null)}>
            <div
              className={`saveResultDialogCard ${saveResultDialog.tone === "error" ? "error" : "success"}`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="saveResultDialogEyebrow">{saveResultDialog.tone === "success" ? "Save Result" : "Save Error"}</div>
              <div className="saveResultDialogTitle">{saveResultDialog.title}</div>
              <div className="saveResultDialogMessage">{saveResultDialog.message}</div>
              <div className="saveResultDialogDetails">
                {saveResultDialog.details.map((detail, index) => (
                  <div key={`${saveResultDialog.title}-${index}`} className="saveResultDialogDetail">
                    {detail}
                  </div>
                ))}
              </div>
              <div className="saveResultDialogActions">
                <button type="button" className="saveResultDialogCloseButton" onClick={() => setSaveResultDialog(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {resyncPreview ? (
          <div className="metadataDiffCard">
            <div className="metadataDiffHeader">
              <div className="metadataDiffTitle">Metadata updates available from {resyncPreview.sourceLabel}</div>
              <div className="metadataDiffCount">
                {selectedResyncCount}/{resyncPreview.changes.length} selected
              </div>
            </div>
            <div className="metadataDiffSelectionActions">
              <button
                type="button"
                className="metadataDiffSelectButton"
                onClick={() => setAllResyncSelections(true)}
                disabled={isApplyingResync}
              >
                Select All
              </button>
              <button
                type="button"
                className="metadataDiffSelectButton"
                onClick={() => setAllResyncSelections(false)}
                disabled={isApplyingResync}
              >
                Select None
              </button>
            </div>
            <div className="metadataDiffGrid">
              {resyncPreview.changes.map((change) => (
                <div key={change.key} className="metadataDiffRow">
                  <label className="metadataDiffToggle">
                    <input
                      type="checkbox"
                      checked={change.selected}
                      onChange={() => toggleResyncSelection(change.key)}
                      disabled={isApplyingResync}
                    />
                  </label>
                  <div className="metadataDiffLabel">{change.label}</div>
                  <div className="metadataDiffBefore">{change.before}</div>
                  <div className="metadataDiffArrow">→</div>
                  <div className="metadataDiffAfter">{change.after}</div>
                </div>
              ))}
            </div>
            <div className="metadataDiffActions">
              <button
                type="button"
                className="saveButton topActionButton"
                onClick={() => void handleApplyResync()}
                disabled={isApplyingResync || isResyncing || isDeleting || isAnySaving || selectedResyncCount === 0}
              >
                {isApplyingResync ? "Applying..." : `Apply ${selectedResyncCount} Change${selectedResyncCount === 1 ? "" : "s"}`}
              </button>
              <button
                type="button"
                className="editButton topActionButton"
                onClick={() => setResyncPreview(null)}
                disabled={isApplyingResync}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div className="contentLayout">
          <aside className="leftPane">
            {posterUrl ? (
              <div
                className={`posterWrap${onReplaceCover ? " posterWrapDroppable" : ""}${isCoverDropActive ? " posterWrapDropActive" : ""}`}
                onDragEnter={(e) => {
                  if (!onReplaceCover || isReplacingCover) return;
                  e.preventDefault();
                  e.stopPropagation();
                  coverDragDepthRef.current += 1;
                  setIsCoverDropActive(true);
                }}
                onDragOver={(e) => {
                  if (!onReplaceCover || isReplacingCover) return;
                  e.preventDefault();
                  e.stopPropagation();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDragLeave={(e) => {
                  if (!onReplaceCover || isReplacingCover) return;
                  e.preventDefault();
                  e.stopPropagation();
                  coverDragDepthRef.current = Math.max(0, coverDragDepthRef.current - 1);
                  if (coverDragDepthRef.current === 0) setIsCoverDropActive(false);
                }}
                onDrop={handleCoverDrop}
              >
                <img
                  src={resolvedPosterUrl}
                  alt={title}
                  className="poster"
                  style={{ objectFit: shouldContainPoster ? "contain" : "cover" }}
                  onError={() => {
                    setPosterIndex((idx) => (idx < candidateUrls.length - 1 ? idx + 1 : idx));
                  }}
                />
                {onReplaceCover ? (
                  <div className={`posterDropOverlay${isCoverDropActive ? " visible" : ""}`}>
                    {isReplacingCover ? "Uploading..." : "Drop image to replace cover"}
                  </div>
                ) : null}
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
                uploadReplacementCover(file);
                e.currentTarget.value = "";
              }}
            />
            {(itemType === "book" && isEditingBook) || (itemType === "tv" && isEditingShow) || (itemType === "movie" && isEditingMovie) || (itemType === "game" && isEditingGame) ? (
              <>
                <input
                  type="text"
                  value={
                    itemType === "book"
                      ? bookEditValues.title || ""
                      : itemType === "tv"
                        ? showEditValues.title || ""
                        : itemType === "movie"
                          ? movieEditValues.title || ""
                          : gameEditValues.title || ""
                  }
                  onChange={(e) =>
                    itemType === "book"
                      ? handleBookFieldChange("title", e.target.value)
                      : itemType === "tv"
                        ? handleShowFieldChange("title", e.target.value)
                        : itemType === "movie"
                          ? handleMovieFieldChange("title", e.target.value)
                          : handleGameFieldChange("title", e.target.value)
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
                ) : itemType === "tv" ? (
                  <input
                    type="text"
                    value={showEditValues.year || ""}
                    onChange={(e) => handleShowFieldChange("year", e.target.value)}
                    className="subtitleInput"
                    placeholder="Year"
                  />
                ) : (
                  <input
                    type="text"
                    value={itemType === "movie" ? movieEditValues.year || "" : gameEditValues.yearPlayed || ""}
                    onChange={(e) => {
                      if (itemType === "movie") {
                        handleMovieFieldChange("year", e.target.value);
                      } else {
                        handleGameFieldChange("yearPlayed", e.target.value);
                      }
                    }}
                    className="subtitleInput"
                    placeholder={itemType === "movie" ? "Year" : "Year Played (e.g. 2025, 2026)"}
                  />
                )}
              </>
            ) : (
              <>
                <h2 className="title">{editableTitle}</h2>
                {itemType === "book" && editableSubtitle ? <div className="subtitle">{editableSubtitle}</div> : null}
                {itemType === "tv" && tvYearSubtitle ? <div className="subtitle">{tvYearSubtitle}</div> : null}
                {itemType === "movie" && movieYearSubtitle ? <div className="subtitle">{movieYearSubtitle}</div> : null}
                {itemType === "game" && gamePlatformSubtitle ? <div className="subtitle">{gamePlatformSubtitle}</div> : null}
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
              {onPopupCoverModeChange && item && (canChooseCustomCover || canChooseDefaultCover) ? (
                <div className="coverModeRow">
                  {canChooseCustomCover ? (
                    <button
                      type="button"
                      className={`coverModeButton${popupCoverMode !== "default" ? " active" : ""}`}
                      onClick={() => onPopupCoverModeChange(item, "custom")}
                    >
                      Use Custom
                    </button>
                  ) : null}
                  {canChooseDefaultCover ? (
                    <button
                      type="button"
                      className={`coverModeButton${popupCoverMode === "default" ? " active" : ""}`}
                      onClick={() => onPopupCoverModeChange(item, "default")}
                    >
                      Use Default
                    </button>
                  ) : null}
                </div>
              ) : null}
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
              <div className="chipSectionLabel">{itemType === "tv" || itemType === "movie" ? "Watch Status" : "Status"}</div>
              <div className={`statusValue statusValueProminent${statusTone ? ` statusTone-${statusTone}` : ""}`}>
                {statusDisplayText}
              </div>
            </div>
            {itemType === "game" ? (
              <div className="chipSection">
                <div className="chipSectionLabel">Backlog Status</div>
                <div className="statusValue">{renderTwoStateToggle(isGameBacklog, "Backlog", "Not in Backlog")}</div>
              </div>
            ) : null}
            <div className="chipSection">
              <div className="chipSectionLabel">{itemType === "book" || itemType === "tv" || itemType === "movie" || itemType === "game" ? "Genres" : "Categories"}</div>
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

          <section className={`rightPane${itemType === "book" ? " bookRightPane" : ""}${isEditingBook || isEditingShow || isEditingMovie || isEditingGame ? " bookEditRightPane" : ""}`}>
            {itemType !== "book" ? (
              heroUrl ? <img src={heroUrl} alt={`${title} screenshot`} className={`heroImage${itemType === "tv" ? " heroImageFullArt" : ""}`} /> : null
            ) : null}

            {description && itemType !== "book" && !(itemType === "tv" && isEditingShow) && !(itemType === "movie" && isEditingMovie) && !(itemType === "game" && isEditingGame) ? (
              <div className="descriptionCard">
                <div className="label">Description</div>
                <div className="description">{description}</div>
              </div>
            ) : null}

            {itemType === "game" && !isEditingGame ? (
              <div className="infoGrid">
                <div className="infoCard">
                  <div className="label">User Rating</div>
                  <div className="value">
                    {renderGameUserRating(firstNonEmpty(sourceItem, ["rating", "Rating", "igdbRating", "IGDB Rating"]) || "")}
                  </div>
                </div>
                <div className="infoCard">
                  <div className="label">My Rating</div>
                  <div className="value">{renderRating(firstNonEmpty(sourceItem, ["myRating", "My Rating"]) || "", "ten")}</div>
                </div>
              </div>
            ) : null}

            {itemType === "movie" && !isEditingMovie ? (
              <div className="infoGrid">
                <div className="infoCard">
                  <div className="label">TMDB Rating</div>
                  <div className="value">{renderRating(firstNonEmpty(sourceItem, ["tmdbRating", "TMDB_Rating"]) || "", "ten")}</div>
                </div>
                <div className="infoCard">
                  <div className="label">My Rating</div>
                  <div className="value">{renderRating(firstNonEmpty(sourceItem, ["myRating", "MyRating", "My Rating"]) || "", "ten")}</div>
                </div>
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
                    ) : field.key === "ownership" ? (
                      <select
                        value={bookEditValues[field.key] || ""}
                        onChange={(e) => handleBookFieldChange(field.key, e.target.value)}
                        className="editSelect"
                      >
                        <option value="">Select ownership</option>
                        {BOOK_OWNERSHIP_OPTIONS.map((ownership) => (
                          <option key={ownership} value={ownership}>
                            {ownership}
                          </option>
                        ))}
                        {bookEditValues[field.key] && !BOOK_OWNERSHIP_OPTIONS.includes(bookEditValues[field.key]) ? (
                          <option value={bookEditValues[field.key]}>{bookEditValues[field.key]}</option>
                        ) : null}
                      </select>
                    ) : field.key === "type" ? (
                      <select
                        value={bookEditValues[field.key] || ""}
                        onChange={(e) => handleBookFieldChange(field.key, e.target.value)}
                        className="editSelect"
                      >
                        <option value="">Select type</option>
                        {BOOK_TYPE_OPTIONS.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                        {bookEditValues[field.key] && !BOOK_TYPE_OPTIONS.includes(bookEditValues[field.key]) ? (
                          <option value={bookEditValues[field.key]}>{bookEditValues[field.key]}</option>
                        ) : null}
                      </select>
                    ) : (
                      <input
                        type={isDateEditFieldKey(field.key) ? "date" : "text"}
                        value={bookEditValues[field.key] || ""}
                        onChange={(e) => handleBookFieldChange(field.key, e.target.value)}
                        className="editInput"
                      />
                    )}
                  </label>
                ))}
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
                      ) : field.key === "watchStatus" ? (
                        <select
                          value={showEditValues[field.key] || ""}
                          onChange={(e) => handleShowFieldChange(field.key, e.target.value)}
                          className="editSelect"
                        >
                          <option value="">Select watch status</option>
                          {SHOW_WATCH_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                          {showEditValues[field.key] && !SHOW_WATCH_STATUS_OPTIONS.includes(showEditValues[field.key]) ? (
                            <option value={showEditValues[field.key]}>{showEditValues[field.key]}</option>
                          ) : null}
                        </select>
                      ) : field.key === "showStatus" ? (
                        <select
                          value={showEditValues[field.key] || ""}
                          onChange={(e) => handleShowFieldChange(field.key, e.target.value)}
                          className="editSelect"
                        >
                          <option value="">Select show status</option>
                          {SHOW_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                          {showEditValues[field.key] && !SHOW_STATUS_OPTIONS.includes(showEditValues[field.key]) ? (
                            <option value={showEditValues[field.key]}>{showEditValues[field.key]}</option>
                          ) : null}
                        </select>
                      ) : field.key === "ownership" ? (
                        <select
                          value={showEditValues[field.key] || ""}
                          onChange={(e) => handleShowFieldChange(field.key, e.target.value)}
                          className="editSelect"
                        >
                          <option value="">Select ownership</option>
                          {SHOW_OWNERSHIP_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                          {showEditValues[field.key] && !SHOW_OWNERSHIP_OPTIONS.includes(showEditValues[field.key]) ? (
                            <option value={showEditValues[field.key]}>{showEditValues[field.key]}</option>
                          ) : null}
                        </select>
                      ) : (
                        <input
                          type={isDateEditFieldKey(field.key) ? "date" : "text"}
                          value={showEditValues[field.key] || ""}
                          onChange={(e) => handleShowFieldChange(field.key, e.target.value)}
                          className="editInput"
                        />
                      )}
                    </label>
                  ))}
              </div>
            ) : itemType === "movie" && isEditingMovie ? (
              <div className="editGrid">
                {[...MOVIE_EDIT_FIELDS]
                  .sort((a, b) => (a.key === "overview" ? -1 : b.key === "overview" ? 1 : 0))
                  .map((field) => (
                    <label key={field.key} className={`editField${field.key === "overview" ? " editFieldFullWidth" : ""}`}>
                      <span className="editLabel">{field.label}</span>
                      {field.multiline ? (
                        <textarea
                          ref={field.key === "overview" ? descriptionTextareaRef : undefined}
                          value={movieEditValues[field.key] || ""}
                          onChange={(e) => {
                            handleMovieFieldChange(field.key, e.target.value);
                            if (field.key === "overview") autoSizeDescriptionTextarea(e.currentTarget);
                          }}
                          className={`editTextarea${field.key === "overview" ? " editDescriptionTextarea" : ""}`}
                          rows={field.key === "overview" ? 8 : 4}
                        />
                      ) : field.key === "watchStatus" ? (
                        <select
                          value={movieEditValues[field.key] || ""}
                          onChange={(e) => handleMovieFieldChange(field.key, e.target.value)}
                          className="editSelect"
                        >
                          <option value="">Select watch status</option>
                          {MOVIE_WATCH_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                          {movieEditValues[field.key] && !MOVIE_WATCH_STATUS_OPTIONS.includes(movieEditValues[field.key]) ? (
                            <option value={movieEditValues[field.key]}>{movieEditValues[field.key]}</option>
                          ) : null}
                        </select>
                      ) : field.key === "status" ? (
                        <select
                          value={movieEditValues[field.key] || ""}
                          onChange={(e) => handleMovieFieldChange(field.key, e.target.value)}
                          className="editSelect"
                        >
                          <option value="">Select release status</option>
                          {MOVIE_STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                          {movieEditValues[field.key] && !MOVIE_STATUS_OPTIONS.includes(movieEditValues[field.key]) ? (
                            <option value={movieEditValues[field.key]}>{movieEditValues[field.key]}</option>
                          ) : null}
                        </select>
                      ) : field.key === "ownership" ? (
                        <select
                          value={movieEditValues[field.key] || ""}
                          onChange={(e) => handleMovieFieldChange(field.key, e.target.value)}
                          className="editSelect"
                        >
                          <option value="">Select ownership</option>
                          {MOVIE_OWNERSHIP_OPTIONS.map((ownership) => (
                            <option key={ownership} value={ownership}>
                              {ownership}
                            </option>
                          ))}
                          {movieEditValues[field.key] && !MOVIE_OWNERSHIP_OPTIONS.includes(movieEditValues[field.key]) ? (
                            <option value={movieEditValues[field.key]}>{movieEditValues[field.key]}</option>
                          ) : null}
                        </select>
                      ) : (
                        <input
                          type={isDateEditFieldKey(field.key) ? "date" : "text"}
                          value={movieEditValues[field.key] || ""}
                          onChange={(e) => handleMovieFieldChange(field.key, e.target.value)}
                          className="editInput"
                        />
                      )}
                    </label>
                  ))}
              </div>
            ) : itemType === "game" && isEditingGame ? (
              <>
                <div className="editGrid">
                  {[...GAME_EDIT_FIELDS]
                    .filter((field) => field.key !== "platform" && field.key !== "format")
                    .sort((a, b) => (a.key === "description" ? -1 : b.key === "description" ? 1 : 0))
                    .map((field) => (
                      <label key={field.key} className={`editField${field.key === "description" ? " editFieldFullWidth" : ""}`}>
                        <span className="editLabel">{field.label}</span>
                        {field.multiline ? (
                          <textarea
                            ref={field.key === "description" ? descriptionTextareaRef : undefined}
                            value={gameEditValues[field.key] || ""}
                            onChange={(e) => {
                              handleGameFieldChange(field.key, e.target.value);
                              if (field.key === "description") autoSizeDescriptionTextarea(e.currentTarget);
                            }}
                            className={`editTextarea${field.key === "description" ? " editDescriptionTextarea" : ""}`}
                            rows={field.key === "description" ? 8 : 4}
                          />
                        ) : field.key === "status" ? (
                          <select
                            value={gameEditValues[field.key] || ""}
                            onChange={(e) => handleGameFieldChange(field.key, e.target.value)}
                            className="editInput"
                          >
                            <option value="">Select status</option>
                            {resolvedGameStatusOptions.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                            {gameEditValues[field.key] && !resolvedGameStatusOptions.includes(gameEditValues[field.key]) ? (
                              <option value={gameEditValues[field.key]}>{gameEditValues[field.key]}</option>
                            ) : null}
                          </select>
                        ) : field.key === "ownership" ? (
                          <select
                            value={gameEditValues[field.key] || ""}
                            onChange={(e) => handleGameFieldChange(field.key, e.target.value)}
                            className="editInput"
                          >
                            <option value="">Select ownership</option>
                            {resolvedGameOwnershipOptions.map((ownership) => (
                              <option key={ownership} value={ownership}>
                                {ownership}
                              </option>
                            ))}
                            {gameEditValues[field.key] && !resolvedGameOwnershipOptions.includes(gameEditValues[field.key]) ? (
                              <option value={gameEditValues[field.key]}>{gameEditValues[field.key]}</option>
                            ) : null}
                          </select>
                        ) : field.key === "backlog" || field.key === "completed" ? (
                          <select
                            value={gameEditValues[field.key] || ""}
                            onChange={(e) => handleGameFieldChange(field.key, e.target.value)}
                            className="editInput"
                          >
                            <option value="">Select Yes/No</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                            {gameEditValues[field.key] && !["Yes", "No"].includes(gameEditValues[field.key]) ? (
                              <option value={gameEditValues[field.key]}>{gameEditValues[field.key]}</option>
                            ) : null}
                          </select>
                        ) : (
                          <input
                            type={isDateEditFieldKey(field.key) ? "date" : "text"}
                            value={gameEditValues[field.key] || ""}
                            onChange={(e) => handleGameFieldChange(field.key, e.target.value)}
                            className="editInput"
                            placeholder={field.key === "yearPlayed" ? "e.g. 2025, 2026" : undefined}
                          />
                        )}
                        {field.key === "yearPlayed" ? <span className="editHelp">Separate multiple years with commas</span> : null}
                      </label>
                    ))}
                </div>
                <div className="editGrid" style={{ marginTop: 8 }}>
                  {GAME_EDIT_FIELDS
                    .filter((field) => field.key === "platform" || field.key === "format")
                    .map((field) => (
                      <label key={field.key} className="editField">
                        <span className="editLabel">{field.label}</span>
                        {field.key === "platform" ? (
                          (() => {
                            const selectedPlatforms = splitCommaValues(gameEditValues[field.key] || "");
                            const platformOptions = Array.from(new Set([...resolvedGamePlatformOptions, ...selectedPlatforms]));
                            return (
                              <select
                                multiple
                                value={selectedPlatforms}
                                onChange={(e) => {
                                  const selected = Array.from(e.currentTarget.selectedOptions).map((opt) => opt.value);
                                  handleGameFieldChange(field.key, selected.join(", "));
                                }}
                                className="editInput multiSelectInput"
                              >
                                {platformOptions.map((platform) => (
                                  <option key={platform} value={platform}>
                                    {platform}
                                  </option>
                                ))}
                              </select>
                            );
                          })()
                        ) : (
                          (() => {
                            const selectedFormats = splitCommaValues(gameEditValues[field.key] || "");
                            const formatOptions = Array.from(new Set([...resolvedGameFormatOptions, ...selectedFormats]));
                            return (
                              <select
                                multiple
                                value={selectedFormats}
                                onChange={(e) => {
                                  const selected = Array.from(e.currentTarget.selectedOptions).map((opt) => opt.value);
                                  handleGameFieldChange(field.key, selected.join(", "));
                                }}
                                className="editInput multiSelectInput"
                              >
                                {formatOptions.map((format) => (
                                  <option key={format} value={format}>
                                    {format}
                                  </option>
                                ))}
                              </select>
                            );
                          })()
                        )}
                      </label>
                    ))}
                </div>
              </>
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
          background: rgba(0, 0, 0, 0.02);
        }

        .mediaModalCard {
          position: relative;
          width: min(1320px, 96vw);
          max-height: min(92vh, 1100px);
          overflow: auto;
          padding: 10px 12px 12px;
          border-radius: 22px;
          border: 1px solid rgba(108, 146, 214, 0.35);
          background: linear-gradient(180deg, rgba(18, 34, 61, 0.78) 0%, rgba(12, 24, 44, 0.74) 100%);
          box-shadow: 0 18px 44px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(2px);
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        .mediaModalCard::-webkit-scrollbar {
          width: 0;
          height: 0;
          display: none;
        }

        .closeButton {
          width: 30px;
          height: 30px;
          border: 1px solid rgba(120, 153, 220, 0.5);
          border-radius: 10px;
          background: rgba(14, 30, 58, 0.72);
          color: #dbe6fa;
          font-size: 19px;
          line-height: 1;
          cursor: pointer;
        }

        .topRightActions {
          position: absolute;
          top: 8px;
          right: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          z-index: 2;
        }

        .modalSaveNoticeStack {
          position: absolute;
          top: 48px;
          left: 12px;
          right: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          z-index: 4;
          pointer-events: none;
        }

        .saveResultDialogOverlay {
          position: absolute;
          inset: 0;
          z-index: 7;
          display: grid;
          place-items: start center;
          padding: 74px 16px 16px;
          background: rgba(6, 13, 27, 0.36);
          backdrop-filter: blur(3px);
        }

        .saveResultDialogCard {
          width: min(520px, 100%);
          border-radius: 18px;
          border: 1px solid rgba(130, 193, 255, 0.52);
          background: linear-gradient(180deg, rgba(22, 46, 82, 0.96) 0%, rgba(12, 25, 47, 0.96) 100%);
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.42);
          padding: 16px;
        }

        .saveResultDialogCard.error {
          border-color: rgba(255, 160, 160, 0.48);
          background: linear-gradient(180deg, rgba(63, 23, 33, 0.96) 0%, rgba(36, 13, 20, 0.96) 100%);
        }

        .saveResultDialogEyebrow {
          color: rgba(194, 215, 248, 0.85);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .saveResultDialogTitle {
          margin-top: 4px;
          color: #f3f8ff;
          font-size: 22px;
          line-height: 1.1;
          font-weight: 800;
        }

        .saveResultDialogMessage {
          margin-top: 10px;
          color: #e0ecff;
          font-size: 13px;
          line-height: 1.45;
          font-weight: 600;
        }

        .saveResultDialogDetails {
          margin-top: 12px;
          display: grid;
          gap: 8px;
        }

        .saveResultDialogDetail {
          border-radius: 10px;
          border: 1px solid rgba(113, 153, 214, 0.34);
          background: rgba(8, 18, 36, 0.48);
          color: #d7e7ff;
          padding: 9px 10px;
          font-size: 12px;
          line-height: 1.4;
        }

        .saveResultDialogCard.error .saveResultDialogDetail {
          border-color: rgba(190, 115, 115, 0.34);
          background: rgba(31, 10, 16, 0.44);
          color: #ffd5d5;
        }

        .saveResultDialogActions {
          margin-top: 14px;
          display: flex;
          justify-content: flex-end;
        }

        .saveResultDialogCloseButton {
          border: 1px solid rgba(130, 193, 255, 0.52);
          border-radius: 10px;
          background: rgba(39, 100, 186, 0.35);
          color: #e7f3ff;
          padding: 7px 12px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .saveResultDialogCard.error .saveResultDialogCloseButton {
          border-color: rgba(255, 160, 160, 0.45);
          background: rgba(130, 46, 46, 0.4);
          color: #fff1f1;
        }

        .contentLayout {
          --posterColumnWidth: 270px;
          display: grid;
          grid-template-columns: var(--posterColumnWidth) minmax(0, 1fr);
          gap: 12px;
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
          position: relative;
        }

        .posterWrapDroppable {
          cursor: copy;
        }

        .posterWrapDropActive .poster {
          border-color: rgba(157, 205, 255, 0.95);
          box-shadow: 0 0 0 2px rgba(157, 205, 255, 0.35), 0 18px 40px rgba(0, 0, 0, 0.4);
        }

        .posterDropOverlay {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
          text-align: center;
          border-radius: 16px;
          background: rgba(6, 16, 35, 0.82);
          color: #dff0ff;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.03em;
          opacity: 0;
          pointer-events: none;
          transition: opacity 120ms ease;
        }

        .posterDropOverlay.visible {
          opacity: 1;
        }

        .replaceCoverButton {
          border: 1px solid rgba(95, 122, 177, 0.6);
          border-radius: 10px;
          background: rgba(9, 19, 40, 0.92);
          color: #d6e2ff;
          padding: 6px 8px;
          font-size: 11px;
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
          font-size: 11px;
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
          margin: 10px 0 7px;
          color: #f4f7ff;
          font-size: 28px;
          line-height: 1.05;
          letter-spacing: 0.01em;
          font-weight: 800;
        }

        .subtitle {
          margin: -2px 0 7px;
          color: #d7e1f8;
          font-size: 16px;
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
          margin: 10px 0 6px;
          font-size: 22px;
          line-height: 1.1;
          font-weight: 800;
          padding: 6px 8px;
        }

        .subtitleInput {
          margin: 0 0 7px;
          font-size: 15px;
          line-height: 1.2;
          font-weight: 600;
          padding: 6px 8px;
        }

        .coverActionsPanel {
          width: 100%;
          margin: 2px 0 2px;
          border: 1px solid rgba(73, 102, 154, 0.35);
          border-radius: 12px;
          background: rgba(15, 24, 44, 0.62);
          padding: 8px;
        }

        .coverSourceRow {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .coverModeRow {
          display: flex;
          gap: 6px;
          margin-top: 8px;
        }

        .coverModeButton {
          border: 1px solid rgba(95, 122, 177, 0.5);
          border-radius: 8px;
          background: rgba(14, 28, 52, 0.8);
          color: #cfdcff;
          padding: 5px 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .coverModeButton.active {
          border-color: rgba(153, 203, 255, 0.92);
          background: rgba(46, 92, 146, 0.65);
          color: #ecf5ff;
        }

        .chipWrap {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 4px;
        }

        .chip {
          border-radius: 999px;
          border: 1px solid rgba(90, 116, 170, 0.45);
          background: rgba(28, 42, 70, 0.65);
          color: #d6deef;
          font-size: 12px;
          font-weight: 700;
          line-height: 1;
          padding: 6px 10px;
        }

        .chipSection {
          width: 100%;
          margin-top: 7px;
        }

        .chipSectionLabel {
          color: rgba(178, 193, 224, 0.9);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .statusValue {
          color: #f0f4ff;
          font-size: 15px;
          font-weight: 600;
          margin-top: 4px;
        }

        .statusValueProminent {
          font-size: 20px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-top: 5px;
          text-shadow: 0 1px 8px rgba(0, 0, 0, 0.35);
        }

        .statusTone-positive {
          color: #5cd364;
        }

        .statusTone-warning {
          color: #f3a34e;
        }

        .statusTone-active {
          color: #58b8ff;
        }

        .statusTone-neutral {
          color: #d9e6ff;
        }

        .twoStateTextOnly {
          font-size: 15px;
          font-weight: 800;
          line-height: 1.2;
        }

        .twoStateTextOnly.on {
          color: #f0f4ff !important;
          opacity: 1 !important;
          font-weight: 800 !important;
        }

        .twoStateTextOnly.off {
          color: rgba(240, 244, 255, 0.26) !important;
          font-weight: 600 !important;
          opacity: 0.35 !important;
        }

        .coverSourceHeading {
          color: rgba(178, 193, 224, 0.9);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: 0;
        }

        .activeSource {
          color: #f0f4ff;
          font-size: 11px;
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
          gap: 6px;
          align-items: center;
        }

        .editButton,
        .saveButton,
        .deleteButton,
        .resyncButton {
          border: 1px solid rgba(95, 122, 177, 0.6);
          border-radius: 10px;
          background: rgba(9, 19, 40, 0.92);
          color: #d6e2ff;
          padding: 6px 9px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          cursor: pointer;
        }

        .topActionButton {
          padding: 5px 8px;
          font-size: 10px;
        }

        .deleteButton {
          border-color: rgba(205, 93, 93, 0.72);
          background: rgba(68, 20, 20, 0.92);
          color: #ffdede;
        }

        .resyncButton {
          border-color: rgba(84, 174, 134, 0.78);
          background: rgba(17, 56, 38, 0.92);
          color: #d9ffed;
        }

        .editButton:disabled,
        .saveButton:disabled,
        .deleteButton:disabled,
        .resyncButton:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .editGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }

        .editField {
          display: flex;
          flex-direction: column;
          gap: 4px;
          border-radius: 10px;
          border: 1px solid rgba(73, 102, 154, 0.35);
          background: rgba(15, 24, 44, 0.72);
          padding: 7px 8px;
        }

        .editFieldFullWidth {
          grid-column: 1 / -1;
        }

        .editLabel {
          color: rgba(178, 193, 224, 0.9);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .editHelp {
          color: rgba(178, 193, 224, 0.75);
          font-size: 10px;
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
          padding: 6px 8px;
          font-size: 12px;
          line-height: 1.3;
          outline: none;
        }

        .editTextarea {
          resize: vertical;
          min-height: 76px;
        }

        .multiSelectInput {
          min-height: 94px;
          padding-top: 6px;
          padding-bottom: 6px;
        }

        .editDescriptionTextarea {
          min-height: 170px;
          line-height: 1.35;
        }

        .bookSaveError,
        .bookSaveSuccess {
          margin: 0;
          border-radius: 10px;
          padding: 8px 10px;
          font-size: 11px;
          line-height: 1.35;
          width: 100%;
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.3);
          backdrop-filter: blur(2px);
          grid-column: 1 / -1;
          text-align: center;
        }

        .bookSaveError {
          color: #ffb6b6;
          background: rgba(95, 30, 30, 0.28);
          border: 1px solid rgba(255, 160, 160, 0.45);
        }

        .bookSaveSuccess {
          color: #d7f0ff;
          background: rgba(39, 100, 186, 0.35);
          border: 1px solid rgba(130, 193, 255, 0.52);
        }

        .metadataDiffCard {
          margin: 8px 0 10px;
          border: 1px solid rgba(94, 160, 224, 0.45);
          border-radius: 12px;
          background: rgba(10, 25, 46, 0.72);
          padding: 10px;
        }

        .metadataDiffHeader {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 8px;
          flex-wrap: wrap;
        }

        .metadataDiffTitle {
          color: #e5f1ff;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .metadataDiffCount {
          color: rgba(190, 214, 246, 0.9);
          font-size: 11px;
          font-weight: 700;
        }

        .metadataDiffSelectionActions {
          display: flex;
          gap: 6px;
          margin-bottom: 8px;
        }

        .metadataDiffSelectButton {
          border: 1px solid rgba(94, 139, 200, 0.62);
          border-radius: 8px;
          background: rgba(14, 32, 57, 0.86);
          color: rgba(214, 231, 255, 0.95);
          padding: 4px 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .metadataDiffSelectButton:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .metadataDiffGrid {
          display: grid;
          grid-template-columns: 26px minmax(0, 160px) minmax(0, 1fr) 18px minmax(0, 1fr);
          gap: 6px 8px;
          max-height: 220px;
          overflow: auto;
          padding-right: 2px;
        }

        .metadataDiffRow {
          display: contents;
        }

        .metadataDiffLabel {
          color: rgba(180, 200, 232, 0.94);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          align-self: center;
        }

        .metadataDiffToggle {
          display: flex;
          align-items: center;
          justify-content: center;
          align-self: center;
        }

        .metadataDiffToggle input {
          width: 14px;
          height: 14px;
          accent-color: #53b581;
          cursor: pointer;
        }

        .metadataDiffBefore,
        .metadataDiffAfter {
          border: 1px solid rgba(80, 107, 158, 0.5);
          border-radius: 8px;
          padding: 6px 8px;
          font-size: 11px;
          line-height: 1.35;
          white-space: pre-wrap;
          word-break: break-word;
          min-height: 32px;
          display: flex;
          align-items: center;
        }

        .metadataDiffBefore {
          background: rgba(24, 36, 63, 0.64);
          color: rgba(211, 223, 244, 0.92);
        }

        .metadataDiffAfter {
          background: rgba(16, 50, 35, 0.66);
          border-color: rgba(79, 179, 133, 0.62);
          color: #d6ffe9;
        }

        .metadataDiffArrow {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(170, 201, 236, 0.95);
          font-size: 13px;
          font-weight: 800;
        }

        .metadataDiffActions {
          margin-top: 10px;
          display: flex;
          gap: 6px;
          justify-content: flex-end;
        }

        .rightPane {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
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

        .heroImage {
          width: 100%;
          min-height: 220px;
          max-height: 320px;
          border-radius: 16px;
          border: 1px solid rgba(83, 111, 167, 0.32);
        }

        .heroImage {
          object-fit: cover;
          display: block;
        }

        .heroImageFullArt {
          object-fit: contain;
          min-height: 0;
          max-height: none;
          width: 100%;
          max-width: none;
          height: auto;
          align-self: stretch;
          background: rgba(7, 18, 36, 0.58);
        }

        .infoGrid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 9px;
        }

        .infoCard,
        .descriptionCard {
          border-radius: 14px;
          border: 1px solid rgba(73, 102, 154, 0.35);
          background: rgba(15, 24, 44, 0.72);
          padding: 10px 11px;
        }

        .infoCardFullWidth {
          grid-column: 1 / -1;
        }

        .label {
          color: rgba(178, 193, 224, 0.9);
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .value {
          color: #f0f4ff;
          font-size: 15px;
          line-height: 1.25;
          font-weight: 700;
          min-height: 20px;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        :global(.ratingValue) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
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
          font-size: 15px;
          font-weight: 800;
        }

        .description {
          color: #e2e9fb;
          font-size: 13px;
          line-height: 1.3;
          white-space: pre-wrap;
        }

        @media (max-width: 1024px) {
          .contentLayout {
            --posterColumnWidth: 320px;
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

          .heroImage {
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
