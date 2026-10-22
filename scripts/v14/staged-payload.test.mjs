import { test } from 'node:test';
import assert from 'node:assert/strict';
import { replacePayload } from './staged-payload.mjs';

test('staged SQL preserves dollar-quoted verification and transaction boundaries', () => {
  const replacement = "do $$ begin raise notice '$&'; end $$;\nselect 'staged';";
  assert.equal(replacePayload('begin; PAYLOAD rollback;', 'PAYLOAD', replacement), `begin; ${replacement} rollback;`);
  assert.throws(() => replacePayload('begin; rollback;', 'PAYLOAD', replacement), /boundary/);
});
