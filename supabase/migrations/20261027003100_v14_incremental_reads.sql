begin;
-- Imported source positions affect stable display ordering. Include them in
-- the renderer revision without changing the full sync/backup token contract.
create function public.cdl_v14_renderer_state(p_library_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb; revision text;
begin
 result:=public.cdl_v14_renderer_guard(p_library_id);
 select md5((result->>'change_token')||coalesce(string_agg(i.id::text||':'||coalesce(r.source_row::text,''),',' order by i.id),'')) into revision
 from cdl.items i left join cdl.import_rows r on r.id=i.import_row_id and r.library_id=p_library_id
 where i.library_id=p_library_id and i.deleted_at is null;
 return jsonb_set(result,'{change_token}',to_jsonb(revision));
end;
$$;
-- A small, authoritative inventory detects inserts, updates and deletions without
-- retaining a change journal. MVCC fingerprints include metadata and progress,
-- even when a maintenance edit does not increment the application revision.
create function public.cdl_v14_renderer_index(p_library_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner uuid; result jsonb;
begin
 select owner_id into owner from cdl.libraries where id=p_library_id and owner_id=(select auth.uid());
 if owner is null then raise exception 'Library unavailable' using errcode='42501'; end if;
 result:=public.cdl_v14_renderer_state(p_library_id);
 return result||jsonb_build_object('index_version',1,'records',jsonb_build_object(
 'items',(select coalesce(jsonb_agg(jsonb_build_array(i.id,md5(i.xmin::text||i.ctid::text||coalesce(m.xmin::text||m.ctid::text,'')||coalesce(r.source_row::text,''))) order by r.source_row nulls last,i.id),'[]'::jsonb)
   from cdl.items i left join cdl.item_metadata m on m.item_id=i.id and m.library_id=p_library_id
   left join cdl.import_rows r on r.id=i.import_row_id and r.library_id=p_library_id
   where i.library_id=p_library_id and i.deleted_at is null),
 'episodes',(select coalesce(jsonb_agg(jsonb_build_array(e.id,md5(e.xmin::text||e.ctid::text||coalesce(p.xmin::text||p.ctid::text,''))) order by e.id),'[]'::jsonb)
   from cdl.episodes e join cdl.items i on i.id=e.show_id and i.library_id=p_library_id and i.media_type='tv' and i.deleted_at is null
   left join cdl.episode_progress p on p.episode_id=e.id and p.library_id=p_library_id where e.library_id=p_library_id),
 'settings',(select coalesce(jsonb_agg(jsonb_build_array(s.key,md5(s.xmin::text||s.ctid::text)) order by s.key),'[]'::jsonb)
   from cdl.settings s where s.library_id=p_library_id and left(s.key,14)<>'__cdl_tracker_')));
end;
$$;
create function public.cdl_v14_renderer_records(p_library_id uuid,p_section text,p_keys text[])
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner uuid; rows jsonb;
begin
 select owner_id into owner from cdl.libraries where id=p_library_id and owner_id=(select auth.uid());
 if owner is null then raise exception 'Library unavailable' using errcode='42501'; end if;
 if p_keys is null or cardinality(p_keys)<1 or cardinality(p_keys)>200 or exists(select 1 from unnest(p_keys) k where k is null or length(k)>500) then raise exception 'Invalid record targets'; end if;
 case p_section
 when 'items' then
  select coalesce(jsonb_agg((to_jsonb(i)-'import_row_id')||jsonb_build_object('metadata',coalesce(m.fields,'{}'::jsonb)-'_import'-'providerEvidence') order by i.id),'[]'::jsonb) into rows
  from cdl.items i left join cdl.item_metadata m on m.item_id=i.id and m.library_id=p_library_id
  where i.library_id=p_library_id and i.deleted_at is null and i.id=any(p_keys::uuid[]);
 when 'episodes' then
  select coalesce(jsonb_agg((to_jsonb(e)-'metadata')||jsonb_build_object('metadata',e.metadata-'_import'-'providerEvidence','progress',case when p.episode_id is null then null else jsonb_build_object('watched',p.watched,'watched_at',p.watched_at,'revision',p.revision) end) order by e.id),'[]'::jsonb) into rows
  from cdl.episodes e join cdl.items i on i.id=e.show_id and i.library_id=p_library_id and i.media_type='tv' and i.deleted_at is null
  left join cdl.episode_progress p on p.episode_id=e.id and p.library_id=p_library_id
  where e.library_id=p_library_id and e.id=any(p_keys::uuid[]);
 when 'settings' then
  select coalesce(jsonb_agg(jsonb_build_object('key',s.key,'revision',s.revision,'value',s.value-'source_rows') order by s.key),'[]'::jsonb) into rows
  from cdl.settings s where s.library_id=p_library_id and left(s.key,14)<>'__cdl_tracker_' and s.key=any(p_keys);
 else raise exception 'Invalid record section';
 end case;
 return jsonb_build_object('library_id',p_library_id,'owner_id',owner,'section',p_section,'rows',rows);
end;
$$;
revoke all on function public.cdl_v14_renderer_state(uuid),public.cdl_v14_renderer_index(uuid),public.cdl_v14_renderer_records(uuid,text,text[]) from public,anon;
grant execute on function public.cdl_v14_renderer_state(uuid),public.cdl_v14_renderer_index(uuid),public.cdl_v14_renderer_records(uuid,text,text[]) to authenticated;
notify pgrst,'reload schema';
commit;
