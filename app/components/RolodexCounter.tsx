import React, { useEffect, useMemo, useRef, useState } from "react";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function getBackgroundLayerStyle(backgroundValue: string) {
  const trimmed = backgroundValue.trim();
  if (!trimmed) {
    return { backgroundImage: "none", backgroundColor: "transparent" };
  }

  const usesImageLayer =
    trimmed.includes("gradient(") ||
    trimmed.includes("url(") ||
    trimmed.includes("image-set(");

  return usesImageLayer
    ? { backgroundImage: trimmed, backgroundColor: "transparent" }
    : { backgroundImage: "none", backgroundColor: trimmed };
}

type RolodexCounterProps = {
  value: number;              // total items
  digitHeight?: number;       // px height of each digit row
  digitWidth?: number;        // px width of each digit
  spacing?: number;           // gap between tiles
  numberFontSize?: number;    // font size for numbers inside tiles
  extraSpins?: number;        // how many full 0-9 cycles before landing (e.g., 1-3)
  durationMs?: number;        // animation duration
  showCommas?: boolean;       // 5,620 style
  className?: string;
  labelFontSize?: number;     // font size for "Total:" label
  labelFontWeight?: string;   // font weight for "Total:" label
  labelTop?: number;          // top offset for label
  labelLeft?: number;         // left offset for label
  counterTop?: number;        // top offset for counter
  counterLeft?: number;       // left offset for counter
  labelColor?: string;        // color for the "Total Media:" label
  commaColor?: string;        // color for comma separators
  digitNumberColor?: string;  // color for the digit numbers
  digitTileBackground?: string; // background gradient for digit tiles
  digitTileBorder?: string;   // border color for digit tiles
  digitTileShadow?: string;   // box shadow for digit tiles
  digitHighlightBackground?: string; // highlight overlay background
  digitNumberTextShadow?: string; // text shadow for digit numbers
  showLabel?: boolean;        // show/hide "Total Media:" label
  labelText?: string;         // custom label text
};

