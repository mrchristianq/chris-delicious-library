import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-projection','./edit-contract','./legacy-row','./tracker-write-plan','./tracker-reconcile','./tracker-read'].includes(s)?s+'.ts':s,c);}});
const {buildInitialTrackerBaseline:build}=await import('../../app/lib/v14/tracker-baseline.ts');h.deregister();
const lib='11111111-1111-4111-8111-111111111111',id='22222222-2222-4222-8222-222222222222';
const item={id,library_id:lib,media_type:'game',title:'Fixture',revision:1,user_status:'Abandoned',personal_rating:8,completed_on:null,notes:'private',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:'7599'}};
const tables=()=>[{name:'Games',headers:['Title','Platform','IGDB_ID','Status'],rows:[['Fixture','Steam','7599','Abandoned']]},{name:'Shows',headers:['Title','TMDB_ID'],rows:[]},{name:'Books',headers:['Title','isbn','Type'],rows:[]},{name:'Movies',headers:['Title','TMDB_ID'],rows:[]}];
test('baseline captures agreed retained fields only, never Notes/progress and never synthetic completion',()=>{
 const result=build([item],tables());assert.equal(result.records.length,1);assert.equal(result.records[0].fields.Status,'Abandoned');assert.equal(JSON.stringify(result).includes('private'),false);assert.match(result.fingerprint,/^[a-f0-9]{64}$/);
});
test('one mismatched field, missing record, duplicate record, extra tracker record or excluded column blocks the whole baseline',()=>{
 const changed=tables();changed[0].rows[0][3]='Completed';assert.throws(()=>build([item],changed));
 const duplicate=tables();duplicate[0].rows.push(duplicate[0].rows[0]);assert.throws(()=>build([item],duplicate));
 const extra=tables();extra[0].rows.push(['Other','Steam','100','Completed']);assert.throws(()=>build([item],extra));
 const notes=tables();notes[0].headers.push('Notes');assert.throws(()=>build([item],notes));
 assert.throws(()=>build([item],tables().slice(1)));assert.throws(()=>build([item,item],tables()));
});
test('retained TV episode totals are metadata, while episode watched progress remains excluded',()=>{
 const t=tables();t[0].rows=[];t[1]={name:'Shows',headers:['Title','TMDB_ID','NumberOfEpisodes','WatchStatus'],rows:[['Show','8','10','Completed']]};
 const show={...item,media_type:'tv',title:'Show',user_status:'Completed',metadata:{TMDB_ID:'8',NumberOfEpisodes:10},user_fields:{}};
 assert.equal(build([show],t).records[0].fields.NumberOfEpisodes,10);
 t[1].headers.push('Episodes Watched');assert.throws(()=>build([show],t));
});
