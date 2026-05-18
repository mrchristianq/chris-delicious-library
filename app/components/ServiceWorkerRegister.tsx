"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (public/sw.js). Production only — running a
 * service worker against the Turbopack dev server caches constantly-changing
 * dev chunks and causes confusing stale-asset behavior.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failure is non-fatal — the app still works online.
    });
  }, []);
  return null;
}
