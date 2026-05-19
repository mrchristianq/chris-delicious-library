"use client";

import { useEffect } from "react";

/**
 * The PWA service worker caused stale/black cover art in the installed dock
 * app (cross-origin cover images can't be cached reliably). It is now
 * disabled: instead of registering a worker, this actively unregisters any
 * worker still installed from a previous version and drops its caches, so the
 * installed PWA behaves exactly like a normal browser tab.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      })
      .catch(() => {});
    if (typeof caches !== "undefined") {
      caches
        .keys()
        .then((keys) => {
          keys.filter((key) => key.startsWith("cdl-")).forEach((key) => caches.delete(key));
        })
        .catch(() => {});
    }
  }, []);
  return null;
}
