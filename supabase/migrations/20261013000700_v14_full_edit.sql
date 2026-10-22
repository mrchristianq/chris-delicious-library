begin;
create function public.cdl_v14_full_edit(p_id uuid,p_revision bigint,p_request_id uuid,p_patch jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare oldrow cdl.items; newrow cdl.items; prior cdl.change_events; options text[]; allowed jsonb;
begin
  if auth.uid() is null or p_request_id is null then raise exception 'Authentication and request ID required'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' or p_patch='{}'::jsonb or octet_length(p_patch::text)>500000 then raise exception 'Invalid edit patch'; end if;
  if exists(select 1 from jsonb_object_keys(p_patch) k where k not in ('title','user_status','personal_rating','completed_on','notes','overrides')) then raise exception 'Unsupported field'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_request_id::text,0));
  select i.* into oldrow from cdl.items i join cdl.libraries l on l.id=i.library_id where i.id=p_id and l.owner_id=auth.uid() and i.deleted_at is null for update of i;
  if not found then raise exception 'Item not available'; end if;
  select * into prior from cdl.change_events where library_id=oldrow.library_id and request_id=p_request_id;
  if found then
    if prior.entity_id<>p_id or prior.entity_kind<>'full_edit' or prior.changes->'patch' is distinct from p_patch or prior.changes->>'expected_revision' is distinct from p_revision::text then raise exception 'Request ID reused for a different save'; end if;
    return (prior.changes->'after')-'import_row_id';
  end if;
  if oldrow.revision is distinct from p_revision then raise exception 'Item changed elsewhere. Reload before saving.'; end if;
  options:=case oldrow.media_type
    when 'book' then array['Reading','Completed','Backlog','Abandoned','Paused','Collection','Wishlist']
    when 'movie' then array['Watched','Started','Backlog','Pending Digital Release','Abandoned']
    when 'tv' then array['Completed','Abandoned','Started','Backlog','Watch Next','Paused','Pending Return','Pending Release']
    else array['Now Playing','Queued','Collection','Completed','Abandoned','Wishlist','Replay','Backlog'] end;
  if p_patch ? 'title' and (jsonb_typeof(p_patch->'title')<>'string' or length(trim(p_patch->>'title'))=0 or length(p_patch->>'title')>2000) then raise exception 'Invalid title'; end if;
  if p_patch ? 'user_status' and (jsonb_typeof(p_patch->'user_status')<>'string' or not (p_patch->>'user_status'=any(options))) then raise exception 'Invalid status'; end if;
  if p_patch ? 'personal_rating' and jsonb_typeof(p_patch->'personal_rating') not in ('number','null') then raise exception 'Invalid rating'; end if;
  if p_patch ? 'notes' and (jsonb_typeof(p_patch->'notes')<>'string' or length(p_patch->>'notes')>100000) then raise exception 'Invalid notes'; end if;
  if p_patch ? 'completed_on' and jsonb_typeof(p_patch->'completed_on')<>'null' and (jsonb_typeof(p_patch->'completed_on')<>'string' or (p_patch->>'completed_on')!~'^\d{4}-\d{2}-\d{2}$') then raise exception 'Invalid date'; end if;
  -- EDIT_OVERRIDE_ALLOWLIST is generated from the reviewed form contract and
  -- checked for drift by tests. Clients cannot add arbitrary stored fields.
  allowed := '{"book":["Audible Asin","AudibleASIN","Audible_ASIN","AudiobookDuration","Audnexus Asin","AudnexusASIN","Audnexus_ASIN","Author","Categories","Category","Custom Image URL","Custom URL","CustomImageURL","CustomImageUrl","CustomURL","Description","Genre","GoogleBooksVolumeId","ISBN","Image","Image URL","ImageURL","Narrator","OpenLibraryWorkKey","Ownership","Pages","Published","Publisher","R2BackdropUrl","R2BackdropUrl_Date","R2CoverUrl","R2CoverUrl_Date","Release Date","ReleaseDate","Series","Subtitle","Tag","Tags","Type","Types","UserRating","audiobookDuration","categories","description","genre","isbn","pages","r2BackdropUrl","r2CoverUrl","tags","userRating"],"movie":["BackdropURL","CustomImageURL","CustomURL","Genre","Genres","Overview","Ownership","Poster","PosterURL","R2BackdropUrl","R2BackdropUrl_Date","R2CoverUrl","R2CoverUrl_Date","Release Date","ReleaseDate","Runtime","Status","TMDB_ID","TMDB_Rating","Tag","Tags","Year","r2BackdropUrl","r2CoverUrl"],"tv":["BackdropURL","CustomImageURL","CustomURL","First Air Date","FirstAirDate","Genres","Last Air Date","LastAirDate","Networks","NumberOfEpisodes","NumberOfSeasons","Overview","Ownership","Poster","PosterURL","R2BackdropUrl","R2BackdropUrl_Date","R2CoverUrl","R2CoverUrl_Date","Status","StreamingUS","TMDB_ID","TMDB_Rating","Tag","Tags","Year","r2BackdropUrl","r2CoverUrl"],"game":["Backlog","Completed","CoverURL","CustomImageURL","CustomURL","Date Added","Description","Developer","Format","Genres","Hours Played","IGDB Rating","IGDB_ID","IGDB_ID_Override","LocalCoverURL","Ownership","Platform","Platforms","QueuedOrder","R2BackdropUrl","R2BackdropUrl_Date","R2CoverUrl","R2CoverUrl_Date","Rating","ReleaseDate","ScreenshotsURL","Tag","Tags","Time To Beat","TimeToBeat","WishlistOrder","Year Played","Year played","YearPlayed","Yearplayed","r2BackdropUrl","r2CoverUrl"]}'::jsonb;
  if p_patch ? 'overrides' then
    if jsonb_typeof(p_patch->'overrides')<>'object' then raise exception 'Invalid overrides'; end if;
    if exists(select 1 from jsonb_each(p_patch->'overrides') e where not ((allowed->oldrow.media_type) ? e.key) or jsonb_typeof(e.value)<>'string') then raise exception 'Unsupported override'; end if;
    if oldrow.media_type='book' and exists(select 1 from jsonb_each_text(p_patch->'overrides') e where e.key in ('Type','Types') and e.value not in ('Physical','Audiobook','eBook')) then raise exception 'Invalid book type'; end if;
  end if;
  update cdl.items set title=case when p_patch ? 'title' then p_patch->>'title' else title end,
    user_status=case when p_patch ? 'user_status' then p_patch->>'user_status' else user_status end,
    personal_rating=case when p_patch ? 'personal_rating' then (p_patch->>'personal_rating')::numeric else personal_rating end,
    completed_on=case when p_patch ? 'completed_on' then (p_patch->>'completed_on')::date else completed_on end,
    notes=case when p_patch ? 'notes' then p_patch->>'notes' else notes end,
    user_fields=user_fields || coalesce(p_patch->'overrides','{}'::jsonb),revision=revision+1,updated_at=now()
    where id=p_id returning * into newrow;
  insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes)
    values(newrow.library_id,p_request_id,'full_edit',newrow.id,jsonb_build_object('before',to_jsonb(oldrow),'after',to_jsonb(newrow),'patch',p_patch,'expected_revision',p_revision));
  insert into cdl.sync_outbox(library_id,item_id,item_revision) values(newrow.library_id,newrow.id,newrow.revision);
  return to_jsonb(newrow)-'import_row_id';
end $$;
revoke all on function public.cdl_v14_full_edit(uuid,bigint,uuid,jsonb) from public,anon;
grant execute on function public.cdl_v14_full_edit(uuid,bigint,uuid,jsonb) to authenticated;
commit;