export function RolodexCounter({
  value,
  digitHeight = 44,
  digitWidth = 32,
  spacing = 3,
  numberFontSize = 22,
  extraSpins = 4,
  durationMs = 1200,
  showCommas = false,
  className = "",
  labelFontSize = 16,
  labelFontWeight = "600",
  labelTop = 0,
  labelLeft = 0,
  counterTop = 0,
  counterLeft = 0,
  labelColor = "#8a4c4c",
  commaColor = "#8a4c4c",
  digitNumberColor = "#8a4c4c",
  digitTileBackground = "linear-gradient(180deg, #f5f0e8 0%, #ebe4d8 100%)",
  digitTileBorder = "rgba(139,69,19,.15)",
  digitTileShadow = "0 2px 4px rgba(0,0,0,.15), inset 0 1px 1px rgba(255,255,255,.8)",
  digitHighlightBackground = "linear-gradient(rgba(255,255,255,.5), rgba(255,255,255,0))",
  digitNumberTextShadow,
  showLabel = true,
  labelText = "Total Media:",
}: RolodexCounterProps) {
  const rootClassName = ["rolodexCounter", className].filter(Boolean).join(" ");
  const formatted = useMemo(() => {
    const v = Math.max(0, Math.floor(value));
    // Always pad to 4 digits
    return String(v).padStart(4, '0');
  }, [value]);

  const chars = useMemo(() => formatted.split(""), [formatted]);

  // Track if this is the first mount and previous value to control animation
  const isFirstMount = useRef(true);
  const prevValue = useRef(value);

  // For each digit, we animate the "wheel index" down to target.
  // We store the current index we want to display.
  const [indexes, setIndexes] = useState<number[]>(() =>
    chars.map((ch) => (/\d/.test(ch) ? 0 : -1))
  );

  // Count digits for staggered animation (excluding commas)
  const digitCount = useMemo(() => chars.filter(ch => /\d/.test(ch)).length, [chars]);

  // Build wheels: repeat 0-9 a few times so it can "spin" before landing.
  const repeats = clamp(extraSpins, 1, 6) + 1; // +1 so we always have the final range
  const wheelDigits = useMemo(() => {
    const arr: number[] = [];
    for (let r = 0; r < repeats; r++) {
      for (let d = 0; d <= 9; d++) arr.push(d);
    }
    return arr;
  }, [repeats]);

  useEffect(() => {
    // Only animate when the value actually changes, not when size/styling props change
    const valueChanged = prevValue.current !== value;
    prevValue.current = value;

    // Respect reduced motion (nice touch for accessibility)
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Create target indexes.
    const next = chars.map((ch) => {
      if (!/\d/.test(ch)) return -1;

      const digit = Number(ch);
      // Land in the LAST cycle so it always rolls "down" into place.
      // Example: repeats=3 => wheel length 30. final cycle starts at 20.
      const base = (repeats - 1) * 10;
      return base + digit;
    });

    // On first mount, set to target immediately without animation
    if (isFirstMount.current) {
      isFirstMount.current = false;
      setIndexes(next);
      return;
    }

    // If value didn't change (only styling props changed), update indexes without animation
    if (!valueChanged) {
      setIndexes(next);
      return;
    }

    if (reduce) {
      setIndexes(next);
      return;
    }

    // Start slightly ABOVE the target (so it rolls down).
    // Add a tiny random offset so each digit feels a bit more "mechanical".
    const start = next.map((idx) => {
      if (idx < 0) return -1;
      const jitter = Math.random() < 0.5 ? 1 : 2; // your "+1 or +2" idea
      return idx - jitter;
    });

    setIndexes(start);

    // Kick animation on next frame so the transition triggers reliably.
    const raf = requestAnimationFrame(() => setIndexes(next));
    return () => cancelAnimationFrame(raf);
  }, [chars, repeats, value]);

  return (
    <div
      className={rootClassName}
      style={{
        display: "inline-flex",
        gap: spacing,
        alignItems: "center",
      }}
    >
      {/* Total Label */}
      {showLabel ? (
        <div
          className="rolodexCounterLabel"
          style={{
            fontSize: labelFontSize,
            fontWeight: labelFontWeight,
            color: labelColor,
            marginRight: 4,
            transform: `translate(${labelLeft}px, ${labelTop}px)`,
          }}
        >
          {labelText}
        </div>
      ) : null}
      
      {/* Counter digits container */}
      <div
        className="rolodexCounterDigits"
        style={{
          display: "inline-flex",
          gap: spacing,
          alignItems: "center",
          transform: `translate(${counterLeft}px, ${counterTop}px)`,
        }}
      >
      {chars.map((ch, i) => {
        // Track which digit number this is (for stagger timing)
        const digitIndex = chars.slice(0, i).filter(c => /\d/.test(c)).length;
        
        if (!/\d/.test(ch)) {
          // comma separator
          return (
            <div
              key={`sep-${i}`}
              className="rolodexCounterComma"
              style={{
                color: commaColor,
                fontWeight: 800,
                fontSize: numberFontSize,
                lineHeight: `${digitHeight}px`,
                margin: "0 1px",
                transform: "translateY(2px)",
              }}
            >
              {ch}
            </div>
          );
        }

        const idx = indexes[i] ?? 0;
        const translateY = -idx * digitHeight;
        
        // Stagger delay: leftmost digit (index 0) lands first, rightmost last
        // Delay increases from left to right
        const delayMs = digitIndex * 150;

        return (
          <div
            key={`digit-${i}`}
            className="rolodexCounterTile"
            style={{
              width: digitWidth,
              height: digitHeight,
              overflow: "hidden",
              borderRadius: 7,
              ...getBackgroundLayerStyle(digitTileBackground),
              boxShadow: digitTileShadow,
              border: `1px solid ${digitTileBorder}`,
              boxSizing: "border-box",
              backgroundClip: "padding-box",
              WebkitBackfaceVisibility: "hidden",
              backfaceVisibility: "hidden",
              position: "relative",
            }}
          >
            {/* subtle highlight at top like a "glass" */}
            <div
              className="rolodexCounterTileHighlight"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: "40%",
                background: digitHighlightBackground,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                willChange: "transform",
                transform: `translateY(${translateY}px)`,
                transition: `transform ${durationMs}ms cubic-bezier(.25,.46,.45,.94) ${delayMs}ms`,
              }}
            >
              {wheelDigits.map((d, j) => (
                <div
                  key={j}
                  className="rolodexCounterDigitNumber"
                  style={{
                    height: digitHeight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: digitNumberColor,
                    fontWeight: 900,
                    fontSize: numberFontSize,
                    letterSpacing: 0.5,
                    textShadow: digitNumberTextShadow || `0 1px 0 ${digitNumberColor}4D`,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
