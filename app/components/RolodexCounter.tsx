import { useEffect, useMemo, useRef, useState } from "react";

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
  initialDurationMs?: number; // optional longer duration for the first mounted roll
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
  digitTileRadius?: number;   // border radius for digit tiles
  digitHighlightBackground?: string; // highlight overlay background
  digitSplitLineColor?: string; // center seam for split-flap style tiles
  digitNumberTextShadow?: string; // text shadow for digit numbers
  digitNumberFontWeight?: number | string; // font weight for digit numbers
  digitNumberOffsetY?: number; // optical vertical adjustment for digit numbers
  showLabel?: boolean;        // show/hide "Total Media:" label
  labelText?: string;         // custom label text
  minDigits?: number;         // minimum digit count before padding
  animateOnMount?: boolean;   // roll into place when first rendered
  animateChanges?: boolean;   // roll when value changes after mount
  animationTrigger?: string | number | null; // external trigger for a one-off roll
};

export function RolodexCounter({
  value,
  digitHeight = 44,
  digitWidth = 32,
  spacing = 3,
  numberFontSize = 22,
  extraSpins = 4,
  durationMs = 1200,
  initialDurationMs,
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
  digitTileRadius = 7,
  digitHighlightBackground = "linear-gradient(rgba(255,255,255,.5), rgba(255,255,255,0))",
  digitSplitLineColor = "transparent",
  digitNumberTextShadow,
  digitNumberFontWeight = 900,
  digitNumberOffsetY = 0,
  showLabel = true,
  labelText = "Total Media:",
  minDigits = 4,
  animateOnMount = false,
  animateChanges = true,
  animationTrigger = null,
}: RolodexCounterProps) {
  const rootClassName = ["rolodexCounter", className].filter(Boolean).join(" ");
  const formatted = useMemo(() => {
    const v = Math.max(0, Math.floor(value));
    return String(v).padStart(Math.max(1, minDigits), '0');
  }, [minDigits, value]);

  const chars = useMemo(() => formatted.split(""), [formatted]);

  // Build wheels: repeat 0-9 a few times so it can "spin" before landing.
  const repeats = clamp(extraSpins, 1, 6) + 1; // +1 so we always have the final range
  const targetIndexes = useMemo(
    () =>
      chars.map((ch) => {
        if (!/\d/.test(ch)) return -1;

        const digit = Number(ch);
        // Land in the LAST cycle so it always rolls "down" into place.
        // Example: repeats=3 => wheel length 30. final cycle starts at 20.
        const base = (repeats - 1) * 10;
        return base + digit;
      }),
    [chars, repeats]
  );

  // Track if this is the first mount and previous value to control animation
  const isFirstMount = useRef(true);
  const prevValue = useRef(value);
  const prevAnimationTrigger = useRef(animationTrigger);

  // For each digit, we animate the "wheel index" down to target.
  // We store the current index we want to display.
  const [indexes, setIndexes] = useState<number[]>(() => {
    if (!animateOnMount) return targetIndexes;
    return targetIndexes.map((idx) => (idx < 0 ? -1 : idx % 10));
  });
  const [activeDurationMs, setActiveDurationMs] = useState(
    animateOnMount ? initialDurationMs ?? durationMs : durationMs
  );

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
    const triggerChanged = prevAnimationTrigger.current !== animationTrigger;
    prevValue.current = value;
    prevAnimationTrigger.current = animationTrigger;

    // Respect reduced motion (nice touch for accessibility)
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const next = targetIndexes;

    // On first mount, either set to target immediately or roll into place.
    if (isFirstMount.current) {
      isFirstMount.current = false;
      if (animateOnMount && !reduce) {
        const start = next.map((idx) => (idx < 0 ? -1 : idx % 10));
        setActiveDurationMs(initialDurationMs ?? durationMs);
        setIndexes(start);
        const raf = requestAnimationFrame(() => setIndexes(next));
        return () => cancelAnimationFrame(raf);
      }
      setIndexes(next);
      return;
    }

    // If value didn't change and there was no explicit trigger, update indexes without animation.
    if ((!valueChanged && !triggerChanged) || !animateChanges) {
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

    setActiveDurationMs(durationMs);
    setIndexes(start);

    // Kick animation on next frame so the transition triggers reliably.
    const raf = requestAnimationFrame(() => setIndexes(next));
    return () => cancelAnimationFrame(raf);
  }, [animationTrigger, animateChanges, animateOnMount, durationMs, initialDurationMs, targetIndexes, value]);

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
              borderRadius: digitTileRadius,
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
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: "50%",
                height: 1,
                transform: "translateY(-0.5px)",
                background: digitSplitLineColor,
                boxShadow: digitSplitLineColor === "transparent" ? "none" : "0 1px 0 rgba(255,255,255,0.22)",
                pointerEvents: "none",
                zIndex: 2,
              }}
            />
            <div
              style={{
                willChange: "transform",
                transform: `translateY(${translateY}px)`,
                transition: `transform ${activeDurationMs}ms cubic-bezier(.25,.46,.45,.94) ${delayMs}ms`,
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
                    fontWeight: digitNumberFontWeight,
                    fontSize: numberFontSize,
                    lineHeight: 1,
                    letterSpacing: 0.5,
                    textShadow: digitNumberTextShadow || `0 1px 0 ${digitNumberColor}4D`,
                    fontVariantNumeric: "tabular-nums",
                    transform: `translateY(${digitNumberOffsetY}px)`,
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
