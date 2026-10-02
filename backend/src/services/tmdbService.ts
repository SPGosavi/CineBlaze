import fetch from "node-fetch";
import * as cache from "../cache/index.js";
import { CacheKeys } from "../cache/index.js";
import {
  TMDB_API_KEY,
  OMDB_API_KEY,
  TMDB_MAX_RETRIES,
  TMDB_TIMEOUT_MS,
} from "../config.js";
import { fetchWithTimeout } from "../utils/http.js";
import { mapSettledLimit } from "../utils/concurrency.js";
import { sleep, backoffDelay, isRetryableStatus } from "../utils/retry.js";
import {
  MediaType,
  BasicTmdbResult,
  WatchProvider,
  Ratings,
  TmdbDetails,
  EnrichedMedia,
  PartialEnrichedMedia,
  TmdbRawResult,
  TmdbPaginatedResponse,
  TmdbDetailResponse,
  TmdbWatchProvidersResponse,
  OmdbResponse,
} from "../types/index.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("tmdb");

const GENRE_MAP: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

export async function fetchEnrichedDataById(
  id: number,
  mediaType: MediaType
): Promise<PartialEnrichedMedia | null> {
  if (!id || !mediaType) return null;

  const [details, providers] = await Promise.all([
    fetchTmdbDetails(id, mediaType),
    fetchWatchProviders(id, mediaType),
  ]);

  return {
    id,
    media_type: mediaType,
    genres: details.genres,
    director: details.director,
    cast: details.cast,
    providers,
  };
}

export async function fetchFastDetailsById(
  id: number,
  mediaType: MediaType
): Promise<{
  id: number;
  media_type: MediaType;
  genres: string[];
  director: string;
  cast: string[];
} | null> {
  if (!id || !mediaType) return null;

  const details = await fetchTmdbDetails(id, mediaType);

  return {
    id,
    media_type: mediaType,
    genres: details.genres,
    director: details.director, // may exist
    cast: details.cast, // may exist
  };
}

export async function fetchRatings(
  title: string,
  year: string | undefined
): Promise<Ratings> {
  const cacheKey = CacheKeys.ratings(title, year);
  const cached = await cache.get<Ratings>(cacheKey);
  if (cached) return cached;

  try {
    const ratings = await fetchOmdbRatings(title, year);
    await cache.set(cacheKey, ratings, 86_400); // 24 hours
    return ratings;
  } catch {
    // Ratings are decoration, not content — a card without an IMDb badge is
    // fine, a failed shelf is not. Deliberately not cached, so a transient
    // OMDb failure does not suppress ratings for the next 24 hours.
    return { imdb: null, rt: null };
  }
}

/**
 * Fetches a TMDB list endpoint, retrying transient failures.
 *
 * Callers treat a throw here as fatal for the whole request, so the trending
 * controllers turned a single dropped connection into a 500 and a blank shelf.
 * Retries cover the connection resets that show up under the fan-out of a cold
 * Discover page, where three shelves enrich twelve items each.
 */
export async function fetchTmdb(url: string): Promise<TmdbPaginatedResponse> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= TMDB_MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url, TMDB_TIMEOUT_MS);

      if (!res.ok) {
        lastError = new Error(`TMDB Error: ${res.status}`);

        if (isRetryableStatus(res.status) && attempt < TMDB_MAX_RETRIES) {
          const retryAfter = Number(res.headers.get("retry-after"));
          const waitMs =
            Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter * 1000
              : backoffDelay(attempt);
          log.warn(
            `[TMDB] ${res.status} on attempt ${attempt}/${TMDB_MAX_RETRIES}, retrying in ${Math.round(waitMs)}ms`
          );
          await sleep(waitMs);
          continue;
        }
        // 4xx other than 429: the request itself is wrong, retrying cannot help.
        throw lastError;
      }

      return (await res.json()) as TmdbPaginatedResponse;
    } catch (e: unknown) {
      lastError = e as Error;

      // A non-retryable HTTP error was rethrown above; do not loop on it.
      if (lastError.message?.startsWith("TMDB Error:")) throw lastError;

      if (attempt < TMDB_MAX_RETRIES) {
        const waitMs = backoffDelay(attempt);
        log.warn(
          `[TMDB] ${lastError.message} on attempt ${attempt}/${TMDB_MAX_RETRIES}, retrying in ${Math.round(waitMs)}ms`
        );
        await sleep(waitMs);
        continue;
      }
    }
  }

  throw lastError ?? new Error("TMDB Error");
}

