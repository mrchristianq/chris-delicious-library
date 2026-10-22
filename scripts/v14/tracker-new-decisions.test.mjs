import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline} from './tracker-import-fixtures.mjs';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {attachNewItemDecisions:attach,newItemDecisionKey:key,newItemDecisionValue:value}=await import('../../app/lib/v14/tracker-new-decisions.ts');
const {previewTrackerThreeWay:preview}=await import('../../app/lib/v14/tracker-three-way.ts');hook.deregister();
function fixture(){const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables);const row=[...tables[0].rows[0]];row[0]='ISOLATED new tracker game';row[tables[0].headers.indexOf('IGDB_ID')]='9999999';tables[0].rows.push(row);return {items,tables,baseline};}
test('new-item decisions are capability-gated, explicit, scoped, and stale on source edits',()=>{
 const s=fixture(),p=preview(s.items,s.tables,s.baseline,'now');assert.deepEqual(attach(p,s,[],false),p);
 const first=attach(p,s,[],true).changes.find(r=>r.plannedAction==='import-record');assert.ok(first);assert.equal(first.planApproved,false);assert.equal(first.resolutionAllowed,true);assert.equal(first.proposedFields.Title,'ISOLATED new tracker game');
 const setting={key:key(s.baseline.libraryId,first),revision:1,value:{value:value(first.decisionToken,'tracker')}};
 assert.equal(attach(p,s,[setting],true).changes.find(r=>r.id===first.id).planApproved,true);
 const before=JSON.stringify(s);s.tables[0].rows[1][s.tables[0].headers.indexOf('My Rating')]='9.1';
 assert.equal(attach(preview(s.items,s.tables,s.baseline,'now'),s,[setting],true).changes.find(r=>r.id===first.id).planApproved,false);
 assert.notEqual(JSON.stringify(s),before);assert.throws(()=>value(first.decisionToken,'app'));
 assert.equal(JSON.stringify(first).includes('PRIVATE NOTES'),false);
});
test('unsupported data never gets an approval button',()=>{
 const s=fixture();s.tables[0].rows[1][s.tables[0].headers.indexOf('My Rating')]='500';
 const r=attach(preview(s.items,s.tables,s.baseline,'now'),s,[],true).changes.find(r=>r.identityReview?.kind==='new-tracker-record');
 assert.equal(r.resolutionAllowed,false);assert.equal(r.decisionToken,undefined);assert.equal(r.planApproved,undefined);
});
