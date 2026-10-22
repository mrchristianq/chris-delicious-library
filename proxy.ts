import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { getV14Config, isV14Path } from "./app/lib/v14/config";
import { blocksValidationWrite, isV14PublicAsset, v14ProviderTarget } from "./app/lib/v14/route-policy";

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (process.env.CDL_V14_TEST !== "true") {
    return isV14Path(path) ? new NextResponse("Not found", { status: 404 }) : NextResponse.next();
  }
  let config;
  try { config = getV14Config(); } catch {
    return new NextResponse("v14 test configuration is incomplete; legacy routes remain blocked.", { status: 503 });
  }
  const providerTarget=v14ProviderTarget(path,request.method);
  if (blocksValidationWrite(path,request.method,process.env.CDL_V14_VALIDATION_READ_ONLY === "true",process.env.CDL_V14_REVIEW_ONLY === "true")) {
    return NextResponse.json({error:"Read-only validation session: no changes were saved."},{status:403,headers:{"Cache-Control":"no-store"}});
  }
  if (providerTarget) {
    // The destination authenticates independently and checks POST origin.
    const url=request.nextUrl.clone();url.pathname=providerTarget;
    return NextResponse.rewrite(url);
  }
  if (isV14PublicAsset(path,request.method)) return NextResponse.next();
  // Do not execute ANY legacy API, even GET endpoints that may perform writes.
  if (path === "/api" || path.startsWith("/api/")) {
    return NextResponse.json({ error: "Legacy API disabled in v14 test mode." }, { status: 403 });
  }
  if (!isV14Path(path)) return NextResponse.redirect(new URL("/v14", config.origin));
  // Require same origin for actions; don't trust arbitrary forwarded Host headers.
  if (request.method !== "GET" && request.method !== "HEAD" && request.headers.get("origin") !== config.origin) {
    return new NextResponse("Origin not allowed", { status: 403 });
  }
  let response = NextResponse.next({ request });
  const client = createServerClient(config.url, config.key, {
    cookieOptions: { name: "cdl-v14-test-auth", httpOnly: true, sameSite: "lax", path: "/", secure: config.origin.startsWith('https:') },
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await client.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Frame-Options", "DENY");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|_next/webpack-hmr|favicon.ico|icon.png|apple-icon.png|mobile-icon-2.png).*)"],
};
