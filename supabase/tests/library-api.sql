begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000014'),('00000000-0000-4000-a000-000000000015');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000014','00000000-0000-4000-a000-000000000014','Local fixture');
insert into cdl.items(id,library_id,media_type,title,notes) values('00000000-0000-4000-c000-000000000014','00000000-0000-4000-b000-000000000014','book','Test book','Original note');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
select public.cdl_v14_save_item('00000000-0000-4000-c000-000000000014',1,'00000000-0000-4000-d000-000000000014','{"personal_rating":0,"notes":"","user_status":"Collection"}');
select public.cdl_v14_save_item('00000000-0000-4000-c000-000000000014',1,'00000000-0000-4000-d000-000000000014','{"personal_rating":0,"notes":"","user_status":"Collection"}');
do $$ begin
 if (public.cdl_v14_get_item('00000000-0000-4000-c000-000000000014')->>'revision')::int<>2 then raise exception 'Duplicate retry incremented revision'; end if;
 begin
  perform public.cdl_v14_save_item('00000000-0000-4000-c000-000000000014',1,gen_random_uuid(),'{"notes":"lost update"}');
  raise exception 'FAIL stale save accepted';
 exception when others then if sqlerrm='FAIL stale save accepted' then raise; end if; end;
 begin
  perform public.cdl_v14_save_item('00000000-0000-4000-c000-000000000014',2,gen_random_uuid(),'{"personal_rating":9}');
  raise exception 'FAIL book rating accepted';
 exception when others then if sqlerrm='FAIL book rating accepted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000015',true);
do $$ begin
 if public.cdl_v14_get_item('00000000-0000-4000-c000-000000000014') is not null then raise exception 'Cross-owner read'; end if;
 if (public.cdl_v14_browse()->>'total')::int<>0 then raise exception 'Cross-owner browse'; end if;
 begin
  perform public.cdl_v14_save_item('00000000-0000-4000-c000-000000000014',2,gen_random_uuid(),'{"notes":"intrusion"}');
  raise exception 'FAIL cross-owner save';
 exception when others then if sqlerrm='FAIL cross-owner save' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from cdl.change_events)<>1 or (select count(*) from cdl.sync_outbox)<>1 then raise exception 'Atomic audit/outbox failed'; end if;
 if (select notes from cdl.items where title='Test book')<>'' then raise exception 'Clear failed'; end if;
 if has_function_privilege('anon','public.cdl_v14_save_item(uuid,bigint,uuid,jsonb)','EXECUTE') then raise exception 'Anonymous write granted'; end if;
end $$;
rollback;
