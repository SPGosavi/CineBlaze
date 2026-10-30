"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { EnrichedMedia, ForYouResponse } from "@cineblaze/shared";
import { useAuthContext } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { PLACEHOLDER_IMAGE, TMDB_IMAGE_BASE_URL } from "@/lib/constants";

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
        <div className="flex items-center gap-2 px-1">
          <div className="h-5 w-1 rounded-full bg-orange-500" />
          <h2 className="text-lg font-bold text-gray-200">For You</h2>
        </div>
        <p className="px-1 text-sm text-gray-500">
          Could not load personalized picks right now.
        </p>
      </section>
    );
  }

  if (state.status !== "ready") {
    return (
      <section className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <div className="h-5 w-1 rounded-full bg-orange-500" />
          <h2 className="text-lg font-bold text-gray-200">For You</h2>
        </div>
        <p className="px-1 text-sm text-gray-500">
          Finding your personalized picks...
        </p>
      </section>
    );
  }

  const items = state.data.recommendations;
  if (items.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="h-5 w-1 rounded-full bg-orange-500" />
        <h2 className="text-lg font-bold text-gray-200">For You</h2>
      </div>
      <p className="px-1 text-xs text-orange-300/90">{state.data.reason}</p>

      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-thin">
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
      className="group w-[140px] shrink-0 space-y-2"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-xl border border-neutral-700/70 bg-neutral-900">
        <Image
          src={src}
          alt={`${item.title} poster`}
          fill
          sizes="140px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <p className="line-clamp-2 text-xs font-medium text-gray-200">
        {item.title}
      </p>
    </Link>
  );
}
