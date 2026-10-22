import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { checkConcurrentProgress } from './concurrency-check.mjs';

// Disposable, network-disabled PostgreSQL. Never accepts a remote connection URL
// or an existing container name. Only this run's synthetic data can be removed.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const name = `cdl-contract-${randomUUID()}`;
const image = 'public.ecr.aws/supabase/postgres:17.6.1.143';
function docker(args, input) {
  const result = spawnSync('docker', args, { input, encoding: 'utf8', timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(result.error?.message || result.stderr || result.stdout);
  return result.stdout;
}
let created = false;
try {
  docker(['run', '--detach', '--name', name, '--network', 'none', '--tmpfs', '/var/lib/postgresql/data', '-e', `POSTGRES_PASSWORD=${randomUUID()}`, image]);
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    // The image starts a socket-only temporary server during initialization.
    // TCP readiness means that phase finished and the final server is running.
    const result = spawnSync('docker', ['exec', name, 'pg_isready', '-h', '127.0.0.1', '-U', 'postgres'], { timeout: 3000, encoding: 'utf8' });
    if (result.status === 0) { ready = true; break; }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Disposable database did not become ready');
  for (const directory of ['supabase/migrations', 'supabase/tests']) {
    for (const file of readdirSync(path.join(root, directory)).filter(file => file.endsWith('.sql')).sort()) {
      docker(['exec', '-i', name, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'], readFileSync(path.join(root, directory, file), 'utf8'));
      console.log(`PASS ${directory}/${file}`);
    }
  }
  await checkConcurrentProgress(name);
} finally {
  if (created) {
    docker(['rm', '--force', name]);
    console.log('Removed disposable database and synthetic fixtures. No persistent database was used.');
  }
}
