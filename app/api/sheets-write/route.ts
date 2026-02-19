import { NextRequest, NextResponse } from "next/server";

const ALLOWED_HOSTS = new Set(["script.google.com", "script.googleusercontent.com"]);

function isAllowedScriptUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return parsed.protocol === "https:" && ALLOWED_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function stripHtml(text: string) {
  return text
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeShowWatchStatus(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const normalized = raw.toLowerCase().replace(/\s+/g, " ");
  if (normalized === "currently watching") return "Watching";
  return raw;
}

function normalizeGameCheckboxValue(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const normalized = raw.toLowerCase();
  if (
    normalized === "true" ||
    normalized === "yes" ||
    normalized === "1" ||
    normalized === "checked" ||
    normalized === "completed" ||
    normalized === "backlog" ||
    normalized === "queued"
  ) {
    return "Yes";
  }

  if (
    normalized === "false" ||
    normalized === "no" ||
    normalized === "0" ||
    normalized === "unchecked" ||
    normalized === "not completed" ||
    normalized === "not backlog"
  ) {
    return "No";
  }

  return raw;
}

function normalizeGameWriteFields(fields: Record<string, unknown>): Record<string, unknown> {
  const nextFields = { ...fields };

  if (Object.prototype.hasOwnProperty.call(nextFields, "Backlog")) {
    nextFields.Backlog = normalizeGameCheckboxValue(nextFields.Backlog);
  }

  if (Object.prototype.hasOwnProperty.call(nextFields, "Completed")) {
    nextFields.Completed = normalizeGameCheckboxValue(nextFields.Completed);
  }

  return nextFields;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const url = String(body?.url || "").trim();
    const payload = body?.payload;

    if (!url || !isAllowedScriptUrl(url)) {
      return NextResponse.json(
        { ok: false, error: "Invalid or unsupported Google Apps Script URL." },
        { status: 400 }
      );
    }

    let normalizedPayload = payload;

    if (payload && typeof payload === "object") {
      const payloadRecord = payload as Record<string, unknown>;
      const action = String(payloadRecord.action || "").trim();
      let nextPayloadRecord: Record<string, unknown> | null = null;

      if (
        action === "updateShow" &&
        payloadRecord.updates &&
        typeof payloadRecord.updates === "object"
      ) {
        nextPayloadRecord = {
          ...(nextPayloadRecord || payloadRecord),
          updates: {
            ...(payloadRecord.updates as Record<string, unknown>),
            WatchStatus: normalizeShowWatchStatus(
              (payloadRecord.updates as Record<string, unknown>).WatchStatus
            ),
          },
        };
      }

      if (action === "updateGame" || action === "addGame") {
        if (payloadRecord.updates && typeof payloadRecord.updates === "object") {
          nextPayloadRecord = {
            ...(nextPayloadRecord || payloadRecord),
            updates: normalizeGameWriteFields(payloadRecord.updates as Record<string, unknown>),
          };
        }

        if (payloadRecord.values && typeof payloadRecord.values === "object") {
          nextPayloadRecord = {
            ...(nextPayloadRecord || payloadRecord),
            values: normalizeGameWriteFields(payloadRecord.values as Record<string, unknown>),
          };
        }
      }

      if (nextPayloadRecord) {
        normalizedPayload = nextPayloadRecord;
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let responseText = "";
    let upstreamStatus = 500;
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(normalizedPayload ?? {}),
        cache: "no-store",
        signal: controller.signal,
      });
      upstreamStatus = upstream.status;
      responseText = (await upstream.text()).trim();
    } finally {
      clearTimeout(timeoutId);
    }

    const lowerText = responseText.toLowerCase();
    const looksLikeHtml = lowerText.startsWith("<!doctype html") || lowerText.startsWith("<html");
    const looksLikeError =
      /^error\b/i.test(responseText) ||
      lowerText.includes("violates the data validation rules") ||
      lowerText.includes("exception:") ||
      lowerText.includes("error:");
    if (upstreamStatus < 200 || upstreamStatus >= 300 || looksLikeError) {
      const normalizedError = looksLikeHtml ? stripHtml(responseText) : responseText;
      const action = normalizedPayload && typeof normalizedPayload === "object"
        ? String((normalizedPayload as Record<string, unknown>).action || "").trim()
        : "";
      const isAddAction = /^add[A-Z]/.test(action);
      const errorWithHint =
        isAddAction && /key is required/i.test(normalizedError)
          ? `${normalizedError} (Apps Script deployment is missing add* handlers. Re-deploy the latest GOOGLE_APPS_SCRIPT.gs web app and update NEXT_PUBLIC_*_WRITE_URL if the /exec URL changed.)`
          : normalizedError;
      return NextResponse.json(
        {
          ok: false,
          error: errorWithHint || `Apps Script returned HTTP ${upstreamStatus}`,
          upstreamStatus,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      ok: true,
      result: responseText || "Success",
      upstreamStatus,
    });
  } catch (error: unknown) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    const msg = isAbort ? "Apps Script request timed out." : error instanceof Error ? error.message : "Write failed.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
