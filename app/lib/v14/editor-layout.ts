export type EditorMedia = "book" | "movie" | "tv" | "game";
export type EditorArtworkDraft = { cover?: File | string; backdrop?: string };
export type EditorField = { key: string; label: string; multiline?: boolean; options?: readonly string[]; isDate?: boolean; isFlag?: boolean; wide?: boolean; placeholder?: string };
const personal: Record<EditorMedia, string[]> = {
  movie: ["watchStatus", "myRating", "watchDate", "tags"],
  tv: ["watchStatus", "myRating", "dateCompleted", "tags"],
  game: ["platform", "ownership", "format", "status", "myRating", "hoursPlayed", "dateCompleted", "tag"],
  book: ["type", "ownership", "status", "myRating", "completedDate", "narrator", "audiobookDuration", "tags"],
};
const sourceKeys = new Set(["tmdbId", "igdbId", "igdbIdOverride", "isbn", "audibleAsin", "audnexusAsin", "imageUrl", "posterUrl", "backdropUrl", "coverUrl", "localCoverUrl", "screenshotsUrl"]);
export function editorSections(media: EditorMedia, fields: EditorField[], values: Record<string,string>) {
  const byKey = new Map(fields.map(field => [field.key, field]));
  const yours = personal[media].flatMap(key => {
    const field = byKey.get(key);
    if (!field) return [];
    if (["watchDate", "dateCompleted", "completedDate"].includes(key) && !values[key] && !/^(watched|completed)$/i.test(values.watchStatus || values.status || "")) return [];
    if (["narrator", "audiobookDuration"].includes(key) && values.type !== "Audiobook") return [];
    return [field];
  });
  const common = new Set(["title", "notes", ...(media === "book" ? ["author"] : []), ...personal[media]]);
  return {
    personal: yours,
    metadata: fields.filter(field => !common.has(field.key) && !(["movie","tv"].includes(media) && field.key === "ownership") && !sourceKeys.has(field.key) && !["backlog", "completed"].includes(field.key) && !(media === "book" && values.type === "Audiobook" && field.key === "pages")),
    sources: fields.filter(field => sourceKeys.has(field.key)),
  };
}
