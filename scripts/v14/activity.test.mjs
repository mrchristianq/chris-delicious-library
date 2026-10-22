import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { projectActivity } from '../../app/lib/v14/activity.ts';

const libraryId = '11111111-1111-4111-8111-111111111111';
const oldValue = { title: 'Fixture', media_type: 'book', notes: 'before', user_fields: {} };
const newValue = { ...oldValue, notes: 'after' };
globalThis.__activityMocks = { user: { id: 'owner' }, error: null, payload: { changelog: [], events: [] }, calls: [] };
const stubs = {
  config: `export function getV14Config(){return {origin:'http://localhost:3014'}}`,
  server: `export async function createV14Client(){return {auth:{getUser:async()=>({data:{user:globalThis.__activityMocks.user},error:null})},rpc:async(...args)=>{globalThis.__activityMocks.calls.push(args);return {data:globalThis.__activityMocks.payload,error:globalThis.__activityMocks.error}}}}`,
  activity: `export function projectActivity(value){if(!value||!Array.isArray(value.changelog)||!Array.isArray(value.events))throw new Error('Invalid activity response');return []}`,
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    const key = specifier.endsWith('/config') ? 'config' : specifier.endsWith('/server') ? 'server' : specifier.endsWith('/activity') ? 'activity' : null;
    if (key) return { url: `file:///activity-route-${key}.mjs`, shortCircuit: true };
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const key = url.match(/^file:\/\/\/activity-route-(.+)\.mjs$/)?.[1];
    return key && stubs[key] ? { format: 'module', source: stubs[key], shortCircuit: true } : nextLoad(url, context);
  },
});
const { GET } = await import('../../app/v14/api/activity/route.ts');
hooks.deregister();

test('legacy named and shifted array schemas preserve blank header behavior', () => {
  const standard = { source_row: 4, headers: ['Timestamp', 'Source', 'Sheet', 'Title', 'Row', 'Field', 'Old Value', 'New Value', 'User', 'Function'],
    cells: ['2026-01-02', 'old', 'Books', 'Title', '8', 'Notes', 'a', 'b', 'owner', 'save'] };
  const shifted = { source_row: 3, headers: ['Timestamp', 'Source', 'Sheet', 'Row', 'Field', 'Old Value', 'New Value', 'User', 'Function', '', ''],
    cells: ['2026-01-01', 'legacy', 'Books', 'Title', '8', 'Notes', 'a', 'b', 'owner', 'save-one', 'save-two'] };
  const [current, legacy] = projectActivity({ changelog: [shifted, standard], events: [] });
  assert.equal(current.Title, 'Title');
  assert.equal(legacy.Title, 'Title');
  assert.equal(legacy.Row, '8');
  assert.equal(legacy.Field, 'Notes');
  assert.equal(legacy.Function, 'save-one');
  assert.equal(legacy['Old Value'], 'a');
  assert.equal(legacy['New Value'], 'b');
});

test('malformed RPC envelopes fail closed; unknown valid event kinds are ignored', () => {
  assert.throws(() => projectActivity(null), /Invalid activity response/);
  assert.throws(() => projectActivity({ changelog: null, events: [] }), /Invalid activity response/);
  assert.throws(() => projectActivity({ changelog: [], events: null }), /Invalid activity response/);
  assert.throws(() => projectActivity({ changelog: [null], events: [] }), /Invalid activity response/);
  assert.throws(() => projectActivity({ changelog: [], events: [{ entity_kind: 'mystery', changes: {} }] }), /Invalid activity response/);
  assert.deepEqual(projectActivity({ changelog: [], events: [{ entity_kind: 'mystery', created_at: '2026-01-01', changes: {} }] }), []);
  const [row] = projectActivity({ changelog: [], events: [{ entity_kind: 'full_edit', created_at: '2026-01-01', changes: { before: null, after: { title: 'Only new', media_type: 'book' } } }] });
  assert.equal(row.Title, 'Only new');
  assert.equal(row['Old Value'], null);
  assert.equal(row['New Value'], 'Only new');
});

test('audit diff extracts actual before and after values only', () => {
  const [row] = projectActivity({ changelog: [], events: [{ entity_kind: 'full_edit', created_at: '2026-01-01', changes: { before: oldValue, after: newValue } }] });
  assert.equal(row.Field, 'Notes');
  assert.equal(row['Old Value'], 'before');
  assert.equal(row['New Value'], 'after');
});

test('setting values unwrap the v14 wrapper and retain false, zero, and null', () => {
  const rows = projectActivity({ changelog: [], events: [
    { entity_kind: 'setting', created_at: '2026-01-03', changes: { input: { key: 'flag' }, before: { value: { value: false } }, after: { value: { value: 0 } } } },
    { entity_kind: 'setting', created_at: '2026-01-02', changes: { input: { key: 'nullable' }, before: { value: { value: 0 } }, after: { value: { value: null } } } },
  ] });
  assert.equal(rows[0]['Old Value'], 'false');
  assert.equal(rows[0]['New Value'], '0');
  assert.equal(rows[1]['Old Value'], '0');
  assert.equal(rows[1]['New Value'], null);
});

test('route requires local same-origin context, owner auth, exact libraryId query, and uncached RPC', async () => {
  const wrongOrigin = await GET(new Request(`http://localhost:3014/v14/api/activity?libraryId=${libraryId}`, { headers: { origin: 'https://elsewhere.test' } }));
  assert.equal(wrongOrigin.status, 403);
  const extra = await GET(new Request(`http://localhost:3014/v14/api/activity?libraryId=${libraryId}&other=1`));
  assert.equal(extra.status, 400);
  globalThis.__activityMocks.calls.length = 0;
  globalThis.__activityMocks.user = null;
  const anon = await GET(new Request(`http://localhost:3014/v14/api/activity?libraryId=${libraryId}`));
  assert.equal(anon.status, 401);
  assert.equal(globalThis.__activityMocks.calls.length, 0);
  globalThis.__activityMocks.user = { id: 'owner' };
  globalThis.__activityMocks.payload = {};
  const malformed = await GET(new Request(`http://localhost:3014/v14/api/activity?libraryId=${libraryId}`));
  assert.equal(malformed.status, 500);
  assert.deepEqual(await malformed.json(), { error: 'Activity unavailable.' });
  globalThis.__activityMocks.payload = { changelog: [], events: [] };
  const ok = await GET(new Request(`http://localhost:3014/v14/api/activity?libraryId=${libraryId}`, { headers: { 'sec-fetch-site': 'same-origin' } }));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('cache-control'), 'no-store, max-age=0');
  assert.deepEqual(globalThis.__activityMocks.calls[0], ['cdl_v14_activity', { p_library_id: libraryId, p_changelog_limit: 300, p_event_limit: 100 }]);
});

test('projection enforces the combined v13 display bound', () => {
  const changelog = Array.from({ length: 405 }, (_, index) => ({ source_row: index + 2, headers: ['Timestamp', 'Field'], cells: [`2026-${String(index).padStart(3, '0')}`, 'Notes'] }));
  assert.equal(projectActivity({ changelog, events: [] }).length, 400);
});
