import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const libraryId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const item = { id: itemId, library_id: libraryId, media_type: 'book', revision: 2, title: 'Fixture', user_status: 'Collection', personal_rating: 0, completed_on: null, notes: 'old', metadata: {}, user_fields: {} };
globalThis.__v14RouteMocks = {
  calls: [], current: item, snapshot: { library_id: libraryId, owner_id: 'owner', complete: true, items: [item], episodes: [], settings: [], identifiers: [], collections: [], counts: { items: 1, episodes: 0, settings: 0 } },
};

const stubs = {
  config: `export function getV14Config(){return {origin:'http://localhost:3014'}}`,
  server: `export async function createV14Client(){return {auth:{getUser:async()=>({data:{user:{id:'owner'}},error:null})},rpc:async(name,args)=>{globalThis.__v14RouteMocks.calls.push(['rpc',name,args]);if(name==='cdl_v14_full_edit'||name==='cdl_v14_full_edit_activity'){const p=args.p_patch;const old=globalThis.__v14RouteMocks.current;const next={...old,...p,user_fields:{...old.user_fields,...(p.overrides??{})},revision:args.p_revision+1};globalThis.__v14RouteMocks.current=next;return {data:next,error:null}}return {data:globalThis.__v14RouteMocks.current,error:null}}}}`,
  read: `export async function readV14Library(id){globalThis.__v14RouteMocks.calls.push(['read',id]);return globalThis.__v14RouteMocks.snapshot} export async function revalidateV14Library(id,token){globalThis.__v14RouteMocks.calls.push(['revalidate',id,token]);return {unchanged:true,library_id:id,change_token:token}}`,
  create: `export async function createV14Item(input){globalThis.__v14RouteMocks.calls.push(['create',input]);return {confirmed:true}}`,
  archive: `export async function saveV14Archive(...args){globalThis.__v14RouteMocks.calls.push(['archive',...args]);return {confirmed:true}}`,
  setting: `export async function saveV14Setting(...args){globalThis.__v14RouteMocks.calls.push(['setting',...args]);return {confirmed:true}}`,
  progress: `export async function saveV14EpisodeProgress(...args){globalThis.__v14RouteMocks.calls.push(['progress',...args]);return {confirmed:true}}`,
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const key = specifier.endsWith('/config') ? 'config' : specifier.endsWith('/read-library-server') ? 'read' :
      specifier.endsWith('/create-item-server') ? 'create' :
      specifier.endsWith('/save-archive-server') ? 'archive' : specifier.endsWith('/save-setting-server') ? 'setting' :
      specifier.endsWith('/save-progress-server') ? 'progress' : specifier.endsWith('/server') ? 'server' : null;
    if (key) return { url: `file:///v14-route-${key}.mjs`, shortCircuit: true };
    if(specifier.endsWith('/stream-json') || specifier.endsWith('/activity-context'))return nextResolve(specifier+'.ts',context);
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const key = url.match(/^file:\/\/\/v14-route-(.+)\.mjs$/)?.[1];
    if (key && stubs[key]) return { format: 'module', source: stubs[key], shortCircuit: true };
    return nextLoad(url, context);
  },
});
const { GET, POST } = await import('../../app/v14/api/library/route.ts');
hooks.deregister();

function post(value, headers = {}) {
  return POST(new Request('http://localhost:3014/v14/api/library', {
    method: 'POST',
    headers: { origin: 'http://localhost:3014', 'content-type': 'application/json', ...headers },
    body: JSON.stringify(value),
  }));
}

test('GET returns the authenticated snapshot without caching', async () => {
  const response = await GET(new Request(`http://localhost:3014/v14/api/library?libraryId=${libraryId}`));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
  assert.equal((await response.json()).library_id, libraryId);
});

test('POST requires exact same origin and rejects unknown command fields', async () => {
  const denied = await POST(new Request('http://localhost:3014/v14/api/library', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}',
  }));
  assert.equal(denied.status, 403);
  assert.equal((await post({ kind: 'setting', libraryId, key: 'x', revision: null, requestId, value: true, extra: 1 })).status, 400);
});

