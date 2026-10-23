-- A separately provisioned Auth identity, never an owner password or service key.
-- Installation creates no worker, enables no schedule and changes no library data.
begin;
create table cdl.nightly_workers (
 user_id uuid primary key references auth.users(id),
 library_id uuid not null unique references cdl.libraries(id),
 enabled boolean not null default false,
 created_at timestamptz not null default now()
);
create table cdl.nightly_jobs (
 id uuid primary key default gen_random_uuid(),
 library_id uuid not null references cdl.libraries(id),
 day date not null default (now() at time zone 'UTC')::date,
 status text not null check(status in ('running','backed-up','completed','review','failed')),
 backup_prefix text check(backup_prefix ~ '^[a-f0-9]{64}$'),
 backup jsonb,
 full_backup jsonb,
 retired_at timestamptz,
 safety_prefix text check(safety_prefix ~ '^[a-f0-9]{64}$'),
 safety_backup jsonb,
 result jsonb,
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 unique(library_id,day)
);
alter table cdl.nightly_workers enable row level security;
alter table cdl.nightly_workers force row level security;
alter table cdl.nightly_jobs enable row level security;
alter table cdl.nightly_jobs force row level security;
revoke all on cdl.nightly_workers,cdl.nightly_jobs from public,anon,authenticated;

