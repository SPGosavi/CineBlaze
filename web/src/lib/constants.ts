/** Shared configuration values used across the app. */

export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
export const TMDB_LOGO_BASE_URL = "https://image.tmdb.org/t/p/original";
export const PLACEHOLDER_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='750' viewBox='0 0 500 750'%3E%3Crect width='500' height='750' fill='%23191716'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%239e948a' font-family='sans-serif' font-size='20'%3ENo Poster%3C/text%3E%3C/svg%3E";

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

/**
 * Poster paths for the login backdrop.
 *
 * Hardcoded rather than fetched. The login page is the one route that must
 * render instantly with no network dependency — an ISR miss or a failed
 * trending call would leave the panel blank, and these are decoration, not
 * content. TMDB path format: `/xxxxxxxx.jpg`, resolved against
 * TMDB_IMAGE_BASE_URL.
 */
export const LOGIN_POSTERS: readonly string[] = [
  "/yBKMAIj7clP42UkFejhGDBBoTpb.jpg",
  "/6QgJQrClh9ej357yzLWgCxrjAmJ.jpg",
  "/bNErActDctl6cdUGw9pnjSCmyhQ.jpg",
  "/bRwnj8WEKBCvmfeUNOukJPwB43K.jpg",
  "/5rhTDKUhPYvpdQIijFIs5VoWsON.jpg",
  "/39aMkR8Y5vhCG9dTkjiqRl8AVqp.jpg",
  "/rhGx6E3qRNMgj3i5su2oukNHwIQ.jpg",
  "/sfQtVlIHljToOwYjhe21KPGzZWK.jpg",
  "/bHiAp8WWHgfUrJmRnoiw4URYGcq.jpg",
  "/1ApfSA8JTqeha3GTFEY8syV4auq.jpg",
  "/67FsF2kpgEZ1T5Qos4adgqm9dLf.jpg",
  "/kYDCl2y0VPvhT5eYWbMRInPoB03.jpg",
  "/lmrulvLbmaejTix1YaMxo1oGhH1.jpg",
  "/jRXYjXNq0Cs2TcJjLkki24MLp7u.jpg",
  "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
];
