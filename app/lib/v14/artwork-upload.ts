import { isIP } from "node:net";

export const MAX_ARTWORK_BYTES = 10 * 1024 * 1024;
export const MAX_MULTIPART_BYTES = 11 * 1024 * 1024;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ArtworkImageType = {
  contentType: "image/jpeg" | "image/png" | "image/webp";
  extension: "jpg" | "png" | "webp";
};

export function isArtworkUuid(value: string): boolean {
  return uuidPattern.test(value);
}

export function validateArtworkImage(size: number, declaredType: string, bytes: Uint8Array): ArtworkImageType {
  if (!Number.isSafeInteger(size) || size <= 0) throw new Error("Uploaded file is empty or has an invalid size");
  if (size > MAX_ARTWORK_BYTES) throw new Error("Image exceeds the 10 MB limit");
  if (bytes.byteLength !== size) throw new Error("Uploaded image size mismatch");

  const type = declaredType.trim().toLowerCase();
  const isJpeg = type === "image/jpeg" && bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = type === "image/png" && bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  const isWebp = type === "image/webp" && bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";

  if (isJpeg) return { contentType: "image/jpeg", extension: "jpg" };
  if (isPng) return { contentType: "image/png", extension: "png" };
  if (isWebp) return { contentType: "image/webp", extension: "webp" };
  throw new Error("Upload must be a valid JPEG, PNG, or WebP image");
}

export function validateArtworkInput(hasFile: boolean, hasSourceUrl: boolean): "file" | "sourceUrl" {
  if (hasFile === hasSourceUrl) throw new Error("Provide exactly one image file or source URL");
  return hasFile ? "file" : "sourceUrl";
}

const sourceHosts = new Set([
  "image.tmdb.org",
  "images.igdb.com",
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "covers.openlibrary.org",
  "books.google.com",
  "books.googleusercontent.com",
]);

function parseSafeHttpsUrl(value: string): URL {
  let url: URL;
  try { url = new URL(value); } catch { throw new Error("Invalid artwork source URL"); }
  const hasUserInfo = /^https:\/\/[^/?#]*@/i.test(value);
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  if (url.protocol !== "https:" || hasUserInfo || url.username || url.password || url.port || url.hash || isIP(hostname)) {
    throw new Error("Artwork source must use HTTPS without credentials, nonstandard ports, fragments, or IP literals");
  }
  return url;
}

export function validateArtworkPublicBaseUrl(value: string): string {
  const url = parseSafeHttpsUrl(value);
  if (url.search) throw new Error("Invalid R2 public URL configuration");
  return url.toString();
}

export function validateArtworkSourceUrl(value: string, r2PublicUrl: string): string {
  if (!value || value.length > 2048) throw new Error("Invalid artwork source URL");
  const source = parseSafeHttpsUrl(value);
  const publicBase = new URL(validateArtworkPublicBaseUrl(r2PublicUrl));
  if (!sourceHosts.has(source.hostname) && source.hostname !== publicBase.hostname) {
    throw new Error("Artwork source host is not allowed");
  }
  return source.toString();
}

export async function readLimitedStream(stream: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* preserve the size error */ }
        throw new Error(`Stream exceeds the ${maxBytes}-byte limit`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

export function createArtworkObjectKey(libraryId: string, itemId: string, uploadId: string, extension: string): string {
  if (![libraryId, itemId, uploadId].every(isArtworkUuid)) throw new Error("Invalid artwork identity");
  if (extension !== "jpg" && extension !== "png" && extension !== "webp") throw new Error("Unsupported artwork extension");
  return `v14/${libraryId}/${itemId}/${uploadId}.${extension}`;
}

export function createIconObjectKey(libraryId: string, uploadId: string, extension: string): string {
  if (![libraryId, uploadId].every(isArtworkUuid)) throw new Error("Invalid artwork identity");
  if (extension !== "jpg" && extension !== "png" && extension !== "webp") throw new Error("Unsupported artwork extension");
  return `v14/${libraryId}/icons/${uploadId}.${extension}`;
}
