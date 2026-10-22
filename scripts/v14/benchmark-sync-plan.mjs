// Read-only capacity check on in-memory copies of fresh real sources. Never
// stages a package, claims a run, mutates Google/DB or prints personal values.
import {registerHooks} from 'node:module';import {readFileSync} from 'node:fs';import {resolve} from 'node:path';import assert from 'node:assert/strict';import {performance} from 'node:perf_hooks';
import {writer,rpc,fingerprints,root,library,owner} from './execute-initial-tracker.mjs';
const hook=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {readLibrary}=await import('../../app/lib/v14/read-library.ts');
const {readTrackerConnection}=await import('../../app/lib/v14/tracker-read-server.ts');
const {validateTrackerBaselineState}=await import('../../app/lib/v14/tracker-baseline-read.ts');
const {compileTrackerMixedPlan,encodeMixedPlan}=await import('../../app/lib/v14/tracker-mixed-plan.ts');
const {storedMixedPackage,preflightMixedPackage}=await import('../../app/lib/v14/tracker-mixed-package.ts');
hook.deregister();
const config=process.argv[2];if(process.argv.length!==3||!config?.startsWith('/')||readFileSync(resolve(root,'supabase/.temp/project-ref'),'utf8').trim()!=='xnitocbxdpikvfxssbvm')throw new Error('Pinned read-only test configuration required');
process.env.CDL_V14_TEST='true';process.env.CDL_V14_TRACKER_CONFIG_FILE=config;delete process.env.CDL_V14_TRACKER_WRITE_TARGET;
const before=fingerprints(),started=performance.now(),base=()=>validateTrackerBaselineState(rpc(`public.cdl_v14_tracker_baselines('${library}'::uuid)`),owner,library),baseline=base();
const [snapshot,connection]=await Promise.all([readLibrary(writer,library),readTrackerConnection(true)]);
assert.ok(baseline&&connection?.tables&&connection.grids);assert.deepEqual(base(),baseline);
const readMs=Math.round(performance.now()-started),results=[];
for(const count of [0,50,100,250,500,501]){
 const items=structuredClone(snapshot.items),selected=items.filter(i=>i.media_type==='game').slice(0,count);assert.equal(selected.length,count);
 for(const item of selected)item.user_status=item.user_status==='Abandoned'?'Completed':'Abandoned';
 const begin=performance.now();let stage='compile';
 try{
  const plan=compileTrackerMixedPlan(items,connection.tables,snapshot.settings,baseline,{stamp:'a'.repeat(32),metadataStamp:'b'.repeat(32)},connection.observedAt);
  stage='package';const encoded=encodeMixedPlan(plan),packaged=storedMixedPackage(plan);stage='preflight';const metrics=preflightMixedPackage(plan,items,connection.tables,connection.grids);
  results.push({changedRecords:count,status:'prepared-only',exports:plan.exports.length,imports:plan.imports.length,compileAndPrepareMs:Math.round(performance.now()-begin),packageChars:encoded.length,packageParts:packaged.parts.length,manifestChars:packaged.manifest.length,googleRequests:metrics.googleRequests,googleBytes:metrics.googleBytes});
 }catch(error){results.push({changedRecords:count,status:'held-before-write',stage,reason:error.message,compileAndPrepareMs:Math.round(performance.now()-begin)});}
}
assert.deepEqual(fingerprints(),before);
console.log(JSON.stringify({mode:'read-only',libraryItems:snapshot.items.length,freshSourceReadMs:readMs,results,liveWrites:0,protectedDataUnchanged:true}));
