import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(s,c,n){return n(s==='./edit-contract'?s+'.ts':s,c);}});
const {prepareCreate,createItem}=await import('../../app/lib/v14/create-item.ts');hooks.deregister();
const library='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222',request='33333333-3333-4333-8333-333333333333';
const prepare=(type,values)=>prepareCreate(library,id,request,type,values,'2026-10-13');
function writer() {let item;return {authenticate:async()=>true,write:async(v)=>(item={id:v.itemId,media_type:v.mediaType,revision:2,notes:'',personal_rating:null,completed_on:null,...v.patch,user_fields:v.patch.overrides??{},metadata:{}}),read:async()=>item};}
test('creation preserves game defaults and explicit platform editions',()=>{
 const p=prepare('game',{title:'Game',platform:'',status:'',format:''});
 assert.equal(p.patch.user_status,'Wishlist');assert.equal(p.patch.overrides.Platform,'Wishlist');assert.equal(p.patch.overrides.Format,'Digital');assert.equal(p.patch.overrides.Ownership,'Wishlist');assert.equal(p.patch.overrides['Date Added'],'2026-10-13');
 assert.equal(prepare('game',{title:'Game',platform:'Steam',status:'Collection'}).patch.overrides.Platform,'Steam');
});
test('book, movie and TV create use existing forms and preserve Notes',()=>{
 const book=prepare('book',{title:'Book',notes:'First\n\nSecond',myRating:'4.9'});
 assert.equal(book.patch.personal_rating,4.9);assert.equal(book.patch.notes,'First\n\nSecond');assert.equal(book.patch.overrides.Type,'Physical');
 assert.equal(prepare('movie',{title:'Film'}).patch.user_status,'Backlog');
 assert.equal(prepare('tv',{title:'Show',watchStatus:'Pending Release',showStatus:'In Production'}).patch.user_status,'Pending Release');
});
test('invalid forms fail before persistence',()=>{
 for(const [type,values] of [['book',{}],['book',{title:'B',myRating:'9'}],['book',{title:'B',type:'PDF'}],['tv',{title:'S',dateCompleted:'2026-02-30'}]]) assert.throws(()=>prepare(type,values));
});
test('create confirms independent readback for all four media types',async()=>{
 for(const type of ['book','movie','tv','game']) assert.equal((await createItem(writer(),prepare(type,{title:'New',notes:'Review'}))).confirmed,true);
});
test('missing, stale or mismatched readback cannot claim Add success',async()=>{
 for(const read of [null,{id,media_type:'book',revision:3},{id,media_type:'book',revision:2,title:'Wrong',user_fields:{}}]) {
  const w=writer();w.read=async()=>read;await assert.rejects(createItem(w,prepare('book',{title:'Book'})),/not confirmed/);
 }
});
test('authentication is required before creation',async()=>{
 const w=writer();w.authenticate=async()=>false;w.write=async()=>assert.fail('write');
 await assert.rejects(createItem(w,prepare('book',{title:'Book'})),/Authentication/);
});
