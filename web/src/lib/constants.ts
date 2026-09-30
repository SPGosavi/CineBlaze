/** Shared configuration values used across the app. */

export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
export const TMDB_LOGO_BASE_URL = "https://image.tmdb.org/t/p/original";
export const PLACEHOLDER_IMAGE =
  "https://placehold.co/500x750/171717/7f1d1d?text=No+Poster";

/**
 * Timeout for the Groq-backed endpoints (/find-movies, /get-similar).
 *
 * These run an LLM call with grounding lookups and retry/backoff, and measure
 * around 30s uncached. The axios default of 15s aborts them well before they
 * can answer, so they need their own budget.
 */
export const AI_REQUEST_TIMEOUT = 120_000;

/** Everything that is not AI-backed answers well inside this. */
export const DEFAULT_REQUEST_TIMEOUT = 15_000;

/**
 * How long a prerendered trending shelf stays fresh.
 *
 * Deliberately shorter than the six hours the shelves actually change on.
 * That six-hour TTL already exists in the backend's `node-cache`, so a
 * revalidation here is almost always a local cache hit and costs nothing
 * upstream.
 *
 * The short window buys failure recovery. A prerender is cached as a whole,
 * errors included — so if the API is down when the page is built, a six-hour
 * revalidate would pin a "couldn't load" panel in front of every visitor for
 * six hours. Ten minutes bounds that.
 */
export const TRENDING_REVALIDATE_SECONDS = 600;

/**
 * Detail pages change rarely — cast and providers are effectively static
 * once a title is released — but ratings do drift, so a day is the
 * compromise.
 *
 * Safe to keep long because these render on demand rather than at build
 * time, and a failed upstream call throws to `error.tsx` instead of being
 * cached.
 */
export const DETAIL_REVALIDATE_SECONDS = 86_400;

/** Canonical origin, used for Open Graph URLs, sitemap and robots. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const SITE_NAME = "CineBlaze";
export const SITE_DESCRIPTION =
  "Describe a plot, a vibe, or the scene stuck in your head — CineBlaze finds the movie or series. Track what you want to watch with an AI-powered personal cinema tracker.";
