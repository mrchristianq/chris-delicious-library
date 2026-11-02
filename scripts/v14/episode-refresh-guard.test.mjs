import test from 'node:test';
import assert from 'node:assert/strict';
import {episodeRefreshGuard} from '../../app/lib/v14/episode-refresh-guard.ts';
test('allowed refresh proceeds; guarded refresh returns a small uncached 429',async()=>{
 const client={rpc:async(name,args)=>{assert.equal(name,'cdl_v14_episode_refresh_guard');assert.deepEqual(args,{p_stage:'provider',p_key:'123'});return {data:{retry_after:0},error:null};}};
 assert.equal(await episodeRefreshGuard(client,'provider','123'),null);
 const response=await episodeRefreshGuard({rpc:async()=>({data:{retry_after:59},error:null})},'metadata','id');
 assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'59');assert.match(response.headers.get('cache-control'),/no-store/);
 assert.ok((await response.text()).length<250);
});
test('missing migration, failed counters and malformed receipts fail closed',async()=>{
 for(const result of [{data:null,error:{}},{data:null,error:null},{data:{},error:null},{data:{retry_after:-1},error:null},{data:{retry_after:'0'},error:null}]){
  assert.equal((await episodeRefreshGuard({rpc:async()=>result},'provider','123')).status,503);
 }
});
