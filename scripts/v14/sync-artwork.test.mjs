import test from 'node:test';
import assert from 'node:assert/strict';
import {automaticArtworkSources,createDatabaseEditSaver,editedArtworkSources,syncDatabaseArtwork} from '../../app/lib/v14/sync-artwork.ts';

test('automatic sync skips generated fallback artwork for an image-free manual entry',async()=>{
 const item={posterUrl:'/covers/games/manual-entry.jpg',posterUrlFallback:'/covers/games/manual-entry.jpg'};
 const sources=automaticArtworkSources(item,{cover:item.posterUrl,backdrop:''});
 assert.deepEqual(sources,{cover:'',backdrop:''});
 await syncDatabaseArtwork({artwork:async()=>assert.fail('Generated fallback caused an upload')},item,sources,row=>row);
});
test('automatic sync still backs up a real backdrop when the cover is only a fallback',async()=>{
 const item={posterUrlFallback:'/covers/games/manual-entry.jpg'};const calls=[];
 await syncDatabaseArtwork({artwork:async(_item,source,kind)=>{calls.push({source,kind});return {R2BackdropUrl:'saved'};}},item,
  automaticArtworkSources(item,{cover:item.posterUrlFallback,backdrop:'https://provider/backdrop'}),row=>row);
 assert.deepEqual(calls,[{source:'https://provider/backdrop',kind:'backdrop'}]);
});
test('real and explicit artwork sources are not silently skipped',async()=>{
 const item={posterUrlFallback:'/covers/games/manual-entry.jpg'};
 assert.equal(automaticArtworkSources(item,{cover:'https://provider/cover',backdrop:''}).cover,'https://provider/cover');
 const explicit=automaticArtworkSources(item,{cover:item.posterUrlFallback,backdrop:''},' https://bad-source.invalid/image ');
 await assert.rejects(syncDatabaseArtwork({artwork:async()=>{throw new Error('Source rejected');}},item,explicit,row=>row),/Source rejected/);
 assert.equal(automaticArtworkSources(item,{cover:'',backdrop:''},item.posterUrlFallback).cover,item.posterUrlFallback);
});
test('automatic sync preserves blank sources and existing backed-up artwork',async()=>{
 assert.deepEqual(automaticArtworkSources({}, {cover:'',backdrop:''}),{cover:'',backdrop:''});
 const item={R2CoverUrl:'https://r2/cover',posterUrlFallback:'/covers/fallback.jpg'};
 await syncDatabaseArtwork({artwork:async()=>assert.fail('Existing artwork uploaded again')},item,
  automaticArtworkSources(item,{cover:item.R2CoverUrl,backdrop:''}),row=>row);
});

for (const [type,key] of [['book','imageUrl'],['movie','posterUrl'],['tv','posterUrl'],['game','coverUrl']]) {
 test(`${type}: unrelated Full Edit preserves custom artwork and performs no uploads`,async()=>{
  const original={[key]:'https://provider/cover',backdropUrl:'https://provider/backdrop',R2CoverUrl:'https://r2/custom-cover',R2BackdropUrl:'https://r2/custom-backdrop'};
  const sources=editedArtworkSources(type,original,{[key]:original[key],backdropUrl:original.backdropUrl,notes:'changed'});
  assert.deepEqual(sources,{cover:'',backdrop:''});
  await syncDatabaseArtwork({artwork:async()=>assert.fail('Unrelated edit uploaded artwork')},original,sources,row=>row);
  assert.deepEqual(editedArtworkSources(type,original,{notes:''}),{cover:'',backdrop:''});
  assert.deepEqual(editedArtworkSources(type,original,{[key]:'',backdropUrl:''}),{cover:'',backdrop:''});
 });
}
test('changed artwork syncs only the edited source, including backdrop-only changes',()=>{
 const original={posterUrl:'old-cover',backdropUrl:'old-backdrop'};
 assert.deepEqual(editedArtworkSources('movie',original,{posterUrl:'new-cover',backdropUrl:'old-backdrop'}),{cover:'new-cover',backdrop:''});
 assert.deepEqual(editedArtworkSources('tv',original,{posterUrl:'old-cover',backdropUrl:'new-backdrop'}),{cover:'',backdrop:'new-backdrop'});
 assert.deepEqual(editedArtworkSources('book',{ImageURL:'source'},{imageUrl:' source '}),{cover:'',backdrop:''});
});