/**
 * Fallback: Direct Keyword Search
 * Used when AI is rate-limited. Searches Movies and TV.
 */
export function formatBasicTmdbResult(
  item: TmdbRawResult,
  mediaType?: string
): BasicTmdbResult | null {
  if (!item) return null;

  // Map genre_ids to strings immediately
  const genres = item.genre_ids
    ? item.genre_ids.map((id) => GENRE_MAP[id]).filter(Boolean)
    : [];

  return {
    id: item.id,
    title: item.title || item.name || "",
    release_date: item.release_date || item.first_air_date || "",
    overview: item.overview || "",
    poster_path: item.poster_path || "",
    vote_average: item.vote_average || 0,
    media_type: (mediaType ||
      item.media_type ||
      (item.title ? "movie" : "tv")) as MediaType,
    genres: genres,
  };
}

export async function searchTmdbDirect(
  query: string
): Promise<BasicTmdbResult[]> {
  try {
    log.debug(`[TMDB] Direct Search for: "${query}"`);

    // Strip generic suffixes/prefixes that confuse TMDB search
    let cleanedQuery = query
      .replace(/\b(movies?|films?|shows?|series)\b/gi, "")
      .replace(/^(best|top|latest|recent|new|popular|all)\s+/i, "")
      .trim();

    if (!cleanedQuery) cleanedQuery = query; // safety fallback

    const searchQuery = cleanedQuery !== query ? cleanedQuery : query;

    if (cleanedQuery !== query) {
      log.debug(`[TMDB] Cleaned query: "${query}" → "${searchQuery}"`);
    }

    // Use Multi-Search to handle Actors + Titles + Keywords in one go
    const url = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(searchQuery)}&language=en-US&page=1`;
    const res = await fetch(url);
    const data = (await res.json()) as TmdbPaginatedResponse;

    let combined: TmdbRawResult[] = [];
    if (data.results && data.results.length > 0) {
      for (const item of data.results) {
        if (item.media_type === "movie" || item.media_type === "tv") {
          combined.push(item);
        } else if (item.media_type === "person" && (item as any).known_for) {
          combined.push(
            ...((item as any).known_for as any[]).map((m: any) => ({
              ...m,
              media_type: m.title ? "movie" : "tv",
            }))
          );
        }
      }
    }

    // If no results for the cleaned string, try searching just for potential actor names
    if (combined.length === 0 && searchQuery.includes(" ")) {
      const words = searchQuery.split(" ");
      // Look for word pairs which are likely names (case-insensitive)
      const names = [];
      for (let i = 0; i < words.length - 1; i++) {
        if (words[i].length > 1 && words[i + 1].length > 1) {
          names.push(`${words[i]} ${words[i + 1]}`);
        }
      }

      if (names.length > 0) {
        log.debug(
          `[TMDB] No results for cleaned query. Trying actor-specific search for: "${names[0]}"`
        );
        const actorUrl = `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(names[0])}&language=en-US&page=1`;
        const actorRes = await fetch(actorUrl);
        const actorData = (await actorRes.json()) as TmdbPaginatedResponse;

        if (actorData.results) {
          for (const item of actorData.results) {
            if (item.media_type === "person" && (item as any).known_for) {
              combined.push(
                ...((item as any).known_for as any[]).map((m: any) => ({
                  ...m,
                  media_type: m.title ? "movie" : "tv",
                }))
              );
            }
          }
        }
      }
    }

    // De-duplicate by ID
    const seen = new Set();
    const unique = combined.filter((item) => {
      if (!item.id) return false;
      const duplicate = seen.has(item.id);
      seen.add(item.id);
      return !duplicate;
    });

    return unique
      .slice(0, 10)
      .map((item) => formatTmdbResult(item, item.media_type as MediaType))
      .filter((item): item is BasicTmdbResult => item !== null);
  } catch (e) {
    log.error({ err: String(e) }, "Direct Search Failed:");
    return [];
  }
}

export async function getNativeTmdbRecommendations(
  title: string,
  year: string | undefined,
  mediaType: MediaType
): Promise<BasicTmdbResult[]> {
  if (!title || !mediaType) return [];
  const cleanTitle = String(title)
    .replace(/\(\d{4}\)/g, "")
    .trim();

  let searchResult = await performTmdbSearch(cleanTitle, year, mediaType);
  if (!searchResult)
    searchResult = await performTmdbSearch(cleanTitle, null, mediaType);

  if (!searchResult) return [];

  const url = `https://api.themoviedb.org/3/${mediaType}/${searchResult.id}/similar?api_key=${TMDB_API_KEY}&language=en-US&page=1`;

  try {
    const res = await fetch(url);
    const data = (await res.json()) as TmdbPaginatedResponse;
    if (!data.results || data.results.length === 0) return [];
    return data.results
      .slice(0, 10)
      .map((item) => formatTmdbResult(item, mediaType))
      .filter((item): item is BasicTmdbResult => item !== null);
  } catch (e) {
    return [];
  }
}

