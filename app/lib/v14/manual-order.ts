export type BacklogOrderView = "wishlist" | "now-playing" | "wishlist-books" | "play-next" | "watchlist-movies" | "watchlist-tv";

export function manualOrderSettings(view: BacklogOrderView, keys: string[]) {
  return [
    { key: `viewManualOrder:${view}`, value: JSON.stringify(keys) },
    { key: `viewSortField:${view}`, value: "Manual" },
    { key: `viewSortOrder:${view}`, value: "Asc" },
  ];
}

/** Each writer resolves only after durable readback. Partial completion is not
 * whole-operation success; let the caller retain pending values and show failure.
 * Existing backend request/revision handling makes retries safe. */
export async function saveManualOrder(
  write: (key: string, value: string) => Promise<unknown>,
  settings: ReturnType<typeof manualOrderSettings>,
) {
  for (const { key, value } of settings) await write(key, value);
}
