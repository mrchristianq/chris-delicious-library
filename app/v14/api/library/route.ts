import { streamLibraryJson } from "../../../lib/v14/stream-json";
import { getV14Config } from "../../../lib/v14/config";
import { createV14Client } from "../../../lib/v14/server";
import * as libraryReads from "../../../lib/v14/read-library-server";
const { readV14Library } = libraryReads;
import { createV14Item } from "../../../lib/v14/create-item-server";
import type { CreateInput } from "../../../lib/v14/create-item";
import { saveV14Archive } from "../../../lib/v14/save-archive-server";
import { saveV14Setting } from "../../../lib/v14/save-setting-server";
import { saveV14EpisodeProgress } from "../../../lib/v14/save-progress-server";
import type { EpisodeChange } from "../../../lib/v14/save-progress";
import type { SettingValue } from "../../../lib/v14/save-setting";
import type { EditPatch } from "../../../lib/v14/edit-contract";
import type { V14Item } from "../../../lib/v14/items";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 512 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", Vary: "Cookie, Origin" };

type EditCommand = { kind: "edit"; libraryId: string; itemId: string; revision: number; requestId: string; patch: EditPatch };
type CreateCommand = { kind: "create"; libraryId: string; input: CreateInput };
type ArchiveCommand = { kind: "archive"; libraryId: string; itemId: string; revision: number; requestId: string; archived: boolean };
type SettingCommand = { readback?: "targeted"; kind: "setting"; libraryId: string; key: string; revision: number | null; requestId: string; value: SettingValue };
type ProgressCommand = { readback?: "targeted"; kind: "progress"; libraryId: string; requestId: string; changes: EpisodeChange[] };
type EpisodeMetadataCommand = {kind:"episode_metadata";libraryId:string;itemId:string;revision:number;requestId:string;rows:Array<{season_number:number;episode_number:number;provider_id:string|null;metadata:Record<string,string>}>};
type LibraryCommand = EditCommand | CreateCommand | ArchiveCommand | SettingCommand | ProgressCommand | EpisodeMetadataCommand;

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStore });
}

function validRevision(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, allowed: string[]) {
  return Object.keys(value).every((key) => allowed.includes(key));
}

async function readJsonBody(request: Request): Promise<unknown> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength !== null && /^\d+$/.test(declaredLength) && Number(declaredLength) > MAX_BODY_BYTES) {
    throw new Error("BODY_TOO_LARGE");
  }
  if (!request.body) throw new Error("INVALID_JSON");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new Error("BODY_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function validateEditPatch(value: unknown): value is EditPatch {
  if (!isRecord(value) || !exactKeys(value, ["title", "user_status", "personal_rating", "completed_on", "notes", "overrides"])) return false;
  if (Object.hasOwn(value, "title") && (typeof value.title !== "string" || value.title.length === 0)) return false;
  if (Object.hasOwn(value, "user_status") && typeof value.user_status !== "string") return false;
  if (Object.hasOwn(value, "personal_rating") && value.personal_rating !== null &&
      (typeof value.personal_rating !== "number" || !Number.isFinite(value.personal_rating))) return false;
  if (Object.hasOwn(value, "completed_on") && value.completed_on !== null && typeof value.completed_on !== "string") return false;
  if (Object.hasOwn(value, "notes") && typeof value.notes !== "string") return false;
  if (Object.hasOwn(value, "overrides") && (!isRecord(value.overrides) || Object.values(value.overrides).some((field) => typeof field !== "string"))) return false;
  return Object.keys(value).length > 0;
}

