import type { V14Item } from "./items";
import { fullEditPatch, type EditPatch } from "./edit-contract";

export type EditWriter = {
  authenticate(): Promise<boolean>;
  write(id: string, revision: number, requestId: string, patch: EditPatch): Promise<V14Item>;
  read(id: string): Promise<V14Item | null>;
};
export async function saveFullEdit(writer: EditWriter, item: V14Item, requestId: string, values: Record<string,string>) {
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(item.id) || !uuid.test(requestId) || !Number.isSafeInteger(item.revision) || item.revision < 1) throw new Error("Missing database edit identity");
  if (!await writer.authenticate()) throw new Error("Authentication required");
  const patch=fullEditPatch(item,values);
  const changed=Object.keys(patch).length>0;
  const receipt=changed ? await writer.write(item.id,item.revision,requestId,patch) : item;
  if (!receipt || receipt.id!==item.id || receipt.revision!==item.revision+(changed?1:0)) throw new Error("Edit not confirmed: invalid receipt");
  const confirmed=await writer.read(item.id);
  if (!confirmed || confirmed.id!==item.id || confirmed.revision!==receipt.revision) throw new Error("Edit not confirmed: item changed or readback unavailable");
  for (const key of ["title","user_status","personal_rating","completed_on","notes"] as const) {
    if (key in patch && (confirmed[key]!==patch[key] || receipt[key]!==patch[key])) throw new Error("Edit not confirmed: field mismatch");
  }
  for (const [key,value] of Object.entries(patch.overrides ?? {})) {
    if (confirmed.user_fields[key]!==value || receipt.user_fields[key]!==value) throw new Error("Edit not confirmed: override mismatch");
  }
  return {confirmed:true as const,item:confirmed,requestId,changed};
}
