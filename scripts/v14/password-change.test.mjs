import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
const hook = registerHooks({resolve(s,c,n){return n(c.parentURL?.includes('/app/lib/v14/')&&s.startsWith('./')&&!s.endsWith('.ts')?s+'.ts':s,c);}});
const {localPasswordChangeAllowed,validateNewPassword,passwordChangeError}=await import('../../app/lib/v14/password-change.ts');
hook.deregister();
test('password change aid is restricted to isolated localhost and unavailable on every hosted runtime',()=>{
  const env={CDL_V14_TEST:'true',CDL_V14_ORIGIN:'http://localhost:3014'};
  assert.equal(localPasswordChangeAllowed(env),true);
  for(const patch of [{VERCEL:'1'},{CDL_V14_TEST:'false'},{CDL_V14_ORIGIN:'https://example.vercel.app'},{NEXT_PUBLIC_NATIVE_APP:'true'},{CDL_V14_ORIGIN:'http://localhost:3000'}])assert.equal(localPasswordChangeAllowed({...env,...patch}),false);
});
test('password validation supports confirmation, rejects invalid lengths and never echoes values',()=>{
  const password='only a dummy test password';
  assert.equal(validateNewPassword(password,password),null);
  for(const [p,c] of [['short','short'],['x'.repeat(257),'x'.repeat(257)],[null,null],[password,'different']]){
    const result=validateNewPassword(p,c);assert.equal(typeof result,'string');assert.ok(!result.includes(password));
  }
});
test('provider errors expose only safe diagnostic codes, never arbitrary response messages',()=>{
  assert.match(passwordChangeError({code:'reauthentication_needed',status:400}),/emailed verification code/);
  assert.match(passwordChangeError({code:'same_password'}),/already your current password/);
  assert.match(passwordChangeError({code:'weak_password'}),/password-security policy/);
  assert.equal(passwordChangeError({code:'private supplied string',status:999}),'Supabase did not confirm the password change. (Code: unclassified)');
});
test('password action validates origin and verified owner before user-scoped auth update; no administrative credential',()=>{
  const source=readFileSync(new URL('../../app/v14/account/password/actions.ts',import.meta.url),'utf8');
  assert.ok(source.indexOf('get("origin")')<source.indexOf('updateUser('));
  assert.ok(source.indexOf('auth.getUser()')<source.indexOf('updateUser('));
  assert.match(source,/user\.id !== "baf0dab8-9904-48f2-a00f-30773bfc6ae1"/);
  assert.doesNotMatch(source,/console\.|service_role|auth\.admin|signInWithPassword/);
});
