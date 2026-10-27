begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000030'),('00000000-0000-4000-a000-000000000031');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000030','00000000-0000-4000-a000-000000000030','Bandwidth fixture');
insert into cdl.items(id,library_id,media_type,title) values('00000000-0000-4000-c000-000000000030','00000000-0000-4000-b000-000000000030','tv','Synthetic show');
insert into cdl.episodes(id,library_id,show_id,season_number,episode_number) values('00000000-0000-4000-e000-000000000030','00000000-0000-4000-b000-000000000030','00000000-0000-4000-c000-000000000030',1,1);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000030',true);
select public.cdl_v14_save_setting('00000000-0000-4000-b000-000000000030','theme',null,'00000000-0000-4000-d000-000000000030','{"value":false}');
select public.cdl_v14_save_setting('00000000-0000-4000-b000-000000000030','__cdl_tracker_mixed_v1:fixture',null,'00000000-0000-4000-d000-000000000031',jsonb_build_object('value',repeat('private run retained ',1000)));
do $$ declare ui jsonb; full_data jsonb; check_data jsonb; before_token text; begin
 ui:=public.cdl_v14_renderer_guard('00000000-0000-4000-b000-000000000030');
 if (ui->'counts'->>'settings')::int<>1 then raise exception 'Internal journals counted in renderer'; end if;
 ui:=public.cdl_v14_renderer_page('00000000-0000-4000-b000-000000000030','settings',0,200);
 if jsonb_array_length(ui->'rows')<>1 or ui->'rows'->0->>'key'<>'theme' then raise exception 'Internal journals leaked to renderer'; end if;
 full_data:=public.cdl_v14_snapshot_page('00000000-0000-4000-b000-000000000030','settings',0,200);
 if octet_length(ui::text)>1000 or octet_length(full_data::text)<20000 then raise exception 'Large sync history still transferred to renderer'; end if;
 if jsonb_array_length(full_data->'rows')<>2 then raise exception 'Sync/recovery lost internal journals'; end if;
 check_data:=public.cdl_v14_save_readback('00000000-0000-4000-b000-000000000030',array['theme'],'{}'::uuid[]);
 if check_data->'settings'->0->'value'->'value' is distinct from 'false'::jsonb or jsonb_array_length(check_data->'episodes')<>0 then raise exception 'Targeted false setting lost'; end if;
 before_token:=public.cdl_v14_snapshot_guard('00000000-0000-4000-b000-000000000030')->>'change_token';
 perform public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000030',gen_random_uuid(),'[{"episode_id":"00000000-0000-4000-e000-000000000030","revision":null,"watched":true,"watched_at":"2026-10-27T12:00:00Z"}]');
 check_data:=public.cdl_v14_save_readback('00000000-0000-4000-b000-000000000030','{}'::text[],array['00000000-0000-4000-e000-000000000030'::uuid]);
 if check_data->'episodes'->0->'progress'->'watched' is distinct from 'true'::jsonb or check_data->'episodes'->0 ? 'metadata' then raise exception 'Episode readback lost progress or transferred metadata'; end if;
 if before_token=public.cdl_v14_snapshot_guard('00000000-0000-4000-b000-000000000030')->>'change_token' then raise exception 'Revision check missed episode update'; end if;
 begin
  perform public.cdl_v14_save_readback('00000000-0000-4000-b000-000000000030',array['__cdl_tracker_mixed_v1:fixture'],'{}'::uuid[]);
  raise exception 'FAIL private journal readback permitted';
 exception when others then if sqlerrm='FAIL private journal readback permitted' then raise; end if; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000031',true);
do $$ begin
 begin perform public.cdl_v14_renderer_page('00000000-0000-4000-b000-000000000030','settings',0,200);raise exception 'FAIL foreign library';exception when insufficient_privilege then null;end;
 begin perform public.cdl_v14_save_readback('00000000-0000-4000-b000-000000000030',array['theme'],'{}'::uuid[]);raise exception 'FAIL foreign readback';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.cdl_v14_save_readback(uuid,text[],uuid[])','EXECUTE') or has_function_privilege('anon','public.cdl_v14_renderer_page(uuid,text,integer,integer)','EXECUTE') or has_function_privilege('anon','public.cdl_v14_renderer_guard(uuid)','EXECUTE') then raise exception 'Anonymous read privilege';end if;
end $$;
rollback;
