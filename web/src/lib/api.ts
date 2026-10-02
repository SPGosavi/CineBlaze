import axios from "axios";
import { DEFAULT_REQUEST_TIMEOUT } from "./constants";
import { auth } from "./firebase";

/**
 * Browser-side API client.
 *
 * The base URL is always the same-origin `/api`, which `next.config.ts`
 * rewrites to the Express backend. That keeps the backend's real origin out
 * of the client bundle and removes the need for CORS entirely — the browser
 * only ever talks to the Next.js server, which acts as the gateway.
 *
 * Server Components must not use this. They have no origin to be relative to;
 * use `lib/server-api.ts` instead.
 */
const api = axios.create({
  baseURL: "/api",
  timeout: DEFAULT_REQUEST_TIMEOUT,
});

/**
 * Attaches the caller's Firebase ID token when they are signed in.
 *
 * The API treats this as optional — every endpoint works anonymously, which
 * is what keeps discovery and detail pages crawlable. What it buys is
 * attribution: rate limits apply per account rather than per IP (so people
 * behind the same NAT do not share a quota), and history can be recorded
 * against a user.
 *
 * `getIdToken()` returns a cached token and refreshes it only when it is
 * close to expiry, so this is not a network call on every request.
 */
api.interceptors.request.use(async (config) => {
  const currentUser = auth?.currentUser;
  if (currentUser) {
    try {
      config.headers.set(
        "Authorization",
        `Bearer ${await currentUser.getIdToken()}`
      );
    } catch {
      // A token refresh failure must not block the request — the endpoint
      // will simply treat it as anonymous.
    }
  }
  return config;
});

export default api;

/**
 * Turns an unknown thrown value into a message worth showing a user.
 *
 * axios rejects on any non-2xx, so the status branches that used to sit on
 * the happy path live here. A missing `response` means the request never
 * completed at all — network failure or timeout — which is a different
 * problem from the server answering with an error.
 */
export function describeApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;

    if (status === 429) {
      // The API now returns a real retry window rather than a flat refusal.
      const retryAfter = Number(
        (error.response?.data as { retryAfterSeconds?: number })
          ?.retryAfterSeconds
      );
      if (Number.isFinite(retryAfter) && retryAfter > 0) {
        const minutes = Math.ceil(retryAfter / 60);
        return `Rate limit reached. Try again in about ${
          minutes <= 1 ? "a minute" : `${minutes} minutes`
        }, or search for an exact title.`;
      }
      return "Rate limit reached. Try again shortly, or search for an exact title.";
    }

    if (status === 400) {
      const issues = (
        error.response?.data as { issues?: { message: string }[] }
      )?.issues;
      return issues?.[0]?.message ?? "That request wasn't valid.";
    }

    if (error.response) {
      return "Search failed. Please try again.";
    }
    if (error.code === "ECONNABORTED") {
      return "The search took too long and was cancelled. Please try again.";
    }
    return "Connection error. Check your network and try again.";
  }
  return "Something went wrong. Please try again.";
}
