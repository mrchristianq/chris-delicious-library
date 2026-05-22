"use client";

import { isNativeRuntime } from "../native/bridge";

const DEFAULT_WEB_APP_ORIGIN = "https://chris-delicious-library.vercel.app";

function getWebAppOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_WEB_APP_ORIGIN || process.env.NEXT_PUBLIC_WEB_APP_URL || "";
  return configured.replace(/\/+$/, "") || DEFAULT_WEB_APP_ORIGIN;
}

export function getMediaSearchUrl(params: URLSearchParams | string): string {
  const query = typeof params === "string" ? params.replace(/^\?/, "") : params.toString();
  const path = `/api/media-search${query ? `?${query}` : ""}`;

  if (isNativeRuntime()) {
    return `${getWebAppOrigin()}${path}`;
  }

  return path;
}

export function fetchMediaSearch(params: URLSearchParams | string, init?: RequestInit): Promise<Response> {
  return fetch(getMediaSearchUrl(params), {
    cache: "no-store",
    ...init,
  });
}
