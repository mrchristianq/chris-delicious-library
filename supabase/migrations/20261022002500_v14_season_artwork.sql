-- Preserve the existing owner/CAS/progress protections; allow season display metadata.
begin;
create or replace function public.cdl_v14_episode_metadata(
  p_library_id uuid,
  p_show_id uuid,
  p_show_revision bigint,
  p_request_id uuid,
  p_rows jsonb
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  showrow cdl.items;
  prior cdl.change_events;
  entry jsonb;
  episode cdl.episodes;
  previous cdl.episodes;
  before_rows jsonb := '[]'::jsonb;
  receipt_rows jsonb := '[]'::jsonb;
  receipt jsonb;
  allowed_metadata constant text[] := array['EpisodeTitle','AirDate','StillURL','Overview','Runtime','Source','UpdatedAt','SeasonTitle','SeasonPosterURL'];
begin
  if auth.uid() is null or p_library_id is null or p_show_id is null or p_show_revision is null or p_show_revision < 1 or p_request_id is null then
    raise exception 'Authentication and episode metadata identity required';
  end if;
  if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Invalid episode metadata batch'; end if;
  if jsonb_array_length(p_rows) not between 1 and 1000 or octet_length(p_rows::text)>5000000 then raise exception 'Invalid episode metadata batch'; end if;

  -- Validate every row before acquiring the parent lock or changing any episode.
  for entry in select value from jsonb_array_elements(p_rows) loop
    if jsonb_typeof(entry)<>'object' or not (entry ?& array['season_number','episode_number','provider_id','metadata']) or
      exists(select 1 from jsonb_object_keys(entry) k where k not in ('season_number','episode_number','provider_id','metadata')) or
      jsonb_typeof(entry->'season_number')<>'number' or jsonb_typeof(entry->'episode_number')<>'number' or
      (entry->>'season_number') !~ '^(0|[1-9][0-9]*)$' or (entry->>'episode_number') !~ '^(0|[1-9][0-9]*)$' or
      length(entry->>'season_number')>10 or length(entry->>'episode_number')>10 or
      (entry->>'season_number')::numeric>2147483647 or (entry->>'episode_number')::numeric>2147483647 or
      jsonb_typeof(entry->'provider_id') not in ('string','null') or
      (jsonb_typeof(entry->'provider_id')='string' and length(entry->>'provider_id')>5000) or
      jsonb_typeof(entry->'metadata')<>'object' then
      raise exception 'Invalid episode metadata fields';
    end if;
    if exists(select 1 from jsonb_object_keys(entry->'metadata') k where not (k=any(allowed_metadata))) or
      exists(select 1 from jsonb_each(entry->'metadata') m where jsonb_typeof(m.value) not in ('string','number','boolean','null')) then
      raise exception 'Unsupported episode metadata field or value';
    end if;
  end loop;
  if exists(
    select 1 from jsonb_array_elements(p_rows) r
    group by (r->>'season_number')::integer,(r->>'episode_number')::integer
    having count(*)>1
  ) then raise exception 'Duplicate episode metadata slot'; end if;

  if not exists(select 1 from cdl.libraries l where l.id=p_library_id and l.owner_id=auth.uid()) then raise exception 'Library not available'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));

  -- Locking the live parent serializes metadata refreshes and item edits without
  -- changing its user-visible revision.
  select i.* into showrow from cdl.items i
    join cdl.libraries l on l.id=i.library_id
    where i.id=p_show_id and i.library_id=p_library_id and l.owner_id=auth.uid()
      and i.media_type='tv' and i.deleted_at is null
    for update of i;
  if not found then raise exception 'Show not available'; end if;

  select * into prior from cdl.change_events where library_id=p_library_id and request_id=p_request_id;
  if found then
    if prior.entity_kind<>'episode_metadata' or prior.entity_id<>p_show_id or
      prior.changes->>'show_revision' is distinct from p_show_revision::text or
      prior.changes->'input' is distinct from p_rows then
      raise exception 'Request ID reused for a different episode metadata save';
    end if;
    return prior.changes->'receipt';
  end if;
  if showrow.revision is distinct from p_show_revision then raise exception 'Show changed elsewhere. Reload before saving episode metadata.'; end if;

  for entry in
    select value from jsonb_array_elements(p_rows)
    order by (value->>'season_number')::integer,(value->>'episode_number')::integer
  loop
    select e.* into previous from cdl.episodes e
      where e.library_id=p_library_id and e.show_id=p_show_id
        and e.season_number=(entry->>'season_number')::integer
        and e.episode_number=(entry->>'episode_number')::integer;
    before_rows:=before_rows || jsonb_build_array(case when previous.id is null then null else to_jsonb(previous) end);

    insert into cdl.episodes(library_id,show_id,season_number,episode_number,provider_id,metadata)
      values(p_library_id,p_show_id,(entry->>'season_number')::integer,(entry->>'episode_number')::integer,
        entry->>'provider_id',entry->'metadata')
      on conflict(show_id,season_number,episode_number) do update set
        provider_id=excluded.provider_id,
        metadata=cdl.episodes.metadata || excluded.metadata
      returning * into episode;
    receipt_rows:=receipt_rows || jsonb_build_array(jsonb_build_object(
      'id',episode.id,'season_number',episode.season_number,'episode_number',episode.episode_number,
      'provider_id',episode.provider_id,'metadata',episode.metadata));
  end loop;

  receipt:=jsonb_build_object('show_id',p_show_id,'show_revision',showrow.revision,'rows',receipt_rows);
  insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes)
    values(p_library_id,p_request_id,'episode_metadata',p_show_id,jsonb_build_object(
      'input',p_rows,'show_revision',p_show_revision,'before',before_rows,'receipt',receipt));
  -- TV episode metadata is app-only and has no tracker sync outbox entry.
  return receipt;
end $$;
revoke all on function public.cdl_v14_episode_metadata(uuid,uuid,bigint,uuid,jsonb) from public,anon;
grant execute on function public.cdl_v14_episode_metadata(uuid,uuid,bigint,uuid,jsonb) to authenticated;
commit;
