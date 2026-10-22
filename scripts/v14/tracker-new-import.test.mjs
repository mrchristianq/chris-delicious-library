import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {prepareNewTrackerImport:prepare,runNewTrackerImport:run}=await import('../../app/lib/v14/tracker-new-import.ts');
const {trackerRowIdentity:identity}=await import('../../app/lib/v14/tracker-write-plan.ts');
const {TRACKER_ID}=await import('../../app/lib/v14/tracker-read.ts');hook.deregister();
const owner='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lib='11111111-1111-4111-8111-111111111111';
const tables=()=>[{name:'Games',headers:['Title','Platform','IGDB_ID','Status','My Rating','Completed Date','Ownership','Format','Date Added'],rows:[]},{name:'Shows',headers:['Title','TMDB_ID','WatchStatus','MyRating','Completed Date'],rows:[]},{name:'Books',headers:['Title','isbn','Type','Status','My Rating','Completed Date'],rows:[]},{name:'Movies',headers:['Title','TMDB_ID','Watch Status','MyRating','WatchDate'],rows:[]}];
function source(tab='Games',row=['New game','Steam','900','Completed','9','10/19/2026','','','']){
 const t=tables();t.find(v=>v.name===tab).rows.push(row);
 return {items:[],tables:t,baseline:{ownerId:owner,libraryId:lib,sheetId:TRACKER_ID,targetId:'33333333-3333-4333-8333-333333333333',enabled:false,lastConfirmedSync:'2026-10-19T23:38:36Z',columns:Object.fromEntries(t.map(v=>[v.name,v.headers])),records:[]}};
}
const command=(s,tab='Games')=>prepare(s,tab,identity(s.tables.find(t=>t.name===tab),s.tables.find(t=>t.name===tab).rows[0]));
test('all four media round-trip dates, ratings and statuses without creation defaults',()=>{
 for(const [tab,row,status,rating] of [['Games',['New game','Steam','900','Completed','9','10/19/2026','','',''],'Completed',9],['Shows',['New show','900','Pending Release','8',''],'Pending Release',8],['Books',['New book','','Audiobook','Completed','4.9','10/19/2026'],'Completed',4.9],['Movies',['New film','900','Watched','9.3','10/19/2026'],'Watched',9.3]]){
  const s=source(tab,row),before=JSON.stringify(s),c=command(s,tab);
  assert.equal(c.input.patch.user_status,status);assert.equal(c.input.patch.personal_rating,rating);assert.equal(c.input.patch.notes,undefined);
  assert.equal(c.input.patch.overrides?.Ownership,undefined);assert.equal(c.input.patch.overrides?.Format,undefined);assert.equal(c.input.patch.overrides?.['Date Added'],undefined);
  assert.equal(JSON.stringify(s),before);
 }
});
test('blank status stays unset rather than Wishlist/Backlog; manual no-ID records are permitted',()=>{
 const c=command(source('Games',['Manual game','Steam','','','','','','','']));assert.equal(c.input.patch.user_status,undefined);assert.equal(c.input.patch.personal_rating,undefined);
});
test('duplicates, same-title/provider candidates and prior baselines cannot become new imports',()=>{
 const s=source(),c=command(s),own={id:c.input.itemId,library_id:lib,revision:2,media_type:'game',title:'Other title',user_status:null,completed_on:null,personal_rating:null,notes:'PRIVATE',user_fields:{Platform:'Steam'},metadata:{IGDB_ID:'900'}};
 for(const mutate of [s=>s.tables[0].rows.push([...s.tables[0].rows[0]]),s=>s.items.push(own),s=>s.items.push({...own,title:'New game',metadata:{IGDB_ID:'901'}}),s=>s.baseline.records.push({itemId:own.id,media:'game',fields:{Title:'New game',Platform:'Steam',IGDB_ID:'900'},confirmedAt:'2026-10-19T23:38:36Z'})]){
  const copy=structuredClone(s);mutate(copy);assert.throws(()=>command(copy));
 }
});
test('bad IDs, book types, status, rating, dates, errors and unmapped values fail closed',()=>{
 for(const mutate of [s=>s.tables[0].rows[0][2]='bad-id',s=>s.tables[0].rows[0][3]='watchedd',s=>s.tables[0].rows[0][4]='11',s=>s.tables[0].rows[0][5]='2026-02-30',s=>s.tables[0].rows[0][0]='#REF!',s=>s.tables[0].rows[0][1]='',s=>{s.tables[0].headers.push('Unknown');s.baseline.columns.Games.push('Unknown');s.tables[0].rows[0].push('value');},s=>s.tables[0].headers.push('Notes')]){
  const s=source();mutate(s);assert.throws(()=>command(s));
 }
 assert.throws(()=>command(source('Books',['Bad book','','Audio','Completed','4.9','']),'Books'));
 assert.throws(()=>command(source('Books',['Bad book','','Physical','Completed','9','']),'Books'));
});
test('source edits invalidate approval but moving rows preserves it',()=>{
 const s=source(),c=command(s),changed=structuredClone(s);changed.tables[0].rows[0][4]='8';assert.notEqual(command(changed).fingerprint,c.fingerprint);
 const moved=structuredClone(s);moved.tables[0].rows.push(['Other','Xbox','901','Wishlist','','','','','']);const a=command(moved);moved.tables[0].rows.reverse();
 assert.equal(prepare(moved,'Games',c.identity).fingerprint,a.fingerprint);
 assert.equal(prepare(moved,'Games',c.identity).input.itemId,c.input.itemId);
});
function fixture(){
 const s=source(),c=command(s);let approved=true,authenticated=owner,lost=false,writes=0;const receipts=new Map();
 const adapter={owner:async()=>authenticated,approved:async fingerprint=>approved&&fingerprint===c.fingerprint,source:async()=>structuredClone(s),writer:{authenticate:async()=>authenticated===owner,read:async id=>s.items.find(i=>i.id===id)??null,write:async input=>{
  if(receipts.has(input.requestId))return structuredClone(receipts.get(input.requestId));
  if(s.items.some(i=>i.id===input.itemId))throw new Error('No original audit');
  const item={id:input.itemId,library_id:lib,media_type:input.mediaType,title:'',user_status:null,personal_rating:null,completed_on:null,notes:'',revision:2,metadata:{},user_fields:input.patch.overrides??{},...input.patch};s.items.push(item);receipts.set(input.requestId,structuredClone(item));writes++;if(lost)throw new Error('Lost acknowledgement');return item;
 }}};
 return {s,c,adapter,setApproved:v=>approved=v,setOwner:v=>authenticated=v,lose:()=>lost=true,writes:()=>writes};
}
test('owner and explicit approval are mandatory; source changes prevent writes',async()=>{
 for(const mutate of [f=>f.setApproved(false),f=>f.setOwner(lib)]){const f=fixture();mutate(f);await assert.rejects(run(f.c,f.adapter));assert.equal(f.writes(),0);}
 const f=fixture();f.s.tables[0].rows[0][4]='8';assert.equal((await run(f.c,f.adapter)).status,'conflict');assert.equal(f.writes(),0);
});
test('lost creation acknowledgement recovers the original audited command without duplicate items',async()=>{
 const f=fixture();f.lose();assert.equal((await run(f.c,f.adapter)).status,'uncertain');assert.equal(f.s.items.length,1);
 assert.equal((await run(f.c,f.adapter)).status,'confirmed');assert.equal(f.writes(),1);assert.equal(f.s.items[0].revision,2);
 assert.equal((await run(f.c,f.adapter)).status,'confirmed');assert.equal(f.writes(),1);
 f.s.items[0].notes='A later private review';assert.equal((await run(f.c,f.adapter)).status,'conflict');assert.equal(f.writes(),1);
});
test('a lookalike item without an audited creation receipt is not proof of import',async()=>{
 const f=fixture();await run(f.c,f.adapter);f.adapter.writer.write=async()=>{throw new Error('No matching audit');};assert.equal((await run(f.c,f.adapter)).status,'uncertain');
});
test('post-save Sheet edit holds confirmation and never advances any baseline',async()=>{
 const f=fixture(),write=f.adapter.writer.write;f.adapter.writer.write=async input=>{const r=await write(input);f.s.tables[0].rows[0][4]='7';return r;};
 const before=JSON.stringify(f.s.baseline);assert.equal((await run(f.c,f.adapter)).status,'conflict');assert.equal(f.writes(),1);assert.equal(JSON.stringify(f.s.baseline),before);
});
