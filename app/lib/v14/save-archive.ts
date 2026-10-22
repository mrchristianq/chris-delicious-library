export type ArchiveState = { id: string; revision: number; archived: boolean };
export type ArchiveWriter = {
  authenticate(): Promise<boolean>;
  write(id: string, revision: number, requestId: string, archived: boolean): Promise<ArchiveState>;
  read(id: string): Promise<ArchiveState | null>;
};

export async function saveArchive(writer: ArchiveWriter, id: string, revision: number, requestId: string, archived: boolean) {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(id) || !uuid.test(requestId) || !Number.isSafeInteger(revision) || revision < 1 || typeof archived !== "boolean") {
    throw new Error("Invalid archive identity or state");
  }
  if (!await writer.authenticate()) throw new Error("Authentication required");
  const receipt = await writer.write(id, revision, requestId, archived);
  if (!receipt || receipt.id !== id || receipt.revision !== revision + 1 || receipt.archived !== archived) {
    throw new Error("Archive not confirmed: invalid receipt");
  }
  const current = await writer.read(id);
  if (!current || current.id !== id || current.revision !== receipt.revision || current.archived !== archived) {
    throw new Error("Archive not confirmed: state changed or readback unavailable");
  }
  return { confirmed: true as const, state: current, requestId };
}
