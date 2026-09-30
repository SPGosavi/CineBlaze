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

export const PROVIDERS: Providers = {
  netflix: 8,
  prime: 119,
  hotstar: 122,
};
