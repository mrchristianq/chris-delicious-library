import {randomUUID} from 'node:crypto';
import {isExcludedTrackerField} from '../../app/lib/v14/tracker-read.ts';
const library='9fdfae4a-31f5-5c8f-aa64-af839a853b48',owner='baf0dab8-9904-48f2-a00f-30773bfc6ae1',target='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const json=value=>quote(JSON.stringify(value))+'::jsonb';
export function initialBaselineSql({run,baseline,protectedData,receipt,receiptRevision,confirmedAt}){
 if(!/^[a-f0-9]{64}$/.test(run)||!baseline?.records?.length||baseline.records.length>10000||!/^[a-f0-9]{64}$/.test(baseline.fingerprint)||
   Object.keys(protectedData).sort().join(',')!=='episodes,items,metadata,progress'||Object.values(protectedData).some(v=>!/^[a-f0-9]{32}$/.test(v))||
   receipt?.version!==1||receipt?.target!==target||receipt?.run!==run||receipt?.baselineConfirmed!==false||receipt?.records!==baseline.records.length||!Number.isSafeInteger(receipt.operations)||receipt.operations<1||receipt.operations>500||!/^[a-f0-9]{64}$/.test(receipt.backupSha256??'')||!Number.isFinite(Date.parse(receipt.confirmedAt))||!Number.isSafeInteger(receiptRevision)||receiptRevision<1||!Number.isFinite(Date.parse(confirmedAt))||
   baseline.records.some(r=>!/^[a-f0-9-]{36}$/.test(r.itemId)||!Number.isSafeInteger(r.revision)||r.revision<1||Object.keys(r.fields).some(isExcludedTrackerField)))throw new Error('Invalid initial baseline confirmation input');
 const verifiedKey='__cdl_tracker_verified_run_v1:'+run;
 const finalReceipt={...receipt,baselineConfirmed:true,baselineConfirmedAt:confirmedAt,baselineFingerprint:baseline.fingerprint};
 const requestId=randomUUID(),runId=randomUUID();
 const blockTag='$cdl_'+randomUUID().replaceAll('-','')+'$';
 if(JSON.stringify({baseline,receipt}).includes(blockTag))throw new Error('Unsafe confirmation delimiter');
 return `begin isolation level serializable;
set local standard_conforming_strings=on;
select set_config('request.jwt.claim.sub',${quote(owner)},true);
create function pg_temp.protected_state() returns jsonb language sql as $$ select jsonb_build_object(
 'items',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.items r),
 'metadata',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.item_metadata r),
 'episodes',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.episodes r),
 'progress',(select md5(coalesce(jsonb_agg(to_jsonb(r) order by to_jsonb(r)::text)::text,'')) from cdl.episode_progress r)); $$;
do ${blockTag} declare v_target uuid; prior_run uuid; checkpoint jsonb; current_receipt jsonb; payload jsonb:=${json(baseline.records)}; begin
 if not exists(select 1 from cdl.libraries where id=${quote(library)}::uuid and owner_id=auth.uid()) then raise exception 'Wrong baseline owner';end if;
 perform 1 from cdl.libraries where id=${quote(library)}::uuid for update;
 if pg_temp.protected_state() is distinct from ${json(protectedData)} then raise exception 'Library data changed before baseline confirmation';end if;
 if (select value->>'value' from cdl.settings where library_id=${quote(library)}::uuid and key='__cdl_tracker_active_run_v1') is distinct from ${quote(run)} then raise exception 'Wrong active run';end if;
 select (value->>'value')::jsonb into checkpoint from cdl.settings where library_id=${quote(library)}::uuid and key=${quote('__cdl_tracker_run_v1:'+run)};
 if checkpoint->>'target' is distinct from ${quote(target)} or checkpoint->>'plan' is distinct from ${quote(run)} or jsonb_array_length(checkpoint->'steps')<>${receipt.operations} or exists(select 1 from jsonb_array_elements(checkpoint->'steps') s where s->>'state' is distinct from 'confirmed') then raise exception 'Unconfirmed execution journal';end if;
 select (value->>'value')::jsonb into current_receipt from cdl.settings where library_id=${quote(library)}::uuid and key=${quote(verifiedKey)};
 select id into v_target from cdl.sync_targets where library_id=${quote(library)}::uuid and sheet_id=${quote(target)};
 if v_target is not null then
  if exists(select 1 from cdl.sync_targets where id=v_target and enabled) then raise exception 'Manual sync target unexpectedly enabled';end if;
  select id into prior_run from cdl.sync_runs r where r.target_id=v_target and status='completed' and cursor_data->>'manifest'=${quote(run)} and cursor_data->>'baselineFingerprint'=${quote(baseline.fingerprint)};
  if prior_run is not null then
   if current_receipt->>'baselineConfirmed' is distinct from 'true' or current_receipt->>'baselineFingerprint' is distinct from ${quote(baseline.fingerprint)} or (select count(*) from cdl.sync_baselines b where b.target_id=v_target)<>jsonb_array_length(payload) or exists(select 1 from jsonb_to_recordset(payload) r("itemId" uuid,revision bigint,fields jsonb) left join cdl.sync_baselines b on b.target_id=v_target and b.item_id=r."itemId" where b.item_id is null or b.confirmed_fields is distinct from r.fields) then raise exception 'Existing baseline confirmation incomplete';end if;
   return;
  end if;
  if exists(select 1 from cdl.sync_baselines b where b.target_id=v_target) then raise exception 'Initial baseline cannot overwrite existing baselines';end if;
 end if;
 if current_receipt is distinct from ${json(receipt)} or (select revision from cdl.settings where library_id=${quote(library)}::uuid and key=${quote(verifiedKey)}) is distinct from ${receiptRevision} then raise exception 'Verified run receipt changed';end if;
 if (select count(*) from cdl.items where library_id=${quote(library)}::uuid and deleted_at is null)<>jsonb_array_length(payload) or
    (select count(distinct r."itemId") from jsonb_to_recordset(payload) r("itemId" uuid,revision bigint,fields jsonb))<>jsonb_array_length(payload) or
    exists(select 1 from jsonb_to_recordset(payload) r("itemId" uuid,revision bigint,fields jsonb) left join cdl.items i on i.library_id=${quote(library)}::uuid and i.id=r."itemId" and i.deleted_at is null where i.id is null or i.revision<>r.revision) then raise exception 'Baseline records or revisions changed';end if;
 if v_target is null then insert into cdl.sync_targets(library_id,sheet_id,enabled,approved_columns) values(${quote(library)}::uuid,${quote(target)},false,${json(baseline.columns)}) returning id into v_target;end if;
 if (select approved_columns from cdl.sync_targets where id=v_target) is distinct from ${json(baseline.columns)} then raise exception 'Approved baseline columns changed';end if;
 insert into cdl.sync_baselines(library_id,target_id,item_id,confirmed_fields,confirmed_at)
 select ${quote(library)}::uuid,v_target,r."itemId",r.fields,${quote(confirmedAt)}::timestamptz from jsonb_to_recordset(payload) r("itemId" uuid,revision bigint,fields jsonb);
 insert into cdl.sync_runs(id,library_id,target_id,status,cursor_data,started_at,finished_at) values(${quote(runId)}::uuid,${quote(library)}::uuid,v_target,'completed',jsonb_build_object('kind','initial','manifest',${quote(run)},'baselineFingerprint',${quote(baseline.fingerprint)},'confirmedRecords',jsonb_array_length(payload),'backupSha256',${quote(receipt.backupSha256)}),${quote(receipt.confirmedAt)}::timestamptz,${quote(confirmedAt)}::timestamptz);
 insert into cdl.change_events(library_id,request_id,entity_kind,entity_id,changes) values(${quote(library)}::uuid,${quote(randomUUID())}::uuid,'sync-baseline',${quote(runId)}::uuid,jsonb_build_object('manifest',${quote(run)},'baselineFingerprint',${quote(baseline.fingerprint)},'records',jsonb_array_length(payload)));
 perform public.cdl_v14_save_setting(${quote(library)}::uuid,${quote(verifiedKey)},${receiptRevision},${quote(requestId)}::uuid,jsonb_build_object('value',${quote(JSON.stringify(finalReceipt))}));
 if pg_temp.protected_state() is distinct from ${json(protectedData)} then raise exception 'Protected library data changed during confirmation';end if;
end ${blockTag};
commit;
select jsonb_build_object('baselines',(select count(*) from cdl.sync_baselines where library_id=${quote(library)}::uuid),'completed_runs',(select count(*) from cdl.sync_runs where library_id=${quote(library)}::uuid and status='completed'),'enabled_targets',(select count(*) from cdl.sync_targets where enabled),'protectedData',pg_temp.protected_state()) as verification;`;
}
