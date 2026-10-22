begin;
-- Recoverable deletion: retain metadata, identifiers and episode progress.
-- Tracker removal requires separate review; archive never queues a Sheet delete.
create function public.cdl_v14_set_archived(p_id uuid,p_revision bigint,p_request_id uuid,p_archived boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare oldrow cdl.items; newrow cdl.items; prior cdl.change_events;
begin
  if auth.uid() is null or p_request_id is null or p_archived is null then raise exception 'Authentication, request ID and archive state required'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
  select i.* into oldrow from cdl.items i join cdl.libraries l on l.id=i.library_id
    where i.id=p_id and l.owner_id=auth.uid() for update of i;
  if not found then raise exception 'Item not available'; end if;
  select * into prior from cdl.change_events where library_id=oldrow.library_id and request_id=p_request_id;
  if found then
    if prior.entity_id<>p_id or prior.entity_kind<>'archive' or prior.changes->>'expected_revision' is distinct from p_revision::text
      or prior.changes->'archived' is distinct from to_jsonb(p_archived) then raise exception 'Request ID reused for a different save'; end if;
    return prior.changes->'receipt';
  end if;
  if oldrow.revision is distinct from p_revision then raise exception 'Item changed elsewhere. Reload before saving.'; end if;
  if (oldrow.deleted_at is not null)=p_archived then raise exception 'Archive state already changed. Reload before saving.'; end if;
  update cdl.items set deleted_at=case when p_archived then now() else null end,revision=revision+1,updated_at=now()
    where id=p_id returning * into newrow;
  insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes)
    values(newrow.library_id,p_request_id,'archive',newrow.id,jsonb_build_object(
      'before',to_jsonb(oldrow),'after',to_jsonb(newrow),'expected_revision',p_revision,'archived',p_archived,
      'receipt',jsonb_build_object('id',newrow.id,'library_id',newrow.library_id,'revision',newrow.revision,'archived',p_archived)));
  return jsonb_build_object('id',newrow.id,'library_id',newrow.library_id,'revision',newrow.revision,'archived',p_archived);
end $$;
-- Explicit state readback: absence from the normal library is NOT proof of deletion.
create function public.cdl_v14_archive_state(p_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id',i.id,'library_id',i.library_id,'revision',i.revision,'archived',i.deleted_at is not null)
  from cdl.items i join cdl.libraries l on l.id=i.library_id where i.id=p_id and l.owner_id=auth.uid();
$$;
revoke all on function public.cdl_v14_set_archived(uuid,bigint,uuid,boolean) from public,anon;
revoke all on function public.cdl_v14_archive_state(uuid) from public,anon;
grant execute on function public.cdl_v14_set_archived(uuid,bigint,uuid,boolean) to authenticated;
grant execute on function public.cdl_v14_archive_state(uuid) to authenticated;
commit;
