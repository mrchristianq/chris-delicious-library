import test from "node:test";import assert from "node:assert/strict";import {registerHooks} from "node:module";
const hook=registerHooks({resolve(s,c,n){return n(["./tracker-reconcile","./legacy-row"].includes(s)?s+".ts":s,c);}});
const {initialTrackerReview:review}=await import("../../app/lib/v14/tracker-mapped-review.ts");
const {validateTrackerProvenance}=await import("../../app/lib/v14/tracker-provenance.ts");hook.deregister();
const library="11111111-1111-4111-8111-111111111111",id="22222222-2222-4222-8222-222222222222",source="33333333-3333-4333-8333-333333333333";
const item=(extra={})=>({id,library_id:library,media_type:"game",title:"Fixture",revision:1,user_status:"Abandoned",personal_rating:null,completed_on:null,notes:"private",user_fields:{Platform:"Steam"},metadata:{IGDB_ID:"7599"},...extra});
const hint=(extra={})=>({itemId:id,sourceId:source,primary:true,media:"game",title:"Fixture",edition:"Steam",provider:"62151",...extra});
const table=(rows=[["Fixture","Steam","62151","Started"]])=>({name:"Games",headers:["Title","Platform","IGDB_ID","Status"],rows});
test("approved historical identity links to current UUID without restoring old provider or user fields",()=>{
 const r=review([item()],[table()],"now",[hint()]);
 assert.equal(r.identityIssues,0);assert.equal(r.matchedRecords,1);
 assert.equal(r.changes.find(c=>c.plannedAction==="provider-correction").resolutionAllowed,false);
 assert.equal(r.changes.find(c=>c.field==="Status").app,"Abandoned");
 assert.equal(r.changes.find(c=>c.field==="Status").tracker,"Started");
 assert.equal(JSON.stringify(r).includes("private"),false);
});
test("approved duplicates become a planned consolidation, not arbitrary field winners",()=>{
 const rows=[["Fixture","Steam","62151","Started"],["Fixture","Steam","62151","Completed"]];
 const r=review([item()],[table(rows)],"now",[hint(),hint({sourceId:library,primary:false})]);
 assert.equal(r.identityIssues,0);assert.equal(r.matchedRecords,1);assert.equal(r.changes.length,1);
 assert.equal(r.changes[0].plannedAction,"duplicate-cleanup");assert.match(r.changes[0].app,/Abandoned/);assert.equal(r.changes[0].resolutionAllowed,false);
});
test("extra duplicates beyond historical multiplicity or shared source ownership stay blocked",()=>{
 const t=table([["Fixture","Steam","62151","Started"],["Fixture","Steam","62151","Started"]]);
 assert.ok(review([item()],[t],"now",[hint()]).identityIssues>0);
 const other=item({id:source});
 assert.ok(review([item(),other],[table()],"now",[hint(),hint({itemId:source,sourceId:library})]).identityIssues>0);
});
test("corrected platform/title aliases map only through history, not a global title inference",()=>{
 const current=item({title:"Fable",user_status:"Wishlist",metadata:{IGDB_ID:"92550"}});
 const t=table([["Fable","Wishlist","92550","Wishlist"]]);
 const r=review([current],[t],"now",[hint({title:"Fable",edition:"Wishlist",provider:"92550"})]);
 assert.equal(r.identityIssues,0);assert.equal(r.changes[0].plannedAction,"provider-correction");
 assert.match(r.changes[0].app,/Platform: Steam/);
 assert.ok(review([current],[t],"now",[]).identityIssues>0);
});
test("app-only records plan additions; mismatching known IDs and absent provenance cannot be guessed",()=>{
 const r=review([item()],[table([])],"now",[]);assert.equal(r.changes[0].plannedAction,"add-record");assert.equal(r.changes[0].resolutionAllowed,false);
 const changed=review([item()],[table([["Fixture","Steam","999","Started"]])],"now",[hint()]);assert.ok(changed.identityIssues>0);
 assert.throws(()=>review([],[table()],"now",[hint()]),/changed/);
});
test("provenance validates owner/library, bounds and unique source identities",()=>{
 const data={ownerId:source,libraryId:library,entries:[hint()]};assert.equal(validateTrackerProvenance(data,source,library).length,1);
 for(const changed of [{...data,ownerId:library},{...data,libraryId:source},{...data,entries:[hint(),hint()]},{...data,entries:[hint({primary:null})]}])assert.throws(()=>validateTrackerProvenance(changed,source,library));
});
test("spreadsheet error values cannot be chosen for import, even on a mapped record",()=>{
 const t=table();t.headers.push("Released");t.rows[0].push("#REF! (Reference does not exist.)");
 const r=review([item({metadata:{IGDB_ID:"7599",Released:"Released"}})],[t],"now",[hint()]);
 assert.equal(r.dataIssues,1);const row=r.changes.find(c=>c.field==="Released");assert.equal(row.blockedField,true);assert.equal(row.resolutionAllowed,false);
 assert.match(row.reason,/error value held for repair/);
});
