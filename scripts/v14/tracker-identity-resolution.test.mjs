import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {attachIdentityReviews,identityReviewKey,identityReviewValue}=await import('../../app/lib/v14/tracker-identity-review.ts');
const {previewTrackerThreeWay}=await import('../../app/lib/v14/tracker-three-way.ts');
const {compileMixedSameItemPlan,compileMixedSeparateEditionPlan,encodeMixedPlan,decodeMixedPlan}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
const {buildTrackerGoogleBatch}=await import('../../app/lib/v14/tracker-google-batch.ts');
const {identityReadiness}=await import('../../app/lib/v14/tracker-identity-readiness.ts');h.deregister();
function fixture(){
 const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables),context={stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)};
 const row=[...tables[0].rows[0]];row[1]='PlayStation 5';row[2]='';row[3]='Queued';tables[0].rows.push(row);
 const preview=attachIdentityReviews(previewTrackerThreeWay(items,tables,baseline,'now'),items,tables,[],baseline),change=preview.changes[0];
 const fields=Object.fromEntries(change.identitySelection.fields.map(k=>[k,'app']));fields.Platform='tracker';fields.Status='tracker';
 const choice={mode:'same',fields};const settings=[{key:identityReviewKey(baseline.libraryId,change.id),revision:1,value:{value:identityReviewValue(change.identitySelection.token,choice,change.identitySelection.fields)}}];
 return {items,tables,baseline,context,change,choice,settings};
}
test('same-item plan retains app identity and Notes and seals exactly two Sheet rows for consolidation',()=>{
 const s=fixture(),p=compileMixedSameItemPlan(s.items,s.tables,s.settings,s.baseline,s.context,s.change.id);
 assert.equal(p.imports.length,1);assert.equal(p.imports[0].itemId,s.items[0].id);assert.equal(p.imports[0].patch.user_status,'Queued');assert.equal(p.imports[0].patch.overrides.Platform,'PlayStation 5');assert.equal(Object.hasOwn(p.imports[0].patch,'notes'),false);
 assert.equal(p.exports.length,1);assert.equal(p.exports[0].kind,'duplicate-cleanup');assert.equal(p.exports[0].expectedRows,2);assert.equal(JSON.stringify(p).includes('PRIVATE NOTES'),false);
 assert.deepEqual(decodeMixedPlan(encodeMixedPlan(p),p.libraryId,p.fingerprint),p);
 const after=s.items.map(i=>i.id===p.imports[0].itemId?{...i,...p.imports[0].patch,user_fields:{...i.user_fields,...p.imports[0].patch.overrides},revision:2}:i);
 const ids={Games:1374715809,Shows:1246289004,Books:519477596,Movies:488782103};const grids=s.tables.map(t=>({spreadsheetId:p.target,title:t.name,sheetId:ids[t.name],rowCount:100,columnCount:t.headers.length}));
 const batch=buildTrackerGoogleBatch(p.exports,after,s.tables,grids);assert.equal(batch.requests.filter(r=>r.deleteDimension).length,1);
});
test('missing field selections, withdrawn approval, changed source and other edits cannot produce a plan',()=>{
 const s=fixture();assert.throws(()=>compileMixedSameItemPlan(s.items,s.tables,[],s.baseline,s.context,s.change.id));
 const missing=structuredClone(s);delete missing.choice.fields.Platform;missing.settings[0].value.value=identityReviewValue(s.change.identitySelection.token,missing.choice,s.change.identitySelection.fields);
 assert.throws(()=>compileMixedSameItemPlan(missing.items,missing.tables,missing.settings,missing.baseline,missing.context,missing.change.id),/Select App or Sheet/);
 s.tables[0].rows[1][3]='Completed';assert.throws(()=>compileMixedSameItemPlan(s.items,s.tables,s.settings,s.baseline,s.context,s.change.id));
});
test('keeping every app field needs no app mutation, but still seals the two-row tracker consolidation',()=>{
 const s=fixture();s.choice.fields.Platform='app';s.choice.fields.Status='app';s.settings[0].value.value=identityReviewValue(s.change.identitySelection.token,s.choice,s.change.identitySelection.fields);
 const p=compileMixedSameItemPlan(s.items,s.tables,s.settings,s.baseline,s.context,s.change.id);assert.equal(p.imports.length,0);assert.equal(p.exports.length,1);assert.equal(p.sources[0].revision,1);
});
test('separate-edition plan creates only the new platform and updates only its source row',()=>{
 const s=fixture();s.choice.mode='separate';s.settings[0].value.value=identityReviewValue(s.change.identitySelection.token,s.choice,s.change.identitySelection.fields);
 const p=compileMixedSeparateEditionPlan(s.items,s.tables,s.settings,s.baseline,s.context,s.change.id);
 assert.equal(p.imports.length,0);assert.equal(p.creates.length,1);assert.equal(p.creates[0].input.patch.overrides.Platform,'PlayStation 5');assert.equal(p.creates[0].input.patch.overrides.IGDB_ID,'999991');assert.equal(Object.hasOwn(p.creates[0].input.patch,'notes'),false);
 assert.notEqual(p.creates[0].input.itemId,s.items[0].id);assert.equal(p.exports.length,1);assert.equal(p.exports[0].kind,'fields');assert.equal(p.exports[0].itemId,p.creates[0].input.itemId);
 assert.deepEqual(decodeMixedPlan(encodeMixedPlan(p),p.libraryId,p.fingerprint),p);assert.equal(JSON.stringify(p).includes('PRIVATE NOTES'),false);
});
test('separate edition cannot use the candidate platform or an unspecified Wishlist platform',()=>{
 for(const side of ['app']){
 const s=fixture();s.choice.mode='separate';s.choice.fields.Platform=side;s.settings[0].value.value=identityReviewValue(s.change.identitySelection.token,s.choice,s.change.identitySelection.fields);
 assert.throws(()=>compileMixedSeparateEditionPlan(s.items,s.tables,s.settings,s.baseline,s.context,s.change.id),/different concrete platform/);
 }
});
test('Apply readiness requires installed guards and complete, valid current field choices',()=>{
 const s=fixture(),source={items:s.items,tables:s.tables,baseline:s.baseline};
 assert.equal(identityReadiness(source,s.settings,s.context,s.change.id).ready,false);
 assert.equal(identityReadiness(source,s.settings,{...s.context,allowReviewedIdentities:true},s.change.id).ready,true);
 assert.equal(identityReadiness(source,[],{...s.context,allowReviewedIdentities:true},s.change.id).ready,false);
});