-- Only the worker's reserved object prefixes, not another library or arbitrary
-- owner backups. No overwrite or public access. Full-backup deletion has a
-- separate SQL-enforced ten-newest retention rule below.
create function public.cdl_v14_nightly_storage_allowed(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists (
  select 1 from cdl.nightly_workers w join cdl.libraries l on l.id=w.library_id
  join cdl.nightly_jobs j on j.library_id=l.id
  where w.user_id=auth.uid() and w.enabled
   and (p_name ~ ('^'||l.owner_id::text||'/'||l.id::text||'/'||j.backup_prefix||'/[a-f0-9-]{36}\.json\.gz$')
     or p_name ~ ('^'||l.owner_id::text||'/'||l.id::text||'/'||j.safety_prefix||'/[a-f0-9-]{36}\.json\.gz$'))
 );
$$;
revoke all on function public.cdl_v14_nightly_storage_allowed(text) from public,anon;
grant execute on function public.cdl_v14_nightly_storage_allowed(text) to authenticated;
create policy cdl_v14_nightly_insert on storage.objects for insert to authenticated
with check(bucket_id='cdl-v14-recovery' and public.cdl_v14_nightly_storage_allowed(name));
create policy cdl_v14_nightly_select on storage.objects for select to authenticated
using(bucket_id='cdl-v14-recovery' and public.cdl_v14_nightly_storage_allowed(name));

-- Only scheduled full archives beyond the ten newest may be retired. Manual,
-- migration and tracker safety backups are NEVER candidates for this policy.
create function public.cdl_v14_nightly_can_retire(p_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from (
  select j.full_backup->>'path' path,row_number() over(order by j.started_at desc,j.id desc) position
  from cdl.nightly_jobs j join cdl.nightly_workers w on w.library_id=j.library_id
  where w.user_id=auth.uid() and w.enabled and j.full_backup is not null and j.retired_at is null
 ) ranked where path=p_name and position>10);
$$;
revoke all on function public.cdl_v14_nightly_can_retire(text) from public,anon;
grant execute on function public.cdl_v14_nightly_can_retire(text) to authenticated;
create policy cdl_v14_nightly_retire on storage.objects for delete to authenticated
using(bucket_id='cdl-v14-recovery' and public.cdl_v14_nightly_can_retire(name));

create function public.cdl_v14_nightly_rpc(p_call text,p_args jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 v_worker uuid:=auth.uid(); v_owner uuid; v_library uuid; v_result jsonb;
 v_claims text:=current_setting('request.jwt.claims',true);
 v_sub text:=current_setting('request.jwt.claim.sub',true);
 v_job cdl.nightly_jobs; v_table record; v_tables jsonb; v_export text:='';
 v_proc record; v_parameters text; v_latest jsonb;
begin
 select l.owner_id,l.id into v_owner,v_library from cdl.nightly_workers w
 join cdl.libraries l on l.id=w.library_id where w.user_id=v_worker and w.enabled;
 if v_owner is null or v_owner=v_worker then raise exception 'Nightly worker unavailable';end if;
 if p_args is null or jsonb_typeof(p_args)<>'object' or octet_length(p_args::text)>10000000 then raise exception 'Invalid worker arguments';end if;
 if p_call='bootstrap' then
  return jsonb_build_object('workerId',v_worker,'ownerId',v_owner,'libraryId',v_library,'sheetId','1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0');
 end if;
 if p_call='claim' then
  insert into cdl.nightly_jobs(library_id,status) values(v_library,'running') on conflict(library_id,day) do nothing returning * into v_job;
  if not found then return jsonb_build_object('claimed',false);end if;
  select full_backup into v_latest from cdl.nightly_jobs where library_id=v_library and full_backup is not null and retired_at is null order by started_at desc,id desc limit 1;
  return jsonb_build_object('claimed',true,'jobId',v_job.id,'day',v_job.day,'fullBackup',v_latest,
   'backupDue',v_latest is null or ((v_latest->>'capturedAt')::timestamptz at time zone 'UTC')::date<=(now() at time zone 'UTC')::date-7);
 end if;
 if p_call='rotation-candidates' then
  return (select coalesce(jsonb_agg(full_backup),'[]'::jsonb) from cdl.nightly_jobs where library_id=v_library and retired_at is null
   and public.cdl_v14_nightly_can_retire(full_backup->>'path'));
 end if;
 if p_call='rotation-confirm' then
  if not public.cdl_v14_nightly_can_retire(p_args->>'path') or exists(select 1 from storage.objects where bucket_id='cdl-v14-recovery' and name=p_args->>'path') then raise exception 'Backup retirement not confirmed';end if;
  update cdl.nightly_jobs set retired_at=clock_timestamp() where library_id=v_library and full_backup->>'path'=p_args->>'path';
  return jsonb_build_object('retired',true);
 end if;
 if p_call in ('snapshot','backup-start','backup-confirm','backup-reference','safety-start','safety-confirm','finish','fail') then
  select * into v_job from cdl.nightly_jobs where id=(p_args->>'jobId')::uuid and library_id=v_library for update;
  if not found or v_job.status not in ('running','backed-up') then raise exception 'Nightly job is not active';end if;
  if p_call='snapshot' then
   -- One MVCC statement exports ALL raw library records, including archived
   -- items, notes, identifiers, metadata, progress, collections and sync state.
   -- Auth credentials, Storage bytes, operational workers/jobs are excluded.
   for v_table in
    select c.table_name from information_schema.columns c where c.table_schema='cdl' and c.column_name='library_id'
      and c.table_name not in ('nightly_workers','nightly_jobs') order by c.table_name
   loop
    v_export:=v_export||format('%L,(select coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text),''[]''::jsonb) from cdl.%I r where library_id=$1),',v_table.table_name,v_table.table_name);
   end loop;
   -- A single data SELECT shares one MVCC snapshot across ALL tables, unlike
   -- separate SPI reads in this volatile gateway under READ COMMITTED.
   execute 'select jsonb_build_object(''format'',''cdl-library-backup-v1'',''libraryId'',$1,''ownerId'',$2,''capturedAt'',clock_timestamp(),
    ''migrations'',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),
    ''tables'',jsonb_build_object('||v_export||'''libraries'',(select jsonb_agg(to_jsonb(l)) from cdl.libraries l where id=$1)))'
    into v_tables using v_library,v_owner;
   return v_tables;
  end if;
  if p_call='backup-reference' then
   if v_job.status<>'running' or not exists(select 1 from cdl.nightly_jobs where library_id=v_library and full_backup=p_args->'receipt' and retired_at is null
     and (full_backup->>'capturedAt')::timestamptz>clock_timestamp()-interval '7 days') then raise exception 'Recent verified full backup required';end if;
   update cdl.nightly_jobs set status='backed-up',backup=p_args->'receipt' where id=v_job.id;
   return jsonb_build_object('confirmed',true);
  end if;
  if p_call in ('backup-start','safety-start') then
   if (p_call='backup-start' and (v_job.status<>'running' or v_job.backup_prefix is not null))
      or (p_call='safety-start' and (v_job.status<>'backed-up' or v_job.safety_prefix is not null))
      or coalesce(p_args->>'prefix','')!~'^[a-f0-9]{64}$'
      or (p_args->>'bytes')::bigint not between 1 and 24000000 then raise exception 'Invalid backup reservation';end if;
   -- Stop before free Storage fills; never delete merely to make room.
   if (select coalesce(sum(case when metadata->>'size' ~ '^[0-9]+$' then (metadata->>'size')::bigint else 24000000 end),0)
       from storage.objects where bucket_id='cdl-v14-recovery')+(p_args->>'bytes')::bigint>200000000 then raise exception 'Recovery storage safety limit reached';end if;
   if p_call='backup-start' then update cdl.nightly_jobs set backup_prefix=p_args->>'prefix' where id=v_job.id;
   else update cdl.nightly_jobs set safety_prefix=p_args->>'prefix' where id=v_job.id;end if;
   return jsonb_build_object('reserved',true);
  end if;
  if p_call in ('backup-confirm','safety-confirm') then
   if (p_call='backup-confirm' and (v_job.status<>'running' or v_job.backup_prefix is null or p_args->'receipt'->>'format' is distinct from 'cdl-library-backup-v1'))
     or (p_call='safety-confirm' and (v_job.status<>'backed-up' or v_job.safety_prefix is null))
     or p_args->'receipt'->>'bucket' is distinct from 'cdl-v14-recovery'
     or coalesce(p_args->'receipt'->>'path','') !~ ('^'||v_owner::text||'/'||v_library::text||'/'||(case when p_call='backup-confirm' then v_job.backup_prefix else v_job.safety_prefix end)||'/[a-f0-9-]{36}\.json\.gz$')
     or coalesce(p_args->'receipt'->>'sha256','')!~'^[a-f0-9]{64}$'
     or not exists(select 1 from storage.objects where bucket_id='cdl-v14-recovery' and name=p_args->'receipt'->>'path'
       and (metadata->>'size')::bigint=(p_args->'receipt'->>'bytes')::bigint) then raise exception 'Private backup receipt unavailable';end if;
   if p_call='backup-confirm' then update cdl.nightly_jobs set status='backed-up',backup=p_args->'receipt',full_backup=p_args->'receipt' where id=v_job.id;
   else update cdl.nightly_jobs set safety_backup=p_args->'receipt' where id=v_job.id;end if;
   return jsonb_build_object('confirmed',true);
  end if;
  if p_call='finish' then
   if v_job.status<>'backed-up' or p_args->>'status' not in ('completed','review') or p_args->'result' is null then raise exception 'Confirmed backup required';end if;
   update cdl.nightly_jobs set status=p_args->>'status',result=p_args->'result',finished_at=clock_timestamp() where id=v_job.id;
  else
   update cdl.nightly_jobs set status='failed',result=jsonb_build_object('message','Nightly run stopped; inspect before retrying.'),finished_at=clock_timestamp() where id=v_job.id;
  end if;
  return jsonb_build_object('recorded',true);
 end if;
 -- Fixed allowlist of existing audited/CAS APIs. No DDL, arbitrary SQL, account
 -- management, deletion, notes writes, metadata refresh or another library.
 if not p_call=any(array['cdl_v14_snapshot_guard','cdl_v14_snapshot_page','cdl_v14_tracker_baselines',
   'cdl_v14_tracker_run_context','cdl_v14_get_item','cdl_v14_save_setting','cdl_v14_full_edit',
   'cdl_v14_tracker_claim','cdl_v14_tracker_confirm']) then raise exception 'Worker operation denied';end if;
 if p_args ? 'p_library_id' and p_args->>'p_library_id' is distinct from v_library::text then raise exception 'Worker library denied';end if;
 if p_args ? 'p_id' and not exists(select 1 from cdl.items where id=(p_args->>'p_id')::uuid and library_id=v_library) then raise exception 'Worker item denied';end if;
 if p_call='cdl_v14_save_setting' and coalesce(p_args->>'p_key','') !~ '^__cdl_tracker_(mixed_v1:|mixed_part_v1:|run_v1:|backup_v1:)' then raise exception 'Worker setting denied';end if;
 if p_call='cdl_v14_full_edit' and (p_args->'p_patch' ?| array['notes','title'] or p_args->'p_patch'->'overrides' ?| array['Notes','notes']) then raise exception 'Worker field denied';end if;
 if p_call in ('cdl_v14_save_setting','cdl_v14_full_edit','cdl_v14_tracker_claim','cdl_v14_tracker_confirm')
   and not exists(select 1 from cdl.nightly_jobs where library_id=v_library and status='backed-up' and safety_backup is not null and day=(now() at time zone 'UTC')::date) then raise exception 'Confirmed nightly backup required';end if;
 -- Only resolve a single known function with exactly the supplied named args.
 select p.oid,p.proargnames,p.proargtypes into v_proc from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname=p_call and
  (select array_agg(k order by k) from jsonb_object_keys(p_args) k)=(select array_agg(k order by k) from unnest(p.proargnames) k);
 if not found then raise exception 'Worker signature denied';end if;
 -- JSON needs -> (not ->>) to retain scalar/null/object types.
 select string_agg(case when v_proc.proargtypes[i-1]='jsonb'::regtype then format('%I => ($1->%L)',v_proc.proargnames[i],v_proc.proargnames[i])
  else format('%I => ($1->>%L)::%s',v_proc.proargnames[i],v_proc.proargnames[i],format_type(v_proc.proargtypes[i-1],null)) end,',' order by i)
  into v_parameters from generate_subscripts(v_proc.proargnames,1) i;
 perform set_config('request.jwt.claim.sub',v_owner::text,true);
 perform set_config('request.jwt.claims',jsonb_build_object('sub',v_owner,'role','authenticated')::text,true);
 execute format('select to_jsonb(public.%I(%s))',p_call,v_parameters) into v_result using p_args;
 perform set_config('request.jwt.claim.sub',coalesce(v_sub,''),true);
 perform set_config('request.jwt.claims',coalesce(v_claims,''),true);
 return v_result;
