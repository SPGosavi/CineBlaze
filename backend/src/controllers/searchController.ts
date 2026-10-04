import { Request, Response } from "express";
import * as cache from "../cache/index.js";
import { CacheKeys } from "../cache/index.js";
import {
  callGroqWithFallback,
  callGroqSimilar,
  extractKeywords,
  extractStructuredParams,
  callGroqRecommend,
} from "../services/aiService.js";
import {
  fetchEnrichedData,
  fetchFullDetailsById,
  getNativeTmdbRecommendations,
  enrichWithDeepData,
  searchTmdbDirect,
  fetchWatchProviders,
  fetchRecommendPool,
} from "../services/tmdbService.js";
import { getLanguageCodes, getGenreIds } from "../utils/languageMap.js";
import { directSearchSchema } from "../middleware/validate.js";
import {
  MediaDetailsRequest,
  FindMoviesRequest,
  GetSimilarRequest,
  MediaExtrasRequest,
  AiSuggestion,
  StructuredParams,
  MoviesResponse,
  EnrichedMedia,
  DirectSearchRequest,
} from "../types/index.js";
import { childLogger } from "../utils/logger.js";
import { recordSearch, recordWatchEvent } from "../db/repositories.js";

const log = childLogger("search");

/**
 * `GET /api/media/:mediaType/:id` — full record for a single title.
 *
 * A GET rather than a reuse of `POST /api/media-details` because this is a
 * pure read of an immutable-ish resource, and every caching layer between the
 * browser and here — the CDN, Next.js's data cache, the browser itself — only
 * caches GETs. The Next.js detail route is server-rendered and revalidated on
 * a timer, so it needs a request that is legitimately cacheable.
 *
 * Responds 404 when TMDB has no such id, so the page can render `notFound()`
 * instead of an empty shell.
 */
export const getMediaById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { mediaType, id } = req.params;

  if (mediaType !== "movie" && mediaType !== "tv") {
    res.status(400).json({ error: "mediaType must be 'movie' or 'tv'" });
    return;
  }

  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) {
    res.status(400).json({ error: "id must be a positive integer" });
    return;
  }

  const cacheKey = CacheKeys.details(mediaType, numericId);
  const cached = await cache.get<EnrichedMedia>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const data = await fetchFullDetailsById(numericId, mediaType);

    if (!data) {
      res.status(404).json({ error: "Not found" });
      return;
    }

    await cache.set(cacheKey, data, 3600);

    // A detail fetch is the strongest passive signal of interest the app
    // has — stronger than a search, weaker than a watchlist add — and it is
    // what Phase 5's taste profiles are built from. Fire-and-forget, and a
    // no-op when either the database or the user is absent.
    if (req.user?.userId) {
      void recordWatchEvent({
        userId: req.user.userId,
        tmdbId: data.id,
        mediaType: data.media_type,
        title: data.title,
        genres: data.genres ?? [],
        action: "viewed",
      });
    }

    res.json(data);
  } catch (e) {
    log.error({ err: String(e) }, "[Media] Detail fetch error:");
    res.status(500).json({ error: "Failed to fetch details" });
  }
};

export const getMediaDetails = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, title, year, media_type } = req.body as MediaDetailsRequest;

  // Check cache for details to save API calls
  const cacheKey = id
    ? CacheKeys.details(media_type, id)
    : CacheKeys.detailsByTitle(title ?? "", year, media_type);
  const cached = await cache.get(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    let data;

    if (id) {
      // Returns the complete record rather than just genres/director/cast.
      // The Next.js detail route renders from an id alone and has no prior
      // state to merge the extras into; the modal this endpoint was built for
      // did. Callers that already hold a title are unaffected — they just
      // receive fields they were going to overwrite anyway.
      data = await fetchFullDetailsById(id, media_type);
    } else if (title) {
      data = await fetchEnrichedData(title, year, media_type);
    }

    if (data) {
      await cache.set(cacheKey, data, 3600); // Cache details for 1 hour
      res.json(data);
    } else {
      res.json({}); // Return empty if not found to stop spinner
    }
  } catch (e) {
    log.error({ err: String(e) }, "Detail Fetch Error:");
    res.status(500).json({ error: "Failed to fetch details" });
  }
};

