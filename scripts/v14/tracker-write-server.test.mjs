import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-read','./tracker-read-server','./hosted-preview','./tracker-hosted-credential','./tracker-google-dispatch','./tracker-google-request','./tracker-google-batch','./tracker-write-plan','./tracker-reconcile','./tracker-projection','./edit-contract','./legacy-row'].includes(s)?s+'.ts':s,c);}});
const {writeTrackerPreparedStep:write}=await import('../../app/lib/v14/tracker-write-server.ts');h.deregister();
test('write transport is disabled by default, on wrong target, outside isolated test mode and on hosted/native runtimes',async()=>{
 const names=['CDL_V14_TRACKER_WRITE_TARGET','CDL_V14_TEST','VERCEL','NEXT_PUBLIC_NATIVE_APP'];const previous=Object.fromEntries(names.map(n=>[n,process.env[n]]));
 const target='1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
 try{
  for(const flags of [{},{CDL_V14_TRACKER_WRITE_TARGET:'original',CDL_V14_TEST:'true'},{CDL_V14_TRACKER_WRITE_TARGET:target},{CDL_V14_TRACKER_WRITE_TARGET:target,CDL_V14_TEST:'true',VERCEL:'1'},{CDL_V14_TRACKER_WRITE_TARGET:target,CDL_V14_TEST:'true',NEXT_PUBLIC_NATIVE_APP:'true'}]){
   names.forEach(n=>delete process.env[n]);Object.assign(process.env,flags);
   await assert.rejects(write({}, {}, {}, {}),/not enabled/);
  }
 }finally{for(const name of names)if(previous[name]===undefined)delete process.env[name];else process.env[name]=previous[name];}
});
