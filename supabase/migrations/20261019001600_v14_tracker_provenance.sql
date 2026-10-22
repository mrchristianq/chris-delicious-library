begin;
-- Identity-only historical import provenance. No old field values, Notes,
-- episode progress, row-position identity or mutation capability is exposed.
create function public.cdl_v14_tracker_provenance(p_library_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare owner uuid; entries jsonb;
begin
  select owner_id into owner from cdl.libraries where id=p_library_id and owner_id=(select auth.uid());
  if owner is null then raise exception 'Library unavailable'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'itemId',i.id,'sourceId',r.id,'primary',r.id=i.import_row_id,'media',i.media_type,
    'title',coalesce(cells->>'Title',''),
    'edition',case i.media_type when 'game' then coalesce(cells->>'Platform','') when 'book' then coalesce(cells->>'Type','') else '' end,
    'provider',case i.media_type when 'game' then coalesce(cells->>'IGDB_ID','') when 'book' then coalesce(cells->>'isbn','') else coalesce(cells->>'TMDB_ID','') end
  ) order by i.id,r.id),'[]'::jsonb) into entries
  from cdl.items i
  join cdl.item_metadata m on m.item_id=i.id and m.library_id=p_library_id
  cross join lateral jsonb_array_elements_text(coalesce(m.fields->'_import'->'source_rows','[]'::jsonb)) source(id)
  join cdl.import_rows r on r.id::text=source.id and r.library_id=p_library_id
  join cdl.import_batches b on b.id=r.batch_id and b.library_id=p_library_id and b.status='imported'
  cross join lateral (
    select jsonb_object_agg(h.name,coalesce(r.effective_cells->(h.n::integer-1),'null'::jsonb)) as cells
    from jsonb_array_elements_text(r.headers) with ordinality h(name,n)
    where h.name in ('Title','Platform','Type','IGDB_ID','TMDB_ID','isbn')
  ) identity_cells
  where i.library_id=p_library_id and i.deleted_at is null;
  return jsonb_build_object('libraryId',p_library_id,'ownerId',owner,'entries',entries);
end $$;
revoke all on function public.cdl_v14_tracker_provenance(uuid) from public,anon;
grant execute on function public.cdl_v14_tracker_provenance(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
