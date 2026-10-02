import NodeCache from "node-cache";
import type { CacheEnvelope, CacheStore } from "./store.js";

/**
 * In-process cache, used when REDIS_URL is not configured.
 *
 * This is the Phase 0-3 behaviour preserved as a fallback rather than a
 * recommendation. Its limits are the reason Phase 4 exists: the contents are
 * lost on every restart and redeploy, and two instances would each keep their
 * own divergent copy.
 */
export class MemoryCacheStore implements CacheStore {
  readonly name = "memory";

  private readonly cache: NodeCache;

  constructor() {
    // useClones: false hands back the stored reference instead of a deep copy.
    // These payloads are read-only enriched-media arrays, and cloning every
    // twelve-item shelf on every hit is pure overhead.
    this.cache = new NodeCache({ stdTTL: 3600, useClones: false });
  }

  async getRaw<T>(key: string): Promise<CacheEnvelope<T> | undefined> {
    return this.cache.get<CacheEnvelope<T>>(key);
  }

  async setRaw<T>(
    key: string,
    envelope: CacheEnvelope<T>,
    physicalTtlSeconds: number
  ): Promise<void> {
    this.cache.set(key, envelope, physicalTtlSeconds);
  }

  async del(keys: string[]): Promise<void> {
    this.cache.del(keys);
  }

  async delByPrefix(prefix: string): Promise<number> {
    const matching = this.cache.keys().filter((key) => key.startsWith(prefix));
    return this.cache.del(matching);
  }

  async ping(): Promise<boolean> {
    return true;
  }

  async close(): Promise<void> {
    this.cache.flushAll();
    this.cache.close();
  }
}
