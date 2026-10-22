import test from 'node:test';
import assert from 'node:assert/strict';
import { saveArchive } from '../../app/lib/v14/save-archive.ts';
const id='11111111-1111-4111-8111-111111111111';
const request='22222222-2222-4222-8222-222222222222';
function writer() {
  let state;
  return {authenticate:async()=>true,write:async(id,revision,request,archived)=>(state={id,revision:revision+1,archived}),read:async()=>state};
}
test('archive and restore require independent explicit state confirmation',async()=>{
  for(const archived of [true,false]) assert.equal((await saveArchive(writer(),id,1,request,archived)).state.archived,archived);
});
test('missing item does not prove deletion; changed revision or state fails',async()=>{
  for(const state of [null,{id,revision:3,archived:true},{id,revision:2,archived:false}]) {
    const w=writer();w.read=async()=>state;
    await assert.rejects(saveArchive(w,id,1,request,true),/not confirmed/);
  }
});
test('invalid identity and unauthenticated requests never write',async()=>{
  const w=writer();w.write=async()=>assert.fail('must not write');
  await assert.rejects(saveArchive(w,'title',1,request,true),/Invalid/);
  w.authenticate=async()=>false;
  await assert.rejects(saveArchive(w,id,1,request,true),/Authentication/);
});
