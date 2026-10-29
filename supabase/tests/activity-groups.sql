begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000014'),('00000000-0000-4000-a000-000000000015');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000014','00000000-0000-4000-a000-000000000014','Activity fixture');
insert into cdl.items(id,library_id,media_type,title) values
 ('00000000-0000-4000-c000-000000000014','00000000-0000-4000-b000-000000000014','game','One'),
 ('00000000-0000-4000-c000-000000000015','00000000-0000-4000-b000-000000000014','game','Other');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000014',true);
do $$ declare root uuid:='00000000-0000-4000-d000-000000000014'; item uuid:='00000000-0000-4000-c000-000000000014'; a jsonb;b jsonb; op text; begin
 a:=public.cdl_v14_full_edit_activity(item,1,root,'{"user_status":"Completed","personal_rating":8.9}',root,'user');
 b:=public.cdl_v14_full_edit_activity(item,1,root,'{"user_status":"Completed","personal_rating":8.9}',root,'user');
 if a is distinct from b or a->>'revision'<>'2' then raise exception 'Root retry failed';end if;
 a:=public.cdl_v14_full_edit_activity(item,2,'00000000-0000-4000-d000-000000000015','{"overrides":{"Rating":"82.65"}}',root,'metadata');
 b:=public.cdl_v14_full_edit_activity(item,3,'00000000-0000-4000-d000-000000000016','{"overrides":{"R2CoverUrl":"https://example.test/cover"}}',root,'artwork');
 if b->>'revision'<>'4' then raise exception 'Continuation failed';end if;
 for op in select unnest(array['personal','foreign-parent','group-retry','bad-artwork','wrong-role','stale','invalid-override']) loop
  begin
   if op='personal' then perform public.cdl_v14_full_edit_activity(item,4,gen_random_uuid(),'{"notes":"not technical"}',root,'metadata');
   elsif op='foreign-parent' then perform public.cdl_v14_full_edit_activity('00000000-0000-4000-c000-000000000015',1,gen_random_uuid(),'{"overrides":{"Rating":"70"}}',root,'metadata');
   elsif op='group-retry' then perform public.cdl_v14_full_edit_activity(item,1,root,'{"user_status":"Completed","personal_rating":8.9}',gen_random_uuid(),'user');
   elsif op='bad-artwork' then perform public.cdl_v14_full_edit_activity(item,4,gen_random_uuid(),'{"overrides":{"Platform":"PS5"}}',root,'artwork');
   elsif op='wrong-role' then perform public.cdl_v14_full_edit_activity(item,4,gen_random_uuid(),'{"notes":"x"}',root,'unknown');
   elsif op='stale' then perform public.cdl_v14_full_edit_activity(item,1,gen_random_uuid(),'{"overrides":{"Rating":"70"}}',root,'metadata');
   else perform public.cdl_v14_full_edit_activity(item,4,gen_random_uuid(),'{"overrides":{"PosterURL":"x"}}',root,'metadata');
   end if;
   raise exception 'FAIL accepted %',op;
  exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 end loop;
 a:=public.cdl_v14_activity('00000000-0000-4000-b000-000000000014',0,100);
 if jsonb_array_length(a->'events')<>3 or exists(select 1 from jsonb_array_elements(a->'events') e where e->'changes'->>'activity_id'<>root::text) then raise exception 'Activity read lost grouping or audit events';end if;
 -- A genuinely later user action starts a separate group.
 root:=gen_random_uuid();
 perform public.cdl_v14_full_edit_activity(item,4,root,'{"notes":"Later edit"}',root,'user');
 -- New item and artwork use the same wrappers without changing create semantics.
 root:=gen_random_uuid();
 a:=public.cdl_v14_create_item_activity('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000016',root,'game','{"title":"New","user_status":"Wishlist"}',root);
 b:=public.cdl_v14_create_item_activity('00000000-0000-4000-b000-000000000014','00000000-0000-4000-c000-000000000016',root,'game','{"title":"New","user_status":"Wishlist"}',root);
 if a is distinct from b then raise exception 'Creation retry failed';end if;
 perform public.cdl_v14_full_edit_activity('00000000-0000-4000-c000-000000000016',(a->>'revision')::bigint,gen_random_uuid(),'{"overrides":{"R2CoverUrl":"https://example.test/new"}}',root,'artwork');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000015',true);
do $$ begin
 begin
  perform public.cdl_v14_full_edit_activity('00000000-0000-4000-c000-000000000014',5,gen_random_uuid(),'{"notes":"foreign"}',gen_random_uuid(),'user');raise exception 'FAIL foreign owner';
 exception when others then if sqlerrm like 'FAIL%' then raise;end if;end;
 if jsonb_array_length(public.cdl_v14_activity('00000000-0000-4000-b000-000000000014',0,100)->'events')<>0 then raise exception 'Foreign activity leaked';end if;
end $$;
reset role;
do $$ begin
 if (select count(*) from cdl.change_events)<>6 then raise exception 'Audit count mismatch';end if;
 if (select revision from cdl.items where id='00000000-0000-4000-c000-000000000014')<>5 then raise exception 'Rejected writes changed item';end if;
 if has_function_privilege('anon','public.cdl_v14_full_edit_activity(uuid,bigint,uuid,jsonb,uuid,text)','EXECUTE') then raise exception 'Anonymous activity write';end if;
end $$;
rollback;