/**
 * Heuristically decides whether a query looks like a bare title (e.g. "Inception",
 * "3 Idiots") rather than a plot description. Title-like queries skip the AI
 * pipeline entirely and go straight to a direct TMDB search, since asking an LLM
 * to "identify" a query that's already the title is wasted latency and cost.
 *
 * Two signals disqualify a query from being title-like:
 *  1. It contains a plot/narrative word (see `plotKeywords`) — e.g. "man controlling a girl"
 *     is clearly a description, not a title.
 *  2. It's longer than 4 words — real movie/show titles are almost always short;
 *     anything longer is more likely a sentence describing the plot.
 */
function isLikelyTitleQuery(query: string): boolean {
  if (!query) return false;

  const q = query.toLowerCase().trim();

  // Plot-style indicators (verbs, conjunctions, pronouns)
  const plotKeywords = [
    "about",
    "story",
    "where",
    "who",
    "man",
    "woman",
    "boy",
    "girl",
    "based on",
    "set in",
    "finds",
    "journey",
    "controlling",
    "kills",
    "loves",
    "escapes",
    "seeks",
    "discovers",
  ];

  if (plotKeywords.some((k) => q.includes(k))) return false;

  // Too long or has too many spaces → likely a description
  const words = q.split(/\s+/);
  if (words.length > 4) return false;

  // Looks like a clean title
  return true;
}

/**
 * Detects generic browsing-style queries that are too vague for AI
 * and would be better served by direct TMDB search.
 *
 * Examples that should match:
 *  - "akshay kumar movies"
 *  - "comedy movies"
 *  - "best horror films"
 *  - "top akshay kumar movies"
 *  - "shah rukh khan films"
 *  - "recent thriller movies"
 */
function isGenericBrowsingQuery(query: string): boolean {
  if (!query) return false;
  const q = query.toLowerCase().trim();

  // Pattern 1: "<actor name> movies/films" or "movies by <actor>"
  // e.g. "akshay kumar movies", "shah rukh khan films"
  const genericSuffixPattern = /^(.+?)\s+(movies?|films?|shows?|series)$/i;
  const genericPrefixPattern =
    /^(best|top|latest|recent|new|popular|all)\s+(.+?)\s*(movies?|films?|shows?|series)?$/i;
  const moviesOfPattern =
    /^(movies?|films?|shows?|series)\s+(by|of|from|with)\s+/i;

  if (genericSuffixPattern.test(q)) {
    // Check that the prefix part doesn't contain plot words
    const match = q.match(genericSuffixPattern);
    const prefix = match![1];
    const plotWords = [
      "about",
      "where",
      "who",
      "story",
      "based on",
      "set in",
      "journey",
      "finds",
      "kills",
      "loves",
    ];
    if (!plotWords.some((pw) => prefix.includes(pw))) {
      log.debug(
        `[Search] Detected generic browsing query (suffix pattern): "${q}"`
      );
      return true;
    }
  }

  if (genericPrefixPattern.test(q)) {
    const match = q.match(genericPrefixPattern);
    const middle = match![2];
    const plotWords = ["about", "where", "who", "story", "based on", "set in"];
    if (!plotWords.some((pw) => middle.includes(pw))) {
      log.debug(
        `[Search] Detected generic browsing query (prefix pattern): "${q}"`
      );
      return true;
    }
  }

  if (moviesOfPattern.test(q)) {
    log.debug(
      `[Search] Detected generic browsing query (of/by pattern): "${q}"`
    );
    return true;
  }

  return false;
}

/**
 * Main search entry point (`POST /api/find-movies`).
 *
 * Routing order (fastest/cheapest path first, most expensive last):
 *   1. Cache lookup — identical description string, case/whitespace-insensitive.
 *   2. Fast path — bare title query (`isLikelyTitleQuery`) → direct TMDB search.
 *   3. Fast path — generic browsing query, e.g. "akshay kumar movies" (`isGenericBrowsingQuery`)
 *      → direct TMDB search. If TMDB comes back empty, falls through to the AI path
 *      rather than giving up (regex heuristics can misfire on ambiguous queries).
 *   4. AI path:
 *      a. `extractStructuredParams` — decompose the query into language/genre/actor/
 *         plot fields so the identification prompt can apply hard constraints.
 *         If the AI itself flags the query as generic (and our regexes missed it),
 *         short-circuit to direct TMDB search here too.
 *      b. `callGroqWithFallback` — ask the LLM to identify 1-3 real titles, grounded
 *         with TMDB/Wikipedia/DDG context (see `aiService.getStableContext`).
 *      c. If the AI returns nothing AND the query is short (<8 words), try one more
 *         direct TMDB search using AI-extracted keywords (`extractKeywords`) as a
 *         last-resort fallback — but only for short queries, since a long plot
 *         description turned into a keyword search tends to produce noise.
 *      d. Resolve each AI-suggested {title, year, media_type} against TMDB
 *         (`fetchEnrichedData`, which does the fuzzy-matching/robust search).
 *         If none of the AI's suggestions resolve to a real TMDB entry, fall back
 *         to a direct TMDB search with the extracted keywords.
 *
 * Successful responses are cached; TTL varies by which path produced the result
 * (1hr for direct-search fast paths, 5min for the short-query keyword fallback,
 * 24hr for a fully resolved AI result — the most expensive path to reproduce).
 */

