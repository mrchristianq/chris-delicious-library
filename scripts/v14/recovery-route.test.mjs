import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {randomUUID} from 'node:crypto';
const owner=randomUUID(),library=randomUUID();
const tables=['libraries','items','item_metadata','identifiers','episodes','episode_progress','settings','collections','collection_items','assets','import_batches','import_rows','import_issues','change_events','sync_targets','sync_outbox','sync_baselines','sync_runs','sync_conflicts'];
const snapshot={format:'cdl-library-backup-v1',ownerId:owner,libraryId:library,capturedAt:'2026-10-23T12:00:00Z',migrations:['20261023002800'],stateDigest:'b'.repeat(32),tables:{...Object.fromEntries(tables.map(t=>[t,[]])),libraries:[{id:library,owner_id:owner}],items:[{id:randomUUID(),library_id:library,media_type:'book',title:'Fixture',notes:'Keep paragraphs\nSecond paragraph',deleted_at:null}]}};
let rows=[],files=new Map(),calls=[],corrupt=false,signed=true,restoreReceipt=null;
globalThis.__recoveryClient={auth:{getUser:async()=>({data:{user:signed?{id:owner}:null}})},storage:{from:()=>({upload:async(path,bytes)=>{files.set(path,bytes);return {error:null};},download:async path=>({data:files.has(path)?new Blob([corrupt?'corrupt':files.get(path)]):null,error:null})})},rpc:async(name,args)=>{
 calls.push(name);
 if(name==='cdl_v14_backups')return {data:rows};
 if(name==='cdl_v14_recovery_snapshot')return {data:snapshot};
 if(name==='cdl_v14_recovery_register'){const row={id:args.p_id,receipt:args.p_receipt,kind:args.p_kind,summary:args.p_summary};rows.push(row);return {data:row};}
 if(name==='cdl_v14_recovery_preview')return {data:{token:randomUUID(),current:snapshot}};
 if(name==='cdl_v14_recovery_restore'){restoreReceipt??={confirmed:true,token:args.p_token,safetyId:args.p_safety_id,restoredAt:'2026-10-23T13:00:00Z'};return {data:restoreReceipt};}
 throw Error('Unexpected RPC '+name);
}};
const hook=registerHooks({resolve(s,c,n){if(s.endsWith('/server'))return {url:'file:///recovery-server.mjs',shortCircuit:true};if(s.endsWith('/config'))return {url:'file:///recovery-config.mjs',shortCircuit:true};if(s.startsWith('.')&&!s.endsWith('.ts')&&c.parentURL?.includes('/app/'))return n(s+'.ts',c);return n(s,c);},load(u,c,n){if(u==='file:///recovery-server.mjs')return {format:'module',shortCircuit:true,source:'export const createV14Client=async()=>globalThis.__recoveryClient;'};if(u==='file:///recovery-config.mjs')return {format:'module',shortCircuit:true,source:"export const getV14Config=()=>({origin:'http://localhost:3014'});"};return n(u,c);}});
const {GET,POST}=await import('../../app/v14/api/backups/route.ts');const {compareBackupItems,backupSummary}=await import('../../app/lib/v14/backup-summary.ts');hook.deregister();
function req(action,extra={},headers={}){return new Request('http://localhost:3014/v14/api/backups',{method:'POST',headers:{origin:'http://localhost:3014','content-type':'application/json',...headers},body:JSON.stringify({action,libraryId:library,requestId:randomUUID(),...extra})});}
test('manual backup verifies stored bytes, lists summary, and reuses a retry id',async()=>{const id=randomUUID();let r=await POST(req('create',{requestId:id}));assert.equal(r.status,200);assert.equal((await r.json()).confirmed,true);assert.equal(rows[0].summary.books,1);const uploads=files.size;r=await POST(req('create',{requestId:id}));assert.equal(r.status,200);assert.equal(files.size,uploads);});
test('corrupt private storage blocks both preview and restore',async()=>{corrupt=true;const before=calls.length;assert.equal((await POST(req('preview',{backupId:rows[0].id}))).status,409);assert.equal((await POST(req('restore',{backupId:rows[0].id,token:randomUUID()}))).status,409);assert.ok(!calls.slice(before).includes('cdl_v14_recovery_restore'));corrupt=false;});
test('restore creates a verified safety archive before its RPC and reuses it on retry',async()=>{const p=await (await POST(req('preview',{backupId:rows[0].id}))).json();const start=calls.length;const body={backupId:p.backupId,token:p.token};const r=await POST(req('restore',body));assert.equal(r.status,200);assert.equal((await r.json()).confirmed,true);const sequence=calls.slice(start);assert.ok(sequence.indexOf('cdl_v14_recovery_register')<sequence.indexOf('cdl_v14_recovery_restore'));const size=files.size;assert.equal((await POST(req('restore',body))).status,200);assert.equal(files.size,size);});
test('foreign origin, anonymous, invalid body and read-only sessions cannot mutate',async()=>{assert.equal((await POST(req('create',{}, {origin:'https://evil.example'}))).status,403);signed=false;assert.equal((await POST(req('create'))).status,401);signed=true;assert.equal((await POST(req('restore',{token:'invalid'}))).status,400);process.env.CDL_V14_VALIDATION_READ_ONLY='true';assert.equal((await POST(req('create'))).status,403);delete process.env.CDL_V14_VALIDATION_READ_ONLY;});
test('summary excludes archived items and diff ignores item revision noise',()=>{const next=structuredClone(snapshot);next.tables.items[0].revision=99;next.tables.items[0].updated_at='2026-10-24';assert.equal(compareBackupItems(snapshot,next).updated,0);next.tables.items[0].notes='Changed';assert.equal(compareBackupItems(snapshot,next).updated,1);next.tables.items[0].deleted_at='2026-10-24';assert.equal(backupSummary(next).total,0);assert.equal(compareBackupItems(snapshot,next).removed,1);});
test('read-only GET preview verifies backup without tokens, uploads or writes',async()=>{
 process.env.CDL_V14_VALIDATION_READ_ONLY='true';
 const before=calls.length,size=files.size;
 try{
  const response=await GET(new Request(`http://localhost:3014/v14/api/backups?libraryId=${library}&id=${rows[0].id}&preview=true`));
  assert.equal(response.status,200);const result=await response.json();
  assert.equal(result.summary.books,1);assert.equal(result.canRestore,false);assert.equal(result.token,undefined);
  assert.equal(result.changes.updated,0);assert.equal(files.size,size);
  assert.deepEqual(calls.slice(before),['cdl_v14_backups','cdl_v14_recovery_snapshot']);
 }finally{delete process.env.CDL_V14_VALIDATION_READ_ONLY;}
});
