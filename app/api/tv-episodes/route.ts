import { NextRequest, NextResponse } from "next/server";

const TMDB_STILL_BASE = "https://image.tmdb.org/t/p/w780";
const TMDB_POSTER_BASE = "https://image.tmdb.org/t/p/w500";

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function pickEnv(keys: string[]): string {
  for (const key of keys) {
    const value = safeStr(process.env[key]);
    if (value) return value;
  }
  return "";
}

async function tmdbFetch(path: string, params: Record<string, string> = {}) {
  const bearerToken = pickEnv(["TMDB_BEARER_TOKEN", "TMDB_API_READ_ACCESS_TOKEN"]);
  const apiKey = pickEnv(["TMDB_API_KEY"]);
  if (!bearerToken && !apiKey) {
    throw new Error("TMDB credentials are not configured.");
  }

  const search = new URLSearchParams({ language: "en-US", ...params });
  if (!bearerToken) {
    search.set("api_key", apiKey);
  }

  const res = await fetch(`https://api.themoviedb.org/3${path}?${search.toString()}`, {
    method: "GET",
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(safeStr(body?.status_message) || `TMDB request failed: ${res.status}`);
  }
  return body;
}

function imageUrl(base: string, path: unknown): string {
  const value = safeStr(path);
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `${base}${value.startsWith("/") ? value : `/${value}`}`;
}

export async function GET(req: NextRequest) {
  try {
    const tmdbId = safeStr(req.nextUrl.searchParams.get("tmdbId"));
    const showTitle = safeStr(req.nextUrl.searchParams.get("title"));
    if (!tmdbId) {
      return NextResponse.json({ ok: false, error: "tmdbId is required." }, { status: 400 });
    }

    const details = await tmdbFetch(`/tv/${encodeURIComponent(tmdbId)}`);
    const seasons = Array.isArray(details?.seasons) ? details.seasons : [];
    const normalSeasons = seasons
      .filter((season: Record<string, unknown>) => Number(season.season_number) > 0)
      .sort((a: Record<string, unknown>, b: Record<string, unknown>) => Number(a.season_number) - Number(b.season_number));

    const seasonPayloads = await Promise.all(
      normalSeasons.map(async (season: Record<string, unknown>) => {
        const seasonNumber = Number(season.season_number);
        const payload = await tmdbFetch(`/tv/${encodeURIComponent(tmdbId)}/season/${seasonNumber}`);
        return {
          seasonNumber,
          seasonTitle: safeStr(payload?.name) || `Season ${seasonNumber}`,
          seasonPosterUrl: imageUrl(TMDB_POSTER_BASE, payload?.poster_path || season.poster_path),
          airDate: safeStr(payload?.air_date || season.air_date),
          episodes: Array.isArray(payload?.episodes) ? payload.episodes : [],
        };
      })
    );

    const rows = seasonPayloads.flatMap((season) =>
      season.episodes.map((episode: Record<string, unknown>) => {
        const episodeNumber = Number(episode.episode_number || 0);
        const episodeId = safeStr(episode.id);
        const episodeKey = `${tmdbId}:s${season.seasonNumber}:e${episodeNumber}`;
        return {
          EpisodeKey: episodeKey,
          ShowTMDB_ID: tmdbId,
          ShowTitle: safeStr(details?.name) || showTitle,
          SeasonNumber: String(season.seasonNumber),
          SeasonTitle: season.seasonTitle,
          SeasonPosterURL: season.seasonPosterUrl,
          EpisodeNumber: String(episodeNumber),
          EpisodeTMDB_ID: episodeId,
          EpisodeTitle: safeStr(episode.name) || `Episode ${episodeNumber}`,
          AirDate: safeStr(episode.air_date),
          StillURL: imageUrl(TMDB_STILL_BASE, episode.still_path),
          Overview: safeStr(episode.overview),
          Runtime: episode.runtime != null ? String(episode.runtime) : "",
          Watched: "",
          WatchedAt: "",
          UpdatedAt: new Date().toISOString(),
          Source: "TMDB",
        };
      })
    );

    return NextResponse.json({
      ok: true,
      tmdbId,
      title: safeStr(details?.name) || showTitle,
      rows,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "Failed to load TV episodes." },
      { status: 500 }
    );
  }
}
