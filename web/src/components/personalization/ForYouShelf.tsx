"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { EnrichedMedia, ForYouResponse } from "@cineblaze/shared";
import { useAuthContext } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { PLACEHOLDER_IMAGE, TMDB_IMAGE_BASE_URL } from "@/lib/constants";
import Frame from "@/components/ui/Frame";
import Label from "@/components/ui/Label";

export default function ForYouShelf() {
  const { user, loading } = useAuthContext();
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "ready"; data: ForYouResponse }
    | { status: "error" }
  >({ status: "idle" });

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    let cancelled = false;

    void api
      .get<ForYouResponse>("/for-you", { params: { count: 10 } })
      .then((res) => {
        if (cancelled) return;
        setState({ status: "ready", data: res.data });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  if (!user || loading) return null;

  if (state.status === "error") {
    return (
      <section className="space-y-2">
        <div className="border-b border-rule pb-2">
          <h2 className="font-display font-medium text-lg text-ink">For you</h2>
        </div>
        <p className="text-sm font-body text-muted">
          Could not load personalized picks right now.
        </p>
      </section>
    );
  }

  if (state.status !== "ready") {
    return (
      <section className="space-y-2">
        <div className="border-b border-rule pb-2">
          <h2 className="font-display font-medium text-lg text-ink">For you</h2>
        </div>
        <p className="text-sm font-body text-muted">
          Finding your personalized picks…
        </p>
      </section>
    );
  }

  const items = state.data.recommendations;
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="border-b border-rule pb-2 flex items-baseline justify-between">
        <h2 className="font-display font-medium text-lg text-ink">For you</h2>
        <Label size="xs">{items.length} recommendations</Label>
      </div>
      {state.data.reason && (
        <Label size="xs" className="block text-accent">
          {state.data.reason}
        </Label>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
        {items.slice(0, 10).map((item) => (
          <ForYouCard key={`${item.media_type}-${item.id}`} item={item} />
        ))}
      </div>
    </section>
  );
}

function ForYouCard({ item }: { item: EnrichedMedia }) {
  const src = item.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
    : PLACEHOLDER_IMAGE;

  return (
    <Link
      href={`/${item.media_type}/${item.id}`}
      className="group w-[140px] shrink-0 space-y-1.5 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded-xl"
    >
      <Frame aspectRatio="poster">
        <Image
          src={src}
          alt={`${item.title} poster`}
          fill
          sizes="140px"
          className="object-cover transition-opacity duration-short group-hover:opacity-90"
        />
      </Frame>
      <p className="line-clamp-2 text-xs font-display font-medium text-ink group-hover:text-accent transition-colors">
        {item.title}
      </p>
    </Link>
  );
}
