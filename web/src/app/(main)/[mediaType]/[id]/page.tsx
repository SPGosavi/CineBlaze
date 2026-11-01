import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Film, MonitorPlay, Ticket, ExternalLink } from "lucide-react";
import Image from "next/image";
import type {
  EnrichedMedia,
  MediaType,
  SanitizedMedia,
  WatchProvider,
} from "@cineblaze/shared";
import { isMediaType } from "@cineblaze/shared";
import { getMediaDetails, getSimilar } from "@/lib/server-api";
import {
  releaseYear,
  sanitizeMedia,
  sanitizeMediaList,
  isInTheatres,
} from "@/lib/sanitize";
import { getLanguageName } from "@/lib/language";
import {
  PLACEHOLDER_IMAGE,
  SITE_NAME,
  TMDB_IMAGE_BASE_URL,
  TMDB_LOGO_BASE_URL,
} from "@/lib/constants";
import Poster from "@/components/ui/Poster";
import Frame from "@/components/ui/Frame";
import Rating from "@/components/ui/Rating";
import Figure from "@/components/ui/Figure";
import Label from "@/components/ui/Label";
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import PosterTile from "@/components/media/PosterTile";
import WatchlistButton from "@/components/media/WatchlistButton";
import { TrendingRowSkeleton } from "@/components/ui/Skeleton";

function parseParams(
  mediaType: string,
  id: string
): { mediaType: MediaType; id: number } | null {
  if (!isMediaType(mediaType)) return null;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) return null;
  return { mediaType, id: numericId };
}

