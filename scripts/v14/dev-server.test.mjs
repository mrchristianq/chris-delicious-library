import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEnvironment, parseArguments } from './dev-server.mjs';
const config = { CDL_V14_TEST: 'true', CDL_V14_SUPABASE_URL: 'https://xnitocbxdpikvfxssbvm.supabase.co', CDL_V14_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', CDL_V14_ORIGIN: 'http://localhost:3014' };
test('launcher passes only allowlisted credentials and system settings', () => {
  const env = buildEnvironment([['.env.local', config]], { TMDB_API_KEY: 'test', GOOGLE_SCRIPT_URL: 'forbidden', NEXT_PUBLIC_SECRET: 'forbidden' }, { PATH: '/bin', NODE_OPTIONS: 'forbidden', VERCEL: '1', DATABASE_URL: 'forbidden' });
  assert.equal(env.TMDB_API_KEY, 'test');
  assert.equal(env.PATH, '/bin');
  for (const key of ['GOOGLE_SCRIPT_URL', 'NEXT_PUBLIC_SECRET', 'NODE_OPTIONS', 'VERCEL', 'DATABASE_URL']) assert.equal(env[key], undefined);
});
test('launcher rejects unknown keys in every Next autoload file', () => {
  for (const name of ['.env', '.env.local', '.env.development', '.env.development.local', '.env.production', '.env.production.local']) {
    assert.throws(() => buildEnvironment([['.env.local', config], [name, { GOOGLE_SCRIPT_URL: 'secret' }]], {}), /Unapproved/);
  }
});
test('launcher rejects wrong project, origin, key, mode and conflicting configurations', () => {
  for (const key of Object.keys(config)) assert.throws(() => buildEnvironment([['.env.local', { ...config, [key]: 'wrong' }]], {}), /Invalid/);
  assert.throws(() => buildEnvironment([['.env.local', config], ['.env', { CDL_V14_TEST: 'false' }]], {}), /Conflicting/);
});
test('launcher requires explicit absolute source and rejects arbitrary flags', () => {
  assert.deepEqual(parseArguments(['--provider-env', '/private/provider.env', '--check']), { providerPath: '/private/provider.env', trackerConfig: undefined, check: true, readOnly: false, reviewOnly:false, manualWritesOnly: false, production: false });
  assert.equal(parseArguments(['--provider-env', '/private/provider.env', '--read-only']).readOnly,true);
  assert.equal(parseArguments(['--provider-env', '/private/provider.env', '--manual-writes-only']).manualWritesOnly,true);
  assert.throws(() => parseArguments(['--provider-env','/private/provider.env','--read-only','--manual-writes-only']));
  assert.throws(() => parseArguments(['--provider-env','/private/provider.env','--manual-writes-only','--manual-writes-only']));
  for (const args of [[], ['--provider-env', 'relative'], ['--port', '3000'], ['--provider-env', '/private/env', '--check', '--check']]) assert.throws(() => parseArguments(args));
});
test('review-only mode permits optimized review validation without enabling general writes',()=>{
 const flags=['--provider-env','/private/env','--review-only','--production'];
 assert.equal(parseArguments(flags).reviewOnly,true);assert.equal(parseArguments(flags).readOnly,true);
 for(const extra of ['--read-only','--manual-writes-only','--review-only'])assert.throws(()=>parseArguments([...flags,extra]));
});
test('optimized local validation cannot enable writes or accept duplicate production flags', () => {
  assert.equal(parseArguments(['--provider-env','/private/env','--read-only','--production']).production,true);
  for (const flags of [['--production'],['--production','--manual-writes-only'],['--production','--production','--read-only']]) assert.throws(()=>parseArguments(['--provider-env','/private/env',...flags]));
});
test('tracker credential path requires an explicit absolute flag and is never inherited',()=>{
 assert.equal(parseArguments(['--provider-env','/private/env','--tracker-config','/private/connection.json']).trackerConfig,'/private/connection.json');
 assert.throws(()=>parseArguments(['--provider-env','/private/env','--tracker-config','relative']));
 assert.throws(()=>parseArguments(['--provider-env','/private/env','--tracker-config','/private/a','--tracker-config','/private/b']));
 assert.equal(buildEnvironment([['.env.local',config]],{}, {CDL_V14_TRACKER_CONFIG_FILE:'/unapproved'}).CDL_V14_TRACKER_CONFIG_FILE,undefined);
});
test('manual sync is a separate explicit exception; ordinary writes remain blocked',()=>{
 const base=['--provider-env','/private/env','--review-only','--tracker-config','/private/connection.json'];
 assert.equal(parseArguments([...base,'--tracker-manual-sync','--production']).trackerManualSync,true);
 for(const args of [['--provider-env','/private/env','--tracker-manual-sync'],[...base,'--tracker-manual-sync','--tracker-manual-sync'],['--provider-env','/private/env','--review-only','--tracker-manual-sync']])assert.throws(()=>parseArguments(args));
 const filtered=buildEnvironment([['.env.local',config]],{}, {CDL_V14_MANUAL_SYNC:'true',CDL_V14_TRACKER_WRITE_TARGET:'original'});
 assert.equal(filtered.CDL_V14_MANUAL_SYNC,undefined);assert.equal(filtered.CDL_V14_TRACKER_WRITE_TARGET,undefined);
});
test('acceptance mode allows manual CRUD plus explicit tracker sync, never background refresh',()=>{
 const flags=['--provider-env','/private/env','--tracker-config','/private/connection.json','--acceptance-writes','--tracker-manual-sync','--production'];
 const mode=parseArguments(flags);assert.equal(mode.readOnly,false);assert.equal(mode.reviewOnly,false);assert.equal(mode.manualWritesOnly,true);assert.equal(mode.acceptanceWrites,true);
 for(const flag of ['--read-only','--review-only','--manual-writes-only','--acceptance-writes'])assert.throws(()=>parseArguments([...flags,flag]));
 assert.throws(()=>parseArguments(['--provider-env','/private/env','--acceptance-writes']));
 assert.equal(buildEnvironment([['.env.local',config]],{}, {CDL_V14_ACCEPTANCE_WRITES:'true'}).CDL_V14_ACCEPTANCE_WRITES,undefined);
});
