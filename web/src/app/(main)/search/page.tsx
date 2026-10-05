import { Suspense } from "react";
import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { findMovies } from "@/lib/server-api";
import { SearchMode, isSearchMode } from "@cineblaze/shared";
import { sanitizeMediaList } from "@/lib/sanitize";
import SearchBar from "@/components/search/SearchBar";
import MediaCard from "@/components/media/MediaCard";
import { MediaGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyResults, FailedToLoad } from "@/components/ui/StatePanels";

/**
 * Titles the tab with the query so a shared link reads sensibly.
 *
 * Results are noindex: the AI pipeline can generate an unbounded number of
 * query URLs and indexing them would be a thin-content problem. The detail
 * pages they link to are the pages worth indexing.
 */
export async function generateMetadata(
  props: PageProps<"/search">
): Promise<Metadata> {
  const { q, mode: modeParam } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const mode = isSearchMode(modeParam) ? modeParam : "ai";

  return {
    title: query ? `Search: ${query}` : "Search",
    description: query
      ? mode === "recommend"
        ? `Recommendations for “${query}”.`
        : mode === "direct"
          ? `Search results for “${query}”.`
          : `AI-matched movies and series for “${query}”.`
      : "Describe a plot and find the movie or series.",
    robots: { index: false, follow: true },
  };
}

async function SearchResults({
  query,
  mode,
}: {
  query: string;
  mode: SearchMode;
}) {
  const result = await findMovies(query, mode);

  if (result.status === "failed") {
    return <FailedToLoad what="those results" reason={result.reason} />;
  }

  if (result.status === "empty") {
    return <EmptyResults query={query} />;
  }

  const items = sanitizeMediaList(result.data);

  return (
    <>
      <p className="px-1 text-sm text-gray-500">
        {items.length}{" "}
        {items.length === 1
          ? mode === "recommend"
            ? "recommendation"
            : "match"
          : mode === "recommend"
            ? "recommendations"
            : "matches"}{" "}
        for <span className="font-medium text-gray-300">“{query}”</span>
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item, index) => (
          <MediaCard
            key={`${item.media_type}-${item.id}`}
            item={item}
            priority={index < 5}
          />
        ))}
      </div>
    </>
  );
}

/**
 * Search results, server-rendered from the URL.
 *
 * The search state now lives in `?q=` rather than a React context, which is
 * the whole point: results are shareable, bookmarkable, survive a refresh and
 * work with the back button.
 *
 * An uncached AI search takes ~30s, so the grid streams behind Suspense while
 * the header and the search box render immediately — the user can see their
 * query echoed back and retype it without waiting.
 */
export default async function SearchPage(props: PageProps<"/search">) {
  const { q, mode: modeParam } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const mode = isSearchMode(modeParam) ? modeParam : "ai";

  return (
    <div className="animate-fade-in space-y-8 pb-24 md:pb-10">
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Zap className="fill-orange-500 text-orange-500" size={20} />
          Results
        </h1>
        <SearchBar defaultQuery={query} autoFocus={!query} defaultMode={mode} />
      </div>

      {query ? (
        <div className="space-y-6">
          {/*
            Keyed on the query so navigating from one search to another
            re-suspends and shows the skeleton, rather than leaving the
            previous results on screen while the new ones load.
          */}
          <Suspense key={`${mode}:${query}`} fallback={<MediaGridSkeleton />}>
            <SearchResults query={query} mode={mode} />
          </Suspense>
        </div>
      ) : (
        <p className="px-1 text-sm text-gray-500">
          Describe a plot, a mood, or a half-remembered scene to get started.
        </p>
      )}
    </div>
  );
}
