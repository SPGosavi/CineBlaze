import { REDIS_URL } from "../config.js";
import { childLogger } from "../utils/logger.js";
import { MemoryCacheStore } from "./memoryStore.js";
import { RedisCacheStore } from "./redisStore.js";
import {
  STALE_GRACE_SECONDS,
  type CacheStore,
  type StaleResult,
} from "./store.js";

const log = childLogger("cache");

const store: CacheStore = REDIS_URL
  ? new RedisCacheStore(REDIS_URL)
  : new MemoryCacheStore();

log.info(
  { store: store.name },
  REDIS_URL
    ? "Using Redis cache"
    : "REDIS_URL not set — using in-process cache (lost on restart, not shared across instances)"
);

/**
 * Key prefixes.
 *
 * Centralised so `invalidate` has something reliable to match on. Previously
 * keys were built inline at each call site as template strings, which meant
 * "delete every trending key" had no way to know what to look for.
 */
export const CacheKeys = {
  trending: (shelf: string) => `trending:${shelf}`,
  trendingPrefix: "trending:",
  search: (description: string) => `search:${description.toLowerCase().trim()}`,
  searchPrefix: "search:",
  details: (mediaType: string, id: number) => `details:${mediaType}:${id}`,
  detailsByTitle: (
    title: string,
    year: string | undefined,
    mediaType: string
  ) => `details:title:${title}:${year ?? ""}:${mediaType}`,
  detailsPrefix: "details:",
  ratings: (title: string, year: string | undefined) =>
    `ratings:${title}:${year ?? ""}`,
} as const;

/**
 * Cache-aside read. Returns only *fresh* entries.
 *
 * A stale entry is deliberately invisible here — it is reserved for
 * `getStale`, which the error path uses after an upstream call has already
 * failed.
 */
export async function get<T>(key: string): Promise<T | undefined> {
  const envelope = await store.getRaw<T>(key);
  if (!envelope) return undefined;
  if (Date.now() >= envelope.freshUntil) return undefined;
  return envelope.value;
}

/**
 * Reads an entry regardless of freshness.
 *
 * Only for the failure path: when the upstream call that should have
 * refreshed this key has thrown, a stale payload beats a 500.
 */
export async function getStale<T>(
  key: string
): Promise<StaleResult<T> | undefined> {
  const envelope = await store.getRaw<T>(key);
  if (!envelope) return undefined;
  return {
    value: envelope.value,
    stale: Date.now() >= envelope.freshUntil,
  };
}

/**
 * Writes an entry.
 *
 * `ttlSeconds` is the *freshness* window. The physical TTL is that plus the
 * stale grace period, so the value survives long enough to be a fallback.
 */
export async function set<T>(
  key: string,
  value: T,
  ttlSeconds: number
): Promise<void> {
  await store.setRaw(
    key,
    { value, freshUntil: Date.now() + ttlSeconds * 1000 },
    ttlSeconds + STALE_GRACE_SECONDS
  );
}

export async function del(...keys: string[]): Promise<void> {
  await store.del(keys);
}

/** Bulk invalidation, e.g. every trending shelf after a refresh job. */
export async function invalidatePrefix(prefix: string): Promise<number> {
  const removed = await store.delByPrefix(prefix);
  log.info({ prefix, removed }, "Cache invalidated by prefix");
  return removed;
}

/**
 * Cache-aside in one call.
 *
 * Wraps the read/miss/fetch/write/return cycle that was hand-written at nine
 * call sites, including the stale fallback. Callers that need to vary the
 * response (headers, status) still do it by hand.
 */
export async function remember<T>(
  key: string,
  ttlSeconds: number,
  produce: () => Promise<T>
): Promise<{ value: T; hit: boolean; stale: boolean }> {
  const fresh = await get<T>(key);
  if (fresh !== undefined) return { value: fresh, hit: true, stale: false };

  try {
    const value = await produce();
    await set(key, value, ttlSeconds);
    return { value, hit: false, stale: false };
  } catch (error) {
    const fallback = await getStale<T>(key);
    if (fallback) {
      log.warn(
        { key, err: (error as Error).message },
        "Upstream failed — serving stale cache entry"
      );
      return { value: fallback.value, hit: true, stale: true };
    }
    throw error;
  }
}

export const cacheBackend = (): string => store.name;

export const ping = (): Promise<boolean> => store.ping();

export const closeCache = (): Promise<void> => store.close();

/** The live Redis client, or null on the memory store. */
export const redisClient = () =>
  store instanceof RedisCacheStore ? store.raw : null;
