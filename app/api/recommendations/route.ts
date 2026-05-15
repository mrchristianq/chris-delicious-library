import { NextRequest, NextResponse } from "next/server";

type MediaType = "movie" | "tv" | "game" | "book";

type RecommendationCard = {
  id: string;
  source: "tmdb" | "igdb" | "hardcover";
  mediaType: MediaType;
  title: string;
  year?: string;
  releaseDate?: string;
  imageUrl?: string;
  rating?: string;
  genres?: string[];
  platforms?: string[];
  overview?: string;
  subtitle?: string;
  author?: string;
  isbn13?: string;
  inLibrary: boolean;
  __isRecommendation: true;
  __recommendationSource: "tmdb" | "igdb" | "hardcover";
};

type RequestBody = {
  mediaType?: MediaType;
  item?: Record<string, unknown>;
  libraryIds?: {
    movieTmdbIds?: string[];
    tvTmdbIds?: string[];
    gameIgdbIds?: string[];
    bookHardcoverIds?: string[];
    bookIsbn13s?: string[];
    bookTitleAuthorPairs?: string[];
  };
};

const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

let igdbTokenCache: { token: string; expiresAt: number } | null = null;

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

function asBearer(token: string): string {
  const raw = safeStr(token);
  if (!raw) return "";
  return raw.toLowerCase().startsWith("bearer ") ? raw : `Bearer ${raw}`;
}

function parseCsvIds(value: unknown): string[] {
  const raw = safeStr(value);
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(/[,\|\n;]/g)
        .map((v) => v.trim())
        .filter(Boolean)
    )
  );
}

function parseCsvTitles(value: unknown): string[] {
  const raw = safeStr(value);
  if (!raw) return [];
  return raw
    .split(/[,\|\n;]/g)
    .map((v) => v.trim())
    .filter(Boolean);
}

function normalizeHttps(url: string): string {
  const raw = safeStr(url);
  if (!raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("http://")) return `https://${raw.slice(7)}`;
  return raw;
}

type ImageAsset = {
  url: string;
  width?: number;
  height?: number;
};

