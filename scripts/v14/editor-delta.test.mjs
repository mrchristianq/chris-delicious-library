import test from 'node:test';
import assert from 'node:assert/strict';
import { editorDelta } from '../../app/lib/v14/editor-delta.ts';
import { fullEditPatch } from '../../app/lib/v14/edit-contract.ts';

for (const media_type of ['book','movie','tv','game']) {
 test(`${media_type}: form-normalized fields stay untouched on notes-only edits`,()=>{
  const item={__cdlIdentity:{itemId:'uuid',revision:1}};
  const genreKey=media_type==='book'?'genre':'genres';
  const initial={[genreKey]:'Normalized, Genres',notes:'old',myRating:'4.5'};
  const values={...initial,notes:'new\n\nreview'};
  const delta=editorDelta(item,values,initial);
  assert.deepEqual(delta,{notes:'new\n\nreview'});
  const stored={media_type,notes:'old',metadata:{Genre:'Raw / Genres'},user_fields:{},personal_rating:4.5};
  assert.deepEqual(fullEditPatch(stored,delta),{notes:'new\n\nreview'});
  assert.deepEqual(editorDelta(item,{...initial,notes:'',myRating:''},initial),{notes:'',myRating:''});
  assert.deepEqual(editorDelta(item,initial,initial),{});
  assert.deepEqual(initial,{[genreKey]:'Normalized, Genres',notes:'old',myRating:'4.5'});
 });
}
test('v13 and new-item forms retain their complete existing payload',()=>{
 const values={title:'Title',notes:'',genres:'Normalized'};
 assert.equal(editorDelta({},values,values),values);
});
test('explicit metadata selection changes are included, including blank clears',()=>{
 assert.deepEqual(editorDelta({__cdlIdentity:{}},{genres:'New',posterUrl:''},{genres:'Old',posterUrl:'old'}),{genres:'New',posterUrl:''});
});
