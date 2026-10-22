import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const TEST_PROJECT = 'xnitocbxdpikvfxssbvm';
const SOURCE = '1Kh_wLgr6aSKU50fgzqL29YZbNtnJTX8ZdVGGwljyf1Y';
const uuid = value => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const id = value => { const h = hash(value); return `${h.slice(0,8)}-${h.slice(8,12)}-5${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`; };
const quote = value => `'${String(value).replaceAll("'", "''")}'`;

// Deliberately rollback-only. There is no commit flag and no network client.
export function prepareImport(packet, { ownerId, projectRef }) {
  return buildImport(packet, { ownerId, projectRef });
}

// Explicit, separate persistent path. The old rehearsal API stays rollback-only.
export function prepareCommittedImport(packet, { ownerId, projectRef, ownerEmail, expectedSnapshotSha256, confirmation }) {
  if (confirmation !== `IMPORT ${TEST_PROJECT} ${ownerId}`) throw new Error('Explicit test import confirmation required');
  if (!ownerEmail || !ownerEmail.includes('@')) throw new Error('Confirmed owner email required');
  if (expectedSnapshotSha256 !== packet.snapshotSha256) throw new Error('Approved snapshot mismatch');
  const age = Date.now() - Date.parse(packet.capture?.completedAt);
  if (!Number.isFinite(age) || age < 0 || age > 30 * 60 * 1000) throw new Error('Capture must be less than 30 minutes old');
  return buildImport(packet, { ownerId, projectRef, ownerEmail });
}

