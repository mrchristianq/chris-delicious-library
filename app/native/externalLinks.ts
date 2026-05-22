"use client";

import { isNativeRuntime, nativeOpenExternalUrl } from "./bridge";

type PreventableEvent = {
  preventDefault: () => void;
};

export function handleExternalLinkClick(event: PreventableEvent, url: string): void {
  if (!isNativeRuntime()) return;
  event.preventDefault();
  void openExternalUrl(url);
}

export async function openExternalUrl(url: string): Promise<void> {
  const safeUrl = String(url || "").trim();
  if (!safeUrl) return;

  if (isNativeRuntime()) {
    await nativeOpenExternalUrl(safeUrl);
    return;
  }

  if (typeof window !== "undefined") {
    window.open(safeUrl, "_blank", "noopener,noreferrer");
  }
}
