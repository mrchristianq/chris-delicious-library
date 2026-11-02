begin;
-- Counters only: no library records or watched progress are modified.
create table cdl.episode_refresh_limits (
  owner_id uuid not null references auth.users(id) on delete cascade,
  stage text not null check (stage in ('provider','metadata')),
  key text not null,
  window_started timestamptz not null,
  last_attempt timestamptz not null,
  attempts integer not null check (attempts > 0),
  primary key(owner_id,stage,key)
);
alter table cdl.episode_refresh_limits enable row level security;
revoke all on cdl.episode_refresh_limits from public, anon, authenticated;

create function public.cdl_v14_episode_refresh_guard(p_stage text, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid();
  stamp timestamptz;
  counter cdl.episode_refresh_limits;
  bucket text;
  retry integer := 0;
  elapsed double precision;
begin
  if uid is null then raise exception 'Authentication required'; end if;
  if p_stage is null or p_stage not in ('provider','metadata') or p_key is null or
     (p_stage='provider' and p_key !~ '^[1-9][0-9]{0,14}$') or
     (p_stage='metadata' and p_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'Invalid episode refresh identity';
  end if;
  -- Serialize counters for this user, including simultaneous cold server instances.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 103));
  stamp := clock_timestamp();
  -- Bound storage; expired counters have no bearing on current limits.
  delete from cdl.episode_refresh_limits where owner_id=uid and last_attempt < stamp - interval '2 days';
  foreach bucket in array array['*',p_key] loop
    select * into counter from cdl.episode_refresh_limits where owner_id=uid and stage=p_stage and key=bucket;
    if found then
      elapsed := extract(epoch from (stamp-counter.window_started));
      if bucket='*' and elapsed < 3600 and counter.attempts >= 400 then
        retry := greatest(retry,ceil(3600-elapsed)::integer);
      elsif bucket<>'*' then
        retry := greatest(retry,ceil(60-extract(epoch from (stamp-counter.last_attempt)))::integer);
        if elapsed < 86400 and counter.attempts >= 6 then
          retry := greatest(retry,ceil(86400-elapsed)::integer);
        end if;
      end if;
    end if;
  end loop;
  if retry > 0 then return jsonb_build_object('retry_after',retry); end if;
  foreach bucket in array array['*',p_key] loop
    insert into cdl.episode_refresh_limits values(uid,p_stage,bucket,stamp,stamp,1)
    on conflict(owner_id,stage,key) do update set
      attempts=case when episode_refresh_limits.window_started <= stamp - (case when bucket='*' then interval '1 hour' else interval '1 day' end) then 1 else episode_refresh_limits.attempts+1 end,
      window_started=case when episode_refresh_limits.window_started <= stamp - (case when bucket='*' then interval '1 hour' else interval '1 day' end) then stamp else episode_refresh_limits.window_started end,
      last_attempt=stamp;
  end loop;
  return jsonb_build_object('retry_after',0);
end $$;
revoke all on function public.cdl_v14_episode_refresh_guard(text,text) from public,anon;
grant execute on function public.cdl_v14_episode_refresh_guard(text,text) to authenticated;
commit;
