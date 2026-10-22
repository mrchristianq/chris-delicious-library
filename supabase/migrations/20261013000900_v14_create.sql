begin;
create function public.cdl_v14_create_item(p_library_id uuid,p_id uuid,p_request_id uuid,p_media_type text,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare prior cdl.change_events; receipt jsonb;
begin
  if auth.uid() is null or p_id is null or p_request_id is null then raise exception 'Authentication and creation identity required';end if;
  if p_media_type is null or p_media_type not in ('book','movie','tv','game') then raise exception 'Invalid media type';end if;
  if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library not available';end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or not (p_patch ? 'title') then raise exception 'Creation title required';end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
  select * into prior from cdl.change_events where library_id=p_library_id and request_id=p_request_id;
  if found then
    if prior.entity_kind<>'create' or prior.entity_id<>p_id or prior.changes->>'media_type' is distinct from p_media_type or prior.changes->'patch' is distinct from p_patch then raise exception 'Request ID reused for different creation';end if;
    return prior.changes->'receipt';
  end if;
  -- Insert and apply are one transaction; invalid form data rolls everything back.
  -- Reuse the reviewed allowlist/status/rating/date validator instead of forking it.
  insert into cdl.items(id,library_id,media_type,title) values(p_id,p_library_id,p_media_type,p_patch->>'title');
  insert into cdl.item_metadata(item_id,library_id,fields) values(p_id,p_library_id,'{}');
  receipt:=public.cdl_v14_full_edit(p_id,1,p_request_id,p_patch);
  update cdl.change_events set entity_kind='create',changes=jsonb_build_object(
    'before',null,'after',receipt,'receipt',receipt,'media_type',p_media_type,'patch',p_patch)
    where library_id=p_library_id and request_id=p_request_id;
  -- The full-edit transaction already wrote exactly one audit/outbox entry.
  return receipt;
end $$;
revoke all on function public.cdl_v14_create_item(uuid,uuid,uuid,text,jsonb) from public,anon;
grant execute on function public.cdl_v14_create_item(uuid,uuid,uuid,text,jsonb) to authenticated;
commit;
