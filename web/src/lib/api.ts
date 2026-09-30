import axios from "axios";
import { DEFAULT_REQUEST_TIMEOUT } from "./constants";

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
    if (error.response?.status === 429) {
      return "Daily limit exceeded. Try again tomorrow, or search for the exact title instead.";
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
