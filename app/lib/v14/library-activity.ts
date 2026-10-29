export type LibraryActivityRow = Record<string, string | null>;
export type LibraryActivityEntry = { id: string; itemId: string; title: string; media: string; timestamp: string; kind: string; summary: string; changes: { field: string; before: string; after: string }[] };
const mediaNames: Record<string,string> = { Books: 'book', Movies: 'movie', Shows: 'tv', 'TV Shows': 'tv', 'TV Episodes': 'tv', Games: 'game' };
// Old audit records have no action ID. Only fold an immediately following,
// technical-only save into a stable item's user action within one minute.
// Explicit action IDs always win, even when two user actions happen together.
const artworkFields = new Set(['r2coverurl', 'r2coverurldate', 'r2backdropurl', 'r2backdropurldate']);
const metadataFields = new Set(['IGDB Rating','TMDB Rating','UserRating','ExternalAverageRating','CoverURL','PosterURL','Poster','ImageURL','BackdropURL','ScreenshotsURL','Overview','Description','Genres','Genre','ReleaseDate','Release Date','Year','Runtime','Developer','Publisher','Pages','Published','Author','Narrator','FirstAirDate','First Air Date','LastAirDate','Last Air Date','Networks','NumberOfEpisodes','NumberOfSeasons','StreamingUS','Time To Beat','TimeToBeat']);
function isArtwork(field: string) { return artworkFields.has(field.replace(/_/g,'').toLowerCase()); }
function technical(entry: LibraryActivityEntry) {
  return (entry.kind === 'full_edit' || entry.kind === 'item') && entry.changes.length > 0 && entry.changes.every(c => isArtwork(c.field) || metadataFields.has(c.field));
}
function condenseLegacy(entries: LibraryActivityEntry[], explicit: Set<string>): LibraryActivityEntry[] {
  const preceding = new Map<string, {root: LibraryActivityEntry; metadata: boolean}>();
  const condensed: LibraryActivityEntry[] = [];
  for (const entry of [...entries].sort((a,b) => (Date.parse(a.timestamp)||0)-(Date.parse(b.timestamp)||0) || Number(b.kind==='create')-Number(a.kind==='create'))) {
    const key = entry.itemId ? JSON.stringify([entry.media,entry.itemId]) : '';
    const previous = preceding.get(key);
    if (key && !explicit.has(entry.id) && previous && !explicit.has(previous.root.id) && technical(entry)) {
      const elapsed = Date.parse(entry.timestamp)-Date.parse(previous.root.timestamp);
      const artworkOnly = entry.changes.every(c => isArtwork(c.field));
      const initial = previous.root.kind==='create' && entry.changes.every(c=>!c.before.trim() && !!c.after.trim());
      // A replacement alone is ambiguous; require its preceding metadata save.
      if (elapsed>=0 && elapsed<=60_000 && (!artworkOnly || initial || previous.metadata)) {
        previous.root.changes.push(...entry.changes);
        previous.metadata ||= !artworkOnly;
        continue;
      }
    }
    if (key) {
      preceding.delete(key);
      if (!explicit.has(entry.id) && Number.isFinite(Date.parse(entry.timestamp)) && (entry.kind==='create' || ((entry.kind==='full_edit'||entry.kind==='item') && !technical(entry)))) preceding.set(key,{root:entry,metadata:false});
    }
    condensed.push(entry);
  }
  return condensed;
}
export function groupLibraryActivity(rows: LibraryActivityRow[]): LibraryActivityEntry[] {
  const groups = new Map<string, LibraryActivityEntry>();
  const explicit = new Set<string>();
  const roots = new Set<string>();
  for (const row of rows) {
    const media = mediaNames[row.Sheet || ''];
    if (!media || row.EventKind === 'episode_metadata' || !row.Field || row.Field.startsWith('__cdl_')) continue;
    const action = row.ItemID && row.ActivityID && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(row.ActivityID) && ['user','metadata','artwork'].includes(row.ActivityRole || '') ? row.ActivityID : '';
    const id = action || row.EventID || JSON.stringify([row.Source, row.Timestamp, row.Sheet, row.Title, row.Row, row.Function]);
    const key = JSON.stringify([media,id, row.ItemID || row.Title || row.EpisodeID || '']);
    let entry = groups.get(key);
    if (!entry) {
      entry = { id: key, itemId: row.ItemID || '', title: row.Title || (row.Sheet === 'TV Episodes' ? 'TV episode progress' : 'Untitled item'), media, timestamp: row.Timestamp || '', kind: row.EventKind || '', summary: '', changes: [] };
      groups.set(key, entry);
    }
    if (action) {
      explicit.add(key);
      if (row.ActivityRole==='user' && !roots.has(key)) {
        roots.add(key);
        entry.timestamp=row.Timestamp || ''; entry.kind=row.EventKind || ''; entry.title=row.Title || entry.title;
      }
    }
    entry.changes.push({ field: row.Field, before: row['Old Value'] || '', after: row['New Value'] || '' });
  }
  return condenseLegacy([...groups.values()],explicit).map(entry => {
    const status = entry.changes.find(c => c.field === 'Status');
    const rating = entry.changes.find(c => c.field === 'Rating' || c.field === 'My Rating' || c.field === 'MyRating');
    const watched = entry.changes.filter(c => c.field === 'Watched' || c.field.endsWith(' · Watched'));
    const archived = entry.changes.find(c => c.field === 'Archived');
    entry.summary = entry.kind === 'create' ? 'Added to your library' : archived ? (archived.after === 'true' ? 'Archived from your library' : 'Restored to your library') : watched.length ? (watched.every(c => c.after === 'true') ? 'Marked as watched' : watched.every(c => c.after === 'false') ? 'Marked as unwatched' : 'Updated episode progress') : status ? `Status changed to ${status.after || 'Not set'}` : rating ? `Rating changed to ${rating.after || 'Not set'}` : entry.changes.length === 1 && entry.changes[0].field === 'Notes' ? 'Updated your notes' : technical(entry) ? (entry.changes.every(c=>isArtwork(c.field)) ? 'Updated artwork' : 'Updated metadata') : `Updated ${entry.changes.length} ${entry.changes.length === 1 ? 'field' : 'fields'}`;
    return entry;
  }).sort((a,b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
}
