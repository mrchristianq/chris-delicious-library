-- Run on the isolated test project only; all fixture writes roll back.
begin;
do $$
declare
  u uuid := gen_random_uuid();
  l uuid := gen_random_uuid();
  i uuid := gen_random_uuid();
  n integer;
begin
  select count(*) into n from pg_tables where schemaname='cdl';
  if n <> 19 then raise exception 'Expected 19 foundation tables, got %',n; end if;
  if exists(select 1 from pg_class c join pg_namespace s on s.oid=c.relnamespace
      where s.nspname='cdl' and c.relkind='r' and (not c.relrowsecurity or not c.relforcerowsecurity))
    then raise exception 'Missing RLS'; end if;
  if has_schema_privilege('anon','cdl','USAGE') or has_schema_privilege('authenticated','cdl','USAGE')
    then raise exception 'Client schema exposure'; end if;
  if exists(select 1 from information_schema.role_table_grants
      where table_schema='cdl' and grantee in ('anon','authenticated','PUBLIC'))
    then raise exception 'Client table exposure'; end if;
  insert into auth.users(id) values(u);
  insert into cdl.libraries(id,owner_id,name) values(l,u,'ROLLBACK ONLY');
  insert into cdl.items(id,library_id,media_type,title,personal_rating)
    values(i,l,'book','Fixture',0);
  begin
    update cdl.items set personal_rating=9 where id=i;
    raise exception 'Book scale accepted invalid rating';
  exception when check_violation then null; end;
  begin
    insert into cdl.sync_targets(library_id,sheet_id,approved_columns)
      values(l,'PRODUCTION-NOT-ALLOWED','{}');
    raise exception 'Foreign sheet accepted';
  exception when check_violation then null; end;
  begin
    insert into cdl.sync_targets(library_id,sheet_id,enabled,approved_columns)
      values(l,'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0',true,'{}');
    raise exception 'Sync enabled prematurely';
  exception when check_violation then null; end;
end $$;
rollback;
select 'foundation constraints and access guards passed; fixtures rolled back' as result;
