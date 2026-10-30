import test from 'node:test';
import assert from 'node:assert/strict';
import {editorSections} from '../../app/lib/v14/editor-layout.ts';
const fields=['title','ownership','status','watchStatus','myRating','watchDate','dateCompleted','completedDate','type','narrator','audiobookDuration','pages','author','notes','backlog','completed','yearPlayed','posterUrl','tmdbId','genres'].map(key=>({key,label:key}));
test('ownership belongs exclusively to book and game forms, including advanced sections',()=>{
 for(const type of ['movie','tv'])assert.equal(Object.values(editorSections(type,fields,{})).flat().some(f=>f.key==='ownership'),false);
 for(const type of ['book','game'])assert.ok(editorSections(type,fields,{}).personal.some(f=>f.key==='ownership'));
});
test('TV Pending Release and source IDs remain accessible without duplicate status controls',()=>{
 const status={key:'watchStatus',label:'Watch status',options:['Completed','Pending Return','Pending Release']};
 const sections=editorSections('tv',[status,{key:'tmdbId',label:'TMDB ID'}],{watchStatus:'Pending Release'});
 assert.ok(sections.personal[0].options.includes('Pending Release'));assert.equal(sections.sources[0].key,'tmdbId');
 const game=editorSections('game',fields,{});assert.equal(Object.values(game).flat().some(f=>['backlog','completed'].includes(f.key)),false);assert.ok(game.metadata.some(f=>f.key==='yearPlayed'));
});
test('conditional completion fields retain existing dates even after changing status',()=>{
 for(const [media,date,status] of [['movie','watchDate','watchStatus'],['tv','dateCompleted','watchStatus'],['game','dateCompleted','status'],['book','completedDate','status']]){
  const get=v=>editorSections(media,fields,v).personal.some(f=>f.key===date);
  assert.equal(get({[status]:'Backlog'}),false);assert.equal(get({[status]:'Completed'}),true);assert.equal(get({[status]:'Paused',[date]:'2026-10-27'}),true);
 }
});
test('book formats reveal only relevant audiobook controls without mutating stored values',()=>{
 const values={type:'Physical',narrator:'Saved narrator',audiobookDuration:'10:00',pages:'400'};
 const physical=editorSections('book',fields,values);assert.equal(physical.personal.some(f=>f.key==='narrator'),false);assert.ok(physical.metadata.some(f=>f.key==='pages'));
 const audio=editorSections('book',fields,{...values,type:'Audiobook'});assert.ok(audio.personal.some(f=>f.key==='narrator'));assert.equal(audio.metadata.some(f=>f.key==='pages'),false);assert.equal(values.narrator,'Saved narrator');
});
