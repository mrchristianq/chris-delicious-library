/** Shared database counters protect every server instance and existing app tabs. */
export async function episodeRefreshGuard(
  client: { rpc: (name: string, args: Record<string, string>) => PromiseLike<{data: unknown; error: unknown}> },
  stage: "provider" | "metadata", key: string,
): Promise<Response | null> {
  const {data, error} = await client.rpc("cdl_v14_episode_refresh_guard", {p_stage: stage, p_key: key});
  const headers = {"Cache-Control": "no-store, max-age=0", Vary: "Cookie, Origin"};
  if (error || !data || typeof data !== "object" || !("retry_after" in data) ||
      !Number.isSafeInteger(data.retry_after) || Number(data.retry_after) < 0) {
    // Fail closed: missing migrations or unavailable counters cannot enable a loop.
    return Response.json({error: "Episode refresh protection is unavailable. Please try again later."}, {status: 503, headers});
  }
  const retryAfter = Number(data.retry_after);
  return retryAfter === 0 ? null : Response.json({
    error: "Episode refresh safety limit reached. Please try again later.", retryAfter,
  }, {status: 429, headers: {...headers, "Retry-After": String(retryAfter)}});
}
