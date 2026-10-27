begin;
-- Browsing never needs private sync-run journals. Leave the full snapshot,
-- tracker and recovery RPCs unchanged so resumable sync and backups retain them.
create function public.cdl_v14_renderer_guard(p_library_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 result:=public.cdl_v14_snapshot_guard(p_library_id);
 if result is null or result->>'owner_id' is distinct from (select auth.uid())::text then
  raise exception 'Library unavailable' using errcode='42501';
 end if;
 return jsonb_set(result,'{counts}',(result->'counts')||jsonb_build_object(
  'settings',(select count(*) from cdl.settings where library_id=p_library_id and left(key,14)<>'__cdl_tracker_'),
  'identifiers',0,'collections',0,'collection_items',0));
end;
$$;
create function public.cdl_v14_renderer_page(p_library_id uuid,p_section text,p_offset integer,p_limit integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner uuid; result jsonb;
begin
 select owner_id into owner from cdl.libraries where id=p_library_id and owner_id=(select auth.uid());
 if owner is null then raise exception 'Library unavailable' using errcode='42501'; end if;
 if p_section in ('items','episodes') then return public.cdl_v14_snapshot_page(p_library_id,p_section,p_offset,p_limit); end if;
 if p_section is null or p_section<>'settings' or p_offset is null or p_offset<0 or p_offset>1000000 or p_limit is null or p_limit<1 or p_limit>200 then
  raise exception 'Invalid renderer page';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('key',s.key,'revision',s.revision,'value',s.value-'source_rows') order by s.key),'[]'::jsonb) into result
 from (select key,revision,value from cdl.settings where library_id=p_library_id and left(key,14)<>'__cdl_tracker_' order by key limit p_limit offset p_offset) s;
 return jsonb_build_object('library_id',p_library_id,'owner_id',owner,'section',p_section,'offset',p_offset,'rows',result);
end;
$$;
-- Independent post-write SELECT, scoped to the exact owner and changed records.
create function public.cdl_v14_save_readback(p_library_id uuid,p_setting_keys text[],p_episode_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner uuid; settings jsonb; episodes jsonb;
begin
 select owner_id into owner from cdl.libraries where id=p_library_id and owner_id=(select auth.uid());
 if owner is null then raise exception 'Library unavailable' using errcode='42501'; end if;
 if p_setting_keys is null or p_episode_ids is null or cardinality(p_setting_keys)>1000 or cardinality(p_episode_ids)>1000
 or cardinality(p_setting_keys)+cardinality(p_episode_ids)=0 or exists(select 1 from unnest(p_setting_keys) k where k is null or length(k)>500 or left(k,14)='__cdl_tracker_') then
  raise exception 'Invalid readback targets';
 end if;
 select coalesce(jsonb_agg(jsonb_build_object('key',key,'revision',revision,'value',value-'source_rows') order by key),'[]'::jsonb) into settings
 from cdl.settings where library_id=p_library_id and key=any(p_setting_keys);
 select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'show_id',e.show_id,'progress',
  case when p.episode_id is null then null else jsonb_build_object('watched',p.watched,'watched_at',p.watched_at,'revision',p.revision) end) order by e.id),'[]'::jsonb) into episodes
 from cdl.episodes e join cdl.items i on i.id=e.show_id and i.library_id=p_library_id and i.deleted_at is null
 left join cdl.episode_progress p on p.episode_id=e.id and p.library_id=p_library_id
 where e.library_id=p_library_id and e.id=any(p_episode_ids);
 return jsonb_build_object('library_id',p_library_id,'owner_id',owner,'observed_at',statement_timestamp(),'settings',settings,'episodes',episodes);
end;
$$;
revoke all on function public.cdl_v14_renderer_guard(uuid),public.cdl_v14_renderer_page(uuid,text,integer,integer),public.cdl_v14_save_readback(uuid,text[],uuid[]) from public,anon;
grant execute on function public.cdl_v14_renderer_guard(uuid),public.cdl_v14_renderer_page(uuid,text,integer,integer),public.cdl_v14_save_readback(uuid,text[],uuid[]) to authenticated;
notify pgrst,'reload schema';
commit;