export async function generateMetadata(
  props: PageProps<"/[mediaType]/[id]">
): Promise<Metadata> {
  const { mediaType, id } = await props.params;
  const parsed = parseParams(mediaType, id);
  if (!parsed) return { title: "Not found" };

  const result = await getMediaDetails(parsed.id, parsed.mediaType);
  if (result.status !== "ok") return { title: "Not found" };

  const item = sanitizeMedia(result.data);
  if (!item) return { title: "Not found" };

  const year = releaseYear(item);
  const kind = item.media_type === "tv" ? "series" : "film";
  const title = `${item.title} (${year})`;
  const description =
    item.overview?.slice(0, 200) ||
    `Cast, ratings and streaming availability for the ${kind} ${item.title}.`;
  const canonical = `/${item.media_type}/${item.id}`;
  const poster = item.poster_path
    ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
    : PLACEHOLDER_IMAGE;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "video.movie",
      title: `${title} · ${SITE_NAME}`,
      description,
      url: canonical,
      images: [
        { url: poster, width: 500, height: 750, alt: `${item.title} poster` },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${SITE_NAME}`,
      description,
      images: [poster],
    },
  };
}

async function SimilarTitles({ item }: { item: EnrichedMedia }) {
  const result = await getSimilar(item);

  if (result.status !== "ok") {
    return (
      <p className="font-body text-sm text-muted">
        Could not load recommendations right now.
      </p>
    );
  }

  const items = sanitizeMediaList(result.data);
  if (items.length === 0) {
    return (
      <p className="font-body text-sm text-muted">No similar titles found.</p>
    );
  }

  return (
    <HorizontalScroll>
      {items.map((similarItem) => (
        <PosterTile
          key={`${similarItem.media_type}-${similarItem.id}`}
          item={similarItem}
        />
      ))}
    </HorizontalScroll>
  );
}

function StructuredData({ item }: { item: SanitizedMedia }) {
  const isTv = item.media_type === "tv";
  const ratingValue =
    typeof item.imdb_rating === "number" ? item.imdb_rating : undefined;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": isTv ? "TVSeries" : "Movie",
    name: item.title,
    ...(item.overview ? { description: item.overview } : {}),
    ...(item.poster_path
      ? { image: `${TMDB_IMAGE_BASE_URL}${item.poster_path}` }
      : {}),
    ...(item.release_date ? { datePublished: item.release_date } : {}),
    ...(item.director !== "Unknown"
      ? { director: { "@type": "Person", name: item.director } }
      : {}),
    ...(ratingValue !== undefined
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue,
            bestRating: 10,
            worstRating: 1,
            ratingCount: 1,
          },
        }
      : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default async function MediaDetailPage(
  props: PageProps<"/[mediaType]/[id]">
) {
  const { mediaType, id } = await props.params;
  const parsed = parseParams(mediaType, id);
  if (!parsed) notFound();

  const result = await getMediaDetails(parsed.id, parsed.mediaType);
  if (result.status !== "ok") notFound();

  const item = sanitizeMedia(result.data);
  if (!item) notFound();

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

  const inTheatres = isInTheatres(item);
  const flatrateProviders = item.providers.filter(
    (p) => p.type === "flatrate" || !p.type
  );
  const otherProviders = item.providers.filter(
    (p) =>
      p.type !== "flatrate" && !flatrateProviders.some((f) => f.name === p.name)
  );
  const seenRentBuy = new Set<string>();
  const rentBuyProviders = otherProviders.filter((p) => {
    if (seenRentBuy.has(p.name)) return false;
    seenRentBuy.add(p.name);
    return true;
  });

  return (
    <article className="relative isolate space-y-12 pb-20 md:pb-10 font-body text-ink">
      {item.poster_path && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-4 -inset-x-4 -z-10 h-[380px] sm:h-[480px] overflow-hidden md:hidden [mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,black_60%,transparent_100%)]"
        >
          <Image
            src={`${TMDB_IMAGE_BASE_URL}${item.poster_path}`}
            alt=""
            fill
            priority={false}
            sizes="100vw"
            className="scale-125 object-cover opacity-80 blur-3xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-paper/30 via-paper/60 to-paper" />
        </div>
      )}
      <StructuredData item={item} />

      {/* Editorial Top Presentation: Poster in Frame beside Header */}
      <div className="grid gap-8 md:grid-cols-[minmax(0,280px)_1fr] items-start">
        <div className="mx-auto w-48 sm:w-64 md:w-full">
          <Frame aspectRatio="poster" hasScrim>
            <Poster
              path={item.poster_path}
              alt={`${item.title} poster`}
              priority
              sizes="(max-width: 768px) 256px, 320px"
            />
          </Frame>
        </div>

        <div className="flex flex-col space-y-5">
          {/* Metadata badges & ratings */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-rule bg-paper-2 px-3 py-0.5 text-xs font-medium text-ink">
              {isTv ? "Series" : "Film"}
            </span>

            {year && <Figure value={year} size="sm" className="text-muted" />}

            {ratingScore != null && (
              <Rating score={ratingScore} source={ratingSource} size="md" />
            )}
          </div>

          {/* Title in Boska at Display Scale */}
          <h1 className="font-display text-3xl md:text-5xl font-medium tracking-tight text-ink leading-[1.05]">
            {item.title}
          </h1>

          {/* Genres */}
          {item.genres.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {item.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-full border border-rule bg-paper-2 px-3 py-1 text-xs font-medium text-ink/90"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Director & Language */}
          {(item.director !== "Unknown" || language) && (
            <p className="text-sm font-body text-muted max-w-[48ch]">
              {item.director !== "Unknown" && (
                <>
                  Directed by{" "}
                  <span className="font-medium text-ink">{item.director}</span>
                </>
              )}
              {item.director !== "Unknown" && language && (
                <span aria-hidden="true" className="mx-2 text-rule">
                  ·
                </span>
              )}
              {language && <span>{language}</span>}
            </p>
          )}

          {/* Cast — clean Geist list (no nested box chips) */}
          {item.cast.length > 0 && (
            <section className="space-y-1.5 pt-2">
              <Label as="h2" size="xs">
                Starring
              </Label>
              <p className="text-sm font-body text-ink/90 leading-relaxed max-w-[48ch]">
                {item.cast.slice(0, 10).join(", ")}
              </p>
            </section>
          )}

          {/* Synopsis — measured prose (Gate 25 capped measure) */}
          <section className="space-y-2 pt-2">
            <Label as="h2" size="xs">
              Synopsis
            </Label>
            <p className="text-sm md:text-base leading-relaxed text-ink/90 max-w-[48ch]">
              {item.overview || "No plot description available."}
            </p>
          </section>

          {/* Watch Now — single containment layer (Gate 4) */}
          {(item.providers.length > 0 || inTheatres) && (
            <section
              id="watch-now"
              className="space-y-3 pt-3 border-t border-rule"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MonitorPlay
                    size={16}
                    className="text-accent"
                    aria-hidden="true"
                  />
                  <h2 className="font-display font-medium text-base text-ink">
                    Watch now
                  </h2>
                </div>
                <Label size="xs">Streaming via JustWatch</Label>
              </div>

              {inTheatres ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3.5 py-1.5 text-xs font-medium text-accent">
                  <Ticket size={14} aria-hidden="true" />
                  <span>In theatres now</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {flatrateProviders.length > 0 && (
                    <div className="space-y-2">
                      <Label size="xs">Stream</Label>
                      <div className="flex flex-wrap gap-2">
                        {flatrateProviders.map((provider) => (
                          <ProviderLinkItem
                            key={`stream-${provider.name}`}
                            provider={provider}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {rentBuyProviders.length > 0 && (
                    <div className="space-y-2">
                      <Label size="xs">Rent / Buy</Label>
                      <div className="flex flex-wrap gap-2">
                        {rentBuyProviders.map((provider) => (
                          <ProviderLinkItem
                            key={`rentbuy-${provider.name}`}
                            provider={provider}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Primary Action Button */}
          <div className="pt-4 max-w-xs">
            <WatchlistButton item={item} variant="full" />
          </div>
        </div>
      </div>

      {/* Recommendations / You might also like */}
      <section className="space-y-4 border-t border-rule pt-8">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-muted" aria-hidden="true" />
          <h2 className="font-display font-medium text-xl text-ink">
            You might also like
          </h2>
        </div>
        <Suspense fallback={<TrendingRowSkeleton />}>
          <SimilarTitles item={result.data} />
        </Suspense>
      </section>
    </article>
  );
}

function ProviderLinkItem({ provider }: { provider: WatchProvider }) {
  if (provider.link) {
    return (
      <a
        href={provider.link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-2 px-3 py-1.5 font-body text-xs font-medium text-ink transition-colors hover:border-muted/50 hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px]"
      >
        <ProviderBadge provider={provider} />
        <ExternalLink size={12} aria-hidden="true" className="text-muted" />
        <span className="sr-only">(opens {provider.name} in a new tab)</span>
      </a>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-rule bg-paper-2 px-3 py-1.5 font-body text-xs font-medium text-ink">
      <ProviderBadge provider={provider} />
    </div>
  );
}

function ProviderBadge({
  provider,
}: {
  provider: { name: string; logo: string };
}) {
  return (
    <>
      <Image
        src={`${TMDB_LOGO_BASE_URL}${provider.logo}`}
        alt=""
        width={18}
        height={18}
        className="rounded-full shrink-0"
      />
      <span>{provider.name}</span>
    </>
  );
}