test('cover and backdrop use consecutive confirmed revisions and preserve item identity',async()=>{
 const calls=[];const confirmed=[];
 const backend={artwork:async(item,source,kind)=>{
  calls.push({item,source,kind});
  return {...item,__cdlRevision:String(Number(item.__cdlRevision)+1),[kind==='cover'?'R2CoverUrl':'R2BackdropUrl']:`https://r2.invalid/${kind}`};
 }};
 const result=await syncDatabaseArtwork(backend,{__cdlItemId:'edition-one',__cdlRevision:'2'},{cover:'https://source/cover',backdrop:'https://source/backdrop'},row=>{confirmed.push(row);return row;});
 assert.equal(result,'https://r2.invalid/cover');
 assert.deepEqual(calls.map(call=>call.item.__cdlRevision),['2','3']);
 assert.ok(calls.every(call=>call.item.__cdlItemId==='edition-one'));
 assert.equal(confirmed.length,2);
});
test('already backed-up cover does not prevent a missing backdrop from syncing',async()=>{
 const calls=[];
 await syncDatabaseArtwork({artwork:async(item,source,kind)=>{calls.push(kind);return {...item,R2BackdropUrl:'saved'};}},
  {R2CoverUrl:'existing'},{cover:'existing',backdrop:'source'},row=>row);
 assert.deepEqual(calls,['backdrop']);
});
test('partial failure keeps confirmed cover and rejects rather than claiming full success',async()=>{
 const applied=[];
 await assert.rejects(syncDatabaseArtwork({artwork:async(item,source,kind)=>{
  if(kind==='backdrop')throw new Error('Backdrop not confirmed');
  return {R2CoverUrl:'saved-cover'};
 }},{},{cover:'source',backdrop:'backdrop'},row=>{applied.push(row);return row;}),/not confirmed/);
 assert.deepEqual(applied,[{R2CoverUrl:'saved-cover'}]);
});

function continuationHarness(failKind='backdrop') {
 const identity={itemId:'edition-one',libraryId:'library',revision:1};
 let current={__cdlIdentity:identity,posterUrl:'old',backdropUrl:'old-backdrop'};
 const edits=[],artwork=[];let fail=true;
 const next=patch=>({...current,...patch,__cdlIdentity:{...current.__cdlIdentity,revision:current.__cdlIdentity.revision+1}});
 const journal=new Map();
 const backend={
  storage:{getItem:key=>journal.get(key)??null,setItem:(key,value)=>journal.set(key,value),removeItem:key=>journal.delete(key)},
  edit:async(item,updates)=>{
   assert.equal(item.__cdlIdentity.revision,current.__cdlIdentity.revision,'must use own last confirmed revision');
   edits.push({item,updates});if(Object.keys(updates).length)current=next(updates);
   return current;
  },
  artwork:async(item,source,kind)=>{
   assert.equal(item.__cdlIdentity.revision,current.__cdlIdentity.revision);
   artwork.push({source,kind,revision:item.__cdlIdentity.revision});
   if(fail && kind===failKind){fail=false;throw new Error('Unconfirmed artwork');}
   current=next({[kind==='cover'?'R2CoverUrl':'R2BackdropUrl']:`saved-${source}`});return current;
  },
 };
 const save=createDatabaseEditSaver(backend,(_type,row)=>row);
 return {save,edits,artwork,journal,reopen:()=>createDatabaseEditSaver(backend,(_type,row)=>row),get current(){return current;},externalEdit(){current=next({notes:'external'});}};
}
test('reopened Full Edit resumes only unfinished artwork without caching item contents',async()=>{
 const h=continuationHarness();
 await assert.rejects(h.save('movie',h.current,{notes:'private review',posterUrl:'new',backdropUrl:'new-backdrop'}));
 assert.equal(h.journal.size,1);
 assert.ok(![...h.journal.values()][0].includes('private review'));
 await h.reopen()('movie',h.current,{});
 assert.deepEqual(h.artwork.map(call=>call.kind),['cover','backdrop','backdrop']);
 assert.equal(h.journal.size,0);
});
test('reopened artwork continuation does not silently adopt a newer external revision',async()=>{
 const h=continuationHarness('cover');
 await assert.rejects(h.save('movie',h.current,{posterUrl:'new'}));
 h.externalEdit();
 await assert.rejects(h.reopen()('movie',h.current,{}),/revision/i);
 assert.equal(h.artwork.length,1);
 assert.equal(h.current.notes,'external');
});
test('explicit replacement can supersede an older persisted artwork intent',async()=>{
 const h=continuationHarness('cover');
 await assert.rejects(h.save('movie',h.current,{posterUrl:'new'}));
 h.externalEdit();
 await h.reopen()('movie',h.current,{posterUrl:'replacement'});
 assert.equal(h.current.notes,'external');
 assert.equal(h.current.R2CoverUrl,'saved-replacement');
 assert.equal(h.journal.size,0);
});
test('corrupt retry records fail closed before another item edit',async()=>{
 for(const raw of ['not json','{"version":1,"revision":2,"sources":{"cover":null,"backdrop":""}}']){
  const h=continuationHarness('cover');
  await assert.rejects(h.save('movie',h.current,{posterUrl:'new'}));
  h.journal.set([...h.journal.keys()][0],raw);
  const count=h.edits.length;
  await assert.rejects(h.reopen()('movie',h.current,{}),/retry record/);
  assert.equal(h.edits.length,count);
 }
});
test('unavailable retry storage cannot produce a successful artwork save',async()=>{
 const item={__cdlIdentity:{itemId:'one',libraryId:'library',revision:1},posterUrl:'old'};
 const save=createDatabaseEditSaver({
  storage:{getItem:()=>null,setItem:()=>{throw new Error('Storage unavailable');},removeItem:()=>{}},
  edit:async()=>({...item,__cdlIdentity:{...item.__cdlIdentity,revision:2}}),
  artwork:async()=>assert.fail('No upload before retry intent is retained'),
 },(_type,row)=>row);
 await assert.rejects(save('movie',item,{posterUrl:'new'}),/Item changes saved, but artwork was not confirmed: Storage unavailable/);
});
test('Full Edit retry after editor reset resumes failed backdrop without re-uploading confirmed cover',async()=>{
 const h=continuationHarness();const original=h.current;
 await assert.rejects(h.save('movie',original,{notes:'saved',posterUrl:'new',backdropUrl:'new-backdrop'}),/Item changes saved, but artwork was not confirmed/);
 assert.equal(h.current.notes,'saved');assert.equal(h.current.R2CoverUrl,'saved-new');
 await h.save('movie',h.current,{}); // Existing form resets to confirmed props after partial save.
 assert.deepEqual(h.artwork.map(call=>call.kind),['cover','backdrop','backdrop']);
 assert.equal(h.current.R2BackdropUrl,'saved-new-backdrop');
 await h.save('movie',h.current,{});
 assert.equal(h.artwork.length,3,'completed continuation must not run again');
});
test('a cover failure is retained when the next editor delta is empty',async()=>{
 const h=continuationHarness('cover');
 await assert.rejects(h.save('movie',h.current,{posterUrl:'new'}),/not confirmed/);
 await h.save('movie',h.current,{});
 assert.deepEqual(h.artwork.map(call=>call.source),['new','new']);
});
test('explicit replacement or clearing supersedes only the pending artwork source',async()=>{
 for(const source of ['replacement','']){
  const h=continuationHarness('cover');
  await assert.rejects(h.save('movie',h.current,{posterUrl:'new'}));
  await h.save('movie',h.current,{posterUrl:source});
  assert.equal(h.current.posterUrl,source);
  assert.deepEqual(h.artwork.map(call=>call.source),source?['new',source]:['new']);
 }
});
test('an external edit between partial save and retry is not silently rebased or overwritten',async()=>{
 const h=continuationHarness('cover');
 await assert.rejects(h.save('movie',h.current,{posterUrl:'new'}));
 h.externalEdit();
 await assert.rejects(h.save('movie',h.current,{}),/last confirmed revision/);
 assert.equal(h.current.notes,'external');assert.equal(h.artwork.length,1);
});
test('failed item edits do not start an artwork continuation',async()=>{
 const save=createDatabaseEditSaver({edit:async()=>{throw new Error('Revision conflict');},artwork:async()=>assert.fail('Unexpected upload')},(_type,row)=>row);
 await assert.rejects(save('movie',{__cdlIdentity:{itemId:'one',libraryId:'library'}},{posterUrl:'new'}),/Revision conflict/);
});

