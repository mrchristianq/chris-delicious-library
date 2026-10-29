begin;
-- Existing write validators/readbacks remain authoritative. Tag their audit
-- event in the same transaction; do not merge/delete historical audit records.
create function public.cdl_v14_full_edit_activity(p_id uuid,p_revision bigint,p_request_id uuid,p_patch jsonb,p_activity_id uuid,p_activity_role text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare library uuid; prior cdl.change_events; receipt jsonb;
begin
 if auth.uid() is null or p_activity_id is null or p_activity_role is null or p_activity_role not in ('user','metadata','artwork') then raise exception 'Invalid activity context';end if;
 select i.library_id into library from cdl.items i join cdl.libraries l on l.id=i.library_id where i.id=p_id and l.owner_id=auth.uid();
 if library is null then raise exception 'Item not available';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select * into prior from cdl.change_events where library_id=library and request_id=p_request_id;
 if found and (prior.changes->>'activity_id' is distinct from p_activity_id::text or prior.changes->>'activity_role' is distinct from p_activity_role) then raise exception 'Activity request reused';end if;
 if p_activity_role='user' then
  if p_activity_id<>p_request_id then raise exception 'User action requires its own activity';end if;
 else
  if not exists(select 1 from cdl.change_events where library_id=library and entity_id=p_id and request_id=p_activity_id and changes->>'activity_id'=p_activity_id::text and changes->>'activity_role'='user') then raise exception 'Activity parent not available';end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or exists(select 1 from jsonb_object_keys(p_patch) k where k<>'overrides') then raise exception 'Follow-up cannot change personal fields';end if;
  if p_activity_role='artwork' and exists(select 1 from jsonb_object_keys(p_patch->'overrides') k where k not in ('R2CoverUrl','r2CoverUrl','R2CoverUrl_Date','R2BackdropUrl','r2BackdropUrl','R2BackdropUrl_Date')) then raise exception 'Unsupported artwork continuation';end if;
  if p_activity_role='metadata' and exists(select 1 from jsonb_object_keys(p_patch->'overrides') k where k not in ('Rating','IGDB Rating','TMDB_Rating','UserRating','ExternalAverageRating','CoverURL','PosterURL','Poster','ImageURL','BackdropURL','ScreenshotsURL','Overview','Description','Genres','Genre','ReleaseDate','Release Date','Year','Runtime','Developer','Publisher','PageCount','IGDB_ID','TMDB_ID','FirstAirDate','First Air Date','LastAirDate','Last Air Date','Networks','NumberOfEpisodes','NumberOfSeasons','StreamingUS','Time To Beat','TimeToBeat')) then raise exception 'Unsupported metadata continuation';end if;
 end if;
 receipt:=public.cdl_v14_full_edit(p_id,p_revision,p_request_id,p_patch);
 update cdl.change_events set changes=changes||jsonb_build_object('activity_id',p_activity_id,'activity_role',p_activity_role)
 where library_id=library and request_id=p_request_id and changes->>'activity_id' is null;
 return receipt;
end;
$$;
create function public.cdl_v14_create_item_activity(p_library_id uuid,p_id uuid,p_request_id uuid,p_media_type text,p_patch jsonb,p_activity_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare receipt jsonb; prior cdl.change_events;
begin
 if auth.uid() is null or p_activity_id is null or p_activity_id<>p_request_id or not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Invalid creation activity';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
 select * into prior from cdl.change_events where library_id=p_library_id and request_id=p_request_id;
 if found and (prior.changes->>'activity_id' is distinct from p_activity_id::text or prior.changes->>'activity_role' is distinct from 'user') then raise exception 'Activity request reused';end if;
 receipt:=public.cdl_v14_create_item(p_library_id,p_id,p_request_id,p_media_type,p_patch);
 update cdl.change_events set changes=changes||jsonb_build_object('activity_id',p_activity_id,'activity_role','user') where library_id=p_library_id and request_id=p_request_id and changes->>'activity_id' is null;
 return receipt;
end;
$$;
revoke all on function public.cdl_v14_full_edit_activity(uuid,bigint,uuid,jsonb,uuid,text),public.cdl_v14_create_item_activity(uuid,uuid,uuid,text,jsonb,uuid) from public,anon;
grant execute on function public.cdl_v14_full_edit_activity(uuid,bigint,uuid,jsonb,uuid,text),public.cdl_v14_create_item_activity(uuid,uuid,uuid,text,jsonb,uuid) to authenticated;
create or replace function public.cdl_v14_activity(p_library_id uuid, p_changelog_limit integer default 300, p_event_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_changelog_limit is null or p_changelog_limit < 0 or p_changelog_limit > 300 or
     p_event_limit is null or p_event_limit < 0 or p_event_limit > 100 then
    raise exception 'Invalid activity limit';
  end if;

  if not exists(select 1 from cdl.libraries l where l.id=p_library_id and l.owner_id=auth.uid()) then
    return jsonb_build_object('changelog','[]'::jsonb,'events','[]'::jsonb);
  end if;

  select jsonb_build_object(
    'changelog', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source_row', page.source_row,
        'headers', page.headers,
        'cells', coalesce(page.effective_cells,page.raw_cells)
      ) order by page.source_row desc)
      from (
        select r.source_row,r.headers,r.raw_cells,r.effective_cells
        from cdl.import_rows r
        where r.library_id=p_library_id and r.tab='Changelog'
          and r.batch_id=(
            select b.id
            from cdl.import_batches b
            where b.library_id=p_library_id and b.status in ('review','verified','imported')
              and exists(select 1 from cdl.import_rows eligible where eligible.library_id=b.library_id
                and eligible.batch_id=b.id and eligible.tab='Changelog')
            order by b.captured_at desc,b.id desc
            limit 1
          )
        order by r.source_row desc
        limit p_changelog_limit
      ) page
    ),'[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'created_at', page.created_at,
        'entity_kind', page.entity_kind,
        'entity_id', page.entity_id,
        'source_row', page.source_row,
        'changes', page.safe_changes
      ) order by page.created_at desc,page.id desc)
      from (
        select e.id,e.created_at,e.entity_kind,e.entity_id,
          (select r.source_row from cdl.items i join cdl.import_rows r
            on r.library_id=i.library_id and r.id=i.import_row_id
            where i.library_id=e.library_id and i.id=e.entity_id and r.tab in ('Books','Movies','Shows','Games')
            limit 1) as source_row,
          case e.entity_kind
            when 'item' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after')
            when 'full_edit' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after')
            when 'create' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after')
            when 'archive' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after','archived',e.changes->'archived')
            when 'setting' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after','input',e.changes->'input')
            when 'episode_progress' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after','input',e.changes->'input')
            when 'episode_metadata' then jsonb_build_object('before',e.changes->'before','input',e.changes->'input')
          end || jsonb_build_object('activity_id',e.changes->'activity_id','activity_role',e.changes->'activity_role') as safe_changes
        from cdl.change_events e
        where e.library_id=p_library_id
          and e.entity_kind in ('item','full_edit','create','archive','setting','episode_progress','episode_metadata')
        order by e.created_at desc,e.id desc
        limit p_event_limit
      ) page
    ),'[]'::jsonb)
  ) into result;
  return result;
end $$;

notify pgrst,'reload schema';
commit;
