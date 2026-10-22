import { getV14Config } from "../../../lib/v14/config";
import { createV14Client } from "../../../lib/v14/server";
import { projectActivity } from "../../../lib/v14/activity";

export const runtime = "nodejs";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const noStore = { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache", Vary: "Cookie, Origin" };

function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: noStore });
}

export async function GET(request: Request) {
  try {
    const config = getV14Config();
    const requestOrigin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    if ((requestOrigin && requestOrigin !== config.origin) || (fetchSite && fetchSite !== "same-origin")) {
      return json({ error: "Same-origin request required." }, 403);
    }
    const url = new URL(request.url);
    const libraryId = url.searchParams.get("libraryId");
    if (!libraryId || !UUID.test(libraryId) || [...url.searchParams.keys()].some((key) => key !== "libraryId")) {
      return json({ error: "A valid libraryId is required." }, 400);
    }

    const client = await createV14Client();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError || !auth.user) return json({ error: "Authentication required." }, 401);

    const { data, error } = await client.rpc("cdl_v14_activity", {
      p_library_id: libraryId,
      p_changelog_limit: 300,
      p_event_limit: 100,
    });
    if (error) throw new Error("Activity read failed");
    return json({ rows: projectActivity(data) });
  } catch {
    return json({ error: "Activity unavailable." }, 500);
  }
}
