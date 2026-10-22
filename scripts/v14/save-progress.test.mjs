import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const hooks=registerHooks({resolve(specifier,context,next){
 if(context.parentURL?.includes('/app/lib/v14/') && ['./read-library','./library-snapshot','./legacy-row'].includes(specifier))return next(specifier+'.ts',context);
 return next(specifier,context);
}});
const {saveEpisodeProgress}=await import('../../app/lib/v14/save-progress.ts');hooks.deregister();
const owner='11111111-1111-4111-8111-111111111111',library='22222222-2222-4222-8222-222222222222',show='33333333-3333-4333-8333-333333333333',episode='44444444-4444-4444-8444-444444444444',request='55555555-5555-4555-8555-555555555555';
const changes=[{episode_id:episode,revision:null,watched:false,watched_at:null}];
function fixture(){return {schema_version:1,complete:true,library_id:library,owner_id:owner,observed_at:new Date().toISOString(),change_token:'test',counts:{items:1,episodes:1,settings:0},settings:[],items:[{id:show,library_id:library,media_type:'tv',title:'Show',revision:1,user_status:'Started',personal_rating:null,completed_on:null,notes:'',metadata:{},user_fields:{}}],episodes:[{id:episode,library_id:library,show_id:show,season_number:1,episode_number:1,provider_id:null,metadata:{},progress:{revision:1,watched:false,watched_at:null}}]};}
function writer(){return {authenticatedOwner:async()=>owner,write:async()=>[{...changes[0],revision:1,library_id:library}],snapshot:async()=>fixture()};}
test('reports confirmation only after explicit false is freshly read back',async()=>{assert.equal((await saveEpisodeProgress(writer(),library,request,changes)).confirmed,true);});
test('HTTP success cannot mask missing, changed or unavailable readback',async()=>{
 for(const progress of [null,{revision:1,watched:true,watched_at:null},{revision:2,watched:false,watched_at:null}]){const w=writer();w.snapshot=async()=>{const s=fixture();s.episodes[0].progress=progress;return s;};await assert.rejects(saveEpisodeProgress(w,library,request,changes),/not confirmed/);}
 const w=writer();w.snapshot=async()=>{throw new Error('offline');};await assert.rejects(saveEpisodeProgress(w,library,request,changes),/offline/);
});
test('rejects partial receipt, duplicate targets, and missing authentication',async()=>{
 const w=writer();w.write=async()=>[];await assert.rejects(saveEpisodeProgress(w,library,request,changes),/incomplete/);
 await assert.rejects(saveEpisodeProgress(writer(),library,request,[...changes,...changes]),/Invalid/);
 const denied=writer();denied.authenticatedOwner=async()=>null;denied.write=async()=>assert.fail('unauthorized write');await assert.rejects(saveEpisodeProgress(denied,library,request,changes),/Authentication/);
});
