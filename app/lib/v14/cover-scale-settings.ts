const groups = ["home", "books", "movies", "tv", "games"] as const;
type Group = typeof groups[number];

/** Fresh database settings, not browser-cache defaults. Preserve zero and the
 * existing 0–200 range; absent per-section values inherit the legacy scale. */
export function freshCoverScales(read: (key: string, fallback: number) => unknown): Record<Group, number> {
  const clamp = (value: unknown, fallback: number) => {
    if (value === "" || value === null || typeof value === "boolean") return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(200, Math.round(number))) : fallback;
  };
  const fallback = clamp(read("rowHeightScalePct", 100), 100);
  return Object.fromEntries(groups.map(group => [group, clamp(read(`rowHeightScalePct:${group}`, fallback), fallback)])) as Record<Group, number>;
}
