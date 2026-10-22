import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {previewTrackerThreeWay}=await import('../../app/lib/v14/tracker-three-way.ts');
const {attachTrackerConflictDecisions:attach,conflictDecisionKey:key,conflictDecisionValue:value}=await import('../../app/lib/v14/tracker-conflict-decisions.ts');
const {compileTrackerImports:compile}=await import('../../app/lib/v14/tracker-import.ts');h.deregister();
test('either standard can override a one-sided change for all four media types',()=>{
 for(let n=0;n<4;n++)for(const originalSide of ['app','tracker']){
  const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables),original=items[n].personal_rating,next=n===2?4.7:9.2;
  if(originalSide==='app')items[n].personal_rating=next;else changeFixture(tables,n,'My Rating',next);
  const raw=previewTrackerThreeWay(items,tables,baseline,'now'),row=attach(raw,items,[],baseline).changes[0];
  assert.equal(row.resolutionAllowed,true);assert.match(row.decisionToken,/^[a-f0-9]{64}$/);
  for(const side of ['app','tracker']){
   const setting={key:key(baseline.libraryId,row),revision:1,value:{value:value(row.decisionToken,side)}};
   const picked=attach(raw,items,[setting],baseline).changes[0];assert.equal(picked.direction,'conflict');assert.equal(picked.savedChoice,side);
   const imports=compile(items,tables,[setting],baseline,'now');
   if(side==='app')assert.deepEqual(imports,[]);else{assert.equal(imports.length,1);assert.equal(imports[0].patch.personal_rating,originalSide==='app'?original:next);assert.equal(Object.hasOwn(imports[0].patch,'notes'),false);}
  }
  const stored={key:key(baseline.libraryId,row),revision:1,value:{value:value(row.decisionToken,'app')}};
  items[n].revision++;
  assert.equal(attach(previewTrackerThreeWay(items,tables,baseline,'now'),items,[stored],baseline).changes[0].savedChoice,undefined);
 }
});
function setup(){const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables);items[2].personal_rating=4.5;changeFixture(tables,2,'My Rating',4.9);const p=previewTrackerThreeWay(items,tables,baseline,'now');return {items,tables,baseline,p};}
test('explicit choices restore only in their separate namespace, not from the old initial bulk approval',()=>{
 const s=setup(),p=attach(s.p,s.items,[],s.baseline),row=p.changes[0],stored={key:key(s.baseline.libraryId,row),revision:1,value:{value:value(row.decisionToken,'tracker')}};
 assert.equal(row.resolutionAllowed,true);assert.match(row.decisionToken,/^[a-f0-9]{64}$/);assert.equal(attach(s.p,s.items,[stored],s.baseline).changes[0].savedChoice,'tracker');
 assert.equal(compile(s.items,s.tables,[stored],s.baseline,'now')[0].patch.personal_rating,4.9);
 const app={...stored,value:{value:value(row.decisionToken,'app')}};assert.deepEqual(compile(s.items,s.tables,[app],s.baseline,'now'),[]);
 const clear={...stored,revision:2,value:{value:value(row.decisionToken,'clear')}};assert.equal(attach(s.p,s.items,[clear],s.baseline).changes[0].savedChoice,undefined);
 const old=attach(s.p,s.items,[stored],s.baseline);assert.equal(attach(old,s.items,[clear],s.baseline).changes[0].savedChoice,undefined);
 assert.equal(attach(s.p,s.items,[{...stored,key:'__cdl_tracker_initial_review_v1'}],s.baseline).changes[0].savedChoice,undefined);
 assert.equal(stored.value.value.includes('4.9'),false);
});
test('source edits, item revision, baseline advancement or library scope invalidate saved choices',()=>{
 const s=setup(),row=attach(s.p,s.items,[],s.baseline).changes[0],saved={key:key(s.baseline.libraryId,row),revision:1,value:{value:value(row.decisionToken,'tracker')}};
 for(const mutate of [s=>s.items[2].revision++,s=>s.items[2].personal_rating=4.6,s=>s.baseline.lastConfirmedSync='2026-10-20T01:00:00Z',s=>s.baseline.records[2].confirmedAt='2026-10-20T01:00:00Z',s=>s.baseline.targetId='cccccccc-cccc-4ccc-8ccc-cccccccccccc']){
  const c=structuredClone(s);mutate(c);const p=previewTrackerThreeWay(c.items,c.tables,c.baseline,'now');assert.equal(attach(p,c.items,[saved],c.baseline).changes[0].savedChoice,undefined);
 }
 const t=structuredClone(s);changeFixture(t.tables,2,'My Rating',4.8);assert.equal(attach(previewTrackerThreeWay(t.items,t.tables,t.baseline,'now'),t.items,[saved],t.baseline).changes[0].savedChoice,undefined);
});
test('identity problems and error fields cannot become conflict choices',()=>{
 const s=setup();const p={...s.p,changes:[{...s.p.changes[0],direction:'review',blockedField:true,resolutionAllowed:false}]};assert.equal(attach(p,s.items,[],s.baseline).changes[0].decisionToken,undefined);
 assert.throws(()=>value('bad','app'));assert.throws(()=>attach({...s.p,comparisonMode:undefined},s.items,[],s.baseline));
});
