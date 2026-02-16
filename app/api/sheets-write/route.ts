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

    const normalizedPayload =
      payload &&
      typeof payload === "object" &&
      (payload as Record<string, unknown>).action === "updateShow" &&
      (payload as Record<string, unknown>).updates &&
      typeof (payload as Record<string, unknown>).updates === "object"
        ? {
            ...(payload as Record<string, unknown>),
            updates: {
              ...((payload as Record<string, unknown>).updates as Record<string, unknown>),
              WatchStatus: normalizeShowWatchStatus(
                ((payload as Record<string, unknown>).updates as Record<string, unknown>).WatchStatus
              ),
            },
          }
        : payload;

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
