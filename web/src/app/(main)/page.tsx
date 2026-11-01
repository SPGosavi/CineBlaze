import { Suspense } from "react";
import type { Metadata } from "next";
import { getTrending } from "@/lib/server-api";
import { sanitizeMediaList } from "@/lib/sanitize";
import { SITE_DESCRIPTION } from "@/lib/constants";
import SearchBar from "@/components/search/SearchBar";
import MoodChips from "@/components/search/MoodChips";
import ForYouShelf from "@/components/personalization/ForYouShelf";
import Shelf from "@/components/media/Shelf";
import { TrendingRowSkeleton } from "@/components/ui/Skeleton";
import { FailedToLoad } from "@/components/ui/StatePanels";
import Well from "@/components/ui/Well";

export const metadata: Metadata = {
  title: "Discover what to watch next",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "Discover what to watch next" },
};

interface ShelfSpec {
  key: "all" | "netflix" | "prime";
  title: string;
  density?: "spacious" | "compact";
}

const SHELVES: ShelfSpec[] = [
  { key: "all", title: "Trending now", density: "spacious" },
  { key: "netflix", title: "Popular on Netflix", density: "compact" },
  { key: "prime", title: "Popular on Prime Video", density: "compact" },
];

/**
 * One trending shelf streaming in behind its own Suspense boundary.
 */
async function TrendingShelf({
  shelf,
  title,
  priority,
  density = "compact",
}: {
  shelf: ShelfSpec["key"];
  title: string;
  priority: boolean;
  density?: "spacious" | "compact";
}) {
  const result = await getTrending(shelf);

  if (result.status === "failed") {
    return <FailedToLoad what={title.toLowerCase()} reason={result.reason} />;
  }

  if (result.status === "empty") {
    return (
      <section className="space-y-3">
        <h2 className="font-display font-medium text-lg text-muted">{title}</h2>
        <p className="text-sm font-body text-muted">
          Nothing is trending here right now.
        </p>
      </section>
    );
  }

  return (
    <Shelf
      title={title}
      items={sanitizeMediaList(result.data)}
      priority={priority}
      density={density}
    />
  );
}

/**
 * Home / Discover.
 *
 * Screen opens on the search line in a smoked well with the mode selector,
 * followed by mood chips and varied-density shelves streaming behind Suspense.
 */
export default function DiscoverPage() {
  return (
    <div className="space-y-10 pb-20 md:pb-8">
      {/* Search Stage */}
      <Well className="p-6 md:p-8">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <h1 className="mx-auto w-full text-center font-display text-2xl font-medium tracking-tight text-ink md:text-4xl text-balance">
            Find a film by plot, scene, or title.
          </h1>
          <SearchBar />
          <div className="border-t border-rule pt-4">
            <MoodChips />
          </div>
        </div>
      </Well>

      {/* Shelves */}
      <div className="space-y-12">
        <ForYouShelf />
        {SHELVES.map(({ key, title, density }, index) => (
          <Suspense key={key} fallback={<TrendingRowSkeleton />}>
            <TrendingShelf
              shelf={key}
              title={title}
              priority={index === 0}
              density={density}
            />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
