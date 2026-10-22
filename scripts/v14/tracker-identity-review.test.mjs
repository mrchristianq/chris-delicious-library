import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {attachIdentityReviews:attach,identityReviewKey:key,identityReviewValue:value}=await import('../../app/lib/v14/tracker-identity-review.ts');
const {previewTrackerThreeWay:preview}=await import('../../app/lib/v14/tracker-three-way.ts');h.deregister();
function setup(){const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables);const row=[...tables[0].rows[0]];row[1]='PlayStation 5';row[2]='';tables[0].rows.push(row);return {items,tables,baseline};}
const decorate=(s,settings=[])=>attach(preview(s.items,s.tables,s.baseline,'now'),s.items,s.tables,settings,s.baseline);
test('identity choices persist as source-bound intent, never a runnable merge or import',()=>{
 const s=setup(),r=decorate(s).changes[0],v={mode:'same',fields:{Platform:'tracker',Status:'app'}};
 const stored={key:key(s.baseline.libraryId,r.id),revision:1,value:{value:value(r.identitySelection.token,v,r.identitySelection.fields)}};
 const restored=decorate(s,[stored]).changes[0];assert.deepEqual(restored.identitySelection.choice,v);assert.equal(restored.identitySelection.revision,1);
 assert.equal(restored.resolutionAllowed,false);assert.equal(restored.planApproved,undefined);assert.equal(restored.decisionToken,undefined);
 assert.equal(JSON.stringify(stored).includes('PRIVATE NOTES'),false);
 s.items[0].revision++;assert.equal(decorate(s,[stored]).changes[0].identitySelection.choice,undefined);
});
test('sheet edits, another namespace, invalid fields and unapproved choices do not restore intent',()=>{
 const s=setup(),r=decorate(s).changes[0],selection=r.identitySelection;
 for(const invalid of [{mode:'merge',fields:{}},{mode:'same',fields:{Notes:'tracker'}},{mode:'same',fields:{Status:'wrong'}},{mode:'same',fields:{},patch:{title:'Injected'}}])assert.throws(()=>value(selection.token,invalid,selection.fields));
 const stored={key:key(s.baseline.libraryId,r.id),revision:1,value:{value:value(selection.token,{mode:'separate',fields:{}},selection.fields)}};
 assert.equal(decorate(s,[{...stored,key:'other'}]).changes[0].identitySelection.choice,undefined);
 s.tables[0].rows[1][s.tables[0].headers.indexOf('Status')]='Queued';assert.equal(decorate(s,[stored]).changes[0].identitySelection.choice,undefined);
});
test('clear choice remains a confirmed review revision without applying data',()=>{
 const s=setup(),r=decorate(s).changes[0],stored={key:key(s.baseline.libraryId,r.id),revision:2,value:{value:value(r.identitySelection.token,null,r.identitySelection.fields)}};
 const next=decorate(s,[stored]).changes[0];assert.equal(next.identitySelection.revision,2);assert.equal(next.identitySelection.choice,undefined);assert.equal(next.resolutionAllowed,false);
});
