import { Redis } from "ioredis";
import type { CacheEnvelope, CacheStore } from "./store.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("cache:redis");

/**
 * Redis-backed cache.
 *
 * Every operation is failure-tolerant on purpose. A cache is an optimisation,
 * not a source of truth, so an unreachable Redis degrades the API to
 * "uncached" rather than taking it down — reads report a miss and writes are
 * dropped. The alternative, letting a connection error propagate out of
 * `cache.get`, would mean a Redis blip returns 500s for data we could have
 * fetched from TMDB perfectly well.
 */
export class RedisCacheStore implements CacheStore {
  readonly name = "redis";

  private readonly client: Redis;
  private healthy = false;
  /** Avoids logging the same connection failure on every single request. */
  private lastErrorLoggedAt = 0;

  constructor(url: string) {
    this.client = new Redis(url, {
      // Bound how long a request can wait on a sick Redis. Without a cap,
      // ioredis retries indefinitely and a cache lookup becomes slower than
      // the upstream call it exists to avoid.
      maxRetriesPerRequest: 2,
      connectTimeout: 5_000,
      // Fail commands immediately while disconnected instead of queueing them
      // to be replayed later — a queued GET resolving after the response has
      // been sent is worse than a miss.
      enableOfflineQueue: false,
      retryStrategy: (times) => Math.min(times * 500, 5_000),
    });

    this.client.on("ready", () => {
      this.healthy = true;
      log.info("Redis connected");
    });
    this.client.on("end", () => {
      this.healthy = false;
    });
    this.client.on("error", (error: Error) => {
      this.healthy = false;
      this.throttledError(error);
    });
  }

  private throttledError(error: Error): void {
    const now = Date.now();
    if (now - this.lastErrorLoggedAt > 30_000) {
      this.lastErrorLoggedAt = now;
      log.warn({ err: error.message }, "Redis unavailable, serving uncached");
    }
  }

  async getRaw<T>(key: string): Promise<CacheEnvelope<T> | undefined> {
    try {
      const raw = await this.client.get(key);
      if (!raw) return undefined;
      return JSON.parse(raw) as CacheEnvelope<T>;
    } catch (error) {
      // A JSON parse failure means a key written by an older, incompatible
      // version. Dropping it is preferable to failing every read of that key
      // until its TTL happens to expire.
      this.throttledError(error as Error);
      void this.client.del(key).catch(() => {});
      return undefined;
    }
  }

  async setRaw<T>(
    key: string,
    envelope: CacheEnvelope<T>,
    physicalTtlSeconds: number
  ): Promise<void> {
    try {
      await this.client.set(
        key,
        JSON.stringify(envelope),
        "EX",
        physicalTtlSeconds
      );
    } catch (error) {
      this.throttledError(error as Error);
    }
  }

  async del(keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (error) {
      this.throttledError(error as Error);
    }
  }

  async delByPrefix(prefix: string): Promise<number> {
    let removed = 0;
    try {
      // SCAN rather than KEYS: KEYS is O(n) over the whole keyspace and blocks
      // the single-threaded server, which on a shared Upstash instance is
      // antisocial at best.
      let cursor = "0";
      do {
        const [next, batch] = await this.client.scan(
          cursor,
          "MATCH",
          `${prefix}*`,
          "COUNT",
          100
        );
        cursor = next;
        if (batch.length > 0) {
          removed += await this.client.del(...batch);
        }
      } while (cursor !== "0");
    } catch (error) {
      this.throttledError(error as Error);
    }
    return removed;
  }

  async ping(): Promise<boolean> {
    try {
      const reply = await this.client.ping();
      this.healthy = reply === "PONG";
      return this.healthy;
    } catch {
      this.healthy = false;
      return false;
    }
  }

  get isHealthy(): boolean {
    return this.healthy;
  }

  /** Exposed so the rate limiter can run Lua atomically on the same connection. */
  get raw(): Redis {
    return this.client;
  }

  async close(): Promise<void> {
    try {
      await this.client.quit();
    } catch {
      this.client.disconnect();
    }
  }
}
