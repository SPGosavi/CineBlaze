import Link from "next/link";
import type { SanitizedMedia } from "@cineblaze/shared";
import { displayRating, releaseYear } from "@/lib/sanitize";
import Poster from "@/components/ui/Poster";
import WatchlistButton from "./WatchlistButton";

export interface PosterTileProps {
  item: SanitizedMedia;
  priority?: boolean;
}

/**
 * Compact poster tile used inside horizontal shelves — the trending rows and
 * the "you might also like" row on a detail page.
 *
 * Phase 2 had two near-identical components for these two cases
 * (`TrendingRow`'s inline tile and `SimilarCard`); they differed only in
 * size and are one component here.
 */
export default function PosterTile({
  item,
  priority = false,
}: PosterTileProps) {
  const year = releaseYear(item);
  const imdb = displayRating(item.imdb_rating);
  const rt = displayRating(item.rotten_tomatoes);

  return (
    <div className="group relative w-[140px] min-w-[140px] flex-shrink-0 md:w-[160px] md:min-w-[160px]">
      <div className="relative mb-2 aspect-2/3 overflow-hidden rounded-lg shadow-lg">
        <Poster
          path={item.poster_path}
          alt={`${item.title} poster`}
          priority={priority}
          sizes="160px"
          className="transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <p className="truncate text-sm font-bold text-gray-300 transition-colors group-hover:text-red-500">
        {item.title}
      </p>
      <div className="mt-1 flex h-4 gap-2">
        <span className="text-[9px] font-medium text-orange-500">{year}</span>
        {imdb && (
          <span className="rounded border border-yellow-500/20 bg-yellow-500/5 px-1 text-[9px] font-bold text-yellow-500">
            IMDb {imdb}
          </span>
        )}
        {rt && (
          <span className="rounded border border-red-400/20 bg-red-400/5 px-1 text-[9px] font-bold text-red-400">
            RT {rt}
          </span>
        )}
      </div>

      <Link
        href={`/${item.media_type}/${item.id}`}
        className="absolute inset-0 z-10 rounded-lg focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-hidden"
      >
        <span className="sr-only">
          View details for {item.title} ({year})
        </span>
      </Link>

      <WatchlistButton
        item={item}
        className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
      />
    </div>
  );
}
