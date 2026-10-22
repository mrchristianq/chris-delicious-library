begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000014'),('00000000-0000-4000-a000-000000000015');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000014','00000000-0000-4000-a000-000000000014','Edit fixture');
insert into cdl.items(id,library_id,media_type,title,notes,user_fields) values
 ('00000000-0000-4000-c000-000000000014','00000000-0000-4000-b000-000000000014','book','Duplicate','Old','{"ISBN":"same"}'),
 ('00000000-0000-4000-c000-000000000015','00000000-0000-4000-b000-000000000014','book','Duplicate','Other','{"ISBN":"same"}');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
do $$ declare a jsonb;b jsonb;p jsonb;begin
 p:='{"title":"Renamed","notes":"","personal_rating":0,"overrides":{"ISBN":"","isbn":"","Type":"eBook","Types":"eBook"}}';
 a:=public.cdl_v14_full_edit('00000000-0000-4000-c000-000000000014',1,'00000000-0000-4000-d000-000000000014',p);
 b:=public.cdl_v14_full_edit('00000000-0000-4000-c000-000000000014',1,'00000000-0000-4000-d000-000000000014',p);
 if a is distinct from b or a->>'revision'<>'2' or a->>'notes'<>'' or a->>'personal_rating'<>'0' then raise exception 'Edit or retry failed';end if;
 if public.cdl_v14_get_item('00000000-0000-4000-c000-000000000015')->>'notes'<>'Other' then raise exception 'Duplicate ISBN target changed';end if;
 begin
  perform public.cdl_v14_full_edit('00000000-0000-4000-c000-000000000014',1,gen_random_uuid(),'{"notes":"stale"}');raise exception 'FAIL stale edit';
 exception when others then if sqlerrm='FAIL stale edit' then raise;end if;end;
 begin
  perform public.cdl_v14_full_edit('00000000-0000-4000-c000-000000000014',2,gen_random_uuid(),'{"overrides":{"revision":"1"}}');raise exception 'FAIL arbitrary override';
 exception when others then if sqlerrm='FAIL arbitrary override' then raise;end if;end;
 begin
  perform public.cdl_v14_full_edit('00000000-0000-4000-c000-000000000014',2,gen_random_uuid(),'{"personal_rating":9}');raise exception 'FAIL book scale';
 exception when others then if sqlerrm='FAIL book scale' then raise;end if;end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000015',true);
do $$ begin
 begin
  perform public.cdl_v14_full_edit('00000000-0000-4000-c000-000000000014',2,gen_random_uuid(),'{"notes":"foreign"}');raise exception 'FAIL foreign edit';
 exception when others then if sqlerrm='FAIL foreign edit' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if (select count(*) from cdl.change_events)<>1 or (select count(*) from cdl.sync_outbox)<>1 then raise exception 'Audit/outbox mismatch';end if;
 if has_function_privilege('anon','public.cdl_v14_full_edit(uuid,bigint,uuid,jsonb)','EXECUTE') then raise exception 'Anonymous edit';end if;
end $$;
rollback;
