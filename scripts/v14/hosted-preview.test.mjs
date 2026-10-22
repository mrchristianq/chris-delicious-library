import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';import {generateKeyPairSync} from 'node:crypto';
const h=registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {isApprovedV14Preview,isV14RuntimeAllowed}=await import('../../app/lib/v14/hosted-preview.ts');
const {getV14Config}=await import('../../app/lib/v14/config.ts');
const {manualSyncEnabled}=await import('../../app/lib/v14/tracker-manual-contract.ts');
const {parseHostedTrackerCredential}=await import('../../app/lib/v14/tracker-hosted-credential.ts');
const {storePrivateTrackerBackup}=await import('../../app/lib/v14/tracker-private-backup.ts');h.deregister();
const origin='https://cdl-test-abc.vercel.app';
const env={VERCEL:'1',VERCEL_ENV:'preview',VERCEL_URL:'cdl-test-abc.vercel.app',CDL_V14_TEST:'true',CDL_V14_PREVIEW_ENABLED:'true',CDL_V14_ORIGIN:origin,CDL_V14_APPROVED_PREVIEW_ORIGIN:origin,CDL_V14_SUPABASE_URL:'https://xnitocbxdpikvfxssbvm.supabase.co',CDL_V14_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_fixture'};
test('preview requires every explicit gate and an exact HTTPS deployment origin; production remains denied',()=>{
 assert.equal(isApprovedV14Preview(env),true);assert.equal(getV14Config(env).origin,origin);
 for(const k of Object.keys(env).filter(k=>!k.includes('SUPABASE')))assert.equal(isApprovedV14Preview({...env,[k]:undefined}),false,k);
 for(const patch of [{VERCEL_ENV:'production'},{NEXT_PUBLIC_NATIVE_APP:'true'},{CDL_V14_ORIGIN:'https://other.vercel.app'},{VERCEL_URL:'cdl-test-abc.vercel.app.evil.example'},{VERCEL_URL:'user@cdl-test-abc.vercel.app'},{CDL_V14_ORIGIN:origin+'/'},{CDL_V14_APPROVED_PREVIEW_ORIGIN:'*'}])assert.equal(isApprovedV14Preview({...env,...patch}),false);
 assert.equal(isV14RuntimeAllowed({CDL_V14_TEST:'true',CDL_V14_ORIGIN:'http://localhost:3014'}),true);
 assert.equal(isApprovedV14Preview({...env,VERCEL_URL:'cdl-different-deployment.vercel.app',VERCEL_BRANCH_URL:'cdl-test-abc.vercel.app'}),true);
 const manual={...env,CDL_V14_MANUAL_SYNC:'true',CDL_V14_REVIEW_ONLY:'true',CDL_V14_TRACKER_WRITE_TARGET:'1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0'};
 assert.equal(manualSyncEnabled(manual),true);assert.equal(manualSyncEnabled({...manual,VERCEL_ENV:'production'}),false);
});
test('hosted credentials pin the existing account and reject invalid or weak keys without leaking contents',()=>{
 const key=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs8',format:'pem'},publicKeyEncoding:{type:'spki',format:'pem'}}).privateKey;
 const v={type:'service_account',client_email:'cdl-v14-tracker-sync@chrisgamelibrary.iam.gserviceaccount.com',private_key_id:'a'.repeat(40),private_key:key};
 assert.equal(parseHostedTrackerCredential(JSON.stringify(v)).key,key);
 for(const bad of ['',JSON.stringify({...v,client_email:'other@example.com'}),JSON.stringify({...v,private_key:'PRIVATE_BAD_SECRET'}),JSON.stringify({...v,type:'authorized_user'})])assert.throws(()=>parseHostedTrackerCredential(bad),e=>e.message==='Invalid private tracker credential');
});
test('private backup is append-only and requires exact authenticated readback',async()=>{
 const owner='11111111-1111-4111-8111-111111111111',library='22222222-2222-4222-8222-222222222222',run='a'.repeat(64),bytes=Buffer.from('compressed fixture');let uploaded;
 const store={upload:async(path,body,opts)=>{uploaded={path,body,opts};return {error:null};},download:async()=>({data:new Blob([bytes]),error:null})};
 const receipt=await storePrivateTrackerBackup(store,bytes,owner,library,run);
 assert.match(receipt.path,new RegExp(`^${owner}/${library}/${run}/`));assert.equal(receipt.bucket,'cdl-v14-recovery');assert.equal(uploaded.opts.upsert,false);assert.equal(receipt.bytes,bytes.length);
 await assert.rejects(storePrivateTrackerBackup({...store,download:async()=>({data:new Blob(['wrong']),error:null})},bytes,owner,library,run),/readback/);
 await assert.rejects(storePrivateTrackerBackup({...store,upload:async()=>({error:{}})},bytes,owner,library,run),/upload/);
 await assert.rejects(storePrivateTrackerBackup(store,bytes,'../other',library,run),/Invalid/);
});
