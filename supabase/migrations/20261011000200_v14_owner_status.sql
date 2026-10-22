begin;
-- Narrow read-only RPC, not schema exposure or table grants. Ownership is
-- checked inside the function; caller-supplied owner/library IDs are impossible.
create function public.cdl_v14_my_libraries()
returns table(id uuid, name text, item_count bigint)
language sql stable security definer set search_path = ''
as $$
  select l.id, l.name,
    (select count(*) from cdl.items i where i.library_id = l.id and i.deleted_at is null)
  from cdl.libraries l
  where l.owner_id = (select auth.uid());
$$;
revoke all on function public.cdl_v14_my_libraries() from public, anon;
grant execute on function public.cdl_v14_my_libraries() to authenticated;
comment on function public.cdl_v14_my_libraries() is 'v14 test: read only own library readiness. Does not grant access to import provenance or writes.';
commit;
