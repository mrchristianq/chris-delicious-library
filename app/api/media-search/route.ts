import { NextRequest, NextResponse } from "next/server";

type SearchType = "book" | "book-audnexus" | "book-apple" | "book-hardcover" | "tv" | "movie" | "game";

type SearchResult = {
  id: string;
  title: string;
  subtitle?: string;
  year?: string;
  imageUrl?: string;
  data: Record<string, string>;
};

type GoogleBooksVolume = {
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
};

type IgdbGame = {
  id?: number;
  name?: string;
  slug?: string;
  first_release_date?: number;
  rating?: number;
  summary?: string;
  cover?: { url?: string };
  genres?: Array<{ name?: string }>;
  platforms?: Array<{ name?: string }>;
  involved_companies?: Array<{ company?: { name?: string } }>;
  screenshots?: Array<{ url?: string }>;
};

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";
const TMDB_BACKDROP_BASE = "https://image.tmdb.org/t/p/w1280";
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

let igdbTokenCache: { token: string; expiresAt: number } | null = null;

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function searchJson(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...(init?.headers || {}),
    },
  });
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
      backdropUrl: safeStr(item.backdrop_path) ? `${TMDB_BACKDROP_BASE}${safeStr(item.backdrop_path)}` : "",
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

async function discoverTmdbMovies(genreIds: string[] = []): Promise<SearchResult[]> {
  const bearerToken = pickEnv(["TMDB_BEARER_TOKEN", "TMDB_API_READ_ACCESS_TOKEN"]);
  const apiKey = pickEnv(["TMDB_API_KEY"]);
  if (!bearerToken && !apiKey) {
    throw new Error("TMDB credentials are not configured (TMDB_BEARER_TOKEN or TMDB_API_KEY).");
  }

  const now = new Date();
  const start = now.toISOString().slice(0, 10);
  const inSixMonths = new Date(now);
  inSixMonths.setMonth(inSixMonths.getMonth() + 6);
  const end = inSixMonths.toISOString().slice(0, 10);

  const buildUrl = (kind: "upcoming" | "discover") => {
    const params = new URLSearchParams({
      language: "en-US",
      page: "1",
      include_adult: "false",
    });
    if (!bearerToken) params.set("api_key", apiKey);

    if (kind === "upcoming") {
      return `https://api.themoviedb.org/3/movie/upcoming?${params.toString()}`;
    }

    params.set("sort_by", "popularity.desc");
    params.set("primary_release_date.gte", start);
    params.set("primary_release_date.lte", end);
    if (genreIds.length) params.set("with_genres", genreIds.join(","));
    return `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
  };

  const fetchList = async (kind: "upcoming" | "discover") => {
    const res = await fetch(buildUrl(kind), {
      method: "GET",
      headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => ({}))) as {
      results?: Array<{
        id?: number;
        title?: string;
        release_date?: string;
        poster_path?: string;
        backdrop_path?: string;
        vote_average?: number;
        overview?: string;
      }>;
    };
    if (!res.ok) return [];
    return Array.isArray(payload.results) ? payload.results : [];
  };

  const upcoming = await fetchList("upcoming");
  const discover = await fetchList("discover");
  const merged = [...upcoming, ...discover];
  const seen = new Set<string>();
  const deduped = merged.filter((item) => {
    const id = String(item.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return deduped.slice(0, 24).map((item) => {
    const tmdbId = String(item.id || "");
    const title = safeStr(item.title);
    const posterPath = safeStr(item.poster_path);
    const backdropPath = safeStr(item.backdrop_path);
    const imageUrl = posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : "";
    const backdropUrl = backdropPath ? `${TMDB_BACKDROP_BASE}${backdropPath}` : "";
    const releaseDate = safeStr(item.release_date);
    return {
      id: `movie:${tmdbId || title}`,
      title: title || "Untitled",
      year: releaseDate.slice(0, 4),
      imageUrl,
      data: {
        title: title || "Untitled",
        releaseDate,
        year: releaseDate.slice(0, 4),
        imageUrl,
        posterUrl: imageUrl,
        backdropUrl,
        tmdbId,
        tmdbRating: item.vote_average != null ? String(item.vote_average) : "",
        overview: safeStr(item.overview),
      },
    };
  });
}

async function discoverTmdbTvShows(genreIds: string[] = []): Promise<SearchResult[]> {
  const bearerToken = pickEnv(["TMDB_BEARER_TOKEN", "TMDB_API_READ_ACCESS_TOKEN"]);
  const apiKey = pickEnv(["TMDB_API_KEY"]);
  if (!bearerToken && !apiKey) {
    throw new Error("TMDB credentials are not configured (TMDB_BEARER_TOKEN or TMDB_API_KEY).");
  }

  const buildUrl = (kind: "on_the_air" | "discover") => {
    const params = new URLSearchParams({
      language: "en-US",
      page: "1",
      include_adult: "false",
    });
    if (!bearerToken) params.set("api_key", apiKey);

    if (kind === "on_the_air") {
      return `https://api.themoviedb.org/3/tv/on_the_air?${params.toString()}`;
    }

    params.set("sort_by", "popularity.desc");
    if (genreIds.length) params.set("with_genres", genreIds.join(","));
    return `https://api.themoviedb.org/3/discover/tv?${params.toString()}`;
  };

  const fetchList = async (kind: "on_the_air" | "discover") => {
    const res = await fetch(buildUrl(kind), {
      method: "GET",
      headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
      cache: "no-store",
    });
    const payload = (await res.json().catch(() => ({}))) as {
      results?: Array<{
        id?: number;
        name?: string;
        first_air_date?: string;
        poster_path?: string;
        backdrop_path?: string;
        vote_average?: number;
        overview?: string;
      }>;
    };
    if (!res.ok) return [];
    return Array.isArray(payload.results) ? payload.results : [];
  };

  const onTheAir = await fetchList("on_the_air");
  const discover = await fetchList("discover");
  const merged = [...onTheAir, ...discover];
  const seen = new Set<string>();
  const deduped = merged.filter((item) => {
    const id = String(item.id || "");
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return deduped.slice(0, 24).map((item) => {
    const tmdbId = String(item.id || "");
    const title = safeStr(item.name);
    const posterPath = safeStr(item.poster_path);
    const backdropPath = safeStr(item.backdrop_path);
    const imageUrl = posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : "";
    const backdropUrl = backdropPath ? `${TMDB_BACKDROP_BASE}${backdropPath}` : "";
    const firstAirDate = safeStr(item.first_air_date);
    return {
      id: `tv:${tmdbId || title}`,
      title: title || "Untitled",
      year: firstAirDate.slice(0, 4),
      imageUrl,
      data: {
        title: title || "Untitled",
        firstAirDate,
        releaseDate: firstAirDate,
        year: firstAirDate.slice(0, 4),
        imageUrl,
        posterUrl: imageUrl,
        backdropUrl,
        tmdbId,
        tmdbRating: item.vote_average != null ? String(item.vote_average) : "",
        overview: safeStr(item.overview),
      },
    };
  });
}

async function lookupTmdbById(type: "tv" | "movie", id: string): Promise<SearchResult | null> {
  const tmdbId = safeStr(id);
  if (!tmdbId) return null;

  const bearerToken = pickEnv(["TMDB_BEARER_TOKEN", "TMDB_API_READ_ACCESS_TOKEN"]);
  const apiKey = pickEnv(["TMDB_API_KEY"]);
  if (!bearerToken && !apiKey) {
    throw new Error("TMDB credentials are not configured (TMDB_BEARER_TOKEN or TMDB_API_KEY).");
  }

  const params = new URLSearchParams({ language: "en-US" });
  if (!bearerToken) {
    params.set("api_key", apiKey);
  }

  const res = await fetch(`https://api.themoviedb.org/3/${type}/${encodeURIComponent(tmdbId)}?${params.toString()}`, {
    method: "GET",
    headers: bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined,
    cache: "no-store",
  });

  if (res.status === 404) return null;

  const payload = (await res.json().catch(() => ({}))) as {
    id?: number;
    name?: string;
    title?: string;
    first_air_date?: string;
    release_date?: string;
    last_air_date?: string;
    number_of_seasons?: number;
    number_of_episodes?: number;
    status?: string;
    genres?: Array<{ id?: number; name?: string }>;
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    overview?: string;
    runtime?: number;
    status_message?: string;
  };

  if (!res.ok) {
    throw new Error(payload.status_message || "TMDB lookup failed.");
  }

  const title = safeStr(payload.name) || safeStr(payload.title);
  const date = safeStr(payload.first_air_date) || safeStr(payload.release_date);
  const year = date ? date.slice(0, 4) : "";
  const genres = Array.isArray(payload.genres)
    ? payload.genres.map((genre) => safeStr(genre?.name)).filter(Boolean).join(", ")
    : "";

  const data: Record<string, string> = {
    title,
    year,
    tmdbId: tmdbId,
    posterUrl: safeStr(payload.poster_path) ? `${TMDB_IMAGE_BASE}${safeStr(payload.poster_path)}` : "",
    backdropUrl: safeStr(payload.backdrop_path) ? `${TMDB_BACKDROP_BASE}${safeStr(payload.backdrop_path)}` : "",
    tmdbRating: payload.vote_average != null ? String(payload.vote_average) : "",
    overview: safeStr(payload.overview),
  };

  if (type === "tv") {
    data.firstAirDate = safeStr(payload.first_air_date);
    data.lastAirDate = safeStr(payload.last_air_date);
    data.numberOfSeasons = payload.number_of_seasons != null ? String(payload.number_of_seasons) : "";
    data.numberOfEpisodes = payload.number_of_episodes != null ? String(payload.number_of_episodes) : "";
    data.showStatus = safeStr(payload.status);
    data.genres = genres;
  } else {
    data.releaseDate = safeStr(payload.release_date);
    data.runtime = payload.runtime != null ? String(payload.runtime) : "";
    data.status = normalizeTmdbMovieStatus(safeStr(payload.status));
    data.genres = genres;
  }

  return {
    id: `${type}:${tmdbId}`,
    title,
    subtitle: date || undefined,
    year: year || undefined,
    imageUrl: data.posterUrl || undefined,
    data,
  };
}

type AudibleCatalogBook = {
  asin?: string;
  title?: string;
  subtitle?: string;
  authors?: Array<{ name?: string; asin?: string }>;
  narrators?: Array<{ name?: string; asin?: string }>;
  publisher_name?: string;
  release_date?: string;
  runtime_length_min?: number;
  product_images?: Record<string, string>;
  rating?: { overall_distribution?: { display_average_rating?: string | number } };
  category_ladders?: Array<{ ladder?: Array<{ name?: string }> }>;
  series?: Array<{ title?: string; sequence?: string | number }>;
};

type AudnexusBook = {
  asin?: string;
  authors?: Array<{ name?: string; asin?: string }>;
  copyright?: number;
  description?: string;
  formatType?: string;
  genres?: Array<{ name?: string; type?: string }>;
  image?: string;
  isbn?: string;
  language?: string;
  literatureType?: string;
  narrators?: Array<{ name?: string; asin?: string }>;
  publisherName?: string;
  rating?: string | number;
  releaseDate?: string;
  runtimeLengthMin?: number;
  series?: Array<{ name?: string; position?: string | number }>;
  subtitle?: string;
  summary?: string;
  title?: string;
};

type HardcoverSearchDocument = {
  id?: string | number;
  title?: string;
  description?: string;
  pages?: number;
  release_date?: string;
  image?: { url?: string };
  author_names?: string[];
  genres?: string[];
  isbns?: string[];
};

function stripHtml(value: string): string {
  return safeStr(value)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function formatAudiobookDurationFromMinutes(minutes: number | null | undefined): string {
  if (!minutes || !Number.isFinite(minutes) || minutes <= 0) return "";
  const total = Math.round(minutes);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours <= 0) return `${mins}m`;
  if (mins <= 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function formatAudnexusReleaseDate(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  return raw;
}

function buildAudnexusSeriesLabel(series: AudnexusBook["series"] | AudibleCatalogBook["series"]): string {
  if (!Array.isArray(series)) return "";
  return series
    .map((entry) => {
      const seriesEntry = entry as { name?: string; title?: string; position?: string | number; sequence?: string | number };
      const name = safeStr(seriesEntry.name || seriesEntry.title);
      if (!name) return "";
      const position = safeStr(seriesEntry.position || seriesEntry.sequence);
      return position ? `${name} #${position}` : name;
    })
    .filter(Boolean)
    .join(", ");
}

function buildAudibleCatalogGenre(item: AudibleCatalogBook): string {
  const names = new Set<string>();
  for (const ladder of item.category_ladders || []) {
    for (const node of ladder.ladder || []) {
      const name = safeStr(node.name);
      if (name) names.add(name);
    }
  }
  return Array.from(names).slice(0, 6).join(", ");
}

function pickAudibleImage(item: AudibleCatalogBook): string {
  const images = item.product_images || {};
  return safeStr(
    images["500"] ||
    images["480"] ||
    images["882"] ||
    images["252"] ||
    images["1215"] ||
    Object.values(images).find(Boolean)
  );
}

function mapAudibleCatalogBookToResult(item: AudibleCatalogBook): SearchResult {
  const title = safeStr(item.title);
  const subtitle = safeStr(item.subtitle);
  const asin = safeStr(item.asin);
  const author = (item.authors || []).map((person) => safeStr(person.name)).filter(Boolean).join(", ");
  const narrator = (item.narrators || []).map((person) => safeStr(person.name)).filter(Boolean).join(", ");
  const releaseDate = formatAudnexusReleaseDate(item.release_date);
  const year = releaseDate.slice(0, 4);
  const imageUrl = pickAudibleImage(item);
  const runtime = formatAudiobookDurationFromMinutes(item.runtime_length_min);
  return {
    id: `book-audnexus:${asin || title}`,
    title,
    subtitle: [author, narrator ? `Narrated by ${narrator}` : ""].filter(Boolean).join(" · ") || undefined,
    year: year || undefined,
    imageUrl: imageUrl || undefined,
    data: {
      title,
      subtitle,
      author,
      narrator,
      publisher: safeStr(item.publisher_name),
      releaseDate,
      imageUrl,
      genre: buildAudibleCatalogGenre(item),
      audiobookDuration: runtime,
      userRating: item.rating?.overall_distribution?.display_average_rating != null
        ? String(item.rating.overall_distribution.display_average_rating)
        : "",
      series: buildAudnexusSeriesLabel(item.series),
      type: "Audiobook",
      audibleAsin: asin,
      audnexusAsin: asin,
      editionFormat: "Audiobook",
    },
  };
}

function mapAudnexusBookToResult(item: AudnexusBook): SearchResult {
  const asin = safeStr(item.asin);
  const title = safeStr(item.title);
  const subtitle = safeStr(item.subtitle);
  const author = (item.authors || []).map((person) => safeStr(person.name)).filter(Boolean).join(", ");
  const narrator = (item.narrators || []).map((person) => safeStr(person.name)).filter(Boolean).join(", ");
  const releaseDate = formatAudnexusReleaseDate(item.releaseDate);
  const year = releaseDate.slice(0, 4);
  const imageUrl = safeStr(item.image);
  const genre = (item.genres || [])
    .map((genreItem) => safeStr(genreItem.name))
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");
  const runtime = formatAudiobookDurationFromMinutes(item.runtimeLengthMin);
  const seriesLabel = buildAudnexusSeriesLabel(item.series);
  return {
    id: `book-audnexus-edition:${asin || title}`,
    title,
    subtitle: [author, narrator ? `Narrated by ${narrator}` : ""].filter(Boolean).join(" · ") || undefined,
    year: year || undefined,
    imageUrl: imageUrl || undefined,
    data: {
      title,
      subtitle,
      author,
      narrator,
      publisher: safeStr(item.publisherName),
      releaseDate,
      description: stripHtml(safeStr(item.summary) || safeStr(item.description)),
      genre,
      imageUrl,
      isbn: safeStr(item.isbn),
      audiobookDuration: runtime,
      userRating: item.rating != null ? String(item.rating) : "",
      type: "Audiobook",
      series: seriesLabel,
      audibleAsin: asin,
      audnexusAsin: asin,
      editionFormat: item.formatType ? `Audiobook (${safeStr(item.formatType)})` : "Audiobook",
      language: safeStr(item.language),
      literatureType: safeStr(item.literatureType),
    },
  };
}

async function lookupAudnexusBook(asin: string): Promise<SearchResult | null> {
  const cleanAsin = safeStr(asin);
  if (!cleanAsin) return null;
  const params = new URLSearchParams({ region: "us" });
  const res = await fetch(`https://api.audnex.us/books/${encodeURIComponent(cleanAsin)}?${params.toString()}`, {
    cache: "no-store",
  });
  const payload = (await res.json().catch(() => ({}))) as AudnexusBook & { error?: { message?: string }; message?: string };
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(payload.error?.message || payload.message || "Audnexus book lookup failed.");
  return mapAudnexusBookToResult(payload);
}

async function searchAudnexusAudiobooks(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    keywords: query,
    response_groups: "contributors,product_attrs,product_desc,media,product_extended_attrs,rating,series,category_ladders",
    num_results: "10",
    sort_by: "Relevance",
  });
  const res = await fetch(`https://api.audible.com/1.0/catalog/products?${params.toString()}`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const payload = (await res.json().catch(() => ({}))) as { products?: AudibleCatalogBook[]; message?: string };
  if (!res.ok) throw new Error(payload.message || "Audnexus audiobook search failed.");
  const list = Array.isArray(payload.products) ? payload.products : [];
  const seen = new Set<string>();
  return list
    .filter((item) => {
      const asin = safeStr(item.asin);
      const title = safeStr(item.title);
      const key = asin || title.toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8)
    .map(mapAudibleCatalogBookToResult);
}

async function searchHardcover(query: string, bookFormat: string): Promise<SearchResult[]> {
  const apiKey = pickEnv(["HARDCOVER_API_KEY"]);
  if (!apiKey) throw new Error("Hardcover API key not configured (HARDCOVER_API_KEY).");

  const gqlQuery = `{ search(query: ${JSON.stringify(query)}, query_type: "Book", per_page: 8) { results } }`;

  const res = await fetch("https://api.hardcover.app/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query: gqlQuery }),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    data?: { search?: { results?: { hits?: Array<{ document?: HardcoverSearchDocument }> } } };
    errors?: Array<{ message?: string }>;
  };

  if (!res.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || "Hardcover search failed.");
  }

  const hits = payload.data?.search?.results?.hits ?? [];
  return hits.map(({ document: doc = {} }) => {
    const title = safeStr(doc.title);
    const author = Array.isArray(doc.author_names) ? doc.author_names.filter(Boolean).join(", ") : "";
    const genre = Array.isArray(doc.genres) ? doc.genres.slice(0, 4).join(", ") : "";
    const image = safeStr(doc.image?.url);
    const releaseDate = safeStr(doc.release_date);
    const year = releaseDate ? releaseDate.slice(0, 4) : "";
    const hardcoverBookId = safeStr(doc.id);
    return {
      id: `book-hardcover:${hardcoverBookId || title}`,
      title,
      subtitle: author || undefined,
      year: year || undefined,
      imageUrl: image || undefined,
      data: { title, author, description: safeStr(doc.description), genre, releaseDate, imageUrl: image, hardcoverBookId },
    };
  });
}

type HardcoverEdition = {
  id?: number;
  isbn_13?: string | null;
  isbn_10?: string | null;
  pages?: number | null;
  release_date?: string | null;
  edition_format?: string | null;
  audio_seconds?: number | null;
  subtitle?: string | null;
  image?: { url?: string } | null;
  publisher?: { name?: string } | null;
  book?: {
    subtitle?: string | null;
    rating?: number | null;
    book_series?: Array<{ position?: number | null; series?: { name?: string | null } | null }> | null;
  } | null;
};

function deriveBookTypeFromFormat(format: string): string {
  const fmt = safeStr(format).toLowerCase();
  if (!fmt) return "";
  if (fmt.includes("audio")) return "Audiobook";
  if (fmt.includes("hardcover") || fmt.includes("hardback")) return "Hardcover";
  if (fmt.includes("paperback") || fmt.includes("mass market")) return "Paperback";
  if (fmt.includes("ebook") || fmt.includes("kindle") || fmt.includes("digital")) return "eBook";
  return "Book";
}

function formatAudioDurationFromSeconds(seconds: number | null | undefined): string {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function buildHardcoverSeriesLabel(
  bookSeries: HardcoverEdition["book"] extends infer T ? (T extends { book_series?: infer S } ? S : never) : never
): string {
  if (!Array.isArray(bookSeries) || bookSeries.length === 0) return "";
  return bookSeries
    .map((entry) => {
      const name = safeStr(entry?.series?.name);
      if (!name) return "";
      const pos = entry?.position;
      return pos != null && Number.isFinite(pos) ? `${name} #${pos}` : name;
    })
    .filter(Boolean)
    .join(", ");
}

async function lookupHardcoverEditions(bookId: string, _bookFormat: string): Promise<SearchResult[]> {
  const apiKey = pickEnv(["HARDCOVER_API_KEY"]);
  if (!apiKey) throw new Error("Hardcover API key not configured (HARDCOVER_API_KEY).");

  const numericId = parseInt(bookId, 10);
  if (!Number.isFinite(numericId)) throw new Error("Invalid Hardcover book ID.");

  const gqlQuery = `{ editions(where: {book_id: {_eq: ${numericId}}}, limit: 40, order_by: {users_count: desc_nulls_last}) { id isbn_13 isbn_10 pages release_date edition_format audio_seconds subtitle image { url } publisher { name } book { subtitle rating book_series { position series { name } } } } }`;

  const res = await fetch("https://api.hardcover.app/v1/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ query: gqlQuery }),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    data?: { editions?: HardcoverEdition[] };
    errors?: Array<{ message?: string }>;
  };

  if (!res.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || "Hardcover editions fetch failed.");
  }

  const editions = Array.isArray(payload.data?.editions) ? payload.data!.editions : [];
  return editions.map((ed) => {
    const format = safeStr(ed.edition_format) || "Unknown";
    const formatLower = format.toLowerCase();
    const isAudio = formatLower.includes("audio");
    const isbn = safeStr(ed.isbn_13 || ed.isbn_10);
    const image = safeStr(ed.image?.url);
    const publisher = safeStr(ed.publisher?.name);
    const releaseDate = safeStr(ed.release_date);
    const year = releaseDate ? releaseDate.slice(0, 4) : "";
    const pages = !isAudio && ed.pages != null ? String(ed.pages) : "";
    const audiobookDuration = isAudio ? formatAudioDurationFromSeconds(ed.audio_seconds) : "";
    const subtitle = safeStr(ed.subtitle) || safeStr(ed.book?.subtitle);
    const seriesLabel = buildHardcoverSeriesLabel(ed.book?.book_series ?? []);
    const userRating =
      ed.book?.rating != null && Number.isFinite(ed.book.rating)
        ? String(Math.round(ed.book.rating * 10) / 10)
        : "";
    const derivedType = deriveBookTypeFromFormat(format);
    const label = [format, publisher, year].filter(Boolean).join(" · ");
    return {
      id: `book-hardcover-edition:${String(ed.id)}`,
      title: format,
      subtitle: label,
      year: year || undefined,
      imageUrl: image || undefined,
      data: {
        imageUrl: image,
        isbn,
        releaseDate,
        ...(pages ? { pages } : {}),
        ...(audiobookDuration ? { audiobookDuration } : {}),
        ...(subtitle ? { subtitle } : {}),
        ...(seriesLabel ? { series: seriesLabel } : {}),
        ...(userRating ? { userRating } : {}),
        ...(derivedType ? { type: derivedType } : {}),
        editionFormat: format,
        publisher,
      },
    };
  });
}

function mapGoogleBookVolumeToResult(item: GoogleBooksVolume): SearchResult {
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
    items?: GoogleBooksVolume[];
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || "Google Books search failed.");
  }

  const list = Array.isArray(payload.items) ? payload.items : [];
  return list.map((item) => mapGoogleBookVolumeToResult(item));
}

