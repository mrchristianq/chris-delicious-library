import { NextRequest, NextResponse } from "next/server";

type SearchType = "book" | "tv" | "movie" | "game";

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  year?: string;
  imageUrl?: string;
  data: Record<string, string>;
};

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

let igdbTokenCache: { token: string; expiresAt: number } | null = null;

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function normalizeTmdbMovieStatus(value: string): string {
  const normalized = safeStr(value).toLowerCase();
  if (!normalized) return "";
  if (normalized === "released") return "Released";
  if (normalized === "in production" || normalized === "post production") return "In Production";
  if (normalized === "canceled" || normalized === "cancelled") return "Canceled";
  if (normalized === "planned" || normalized === "rumored") return "Upcoming";
  return safeStr(value);
}

function pickEnv(keys: string[]): string {
  for (const key of keys) {
    const value = safeStr(process.env[key]);
    if (value) return value;
  }
  return "";
}

async function getIgdbAccessToken(): Promise<string> {
  const now = Date.now();
  if (igdbTokenCache && igdbTokenCache.expiresAt > now + 30_000) {
    return igdbTokenCache.token;
  }

  const clientId = pickEnv(["IGDB_CLIENT_ID", "TWITCH_CLIENT_ID"]);
  const clientSecret = pickEnv(["IGDB_CLIENT_SECRET", "TWITCH_CLIENT_SECRET"]);
  if (!clientId || !clientSecret) {
    throw new Error("IGDB credentials are not configured (IGDB_CLIENT_ID/TWITCH_CLIENT_ID and IGDB_CLIENT_SECRET/TWITCH_CLIENT_SECRET).");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });

  const res = await fetch(`https://id.twitch.tv/oauth2/token?${params.toString()}`, {
    method: "POST",
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    message?: string;
  };

  const token = safeStr(payload.access_token);
  if (!res.ok || !token) {
    throw new Error(payload.message || "Failed to authenticate with Twitch/IGDB.");
  }

  const expiresInSec = Math.max(60, Number(payload.expires_in || 3600));
  igdbTokenCache = {
    token,
    expiresAt: now + expiresInSec * 1000,
  };
  return token;
}

