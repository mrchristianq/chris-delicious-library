import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedRequest, csv, fixtureFeeds, verifyReferenceRuntime, referenceRuntimeArguments } from './reference-server.mjs';
test('production reference has no development reload channel and stays loopback-only', () => {
  assert.deepEqual(referenceRuntimeArguments(true,'build'),['build','--webpack']);
  assert.deepEqual(referenceRuntimeArguments(true),['start','-H','127.0.0.1','-p','3012']);
  assert.deepEqual(referenceRuntimeArguments(false),['dev','--webpack','-H','127.0.0.1','-p','3012']);
});
test('reference runtime cannot silently follow upgraded v14 dependencies', () => {
  const versions={next:'16.1.4',react:'19.2.3','react-dom':'19.2.3'};
  assert.deepEqual(verifyReferenceRuntime({dependencies:versions},versions),versions);
  for(const name of Object.keys(versions)) {
    assert.throws(()=>verifyReferenceRuntime({dependencies:versions},{...versions,[name]:'changed'}),/Reference runtime mismatch/);
    const missing={...versions};delete missing[name];
    assert.throws(()=>verifyReferenceRuntime({dependencies:versions},missing),/Reference runtime mismatch/);
  }
});
test('CSV preserves quoted commas, newlines, blanks, zero and false', () => {
  assert.equal(csv([['Title', 'Notes'], ['A,"B"', 'line1\nline2'], [0, false], [null, '']]), '"Title","Notes"\r\n"A,""B""","line1\nline2"\r\n"0","false"\r\n"",""');
});
test('incomplete or unstable fixture fails closed', () => {
  assert.throws(() => fixtureFeeds({ tabs: [] }), /Unverified/);
  assert.throws(() => fixtureFeeds({ tabs: [{ name: 'Books', unchanged: false }] }), /Unverified/);
});
test('only renderer and asset reads pass; API and mutations blocked', () => {
  assert.equal(allowedRequest('GET', '/'), true);
  assert.equal(allowedRequest('GET', '/_next/static/chunks/app.js'), true);
  assert.equal(allowedRequest('GET', '/shelf2.png'), true);
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) assert.equal(allowedRequest(method, '/'), false);
  for (const path of ['/api/sheets-write', '/api/tv-episodes', '/__blocked', '/sw.js']) assert.equal(allowedRequest('GET', path), false);
});