async function lookupGoogleBookById(volumeId: string): Promise<SearchResult | null> {
  const id = safeStr(volumeId);
  if (!id) return null;

  const apiKey = pickEnv(["GOOGLE_BOOKS_API_KEY"]);
  const params = new URLSearchParams();
  if (apiKey) {
    params.set("key", apiKey);
  }

  const endpoint = `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(id)}${params.size ? `?${params.toString()}` : ""}`;
  const res = await fetch(endpoint, {
    method: "GET",
    cache: "no-store",
  });

  if (res.status === 404) return null;

  const payload = (await res.json().catch(() => ({}))) as GoogleBooksVolume & {
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(payload.error?.message || "Google Books lookup failed.");
  }

  return mapGoogleBookVolumeToResult(payload);
}

function normalizeIgdbScreenshotUrl(url: string): string {
  const normalized = safeStr(url);
  if (!normalized) return "";
  const https = normalized.startsWith("//") ? `https:${normalized}` : normalized;
  // Bump every legacy size to a 1080p screenshot so heroes render sharp.
  return https
    .replace("/t_thumb/", "/t_1080p/")
    .replace("/t_screenshot_med/", "/t_1080p/")
    .replace("/t_screenshot_big/", "/t_1080p/")
    .replace("/t_screenshot_huge/", "/t_1080p/")
    .replace("/t_720p/", "/t_1080p/");
}

