import test from 'node:test';
import assert from 'node:assert/strict';
import {groupLibraryActivity} from '../../app/lib/v14/library-activity.ts';
import {projectActivity} from '../../app/lib/v14/activity.ts';
const row={EventID:'save-one',ItemID:'item-one',EventKind:'full_edit',Sheet:'Games',Title:'Fixture',Timestamp:'2026-10-26T12:00:00Z',Field:'Status','Old Value':'Wishlist','New Value':'Queued'};
test('one save stays together, while independent saves at the same timestamp stay separate',()=>{
 const entries=groupLibraryActivity([row,{...row,Field:'Rating','Old Value':'7','New Value':'8'},{...row,EventID:'save-two'}]);
 assert.equal(entries.length,2);assert.equal(entries[0].changes.length,2);assert.equal(entries[0].summary,'Status changed to Queued');
});
test('technical settings, sync records and episode metadata never appear as library changes',()=>{
 assert.deepEqual(groupLibraryActivity([{...row,Sheet:'Settings',Field:'__cdl_tracker_run_v1:x'},{...row,Sheet:'TV Episodes',EventKind:'episode_metadata'},{...row,Sheet:'Sync'}]),[]);
});
test('creation and archive labels come from real event kinds and values',()=>{
 assert.equal(groupLibraryActivity([{...row,EventKind:'create'}])[0].summary,'Added to your library');
 assert.equal(groupLibraryActivity([{...row,EventKind:'archive',Field:'Archived','New Value':'true'}])[0].summary,'Archived from your library');
});
test('episode changes group per show and preserve episode-specific field labels',()=>{
 const entries=groupLibraryActivity([{...row,Sheet:'TV Episodes',EventKind:'episode_progress',Field:'S1 E1 · Watched','New Value':'true'},{...row,Sheet:'TV Episodes',EventKind:'episode_progress',Field:'S1 E2 · Watched','New Value':'true'}]);
 assert.equal(entries.length,1);assert.equal(entries[0].summary,'Marked as watched');assert.equal(entries[0].changes[1].field,'S1 E2 · Watched');
});
test('projection retains stable save and item identities without exposing arbitrary event fields',()=>{
 const projected=projectActivity({changelog:[],events:[{id:'save-one',entity_id:'item-one',entity_kind:'full_edit',created_at:row.Timestamp,privateValue:'hidden',changes:{before:{title:'Fixture',media_type:'game',user_status:'Wishlist',personal_rating:7},after:{title:'Fixture',media_type:'game',user_status:'Queued',personal_rating:8}}}]});
 assert.equal(projected[0].EventID,'save-one');assert.equal(projected[0].ItemID,'item-one');assert.equal(groupLibraryActivity(projected).length,1);assert.equal(JSON.stringify(projected).includes('hidden'),false);
});
test('legacy rows remain grouped without inventing identities or dates',()=>{
 const legacy={...row};delete legacy.EventID;delete legacy.ItemID;delete legacy.EventKind;
 const entries=groupLibraryActivity([legacy,{...legacy,Field:'Rating'}]);assert.equal(entries.length,1);assert.equal(entries[0].itemId,'');
});

const created={EventID:'verity-created',ItemID:'verity-id',EventKind:'create',Sheet:'Movies',Title:'Verity',Timestamp:'2026-10-27T14:58:59.659Z',Field:'title','Old Value':'','New Value':'Verity'};
function artwork(event,field,time,before='') {return {...created,EventID:event,EventKind:'full_edit',Field:field,Timestamp:time,'Old Value':before,'New Value':field.toLowerCase().includes('date')?time:'https://example.test/art.jpg'};}
const coverTime='2026-10-27T14:59:07.253Z',backgroundTime='2026-10-27T14:59:12.774Z';
const cover=()=>['R2CoverUrl','r2CoverUrl','R2CoverUrl_Date'].map(field=>artwork('cover-saved',field,coverTime));
const background=()=>['R2BackdropUrl','r2BackdropUrl','R2BackdropUrl_Date'].map(field=>artwork('background-saved',field,backgroundTime));
test('Verity creation and its two initial artwork saves become one expandable activity in either input order',()=>{
 for(const rows of [[...background(),...cover(),created],[created,...cover(),...background()]]){
  const original=structuredClone(rows);const entries=groupLibraryActivity(rows);
  assert.equal(entries.length,1);assert.equal(entries[0].kind,'create');assert.equal(entries[0].summary,'Added to your library');
  assert.equal(entries[0].timestamp,created.Timestamp);assert.equal(entries[0].changes.length,7);
  assert.equal(entries[0].changes.filter(c=>c.field==='R2BackdropUrl').length,1);
  assert.deepEqual(rows,original,'Audit input must not be modified');
 }
});
test('artwork replacements and later uploads remain independent activities',()=>{
 for(const art of [artwork('replacement','R2CoverUrl',coverTime,'https://example.test/old.jpg'),artwork('later','R2CoverUrl','2026-10-27T15:10:00Z'),artwork('before-create','R2CoverUrl','2026-10-27T14:58:50Z')])assert.equal(groupLibraryActivity([created,art]).length,2);
});
test('status, rating and notes edits are never folded into creation and end the initial artwork group',()=>{
 for(const field of ['Status','Rating','Notes']){
  const edit={...created,EventID:'real-edit',EventKind:'full_edit',Timestamp:'2026-10-27T14:59:04Z',Field:field,'New Value':'Changed'};
  assert.equal(groupLibraryActivity([created,edit,...cover()]).length,3);
 }
});
test('matching titles, foreign item identities and missing identities cannot merge creation history',()=>{
 for(const change of [{ItemID:'another-edition'},{ItemID:''},{Sheet:'Games'}]){
  assert.equal(groupLibraryActivity([created,...cover().map(row=>({...row,...change}))]).length,2);
 }
 const noIdentity={...created,ItemID:''};assert.equal(groupLibraryActivity([noIdentity,...cover().map(row=>({...row,ItemID:''}))]).length,2);
});
test('mixed edits and legacy events stay separate even inside the setup window',()=>{
 const mixed=[...cover(),{...cover()[0],Field:'Notes','New Value':'Actual review'}];
 assert.equal(groupLibraryActivity([created,...mixed]).length,2);
 assert.equal(groupLibraryActivity([created,...cover().map(row=>({...row,EventKind:''}))]).length,2);
});
test('invalid timestamps cannot merge artwork; same-time creation still precedes setup uploads',()=>{
 assert.equal(groupLibraryActivity([{...created,Timestamp:'bad'},...cover()]).length,2);
 assert.equal(groupLibraryActivity([created,...cover().map(row=>({...row,Timestamp:'bad'}))]).length,2);
 assert.equal(groupLibraryActivity([...cover().map(row=>({...row,Timestamp:created.Timestamp})),created]).length,1);
});

