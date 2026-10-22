begin;
-- A row-version manifest cannot observe a transient row inserted and deleted
-- between requests. Also bracket pages with the database's transaction snapshot.
-- Read-only requests do not allocate transaction IDs. Unrelated writes may
-- conservatively cause a fresh retry; no mixed-version data is accepted.
create function public.cdl_v14_snapshot_guard(p_library_id uuid)
returns jsonb language sql stable security definer set search_path='' as $$
  select public.cdl_v14_snapshot_manifest(p_library_id)
    || jsonb_build_object('transaction_token',pg_current_snapshot()::text);
$$;
revoke all on function public.cdl_v14_snapshot_guard(uuid) from public,anon;
grant execute on function public.cdl_v14_snapshot_guard(uuid) to authenticated;
notify pgrst, 'reload schema';
commit;
