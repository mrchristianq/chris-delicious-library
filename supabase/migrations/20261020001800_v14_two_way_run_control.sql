begin;
-- Target remains disabled. These owner-only controls are not routed to Apply.
create function cdl.tracker_baseline_stamp(p_target uuid) returns text language sql stable set search_path='' as $$
 select md5(jsonb_build_object('columns',t.approved_columns,'records',(select coalesce(jsonb_agg(jsonb_build_array(b.item_id,b.confirmed_fields,b.confirmed_at) order by b.item_id),'[]'::jsonb) from cdl.sync_baselines b where b.target_id=t.id),'last',(select max(finished_at) from cdl.sync_runs r where r.target_id=t.id and r.status='completed'))::text) from cdl.sync_targets t where t.id=p_target
$$;
create function cdl.tracker_metadata_stamp(p_library uuid) returns text language sql stable set search_path='' as $$
 select md5(coalesce(jsonb_agg(jsonb_build_array(m.item_id,m.fields) order by m.item_id)::text,'[]')) from cdl.item_metadata m join cdl.items i on i.id=m.item_id and i.library_id=m.library_id where m.library_id=p_library and i.deleted_at is null
$$;
revoke all on function cdl.tracker_baseline_stamp(uuid),cdl.tracker_metadata_stamp(uuid) from public,anon,authenticated;

