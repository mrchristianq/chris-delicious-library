begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000103'),('00000000-0000-4000-a000-000000000104');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000103',true);
do $$ begin
 if public.cdl_v14_episode_refresh_guard('provider','123')->>'retry_after'<>'0' then raise exception 'Initial denied'; end if;
 for i in 1..100 loop
  if (public.cdl_v14_episode_refresh_guard('provider','123')->>'retry_after')::integer not between 1 and 60 then raise exception 'Repeat escaped limit'; end if;
 end loop;
 if public.cdl_v14_episode_refresh_guard('provider','124')->>'retry_after'<>'0' then raise exception 'Different show denied'; end if;
 if public.cdl_v14_episode_refresh_guard('metadata','00000000-0000-4000-c000-000000000103')->>'retry_after'<>'0' then raise exception 'Write stage denied'; end if;
end $$;
reset role;
update cdl.episode_refresh_limits set last_attempt=now()-interval '61 seconds',attempts=6 where key='123';
set local role authenticated;
do $$ begin
 if (public.cdl_v14_episode_refresh_guard('provider','123')->>'retry_after')::integer < 86000 then raise exception 'Daily cap bypassed'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000104',true);
do $$ begin
 if public.cdl_v14_episode_refresh_guard('provider','123')->>'retry_after'<>'0' then raise exception 'Other user blocked'; end if;
end $$;
reset role;
update cdl.episode_refresh_limits set attempts=400 where owner_id='00000000-0000-4000-a000-000000000103' and key='*';
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000103',true);
do $$ begin
 if (public.cdl_v14_episode_refresh_guard('provider','125')->>'retry_after')::integer < 3500 then raise exception 'Aggregate cap bypassed'; end if;
end $$;
reset role;
update cdl.episode_refresh_limits set window_started=now()-interval '2 days',last_attempt=now()-interval '2 days';
set local role authenticated;
do $$ begin
 if public.cdl_v14_episode_refresh_guard('provider','123')->>'retry_after'<>'0' then raise exception 'Expiry failed'; end if;
 begin
  perform public.cdl_v14_episode_refresh_guard('provider','*');
  raise exception 'FAIL invalid identity accepted';
 exception when others then if sqlerrm like 'FAIL%' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if has_table_privilege('authenticated','cdl.episode_refresh_limits','UPDATE') then raise exception 'Counter tampering allowed'; end if;
 if has_function_privilege('anon','public.cdl_v14_episode_refresh_guard(text,text)','EXECUTE') then raise exception 'Anonymous access'; end if;
end $$;
rollback;
