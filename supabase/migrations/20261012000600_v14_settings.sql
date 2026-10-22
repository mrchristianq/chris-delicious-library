begin;
create function public.cdl_v14_save_setting(p_library_id uuid,p_key text,p_revision bigint,p_request_id uuid,p_value jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare oldrow cdl.settings; newrow cdl.settings; prior cdl.change_events; input jsonb;
begin
  if auth.uid() is null or p_request_id is null or not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library not available'; end if;
  -- Wrapped value distinguishes an intentional JSON null from an absent SQL
  -- parameter when called through PostgREST.
  if p_key is null or length(trim(p_key))=0 or length(p_key)>500 or p_value is null or jsonb_typeof(p_value)<>'object' or not (p_value ? 'value') or
     exists(select 1 from jsonb_object_keys(p_value) k where k<>'value') or
     jsonb_typeof(p_value->'value') not in ('string','number','boolean','null') or octet_length(p_value::text)>100000 then raise exception 'Invalid setting'; end if;
  if p_revision is not null and p_revision<1 then raise exception 'Invalid setting revision'; end if;
  input:=jsonb_build_object('key',p_key,'revision',p_revision,'value',p_value->'value');
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
  select * into prior from cdl.change_events where library_id=p_library_id and request_id=p_request_id;
  if found then
    if prior.entity_kind<>'setting' or prior.changes->'input' is distinct from input then raise exception 'Request ID reused for a different save'; end if;
    return prior.changes->'after';
  end if;
  -- Serialize creation as well as edits without granting access to the table.
  perform pg_advisory_xact_lock(hashtextextended(p_library_id::text||':setting:'||p_key,0));
  select * into oldrow from cdl.settings where library_id=p_library_id and key=p_key for update;
  if (case when found then oldrow.revision else null end) is distinct from p_revision then raise exception 'Setting changed elsewhere. Reload before saving.'; end if;
  insert into cdl.settings(library_id,key,value,revision) values(p_library_id,p_key,p_value,1)
    on conflict(library_id,key) do update set value=excluded.value,revision=cdl.settings.revision+1 returning * into newrow;
  insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes)
    values(p_library_id,p_request_id,'setting',p_library_id,jsonb_build_object('input',input,'before',case when oldrow.key is null then null else to_jsonb(oldrow) end,'after',to_jsonb(newrow)));
  return to_jsonb(newrow);
end $$;
revoke all on function public.cdl_v14_save_setting(uuid,text,bigint,uuid,jsonb) from public,anon;
grant execute on function public.cdl_v14_save_setting(uuid,text,bigint,uuid,jsonb) to authenticated;
commit;
