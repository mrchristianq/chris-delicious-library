begin;
-- Read-only, owner-scoped confirmed baselines. No grant on cdl tables and no
-- write/target activation capability. Original tracker is never accepted.
create function public.cdl_v14_tracker_baselines(p_library_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_owner uuid; v_target cdl.sync_targets%rowtype; v_records jsonb; v_last timestamptz;
begin
  select owner_id into v_owner from cdl.libraries where id=p_library_id and owner_id=(select auth.uid());
  if v_owner is null then raise exception 'Library unavailable'; end if;
  select * into v_target from cdl.sync_targets where library_id=p_library_id
    and sheet_id='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
  if not found then return jsonb_build_object('exists',false,'ownerId',v_owner,'libraryId',p_library_id,'sheetId','1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0'); end if;
  if v_target.enabled or (select count(*) from cdl.sync_baselines where target_id=v_target.id and library_id=p_library_id)>5000 then raise exception 'Baseline requires review';end if;
  -- Fail closed before exposing any unexpected private field.
  if exists(select 1 from cdl.sync_baselines b cross join lateral jsonb_object_keys(b.confirmed_fields) k(name)
    where b.target_id=v_target.id and b.library_id=p_library_id
    and (k.name ~* 'notes|progress|watched_at' or (k.name ~* 'episode' and lower(k.name)<>'numberofepisodes'))) then raise exception 'Excluded baseline field';end if;
  select max(finished_at) into v_last from cdl.sync_runs where library_id=p_library_id and target_id=v_target.id and status='completed';
  if v_last is null then raise exception 'No confirmed sync run';end if;
  select coalesce(jsonb_agg(jsonb_build_object('itemId',b.item_id,'media',i.media_type,'fields',b.confirmed_fields,'confirmedAt',b.confirmed_at) order by b.item_id),'[]'::jsonb)
    into v_records from cdl.sync_baselines b join cdl.items i on i.library_id=b.library_id and i.id=b.item_id
    where b.library_id=p_library_id and b.target_id=v_target.id;
  if octet_length(v_records::text)>8388608 then raise exception 'Baseline exceeds read bound';end if;
  return jsonb_build_object('exists',true,'ownerId',v_owner,'libraryId',p_library_id,'sheetId',v_target.sheet_id,'targetId',v_target.id,'enabled',v_target.enabled,'columns',v_target.approved_columns,'records',v_records,'lastConfirmedSync',v_last);
end $$;
revoke all on function public.cdl_v14_tracker_baselines(uuid) from public,anon;
grant execute on function public.cdl_v14_tracker_baselines(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
