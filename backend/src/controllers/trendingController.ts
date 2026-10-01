import { Request, Response } from "express";
import * as cache from "../cache/index.js";
import { CacheKeys } from "../cache/index.js";
import { TMDB_API_KEY, PROVIDERS } from "../config.js";
import {
  fetchTmdb,
  formatBasicTmdbResult,
  fetchEnrichedDataById,
  fetchRatings,
} from "../services/tmdbService.js";
import { mapSettledLimit } from "../utils/concurrency.js";
import { childLogger } from "../utils/logger.js";
import {
  TrendingResponse,
  EnrichedMedia,
  BasicTmdbResult,
} from "../types/index.js";

const log = childLogger("trending");

/** Six hours — trending genuinely moves about that fast. */
const TRENDING_TTL_SECONDS = 21_600;

/**
 * Enriches a shelf with credits, providers and ratings.
 *
 * Bounded and settled. Previously this was `Promise.all` over twelve items,
 * each firing three more requests, across three shelves simultaneously — one
 * unavailable title rejected the batch and blanked the shelf, and the
 * aggregate fan-out was what produced the upstream failures in the first
 * place.
 */
async function enrichShelf(items: BasicTmdbResult[]): Promise<EnrichedMedia[]> {
  const settled = await mapSettledLimit(items, async (item) => {
    const [extra, ratings] = await Promise.all([
      fetchEnrichedDataById(item.id, item.media_type),
      fetchRatings(item.title, item.release_date?.split("-")[0]),
    ]);

    return {
      ...item,
      ...extra,
      imdb_rating: ratings.imdb ?? null,
      rotten_tomatoes: ratings.rt ?? null,
    } as EnrichedMedia;
  });

  const enriched: EnrichedMedia[] = [];
  let failed = 0;

  for (const [index, result] of settled.entries()) {
    if (result.status === "fulfilled") {
      enriched.push(result.value);
    } else {
      failed++;
      // Keep the un-enriched item rather than dropping it. A poster and title
      // with no rating is still a usable card; a missing card is a hole.
      enriched.push({
        ...items[index],
        imdb_rating: null,
        rotten_tomatoes: null,
      } as EnrichedMedia);
    }
  }

  if (failed > 0) {
    log.warn({ failed, total: items.length }, "Some titles failed enrichment");
  }

  return enriched;
}

/**
 * Serves a trending shelf through the cache, falling back to a stale copy if
 * the upstream refresh fails.
 *
 * Every shelf shared the same read/miss/fetch/write/500 shape, including the
 * bug where an upstream error produced a 500 even though a perfectly
 * serviceable payload was sitting in the cache one second past its TTL.
 */
async function serveShelf(
  res: Response,
  cacheKey: string,
  produce: () => Promise<EnrichedMedia[]>
): Promise<void> {
  try {
    const { value, hit, stale } = await cache.remember(
      cacheKey,
      TRENDING_TTL_SECONDS,
      async () => ({ results: await produce() }) satisfies TrendingResponse
    );

    res.setHeader("X-Cache", stale ? "STALE" : hit ? "HIT" : "MISS");
    res.json(value);
  } catch (error) {
    log.error({ err: (error as Error).message, cacheKey }, "Shelf failed");
    res.status(502).json({ error: "Could not load trending titles" });
  }
}

// ─── Producers ──────────────────────────────────────────────────────────────
// Kept separate from the request handlers so the background refresh job can
// repopulate the cache without faking an Express req/res pair.

export async function loadTrendingAll(): Promise<EnrichedMedia[]> {
  const url = `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&language=en-US`;
  const data = await fetchTmdb(url);

  const basicResults = data.results
    .map((item) => formatBasicTmdbResult(item))
    .filter((item): item is BasicTmdbResult => item !== null);

  return enrichShelf(basicResults.slice(0, 12));
}

export async function loadTrendingIndian(): Promise<EnrichedMedia[]> {
  const movieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta|ml`;
  const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&watch_region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta|ml`;

  const [movies, tv] = await Promise.all([
    fetchTmdb(movieUrl),
    fetchTmdb(tvUrl),
  ]);

  const basicResults = [
    ...movies.results
      .slice(0, 10)
      .map((m) => formatBasicTmdbResult(m, "movie")),
    ...tv.results.slice(0, 10).map((t) => formatBasicTmdbResult(t, "tv")),
  ]
    .filter((item): item is BasicTmdbResult => item !== null)
    .sort(() => Math.random() - 0.5);

  return enrichShelf(basicResults.slice(0, 12));
}

export async function loadTrendingPlatform(
  providerId: number
): Promise<EnrichedMedia[]> {
  const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&watch_region=IN&with_watch_providers=${providerId}&sort_by=popularity.desc`;
  const data = await fetchTmdb(url);

  const basicResults = data.results
    .map((tv) => formatBasicTmdbResult(tv, "tv"))
    .filter((item): item is BasicTmdbResult => item !== null);

  return enrichShelf(basicResults.slice(0, 12));
}

// ─── Handlers ───────────────────────────────────────────────────────────────

export const getTrendingAll = async (
  _req: Request,
  res: Response
): Promise<void> => {
  await serveShelf(res, CacheKeys.trending("all"), loadTrendingAll);
};

export const getTrendingIndian = async (
  _req: Request,
  res: Response
): Promise<void> => {
  await serveShelf(res, CacheKeys.trending("indian"), loadTrendingIndian);
};

export const getTrendingPlatform = async (
  req: Request,
  res: Response
): Promise<void> => {
  // Express 5 types this as `string | string[]`, since a route can repeat a
  // param name. Ours cannot, but the narrowing has to be explicit.
  const platform = String(req.params.platform ?? "");
  const providerId = PROVIDERS[platform as keyof typeof PROVIDERS];

  if (!providerId) {
    res.status(400).json({
      error: `Unknown platform. Expected one of: ${Object.keys(PROVIDERS).join(", ")}`,
    });
    return;
  }

  await serveShelf(res, CacheKeys.trending(platform), () =>
    loadTrendingPlatform(providerId)
  );
};
