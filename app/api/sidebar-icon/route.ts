import { NextRequest, NextResponse } from "next/server";

const publicBaseUrl = process.env.R2_PUBLIC_URL;

function sanitizeIconKey(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const iconKeyRaw = searchParams.get("iconKey") || "";
  const fallbackRaw = searchParams.get("fallback") || "";
  const version = searchParams.get("v") || "";
  const iconKey = sanitizeIconKey(iconKeyRaw);

  if (!publicBaseUrl || !iconKey) {
    if (fallbackRaw.startsWith("/")) {
      return NextResponse.redirect(new URL(fallbackRaw, req.url), { status: 307 });
    }
    return NextResponse.json({ error: "Sidebar icon source unavailable." }, { status: 500 });
  }

  const base = publicBaseUrl.replace(/\/+$/, "");
  const iconUrl = `${base}/icons/sidebar/${iconKey}${version ? `?v=${encodeURIComponent(version)}` : ""}`;
  return NextResponse.redirect(iconUrl, { status: 307 });
}
