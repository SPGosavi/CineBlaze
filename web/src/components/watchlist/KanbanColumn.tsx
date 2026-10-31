"use client";

import type { WatchlistItem, WatchlistStatus } from "@cineblaze/shared";
import WatchlistCard from "./WatchlistCard";
import { useWatchlistDrag } from "@/contexts/WatchlistDragContext";
import Label from "@/components/ui/Label";
import Figure from "@/components/ui/Figure";

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
  const { isTouchDragging, draggedItem, dragTarget } = useWatchlistDrag();
  const isColumnDropTarget =
    isTouchDragging &&
    dragTarget?.type === "status" &&
    dragTarget.status === status &&
    draggedItem !== null &&
    draggedItem.status !== status;

  return (
    <section
      data-watchlist-status-target={status}
      onDragOver={onDragOver}
      onDrop={(event) => onDropInColumn(event, status)}
      className={`flex h-auto min-w-full flex-1 flex-col rounded-well border bg-paper-2/60 p-4 transition-colors duration-short md:h-full md:min-w-[280px] ${
        isColumnDropTarget
          ? "border-accent ring-2 ring-accent/30"
          : "border-rule"
      } ${className}`}
    >
      {/* Column head: Label on a rule with a tabular count Figure (Gate 63) */}
      <div
        data-watchlist-status-target={status}
        className="sticky top-0 z-10 mb-4 flex items-center justify-between border-b border-rule pb-2 bg-paper-2"
      >
        <h3 className="font-display font-medium text-base text-ink">{title}</h3>
        <Figure
          value={items.length}
          size="sm"
          className="text-muted font-medium"
        />
      </div>

      <div className="scrollbar-thin grid flex-1 grid-cols-3 content-start gap-2.5 pr-1 pb-4 md:min-h-[200px] md:grid-cols-2 md:overflow-y-auto lg:grid-cols-3">
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
      </div>
    </section>
  );
}
