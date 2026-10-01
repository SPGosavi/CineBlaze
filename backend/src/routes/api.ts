import express, { Router } from "express";
import {
  getTrendingAll,
  getTrendingIndian,
  getTrendingPlatform,
} from "../controllers/trendingController.js";
import {
  findMovies,
  getSimilar,
  getMediaById,
  getMediaDetails,
  getMediaExtras,
} from "../controllers/searchController.js";
import { rateLimit } from "../middleware/rateLimit.js";
import {
  validateBody,
  validateParams,
  findMoviesSchema,
  getSimilarSchema,
  mediaByIdParamsSchema,
  mediaDetailsSchema,
  mediaExtrasSchema,
  trendingPlatformParamsSchema,
} from "../middleware/validate.js";
import { RATE_LIMIT_AI_PER_HOUR, RATE_LIMIT_TMDB_PER_HOUR } from "../config.js";

const router: Router = express.Router();

/**
 * The expensive limit. Every request behind it is a Groq call with grounding
 * lookups — roughly 30 seconds of compute against a quota we pay for — so it
 * gets its own bucket rather than sharing the generous TMDB one.
 */
const aiLimiter = rateLimit({
  name: "ai",
  capacity: RATE_LIMIT_AI_PER_HOUR,
  windowSeconds: 3_600,
  message:
    "You've used your AI searches for this hour. Try searching an exact title instead.",
});

/** TMDB lookups are cheap and cached; this is an abuse ceiling, not a quota. */
const tmdbLimiter = rateLimit({
  name: "tmdb",
  capacity: RATE_LIMIT_TMDB_PER_HOUR,
  windowSeconds: 3_600,
  message: "Too many lookups this hour. Please try again shortly.",
});

// ─── Trending ───────────────────────────────────────────────────────────────
router.get("/trending/all", tmdbLimiter, getTrendingAll);
router.get("/trending/indian", tmdbLimiter, getTrendingIndian);
router.get(
  "/trending/platform/:platform",
  tmdbLimiter,
  validateParams(trendingPlatformParamsSchema),
  getTrendingPlatform
);

// ─── Media ──────────────────────────────────────────────────────────────────
// Cacheable read used by the Next.js detail page. `POST /media-details` stays
// for the Vite frontend, which looks titles up by name as well as by id.
router.get(
  "/media/:mediaType/:id",
  tmdbLimiter,
  validateParams(mediaByIdParamsSchema),
  getMediaById
);

// ─── Search ─────────────────────────────────────────────────────────────────
router.post(
  "/find-movies",
  aiLimiter,
  validateBody(findMoviesSchema),
  findMovies
);
router.post(
  "/get-similar",
  aiLimiter,
  validateBody(getSimilarSchema),
  getSimilar
);
router.post(
  "/media-details",
  tmdbLimiter,
  validateBody(mediaDetailsSchema),
  getMediaDetails
);
router.post(
  "/media-extras",
  tmdbLimiter,
  validateBody(mediaExtrasSchema),
  getMediaExtras
);

export default router;
