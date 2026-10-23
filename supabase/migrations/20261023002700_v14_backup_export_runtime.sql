-- Avoid sorting entire large provenance/plan JSON values: row order is not
-- recovery data; stable IDs/positions and every raw field remain unchanged.
begin;
do $$ declare source text;needle text:='jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)';begin
 source:=pg_get_functiondef('public.cdl_v14_nightly_rpc(text,jsonb)'::regprocedure);
 if (length(source)-length(replace(source,needle,'')))/length(needle)<>1 then raise exception 'Unexpected nightly export definition';end if;
 execute replace(source,needle,'jsonb_agg(to_jsonb(r))');
end $$;
-- Function-scoped REST exemption; ordinary app/anon role timeouts unchanged.
alter function public.cdl_v14_nightly_rpc(text,jsonb) set statement_timeout='60s';
create function public.cdl_v14_nightly_retry_empty(p_job_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_library uuid;v_job cdl.nightly_jobs;v_latest jsonb;
begin
 select library_id into v_library from cdl.nightly_workers where user_id=auth.uid() and enabled;
 if v_library is null then raise exception 'Worker unavailable';end if;
 select * into v_job from cdl.nightly_jobs where id=p_job_id and library_id=v_library for update;
 if not found or v_job.status<>'failed' or v_job.backup_prefix is not null or v_job.safety_prefix is not null
  or v_job.backup is not null or v_job.day<>(now() at time zone 'UTC')::date
  or exists(select 1 from cdl.sync_runs where library_id=v_library and status='running') then raise exception 'Saved run requires manual review; empty retry denied';end if;
 update cdl.nightly_jobs set status='running',started_at=clock_timestamp(),finished_at=null,
  result=jsonb_build_object('previousAttempt',jsonb_build_object('startedAt',v_job.started_at,'finishedAt',v_job.finished_at,'result',v_job.result)) where id=v_job.id;
 select full_backup into v_latest from cdl.nightly_jobs where library_id=v_library and full_backup is not null and retired_at is null order by started_at desc,id desc limit 1;
 return jsonb_build_object('claimed',true,'jobId',v_job.id,'day',v_job.day,'fullBackup',v_latest,
  'backupDue',v_latest is null or ((v_latest->>'capturedAt')::timestamptz at time zone 'UTC')::date<=(now() at time zone 'UTC')::date-7);
end $$;
revoke all on function public.cdl_v14_nightly_retry_empty(uuid) from public,anon;
grant execute on function public.cdl_v14_nightly_retry_empty(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
