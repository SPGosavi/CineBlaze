import { OUTBOUND_CONCURRENCY } from "../config.js";

/**
 * Maps over items with a ceiling on how many run at once, and never rejects.
 *
 * Two problems in one helper, because they showed up together:
 *
 * 1. **Unbounded fan-out.** Enrichment used bare `Promise.all` over twelve
 *    items x three calls, on three shelves, all started in the same tick.
 *    Over a hundred simultaneous sockets to TMDB and OMDb is how the
 *    connection resets and 429s that earlier phases absorbed with retries
 *    were being generated — the retries were treating a self-inflicted
 *    thundering herd as bad luck.
 *
 * 2. **All-or-nothing batches.** `Promise.all` rejects on the first failure,
 *    so one unavailable title discarded the other eleven and blanked a whole
 *    shelf. Results come back settled, so callers decide what a partial batch
 *    means.
 *
 * Order is preserved regardless of completion order, so results line up with
 * the input.
 */
export async function mapSettledLimit<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  limit: number = OUTBOUND_CONCURRENCY
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) return [];

  const results = new Array<PromiseSettledResult<R>>(items.length);
  const width = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;

  // Each runner pulls the next index off a shared cursor, so a slow item
  // holds up only its own runner rather than a whole chunk.
  const runners = Array.from({ length: width }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      try {
        results[index] = {
          status: "fulfilled",
          value: await worker(items[index], index),
        };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });

  await Promise.all(runners);
  return results;
}

/** `mapSettledLimit`, keeping only the successes. */
export async function mapLimitKeepFulfilled<T, R>(
  items: readonly T[],
  worker: (item: T, index: number) => Promise<R>,
  limit?: number
): Promise<R[]> {
  const settled = await mapSettledLimit(items, worker, limit);
  return settled
    .filter(
      (result): result is PromiseFulfilledResult<R> =>
        result.status === "fulfilled"
    )
    .map((result) => result.value);
}
