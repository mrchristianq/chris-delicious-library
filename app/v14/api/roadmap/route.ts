import { GET as readLegacyRoadmap } from "../../../api/roadmap/route";
import { getV14Config } from "../../../lib/v14/config";
import { readV14Library } from "../../../lib/v14/read-library-server";
import { saveV14Setting } from "../../../lib/v14/save-setting-server";

export const runtime = "nodejs";

const SETTING_KEY = "roadmap:v14";
const MAX_BODY_BYTES = 512 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", Vary: "Cookie, Origin" };

type RoadmapItem = {
  id: string;
  text: string;
  tag?: "bug" | "feature";
  completed: boolean;
  createdAt: number;
  completedAt?: number;
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStore });
}

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function validateItems(value: unknown): value is RoadmapItem[] {
  if (!Array.isArray(value)) return false;
  return value.every((item) => {
    if (!record(item)) return false;
    if (Object.keys(item).some((key) => !["id", "text", "tag", "completed", "createdAt", "completedAt"].includes(key))) return false;
    return typeof item.id === "string" && item.id.trim().length > 0 &&
      typeof item.text === "string" && item.text.trim().length > 0 &&
      (!Object.hasOwn(item, "tag") || item.tag === "bug" || item.tag === "feature") &&
      typeof item.completed === "boolean" && validTime(item.createdAt) &&
      (!Object.hasOwn(item, "completedAt") || validTime(item.completedAt));
  });
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
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function errorStatus(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  if (/Authentication required/i.test(message)) return 401;
  if (/changed elsewhere|request ID reused|not confirmed|readback mismatch/i.test(message)) return 409;
  if (/BODY_TOO_LARGE/.test(message)) return 413;
  if (/Invalid /.test(message)) return 400;
  return 500;
}

function requiredLibraryId(request: Request): string | null {
  const url = new URL(request.url);
  const libraryId = url.searchParams.get("libraryId");
  if (!libraryId || !UUID.test(libraryId) || [...url.searchParams.keys()].some((key) => key !== "libraryId")) return null;
  return libraryId;
}

function settingFrom(snapshot: { settings?: unknown }) {
  const settings = Array.isArray(snapshot.settings) ? snapshot.settings : [];
  return settings.find((entry) => record(entry) && entry.key === SETTING_KEY) as
    | { key: string; revision: number; value?: { value?: unknown } }
    | undefined;
}

function parseStoredItems(value: unknown): RoadmapItem[] | null {
  if (typeof value !== "string") return null;
  try {
    const items: unknown = JSON.parse(value);
    return validateItems(items) ? items : null;
  } catch {
    return null;
  }
}

async function legacyItems(): Promise<RoadmapItem[]> {
  const response = await readLegacyRoadmap();
  if (!response.ok) throw new Error("Legacy roadmap baseline unavailable");
  const payload: unknown = await response.json();
  if (!record(payload) || !Array.isArray(payload.items)) throw new Error("Legacy roadmap baseline is invalid");
  const normalized = payload.items.map((item) => {
    if (!record(item)) return item;
    const createdAt = validTime(item.createdAt)
      ? item.createdAt
      : validTime(item.completedAt)
        ? item.completedAt
        : Date.now();
    return { ...item, createdAt };
  });
  if (!validateItems(normalized)) throw new Error("Legacy roadmap baseline is invalid");
  return normalized;
}

export async function GET(request: Request) {
  try {
    getV14Config();
    const libraryId = requiredLibraryId(request);
    if (!libraryId) return json({ error: "A valid libraryId is required." }, 400);
    const snapshot = await readV14Library(libraryId);
    if (snapshot.library_id !== libraryId) throw new Error("Library snapshot mismatch");
    const setting = settingFrom(snapshot);
    if (setting) {
      const items = parseStoredItems(setting.value?.value);
      if (!items) throw new Error("Stored roadmap setting is invalid");
      return json({ items, revision: setting.revision });
    }
    return json({ items: await legacyItems(), revision: null });
  } catch (error) {
    const status = errorStatus(error);
    return json({ error: status === 401 ? "Authentication required." : "Roadmap unavailable." }, status);
  }
}

export async function PUT(request: Request) {
  try {
    const config = getV14Config();
    if (request.headers.get("origin") !== config.origin) return json({ error: "Same-origin request required." }, 403);
    if ((request.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim() !== "application/json") {
      return json({ error: "Content-Type must be application/json." }, 415);
    }
    const libraryId = requiredLibraryId(request);
    if (!libraryId) return json({ error: "A valid libraryId is required." }, 400);

    let body: unknown;
    try {
      body = await readJsonBody(request);
    } catch (error) {
      const status = error instanceof Error && error.message === "BODY_TOO_LARGE" ? 413 : 400;
      return json({ error: status === 413 ? "Request body exceeds 512 KiB." : "Invalid JSON body." }, status);
    }
    if (!record(body) || Object.keys(body).some((key) => !["items", "revision", "requestId"].includes(key)) ||
        !Object.hasOwn(body, "items") || !Object.hasOwn(body, "revision") || !Object.hasOwn(body, "requestId") ||
        !validateItems(body.items) ||
        (body.revision !== null && (!Number.isSafeInteger(body.revision) || (body.revision as number) < 1)) ||
        typeof body.requestId !== "string" || !UUID.test(body.requestId)) {
      return json({ error: "Invalid roadmap save." }, 400);
    }

    const snapshot = await readV14Library(libraryId);
    if (snapshot.library_id !== libraryId) throw new Error("Library snapshot mismatch");
    const current = settingFrom(snapshot);
    const currentRevision = current?.revision ?? null;
    const expectedRevision = body.revision as number | null;
    // A timed-out save may already have committed. Let the idempotent RPC
    // validate a same-request retry one revision ahead instead of rejecting it.
    if (currentRevision !== expectedRevision && currentRevision !== (expectedRevision ?? 0) + 1) return json({ error: "Roadmap changed elsewhere; reload before saving." }, 409);

    const serialized = JSON.stringify(body.items);
    const result = await saveV14Setting(libraryId, SETTING_KEY, body.revision as number | null, body.requestId, serialized);
    if (!result.confirmed || result.snapshot.library_id !== libraryId) throw new Error("Roadmap save not confirmed");
    const confirmedSetting = settingFrom(result.snapshot);
    const confirmedItems = parseStoredItems(confirmedSetting?.value?.value);
    if (!confirmedSetting || !confirmedItems || confirmedSetting.revision !== (expectedRevision ?? 0) + 1 ||
        JSON.stringify(confirmedItems) !== serialized) {
      throw new Error("Roadmap save not confirmed: readback mismatch");
    }
    return json({ items: confirmedItems, revision: confirmedSetting.revision, confirmed: true, requestId: body.requestId });
  } catch (error) {
    const status = errorStatus(error);
    return json({ error: status === 401 ? "Authentication required." : status === 409 ? "Roadmap save was not confirmed; reload or retry with the same request ID." : "Roadmap save failed." }, status);
  }
}