test('Full Edit artwork retries retain the original activity after a confirmed cover',async()=>{
 const id='11111111-1111-4111-8111-111111111111',rows=new Map(),calls=[];
 const item={__cdlIdentity:{itemId:'item',libraryId:'lib',revision:1},coverUrl:'old',backdropUrl:'old'};
 const apply=(_type,row)=>({...row,__cdlIdentity:{itemId:'item',libraryId:'lib',revision:Number(row.revision)}});
 let first=true;
 const backend={storage:{getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)},
  edit:async()=>({revision:'2',__cdlActivityId:id}),
  artwork:async(_item,_source,kind,context)=>{calls.push({kind,context});if(kind==='backdrop'&&first){first=false;throw Error('timeout');}return {revision:kind==='cover'?'3':'4',__cdlActivityId:id,R2CoverUrl:'r2'};}};
 await assert.rejects(createDatabaseEditSaver(backend,apply)('game',item,{coverUrl:'new',backdropUrl:'new'}),/artwork was not confirmed/);
 const journal=JSON.parse([...rows.values()][0]);assert.equal(journal.activityId,id);assert.equal(journal.sources.cover,'');
 backend.edit=async()=>({revision:'3'}); // Fresh, unchanged text read has no new action ID.
 await createDatabaseEditSaver(backend,apply)('game',{...item,__cdlIdentity:{...item.__cdlIdentity,revision:3}},{});
 assert.equal(calls.length,3);assert.ok(calls.every(c=>c.context?.id===id && c.context.role==='artwork'));assert.equal(rows.size,0);
});
