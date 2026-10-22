import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
// Match the app bundler's extensionless local TypeScript resolution in Node tests.
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
 if (specifier === './legacy-row' && context.parentURL?.endsWith('/library-snapshot.ts')) return nextResolve('./legacy-row.ts', context);
 return nextResolve(specifier, context);
}});
const { projectLibrarySnapshot } = await import('../../app/lib/v14/library-snapshot.ts');
hooks.deregister();
const owner = '11111111-1111-4111-8111-111111111111';
const library = '22222222-2222-4222-8222-222222222222';
const showId = '33333333-3333-4333-8333-333333333333';
const episodeId = '44444444-4444-4444-8444-444444444444';
const fixture = () => ({schema_version:1, library_id:library,owner_id:owner,observed_at:'2026-10-12T12:00:00Z',change_token:'snapshot-test-1',complete:true,
 counts:{items:1,episodes:1,settings:1},
 items:[{id:showId,library_id:library,media_type:'tv',title:'Example',revision:1,user_status:'Pending Release',personal_rating:null,completed_on:null,notes:'',user_fields:{},metadata:{TMDB_ID:'123',Status:'Returning Series'}}],
 episodes:[{id:episodeId,library_id:library,show_id:showId,season_number:0,episode_number:1,provider_id:'456',metadata:{Watched:'true',WatchedAt:'2020-01-01',_import:{}},progress:null}],
 settings:[{key:'cover',revision:1,value:{value:'default',legacy_profiles:{general_getSetting:'first',popupCoverMode:'last'}}}]});
test('unknown, explicit false and true progress stay distinct; specials survive',()=>{
 for(const progress of [null,{watched:false,watched_at:null,revision:1},{watched:true,watched_at:'2026-10-01T12:00:00Z',revision:2}]){
  const input=fixture();input.episodes[0].progress=progress;
  const result=projectLibrarySnapshot(input,owner,library);
  assert.equal(result.episodes[0].row.Watched,progress===null?'':String(progress.watched));
  assert.equal(result.episodes[0].row.WatchedAt,progress?.watched_at??'');
  assert.equal(result.episodes[0].identity.progressRevision,progress?.revision??null);
  assert.equal(result.episodes[0].row.SeasonNumber,'0');
  assert.equal(result.episodes[0].row._import,undefined);
 }
});
test('settings retain consumer profiles, false, zero and blank without fallback',()=>{
 const input=fixture();const result=projectLibrarySnapshot(input,owner,library);
 assert.equal(result.settingValue('cover'),'first');assert.equal(result.settingValue('cover','popupCoverMode'),'last');
 for(const value of [false,0,'',null]){input.settings[0].value.legacy_profiles.general_getSetting=value;assert.equal(projectLibrarySnapshot(input,owner,library).settingValue('cover'),value);}
 assert.equal(result.settingValue('missing'),undefined);
});
test('rejects incomplete, foreign, duplicate and orphaned snapshots',()=>{
 const changes=[s=>s.complete=false,s=>s.counts.items=2,s=>s.owner_id=library,s=>s.items[0].library_id=owner,s=>s.episodes[0].show_id=owner,s=>s.episodes[0].progress={watched:'false',revision:1,watched_at:null},s=>{s.items.push(s.items[0]);s.counts.items++;},s=>{s.settings.push(s.settings[0]);s.counts.settings++;}];
 for(const mutate of changes){const input=fixture();mutate(input);assert.throws(()=>projectLibrarySnapshot(input,owner,library));}
});
test('projects a full 2500-item library without the diagnostic 60-item page limit',()=>{
 const input=fixture();
 for(let i=1;i<2500;i++) input.items.push({...input.items[0],id:`55555555-5555-4555-8555-${String(i).padStart(12,'0')}`,media_type:'game'});
 input.counts.items=2500;
 const result=projectLibrarySnapshot(input,owner,library);
 assert.equal(result.items.length,2500);
 assert.equal(new Set(result.items.map(item=>item.identity.itemId)).size,2500);
});
