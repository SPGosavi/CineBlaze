"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { CircleCheck, RotateCcw } from "lucide-react";
import type { WatchlistItem, WatchlistStatus } from "@cineblaze/shared";
import Poster from "@/components/ui/Poster";
import Frame from "@/components/ui/Frame";
import Rating from "@/components/ui/Rating";
import { useWatchlistDrag } from "@/contexts/WatchlistDragContext";

export interface WatchlistCardProps {
  item: WatchlistItem;
  /** The status this card would move to. Drives the icon and label. */
  moveTo: WatchlistStatus;
  onMove: (id: number, status: WatchlistStatus) => void;
  onDragStart: (event: React.DragEvent<HTMLElement>, id: number) => void;
  onDropOnCard: (targetId: number) => void;
}

/**
 * Draggable watchlist entry supporting HTML5 DnD and touch DnD.
 * Follows Hallmark single-containment and focus guidelines.
 */
function WatchlistCard({
  item,
  moveTo,
  onMove,
  onDragStart,
  onDropOnCard,
}: WatchlistCardProps) {
  const { isTouchDragging, draggedItem, dragTarget, startTouchDrag } =
    useWatchlistDrag();
  const [isOver, setIsOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const readyToDragRef = useRef(false);
  const activeDragStartedRef = useRef(false);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

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
  }, [revealed]);

  useEffect(() => {
    return () => clearLongPress();
  }, [clearLongPress]);

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    activeDragStartedRef.current = false;

    if (revealed) {
      readyToDragRef.current = true;
    } else {
      readyToDragRef.current = false;
      clearLongPress();
      longPressTimerRef.current = setTimeout(() => {
        setRevealed(true);
        readyToDragRef.current = true;
      }, 350);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!touchStartRef.current || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartRef.current.y);

    if (!readyToDragRef.current && (dx > 8 || dy > 8)) {
      clearLongPress();
      return;
    }

    if (
      readyToDragRef.current &&
      !activeDragStartedRef.current &&
      (dx > 4 || dy > 4)
    ) {
      activeDragStartedRef.current = true;
      startTouchDrag(item, { x: touch.clientX, y: touch.clientY });
    }
  };

  const handleTouchEnd = () => {
    clearLongPress();
    touchStartRef.current = null;
    readyToDragRef.current = false;
    activeDragStartedRef.current = false;
  };

  const isThisItemDragging =
    isTouchDragging &&
    draggedItem?.id === item.id &&
    draggedItem?.media_type === item.media_type;

  const isThisItemDropTarget =
    isTouchDragging &&
    dragTarget?.type === "card" &&
    dragTarget.id === item.id &&
    !isThisItemDragging;

  const imdbNum = item.imdb_rating ? parseFloat(item.imdb_rating) : null;
  const rtNum = item.rotten_tomatoes
    ? parseFloat(item.rotten_tomatoes.replace("%", ""))
    : null;
  const ratingScore =
    imdbNum ??
    (rtNum !== null
      ? rtNum / 10
      : item.vote_average > 0
        ? item.vote_average
        : null);
  const ratingSource =
    imdbNum !== null
      ? "IMDb"
      : rtNum !== null
        ? "RT"
        : item.vote_average > 0
          ? "TMDB"
          : undefined;

  return (
    <div
      ref={cardRef}
      draggable
      data-watchlist-card-id={item.id}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onContextMenu={(e) => {
        // Prevent default context menu on long-press in mobile browsers
        e.preventDefault();
      }}
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
      className={`group relative aspect-[2/3] overflow-hidden rounded-well border border-rule cursor-grab touch-manipulation active:cursor-grabbing select-none transition-transform duration-short ${
        isOver || isThisItemDropTarget
          ? "z-10 scale-[1.02] ring-2 ring-accent shadow-card"
          : ""
      } ${
        isDragging || isThisItemDragging ? "opacity-40 scale-95" : "opacity-100"
      } ${revealed ? "touch-none" : ""}`}
    >
      <Poster
        path={item.poster_path}
        alt={`${item.title} poster`}
        sizes="(max-width: 768px) 30vw, 160px"
        className="pointer-events-none select-none object-cover"
      />

      {/* Scrim with Title and Rating */}
      <div
        className={`pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-paper via-paper/50 to-transparent p-2.5 transition-opacity duration-short ${
          revealed
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
      >
        <h4 className="font-display font-medium text-xs text-ink truncate">
          {item.title}
        </h4>

        {ratingScore != null && (
          <div className="mt-1">
            <Rating score={ratingScore} source={ratingSource} size="sm" />
          </div>
        )}
      </div>

      {/* Move Status Action Button */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onMove(item.id, moveTo);
        }}
        onTouchStart={(e) => {
          e.stopPropagation();
        }}
        aria-label={
          moveTo === "watched"
            ? `Mark ${item.title} as watched`
            : `Move ${item.title} back to want to watch`
        }
        className={`absolute top-2 right-2 z-20 flex h-7 w-7 items-center justify-center rounded-full border border-rule bg-paper-2/95 text-ink hover:text-accent focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-1 active:translate-y-[1px] transition-colors ${
          revealed
            ? "opacity-100"
            : "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100"
        }`}
      >
        {moveTo === "watched" ? (
          <CircleCheck size={15} aria-hidden="true" />
        ) : (
          <RotateCcw size={14} aria-hidden="true" />
        )}
      </button>

      {/* Detail Route Navigation Link */}
      <Link
        href={`/${item.media_type}/${item.id}`}
        tabIndex={0}
        aria-label={`View ${item.title} details`}
        className="absolute inset-0 z-10 rounded-well focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2"
        onClick={(e) => {
          if (activeDragStartedRef.current) {
            e.preventDefault();
          }
        }}
      >
        <span className="sr-only">{item.title}</span>
      </Link>
    </div>
  );
}

export default memo(WatchlistCard);
