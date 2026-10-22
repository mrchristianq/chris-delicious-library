import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(['./tracker-read','./hosted-preview'].includes(s)?s+'.ts':s,c);}});
const {manualSyncEnabled,parseManualCommand}=await import('../../app/lib/v14/tracker-manual-contract.ts');h.deregister();
const env={CDL_V14_TEST:'true',CDL_V14_MANUAL_SYNC:'true',CDL_V14_REVIEW_ONLY:'true',CDL_V14_TRACKER_WRITE_TARGET:'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0',CDL_V14_ORIGIN:'http://localhost:3014'};
test('manual apply requires explicit local new-tracker-only activation, not ordinary review mode',()=>{
 assert.equal(manualSyncEnabled(env),true);
 for(const key of Object.keys(env))assert.equal(manualSyncEnabled({...env,[key]:'wrong'}),false);
 assert.equal(manualSyncEnabled({...env,VERCEL:'1'}),false);assert.equal(manualSyncEnabled({...env,NEXT_PUBLIC_NATIVE_APP:'true'}),false);
});
test('manual commands carry only strict intent and sealed identities, never browser patches or Sheet targets',()=>{
 const command={action:'stage',libraryId:'11111111-1111-4111-8111-111111111111',requestId:'22222222-2222-4222-8222-222222222222',fingerprint:'a'.repeat(64)};
 assert.deepEqual(parseManualCommand(command),command);assert.equal(parseManualCommand({...command,action:'apply'}).action,'apply');
 for(const bad of [null,[],{...command,patch:{}},{...command,target:'original'},{...command,action:'auto'},{...command,action:['stage']},{...command,libraryId:[command.libraryId]},{...command,requestId:[command.requestId]},{...command,fingerprint:'bad'},{...command,libraryId:'bad'},{...command,requestId:null}])assert.throws(()=>parseManualCommand(bad));
});
test('manual sync in acceptance mode requires the full local manual-only configuration',()=>{
 const accepted={...env,CDL_V14_REVIEW_ONLY:'false',CDL_V14_ACCEPTANCE_WRITES:'true',CDL_V14_MANUAL_WRITES_ONLY:'true',CDL_V14_VALIDATION_READ_ONLY:'false'};
 assert.equal(manualSyncEnabled(accepted),true);
 for(const key of Object.keys(accepted))assert.equal(manualSyncEnabled({...accepted,[key]:'wrong'}),false,key);
 assert.equal(manualSyncEnabled({...accepted,VERCEL:'1'}),false);
});
