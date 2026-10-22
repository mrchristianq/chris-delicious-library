-- Disposable local DB only; fixture users and libraries always roll back.
begin;
insert into auth.users (id) values ('00000000-0000-4000-a000-000000000014'), ('00000000-0000-4000-a000-000000000015');
insert into cdl.libraries (id, owner_id, name) values ('00000000-0000-4000-b000-000000000014', '00000000-0000-4000-a000-000000000014', 'Local owner fixture');
insert into cdl.items (library_id, media_type, title) values ('00000000-0000-4000-b000-000000000014','book','Local test');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000014', true);
do $$ begin
  if (select count(*) from public.cdl_v14_my_libraries()) <> 1 or (select item_count from public.cdl_v14_my_libraries()) <> 1 then raise exception 'Owner status failed'; end if;
  if has_schema_privilege(current_user, 'cdl', 'USAGE') then raise exception 'Private schema exposed'; end if;
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-4000-a000-000000000015', true);
do $$ begin
  if exists(select 1 from public.cdl_v14_my_libraries()) then raise exception 'Cross-owner leak'; end if;
end $$;
reset role;
do $$ begin
  if has_function_privilege('anon', 'public.cdl_v14_my_libraries()', 'EXECUTE') then raise exception 'Anonymous access granted'; end if;
end $$;
rollback;
