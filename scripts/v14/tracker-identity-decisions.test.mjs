import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {fixtureItems,fixtureTables,fixtureBaseline,changeFixture} from './tracker-import-fixtures.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {previewTrackerThreeWay:raw}=await import('../../app/lib/v14/tracker-three-way.ts');
const {attachTrackerIdentityDecisions:attach,identityDecisionKey:key,identityDecisionValue:value}=await import('../../app/lib/v14/tracker-identity-decisions.ts');
const {compileTrackerMixedPlan:compile}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
const {inspectTrackerWriteStep}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {projectLegacyRow}=await import('../../app/lib/v14/legacy-row.ts');h.deregister();
const context={stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)};
function setup(){const items=fixtureItems(),tables=fixtureTables(items),baseline=fixtureBaseline(items,tables);return {items,tables,baseline};}
const preview=s=>attach(raw(s.items,s.tables,s.baseline,'now'),s.items,s.settings??[],s.baseline,s.tables);
function approve(s){s.settings=preview(s).changes.filter(c=>c.plannedAction).map(r=>({key:key(s.baseline.libraryId,r),revision:1,value:{value:value(r.decisionToken,'app')}}));}
function add(s){const book={...structuredClone(s.items[2]),id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',title:'NEW isolated book',metadata:{isbn:'999994'}};s.items.push(book);return book;}
test('new app record needs explicit scoped approval before a bounded add export can compile',()=>{
 const s=setup(),book=add(s),p=preview(s),row=p.changes[0];assert.equal(row.plannedAction,'add-record');assert.equal(row.planApproved,false);assert.equal(p.identityIssues,0);
 assert.throws(()=>compile(s.items,s.tables,[],s.baseline,context,'now'));
 approve(s);const plan=compile(s.items,s.tables,s.settings,s.baseline,context,'now');assert.equal(plan.imports.length,0);assert.equal(plan.exports.length,1);assert.equal(plan.exports[0].kind,'add-record');
 const table=s.tables.find(t=>t.name==='Books');assert.equal(inspectTrackerWriteStep(plan.exports[0],book,table).state,'before');
 const projection=projectLegacyRow(book,book.library_id).row;table.rows.push(table.headers.map(h=>String(projection[h]??'')));
 assert.equal(inspectTrackerWriteStep(plan.exports[0],book,table).state,'after');assert.equal(JSON.stringify(plan).includes('PRIVATE NOTES MUST SURVIVE'),false);
});
test('new sparse records export blank known optional metadata, not invented values or arbitrary columns',()=>{
 const s=setup();add(s);const book=s.tables.find(t=>t.name==='Books');book.headers.push('Author');book.rows[0].push('Known author');s.items[2].metadata.Author='Known author';s.baseline.columns.Books.push('Author');s.baseline.records[2].fields.Author='Known author';
 approve(s);const plan=compile(s.items,s.tables,s.settings,s.baseline,context,'now');assert.equal(plan.exports[0].after.Author,'');
 book.headers.push('UnreviewedCustomColumn');book.rows[0].push('');s.baseline.columns.Books.push('UnreviewedCustomColumn');s.baseline.records[2].fields.UnreviewedCustomColumn='';s.items[2].metadata.UnreviewedCustomColumn='';
 assert.ok(preview(s).identityIssues>0);assert.throws(()=>compile(s.items,s.tables,s.settings,s.baseline,context,'now'));
});
test('identity approvals expire on source revision, metadata, tracker values, baseline generation and explicit clear',()=>{
 const initial=setup();add(initial);approve(initial);
 for(const change of [s=>s.items.at(-1).revision++,s=>s.items.at(-1).metadata.isbn='different',s=>changeFixture(s.tables,2,'My Rating',4.2),s=>s.baseline.lastConfirmedSync='2026-10-21T00:00:00Z']){
  const s=structuredClone(initial);change(s);assert.equal(preview(s).changes.find(c=>c.itemId===s.items.at(-1).id)?.planApproved,false);assert.throws(()=>compile(s.items,s.tables,s.settings,s.baseline,context,'now'));
 }
 const s=structuredClone(initial),row=preview(s).changes[0];s.settings[0].value.value=value(row.decisionToken,'clear');assert.equal(preview(s).changes[0].planApproved,false);
 assert.throws(()=>value(row.decisionToken,'tracker'));
});
test('empty titles, duplicate app identity and reused ISBN cannot become add approvals',()=>{
 for(const mutate of [b=>b.title='',b=>{b.title='ISOLATED sync fixture book';b.metadata.isbn='999992';},b=>b.metadata.isbn='999992']){
  const s=setup(),book=add(s);mutate(book);const p=preview(s);assert.ok(p.identityIssues>0);assert.ok(p.changes.some(c=>c.itemId===book.id&&!c.plannedAction&&c.resolutionAllowed===false));
 }
});
test('manual entries without external IDs still require unique title/edition and explicit approval',()=>{
 const s=setup(),book=add(s);book.metadata.isbn='';assert.equal(preview(s).changes[0].plannedAction,'add-record');assert.throws(()=>compile(s.items,s.tables,[],s.baseline,context,'now'));approve(s);assert.equal(compile(s.items,s.tables,s.settings,s.baseline,context,'now').exports[0].after.isbn,'');
 book.title=s.items[2].title;assert.ok(preview(s).identityIssues>0);
});
test('different game platforms may be approved independently; same platform or conflicting IDs remain held',()=>{
 const s=setup(),game={...structuredClone(s.items[0]),id:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',user_fields:{Platform:'PlayStation 5'}};s.items.push(game);assert.equal(preview(s).changes[0].plannedAction,'add-record');approve(s);assert.equal(compile(s.items,s.tables,s.settings,s.baseline,context,'now').exports[0].kind,'add-record');
 game.user_fields.Platform='Steam';assert.ok(preview(s).identityIssues>0);
});
test('app and Sheet title-only renames use explicit app-title approval and preserve simultaneous field imports',()=>{
 for(const side of ['app','tracker']){
  const s=setup();if(side==='app')s.items[0].title+=' renamed';else changeFixture(s.tables,0,'Title',s.items[0].title+' renamed');
  changeFixture(s.tables,0,'Hours Played','20');const p=preview(s);assert.equal(p.identityIssues,0);assert.equal(p.changes.find(c=>c.field==='identity').plannedAction,'provider-correction');assert.throws(()=>compile(s.items,s.tables,[],s.baseline,context,'now'));
  approve(s);const plan=compile(s.items,s.tables,s.settings,s.baseline,context,'now');assert.equal(plan.exports.length,1);assert.equal(plan.imports.length,1);assert.equal(plan.exports[0].after.Title,s.items[0].title);assert.equal(plan.imports[0].sheet.Title,s.tables[0].rows[0][0]);assert.equal(plan.exports[0].itemRevision,2);
 }
});
test('ambiguous historical destinations cannot be approved or merged',()=>{
 for(const edit of [s=>s.tables[0].rows.push([...s.tables[0].rows[0]])]){
  const s=setup();s.items[0].title+=' renamed';edit(s);const p=preview(s);assert.ok(p.identityIssues>0);assert.throws(()=>compile(s.items,s.tables,[],s.baseline,context,'now'));
 }
});
test('an app-side platform or provider correction binds the exact old row and needs explicit review',()=>{
 for(const edit of [s=>s.items[0].user_fields.Platform='Xbox',s=>s.items[0].metadata.IGDB_ID='corrected']){
  const s=setup();edit(s);assert.equal(preview(s).identityIssues,0);assert.equal(preview(s).changes[0].plannedAction,'provider-correction');assert.throws(()=>compile(s.items,s.tables,[],s.baseline,context,'now'));approve(s);const p=compile(s.items,s.tables,s.settings,s.baseline,context,'now');assert.equal(p.exports.length,1);assert.equal(p.exports[0].expectedRows,1);assert.equal(p.exports[0].kind,'fields');
 }
 const s=setup();s.items[0].user_fields.Platform='Xbox';const row=[...s.tables[0].rows[0]];row[s.tables[0].headers.indexOf('Platform')]='Xbox';s.tables[0].rows.push(row);assert.ok(preview(s).identityIssues>0);assert.throws(()=>compile(s.items,s.tables,[],s.baseline,context,'now'));
});