function parseMaybeJson(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const raw = value.trim();
  if (!raw) return "";
  if (!(raw.startsWith("{") || raw.startsWith("["))) return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function extractImageFromUnknown(value: unknown): ImageAsset | null {
  const parsed = parseMaybeJson(value);
  if (!parsed) return null;

  if (typeof parsed === "string") {
    const maybe = normalizeHttps(parsed);
    return maybe.includes("://") ? { url: maybe } : null;
  }

  if (Array.isArray(parsed)) {
    for (const entry of parsed) {
      const found = extractImageFromUnknown(entry);
      if (found) return found;
    }
    return null;
  }

  if (typeof parsed === "object") {
    const obj = parsed as Record<string, unknown>;
    const directUrl = normalizeHttps(safeStr(obj.url || obj.image_url));
    if (directUrl && directUrl.includes("://")) {
      const w = Number(obj.width);
      const h = Number(obj.height);
      return {
        url: directUrl,
        width: Number.isFinite(w) && w > 0 ? w : undefined,
        height: Number.isFinite(h) && h > 0 ? h : undefined,
      };
    }
    const orderedKeys = [
      "large",
      "medium",
      "small",
      "original",
      "cover",
      "cached_image",
    ];
    for (const key of orderedKeys) {
      const found = extractImageFromUnknown(obj[key]);
      if (found) return found;
    }
  }

  return null;
}

function extractHardcoverImageAsset(book: Record<string, unknown>): ImageAsset | null {
  const fieldsInPriority = [
    (book.default_cover_edition as Record<string, unknown> | undefined)?.cached_image,
    (book.default_physical_edition as Record<string, unknown> | undefined)?.cached_image,
    (book.default_ebook_edition as Record<string, unknown> | undefined)?.cached_image,
    (book.default_audio_edition as Record<string, unknown> | undefined)?.cached_image,
    book.cached_image,
  ];
  for (const field of fieldsInPriority) {
    const found = extractImageFromUnknown(field);
    if (found) return found;
  }
  return null;
}

function extractHardcoverAuthor(book: Record<string, unknown>): string {
  const contributors = parseMaybeJson(book.cached_contributors);
  if (Array.isArray(contributors)) {
    const names = contributors
      .map((entry) => {
        if (typeof entry === "string") return safeStr(entry);
        if (entry && typeof entry === "object") {
          const obj = entry as Record<string, unknown>;
          return safeStr(obj.name || obj.display_name || obj.author_name);
        }
        return "";
      })
      .filter(Boolean);
    if (names.length) return names.join(", ");
  }
  return "";
}

const BROAD_BOOK_TERMS = new Set(
  [
    "fiction",
    "nonfiction",
    "non-fiction",
    "science fiction",
    "fantasy",
    "literature",
    "adult",
    "audiobook",
    "adventure",
    "general",
    "classics",
  ].map((term) => term.toLowerCase())
);

function shouldIgnoreBroadBookTitle(title: string): boolean {
  const normalized = safeStr(title).toLowerCase().replace(/\s+/g, " ").trim();
  if (!normalized) return true;
  return BROAD_BOOK_TERMS.has(normalized);
}

function isCombinedBookTitle(title: string): boolean {
  const raw = safeStr(title);
  if (!raw) return false;
  // Ignore multi-book compilation style titles like "A / B / C".
  const slashParts = raw.split("/").map((part) => part.trim()).filter(Boolean);
  return slashParts.length >= 2;
}

function isLatinScriptText(value: string): boolean {
  const raw = safeStr(value);
  if (!raw) return true;
  for (const ch of raw) {
    if (!/\p{L}/u.test(ch)) continue;
    if (!/\p{Script=Latin}/u.test(ch)) return false;
  }
  return true;
}

function isLikelyEnglishBookTitle(value: string): boolean {
  const raw = safeStr(value);
  if (!raw) return false;
  // Keep this strict: only basic ASCII title text.
  if (!/^[A-Za-z0-9\s'":;,.!?&()\-\/]+$/.test(raw)) return false;
  const normalized = raw.toLowerCase().replace(/\s+/g, " ").trim();
  // Filter common non-English connector-word patterns.
  if (/\b(de|del|des|das|dos|la|le|el|los|las|und|der|die|den|que|con|para|una|uno|una)\b/.test(normalized)) {
    return false;
  }
  return true;
}

function normalizeCompareText(value: unknown): string {
  return safeStr(value).toLowerCase().replace(/[\u2018\u2019']/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function canonicalizeBookTitle(value: unknown): string {
  const raw = safeStr(value);
  const withoutParen = raw.replace(/\(.*?\)/g, " ");
  const beforeColon = withoutParen.split(":")[0] || withoutParen;
  return normalizeCompareText(beforeColon);
}

function cardFromHardcoverBook(book: Record<string, unknown>): RecommendationCard | null {
  const id = safeStr(book.id);
  const title = safeStr(book.title);
  const subtitle = safeStr((book as Record<string, unknown>).subtitle);
  if (!id || !title || shouldIgnoreBroadBookTitle(title) || isCombinedBookTitle(title)) return null;
  if (!isLatinScriptText(title) || !isLatinScriptText(subtitle)) return null;
  if (!isLikelyEnglishBookTitle(title)) return null;
  const releaseDate = safeStr(book.release_date);
  const year = parseYear(releaseDate);
  const author = extractHardcoverAuthor(book);
  const imageAsset = extractHardcoverImageAsset(book);
  // Keep only recommendations with a real portrait-style cover.
  if (!imageAsset?.url) return null;
  if (
    imageAsset.width &&
    imageAsset.height &&
    imageAsset.width > 0 &&
    imageAsset.height > 0 &&
    imageAsset.width / imageAsset.height > 0.82
  ) {
    return null;
  }
  const isbn13 = safeStr((book as Record<string, unknown>).isbn13 || (book as Record<string, unknown>).isbn_13);
  return {
    id,
    source: "hardcover",
    mediaType: "book",
    title,
    subtitle: subtitle || undefined,
    author: author || undefined,
    year: year || undefined,
    releaseDate: releaseDate || undefined,
    imageUrl: imageAsset.url || undefined,
    rating: book.rating != null ? String(book.rating) : undefined,
    isbn13: isbn13 || undefined,
    inLibrary: false,
    __isRecommendation: true,
    __recommendationSource: "hardcover",
  };
}

async function fetchHardcoverSameAuthorRecommendations(
  currentHardcoverId: string,
  inLibraryHardcoverSet: Set<string>,
  hiddenSet: Set<string>
): Promise<RecommendationCard[]> {
  const idNum = Number.parseInt(currentHardcoverId, 10);
  if (!Number.isFinite(idNum)) return [];
  const apiKey = pickEnv(["HARDCOVER_API_KEY"]);
  if (!apiKey) return [];

  const authorLookupQuery = `
    query AuthorIdsForBook($id: Int!) {
      books(where: { id: { _eq: $id } }, limit: 1) {
        id
        contributions {
          author_id
        }
      }
    }
  `;
  const authorLookupRes = await fetch("https://api.hardcover.app/v1/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: asBearer(apiKey) },
    body: JSON.stringify({ query: authorLookupQuery, variables: { id: idNum } }),
    cache: "no-store",
  });
  const authorPayload = (await authorLookupRes.json().catch(() => ({}))) as {
    data?: { books?: Array<{ contributions?: Array<{ author_id?: number }> }> };
  };
  const authorIds = Array.from(
    new Set(
      (authorPayload.data?.books?.[0]?.contributions || [])
        .map((c) => Number(c?.author_id))
        .filter((n) => Number.isFinite(n))
    )
  );
  if (!authorIds.length) return [];

  const sameAuthorQuery = `
    query SameAuthorBooks($authorIds: [Int!]!) {
      books(
        where: { contributions: { author_id: { _in: $authorIds } } }
        order_by: [{ users_count: desc }, { ratings_count: desc }, { rating: desc }, { release_date: desc }]
        limit: 40
      ) {
        id
        title
        subtitle
        release_date
        cached_image
        cached_contributors
        cached_tags
        default_cover_edition { cached_image }
        default_physical_edition { cached_image }
        default_ebook_edition { cached_image }
        default_audio_edition { cached_image }
        rating
        users_count
        ratings_count
      }
    }
  `;
  const sameAuthorRes = await fetch("https://api.hardcover.app/v1/graphql", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: asBearer(apiKey) },
    body: JSON.stringify({ query: sameAuthorQuery, variables: { authorIds } }),
    cache: "no-store",
  });
  const sameAuthorPayload = (await sameAuthorRes.json().catch(() => ({}))) as {
    data?: { books?: Array<Record<string, unknown>> };
  };
  const books = Array.isArray(sameAuthorPayload.data?.books) ? sameAuthorPayload.data?.books : [];
  return books
    .map(cardFromHardcoverBook)
    .filter(Boolean)
    .filter((card) => {
      if (!card) return false;
      if (card.id === currentHardcoverId) return false;
      if (inLibraryHardcoverSet.has(card.id)) return false;
      if (hiddenSet.has(card.id)) return false;
      return true;
    }) as RecommendationCard[];
}

function parseYear(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "";
  const m = raw.match(/\b((?:19|20)\d{2})\b/);
  return m ? m[1] : "";
}

function buildTmdbHeaders(): HeadersInit | undefined {
  const bearerToken = pickEnv(["TMDB_BEARER_TOKEN", "TMDB_API_READ_ACCESS_TOKEN"]);
  return bearerToken ? { Authorization: `Bearer ${bearerToken}` } : undefined;
}

function buildTmdbUrl(path: string): string {
  const apiKey = pickEnv(["TMDB_API_KEY"]);
  if (apiKey) {
    const url = new URL(`https://api.themoviedb.org/3${path}`);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("language", "en-US");
    return url.toString();
  }
  return `https://api.themoviedb.org/3${path}?language=en-US`;
}

async function getIgdbAccessToken(): Promise<string> {
  const now = Date.now();
  if (igdbTokenCache && igdbTokenCache.expiresAt > now + 30_000) return igdbTokenCache.token;

  const clientId = pickEnv(["IGDB_CLIENT_ID", "TWITCH_CLIENT_ID"]);
  const clientSecret = pickEnv(["IGDB_CLIENT_SECRET", "TWITCH_CLIENT_SECRET"]);
  if (!clientId || !clientSecret) throw new Error("IGDB credentials missing.");

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
  if (!res.ok || !token) throw new Error(payload.message || "Failed to authenticate with IGDB.");
  igdbTokenCache = { token, expiresAt: now + Math.max(60, Number(payload.expires_in || 3600)) * 1000 };
  return token;
}

async function fetchTmdbRecommendations(
  mediaType: "movie" | "tv",
  ids: string[],
  inLibrarySet: Set<string>
): Promise<RecommendationCard[]> {
  const headers = buildTmdbHeaders();
  const cards: RecommendationCard[] = [];

  for (const id of ids) {
    const tmdbId = safeStr(id);
    if (!tmdbId || inLibrarySet.has(tmdbId)) continue;
    try {
      const res = await fetch(buildTmdbUrl(`/${mediaType}/${encodeURIComponent(tmdbId)}`), {
        method: "GET",
        headers,
        cache: "no-store",
      });
      if (!res.ok) continue;
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      const title = safeStr(payload.title || payload.name);
      if (!title) continue;
      const releaseDate = safeStr(payload.release_date || payload.first_air_date);
      const year = parseYear(releaseDate);
      const posterPath = safeStr(payload.poster_path);
      cards.push({
        id: tmdbId,
        source: "tmdb",
        mediaType,
        title,
        year: year || undefined,
        releaseDate: releaseDate || undefined,
        imageUrl: posterPath ? `${TMDB_IMAGE_BASE}${posterPath}` : undefined,
        rating: payload.vote_average != null ? String(payload.vote_average) : undefined,
        overview: safeStr(payload.overview) || undefined,
        genres: Array.isArray(payload.genres)
          ? (payload.genres as Array<{ name?: string }>).map((g) => safeStr(g?.name)).filter(Boolean)
          : undefined,
        inLibrary: false,
        __isRecommendation: true,
        __recommendationSource: "tmdb",
      });
    } catch {
      // Continue with partial results.
    }
  }

  return cards;
}

async function fetchTmdbRecommendationIds(mediaType: "movie" | "tv", sourceId: string): Promise<string[]> {
  const headers = buildTmdbHeaders();
  const collectIds = async (path: string): Promise<string[]> => {
    const res = await fetch(buildTmdbUrl(path), { method: "GET", headers, cache: "no-store" });
    if (!res.ok) return [];
    const payload = (await res.json().catch(() => ({}))) as { results?: Array<Record<string, unknown>> };
    const results = Array.isArray(payload.results) ? payload.results : [];
    return results.map((r) => safeStr(r.id)).filter(Boolean);
  };
  const recommendationIds = await collectIds(`/${mediaType}/${encodeURIComponent(sourceId)}/recommendations`);
  if (recommendationIds.length > 0) return recommendationIds;
  return collectIds(`/${mediaType}/${encodeURIComponent(sourceId)}/similar`);
}

async function fetchIgdbRecommendations(ids: string[], inLibrarySet: Set<string>): Promise<RecommendationCard[]> {
  const numericIds = ids.map((id) => Number.parseInt(id, 10)).filter((n) => Number.isFinite(n));
  const filteredIds = numericIds.filter((n) => !inLibrarySet.has(String(n)));
  if (!filteredIds.length) return [];

  const clientId = pickEnv(["IGDB_CLIENT_ID", "TWITCH_CLIENT_ID"]);
  if (!clientId) throw new Error("IGDB client id missing.");
  const token = await getIgdbAccessToken();

  const fields = [
    "id",
    "name",
    "first_release_date",
    "rating",
    "cover.url",
    "genres.name",
    "platforms.name",
  ].join(",");
  const body = `fields ${fields}; where id = (${filteredIds.join(",")}); limit ${Math.min(30, filteredIds.length)};`;
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
  if (!res.ok) throw new Error("IGDB recommendation lookup failed.");
  const payload = (await res.json().catch(() => [])) as Array<Record<string, unknown>>;

  return payload
    .map((game): RecommendationCard | null => {
      const id = safeStr(game.id);
      const title = safeStr(game.name);
      if (!id || !title) return null;
      const ts = Number(game.first_release_date || 0);
      const releaseDate = Number.isFinite(ts) && ts > 0 ? new Date(ts * 1000).toISOString().slice(0, 10) : "";
      const year = parseYear(releaseDate);
      const coverUrlRaw = safeStr((game.cover as { url?: string } | undefined)?.url);
      const imageUrl = coverUrlRaw
        ? `https:${coverUrlRaw.replace("t_thumb", "t_cover_big").replace("t_cover_small", "t_cover_big")}`
        : undefined;
      return {
        id,
        source: "igdb",
        mediaType: "game",
        title,
        year: year || undefined,
        releaseDate: releaseDate || undefined,
        imageUrl,
        rating: game.rating != null ? String(game.rating) : undefined,
        genres: Array.isArray(game.genres)
          ? (game.genres as Array<{ name?: string }>).map((g) => safeStr(g?.name)).filter(Boolean)
          : undefined,
        platforms: Array.isArray(game.platforms)
          ? (game.platforms as Array<{ name?: string }>).map((p) => safeStr(p?.name)).filter(Boolean)
          : undefined,
        inLibrary: false,
        __isRecommendation: true,
        __recommendationSource: "igdb",
      };
    })
    .filter(Boolean) as RecommendationCard[];
}

async function fetchIgdbSimilarGameIds(sourceGameId: string): Promise<string[]> {
  const sourceId = Number.parseInt(sourceGameId, 10);
  if (!Number.isFinite(sourceId)) return [];
  const clientId = pickEnv(["IGDB_CLIENT_ID", "TWITCH_CLIENT_ID"]);
  if (!clientId) throw new Error("IGDB client id missing.");
  const token = await getIgdbAccessToken();
  const body = `fields similar_games; where id = ${sourceId}; limit 1;`;
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
  if (!res.ok) return [];
  const payload = (await res.json().catch(() => [])) as Array<Record<string, unknown>>;
  const similar = Array.isArray(payload?.[0]?.similar_games) ? (payload[0].similar_games as unknown[]) : [];
  return similar.map((id) => safeStr(id)).filter(Boolean);
}

async function fetchHardcoverRecommendations(
  ids: string[],
  inLibraryHardcoverSet: Set<string>,
  inLibraryIsbn13Set: Set<string>,
  inLibraryTitleAuthorSet: Set<string>,
  inLibraryCanonicalTitleSet: Set<string>
): Promise<RecommendationCard[]> {
  const numericIds = ids.map((id) => Number.parseInt(id, 10)).filter((n) => Number.isFinite(n));
  const filteredIds = numericIds.filter((n) => !inLibraryHardcoverSet.has(String(n)));
  if (!filteredIds.length) return [];

  const apiKey = pickEnv(["HARDCOVER_API_KEY"]);
  if (!apiKey) throw new Error("Hardcover API key missing.");

  const query = `
    query RecommendationsByIds($ids: [Int!]!) {
      books(where: { id: { _in: $ids } }) {
        id
        title
        subtitle
        release_date
        cached_image
        cached_contributors
        cached_tags
        default_cover_edition {
          cached_image
        }
        default_physical_edition {
          cached_image
        }
        default_ebook_edition {
          cached_image
        }
        default_audio_edition {
          cached_image
        }
        rating
      }
    }
  `;

  const res = await fetch("https://api.hardcover.app/v1/graphql", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: asBearer(apiKey),
    },
    body: JSON.stringify({ query, variables: { ids: filteredIds } }),
    cache: "no-store",
  });

  const payload = (await res.json().catch(() => ({}))) as {
    data?: { books?: Array<Record<string, unknown>> };
    errors?: Array<{ message?: string }>;
  };
  if (!res.ok || payload.errors?.length) {
    throw new Error(payload.errors?.[0]?.message || "Hardcover recommendation lookup failed.");
  }

  const books = Array.isArray(payload.data?.books) ? payload.data?.books : [];
  return books
    .map((book): RecommendationCard | null => {
      const card = cardFromHardcoverBook(book);
      if (!card) return null;
      if (card.isbn13 && inLibraryIsbn13Set.has(card.isbn13)) return null;
      const pairKey = `${normalizeCompareText(card.title)}|||${normalizeCompareText(card.author)}`;
      if (pairKey !== "|||" && inLibraryTitleAuthorSet.has(pairKey)) return null;
      if (inLibraryCanonicalTitleSet.has(canonicalizeBookTitle(card.title))) return null;
      return card;
    })
    .filter(Boolean) as RecommendationCard[];
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const mediaType = body.mediaType;
    const item = body.item || {};
    if (!mediaType || !["movie", "tv", "game", "book"].includes(mediaType)) {
      return NextResponse.json({ ok: false, error: "Invalid mediaType." }, { status: 400 });
    }

    const recommendedIds = parseCsvIds(item.RecommendedIDs ?? item.recommendedIds);
    const hiddenIds = new Set(parseCsvIds(item.RecommendationsHidden ?? item.recommendationsHidden));
    let filteredIds = recommendedIds.filter((id) => !hiddenIds.has(id));
    if (!filteredIds.length) {
      if (mediaType === "movie" || mediaType === "tv") {
        const sourceId = safeStr(item.tmdbId ?? item.TMDB_ID ?? item.tmdbID ?? item.id);
        if (sourceId) {
          filteredIds = (await fetchTmdbRecommendationIds(mediaType, sourceId)).filter((id) => !hiddenIds.has(id));
        }
      } else if (mediaType === "game") {
        const sourceId = safeStr(item.igdbId ?? item.IGDB_ID ?? item.igdbIdOverride ?? item.id);
        if (sourceId) {
          filteredIds = (await fetchIgdbSimilarGameIds(sourceId)).filter((id) => !hiddenIds.has(id));
        }
      }
    }
    if (!filteredIds.length) {
      return NextResponse.json({ ok: true, recommendations: [] as RecommendationCard[] });
    }

    const libraryIds = body.libraryIds || {};
    let recommendations: RecommendationCard[] = [];
    if (mediaType === "movie") {
      recommendations = await fetchTmdbRecommendations("movie", filteredIds, new Set((libraryIds.movieTmdbIds || []).map(safeStr)));
    } else if (mediaType === "tv") {
      recommendations = await fetchTmdbRecommendations("tv", filteredIds, new Set((libraryIds.tvTmdbIds || []).map(safeStr)));
    } else if (mediaType === "game") {
      const inLibraryGameSet = new Set((libraryIds.gameIgdbIds || []).map(safeStr));
      try {
        recommendations = await fetchIgdbRecommendations(filteredIds, inLibraryGameSet);
      } catch {
        const titles = parseCsvTitles(item.RecommendedTitles ?? item.recommendedTitles);
        recommendations = filteredIds
          .map((id, idx): RecommendationCard | null => {
            const cleanId = safeStr(id);
            if (!cleanId || inLibraryGameSet.has(cleanId)) return null;
            const title = safeStr(titles[idx]);
            if (!title) return null;
            return {
              id: cleanId,
              source: "igdb",
              mediaType: "game",
              title,
              inLibrary: false,
              __isRecommendation: true,
              __recommendationSource: "igdb",
            };
          })
          .filter(Boolean) as RecommendationCard[];
      }
    } else {
      const inLibrarySet = new Set((libraryIds.bookHardcoverIds || []).map(safeStr));
      const inLibraryIsbn13Set = new Set((libraryIds.bookIsbn13s || []).map(safeStr));
      const inLibraryTitleAuthorSet = new Set(
        (libraryIds.bookTitleAuthorPairs || [])
          .map((pair) => {
            const [title, author] = safeStr(pair).split("|||");
            return `${normalizeCompareText(title)}|||${normalizeCompareText(author)}`;
          })
          .filter(Boolean)
      );
      const inLibraryCanonicalTitleSet = new Set(
        (libraryIds.bookTitleAuthorPairs || [])
          .map((pair) => safeStr(pair).split("|||")[0] || "")
          .map((title) => canonicalizeBookTitle(title))
          .filter(Boolean)
      );
      const currentHardcoverId = safeStr((item as Record<string, unknown>).hardcoverId || (item as Record<string, unknown>).HardcoverID);
      const sameAuthorFirst = await fetchHardcoverSameAuthorRecommendations(currentHardcoverId, inLibrarySet, hiddenIds);
      try {
        const byIds = await fetchHardcoverRecommendations(
          filteredIds,
          inLibrarySet,
          inLibraryIsbn13Set,
          inLibraryTitleAuthorSet,
          inLibraryCanonicalTitleSet
        );
        const seen = new Set<string>();
        recommendations = [...sameAuthorFirst, ...byIds].filter((card) => {
          if (!card || seen.has(card.id)) return false;
          const pairKey = `${normalizeCompareText(card.title)}|||${normalizeCompareText(card.author)}`;
          if (pairKey !== "|||" && inLibraryTitleAuthorSet.has(pairKey)) return false;
          if (inLibraryCanonicalTitleSet.has(canonicalizeBookTitle(card.title))) return false;
          seen.add(card.id);
          return true;
        });
      } catch {
        const titles = parseCsvTitles(item.RecommendedTitles ?? item.recommendedTitles);
        recommendations = filteredIds
          .map((id, idx): RecommendationCard | null => {
            const cleanId = safeStr(id);
            if (!cleanId || inLibrarySet.has(cleanId)) return null;
            const title = safeStr(titles[idx]);
            if (!title) return null;
            return {
              id: cleanId,
              source: "hardcover",
              mediaType: "book",
              title,
              inLibrary: false,
              __isRecommendation: true,
              __recommendationSource: "hardcover",
            };
          })
          .filter(Boolean) as RecommendationCard[];
      }
      // Secondary ISBN filtering when available from cached titles list is handled client-side in v1.
    }

    return NextResponse.json({ ok: true, recommendations });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to resolve recommendations.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
