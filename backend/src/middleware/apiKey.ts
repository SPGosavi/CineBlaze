import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { INTERNAL_API_KEY } from "../config.js";
import { childLogger } from "../utils/logger.js";

const log = childLogger("apikey");

/**
 * Constant-time comparison.
 *
 * `a === b` on a secret leaks its prefix through timing. Overkill for a
 * self-hosted side project, but it is two lines and the habit is the point.
 */
function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on length mismatch, which is itself a leak, so
  // length is compared separately and the contents are still compared.
  if (left.length !== right.length) {
    timingSafeEqual(left, left);
    return false;
  }
  return timingSafeEqual(left, right);
}

/**
 * Requires the shared secret between the Next.js server and this API.
 *
 * Until now the API was completely open with `cors({ origin: "*" })` — anyone
 * who found the Render URL could spend the Groq and TMDB quota directly,
 * bypassing every limit the web app applies.
 *
 * This only works because the browser never calls the API directly: Phase 3
 * routed client traffic through the Next.js `/api/*` rewrite, so the key
 * lives on the Next server and is never shipped to a browser. Putting it in a
 * client bundle would make it decoration.
 *
 * Unset means open, which keeps local development friction-free and matches
 * the previous behaviour.
 */
export function requireApiKey(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!INTERNAL_API_KEY) {
    next();
    return;
  }

  const presented = req.headers["x-api-key"];
  const key = Array.isArray(presented) ? presented[0] : presented;

  if (!key || !safeEqual(key, INTERNAL_API_KEY)) {
    log.warn(
      { path: req.path, ip: req.ip },
      "Rejected request with bad API key"
    );
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

export const isApiKeyEnforced = (): boolean => INTERNAL_API_KEY !== null;
