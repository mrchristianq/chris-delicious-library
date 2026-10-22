export type V14Item = {
  id: string; media_type: "book" | "movie" | "tv" | "game"; title: string;
  user_status: string | null; personal_rating: number | null; completed_on: string | null;
  notes: string; revision: number; user_fields: Record<string, unknown>; metadata: Record<string, unknown>;
};
export type V14RatingInput = {
  myRating?: string; watchStatus?: string; watchDate?: string; dateCompleted?: string;
  tags?: string; status?: string; hoursPlayed?: string; yearPlayed?: string; notes?: string;
};
export function ratingPatch(data: V14RatingInput) {
  const patch: Record<string, unknown> = {};
  for (const key of Object.keys(data)) if (!["myRating","watchStatus","watchDate","dateCompleted","tags","status","hoursPlayed","yearPlayed","notes"].includes(key)) throw new Error("Unsupported field");
  if (data.myRating !== undefined) {
    const value = data.myRating.trim() === "" ? null : Number(data.myRating);
    if (value !== null && !Number.isFinite(value)) throw new Error("Invalid rating");
    patch.personal_rating = value;
  }
  if (data.status !== undefined || data.watchStatus !== undefined) patch.user_status = data.status ?? data.watchStatus;
  if (data.watchDate !== undefined || data.dateCompleted !== undefined) patch.completed_on = (data.watchDate ?? data.dateCompleted) || null;
  for (const key of ["notes", "tags", "hoursPlayed", "yearPlayed"] as const) if (data[key] !== undefined) patch[key] = data[key];
  return patch;
}
export function toRatingItem(item: V14Item) {
  return { ...item.metadata, ...item.user_fields, title: item.title, Title: item.title,
    __type: item.media_type, status: item.user_status ?? "", watchStatus: item.user_status ?? "",
    Status: item.user_status ?? "", WatchStatus: item.user_status ?? "", "Watch Status": item.user_status ?? "",
    myRating: item.personal_rating === null ? "" : String(item.personal_rating),
    MyRating: item.personal_rating === null ? "" : String(item.personal_rating),
    "My Rating": item.personal_rating === null ? "" : String(item.personal_rating),
    completedDate: item.completed_on ?? "", dateCompleted: item.completed_on ?? "", watchDate: item.completed_on ?? "",
    CompletedDate: item.completed_on ?? "", DateCompleted: item.completed_on ?? "", "Completed Date": item.completed_on ?? "",
    "Date Completed": item.completed_on ?? "", WatchDate: item.completed_on ?? "", "Watch Date": item.completed_on ?? "",
    notes: item.notes, Notes: item.notes };
}
export function itemCover(item: V14Item) {
  const fields = { ...item.metadata, ...item.user_fields };
  for (const key of ["R2CoverUrl", "R2CoverURL", "LocalCoverURL", "CustomURL", "ImageURL", "PosterURL", "CoverURL", "posterUrl", "coverUrl"]) {
    const value = String(fields[key] ?? "").trim();
    if (/^https:\/\//i.test(value)) return value;
  }
  return "";
}
