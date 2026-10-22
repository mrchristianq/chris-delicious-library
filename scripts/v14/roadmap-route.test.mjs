import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const libraryId = '11111111-1111-4111-8111-111111111111';
const requestId = '33333333-3333-4333-8333-333333333333';
const items = [{ id: 'roadmap-1', text: 'A roadmap item', tag: 'feature', completed: false, createdAt: 1760000000000 }];
globalThis.__roadmapRouteMocks = {
  calls: [],
  snapshot: { library_id: libraryId, owner_id: 'owner', settings: [] },
  legacyItems: [{ id: 'legacy', text: 'Baseline', completed: false, createdAt: 1760000000000 }],
};

const stubs = {
  config: `export function getV14Config(){return {origin:'http://localhost:3014'}}`,
  read: `export async function readV14Library(id){globalThis.__roadmapRouteMocks.calls.push(['read',id]);return globalThis.__roadmapRouteMocks.snapshot}`,
  save: `export async function saveV14Setting(...args){globalThis.__roadmapRouteMocks.calls.push(['save',...args]);const [library_id,key,revision,requestId,value]=args;const nextRevision=(revision??0)+1;const setting={key,revision:nextRevision,value:{value}};globalThis.__roadmapRouteMocks.snapshot={...globalThis.__roadmapRouteMocks.snapshot,settings:[setting]};return {confirmed:true,requestId,snapshot:globalThis.__roadmapRouteMocks.snapshot}}`,
  legacy: `export async function GET(){globalThis.__roadmapRouteMocks.calls.push(['legacy-read']);return Response.json({ok:true,items:globalThis.__roadmapRouteMocks.legacyItems})}`,
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const key = specifier.endsWith('/config') ? 'config' : specifier.endsWith('/read-library-server') ? 'read' :
      specifier.endsWith('/save-setting-server') ? 'save' : specifier.endsWith('/api/roadmap/route') ? 'legacy' : null;
    if (key) return { url: `file:///roadmap-route-${key}.mjs`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const key = url.match(/^file:\/\/\/roadmap-route-(.+)\.mjs$/)?.[1];
    if (key && stubs[key]) return { format: 'module', source: stubs[key], shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { GET, PUT } = await import('../../app/v14/api/roadmap/route.ts');
hooks.deregister();

function put(value, options = {}) {
  return PUT(new Request(`http://localhost:3014/v14/api/roadmap?libraryId=${libraryId}`, {
    method: 'PUT',
    headers: { origin: 'http://localhost:3014', 'content-type': 'application/json', ...options.headers },
    body: options.body ?? JSON.stringify(value),
  }));
}

test('GET requires an authenticated library snapshot and falls back read-only when the setting is absent', async () => {
  globalThis.__roadmapRouteMocks.calls.length = 0;
  globalThis.__roadmapRouteMocks.snapshot = { library_id: libraryId, owner_id: 'owner', settings: [] };
  const response = await GET(new Request(`http://localhost:3014/v14/api/roadmap?libraryId=${libraryId}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
  assert.deepEqual(await response.json(), { items: globalThis.__roadmapRouteMocks.legacyItems, revision: null });
  assert.deepEqual(globalThis.__roadmapRouteMocks.calls, [['read', libraryId], ['legacy-read']]);
});

test('GET rejects a missing library query without reading shared roadmap data', async () => {
  globalThis.__roadmapRouteMocks.calls.length = 0;
  const response = await GET(new Request('http://localhost:3014/v14/api/roadmap'));
  assert.equal(response.status, 400);
  assert.deepEqual(globalThis.__roadmapRouteMocks.calls, []);
});

test('GET returns library-scoped persisted items and revision without reading legacy R2', async () => {
  globalThis.__roadmapRouteMocks.calls.length = 0;
  const serialized = JSON.stringify(items);
  globalThis.__roadmapRouteMocks.snapshot = { library_id: libraryId, owner_id: 'owner', settings: [{ key: 'roadmap:v14', revision: 4, value: { value: serialized } }] };
  const response = await GET(new Request(`http://localhost:3014/v14/api/roadmap?libraryId=${libraryId}`));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items, revision: 4 });
  assert.deepEqual(globalThis.__roadmapRouteMocks.calls, [['read', libraryId]]);
});

test('PUT requires same origin, a library query, valid JSON and item shape', async () => {
  const denied = await PUT(new Request(`http://localhost:3014/v14/api/roadmap?libraryId=${libraryId}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: '{}' }));
  assert.equal(denied.status, 403);
  assert.equal((await PUT(new Request('http://localhost:3014/v14/api/roadmap', { method: 'PUT', headers: { origin: 'http://localhost:3014', 'content-type': 'application/json' }, body: '{}' }))).status, 400);
  assert.equal((await put({ items: [{ ...items[0], tag: 'other' }], revision: null, requestId })).status, 400);
  assert.equal((await put({ items: [{ ...items[0], createdAt: 'yesterday' }], revision: null, requestId })).status, 400);
});

test('PUT enforces actual streamed byte size before any read or write', async () => {
  globalThis.__roadmapRouteMocks.calls.length = 0;
  const chunk = new Uint8Array(512 * 1024 + 1).fill(0x20);
  const body = new ReadableStream({ start(controller) { controller.enqueue(chunk); controller.close(); } });
  const response = await PUT(new Request(`http://localhost:3014/v14/api/roadmap?libraryId=${libraryId}`, {
    method: 'PUT', headers: { origin: 'http://localhost:3014', 'content-type': 'application/json' }, body, duplex: 'half',
  }));
  assert.equal(response.status, 413);
  assert.deepEqual(globalThis.__roadmapRouteMocks.calls, []);
});

test('PUT passes caller revision and request ID to the setting writer and confirms exact readback', async () => {
  globalThis.__roadmapRouteMocks.calls.length = 0;
  globalThis.__roadmapRouteMocks.snapshot = { library_id: libraryId, owner_id: 'owner', settings: [] };
  const response = await put({ items, revision: null, requestId });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { items, revision: 1, confirmed: true, requestId });
  const save = globalThis.__roadmapRouteMocks.calls.find(([kind]) => kind === 'save');
  assert.deepEqual(save, ['save', libraryId, 'roadmap:v14', null, requestId, JSON.stringify(items)]);
  assert.deepEqual(globalThis.__roadmapRouteMocks.calls.filter(([kind]) => kind === 'read').map((call) => call[1]), [libraryId]);
});

test('PUT rejects stale revisions before invoking the writer', async () => {
  globalThis.__roadmapRouteMocks.calls.length = 0;
  globalThis.__roadmapRouteMocks.snapshot = { library_id: libraryId, owner_id: 'owner', settings: [{ key: 'roadmap:v14', revision: 2, value: { value: '[]' } }] };
  const response = await put({ items, revision: null, requestId });
  assert.equal(response.status, 409);
  assert.equal(globalThis.__roadmapRouteMocks.calls.some(([kind]) => kind === 'save'), false);
});

test('PUT forwards a possible committed retry to the idempotent writer', async () => {
  globalThis.__roadmapRouteMocks.calls.length = 0;
  globalThis.__roadmapRouteMocks.snapshot = { library_id: libraryId, owner_id: 'owner', settings: [{ key: 'roadmap:v14', revision: 2, value: { value: JSON.stringify(items) } }] };
  const response = await put({ items, revision: 1, requestId });
  assert.equal(response.status, 200);
  assert.equal(globalThis.__roadmapRouteMocks.calls.find(([kind]) => kind === 'save')[3], 1);
});