export const directSearch = async (
  req: Request<{}, {}, DirectSearchRequest>,
  res: Response
): Promise<void> => {
  const { query } = directSearchSchema.parse(req.body);
  const directResults = await searchTmdbDirect(query);
  const enriched = await enrichWithDeepData(directResults);
  const cacheKey = CacheKeys.directSearch(query);

  await cache.set(cacheKey, { movies: enriched }, 3600);

  void recordSearch({
    userId: req.user?.userId ?? null,
    query,
    resultsCount: enriched.length,
    resolvedBy: "title",
    durationMs: 0,
  });

  res.setHeader("X-Resolved-By", "title");
  res.json({ movies: enriched });
};

export const findMovies = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { description, mode = "ai" } = req.body as FindMoviesRequest;
  if (!description) {
    res.status(400).json({ error: "Description required" });
    return;
  }

  const cacheKey = CacheKeys.search(mode, description);
  const startedAt = Date.now();

  /**
   * Single exit point for a successful search.
   *
   * `findMovies` has six of them across its routing ladder, and every one had
   * to cache, respond and — now — record. Centralising it keeps those three
   * from drifting apart, and makes `resolvedBy` cheap to attach: which branch
   * answered is the one thing the Phase 5 eval harness most needs and the
   * logs never recorded.
   */
  const respond = async (
    movies: EnrichedMedia[],
    resolvedBy:
      | "cache"
      | "title"
      | "generic"
      | "ai-generic"
      | "ai"
      | "recommend"
      | "keyword-fallback"
      | "none",
    ttlSeconds: number | null
  ): Promise<void> => {
    const response: MoviesResponse = { movies };
    if (ttlSeconds !== null) await cache.set(cacheKey, response, ttlSeconds);

    // Not awaited: recording that a search happened must never be able to
    // delay or fail the search itself. The repository swallows its own errors.
    void recordSearch({
      userId: req.user?.userId ?? null,
      query: description,
      resultsCount: movies.length,
      resolvedBy,
      durationMs: Date.now() - startedAt,
    });

    res.setHeader("X-Resolved-By", resolvedBy);
    res.json(response);
  };

  const cached = await cache.get<MoviesResponse>(cacheKey);
  if (cached) {
    log.debug(`[Cache] Hit: "${description.substring(0, 20)}..."`);
    await respond(cached.movies, "cache", null);
    return;
  }

  try {
    log.debug(`[Search] Processing: "${description.substring(0, 50)}..."`);

    let aiResults: AiSuggestion[] = [];
    const isTitle = isLikelyTitleQuery(description);
    const isGeneric = isGenericBrowsingQuery(description);

    // ─── Recommend Mode ─────────────────────────────────────────
    if (mode === "recommend") {
      log.debug("[Search] Recommend mode requested. Skipping fast paths.");

      let structuredParams: StructuredParams | null = null;
      try {
        structuredParams = await extractStructuredParams(description);
      } catch (e) {
        log.warn(
          "[Search] Structured param extraction failed in recommend mode."
        );
      }

      if (structuredParams) {
        let dateGte = "";
        let dateLte = "";
        if (structuredParams.era) {
          const eraMatch = structuredParams.era.match(/(\d{4})s?/);
          if (eraMatch) {
            const year = parseInt(eraMatch[1], 10);
            dateGte = `${year}-01-01`;
            dateLte = `${year + 9}-12-31`;
          }
        }

        const languageCodes = getLanguageCodes(structuredParams.language);
        const languageCode = languageCodes[0] || "";
        const genreIds = getGenreIds(structuredParams.genres);
        const preferredType = structuredParams.media_types[0] || "movie";

        const discoverResults = await fetchRecommendPool(
          languageCode,
          genreIds,
          preferredType,
          dateGte,
          dateLte
        );

        if (discoverResults.length > 0) {
          log.debug(
            `[Search] Fetched ${discoverResults.length} candidates from TMDB discover.`
          );
          const recommendedTitles = await callGroqRecommend(
            description,
            discoverResults
          );

          if (recommendedTitles && recommendedTitles.length > 0) {
            log.debug(
              `[Search] AI ranked ${recommendedTitles.length} titles from candidate pool.`
            );
            // Resolve against TMDB again
            const results = await Promise.all(
              recommendedTitles.map((item) =>
                fetchEnrichedData(
                  item.title,
                  item.year?.toString() || "",
                  item.media_type || preferredType
                )
              )
            );
            const foundMovies = results.filter(Boolean) as EnrichedMedia[];
            if (foundMovies.length > 0) {
              await respond(foundMovies, "recommend", 86400);
              return;
            }
          }
        }
      }

      log.debug(
        "[Search] Recommend mode yielded nothing. Falling back to AI ladder."
      );
    }

    // ─── Fast Path: Direct title lookup ─────────────────────────
    if (mode !== "recommend" && isTitle) {
      log.debug("[Search] Detected title query. Skipping AI Search.");

      const directResults = await searchTmdbDirect(description);

      if (directResults.length > 0) {
        const enriched = await enrichWithDeepData(directResults);
        await respond(enriched, "title", 3600);
        return;
      }
    }

    // ─── Fast Path: Generic browsing query ──────────────────────
    if (mode !== "recommend" && isGeneric) {
      log.debug(
        "[Search] Detected generic browsing query. Skipping AI, using TMDB direct search."
      );

      const directResults = await searchTmdbDirect(description);

      if (directResults.length > 0) {
        const enriched = await enrichWithDeepData(directResults);
        await respond(enriched, "generic", 3600);
        return;
      }
      // If direct search fails for generic query, fall through to AI
    }

    // ─── AI Path: Extract structured params first ───────────────
    let structuredParams: StructuredParams | null = null;
    try {
      structuredParams = await extractStructuredParams(description);

      // Double-check: if AI says it's generic but our regex missed it
      if (
        mode !== "recommend" &&
        structuredParams?.is_generic &&
        !structuredParams.plot_keywords
      ) {
        log.debug(
          "[Search] AI flagged query as generic. Using TMDB direct search."
        );
        const directResults = await searchTmdbDirect(description);
        if (directResults.length > 0) {
          const enriched = await enrichWithDeepData(directResults);
          await respond(enriched, "ai-generic", 3600);
          return;
        }
      }
    } catch (e) {
      log.warn(
        "[Search] Structured param extraction failed, continuing with basic AI search."
      );
    }

    // ─── AI Search with structured context ──────────────────────
    let aiKeywords: string = description;
    try {
      const aiData: AiSuggestion[] | any = await callGroqWithFallback(
        description,
        structuredParams
      );
      // Handle both old {results, keywords} and new [results] formats
      if (Array.isArray(aiData)) {
        aiResults = aiData;
        aiKeywords = description;
      } else {
        aiResults = aiData.results || [];
        aiKeywords = aiData.keywords || description;
      }
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 429) {
        res.status(429).json({
          error: "AI service rate limit exceeded. Please try again later.",
          status: 429,
        });
        return;
      }
      log.warn("[Search] AI Service Failed. Switching to Fallback.");
    }

    // 2. Fallback Logic: Direct TMDB Search if AI returned nothing AND it's a short query
    if (
      (!aiResults || aiResults.length === 0) &&
      description.split(" ").length < 8
    ) {
      log.debug(
        "[Search] AI returned 0 results. Executing Direct TMDB Search with keywords."
      );

      // Extract clean keywords if it's currently a full description
      if (aiKeywords === description) {
        aiKeywords = await extractKeywords(description);
        log.debug(`[Fallback] Extracted Keywords: "${aiKeywords}"`);
      }

      const directResults = await searchTmdbDirect(aiKeywords);

      if (directResults.length > 0) {
        const enriched = await enrichWithDeepData(directResults);
        await respond(enriched, "keyword-fallback", 300);
        return;
      }
    }

    // If it's a long description and AI returned nothing, we stop here rather than showing irrelevant TMDB results
    if (!aiResults || aiResults.length === 0) {
      // Not cached: an empty result is usually a retrieval failure rather
      // than a fact about the catalogue, and caching it would pin that
      // failure in place for everyone who asks the same thing.
      await respond([], "none", null);
      return;
    }

    // 3. Normal AI Flow — resolve AI suggestions against TMDB
    // Determine media type preferences from structured params or description
    const userWantsTV = /show|series|season/i.test(description);

    log.debug({ payload: JSON.stringify(aiResults) }, `[Search] AI Results:`);
    const results = await Promise.all(
      aiResults.map((item) => {
        // Use the AI's media_type, but allow both types if unspecified
        let effectiveType = item.media_type || "movie";
        if (userWantsTV) effectiveType = "tv";

        log.debug(
          `[Search] Fetching: "${item.title}" (${item.year}) [${effectiveType}]`
        );
        return fetchEnrichedData(
          item.title,
          item.year?.toString() || "",
          effectiveType
        );
      })
    );

    const foundMovies = results.filter(Boolean) as EnrichedMedia[];

    if (foundMovies.length === 0) {
      // If AI gave titles but TMDB found nothing, try Direct Search with keywords as last resort
      log.debug(
        `[Search] AI suggestions not found in TMDB. Trying Direct Search with: "${aiKeywords}"`
      );
      const directResults = await searchTmdbDirect(aiKeywords);
      const enriched = await enrichWithDeepData(directResults);
      await respond(
        enriched,
        "keyword-fallback",
        enriched.length > 0 ? 300 : null
      );
      return;
    } else {
      await respond(foundMovies, "ai", 86400);
      return;
    }
  } catch (error) {
    log.error({ err: String(error) }, "[Search Controller]");
    res.status(500).json({ error: "Server error" });
  }
};

