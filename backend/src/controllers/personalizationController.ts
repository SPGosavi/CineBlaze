import type { Request, Response } from "express";
import type { ForYouResponse, UserEventRequest } from "../types/index.js";
import {
  getRecentHistory,
  getSelectionPriors,
  getTasteProfile,
  recordWatchEvent,
} from "../db/repositories.js";
import { computeTasteProfile } from "../jobs/tasteProfile.js";
import {
  fetchRecommendPool,
  enrichWithDeepData,
} from "../services/tmdbService.js";
import { getGenreIds } from "../utils/languageMap.js";
import { childLogger } from "../utils/logger.js";
import * as cache from "../cache/index.js";
import { CacheKeys } from "../cache/index.js";

const log = childLogger("personalization");

const META_LANGUAGE_PREFIX = "__lang:";
const META_YEAR_PREFIX = "__year:";
const META_RATING_PREFIX = "__rating:";

function enrichEventGenres(input: {
  genres: string[];
  languageCode?: string;
  releaseYear?: number;
  voteAverage?: number;
}): string[] {
  const values = [...input.genres.filter(Boolean)];

  if (input.languageCode) {
    values.push(`${META_LANGUAGE_PREFIX}${input.languageCode.toLowerCase()}`);
  }
  if (typeof input.releaseYear === "number") {
    values.push(`${META_YEAR_PREFIX}${Math.floor(input.releaseYear)}`);
  }
  if (typeof input.voteAverage === "number") {
    values.push(`${META_RATING_PREFIX}${input.voteAverage.toFixed(1)}`);
  }

  return Array.from(new Set(values)).slice(0, 30);
}

function topHistoryGenres(
  recentHistory: { genres: string[] | null }[],
  limit = 3
): string[] {
  const weights = new Map<string, number>();
  for (const entry of recentHistory) {
    for (const genre of entry.genres ?? []) {
      if (!genre || genre.startsWith("__")) continue;
      weights.set(genre, (weights.get(genre) ?? 0) + 1);
    }
  }
  return [...weights.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([genre]) => genre);
}

