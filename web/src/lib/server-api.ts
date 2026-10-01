import "server-only";

import type {
  EnrichedMedia,
  MediaType,
  MoviesResponse,
  SimilarResponse,
  TrendingResponse,
} from "@cineblaze/shared";
import {
  AI_REQUEST_TIMEOUT,
  DEFAULT_REQUEST_TIMEOUT,
  DETAIL_REVALIDATE_SECONDS,
  TRENDING_REVALIDATE_SECONDS,
} from "./constants";

/**
 * Origin of the Express API, as seen from the Next.js server.
 *
 * Server Components cannot use the same-origin `/api` rewrite the browser
 * relies on, because `fetch` on the server has no origin to resolve a
 * relative URL against. They go straight to the backend instead.
 *
 * This is not `NEXT_PUBLIC_`, so it never reaches the client bundle.
 */
const BACKEND_URL = (
  process.env.BACKEND_API_URL ?? "http://localhost:5001"
).replace(/\/$/, "");

/**
 * Shared secret for the Express API.
 *
 * Server-only, like BACKEND_API_URL. The whole reason the API key works as
 * protection is that the browser never talks to Express directly — client
 * requests go through the Next `/api/*` rewrite, so the key lives here and
 * never reaches a bundle.
 */
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? null;

const authHeaders = (): Record<string, string> =>
  INTERNAL_API_KEY ? { "x-api-key": INTERNAL_API_KEY } : {};

/**
 * Outcome of a server-side API call.
 *
 * The three cases are kept distinct on purpose. Collapsing a failure into an
 * empty list is what made the Phase 2 trending shelves render a heading over
 * nothing: the UI could not tell "the request failed" from "there is genuinely
 * nothing here", so it showed the same thing for both.
 */
export type FetchResult<T> =
  | { status: "ok"; data: T }
  | { status: "empty" }
  | { status: "failed"; reason: string };

interface RequestOptions {
  /** Seconds before the cached response is considered stale. */
  revalidate: number;
  /** Abort budget for a single attempt. */
  timeoutMs?: number;
  /** Cache tag, so a future Server Action can invalidate on demand. */
  tags?: string[];
}

async function request<T>(
  path: string,
  init: RequestInit,
  { revalidate, timeoutMs = DEFAULT_REQUEST_TIMEOUT, tags }: RequestOptions
): Promise<FetchResult<T>> {
  // node-fetch has no default timeout, and neither does the platform fetch
  // Next.js uses. Without this an unresponsive backend would hold the render
  // open until the platform's own request budget ran out.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      ...init,
      headers: { ...authHeaders(), ...init.headers },
      signal: controller.signal,
      next: { revalidate, ...(tags ? { tags } : {}) },
    });

    if (!response.ok) {
      return {
        status: "failed",
        reason: `Upstream responded ${response.status}`,
      };
    }

    return { status: "ok", data: (await response.json()) as T };
  } catch (error) {
    const reason =
      error instanceof Error && error.name === "AbortError"
        ? `Upstream did not respond within ${timeoutMs}ms`
        : error instanceof Error
          ? error.message
          : "Unknown upstream error";
    return { status: "failed", reason };
  } finally {
    clearTimeout(timer);
  }
}

const get = <T>(path: string, options: RequestOptions) =>
  request<T>(path, { method: "GET" }, options);

const post = <T>(path: string, body: unknown, options: RequestOptions) =>
  request<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options
  );

/** Collapses an ok-but-zero-results response into the `empty` case. */
function narrow<T>(
  result: FetchResult<T>,
  items: (data: T) => EnrichedMedia[]
): FetchResult<EnrichedMedia[]> {
  if (result.status !== "ok") return result;
  const list = items(result.data);
  return list.length > 0 ? { status: "ok", data: list } : { status: "empty" };
}

// ─── Trending (ISR) ─────────────────────────────────────────────────────────

export async function getTrending(
  shelf: "all" | "indian" | "netflix" | "prime"
): Promise<FetchResult<EnrichedMedia[]>> {
  const path =
    shelf === "all" || shelf === "indian"
      ? `/api/trending/${shelf}`
      : `/api/trending/platform/${shelf}`;

  const result = await get<TrendingResponse>(path, {
    revalidate: TRENDING_REVALIDATE_SECONDS,
    tags: ["trending", `trending:${shelf}`],
  });

  return narrow(result, (data) => data.results ?? []);
}

// ─── Detail (SSR, long revalidate) ──────────────────────────────────────────

export async function getMediaDetails(
  id: number,
  mediaType: MediaType
): Promise<FetchResult<EnrichedMedia>> {
  // A GET, because only GETs participate in Next.js's data cache — a POST
  // would be re-issued on every render and this page is meant to be ISR'd.
  const result = await get<EnrichedMedia>(`/api/media/${mediaType}/${id}`, {
    revalidate: DETAIL_REVALIDATE_SECONDS,
    tags: [`media:${mediaType}:${id}`],
  });

  // The endpoint answers 404 for an unknown id, which `request` reports as a
  // failure. Separate it out so the page renders notFound() rather than an
  // error boundary.
  if (result.status === "failed" && result.reason.includes("404")) {
    return { status: "empty" };
  }

  return result;
}

export async function getSimilar(
  item: EnrichedMedia
): Promise<FetchResult<EnrichedMedia[]>> {
  const result = await post<SimilarResponse>(
    "/api/get-similar",
    {
      title: item.title,
      media_type: item.media_type,
      year: item.release_date?.split("-")[0] ?? "",
      genres: item.genres ?? [],
      overview: item.overview ?? "",
      cast: item.cast ?? [],
      director: item.director ?? "Unknown",
    },
    {
      revalidate: DETAIL_REVALIDATE_SECONDS,
      timeoutMs: AI_REQUEST_TIMEOUT,
      tags: [`similar:${item.media_type}:${item.id}`],
    }
  );

  return narrow(result, (data) => data.similar ?? []);
}

// ─── Search (SSR) ───────────────────────────────────────────────────────────

/**
 * Runs an AI search on the server so `/search?q=...` is shareable and
 * crawlable.
 *
 * Cached for a day because an uncached run costs a ~30s Groq call; the
 * backend caches the same query for 24h too, so this mostly avoids a second
 * network hop.
 */
export async function findMovies(
  description: string
): Promise<FetchResult<EnrichedMedia[]>> {
  const result = await post<MoviesResponse>(
    "/api/find-movies",
    { description },
    {
      revalidate: DETAIL_REVALIDATE_SECONDS,
      timeoutMs: AI_REQUEST_TIMEOUT,
      tags: ["search"],
    }
  );

  return narrow(result, (data) => data.movies ?? []);
}
