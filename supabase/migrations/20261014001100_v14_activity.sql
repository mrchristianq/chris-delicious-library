begin;

-- Read only activity projection. Import provenance remains private; only rows
-- from the explicitly named legacy Changelog tab are selected here.
create function public.cdl_v14_activity(p_library_id uuid, p_changelog_limit integer default 300, p_event_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_changelog_limit is null or p_changelog_limit < 0 or p_changelog_limit > 300 or
     p_event_limit is null or p_event_limit < 0 or p_event_limit > 100 then
    raise exception 'Invalid activity limit';
  end if;

  if not exists(select 1 from cdl.libraries l where l.id=p_library_id and l.owner_id=auth.uid()) then
    return jsonb_build_object('changelog','[]'::jsonb,'events','[]'::jsonb);
  end if;

  select jsonb_build_object(
    'changelog', coalesce((
      select jsonb_agg(jsonb_build_object(
        'source_row', page.source_row,
        'headers', page.headers,
        'cells', coalesce(page.effective_cells,page.raw_cells)
      ) order by page.source_row desc)
      from (
        select r.source_row,r.headers,r.raw_cells,r.effective_cells
        from cdl.import_rows r
        where r.library_id=p_library_id and r.tab='Changelog'
          and r.batch_id=(
            select b.id
            from cdl.import_batches b
            where b.library_id=p_library_id and b.status in ('review','verified','imported')
              and exists(select 1 from cdl.import_rows eligible where eligible.library_id=b.library_id
                and eligible.batch_id=b.id and eligible.tab='Changelog')
            order by b.captured_at desc,b.id desc
            limit 1
          )
        order by r.source_row desc
        limit p_changelog_limit
      ) page
    ),'[]'::jsonb),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', page.id,
        'created_at', page.created_at,
        'entity_kind', page.entity_kind,
        'entity_id', page.entity_id,
        'source_row', page.source_row,
        'changes', page.safe_changes
      ) order by page.created_at desc,page.id desc)
      from (
        select e.id,e.created_at,e.entity_kind,e.entity_id,
          (select r.source_row from cdl.items i join cdl.import_rows r
            on r.library_id=i.library_id and r.id=i.import_row_id
            where i.library_id=e.library_id and i.id=e.entity_id and r.tab in ('Books','Movies','Shows','Games')
            limit 1) as source_row,
          case e.entity_kind
            when 'item' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after')
            when 'full_edit' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after')
            when 'create' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after')
            when 'archive' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after','archived',e.changes->'archived')
            when 'setting' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after','input',e.changes->'input')
            when 'episode_progress' then jsonb_build_object('before',e.changes->'before','after',e.changes->'after','input',e.changes->'input')
            when 'episode_metadata' then jsonb_build_object('before',e.changes->'before','input',e.changes->'input')
          end as safe_changes
        from cdl.change_events e
        where e.library_id=p_library_id
          and e.entity_kind in ('item','full_edit','create','archive','setting','episode_progress','episode_metadata')
        order by e.created_at desc,e.id desc
        limit p_event_limit
      ) page
    ),'[]'::jsonb)
  ) into result;
  return result;
end $$;

revoke all on function public.cdl_v14_activity(uuid,integer,integer) from public,anon;
grant execute on function public.cdl_v14_activity(uuid,integer,integer) to authenticated;
commit;
