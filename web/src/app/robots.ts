import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/constants";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Personal, auth-gated, or unbounded in cardinality. Search in
      // particular can generate a URL per query, which is exactly the thin
      // content crawlers penalise.
      disallow: ["/watchlist", "/login", "/settings", "/search"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
