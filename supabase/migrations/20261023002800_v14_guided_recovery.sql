-- Owner-only recovery. No automatic/live restore is performed by installation.
begin;
create table cdl.recovery_backups (
 id uuid primary key, library_id uuid not null references cdl.libraries(id),
 kind text not null check(kind in ('manual','before-restore')),
 receipt jsonb not null, summary jsonb not null, state_digest text not null,
 created_at timestamptz not null default clock_timestamp()
);
create table cdl.recovery_previews (
 id uuid primary key, library_id uuid not null references cdl.libraries(id), backup_id uuid not null,
 state_digest text not null, target_digest text not null,
 created_at timestamptz not null default clock_timestamp(), restored_at timestamptz,
 safety_id uuid references cdl.recovery_backups(id)
);
alter table cdl.recovery_backups enable row level security;
alter table cdl.recovery_backups force row level security;
alter table cdl.recovery_previews enable row level security;
alter table cdl.recovery_previews force row level security;
revoke all on cdl.recovery_backups,cdl.recovery_previews from public,anon,authenticated;

create function public.cdl_v14_recovery_snapshot(p_library_id uuid) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='60s' as $$
declare v_owner uuid;v_table text;v_sql text:='';v_result jsonb;
begin
 select owner_id into v_owner from cdl.libraries where id=p_library_id and owner_id=auth.uid();
 if v_owner is null then raise exception 'Library unavailable';end if;
 foreach v_table in array array['items','item_metadata','identifiers','episodes','episode_progress','settings','collections','collection_items','assets','import_batches','import_rows','import_issues','change_events','sync_targets','sync_outbox','sync_baselines','sync_runs','sync_conflicts'] loop
  v_sql:=v_sql||format('%L,(select coalesce(jsonb_agg(to_jsonb(r) order by coalesce(to_jsonb(r)->>''id'',to_jsonb(r)->>''item_id'',to_jsonb(r)->>''episode_id'',to_jsonb(r)->>''key''),to_jsonb(r)->>''collection_id'',to_jsonb(r)->>''target_id''),''[]''::jsonb) from cdl.%I r where library_id=$1),',v_table,v_table);
 end loop;
 execute 'select jsonb_build_object(''format'',''cdl-library-backup-v1'',''libraryId'',$1,''ownerId'',$2,''capturedAt'',clock_timestamp(),''migrations'',(select jsonb_agg(version order by version) from supabase_migrations.schema_migrations),''tables'',jsonb_build_object('||v_sql||'''libraries'',(select jsonb_agg(to_jsonb(l)) from cdl.libraries l where id=$1)))' into v_result using p_library_id,v_owner;
 return v_result||jsonb_build_object('stateDigest',md5((v_result->'tables')::text));
end $$;

create function public.cdl_v14_recovery_register(p_library_id uuid,p_id uuid,p_kind text,p_receipt jsonb,p_summary jsonb,p_digest text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_owner uuid;v_existing cdl.recovery_backups;
begin
 select owner_id into v_owner from cdl.libraries where id=p_library_id and owner_id=auth.uid();
 if v_owner is null then raise exception 'Library unavailable';end if;
 select * into v_existing from cdl.recovery_backups where id=p_id;
 if found then
  if v_existing.library_id<>p_library_id or v_existing.kind<>p_kind then raise exception 'Request mismatch';end if;
  return jsonb_build_object('id',v_existing.id,'receipt',v_existing.receipt,'summary',v_existing.summary,'kind',v_existing.kind);
 end if;
 if p_kind not in ('manual','before-restore') or p_digest!~'^[a-f0-9]{32}$' or p_receipt->>'format' is distinct from 'cdl-library-backup-v1'
 or p_receipt->>'bucket' is distinct from 'cdl-v14-recovery' or coalesce(p_receipt->>'path','') !~ ('^'||v_owner::text||'/'||p_library_id::text||'/[a-f0-9]{64}/[a-f0-9-]{36}\.json\.gz$')
 or not exists(select 1 from storage.objects where bucket_id='cdl-v14-recovery' and name=p_receipt->>'path' and (metadata->>'size')::bigint=(p_receipt->>'bytes')::bigint)
 then raise exception 'Verified private backup required';end if;
 if (select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects where bucket_id='cdl-v14-recovery' and name like v_owner::text||'/'||p_library_id::text||'/%')>200000000 then raise exception 'Recovery storage budget exceeded';end if;
 insert into cdl.recovery_backups(id,library_id,kind,receipt,summary,state_digest) values(p_id,p_library_id,p_kind,p_receipt,p_summary,p_digest);
 return jsonb_build_object('id',p_id,'receipt',p_receipt,'summary',p_summary,'kind',p_kind);
end $$;

create or replace function public.cdl_v14_backups(p_library_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library unavailable';end if;
 return (select coalesce(jsonb_agg(jsonb_build_object('id',id,'receipt',receipt,'summary',summary,'kind',kind) order by captured desc),'[]'::jsonb) from (
 select id,receipt,summary,kind,(receipt->>'capturedAt')::timestamptz captured from cdl.recovery_backups where library_id=p_library_id
 union all select id,full_backup,null,'scheduled',(full_backup->>'capturedAt')::timestamptz from cdl.nightly_jobs where library_id=p_library_id and full_backup is not null and retired_at is null
 ) b);
end $$;

create function public.cdl_v14_recovery_preview(p_library_id uuid,p_backup_id uuid,p_target jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='60s' as $$
declare v_current jsonb;v_id uuid:=gen_random_uuid();
begin
 v_current:=public.cdl_v14_recovery_snapshot(p_library_id);
 if jsonb_typeof(p_target->'migrations') is distinct from 'array' or not (v_current->'migrations') @> (p_target->'migrations') then raise exception 'Backup requires a newer schema';end if;
 if not exists(select 1 from jsonb_array_elements(public.cdl_v14_backups(p_library_id)) r where r->>'id'=p_backup_id::text)
 or p_target->>'ownerId' is distinct from auth.uid()::text or p_target->>'libraryId' is distinct from p_library_id::text then raise exception 'Backup unavailable';end if;
 insert into cdl.recovery_previews(id,library_id,backup_id,state_digest,target_digest) values(v_id,p_library_id,p_backup_id,md5((v_current->'tables')::text),md5(p_target::text));
 return jsonb_build_object('token',v_id,'current',v_current);
end $$;

create function public.cdl_v14_recovery_restore(p_library_id uuid,p_token uuid,p_safety_id uuid,p_target jsonb) returns jsonb
language plpgsql security definer set search_path='' set statement_timeout='60s' set lock_timeout='5s' as $$
declare v_preview cdl.recovery_previews;v_current jsonb;v_table text;v_row jsonb;v_columns text;v_updates text;v_max bigint;v_target jsonb;v_matches boolean;
begin
 if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library unavailable';end if;
 -- Block concurrent owner writes and nightly claims for the short atomic swap.
 lock table cdl.items,cdl.item_metadata,cdl.identifiers,cdl.episodes,cdl.episode_progress,cdl.settings,cdl.collections,cdl.collection_items,cdl.assets,cdl.import_batches,cdl.import_rows,cdl.import_issues,cdl.change_events,cdl.sync_targets,cdl.sync_outbox,cdl.sync_baselines,cdl.sync_runs,cdl.sync_conflicts,cdl.nightly_workers,cdl.nightly_jobs in share row exclusive mode;
 select * into v_preview from cdl.recovery_previews where id=p_token and library_id=p_library_id for update;
 if not found then raise exception 'Restore preview unavailable';end if;
 if v_preview.restored_at is not null then return jsonb_build_object('confirmed',true,'token',p_token,'restoredAt',v_preview.restored_at,'safetyId',v_preview.safety_id);end if;
 if v_preview.created_at<clock_timestamp()-interval '30 minutes' or md5(p_target::text)<>v_preview.target_digest then raise exception 'Restore preview expired or changed';end if;
 if exists(select 1 from cdl.nightly_jobs where library_id=p_library_id and status in ('running','backed-up')) or exists(select 1 from cdl.sync_runs where library_id=p_library_id and status in ('running','pending')) then raise exception 'Finish the active sync before restoring';end if;
 v_current:=public.cdl_v14_recovery_snapshot(p_library_id);
 if md5((v_current->'tables')::text)<>v_preview.state_digest or not exists(select 1 from cdl.recovery_backups where id=p_safety_id and library_id=p_library_id and kind='before-restore' and state_digest=v_preview.state_digest and created_at>v_preview.created_at) then raise exception 'Library changed; preview again before restoring';end if;
 if p_target->>'format' is distinct from 'cdl-library-backup-v1' or p_target->>'ownerId' is distinct from auth.uid()::text or p_target->>'libraryId' is distinct from p_library_id::text then raise exception 'Backup scope invalid';end if;
 foreach v_table in array array['import_batches','import_rows','items','item_metadata','identifiers','episodes','episode_progress','settings','collections','collection_items','assets'] loop
  if jsonb_typeof(p_target->'tables'->v_table) is distinct from 'array' then raise exception 'Incomplete backup';end if;
  for v_row in select value from jsonb_array_elements(p_target->'tables'->v_table) loop
   if v_row->>'library_id' is distinct from p_library_id::text then raise exception 'Mixed library backup';end if;
  end loop;
 end loop;
 -- Keep existing sync/audit/provenance, and item IDs referenced by history.
 -- Items absent from the version are archived, never destructively deleted.
 update cdl.items set deleted_at=clock_timestamp(),revision=revision+1,updated_at=clock_timestamp() where library_id=p_library_id and not exists(select 1 from jsonb_array_elements(p_target->'tables'->'items') r where r->>'id'=cdl.items.id::text);
 select greatest(coalesce((select max(revision) from cdl.items where library_id=p_library_id),0),coalesce((select max(revision) from cdl.settings where library_id=p_library_id),0),coalesce((select max(revision) from cdl.episode_progress where library_id=p_library_id),0))+1 into v_max;
 -- Remove dependent view data; retain episodes themselves for historic references.
 delete from cdl.collection_items where library_id=p_library_id;
 delete from cdl.collections where library_id=p_library_id;
 delete from cdl.assets where library_id=p_library_id;
 delete from cdl.identifiers where library_id=p_library_id;
 delete from cdl.item_metadata where library_id=p_library_id;
 delete from cdl.episode_progress where library_id=p_library_id;
 delete from cdl.episodes where library_id=p_library_id;
 delete from cdl.settings where library_id=p_library_id and key not like '\_\_cdl\_%';
 foreach v_table in array array['import_batches','import_rows','items','item_metadata','identifiers','episodes','episode_progress','settings','collections','collection_items','assets'] loop
  v_target:=p_target->'tables'->v_table;
  if v_table='settings' then select coalesce(jsonb_agg(r),'[]'::jsonb) into v_target from jsonb_array_elements(v_target) r where r->>'key' not like '\_\_cdl\_%';end if;
  if v_table in ('items','settings','episode_progress') then select coalesce(jsonb_agg(r||jsonb_build_object('revision',greatest(v_max,coalesce((r->>'revision')::bigint,0)+1))),'[]'::jsonb) into v_target from jsonb_array_elements(v_target) r;end if;
  select string_agg(format('%I',column_name),',' order by ordinal_position),string_agg(format('%I=excluded.%I',column_name,column_name),',' order by ordinal_position) into v_columns,v_updates from information_schema.columns where table_schema='cdl' and table_name=v_table;
  if v_table in ('items','episodes') then
   execute format('insert into cdl.%I select * from jsonb_populate_recordset(null::cdl.%I,$1) on conflict(id) do update set %s where cdl.%I.library_id=$2',v_table,v_table,v_updates,v_table) using v_target,p_library_id;
  elsif v_table in ('import_batches','import_rows') then
   execute format('insert into cdl.%I select * from jsonb_populate_recordset(null::cdl.%I,$1) on conflict(id) do nothing',v_table,v_table) using v_target;
  else
   execute format('insert into cdl.%I select * from jsonb_populate_recordset(null::cdl.%I,$1)',v_table,v_table) using v_target;
  end if;
  execute format('select not exists((select value from jsonb_array_elements($1)) except (select to_jsonb(actual) from cdl.%I actual where actual.library_id=$2))',v_table) into v_matches using v_target,p_library_id;
  if not v_matches then raise exception 'Restored records did not verify: %',v_table;end if;
 end loop;
 -- Preserve baseline/history but invalidate saved decisions and paused plans.
 delete from cdl.settings where library_id=p_library_id and key like '\_\_cdl\_tracker\_%';
 update cdl.nightly_workers set enabled=false where library_id=p_library_id;
 insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes) values(p_library_id,p_token,'library-restore',p_library_id,jsonb_build_object('backupId',v_preview.backup_id,'safetyId',p_safety_id,'sheetUnchanged',true));
 update cdl.recovery_previews set restored_at=clock_timestamp(),safety_id=p_safety_id where id=p_token returning * into v_preview;
 return jsonb_build_object('confirmed',true,'token',p_token,'restoredAt',v_preview.restored_at,'safetyId',p_safety_id);
end $$;
revoke all on function public.cdl_v14_recovery_snapshot(uuid),public.cdl_v14_recovery_register(uuid,uuid,text,jsonb,jsonb,text),public.cdl_v14_recovery_preview(uuid,uuid,jsonb),public.cdl_v14_recovery_restore(uuid,uuid,uuid,jsonb) from public,anon;
grant execute on function public.cdl_v14_recovery_snapshot(uuid),public.cdl_v14_recovery_register(uuid,uuid,text,jsonb,jsonb,text),public.cdl_v14_recovery_preview(uuid,uuid,jsonb),public.cdl_v14_recovery_restore(uuid,uuid,uuid,jsonb) to authenticated;
-- Keep operational recovery catalogs out of the nightly archive, avoiding
-- recursive receipts and preview state becoming restored library data.
do $$ declare source text;begin
 source:=pg_get_functiondef('public.cdl_v14_nightly_rpc(text,jsonb)'::regprocedure);
 if position('(''nightly_workers'',''nightly_jobs'')' in source)=0 then raise exception 'Unexpected export definition';end if;
 execute replace(source,'(''nightly_workers'',''nightly_jobs'')','(''nightly_workers'',''nightly_jobs'',''recovery_backups'',''recovery_previews'')');
end $$;
notify pgrst,'reload schema';
commit;