export async function enrichWithDeepData(
  items: BasicTmdbResult[],
  limit: number = 20
): Promise<EnrichedMedia[]> {
  if (!items || !Array.isArray(items)) return [];

  // Ensure we don't exceed array bounds
  const safeLimit = Math.min(items.length, limit);

  const topItems = items.slice(0, safeLimit);
  const remaining = items.slice(safeLimit);

  // Bounded and settled. This was `Promise.all` over up to twenty items, each
  // firing three more requests — sixty concurrent sockets, where a single
  // failure rejected the lot and returned nothing.
  const settled = await mapSettledLimit(topItems, async (item) => {
    const year = item.release_date?.split("-")[0];
    const type = item.media_type;

    const [ratings, details, providers] = await Promise.all([
      // fetchRatings rather than fetchOmdbRatings: same data, but cached for
      // 24h and it swallows OMDb failures instead of rejecting the item.
      fetchRatings(item.title, year),
      fetchTmdbDetails(item.id, type),
      fetchWatchProviders(item.id, type),
    ]);

    return {
      ...item,
      media_type: type,
      imdb_rating: ratings.imdb,
      // Was `(ratings as any).rotten`, a field this shape has never had, so
      // every search result and every "find similar" card silently rendered
      // without its Rotten Tomatoes score. The `as any` is what hid it.
      rotten_tomatoes: ratings.rt,
      director: details.director,
      cast: details.cast,
      genres: details.genres,
      providers,
    } satisfies EnrichedMedia;
  });

  const enriched = settled.map((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : // Degrade to the unenriched item instead of dropping it.
        ({
          ...topItems[index],
          imdb_rating: null,
          rotten_tomatoes: null,
        } satisfies EnrichedMedia)
  );

  return [...enriched, ...remaining] as EnrichedMedia[];
}

export async function fetchEnrichedData(
  title: string,
  year: string | undefined,
  preferredType: MediaType
): Promise<EnrichedMedia | null> {
  if (!title) return null;
  const searchResult = await fetchTmdbRobust(title, year, preferredType);
  if (!searchResult) return null;

  const [details, omdbData, providers] = await Promise.all([
    fetchTmdbDetails(searchResult.id, searchResult.media_type as MediaType),
    fetchOmdbRatings(
      searchResult.title,
      searchResult.release_date?.split("-")[0] || year
    ),
    fetchWatchProviders(searchResult.id, searchResult.media_type as MediaType),
  ]);

  return {
    ...searchResult,
    genres: details.genres,
    director: details.director,
    cast: details.cast,
    imdb_rating: (omdbData as any).imdb,
    rotten_tomatoes: (omdbData as any).rotten,
    providers: providers,
  } as EnrichedMedia;
}

async function fetchTmdbRobust(
  title: string,
  year: string | undefined,
  preferredType: MediaType
): Promise<BasicTmdbResult | null> {
  if (!title) return null;

  // Aggressive cleaning: remove (YYYY), YYYY at end, "The movie X", "X movie"
  let cleanTitle = String(title)
    .replace(/\(\d{4}\)/g, "") // remove (2009)
    .replace(/\s\d{4}$/, "") // remove 2009 at end
    .replace(/^(the movie|the show|movie|show)\s+/i, "") // remove prefixes
    .replace(/\s+(movie|show)$/i, "") // remove suffixes
    .trim();

  let result = await performTmdbSearch(cleanTitle, year, preferredType);
  if (result) return result;
  const fallbackType: MediaType = preferredType === "movie" ? "tv" : "movie";
  return await performTmdbSearch(cleanTitle, year, fallbackType);
}

/** Levenshtein-distance based similarity, normalized to [0, 1] (1 = identical). Case/punctuation-insensitive. */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, "");
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const matrix = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i++) matrix[0][i] = i;
  for (let j = 0; j <= s2.length; j++) matrix[j][0] = j;

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // insertion
        matrix[j - 1][i] + 1, // deletion
        matrix[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return (maxLength - distance) / maxLength;
}

