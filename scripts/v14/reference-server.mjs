// Read-only v13 visual reference. Never runs from the production checkout.
import { createServer, request } from 'node:http';
import { readFile, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REFERENCE_COMMIT = '79524e83e2908cf60817cb9633a6d71a7a85e433';
export function verifyReferenceRuntime(referencePackage, installedVersions) {
  for (const name of ['next', 'react', 'react-dom']) {
    const expected = referencePackage.dependencies?.[name];
    if (!expected || installedVersions[name] !== expected) {
      throw new Error(`Reference runtime mismatch for ${name}; provide isolated v13 node_modules, not the upgraded v14 runtime`);
    }
  }
  return { ...installedVersions };
}
const tabs = { books: 'Books', movies: 'Movies', tv: 'Shows', games: 'Games', episodes: 'TV Episodes', settings: 'Settings', changelog: 'ChangeLog' };
export function csv(rows) {
  if (!Array.isArray(rows) || !rows.every(Array.isArray)) throw new Error('Invalid fixture rows');
  return rows.map(row => row.map(cell => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
export function fixtureFeeds(snapshot) {
  if (!Array.isArray(snapshot.tabs)) throw new Error('Missing fixture tabs');
  return Object.fromEntries(Object.entries(tabs).map(([key, name]) => {
    const matches = snapshot.tabs.filter(tab => tab.name.toLowerCase() === name.toLowerCase());
    if (matches.length !== 1 || !matches[0].unchanged) throw new Error(`Unverified fixture tab: ${name}`);
    return [key, csv(matches[0].formatted)];
  }));
}
export function allowedRequest(method, path) {
  if (!['GET', 'HEAD'].includes(method)) return false;
  return path === '/' || path.startsWith('/_next/static/') ||
    /^\/[a-zA-Z0-9_./ -]+\.(png|jpg|jpeg|webp|svg|ico|woff2|mp3|webmanifest)$/.test(path);
}

export function referenceRuntimeArguments(production, phase = 'serve') {
  if (production && phase === 'build') return ['build', '--webpack'];
  return [production ? 'start' : 'dev', ...(production ? [] : ['--webpack']), '-H', '127.0.0.1', '-p', '3012'];
}

export async function startReference(snapshotPath, runtimeModules, production = false) {
  const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const modules = runtimeModules ? resolve(runtimeModules) : join(repo, 'node_modules');
  const referencePackage = JSON.parse(execFileSync('git', ['show', `${REFERENCE_COMMIT}:package.json`], { cwd: repo, encoding: 'utf8' }));
  const versions = {};
  for (const name of ['next', 'react', 'react-dom']) versions[name] = JSON.parse(await readFile(join(modules, name, 'package.json'), 'utf8')).version;
  const runtimeVersions = verifyReferenceRuntime(referencePackage, versions);
  const raw = await readFile(snapshotPath);
  const snapshot = JSON.parse(raw);
  const feeds = fixtureFeeds(snapshot);
  const fixtureSha256 = createHash('sha256').update(raw).digest('hex');
  const root = await mkdtemp(join(tmpdir(), 'cdl-v13-reference-'));
  // Archive tracked reference files only; no ignored .env, build or credentials.
  const archive = execFileSync('git', ['archive', REFERENCE_COMMIT], { cwd: repo, maxBuffer: 512 * 1024 * 1024 });
  execFileSync('tar', ['-xf', '-', '-C', root, '--exclude=app/api', '--exclude=.env*'], { input: archive });
  await symlink(modules, join(root, 'node_modules'));
  const baselinePage = await readFile(join(root, 'app/page.tsx'));
  const expectedPage = execFileSync('git', ['show', `${REFERENCE_COMMIT}:app/page.tsx`], { cwd: repo, maxBuffer: 16 * 1024 * 1024 });
  if (baselinePage.toString().replaceAll('\r\n', '\n') !== expectedPage.toString().replaceAll('\r\n', '\n')) throw new Error('Reference source mismatch');
  const manifest = { referenceCommit: REFERENCE_COMMIT, fixtureSha256, capturedAt: snapshot.completedAt,
    root, url: 'http://localhost:3013', privateFixturePath: resolve(snapshotPath),
    runtimeVersions, runtimeModules: modules, production,
    restrictions: 'Loopback only; no app/api source; no inherited service credentials; all mutations denied; no live Sheet access',
    limitations: 'Provider search/recommendations are blocked; no full functional parity claim. Date-dependent views use current clock.' };
  await writeFile(join(root, 'reference-manifest.private.json'), JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });

  // Only public artwork GETs from the two known image services are permitted.
  const imageHosts = new Set(['image.tmdb.org', 'images.igdb.com']);
  for (const tab of snapshot.tabs) for (const row of tab.formatted.slice(1)) for (const cell of row) {
    try { const url = new URL(String(cell)); if (url.protocol === 'https:' && url.hostname.endsWith('.r2.dev')) imageHosts.add(url.hostname); } catch { /* Not an image URL. */ }
  }
  const csp = `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: ${[...imageHosts].map(h => `https://${h}`).join(' ')}; connect-src 'self'; font-src 'self' data:; media-src 'self'; worker-src 'self' blob:; form-action 'none'; object-src 'none'; frame-src 'none'`;
  const server = createServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Security-Policy', csp);
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-CDL-Reference', REFERENCE_COMMIT);
    const url = new URL(req.url, 'http://localhost:3013');
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(403); res.end('Read-only reference: mutation blocked'); return; }
    const feed = /^\/__fixtures\/([a-z]+)\.csv$/.exec(url.pathname)?.[1];
    if (feed && Object.hasOwn(feeds, feed)) { res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.end(req.method === 'HEAD' ? undefined : feeds[feed]); return; }
    if (url.pathname === '/__reference') { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ referenceCommit: REFERENCE_COMMIT, fixtureSha256, capturedAt: snapshot.completedAt })); return; }
    if (url.pathname === '/api/ui-prefs') { res.setHeader('Content-Type', 'application/json'); res.end('{"ok":true,"prefs":{}}'); return; }
    if (url.pathname === '/api/cover-proxy') {
      try {
        const image = new URL(url.searchParams.get('src'));
        if (image.protocol !== 'https:' || !imageHosts.has(image.hostname) || image.username || image.password || image.port) throw new Error('Image origin blocked');
        const upstream = await fetch(image, { redirect: 'error', signal: AbortSignal.timeout(10000) });
        if (!upstream.ok || !upstream.headers.get('content-type')?.startsWith('image/')) throw new Error('Not an image');
        res.setHeader('Content-Type', upstream.headers.get('content-type'));
        res.end(Buffer.from(await upstream.arrayBuffer()));
      } catch { res.writeHead(403); res.end('Reference image unavailable'); }
      return;
    }
    if (!allowedRequest(req.method, url.pathname) || url.pathname.includes('..') || url.pathname.startsWith('/api/')) { res.writeHead(403); res.end('Reference route blocked'); return; }
    // Do not forward cookies, auth, or arbitrary request headers to Next.
    const upstream = request({ hostname: '127.0.0.1', port: 3012, path: url.pathname + url.search, method: req.method,
      headers: { host: 'localhost:3013', accept: req.headers.accept || '*/*' } }, reply => {
      res.statusCode = reply.statusCode;
      for (const key of ['content-type', 'content-encoding', 'vary']) if (reply.headers[key]) res.setHeader(key, reply.headers[key]);
      reply.pipe(res);
    });
    upstream.on('error', () => { res.writeHead(503); res.end('Reference renderer starting'); });
    upstream.end();
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(3013, '127.0.0.1', resolve); });
  const env = { PATH: process.env.PATH, TMPDIR: tmpdir(), NODE_ENV: production ? 'production' : 'development', NEXT_TELEMETRY_DISABLED: '1',
    NEXT_PUBLIC_LOCALHOST_SETTINGS_READ_ONLY: 'true', NEXT_PUBLIC_NATIVE_APP: 'false' };
  for (const [name, key] of Object.entries({ BOOKS: 'books', MOVIES: 'movies', TV: 'tv', GAMES: 'games', TV_EPISODES: 'episodes', SETTINGS: 'settings', CHANGELOG: 'changelog' })) {
    env[`NEXT_PUBLIC_${name}_SHEET_CSV_URL`] = `http://localhost:3013/__fixtures/${key}.csv`;
  }
  // Mark configured without ever providing a real write destination.
  for (const name of ['SETTINGS', 'BOOKS', 'MOVIES', 'SHOWS', 'TV', 'GAMES']) env[`NEXT_PUBLIC_${name}_WRITE_URL`] = 'http://localhost:3013/__blocked';
  const launch = args => spawn(process.execPath, [join(modules, 'next/dist/bin/next'), ...args], { cwd: root, env, stdio: 'inherit' });
  let child;
  let stopped = false;
  const stop = () => { stopped = true; child?.kill('SIGTERM'); server.close(); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  if (production) {
    child = launch(referenceRuntimeArguments(true, 'build'));
    const code = await new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', resolve); });
    if (code !== 0 || stopped) { server.close(); throw new Error('Isolated reference build did not complete'); }
  }
  child = launch(referenceRuntimeArguments(production));
  child.once('exit', () => server.close());
  console.log(JSON.stringify({ url: manifest.url, referenceCommit: REFERENCE_COMMIT, fixtureSha256, root }));
  return { server, child, root };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2] || process.argv.length > 5 || (process.argv[4] && process.argv[4] !== '--production')) throw new Error('Usage: node scripts/v14/reference-server.mjs /absolute/private-capture.json [/absolute/isolated-v13/node_modules] [--production]');
  await startReference(process.argv[2], process.argv[3], process.argv[4] === '--production');
}
