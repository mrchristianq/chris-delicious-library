begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000014'),('00000000-0000-4000-a000-000000000015');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000014','00000000-0000-4000-a000-000000000014','Settings fixture');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
do $$ declare a jsonb; b jsonb; begin
 a:=public.cdl_v14_save_setting('00000000-0000-4000-b000-000000000014','3d',null,'00000000-0000-4000-d000-000000000014','{"value":false}');
 b:=public.cdl_v14_save_setting('00000000-0000-4000-b000-000000000014','3d',null,'00000000-0000-4000-d000-000000000014','{"value":false}');
 if a is distinct from b or a->'value'->'value'<>'false'::jsonb then raise exception 'Setting retry or false lost'; end if;
 begin
  perform public.cdl_v14_save_setting('00000000-0000-4000-b000-000000000014','3d',null,gen_random_uuid(),'{"value":true}');
  raise exception 'FAIL stale setting accepted';
 exception when others then if sqlerrm='FAIL stale setting accepted' then raise; end if; end;
 a:=public.cdl_v14_save_setting('00000000-0000-4000-b000-000000000014','3d',1,gen_random_uuid(),'{"value":""}');
 if a->'value'->>'value'<>'' or a->>'revision'<>'2' then raise exception 'Clear setting failed'; end if;
 a:=public.cdl_v14_save_setting('00000000-0000-4000-b000-000000000014','nullable',null,gen_random_uuid(),'{"value":null}');
 if a->'value'->'value' is distinct from 'null'::jsonb then raise exception 'JSON null lost'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000015',true);
do $$ begin
 begin
  perform public.cdl_v14_save_setting('00000000-0000-4000-b000-000000000014','3d',2,gen_random_uuid(),'{"value":true}');
  raise exception 'FAIL foreign setting accepted';
 exception when others then if sqlerrm='FAIL foreign setting accepted' then raise; end if; end;
end $$;
reset role;
do $$ begin
 if (select count(*) from cdl.change_events)<>3 then raise exception 'Setting audit mismatch'; end if;
 if has_function_privilege('anon','public.cdl_v14_save_setting(uuid,text,bigint,uuid,jsonb)','EXECUTE') then raise exception 'Anonymous setting write'; end if;
end $$;
rollback;
