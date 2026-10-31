import type { SanitizedMedia } from "@cineblaze/shared";
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import PosterTile from "@/components/media/PosterTile";
import Label from "@/components/ui/Label";

export interface ShelfProps {
  title: string;
  items: SanitizedMedia[];
  /** Marks the first few posters as priority — used on the top shelf only. */
  priority?: boolean;
  density?: "spacious" | "compact";
}

/**
 * A titled, horizontally scrollable shelf with varied density.
 */
export default function Shelf({
  title,
  items,
  priority = false,
  density = "compact",
}: ShelfProps) {
  return (
    <section className="space-y-4">
      {/* Label head on a 1px rule */}
      <div className="flex items-center gap-3 border-b border-rule pb-2">
        <h2 className="font-display font-medium text-lg text-ink">{title}</h2>
        <Label size="xs" className="ml-auto">
          {items.length} titles
        </Label>
      </div>

      <HorizontalScroll>
        {items.map((item, index) => (
          <PosterTile
            key={`${item.media_type}-${item.id}`}
            item={item}
            priority={priority && index < 4}
            density={density}
          />
        ))}
      </HorizontalScroll>
    </section>
  );
}
