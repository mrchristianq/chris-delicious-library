import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutomaticEpisodeLoader} from '../../app/lib/v14/automatic-episode-load.ts';

test('callback changes and Strict Mode subscriptions share the same automatic load',async()=>{
 const once=createAutomaticEpisodeLoader();let calls=0,complete;
 const first=once('show',()=>{calls++;return new Promise(resolve=>complete=resolve);});
 await Promise.resolve();
 const remounted=once('show',async()=>{calls++;return ['duplicate'];});
 assert.equal(first,remounted);complete(['episode']);
 assert.deepEqual(await remounted,['episode']);assert.equal(calls,1);
});
test('empty results and failures do not repeatedly retry while the screen stays open',async()=>{
 for(const failed of [false,true]) {
  const once=createAutomaticEpisodeLoader();let calls=0;
  const load=async()=>{calls++;if(failed)throw new Error('provider unavailable');return [];};
  for(let render=0;render<100;render++) await once('show',load).catch(()=>{});
  assert.equal(calls,1);
 }
});
test('other shows and a newly opened screen can fetch fresh data',async()=>{
 let calls=0;const load=async()=>{calls++;return [];};
 const once=createAutomaticEpisodeLoader();await once('first',load);await once('second',load);
 await createAutomaticEpisodeLoader()('first',load);assert.equal(calls,3);
});
