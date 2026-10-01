import type { NextConfig } from "next";

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

  /*
   * The `/api/:path*` rewrite that used to live here is now a Route Handler
   * at `src/app/api/[...path]/route.ts`.
   *
   * A rewrite proxies the request untouched, which was fine when the API was
   * open. Phase 4 put a shared secret in front of Express, and that header has
   * to be attached on the server — a rewrite has nowhere to do it, and a key
   * added in the browser would not be a secret. The Route Handler is the same
   * hop with somewhere to put credentials.
   */
};

export default nextConfig;
