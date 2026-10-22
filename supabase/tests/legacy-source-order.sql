begin;
insert into auth.users(id) values('00000000-0000-4000-a000-000000000051');
insert into cdl.libraries(id,owner_id,name) values('00000000-0000-4000-b000-000000000051','00000000-0000-4000-a000-000000000051','Source order regression');
insert into cdl.import_batches(id,library_id,source_sheet_id,snapshot_sha256,captured_at)
values('00000000-0000-4000-d000-000000000051','00000000-0000-4000-b000-000000000051','fixture',repeat('a',64),now());
insert into cdl.import_rows(id,library_id,batch_id,tab,source_row,headers,raw_cells) values
('00000000-0000-4000-f000-000000000051','00000000-0000-4000-b000-000000000051','00000000-0000-4000-d000-000000000051','Games',20,'[]','[]'),
('00000000-0000-4000-f000-000000000052','00000000-0000-4000-b000-000000000051','00000000-0000-4000-d000-000000000051','Games',10,'[]','[]');
insert into cdl.items(id,library_id,media_type,title,import_row_id) values
('00000000-0000-4000-c000-000000000052','00000000-0000-4000-b000-000000000051','game','Later source row','00000000-0000-4000-f000-000000000051'),
('00000000-0000-4000-c000-000000000053','00000000-0000-4000-b000-000000000051','game','Earlier source row','00000000-0000-4000-f000-000000000052'),
('00000000-0000-4000-c000-000000000051','00000000-0000-4000-b000-000000000051','game','New app item',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000051',true);
do $$ declare rows jsonb:='[]'; part jsonb; n integer; begin
 for n in 0..2 loop
  part:=public.cdl_v14_snapshot_page('00000000-0000-4000-b000-000000000051','items',n,1);
  rows:=rows||(part->'rows');
 end loop;
 if rows->0->>'title'<>'Earlier source row' or rows->1->>'title'<>'Later source row' or rows->2->>'title'<>'New app item' then raise exception 'Imported source order lost across page boundaries'; end if;
 if exists(select 1 from jsonb_array_elements(rows) r where r ? 'import_row_id' or r ? 'legacy_source_position' or r ? 'raw_cells') then raise exception 'Private import fields leaked'; end if;
 if jsonb_array_length(rows)<>3 then raise exception 'Items lost or duplicated'; end if;
end $$;
reset role;
rollback;
