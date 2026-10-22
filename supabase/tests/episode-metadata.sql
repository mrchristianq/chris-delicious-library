begin;
insert into auth.users(id) values
 ('00000000-0000-4000-a000-000000000014'),
 ('00000000-0000-4000-a000-000000000015');
insert into cdl.libraries(id,owner_id,name) values
 ('00000000-0000-4000-b000-000000000014','00000000-0000-4000-a000-000000000014','Episode metadata fixture');
insert into cdl.items(id,library_id,media_type,title) values
 ('00000000-0000-4000-c000-000000000014','00000000-0000-4000-b000-000000000014','tv','Metadata show');
insert into cdl.episodes(id,library_id,show_id,season_number,episode_number,provider_id,metadata) values
 ('00000000-0000-4000-e000-000000000014','00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,1,'old-provider','{"EpisodeTitle":"Old title","LegacyBlank":"","Unknown":"retain"}');
insert into cdl.episode_progress(library_id,episode_id,watched,watched_at,revision) values
 ('00000000-0000-4000-b000-000000000014','00000000-0000-4000-e000-000000000014',true,'2026-10-01T12:00:00Z',4);

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
do $$
declare
  rows jsonb := '[{"season_number":1,"episode_number":1,"provider_id":"provider-1","metadata":{"EpisodeTitle":"","AirDate":"2026-10-10","Runtime":42,"Overview":null}},{"season_number":1,"episode_number":2,"provider_id":"provider-2","metadata":{"EpisodeTitle":"New episode","Source":"TMDB"}}]';
  first_receipt jsonb;
  retry_receipt jsonb;
  reused_request uuid := '00000000-0000-4000-d000-000000000014';
begin
  first_receipt:=public.cdl_v14_episode_metadata(
    '00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,reused_request,rows);
  retry_receipt:=public.cdl_v14_episode_metadata(
    '00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,reused_request,rows);
  if first_receipt is distinct from retry_receipt then raise exception 'Retry receipt changed'; end if;
  if first_receipt->>'show_id'<>'00000000-0000-4000-c000-000000000014' or jsonb_array_length(first_receipt->'rows')<>2 then raise exception 'Receipt shape mismatch'; end if;
  if first_receipt->'rows'->0->>'id'<>'00000000-0000-4000-e000-000000000014' or first_receipt->'rows'->0->'metadata'->>'EpisodeTitle'<>''
    then raise exception 'Receipt omitted stored stable identity or blank metadata'; end if;

  begin
    perform public.cdl_v14_episode_metadata('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,gen_random_uuid(),
      '[{"season_number":2,"episode_number":1,"provider_id":null,"metadata":{}},{"season_number":2,"episode_number":1,"provider_id":null,"metadata":{}}]');
    raise exception 'FAIL duplicate slots accepted';
  exception when others then if sqlerrm='FAIL duplicate slots accepted' then raise; end if; end;
  begin
    perform public.cdl_v14_episode_metadata('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,reused_request,
      '[{"season_number":1,"episode_number":1,"provider_id":"different","metadata":{}}]');
    raise exception 'FAIL reused request accepted';
  exception when others then if sqlerrm='FAIL reused request accepted' then raise; end if; end;

  begin
    perform public.cdl_v14_episode_metadata('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,gen_random_uuid(),
      '[{"season_number":3,"episode_number":1,"provider_id":null,"metadata":{"Watched":"true"}}]');
    raise exception 'FAIL progress metadata accepted';
  exception when others then if sqlerrm='FAIL progress metadata accepted' then raise; end if; end;
  begin
    perform public.cdl_v14_episode_metadata('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,gen_random_uuid(),
      '[{"season_number":3,"episode_number":1,"provider_id":null,"metadata":{"WatchedAt":"2026-10-01T00:00:00Z"}}]');
    raise exception 'FAIL watched timestamp metadata accepted';
  exception when others then if sqlerrm='FAIL watched timestamp metadata accepted' then raise; end if; end;

  begin
    perform public.cdl_v14_episode_metadata('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',99,gen_random_uuid(),
      '[{"season_number":4,"episode_number":1,"provider_id":null,"metadata":{}}]');
    raise exception 'FAIL stale show revision accepted';
  exception when others then if sqlerrm='FAIL stale show revision accepted' then raise; end if; end;
end $$;

select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000015',true);
do $$ begin
  begin
    perform public.cdl_v14_episode_metadata('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,gen_random_uuid(),
      '[{"season_number":5,"episode_number":1,"provider_id":null,"metadata":{}}]');
    raise exception 'FAIL foreign owner accepted';
  exception when others then if sqlerrm='FAIL foreign owner accepted' then raise; end if; end;
end $$;
reset role;

do $$ begin
  if (select count(*) from cdl.episodes where show_id='00000000-0000-4000-c000-000000000014')<>2 then raise exception 'Unexpected episode count'; end if;
  if exists(select 1 from cdl.episodes where show_id='00000000-0000-4000-c000-000000000014' and season_number=2) then raise exception 'Duplicate batch partially wrote'; end if;
  if not exists(select 1 from cdl.episodes e where e.id='00000000-0000-4000-e000-000000000014'
      and e.provider_id='provider-1' and e.metadata->>'EpisodeTitle'=''
      and e.metadata->>'Unknown'='retain' and e.metadata->>'LegacyBlank'='') then raise exception 'Metadata merge did not retain identity, blank, or legacy fields'; end if;
  if (select to_jsonb(p) from cdl.episode_progress p where p.episode_id='00000000-0000-4000-e000-000000000014')
      is distinct from jsonb_build_object('library_id','00000000-0000-4000-b000-000000000014','episode_id','00000000-0000-4000-e000-000000000014','watched',true,'watched_at','2026-10-01T12:00:00+00:00'::timestamptz,'revision',4)
    then raise exception 'Existing progress changed'; end if;
  if exists(select 1 from cdl.episodes e join cdl.items i on i.id=e.show_id
      join cdl.libraries l on l.id=e.library_id
      left join cdl.episode_progress p on p.episode_id=e.id
      where l.id='00000000-0000-4000-b000-000000000014' and i.title='Metadata show'
        and e.season_number=1 and e.episode_number=2 and p.episode_id is not null)
    then raise exception 'Metadata upsert created progress'; end if;
  if (select revision from cdl.items where id='00000000-0000-4000-c000-000000000014')<>1 then raise exception 'Metadata upsert changed show revision'; end if;
  if (select count(*) from cdl.change_events where entity_kind='episode_metadata')<>1 then raise exception 'Metadata audit count mismatch'; end if;
  if exists(select 1 from cdl.sync_outbox) then raise exception 'Episode metadata must not create tracker outbox rows'; end if;
  if has_function_privilege('anon','public.cdl_v14_episode_metadata(uuid,uuid,bigint,uuid,jsonb)','EXECUTE') then raise exception 'Anonymous metadata write'; end if;
end $$;
rollback;
