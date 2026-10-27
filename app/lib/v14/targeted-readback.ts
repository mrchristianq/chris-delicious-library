import type { LibrarySnapshot, SnapshotSetting } from './library-snapshot';

type Progress = { watched: boolean; watched_at: string | null; revision: number };
type EpisodeReadback = { id: string; show_id: string; progress: Progress | null };
type Readback = { owner_id: string; library_id: string; observed_at: string; settings: SnapshotSetting[]; episodes: EpisodeReadback[] };
type Change = { episode_id: string; revision: number | null; watched: boolean; watched_at: string | null };
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function envelope(value: unknown, ownerId: string, libraryId: string): Readback {
  const r=value as Readback|null;
  if (!r || r.owner_id!==ownerId || r.library_id!==libraryId || typeof r.observed_at!=='string' ||
      !Number.isFinite(Date.parse(r.observed_at)) || !Array.isArray(r.settings) || !Array.isArray(r.episodes)) throw new Error('Save readback scope not confirmed');
  return r;
}
export function confirmSettingReadback(value: unknown, owner: string, library: string, key: string, expected: unknown, revision: number|null) {
  const r=envelope(value,owner,library),setting=r.settings[0];
  if(r.settings.length!==1 || r.episodes.length!==0 || !setting || setting.key!==key || setting.revision!==(revision??0)+1 ||
    !setting.value || !Object.hasOwn(setting.value,'value') || setting.value.value!==expected || setting.value.legacy_profiles!==undefined) throw new Error('Setting readback mismatch');
  return r;
}
export function confirmProgressReadback(value: unknown, owner: string, library: string, changes: Change[]) {
  const r=envelope(value,owner,library),targets=new Map(changes.map(c=>[c.episode_id,c])),seen=new Set<string>();
  if(r.settings.length!==0 || r.episodes.length!==changes.length || targets.size!==changes.length) throw new Error('Episode readback incomplete');
  for(const e of r.episodes) {
    const c=e&&targets.get(e.id),p=e?.progress;
    const sameDate=c&&((c.watched_at===p?.watched_at)||(c.watched_at!==null&&p?.watched_at!==null&&Number.isFinite(Date.parse(String(p?.watched_at)))&&Date.parse(c.watched_at)===Date.parse(String(p?.watched_at))));
    if(!c || seen.has(e.id) || !uuid.test(e.show_id) || !p || p.revision!==(c.revision??0)+1 || p.watched!==c.watched || !sameDate) throw new Error('Episode readback mismatch');
    seen.add(e.id);
  }
  return r;
}
/** Merge only independently verified targets. Do not advance the full-library
 * change token: the next activation must still check for unrelated changes. */
export function mergeTargetedReadback(snapshot: LibrarySnapshot, value: unknown, command: Record<string,unknown>): LibrarySnapshot {
  if(command.libraryId!==snapshot.library_id) throw new Error('Readback command library mismatch');
  if(command.kind==='setting') {
    const r=confirmSettingReadback(value,snapshot.owner_id,snapshot.library_id,String(command.key),command.value,command.revision as number|null);
    const setting=r.settings[0],settings=snapshot.settings.filter(s=>s.key!==setting.key).concat(structuredClone(setting));
    return {...snapshot,settings,counts:{...snapshot.counts,settings:settings.length}};
  }
  if(command.kind==='progress') {
    const r=confirmProgressReadback(value,snapshot.owner_id,snapshot.library_id,command.changes as Change[]);
    const records=new Map(r.episodes.map(e=>[e.id,e]));
    const episodes=snapshot.episodes.map(e=>{
      const changed=records.get(e.id);if(!changed)return e;
      if(changed.show_id!==e.show_id)throw new Error('Episode readback parent mismatch');
      records.delete(e.id);return {...e,progress:structuredClone(changed.progress)};
    });
    if(records.size)throw new Error('Episode readback target unavailable');
    return {...snapshot,episodes};
  }
  throw new Error('Unsupported targeted readback');
}
