import type { LibrarySnapshot } from './library-snapshot';

type Rpc = (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: null | { code?: string } }>;
type Row = Record<string, unknown>;
const sections = ['items', 'episodes', 'settings', 'identifiers', 'collections', 'collection_items'] as const;
type Section = typeof sections[number];
type Manifest = { library_id: string; owner_id: string; observed_at: string; change_token: string; transaction_token: string; counts: Record<Section, number> };
const isRow = (value: unknown): value is Row => !!value && typeof value === 'object' && !Array.isArray(value);
const pageSize = 200;

/** Each attempt reads fresh data. Matching MVCC manifests bracket all pages so
 * no partial or mixed-version library reaches the existing renderer/readback. */
export async function readBoundedSnapshot(rpc: Rpc, libraryId: string): Promise<LibrarySnapshot> {
  const call = async (name: string, args: Row) => {
    const { data, error } = await rpc(name, args);
    if (error) throw new Error(`Fresh library read failed (${error.code || 'database'}).`);
    return data;
  };
  const manifest = async (): Promise<Manifest> => {
    const data = await call('cdl_v14_snapshot_guard', { p_library_id: libraryId });
    if (!isRow(data) || data.library_id !== libraryId || typeof data.owner_id !== 'string' ||
        !/^[0-9a-f-]{36}$/i.test(data.owner_id) || typeof data.change_token !== 'string' || !/^[0-9a-f]{32}$/i.test(data.change_token) ||
        typeof data.transaction_token !== 'string' || !/^\d+:\d+:(\d+(,\d+)*)?$/.test(data.transaction_token) ||
        typeof data.observed_at !== 'string' || !Number.isFinite(Date.parse(data.observed_at)) || !isRow(data.counts)) throw new Error('Invalid library manifest');
    for (const section of sections) if (!Number.isSafeInteger(data.counts[section]) || Number(data.counts[section]) < 0 || Number(data.counts[section]) > 1000000) throw new Error('Invalid library count');
    return data as Manifest;
  };
  for (let attempt = 0; attempt < 2; attempt++) {
    const before = await manifest();
    const pages: { section: Section; offset: number; rows?: Row[] }[] = [];
    for (const section of sections) for (let offset = 0; offset < before.counts[section]; offset += pageSize) pages.push({ section, offset });
    let next = 0;
    await Promise.all(Array.from({ length: Math.min(3, pages.length) }, async () => {
      while (next < pages.length) {
        const page = pages[next++];
        const data = await call('cdl_v14_snapshot_page', { p_library_id: libraryId, p_section: page.section, p_offset: page.offset, p_limit: pageSize });
        if (!isRow(data) || data.library_id !== libraryId || data.owner_id !== before.owner_id || data.section !== page.section || data.offset !== page.offset ||
            !Array.isArray(data.rows) || data.rows.length > pageSize || !data.rows.every(isRow)) throw new Error('Invalid library page');
        page.rows = data.rows;
      }
    }));
    const after = await manifest();
    if (before.owner_id !== after.owner_id) throw new Error('Library owner changed during read');
    if (before.change_token !== after.change_token || before.transaction_token !== after.transaction_token || sections.some(key => before.counts[key] !== after.counts[key])) continue;
    const rows = Object.fromEntries(sections.map(section => [section, pages.filter(page => page.section === section).flatMap(page => page.rows || [])])) as Record<Section, Row[]>;
    for (const section of sections) if (rows[section].length !== after.counts[section]) throw new Error('Incomplete library page');
    // Extra sections are retained for compatibility with the original RPC.
    const members = new Map<string, Row[]>();
    for (const member of rows.collection_items) {
      if (typeof member.collection_id !== 'string' || typeof member.item_id !== 'string' || !Number.isSafeInteger(member.position)) throw new Error('Invalid collection member');
      const entries = members.get(member.collection_id) || [];
      entries.push({ item_id: member.item_id, position: member.position });
      members.set(member.collection_id, entries);
    }
    const collections = rows.collections.map(collection => {
      if (typeof collection.id !== 'string') throw new Error('Invalid collection');
      const items = members.get(collection.id) || [];
      members.delete(collection.id);
      return { ...collection, items };
    });
    if (members.size) throw new Error('Missing collection parent');
    return { schema_version: 1, complete: true, library_id: libraryId, owner_id: after.owner_id,
      observed_at: after.observed_at, change_token: after.change_token,
      counts: { items: rows.items.length, episodes: rows.episodes.length, settings: rows.settings.length },
      items: rows.items, episodes: rows.episodes, settings: rows.settings, identifiers: rows.identifiers, collections,
    } as unknown as LibrarySnapshot;
  }
  throw new Error('Library changed during both fresh read attempts. Please retry.');
}

/** Renderer-only projection; full exports and sync keep the original reader.
 * A missing migration can safely use the original fresh read during rollout. */
export async function readBoundedRendererSnapshot(rpc: Rpc, libraryId: string): Promise<LibrarySnapshot> {
  let missing=false;
  try {
    return await readBoundedSnapshot(async (name,args)=>{
      const result=await rpc(name === "cdl_v14_snapshot_guard" ? "cdl_v14_renderer_guard" : "cdl_v14_renderer_page",args);
      if (result.error?.code === "PGRST202") missing=true;
      return result;
    },libraryId);
  } catch (error) {
    if (!missing) throw error;
    return readBoundedSnapshot(rpc,libraryId);
  }
}
