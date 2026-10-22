begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000014'),('00000000-0000-4000-a000-000000000015');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000014','00000000-0000-4000-a000-000000000014','Snapshot fixture');
insert into cdl.items(id,library_id,media_type,title) values('00000000-0000-4000-c000-000000000014','00000000-0000-4000-b000-000000000014','tv','Fixture show');
insert into cdl.items(library_id,media_type,title) select '00000000-0000-4000-b000-000000000014','game','Game '||n from generate_series(1,2499) n;
insert into cdl.episodes(id,library_id,show_id,season_number,episode_number,metadata) values('00000000-0000-4000-e000-000000000014','00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',0,1,'{"Watched":"true","_import":{"private":"hidden"}}');
insert into cdl.settings(library_id,key,value) values('00000000-0000-4000-b000-000000000014','theme','{"value":"dark","source_rows":["private"],"legacy_profiles":{"general_getSetting":"dark"}}');
create temp table snapshot_tokens(token text);
grant all on snapshot_tokens to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
do $$ declare s jsonb; begin
 s:=public.cdl_v14_snapshot('00000000-0000-4000-b000-000000000014');
 if jsonb_array_length(s->'items')<>2500 or (s->'counts'->>'items')::int<>2500 then raise exception 'Truncated snapshot'; end if;
 if s->'episodes'->0->'progress'<>'null'::jsonb then raise exception 'Unknown progress lost'; end if;
 if s::text like '%source_rows%' or s::text like '%_import%' or s::text like '%import_row_id%' then raise exception 'Private provenance leaked'; end if;
 insert into snapshot_tokens values(s->>'change_token');
 if s->>'change_token' is distinct from public.cdl_v14_snapshot('00000000-0000-4000-b000-000000000014')->>'change_token' then raise exception 'Unstable token'; end if;
end $$;
reset role;
insert into cdl.episode_progress(library_id,episode_id,watched) values('00000000-0000-4000-b000-000000000014','00000000-0000-4000-e000-000000000014',false);
set local role authenticated;
do $$ declare s jsonb; begin
 s:=public.cdl_v14_snapshot('00000000-0000-4000-b000-000000000014');
 if s->'episodes'->0->'progress'->>'watched'<>'false' then raise exception 'False progress lost'; end if;
 if s->>'change_token'=(select token from snapshot_tokens) then raise exception 'Progress not in token'; end if;
 update snapshot_tokens set token=s->>'change_token';
end $$;
reset role;
update cdl.settings set value='{"value":"light"}',revision=revision+1 where key='theme';
set local role authenticated;
do $$ begin
 if public.cdl_v14_snapshot('00000000-0000-4000-b000-000000000014')->>'change_token'=(select token from snapshot_tokens) then raise exception 'Settings not in token'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000015',true);
do $$ begin
 if public.cdl_v14_snapshot('00000000-0000-4000-b000-000000000014') is not null then raise exception 'Cross-owner data leaked'; end if;
 if has_function_privilege('anon','public.cdl_v14_snapshot(uuid)','EXECUTE') then raise exception 'Anonymous read granted'; end if;
end $$;
reset role;
rollback;
