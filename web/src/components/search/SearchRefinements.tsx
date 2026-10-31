import Link from "next/link";
import { X, Plus } from "lucide-react";
import type { SearchMode } from "@cineblaze/shared";
import Label from "@/components/ui/Label";

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
    <section className="space-y-3">
      <Label size="xs" className="block text-muted">
        Refine this search
      </Label>

      {refinements.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {refinements.map((refinement) => (
            <Link
              key={refinement}
              href={buildHref(
                query,
                mode,
                refinements.filter((value) => value !== refinement)
              )}
              aria-label={`Remove refinement: ${refinement}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-accent bg-accent text-accent-ink px-3 py-1 font-body text-xs font-medium transition-colors hover:opacity-95 focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2 active:translate-y-[1px]"
            >
              <span>{refinement}</span>
              <X size={13} aria-hidden="true" />
            </Link>
          ))}

          <Link
            href={buildHref(query, mode, [])}
            className="rounded-full border border-rule bg-paper-2 px-3 py-1 font-body text-xs text-muted transition-colors hover:text-ink hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px]"
          >
            Clear all
          </Link>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {candidates.slice(0, 6).map((candidate) => (
          <Link
            key={candidate}
            href={buildHref(
              query,
              mode,
              Array.from(new Set([...refinements, candidate])).slice(0, 4)
            )}
            className="inline-flex items-center gap-1 rounded-full border border-rule bg-paper-2 px-3 py-1 font-body text-xs text-ink transition-colors hover:border-muted/50 hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px]"
          >
            <Plus size={12} className="text-muted" aria-hidden="true" />
            <span>{candidate}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