function dedupeById<T extends { id: number; media_type: string }>(
  items: T[]
): T[] {
  const seen = new Set<string>();
  const output: T[] = [];
  for (const item of items) {
    const key = `${item.media_type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

export async function postUserEvent(
  req: Request<{}, {}, UserEventRequest>,
  res: Response
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const {
    action,
    tmdbId,
    mediaType,
    title,
    genres = [],
    languageCode,
    releaseYear,
    voteAverage,
  } = req.body;

  if (!req.user.userId) {
    // `req.user` proves the caller presented a valid Firebase ID token — the
    // check above is genuine auth. `userId` is a *separate* thing: the local
    // Postgres row `attachUser` tries to upsert on every request. When the
    // database is unreachable or unconfigured, that upsert silently returns
    // null (by design — see `db/repositories.ts`'s `attempt` wrapper), which
    // used to be conflated with "not signed in" here and produced a 401 for
    // a user who very much was. There is nowhere to persist the event
    // without a local row, but refusing the request outright was the actual
    // bug — every other integration in this app degrades instead of
    // breaking, and this one should too.
    res.status(202).json({ recorded: false });
    return;
  }

  await recordWatchEvent({
    userId: req.user.userId,
    tmdbId,
    mediaType,
    title,
    genres: enrichEventGenres({
      genres,
      languageCode,
      releaseYear,
      voteAverage,
    }),
    action,
  });

  // Keep profile refresh asynchronous to avoid delaying the UX.
  if (action === "watchlisted" || action === "watched") {
    void computeTasteProfile(req.user.userId).catch((error) => {
      log.warn(
        { userId: req.user?.userId, err: String((error as Error).message) },
        "Taste profile refresh after event failed"
      );
    });
  }

  await cache.invalidatePrefix(CacheKeys.forYouPrefix);

  res.status(204).end();
}

export async function getForYou(req: Request, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const countRaw = Number(req.query.count);
  const count = Number.isFinite(countRaw)
    ? Math.max(1, Math.min(20, Math.floor(countRaw)))
    : 10;

  // Same distinction as `postUserEvent`: `req.user` is genuine proof of
  // identity (a verified Firebase token). `req.user.userId` is the local
  // Postgres row, which is null whenever the database is unreachable or
  // unconfigured — previously treated as "not authenticated" and refused
  // with a 401, which is what made this endpoint fail outright in any
  // environment where the database has a problem, while every other
  // integration in this app (Redis, Postgres, Firebase) is designed to
  // degrade instead. A cache key still needs *some* stable identifier, so
  // fall back to the Firebase uid when there is no Postgres row.
  const cacheIdentity = req.user.userId ?? `fb:${req.user.uid}`;
  const key = CacheKeys.forYou(cacheIdentity, count);

  try {
    const cached = await cache.get<ForYouResponse>(key);
    if (cached) {
      res.json(cached);
      return;
    }

    // Without a Postgres row there is no taste profile or watch history to
    // read — that naturally produces the same "cold" tier a brand-new user
    // gets below, which is the correct degraded behavior rather than an
    // error.
    const userId = req.user.userId;
    const profile = userId ? await getTasteProfile(userId) : null;
    const recentHistory = userId
      ? await getRecentHistory(userId, 180, 200)
      : [];

    const warmEventCount = recentHistory.length;
    const tier: "cold" | "sparse" | "warm" =
      warmEventCount === 0 ? "cold" : warmEventCount < 5 ? "sparse" : "warm";

    const profileTopGenres = (profile?.topGenres || [])
      .map((entry) => entry.genre)
      .filter((genre) => !genre.startsWith("__"));
    const sparseTopGenres = topHistoryGenres(recentHistory, 3);
    const topGenres =
      profileTopGenres.length > 0
        ? profileTopGenres.slice(0, 3)
        : sparseTopGenres;

    const preferredLanguages = (profile?.preferredLanguages || []).filter(
      Boolean
    );
    const primaryLanguage = preferredLanguages[0] || "";

    const movieEvents = recentHistory.filter(
      (entry) => entry.mediaType === "movie"
    ).length;
    const tvEvents = recentHistory.filter(
      (entry) => entry.mediaType === "tv"
    ).length;
    const primaryType = tvEvents > movieEvents ? "tv" : "movie";
    const secondaryType = primaryType === "movie" ? "tv" : "movie";

    const genreIds = getGenreIds(topGenres);

    const candidateChunks = await Promise.all([
      fetchRecommendPool(
        tier === "warm" ? primaryLanguage : "",
        tier === "cold" ? [] : genreIds,
        primaryType,
        "",
        ""
      ),
      fetchRecommendPool(
        "",
        tier === "cold" ? [] : genreIds,
        secondaryType,
        "",
        ""
      ),
      tier === "cold"
        ? fetchRecommendPool("", [], "movie", "", "")
        : Promise.resolve([]),
    ]);

    const candidates = dedupeById(candidateChunks.flat());
    const fallbackCandidates =
      candidates.length > 0
        ? candidates
        : await fetchRecommendPool("", [], "movie", "", "");

    const candidateIds = fallbackCandidates.map((item) => item.id);
    const clickPriors = await getSelectionPriors(candidateIds, 180);

    const topGenreSet = new Set(topGenres.map((genre) => genre.toLowerCase()));
    const preferredLangSet = new Set(
      preferredLanguages.map((lang) => lang.toLowerCase())
    );
    const avgRatingPref = profile?.avgRatingPreference
      ? Number(profile.avgRatingPreference)
      : null;

    const ranked = [...fallbackCandidates]
      .map((item, index) => {
        const prior = clickPriors[item.id] || 0;
        const genreOverlap = (item.genres || []).filter((genre) =>
          topGenreSet.has(genre.toLowerCase())
        ).length;
        const languageBoost = preferredLangSet.has(
          (item.original_language || "").toLowerCase()
        )
          ? 0.8
          : 0;
        const ratingBoost =
          avgRatingPref !== null
            ? Math.max(
                0,
                1 - Math.abs((item.vote_average || 0) - avgRatingPref) / 10
              )
            : 0;
        const baseScore = (item.vote_average || 0) * 0.15;
        const priorBoost = Math.log1p(prior) * 1.1;
        const genreBoost = genreOverlap * 0.9;
        const indexBias = (fallbackCandidates.length - index) * 0.01;
        const mediaTypeBoost = item.media_type === primaryType ? 0.25 : 0;

        return {
          item,
          score:
            baseScore +
            priorBoost +
            genreBoost +
            languageBoost +
            ratingBoost +
            indexBias +
            mediaTypeBoost,
        };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.item);

    const recommendations = await enrichWithDeepData(ranked, count);
    const response: ForYouResponse = {
      recommendations,
      reason:
        tier === "cold"
          ? "Popular picks while we learn your taste"
          : tier === "sparse"
            ? topGenres.length > 0
              ? `Based on early signals from your recent ${topGenres.join(", ")} picks`
              : "Based on your recent watch activity"
            : topGenres.length > 0
              ? `Based on your recent taste in ${topGenres.join(", ")}`
              : "Based on your recent watch activity",
      profileUsed: tier !== "cold",
    };

    log.debug(
      {
        userId: req.user.userId,
        tier,
        topGenres,
        preferredLanguages,
        candidateCount: fallbackCandidates.length,
        returned: recommendations.length,
      },
      "Generated for-you recommendations"
    );

    await cache.set(key, response, 1800);
    res.json(response);
  } catch (error) {
    // Nothing above should throw — every DB read is wrapped in `attempt()`
    // and every TMDB call catches its own failures — but this endpoint had
    // no top-level guard at all, so any one surprise (a TMDB response
    // shaped unexpectedly, a Redis hiccup on the cache write) produced a
    // bare 500 indistinguishable, from the client's point of view, from the
    // 401 this whole fix is about. A final fallback to an unpersonalized
    // pool keeps the shelf visible either way.
    log.error(
      { err: (error as Error).message, userId: req.user?.userId ?? null },
      "For You recommendation generation failed; serving unpersonalized fallback"
    );
    try {
      const fallbackPool = await fetchRecommendPool("", [], "movie", "", "");
      const recommendations = await enrichWithDeepData(fallbackPool, count);
      res.json({
        recommendations,
        reason: "Popular picks while we learn your taste",
        profileUsed: false,
      } satisfies ForYouResponse);
    } catch {
      res.status(502).json({ error: "Could not load personalized picks" });
    }
  }
}
