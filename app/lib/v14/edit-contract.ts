import type { V14Item } from "./items";

type MediaType = V14Item["media_type"];
// Manual edits are overrides, separate from refreshable provider metadata.
// Every legacy alias is set together so a cleared preferred alias cannot fall back.
export const EDIT_FIELDS: Record<MediaType, Record<string, string[]>> = {
  book: {
    subtitle:["Subtitle"],series:["Series"],author:["Author"],narrator:["Narrator"],publisher:["Publisher"],
    ownership:["Ownership"],type:["Types","Type"],isbn:["ISBN","isbn"],releaseDate:["ReleaseDate","Release Date","Published"],
    description:["description","Description"],imageUrl:["ImageURL","Image URL","Image"],userRating:["userRating","UserRating"],
    pages:["pages","Pages"],audiobookDuration:["audiobookDuration","AudiobookDuration"],genre:["genre","Genre","categories","Categories","Category"],
    tags:["tags","Tags","Tag"],audibleAsin:["AudibleASIN","Audible Asin","Audible_ASIN"],audnexusAsin:["AudnexusASIN","Audnexus Asin","Audnexus_ASIN"],
    openLibraryWorkKey:["OpenLibraryWorkKey"],googleBooksVolumeId:["GoogleBooksVolumeId"],customImageUrl:["CustomURL","CustomImageURL","CustomImageUrl","Custom URL","Custom Image URL"],
  },
  movie: {
    year:["Year"],tmdbId:["TMDB_ID"],tmdbRating:["TMDB_Rating"],tags:["Tags","Tag"],releaseDate:["ReleaseDate","Release Date"],runtime:["Runtime"],
    status:["Status"],genres:["Genres","Genre"],overview:["Overview"],posterUrl:["PosterURL","Poster"],backdropUrl:["BackdropURL"],ownership:["Ownership"],customImageUrl:["CustomURL","CustomImageURL"],
  },
  tv: {
    year:["Year"],tmdbId:["TMDB_ID"],firstAirDate:["FirstAirDate","First Air Date"],lastAirDate:["LastAirDate","Last Air Date"],
    numberOfSeasons:["NumberOfSeasons"],numberOfEpisodes:["NumberOfEpisodes"],showStatus:["Status"],networks:["Networks"],streamingUS:["StreamingUS"],
    genres:["Genres"],tmdbRating:["TMDB_Rating"],backdropUrl:["BackdropURL"],overview:["Overview"],ownership:["Ownership"],tags:["Tags","Tag"],posterUrl:["PosterURL","Poster"],customImageUrl:["CustomURL","CustomImageURL"],
  },
  game: {
    platform:["Platform"],releaseDate:["ReleaseDate"],platforms:["Platforms"],coverUrl:["CoverURL"],igdbRating:["IGDB Rating","Rating"],
    ownership:["Ownership"],format:["Format"],backlog:["Backlog"],completed:["Completed"],yearPlayed:["Year Played","YearPlayed","Year played","Yearplayed"],
    dateAdded:["Date Added"],description:["Description"],genres:["Genres"],hoursPlayed:["Hours Played"],timeToBeat:["TimeToBeat","Time To Beat"],
    developer:["Developer"],screenshotsUrl:["ScreenshotsURL"],igdbId:["IGDB_ID"],igdbIdOverride:["IGDB_ID_Override"],localCoverUrl:["LocalCoverURL"],
    customImageUrl:["CustomURL","CustomImageURL"],tag:["Tag","Tags"],
  },
};
// Backend-only artwork association fields; not additional visible form controls.
for (const fields of Object.values(EDIT_FIELDS)) {
  Object.assign(fields, {
    r2CoverUrl:["R2CoverUrl","r2CoverUrl"],r2CoverUrlDate:["R2CoverUrl_Date"],
    r2BackdropUrl:["R2BackdropUrl","r2BackdropUrl"],r2BackdropUrlDate:["R2BackdropUrl_Date"],
  });
}
EDIT_FIELDS.game.wishlistOrder=["WishlistOrder"];
EDIT_FIELDS.game.queuedOrder=["QueuedOrder"];
export type EditPatch = { title?: string; user_status?: string; personal_rating?: number | null; completed_on?: string | null; notes?: string; overrides?: Record<string,string> };

/** Build a delta from existing Edit modal values; omitted fields stay untouched. */
export function fullEditPatch(item: V14Item, values: Record<string,string>): EditPatch {
  const patch: EditPatch = {};
  const fields = { ...item.metadata, ...item.user_fields };
  const overrides: Record<string,string> = {};
  const dateKey = item.media_type === "book" ? "completedDate" : item.media_type === "movie" ? "watchDate" : "dateCompleted";
  const statusKey = item.media_type === "movie" || item.media_type === "tv" ? "watchStatus" : "status";
  for (const [key, raw] of Object.entries(values)) {
    if (typeof raw !== "string") throw new Error("Invalid edit value");
    const value = key === "notes" ? raw : raw.trim();
    if (key === "title") {
      if (!value) throw new Error("Title is required");
      if (value !== item.title) patch.title = value;
    } else if (key === "notes") {
      if (value !== item.notes) patch.notes = value;
    } else if (key === statusKey) {
      const status = item.media_type === "movie" && value === "Watching" ? "Started" : value;
      if (status !== (item.user_status ?? "")) patch.user_status = status;
    } else if (key === "myRating") {
      const rating = value === "" ? null : Number(value);
      if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > (item.media_type === "book" ? 5 : 10))) throw new Error("Invalid personal rating");
      if (rating !== item.personal_rating) patch.personal_rating = rating;
    } else if (key === dateKey) {
      if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)) throw new Error("Invalid completion date");
      if ((value || null) !== item.completed_on) patch.completed_on = value || null;
    } else {
      const aliases = EDIT_FIELDS[item.media_type][key];
      if (!aliases) throw new Error(`Unsupported edit field: ${key}`);
      const previous = aliases.map(alias => String(fields[alias] ?? "").trim()).find(Boolean) ?? "";
      if (value !== previous && item.media_type === "book" && key === "type" && !["Physical","Audiobook","eBook"].includes(value)) throw new Error("Invalid book type");
      if (value !== previous) for (const alias of aliases) overrides[alias] = value;
    }
  }
  if (Object.keys(overrides).length) patch.overrides = overrides;
  return patch;
}
