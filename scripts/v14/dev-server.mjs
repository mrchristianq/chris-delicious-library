import { readFileSync, existsSync } from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import { spawn } from 'node:child_process';

export const providerKeys = new Set([
  'TMDB_BEARER_TOKEN', 'TMDB_API_READ_ACCESS_TOKEN', 'TMDB_API_KEY',
  'IGDB_CLIENT_ID', 'IGDB_CLIENT_SECRET', 'TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET',
  'HARDCOVER_API_KEY', 'NYT_BOOKS_API_KEY', 'NEW_YORK_TIMES_API_KEY', 'NYT_API_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME', 'R2_PUBLIC_URL',
]);
const configKeys = new Set(['CDL_V14_TEST', 'CDL_V14_SUPABASE_URL', 'CDL_V14_SUPABASE_PUBLISHABLE_KEY', 'CDL_V14_ORIGIN']);
const systemKeys = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'LANG', 'LC_ALL', 'SystemRoot'];
const envFiles = ['.env', '.env.development', '.env.local', '.env.development.local', '.env.production', '.env.production.local'];

export function buildEnvironment(files, provider, inherited = {}) {
  const config = {};
  for (const [name, values] of files) {
    for (const [key, value] of Object.entries(values)) {
      // Next loads these files independently: rejecting unknown keys is essential.
      if (!configKeys.has(key)) throw new Error(`Unapproved environment key in ${name}: ${key}`);
      if (config[key] !== undefined && config[key] !== value) throw new Error(`Conflicting test configuration: ${key}`);
      config[key] = value;
    }
  }
  if (config.CDL_V14_TEST !== 'true' || config.CDL_V14_SUPABASE_URL !== 'https://xnitocbxdpikvfxssbvm.supabase.co'
    || !config.CDL_V14_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')
    || config.CDL_V14_ORIGIN !== 'http://localhost:3014') throw new Error('Invalid isolated v14 configuration');
  const env = { NODE_ENV: 'development', ...config };
  for (const key of systemKeys) if (inherited[key]) env[key] = inherited[key];
  for (const key of providerKeys) if (provider[key]?.trim()) env[key] = provider[key];
  return env;
}

export function parseArguments(args) {
  let providerPath;
  let trackerConfig;
  let check = false;
  let readOnly = false;
  let manualWritesOnly = false;
  let production = false;
  let reviewOnly = false;
  let trackerManualSync = false;
  let acceptanceWrites = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check' && !check) check = true;
    else if (args[i] === '--read-only' && !readOnly) readOnly = true;
    else if (args[i] === '--review-only' && !reviewOnly) reviewOnly = true;
    else if (args[i] === '--tracker-manual-sync' && !trackerManualSync) trackerManualSync = true;
    else if (args[i] === '--acceptance-writes' && !acceptanceWrites) acceptanceWrites = true;
    else if (args[i] === '--manual-writes-only' && !manualWritesOnly) manualWritesOnly = true;
    else if (args[i] === '--production' && !production) production = true;
    else if (args[i] === '--provider-env' && !providerPath && args[i + 1] && isAbsolute(args[i + 1])) providerPath = args[++i];
    else if (args[i] === '--tracker-config' && !trackerConfig && args[i + 1] && isAbsolute(args[i + 1])) trackerConfig = args[++i];
    else throw new Error('Usage: node scripts/v14/dev-server.mjs --provider-env <absolute path> [--check] [--read-only | --review-only | --manual-writes-only]');
  }
  if (!providerPath) throw new Error('An explicit absolute provider environment path is required');
  if ([readOnly,manualWritesOnly,reviewOnly,acceptanceWrites].filter(Boolean).length>1) throw new Error('Choose one validation mode');
  if (production && !readOnly&&!reviewOnly&&!acceptanceWrites) throw new Error('Optimized validation requires an explicit safe test mode');
  if (acceptanceWrites&&!trackerConfig)throw new Error('Acceptance requires the explicit isolated tracker connection');
  if (trackerManualSync && ((!reviewOnly&&!acceptanceWrites) || !trackerConfig)) throw new Error('Manual tracker sync requires an explicit test mode and tracker credentials');
  return { providerPath, trackerConfig, check, readOnly:readOnly||reviewOnly, reviewOnly, manualWritesOnly:manualWritesOnly||acceptanceWrites, production, ...(acceptanceWrites?{acceptanceWrites:true}:{}), ...(trackerManualSync?{trackerManualSync:true}:{}) };
}

export function main(args = process.argv.slice(2)) {
  const { providerPath, trackerConfig, check, readOnly, reviewOnly, manualWritesOnly, production, trackerManualSync, acceptanceWrites } = parseArguments(args);
  const root = fileURLToPath(new URL('../../', import.meta.url));
  const files = envFiles.filter(name => existsSync(resolve(root, name)))
    .map(name => [name, parseEnv(readFileSync(resolve(root, name), 'utf8'))]);
  const env = buildEnvironment(files, parseEnv(readFileSync(providerPath, 'utf8')), process.env);
  if (trackerConfig) env.CDL_V14_TRACKER_CONFIG_FILE = trackerConfig;
  if (production) env.NODE_ENV = 'production';
  env.CDL_V14_VALIDATION_READ_ONLY = String(readOnly);
  env.CDL_V14_REVIEW_ONLY = String(reviewOnly);
  env.CDL_V14_MANUAL_WRITES_ONLY = String(manualWritesOnly);
  env.CDL_V14_ACCEPTANCE_WRITES = String(!!acceptanceWrites);
  if (trackerManualSync) {
    env.CDL_V14_MANUAL_SYNC = 'true';
    env.CDL_V14_TRACKER_WRITE_TARGET = '1kkdF7XFpKctOHiktwtaYagE9KeituvRepJ5ziUE_nF0';
  }
  console.log(`Automatic TV refresh: ${readOnly || manualWritesOnly ? 'paused for validation' : 'normal'}`);
  console.log(`Validation read-only mode: ${readOnly ? 'ON — writes blocked' : 'off'}`);
  if(reviewOnly)console.log('Review-only mode: ordinary app mutations blocked; review and checkpoint endpoints allowed');
  if(acceptanceWrites)console.log('Local v14 acceptance: manual app saves enabled; automatic metadata refresh paused; no automatic Sheet sync');
  if(trackerManualSync)console.log('Explicit manual sync enabled for the new v14 tracker only; no automatic sync or legacy endpoint enabled');
  console.log('Isolated v14 configuration valid. Provider key presence (not connectivity):');
  for (const key of providerKeys) console.log(`${key}: ${env[key] ? 'configured' : 'absent'}`);
  if (check) return;
  if (production && !existsSync(resolve(root, '.next/BUILD_ID'))) throw new Error('Build the isolated app before optimized validation');
  const child = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), production ? 'start' : 'dev', ...(production ? [] : ['--webpack']), '--hostname', 'localhost', '--port', '3014'],
    { cwd: root, env, stdio: 'inherit', shell: false });
  process.once('SIGINT', () => child.kill('SIGINT'));
  process.once('SIGTERM', () => child.kill('SIGTERM'));
  child.once('error', () => { console.error('Unable to start isolated development server'); process.exitCode = 1; });
  child.once('exit', code => { process.exitCode = code ?? 1; });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch { console.error('Isolated launch refused. Check arguments and allowlisted environment configuration. No credentials were printed.'); process.exitCode = 1; }
}
