import { projectLibrarySnapshot, type LibrarySnapshot } from './library-snapshot';

export const recordSections = ['items', 'episodes', 'settings'] as const;
type Section = typeof recordSections[number];
export type RecordIndex = Record<Section, [string, string][]>;
export type IndexedSnapshot = LibrarySnapshot & { record_index?: RecordIndex };
type Row = Record<string, unknown>;
type Rpc = (name: string, args: Row) => PromiseLike<{data: unknown; error: null | {code?: string}}>;
const uuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const token = /^[a-f0-9]{32}$/i;
const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
export function validateRecordIndex(value: unknown): asserts value is RecordIndex {
  if (!object(value) || Object.keys(value).length !== 3) throw new Error('Invalid record inventory');
  for (const section of recordSections) {
    const rows = value[section];
    if (!Array.isArray(rows) || rows.length > 100000) throw new Error('Invalid record inventory');
    const seen = new Set<string>();
    for (const entry of rows) {
      if (!Array.isArray(entry) || entry.length !== 2 || typeof entry[0] !== 'string' || typeof entry[1] !== 'string' || !token.test(entry[1]) ||
          (section === 'settings' ? !entry[0] || entry[0].length > 500 || entry[0].startsWith('__cdl_tracker_') : !uuid.test(entry[0])) || seen.has(entry[0])) throw new Error('Invalid record inventory');
      seen.add(entry[0]);
    }
  }
}
type Index = {library_id:string; owner_id:string; observed_at:string; change_token:string; transaction_token:string; index_version:1; records:RecordIndex};
function validateIndex(value: unknown, library: string): Index {
  const v = value as Index;
  if (!v || v.library_id !== library || !uuid.test(v.owner_id) || v.index_version !== 1 || !token.test(v.change_token) ||
      typeof v.transaction_token !== 'string' || !/^\d+:\d+:(\d+(,\d+)*)?$/.test(v.transaction_token) || !Number.isFinite(Date.parse(v.observed_at))) throw new Error('Invalid fresh record inventory');
  validateRecordIndex(v.records);
  return v;
}
export type RecordDelta = { delta:true; library_id:string; owner_id:string; observed_at:string; change_token:string; base_token:string|null; record_index:RecordIndex; rows:Record<Section,Row[]> };

/** Bounded record reads bracketed by MVCC guards. Never accept a partial or
 * mixed-version inventory, and never substitute a cached response on failure. */
export async function readRecordDelta(rpc: Rpc, library: string, previous: RecordIndex | undefined, baseToken: string | null): Promise<RecordDelta> {
  if (previous) validateRecordIndex(previous);
  const call = async (name:string,args:Row) => {
    const {data,error} = await rpc(name,args);
    if (error) throw Object.assign(new Error('Fresh incremental library read failed'), {code:error.code});
    return data;
  };
  for (let attempt=0; attempt<2; attempt++) {
    const before=validateIndex(await call('cdl_v14_renderer_index',{p_library_id:library}),library);
    const pages:{section:Section; keys:string[]; rows?:Row[]}[]=[];
    for (const section of recordSections) {
      const old=new Map(previous?.[section] ?? []);
      const keys=before.records[section].filter(([id,version])=>old.get(id)!==version).map(([id])=>id);
      for (let offset=0;offset<keys.length;offset+=200) pages.push({section,keys:keys.slice(offset,offset+200)});
    }
    let next=0;
    await Promise.all(Array.from({length:Math.min(3,pages.length)},async()=>{
      while(next<pages.length) {
        const page=pages[next++];
        const data=await call('cdl_v14_renderer_records',{p_library_id:library,p_section:page.section,p_keys:page.keys});
        if (!object(data) || data.owner_id!==before.owner_id || data.library_id!==library || data.section!==page.section || !Array.isArray(data.rows) || data.rows.length!==page.keys.length || !data.rows.every(object)) throw new Error('Incomplete incremental records');
        const keys=new Set(page.keys);
        for(const row of data.rows) if (!keys.delete(String(row[page.section==='settings'?'key':'id']))) throw new Error('Unexpected incremental record');
        page.rows=data.rows;
      }
    }));
    const after=await call('cdl_v14_renderer_state',{p_library_id:library});
    if (!object(after) || after.owner_id!==before.owner_id || after.library_id!==library) throw new Error('Incremental read owner mismatch');
    if (after.change_token!==before.change_token || after.transaction_token!==before.transaction_token) continue;
    return {delta:true,library_id:library,owner_id:before.owner_id,observed_at:before.observed_at,change_token:before.change_token,
      base_token:baseToken,record_index:before.records,rows:Object.fromEntries(recordSections.map(s=>[s,pages.filter(p=>p.section===s).flatMap(p=>p.rows??[])])) as RecordDelta['rows']};
  }
  throw new Error('Library changed during both incremental read attempts. Please retry.');
}

export function mergeRecordDelta(previous: IndexedSnapshot | null, delta: RecordDelta, owner: string, library: string): IndexedSnapshot {
  if (!delta || delta.delta!==true || delta.owner_id!==owner || delta.library_id!==library || !token.test(delta.change_token) ||
      delta.base_token!==(previous?.change_token??null) || !Number.isFinite(Date.parse(delta.observed_at)) || !object(delta.rows)) throw new Error('Invalid incremental library response');
  validateRecordIndex(delta.record_index);
  const result: Row = {schema_version:1,complete:true,library_id:library,owner_id:owner,observed_at:delta.observed_at,change_token:delta.change_token,record_index:delta.record_index};
  for (const section of recordSections) {
    if (!Array.isArray(delta.rows[section])) throw new Error('Missing incremental section');
    const oldVersions=new Map(previous?.record_index?.[section]??[]);
    const oldRows=new Map((previous?.[section]??[]).map(row=>[section==='settings'?(row as {key:string}).key:(row as {id:string}).id,row]));
    const fresh=new Map<string,Row>();
    for (const row of delta.rows[section]) {
      const id=object(row)?row[section==='settings'?'key':'id']:null;
      if (typeof id!=='string' || fresh.has(id)) throw new Error('Duplicate incremental record');
      fresh.set(id,row);
    }
    result[section]=delta.record_index[section].map(([id,version])=>{
      if (fresh.has(id)) { const row=fresh.get(id)!;fresh.delete(id);return row; }
      if (!oldRows.has(id) || oldVersions.get(id)!==version) throw new Error('Missing changed record');
      return oldRows.get(id);
    });
    if(fresh.size) throw new Error('Unexpected incremental records');
  }
  result.counts=Object.fromEntries(recordSections.map(s=>[s,(result[s] as Row[]).length]));
  const snapshot=result as IndexedSnapshot;
  projectLibrarySnapshot(snapshot,owner,library);
  return snapshot;
}
