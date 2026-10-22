// CLI-only administrative import into the isolated project. Never called by the app.
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { prepareImport, prepareCommittedImport, TEST_PROJECT } from './prepare-import.mjs';
import { replacePayload } from './staged-payload.mjs';

const [input, ownerId, ownerEmail, mode, approvedHash] = process.argv.slice(2);
if (!input || !ownerEmail || !['rollback','commit'].includes(mode)) throw Error('Usage: PRIVATE-PACKET OWNER-ID OWNER-EMAIL rollback|commit APPROVED-SHA');
const projectRef=readFileSync('supabase/.temp/project-ref','utf8').trim();
if(projectRef!==TEST_PROJECT) throw Error('Wrong project');
const packet=JSON.parse(readFileSync(input,'utf8'));
const options={ownerId,ownerEmail,projectRef,expectedSnapshotSha256:approvedHash,confirmation:`IMPORT ${TEST_PROJECT} ${ownerId}`};
// Run persistent-path checks even during rollback rehearsal.
const committed=prepareCommittedImport(packet,options);
const prepared=mode==='commit'?committed:prepareImport(packet,options);
const quote=v=>`'${String(v).replaceAll("'","''")}'`;
const sha=v=>createHash('sha256').update(v).digest('hex');
const match=prepared.sql.match(/insert into import_payload values \('([\s\S]*?)'::jsonb\);\ninsert into cdl.libraries/);
if(!match)throw Error('Payload boundary missing');
const payload=match[1].replaceAll("''","'");
JSON.parse(payload);
const chunks=[];for(let i=0;i<payload.length;) {
 let end=Math.min(i+180000,payload.length);
 if(end<payload.length && payload.charCodeAt(end-1)>=0xd800 && payload.charCodeAt(end-1)<=0xdbff)end--;
 chunks.push(payload.slice(i,end));i=end;
}
const dir=mkdtempSync(join(tmpdir(),'cdl-v14-import-'));
let sequence=0;
function query(sql) {
 const file=join(dir,`${sequence++}.sql`);writeFileSync(file,sql,{mode:0o600,flag:'wx'});
 try{return execFileSync('supabase',['db','query','--linked','--file',file],{encoding:'utf8',timeout:60000,maxBuffer:1024*1024,stdio:['ignore','pipe','pipe']});}
 catch {throw Error(`Database request failed; private SQL retained at ${file}. Recheck database state before retrying.`);}
}
const batch=prepared.summary.batchId;
query(`begin; create schema if not exists cdl_import_stage_v1403;
revoke all on schema cdl_import_stage_v1403 from public,anon,authenticated;
create table if not exists cdl_import_stage_v1403.chunks(batch_id uuid not null,ordinal integer not null,payload text not null,primary key(batch_id,ordinal));
revoke all on all tables in schema cdl_import_stage_v1403 from public,anon,authenticated; commit;`);
const source=`from cdl_import_stage_v1403.chunks where batch_id=${quote(batch)}::uuid`;
const staged=JSON.parse(query(`select count(*) as count, encode(extensions.digest(convert_to(string_agg(payload,'' order by ordinal),'UTF8'),'sha256'),'hex') as hash ${source};`)).rows?.[0];
const alreadyStaged=Number(staged?.count)===chunks.length && staged?.hash===sha(payload);
if(alreadyStaged)console.log('Reusing staged payload after exact count and SHA-256 verification.');
for(let i=0;!alreadyStaged && i<chunks.length;i++) {
 query(`insert into cdl_import_stage_v1403.chunks values (${quote(batch)}::uuid,${i},${quote(chunks[i])}) on conflict do nothing;`);
 if(i%10===0)console.log(`Staged ${i+1}/${chunks.length} private chunks (not library items).`);
}
const verify=`do $$ begin if (select count(*) ${source})<>${chunks.length} or (select encode(extensions.digest(convert_to(string_agg(payload,'' order by ordinal),'UTF8'),'sha256'),'hex') ${source})<>${quote(sha(payload))} then raise exception 'Staged payload mismatch'; end if; end $$;`;
// Use a callback: replacement strings interpret SQL's $$ delimiters as a single $.
let sql=replacePayload(prepared.sql,`insert into import_payload values ('${match[1]}'::jsonb);`,`${verify}\ninsert into import_payload select string_agg(payload,'' order by ordinal)::jsonb ${source};`);
// Cleanup only this newly staged batch after successful commit; failed runs retain evidence.
if(mode==='commit')sql=sql.replace('\ncommit;','\ndelete from cdl_import_stage_v1403.chunks where batch_id='+quote(batch)+'::uuid;\ncommit;');
console.log(query(sql));
console.log(JSON.stringify({...prepared.summary,privateSqlDirectory:dir}));
