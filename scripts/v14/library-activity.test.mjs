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
