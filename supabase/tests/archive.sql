begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000024'),('00000000-0000-4000-a000-000000000025');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000024','00000000-0000-4000-a000-000000000024','Archive fixture');
insert into cdl.items(id,library_id,media_type,title,notes) values
 ('00000000-0000-4000-c000-000000000024','00000000-0000-4000-b000-000000000024','tv','Duplicate','Retain'),
 ('00000000-0000-4000-c000-000000000025','00000000-0000-4000-b000-000000000024','tv','Duplicate','Other');
insert into cdl.episodes(id,library_id,show_id,season_number,episode_number) values
 ('00000000-0000-4000-e000-000000000024','00000000-0000-4000-b000-000000000024','00000000-0000-4000-c000-000000000024',1,1);
insert into cdl.episode_progress(library_id,episode_id,watched) values
 ('00000000-0000-4000-b000-000000000024','00000000-0000-4000-e000-000000000024',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000024',true);
do $$ declare a jsonb;b jsonb;begin
 a:=public.cdl_v14_set_archived('00000000-0000-4000-c000-000000000024',1,'00000000-0000-4000-d000-000000000024',true);
 b:=public.cdl_v14_set_archived('00000000-0000-4000-c000-000000000024',1,'00000000-0000-4000-d000-000000000024',true);
 if a is distinct from b or a->>'archived'<>'true' or a->>'revision'<>'2' then raise exception 'Archive retry failed';end if;
 if public.cdl_v14_archive_state('00000000-0000-4000-c000-000000000024') is distinct from a then raise exception 'Readback failed';end if;
 if public.cdl_v14_archive_state('00000000-0000-4000-c000-000000000025')->>'archived'<>'false' then raise exception 'Duplicate changed';end if;
 b:=public.cdl_v14_snapshot('00000000-0000-4000-b000-000000000024');
 if jsonb_array_length(b->'items')<>1 or jsonb_array_length(b->'episodes')<>0 then raise exception 'Archived show/episodes remain visible';end if;
 begin
  perform public.cdl_v14_set_archived('00000000-0000-4000-c000-000000000024',1,gen_random_uuid(),false);raise exception 'FAIL stale restore';
 exception when others then if sqlerrm='FAIL stale restore' then raise;end if;end;
 begin
  perform public.cdl_v14_set_archived('00000000-0000-4000-c000-000000000024',1,'00000000-0000-4000-d000-000000000024',false);raise exception 'FAIL request reuse';
 exception when others then if sqlerrm='FAIL request reuse' then raise;end if;end;
 b:=public.cdl_v14_set_archived('00000000-0000-4000-c000-000000000024',2,'00000000-0000-4000-d000-000000000025',false);
 if b->>'revision'<>'3' or b->>'archived'<>'false' then raise exception 'Restore failed';end if;
 b:=public.cdl_v14_snapshot('00000000-0000-4000-b000-000000000024');
 if jsonb_array_length(b->'items')<>2 or jsonb_array_length(b->'episodes')<>1 then raise exception 'Restored show/episodes missing';end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000025',true);
do $$ begin
 if public.cdl_v14_archive_state('00000000-0000-4000-c000-000000000024') is not null then raise exception 'Foreign read';end if;
 begin
  perform public.cdl_v14_set_archived('00000000-0000-4000-c000-000000000024',3,gen_random_uuid(),true);raise exception 'FAIL foreign archive';
 exception when others then if sqlerrm='FAIL foreign archive' then raise;end if;end;
end $$;
reset role;
do $$ begin
 if (select count(*) from cdl.change_events)<>2 or (select count(*) from cdl.sync_outbox)<>0 then raise exception 'Audit/tracker safety mismatch';end if;
 if (select notes from cdl.items where id='00000000-0000-4000-c000-000000000024')<>'Retain' or not (select watched from cdl.episode_progress where episode_id='00000000-0000-4000-e000-000000000024') then raise exception 'Lost data';end if;
 if has_function_privilege('anon','public.cdl_v14_set_archived(uuid,bigint,uuid,boolean)','EXECUTE') or has_function_privilege('anon','public.cdl_v14_archive_state(uuid)','EXECUTE') then raise exception 'Anonymous access';end if;
end $$;
rollback;
