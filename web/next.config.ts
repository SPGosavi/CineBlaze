import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const securityHeaders = [
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  /**
   * `@cineblaze/shared` ships TypeScript-built ESM from the workspace rather
   * than a published tarball, so Next has to compile it alongside app code.
   */
  transpilePackages: ["@cineblaze/shared"],

  poweredByHeader: false,

  images: {
    remotePatterns: [
      // Posters, backdrops and provider logos.
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      // Fallback for titles TMDB has no artwork for.
      { protocol: "https", hostname: "placehold.co" },
    ],
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
