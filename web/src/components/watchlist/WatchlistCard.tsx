"use client";

import { memo, useState } from "react";
import Link from "next/link";
import type { WatchlistItem } from "@cineblaze/shared";
import { releaseYear } from "@/lib/sanitize";
import Poster from "@/components/ui/Poster";

export interface WatchlistCardProps {
  item: WatchlistItem;
  onDragStart: (event: React.DragEvent<HTMLElement>, id: number) => void;
  onDropOnCard: (targetId: number) => void;
}

/**
 * Draggable watchlist entry. Dropping one card onto another reorders.
 *
 * Still a Client Component and still memoised: the kanban board re-renders on
 * every optimistic status change, and these cards are the bulk of it.
 */
function WatchlistCard({
  item,
  onDragStart,
  onDropOnCard,
}: WatchlistCardProps) {
  const [isOver, setIsOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const year = releaseYear(item);

  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(item.id));
        event.dataTransfer.effectAllowed = "move";
        setIsDragging(true);
        onDragStart(event, item.id);
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setIsOver(false);
        onDropOnCard(item.id);
      }}
      className={`group relative mb-3 flex cursor-grab touch-manipulation gap-3 rounded-xl border bg-neutral-800 p-2.5 shadow-sm transition-all active:cursor-grabbing ${
        isOver
          ? "z-10 scale-[1.02] border-blue-500 ring-2 ring-blue-500/20"
          : "border-neutral-700 hover:border-red-500/30"
      } ${isDragging ? "border-dashed border-gray-500 opacity-50" : "opacity-100"}`}
    >
      <div className="relative h-20 w-14 flex-shrink-0 overflow-hidden rounded-lg shadow-md">
        <Poster
          path={item.poster_path}
          alt={`${item.title} poster`}
          sizes="56px"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center overflow-hidden">
        <h4 className="truncate leading-snug font-bold text-gray-200 text-sm transition-colors group-hover:text-red-400">
          {item.title}
        </h4>
        <span className="mb-1.5 text-xs font-medium text-orange-500">
          {year}
        </span>
        <div className="flex flex-wrap gap-1">
          {item.genres.length > 0 ? (
            item.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="rounded border border-neutral-800 bg-neutral-900 px-1.5 py-0.5 text-[8px] tracking-wide text-gray-500 uppercase"
              >
                {genre}
              </span>
            ))
          ) : (
            <span className="text-[8px] text-gray-600">No genre</span>
          )}
        </div>
      </div>

      {/*
        A link rather than a modal trigger, so a watchlist entry deep-links to
        the same SSR detail page everything else points at. `draggable={false}`
        stops the browser's native link drag from pre-empting the card's own
        drag handler.
      */}
      <Link
        href={`/${item.media_type}/${item.id}`}
        draggable={false}
        className="absolute inset-0 rounded-xl focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-hidden"
      >
        <span className="sr-only">View details for {item.title}</span>
      </Link>
    </div>
  );
}

export default memo(WatchlistCard);
