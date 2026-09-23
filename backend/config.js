// backend/config.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, ".env") });

export const GROQ_API_KEY = process.env.GROQ_API_KEY;
export const TMDB_API_KEY = process.env.TMDB_API_KEY;
export const OMDB_API_KEY = process.env.OMDB_API_KEY;

// ─── Groq API Configuration ─────────────────────────────────────────────────
export const GROQ_API_URL =
  process.env.GROQ_API_URL || "https://api.groq.com/openai/v1/chat/completions";
export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
// Used when the primary model is rate-limited, decommissioned, or returns 5xx errors.
export const GROQ_FALLBACK_MODEL =
  process.env.GROQ_FALLBACK_MODEL || "llama-3.3-70b-versatile";
export const GROQ_MAX_RETRIES = Number(process.env.GROQ_MAX_RETRIES) || 3;

export const PROVIDERS = {
  netflix: 8,
  prime: 119,
  hotstar: 122,
};
