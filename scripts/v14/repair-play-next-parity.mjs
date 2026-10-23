// Deliberate operator repair: original Sheet is READ ONLY. Default is preview.
// Only unchanged imported Wishlist editions may be promoted; never merge editions
// by title alone. Every write uses the owner RPC's revision and audit contract.
import {readFileSync,mkdtempSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import Papa from 'papaparse';
const library='9fdfae4a-31f5-5c8f-aa64-af839a853b48';
const owner='baf0dab8-9904-48f2-a00f-30773bfc6ae1';
if(readFileSync('supabase/.temp/project-ref','utf8').trim()!=='xnitocbxdpikvfxssbvm')throw Error('Wrong project');
const apply=process.argv.includes('--apply');
const q=value=>`'${String(value).replaceAll("'","''")}'`;
function query(sql){return JSON.parse(execFileSync('supabase',['db','query','--linked',sql],{encoding:'utf8',maxBuffer:8e6})).rows;}
const env=Object.fromEntries(readFileSync('/Users/metroclick/Projects/Claude/chris-delicious-library/.env.local','utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).replace(/^"|"$/g,'')]}));
async function csv(key){const response=await fetch(env[key],{cache:'no-store'});if(!response.ok)throw Error('Source read failed');const parsed=Papa.parse(await response.text(),{header:true});if(parsed.errors.some(e=>e.code!=='TooFewFields'))throw Error('Source parse failed');return parsed.data;}
const games=await csv('NEXT_PUBLIC_GAMES_SHEET_CSV_URL');
const sourceSettings=await csv('NEXT_PUBLIC_SETTINGS_SHEET_CSV_URL');
const items=query(`select i.*,m.fields as metadata from cdl.items i join cdl.item_metadata m on m.item_id=i.id where i.library_id=${q(library)} and i.media_type='game' and i.deleted_at is null`);
const settings=query(`select * from cdl.settings where library_id=${q(library)} and key in ('viewManualOrder:play-next','viewSortField:play-next','viewSortOrder:play-next')`);
const titleKey=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const platformKey=value=>String(value||'').trim().toLowerCase().replace(/[^a-z0-9]+/g,'');
const legacyKey=row=>`game:${titleKey(row.Title)}:${platformKey(row.Platform)||'default'}`;
const stableKey=item=>`game:db:${library}:${item.id}`;
const queued=status=>['queued','replay'].includes(String(status||'').toLowerCase());
const selected=games.filter(row=>queued(row.Status));
const mapped=new Map(),patches=new Map();
for(const row of selected){
  let candidates=items.filter(item=>item.title===row.Title&&platformKey(item.user_fields.Platform)===platformKey(row.Platform));
  if(!candidates.length){
    candidates=items.filter(item=>item.title===row.Title&&item.revision===1&&item.user_status==='Wishlist'&&item.user_fields.Platform==='Wishlist'&&row.IGDB_ID&&String(item.user_fields.IGDB_ID||item.metadata.IGDB_ID)===String(row.IGDB_ID));
  }
  if(candidates.length!==1)throw Error(`Ambiguous edition: ${row.Title} / ${row.Platform}`);
  const item=candidates[0];
  if(item.user_status!==row.Status||platformKey(item.user_fields.Platform)!==platformKey(row.Platform)){
    if(item.revision!==1||item.user_status!=='Wishlist')throw Error(`Newer app edit needs review: ${row.Title}`);
    patches.set(item.id,{item,patch:{user_status:row.Status,overrides:Object.fromEntries(['Platform','Ownership','Format','Backlog'].map(key=>[key,String(row[key]||'')]))}});
  }
  const key=legacyKey(row);
  if(mapped.has(key)&&mapped.get(key).id!==item.id)throw Error('Duplicate edition key');
  mapped.set(key,item);
}
const sourceOrderRows=sourceSettings.filter(row=>row.Key==='viewManualOrder:play-next');
if(sourceOrderRows.length!==1)throw Error('Ambiguous source order');
const sourceOrder=JSON.parse(sourceOrderRows[0].Value);
if(!Array.isArray(sourceOrder)||sourceOrder.some(key=>typeof key!=='string'))throw Error('Invalid source order');
const oldOrder=JSON.parse(settings.find(row=>row.key==='viewManualOrder:play-next').value.value);
const ordered=[...new Set(sourceOrder.filter(key=>mapped.has(key)).map(key=>stableKey(mapped.get(key))))];
const remaining=[...mapped.values()].filter(item=>!ordered.includes(stableKey(item))).sort((a,b)=>a.title.localeCompare(b.title));
ordered.push(...new Set(remaining.map(stableKey)));
// Retain app-only queued entries, in their current relative order, after v13.
const active=new Set(items.filter(item=>queued(item.user_status)||patches.has(item.id)).map(stableKey));
for(const key of [...oldOrder,...active])if(active.has(key)&&!ordered.includes(key))ordered.push(key);
console.log(JSON.stringify({mode:apply?'apply':'preview',sourceRows:selected.length,uniqueSourceItems:new Set([...mapped.values()].map(i=>i.id)).size,repairs:[...patches.values()].map(({item,patch})=>({id:item.id,title:item.title,before:item.user_status,patch})),orderMatches:JSON.stringify(oldOrder)===JSON.stringify(ordered),orderCount:ordered.length,first10:ordered.slice(0,10).map(key=>items.find(i=>stableKey(i)===key)?.title)}));
if(!apply)process.exit(0);
const directory=mkdtempSync('/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/play-next-parity-');
writeFileSync(join(directory,'before.json'),JSON.stringify({at:new Date().toISOString(),items:[...patches.values()].map(p=>p.item),settings,sourceOrder,selected,ordered},null,2),{mode:0o600,flag:'wx'});
let sql=`begin;select set_config('request.jwt.claim.sub',${q(owner)},true);set local role authenticated;`;
for(const {item,patch} of patches.values())sql+=`select public.cdl_v14_full_edit(${q(item.id)}::uuid,${item.revision},${q(randomUUID())}::uuid,${q(JSON.stringify(patch))}::jsonb);`;
for(const [key,value] of [['viewManualOrder:play-next',JSON.stringify(ordered)],['viewSortField:play-next','Manual'],['viewSortOrder:play-next','Asc']]){
  const setting=settings.find(row=>row.key===key);if(!setting)throw Error('Missing setting');
  sql+=`select public.cdl_v14_save_setting(${q(library)}::uuid,${q(key)},${setting.revision},${q(randomUUID())}::uuid,${q(JSON.stringify({value}))}::jsonb);`;
}
sql+='commit;';
query(sql);
const afterItems=query(`select id,user_status,user_fields,revision from cdl.items where id in (${[...patches.keys()].map(q).join(',')||'null'})`);
for(const {item,patch} of patches.values()){
  const after=afterItems.find(row=>row.id===item.id);
  if(after?.revision!==item.revision+1||after.user_status!==patch.user_status||Object.entries(patch.overrides).some(([key,value])=>after.user_fields[key]!==value))throw Error('Item readback failed');
}
const afterSettings=query(`select key,value from cdl.settings where library_id=${q(library)} and key like '%:play-next'`);
if(afterSettings.find(s=>s.key==='viewManualOrder:play-next')?.value.value!==JSON.stringify(ordered))throw Error('Order readback failed');
if(afterSettings.find(s=>s.key==='viewSortField:play-next')?.value.value!=='Manual'||afterSettings.find(s=>s.key==='viewSortOrder:play-next')?.value.value!=='Asc')throw Error('Sort readback failed');
writeFileSync(join(directory,'confirmed.json'),JSON.stringify({afterItems,afterSettings},null,2),{mode:0o600,flag:'wx'});
console.log(JSON.stringify({confirmed:true,backup:directory,repairedItems:patches.size,orderedItems:ordered.length}));
