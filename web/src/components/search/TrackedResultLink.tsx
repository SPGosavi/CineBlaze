"use client";

import Link from "next/link";
import api from "@/lib/api";
import type { SearchSelectionRequest } from "@cineblaze/shared";

export interface TrackedResultLinkProps {
  href: string;
  className?: string;
  query?: string;
  selectedResultId: number;
  srLabel?: string;
  children?: React.ReactNode;
}

/**
 * Link for search results that records which title was chosen.
 *
 * Uses Link's `onNavigate` so we only fire on same-origin SPA navigations,
 * not on prefetch, right-click or new-tab modifier clicks.
 */
export default function TrackedResultLink({
  href,
  className,
  query,
  selectedResultId,
  srLabel,
  children,
}: TrackedResultLinkProps) {
  const normalizedQuery = (query ?? "").trim();

  return (
    <Link
      href={href}
      className={className}
      onNavigate={() => {
        if (!normalizedQuery) return;

        const payload: SearchSelectionRequest = {
          query: normalizedQuery,
          selectedResultId,
        };

        // Fire-and-forget: this is analytics/relevance feedback, never a UX
        // blocker. Failures are intentionally ignored.
        void api.post("/search-selection", payload).catch(() => {});
      }}
    >
      {children || (srLabel && <span className="sr-only">{srLabel}</span>)}
    </Link>
  );
}
