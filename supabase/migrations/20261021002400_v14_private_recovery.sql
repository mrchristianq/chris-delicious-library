-- Prepared only. Installation needs explicit approval; existing data untouched.
begin;
-- Never silently adopt an existing public or differently configured bucket.
do $$ begin
 if exists(select 1 from storage.buckets where id='cdl-v14-recovery') then
  raise exception 'Recovery bucket already exists; inspect before installing';
 end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('cdl-v14-recovery','cdl-v14-recovery',false,24000000,array['application/gzip']);

-- No anon access, no UPDATE/DELETE, no public URL and no service-role bypass.
-- Both owner and library folders must match the signed-in owner's library.
create policy cdl_v14_recovery_insert on storage.objects for insert to authenticated
with check (
 bucket_id='cdl-v14-recovery'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and (storage.foldername(name))[2] in (select id::text from public.cdl_v14_my_libraries())
 and array_length(storage.foldername(name),1)=3
 and (storage.foldername(name))[3] ~ '^[a-f0-9]{64}$'
 and storage.filename(name) ~ '^[a-f0-9-]{36}\.json\.gz$'
);
create policy cdl_v14_recovery_select on storage.objects for select to authenticated
using (
 bucket_id='cdl-v14-recovery'
 and (storage.foldername(name))[1]=(select auth.uid())::text
 and (storage.foldername(name))[2] in (select id::text from public.cdl_v14_my_libraries())
);
commit;