function normalizeIgdbCoverUrl(url: string): string {
  const normalized = safeStr(url);
  if (!normalized) return "";
  const https = normalized.startsWith("//") ? `https:${normalized}` : normalized;
  return https.replace("/t_thumb/", "/t_cover_big/");
}

function mapIgdbGameToResult(item: IgdbGame): SearchResult {
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
  const screenshotUrls = Array.isArray(item.screenshots)
    ? item.screenshots
        .map((s) => normalizeIgdbScreenshotUrl(safeStr(s?.url)))
        .filter(Boolean)
    : [];
  const screenshotsUrl = screenshotUrls.join(", ");

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
      igdbSlug: safeStr(item.slug),
      externalUrl: safeStr(item.slug) ? `https://www.igdb.com/games/${encodeURIComponent(safeStr(item.slug))}` : "",
      igdbRating: item.rating != null ? String(item.rating) : "",
      genres: genres.join(", "),
      developer: developers[0] || "",
      description: safeStr(item.summary),
      coverUrl,
      screenshotsUrl,
    },
  };
}

async function searchIgdb(query: string): Promise<SearchResult[]> {
  const clientId = pickEnv(["IGDB_CLIENT_ID", "TWITCH_CLIENT_ID"]);
  if (!clientId) {
    throw new Error("IGDB client id is not configured (IGDB_CLIENT_ID or TWITCH_CLIENT_ID).");
  }
  const token = await getIgdbAccessToken();

  const body = `search \"${query.replace(/\"/g, "") }\"; fields id,name,slug,first_release_date,rating,summary,cover.url,screenshots.url,genres.name,platforms.name,involved_companies.company.name; limit 8;`;

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

  const payload = (await res.json().catch(() => [])) as IgdbGame[];

  if (!res.ok || !Array.isArray(payload)) {
    throw new Error("IGDB search failed.");
  }

  return payload.map((item) => mapIgdbGameToResult(item));
}

