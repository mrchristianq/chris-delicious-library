begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000014'),('00000000-0000-4000-a000-000000000015');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000014','00000000-0000-4000-a000-000000000014','Episode fixture');
insert into cdl.items(id,library_id,media_type,title) values('00000000-0000-4000-c000-000000000014','00000000-0000-4000-b000-000000000014','tv','Fixture show');
insert into cdl.episodes(id,library_id,show_id,season_number,episode_number) values
 ('00000000-0000-4000-e000-000000000014','00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,1),
 ('00000000-0000-4000-e000-000000000015','00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000014',1,2);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
do $$ declare changes jsonb; a jsonb; b jsonb; begin
 changes:='[{"episode_id":"00000000-0000-4000-e000-000000000014","revision":null,"watched":true,"watched_at":"2026-10-12T12:00:00Z"}]';
 a:=public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000014','00000000-0000-4000-d000-000000000014',changes);
 b:=public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000014','00000000-0000-4000-d000-000000000014',changes);
 if a is distinct from b or a->0->>'revision'<>'1' then raise exception 'Retry not idempotent'; end if;
 begin
  perform public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000014',gen_random_uuid(),changes);
  raise exception 'FAIL stale initial progress accepted';
 exception when others then if sqlerrm='FAIL stale initial progress accepted' then raise; end if; end;
 begin
  perform public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000014','00000000-0000-4000-d000-000000000014','[{"episode_id":"00000000-0000-4000-e000-000000000014","revision":1,"watched":false,"watched_at":null}]');
  raise exception 'FAIL reused request accepted';
 exception when others then if sqlerrm='FAIL reused request accepted' then raise; end if; end;
 -- First row would succeed; second conflicts. Entire batch must roll back.
 begin
  perform public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000014',gen_random_uuid(),'[{"episode_id":"00000000-0000-4000-e000-000000000014","revision":1,"watched":false,"watched_at":null},{"episode_id":"00000000-0000-4000-e000-000000000015","revision":99,"watched":true,"watched_at":null}]');
  raise exception 'FAIL partial batch accepted';
 exception when others then if sqlerrm='FAIL partial batch accepted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000015',true);
do $$ begin
 begin
  perform public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000014',gen_random_uuid(),'[{"episode_id":"00000000-0000-4000-e000-000000000014","revision":1,"watched":false,"watched_at":null}]');
  raise exception 'FAIL cross-owner write';
 exception when others then if sqlerrm='FAIL cross-owner write' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from cdl.episode_progress)<>1 or not (select watched from cdl.episode_progress limit 1) or (select revision from cdl.episode_progress limit 1)<>1 then raise exception 'Rollback failed'; end if;
 if (select count(*) from cdl.change_events)<>1 then raise exception 'Audit mismatch'; end if;
 if exists(select 1 from cdl.sync_outbox) then raise exception 'Episode export must stay disabled'; end if;
 if has_function_privilege('anon','public.cdl_v14_save_episode_progress(uuid,uuid,jsonb)','EXECUTE') then raise exception 'Anonymous write'; end if;
end $$;
rollback;