function buildImport(packet, { ownerId, projectRef, ownerEmail }) {
  if (projectRef !== TEST_PROJECT) throw new Error('Wrong project');
  if (!uuid(ownerId)) throw new Error('Invalid owner UUID');
  if (packet.mode !== 'LOCAL-IMPORT-CANDIDATE-NO-WRITES' || packet.capture?.sourceSheetId !== SOURCE) throw new Error('Unexpected packet');
  if (hash(packet.capture) !== packet.snapshotSha256) throw new Error('Snapshot hash mismatch');
  for (const tab of packet.capture.tabs) {
    if (JSON.stringify(tab.formulaBefore) !== JSON.stringify(tab.formulaAfter)) throw new Error('Unstable snapshot');
  }
  const itemIds = new Set(packet.items.map(i => i.id));
  if (itemIds.size !== packet.items.length || [...itemIds].some(v => !uuid(v))) throw new Error('Invalid item identity');
  const showIds = new Set(packet.items.filter(i => i.media_type === 'tv').map(i => i.id));
  const episodeIds = new Set(); const episodeKeys = new Set();
  for (const e of packet.episodes) {
    const key = `${e.show_id}:${e.season_number}:${e.episode_number}`;
    if (!uuid(e.id) || episodeIds.has(e.id) || episodeKeys.has(key) || !showIds.has(e.show_id)) throw new Error('Invalid episode identity');
    if (![true, false, null].includes(e.watched)) throw new Error('Invalid progress');
    episodeIds.add(e.id); episodeKeys.add(key);
  }
  const libraryId = id(`library:${ownerId}:${SOURCE}`), batchId = id(`batch:${libraryId}:${packet.snapshotSha256}`);
  const rawRows = [];
  for (const tab of packet.capture.tabs) for (let n = 1; n < tab.formulaBefore.length; n++) {
    const cells = tab.formulaBefore[n];
    if (!cells.some(v => String(v ?? '').trim())) continue;
    rawRows.push({ id: id(`${batchId}:${tab.name}:${n + 1}`), tab: tab.name, source_row: n + 1, headers: tab.formulaBefore[0], raw_cells: cells, effective_cells: tab.evaluated[n] || [] });
  }
  const rawIds = new Map(rawRows.map(r => [`${r.tab}:${r.source_row}`, r.id]));
  const items = packet.items.map(i => {
    const first = i.source[0]; const importRowId = rawIds.get(`${first.tab}:${first.row}`);
    if (!importRowId) throw new Error('Missing item provenance');
    if (!i.title?.trim() || !['book','movie','tv','game'].includes(i.media_type)) throw new Error('Invalid item');
    if (i.personal_rating !== null && (!Number.isFinite(i.personal_rating) || i.personal_rating < 0 || i.personal_rating > (i.media_type === 'book' ? 5 : 10))) throw new Error('Invalid rating');
    return { ...i, source: undefined, import_row_id: importRowId, metadata: { ...i.metadata, _import: { source_rows: i.source.map(r => rawIds.get(`${r.tab}:${r.row}`)) } } };
  });
  const episodes = packet.episodes.map(e => ({ ...e, source: undefined, metadata: { ...e.metadata, _import: { source_rows: e.source.map(r => rawIds.get(`TV Episodes:${r.row}`)), unknown_progress: e.watched === null } } }));
  const settings = packet.settings.map(s => ({ key: s.key, value: { value: s.value, legacy_profiles: s.legacy_profiles, source_rows: s.source.map(r => rawIds.get(`Settings:${r.row}`)) } }));
  const payload = { rawRows, items, episodes, settings, warnings: packet.warnings, sourceToItem: packet.sourceToItem, fieldSelections: packet.fieldSelections };
  const progressCount = episodes.filter(e => e.watched !== null).length;
  const sql = `-- Test project ${TEST_PROJECT}; ${ownerEmail ? 'VERIFIED OWNER IMPORT' : 'ROLLBACK ONLY'}. Contains private library data.
begin;
set local standard_conforming_strings = on;
set local statement_timeout = '120s';
select pg_advisory_xact_lock(141001);
do $$ begin
 if not exists(select 1 from auth.users where id=${quote(ownerId)}::uuid) then raise exception 'Owner must already exist'; end if;
 ${ownerEmail ? `if not exists(select 1 from auth.users where id=${quote(ownerId)}::uuid and lower(email)=lower(${quote(ownerEmail)}) and email_confirmed_at is not null and last_sign_in_at is not null) then raise exception 'Verified owner mismatch'; end if;` : ''}
 if exists(select 1 from cdl.libraries where id=${quote(libraryId)}::uuid) then raise exception 'Library already exists; refusing overwrite'; end if;
 if exists(select 1 from cdl.items) then raise exception 'Test target must be empty'; end if;
 if exists(select 1 from cdl.sync_targets where enabled) then raise exception 'Sync must remain disabled'; end if;
end $$;
create temporary table import_payload(data jsonb) on commit drop;
insert into import_payload values (${quote(JSON.stringify(payload))}::jsonb);
insert into cdl.libraries(id,owner_id,name) values (${quote(libraryId)},${quote(ownerId)},'CDL v14 import rehearsal');
insert into cdl.import_batches(id,library_id,source_sheet_id,snapshot_sha256,captured_at,status) values (${quote(batchId)},${quote(libraryId)},${quote(SOURCE)},${quote(packet.snapshotSha256)},${quote(packet.capture.completedAt)},'review');
insert into cdl.import_rows(id,library_id,batch_id,tab,source_row,headers,raw_cells,effective_cells)
select x.id,${quote(libraryId)}::uuid,${quote(batchId)}::uuid,x.tab,x.source_row,x.headers,x.raw_cells,x.effective_cells from import_payload p cross join lateral jsonb_to_recordset(p.data->'rawRows') as x(id uuid,tab text,source_row int,headers jsonb,raw_cells jsonb,effective_cells jsonb);
insert into cdl.items(id,library_id,media_type,title,user_status,personal_rating,completed_on,notes,user_fields,import_row_id)
select x.id,${quote(libraryId)}::uuid,x.media_type,x.title,x.user_status,x.personal_rating,x.completed_on,x.notes,x.user_fields,x.import_row_id from import_payload p cross join lateral jsonb_to_recordset(p.data->'items') as x(id uuid,media_type text,title text,user_status text,personal_rating numeric,completed_on date,notes text,user_fields jsonb,import_row_id uuid);
insert into cdl.item_metadata(item_id,library_id,fields)
select x.id,${quote(libraryId)}::uuid,x.metadata from import_payload p cross join lateral jsonb_to_recordset(p.data->'items') as x(id uuid,metadata jsonb);
insert into cdl.identifiers(library_id,item_id,provider,value)
select ${quote(libraryId)}::uuid,x.id,case when x.media_type='game' then 'igdb' else 'tmdb' end,x.provider_id from import_payload p cross join lateral jsonb_to_recordset(p.data->'items') as x(id uuid,media_type text,provider_id text) where x.provider_id is not null;
insert into cdl.episodes(id,library_id,show_id,season_number,episode_number,provider_id,metadata)
select x.id,${quote(libraryId)}::uuid,x.show_id,x.season_number,x.episode_number,x.metadata->>'EpisodeTMDB_ID',x.metadata from import_payload p cross join lateral jsonb_to_recordset(p.data->'episodes') as x(id uuid,show_id uuid,season_number int,episode_number int,metadata jsonb);
insert into cdl.episode_progress(library_id,episode_id,watched,watched_at)
select ${quote(libraryId)}::uuid,x.id,x.watched,x.watched_at from import_payload p cross join lateral jsonb_to_recordset(p.data->'episodes') as x(id uuid,watched boolean,watched_at timestamptz) where x.watched is not null;
insert into cdl.settings(library_id,key,value)
select ${quote(libraryId)}::uuid,x.key,x.value from import_payload p cross join lateral jsonb_to_recordset(p.data->'settings') as x(key text,value jsonb);
insert into cdl.import_issues(library_id,batch_id,code,detail)
select ${quote(libraryId)}::uuid,${quote(batchId)}::uuid,'mapping-provenance',jsonb_build_object('warnings',data->'warnings','sourceToItem',data->'sourceToItem','fieldSelections',data->'fieldSelections') from import_payload;
do $$ begin
 if (select count(*) from cdl.items) <> ${items.length} then raise exception 'Item count mismatch'; end if;
 if (select count(*) from cdl.episodes) <> ${episodes.length} then raise exception 'Episode count mismatch'; end if;
 if (select count(*) from cdl.episode_progress) <> ${progressCount} then raise exception 'Progress count mismatch'; end if;
 if (select count(*) from cdl.import_rows) <> ${rawRows.length} then raise exception 'Raw row count mismatch'; end if;
 if exists(select 1 from cdl.episodes e join cdl.items i on i.id=e.show_id where i.media_type<>'tv') then raise exception 'Invalid episode parent'; end if;
 if exists(select 1 from import_payload p cross join lateral jsonb_array_elements(p.data->'items') x join cdl.items i on i.id=(x->>'id')::uuid where i.title is distinct from x->>'title' or i.notes is distinct from x->>'notes' or i.personal_rating is distinct from (x->>'personal_rating')::numeric or i.completed_on is distinct from (x->>'completed_on')::date or i.user_status is distinct from x->>'user_status' or i.user_fields is distinct from x->'user_fields') then raise exception 'Item readback mismatch'; end if;
 if exists(select 1 from import_payload p cross join lateral jsonb_array_elements(p.data->'episodes') x left join cdl.episode_progress e on e.episode_id=(x->>'id')::uuid where e.watched is distinct from (x->>'watched')::boolean or e.watched_at is distinct from (x->>'watched_at')::timestamptz) then raise exception 'Progress readback mismatch'; end if;
 if exists(select 1 from import_payload p cross join lateral jsonb_array_elements(p.data->'settings') x left join cdl.settings s on s.library_id=${quote(libraryId)}::uuid and s.key=x->>'key' where s.value is distinct from x->'value') then raise exception 'Settings readback mismatch'; end if;
 if exists(select 1 from import_payload p cross join lateral jsonb_array_elements(p.data->'items') x left join cdl.item_metadata m on m.item_id=(x->>'id')::uuid where m.fields is distinct from x->'metadata') then raise exception 'Metadata readback mismatch'; end if;
 if exists(select 1 from import_payload p cross join lateral jsonb_array_elements(p.data->'episodes') x left join cdl.episodes e on e.id=(x->>'id')::uuid where e.metadata is distinct from x->'metadata' or e.show_id is distinct from (x->>'show_id')::uuid or e.season_number is distinct from (x->>'season_number')::int or e.episode_number is distinct from (x->>'episode_number')::int) then raise exception 'Episode readback mismatch'; end if;
 if exists(select 1 from import_payload p cross join lateral jsonb_array_elements(p.data->'rawRows') x left join cdl.import_rows r on r.id=(x->>'id')::uuid where r.headers is distinct from x->'headers' or r.raw_cells is distinct from x->'raw_cells' or r.effective_cells is distinct from x->'effective_cells') then raise exception 'Provenance readback mismatch'; end if;
end $$;
${ownerEmail ? `update cdl.import_batches set status='imported' where id=${quote(batchId)}::uuid;
update cdl.libraries set name='Chris’ Delicious Library — v14 test' where id=${quote(libraryId)}::uuid;
commit;
select 'committed-verified-import' as result,(select count(*) from cdl.items where library_id=${quote(libraryId)}::uuid) as items;` : `select 'verified-before-rollback' as result,(select count(*) from cdl.items) as items,(select count(*) from cdl.episodes) as episodes,(select count(*) from cdl.episode_progress) as explicit_progress;
rollback;
select (select count(*) from cdl.items) as items_after_rollback,(select count(*) from cdl.libraries) as libraries_after_rollback;`}
`;
  return { sql, summary: { projectRef, libraryId, batchId, mode: ownerEmail ? 'verified-owner-import' : 'rollback-only', items: items.length, episodes: episodes.length, explicitProgress: progressCount, rawRows: rawRows.length, settings: settings.length, snapshotSha256: packet.snapshotSha256 } };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [input, output, ownerId] = process.argv.slice(2);
  if (!input || !output || !ownerId) throw new Error('Usage: node scripts/v14/prepare-import.mjs PRIVATE-PACKET NEW-PRIVATE-SQL OWNER-UUID');
  const projectRef = readFileSync('supabase/.temp/project-ref', 'utf8').trim();
  const result = prepareImport(JSON.parse(readFileSync(input, 'utf8')), { ownerId, projectRef });
  writeFileSync(output, result.sql, { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify(result.summary));
}
