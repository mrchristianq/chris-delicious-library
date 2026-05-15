"use client";

import { useEffect, useState } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getScaleFromViewport(): number {
  if (typeof window === "undefined") return 1;
  const width = window.visualViewport?.width || window.innerWidth || 1280;
  const height = window.visualViewport?.height || window.innerHeight || 820;
  const widthScale = width / 1280;
  const heightScale = height / 820;
  return clamp(Math.min(widthScale, heightScale * 1.08), 0.78, 1.22);
}

export function useDesktopDetailScale(isMobileLayout: boolean): number {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isMobileLayout || typeof window === "undefined") {
      setScale(1);
      return;
    }

    const update = () => setScale(getScaleFromViewport());
    update();
    window.addEventListener("resize", update);
    window.visualViewport?.addEventListener("resize", update);
    return () => {
      window.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("resize", update);
    };
  }, [isMobileLayout]);

  return isMobileLayout ? 1 : scale;
}

export function scaledPx(value: number, scale: number): number {
  return Math.round(value * scale);
}
