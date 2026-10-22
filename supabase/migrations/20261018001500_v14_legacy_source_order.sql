begin;
-- The original renderer's stable sorts retain Sheet row order for equal keys.
-- Preserve that order at the read boundary, not by changing any UI comparator
-- or manually saved ordering. Pagination and aggregation use the same ordering.
create or replace function public.cdl_v14_snapshot_page(p_library_id uuid,p_section text,p_offset integer,p_limit integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner uuid; rows jsonb;
begin
  select l.owner_id into owner from cdl.libraries l where l.id=p_library_id and l.owner_id=(select auth.uid());
  if owner is null then raise exception 'Library unavailable' using errcode='42501'; end if;
  if p_offset is null or p_offset<0 or p_offset>1000000 or p_limit is null or p_limit<1 or p_limit>200 then raise exception 'Invalid page'; end if;
  case p_section
  when 'items' then
    select coalesce(jsonb_agg((to_jsonb(i)-'import_row_id'-'legacy_source_position')||jsonb_build_object('metadata',coalesce(m.fields,'{}'::jsonb)-'_import'-'providerEvidence') order by i.legacy_source_position nulls last,i.id),'[]'::jsonb) into rows
    from (
      select i.*,r.source_row as legacy_source_position from cdl.items i
      left join cdl.import_rows r on r.id=i.import_row_id and r.library_id=i.library_id
      where i.library_id=p_library_id and i.deleted_at is null
      order by r.source_row nulls last,i.id limit p_limit offset p_offset
    ) i left join cdl.item_metadata m on m.item_id=i.id and m.library_id=p_library_id;
  when 'episodes' then
    select coalesce(jsonb_agg((to_jsonb(e)-'metadata')||jsonb_build_object('metadata',e.metadata-'_import'-'providerEvidence','progress',case when p.episode_id is null then null else jsonb_build_object('watched',p.watched,'watched_at',p.watched_at,'revision',p.revision) end) order by e.id),'[]'::jsonb) into rows
    from (select e.* from cdl.episodes e join cdl.items i on i.id=e.show_id and i.library_id=p_library_id and i.media_type='tv' and i.deleted_at is null where e.library_id=p_library_id order by e.id limit p_limit offset p_offset) e
    left join cdl.episode_progress p on p.episode_id=e.id and p.library_id=p_library_id;
  when 'settings' then
    select coalesce(jsonb_agg(jsonb_build_object('key',s.key,'revision',s.revision,'value',s.value-'source_rows') order by s.key),'[]'::jsonb) into rows
    from (select * from cdl.settings where library_id=p_library_id order by key limit p_limit offset p_offset) s;
  when 'identifiers' then
    select coalesce(jsonb_agg(jsonb_build_object('item_id',d.item_id,'provider',d.provider,'value',d.value) order by d.item_id,d.provider,d.value),'[]'::jsonb) into rows
    from (select d.* from cdl.identifiers d join cdl.items i on i.id=d.item_id and i.library_id=p_library_id and i.deleted_at is null where d.library_id=p_library_id order by d.item_id,d.provider,d.value,d.id limit p_limit offset p_offset) d;
  when 'collections' then
    select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'key',c.key,'definition',c.definition) order by c.key),'[]'::jsonb) into rows
    from (select * from cdl.collections where library_id=p_library_id order by key limit p_limit offset p_offset) c;
  when 'collection_items' then
    select coalesce(jsonb_agg(jsonb_build_object('collection_id',ci.collection_id,'item_id',ci.item_id,'position',ci.position) order by ci.collection_id,ci.position),'[]'::jsonb) into rows
    from (select ci.* from cdl.collection_items ci join cdl.items i on i.id=ci.item_id and i.library_id=p_library_id and i.deleted_at is null where ci.library_id=p_library_id order by ci.collection_id,ci.position limit p_limit offset p_offset) ci;
  else raise exception 'Invalid section';
  end case;
  return jsonb_build_object('library_id',p_library_id,'owner_id',owner,'section',p_section,'offset',p_offset,'rows',rows);
end;
$$;
revoke all on function public.cdl_v14_snapshot_page(uuid,text,integer,integer) from public,anon;
grant execute on function public.cdl_v14_snapshot_page(uuid,text,integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
