import type { NextConfig } from "next";

/**
 * Origin of the Express API.
 *
 * Read here as well as in `lib/server-api.ts` because the rewrite below is
 * evaluated at config load, before any request exists.
 */
const BACKEND_API_URL = (
  process.env.BACKEND_API_URL ?? "http://localhost:5001"
).replace(/\/$/, "");

const nextConfig: NextConfig = {
  /**
   * `@cineblaze/shared` ships TypeScript-built ESM from the workspace rather
   * than a published tarball, so Next has to compile it alongside app code.
   */
  transpilePackages: ["@cineblaze/shared"],

  images: {
    remotePatterns: [
      // Posters, backdrops and provider logos.
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      // Fallback for titles TMDB has no artwork for.
      { protocol: "https", hostname: "placehold.co" },
    ],
  },

  async rewrites() {
    return [
      {
        /**
         * Proxies the browser's `/api/*` calls to Express.
         *
         * This is the Backend-for-Frontend seam: the client only ever talks
         * to the Next.js origin, so the API's real host stays out of the
         * bundle and there is no CORS preflight on any request. It also gives
         * Phase 4 a single place to add auth headers or rate limiting.
         *
         * Server Components bypass this entirely — they have no origin to
         * resolve a relative URL against, so `lib/server-api.ts` calls
         * BACKEND_API_URL directly.
         */
        source: "/api/:path*",
        destination: `${BACKEND_API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
