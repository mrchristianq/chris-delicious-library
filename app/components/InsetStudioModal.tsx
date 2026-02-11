"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";

type Insets = { top: number; right: number; bottom: number; left: number };
type Overlay = { width: number; height: number; top: number; left: number };
type CoverOffset = { x: number; y: number };
type MediaType = "tv" | "movie" | "book" | "game";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaveToSheet: () => Promise<void> | void;
  saveLabel: string;
  mediaType: MediaType;
  onMediaTypeChange: (mediaType: MediaType) => void;
  previewShelfImage: string;
  platform: string;
  platforms: string[];
  onPlatformChange: (platform: string) => void;
  frameSrc: string;
  sourceWidth: number;
  sourceHeight: number;
  insets: Insets;
  overlay: Overlay;
  coverScale: number;
  coverOffset: CoverOffset;
  sampleCovers: string[];
  overlayEditable: boolean;
  coverTransformEditable: boolean;
  onInsetChange: (edge: keyof Insets, value: number) => void;
  onOverlayChange: (key: keyof Overlay, value: number) => void;
  onCoverScaleChange: (value: number) => void;
  onCoverOffsetChange: (axis: keyof CoverOffset, value: number) => void;
};

type DragMode = "overlay" | "cover" | null;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const MEDIA_OPTIONS: Array<{ value: MediaType; label: string }> = [
  { value: "tv", label: "TV Shows" },
  { value: "movie", label: "Movies" },
  { value: "book", label: "Books" },
  { value: "game", label: "Games" },
];

