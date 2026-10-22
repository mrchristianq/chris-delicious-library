begin;
create function public.cdl_v14_save_episode_progress(p_library_id uuid,p_request_id uuid,p_changes jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prior cdl.change_events; entry jsonb; episode cdl.episodes; previous cdl.episode_progress;
  updated cdl.episode_progress; result jsonb := '[]'::jsonb; before_rows jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or p_request_id is null or not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library not available'; end if;
  if p_changes is null or jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 1000 then raise exception 'Invalid episode batch'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
  select * into prior from cdl.change_events where library_id=p_library_id and request_id=p_request_id;
  if found then
    if prior.entity_kind<>'episode_progress' or prior.changes->'input' is distinct from p_changes then raise exception 'Request ID reused for a different save'; end if;
    return prior.changes->'after';
  end if;
  if exists(select 1 from jsonb_array_elements(p_changes) e group by e->>'episode_id' having count(*)>1) then raise exception 'Duplicate episode target'; end if;
  -- Lock in stable order, including episodes without a progress row. This avoids
  -- racing two first-time toggles and prevents bulk-action deadlocks.
  for entry in select value from jsonb_array_elements(p_changes) order by value->>'episode_id' loop
    if jsonb_typeof(entry)<>'object' or not (entry ?& array['episode_id','revision','watched','watched_at']) or
      exists(select 1 from jsonb_object_keys(entry) k where k not in ('episode_id','revision','watched','watched_at')) or
      jsonb_typeof(entry->'episode_id')<>'string' or jsonb_typeof(entry->'watched')<>'boolean' or
      jsonb_typeof(entry->'revision') not in ('number','null') or jsonb_typeof(entry->'watched_at') not in ('string','null') then raise exception 'Invalid episode fields'; end if;
    if entry->'revision'<>'null'::jsonb and (entry->>'revision')!~'^[1-9][0-9]*$' then raise exception 'Invalid progress revision'; end if;
    if entry->'watched_at'<>'null'::jsonb and (entry->>'watched_at')!~'^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then raise exception 'Invalid watched timestamp'; end if;
    if not (entry->>'watched')::boolean and entry->'watched_at'<>'null'::jsonb then raise exception 'Unwatched cannot have watched timestamp'; end if;
    select e.* into episode from cdl.episodes e join cdl.items i on i.id=e.show_id and i.library_id=e.library_id
      where e.id=(entry->>'episode_id')::uuid and e.library_id=p_library_id and i.deleted_at is null and i.media_type='tv' for update of e;
    if not found then raise exception 'Episode not available'; end if;
    select * into previous from cdl.episode_progress where episode_id=episode.id;
    if (case when found then previous.revision else null end) is distinct from (entry->>'revision')::bigint then raise exception 'Episode changed elsewhere. Reload before saving.'; end if;
    before_rows:=before_rows || jsonb_build_array(case when previous.episode_id is null then null else to_jsonb(previous) end);
    insert into cdl.episode_progress(library_id,episode_id,watched,watched_at,revision)
      values(p_library_id,episode.id,(entry->>'watched')::boolean,(entry->>'watched_at')::timestamptz,1)
      on conflict(episode_id) do update set watched=excluded.watched,watched_at=excluded.watched_at,revision=cdl.episode_progress.revision+1
      returning * into updated;
    result:=result || jsonb_build_array(to_jsonb(updated));
  end loop;
  insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes)
    values(p_library_id,p_request_id,'episode_progress',p_library_id,jsonb_build_object('input',p_changes,'before',before_rows,'after',result));
  -- Episode progress is app-only: deliberately NO tracker outbox entry.
  return result;
end $$;
revoke all on function public.cdl_v14_save_episode_progress(uuid,uuid,jsonb) from public,anon;
grant execute on function public.cdl_v14_save_episode_progress(uuid,uuid,jsonb) to authenticated;
commit;
