export type LibraryActivityRow = Record<string, string | null>;
export type LibraryActivityEntry = { id: string; itemId: string; title: string; media: string; timestamp: string; kind: string; summary: string; changes: { field: string; before: string; after: string }[] };
const mediaNames: Record<string,string> = { Books: 'book', Movies: 'movie', Shows: 'tv', 'TV Shows': 'tv', 'TV Episodes': 'tv', Games: 'game' };
export function groupLibraryActivity(rows: LibraryActivityRow[]): LibraryActivityEntry[] {
  const groups = new Map<string, LibraryActivityEntry>();
  for (const row of rows) {
    const media = mediaNames[row.Sheet || ''];
    if (!media || row.EventKind === 'episode_metadata' || !row.Field || row.Field.startsWith('__cdl_')) continue;
    const id = row.EventID || JSON.stringify([row.Source, row.Timestamp, row.Sheet, row.Title, row.Row, row.Function]);
    const key = JSON.stringify([id, row.ItemID || row.Title || row.EpisodeID || '']);
    let entry = groups.get(key);
    if (!entry) {
      entry = { id: key, itemId: row.ItemID || '', title: row.Title || (row.Sheet === 'TV Episodes' ? 'TV episode progress' : 'Untitled item'), media, timestamp: row.Timestamp || '', kind: row.EventKind || '', summary: '', changes: [] };
      groups.set(key, entry);
    }
    entry.changes.push({ field: row.Field, before: row['Old Value'] || '', after: row['New Value'] || '' });
  }
  return [...groups.values()].map(entry => {
    const status = entry.changes.find(c => c.field === 'Status');
    const rating = entry.changes.find(c => c.field === 'Rating' || c.field === 'My Rating' || c.field === 'MyRating');
    const watched = entry.changes.filter(c => c.field === 'Watched' || c.field.endsWith(' · Watched'));
    const archived = entry.changes.find(c => c.field === 'Archived');
    entry.summary = entry.kind === 'create' ? 'Added to your library' : archived ? (archived.after === 'true' ? 'Archived from your library' : 'Restored to your library') : watched.length ? (watched.every(c => c.after === 'true') ? 'Marked as watched' : watched.every(c => c.after === 'false') ? 'Marked as unwatched' : 'Updated episode progress') : status ? `Status changed to ${status.after || 'Not set'}` : rating ? `Rating changed to ${rating.after || 'Not set'}` : entry.changes.length === 1 && entry.changes[0].field === 'Notes' ? 'Updated your notes' : `Updated ${entry.changes.length} ${entry.changes.length === 1 ? 'field' : 'fields'}`;
    return entry;
  }).sort((a,b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
}