end $$;
revoke all on function public.cdl_v14_nightly_rpc(text,jsonb) from public,anon;
grant execute on function public.cdl_v14_nightly_rpc(text,jsonb) to authenticated;
-- Owner-visible operational receipt, never credentials or archived contents.
create function public.cdl_v14_nightly_status(p_library_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_job cdl.nightly_jobs;
begin
 if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library unavailable';end if;
 select * into v_job from cdl.nightly_jobs where library_id=p_library_id order by started_at desc limit 1;
 return jsonb_build_object('enabled',exists(select 1 from cdl.nightly_workers where library_id=p_library_id and enabled),
  'status',v_job.status,'startedAt',v_job.started_at,'finishedAt',v_job.finished_at,
  'backupAt',v_job.backup->>'capturedAt','syncedItems',v_job.result->'syncedItems','heldItems',v_job.result->'heldItems');
end $$;
revoke all on function public.cdl_v14_nightly_status(uuid) from public,anon;
grant execute on function public.cdl_v14_nightly_status(uuid) to authenticated;
create function public.cdl_v14_backups(p_library_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library unavailable';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'receipt',full_backup) order by started_at desc),'[]'::jsonb)
  from (select id,full_backup,started_at from cdl.nightly_jobs where library_id=p_library_id and full_backup is not null and retired_at is null order by started_at desc,id desc limit 10) b);
end $$;
revoke all on function public.cdl_v14_backups(uuid) from public,anon;
grant execute on function public.cdl_v14_backups(uuid) to authenticated;
commit;
