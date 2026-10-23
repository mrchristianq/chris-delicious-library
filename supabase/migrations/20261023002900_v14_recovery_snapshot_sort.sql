-- Sort by native keys, never repeatedly serialize large metadata/provenance
-- rows merely to extract their keys. Preserve deterministic snapshot ordering.
begin;
do $$ declare source text;needle text;replacement text;begin
 source:=pg_get_functiondef('public.cdl_v14_recovery_snapshot(uuid)'::regprocedure);
 needle:=$needle$order by coalesce(to_jsonb(r)->>''id'',to_jsonb(r)->>''item_id'',to_jsonb(r)->>''episode_id'',to_jsonb(r)->>''key''),to_jsonb(r)->>''collection_id'',to_jsonb(r)->>''target_id''$needle$;
 if position(needle in source)=0 then raise exception 'Unexpected snapshot definition';end if;
 source:=replace(source,needle,'order by %s');
 needle:='v_table,v_table);';
 replacement:='v_table,case v_table when ''item_metadata'' then ''r.item_id'' when ''episode_progress'' then ''r.episode_id'' when ''settings'' then ''r.key'' when ''collection_items'' then ''r.item_id,r.collection_id'' when ''sync_baselines'' then ''r.item_id,r.target_id'' else ''r.id'' end,v_table);';
 if position(needle in source)=0 then raise exception 'Unexpected snapshot format';end if;
 execute replace(source,needle,replacement);
end $$;
notify pgrst,'reload schema';
commit;
