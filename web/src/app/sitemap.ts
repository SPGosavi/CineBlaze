import type { MetadataRoute } from "next";
import { getTrending } from "@/lib/server-api";
import { SITE_URL } from "@/lib/constants";

/*
 * No `export const revalidate` here on purpose.
 *
 * A segment's effective revalidation is the *lowest* value across the segment
 * and every fetch inside it, and `getTrending` already requests 10 minutes.
 * Declaring 6h here therefore had no effect — the build reported the route as
 * 10m either way — so it was removed rather than left as a value that reads
 * like configuration but changes nothing.
 */

/**
 * Sitemap covering the static routes plus every title currently trending.
 *
 * TMDB has millions of entries, so an exhaustive sitemap is neither possible
 * nor useful. Seeding it with the trending shelves gives crawlers a live
 * entry point into the catalogue; the internal links on each detail page
 * ("you might also like") let them walk outwards from there.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  const shelves = await Promise.all([
    getTrending("all"),
    getTrending("indian"),
    getTrending("netflix"),
    getTrending("prime"),
  ]);

  // A sitemap that fails the build over an unreachable upstream is worse than
  // one listing only the home page, so failures are simply skipped.
  const seen = new Set<string>();
  const titleRoutes: MetadataRoute.Sitemap = [];

  for (const shelf of shelves) {
    if (shelf.status !== "ok") continue;
    for (const item of shelf.data) {
      const path = `/${item.media_type}/${item.id}`;
      if (seen.has(path)) continue;
      seen.add(path);
      titleRoutes.push({
        url: `${SITE_URL}${path}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  }

  return [...staticRoutes, ...titleRoutes];
}
