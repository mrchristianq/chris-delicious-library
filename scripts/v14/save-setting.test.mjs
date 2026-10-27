import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const hooks=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&['./targeted-readback','./read-library','./library-snapshot','./tracker-projection','./edit-contract','./legacy-row'].includes(s)?s+'.ts':s,c);}});
const {saveSetting}=await import('../../app/lib/v14/save-setting.ts');hooks.deregister();
const owner='11111111-1111-4111-8111-111111111111',library='22222222-2222-4222-8222-222222222222',request='33333333-3333-4333-8333-333333333333';
function writer(value){const setting={key:'theme',revision:2,value:{value}};return {authenticatedOwner:async()=>owner,write:async()=>({...setting,library_id:library}),snapshot:async()=>({schema_version:1,complete:true,library_id:library,owner_id:owner,observed_at:new Date().toISOString(),change_token:'test',counts:{items:0,episodes:0,settings:1},items:[],episodes:[],settings:[setting]})};}
test('setting saves preserve clear, false, zero and JSON-as-text preferences',async()=>{
 for(const value of ['',false,0,null,'{"theme":"dark","3d":true}']) assert.equal((await saveSetting(writer(value),library,'theme',1,request,value)).confirmed,true);
});
test('stale setting profiles and readback mismatch cannot report success',async()=>{
 const w=writer('dark');const read=w.snapshot;
 w.snapshot=async()=>{const s=await read();s.settings[0].value.legacy_profiles={general_getSetting:'light'};return s;};
 await assert.rejects(saveSetting(w,library,'theme',1,request,'dark'),/readback mismatch/);
 await assert.rejects(saveSetting(writer('light'),library,'theme',1,request,'dark'),/invalid receipt/);
});
test('setting authentication failure prevents writes and fresh reads',async()=>{
 const w=writer('dark');
 w.authenticatedOwner=async()=>null;
 w.write=async()=>{assert.fail('unauthenticated write');};
 w.snapshot=async()=>{assert.fail('unauthenticated read');};
 await assert.rejects(saveSetting(w,library,'theme',1,request,'dark'),/Authentication required/);
});
test('a valid receipt cannot hide failed or wrong-owner independent readback',async()=>{
 const w=writer('dark');
 w.snapshot=async()=>{throw new Error('offline');};
 await assert.rejects(saveSetting(w,library,'theme',1,request,'dark'),/offline/);
 const other=writer('dark'), read=other.snapshot;
 other.snapshot=async()=>({...await read(),owner_id:request});
 await assert.rejects(saveSetting(other,library,'theme',1,request,'dark'));
});
