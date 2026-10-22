import { readLibrary, type LibraryReader } from "./read-library";

export type SettingValue = string | number | boolean | null;
export type SettingWriter = LibraryReader & {
  write(libraryId: string, key: string, revision: number | null, requestId: string, value: SettingValue): Promise<unknown>;
};
export async function saveSetting(writer: SettingWriter, libraryId: string, key: string, revision: number | null, requestId: string, value: SettingValue) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(libraryId) || !uuid.test(requestId) || !key.trim() || key.length > 500 ||
      (revision !== null && (!Number.isSafeInteger(revision) || revision < 1)) ||
      (value !== null && !["string", "number", "boolean"].includes(typeof value)) ||
      (typeof value === "number" && !Number.isFinite(value))) throw new Error("Invalid setting save");
  const owner = await writer.authenticatedOwner();
  if (!owner) throw new Error("Authentication required");
  const receipt = await writer.write(libraryId, key, revision, requestId, value) as { library_id?: string; key?: string; revision?: number; value?: { value?: unknown } } | null;
  if (!receipt || receipt.library_id !== libraryId || receipt.key !== key || receipt.revision !== (revision ?? 0) + 1 || receipt.value?.value !== value) throw new Error("Setting save not confirmed: invalid receipt");
  const snapshot = await readLibrary(writer, libraryId);
  const setting = snapshot.settings.find(setting => setting.key === key);
  if (snapshot.owner_id !== owner || !setting || setting.revision !== receipt.revision || setting.value.value !== value || setting.value.legacy_profiles !== undefined) {
    throw new Error("Setting save not confirmed: readback mismatch");
  }
  return { requestId, confirmed: true as const, snapshot };
}