create function public.cdl_v14_tracker_run_context(p_library_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_owner uuid;v_target cdl.sync_targets;
begin
 select owner_id into v_owner from cdl.libraries where id=p_library_id and owner_id=auth.uid();if v_owner is null then raise exception 'Library unavailable';end if;
 select * into v_target from cdl.sync_targets where library_id=p_library_id and sheet_id='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
 if not found or v_target.enabled then raise exception 'Isolated target unavailable';end if;
 return jsonb_build_object('ownerId',v_owner,'libraryId',p_library_id,'targetId',v_target.id,'sheetId',v_target.sheet_id,'stamp',cdl.tracker_baseline_stamp(v_target.id),'metadataStamp',cdl.tracker_metadata_stamp(p_library_id),'activePlan',(select cursor_data->>'plan' from cdl.sync_runs where target_id=v_target.id and status='running'));
end $$;

create function public.cdl_v14_tracker_claim(p_library_id uuid,p_run_id uuid,p_plan text,p_package_hash text,p_summary jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_target cdl.sync_targets;v_run cdl.sync_runs;v_package cdl.settings;v_journal jsonb;v_cursor jsonb;
begin
 if auth.uid() is null or p_run_id is null or p_plan is null or p_plan!~'^[a-f0-9]{64}$' or p_package_hash is null or p_package_hash!~'^[a-f0-9]{64}$' then raise exception 'Invalid run identity';end if;
 if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library unavailable';end if;
 select * into v_target from cdl.sync_targets where library_id=p_library_id and sheet_id='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0' for update;
 if not found or v_target.enabled then raise exception 'Isolated target unavailable';end if;
 if p_summary is null or jsonb_typeof(p_summary)<>'object' or octet_length(p_summary::text)>2000000 or
    (select array_agg(k order by k) from jsonb_object_keys(p_summary) k) is distinct from array['baselineStamp','generation','imports','metadataStamp','sources','steps']::text[] or
    coalesce(p_summary->>'baselineStamp','')!~'^[a-f0-9]{32}$' or coalesce(p_summary->>'metadataStamp','')!~'^[a-f0-9]{32}$' or coalesce(p_summary->>'generation','')!~'^[a-f0-9]{64}$' or
    jsonb_typeof(p_summary->'sources')<>'array' or jsonb_typeof(p_summary->'steps')<>'array' or jsonb_typeof(p_summary->'imports')<>'array' then raise exception 'Invalid run summary';end if;
 if jsonb_array_length(p_summary->'sources')>5000 or jsonb_array_length(p_summary->'steps')>500 or jsonb_array_length(p_summary->'imports')>500 then raise exception 'Run exceeds bound';end if;
 select * into v_package from cdl.settings where library_id=p_library_id and key='__cdl_tracker_mixed_v1:'||p_plan;
 if not found or encode(sha256(convert_to(v_package.value->>'value','UTF8')),'hex') is distinct from p_package_hash then raise exception 'Immutable run package unavailable';end if;
 v_cursor:=p_summary||jsonb_build_object('kind','two-way','plan',p_plan,'packageHash',p_package_hash,'packageRevision',v_package.revision);
 select * into v_run from cdl.sync_runs where library_id=p_library_id and id=p_run_id;
 if found then
   if v_run.target_id<>v_target.id or (v_run.cursor_data-'receipt') is distinct from v_cursor or v_run.status not in ('running','completed') then raise exception 'Run identity changed';end if;
   return jsonb_build_object('runId',v_run.id,'plan',p_plan,'status',v_run.status,'receipt',v_run.cursor_data->'receipt');
 end if;
 if exists(select 1 from cdl.sync_runs where target_id=v_target.id and status='running') then raise exception 'Another run owns the target';end if;
 if cdl.tracker_baseline_stamp(v_target.id) is distinct from p_summary->>'baselineStamp' or cdl.tracker_metadata_stamp(p_library_id) is distinct from p_summary->>'metadataStamp' then raise exception 'Run generation changed';end if;
 if (select count(distinct r."itemId") from jsonb_to_recordset(p_summary->'sources') r("itemId" uuid,revision bigint))<>jsonb_array_length(p_summary->'sources') or
    (select count(*) from cdl.items where library_id=p_library_id and deleted_at is null)<>jsonb_array_length(p_summary->'sources') or
    exists(select 1 from jsonb_to_recordset(p_summary->'sources') r("itemId" uuid,revision bigint) left join cdl.items i on i.id=r."itemId" and i.library_id=p_library_id and i.deleted_at is null where i.id is null or i.revision is distinct from r.revision) then raise exception 'Source revisions changed';end if;
 if (select count(distinct r."itemId") from jsonb_to_recordset(p_summary->'imports') r("itemId" uuid,"requestId" uuid))<>jsonb_array_length(p_summary->'imports') or
    (select count(distinct r."requestId") from jsonb_to_recordset(p_summary->'imports') r("itemId" uuid,"requestId" uuid))<>jsonb_array_length(p_summary->'imports') or
    exists(select 1 from jsonb_to_recordset(p_summary->'imports') r("itemId" uuid,"requestId" uuid) where r."requestId" is null or not exists(select 1 from jsonb_to_recordset(p_summary->'sources') s("itemId" uuid) where s."itemId"=r."itemId")) then raise exception 'Invalid import requests';end if;
 select (value->>'value')::jsonb into v_journal from cdl.settings where library_id=p_library_id and key='__cdl_tracker_run_v1:'||p_plan;
 if v_journal->>'target' is distinct from v_target.sheet_id or v_journal->>'plan' is distinct from p_plan or v_journal->>'version' is distinct from '1' or
    (select coalesce(jsonb_agg(jsonb_build_object('id',s->>'id','fingerprint',s->>'fingerprint') order by n),'[]'::jsonb) from jsonb_array_elements(v_journal->'steps') with ordinality x(s,n)) is distinct from p_summary->'steps' or
    exists(select 1 from jsonb_array_elements(v_journal->'steps') s where s->>'state' is distinct from 'pending') then raise exception 'Pending journal unavailable';end if;
 insert into cdl.sync_runs(id,library_id,target_id,status,cursor_data,started_at) values(p_run_id,p_library_id,v_target.id,'running',v_cursor,now());
 return jsonb_build_object('runId',p_run_id,'plan',p_plan,'status','running','receipt',null);
end $$;

create function public.cdl_v14_tracker_confirm(p_library_id uuid,p_run_id uuid,p_plan text,p_records jsonb,p_readback_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_target cdl.sync_targets;v_run cdl.sync_runs;v_journal jsonb;v_record record;v_columns jsonb;v_fields_hash text;v_receipt jsonb;v_time timestamptz:=clock_timestamp();
begin
 if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library unavailable';end if;
 if p_plan is null or p_plan!~'^[a-f0-9]{64}$' or p_readback_hash is null or p_readback_hash!~'^[a-f0-9]{64}$' or p_records is null or jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)>5000 or octet_length(p_records::text)>8388608 then raise exception 'Invalid confirmation';end if;
 select * into v_target from cdl.sync_targets where library_id=p_library_id and sheet_id='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0' for update;
 if not found or v_target.enabled then raise exception 'Isolated target unavailable';end if;
 select * into v_run from cdl.sync_runs where library_id=p_library_id and id=p_run_id and target_id=v_target.id for update;
 if not found or v_run.cursor_data->>'kind' is distinct from 'two-way' or v_run.cursor_data->>'plan' is distinct from p_plan then raise exception 'Wrong active run';end if;
 v_fields_hash:=encode(sha256(convert_to(p_records::text,'UTF8')),'hex');
 if v_run.status='completed' then
   if v_run.cursor_data->'receipt'->>'baselineFingerprint' is distinct from p_readback_hash or v_run.cursor_data->'receipt'->>'fieldsFingerprint' is distinct from v_fields_hash then raise exception 'Different completion retry';end if;
   return v_run.cursor_data->'receipt';
 end if;
 if v_run.status<>'running' then raise exception 'Run is not active';end if;
 perform 1 from cdl.items where library_id=p_library_id for update;
 perform 1 from cdl.item_metadata where library_id=p_library_id for update;
 if cdl.tracker_baseline_stamp(v_target.id) is distinct from v_run.cursor_data->>'baselineStamp' or cdl.tracker_metadata_stamp(p_library_id) is distinct from v_run.cursor_data->>'metadataStamp' then raise exception 'Confirmation generation changed';end if;
 if not exists(select 1 from cdl.settings where library_id=p_library_id and key='__cdl_tracker_mixed_v1:'||p_plan and revision=(v_run.cursor_data->>'packageRevision')::bigint and encode(sha256(convert_to(value->>'value','UTF8')),'hex')=v_run.cursor_data->>'packageHash') then raise exception 'Run package changed';end if;
 select (value->>'value')::jsonb into v_journal from cdl.settings where library_id=p_library_id and key='__cdl_tracker_run_v1:'||p_plan;
 if v_journal->>'target' is distinct from v_target.sheet_id or v_journal->>'plan' is distinct from p_plan or
    (select coalesce(jsonb_agg(jsonb_build_object('id',s->>'id','fingerprint',s->>'fingerprint') order by n),'[]'::jsonb) from jsonb_array_elements(v_journal->'steps') with ordinality x(s,n)) is distinct from v_run.cursor_data->'steps' or
    exists(select 1 from jsonb_array_elements(v_journal->'steps') s where s->>'state' is distinct from 'confirmed' or coalesce(s->>'attempt','')!~'^[a-f0-9-]{36}$') then raise exception 'Unconfirmed journal';end if;
 if jsonb_array_length(p_records)<>jsonb_array_length(v_run.cursor_data->'sources') or (select count(distinct r."itemId") from jsonb_to_recordset(p_records) r("itemId" uuid))<>jsonb_array_length(p_records) or
    (select count(*) from cdl.items where library_id=p_library_id and deleted_at is null)<>jsonb_array_length(p_records) then raise exception 'Final membership changed';end if;
 for v_record in select r.*,i.media_type,i.user_status,i.personal_rating,i.completed_on,i.revision actual_revision,s.revision source_revision from jsonb_to_recordset(p_records) r("itemId" uuid,revision bigint,fields jsonb)
   left join cdl.items i on i.id=r."itemId" and i.library_id=p_library_id and i.deleted_at is null
   left join jsonb_to_recordset(v_run.cursor_data->'sources') s("itemId" uuid,revision bigint) on s."itemId"=r."itemId"
 loop
   if v_record.source_revision is null or v_record.actual_revision is null or v_record.revision is distinct from v_record.actual_revision or v_record.revision<>v_record.source_revision+(case when exists(select 1 from jsonb_to_recordset(v_run.cursor_data->'imports') k("itemId" uuid) where k."itemId"=v_record."itemId") then 1 else 0 end) then raise exception 'Final revision changed';end if;
   v_columns:=v_target.approved_columns->(case v_record.media_type when 'game' then 'Games' when 'tv' then 'Shows' when 'book' then 'Books' else 'Movies' end);
   if jsonb_typeof(v_record.fields)<>'object' or v_columns is null or (select count(*) from jsonb_object_keys(v_record.fields))<>jsonb_array_length(v_columns) or
      exists(select 1 from jsonb_each(v_record.fields) f where not (v_columns ? f.key) or jsonb_typeof(f.value) not in ('string','number','boolean','null') or f.key ~* 'notes|progress|watched_at' or (f.key ~* 'episode' and lower(f.key)<>'numberofepisodes')) then raise exception 'Unsafe confirmed fields';end if;
   if exists(select 1 from jsonb_each(v_record.fields) f where
       (f.key in ('MyRating','My Rating') and f.value is distinct from coalesce(to_jsonb(v_record.personal_rating),'""'::jsonb)) or
       (f.key in ('CompletedDate','Completed Date','Date Completed','WatchDate') and f.value is distinct from to_jsonb(coalesce(v_record.completed_on::text,''))) or
       (((v_record.media_type in ('game','book') and f.key='Status') or (v_record.media_type in ('tv','movie') and f.key in ('WatchStatus','Watch Status'))) and f.value is distinct from to_jsonb(coalesce(v_record.user_status,'')))) then raise exception 'Canonical values not confirmed';end if;
   if not exists(select 1 from cdl.sync_baselines where library_id=p_library_id and target_id=v_target.id and item_id=v_record."itemId") then raise exception 'New record needs mapping review';end if;
 end loop;
 if exists(select 1 from jsonb_to_recordset(v_run.cursor_data->'imports') r("itemId" uuid,"requestId" uuid)
    left join jsonb_to_recordset(v_run.cursor_data->'sources') s("itemId" uuid,revision bigint) on s."itemId"=r."itemId"
    left join cdl.change_events e on e.library_id=p_library_id and e.request_id=r."requestId" and e.entity_id=r."itemId" and e.entity_kind='full_edit' and e.changes->>'expected_revision'=s.revision::text where e.id is null) then raise exception 'Missing import audit';end if;
 update cdl.sync_baselines b set confirmed_fields=r.fields,confirmed_at=v_time from jsonb_to_recordset(p_records) r("itemId" uuid,fields jsonb) where b.library_id=p_library_id and b.target_id=v_target.id and b.item_id=r."itemId";
 v_receipt:=jsonb_build_object('runId',p_run_id,'plan',p_plan,'baselineFingerprint',p_readback_hash,'fieldsFingerprint',v_fields_hash,'confirmedAt',v_time,'records',jsonb_array_length(p_records));
 update cdl.sync_runs set status='completed',finished_at=v_time,cursor_data=cursor_data||jsonb_build_object('receipt',v_receipt) where id=p_run_id;
 insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes) values(p_library_id,p_run_id,'sync-confirm',p_run_id,jsonb_build_object('plan',p_plan,'baselineFingerprint',p_readback_hash,'records',jsonb_array_length(p_records)));
 return v_receipt;
end $$;
revoke all on function public.cdl_v14_tracker_run_context(uuid),public.cdl_v14_tracker_claim(uuid,uuid,text,text,jsonb),public.cdl_v14_tracker_confirm(uuid,uuid,text,jsonb,text) from public,anon;
grant execute on function public.cdl_v14_tracker_run_context(uuid),public.cdl_v14_tracker_claim(uuid,uuid,text,text,jsonb),public.cdl_v14_tracker_confirm(uuid,uuid,text,jsonb,text) to authenticated;
notify pgrst,'reload schema';
commit;
