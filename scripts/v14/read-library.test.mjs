import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
const hooks=registerHooks({resolve(specifier,context,next){
 if(context.parentURL?.includes('/app/lib/v14/') && ['./library-snapshot','./legacy-row'].includes(specifier)) return next(specifier+'.ts',context);
 return next(specifier,context);
}});
const {readLibrary}=await import('../../app/lib/v14/read-library.ts');
hooks.deregister();
const owner='11111111-1111-4111-8111-111111111111';
const library='22222222-2222-4222-8222-222222222222';
const fixture=()=>({schema_version:1,complete:true,library_id:library,owner_id:owner,observed_at:new Date().toISOString(),change_token:'test',counts:{items:0,episodes:0,settings:0},items:[],episodes:[],settings:[]});
test('authenticates before reading and rereads on every invocation',async()=>{
 const calls=[];const reader={authenticatedOwner:async()=>{calls.push('auth');return owner;},snapshot:async id=>{calls.push(id);return fixture();}};
 await readLibrary(reader,library);await readLibrary(reader,library);
 assert.deepEqual(calls,['auth',library,'auth',library]);
});
test('denied authentication never fetches library data',async()=>{
 await assert.rejects(readLibrary({authenticatedOwner:async()=>null,snapshot:async()=>{assert.fail('unauthorized fetch');}},library),/Authentication/);
});
test('failed or partial reads never fall back to previous success',async()=>{
 let result=fixture(); const reader={authenticatedOwner:async()=>owner,snapshot:async()=>result};
 await readLibrary(reader,library);
 for(const next of [null,{...fixture(),owner_id:library},{...fixture(),complete:false},{...fixture(),counts:{items:10,episodes:0,settings:0}}]){result=next;await assert.rejects(readLibrary(reader,library));}
 reader.snapshot=async()=>{throw new Error('offline');};await assert.rejects(readLibrary(reader,library),/offline/);
});
