import type {FullLibraryBackup} from './nightly-backup';

const stable = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>`${JSON.stringify(k)}:${stable(v)}`).join(',')}}`;
  return JSON.stringify(value);
};
export function backupSummary(backup: FullLibraryBackup) {
  const items=backup.tables.items.filter(r=>!r.deleted_at);
  return {total:items.length,books:items.filter(r=>r.media_type==='book').length,movies:items.filter(r=>r.media_type==='movie').length,
    shows:items.filter(r=>r.media_type==='tv').length,games:items.filter(r=>r.media_type==='game').length,
    notes:items.filter(r=>typeof r.notes==='string'&&r.notes.trim()).length,episodeProgress:backup.tables.episode_progress.length};
}
/** Compare user content, not revision counters or request timestamps. */
export function compareBackupItems(current:FullLibraryBackup,target:FullLibraryBackup){
  const before=new Map(current.tables.items.filter(r=>!r.deleted_at).map(r=>[r.id,r]));
  const after=new Map(target.tables.items.filter(r=>!r.deleted_at).map(r=>[r.id,r]));
  const content=(r:Record<string,unknown>)=>stable(Object.fromEntries(Object.entries(r).filter(([k])=>!['revision','updated_at','created_at'].includes(k))));
  return {added:[...after.keys()].filter(id=>!before.has(id)).length,removed:[...before.keys()].filter(id=>!after.has(id)).length,
    updated:[...after].filter(([id,r])=>before.has(id)&&content(before.get(id)!)!==content(r)).length,
    episodeProgressChanged:stable([...current.tables.episode_progress].sort((a,b)=>String(a.episode_id).localeCompare(String(b.episode_id))))!==stable([...target.tables.episode_progress].sort((a,b)=>String(a.episode_id).localeCompare(String(b.episode_id)))),
    settingsChanged:stable(current.tables.settings.filter(r=>!String(r.key).startsWith('__cdl_')).sort((a,b)=>String(a.key).localeCompare(String(b.key))))!==stable(target.tables.settings.filter(r=>!String(r.key).startsWith('__cdl_')).sort((a,b)=>String(a.key).localeCompare(String(b.key))))};
}
