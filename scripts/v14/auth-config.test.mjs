import test from 'node:test';
import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const h=registerHooks({resolve(s,c,n){return n(s==='./hosted-preview'?s+'.ts':s,c);}});
const {getV14Config,isV14Path}=await import('../../app/lib/v14/config.ts');h.deregister();

const good = { CDL_V14_TEST: 'true', CDL_V14_SUPABASE_URL: 'https://xnitocbxdpikvfxssbvm.supabase.co', CDL_V14_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', CDL_V14_ORIGIN: 'http://localhost:3014' };
test('requires explicit isolated mode, exact test target, public key and local origin', () => {
  assert.equal(getV14Config(good).origin, 'http://localhost:3014');
  for (const override of [{ CDL_V14_TEST: undefined }, { CDL_V14_SUPABASE_URL: 'https://production.supabase.co' }, { CDL_V14_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_not_allowed' }, { CDL_V14_ORIGIN: 'https://evil.example' }, { VERCEL: '1' }, { NEXT_PUBLIC_NATIVE_APP: 'true' }]) {
    assert.throws(() => getV14Config({ ...good, ...override }));
  }
});
test('v14 path matching does not admit lookalike routes', () => {
  assert.equal(isV14Path('/v14'), true);
  assert.equal(isV14Path('/v14/auth/callback'), true);
  for (const path of ['/v140', '/v14-legacy', '/api/sheets-write', '/']) assert.equal(isV14Path(path), false);
});
