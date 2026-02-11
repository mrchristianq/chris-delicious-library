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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    let responseText = "";
    let upstreamStatus = 500;
    try {
      const upstream = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
        cache: "no-store",
        signal: controller.signal,
      });
      upstreamStatus = upstream.status;
      responseText = (await upstream.text()).trim();
    } finally {
      clearTimeout(timeoutId);
    }

    const looksLikeError = /^error\b/i.test(responseText);
    if (upstreamStatus < 200 || upstreamStatus >= 300 || looksLikeError) {
      return NextResponse.json(
        {
          ok: false,
          error: responseText || `Apps Script returned HTTP ${upstreamStatus}`,
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