/**
 * `POST /api/get-similar` — "Find Similar" for a specific title.
 *
 * 1. Ask the LLM for 5 similar titles, grounded with the source title's own
 *    genres/plot/cast/director (`callGroqSimilar`), then resolve each suggestion
 *    against TMDB (`fetchEnrichedData`).
 * 2. If the AI call fails or every suggestion fails to resolve, fall back to
 *    TMDB's native `/similar` endpoint (`getNativeTmdbRecommendations`) — lower
 *    quality (no thematic reasoning, just TMDB's own similarity graph) but always
 *    available and doesn't depend on the LLM being up.
 */
export const getSimilar = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { title, media_type, year, genres, overview, cast, director } =
    req.body as GetSimilarRequest;
  if (!title || !media_type) {
    res.status(400).json({ error: "Title/Type required" });
    return;
  }

  try {
    let finalResults: EnrichedMedia[] = [];

    // 1. Try AI with enriched context
    try {
      const enrichedData = { genres, overview, cast, director };
      const recommendations = await callGroqSimilar(
        title,
        media_type,
        year,
        enrichedData
      );
      if (recommendations && recommendations.length > 0) {
        const enriched = await Promise.all(
          recommendations.map((item) =>
            fetchEnrichedData(
              item.title,
              item.year?.toString() || "",
              item.media_type || media_type
            )
          )
        );
        finalResults = enriched.filter(Boolean) as EnrichedMedia[];
      }
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string };
      if (err.status === 429) {
        res.status(429).json({
          error: "AI service rate limit exceeded. Please try again later.",
          status: 429,
        });
        return;
      }
      log.warn("[Similar] AI Service Failed. Falling back to native.");
    }

    // 2. Fallback to Native TMDB if AI failed or returned nothing
    if (finalResults.length === 0) {
      log.debug(`[Similar] Fallback to Native for: ${title} (${media_type})`);
      const nativeRecs = await getNativeTmdbRecommendations(
        title,
        year || "",
        media_type
      );
      if (nativeRecs.length > 0) {
        finalResults = await enrichWithDeepData(nativeRecs, 10);
      }
    }

    res.json({ similar: finalResults });
  } catch (e) {
    log.error(e);
    res.status(500).json({ error: "Error" });
  }
};

export const getMediaExtras = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id, media_type } = req.body as MediaExtrasRequest;
  if (!id || !media_type) {
    res.json({});
    return;
  }

  try {
    const providers = await fetchWatchProviders(id, media_type);
    res.json({ providers });
  } catch {
    res.json({ providers: [] });
  }
};
