/** Compare against what the EXISTING form displayed on opening, not raw
 * provider metadata. Parsers may normalize genres, dates and display aliases.
 * v13 and new-item forms retain their existing complete payloads. Identity and
 * revision checking remain the backend's responsibility. */
export function editorDelta(
  item: Record<string, unknown>,
  values: Record<string, string>,
  initial: Record<string, string>,
): Record<string, string> {
  if (!item.__cdlIdentity || typeof item.__cdlIdentity !== "object") return values;
  return Object.fromEntries(Object.entries(values).filter(([key, value]) => value !== initial[key]));
}
