import Link from "next/link";
import type { SanitizedMedia } from "@cineblaze/shared";
import { releaseYear } from "@/lib/sanitize";
import Poster from "@/components/ui/Poster";
import Frame from "@/components/ui/Frame";
import Rating from "@/components/ui/Rating";
import Figure from "@/components/ui/Figure";
import Label from "@/components/ui/Label";
import WatchlistButton from "./WatchlistButton";

export interface PosterTileProps {
  item: SanitizedMedia;
  priority?: boolean;
  density?: "spacious" | "compact";
}

/**
 * Compact poster tile with signature heat-ramp rating and clean focus styling.
 */
export default function PosterTile({
  item,
  priority = false,
  density = "compact",
}: PosterTileProps) {
  const year = releaseYear(item);
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

  const widthClass =
    density === "spacious"
      ? "w-[160px] min-w-[160px] md:w-[190px] md:min-w-[190px]"
      : "w-[130px] min-w-[130px] md:w-[150px] md:min-w-[150px]";

  return (
    <div className={`group relative flex-shrink-0 space-y-2 ${widthClass}`}>
      <Frame aspectRatio="poster" hasScrim>
        <Link
          href={`/${item.media_type}/${item.id}`}
          className="block h-full w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]"
          aria-label={item.title}
        >
          <Poster
            path={item.poster_path}
            alt={`${item.title} poster`}
            priority={priority}
            sizes={density === "spacious" ? "190px" : "150px"}
            className="transition-opacity duration-short group-hover:opacity-90"
          />
        </Link>
        <div className="absolute top-2 right-2 z-20">
          <WatchlistButton item={item} />
        </div>
      </Frame>

      <div className="space-y-1">
        <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,black_90%,transparent)]">
          {/* Static truncated title when not hovered */}
          <Link
            href={`/${item.media_type}/${item.id}`}
            className="block font-medium text-sm text-ink truncate hover:text-accent focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-1 rounded transition-colors group-hover:hidden"
            title={item.title}
          >
            {item.title}
          </Link>

          {/* Sliding title when hovered, using marquee animation */}
          <div
            className="hidden w-max group-hover:flex group-hover:animate-marquee-title"
            aria-hidden="true"
          >
            <Link
              href={`/${item.media_type}/${item.id}`}
              tabIndex={-1}
              className="shrink-0 pr-8 font-medium text-sm text-ink hover:text-accent transition-colors"
            >
              {item.title}
            </Link>
            <Link
              href={`/${item.media_type}/${item.id}`}
              tabIndex={-1}
              className="shrink-0 pr-8 font-medium text-sm text-ink hover:text-accent transition-colors"
            >
              {item.title}
            </Link>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-body text-muted">
          {year ? (
            <Figure value={year} size="sm" className="text-muted" />
          ) : (
            <span />
          )}
          {ratingScore != null && (
            <Rating score={ratingScore} source={ratingSource} size="sm" />
          )}
        </div>
      </div>
    </div>
  );
}