interface ScoredTmdbResult extends TmdbRawResult {
  _similarityScore: number;
}

/**
 * Searches TMDB for a single best-matching title, with a multi-stage fallback
 * chain to handle misspellings/transliteration variance in AI-suggested or
 * user-typed titles:
 *   1. Exact search on `queryTitle` as given.
 *   2. If empty and multi-word: retry with a shorter, relaxed query (drop trailing words).
 *   3. If still empty: progressively drop *leading* words (e.g. "Ti Sadhya Kay Karte" →
 *      "Sadhya Kay Karte" → "Kay Karte") and score every candidate from each sub-query
 *      against the *original* full title via `calculateSimilarity`. Stop at the first
 *      sub-query whose best candidate scores >= 0.70.
 *
 * Once a result set exists, ranking prefers (in order): exact title + year match,
 * exact title match (any year), year match only, then top-popularity fallback.
 */
async function performTmdbSearch(
  queryTitle: string,
  year: string | null | undefined,
  mediaType: MediaType
): Promise<BasicTmdbResult | null> {
  const endpoint = mediaType === "tv" ? "tv" : "movie";
  const baseUrl = `https://api.themoviedb.org/3/search/${endpoint}?api_key=${TMDB_API_KEY}&language=en-US&page=1`;

  try {
    let res = await fetch(`${baseUrl}&query=${encodeURIComponent(queryTitle)}`);
    if (!res.ok) return null;
    let data = (await res.json()) as TmdbPaginatedResponse;

    // Relaxed search if no results and query has multiple words
    if (
      (!data.results || data.results.length === 0) &&
      queryTitle.includes(" ")
    ) {
      const words = queryTitle.split(" ");
      if (words.length > 1) {
        const relaxedQuery = words
          .slice(0, Math.min(words.length - 1, 3))
          .join(" ");
        log.debug(
          `[TMDB] No results for "${queryTitle}". Trying relaxed: "${relaxedQuery}"`
        );
        const relaxedRes = await fetch(
          `${baseUrl}&query=${encodeURIComponent(relaxedQuery)}`
        );
        if (relaxedRes.ok) {
          const relaxedData =
            (await relaxedRes.json()) as TmdbPaginatedResponse;
          if (relaxedData.results && relaxedData.results.length > 0) {
            data = relaxedData;
          }
        }

        // Transliteration / Spelling robust fallback
        // Try progressively shorter sub-queries by dropping words from the start
        // e.g. "Ti Sadhya Kay Karte" → "Sadhya Kay Karte" → "Kay Karte"
        // This ensures we eventually skip past the misspelled word(s).
        if (!data.results || data.results.length === 0) {
          let bestCandidates: ScoredTmdbResult[] | null = null;

          for (let drop = 1; drop < words.length - 1; drop++) {
            const subQuery = words.slice(drop).join(" ");
            if (subQuery.length < 3) break; // Too short to be useful

            log.debug(`[TMDB] Spelling fallback (drop ${drop}): "${subQuery}"`);
            const subRes = await fetch(
              `${baseUrl}&query=${encodeURIComponent(subQuery)}`
            );

            if (subRes.ok) {
              const subData = (await subRes.json()) as TmdbPaginatedResponse;
              if (subData.results && subData.results.length > 0) {
                // Score every candidate against the original full query title
                const candidates: ScoredTmdbResult[] = subData.results.map(
                  (item) => {
                    const t = item.title || item.name || "";
                    const ot = item.original_title || item.original_name || "";
                    const score1 = calculateSimilarity(queryTitle, t);
                    const score2 = calculateSimilarity(queryTitle, ot);
                    return {
                      ...item,
                      _similarityScore: Math.max(score1, score2),
                    };
                  }
                );

                candidates.sort(
                  (a, b) => b._similarityScore - a._similarityScore
                );

                if (candidates[0]._similarityScore >= 0.7) {
                  log.debug(
                    `[TMDB] Found fuzzy match: "${candidates[0].title || candidates[0].name}" (Score: ${candidates[0]._similarityScore.toFixed(2)})`
                  );
                  bestCandidates = candidates;
                  break; // Use the first sub-query that yields a strong match
                } else {
                  log.debug(
                    `[TMDB] Best candidate from "${subQuery}": "${candidates[0].title || candidates[0].name}" (Score: ${candidates[0]._similarityScore.toFixed(2)}) — below threshold`
                  );
                }
              }
            }
          }

          if (bestCandidates) {
            data.results = bestCandidates;
          }
        }
      }
    }

    if (!data.results || data.results.length === 0) {
      log.debug(`[TMDB] No results for "${queryTitle}"`);
      return null;
    }

    const normalizedQuery = queryTitle.toLowerCase().trim();
    const yearStr = year ? String(year) : null;

    const exactTitle = (item: TmdbRawResult) => {
      const t = (item.title || item.name || "").toLowerCase().trim();
      const ot = (item.original_title || item.original_name || "")
        .toLowerCase()
        .trim();
      const match = t === normalizedQuery || ot === normalizedQuery;
      if (match)
        log.debug(`[TMDB] Title Match: "${t}" === "${normalizedQuery}"`);
      return match;
    };
    const matchesYear = (item: TmdbRawResult) => {
      const d = item.release_date || item.first_air_date;
      const match = !!(d && yearStr && d.startsWith(yearStr));
      if (match)
        log.debug(`[TMDB] Year Match: "${d}" starts with "${yearStr}"`);
      return match;
    };

    // 1. Exact title + year match (strongest signal)
    if (yearStr) {
      const best = data.results.find(
        (item) => exactTitle(item) && matchesYear(item)
      );
      if (best) return formatTmdbResult(best, mediaType);
    }

    // 2. Exact title match (any year)
    const exactOnly = data.results.find(exactTitle);
    if (exactOnly) return formatTmdbResult(exactOnly, mediaType);

    // 3. Year match among remaining results (original behaviour)
    if (yearStr) {
      const yearMatch = data.results.find(matchesYear);
      if (yearMatch) return formatTmdbResult(yearMatch, mediaType);
    }

    log.debug(
      `[TMDB] No exact match for "${queryTitle}" (${yearStr}). Using top result: "${data.results[0].title || data.results[0].name}"`
    );
    // 4. Fallback: top popularity result
    return formatTmdbResult(data.results[0], mediaType);
  } catch (e) {
    return null;
  }
}

