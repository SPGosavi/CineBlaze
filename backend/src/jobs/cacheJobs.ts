import * as cache from "../cache/index.js";
import { CacheKeys } from "../cache/index.js";
import { PROVIDERS } from "../config.js";
import {
  loadTrendingAll,
  loadTrendingIndian,
  loadTrendingPlatform,
} from "../controllers/trendingController.js";
import { getPopularQueries } from "../db/repositories.js";
import { fetchFullDetailsById } from "../services/tmdbService.js";
import { childLogger } from "../utils/logger.js";
import { mapSettledLimit } from "../utils/concurrency.js";
import type { EnrichedMedia, TrendingResponse } from "../types/index.js";

const log = childLogger("jobs");

const TRENDING_TTL_SECONDS = 21_600;

/**
 * Rebuilds every trending shelf.
 *
 * The point is to move the cold-start cost off the user's request. Previously
 * the first visitor after a TTL expiry paid for the whole fan-out — twelve
 * titles times three upstream calls per shelf — and waited for it. Now that
 * happens on a timer and the shelves are warm by the time anyone asks.
 *
 * Writes through the same keys the request path reads, so there is no second
 * code path to keep in sync.
 */
export async function refreshTrending(): Promise<void> {
  const shelves: { key: string; load: () => Promise<EnrichedMedia[]> }[] = [
    { key: CacheKeys.trending("all"), load: loadTrendingAll },
    { key: CacheKeys.trending("indian"), load: loadTrendingIndian },
    ...Object.entries(PROVIDERS).map(([platform, providerId]) => ({
      key: CacheKeys.trending(platform),
      load: () => loadTrendingPlatform(providerId),
    })),
  ];

  // Sequential on purpose. These are the heaviest outbound consumers in the
  // app and this runs in the background — there is no user waiting, so there
  // is no reason to compete with live traffic for the concurrency budget.
  for (const shelf of shelves) {
    try {
      const results = await shelf.load();
      await cache.set(
        shelf.key,
        { results } satisfies TrendingResponse,
        TRENDING_TTL_SECONDS
      );
      log.info({ shelf: shelf.key, count: results.length }, "Shelf refreshed");
    } catch (error) {
      // Leave the existing entry alone. It is stale but serviceable, and
      // stale-while-revalidate will keep serving it.
      log.warn(
        { shelf: shelf.key, err: (error as Error).message },
        "Shelf refresh failed — keeping previous entry"
      );
    }
  }
}

/**
 * Pre-fetches details for titles currently on the trending shelves.
 *
 * These are, by construction, the titles most likely to be clicked next, and
 * their detail pages are server-rendered — so a miss costs the visitor a
 * round trip to TMDB plus OMDb before the page can render at all.
 */
export async function warmDetailCache(): Promise<void> {
  const shelfKeys = [
    CacheKeys.trending("all"),
    CacheKeys.trending("indian"),
    ...Object.keys(PROVIDERS).map((platform) => CacheKeys.trending(platform)),
  ];

  const seen = new Set<string>();
  const targets: { id: number; mediaType: "movie" | "tv" }[] = [];

  for (const key of shelfKeys) {
    const shelf = await cache.get<TrendingResponse>(key);
    for (const item of shelf?.results ?? []) {
      const dedupeKey = `${item.media_type}:${item.id}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      targets.push({ id: item.id, mediaType: item.media_type });
    }
  }

  if (targets.length === 0) return;

  let warmed = 0;
  await mapSettledLimit(targets, async ({ id, mediaType }) => {
    const key = CacheKeys.details(mediaType, id);
    if ((await cache.get(key)) !== undefined) return;

    const details = await fetchFullDetailsById(id, mediaType);
    if (details) {
      await cache.set(key, details, 3_600);
      warmed++;
    }
  });

  log.info({ candidates: targets.length, warmed }, "Detail cache warmed");
}

/**
 * Re-runs the most frequent recent searches so their cache entries stay warm.
 *
 * This is the only lever available against the ~30s uncached AI search
 * without changing the retrieval architecture: it cannot make a cold search
 * faster, it can only make fewer searches cold. Actually fixing the latency
 * is Phase 5's embeddings work.
 *
 * No-op when there is no database — popularity is not knowable without the
 * query log.
 */
export async function warmPopularSearches(
  runSearch: (description: string) => Promise<unknown>
): Promise<void> {
  const popular = await getPopularQueries(10, 7);
  if (popular.length === 0) return;

  let warmed = 0;
  for (const { query } of popular) {
    const key = CacheKeys.search(query);
    if ((await cache.get(key)) !== undefined) continue;

    try {
      await runSearch(query);
      warmed++;
    } catch (error) {
      log.warn(
        { query, err: (error as Error).message },
        "Popular search warm failed"
      );
    }
  }

  log.info({ candidates: popular.length, warmed }, "Popular searches warmed");
}