const action='11111111-1111-4111-8111-111111111111';
test('explicit actions group follow-ups across delays, retain root date and preserve every diff',()=>{
 const root={...row,ActivityID:action,ActivityRole:'user'};
 const upload={...root,EventID:'upload',ActivityRole:'artwork',Timestamp:'2026-10-27T12:00:00Z',Field:'R2CoverUrl','New Value':'art'};
 const entries=groupLibraryActivity([upload,root]);
 assert.equal(entries.length,1);assert.equal(entries[0].timestamp,root.Timestamp);assert.equal(entries[0].changes.length,2);assert.equal(entries[0].summary,'Status changed to Queued');
});
test('separate explicit actions never merge even during the legacy window',()=>{
 const root={...created,ActivityID:action,ActivityRole:'user'};
 for(const next of [{...cover()[0],ActivityID:'22222222-2222-4222-8222-222222222222',ActivityRole:'user'},cover()[0]])assert.equal(groupLibraryActivity([root,next]).length,2);
 assert.equal(groupLibraryActivity([root,{...cover()[0],ItemID:'other',ActivityID:action,ActivityRole:'artwork'}]).length,2);
});
test('Gears completion, metadata and replacement artwork condense while previous edits stay independent',()=>{
 const root={...row,Title:'Gears of War: E-Day',Timestamp:'2026-10-29T15:53:50.102Z','New Value':'Completed'};
 const metadata={...root,EventID:'metadata',Timestamp:'2026-10-29T15:54:30.806Z',Field:'IGDB Rating','Old Value':'','New Value':'8.3/10'};
 const cover={...root,EventID:'cover',Timestamp:'2026-10-29T15:54:35.458Z',Field:'R2CoverUrl','Old Value':'old','New Value':'new'};
 for(const input of [[root,metadata,cover],[cover,metadata,root]]){
  const entries=groupLibraryActivity([...input,{...root,EventID:'older',Timestamp:'2026-10-10T12:00:00Z'}]);
  assert.equal(entries.length,2);assert.equal(entries[0].changes.length,3);assert.equal(entries[0].summary,'Status changed to Completed');
 }
 assert.equal(groupLibraryActivity([root,cover]).length,2,'Standalone replacement is ambiguous');
 const later={...root,EventID:'separate',Timestamp:'2026-10-29T15:54:20Z',Field:'Notes','New Value':'Later edit'};
 const entries=groupLibraryActivity([root,later,metadata,cover]);assert.equal(entries.length,2);assert.equal(entries[1].changes.length,1);
});
test('provider scores are normalized and never summarized as personal ratings',()=>{
 const events=[{id:'metadata',entity_id:'item-one',entity_kind:'full_edit',created_at:row.Timestamp,changes:{before:{media_type:'game',user_fields:{}},after:{media_type:'game',user_fields:{Rating:'82.6547941808316','IGDB Rating':'82.6547941808316'}}}}];
 const rows=projectActivity({events,changelog:[]});assert.equal(rows[0].Field,'IGDB Rating');assert.equal(rows[0]['New Value'],'8.3/10');assert.equal(groupLibraryActivity(rows)[0].summary,'Updated metadata');
 const personal=projectActivity({events:[{...events[0],changes:{before:{media_type:'game',personal_rating:8},after:{media_type:'game',personal_rating:8.9}}}],changelog:[]});
 assert.equal(personal[0].Field,'My Rating');assert.equal(groupLibraryActivity(personal)[0].summary,'Rating changed to 8.9');
});
test('only valid activity contexts survive the audit projection',()=>{
 const event={created_at:row.Timestamp,id:'edit',entity_id:'item-one',entity_kind:'full_edit',changes:{activity_id:action,activity_role:'user',before:{media_type:'game',notes:''},after:{media_type:'game',notes:'note'}}};
 assert.equal(projectActivity({events:[event],changelog:[]})[0].ActivityID,action);
 assert.equal(projectActivity({events:[{...event,changes:{...event.changes,activity_role:'anything'}}],changelog:[]})[0].ActivityID,undefined);
});
