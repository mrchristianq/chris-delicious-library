import test from 'node:test';
import assert from 'node:assert/strict';
import { projectLegacyRow } from '../../app/lib/v14/legacy-row.ts';

const library = '11111111-1111-4111-8111-111111111111';
const base = { id: '22222222-2222-4222-8222-222222222222', media_type: 'book', title: 'Example', revision: 1, user_status: null, personal_rating: null, completed_on: null, notes: '', metadata: {}, user_fields: {} };

test('book completion stays on its calendar day in the unchanged details date parser', () => {
  const previousTZ=process.env.TZ;
  try {
    for(const zone of ['America/New_York','America/Los_Angeles','UTC','Pacific/Auckland']) {
      process.env.TZ=zone;
      for(const date of ['2026-10-10','2026-03-08','2026-11-01','2024-02-29']) {
        const item={...base,completed_on:date};
        const {row}=projectLegacyRow(item,library);
        // BookDetailsPage uses new Date(raw), then a local Intl formatter.
        const parsed=new Date(row['Completed Date']);
        const rendered=`${parsed.getFullYear()}-${String(parsed.getMonth()+1).padStart(2,'0')}-${String(parsed.getDate()).padStart(2,'0')}`;
        assert.equal(rendered,date,`${zone}: ${date}`);
        assert.equal(item.completed_on,date);
        assert.equal(row.completedDate,row['Completed Date']);
      }
    }
  } finally {if(previousTZ===undefined)delete process.env.TZ;else process.env.TZ=previousTZ;}
});

for (const media_type of ['book', 'movie', 'tv', 'game']) {
  test(`${media_type}: canonical clears and zero beat stale aliases without mutating input`, () => {
    const item = { ...base, media_type, personal_rating: 0, metadata: { Notes: 'stale', MyRating: '5', 'Date Watched': '2020-01-01', CompletdDate: '2020-01-01', R2CoverUrl: 'https://example.com/cover', _import: { secret: true } }, user_fields: { Notes: 'also stale' } };
    const before = structuredClone(item);
    const { row, identity } = projectLegacyRow(item, library);
    assert.equal(row.Notes, ''); assert.equal(row.MyRating, '0');
    assert.equal(row['Date Watched'], ''); assert.equal(row.CompletdDate, '');
    assert.equal(row.R2CoverUrl, item.metadata.R2CoverUrl); assert.equal(row._import, undefined);
    assert.deepEqual(item, before); assert.equal(identity.itemId, item.id);
  });
}
test('TV Pending Release and movie Watched do not overwrite provider Status', () => {
  for (const [media_type, user_status] of [['tv', 'Pending Release'], ['movie', 'Watched']]) {
    const { row } = projectLegacyRow({ ...base, media_type, user_status, metadata: { Status: 'In Production', Watched: 'true' } }, library);
    assert.equal(row.Status, 'In Production'); assert.equal(row.WatchStatus, user_status);
    assert.equal(row.Watched, media_type === 'tv' ? 'false' : 'true');
  }
});
test('notes, dates, external ratings, editions and order are preserved', () => {
  const item = { ...base, media_type: 'game', completed_on: '2024-02-29', notes: 'First\n\nSecond', user_status: 'Abandoned', metadata: { 'IGDB Rating': 85 }, user_fields: { Platform: 'Steam', QueuedOrder: 0, Completed: true } };
  const a = projectLegacyRow(item, library);
  const b = projectLegacyRow({ ...item, id: '33333333-3333-4333-8333-333333333333', user_fields: { Platform: 'Xbox' } }, library);
  assert.notEqual(a.identity.itemId, b.identity.itemId);
  assert.equal(a.row.Platform, 'Steam'); assert.equal(a.row.QueuedOrder, '0');
  assert.equal(a.row['IGDB Rating'], '85'); assert.equal(a.row.Completed, 'false');
  assert.equal(a.row.Notes, item.notes); assert.equal(a.row['Completed Date'], '2024-02-29');
});
test('rejects missing identity and invalid canonical data rather than guessing', () => {
  for (const patch of [{ id: '' }, { revision: 0 }, { completed_on: '2025-02-29' }, { completed_on: '12/01/2025' }, { personal_rating: 6 }]) {
    assert.throws(() => projectLegacyRow({ ...base, ...patch }, library));
  }
  assert.throws(() => projectLegacyRow(base, ''));
});
test('unset movie, TV and game status stays unknown, not explicit false', () => {
  for (const media_type of ['movie','tv','game']) {
    const {row}=projectLegacyRow({...base,media_type,metadata:{Watched:'true',Completed:'true'}},library);
    assert.equal(row[media_type==='game'?'Completed':'Watched'],'');
  }
});

test('imported Date Added spreadsheet serials retain the formatted calendar day', () => {
  for (const serial of [46007, 46007.471881377314, '46007', '46007.471881377314']) {
    const item = { ...base, media_type: 'game', user_fields: { 'Date Added': serial, 'Hours Played': 46007 } };
    const before = structuredClone(item);
    assert.equal(projectLegacyRow(item, library).row['Date Added'], '12/16/2025');
    assert.equal(projectLegacyRow(item, library).row['Hours Played'], '46007');
    assert.deepEqual(item, before);
  }
});

test('Date Added normalization preserves blanks, years, formatted values and explicit overrides', () => {
  for (const value of ['', null, '2026', '2026-10-17', '10/17/2026', 'invalid', 'Infinity', '46007x']) {
    assert.equal(projectLegacyRow({ ...base, user_fields: { 'Date Added': value } }, library).row['Date Added'], value ?? '');
  }
  const item = { ...base, metadata: { 'Date Added': 46007 }, user_fields: { 'Date Added': '' } };
  assert.equal(projectLegacyRow(item, library).row['Date Added'], '');
  assert.equal(projectLegacyRow({ ...item, user_fields: { 'Date Added': '2026-10-17' } }, library).row['Date Added'], '2026-10-17');
});
