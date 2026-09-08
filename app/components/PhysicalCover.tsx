"use client";

import { cloneElement, useState, useSyncExternalStore, type ReactElement, type ImgHTMLAttributes, type SetStateAction } from "react";

export const PHYSICAL_COVER_START_Y = 32;
export const PHYSICAL_COVER_START_X = 2;
export const DETAILS_COVER_START_Y = 8;
const DETAILS_COVER_START_X = 0;
function createCoverPreference(DETAILS_3D_KEY: string) {
const DETAILS_3D_EVENT = `${DETAILS_3D_KEY}-changed`;
let unsavedPreference: boolean | undefined;

function readDetails3D() {
  if (typeof window === "undefined") return false;
  if (unsavedPreference !== undefined) return unsavedPreference;
  try { return window.localStorage.getItem(DETAILS_3D_KEY) === "true"; }
  catch { return false; }
}

function subscribeDetails3D(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === DETAILS_3D_KEY || event.key === null) listener();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(DETAILS_3D_EVENT, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(DETAILS_3D_EVENT, listener);
  };
}

function setDetails3D(update: SetStateAction<boolean>) {
  const next = typeof update === "function" ? update(readDetails3D()) : update;
  try {
    window.localStorage.setItem(DETAILS_3D_KEY, String(next));
    unsavedPreference = undefined;
  } catch {
    // Keep the toggle usable if browser storage is disabled.
    unsavedPreference = next;
  }
  window.dispatchEvent(new Event(DETAILS_3D_EVENT));
}

return function useCoverPreference() {
  const enabled = useSyncExternalStore(subscribeDetails3D, readDetails3D, () => false);
  return [enabled, setDetails3D] as const;
};
}

export const useDetailsCover3D = createCoverPreference("cdl:details-cover-3d");
export const useShelfCover3D = createCoverPreference("cdl:shelf-cover-3d");

