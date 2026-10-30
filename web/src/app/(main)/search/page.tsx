import { Suspense } from "react";
import type { Metadata } from "next";
import { Zap } from "lucide-react";
import { findMovies } from "@/lib/server-api";
import { SearchMode, isSearchMode } from "@cineblaze/shared";
import { sanitizeMediaList } from "@/lib/sanitize";
import SearchBar from "@/components/search/SearchBar";
import SearchRefinements from "@/components/search/SearchRefinements";
import MediaCard from "@/components/media/MediaCard";
import { MediaGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyResults, FailedToLoad } from "@/components/ui/StatePanels";
import type { SanitizedMedia } from "@cineblaze/shared";

function parseRefinements(param: string | string[] | undefined): string[] {
  const values = Array.isArray(param) ? param : param ? [param] : [];
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 4)
    )
  );
}

function toEffectiveQuery(query: string, refinements: string[]): string {
  if (refinements.length === 0) return query;
  return `${query}; refine with: ${refinements.join(", ")}`;
}

function buildAttributionTags(
  item: SanitizedMedia,
  mode: SearchMode,
  baseQuery: string,
  refinements: string[]
): string[] {
  const tags: string[] = [];
  const combined = `${baseQuery} ${refinements.join(" ")}`.toLowerCase();

  for (const genre of item.genres || []) {
    if (combined.includes(genre.toLowerCase())) tags.push(genre);
  }

  const year = item.release_date?.slice(0, 4) || "";
  if (year) {
    const decade = `${year.slice(0, 3)}0s`;
    if (combined.includes(decade.toLowerCase()) || combined.includes(year)) {
      tags.push(decade);
    }
  }

  if (mode === "recommend") tags.push("recommended");

  return Array.from(new Set(tags)).slice(0, 3);
}

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
  effectiveQuery,
  mode,
  refinements,
}: {
  query: string;
  effectiveQuery: string;
  mode: SearchMode;
  refinements: string[];
}) {
  const result = await findMovies(effectiveQuery, mode);

  if (result.status === "failed") {
    return <FailedToLoad what="those results" reason={result.reason} />;
  }

  if (result.status === "empty") {
    return <EmptyResults query={query} />;
  }

  const items = sanitizeMediaList(result.data);
  const lowerQuery = query.toLowerCase();
  const looksMoodDriven =
    mode === "recommend" &&
    /(mood|vibe|feel|dark|mysterious|mind|thrill|heartwarm|epic|romantic|nostalgic)/i.test(
      lowerQuery
    );

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
      {refinements.length > 0 ? (
        <p className="px-1 text-xs text-gray-400">
          Refined with: {refinements.join(" • ")}
        </p>
      ) : null}
      {looksMoodDriven ? (
        <p className="px-1 text-xs text-orange-300/80">
          Mood-matched picks based on your vibe query.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((item, index) => (
          <MediaCard
            key={`${item.media_type}-${item.id}`}
            item={item}
            priority={index < 5}
            searchQuery={query}
            attributionTags={buildAttributionTags(
              item,
              mode,
              query,
              refinements
            )}
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
  const { q, mode: modeParam, r: refinementsParam } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const mode = isSearchMode(modeParam) ? modeParam : "ai";
  const refinements = parseRefinements(refinementsParam);
  const effectiveQuery = toEffectiveQuery(query, refinements);

  return (
    <div className="animate-fade-in space-y-8 pb-24 md:pb-10">
      <div className="space-y-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
          <Zap className="fill-orange-500 text-orange-500" size={20} />
          Results
        </h1>
        <SearchBar
          defaultQuery={query}
          autoFocus={!query}
          defaultMode={mode}
          defaultRefinements={refinements}
        />
        {query ? (
          <SearchRefinements
            query={query}
            mode={mode}
            refinements={refinements}
          />
        ) : null}
      </div>

      {query ? (
        <div className="space-y-6">
          {/*
            Keyed on the query so navigating from one search to another
            re-suspends and shows the skeleton, rather than leaving the
            previous results on screen while the new ones load.
          */}
          <Suspense
            key={`${mode}:${query}:${refinements.join("|")}`}
            fallback={<MediaGridSkeleton />}
          >
            <SearchResults
              query={query}
              effectiveQuery={effectiveQuery}
              mode={mode}
              refinements={refinements}
            />
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
