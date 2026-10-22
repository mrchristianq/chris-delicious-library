import { fullEditPatch, type EditPatch } from "./edit-contract";
import type { V14Item } from "./items";

export type CreateInput = { libraryId: string; itemId: string; requestId: string; mediaType: V14Item["media_type"]; patch: EditPatch };
export type CreateWriter = {
  authenticate(): Promise<boolean>;
  write(input: CreateInput): Promise<V14Item>;
  read(id: string): Promise<V14Item | null>;
};

// Caller retains itemId, requestId, date and this immutable payload for retries.
// Provider IDs are not item IDs: platform editions may share a provider record.
export function prepareCreate(libraryId: string, itemId: string, requestId: string, mediaType: V14Item["media_type"], values: Record<string,string>, today: string): CreateInput {
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (![libraryId,itemId,requestId].every(id=>uuid.test(id)) || !["book","movie","tv","game"].includes(mediaType)) throw new Error("Invalid creation identity");
  const input = { ...values };
  const fallback = (key: string, value: string) => { if (!input[key]?.trim()) input[key] = value; };
  if (mediaType === "game") {
    fallback("platform","Wishlist"); fallback("ownership","Wishlist"); fallback("status","Wishlist"); fallback("format","Digital");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || !Number.isFinite(Date.parse(today)) || new Date(today).toISOString().slice(0,10)!==today) throw new Error("Invalid creation date");
    fallback("dateAdded",today);
  } else if (mediaType === "book") {
    fallback("type","Physical"); fallback("ownership","Owned"); fallback("status","Backlog");
  } else fallback("watchStatus","Backlog");
  const empty: V14Item = {id:itemId,media_type:mediaType,title:"",user_status:null,personal_rating:null,completed_on:null,notes:"",revision:1,user_fields:{},metadata:{}};
  const patch = fullEditPatch(empty,input);
  if (!patch.title) throw new Error("Title is required");
  return { libraryId,itemId,requestId,mediaType,patch };
}

export async function createItem(writer: CreateWriter, input: CreateInput) {
  if (!await writer.authenticate()) throw new Error("Authentication required");
  const receipt = await writer.write(input);
  // Creation uses the existing full-edit validator inside the same transaction:
  // seed revision 1 + validated form application = first visible revision 2.
  if (!receipt || receipt.id!==input.itemId || receipt.media_type!==input.mediaType || receipt.revision!==2) throw new Error("Add not confirmed: invalid receipt");
  const item = await writer.read(input.itemId);
  if (!item || item.id!==input.itemId || item.media_type!==input.mediaType || item.revision!==receipt.revision) throw new Error("Add not confirmed: readback unavailable or item changed");
  for (const key of ["title","user_status","personal_rating","completed_on","notes"] as const) {
    if (key in input.patch && (item[key]!==input.patch[key] || receipt[key]!==input.patch[key])) throw new Error("Add not confirmed: field mismatch");
  }
  for (const [key,value] of Object.entries(input.patch.overrides ?? {})) {
    if (item.user_fields[key]!==value || receipt.user_fields[key]!==value) throw new Error("Add not confirmed: override mismatch");
  }
  return {confirmed:true as const,item,requestId:input.requestId};
}
