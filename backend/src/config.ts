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
