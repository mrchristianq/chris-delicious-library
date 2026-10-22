// Fresh read-only verification. Variant edits exist only in memory; no DB or
// Google mutation function is called. Never treat this as import acceptance.
import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';
import {writer,rpc,fingerprints,root,library,owner} from './execute-initial-tracker.mjs';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {readLibrary}=await import('../../app/lib/v14/read-library.ts');
const {readTrackerConnection}=await import('../../app/lib/v14/tracker-read-server.ts');
const {validateTrackerBaselineState}=await import('../../app/lib/v14/tracker-baseline-read.ts');
const {previewTrackerThreeWay}=await import('../../app/lib/v14/tracker-three-way.ts');h.deregister();
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--tracker-config'||!args[1].startsWith('/')||readFileSync(resolve(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Pinned test project and private tracker config required');
process.env.CDL_V14_TEST='true';process.env.CDL_V14_TRACKER_CONFIG_FILE=args[1];delete process.env.CDL_V14_TRACKER_WRITE_TARGET;
const before=fingerprints();
const readBase=()=>validateTrackerBaselineState(rpc(`public.cdl_v14_tracker_baselines('${library}'::uuid)`),owner,library);
const baseline=readBase();if(!baseline||baseline.records.length!==2337)throw new Error('Expected confirmed baselines unavailable');
const [snapshot,connection]=await Promise.all([readLibrary(writer,library),readTrackerConnection(true)]);
if(!connection?.tables||JSON.stringify(baseline)!==JSON.stringify(readBase()))throw new Error('Fresh consistent sources unavailable');
const result=previewTrackerThreeWay(snapshot.items,connection.tables,baseline,connection.observedAt);
if(result.changes.length||result.matchedRecords!==2337||result.identityIssues)throw new Error('Fresh real-data comparison requires review; no writes performed');
const tabNames={game:'Games',tv:'Shows',book:'Books',movie:'Movies'},checks=[];
for(const media of Object.keys(tabNames)){
 const field=media==='game'||media==='book'?'Status':media==='movie'?'Watch Status':'WatchStatus';
 const record=baseline.records.find(r=>r.media===media&&Object.hasOwn(r.fields,field)&&snapshot.items.some(i=>i.id===r.itemId));
 if(!record)throw new Error('Representative retained status unavailable');
 const item=snapshot.items.find(i=>i.id===record.itemId),table=connection.tables.find(t=>t.name===tabNames[media]);
 const title=table.headers.indexOf('Title'),index=table.rows.findIndex(c=>c[title]===record.fields.Title);
 if(index<0||table.rows.filter(c=>c[title]===record.fields.Title).length!==1)throw new Error('Representative fixture identity is ambiguous');
 const original=String(record.fields[field]),variants=(media==='movie'?['Watched','Started','Backlog']:['Completed','Started','Abandoned','Backlog']).filter(s=>s!==original);
 const app=variants[0],sheet=variants[1];
 for(const [kind,direction] of [['app','export'],['tracker','import'],['both','conflict']]){
  const items=structuredClone(snapshot.items),tables=structuredClone(connection.tables);
  if(kind!=='tracker')items.find(i=>i.id===item.id).user_status=app;
  if(kind!=='app')tables.find(t=>t.name===table.name).rows[index][table.headers.indexOf(field)]=sheet;
  const changed=previewTrackerThreeWay(items,tables,baseline,connection.observedAt),delta=changed.changes.find(c=>c.itemId===item.id&&c.field===field);
  if(delta?.direction!==direction||delta.baseline!==record.fields[field])throw new Error('Isolated status direction verification failed');
  checks.push({media,case:kind,direction});
 }
}
const identityChecks=[];
for(const [media,name] of Object.entries(tabNames)){
 const source=connection.tables.find(t=>t.name===name),title=source.headers.indexOf('Title'),provider=source.headers.indexOf(media==='game'?'IGDB_ID':media==='book'?'isbn':'TMDB_ID');
 const record=baseline.records.find(r=>r.media===media),index=source.rows.findIndex(c=>c[title]===record.fields.Title);
 if(index<0)throw new Error('Missing identity test source');
 for(const kind of ['new','duplicate','candidate','missing-sheet','missing-app']){
  const tables=structuredClone(connection.tables),table=tables.find(t=>t.name===name);let items=snapshot.items;
  if(kind==='new'){
   const row=source.headers.map(()=> '');row[title]='CDL IN-MEMORY ONLY NEW TRACKER ROW';
   const edition=source.headers.indexOf(media==='game'?'Platform':media==='book'?'Type':'');if(edition>=0)row[edition]=media==='game'?'Steam':'Physical';
   table.rows.push(row);
  }else if(kind==='duplicate')table.rows.push([...source.rows[index]]);
  else if(kind==='candidate'){const row=[...source.rows[index]];row[provider]='IN-MEMORY-CHANGED-ID';table.rows.push(row);}
  else if(kind==='missing-sheet')table.rows.splice(index,1);
  else items=items.filter(i=>i.id!==record.itemId);
  const changed=previewTrackerThreeWay(items,tables,baseline,connection.observedAt);
  const expected={new:'new-tracker-record',duplicate:'duplicate-tracker-record',candidate:'possible-existing-record','missing-sheet':'missing-tracker-record','missing-app':'missing-app-record'}[kind];
  if(!changed.changes.some(c=>c.identityReview?.kind===expected&&c.direction==='review'&&c.resolutionAllowed===false))throw new Error('Identity review classification failed');
  identityChecks.push({media,case:kind,classification:expected});
 }
}
const after=fingerprints();if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Library data changed while verifying');
console.log(JSON.stringify({mode:'read-only',version:JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).version,matched:result.matchedRecords,differences:result.changes.length,baselineRecords:baseline.records.length,lastConfirmedSync:result.lastConfirmedSync,isolatedCases:checks,identityChecks,protectedData:after,scope:'Actual fresh reads plus in-memory variants; not an import or write acceptance test'}));
