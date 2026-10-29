"use client";

import type { WatchlistItem, WatchlistStatus } from "@cineblaze/shared";
import WatchlistCard from "./WatchlistCard";
import { useWatchlistDrag } from "@/contexts/WatchlistDragContext";

export interface KanbanColumnProps {
  title: string;
  status: WatchlistStatus;
  items: WatchlistItem[];
  className?: string;
  onMove: (id: number, status: WatchlistStatus) => void;
  onDragStart: (event: React.DragEvent<HTMLElement>, id: number) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDropInColumn: (
    event: React.DragEvent<HTMLElement>,
    status: WatchlistStatus
  ) => void;
  onDropOnCard: (targetId: number) => void;
}

/** One status column ("Want to watch", "Watched") of the watchlist board. */
export default function KanbanColumn({
  title,
  status,
  items,
  className = "",
  onMove,
  onDragStart,
  onDragOver,
  onDropInColumn,
  onDropOnCard,
}: KanbanColumnProps) {
  const { isTouchDragging, dragTarget } = useWatchlistDrag();
  const isColumnDropTarget =
    isTouchDragging &&
    dragTarget?.type === "status" &&
    dragTarget.status === status;

  return (
    <section
      data-watchlist-status-target={status}
      onDragOver={onDragOver}
      onDrop={(event) => onDropInColumn(event, status)}
      className={`flex h-auto min-w-full flex-1 flex-col rounded-xl border bg-neutral-900/50 p-4 transition-all md:h-full md:min-w-[280px] ${
        isColumnDropTarget
          ? "border-red-600/70 ring-2 ring-red-600/30"
          : "border-neutral-800/50"
      } ${className}`}
    >
      <h3
        data-watchlist-status-target={status}
        className={`sticky top-0 z-10 mb-4 flex items-center justify-between rounded-lg border-b border-neutral-800 bg-neutral-900/90 p-2 text-xs font-bold tracking-wider uppercase backdrop-blur-sm transition-all ${
          isColumnDropTarget
            ? "border-red-600/60 bg-red-950/60 text-white"
            : "text-gray-400"
        }`}
      >
        {title}
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
          {items.length}
        </span>
      </h3>

      <div className="scrollbar-thin grid flex-1 grid-cols-3 content-start gap-2 pr-1 pb-4 md:min-h-[200px] md:grid-cols-2 md:overflow-y-auto lg:grid-cols-3">
        {items.map((item) => (
          <WatchlistCard
            key={item.id}
            item={item}
            moveTo={status === "want" ? "watched" : "want"}
            onMove={onMove}
            onDragStart={onDragStart}
            onDropOnCard={onDropOnCard}
          />
        ))}

        {items.length === 0 && (
          <div
            data-watchlist-status-target={status}
            className={`col-span-full flex h-24 items-center justify-center rounded-xl border-2 border-dashed bg-neutral-900/30 text-sm md:h-32 transition-all ${
              isColumnDropTarget
                ? "border-red-600/60 text-red-300/80 bg-red-950/20"
                : "border-neutral-800 text-neutral-600"
            }`}
          >
            Nothing here yet
          </div>
        )}
      </div>
    </section>
  );
}
