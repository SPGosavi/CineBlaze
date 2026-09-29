// Shared configuration values used across the app.

export const API_BASE_URL = import.meta.env.VITE_API_URL || "";

export const TMDB_IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";
export const TMDB_LOGO_BASE_URL = "https://image.tmdb.org/t/p/original";
export const PLACEHOLDER_IMAGE =
  "https://placehold.co/500x750/171717/7f1d1d?text=No+Poster";

/**
 * Timeout for the Groq-backed endpoints (/find-movies, /get-similar).
 *
 * These run an LLM call with grounding lookups and retry/backoff, and
 * measure around 30s uncached. The axios default of 15s aborts them well
 * before they can answer, so they need their own budget.
 */
export const AI_REQUEST_TIMEOUT = 120000;