function validateCommand(value: unknown): value is LibraryCommand {
  if (!isRecord(value) || typeof value.kind !== "string" || !UUID.test(String(value.libraryId ?? ""))) return false;
  switch (value.kind) {
    case "episode_metadata":
      return exactKeys(value,["kind","libraryId","itemId","revision","requestId","rows"]) && UUID.test(String(value.itemId??"")) && validRevision(value.revision) && UUID.test(String(value.requestId??"")) &&
        Array.isArray(value.rows) && value.rows.length>0 && value.rows.length<=1000 && value.rows.every(row=>isRecord(row) && exactKeys(row,["season_number","episode_number","provider_id","metadata"]) &&
          Number.isSafeInteger(row.season_number) && Number(row.season_number)>=0 && Number.isSafeInteger(row.episode_number) && Number(row.episode_number)>=0 &&
          (row.provider_id===null || typeof row.provider_id==="string") && isRecord(row.metadata) && Object.values(row.metadata).every(field=>typeof field==="string"));
    case "edit":
      return exactKeys(value, ["kind", "libraryId", "itemId", "revision", "requestId", "patch"]) &&
        UUID.test(String(value.itemId ?? "")) && validRevision(value.revision) && UUID.test(String(value.requestId ?? "")) &&
        validateEditPatch(value.patch);
    case "create": {
      if (!exactKeys(value, ["kind", "libraryId", "input"]) || !isRecord(value.input)) return false;
      const input = value.input;
      return exactKeys(input, ["libraryId", "itemId", "requestId", "mediaType", "patch"]) &&
        input.libraryId === value.libraryId && UUID.test(String(input.itemId ?? "")) && UUID.test(String(input.requestId ?? "")) &&
        ["book", "movie", "tv", "game"].includes(String(input.mediaType)) && validateEditPatch(input.patch);
    }
    case "archive":
      return exactKeys(value, ["kind", "libraryId", "itemId", "revision", "requestId", "archived"]) &&
        UUID.test(String(value.itemId ?? "")) && validRevision(value.revision) && UUID.test(String(value.requestId ?? "")) &&
        typeof value.archived === "boolean";
    case "setting":
      if (value.readback !== undefined && value.readback !== "targeted") return false;
      return exactKeys(value, ["kind", "libraryId", "key", "revision", "requestId", "value", "readback"]) &&
        typeof value.key === "string" && value.key.trim().length > 0 && value.key.length <= 500 &&
        (value.revision === null || validRevision(value.revision)) && UUID.test(String(value.requestId ?? "")) &&
        (value.value === null || ["string", "boolean"].includes(typeof value.value) ||
          (typeof value.value === "number" && Number.isFinite(value.value)));
    case "progress":
      if (value.readback !== undefined && value.readback !== "targeted") return false;
      return exactKeys(value, ["kind", "libraryId", "requestId", "changes", "readback"]) && UUID.test(String(value.requestId ?? "")) &&
        Array.isArray(value.changes) && value.changes.length > 0 && value.changes.length <= 1000 &&
        value.changes.every((change: unknown) => isRecord(change) && exactKeys(change, ["episode_id", "revision", "watched", "watched_at"]) &&
          UUID.test(String(change.episode_id ?? "")) && (change.revision === null || validRevision(change.revision)) &&
          typeof change.watched === "boolean" && (change.watched_at === null || typeof change.watched_at === "string"));
    default:
      return false;
  }
}

async function saveEdit(command: EditCommand, item: V14Item) {
  const client = await createV14Client();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Authentication required");

  const { data: receipt, error } = await client.rpc("cdl_v14_full_edit", {
    p_id: command.itemId,
    p_revision: command.revision,
    p_request_id: command.requestId,
    p_patch: command.patch,
  });
  if (error || !isRecord(receipt) || receipt.id !== item.id || receipt.revision !== command.revision + 1) {
    throw new Error("Edit not confirmed: invalid receipt or revision conflict");
  }

  const { data: confirmed, error: readError } = await client.rpc("cdl_v14_get_item", { p_id: command.itemId });
  if (readError || !isRecord(confirmed) || confirmed.id !== receipt.id || confirmed.revision !== receipt.revision) {
    throw new Error("Edit not confirmed: item changed or readback unavailable");
  }
  for (const key of ["title", "user_status", "personal_rating", "completed_on", "notes"] as const) {
    if (Object.hasOwn(command.patch, key) && (receipt[key] !== command.patch[key] || confirmed[key] !== command.patch[key])) {
      throw new Error("Edit not confirmed: field mismatch");
    }
  }
  for (const [key, expected] of Object.entries(command.patch.overrides ?? {})) {
    const receiptFields = receipt.user_fields;
    const confirmedFields = confirmed.user_fields;
    if (!isRecord(receiptFields) || !isRecord(confirmedFields) || receiptFields[key] !== expected || confirmedFields[key] !== expected) {
      throw new Error("Edit not confirmed: override mismatch");
    }
  }
  return { confirmed: true as const, item: confirmed as unknown as V14Item, requestId: command.requestId };
}

function errorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/Authentication required/i.test(message)) return 401;
  if (/changed elsewhere|request ID reused|already changed|not available|readback mismatch|not confirmed/i.test(message)) return 409;
  if (/Invalid |Unsupported |required/i.test(message)) return 400;
  return 500;
}

