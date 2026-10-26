import { getV14Config } from "../../../lib/v14/config";
import { createV14Client } from "../../../lib/v14/server";
import { readTrackerConnection } from "../../../lib/v14/tracker-read-server";
import { readV14LibraryForVerifiedOwner } from "../../../lib/v14/read-library-server";
import { readTrackerBaselineState } from "../../../lib/v14/tracker-baseline-read";
import { previewTrackerThreeWay } from "../../../lib/v14/tracker-three-way";
import { attachTrackerConflictDecisions } from "../../../lib/v14/tracker-conflict-decisions";
import { attachTrackerIdentityDecisions } from "../../../lib/v14/tracker-identity-decisions";
import { attachNewItemDecisions } from "../../../lib/v14/tracker-new-decisions";
import { readMixedContext } from "../../../lib/v14/tracker-mixed-server";
import { prepareReviewChoices, persistReviewChoices, type ReviewChoice } from "../../../lib/v14/tracker-choice-batch";

export const runtime = "nodejs";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Origin" } });
export async function POST(request: Request) {
  try {
    if (process.env.CDL_V14_VALIDATION_READ_ONLY === "true" && process.env.CDL_V14_REVIEW_ONLY !== "true") return json({ error: "Read-only session." }, 403);
    if (request.headers.get("origin") !== getV14Config().origin || !["same-origin", null].includes(request.headers.get("sec-fetch-site"))) return json({ error: "Same-origin request required." }, 403);
    if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") return json({ error: "JSON required." }, 415);
    const reader = request.body?.getReader();
    if (!reader) return json({ error: "Invalid choices." }, 400);
    const chunks: Uint8Array[] = []; let length = 0;
    try { while (true) { const { done, value } = await reader.read(); if (done) break; length += value.byteLength; if (length > 262144) { await reader.cancel(); return json({ error: "Too many choices. Apply fewer items at a time." }, 413); } chunks.push(value); } } finally { reader.releaseLock(); }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    let body;
    try { body = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); } catch { return json({ error: "Invalid choices." }, 400); }
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 3 || Object.keys(body).some(key => !["libraryId", "requestId", "choices"].includes(key)) || typeof body.libraryId !== "string" || !uuid.test(body.libraryId) || typeof body.requestId !== "string" || !uuid.test(body.requestId) || !Array.isArray(body.choices) || !body.choices.length || body.choices.length > 100) return json({ error: "Invalid choices." }, 400);
    const choices: ReviewChoice[] = body.choices;
    if (choices.some(choice => !choice || typeof choice !== "object" || Array.isArray(choice) || Object.keys(choice).length !== 5 || Object.keys(choice).some(key => !["changeId", "token", "side", "revision", "requestId"].includes(key)) || typeof choice.changeId !== "string" || choice.changeId.length > 1000 || typeof choice.token !== "string" || !/^[a-f0-9]{64}$/.test(choice.token) || !["app", "tracker", "clear"].includes(choice.side) || typeof choice.requestId !== "string" || !uuid.test(choice.requestId) || choice.revision !== null && (!Number.isSafeInteger(choice.revision) || choice.revision < 1)) || new Set(choices.map(choice => choice.changeId)).size !== choices.length || new Set(choices.map(choice => choice.requestId)).size !== choices.length) return json({ error: "Invalid choices." }, 400);
    const client = await createV14Client();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: "Authentication required." }, 401);
    const { data: libraries, error } = await client.rpc("cdl_v14_my_libraries");
    if (error) throw new Error("Authorization unavailable");
    if (!Array.isArray(libraries) || !libraries.some(row => row.id === body.libraryId)) return json({ error: "Library unavailable." }, 404);
    const [baseline, context] = await Promise.all([readTrackerBaselineState(client, auth.user.id, body.libraryId), readMixedContext(client, auth.user.id, body.libraryId)]);
    if (!baseline || context.activePlan) return json({ error: context.activePlan ? "Resume the saved sync before choosing new values." : "A confirmed comparison is required." }, 409);
    // One fresh source read for the entire selection, never one read per field.
    const [tracker, snapshot] = await Promise.all([readTrackerConnection(true), readV14LibraryForVerifiedOwner(client, auth.user.id, body.libraryId)]);
    if (!tracker?.tables) throw new Error("Fresh tracker unavailable");
    const preview = attachNewItemDecisions(attachTrackerIdentityDecisions(attachTrackerConflictDecisions(previewTrackerThreeWay(snapshot.items, tracker.tables, baseline, tracker.observedAt), snapshot.items, snapshot.settings, baseline), snapshot.items, snapshot.settings, baseline, tracker.tables), { items: snapshot.items, tables: tracker.tables, baseline }, snapshot.settings, context.allowSheetImports);
    let commands;
    try { commands = prepareReviewChoices(body.libraryId, preview.changes, choices); } catch { return json({ error: "Compared values changed. Run Sync Now and review the latest values; nothing was applied." }, 409); }
    const [recheck, latestContext] = await Promise.all([readTrackerBaselineState(client, auth.user.id, body.libraryId), readMixedContext(client, auth.user.id, body.libraryId)]);
    if (JSON.stringify(baseline) !== JSON.stringify(recheck) || latestContext.activePlan) return json({ error: "Sync changed elsewhere. Refresh before applying." }, 409);
    const confirmed = await persistReviewChoices({
      async write(command) { const result = await client.rpc("cdl_v14_save_setting", { p_library_id: body.libraryId, p_key: command.key, p_revision: command.revision, p_request_id: command.requestId, p_value: { value: command.value } }); if (result.error) throw new Error("Choice save not confirmed"); return result.data; },
      read: () => readV14LibraryForVerifiedOwner(client, auth.user!.id, body.libraryId),
    }, auth.user.id, body.libraryId, commands);
    return json({ requestId: body.requestId, confirmed: true, applied: false, choices: confirmed });
  } catch { return json({ error: "Selected choices were not confirmed. Retry safely; no library or Sheet values were applied." }, 503); }
}
