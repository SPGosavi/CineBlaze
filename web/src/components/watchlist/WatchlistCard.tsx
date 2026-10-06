"use client";

import { memo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { WatchlistItem, WatchlistStatus } from "@cineblaze/shared";
import Poster from "@/components/ui/Poster";
import { useLongPress } from "@/hooks/useLongPress";

export interface WatchlistCardProps {
  item: WatchlistItem;
  /** The status this card would move to. Drives the icon and label. */
  moveTo: WatchlistStatus;
  onMove: (id: number, status: WatchlistStatus) => void;
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
  moveTo,
  onMove,
  onDragStart,
  onDropOnCard,
}: WatchlistCardProps) {
  const [isOver, setIsOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const { revealed, setRevealed, handlers } = useLongPress(() => {
    // Reveal action is handled via state
  });

  useEffect(() => {
    if (!revealed) return;
    const handleOutsideClick = (event: PointerEvent) => {
      if (
        cardRef.current &&
        event.target instanceof Node &&
        !cardRef.current.contains(event.target)
      ) {
        setRevealed(false);
      }
    };
    document.addEventListener("pointerdown", handleOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", handleOutsideClick);
  }, [revealed, setRevealed]);

  return (
    <div
      ref={cardRef}
      draggable
      {...handlers}
      onContextMenu={(e) => {
        // Prevent default context menu on long-press in mobile browsers
        e.preventDefault();
      }}
      style={{ WebkitTouchCallout: "none" }}
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
      className={`group relative aspect-[2/3] overflow-hidden rounded-lg cursor-grab touch-manipulation active:cursor-grabbing select-none ${
        isOver ? "z-10 scale-[1.02] ring-2 ring-blue-500/50" : ""
      } ${isDragging ? "opacity-50" : "opacity-100"} ${
        revealed ? "touch-none" : ""
      }`}
    >
      <Poster
        path={item.poster_path}
        alt={`${item.title} poster`}
        sizes="(max-width: 768px) 30vw, 160px"
      />

      <div
        className={`pointer-events-none absolute inset-0 flex flex-col justify-end bg-linear-to-t from-black/90 via-black/40 to-transparent p-3 transition-opacity duration-200 ${
          revealed
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
      >
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,white_90%,transparent)]">
          {/* Static truncated title when not hovered/revealed */}
          <h4
            className={`truncate font-bold text-sm text-white drop-shadow-md ${
              revealed ? "hidden" : "group-hover:hidden"
            }`}
          >
            {item.title}
          </h4>

          {/* Sliding title when hovered/revealed, using the marquee animation */}
          <div
            className={`w-max gap-4 ${
              revealed
                ? "flex animate-marquee-title"
                : "hidden group-hover:flex group-hover:animate-marquee-title"
            }`}
          >
            <h4 className="font-bold text-sm text-white drop-shadow-md shrink-0">
              {item.title}
            </h4>
            <h4 className="font-bold text-sm text-white drop-shadow-md shrink-0">
              {item.title}
            </h4>
          </div>
        </div>
        <div className="mt-1 flex flex-wrap gap-1">
          {item.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="rounded bg-black/60 px-1.5 py-0.5 text-[9px] tracking-wide text-gray-300 uppercase backdrop-blur-sm"
            >
              {genre}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMove(item.id, moveTo);
        }}
        aria-label={
          moveTo === "watched"
            ? `Mark ${item.title} as watched`
            : `Move ${item.title} back to want to watch`
        }
        className={`absolute top-2 right-2 z-20 flex h-8 w-8 items-center justify-center rounded-full shadow-lg transition-all ${
          moveTo === "watched"
            ? "bg-green-600/90 text-white hover:bg-green-500"
            : "bg-neutral-700/90 text-white hover:bg-neutral-600"
        } ${
          revealed
            ? "opacity-100 scale-100"
            : "opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 group-focus-within:opacity-100 group-focus-within:scale-100"
        }`}
      >
        {moveTo === "watched" ? (
          <CircleCheck size={18} />
        ) : (
          <RotateCcw size={18} />
        )}
      </button>

      {/*
        A link rather than a modal trigger, so a watchlist entry deep-links to
        the same SSR detail page everything else points at. `draggable={false}`
        stops the browser's native link drag from pre-empting the card's own
        drag handler.
      */}
      <Link
        href={`/${item.media_type}/${item.id}`}
        draggable={false}
        className="absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-hidden"
      >
        <span className="sr-only">View details for {item.title}</span>
      </Link>
    </div>
  );
}

export default memo(WatchlistCard);