export function PhysicalCoverPlanes({ coverUrl, isMobileLayout, depthScale = 1 }: { coverUrl: string; isMobileLayout: boolean; depthScale?: number }) {
  const caseDepth = (isMobileLayout ? 24 : 36) * depthScale;
  const coverCornerRadius = 2;
  const caseArtwork = `url(${JSON.stringify(coverUrl)})`;
  return <>                {/* Separate planes meet at the artwork edges and extend backward.
                    Do not put opacity/filter/overflow on their preserve-3d parent. */}
                <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: coverCornerRadius, background: "#151719", transform: `translateZ(-${caseDepth}px)`, boxShadow: "0 14px 22px rgba(0,0,0,0.45)", pointerEvents: "none" }} />
                {(["left", "right"] as const).map((side) => (
                  <div key={side} aria-hidden data-case-face={side} style={{
                    position: "absolute", top: 0, left: side === "left" ? 0 : "100%",
                    width: caseDepth, height: "100%", transformOrigin: "left center",
                    transform: side === "left" ? "rotateY(-90deg) translateX(-100%)" : "rotateY(90deg)",
                    background: "#151719", overflow: "hidden",
                    // Crisp rails on all four sides of the spine, brightest on top.
                    boxShadow: "inset 0 2px 0 rgba(255,255,255,0.72), inset 0 -2px 0 rgba(0,0,0,0.8), inset 3px 0 0 rgba(12,16,20,0.9), inset -3px 0 0 rgba(150,165,180,0.5)",
                    backfaceVisibility: "hidden", pointerEvents: "none",
                  }}>
                    {/* Stretch only the outermost edge into a color wash. Blur this
                        flat child, never the parent holding the 3D planes. */}
                    <div style={{ position: "absolute", inset: "-32px 0", backgroundImage: caseArtwork,
                      backgroundSize: "10000% 100%", backgroundPosition: `${side} center`,
                      filter: "blur(24px)", transform: "scaleX(4)", pointerEvents: "none" }} />
                    <div style={{ position: "absolute", inset: 0,
                      background: "linear-gradient(90deg, rgba(0,0,0,0.72), rgba(0,0,0,0.18) 76%, rgba(255,255,255,0.16))",
                      boxShadow: "inset 0 2px 0 rgba(255,255,255,0.72), inset 0 -2px 0 rgba(0,0,0,0.8), inset 3px 0 0 rgba(12,16,20,0.9), inset -3px 0 0 rgba(150,165,180,0.5)" }} />
                    <div style={{ position: "absolute", top: 0, bottom: 0,
                      left: side === "left" ? 0 : undefined, right: side === "right" ? 0 : undefined,
                      width: 1, pointerEvents: "none",
                      background: "linear-gradient(to bottom, rgba(235,243,250,0.8), rgba(160,180,198,0.55) 25%, rgba(135,155,175,0.35) 85%, rgba(135,155,175,0.2))" }} />
                  </div>
                ))}
                {(["top", "bottom"] as const).map((edge) => (
                  <div key={edge} aria-hidden data-case-face={edge} style={{
                    position: "absolute", left: 0, top: edge === "top" ? 0 : "100%",
                    width: "100%", height: caseDepth, transformOrigin: "center top",
                    transform: edge === "top" ? "rotateX(90deg) translateY(-100%)" : "rotateX(-90deg)",
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(255,255,255,0.12)), ${caseArtwork}`,
                    backgroundSize: "100% 100%, 100% auto", backgroundPosition: `center, center ${edge}`,
                    backfaceVisibility: "hidden", pointerEvents: "none",
                  }} />
                ))}</>;
}

export function PhysicalCoverFrame() {
  const coverCornerRadius = 2;
  return (              <div aria-hidden style={{
                position: "absolute", inset: 0, borderRadius: coverCornerRadius, pointerEvents: "none",
                transform: "translateZ(0.2px)",
                // A narrow top-rail reflection, not a broad vertical bevel over the art.
                background: "linear-gradient(90deg, rgba(255,255,255,0.18), rgba(255,255,255,0.95) 45%, rgba(255,255,255,0.8) 65%, rgba(255,255,255,0.2))",
                backgroundSize: "100% 2px",
                backgroundRepeat: "no-repeat",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), inset 1px 0 0 rgba(140,155,170,0.4), inset -1px 0 0 rgba(140,155,170,0.4), inset 0 -1px 0 rgba(0,0,0,0.75)",
              }} />);
}

export function Cover3DToggle({ active, onToggle }: { active: boolean; onToggle: () => void }) {
  return <button type="button" aria-label="3D cover" aria-pressed={active} onClick={onToggle}
    style={{ height: 32, minWidth: 38, flexShrink: 0, borderRadius: 999, padding: "0 9px",
      border: active ? "1px solid rgba(180,210,255,0.9)" : "1px solid rgba(255,255,255,0.28)",
      background: active ? "rgba(70,110,170,0.85)" : "rgba(0,0,0,0.45)",
      color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 650 }}>3D</button>;
}

export function DetailsCover3D({ enabled, coverUrl, isMobileLayout, children }: {
  enabled: boolean; coverUrl: string; isMobileLayout: boolean;
  children: ReactElement<ImgHTMLAttributes<HTMLImageElement>>;
}) {
  const [tilt, setTilt] = useState({ x: DETAILS_COVER_START_X, y: DETAILS_COVER_START_Y });
  const [hovering, setHovering] = useState(false);
  if (!enabled) return children;
  return <span style={{ display: "inline-block", maxWidth: "100%", verticalAlign: "bottom", lineHeight: 0 }}
    onMouseMove={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      setHovering(true);
      setTilt({
        y: DETAILS_COVER_START_Y + Math.max(-3, Math.min(3, ((event.clientX - rect.left) / rect.width - 0.5) * 6)),
        x: DETAILS_COVER_START_X + Math.max(-2, Math.min(2, -((event.clientY - rect.top) / rect.height - 0.5) * 4)),
      });
    }}
    onMouseLeave={() => { setHovering(false); setTilt({ x: DETAILS_COVER_START_X, y: DETAILS_COVER_START_Y }); }}>
    <span style={{ display: "inline-block", position: "relative", maxWidth: "100%", transformStyle: "preserve-3d",
      transform: `perspective(1400px) rotateY(${tilt.y}deg) rotateX(${tilt.x}deg)`, transition: "transform 70ms ease" }}>
      <PhysicalCoverPlanes coverUrl={coverUrl} isMobileLayout={isMobileLayout} />
      {cloneElement(children, { style: { ...children.props.style, position: "relative", display: "block",
        borderRadius: 2, border: "none", filter: "none", boxShadow: "0 2px 4px rgba(0,0,0,0.3)" } })}
      <PhysicalCoverFrame />
      <span aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 2, pointerEvents: "none",
        opacity: hovering ? 1 : 0, transition: "opacity 140ms ease",
        background: "linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.02) 63%, rgba(0,0,0,0.06))" }} />
    </span>
  </span>;
}
