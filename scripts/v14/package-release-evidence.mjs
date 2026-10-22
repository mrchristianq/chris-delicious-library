import {execFileSync} from 'node:child_process';
import {copyFileSync,readFileSync,writeFileSync,readdirSync,chmodSync} from 'node:fs';
import {resolve} from 'node:path';import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'../..'),backup='/Users/metroclick/Documents/CDL-Recovery/2026-10-09-pre-v14/v14-release-14065-qTbKTc';
if(process.argv.length!==2)throw new Error('No arguments accepted');
const names=[...new Set(execFileSync('git',['ls-files','-z','--cached','--others','--exclude-standard'],{cwd:root,encoding:'utf8'}).split('\0').filter(Boolean))].filter(p=>!p.split('/').some(s=>s.startsWith('.env')||s==='.vercel')&&!/\.(pem|key)$/.test(p));
execFileSync('tar',['-czf',resolve(backup,'source.tar.gz'),'--null','-T','-'],{cwd:root,input:names.join('\0')+'\0',timeout:120000});chmodSync(resolve(backup,'source.tar.gz'),0o600);
for(const kind of ['tests','build','types','lint','cargo','diff','recovery','backup-restore']){const dest=resolve(backup,kind+'.log');copyFileSync('/tmp/cdl-14065-'+kind+'.log',dest);chmodSync(dest,0o600);}
copyFileSync(resolve(root,'docs/V14-RELEASE-READINESS.md'),resolve(backup,'RELEASE-READINESS.md'));chmodSync(resolve(backup,'RELEASE-READINESS.md'),0o600);
const hashes=Object.fromEntries(readdirSync(backup).filter(p=>p!=='SHA256SUMS.json').sort().map(p=>[p,createHash('sha256').update(readFileSync(resolve(backup,p))).digest('hex')]));
writeFileSync(resolve(backup,'SHA256SUMS.json'),JSON.stringify(hashes,null,2),{mode:0o600});
const entries=execFileSync('tar',['-tzf',resolve(backup,'source.tar.gz')],{encoding:'utf8'}).split('\n').filter(Boolean);
if(entries.some(p=>p.split('/').some(s=>s.startsWith('.env')||s==='.vercel')||/\.(pem|key)$/.test(p)))throw new Error('Unexpected private file in archive');
console.log(JSON.stringify({result:'PASS',backup,sourceFiles:entries.length,sourceSha256:hashes['source.tar.gz'],noEnvironmentOrKeyFiles:true}));
