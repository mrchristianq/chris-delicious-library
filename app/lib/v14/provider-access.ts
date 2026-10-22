import { isIP } from "node:net";
import { getV14Config } from "./config";
import { createV14Client } from "./server";

export const MAX_PROVIDER_REQUEST_BYTES = 1024 * 1024;
export const MAX_PROVIDER_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_SIDEBAR_ICON_BYTES = 2 * 1024 * 1024;
const IMAGE_HOSTS = new Set([
  "image.tmdb.org",
  "images.igdb.com",
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "covers.openlibrary.org",
  "books.google.com",
  "books.googleusercontent.com",
]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export class ProviderAccessError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function requireV14ProviderUser() {
  let config: ReturnType<typeof getV14Config>;
  try {
    config = getV14Config();
  } catch {
    throw new ProviderAccessError(503, "Provider bridge unavailable.");
  }
  try {
    const client = await createV14Client();
    const { data, error } = await client.auth.getUser();
    if (error || !data.user) throw new Error("No authenticated user");
    return config;
  } catch {
    throw new ProviderAccessError(401, "Authentication required.");
  }
}

export async function readLimitedBody(request: Request, maxBytes = MAX_PROVIDER_REQUEST_BYTES): Promise<Uint8Array> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared)) throw new ProviderAccessError(400, "Invalid request size.");
    if (Number(declared) > maxBytes) throw new ProviderAccessError(413, "Provider request exceeds the 1 MB limit.");
  }
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        try { await reader.cancel(); } catch { /* preserve the size error */ }
        throw new ProviderAccessError(413, "Provider request exceeds the 1 MB limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

function parsePublicBase(value: string | undefined): URL | null {
  if (!value) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash || isIP(url.hostname)) return null;
  return url;
}

export function validateProviderImageUrl(value: string, r2PublicUrl = process.env.R2_PUBLIC_URL): URL | null {
  if (!value || value.length > 2048) return null;
  let url: URL;
  try { url = new URL(value); } catch { return null; }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash || isIP(url.hostname)) return null;
  if (IMAGE_HOSTS.has(url.hostname)) return url;
  const base = parsePublicBase(r2PublicUrl);
  if (!base || url.origin !== base.origin) return null;
  const prefix = base.pathname.replace(/\/+$/, "");
  if (prefix && url.pathname !== prefix && !url.pathname.startsWith(`${prefix}/`)) return null;
  return url;
}

async function readImageResponse(response: Response, maxBytes: number): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  if (!response.ok || !response.body) return null;
  const declared = response.headers.get("content-length");
  if (declared !== null) {
    if (!/^\d+$/.test(declared) || Number(declared) > maxBytes) return null;
  }
  const contentType = (response.headers.get("content-type") ?? "").split(";", 1)[0].trim().toLowerCase();
  if (!IMAGE_TYPES.has(contentType)) return null;
  try {
    const bytes = await readLimitedBody({ headers: response.headers, body: response.body } as Request, maxBytes);
    return bytes.length ? { bytes, contentType } : null;
  } catch {
    return null;
  }
}

function imageResponse(bytes: Uint8Array, contentType: string, status = 200) {
  return new Response(new Uint8Array(bytes).buffer, {
    status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status, headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function proxyProviderImage(
  source: string,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const url = validateProviderImageUrl(source);
  if (!url) return errorResponse("Image source is not allowed.", 400);
  try {
    const upstream = await fetcher(url, { cache: "no-store", redirect: "error", headers: { Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif" } });
    const image = await readImageResponse(upstream, MAX_PROVIDER_IMAGE_BYTES);
    return image ? imageResponse(image.bytes, image.contentType) : errorResponse("Image source response is invalid or exceeds 10 MB.", 502);
  } catch {
    return errorResponse("Image source could not be fetched safely.", 502);
  }
}

function sanitizeIconKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

function safeLocalFallback(value: string, origin: string): URL | null {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\") || /[\u0000-\u001f]/.test(value)) return null;
  let url: URL;
  try { url = new URL(value, origin); } catch { return null; }
  // Fallbacks are public image assets, never API routes or another proxy hop.
  if (url.origin !== origin || url.pathname.startsWith("/api/") || url.pathname.startsWith("/v14/") || !/\.(png|jpe?g|webp|gif|avif)$/i.test(url.pathname)) return null;
  return url;
}

async function fetchLocalFallback(value: string, origin: string, fetcher: typeof fetch) {
  const url = safeLocalFallback(value, origin);
  if (!url) return null;
  try {
    const response = await fetcher(url, { cache: "no-store", redirect: "error" });
    return await readImageResponse(response, MAX_SIDEBAR_ICON_BYTES);
  } catch {
    return null;
  }
}

export async function proxySidebarIcon(
  requestUrl: string,
  params: { iconKey: string; fallback: string; version: string },
  r2PublicUrl = process.env.R2_PUBLIC_URL,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  const request = new URL(requestUrl);
  const base = parsePublicBase(r2PublicUrl);
  const iconKey = sanitizeIconKey(params.iconKey);
  if (base && iconKey) {
    const iconUrl = new URL(`${base.pathname.replace(/\/+$/, "")}/icons/sidebar/${encodeURIComponent(iconKey)}`, base.origin);
    if (params.version && params.version !== "0" && /^[a-zA-Z0-9._-]{1,64}$/.test(params.version)) {
      iconUrl.searchParams.set("v", params.version);
    }
    try {
      const upstream = await fetcher(iconUrl, { cache: "no-store", redirect: "error", headers: { Accept: "image/png,image/webp,image/jpeg,image/avif" } });
      const image = await readImageResponse(upstream, MAX_SIDEBAR_ICON_BYTES);
      if (image) return imageResponse(image.bytes, image.contentType);
    } catch { /* use only a validated local fallback */ }
  }
  const fallback = await fetchLocalFallback(params.fallback, request.origin, fetcher);
  return fallback ? imageResponse(fallback.bytes, fallback.contentType) : errorResponse("Sidebar icon is unavailable.", 404);
}

export function noStoreResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.delete("Access-Control-Allow-Origin");
  headers.delete("Access-Control-Allow-Credentials");
  if (response.status === 204 || response.status === 304) return new Response(null, { status: response.status, headers });
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
