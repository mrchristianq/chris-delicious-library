export const BOOK_STATUS_OPTIONS = [
  "Reading",
  "Completed",
  "Backlog",
  "Abandoned",
  "Paused",
  "Collection",
  "Wishlist",
] as const;

export const MOVIE_WATCH_STATUS_OPTIONS = [
  "Watched",
  "Started",
  "Backlog",
  "Pending Digital Release",
  "Abandoned",
] as const;

export const TV_WATCH_STATUS_OPTIONS = [
  "Completed",
  "Abandoned",
  "Started",
  "Backlog",
  "Watch Next",
  "Paused",
  "Pending Return",
  "Pending Release",
] as const;

export const GAME_STATUS_OPTIONS = [
  "Now Playing",
  "Queued",
  "Collection",
  "Completed",
  "Abandoned",
  "Wishlist",
  "Replay",
  "Backlog",
] as const;

function normalizeToken(value?: string): string {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function canonicalOption(
  value: string | undefined,
  options: readonly string[]
): string {
  const normalized = normalizeToken(value);
  return options.find((option) => normalizeToken(option) === normalized) || "";
}

export function normalizeBookStatusForSheet(value?: string): string {
  const normalized = normalizeToken(value);
  if (!normalized) return "";
  if (["currently reading", "in progress", "read now"].includes(normalized)) return "Reading";
  if (["finished", "read", "complete", "done"].includes(normalized)) return "Completed";
  if (["dropped", "dnf"].includes(normalized)) return "Abandoned";
  return canonicalOption(value, BOOK_STATUS_OPTIONS);
}

export function normalizeMovieWatchStatusForSheetValue(value?: string): string {
  const normalized = normalizeToken(value);
  if (!normalized) return "";
  if (["currently watching", "watching", "in progress"].includes(normalized)) return "Started";
  if (["completed", "complete", "done"].includes(normalized)) return "Watched";
  return canonicalOption(value, MOVIE_WATCH_STATUS_OPTIONS);
}

export function normalizeTvWatchStatusForSheetValue(value?: string): string {
  const normalized = normalizeToken(value);
  if (!normalized) return "";
  if (["watched", "complete", "done"].includes(normalized)) return "Completed";
  if (["watching", "currently watching", "in progress"].includes(normalized)) return "Started";
  if (normalized === "pending digital release") return "Backlog";
  return canonicalOption(value, TV_WATCH_STATUS_OPTIONS);
}

export function normalizeGameStatusForSheet(value?: string): string {
  const normalized = normalizeToken(value);
  if (!normalized) return "";
  if (["playing", "currently playing", "in progress"].includes(normalized)) return "Now Playing";
  if (["finished", "complete", "done", "beaten"].includes(normalized)) return "Completed";
  if (["dropped", "on hold"].includes(normalized)) return normalized === "dropped" ? "Abandoned" : "Backlog";
  return canonicalOption(value, GAME_STATUS_OPTIONS);
}