async function searchTmdb(type: "tv" | "movie", query: string): Promise<SearchResult[]> {
  const bearerToken = pickEnv(["TMDB_BEARER_TOKEN", "TMDB_API_READ_ACCESS_TOKEN"]);
  const apiKey = pickEnv(["TMDB_API_KEY"]);
  if (!bearerToken && !apiKey) {
    throw new Error("TMDB credentials are not configured (TMDB_BEARER_TOKEN or TMDB_API_KEY).");
  }

  const params = new URLSearchParams({
    query,
    include_adult: "false",
    language: "en-US",
    page: "1",
  });

  if (!bearerToken) {
    params.set("api_key", apiKey);
  }

  const res = await fetch(`https://api.themoviedb.org/3/search/${type}?${params.toString()}`, {
    method: "GET",
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    results?: Array<{
      id?: number;
      name?: string;
      title?: string;
      first_air_date?: string;
      release_date?: string;
      poster_path?: string;
      backdrop_path?: string;
      vote_average?: number;
      overview?: string;
      popularity?: number;
    }>;
    status_message?: string;
  };

  if (!res.ok) {
    throw new Error(payload.status_message || "TMDB search failed.");
  }

  const list = Array.isArray(payload.results) ? payload.results : [];
  const topResults = list.slice(0, 8);

  let tvDetailsById: Record<
    string,
    { lastAirDate: string; numberOfSeasons: string; numberOfEpisodes: string; showStatus: string; genres: string }
  > = {};
  let movieDetailsById: Record<string, { runtime: string; status: string; genres: string }> = {};
  if (type === "tv") {
    const detailPairs = await Promise.all(
      topResults.map(async (item) => {
        const tmdbId = String(item.id || "");
        if (!tmdbId) return null;

        const detailParams = new URLSearchParams({ language: "en-US" });
        if (!bearerToken) {
          detailParams.set("api_key", apiKey);
        }

        const detailRes = await fetch(
          `https://api.themoviedb.org/3/tv/${tmdbId}?${detailParams.toString()}`,
          {
            method: "GET",
            headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
            cache: "no-store",
          }
        );

        if (!detailRes.ok) return null;

        const detailPayload = (await detailRes.json().catch(() => ({}))) as {
          last_air_date?: string;
          number_of_seasons?: number;
          number_of_episodes?: number;
          status?: string;
          genres?: Array<{ id?: number; name?: string }>;
        };

        return [
          tmdbId,
          {
            lastAirDate: safeStr(detailPayload.last_air_date),
            numberOfSeasons:
              detailPayload.number_of_seasons != null ? String(detailPayload.number_of_seasons) : "",
            numberOfEpisodes:
              detailPayload.number_of_episodes != null ? String(detailPayload.number_of_episodes) : "",
            showStatus: safeStr(detailPayload.status),
            genres: Array.isArray(detailPayload.genres)
              ? detailPayload.genres.map((genre) => safeStr(genre?.name)).filter(Boolean).join(", ")
              : "",
          },
        ] as const;
      })
    );

    tvDetailsById = Object.fromEntries(detailPairs.filter(Boolean) as Array<
      readonly [
        string,
        { lastAirDate: string; numberOfSeasons: string; numberOfEpisodes: string; showStatus: string; genres: string }
      ]
    >);
  } else if (type === "movie") {
    const detailPairs = await Promise.all(
      topResults.map(async (item) => {
        const tmdbId = String(item.id || "");
        if (!tmdbId) return null;

        const detailParams = new URLSearchParams({ language: "en-US" });
        if (!bearerToken) {
          detailParams.set("api_key", apiKey);
        }

        const detailRes = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}?${detailParams.toString()}`,
          {
            method: "GET",
            headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
            cache: "no-store",
          }
        );

        if (!detailRes.ok) return null;

        const detailPayload = (await detailRes.json().catch(() => ({}))) as {
          runtime?: number;
          status?: string;
          genres?: Array<{ id?: number; name?: string }>;
        };

        return [
          tmdbId,
          {
            runtime: detailPayload.runtime != null ? String(detailPayload.runtime) : "",
            status: normalizeTmdbMovieStatus(safeStr(detailPayload.status)),
            genres: Array.isArray(detailPayload.genres)
              ? detailPayload.genres.map((genre) => safeStr(genre?.name)).filter(Boolean).join(", ")
              : "",
          },
        ] as const;
      })
    );

    movieDetailsById = Object.fromEntries(detailPairs.filter(Boolean) as Array<
      readonly [string, { runtime: string; status: string; genres: string }]
    >);
  }

  return topResults.map((item) => {
    const title = safeStr(item.name) || safeStr(item.title);
    const date = safeStr(item.first_air_date) || safeStr(item.release_date);
    const year = date ? date.slice(0, 4) : "";
    const tmdbId = String(item.id || "");
    const tvDetails = type === "tv" ? tvDetailsById[tmdbId] : null;
    const movieDetails = type === "movie" ? movieDetailsById[tmdbId] : null;
    const data: Record<string, string> = {
      title,
      year,
      tmdbId,
      posterUrl: safeStr(item.poster_path) ? `${TMDB_IMAGE_BASE}${safeStr(item.poster_path)}` : "",
      backdropUrl: safeStr(item.backdrop_path) ? `${TMDB_IMAGE_BASE}${safeStr(item.backdrop_path)}` : "",
      tmdbRating: item.vote_average != null ? String(item.vote_average) : "",
      overview: safeStr(item.overview),
    };
    if (type === "tv") {
      data.firstAirDate = safeStr(item.first_air_date);
      data.lastAirDate = tvDetails?.lastAirDate || "";
      data.numberOfSeasons = tvDetails?.numberOfSeasons || "";
      data.numberOfEpisodes = tvDetails?.numberOfEpisodes || "";
      data.showStatus = tvDetails?.showStatus || "";
      data.genres = tvDetails?.genres || "";
    } else {
      data.releaseDate = safeStr(item.release_date);
      data.runtime = movieDetails?.runtime || "";
      data.status = movieDetails?.status || "";
      data.genres = movieDetails?.genres || "";
    }

    return {
      id: `${type}:${tmdbId || title}`,
      title,
      subtitle: date || undefined,
      year: year || undefined,
      imageUrl: safeStr(item.poster_path) ? `${TMDB_IMAGE_BASE}${safeStr(item.poster_path)}` : undefined,
      data,
    };
  });
}

async function searchGoogleBooks(query: string): Promise<SearchResult[]> {
  const apiKey = pickEnv(["GOOGLE_BOOKS_API_KEY"]);
  const params = new URLSearchParams({
    q: query,
    maxResults: "8",
    printType: "books",
  });
  if (apiKey) {
    params.set("key", apiKey);
  }

  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    items?: Array<{
      id?: string;
      volumeInfo?: {
        title?: string;
        subtitle?: string;
        authors?: string[];
        publishedDate?: string;
        description?: string;
        categories?: string[];
        pageCount?: number;
        imageLinks?: {
          thumbnail?: string;
          smallThumbnail?: string;
        };
        industryIdentifiers?: Array<{ type?: string; identifier?: string }>;
      };
    }>;
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || "Google Books search failed.");
  }

  const list = Array.isArray(payload.items) ? payload.items : [];
  return list.map((item) => {
    const info = item.volumeInfo || {};
    const title = safeStr(info.title);
    const subtitle = safeStr(info.subtitle);
    const authors = Array.isArray(info.authors) ? info.authors.filter(Boolean).join(", ") : "";
    const publishedDate = safeStr(info.publishedDate);
    const year = publishedDate ? publishedDate.slice(0, 4) : "";
    const categories = Array.isArray(info.categories) ? info.categories.filter(Boolean).join(", ") : "";
    const image = safeStr(info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail).replace("http://", "https://");
    const identifiers = Array.isArray(info.industryIdentifiers) ? info.industryIdentifiers : [];
    const isbn13 = safeStr(identifiers.find((entry) => safeStr(entry.type) === "ISBN_13")?.identifier);
    const isbn10 = safeStr(identifiers.find((entry) => safeStr(entry.type) === "ISBN_10")?.identifier);
    const isbn = isbn13 || isbn10;

    return {
      id: `book:${safeStr(item.id) || title}`,
      title,
      subtitle: authors || subtitle || undefined,
      year: year || undefined,
      imageUrl: image || undefined,
      data: {
        title,
        subtitle,
        author: authors,
        releaseDate: publishedDate,
        description: safeStr(info.description),
        genre: categories,
        pages: info.pageCount != null ? String(info.pageCount) : "",
        imageUrl: image,
        isbn,
        googleBooksVolumeId: safeStr(item.id),
      },
    };
  });
}

function normalizeIgdbCoverUrl(url: string): string {
  const normalized = safeStr(url);
  if (!normalized) return "";
  const https = normalized.startsWith("//") ? `https:${normalized}` : normalized;
  return https.replace("/t_thumb/", "/t_cover_big/");
}

async function searchIgdb(query: string): Promise<SearchResult[]> {
  const clientId = pickEnv(["IGDB_CLIENT_ID", "TWITCH_CLIENT_ID"]);
  if (!clientId) {
    throw new Error("IGDB client id is not configured (IGDB_CLIENT_ID or TWITCH_CLIENT_ID).");
  }
  const token = await getIgdbAccessToken();

  const body = `search \"${query.replace(/\"/g, "") }\"; fields id,name,first_release_date,rating,summary,cover.url,genres.name,platforms.name,involved_companies.company.name; limit 8;`;

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => [])) as Array<{
    id?: number;
    name?: string;
    first_release_date?: number;
    rating?: number;
    summary?: string;
    cover?: { url?: string };
    genres?: Array<{ name?: string }>;
    platforms?: Array<{ name?: string }>;
    involved_companies?: Array<{ company?: { name?: string } }>;
  }>;

  if (!res.ok || !Array.isArray(payload)) {
    throw new Error("IGDB search failed.");
  }

  return payload.map((item) => {
    const title = safeStr(item.name);
    const date = item.first_release_date ? new Date(item.first_release_date * 1000).toISOString().slice(0, 10) : "";
    const year = date ? date.slice(0, 4) : "";
    const platforms = Array.isArray(item.platforms)
      ? item.platforms.map((entry) => safeStr(entry.name)).filter(Boolean)
      : [];
    const genres = Array.isArray(item.genres)
      ? item.genres.map((entry) => safeStr(entry.name)).filter(Boolean)
      : [];
    const developers = Array.isArray(item.involved_companies)
      ? item.involved_companies
          .map((entry) => safeStr(entry.company?.name))
          .filter(Boolean)
      : [];
    const coverUrl = normalizeIgdbCoverUrl(safeStr(item.cover?.url));

    return {
      id: `game:${String(item.id || title)}`,
      title,
      subtitle: platforms.join(", ") || undefined,
      year: year || undefined,
      imageUrl: coverUrl || undefined,
      data: {
        title,
        releaseDate: date,
        platform: platforms[0] || "",
        platforms: platforms.join(", "),
        igdbId: item.id != null ? String(item.id) : "",
        igdbRating: item.rating != null ? String(item.rating) : "",
        genres: genres.join(", "),
        developer: developers[0] || "",
        description: safeStr(item.summary),
        coverUrl,
      },
    };
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = safeStr(searchParams.get("type")) as SearchType;
  const query = safeStr(searchParams.get("query"));

  if (!query) {
    return NextResponse.json({ ok: false, error: "Missing query." }, { status: 400 });
  }

  if (!["book", "tv", "movie", "game"].includes(type)) {
    return NextResponse.json({ ok: false, error: "Invalid media type." }, { status: 400 });
  }

  try {
    const results =
      type === "book"
        ? await searchGoogleBooks(query)
        : type === "tv"
          ? await searchTmdb("tv", query)
          : type === "movie"
            ? await searchTmdb("movie", query)
            : await searchIgdb(query);

    return NextResponse.json({ ok: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