export function InsetStudioModal({
  open,
  onClose,
  onSaveToSheet,
  saveLabel,
  mediaType,
  onMediaTypeChange,
  previewShelfImage,
  platform,
  platforms,
  onPlatformChange,
  frameSrc,
  sourceWidth,
  sourceHeight,
  insets,
  overlay,
  coverScale,
  coverOffset,
  sampleCovers,
  overlayEditable,
  coverTransformEditable,
  onInsetChange,
  onOverlayChange,
  onCoverScaleChange,
  onCoverOffsetChange,
}: Props) {
  const [selectedCoverIndex, setSelectedCoverIndex] = useState(0);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [dragStartOverlay, setDragStartOverlay] = useState<{ top: number; left: number } | null>(null);
  const [dragStartCover, setDragStartCover] = useState<{ x: number; y: number } | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!sampleCovers.length) {
      setSelectedCoverIndex(0);
      return;
    }
    const next = Math.floor(Math.random() * sampleCovers.length);
    setSelectedCoverIndex(next);
  }, [open, mediaType, platform, sampleCovers]);

  const currentCoverUrl = sampleCovers[selectedCoverIndex] || "";

  const previewHeight = 680;
  const previewWidth = Math.round((sourceWidth / sourceHeight) * previewHeight);

  const insetRect = useMemo(() => {
    const top = (insets.top / sourceHeight) * previewHeight;
    const right = (insets.right / sourceWidth) * previewWidth;
    const bottom = (insets.bottom / sourceHeight) * previewHeight;
    const left = (insets.left / sourceWidth) * previewWidth;
    return {
      top,
      left,
      width: Math.max(10, previewWidth - left - right),
      height: Math.max(10, previewHeight - top - bottom),
    };
  }, [insets, previewHeight, previewWidth, sourceHeight, sourceWidth]);

  const handleNextRandom = () => {
    if (!sampleCovers.length) return;
    const next = Math.floor(Math.random() * sampleCovers.length);
    setSelectedCoverIndex(next);
  };

  const handleSave = async () => {
    setSaveState("saving");
    try {
      await onSaveToSheet();
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  };

  const handleMouseDownOverlay = (event: MouseEvent<HTMLDivElement>) => {
    if (!overlayEditable) return;
    event.preventDefault();
    setDragMode("overlay");
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragStartOverlay({ top: overlay.top, left: overlay.left });
  };

  const handleMouseDownCover = (event: MouseEvent<HTMLDivElement>) => {
    if (!coverTransformEditable) return;
    event.preventDefault();
    setDragMode("cover");
    setDragStart({ x: event.clientX, y: event.clientY });
    setDragStartCover({ x: coverOffset.x, y: coverOffset.y });
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!dragMode || !dragStart) return;

    const dx = event.clientX - dragStart.x;
    const dy = event.clientY - dragStart.y;

    if (dragMode === "overlay" && dragStartOverlay) {
      const dxPct = (dx / previewWidth) * 100;
      const dyPct = (dy / previewHeight) * 100;
      onOverlayChange("left", Number((dragStartOverlay.left + dxPct).toFixed(2)));
      onOverlayChange("top", Number((dragStartOverlay.top + dyPct).toFixed(2)));
      return;
    }

    if (dragMode === "cover" && dragStartCover) {
      const dxPct = (dx / insetRect.width) * 100;
      const dyPct = (dy / insetRect.height) * 100;
      onCoverOffsetChange("x", Number((dragStartCover.x + dxPct).toFixed(2)));
      onCoverOffsetChange("y", Number((dragStartCover.y + dyPct).toFixed(2)));
    }
  };

  const handleMouseUp = () => {
    setDragMode(null);
    setDragStart(null);
    setDragStartOverlay(null);
    setDragStartCover(null);
  };

  if (!open) return null;

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        background: "rgba(8, 7, 6, 0.76)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "min(1400px, 96vw)",
          height: "min(900px, 94vh)",
          background: "linear-gradient(180deg, #f5f0e8 0%, #ece3d7 100%)",
          borderRadius: 16,
          boxShadow: "0 30px 80px rgba(0,0,0,0.45)",
          border: "1px solid rgba(41, 31, 20, 0.25)",
          display: "grid",
          gridTemplateColumns: "1fr 430px",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: "#3f2e1f" }}>Inset Studio</div>
            <button
              onClick={onClose}
              style={{
                border: "1px solid rgba(41,31,20,0.25)",
                background: "#fff",
                borderRadius: 10,
                padding: "8px 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <label style={{ fontSize: 13, fontWeight: 700, color: "#56402f" }}>Media</label>
            <select
              value={mediaType}
              onChange={(e) => onMediaTypeChange(e.target.value as MediaType)}
              style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #b39b85", fontSize: 14, minWidth: 160 }}
            >
              {MEDIA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            {mediaType === "game" ? (
              <>
                <label style={{ fontSize: 13, fontWeight: 700, color: "#56402f" }}>Platform</label>
                <select
                  value={platform}
                  onChange={(e) => onPlatformChange(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #b39b85", fontSize: 14, flex: 1 }}
                >
                  {platforms.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <div style={{ flex: 1 }} />
            )}

            <button
              onClick={handleNextRandom}
              style={{
                border: "1px solid #936f4c",
                background: "#fff",
                color: "#4f3a28",
                borderRadius: 10,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Next Random Cover
            </button>
          </div>

          <div style={{ fontSize: 12, color: "#6f5a48" }}>
            Bookshelf background is shown for alignment. Cover is clipped to inset bounds and cannot bleed past overlay aperture.
          </div>

          <div
            style={{
              flex: 1,
              display: "grid",
              placeItems: "center",
              borderRadius: 12,
              border: "1px solid rgba(0,0,0,0.12)",
              backgroundImage: `url(${previewShelfImage})`,
              backgroundRepeat: "no-repeat",
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: previewWidth,
                height: previewHeight,
                boxShadow: "0 18px 40px rgba(0,0,0,0.35)",
                cursor: dragMode ? "grabbing" : "default",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: `${50 + overlay.top}%`,
                  left: `${50 + overlay.left}%`,
                  width: "100%",
                  height: "100%",
                  transform: `translate(-50%, -50%) scale(${overlay.width / 100}, ${overlay.height / 100})`,
                }}
              >
                <div
                  onMouseDown={handleMouseDownCover}
                  style={{
                    position: "absolute",
                    top: insetRect.top,
                    left: insetRect.left,
                    width: insetRect.width,
                    height: insetRect.height,
                    overflow: "hidden",
                    background: "rgba(255,255,255,0.08)",
                    outline: "2px dashed rgba(255, 230, 120, 0.75)",
                    outlineOffset: -2,
                    cursor: coverTransformEditable ? "grab" : "default",
                  }}
                >
                  {currentCoverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={currentCoverUrl}
                      alt="Preview cover"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        transform: `translate(${coverOffset.x}%, ${coverOffset.y}%) scale(${coverScale / 100})`,
                        transformOrigin: "center",
                        pointerEvents: "none",
                        userSelect: "none",
                      }}
                      draggable={false}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 12, color: "#f2e3ce" }}>
                      No sample cover for this selection
                    </div>
                  )}
                </div>

                <div
                  onMouseDown={handleMouseDownOverlay}
                  style={{
                    position: "absolute",
                    inset: 0,
                    cursor: overlayEditable ? "grab" : "default",
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={frameSrc}
                    alt="Overlay frame"
                    style={{ width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", userSelect: "none" }}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ borderLeft: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.35)", padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#4f3b29" }}>Insets (px in source frame)</div>
          {(["top", "right", "bottom", "left"] as Array<keyof Insets>).map((edge) => (
            <label key={edge} style={{ display: "grid", gridTemplateColumns: "90px 1fr 80px", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 13, textTransform: "capitalize", fontWeight: 700 }}>{edge}</span>
              <input
                type="range"
                min={0}
                max={500}
                step={1}
                value={insets[edge]}
                onChange={(e) => onInsetChange(edge, Number(e.target.value))}
              />
              <input
                type="number"
                value={insets[edge]}
                onChange={(e) => onInsetChange(edge, clamp(Number(e.target.value) || 0, 0, 1000))}
                style={{ padding: "8px", fontSize: 14 }}
              />
            </label>
          ))}

          {overlayEditable ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#4f3b29", marginTop: 8 }}>Overlay Transform (%)</div>
              {([
                ["width", 50, 170],
                ["height", 50, 170],
                ["top", -50, 50],
                ["left", -50, 50],
              ] as Array<[keyof Overlay, number, number]>).map(([key, min, max]) => (
                <label key={key} style={{ display: "grid", gridTemplateColumns: "90px 1fr 80px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, textTransform: "capitalize", fontWeight: 700 }}>{key}</span>
                  <input
                    type="range"
                    min={min}
                    max={max}
                    step={0.1}
                    value={overlay[key]}
                    onChange={(e) => onOverlayChange(key, Number(e.target.value))}
                  />
                  <input
                    type="number"
                    value={overlay[key]}
                    onChange={(e) => onOverlayChange(key, Number(e.target.value) || 0)}
                    style={{ padding: "8px", fontSize: 14 }}
                  />
                </label>
              ))}
            </>
          ) : null}

          {coverTransformEditable ? (
            <>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#4f3b29", marginTop: 8 }}>Cover Crop / Position</div>
              <label style={{ display: "grid", gridTemplateColumns: "90px 1fr 80px", gap: 10, alignItems: "center" }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>Scale</span>
                <input
                  type="range"
                  min={50}
                  max={220}
                  step={1}
                  value={coverScale}
                  onChange={(e) => onCoverScaleChange(Number(e.target.value))}
                />
                <input
                  type="number"
                  value={coverScale}
                  onChange={(e) => onCoverScaleChange(clamp(Number(e.target.value) || 100, 50, 300))}
                  style={{ padding: "8px", fontSize: 14 }}
                />
              </label>

              {(["x", "y"] as Array<keyof CoverOffset>).map((axis) => (
                <label key={axis} style={{ display: "grid", gridTemplateColumns: "90px 1fr 80px", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Offset {axis.toUpperCase()}</span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    step={0.1}
                    value={coverOffset[axis]}
                    onChange={(e) => onCoverOffsetChange(axis, Number(e.target.value))}
                  />
                  <input
                    type="number"
                    value={coverOffset[axis]}
                    onChange={(e) => onCoverOffsetChange(axis, Number(e.target.value) || 0)}
                    style={{ padding: "8px", fontSize: 14 }}
                  />
                </label>
              ))}
            </>
          ) : null}

          <button
            onClick={handleSave}
            disabled={saveState === "saving"}
            style={{
              marginTop: 12,
              border: "none",
              background: saveState === "saving" ? "#5d7ea4" : "#0d63c7",
              color: "#fff",
              borderRadius: 10,
              padding: "12px 14px",
              fontSize: 14,
              fontWeight: 800,
              cursor: saveState === "saving" ? "wait" : "pointer",
            }}
          >
            {saveState === "saving" ? "Saving..." : saveLabel}
          </button>
          <div style={{ minHeight: 18, fontSize: 12, fontWeight: 700, color: saveState === "saved" ? "#1f7a38" : saveState === "error" ? "#b23a2f" : "#7a6a5a" }}>
            {saveState === "saved" ? "Saved successfully" : saveState === "error" ? "Save failed" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}

export default InsetStudioModal;
