import {
  getRecentHistory,
  getUsersWithRecentActivity,
  saveTasteProfile,
} from "../db/repositories.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("jobs:taste");

/**
 * Half-life for recency weighting, in days.
 *
 * A straight count would let a genre someone binged two years ago outweigh
 * what they are watching now. Exponential decay keeps old activity
 * contributing without letting it dominate.
 */
const HALF_LIFE_DAYS = 90;

/** Actions weighted by how much intent they actually demonstrate. */
const ACTION_WEIGHTS: Record<string, number> = {
  searched: 0.3,
  viewed: 0.5,
  watchlisted: 1,
  watched: 2,
};

function decayFactor(timestamp: Date | null): number {
  if (!timestamp) return 0.5;
  const ageDays = (Date.now() - timestamp.getTime()) / 86_400_000;
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

function topN<T extends string>(
  weights: Map<T, number>,
  limit: number
): { key: T; weight: number }[] {
  return [...weights.entries()]
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit)
    .map(([key, weight]) => ({ key, weight: Number(weight.toFixed(3)) }));
}

/**
 * Recomputes one user's taste profile from their history.
 *
 * Derived data — the profile table can be dropped and rebuilt from
 * `watch_history` at any time, which is why it is safe to overwrite wholesale
 * rather than merge.
 *
 * Genres only, for now. Actors and directors need the cast/crew of each
 * historical item, and `watch_history` stores only genres; joining back to
 * TMDB for every row would make this job dramatically more expensive.
 * Phase 5 widens the table when it needs them.
 */
export async function computeTasteProfile(userId: string): Promise<void> {
  const history = await getRecentHistory(userId, 365, 1_000);
  if (history.length === 0) return;

  const genreWeights = new Map<string, number>();

  for (const entry of history) {
    const weight =
      (ACTION_WEIGHTS[entry.action] ?? 0.5) * decayFactor(entry.createdAt);
    for (const genre of entry.genres ?? []) {
      genreWeights.set(genre, (genreWeights.get(genre) ?? 0) + weight);
    }
  }

  await saveTasteProfile(userId, {
    topGenres: topN(genreWeights, 10).map(({ key, weight }) => ({
      genre: key,
      weight,
    })),
    topActors: [],
    topDirectors: [],
    preferredLanguages: [],
    avgRatingPreference: null,
  });
}

/** Recomputes profiles for everyone active in the window. */
export async function refreshTasteProfiles(): Promise<void> {
  const active = await getUsersWithRecentActivity(24);
  if (active.length === 0) return;

  let updated = 0;
  for (const { userId } of active) {
    if (!userId) continue;
    try {
      await computeTasteProfile(userId);
      updated++;
    } catch (error) {
      log.warn(
        { userId, err: (error as Error).message },
        "Taste profile computation failed"
      );
    }
  }

  log.info({ active: active.length, updated }, "Taste profiles refreshed");
}
