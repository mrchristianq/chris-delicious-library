import { NextRequest } from "next/server";

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const src = safeStr(request.nextUrl.searchParams.get("src"));
  if (!isHttpUrl(src)) {
    return new Response("Invalid src", { status: 400 });
  }

  try {
    const upstream = await fetch(src, {
      cache: "force-cache",
      headers: {
        Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      },
    });

    if (!upstream.ok) {
      return new Response("Upstream image request failed", { status: upstream.status });
    }

    const contentType = safeStr(upstream.headers.get("content-type")) || "image/jpeg";
    const cacheControl =
      safeStr(upstream.headers.get("cache-control")) || "public, max-age=86400, stale-while-revalidate=604800";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": cacheControl,
      },
    });
  } catch {
    return new Response("Failed to fetch image", { status: 502 });
  }
}
