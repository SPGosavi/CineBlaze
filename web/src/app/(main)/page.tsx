import { Suspense } from "react";
import type { Metadata } from "next";
import { getTrending } from "@/lib/server-api";
import { sanitizeMediaList } from "@/lib/sanitize";
import { SITE_DESCRIPTION } from "@/lib/constants";
import SearchBar from "@/components/search/SearchBar";
import Shelf from "@/components/media/Shelf";
import { TrendingRowSkeleton } from "@/components/ui/Skeleton";
import { FailedToLoad } from "@/components/ui/StatePanels";

export const metadata: Metadata = {
  title: "Discover what to watch next",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { url: "/", title: "Discover what to watch next" },
};

interface ShelfSpec {
  key: "all" | "netflix" | "prime";
  title: string;
}

const SHELVES: ShelfSpec[] = [
  { key: "all", title: "Trending now" },
  { key: "netflix", title: "Popular on Netflix" },
  { key: "prime", title: "Popular on Prime Video" },
];

/**
 * One trending shelf.
 *
 * Its own async component so each shelf streams in independently behind its
 * own Suspense boundary — a slow or failing platform never holds up the
 * others, which is what `useTrending`'s three parallel requests achieved on
 * the client in Phase 2.
 *
 * Unlike Phase 2 it distinguishes all three outcomes. A failure renders an
 * explicit error instead of a heading above empty space.
 */
async function TrendingShelf({
  shelf,
  title,
  priority,
}: {
  shelf: ShelfSpec["key"];
  title: string;
  priority: boolean;
}) {
  const result = await getTrending(shelf);

  if (result.status === "failed") {
    return <FailedToLoad what={title.toLowerCase()} reason={result.reason} />;
  }

  if (result.status === "empty") {
    return (
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <div className="h-5 w-1 rounded-full bg-neutral-700" />
          <h2 className="text-lg font-bold text-gray-400">{title}</h2>
        </div>
        <p className="px-1 text-sm text-gray-600">
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
    />
  );
}

/**
 * Home / Discover.
 *
 * A Server Component. The hero and search box are static and reach the
 * browser immediately; the shelves are ISR-cached for six hours (matching the
 * backend's own TTL on `/trending/*`) and stream in behind Suspense.
 */
export default function DiscoverPage() {
  return (
    <div className="animate-fade-in space-y-10 pb-24 md:pb-10">
      <section className="relative overflow-hidden rounded-3xl border border-white/5 p-8 shadow-2xl md:p-12">
        <div className="absolute inset-0 z-0 bg-linear-to-br from-red-900/80 via-orange-900/60 to-black" />
        <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-red-600/20 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-4xl space-y-6 text-center">
          <h1 className="text-3xl font-black tracking-tight text-white drop-shadow-lg md:text-5xl">
            Ignite your next{" "}
            <span className="bg-linear-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              obsession.
            </span>
          </h1>
          <p className="mx-auto max-w-xl text-sm font-medium text-gray-200 opacity-90 md:text-lg">
            Describe the plot, the vibe, or the scene stuck in your head. Our AI
            will handle the rest.
          </p>
          <SearchBar />
        </div>
      </section>

      <div className="space-y-10">
        {SHELVES.map(({ key, title }, index) => (
          <Suspense key={key} fallback={<TrendingRowSkeleton />}>
            <TrendingShelf shelf={key} title={title} priority={index === 0} />
          </Suspense>
        ))}
      </div>
    </div>
  );
}
