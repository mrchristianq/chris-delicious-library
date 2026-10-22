import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(s,c,n){return n(s==='./edit-contract'?s+'.ts':s,c);}});
const {saveFullEdit}=await import('../../app/lib/v14/save-full-edit.ts');hooks.deregister();
const item={id:'11111111-1111-4111-8111-111111111111',media_type:'book',revision:1,title:'Book',user_status:'Collection',personal_rating:0,completed_on:null,notes:'old',metadata:{},user_fields:{}};
const request='22222222-2222-4222-8222-222222222222';
function writer(){let saved;return {authenticate:async()=>true,write:async(id,revision,request,patch)=>(saved={...item,...patch,user_fields:{...item.user_fields,...patch.overrides},revision:revision+1}),read:async()=>saved??item};}
test('confirms cleared notes and zero rating only after fresh readback',async()=>{
 const result=await saveFullEdit(writer(),item,request,{notes:'',myRating:'0'});assert.equal(result.item.notes,'');assert.equal(result.confirmed,true);
});
test('no-op reads current state without a write',async()=>{
 const w=writer();w.write=async()=>assert.fail('no-op write');assert.equal((await saveFullEdit(w,item,request,{title:'Book'})).changed,false);
});
test('success receipt with old or conflicting readback is not confirmation',async()=>{
 const w=writer();w.read=async()=>item;await assert.rejects(saveFullEdit(w,item,request,{notes:''}),/not confirmed/);
 w.read=async()=>({...item,revision:2});await assert.rejects(saveFullEdit(w,item,request,{notes:''}),/field mismatch/);
});
