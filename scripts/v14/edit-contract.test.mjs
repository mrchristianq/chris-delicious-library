import test from 'node:test';
import assert from 'node:assert/strict';
import { fullEditPatch, EDIT_FIELDS } from '../../app/lib/v14/edit-contract.ts';
import { readFileSync } from 'node:fs';
const base={id:'item',media_type:'book',title:'Title',revision:1,user_status:'Collection',personal_rating:0,completed_on:null,notes:'',metadata:{},user_fields:{}};
test('unchanged and omitted fields produce no writes',()=>{
 assert.deepEqual(fullEditPatch(base,{title:'Title',myRating:'0',notes:'',completedDate:'',status:'Collection'}),{});
});
test('existing movie Watching label maps to canonical Started without changing TV status',()=>{
 assert.deepEqual(fullEditPatch({...base,media_type:'movie',user_status:'Watched'},{watchStatus:'Watching'}),{user_status:'Started'});
 assert.deepEqual(fullEditPatch({...base,media_type:'movie',user_status:'Started'},{watchStatus:'Watching'}),{});
 assert.deepEqual(fullEditPatch({...base,media_type:'tv',user_status:'Started'},{watchStatus:'Pending Release'}),{user_status:'Pending Release'});
});
test('clears all aliases rather than resurrecting stale metadata',()=>{
 const result=fullEditPatch({...base,metadata:{Type:'Audiobook',Types:'Audiobook',ISBN:'old',isbn:'older'}},{type:'eBook',isbn:''});
 assert.deepEqual(result,{overrides:{Type:'eBook',Types:'eBook',ISBN:'',isbn:''}});
 assert.throws(()=>fullEditPatch({...base,metadata:{Type:'Audiobook'}},{type:''}),/Invalid book type/);
});
test('TV and movie provider Status is independent of viewing status',()=>{
 for(const media_type of ['tv','movie']){
 const result=fullEditPatch({...base,media_type,user_status:'Started',metadata:{Status:'In Production'}},{[media_type==='tv'?'showStatus':'status']:'Released',watchStatus:media_type==='tv'?'Pending Release':'Watched'});
 assert.equal(result.overrides.Status,'Released');assert.equal(result.user_status,media_type==='tv'?'Pending Release':'Watched');
 }
});
test('rating zero, intentional clear, multiline notes and date validation',()=>{
 assert.deepEqual(fullEditPatch({...base,personal_rating:5,completed_on:'2026-01-01'},{myRating:'0',completedDate:'',notes:'one\n\ntwo'}),{personal_rating:0,completed_on:null,notes:'one\n\ntwo'});
 assert.throws(()=>fullEditPatch(base,{myRating:'6'}));assert.throws(()=>fullEditPatch(base,{completedDate:'2025-02-29'}));
 assert.throws(()=>fullEditPatch(base,{id:'other'}));
});
test('database override allowlist exactly matches the form contract',()=>{
 const sql=readFileSync(new URL('../../supabase/migrations/20261013000700_v14_full_edit.sql',import.meta.url),'utf8');
 const allowed=JSON.parse(sql.match(/allowed := '([^\n]+)'::jsonb;/)[1]);
 assert.deepEqual(allowed,Object.fromEntries(Object.entries(EDIT_FIELDS).map(([type,fields])=>[type,[...new Set(Object.values(fields).flat())].sort()])));
});
test('all literal fields in existing Edit and metadata-selection forms are covered',()=>{
 for(const [type,name] of [['book','Book'],['movie','Movie'],['tv','TV'],['game','Game']]){
  const source=readFileSync(new URL(`../../app/components/${name}DetailsEditModal.tsx`,import.meta.url),'utf8');
  const keys=[...source.matchAll(/\{\s*key:\s*"([^"]+)"/g)].map(match=>match[1]);
  const canonical=['title','myRating','notes',type==='book'?'completedDate':type==='movie'?'watchDate':'dateCompleted',type==='tv'||type==='movie'?'watchStatus':'status'];
  for(const key of keys)assert.ok(canonical.includes(key)||Object.hasOwn(EDIT_FIELDS[type],key),`${type} field not covered: ${key}`);
 }
});
