begin;
-- Small version manifest: row identities plus MVCC versions detect updates,
-- inserts, deletes, and change-then-restore without serializing full metadata.
create function public.cdl_v14_snapshot_manifest(p_library_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  with owned as materialized (
    select id,owner_id from cdl.libraries where id=p_library_id and owner_id=(select auth.uid())
  ), live as materialized (
    select i.id,i.media_type from cdl.items i join owned o on i.library_id=o.id where i.deleted_at is null
  ), versions as (
    select 'library:'||l.id as key,l.xmin::text||':'||l.ctid::text as version from cdl.libraries l join owned o on l.id=o.id
    union all select 'item:'||i.id,i.xmin::text||':'||i.ctid::text from cdl.items i join owned o on i.library_id=o.id
    union all select 'metadata:'||m.item_id,m.xmin::text||':'||m.ctid::text from cdl.item_metadata m join owned o on m.library_id=o.id
    union all select 'episode:'||e.id,e.xmin::text||':'||e.ctid::text from cdl.episodes e join owned o on e.library_id=o.id
    union all select 'progress:'||p.episode_id,p.xmin::text||':'||p.ctid::text from cdl.episode_progress p join owned o on p.library_id=o.id
    union all select 'setting:'||s.key,s.xmin::text||':'||s.ctid::text from cdl.settings s join owned o on s.library_id=o.id
    union all select 'identifier:'||d.id,d.xmin::text||':'||d.ctid::text from cdl.identifiers d join owned o on d.library_id=o.id
    union all select 'collection:'||c.id,c.xmin::text||':'||c.ctid::text from cdl.collections c join owned o on c.library_id=o.id
    union all select 'member:'||ci.collection_id||':'||ci.item_id,ci.xmin::text||':'||ci.ctid::text from cdl.collection_items ci join owned o on ci.library_id=o.id
  ) select jsonb_build_object('library_id',o.id,'owner_id',o.owner_id,'observed_at',statement_timestamp(),
    'change_token',md5((select string_agg(key||':'||version,',' order by key) from versions)),
    'counts',jsonb_build_object(
      'items',(select count(*) from live),
      'episodes',(select count(*) from cdl.episodes e join live i on i.id=e.show_id and i.media_type='tv' where e.library_id=o.id),
      'settings',(select count(*) from cdl.settings s where s.library_id=o.id),
      'identifiers',(select count(*) from cdl.identifiers d join live i on i.id=d.item_id where d.library_id=o.id),
      'collections',(select count(*) from cdl.collections c where c.library_id=o.id),
      'collection_items',(select count(*) from cdl.collection_items ci join live i on i.id=ci.item_id where ci.library_id=o.id)
    )) from owned o;
$$;

create function public.cdl_v14_snapshot_page(p_library_id uuid,p_section text,p_offset integer,p_limit integer)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner uuid; rows jsonb;
begin
  select l.owner_id into owner from cdl.libraries l where l.id=p_library_id and l.owner_id=(select auth.uid());
  if owner is null then raise exception 'Library unavailable' using errcode='42501'; end if;
  if p_offset is null or p_offset<0 or p_offset>1000000 or p_limit is null or p_limit<1 or p_limit>200 then raise exception 'Invalid page'; end if;
  case p_section
  when 'items' then
    select coalesce(jsonb_agg((to_jsonb(i)-'import_row_id')||jsonb_build_object('metadata',coalesce(m.fields,'{}'::jsonb)-'_import'-'providerEvidence') order by i.id),'[]'::jsonb) into rows
    from (select * from cdl.items where library_id=p_library_id and deleted_at is null order by id limit p_limit offset p_offset) i
    left join cdl.item_metadata m on m.item_id=i.id and m.library_id=p_library_id;
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
revoke all on function public.cdl_v14_snapshot_manifest(uuid),public.cdl_v14_snapshot_page(uuid,text,integer,integer) from public,anon;
grant execute on function public.cdl_v14_snapshot_manifest(uuid),public.cdl_v14_snapshot_page(uuid,text,integer,integer) to authenticated;
notify pgrst, 'reload schema';
commit;
