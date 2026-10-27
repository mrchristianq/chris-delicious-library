import test from 'node:test';
import assert from 'node:assert/strict';
import {rendererIdentity} from '../../app/lib/v14/renderer-entry.ts';
import {blocksValidationWrite} from '../../app/lib/v14/route-policy.ts';

const owner='00000000-0000-4000-8000-000000000001';
const library='00000000-0000-4000-8000-000000000002';
test('renderer is keyed to one verified owner and library, never an arbitrary first entry',()=>{
 assert.deepEqual(rendererIdentity(owner,[{id:library}]),{ownerId:owner,libraryId:library,key:`${owner}:${library}`});
 for(const rows of [null,{},[],[null],[{id:'bad'}],[{id:library},{id:owner}]])assert.equal(rendererIdentity(owner,rows),null);
 assert.equal(rendererIdentity('bad',[{id:library}]),null);
 assert.notEqual(rendererIdentity(owner,[{id:library}]).key,rendererIdentity(library,[{id:library}]).key);
});
test('review-only exception admits only the review decision POST',()=>{
 assert.equal(blocksValidationWrite('/v14/api/sync-review','POST',true,true),false);
 assert.equal(blocksValidationWrite('/v14/api/sync-execution','POST',true,true),false);
 assert.equal(blocksValidationWrite('/v14/api/sync-execution','POST',true,false),true);
 assert.equal(blocksValidationWrite('/v14/api/sync-execution/apply','POST',true,true),true);
 assert.equal(blocksValidationWrite('/v14/api/sync-execution','DELETE',true,true),true);
 assert.equal(blocksValidationWrite('/v14/api/sync-review','POST',true,false),true);
 for(const path of ['/v14/api/library','/v14/api/artwork','/api/sheets-write','/v14/api/sync-review/extra'])assert.equal(blocksValidationWrite(path,'POST',true,true),true);
 for(const method of ['PUT','PATCH','DELETE'])assert.equal(blocksValidationWrite('/v14/api/sync-review',method,true,true),true);
});
test('read-only smoke validation blocks mutation routes and actions, not provider reads',()=>{
 for(const path of ['/v14','/v14/api/items','/v14/api/settings','/v14/api/artwork','/api/sheets-write']){
  for(const method of ['POST','PUT','PATCH','DELETE'])assert.equal(blocksValidationWrite(path,method,true),true);
  for(const method of ['GET','HEAD','OPTIONS'])assert.equal(blocksValidationWrite(path,method,true),false);
  assert.equal(blocksValidationWrite(path,'POST',false),false);
 }
 for(const path of ['/api/recommendations','/v14/api/provider/recommendations']){
  assert.equal(blocksValidationWrite(path,'POST',true),false);
  assert.equal(blocksValidationWrite(path,'DELETE',true),true);
 }
});

test('incremental comparison is read-only even though the inventory uses POST',()=>{
 assert.equal(blocksValidationWrite('/v14/api/library/read','POST',true),false);
 for(const method of ['DELETE','PUT','PATCH'])assert.equal(blocksValidationWrite('/v14/api/library/read',method,true),true);
 assert.equal(blocksValidationWrite('/v14/api/library','POST',true),true);
});
