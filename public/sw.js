// Service worker DISABLED.
//
// A caching service worker caused stale/black cover art in the installed PWA
// (large cross-origin cover images can't be cached reliably). This stub
// replaces the old worker: when an out-of-date PWA fetches it, it clears all
// caches and unregisters itself, so the app falls back to plain browser
// behavior. The app no longer registers a service worker at all.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
    })()
  );
});
