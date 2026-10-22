import { NextRequest } from "next/server";
import { GET as mediaSearch } from "../../../../api/media-search/route";
import { GET as tvEpisodes } from "../../../../api/tv-episodes/route";
import { POST as recommendations } from "../../../../api/recommendations/route";
import {
  noStoreResponse,
  ProviderAccessError,
  proxyProviderImage,
  proxySidebarIcon,
  readLimitedBody,
  requireV14ProviderUser,
} from "../../../../lib/v14/provider-access";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ name: string }> };
const PROVIDER_METHODS: Record<string, "GET" | "POST"> = {
  "media-search": "GET",
  "tv-episodes": "GET",
  recommendations: "POST",
  "cover-proxy": "GET",
  "sidebar-icon": "GET",
};

function responseError(message: string, status: number, allow?: string) {
  const headers = new Headers({ "Cache-Control": "no-store, max-age=0" });
  if (allow) headers.set("Allow", allow);
  return Response.json({ error: message }, { status, headers });
}

async function dispatch(request: NextRequest, context: RouteContext) {
  const { name } = await context.params;
  const allowedMethod = PROVIDER_METHODS[name];
  if (!allowedMethod) return responseError("Provider route not found.", 404);
  if (request.method !== allowedMethod) return responseError("Method not allowed.", 405, `${allowedMethod}, OPTIONS`);

  let config;
  try {
    config = await requireV14ProviderUser();
  } catch (error) {
    const status = error instanceof ProviderAccessError ? error.status : 503;
    const message = status === 401 ? "Authentication required." : "Provider bridge unavailable.";
    return responseError(message, status);
  }

  if (request.method === "POST" && request.headers.get("origin") !== config.origin) {
    return responseError("Same-origin request required.", 403);
  }

  if (name === "cover-proxy") {
    return proxyProviderImage(request.nextUrl.searchParams.get("src") ?? "");
  }
  if (name === "sidebar-icon") {
    return proxySidebarIcon(request.url, {
      iconKey: request.nextUrl.searchParams.get("iconKey") ?? "",
      fallback: request.nextUrl.searchParams.get("fallback") ?? "",
      version: request.nextUrl.searchParams.get("v") ?? "",
    });
  }
  if (name === "media-search") return noStoreResponse(await mediaSearch(request));
  if (name === "tv-episodes") return noStoreResponse(await tvEpisodes(request));

  if ((request.headers.get("content-type") ?? "").toLowerCase().split(";", 1)[0].trim() !== "application/json") {
    return responseError("Content-Type must be application/json.", 415);
  }
  let body: Uint8Array;
  try {
    body = await readLimitedBody(request);
  } catch (error) {
    const status = error instanceof ProviderAccessError ? error.status : 400;
    return responseError(status === 413 ? "Provider request exceeds the 1 MB limit." : "Invalid provider request body.", status);
  }
  const headers = new Headers(request.headers);
  headers.delete("content-length");
  headers.delete("transfer-encoding");
  const forwarded = new NextRequest(request.url, { method: "POST", headers, body: new Uint8Array(body).buffer });
  return noStoreResponse(await recommendations(forwarded));
}

export async function GET(request: NextRequest, context: RouteContext) {
  try { return await dispatch(request, context); }
  catch (error) {
    return responseError(error instanceof ProviderAccessError && error.status === 401 ? "Authentication required." : "Provider request failed.",
      error instanceof ProviderAccessError ? error.status : 502);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try { return await dispatch(request, context); }
  catch (error) {
    return responseError(error instanceof ProviderAccessError && error.status === 401 ? "Authentication required." : "Provider request failed.",
      error instanceof ProviderAccessError ? error.status : 502);
  }
}

async function rejectOtherMethod(request: NextRequest, context: RouteContext) {
  const { name } = await context.params;
  if (!PROVIDER_METHODS[name]) return responseError("Provider route not found.", 404);
  return responseError("Method not allowed.", 405, `${PROVIDER_METHODS[name]}, OPTIONS`);
}

export async function PUT(request: NextRequest, context: RouteContext) { return rejectOtherMethod(request, context); }
export async function PATCH(request: NextRequest, context: RouteContext) { return rejectOtherMethod(request, context); }
export async function DELETE(request: NextRequest, context: RouteContext) { return rejectOtherMethod(request, context); }
export async function HEAD(request: NextRequest, context: RouteContext) { return rejectOtherMethod(request, context); }
export async function OPTIONS(request: NextRequest, context: RouteContext) { return rejectOtherMethod(request, context); }
