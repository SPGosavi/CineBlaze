import type { SanitizedMedia } from "@cineblaze/shared";
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import PosterTile from "@/components/media/PosterTile";

export interface ShelfProps {
  title: string;
  items: SanitizedMedia[];
  /** Marks the first few posters as priority — used on the top shelf only. */
  priority?: boolean;
}

/**
 * A titled, horizontally scrollable shelf.
 *
 * A Server Component whose children are server-rendered too; only the scroll
 * container itself is a Client Component, and it receives the tiles as
 * `children` so they never enter the client bundle.
 */
export default function Shelf({ title, items, priority = false }: ShelfProps) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="h-5 w-1 rounded-full bg-red-600" />
        <h2 className="text-lg font-bold text-gray-200">{title}</h2>
      </div>
      <HorizontalScroll>
        {items.map((item, index) => (
          <PosterTile
            key={`${item.media_type}-${item.id}`}
            item={item}
            priority={priority && index < 4}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
