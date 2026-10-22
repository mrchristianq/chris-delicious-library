import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {manualOrderSettings,saveManualOrder} from '../../app/lib/v14/manual-order.ts';

for(const view of ['wishlist','now-playing','wishlist-books','play-next','watchlist-movies','watchlist-tv']){
 test(`${view}: confirms stable-key order plus Manual/Asc without changing media`,async()=>{
  const keys=['game:db:library:edition-two','game:db:library:edition-one'];
  const settings=manualOrderSettings(view,keys);const writes=[];
  await saveManualOrder(async(key,value)=>{writes.push({key,value});},settings);
  assert.deepEqual(writes,[{key:`viewManualOrder:${view}`,value:JSON.stringify(keys)},{key:`viewSortField:${view}`,value:'Manual'},{key:`viewSortOrder:${view}`,value:'Asc'}]);
  assert.deepEqual(keys,['game:db:library:edition-two','game:db:library:edition-one']);
 });
}
for(const failAt of [0,1,2]){
 test(`failure at setting ${failAt+1} rejects the whole operation and does not run later writes`,async()=>{
  const writes=[];const settings=manualOrderSettings('play-next',['one','two']);
  await assert.rejects(saveManualOrder(async(key)=>{writes.push(key);if(writes.length===failAt+1)throw new Error('Unconfirmed setting');},settings),/Unconfirmed/);
  assert.equal(writes.length,failAt+1);
 });
}
test('completion remains pending until the last confirmation resolves',async()=>{
 const settings=manualOrderSettings('watchlist-tv',['one']);let release;let finished=false;
 const pending=new Promise(resolve=>{release=resolve;});
 const saving=saveManualOrder(async(key)=>{if(key==='viewSortOrder:watchlist-tv')await pending;},settings).then(()=>{finished=true;});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(finished,false);
 release();await saving;assert.equal(finished,true);
});
test('v14 drag activation and drop do not enqueue fire-and-forget legacy sort saves',()=>{
 const source=readFileSync(new URL('../../app/page.tsx',import.meta.url),'utf8');
 for(const name of ['persistBacklogManualOrder','activateWishlistPointerDrag']){
  const start=source.indexOf(`const ${name} =`);
  assert.ok(start>=0);
  const body=source.slice(start,source.indexOf('\n  );',start));
  assert.match(body,/if \(!libraryBackend\) persistBacklogSortSettings/);
  if(name==='persistBacklogManualOrder')assert.match(body,/await saveManualOrder\(writeDatabaseSetting, settings\)/);
 }
});
