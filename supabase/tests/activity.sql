begin;
insert into auth.users(id) values
 ('00000000-0000-4000-a000-000000000114'),
 ('00000000-0000-4000-a000-000000000115');
insert into cdl.libraries(id,owner_id,name) values
 ('00000000-0000-4000-b000-000000000114','00000000-0000-4000-a000-000000000114','Activity owner fixture'),
 ('00000000-0000-4000-b000-000000000115','00000000-0000-4000-a000-000000000115','Foreign activity fixture');
insert into cdl.import_batches(id,library_id,source_sheet_id,snapshot_sha256,captured_at,status)
 values('00000000-0000-4000-d000-000000000114','00000000-0000-4000-b000-000000000114','fixture',repeat('1',64),now(),'review');
insert into cdl.import_batches(id,library_id,source_sheet_id,snapshot_sha256,captured_at,status)
 values('00000000-0000-4000-d000-000000000116','00000000-0000-4000-b000-000000000114','older-fixture',repeat('2',64),now()-interval '1 day','review');
insert into cdl.import_rows(id,library_id,batch_id,tab,source_row,headers,raw_cells,effective_cells) values
 ('00000000-0000-4000-e000-000000000114','00000000-0000-4000-b000-000000000114','00000000-0000-4000-d000-000000000114','Changelog',306,
  '["Timestamp","Source","Sheet","Row","Field","Old Value","New Value","User","Function", "", ""]',
  '["2026-10-01","legacy","Books","Fixture Title","9","Notes","before","after","owner","first blank","second blank"]',null),
 ('00000000-0000-4000-e000-000000000115','00000000-0000-4000-b000-000000000114','00000000-0000-4000-d000-000000000114','Books',2,
  '["Title"]','["Must never appear"]','["Must never appear"]'),
 ('00000000-0000-4000-e000-000000000116','00000000-0000-4000-b000-000000000114','00000000-0000-4000-d000-000000000116','Changelog',999,
  '["Timestamp","Field"]','["Old batch marker","Must not mix snapshots"]','["Old batch marker","Must not mix snapshots"]');
insert into cdl.import_rows(id,library_id,batch_id,tab,source_row,headers,raw_cells,effective_cells)
select gen_random_uuid(),'00000000-0000-4000-b000-000000000114','00000000-0000-4000-d000-000000000114','Changelog',n,
  '["Timestamp","Field"]'::jsonb,jsonb_build_array('2026-10-02','Notes'),null
from generate_series(3,305) n;
insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes,created_at)
select '00000000-0000-4000-b000-000000000114',gen_random_uuid(),case when n=1 then 'unsupported_kind' else 'full_edit' end,
  gen_random_uuid(),jsonb_build_object('before',null,'after',jsonb_build_object('title','Audit title','media_type','book','notes','new')),
  now() + (n || ' seconds')::interval
from generate_series(1,105) n;

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000114',true);
do $$
declare activity jsonb;
begin
  activity:=public.cdl_v14_activity('00000000-0000-4000-b000-000000000114',300,100);
  if jsonb_array_length(activity->'changelog')<>300 then raise exception 'Changelog limit was not enforced'; end if;
  if jsonb_array_length(activity->'events')<>100 then raise exception 'Audit limit or entity allowlist was not enforced'; end if;
  if activity->'changelog'->0->'headers'->9<>'""'::jsonb or activity->'changelog'->0->'headers'->10<>'""'::jsonb then
    raise exception 'Duplicate blank import headers were not preserved';
  end if;
  if activity->'changelog'->0->>'cells' like '%Must never appear%' then raise exception 'Non-Changelog import content leaked'; end if;
  if (activity->'changelog')::text like '%Old batch marker%' then raise exception 'Changelog rows from an older snapshot were mixed in'; end if;
  if activity->'changelog'->0->>'cells' is null then raise exception 'Null effective cells did not fall back to raw cells'; end if;
  if jsonb_array_length(public.cdl_v14_activity('00000000-0000-4000-b000-000000000114',0,0)->'changelog')<>0 then
    raise exception 'Zero limits were not honored';
  end if;
  begin
    perform public.cdl_v14_activity('00000000-0000-4000-b000-000000000114',301,100);
    raise exception 'Oversized Changelog limit accepted';
  exception when others then if sqlerrm='Oversized Changelog limit accepted' then raise; end if; end;
  begin
    perform public.cdl_v14_activity('00000000-0000-4000-b000-000000000114',300,101);
    raise exception 'Oversized audit limit accepted';
  exception when others then if sqlerrm='Oversized audit limit accepted' then raise; end if; end;
  if jsonb_array_length(public.cdl_v14_activity('00000000-0000-4000-b000-000000000115',300,100)->'events')<>0 then
    raise exception 'Foreign library activity leaked';
  end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000115',true);
do $$ begin
  if jsonb_array_length(public.cdl_v14_activity('00000000-0000-4000-b000-000000000114')->'changelog')<>0 then
    raise exception 'Foreign owner received Changelog';
  end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon','public.cdl_v14_activity(uuid,integer,integer)','EXECUTE') then
    raise exception 'Anonymous activity access granted';
  end if;
end $$;
rollback;
