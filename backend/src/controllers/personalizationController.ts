import type { Request, Response } from "express";
import type { ForYouResponse, UserEventRequest } from "../types/index.js";
import { getTasteProfile, recordWatchEvent } from "../db/repositories.js";
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

export async function postUserEvent(
  req: Request<{}, {}, UserEventRequest>,
  res: Response
): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { action, tmdbId, mediaType, title, genres = [] } = req.body;

  await recordWatchEvent({
    userId: req.user.userId,
    tmdbId,
    mediaType,
    title,
    genres,
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
  if (!req.user?.userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const countRaw = Number(req.query.count);
  const count = Number.isFinite(countRaw)
    ? Math.max(1, Math.min(20, Math.floor(countRaw)))
    : 10;

  const key = CacheKeys.forYou(req.user.userId, count);
  const cached = await cache.get<ForYouResponse>(key);
  if (cached) {
    res.json(cached);
    return;
  }

  const profile = await getTasteProfile(req.user.userId);
  const topGenres = (profile?.topGenres || []).slice(0, 3).map((g) => g.genre);
  const genreIds = getGenreIds(topGenres);

  const pool = await fetchRecommendPool("", genreIds, "movie", "", "");
  const fallbackPool =
    pool.length > 0 ? pool : await fetchRecommendPool("", [], "movie", "", "");

  const recommendations = await enrichWithDeepData(fallbackPool, count);
  const response: ForYouResponse = {
    recommendations,
    reason:
      topGenres.length > 0
        ? `Based on your recent taste in ${topGenres.join(", ")}`
        : "Popular picks while we learn your taste",
    profileUsed: topGenres.length > 0,
  };

  await cache.set(key, response, 1800);
  res.json(response);
}
