import test from 'node:test';
import assert from 'node:assert/strict';
import {compareTracker} from '../../app/lib/v14/tracker-preview.ts';
import {isExcludedTrackerField} from '../../app/lib/v14/tracker-read.ts';
const fields=[{key:'status',label:'Status'}];
const row=value=>({id:'game:edition-steam',title:'Fixture',media:'Game',fields:{status:value}});
const compare=(a,b,base)=>compareTracker([row(a)],[row(b)],fields,base===undefined?{}:{'game:edition-steam':{status:base}});
test('three-way comparison separates one-sided updates, conflicts and equal changes',()=>{
 assert.equal(compare('Completed','Started','Started')[0].direction,'export');
 assert.equal(compare('Started','Completed','Started')[0].direction,'import');
 assert.equal(compare('Abandoned','Completed','Started')[0].direction,'conflict');
 assert.deepEqual(compare('Completed','Completed','Started'),[]);
});
test('initial reconciliation never guesses which side is authoritative',()=>{
 assert.equal(compare('Completed','Started')[0].direction,'review');
 assert.equal(compare('Completed','Started')[0].baseline,undefined);
});
test('blank, null, false and zero are explicit values, not missing columns',()=>{
 for(const value of ['',null,false,0]) {
  const result=compare(value,'Started','Started')[0];
  assert.equal(result.direction,'export');assert.equal(result.app,value);
 }
});
test('missing rows or columns are review conditions, never deletion or clearing',()=>{
 for(const [a,b] of [[[row('Started')],[]],[[],[row('Started')]],[[row('Started')],[{...row('Started'),fields:{}}]]])
  assert.equal(compareTracker(a,b,fields,{})[0].direction,'review');
});
test('ambiguous identities and excluded or duplicate mappings fail closed',()=>{
 assert.throws(()=>compareTracker([row('x'),row('x')],[],fields,{}),/duplicate/);
 for(const key of ['notes','Notes','episode_progress','watched_at'])assert.throws(()=>compareTracker([],[],[{key,label:key}],{}),/excluded/);
 assert.throws(()=>compareTracker([],[],[...fields,...fields],{}),/unique/);
});
test('platform editions remain independent and inputs are not mutated',()=>{
 const rows=[row('Started'),{...row('Completed'),id:'game:edition-xbox'}];
 const before=JSON.stringify(rows);
 assert.equal(compareTracker(rows,rows.map(r=>({...r,fields:{status:'Started'}})),fields,{}).length,1);
 assert.equal(JSON.stringify(rows),before);
});
test('retained series count agrees with the shared field policy, but watched progress stays excluded',()=>{
 for(const key of ['NumberOfEpisodes','Notes','EpisodeProgress','watched_at','EpisodesWatched','NotesExtra']) {
  const run=()=>compareTracker([],[],[{key,label:key}],{});
  if(isExcludedTrackerField(key))assert.throws(run,/excluded/);else assert.deepEqual(run(),[]);
 }
 const a={...row(''),fields:{NumberOfEpisodes:12}};
 const b={...a,fields:{NumberOfEpisodes:10}};
 assert.equal(compareTracker([a],[b],[{key:'NumberOfEpisodes',label:'Episode count'}],{[a.id]:{NumberOfEpisodes:10}})[0].direction,'export');
});
test('exhaustive scalar change matrix never guesses a winner or mutates the confirmed baseline',()=>{
 const values=['',null,false,true,0,1,'Completed','Abandoned'];
 for(const base of values)for(const a of values)for(const b of values){
  const baseline={'game:edition-steam':{status:base}};
  const original=JSON.stringify(baseline);
  const result=compareTracker([row(a)],[row(b)],fields,baseline);
  const expected=Object.is(a,b)?null:Object.is(a,base)?'import':Object.is(b,base)?'export':'conflict';
  assert.equal(result[0]?.direction??null,expected);
  assert.equal(JSON.stringify(baseline),original);
  assert.deepEqual(compareTracker([row(a)],[row(b)],fields,baseline),result);
 }
});
test('invalid non-scalar and non-finite values cannot produce a sync intent',()=>{
 for(const value of [undefined,NaN,Infinity,{},[]]){
  assert.throws(()=>compare(value,'Started','Started'),/Invalid/);
  assert.throws(()=>compare('Started',value,'Started'),/Invalid/);
  assert.throws(()=>compareTracker([row('Started')],[row('Completed')],fields,{'game:edition-steam':{status:value}}),/Invalid/);
 }
 assert.throws(()=>compareTracker([],[],[{key:' Status ',label:'Status'}],{}),/unique/);
});
test('after independent confirmation and baseline advancement, repeated comparisons are quiet',()=>{
 for(const [a,b,base] of [['Completed','Started','Started'],['Started','Completed','Started'],['Abandoned','Completed','Started']]){
  assert.equal(compare(a,b,base).length,1);
  // Simulate separately confirmed convergence, not an HTTP success acknowledgement.
  assert.deepEqual(compare(b,b,b),[]);
  assert.equal(compare('Next edit',b,b)[0].direction,'export');
 }
});
