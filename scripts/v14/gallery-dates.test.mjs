import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { formatGalleryDate, parseGalleryDate } from '../../app/lib/gallery-dates.ts';

for (const zone of ['America/New_York', 'America/Los_Angeles', 'UTC', 'Pacific/Auckland']) {
  test(`Gallery calendar dates do not shift in ${zone}`, () => {
    const moduleUrl = new URL('../../app/lib/gallery-dates.ts', import.meta.url).href;
    const result = execFileSync(process.execPath, ['--input-type=module', '-e', `
      import {formatGalleryDate,parseGalleryDate} from ${JSON.stringify(moduleUrl)};
      console.log(JSON.stringify(['2026-10-04','2026-01-01','2026-03-08','2026-11-01','2024-02-29'].map(value => {
        const date=parseGalleryDate(value);
        return [formatGalleryDate(value),formatGalleryDate(value,true),date.getFullYear(),date.getMonth()+1,date.getDate()];
      })));
    `], {env:{...process.env,TZ:zone},encoding:'utf8'});
    assert.deepEqual(JSON.parse(result), [
      ['October 4, 2026','10/04/2026',2026,10,4],
      ['January 1, 2026','1/01/2026',2026,1,1],
      ['March 8, 2026','3/08/2026',2026,3,8],
      ['November 1, 2026','11/01/2026',2026,11,1],
      ['February 29, 2024','2/29/2024',2024,2,29],
    ]);
  });
}
test('missing and invalid dates do not roll into a different calendar date',()=>{
  for(const raw of ['', '  ', 'bad', '2026-02-30', '2026-13-01']) assert.ok(Number.isNaN(parseGalleryDate(raw).getTime()));
  assert.equal(formatGalleryDate(''), '');
  assert.equal(formatGalleryDate('2026-02-30'), '2026-02-30');
});
test('timestamps remain instants and legacy date formats remain supported',()=>{
  const value='2026-10-04T12:30:00Z';
  assert.equal(parseGalleryDate(value).getTime(),Date.parse(value));
  assert.equal(formatGalleryDate('10/04/2026',true),'10/04/2026');
  assert.equal(formatGalleryDate(' 2026-10-04 ',true),'10/04/2026');
});
