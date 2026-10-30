import type { EnrichedMedia } from "../types/index.js";
import { getSelectionPriors } from "../db/repositories.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("ranking");

/**
 * Applies a lightweight click-feedback prior to result ordering.
 *
 * The incoming order remains the base ranking; historical clicks are used as a
 * soft boost so repeatedly selected titles rise without completely reshuffling
 * every response.
 */
export async function applyClickFeedbackPriors(
  items: EnrichedMedia[]
): Promise<EnrichedMedia[]> {
  if (items.length < 2) return items;

  const ids = Array.from(new Set(items.map((item) => item.id)));
  const priors = await getSelectionPriors(ids);

  if (Object.keys(priors).length === 0) return items;

  const scored = items.map((item, index) => {
    const clicks = priors[item.id] || 0;
    const base = items.length - index;
    const priorBoost = Math.log1p(clicks) * 0.75;
    return {
      item,
      score: base + priorBoost,
      clicks,
      index,
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  log.debug(
    {
      matchedPriors: scored.filter((row) => row.clicks > 0).length,
      total: scored.length,
    },
    "Applied click-feedback priors"
  );

  return scored.map((row) => row.item);
}
