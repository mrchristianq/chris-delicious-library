begin;
create or replace function public.cdl_v14_tracker_run_context(p_library_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_owner uuid;v_target cdl.sync_targets;
begin
 select owner_id into v_owner from cdl.libraries where id=p_library_id and owner_id=auth.uid();if v_owner is null then raise exception 'Library unavailable';end if;
 select * into v_target from cdl.sync_targets where library_id=p_library_id and sheet_id='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
 if not found or v_target.enabled then raise exception 'Isolated target unavailable';end if;
 return jsonb_build_object('ownerId',v_owner,'libraryId',p_library_id,'targetId',v_target.id,'sheetId',v_target.sheet_id,'stamp',cdl.tracker_baseline_stamp(v_target.id),'metadataStamp',cdl.tracker_metadata_stamp(p_library_id),'allowAdditions',true,'allowSheetImports',true,'allowChunkedPlans',true,'allowReviewedIdentities',true,'activePlan',(select cursor_data->>'plan' from cdl.sync_runs where target_id=v_target.id and status='running'));
end $$;


create or replace function public.cdl_v14_tracker_claim(p_library_id uuid,p_run_id uuid,p_plan text,p_package_hash text,p_summary jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_target cdl.sync_targets;v_run cdl.sync_runs;v_package cdl.settings;v_journal jsonb;v_cursor jsonb;
begin
 if auth.uid() is null or p_run_id is null or p_plan is null or p_plan!~'^[a-f0-9]{64}$' or p_package_hash is null or p_package_hash!~'^[a-f0-9]{64}$' then raise exception 'Invalid run identity';end if;
 if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library unavailable';end if;
 select * into v_target from cdl.sync_targets where library_id=p_library_id and sheet_id='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0' for update;
 if not found or v_target.enabled then raise exception 'Isolated target unavailable';end if;
 if p_summary is null or jsonb_typeof(p_summary)<>'object' or octet_length(p_summary::text)>2000000 or
    (select array_agg(k order by k) from jsonb_object_keys(p_summary) k) is distinct from (case when p_summary ? 'creates' then array['baselineStamp','creates','generation','imports','metadataStamp','sources','steps'] else array['baselineStamp','generation','imports','metadataStamp','sources','steps'] end)::text[] or
    coalesce(p_summary->>'baselineStamp','')!~'^[a-f0-9]{32}$' or coalesce(p_summary->>'metadataStamp','')!~'^[a-f0-9]{32}$' or coalesce(p_summary->>'generation','')!~'^[a-f0-9]{64}$' or
    jsonb_typeof(p_summary->'sources')<>'array' or jsonb_typeof(p_summary->'steps')<>'array' or jsonb_typeof(p_summary->'imports')<>'array' then raise exception 'Invalid run summary';end if;
 if jsonb_array_length(p_summary->'sources')>5000 or jsonb_array_length(p_summary->'steps')>500 or jsonb_array_length(p_summary->'imports')>500 then raise exception 'Run exceeds bound';end if;

 if p_summary ? 'creates' then
   if jsonb_typeof(p_summary->'creates')<>'array' or jsonb_array_length(p_summary->'creates')<>1 or jsonb_array_length(p_summary->'imports')<>0 or (jsonb_array_length(p_summary->'steps') not in (1,2) or jsonb_array_length(p_summary->'steps')=2 and (p_summary->'creates'->0->'identityApproval'->'choice'->>'mode' is distinct from 'separate' or not exists(select 1 from jsonb_array_elements(p_summary->'steps') st where st->>'id'='export:'||(p_summary->'creates'->0->>'itemId')))) then raise exception 'One reviewed new item required';end if;
   if exists(select 1 from jsonb_to_recordset(p_summary->'creates') c("itemId" uuid,"requestId" uuid,fingerprint text,media text,patch jsonb,"sourceHash" text) where
       c."itemId" is null or c."requestId" is null or coalesce(c.fingerprint,'')!~'^[a-f0-9]{64}$' or coalesce(c."sourceHash",'')!~'^[a-f0-9]{64}$' or c.media is null or c.media not in ('game','tv','book','movie') or
       c.patch is null or jsonb_typeof(c.patch)<>'object' or not(c.patch ? 'title') or c.patch ? 'notes' or
       exists(select 1 from jsonb_to_recordset(p_summary->'sources') x("itemId" uuid) where x."itemId"=c."itemId") or
       not exists(select 1 from jsonb_array_elements(p_summary->'steps') st where st->>'id'='create:'||c."itemId"::text and st->>'fingerprint'=c.fingerprint)) then raise exception 'Invalid new-item summary';end if;
 end if;
 select * into v_package from cdl.settings where library_id=p_library_id and key='__cdl_tracker_mixed_v1:'||p_plan;
 if not found or encode(sha256(convert_to(v_package.value->>'value','UTF8')),'hex') is distinct from p_package_hash or not cdl.tracker_package_intact(p_library_id,p_plan,v_package.value->>'value') then raise exception 'Immutable run package unavailable';end if;
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


create or replace function public.cdl_v14_tracker_create(p_library_id uuid,p_run_id uuid,p_plan text,p_id uuid,p_request_id uuid,p_media_type text,p_patch jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r cdl.sync_runs;t cdl.sync_targets;c jsonb;j jsonb;v_provider text;v_title text;receipt jsonb;a jsonb;candidate cdl.items;candidate_provider text;candidate_platform text;
begin
 if not exists(select 1 from cdl.libraries where id=p_library_id and owner_id=auth.uid()) then raise exception 'Library unavailable';end if;
 perform 1 from cdl.libraries where id=p_library_id for update;
 select * into t from cdl.sync_targets where library_id=p_library_id and sheet_id='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0' and not enabled for update;
 if not found then raise exception 'Isolated target unavailable';end if;
 select * into r from cdl.sync_runs where id=p_run_id and library_id=p_library_id and target_id=t.id and status='running' and cursor_data->>'plan'=p_plan for update;
 if not found then raise exception 'Active new-item run required';end if;
 select value into c from jsonb_array_elements(r.cursor_data->'creates') where value->>'itemId'=p_id::text;
 if c is null or c->>'requestId' is distinct from p_request_id::text or c->>'media' is distinct from p_media_type or c->'patch' is distinct from p_patch or p_patch ? 'notes' then raise exception 'Wrong sealed creation command';end if;
 if not exists(select 1 from cdl.settings where library_id=p_library_id and key='__cdl_tracker_mixed_v1:'||p_plan and revision=(r.cursor_data->>'packageRevision')::bigint and encode(sha256(convert_to(value->>'value','UTF8')),'hex')=r.cursor_data->>'packageHash' and cdl.tracker_package_intact(p_library_id,p_plan,value->>'value')) then raise exception 'Run package changed';end if;
 select (value->>'value')::jsonb into j from cdl.settings where library_id=p_library_id and key='__cdl_tracker_run_v1:'||p_plan;
 if not exists(select 1 from jsonb_array_elements(j->'steps') s where s->>'id'='create:'||p_id::text and s->>'fingerprint'=c->>'fingerprint' and s->>'state'='dispatched' and coalesce(s->>'attempt','')~'^[a-f0-9-]{36}$') then raise exception 'Dispatched creation checkpoint required';end if;
 perform 1 from cdl.items where library_id=p_library_id for update;
 if cdl.tracker_baseline_stamp(t.id) is distinct from r.cursor_data->>'baselineStamp' or cdl.tracker_source_metadata_stamp(p_library_id,r.cursor_data->'sources') is distinct from r.cursor_data->>'metadataStamp' then raise exception 'Creation source changed';end if;
 if exists(select 1 from jsonb_to_recordset(r.cursor_data->'sources') s("itemId" uuid,revision bigint) left join cdl.items i on i.id=s."itemId" and i.library_id=p_library_id and i.deleted_at is null where i.id is null or i.revision<>s.revision) or
    (select count(*) from cdl.items where library_id=p_library_id and deleted_at is null and id<>p_id)<>jsonb_array_length(r.cursor_data->'sources') then raise exception 'Creation membership changed';end if;
 v_title:=lower(trim(p_patch->>'title'));
 v_provider:=lower(trim(coalesce(p_patch->'overrides'->>(case p_media_type when 'game' then 'IGDB_ID' when 'book' then 'isbn' else 'TMDB_ID' end),'')));
 a:=c->'identityApproval';
 if a is not null then
   if jsonb_typeof(a)<>'object' or a->'choice'->>'mode' is distinct from 'separate' or p_media_type<>'game' or
      coalesce(a->>'token','')!~'^[a-f0-9]{64}$' or coalesce(a->>'reviewKey','')!~'^__cdl_tracker_identity_review_v1:[a-f0-9]{64}$' then raise exception 'Invalid edition approval';end if;
   select * into candidate from cdl.items where id=(a->>'candidateId')::uuid and library_id=p_library_id and deleted_at is null and media_type='game';
   if not found or candidate.revision is distinct from (a->>'candidateRevision')::bigint or not exists(select 1 from jsonb_to_recordset(r.cursor_data->'sources') src("itemId" uuid,revision bigint) where src."itemId"=candidate.id and src.revision=candidate.revision) then raise exception 'Edition candidate changed';end if;
   if not exists(select 1 from cdl.settings st where st.library_id=p_library_id and st.key=a->>'reviewKey' and st.revision=(a->>'reviewRevision')::bigint and (st.value->>'value')::jsonb->>'token'=a->>'token' and (st.value->>'value')::jsonb->'choice'=a->'choice') then raise exception 'Edition review withdrawn';end if;
   select lower(trim(coalesce(candidate.user_fields->>'Platform',m.fields->>'Platform',''))),lower(trim(coalesce(candidate.user_fields->>'IGDB_ID',m.fields->>'IGDB_ID',''))) into candidate_platform,candidate_provider from cdl.item_metadata m where m.item_id=candidate.id and m.library_id=p_library_id;
   if coalesce(candidate_platform,'')='' or coalesce(lower(trim(p_patch->'overrides'->>'Platform')),'') in ('','wishlist') or candidate_platform=lower(trim(p_patch->'overrides'->>'Platform')) or not(lower(trim(candidate.title))=v_title or v_provider<>'' and candidate_provider=v_provider) then raise exception 'Independent concrete edition required';end if;
 end if;
 -- A collision is admitted ONLY for the explicitly reviewed candidate, with
 -- unchanged source membership and a distinct concrete game platform.
 if exists(select 1 from cdl.items i left join cdl.item_metadata m on m.item_id=i.id and m.library_id=i.library_id
   where i.library_id=p_library_id and i.deleted_at is null and i.media_type=p_media_type and i.id<>p_id and
     (lower(trim(i.title))=v_title or v_provider<>'' and lower(trim(coalesce(i.user_fields->>(case p_media_type when 'game' then 'IGDB_ID' when 'book' then 'isbn' else 'TMDB_ID' end),m.fields->>(case p_media_type when 'game' then 'IGDB_ID' when 'book' then 'isbn' else 'TMDB_ID' end),'')))=v_provider)
     and not(a is not null and i.id=candidate.id and p_media_type='game' and lower(trim(coalesce(i.user_fields->>'Platform',m.fields->>'Platform','')))<>lower(trim(p_patch->'overrides'->>'Platform')))) then raise exception 'New-item identity collision';end if;
 receipt:=public.cdl_v14_create_item(p_library_id,p_id,p_request_id,p_media_type,p_patch);
 return receipt;
end $$;

notify pgrst,'reload schema';
commit;
