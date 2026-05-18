// Service worker for Chris' Delicious Library PWA.
//
// Strategy:
//  - Images (covers, sidebar icons, R2 art): cache-first. This is the local
//    "picture backup" — once an image has loaded it is stored on-device and
//    served from there, so it stays fast and survives going offline.
//  - Next.js static assets (/_next/static/*): cache-first (they are
//    content-hashed and immutable, so a cached copy is always correct).
//  - Page navigations / app shell: network-first, so online users always get
//    the freshest app and only fall back to the cached shell when offline.
//
// Note: library data still comes from Google Sheets, which is not cached here.
// True offline *data* is a separate piece of work.

const CACHE_VERSION = "v1";
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

function isCacheableResponse(response) {
  // status 200 for same-origin; opaque (status 0) for cross-origin <img> loads.
  return Boolean(response) && (response.ok || response.type === "opaque");
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

  // Images — cache-first (the local picture backup).
  if (isImageRequest(request, url)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(IMAGE_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (isCacheableResponse(response)) {
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
  if (url.origin === self.location.origin && url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (isCacheableResponse(response)) {
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
          if (isCacheableResponse(response)) {
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
