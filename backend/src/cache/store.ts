/**
 * Everything stored in the cache is wrapped in this envelope.
 *
 * The physical TTL the backing store is given is deliberately longer than the
 * logical one recorded here. That gap is what makes stale-while-revalidate
 * possible: once `freshUntil` passes, the entry is no longer served on the
 * happy path, but it is still there to fall back on when the upstream call
 * that was supposed to replace it fails.
 *
 * Without this, an upstream outage turned a perfectly serviceable
 * five-minute-old payload into a 500.
 */
export interface CacheEnvelope<T> {
  value: T;
  /** Epoch millis after which the entry is stale but still usable. */
  freshUntil: number;
}

export interface StaleResult<T> {
  value: T;
  stale: boolean;
}

/**
 * The storage contract. Implemented by the in-process store and the Redis one.
 *
 * Every method is async even where the memory implementation is synchronous,
 * because the call sites have to be written against the slower of the two.
 */
export interface CacheStore {
  readonly name: string;
  getRaw<T>(key: string): Promise<CacheEnvelope<T> | undefined>;
  setRaw<T>(
    key: string,
    envelope: CacheEnvelope<T>,
    physicalTtlSeconds: number
  ): Promise<void>;
  del(keys: string[]): Promise<void>;
  /** Returns the number of keys removed. */
  delByPrefix(prefix: string): Promise<number>;
  /** True when the backing store is reachable. */
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

/**
 * How long an entry outlives its freshness window.
 *
 * 24 hours is a judgement call: long enough to cover a realistic upstream
 * outage or a Groq rate-limit window, short enough that nothing truly ancient
 * is ever shown. Trending data is the main beneficiary, and a day-old shelf is
 * still a far better answer than an error page.
 */
export const STALE_GRACE_SECONDS = 86_400;
