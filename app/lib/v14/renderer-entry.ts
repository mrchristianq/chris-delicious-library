const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Do not pick a library by array position when an account owns several. */
export function rendererIdentity(ownerId: string, libraries: unknown) {
  if (!uuid.test(ownerId) || !Array.isArray(libraries) || libraries.length !== 1) return null;
  const library = libraries[0];
  if (!library || typeof library.id !== "string" || !uuid.test(library.id)) return null;
  return { ownerId, libraryId: library.id, key: `${ownerId}:${library.id}` };
}