async function discoverIgdbGames(genreIds: string[] = []): Promise<SearchResult[]> {
  const clientId = pickEnv(["IGDB_CLIENT_ID", "TWITCH_CLIENT_ID"]);
  if (!clientId) {
    throw new Error("IGDB client id is not configured (IGDB_CLIENT_ID or TWITCH_CLIENT_ID).");
  }
  const token = await getIgdbAccessToken();
  const now = Math.floor(Date.now() / 1000);
  const recentFloor = now - 365 * 24 * 60 * 60;
  const upcomingCeiling = now + 365 * 24 * 60 * 60;
  const fields = "fields id,name,slug,first_release_date,rating,summary,cover.url,screenshots.url,genres.name,platforms.name,involved_companies.company.name;";
  const genreFilter = genreIds.length ? ` & genres = (${genreIds.join(",")})` : "";
  const bodies = [
    `${fields} where cover != null & first_release_date >= ${now} & first_release_date <= ${upcomingCeiling}${genreFilter}; sort hypes desc; limit 18;`,
    `${fields} where cover != null & first_release_date <= ${now} & first_release_date >= ${recentFloor}${genreFilter}; sort total_rating_count desc; limit 18;`,
    `${fields} where cover != null & first_release_date <= ${now}${genreFilter}; sort rating desc; limit 18;`,
  ];

  const responses = await Promise.all(
    bodies.map(async (body) => {
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
      const payload = (await res.json().catch(() => [])) as IgdbGame[];
      if (!res.ok || !Array.isArray(payload)) {
        throw new Error("IGDB discovery failed.");
      }
      return payload;
    })
  );

  const byId = new Map<string, IgdbGame>();
  responses.flat().forEach((item) => {
    const key = String(item.id || safeStr(item.name));
    if (key && !byId.has(key)) byId.set(key, item);
  });
  return Array.from(byId.values()).slice(0, 20).map((item) => mapIgdbGameToResult(item));
}

