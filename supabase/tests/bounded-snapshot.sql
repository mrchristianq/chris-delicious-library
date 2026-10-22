begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000031'),('00000000-0000-4000-a000-000000000032');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000031','00000000-0000-4000-a000-000000000031','Bounded snapshot');
insert into cdl.items(id,library_id,media_type,title) values('00000000-0000-4000-c000-000000000031','00000000-0000-4000-b000-000000000031','tv','Fixture');
insert into cdl.items(library_id,media_type,title) select '00000000-0000-4000-b000-000000000031','game','Game '||n from generate_series(1,405) n;
insert into cdl.item_metadata(item_id,library_id,fields) values('00000000-0000-4000-c000-000000000031','00000000-0000-4000-b000-000000000031','{"Overview":"Text","_import":"private","providerEvidence":"private"}');
insert into cdl.episodes(id,library_id,show_id,season_number,episode_number) values('00000000-0000-4000-e000-000000000031','00000000-0000-4000-b000-000000000031','00000000-0000-4000-c000-000000000031',1,1);
insert into cdl.settings(library_id,key,value) values('00000000-0000-4000-b000-000000000031','theme','{"value":"dark","source_rows":["private"]}');
create temp table manifest_token(value text); grant all on manifest_token to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000031',true);
do $$ declare original jsonb; manifest jsonb; pages jsonb:='[]'; part jsonb; n int; section text; begin
 original:=public.cdl_v14_snapshot('00000000-0000-4000-b000-000000000031');
 manifest:=public.cdl_v14_snapshot_manifest('00000000-0000-4000-b000-000000000031');
 if public.cdl_v14_snapshot_guard('00000000-0000-4000-b000-000000000031')->>'transaction_token' is distinct from pg_current_snapshot()::text then raise exception 'Missing transaction guard'; end if;
 if manifest->'counts'->>'items'<>'406' then raise exception 'Incorrect manifest count'; end if;
 foreach section in array array['items','episodes','settings','identifiers','collections'] loop
  pages:='[]';
  for n in 0..((manifest->'counts'->>section)::int/200) loop
   part:=public.cdl_v14_snapshot_page('00000000-0000-4000-b000-000000000031',section,n*200,200);
   pages:=pages||(part->'rows');
   if jsonb_array_length(part->'rows')>200 then raise exception 'Unbounded page'; end if;
  end loop;
  if pages is distinct from original->section then raise exception 'Projection changed for %',section; end if;
 end loop;
 insert into manifest_token values(manifest->>'change_token');
 begin perform public.cdl_v14_snapshot_page('00000000-0000-4000-b000-000000000031','items',0,201); raise exception 'Large page accepted'; exception when raise_exception then if sqlerrm<>'Invalid page' then raise; end if; end;
end $$;
reset role;
update cdl.item_metadata set fields=fields||'{"Overview":"Changed"}' where item_id='00000000-0000-4000-c000-000000000031';
set local role authenticated;
do $$ begin
 if public.cdl_v14_snapshot_manifest('00000000-0000-4000-b000-000000000031')->>'change_token'=(select value from manifest_token) then raise exception 'Metadata change invisible'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000032',true);
do $$ begin
 if public.cdl_v14_snapshot_manifest('00000000-0000-4000-b000-000000000031') is not null then raise exception 'Cross-owner manifest leaked'; end if;
 if public.cdl_v14_snapshot_guard('00000000-0000-4000-b000-000000000031') is not null then raise exception 'Cross-owner guard leaked'; end if;
 if has_function_privilege('anon','public.cdl_v14_snapshot_guard(uuid)','EXECUTE') then raise exception 'Anonymous guard granted'; end if;
 begin perform public.cdl_v14_snapshot_page('00000000-0000-4000-b000-000000000031','items',0,200); raise exception 'Cross-owner page leaked'; exception when insufficient_privilege then null; end;
 if has_function_privilege('anon','public.cdl_v14_snapshot_manifest(uuid)','EXECUTE') or has_function_privilege('anon','public.cdl_v14_snapshot_page(uuid,text,integer,integer)','EXECUTE') then raise exception 'Anonymous grant'; end if;
end $$;
reset role;
rollback;
