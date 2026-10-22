// Calendar dates are not UTC instants. Construct them locally so a date such
// as 2026-10-04 stays October 4 in every viewer's time zone.
export function parseGalleryDate(raw: string): Date {
  const value = raw.trim();
  if (!value) return new Date(Number.NaN);
  const calendar = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!calendar) return new Date(value); // Preserve timestamp/legacy-date behavior.
  const [, year, month, day] = calendar.map(Number);
  const parsed = new Date(0);
  parsed.setFullYear(year, month - 1, day);
  parsed.setHours(0, 0, 0, 0);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day
    ? parsed : new Date(Number.NaN);
}

export function formatGalleryDate(raw: string, compact = false): string {
  if (!raw) return "";
  const parsed = parseGalleryDate(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  if (compact) return `${parsed.getMonth() + 1}/${String(parsed.getDate()).padStart(2, "0")}/${parsed.getFullYear()}`;
  return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}
