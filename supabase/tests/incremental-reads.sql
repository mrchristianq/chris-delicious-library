begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000032'),('00000000-0000-4000-a000-000000000033');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000032','00000000-0000-4000-a000-000000000032','Incremental fixture');
insert into cdl.items(id,library_id,media_type,title) values('00000000-0000-4000-c000-000000000032','00000000-0000-4000-b000-000000000032','tv','Synthetic show');
insert into cdl.episodes(id,library_id,show_id,season_number,episode_number) values('00000000-0000-4000-e000-000000000032','00000000-0000-4000-b000-000000000032','00000000-0000-4000-c000-000000000032',1,1);
insert into cdl.settings(library_id,key,value) values('00000000-0000-4000-b000-000000000032','theme','{"value":false}'),('00000000-0000-4000-b000-000000000032','__cdl_tracker_hidden','{"value":"private journal"}');
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000032',true);
set local role authenticated;
do $$ declare idx jsonb; records jsonb; legacy jsonb; begin
 idx:=public.cdl_v14_renderer_index('00000000-0000-4000-b000-000000000032');
 if jsonb_array_length(idx->'records'->'items')<>1 or jsonb_array_length(idx->'records'->'episodes')<>1 or jsonb_array_length(idx->'records'->'settings')<>1 then raise exception 'Inventory incomplete or includes private journals';end if;
 records:=public.cdl_v14_renderer_records('00000000-0000-4000-b000-000000000032','items',array['00000000-0000-4000-c000-000000000032']);
 legacy:=public.cdl_v14_snapshot_page('00000000-0000-4000-b000-000000000032','items',0,200);
 if records->'rows' is distinct from legacy->'rows' then raise exception 'Item renderer parity changed';end if;
 records:=public.cdl_v14_renderer_records('00000000-0000-4000-b000-000000000032','episodes',array['00000000-0000-4000-e000-000000000032']);
 legacy:=public.cdl_v14_snapshot_page('00000000-0000-4000-b000-000000000032','episodes',0,200);
 if records->'rows' is distinct from legacy->'rows' then raise exception 'Episode renderer parity changed';end if;
 perform public.cdl_v14_save_episode_progress('00000000-0000-4000-b000-000000000032',gen_random_uuid(),'[{"episode_id":"00000000-0000-4000-e000-000000000032","revision":null,"watched":true,"watched_at":"2026-10-27T12:00:00Z"}]');
 records:=public.cdl_v14_renderer_index('00000000-0000-4000-b000-000000000032');
 if records->'records'->'episodes' is not distinct from idx->'records'->'episodes' then raise exception 'Progress changes absent from inventory';end if;
 if records->'records'->'items' is distinct from idx->'records'->'items' then raise exception 'Progress unnecessarily invalidates item metadata';end if;
 records:=public.cdl_v14_renderer_records('00000000-0000-4000-b000-000000000032','settings',array['__cdl_tracker_hidden','theme']);
 if jsonb_array_length(records->'rows')<>1 or records->'rows'->0->'value'->'value' is distinct from 'false'::jsonb then raise exception 'Private settings leaked or false lost';end if;
 begin perform public.cdl_v14_renderer_records('00000000-0000-4000-b000-000000000032','items',array_fill('x',array[201]));raise exception 'FAIL oversized page';exception when others then if sqlerrm='FAIL oversized page' then raise;end if;end;
end $$;
reset role;
-- Maintenance writes and archive/unarchive must invalidate records even when
-- no application revision changes. MVCC stamps cover these paths too.
do $$ declare before_index jsonb; after_index jsonb; begin
 before_index:=public.cdl_v14_renderer_index('00000000-0000-4000-b000-000000000032');
 update cdl.episodes set metadata='{"SeasonPosterURL":"https://example.test/season.jpg"}' where id='00000000-0000-4000-e000-000000000032';
 after_index:=public.cdl_v14_renderer_index('00000000-0000-4000-b000-000000000032');
 if before_index->'records'->'episodes' is not distinct from after_index->'records'->'episodes' then raise exception 'Metadata update lost';end if;
 update cdl.items set deleted_at=now() where id='00000000-0000-4000-c000-000000000032';
 after_index:=public.cdl_v14_renderer_index('00000000-0000-4000-b000-000000000032');
 if jsonb_array_length(after_index->'records'->'items')<>0 or jsonb_array_length(after_index->'records'->'episodes')<>0 then raise exception 'Archived show retained';end if;
 update cdl.items set deleted_at=null where id='00000000-0000-4000-c000-000000000032';
 after_index:=public.cdl_v14_renderer_index('00000000-0000-4000-b000-000000000032');
 if jsonb_array_length(after_index->'records'->'items')<>1 or jsonb_array_length(after_index->'records'->'episodes')<>1 then raise exception 'Restored show absent';end if;
 delete from cdl.settings where library_id='00000000-0000-4000-b000-000000000032' and key='theme';
 if jsonb_array_length(public.cdl_v14_renderer_index('00000000-0000-4000-b000-000000000032')->'records'->'settings')<>0 then raise exception 'Deleted setting retained';end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000033',true);
do $$ begin
 begin perform public.cdl_v14_renderer_index('00000000-0000-4000-b000-000000000032');raise exception 'FAIL foreign inventory';exception when insufficient_privilege then null;end;
 begin perform public.cdl_v14_renderer_records('00000000-0000-4000-b000-000000000032','items',array['00000000-0000-4000-c000-000000000032']);raise exception 'FAIL foreign records';exception when insufficient_privilege then null;end;
end $$;
reset role;
do $$ begin
 if has_function_privilege('anon','public.cdl_v14_renderer_index(uuid)','EXECUTE') or has_function_privilege('anon','public.cdl_v14_renderer_records(uuid,text,text[])','EXECUTE') then raise exception 'Anonymous access';end if;
end $$;
rollback;
