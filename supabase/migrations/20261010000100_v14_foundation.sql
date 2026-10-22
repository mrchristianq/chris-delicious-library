-- v14 foundation only. No browser grants, app wiring or sync worker.
-- Apply only to the isolated project after inspecting the migration plan.
begin;
create schema cdl;
revoke all on schema cdl from public, anon, authenticated;
alter default privileges in schema cdl revoke all on tables from public, anon, authenticated;
alter default privileges in schema cdl revoke execute on functions from public, anon, authenticated;

create table cdl.libraries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  created_at timestamptz not null default now()
);
create table cdl.import_batches (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references cdl.libraries(id),
  source_sheet_id text not null,
  snapshot_sha256 text not null check (snapshot_sha256 ~ '^[0-9a-f]{64}$'),
  captured_at timestamptz not null,
  status text not null default 'staged' check (status in ('staged','review','verified','imported')),
  unique(library_id, snapshot_sha256),
  unique(library_id,id)
);
-- Arrays preserve duplicate/blank headers, formulas and otherwise unknown cells.
create table cdl.import_rows (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null,
  batch_id uuid not null,
  tab text not null,
  source_row integer not null check(source_row > 1),
  headers jsonb not null check(jsonb_typeof(headers) = 'array'),
  raw_cells jsonb not null check(jsonb_typeof(raw_cells) = 'array'),
  effective_cells jsonb check(jsonb_typeof(effective_cells) = 'array'),
  foreign key(library_id,batch_id) references cdl.import_batches(library_id,id),
  unique(batch_id,tab,source_row),
  unique(library_id,id)
);
create table cdl.items (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references cdl.libraries(id),
  media_type text not null check(media_type in ('book','movie','tv','game')),
  title text not null check(length(trim(title)) > 0),
  user_status text,
  personal_rating numeric,
  completed_on date,
  notes text not null default '',
  -- User edition/ownership/tags/overrides are separate from refreshable metadata.
  user_fields jsonb not null default '{}' check(jsonb_typeof(user_fields) = 'object'),
  revision bigint not null default 1 check(revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  import_row_id uuid,
  check(personal_rating is null or
    (personal_rating >= 0 and personal_rating <= case when media_type='book' then 5 else 10 end)),
  foreign key(library_id,import_row_id) references cdl.import_rows(library_id,id),
  unique(library_id,id),
  unique(import_row_id)
);
create index items_library_type on cdl.items(library_id,media_type) where deleted_at is null;
create index items_library_completed on cdl.items(library_id,completed_on desc nulls last);
create table cdl.item_metadata (
  item_id uuid primary key,
  library_id uuid not null,
  fields jsonb not null default '{}' check(jsonb_typeof(fields) = 'object'),
  fetched_at timestamptz,
  foreign key(library_id,item_id) references cdl.items(library_id,id)
);
create table cdl.identifiers (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null,
  item_id uuid not null,
  provider text not null,
  value text not null,
  foreign key(library_id,item_id) references cdl.items(library_id,id),
  unique(item_id,provider,value)
);
-- A provider ID is deliberately NOT unique across different library editions.
create index identifiers_lookup on cdl.identifiers(library_id,provider,value);
create table cdl.episodes (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null,
  show_id uuid not null,
  season_number integer not null check(season_number >= 0),
  episode_number integer not null check(episode_number >= 0),
  provider_id text,
  metadata jsonb not null default '{}' check(jsonb_typeof(metadata) = 'object'),
  foreign key(library_id,show_id) references cdl.items(library_id,id),
  unique(show_id,season_number,episode_number),
  unique(library_id,id)
);
create table cdl.episode_progress (
  library_id uuid not null,
  episode_id uuid primary key,
  watched boolean not null default false,
  watched_at timestamptz,
  revision bigint not null default 1 check(revision > 0),
  foreign key(library_id,episode_id) references cdl.episodes(library_id,id)
);
create table cdl.settings (
  library_id uuid not null references cdl.libraries(id),
  key text not null,
  value jsonb not null,
  revision bigint not null default 1 check(revision > 0),
  primary key(library_id,key)
);
create table cdl.collections (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references cdl.libraries(id),
  key text not null,
  definition jsonb not null default '{}',
  unique(library_id,key),
  unique(library_id,id)
);
create table cdl.collection_items (
  library_id uuid not null,
  collection_id uuid not null,
  item_id uuid not null,
  position bigint not null,
  foreign key(library_id,collection_id) references cdl.collections(library_id,id),
  foreign key(library_id,item_id) references cdl.items(library_id,id),
  primary key(collection_id,item_id),
  unique(collection_id,position) deferrable initially deferred
);
create table cdl.assets (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references cdl.libraries(id),
  item_id uuid,
  kind text not null,
  url text not null,
  provenance jsonb not null default '{}',
  foreign key(library_id,item_id) references cdl.items(library_id,id)
);
create table cdl.import_issues (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null,
  batch_id uuid not null,
  code text not null,
  detail jsonb not null,
  resolution jsonb,
  foreign key(library_id,batch_id) references cdl.import_batches(library_id,id)
);
create table cdl.change_events (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references cdl.libraries(id),
  request_id uuid not null,
  entity_kind text not null,
  entity_id uuid not null,
  changes jsonb not null,
  created_at timestamptz not null default now(),
  unique(library_id,request_id)
);
create table cdl.sync_targets (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null references cdl.libraries(id),
  -- Test-only constraint. A future cutover requires a reviewed migration.
  sheet_id text not null check(sheet_id = '1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0'),
  enabled boolean not null default false check(enabled = false),
  approved_columns jsonb not null,
  unique(library_id,id),
  unique(library_id,sheet_id)
);
create table cdl.sync_outbox (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null,
  item_id uuid not null,
  item_revision bigint not null check(item_revision > 0),
  created_at timestamptz not null default now(),
  foreign key(library_id,item_id) references cdl.items(library_id,id),
  unique(item_id,item_revision)
);
create table cdl.sync_baselines (
  library_id uuid not null,
  target_id uuid not null,
  item_id uuid not null,
  confirmed_fields jsonb not null,
  confirmed_at timestamptz not null,
  foreign key(library_id,target_id) references cdl.sync_targets(library_id,id),
  foreign key(library_id,item_id) references cdl.items(library_id,id),
  primary key(target_id,item_id)
);
create table cdl.sync_runs (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null,
  target_id uuid not null,
  status text not null check(status in ('pending','running','review','failed','completed')),
  cursor_data jsonb not null default '{}',
  started_at timestamptz,
  finished_at timestamptz,
  foreign key(library_id,target_id) references cdl.sync_targets(library_id,id),
  unique(library_id,id)
);
create unique index sync_one_running on cdl.sync_runs(target_id) where status = 'running';
create table cdl.sync_conflicts (
  id uuid primary key default gen_random_uuid(),
  library_id uuid not null,
  run_id uuid not null,
  item_id uuid not null,
  field text not null,
  baseline jsonb,
  app_value jsonb,
  sheet_value jsonb,
  resolution jsonb,
  foreign key(library_id,run_id) references cdl.sync_runs(library_id,id),
  foreign key(library_id,item_id) references cdl.items(library_id,id)
);
-- Fail closed for the entire foundation. An authenticated owner API and
-- transactional mutation functions must be implemented/tested before grants.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname='cdl' loop
    execute format('alter table cdl.%I enable row level security',t.tablename);
    execute format('alter table cdl.%I force row level security',t.tablename);
    execute format('revoke all on table cdl.%I from public, anon, authenticated',t.tablename);
  end loop;
end $$;
revoke all on all sequences in schema cdl from public, anon, authenticated;
commit;

