import test from 'node:test';
import assert from 'node:assert/strict';
const {readBoundedSnapshot,readBoundedRendererSnapshot}=await import('../../app/lib/v14/bounded-snapshot.ts');
const library='22222222-2222-4222-8222-222222222222',owner='11111111-1111-4111-8111-111111111111';
const fixture=()=>({items:Array.from({length:405},(_,id)=>({id})),episodes:[{id:'episode',progress:null}],settings:[{key:'theme'}],identifiers:[],collections:[{id:'collection',key:'list',definition:{}}],collection_items:[{collection_id:'collection',item_id:'item',position:3}]});
function transport(rows=fixture(),change=()=>{},token='a'.repeat(32)) {
 const calls=[];let manifests=0,active=0,maxActive=0;
 const rpc=async(name,args)=>{
   calls.push({name,...args});
   if(name==='cdl_v14_snapshot_guard'){
     const data={library_id:library,owner_id:owner,observed_at:new Date().toISOString(),change_token:token,transaction_token:'10:11:',counts:Object.fromEntries(Object.entries(rows).map(([k,v])=>[k,v.length]))};
     change(data,++manifests);
     return {data,error:null};
   }
   active++;maxActive=Math.max(maxActive,active);await new Promise(resolve=>setImmediate(resolve));active--;
   return {data:{library_id:library,owner_id:owner,section:args.p_section,offset:args.p_offset,rows:rows[args.p_section].slice(args.p_offset,args.p_offset+args.p_limit)},error:null};
 };
 return {rpc,calls,maxActive:()=>maxActive};
}
test('assembles every page including unknown progress and collection order, with bounded concurrency',async()=>{
 const t=transport();const snapshot=await readBoundedSnapshot(t.rpc,library);
 assert.equal(snapshot.items.length,405);assert.equal(snapshot.items.at(-1).id,404);
 assert.equal(snapshot.episodes[0].progress,null);
 assert.deepEqual(snapshot.collections[0].items,[{item_id:'item',position:3}]);
 assert.equal(t.maxActive(),3);assert.equal(t.calls.filter(c=>c.name.endsWith('guard')).length,2);
});
test('discards all pages on version change, and repeats a complete fresh read',async()=>{
 const t=transport(undefined,(data,n)=>{if(n>=2)data.change_token='b'.repeat(32);});
 const snapshot=await readBoundedSnapshot(t.rpc,library);
 assert.equal(snapshot.change_token,'b'.repeat(32));assert.equal(t.calls.filter(c=>c.p_section==='items'&&c.p_offset===0).length,2);
});
test('continuous writes fail without returning mixed or stale data',async()=>{
 const t=transport(undefined,(data,n)=>{data.change_token=String(n).repeat(32);});
 await assert.rejects(readBoundedSnapshot(t.rpc,library),/both fresh read/);
});
test('rejects transient writes even when row manifest returns to its original value',async()=>{
 const t=transport(undefined,(data,n)=>{data.transaction_token=`10:${11+n}:`;});
 await assert.rejects(readBoundedSnapshot(t.rpc,library),/both fresh read/);
});
test('rejects partial pages, wrong owners, malformed counts and failed reads',async()=>{
 for(const mutate of [
   data=>{if(data.section==='items')data.rows=[];},
   data=>{if(data.section)data.owner_id=library;},
   data=>{if(data.counts)data.counts.items=-1;},
 ]){
   const t=transport();
   await assert.rejects(readBoundedSnapshot(async(n,a)=>{const response=await t.rpc(n,a);mutate(response.data);return response;},library));
 }
 await assert.rejects(readBoundedSnapshot(async()=>({data:null,error:{code:'57014'}}),library),/57014/);
});

test('renderer projection uses scoped RPCs without changing the full-reader contract',async()=>{
 const rows=fixture();rows.identifiers=[];rows.collections=[];rows.collection_items=[];
 const t=transport(rows),names=[];
 const snapshot=await readBoundedRendererSnapshot((name,args)=>{names.push(name);return t.rpc(name==='cdl_v14_renderer_guard'?'cdl_v14_snapshot_guard':'cdl_v14_snapshot_page',args);},library);
 assert.equal(snapshot.items.length,405);assert.ok(names.every(n=>n==='cdl_v14_renderer_guard'||n==='cdl_v14_renderer_page'));
});
test('only a missing migration permits legacy fresh-read fallback; permission and database failures remain errors',async()=>{
 const t=transport();let scoped=0;
 const snapshot=await readBoundedRendererSnapshot((name,args)=>{if(name.startsWith('cdl_v14_renderer_')){scoped++;return {data:null,error:{code:'PGRST202'}};}return t.rpc(name,args);},library);
 assert.equal(scoped,1);assert.equal(snapshot.items.length,405);
 for(const code of ['42501','57014'])await assert.rejects(readBoundedRendererSnapshot(async()=>({data:null,error:{code}}),library),new RegExp(code));
});
