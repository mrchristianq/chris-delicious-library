begin;
-- One STABLE SQL statement: all aggregates observe the same MVCC snapshot.
-- No table grants, raw import rows, service key, or per-screen pagination.
create function public.cdl_v14_snapshot(p_library_id uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with owned as materialized (
    select id, owner_id from cdl.libraries
    where id=p_library_id and owner_id=(select auth.uid())
  ), live_items as materialized (
    select i.* from cdl.items i join owned o on o.id=i.library_id where i.deleted_at is null
  ), live_episodes as materialized (
    select e.* from cdl.episodes e join live_items i on i.id=e.show_id and i.media_type='tv'
    where e.library_id=p_library_id
  ), payload as (
    select jsonb_build_object(
      'schema_version',1,'library_id',o.id,'owner_id',o.owner_id,'complete',true,
      'items',coalesce((select jsonb_agg(
        (to_jsonb(i)-'import_row_id') || jsonb_build_object('metadata',coalesce(m.fields,'{}'::jsonb)-'_import'-'providerEvidence')
        order by i.id) from live_items i left join cdl.item_metadata m on m.item_id=i.id and m.library_id=o.id),'[]'::jsonb),
      'episodes',coalesce((select jsonb_agg(
        (to_jsonb(e)-'metadata') || jsonb_build_object(
          'metadata',e.metadata-'_import'-'providerEvidence',
          'progress',case when p.episode_id is null then null else jsonb_build_object('watched',p.watched,'watched_at',p.watched_at,'revision',p.revision) end)
        order by e.id) from live_episodes e left join cdl.episode_progress p on p.episode_id=e.id and p.library_id=o.id),'[]'::jsonb),
      'settings',coalesce((select jsonb_agg(jsonb_build_object('key',s.key,'revision',s.revision,'value',s.value-'source_rows') order by s.key)
        from cdl.settings s where s.library_id=o.id),'[]'::jsonb),
      'identifiers',coalesce((select jsonb_agg(jsonb_build_object('item_id',d.item_id,'provider',d.provider,'value',d.value) order by d.item_id,d.provider,d.value)
        from cdl.identifiers d join live_items i on i.id=d.item_id where d.library_id=o.id),'[]'::jsonb),
      'collections',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'key',c.key,'definition',c.definition,'items',
        coalesce((select jsonb_agg(jsonb_build_object('item_id',ci.item_id,'position',ci.position) order by ci.position)
          from cdl.collection_items ci join live_items i on i.id=ci.item_id where ci.collection_id=c.id and ci.library_id=o.id),'[]'::jsonb)) order by c.key)
        from cdl.collections c where c.library_id=o.id),'[]'::jsonb),
      'counts',jsonb_build_object('items',(select count(*) from live_items),'episodes',(select count(*) from live_episodes),
        'settings',(select count(*) from cdl.settings s where s.library_id=o.id))
    ) as body from owned o
  ) select body || jsonb_build_object('observed_at',statement_timestamp(),
      'change_token',md5(body::text)) from payload;
$$;
revoke all on function public.cdl_v14_snapshot(uuid) from public,anon;
grant execute on function public.cdl_v14_snapshot(uuid) to authenticated;
comment on function public.cdl_v14_snapshot(uuid) is 'Owner-only coherent item/episode/settings/collection snapshot. Content token is not an authorization credential. Historical activity is a separate pending adapter.';
commit;
