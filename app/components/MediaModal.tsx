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
const GAME_STATUS_FALLBACK_OPTIONS = ["Backlog", "Playing", "Completed", "Paused", "Dropped", "Wishlist"];
const GAME_PLATFORM_FALLBACK_OPTIONS = ["PC", "PlayStation 5", "Xbox Series X|S", "Nintendo Switch", "Steam Deck", "Mobile"];
const GAME_OWNERSHIP_FALLBACK_OPTIONS = ["Owned", "Wishlist", "Borrowed", "Library", "Subscription"];
const GAME_FORMAT_FALLBACK_OPTIONS = ["Digital", "Physical", "Cloud", "Subscription"];
const SHOW_EDIT_FIELDS: ShowEditField[] = [
  { key: "watchStatus", label: "Watch Status" },
  { key: "showStatus", label: "Show Status" },
  { key: "year", label: "Year" },
  { key: "tmdbId", label: "TMDB ID" },
  { key: "firstAirDate", label: "First Air Date" },
  { key: "lastAirDate", label: "Last Air Date" },
  { key: "numberOfSeasons", label: "Number Of Seasons" },
  { key: "numberOfEpisodes", label: "Number Of Episodes" },
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
const MOVIE_EDIT_FIELDS: MovieEditField[] = [
  { key: "year", label: "Year" },
  { key: "poster", label: "Poster" },
  { key: "myRating", label: "My Rating" },
  { key: "tmdbRating", label: "TMDB Rating" },
  { key: "tmdbId", label: "TMDB ID" },
  { key: "watched", label: "Watched" },
  { key: "watchDate", label: "Watch Date" },
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
  { key: "platform", label: "Platform" },
  { key: "status", label: "Status" },
  { key: "releaseDateAlt", label: "Release Date" },
  { key: "platforms", label: "Platforms" },
  { key: "coverUrl", label: "CoverURL" },
  { key: "igdbRating", label: "IGDB Rating" },
  { key: "myRating", label: "My Rating" },
  { key: "ownership", label: "Ownership" },
  { key: "format", label: "Format" },
  { key: "backlog", label: "Backlog" },
  { key: "completed", label: "Completed" },
  { key: "dateCompleted", label: "Date Completed" },
  { key: "yearPlayed", label: "Year Played" },
  { key: "dateAdded", label: "Date Added" },
  { key: "genres", label: "Genres" },
  { key: "hoursPlayed", label: "Hours Played" },
  { key: "developer", label: "Developer" },
  { key: "screensotsUrl", label: "ScreensotsURL" },
  { key: "igdbId", label: "IGDB_ID" },
  { key: "igdbIdOverride", label: "IGDB_ID_Override" },
  { key: "description", label: "Description", multiline: true },
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

function splitCommaValues(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
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

function buildMovieEditValues(item: Record<string, any>): Record<string, string> {
  return {
    title: firstNonEmpty(item, ["title", "Title"]),
    year: firstNonEmpty(item, ["year", "Year"]),
    poster: firstNonEmpty(item, ["poster", "Poster"]),
    myRating: firstNonEmpty(item, ["myRating", "MyRating", "My Rating"]),
    tmdbRating: firstNonEmpty(item, ["tmdbRating", "TMDB_Rating"]),
    tmdbId: firstNonEmpty(item, ["tmdbId", "TMDB_ID"]),
    watched: firstNonEmpty(item, ["watched", "Watched", "watchStatus", "WatchStatus"]),
    watchDate: firstNonEmpty(item, ["watchDate", "WatchDate"]),
    tags: firstNonEmpty(item, ["tags", "Tags", "tag", "Tag"]),
    releaseDate: firstNonEmpty(item, ["releaseDate", "ReleaseDate"]),
    runtime: firstNonEmpty(item, ["runtime", "Runtime"]),
    status: firstNonEmpty(item, ["status", "Status", "movieStatus"]),
    genres: firstNonEmpty(item, ["genres", "Genres"]),
    overview: firstNonEmpty(item, ["overview", "Overview"]),
    posterUrl: firstNonEmpty(item, ["posterUrl", "PosterURL"]),
    backdropUrl: firstNonEmpty(item, ["backdropUrl", "BackdropURL"]),
  };
}

function buildGameEditValues(item: Record<string, any>): Record<string, string> {
  return {
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
    backlog: firstNonEmpty(item, ["backlog", "Backlog"]),
    completed: firstNonEmpty(item, ["completed", "Completed"]),
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

function renderGameUserRating(value: string) {
  const n = Number.parseFloat(value);
  if (Number.isNaN(n)) return value || DASH;
  const tenScale = n > 10 ? n / 10 : n;
  return renderRating(String(tenScale));
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
  gamePlatformOptions = [],
  gameStatusOptions = [],
  gameOwnershipOptions = [],
  gameFormatOptions = [],
  isReplacingCover = false,
  replaceCoverError,
  popupCoverMode,
  onPopupCoverModeChange,
}) => {
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
  const [isCoverDropActive, setIsCoverDropActive] = React.useState(false);
  const coverDragDepthRef = React.useRef(0);
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
    if (!open || !item) return;
    setIsEditingBook(false);
    setIsSavingBook(false);
    setBookSaveError(null);
    setBookSaveSuccess(null);
    setBookEditValues(buildBookEditValues(item));
    setIsEditingShow(false);
    setIsSavingShow(false);
    setShowSaveError(null);
    setShowSaveSuccess(null);
    setShowEditValues(buildShowEditValues(item));
    setIsEditingMovie(false);
    setIsSavingMovie(false);
    setMovieSaveError(null);
    setMovieSaveSuccess(null);
    setMovieEditValues(buildMovieEditValues(item));
    setIsEditingGame(false);
    setIsSavingGame(false);
    setGameSaveError(null);
    setGameSaveSuccess(null);
    setGameEditValues(buildGameEditValues(item));
  }, [open, item]);

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
        ? (() => {
            const watchedRaw = firstNonEmpty(sourceItem, ["watched", "Watched", "watchStatus", "WatchStatus"]);
            const watchedNormalized = watchedRaw.toLowerCase();
            const isWatched =
              watchedNormalized === "true" ||
              watchedNormalized === "yes" ||
              watchedNormalized === "1" ||
              watchedNormalized === "watched";
            return isWatched ? "Watched" : "Backlog";
          })()
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
    setBookSaveError(null);
    setBookSaveSuccess(null);
    setIsSavingBook(true);
    try {
      await onSaveBookEdits(item, bookEditValues);
      setBookSaveSuccess("Saved to Google Sheet.");
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
    setShowSaveSuccess(null);
    setIsSavingShow(true);
    try {
      await onSaveShowEdits(item, showEditValues);
      setShowSaveSuccess("Saved to Google Sheet.");
      setIsEditingShow(false);
    } catch (e: any) {
      setShowSaveError(e?.message || "Failed to save show changes");
    } finally {
      setIsSavingShow(false);
    }
  };
  const handleSaveMovie = async () => {
    if (!item || !onSaveMovieEdits) return;
    setMovieSaveError(null);
    setMovieSaveSuccess(null);
    setIsSavingMovie(true);
    try {
      await onSaveMovieEdits(item, movieEditValues);
      setMovieSaveSuccess("Saved to Google Sheet.");
      setIsEditingMovie(false);
    } catch (e: any) {
      setMovieSaveError(e?.message || "Failed to save movie changes");
    } finally {
      setIsSavingMovie(false);
    }
  };
  const handleSaveGame = async () => {
    if (!item || !onSaveGameEdits) return;
    setGameSaveError(null);
    setGameSaveSuccess(null);
    setIsSavingGame(true);
    try {
      await onSaveGameEdits(item, gameEditValues);
      setGameSaveSuccess("Saved to Google Sheet.");
      setIsEditingGame(false);
    } catch (e: any) {
      setGameSaveError(e?.message || "Failed to save game changes");
    } finally {
      setIsSavingGame(false);
    }
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
                  setShowSaveSuccess(null);
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
                disabled={isSavingMovie}
              >
                {isEditingMovie ? "Cancel" : "Edit"}
              </button>
              {isEditingMovie ? (
                <button type="button" className="saveButton topActionButton" onClick={handleSaveMovie} disabled={isSavingMovie}>
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
                disabled={isSavingGame}
              >
                {isEditingGame ? "Cancel" : "Edit"}
              </button>
              {isEditingGame ? (
                <button type="button" className="saveButton topActionButton" onClick={handleSaveGame} disabled={isSavingGame}>
                  {isSavingGame ? "Saving..." : "Save"}
                </button>
              ) : null}
            </>
          ) : null}
          <button type="button" className="closeButton" aria-label="Close details" onClick={onClose}>
            ×
          </button>
        </div>
        {activeSaveSuccess ? <div className="bookSaveSuccess">{activeSaveSuccess}</div> : null}
        {activeSaveError ? <div className="bookSaveError">{activeSaveError}</div> : null}

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
                    placeholder={itemType === "movie" ? "Year" : "Year Played"}
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
              heroUrl ? <img src={heroUrl} alt={`${title} screenshot`} className="heroImage" /> : null
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
                  <div className="value">{renderRating(firstNonEmpty(sourceItem, ["myRating", "My Rating"]) || "")}</div>
                </div>
              </div>
            ) : null}

            {itemType === "movie" && !isEditingMovie ? (
              <div className="infoGrid">
                <div className="infoCard">
                  <div className="label">TMDB Rating</div>
                  <div className="value">{renderRating(firstNonEmpty(sourceItem, ["tmdbRating", "TMDB_Rating"]) || "")}</div>
                </div>
                <div className="infoCard">
                  <div className="label">My Rating</div>
                  <div className="value">{renderRating(firstNonEmpty(sourceItem, ["myRating", "MyRating", "My Rating"]) || "")}</div>
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
                          type="text"
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
                      ) : (
                        <input
                          type="text"
                          value={movieEditValues[field.key] || ""}
                          onChange={(e) => handleMovieFieldChange(field.key, e.target.value)}
                          className="editInput"
                        />
                      )}
                    </label>
                  ))}
              </div>
            ) : itemType === "game" && isEditingGame ? (
              <div className="editGrid">
                {[...GAME_EDIT_FIELDS]
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
                      ) : field.key === "platform" ? (
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
                      ) : field.key === "format" ? (
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
                      ) : (
                        <input
                          type="text"
                          value={gameEditValues[field.key] || ""}
                          onChange={(e) => handleGameFieldChange(field.key, e.target.value)}
                          className="editInput"
                        />
                      )}
                    </label>
                  ))}
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

        .contentLayout {
          display: grid;
          grid-template-columns: 270px minmax(0, 1fr);
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
        .saveButton {
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

        .editButton:disabled,
        .saveButton:disabled {
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

        .bookSaveError {
          margin: 6px 0 2px;
          grid-column: 1 / -1;
          color: #ffb6b6;
          font-size: 11px;
          line-height: 1.35;
        }

        .bookSaveSuccess {
          margin: 6px 0 2px;
          color: #b9f5d0;
          font-size: 11px;
          line-height: 1.35;
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
