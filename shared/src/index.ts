/**
 * The HTTP contract between the Express API (`backend/`) and its consumers
 * (`web/`, and any future client).
 *
 * Scope rule: a type belongs here only if it crosses the network boundary.
 * Shapes that are private to one side stay there — the raw TMDB/OMDb/Groq
 * response types live in `backend/src/types/index.ts`, and React prop types
 * live beside their components in `web/`.
 */

// ─── Media ──────────────────────────────────────────────────────────────────

export const MEDIA_TYPES = ["movie", "tv"] as const;

export type MediaType = (typeof MEDIA_TYPES)[number];

/**
 * Narrows an untrusted string to a MediaType.
 *
 * Exists because `/[mediaType]/[id]` takes its segment straight from the URL,
 * so "movie" and "tv" have to be re-established at the boundary rather than
 * assumed.
 */
export function isMediaType(value: unknown): value is MediaType {
  return (
    typeof value === "string" &&
    (MEDIA_TYPES as readonly string[]).includes(value)
  );
}

/** Minimal TMDB result after formatting (formatBasicTmdbResult / formatTmdbResult) */
export interface BasicTmdbResult {
  id: number;
  title: string;
  release_date?: string;
  overview?: string;
  poster_path: string | null;
  vote_average?: number;
  media_type: MediaType;
  genres?: string[];
}

/** Streaming provider info from TMDB watch/providers endpoint */
export interface WatchProvider {
  name: string;
  logo: string;
}

/** OMDb ratings (IMDb + Rotten Tomatoes) */
export interface Ratings {
  imdb: string | null;
  rt: string | null;
}

/** TMDB detail extras (genres, director, cast) from /movie|tv/{id}?append_to_response=credits */
export interface TmdbDetails {
  genres: string[];
  director: string;
  cast: string[];
}

/** Fully enriched media item — the "final form" returned to the frontend */
export interface EnrichedMedia extends BasicTmdbResult {
  director?: string;
  cast?: string[];
  imdb_rating: string | null;
  rotten_tomatoes: string | null;
  providers?: WatchProvider[];
}

/** Partial enrichment returned by fetchEnrichedDataById (no ratings/poster/overview) */
export interface PartialEnrichedMedia {
  id: number;
  media_type: MediaType;
  genres: string[];
  director: string;
  cast: string[];
  providers?: WatchProvider[];
}

// ─── Watchlist ──────────────────────────────────────────────────────────────

export const WATCHLIST_STATUSES = ["want", "watching", "watched"] as const;

export type WatchlistStatus = (typeof WATCHLIST_STATUSES)[number];

/**
 * A watchlist entry as stored in Firestore.
 *
 * Every field is required here even though older documents may be missing
 * some, because `sanitizeMedia` is the only way an item reaches the UI and it
 * fills in every default. Treating the stored shape as complete is what lets
 * components drop their defensive checks.
 */
export interface WatchlistItem extends EnrichedMedia {
  status: WatchlistStatus;
  addedAt: number;
  genres: string[];
  cast: string[];
  providers: WatchProvider[];
  director: string;
  release_date: string;
  overview: string;
  vote_average: number;
}

/**
 * A media item that has been through `sanitizeMedia`.
 *
 * Same guarantees as WatchlistItem, minus the watchlist-only bookkeeping.
 */
export type SanitizedMedia = Omit<WatchlistItem, "status" | "addedAt"> & {
  status?: WatchlistStatus;
  addedAt?: number;
};

// ─── AI ─────────────────────────────────────────────────────────────────────

/** Output of extractStructuredParams — decomposed user query */
export interface StructuredParams {
  language: string | null;
  genres: string[];
  actors: string[];
  directors: string[];
  plot_keywords: string | null;
  media_types: MediaType[];
  era: string | null;
  is_generic: boolean;
}

/** A single title suggestion from the LLM */
export interface AiSuggestion {
  title: string;
  year: string;
  media_type?: MediaType;
}

// ─── Requests ───────────────────────────────────────────────────────────────

/** POST /api/find-movies */
export interface FindMoviesRequest {
  description: string;
}

/** POST /api/get-similar */
export interface GetSimilarRequest {
  title: string;
  media_type: MediaType;
  year?: string;
  genres?: string[];
  overview?: string;
  cast?: string[];
  director?: string;
}

/** POST /api/media-details */
export interface MediaDetailsRequest {
  id?: number;
  title?: string;
  year?: string;
  media_type: MediaType;
}

/** POST /api/media-extras */
export interface MediaExtrasRequest {
  id: number;
  media_type: MediaType;
}

// ─── Responses ──────────────────────────────────────────────────────────────

/** POST /api/find-movies */
export interface MoviesResponse {
  movies: EnrichedMedia[];
}

/** POST /api/get-similar */
export interface SimilarResponse {
  similar: EnrichedMedia[];
}

/** GET /api/trending/* (TMDB-shaped) */
export interface TrendingResponse {
  results: EnrichedMedia[];
}

/** POST /api/media-extras */
export interface MediaExtrasResponse {
  providers?: WatchProvider[];
}

/**
 * The error body the API returns on a non-2xx.
 *
 * Only `error` is always present; `status` is echoed back on the 429 path so
 * the client can distinguish a rate limit from a generic failure without
 * reading the HTTP status twice.
 */
export interface ApiErrorResponse {
  error: string;
  status?: number;
}