/**
 * Pulls genres, director and cast out of a TMDB detail payload.
 *
 * Split out of `fetchTmdbDetails` so `fetchFullDetailsById` can reuse the
 * credit-parsing rules — in particular the TV fallback chain of
 * `created_by` -> executive producer -> "Unknown" — without duplicating them.
 *
 * `castLimit` exists because the two callers want different amounts: a card
 * shows three names, a detail page has room for the top billing.
 */
function parseTmdbDetails(
  data: TmdbDetailResponse,
  mediaType: MediaType,
  castLimit = 3
): TmdbDetails {
  const genres = data.genres ? data.genres.map((g) => g.name).slice(0, 3) : [];

  let director = "Unknown";
  if (mediaType === "movie") {
    const d = data.credits?.crew?.find((p) => p.job === "Director");
    if (d) director = d.name;
  } else if (data.created_by && data.created_by.length > 0) {
    director = data.created_by.map((c) => c.name).join(", ");
  } else {
    const exec = data.credits?.crew?.find(
      (p) => p.job === "Executive Producer"
    );
    if (exec) director = exec.name;
  }

  const cast = data.credits?.cast?.slice(0, castLimit).map((c) => c.name) ?? [];

  return { genres, director, cast };
}

async function fetchTmdbDetails(
  id: number,
  mediaType: MediaType
): Promise<TmdbDetails> {
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;
  try {
    const res = await fetchWithTimeout(url, TMDB_TIMEOUT_MS);
    const data = (await res.json()) as TmdbDetailResponse;
    return parseTmdbDetails(data, mediaType);
  } catch {
    return { genres: [], director: "Unknown", cast: [] };
  }
}

