// Service worker for Chris' Delicious Library PWA.
//
// IMPORTANT: this worker only ever handles SAME-ORIGIN requests. Cross-origin
// requests (cover art from Cloudflare R2, IGDB/TMDB images, Google Sheets
// data) are left completely untouched — the browser loads them natively.
// Cross-origin image responses are "opaque": their status is hidden, so an
// errored cover is indistinguishable from a good one. Caching those caused
// failed covers to be stored and replayed as permanent black images.
//
// Strategy (same-origin only):
//  - Same-origin images (sidebar icons, /api/cover-proxy): cache-first.
//  - Next.js static assets (/_next/static/*): cache-first (content-hashed).
//  - Page navigations: network-first, cached shell as the offline fallback.

const CACHE_VERSION = "v2";
const SHELL_CACHE = `cdl-shell-${CACHE_VERSION}`;
const IMAGE_CACHE = `cdl-images-${CACHE_VERSION}`;
const STATIC_CACHE = `cdl-static-${CACHE_VERSION}`;
const ALLOWED_CACHES = [SHELL_CACHE, IMAGE_CACHE, STATIC_CACHE];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Bumping CACHE_VERSION drops every older cache here, including the v1
      // image cache that may hold black/broken cover entries.
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((key) => !ALLOWED_CACHES.includes(key)).map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isImageRequest(request, url) {
  if (request.destination === "image") return true;
  if (url.pathname.startsWith("/api/sidebar-icon")) return true;
  if (url.pathname.startsWith("/api/cover-proxy")) return true;
  return /\.(png|jpe?g|webp|gif|svg|avif|ico)$/i.test(url.pathname);
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Only ever touch same-origin requests. Anything cross-origin (R2 covers,
  // IGDB/TMDB art, Google Sheets) falls through to native browser handling.
  if (url.origin !== self.location.origin) return;

  // Same-origin images — cache-first. Only real 2xx responses are cached.
  if (isImageRequest(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          return cached || Response.error();
        }
      })()
    );
    return;
  }

  // Next.js static assets — cache-first (content-hashed, immutable).
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response && response.ok) {
          cache.put(request, response.clone());
        }
        return response;
      })()
    );
    return;
  }

  // Page navigations — network-first, cached shell as offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (err) {
          const cached = (await cache.match(request)) || (await cache.match("/"));
          return cached || Response.error();
        }
      })()
    );
  }
});
