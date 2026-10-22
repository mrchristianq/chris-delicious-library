begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000034'),('00000000-0000-4000-a000-000000000035');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000034','00000000-0000-4000-a000-000000000034','Create fixture');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000034',true);
do $$ declare a jsonb;b jsonb;p jsonb;kind text;begin
 p:='{"title":"Same game","user_status":"Wishlist","notes":"Review","overrides":{"Platform":"Steam","IGDB_ID":"123"}}';
 a:=public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034','00000000-0000-4000-c000-000000000034','00000000-0000-4000-d000-000000000034','game',p);
 b:=public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034','00000000-0000-4000-c000-000000000034','00000000-0000-4000-d000-000000000034','game',p);
 if a is distinct from b or a->>'revision'<>'2' then raise exception 'Retry failed';end if;
 if public.cdl_v14_get_item('00000000-0000-4000-c000-000000000034')->>'notes'<>'Review' then raise exception 'Readback failed';end if;
 perform public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034',gen_random_uuid(),gen_random_uuid(),'game',jsonb_set(p,'{overrides,Platform}','"Xbox"'));
 foreach kind in array array['book','movie','tv'] loop
  perform public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034',gen_random_uuid(),gen_random_uuid(),kind,'{"title":"Fixture","personal_rating":4.9}');
 end loop;
 begin
  perform public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034','00000000-0000-4000-c000-000000000034','00000000-0000-4000-d000-000000000034','game','{"title":"Changed"}');raise exception 'FAIL reused request';
 exception when others then if sqlerrm='FAIL reused request' then raise;end if;end;
 begin
  perform public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034',gen_random_uuid(),gen_random_uuid(),'book','{"title":"Invalid","personal_rating":9}');raise exception 'FAIL book rating';
 exception when others then if sqlerrm='FAIL book rating' then raise;end if;end;
 begin
  perform public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034',gen_random_uuid(),gen_random_uuid(),'tv','{"title":"Invalid","user_status":"Bogus"}');raise exception 'FAIL status';
 exception when others then if sqlerrm='FAIL status' then raise;end if;end;
 begin
  perform public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034',gen_random_uuid(),gen_random_uuid(),'book','{"title":"Invalid","overrides":{"revision":"100"}}');raise exception 'FAIL override';
 exception when others then if sqlerrm='FAIL override' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000035',true);
do $$ begin
 begin
  perform public.cdl_v14_create_item('00000000-0000-4000-b000-000000000034',gen_random_uuid(),gen_random_uuid(),'book','{"title":"Foreign"}');raise exception 'FAIL foreign create';
 exception when others then if sqlerrm='FAIL foreign create' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if (select count(*) from cdl.items)<>5 or (select count(*) from cdl.item_metadata)<>5 or (select count(*) from cdl.change_events where entity_kind='create')<>5 or (select count(*) from cdl.sync_outbox)<>5 then raise exception 'Atomicity or duplicate failure';end if;
 if has_function_privilege('anon','public.cdl_v14_create_item(uuid,uuid,uuid,text,jsonb)','EXECUTE') then raise exception 'Anonymous creation';end if;
end $$;
rollback;