/**
 * Fetches everything needed to render a title from its TMDB id alone.
 *
 * `fetchEnrichedDataById` deliberately returns only genres/director/cast: it
 * was written for the Phase 2 details modal, which opened with the title,
 * poster and overview already in hand from the card the user clicked and only
 * needed the missing extras backfilled.
 *
 * The Next.js detail route has no such prior state — an id from the URL is
 * all it gets — so it needs the full record. The underlying TMDB request
 * already returns title, poster, overview and release date; the old path
 * simply discarded them.
 *
 * Returns null when TMDB has no such id, which the controller turns into a
 * 404 rather than an empty page.
 */
export async function fetchFullDetailsById(
  id: number,
  mediaType: MediaType
): Promise<EnrichedMedia | null> {
  if (!id || !mediaType) return null;

  const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_API_KEY}&append_to_response=credits`;

  let data: TmdbDetailResponse;
  try {
    const res = await fetchWithTimeout(url, TMDB_TIMEOUT_MS);
    if (!res.ok) return null;
    data = (await res.json()) as TmdbDetailResponse;
  } catch (e) {
    log.warn(
      { err: String(e), mediaType, id },
      "[TMDB] Full detail fetch failed"
    );
    return null;
  }

  const title = data.title || data.name || "";
  if (!title) return null;

  const releaseDate = data.release_date || data.first_air_date || "";
  const details = parseTmdbDetails(data, mediaType, 10);

  // Both are independently cached and neither blocks the other.
  const [providers, ratings] = await Promise.all([
    fetchWatchProviders(id, mediaType),
    fetchRatings(title, releaseDate.split("-")[0] || undefined),
  ]);

  return {
    id,
    title,
    media_type: mediaType,
    release_date: releaseDate,
    overview: data.overview ?? "",
    poster_path: data.poster_path ?? null,
    vote_average: data.vote_average ?? 0,
    genres: details.genres,
    director: details.director,
    cast: details.cast,
    providers,
    imdb_rating: ratings.imdb,
    rotten_tomatoes: ratings.rt,
  };
}

export async function fetchWatchProviders(
  id: number,
  mediaType: MediaType
): Promise<WatchProvider[]> {
  const url = `https://api.themoviedb.org/3/${mediaType}/${id}/watch/providers?api_key=${TMDB_API_KEY}`;
  try {
    const res = await fetch(url);
    const data = (await res.json()) as TmdbWatchProvidersResponse;
    const countryData = data.results?.IN || data.results?.US;
    return (
      countryData?.flatrate?.map((p: any) => ({
        name: p.provider_name,
        logo: p.logo_path,
      })) || []
    );
  } catch (e) {
    return [];
  }
}

export async function fetchOmdbRatings(
  title: string,
  year: string | undefined
): Promise<Ratings> {
  const url = `https://www.omdbapi.com/?t=${encodeURIComponent(title)}&y=${year}&apikey=${OMDB_API_KEY}`;
  const res = await fetch(url);
  const data = (await res.json()) as OmdbResponse;

  let imdb: string | null = null;
  let rt: string | null = null;

  if (Array.isArray(data.Ratings)) {
    for (const r of data.Ratings) {
      if (r.Source === "Internet Movie Database") {
        imdb = r.Value?.split("/")[0] || null;
      }
      if (r.Source === "Rotten Tomatoes") {
        rt = r.Value?.replace("%", "") || null;
      }
    }
  }

  return { imdb, rt } as unknown as Ratings;
}

function formatTmdbResult(
  result: TmdbRawResult,
  mediaType: MediaType
): BasicTmdbResult | null {
  if (!result) return null;
  return {
    id: result.id,
    title: result.title || result.name || "",
    release_date: result.release_date || result.first_air_date || "",
    overview: result.overview || "",
    poster_path: result.poster_path || "",
    vote_average: result.vote_average || 0,
    media_type: mediaType,
  };
}