test('edit retry sends the exact patch with the client revision and confirms independent readback', async () => {
  globalThis.__v14RouteMocks.calls.length = 0;
  globalThis.__v14RouteMocks.current = item;
  const patch = { title: 'Updated title', notes: '', overrides: { Author: 'A. Writer' } };
  const response = await post({ kind: 'edit', libraryId, itemId, revision: 1, requestId, patch });
  assert.equal(response.status, 200);
  const writes = globalThis.__v14RouteMocks.calls.filter(([kind, name]) => kind === 'rpc' && name === 'cdl_v14_full_edit');
  assert.equal(writes.length, 1);
  assert.equal(writes[0][2].p_revision, 1);
  assert.equal(writes[0][2].p_request_id, requestId);
  assert.deepEqual(writes[0][2].p_patch, patch);
  assert.equal(globalThis.__v14RouteMocks.calls.filter(([kind, name]) => kind === 'rpc' && name === 'cdl_v14_get_item').length, 1);
});

test('rejects payloads exceeding the actual streamed byte limit', async () => {
  const chunk = new Uint8Array(512 * 1024 + 1).fill(0x20);
  const body = new ReadableStream({ start(controller) { controller.enqueue(chunk); controller.close(); } });
  const response = await POST(new Request('http://localhost:3014/v14/api/library', {
    method: 'POST', headers: { origin: 'http://localhost:3014', 'content-type': 'application/json' }, body, duplex: 'half',
  }));
  assert.equal(response.status, 413);
});

test('setting saves delegate authentication and confirmation without a redundant pre-write snapshot', async () => {
  globalThis.__v14RouteMocks.calls.length = 0;
  const command = { kind: 'setting', libraryId, key: 'coverSize', revision: 2, requestId, value: 100 };
  const response = await post(command);
  assert.equal(response.status, 200);
  assert.deepEqual(globalThis.__v14RouteMocks.calls, [
    ['setting', libraryId, 'coverSize', 2, requestId, 100],
  ]);
  assert.equal(response.headers.get('cache-control'), 'no-store, max-age=0');
});

test('episode saves also avoid the unused preflight and retain the prepared retry request', async () => {
  globalThis.__v14RouteMocks.calls.length = 0;
  const changes = [{ episode_id: itemId, revision: null, watched: false, watched_at: null }];
  const response = await post({ kind: 'progress', libraryId, requestId, changes });
  assert.equal(response.status, 200);
  assert.deepEqual(globalThis.__v14RouteMocks.calls, [['progress', libraryId, requestId, changes]]);
});

test('fresh revision checks reject malformed tokens and delegate valid tokens without reading the entire library',async()=>{
 globalThis.__v14RouteMocks.calls=[];
 for(const query of [`libraryId=${libraryId}&changeToken=invalid`,`libraryId=${libraryId}&changeToken=${'a'.repeat(32)}&changeToken=${'a'.repeat(32)}`])assert.equal((await GET(new Request('http://localhost:3014/v14/api/library?'+query))).status,400);
 const response=await GET(new Request(`http://localhost:3014/v14/api/library?libraryId=${libraryId}&changeToken=${'a'.repeat(32)}`));
 assert.equal(response.status,200);assert.equal((await response.json()).unchanged,true);assert.match(response.headers.get('cache-control'),/no-store/);assert.deepEqual(globalThis.__v14RouteMocks.calls,[['revalidate',libraryId,'a'.repeat(32)]]);
});
test('targeted save readbacks are explicit opt-in; arbitrary modes are rejected',async()=>{
 globalThis.__v14RouteMocks.calls=[];
 const c={kind:'setting',libraryId,key:'theme',revision:1,requestId,value:'light',readback:'targeted'};
 assert.equal((await post({...c,readback:'skip'})).status,400);assert.equal((await post(c)).status,200);
 assert.deepEqual(globalThis.__v14RouteMocks.calls,[['setting',libraryId,'theme',1,requestId,'light',true]]);
});

test('activity headers choose the grouped RPC without changing the edit body',async()=>{
 const mocks=globalThis.__v14RouteMocks;mocks.current={...item,revision:2};mocks.snapshot.items=[mocks.current];mocks.calls=[];
 const command={kind:'edit',libraryId,itemId,revision:2,requestId,patch:{notes:'Activity test'}};
 const response=await post(command,{'X-CDL-Activity-ID':requestId,'X-CDL-Activity-Role':'user'});
 assert.equal(response.status,200);
 const rpc=mocks.calls.find(c=>c[1]==='cdl_v14_full_edit_activity');assert.ok(rpc);assert.equal(rpc[2].p_activity_id,requestId);assert.equal(rpc[2].p_activity_role,'user');
 assert.equal((await post(command,{'X-CDL-Activity-ID':'bad','X-CDL-Activity-Role':'user'})).status,400);
 assert.equal((await post({...command,kind:'archive',archived:true},{'X-CDL-Activity-ID':requestId,'X-CDL-Activity-Role':'user'})).status,400);
});
