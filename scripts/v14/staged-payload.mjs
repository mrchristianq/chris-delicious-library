// SQL dollar-quoted bodies must not pass through JS replacement-string expansion.
export function replacePayload(sql, original, replacement) {
  if (!sql.includes(original)) throw new Error('Payload boundary missing');
  return sql.replace(original, () => replacement);
}
