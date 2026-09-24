import { Request, Response } from "express";
import cache from "../utils/cache.js";
import { TMDB_API_KEY, PROVIDERS } from "../config.js";
import {
  fetchTmdb,
  formatBasicTmdbResult,
  fetchEnrichedDataById,
  fetchRatings,
} from "../services/tmdbService.js"; // Import formatter
import { TrendingResponse, EnrichedMedia } from "../types/index.js";

export const getTrendingAll = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const cached = cache.get<TrendingResponse>("trending_all");
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const url = `https://api.themoviedb.org/3/trending/all/week?api_key=${TMDB_API_KEY}&language=en-US`;
    const data = await fetchTmdb(url);

    const basicResults = data.results
      .map((item) => formatBasicTmdbResult(item))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const enrichedResults = await Promise.all(
      basicResults.slice(0, 12).map(async (item) => {
        const extra = await fetchEnrichedDataById(item.id, item.media_type);
        const ratings = await fetchRatings(
          item.title,
          item.release_date?.split("-")[0]
        );

        return {
          ...item,
          ...extra,
          imdb_rating: ratings.imdb ?? null,
          rotten_tomatoes: ratings.rt ?? null,
        } as EnrichedMedia;
      })
    );

    const response: TrendingResponse = {
      results: enrichedResults.filter(Boolean) as EnrichedMedia[],
    };

    cache.set("trending_all", response, 21600);
    res.json(response);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const getTrendingIndian = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const cached = cache.get<TrendingResponse>("trending_indian");
  if (cached) {
    res.json(cached);
    return;
  }
  try {
    const movieUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta|ml`;
    const tvUrl = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&watch_region=IN&sort_by=popularity.desc&with_original_language=hi|te|ta|ml`;
    const [movies, tv] = await Promise.all([
      fetchTmdb(movieUrl),
      fetchTmdb(tvUrl),
    ]);

    const basicResults = [
      ...movies.results
        .slice(0, 10)
        .map((m) => formatBasicTmdbResult(m, "movie")),
      ...tv.results.slice(0, 10).map((t) => formatBasicTmdbResult(t, "tv")),
    ]
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort(() => Math.random() - 0.5);

    const enrichedResults = await Promise.all(
      basicResults.slice(0, 12).map(async (item) => {
        const extra = await fetchEnrichedDataById(item.id, item.media_type);
        const ratings = await fetchRatings(
          item.title,
          item.release_date?.split("-")[0]
        );

        return {
          ...item,
          ...extra,
          imdb_rating: ratings.imdb ?? null,
          rotten_tomatoes: ratings.rt ?? null,
        } as EnrichedMedia;
      })
    );

    const finalResults = enrichedResults.filter(Boolean) as EnrichedMedia[];

    const response: TrendingResponse = { results: finalResults };

    cache.set("trending_indian", response, 21600); // 6 hours
    res.json(response);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
};

export const getTrendingPlatform = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { platform } = req.params;
  const providerId = PROVIDERS[platform as keyof typeof PROVIDERS];
  const cacheKey = `trending_${platform}`;
  const cached = cache.get<TrendingResponse>(cacheKey);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const url = `https://api.themoviedb.org/3/discover/tv?api_key=${TMDB_API_KEY}&watch_region=IN&with_watch_providers=${providerId}&sort_by=popularity.desc`;
    const data = await fetchTmdb(url);

    const basicResults = data.results
      .map((tv) => formatBasicTmdbResult(tv, "tv"))
      .filter((item): item is NonNullable<typeof item> => item !== null);

    const enrichedResults = await Promise.all(
      basicResults.slice(0, 12).map(async (item) => {
        const extra = await fetchEnrichedDataById(item.id, item.media_type);
        const ratings = await fetchRatings(
          item.title,
          item.release_date?.split("-")[0]
        );

        return {
          ...item,
          ...extra,
          imdb_rating: ratings.imdb ?? null,
          rotten_tomatoes: ratings.rt ?? null,
        } as EnrichedMedia;
      })
    );

    const response: TrendingResponse = {
      results: enrichedResults.filter(Boolean) as EnrichedMedia[],
    };

    cache.set(cacheKey, response, 21600); // 6 hours
    res.json(response);
  } catch (e: unknown) {
    res.status(500).json({ error: (e as Error).message });
  }
};