async function lookupIgdbById(id: string): Promise<SearchResult | null> {
  const normalizedId = safeStr(id);
  if (!normalizedId || !/^\d+$/.test(normalizedId)) return null;

  const clientId = pickEnv(["IGDB_CLIENT_ID", "TWITCH_CLIENT_ID"]);
  if (!clientId) {
    throw new Error("IGDB client id is not configured (IGDB_CLIENT_ID or TWITCH_CLIENT_ID).");
  }
  const token = await getIgdbAccessToken();
  const body =
    `where id = ${normalizedId}; ` +
    "fields id,name,slug,first_release_date,rating,summary,cover.url,screenshots.url,genres.name,platforms.name,involved_companies.company.name; " +
    "limit 1;";

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

  const payload = (await res.json().catch(() => [])) as IgdbGame[];
  if (!res.ok || !Array.isArray(payload)) {
    throw new Error("IGDB lookup failed.");
  }

  const first = payload[0];
  if (!first) return null;
  return mapIgdbGameToResult(first);
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = safeStr(searchParams.get("type")) as SearchType;
  const query = safeStr(searchParams.get("query"));
  const lookupId = safeStr(searchParams.get("lookupId"));
  const bookFormat = safeStr(searchParams.get("bookFormat"));
  const mode = safeStr(searchParams.get("mode"));
  const genreIds = safeStr(searchParams.get("genreIds"))
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d+$/.test(value));

  if (!query && !lookupId && mode !== "discover") {
    return searchJson({ ok: false, error: "Missing query or lookupId." }, { status: 400 });
  }

  if (!["book", "book-audnexus", "book-apple", "book-hardcover", "tv", "movie", "game"].includes(type)) {
    return searchJson({ ok: false, error: "Invalid media type." }, { status: 400 });
  }

  try {
    if (mode === "discover" && type === "game") {
      const results = await discoverIgdbGames(genreIds);
      return searchJson({ ok: true, results });
    }

    if (mode === "discover" && type === "movie") {
      const results = await discoverTmdbMovies(genreIds);
      return searchJson({ ok: true, results });
    }

    if (mode === "discover" && type === "tv") {
      const results = await discoverTmdbTvShows(genreIds);
      return searchJson({ ok: true, results });
    }

    if (lookupId) {
      if (type === "book-hardcover") {
        const editions = await lookupHardcoverEditions(lookupId, bookFormat);
        return searchJson({ ok: true, results: editions });
      }
      if (type === "book-audnexus" || type === "book-apple") {
        const audiobook = await lookupAudnexusBook(lookupId);
        return searchJson({ ok: true, results: audiobook ? [audiobook] : [] });
      }
      const lookupResult =
        type === "book"
          ? await lookupGoogleBookById(lookupId)
          : type === "tv"
            ? await lookupTmdbById("tv", lookupId)
            : type === "movie"
              ? await lookupTmdbById("movie", lookupId)
              : await lookupIgdbById(lookupId);

      if (lookupResult) {
        return searchJson({ ok: true, results: [lookupResult] });
      }
      if (!query) {
        return searchJson({ ok: true, results: [] });
      }
    }

    const results =
      type === "book"
        ? await searchGoogleBooks(query)
        : type === "book-audnexus" || type === "book-apple"
          ? await searchAudnexusAudiobooks(query)
          : type === "book-hardcover"
            ? await searchHardcover(query, bookFormat)
            : type === "tv"
              ? await searchTmdb("tv", query)
              : type === "movie"
                ? await searchTmdb("movie", query)
                : await searchIgdb(query);

    return searchJson({ ok: true, results });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Search failed.";
    return searchJson({ ok: false, error: message }, { status: 502 });
  }
}
