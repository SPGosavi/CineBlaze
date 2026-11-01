"use client";

import SlidingTitle from "@/components/ui/SlidingTitle";

import Link from "next/link";
import type { SanitizedMedia } from "@cineblaze/shared";
import { releaseYear } from "@/lib/sanitize";
import { getLanguageName } from "@/lib/language";
import Poster from "@/components/ui/Poster";
import Frame from "@/components/ui/Frame";
import Figure from "@/components/ui/Figure";
import Label from "@/components/ui/Label";
import Rating from "@/components/ui/Rating";
import WatchlistButton from "@/components/media/WatchlistButton";
import TrackedResultLink from "@/components/search/TrackedResultLink";

export interface MediaCardProps {
  item: SanitizedMedia;
  priority?: boolean;
  searchQuery?: string;
  attributionTags?: string[];
}

/**
 * Editorial Media Card in Kiln aesthetic.
 *
 * Distinct typography (Boska display title, Geist metadata), Frame poster containment,
 * Heat-ramp rating signature, and clean focus rings.
 */
export default function MediaCard({
  item,
  priority = false,
  searchQuery,
  attributionTags = [],
}: MediaCardProps) {
  const year = releaseYear(item);
  const isTv = item.media_type === "tv";
  const language = getLanguageName(item.original_language);
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

  const titleLinkContent = <SlidingTitle text={item.title} />;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-rule bg-paper-2 transition-colors duration-short hover:border-muted/50">
      {/* Poster in Frame */}
      <Frame aspectRatio="poster" hasScrim>
        {searchQuery ? (
          <TrackedResultLink
            href={`/${item.media_type}/${item.id}`}
            query={searchQuery}
            selectedResultId={item.id}
            srLabel={`View details for ${item.title} (${year})`}
            className="block h-full w-full focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]"
          >
            <Poster
              path={item.poster_path}
              alt={`${item.title} poster`}
              priority={priority}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 220px"
              className="transition-opacity duration-short group-hover:opacity-90"
            />
          </TrackedResultLink>
        ) : (
          <Link
            href={`/${item.media_type}/${item.id}`}
            className="block h-full w-full focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px]"
          >
            <Poster
              path={item.poster_path}
              alt={`${item.title} poster`}
              priority={priority}
              sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 220px"
              className="transition-opacity duration-short group-hover:opacity-90"
            />
          </Link>
        )}
        <span className="absolute top-2.5 left-2.5 z-10 rounded-full border border-rule bg-paper-2/90 px-2.5 py-0.5 font-body text-xs font-medium text-ink pointer-events-none">
          {isTv ? "TV" : "Film"}
        </span>
      </Frame>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-3.5 gap-2">
        <div className="space-y-2">
          {/* Title in Boska */}
          <h3 className="font-medium text-base text-ink group-hover:text-accent transition-colors">
            {searchQuery ? (
              <TrackedResultLink
                href={`/${item.media_type}/${item.id}`}
                query={searchQuery}
                selectedResultId={item.id}
                className="focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded"
              >
                {titleLinkContent}
              </TrackedResultLink>
            ) : (
              <Link
                href={`/${item.media_type}/${item.id}`}
                className="focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 rounded"
              >
                {titleLinkContent}
              </Link>
            )}
          </h3>

          {/* Metadata byline (Geist) */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-body text-muted">
            {year && <Figure value={year} size="sm" className="text-muted" />}
            {language && (
              <>
                <span className="opacity-40" aria-hidden="true">
                  /
                </span>
                <span>{language}</span>
              </>
            )}
            {item.director && item.director !== "Unknown" && (
              <>
                <span className="opacity-40" aria-hidden="true">
                  /
                </span>
                <span className="truncate max-w-[120px]">{item.director}</span>
              </>
            )}
          </div>

          {attributionTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-body text-accent">
              {attributionTags.slice(0, 2).map((tag, idx) => (
                <span key={tag}>
                  {idx > 0 && <span className="mr-1.5 opacity-50">·</span>}
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Rating Row (the signature) */}
        <div className="border-t border-rule pt-2 flex items-center justify-between text-xs shrink-0">
          {ratingScore != null ? (
            <Rating score={ratingScore} source={ratingSource} size="sm" />
          ) : (
            <Label size="xs">Not rated</Label>
          )}
        </div>
      </div>

      {/* Watchlist overlay button */}
      <div className="absolute top-2.5 right-2.5 z-20">
        <WatchlistButton item={item} />
      </div>
    </article>
  );
}
