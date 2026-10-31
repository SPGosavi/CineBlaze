import { Suspense } from "react";
import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { findMovies } from "@/lib/server-api";
import { SearchMode, isSearchMode } from "@cineblaze/shared";
import { sanitizeMediaList } from "@/lib/sanitize";
import SearchBar from "@/components/search/SearchBar";
import SearchRefinements from "@/components/search/SearchRefinements";
import MediaCard from "@/components/media/MediaCard";
import { MediaGridSkeleton } from "@/components/ui/Skeleton";
import { EmptyResults, FailedToLoad } from "@/components/ui/StatePanels";
import Label from "@/components/ui/Label";
import Figure from "@/components/ui/Figure";
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

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between border-b border-rule pb-2">
        <p className="font-body text-sm text-muted">
          <Figure
            value={items.length}
            size="sm"
            className="text-ink font-medium"
          />{" "}
          {items.length === 1
            ? mode === "recommend"
              ? "recommendation"
              : "match"
            : mode === "recommend"
              ? "recommendations"
              : "matches"}{" "}
          for <span className="text-ink font-medium">“{query}”</span>
        </p>
        {refinements.length > 0 && (
          <Label size="xs">
            Refined by {refinements.length}{" "}
            {refinements.length === 1 ? "term" : "terms"}
          </Label>
        )}
      </div>

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
    </div>
  );
}

export default async function SearchPage(props: PageProps<"/search">) {
  const { q, mode: modeParam, r: refinementsParam } = await props.searchParams;
  const query = typeof q === "string" ? q.trim() : "";
  const mode = isSearchMode(modeParam) ? modeParam : "ai";
  const refinements = parseRefinements(refinementsParam);
  const effectiveQuery = toEffectiveQuery(query, refinements);

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="space-y-6">
        <div className="flex items-center gap-2.5">
          <Sparkles className="text-accent" size={20} aria-hidden="true" />
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            {query ? `Search: ${query}` : "Search"}
          </h1>
        </div>

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
        <div>
          <Suspense
            key={`${mode}:${query}:${refinements.join("|")}`}
            fallback={
              <div className="space-y-4">
                {mode === "ai" && (
                  <p className="font-body text-xs text-muted">
                    Searching neural embeddings and generating matches
                    (typically ~15–30s on uncached queries)…
                  </p>
                )}
                <MediaGridSkeleton count={10} />
              </div>
            }
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
        <p className="font-body text-sm text-muted">
          Describe a plot, a mood, or a half-remembered scene to get started.
        </p>
      )}
    </div>
  );
}
