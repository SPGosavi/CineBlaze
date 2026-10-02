// backend/src/config.ts
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import type { Providers } from "./types/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} is missing.`);
  }
  return value;
}

export const GROQ_API_KEY = requireEnv("GROQ_API_KEY");
export const TMDB_API_KEY = requireEnv("TMDB_API_KEY");
export const OMDB_API_KEY = requireEnv("OMDB_API_KEY");

export const NODE_ENV = process.env.NODE_ENV || "development";
export const IS_PRODUCTION = NODE_ENV === "production";

// ─── Optional Infrastructure ────────────────────────────────────────────────
// Every value below is optional by design. The API has to start and serve
// traffic on a laptop with nothing but the three API keys above, so each
// integration degrades instead of throwing: no REDIS_URL falls back to the
// in-process cache, no DATABASE_URL makes persistence a no-op, no
// FIREBASE_PROJECT_ID leaves every request anonymous.
//
// The cost is that a typo in a production env var fails open and quietly
// removes a layer, so `logStartupConfiguration` prints exactly which ones are
// live and `/health` reports them per-dependency.

/** Postgres connection string (Neon, Supabase, Railway, local…). */
export const DATABASE_URL = process.env.DATABASE_URL || null;

/** Redis connection string. `rediss://` for Upstash and other TLS providers. */
export const REDIS_URL = process.env.REDIS_URL || null;

/**
 * Firebase project id, used to verify ID tokens.
 *
 * Only the project id is needed — tokens are checked against Google's public
 * JWKS, so there is no service-account JSON to provision or rotate.
 */
export const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || null;

/**
 * Shared secret between the Next.js server and this API.
 *
 * When set, requests must present it as `x-api-key`. Unset means the API is
 * open, which is the right default for local development and was the only
 * behaviour before Phase 4.
 */
export const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || null;

/** Comma-separated list of allowed browser origins. `*` when unset. */
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const SENTRY_DSN = process.env.SENTRY_DSN || null;

export const LOG_LEVEL =
  process.env.LOG_LEVEL || (IS_PRODUCTION ? "info" : "debug");

// ─── Concurrency ────────────────────────────────────────────────────────────

/**
 * Ceiling on simultaneous outbound TMDB/OMDb requests.
 *
 * A cold Discover fans out hard: three shelves x twelve items x roughly three
 * calls each is over a hundred requests fired at once. That is how the
 * connection resets and 429s that Phase 0-3 papered over with retries were
 * being produced in the first place — the retries treated a self-inflicted
 * thundering herd as bad luck.
 */
export const OUTBOUND_CONCURRENCY =
  Number(process.env.OUTBOUND_CONCURRENCY) || 8;

// ─── Rate Limiting ──────────────────────────────────────────────────────────

export const RATE_LIMIT_AI_PER_HOUR =
  Number(process.env.RATE_LIMIT_AI_PER_HOUR) || 30;
export const RATE_LIMIT_TMDB_PER_HOUR =
  Number(process.env.RATE_LIMIT_TMDB_PER_HOUR) || 100;
export const RATE_LIMIT_IP_PER_SECOND =
  Number(process.env.RATE_LIMIT_IP_PER_SECOND) || 10;

/** Set to "true" to disable rate limiting entirely (useful in tests). */
export const RATE_LIMIT_DISABLED = process.env.RATE_LIMIT_DISABLED === "true";

// ─── Background Jobs ────────────────────────────────────────────────────────

/**
 * Whether this process runs the scheduled jobs.
 *
 * Kept behind a flag because the jobs assume a single runner: with more than
 * one instance they would each refresh the same keys. Redis makes that merely
 * wasteful rather than incorrect, but there is no point paying for it twice.
 */
export const ENABLE_BACKGROUND_JOBS =
  process.env.ENABLE_BACKGROUND_JOBS !== "false";

// ─── Groq API Configuration ─────────────────────────────────────────────────
export const GROQ_API_URL =
  process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
// Used when the primary model is rate-limited, decommissioned, or returns 5xx errors.
export const GROQ_FALLBACK_MODEL =
  process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";
export const GROQ_MAX_RETRIES = Number(process.env.GROQ_MAX_RETRIES) || 3;

/**
 * Reasoning budget for the gpt-oss models.
 *
 * These are reasoning models, and their reasoning tokens are billed against
 * max_tokens. At the default effort they routinely spend 300-700 tokens
 * thinking before emitting anything, which starved the JSON output and made
 * Groq reject the truncated result with a 400.
 *
 * Every prompt here is structured extraction rather than open-ended
 * reasoning, so "low" is both sufficient and markedly faster. Override with
 * GROQ_REASONING_EFFORT if a future model needs more.
 */
export const GROQ_REASONING_EFFORT = (process.env.GROQ_REASONING_EFFORT ||
  "low") as "low" | "medium" | "high";

// ─── Grounding Context ──────────────────────────────────────────────────────

/**
 * Per-source deadline for the grounding lookups behind /find-movies.
 *
 * TMDB and Wikipedia answer in roughly 130-430ms. The budget exists for the
 * sources that do not: from a datacenter IP some hosts throttle or silently
 * blackhole requests, and node-fetch has no default timeout.
 *
 * Measured at 3000ms this was too generous in practice. DuckDuckGo regularly
 * consumed the full budget and, because the phase waits for its slowest
 * source, single-handedly set grounding latency at ~3s while contributing
 * nothing. At 2000ms a healthy DDG response (~1s) still lands, while a stalled
 * one is dropped before it dominates the phase.
 */
export const GROUNDING_SOURCE_TIMEOUT_MS =
  Number(process.env.GROUNDING_SOURCE_TIMEOUT_MS) || 2000;

/**
 * Backstop across all grounding sources combined. Sources run in parallel, so
 * this should only bite if many of them are simultaneously degraded.
 */
export const GROUNDING_TOTAL_TIMEOUT_MS =
  Number(process.env.GROUNDING_TOTAL_TIMEOUT_MS) || 2500;

// ─── TMDB ───────────────────────────────────────────────────────────────────

/**
 * Attempts for a TMDB list request before giving up.
 *
 * These calls had no retry at all, so a single dropped connection returned a
 * 500 for the whole endpoint. On the trending shelves that meant one flaky
 * request blanked an entire row, and because the successful shelves were then
 * cached for six hours, a reload appeared to fix it.
 */
export const TMDB_MAX_RETRIES = Number(process.env.TMDB_MAX_RETRIES) || 3;

/**
 * Per-attempt deadline for a TMDB request.
 *
 * The whole retry budget has to fit inside the client's own timeout, which is
 * 15s for the non-AI endpoints. Three attempts at 4s plus roughly 1.5s of
 * backoff lands near 13.5s worst case, so the server gives up and returns an
 * error before the browser abandons the request. A longer per-attempt budget
 * would mean the client timed out first and the retries were wasted work.
 */
export const TMDB_TIMEOUT_MS = Number(process.env.TMDB_TIMEOUT_MS) || 4000;

export const PROVIDERS: Providers = {
  netflix: 8,
  prime: 119,
  hotstar: 122,
};
