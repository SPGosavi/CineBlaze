/**
 * Backend-local types.
 *
 * The network contract — everything the API promises its clients — now lives
 * in `@cineblaze/shared` so `web/` consumes the same definitions. It is
 * re-exported here so the existing `../types/index.js` imports across the
 * backend keep working and there is still one import path to reach for.
 *
 * What stays in this file is what never crosses the wire: the raw response
 * shapes of the upstream APIs we call, and the options bags of internal
 * helpers.
 */

export * from "@cineblaze/shared";

// ─── Internal Helper Types ──────────────────────────────────────────────────

/** Options for groqChat helper */
export interface GroqChatOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormat?: { type: string } | null;
  label?: string;
  /**
   * How much budget the model may spend on internal reasoning before it
   * starts emitting output. Only meaningful for reasoning models such as
   * the gpt-oss family, where reasoning tokens are billed against
   * max_tokens. Defaults to GROQ_REASONING_EFFORT.
   */
  reasoningEffort?: "low" | "medium" | "high" | null;
}

/** A single message in the Groq chat format */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
  /*
   * The presentational fields were previously omitted from this interface
   * because the only consumer parsed credits out of the payload and dropped
   * the rest. `fetchFullDetailsById` needs them, and they were always
   * present on the wire.
   */
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average?: number;
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
    /** "stop" on a complete answer, "length" when max_tokens was hit. */
    finish_reason?: string;
  }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    /** Reasoning models report their thinking budget separately here. */
    completion_tokens_details?: {
      reasoning_tokens?: number;
    };
  };
}

/** Groq API error response shape */
export interface GroqApiError {
  error?: {
    message?: string;
    /**
     * Present when the model produced output that failed JSON-schema
     * validation. Contains the raw text it tried to emit, which is the only
     * way to tell a truncated response apart from a malformed one.
     */
    failed_generation?: string;
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
