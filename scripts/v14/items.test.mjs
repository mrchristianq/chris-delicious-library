import test from 'node:test';
import assert from 'node:assert/strict';
import { ratingPatch, toRatingItem } from '../../app/lib/v14/items.ts';
test('patch preserves explicit clear, zero and untouched fields',()=>{
 assert.deepEqual(ratingPatch({myRating:'0',notes:'',dateCompleted:''}),{personal_rating:0,notes:'',completed_on:null});
 assert.deepEqual(ratingPatch({notes:'a\nb'}),{notes:'a\nb'});
 assert.throws(()=>ratingPatch({myRating:'NaN'}));
 assert.throws(()=>ratingPatch({title:'overwrite'}));
});
test('canonical personal fields win over stale legacy aliases',()=>{
 const result=toRatingItem({metadata:{Notes:'old'},user_fields:{'My Rating':5,Notes:'old',WatchDate:'2020-01-01','Completed Date':'2020-01-01'},title:'Book',media_type:'book',personal_rating:0,notes:'',completed_on:null,user_status:'Collection'});
 assert.equal(result.notes,'');assert.equal(result.Notes,'');assert.equal(result['My Rating'],'0');assert.equal(result.status,'Collection');
 assert.equal(result.WatchDate,'');assert.equal(result['Completed Date'],'');
});
