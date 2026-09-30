import Link from "next/link";
import type { SanitizedMedia } from "@cineblaze/shared";
import { displayRating, releaseYear } from "@/lib/sanitize";
import Poster from "@/components/ui/Poster";
import WatchlistButton from "./WatchlistButton";

export interface MediaCardProps {
  item: SanitizedMedia;
  priority?: boolean;
}

/**
 * Grid card for a search result.
 *
 * A Server Component. In Phase 2 this was `memo()`-wrapped and opened a modal
 * through a context callback; here it renders a real `<Link>` to the detail
 * route, which is both cheaper (no client JS for the card itself) and
 * crawlable — internal links to the SSR detail pages are what make them
 * discoverable.
 *
 * The link is a full-bleed overlay rather than a wrapper, because nesting the
 * watchlist `<button>` inside an `<a>` would be invalid HTML.
 */
export default function MediaCard({ item, priority = false }: MediaCardProps) {
  const year = releaseYear(item);
  const isTv = item.media_type === "tv";
  const imdb = displayRating(item.imdb_rating);
  const rt = displayRating(item.rotten_tomatoes);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-700/50 bg-neutral-800 shadow-lg transition-all duration-200 hover:border-red-500/30 md:hover:scale-[1.02]">
      <div className="relative aspect-2/3 overflow-hidden">
        <Poster
          path={item.poster_path}
          alt={`${item.title} poster`}
          priority={priority}
          className="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-60" />
        <span
          className={`absolute top-2 left-2 rounded px-2 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-sm ${
            isTv ? "bg-orange-600" : "bg-red-600"
          }`}
        >
          {isTv ? "TV" : "MOVIE"}
        </span>
      </div>

      <div className="relative z-10 flex flex-grow flex-col bg-neutral-800 p-3">
        <h3
          className="mb-1 line-clamp-1 leading-tight font-bold text-gray-100 transition-colors group-hover:text-red-400"
          title={item.title}
        >
          {item.title}
        </h3>

        <div className="mb-2 flex items-center justify-between text-xs text-gray-400">
          <span className="font-mono text-gray-500">{year}</span>
          {item.director !== "Unknown" && (
            <span
              className="max-w-[80px] truncate text-gray-500 md:max-w-[100px]"
              title={item.director}
            >
              {item.director}
            </span>
          )}
        </div>

        <div className="mb-2 flex min-h-[20px] flex-wrap gap-1">
          {item.genres.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="rounded-xs border border-neutral-600 px-1.5 py-0.5 text-[9px] font-semibold tracking-wider text-gray-400 uppercase"
            >
              {genre}
            </span>
          ))}
        </div>

        <div className="mt-auto flex gap-2 border-t border-neutral-700/50 pt-2">
          {imdb ? (
            <span className="rounded border border-yellow-500/20 bg-yellow-500/10 px-1.5 py-0.5 text-[10px] font-bold text-yellow-500">
              IMDb {imdb}
            </span>
          ) : (
            <span className="text-[10px] text-gray-600">No rating</span>
          )}
          {rt && (
            <span className="rounded border border-red-400/20 bg-red-400/10 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
              RT {rt}
            </span>
          )}
        </div>
      </div>

      <Link
        href={`/${item.media_type}/${item.id}`}
        className="absolute inset-0 z-10 rounded-xl focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-hidden"
      >
        <span className="sr-only">
          View details for {item.title} ({year})
        </span>
      </Link>

      <WatchlistButton
        item={item}
        className="absolute top-2 right-2 z-20 opacity-100 md:opacity-0 md:group-hover:opacity-100"
      />
    </article>
  );
}