export async function GET(request: Request) {
  try {
    getV14Config();
    const url = new URL(request.url);
    const libraryId = url.searchParams.get("libraryId");
    const token = url.searchParams.get("changeToken");
    if (!libraryId || !UUID.test(libraryId) || (token !== null && !/^[a-f0-9]{32}$/i.test(token)) ||
        [...url.searchParams.keys()].some((key) => !["libraryId", "changeToken"].includes(key)) ||
        url.searchParams.getAll("libraryId").length !== 1 || url.searchParams.getAll("changeToken").length > 1) {
      return json({ error: "A valid libraryId is required." }, 400);
    }
    return streamLibraryJson(token === null ? await readV14Library(libraryId, true) : await libraryReads.revalidateV14Library(libraryId, token), noStore);
  } catch (error) {
    const status = errorStatus(error);
    return json({ error: status === 401 ? "Authentication required." : "Library snapshot unavailable." }, status);
  }
}

export async function POST(request: Request) {
  try {
    const config = getV14Config();
    if (request.headers.get("origin") !== config.origin) return json({ error: "Same-origin request required." }, 403);
    if ((request.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim() !== "application/json") {
      return json({ error: "Content-Type must be application/json." }, 415);
    }
    let command: unknown;
    try { command = await readJsonBody(request); }
    catch (error) {
      return json({ error: error instanceof Error && error.message === "BODY_TOO_LARGE" ? "Request body exceeds 512 KiB." : "Invalid JSON body." },
        error instanceof Error && error.message === "BODY_TOO_LARGE" ? 413 : 400);
    }
    if (!validateCommand(command)) return json({ error: "Invalid library command." }, 400);

    // These writers authenticate and independently read back persisted changes.
    // New clients opt into target-only reads; old clients retain full snapshots.
    if (command.kind === "setting") {
      return json(command.readback === "targeted"
        ? await saveV14Setting(command.libraryId, command.key, command.revision, command.requestId, command.value, true)
        : await saveV14Setting(command.libraryId, command.key, command.revision, command.requestId, command.value));
    }
    if (command.kind === "progress") {
      return json(await saveV14EpisodeProgress(command.libraryId, command.requestId, command.changes, ...(command.readback === "targeted" ? [true] as const : [])));
    }
    const snapshot = await readV14Library(command.libraryId);
    switch (command.kind) {
      case "episode_metadata": {
        const client=await createV14Client();
        const {data:receipt,error}=await client.rpc("cdl_v14_episode_metadata",{p_library_id:command.libraryId,p_show_id:command.itemId,p_show_revision:command.revision,p_request_id:command.requestId,p_rows:command.rows});
        if (error || !receipt || receipt.show_id!==command.itemId || !Array.isArray(receipt.rows) || receipt.rows.length!==command.rows.length) throw new Error("Episode metadata not confirmed");
        const confirmed=await readV14Library(command.libraryId);
        for (const input of command.rows) {
          const stored=confirmed.episodes.find(episode=>episode.show_id===command.itemId && episode.season_number===input.season_number && episode.episode_number===input.episode_number);
          if (!stored || stored.provider_id!==input.provider_id || Object.entries(input.metadata).some(([key,value])=>stored.metadata[key]!==value)) throw new Error("Episode metadata not confirmed: readback mismatch");
        }
        return json({confirmed:true,snapshot:confirmed,requestId:command.requestId});
      }
      case "edit": {
        const item = snapshot.items.find((entry) => entry.id === command.itemId);
        if (!item) return json({ error: "Item is not available in this library." }, 404);
        if (item.revision !== command.revision && item.revision !== command.revision + 1) {
          return json({ error: "Item changed elsewhere. Reload before saving." }, 409);
        }
        return json(await saveEdit(command, item));
      }
      case "create":
        return json(await createV14Item(command.input), 201);
      case "archive": {
        const client=await createV14Client();
        const {data:state,error}=await client.rpc("cdl_v14_archive_state",{p_id:command.itemId});
        if (error || !state || state.library_id!==command.libraryId) return json({error:"Item is not available in this library."},404);
        return json(await saveV14Archive(command.itemId, command.revision, command.requestId, command.archived));
      }
    }
  } catch (error) {
    const status = errorStatus(error);
    return json({ error: status === 401 ? "Authentication required." : status === 409 ? "Save was not confirmed; reload or retry with the same request ID." : "Library command failed." }, status);
  }
}
