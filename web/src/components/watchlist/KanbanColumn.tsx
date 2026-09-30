"use client";

import type { WatchlistItem, WatchlistStatus } from "@cineblaze/shared";
import WatchlistCard from "./WatchlistCard";

export interface KanbanColumnProps {
  title: string;
  status: WatchlistStatus;
  items: WatchlistItem[];
  onDragStart: (event: React.DragEvent<HTMLElement>, id: number) => void;
  onDragOver: (event: React.DragEvent<HTMLElement>) => void;
  onDropInColumn: (
    event: React.DragEvent<HTMLElement>,
    status: WatchlistStatus
  ) => void;
  onDropOnCard: (targetId: number) => void;
}

/** One status column ("Want", "Watching", "Watched") of the watchlist board. */
export default function KanbanColumn({
  title,
  status,
  items,
  onDragStart,
  onDragOver,
  onDropInColumn,
  onDropOnCard,
}: KanbanColumnProps) {
  return (
    <section
      onDragOver={onDragOver}
      onDrop={(event) => onDropInColumn(event, status)}
      className="flex h-auto min-w-full flex-1 flex-col rounded-xl border border-neutral-800/50 bg-neutral-900/50 p-4 md:h-full md:min-w-[280px]"
    >
      <h3 className="sticky top-0 z-10 mb-4 flex items-center justify-between rounded-lg border-b border-neutral-800 bg-neutral-900/90 p-2 text-xs font-bold tracking-wider text-gray-400 uppercase backdrop-blur-sm">
        {title}
        <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold text-white">
          {items.length}
        </span>
      </h3>

      <div className="scrollbar-thin flex-1 pr-1 pb-4 md:min-h-[200px] md:overflow-y-auto">
        {items.map((item) => (
          <WatchlistCard
            key={item.id}
            item={item}
            onDragStart={onDragStart}
            onDropOnCard={onDropOnCard}
          />
        ))}

        {items.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-xl border-2 border-dashed border-neutral-800 bg-neutral-900/30 text-sm text-neutral-600 md:h-32">
            Drag &amp; drop here
          </div>
        )}
      </div>
    </section>
  );
}
