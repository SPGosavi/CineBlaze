import { NextRequest, NextResponse } from "next/server";

/**
 * Backend-for-Frontend proxy.
 *
 * Phase 3 forwarded `/api/*` to Express with a `next.config.ts` rewrite. That
 * was enough to avoid CORS, but a rewrite cannot add request headers — and
 * Phase 4 introduces a shared secret that must be attached on the server,
 * because a key shipped to the browser protects nothing.
 *
 * So the rewrite becomes a Route Handler. Same hop, but now it is a place
 * that can hold a secret, and the natural home for anything else that belongs
 * between the browser and the API.
 *
 * What it deliberately does *not* do is authenticate the user. The caller's
 * Firebase ID token is passed straight through for Express to verify, so
 * there is exactly one place where identity is established.
 */

const BACKEND_URL = (
  process.env.BACKEND_API_URL ?? "http://localhost:5001"
).replace(/\/$/, "");

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY ?? null;

/**
 * The AI endpoints run a ~30s Groq call; everything else answers quickly.
 * Matches the client-side budget in `lib/constants.ts`.
 */
const AI_PATHS = new Set(["find-movies", "get-similar"]);
const AI_TIMEOUT_MS = 120_000;
const DEFAULT_TIMEOUT_MS = 15_000;

function timeoutFor(segments: string[]): number {
  return AI_PATHS.has(segments[0] ?? "") ? AI_TIMEOUT_MS : DEFAULT_TIMEOUT_MS;
}

async function proxy(
  request: NextRequest,
  segments: string[]
): Promise<NextResponse> {
  const target = `${BACKEND_URL}/api/${segments.join("/")}${request.nextUrl.search}`;

  const headers = new Headers();
  headers.set("Content-Type", "application/json");

  // Forwarded, not minted here: Express is the only component that verifies
  // tokens, so this stays an opaque passthrough.
  const authorization = request.headers.get("authorization");
  if (authorization) headers.set("Authorization", authorization);

  if (INTERNAL_API_KEY) headers.set("x-api-key", INTERNAL_API_KEY);

  // The real client IP, so per-IP rate limiting sees the visitor rather than
  // this server. Express is configured with `trust proxy` to read it.
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutFor(segments));

  try {
    const response = await fetch(target, {
      method: request.method,
      headers,
      body:
        request.method === "GET" || request.method === "HEAD"
          ? undefined
          : await request.text(),
      signal: controller.signal,
      // This proxy must never be cached: it carries per-user tokens and
      // rate-limit state. Server Components do their own caching via
      // lib/server-api.ts, which talks to Express directly.
      cache: "no-store",
    });

    const body = await response.text();
    const out = new NextResponse(body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });

    // Pass through the headers the client actually reacts to.
    for (const header of [
      "x-cache",
      "x-resolved-by",
      "x-ratelimit-limit",
      "x-ratelimit-remaining",
      "retry-after",
    ]) {
      const value = response.headers.get(header);
      if (value) out.headers.set(header, value);
    }

    return out;
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    return NextResponse.json(
      {
        error: aborted
          ? "The request took too long and was cancelled."
          : "Could not reach the API.",
      },
      { status: aborted ? 504 : 502 }
    );
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/[...path]">
) {
  const { path } = await context.params;
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/[...path]">
) {
  const { path } = await context.params;
  return proxy(request, path);
}
