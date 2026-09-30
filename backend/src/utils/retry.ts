/** Resolves after `ms` milliseconds. */
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exponential backoff with jitter: ~500ms, ~1s, ~2s (+/- up to 100ms).
 *
 * The jitter matters when several requests fail at once, as happens when a
 * cold Discover page fans out to TMDB. Without it every retry would fire in
 * lockstep and recreate the burst that caused the failure.
 */
export function backoffDelay(attempt: number): number {
  const base = 500 * 2 ** (attempt - 1);
  const jitter = Math.random() * 100;
  return base + jitter;
}

/**
 * Whether a failed HTTP attempt is worth repeating.
 *
 * 429 and 5xx are transient. Other 4xx are the caller's fault and will fail
 * identically on every retry, so repeating them only adds latency.
 */
export function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}
