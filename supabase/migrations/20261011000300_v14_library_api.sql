begin;
create function public.cdl_v14_browse(p_type text default null, p_query text default '', p_offset integer default 0)
returns jsonb language sql stable security definer set search_path = '' as $$
  with matches as (
    select i.*, (m.fields - '_import' - 'providerEvidence') as metadata
    from cdl.items i join cdl.libraries l on l.id=i.library_id
    left join cdl.item_metadata m on m.item_id=i.id
    where l.owner_id=(select auth.uid()) and i.deleted_at is null
      and (p_type is null or i.media_type=p_type)
      and position(lower(left(coalesce(p_query,''),200)) in lower(i.title))>0
  ), page as (select * from matches order by lower(title),id limit 60 offset greatest(0,least(coalesce(p_offset,0),100000)))
  select jsonb_build_object('total',(select count(*) from matches),'items',coalesce((select jsonb_agg(to_jsonb(page)-'import_row_id') from page),'[]'::jsonb));
$$;

create function public.cdl_v14_get_item(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select (to_jsonb(i)-'import_row_id') || jsonb_build_object('metadata',m.fields-'_import'-'providerEvidence')
  from cdl.items i join cdl.libraries l on l.id=i.library_id left join cdl.item_metadata m on m.item_id=i.id
  where i.id=p_id and l.owner_id=(select auth.uid()) and i.deleted_at is null;
$$;

create function public.cdl_v14_save_item(p_id uuid,p_revision bigint,p_request_id uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare oldrow cdl.items; newrow cdl.items; prior cdl.change_events; options text[];
begin
  if auth.uid() is null or p_request_id is null then raise exception 'Authentication and request ID required'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb then raise exception 'Empty or invalid patch'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('user_status','personal_rating','completed_on','notes','tags','hoursPlayed','yearPlayed')) then raise exception 'Unsupported field'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
  select i.* into oldrow from cdl.items i join cdl.libraries l on l.id=i.library_id where i.id=p_id and l.owner_id=auth.uid() and i.deleted_at is null for update of i;
  if not found then raise exception 'Item not available'; end if;
  select * into prior from cdl.change_events where library_id=oldrow.library_id and request_id=p_request_id;
  if found then
    if prior.entity_id<>p_id or prior.entity_kind<>'item' or prior.changes->'patch' is distinct from p_patch or prior.changes->>'expected_revision' is distinct from p_revision::text then raise exception 'Request ID reused for a different save'; end if;
    return prior.changes->'after';
  end if;
  if oldrow.revision is distinct from p_revision then raise exception 'Item changed elsewhere. Reload before saving.'; end if;
  options := case oldrow.media_type
    when 'book' then array['Reading','Completed','Backlog','Abandoned','Paused','Collection','Wishlist']
    when 'movie' then array['Watched','Started','Backlog','Pending Digital Release','Abandoned']
    when 'tv' then array['Completed','Abandoned','Started','Backlog','Watch Next','Paused','Pending Return','Pending Release']
    else array['Now Playing','Queued','Collection','Completed','Abandoned','Wishlist','Replay','Backlog'] end;
  if p_patch ? 'user_status' and (jsonb_typeof(p_patch->'user_status')<>'string' or not (p_patch->>'user_status'=any(options))) then raise exception 'Invalid status'; end if;
  if p_patch ? 'personal_rating' and jsonb_typeof(p_patch->'personal_rating') not in ('number','null') then raise exception 'Invalid rating'; end if;
  if p_patch ? 'notes' and (jsonb_typeof(p_patch->'notes')<>'string' or length(p_patch->>'notes')>100000) then raise exception 'Invalid notes'; end if;
  if p_patch ? 'completed_on' and jsonb_typeof(p_patch->'completed_on')<>'null' and (jsonb_typeof(p_patch->'completed_on')<>'string' or (p_patch->>'completed_on') !~ '^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid date'; end if;
  if (p_patch ? 'tags' and (oldrow.media_type<>'book' or jsonb_typeof(p_patch->'tags')<>'string')) or
     ((p_patch ? 'hoursPlayed' or p_patch ? 'yearPlayed') and oldrow.media_type<>'game') then raise exception 'Invalid media field'; end if;
  if p_patch ? 'hoursPlayed' and (jsonb_typeof(p_patch->'hoursPlayed')<>'string' or (p_patch->>'hoursPlayed') !~ '^\d+(\.\d+)?$') then raise exception 'Invalid hours'; end if;
  if p_patch ? 'yearPlayed' and (jsonb_typeof(p_patch->'yearPlayed')<>'string' or (p_patch->>'yearPlayed') !~ '^\d{4}$') then raise exception 'Invalid year'; end if;
  update cdl.items set
    user_status=case when p_patch ? 'user_status' then p_patch->>'user_status' else user_status end,
    personal_rating=case when p_patch ? 'personal_rating' then (p_patch->>'personal_rating')::numeric else personal_rating end,
    completed_on=case when p_patch ? 'completed_on' then (p_patch->>'completed_on')::date else completed_on end,
    notes=case when p_patch ? 'notes' then p_patch->>'notes' else notes end,
    user_fields=user_fields || case when p_patch ? 'tags' then jsonb_build_object('tags',p_patch->>'tags') else '{}'::jsonb end
      || case when p_patch ? 'hoursPlayed' then jsonb_build_object('Hours Played',p_patch->>'hoursPlayed') else '{}'::jsonb end
      || case when p_patch ? 'yearPlayed' then jsonb_build_object('Year Played',p_patch->>'yearPlayed') else '{}'::jsonb end,
    revision=revision+1,updated_at=now()
  where id=p_id returning * into newrow;
  insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes)
    values(oldrow.library_id,p_request_id,'item',p_id,jsonb_build_object('before',to_jsonb(oldrow),'after',to_jsonb(newrow),'patch',p_patch,'expected_revision',p_revision));
  insert into cdl.sync_outbox(library_id,item_id,item_revision) values(newrow.library_id,newrow.id,newrow.revision);
  return to_jsonb(newrow);
end $$;

revoke all on function public.cdl_v14_browse(text,text,integer), public.cdl_v14_get_item(uuid), public.cdl_v14_save_item(uuid,bigint,uuid,jsonb) from public,anon;
grant execute on function public.cdl_v14_browse(text,text,integer), public.cdl_v14_get_item(uuid), public.cdl_v14_save_item(uuid,bigint,uuid,jsonb) to authenticated;
commit;
