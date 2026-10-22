import type { projectLibrarySnapshot } from "./library-snapshot";
import type { V14Item } from "./items";

type MediaType = V14Item["media_type"];
type LegacyParser = (row: Record<string, string>) => object | null;
export type LegacyParsers = Record<MediaType, LegacyParser>;

/** Accept the existing v13 parser functions, not alternative media mappers.
 * Attach identity AFTER parsing because v13 intentionally picks known fields.
 * Never derive mutation identity from title, ISBN or a cover/order key.
 */
export function parseLegacyLibrary(projection: ReturnType<typeof projectLibrarySnapshot>, parsers: LegacyParsers) {
  const groups: Record<MediaType, Array<object & { __type: MediaType; __cdlIdentity: { itemId: string; libraryId: string; revision: number } }>> = {
    book: [], movie: [], tv: [], game: [],
  };
  for (const entry of projection.items) {
    const parsed = parsers[entry.mediaType](entry.row);
    if (!parsed) throw new Error("Library item could not be parsed; refusing a partial library");
    groups[entry.mediaType].push({ ...parsed, __type: entry.mediaType, __cdlIdentity: { ...entry.identity } });
  }
  return {
    groups,
    episodes: projection.episodes.map(episode => ({ ...episode.row, __cdlIdentity: { ...episode.identity } })),
    settingValue: projection.settingValue,
    changeToken: projection.changeToken,
    observedAt: projection.observedAt,
  };
}
