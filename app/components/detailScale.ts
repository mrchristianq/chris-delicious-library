"use client";

import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Returns 1 on every mount — element-level scaling is no longer driven from
 * here. The detail pages now wrap their content in a transform-scaled stage
 * (see useFitToViewportScale) so the entire layout shrinks/grows together to
 * fit the viewport. Kept for backward compatibility with existing call sites
 * that still pass `scale` into `scaledPx`.
 */
export function useDesktopDetailScale(_isMobileLayout: boolean): number {
  return 1;
}

export function scaledPx(value: number, scale: number): number {
  return Math.round(value * scale);
}

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Measures the natural rendered size of the referenced element and returns a
 * scale factor that, when applied via CSS `transform: scale(...)`, makes the
 * element fit inside the viewport. Falls back to 1 on mobile.
 */
export function useFitToViewportScale<T extends HTMLElement>(
  isMobileLayout: boolean,
  options?: { minScale?: number; maxScale?: number; verticalSafeAreaPx?: number; horizontalSafeAreaPx?: number }
): { ref: RefObject<T | null>; scale: number } {
  const minScale = options?.minScale ?? 0.4;
  const maxScale = options?.maxScale ?? 1;
  const safeY = options?.verticalSafeAreaPx ?? 0;
  const safeX = options?.horizontalSafeAreaPx ?? 0;
  const ref = useRef<T | null>(null);
  const [scale, setScale] = useState<number>(1);

  useIsoLayoutEffect(() => {
    if (isMobileLayout || typeof window === "undefined") {
      setScale(1);
      return;
    }
    const recompute = () => {
      const el = ref.current;
      if (!el) return;
      const parent = el.parentElement;
      if (!parent) return;
      // Reset transform to measure natural intrinsic size each pass so the
      // scale doesn't compound on itself.
      const prevTransform = el.style.transform;
      el.style.transform = "none";
      const naturalW = el.scrollWidth;
      const naturalH = el.scrollHeight;
      el.style.transform = prevTransform;
      // Use the parent container's client area as the fit target so the stage
      // accounts for sidebars, headers, and any layout that the parent imposes
      // — falling back to the visual viewport only if the parent is unbounded.
      const parentW = parent.clientWidth || (window.visualViewport?.width || window.innerWidth);
      const parentH = parent.clientHeight || (window.visualViewport?.height || window.innerHeight);
      const availW = Math.max(0, parentW - safeX);
      const availH = Math.max(0, parentH - safeY);
      if (naturalW <= 0 || naturalH <= 0 || availW <= 0 || availH <= 0) return;
      const next = clamp(Math.min(availW / naturalW, availH / naturalH), minScale, maxScale);
      setScale((prev) => (Math.abs(prev - next) < 0.005 ? prev : next));
    };
    recompute();
    const ro = new ResizeObserver(recompute);
    if (ref.current) ro.observe(ref.current);
    if (ref.current?.parentElement) ro.observe(ref.current.parentElement);
    const onWin = () => recompute();
    window.addEventListener("resize", onWin);
    window.visualViewport?.addEventListener("resize", onWin);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
      window.visualViewport?.removeEventListener("resize", onWin);
    };
  }, [isMobileLayout, minScale, maxScale, safeX, safeY]);

  return { ref, scale: isMobileLayout ? 1 : scale };
}
