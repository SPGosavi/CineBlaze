// ─── Media Types ────────────────────────────────────────────────────────────

export type MediaType = "movie" | "tv";

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

// ─── AI Types ───────────────────────────────────────────────────────────────

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

/** Options for groqChat helper */
export interface GroqChatOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: string } | null;
  label?: string;
}

/** A single message in the Groq chat format */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ─── API Request/Response Types ─────────────────────────────────────────────

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

/** Standard movie search response */
export interface MoviesResponse {
  movies: EnrichedMedia[];
}

/** Similar movies response */
export interface SimilarResponse {
  similar: EnrichedMedia[];
}

/** Trending response (TMDB-shaped) */
export interface TrendingResponse {
  results: EnrichedMedia[];
}

// ─── Config Types ───────────────────────────────────────────────────────────

export interface Providers {
  [platform: string]: number;
}

// ─── External API Response Shapes ───────────────────────────────────────────
// These represent the raw JSON shapes returned by external APIs.
// Used at fetch boundaries with type assertions — we trust these shapes but
// don't validate them at runtime (no Zod yet).

/** Raw item from TMDB search/trending/discover responses */
export interface TmdbRawResult {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  overview?: string;
  poster_path: string | null;
  vote_average?: number;
  genre_ids?: number[];
  media_type?: string;
  popularity?: number;
  original_language?: string;
  known_for?: TmdbRawResult[];
}

/** Raw TMDB paginated response */
export interface TmdbPaginatedResponse {
  results: TmdbRawResult[];
  page?: number;
  total_pages?: number;
  total_results?: number;
}

/** Raw TMDB detail response (movie or TV, with appended credits) */
export interface TmdbDetailResponse {
  id: number;
  genres?: { id: number; name: string }[];
  created_by?: { name: string }[];
  credits?: {
    cast?: { name: string; order?: number }[];
    crew?: { name: string; job: string }[];
  };
}

/** Raw TMDB watch providers response */
export interface TmdbWatchProvidersResponse {
  results?: {
    [countryCode: string]: {
      flatrate?: { provider_name: string; logo_path: string }[];
    };
  };
}

/** Raw OMDb response */
export interface OmdbResponse {
  Response?: string;
  Ratings?: { Source: string; Value: string }[];
}

/** Raw TMDB person search result */
export interface TmdbPersonResult {
  id: number;
  name: string;
  media_type: "person";
  known_for?: TmdbRawResult[];
}

/** Groq API response shape */
export interface GroqApiResponse {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

/** Groq API error response shape */
export interface GroqApiError {
  error?: {
    message?: string;
  };
}

/** Wikipedia search API response */
export interface WikiSearchResponse {
  query?: {
    search?: {
      title: string;
      snippet: string;
    }[];
  };
}
