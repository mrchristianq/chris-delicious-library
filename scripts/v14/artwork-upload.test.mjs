import test from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';

const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(specifier === '../../app/lib/v14/artwork-upload' ? `${specifier}.ts` : specifier, context);
} });
const {
  MAX_ARTWORK_BYTES, MAX_MULTIPART_BYTES, createArtworkObjectKey, createIconObjectKey, isArtworkUuid,
  readLimitedStream, validateArtworkImage, validateArtworkInput,
  validateArtworkPublicBaseUrl, validateArtworkSourceUrl,
} = await import('../../app/lib/v14/artwork-upload.ts');
hooks.deregister();

const libraryId = '11111111-1111-4111-8111-111111111111';
const itemId = '22222222-2222-4222-8222-222222222222';
const uploadId = '33333333-3333-4333-8333-333333333333';

test('accepts JPEG, PNG, and WebP only when MIME and file signature agree', () => {
  assert.deepEqual(validateArtworkImage(3, 'image/jpeg', Uint8Array.from([0xff, 0xd8, 0xff])), { contentType: 'image/jpeg', extension: 'jpg' });
  assert.deepEqual(validateArtworkImage(8, 'image/png', Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), { contentType: 'image/png', extension: 'png' });
  assert.deepEqual(validateArtworkImage(12, 'image/webp', Uint8Array.from([...Buffer.from('RIFF'), 0, 0, 0, 0, ...Buffer.from('WEBP')])), { contentType: 'image/webp', extension: 'webp' });
  assert.throws(() => validateArtworkImage(3, 'image/png', Uint8Array.from([0xff, 0xd8, 0xff])), /valid JPEG, PNG, or WebP/);
  assert.throws(() => validateArtworkImage(3, 'image/svg+xml', Uint8Array.from([1, 2, 3])), /valid JPEG, PNG, or WebP/);
});

test('rejects empty, oversized, and mismatched uploads', () => {
  assert.throws(() => validateArtworkImage(0, 'image/jpeg', new Uint8Array()), /empty/);
  assert.throws(() => validateArtworkImage(MAX_ARTWORK_BYTES + 1, 'image/jpeg', new Uint8Array()), /10 MB/);
  assert.throws(() => validateArtworkImage(4, 'image/jpeg', Uint8Array.from([0xff, 0xd8, 0xff])), /size mismatch/);
});

test('accepts stable UUID identities and constructs isolated immutable v14 keys', () => {
  assert.equal(isArtworkUuid(libraryId), true);
  assert.equal(isArtworkUuid('../v13'), false);
  assert.equal(createArtworkObjectKey(libraryId, itemId, uploadId, 'webp'), `v14/${libraryId}/${itemId}/${uploadId}.webp`);
  assert.throws(() => createArtworkObjectKey(libraryId, itemId, uploadId, 'svg'), /extension/);
  assert.throws(() => createArtworkObjectKey('../v13', itemId, uploadId, 'jpg'), /identity/);
});

test('constructs icon keys only inside the library icons namespace', () => {
  assert.equal(createIconObjectKey(libraryId, uploadId, 'png'), `v14/${libraryId}/icons/${uploadId}.png`);
  assert.throws(() => createIconObjectKey('../v13', uploadId, 'png'), /identity/);
  assert.throws(() => createIconObjectKey(libraryId, uploadId, 'svg'), /extension/);
});

test('allows only exact approved HTTPS artwork hosts and the configured R2 host', () => {
  const r2 = 'https://artwork.example-cdn.com/covers';
  for (const host of [
    'image.tmdb.org', 'images.igdb.com', 'm.media-amazon.com',
    'images-na.ssl-images-amazon.com', 'covers.openlibrary.org',
    'books.google.com', 'books.googleusercontent.com', 'artwork.example-cdn.com',
  ]) {
    assert.equal(new URL(validateArtworkSourceUrl(`https://${host}/image.jpg`, r2)).hostname, host);
  }
  for (const source of [
    'http://image.tmdb.org/image.jpg',
    'https://user:pass@image.tmdb.org/image.jpg',
    'https://image.tmdb.org:444/image.jpg',
    'https://image.tmdb.org/image.jpg#fragment',
    'https://127.0.0.1/image.jpg',
    'https://[::1]/image.jpg',
    'https://sub.artwork.example-cdn.com/image.jpg',
    'https://unlisted.example/image.jpg',
  ]) assert.throws(() => validateArtworkSourceUrl(source, r2));
  assert.throws(() => validateArtworkSourceUrl('https://image.tmdb.org/image.jpg', 'https://127.0.0.1/'), /IP literals/);
  assert.throws(() => validateArtworkPublicBaseUrl('http://artwork.example-cdn.com/'), /HTTPS/);
});

test('requires exactly one upload source', () => {
  assert.equal(validateArtworkInput(true, false), 'file');
  assert.equal(validateArtworkInput(false, true), 'sourceUrl');
  assert.throws(() => validateArtworkInput(true, true), /exactly one/);
  assert.throws(() => validateArtworkInput(false, false), /exactly one/);
});

test('limits streamed source and multipart bodies by bytes actually received', async () => {
  const withinLimit = new ReadableStream({
    start(controller) { controller.enqueue(Uint8Array.from([1, 2])); controller.enqueue(Uint8Array.from([3, 4])); controller.close(); },
  });
  assert.deepEqual(await readLimitedStream(withinLimit, 4), Uint8Array.from([1, 2, 3, 4]));

  const oversizedSource = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_ARTWORK_BYTES + 1)); controller.close(); },
  });
  await assert.rejects(readLimitedStream(oversizedSource, MAX_ARTWORK_BYTES), /exceeds/);

  const oversizedMultipart = new ReadableStream({
    start(controller) { controller.enqueue(new Uint8Array(MAX_MULTIPART_BYTES + 1)); controller.close(); },
  });
  await assert.rejects(readLimitedStream(oversizedMultipart, MAX_MULTIPART_BYTES), /exceeds/);
});
