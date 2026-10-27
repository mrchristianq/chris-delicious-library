import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {readRecordDelta,mergeRecordDelta,validateRecordIndex}=await import('../../app/lib/v14/incremental-snapshot.ts');h.deregister();
const owner='11111111-1111-4111-8111-111111111111',lib='22222222-2222-4222-8222-222222222222',id='33333333-3333-4333-8333-333333333333',second='44444444-4444-4444-8444-444444444444';
const t='a'.repeat(32),u='b'.repeat(32),stamp='2026-10-27T12:00:00Z';
const book=(id,title)=>({id,library_id:lib,media_type:'book',title,revision:1,user_status:'Collection',personal_rating:0,completed_on:null,notes:'',user_fields:{},metadata:{}});
const snapshot=()=>({schema_version:1,complete:true,library_id:lib,owner_id:owner,observed_at:stamp,change_token:t,counts:{items:1,episodes:0,settings:0},items:[book(id,'Original')],episodes:[],settings:[],record_index:{items:[[id,t]],episodes:[],settings:[]}});
const delta=()=>({delta:true,library_id:lib,owner_id:owner,observed_at:stamp,change_token:u,base_token:t,record_index:{items:[[id,t]],episodes:[],settings:[]},rows:{items:[],episodes:[],settings:[]}});
test('merge reuses unchanged data and preserves authoritative ordering with additions/deletions',()=>{
 const d=delta();d.record_index.items=[[second,u],[id,t]];d.rows.items=[book(second,'New')];
 let next=mergeRecordDelta(snapshot(),d,owner,lib);assert.deepEqual(next.items.map(i=>i.title),['New','Original']);
 const remove=delta();remove.base_token=u;remove.record_index.items=[[second,u]];
 next=mergeRecordDelta(next,remove,owner,lib);assert.deepEqual(next.items.map(i=>i.id),[second]);
});
test('updated metadata without a revision increment is replaced, not lost',()=>{
 const d=delta();d.record_index.items=[[id,u]];d.rows.items=[{...book(id,'Updated'),metadata:{CoverURL:'https://example.test/new.jpg'}}];
 assert.equal(mergeRecordDelta(snapshot(),d,owner,lib).items[0].metadata.CoverURL,'https://example.test/new.jpg');
});
test('missing changed rows, unknown extras, duplicates and foreign owners fail closed',()=>{
 for(const mutate of [d=>d.owner_id=lib,d=>d.base_token=u,d=>d.record_index.items=[[id,u]],d=>d.rows.items=[book(second,'Extra')],d=>d.rows.items=[book(id,'X'),book(id,'X')],d=>d.record_index.items.push([id,t])]){
  const d=delta();mutate(d);assert.throws(()=>mergeRecordDelta(snapshot(),d,owner,lib));
 }
});
test('malformed and private record targets are rejected',()=>{
 for(const value of [null,{}, {items:[],episodes:[],settings:[['__cdl_tracker_run','a'.repeat(32)]]},{items:[['bad',t]],episodes:[],settings:[]}])assert.throws(()=>validateRecordIndex(value));
});
function rpcHarness(){const calls=[];const index={index_version:1,library_id:lib,owner_id:owner,observed_at:stamp,change_token:u,transaction_token:'1:2:',records:{items:[[id,t],[second,u]],episodes:[],settings:[]}};let guards=0;
 return {calls,index,rpc:async(name,args)=>{calls.push([name,args]);if(name==='cdl_v14_renderer_index')return {data:index,error:null};if(name==='cdl_v14_renderer_state'){guards++;return {data:{...index},error:null};}return {data:{library_id:lib,owner_id:owner,section:args.p_section,rows:args.p_keys.map(key=>book(key,'Fetched'))},error:null};}};}
test('only changed records cross the paged read boundary',async()=>{
 const f=rpcHarness(),d=await readRecordDelta(f.rpc,lib,snapshot().record_index,t);
 assert.deepEqual(f.calls.filter(([n])=>n==='cdl_v14_renderer_records').map(([,a])=>a.p_keys),[[second]]);
 assert.equal(mergeRecordDelta(snapshot(),d,owner,lib).items.length,2);
});
test('cold load requests every record and returns a complete validated snapshot',async()=>{
 const f=rpcHarness(),d=await readRecordDelta(f.rpc,lib,undefined,null);
 assert.equal(mergeRecordDelta(null,d,owner,lib).items.length,2);
});
test('concurrent writes retry once and never return a mixed snapshot',async()=>{
 const f=rpcHarness();let indexes=0;const rpc=async(n,a)=>{const result=await f.rpc(n,a);if(n==='cdl_v14_renderer_index')indexes++;if(n==='cdl_v14_renderer_state')result.data={...result.data,transaction_token:'9:10:'};return result;};
 await assert.rejects(readRecordDelta(rpc,lib,undefined,null),/both incremental/);assert.equal(indexes,2);
});
test('a missing target or failed database never produces a partial success',async()=>{
 for(const mode of ['missing','error','owner']){const f=rpcHarness();const rpc=async(n,a)=>{const r=await f.rpc(n,a);if(n==='cdl_v14_renderer_records'){if(mode==='missing')r.data.rows=[];if(mode==='error')return {data:null,error:{code:'503'}};if(mode==='owner')r.data.owner_id=lib;}return r;};await assert.rejects(readRecordDelta(rpc,lib,undefined,null));}
});

test('a single episode update in a 2,349-item / 3,313-episode library transfers under 10 percent of a full snapshot',()=>{
 const uid=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
 const base=snapshot();base.items=Array.from({length:2349},(_,n)=>({...book(uid(n+1),'Synthetic item '+n),metadata:{description:'x'.repeat(2000)}}));
 base.items[0].media_type='tv';
 base.episodes=Array.from({length:3313},(_,n)=>({id:uid(n+3000),library_id:lib,show_id:base.items[0].id,season_number:1,episode_number:n+1,provider_id:String(n),metadata:{Overview:'x'.repeat(1500)},progress:null}));
 base.counts={items:2349,episodes:3313,settings:0};base.record_index={items:base.items.map(i=>[i.id,t]),episodes:base.episodes.map(e=>[e.id,t]),settings:[]};
 const d=delta();d.record_index=structuredClone(base.record_index);d.record_index.episodes[0][1]=u;
 d.rows.episodes=[{...base.episodes[0],progress:{watched:true,watched_at:stamp,revision:1}}];
 const merged=mergeRecordDelta(base,d,owner,lib);assert.equal(merged.episodes[0].progress.watched,true);assert.equal(merged.episodes[1].progress,null);
 const full=Buffer.byteLength(JSON.stringify(base)),incremental=Buffer.byteLength(JSON.stringify(d));
 assert.ok(incremental<full*0.1,`${incremental} vs ${full}`);
 console.log(`Synthetic transfer: full ${full} bytes; one-episode delta ${incremental} bytes (${(100*incremental/full).toFixed(1)}%)`);
});
