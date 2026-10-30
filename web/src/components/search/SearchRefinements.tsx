import Link from "next/link";
import type { SearchMode } from "@cineblaze/shared";

const REFINEMENT_SUGGESTIONS: Record<SearchMode, string[]> = {
  ai: [
    "with time travel",
    "from the 90s",
    "non-linear story",
    "female lead",
    "set in space",
    "under 2 hours",
  ],
  direct: ["remastered", "part 2", "director's cut", "hindi dub"],
  recommend: [
    "mind-bending",
    "feel-good",
    "dark mystery",
    "from 2010s",
    "high imdb",
    "lesser known",
  ],
};

function buildHref(
  query: string,
  mode: SearchMode,
  refinements: string[]
): { pathname: string; query: Record<string, string | string[]> } {
  return {
    pathname: "/search",
    query: {
      q: query,
      mode,
      ...(refinements.length > 0 ? { r: refinements } : {}),
    },
  };
}

export interface SearchRefinementsProps {
  query: string;
  mode: SearchMode;
  refinements: string[];
}

export default function SearchRefinements({
  query,
  mode,
  refinements,
}: SearchRefinementsProps) {
  if (!query.trim()) return null;

  const activeSet = new Set(refinements.map((value) => value.toLowerCase()));
  const candidates = REFINEMENT_SUGGESTIONS[mode].filter(
    (value) => !activeSet.has(value.toLowerCase())
  );

  return (
    <section className="space-y-2">
      <p className="px-1 text-xs font-semibold tracking-wide text-gray-400 uppercase">
        Refine this search
      </p>

      {refinements.length > 0 ? (
        <div className="flex flex-wrap gap-2 px-1">
          {refinements.map((refinement) => (
            <Link
              key={refinement}
              href={buildHref(
                query,
                mode,
                refinements.filter((value) => value !== refinement)
              )}
              className="rounded-full border border-orange-400/40 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200 transition hover:border-orange-300"
            >
              {refinement} ✕
            </Link>
          ))}

          <Link
            href={buildHref(query, mode, [])}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-gray-300 transition hover:border-white/40"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2 px-1">
        {candidates.slice(0, 6).map((candidate) => (
          <Link
            key={candidate}
            href={buildHref(
              query,
              mode,
              Array.from(new Set([...refinements, candidate])).slice(0, 4)
            )}
            className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-xs font-medium text-gray-200 transition hover:border-orange-400/60 hover:text-orange-200"
          >
            + {candidate}
          </Link>
        ))}
      </div>
    </section>
  );
}
