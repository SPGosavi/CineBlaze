import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Film, MonitorPlay, Ticket, ExternalLink } from "lucide-react";
import Image from "next/image";
import type {
  EnrichedMedia,
  MediaType,
  SanitizedMedia,
} from "@cineblaze/shared";
import { isMediaType } from "@cineblaze/shared";
import { getMediaDetails, getSimilar } from "@/lib/server-api";
import {
  displayRating,
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
import HorizontalScroll from "@/components/ui/HorizontalScroll";
import PosterTile from "@/components/media/PosterTile";
import WatchlistButton from "@/components/media/WatchlistButton";
import { TrendingRowSkeleton } from "@/components/ui/Skeleton";

/**
 * Re-establishes the route params as real types.
 *
 * `mediaType` and `id` arrive as arbitrary strings from the URL, so a request
 * for `/banana/abc` has to be rejected here rather than passed to the API.
 *
 * Rejecting it before the first `await` that can suspend is what lets the
 * resulting `notFound()` return a real HTTP 404. Next can only set a status
 * while the response body has not started streaming, so an earlier revision
 * of this route — which sat under a segment-level `loading.tsx` — answered
 * every bad URL with a soft 404 (HTTP 200 plus a `noindex` tag). The
 * `loading.tsx` was removed for exactly this reason.
 */
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

/**
 * Structured data so Google can render a rich result for the title.
 *
 * `JSON.stringify` does not escape `<`, so the payload is scrubbed before it
 * goes into a `<script>` — overview text comes from TMDB and is not ours.
 */
function StructuredData({ item }: { item: SanitizedMedia }) {
  const year = releaseYear(item);
  const imdb = displayRating(item.imdb_rating);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": item.media_type === "tv" ? "TVSeries" : "Movie",
    name: item.title,
    description: item.overview,
    image: item.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${item.poster_path}`
      : undefined,
    datePublished: item.release_date || undefined,
    genre: item.genres.length > 0 ? item.genres : undefined,
    director:
      item.director !== "Unknown"
        ? { "@type": "Person", name: item.director }
        : undefined,
    actor: item.cast.map((name) => ({ "@type": "Person", name })),
    aggregateRating: imdb
      ? {
          "@type": "AggregateRating",
          ratingValue: imdb,
          bestRating: "10",
          ratingCount: 1,
        }
      : undefined,
    ...(year !== "N/A" ? { copyrightYear: year } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/**
 * "You might also like".
 *
 * Streamed separately because it runs a Groq call that can take tens of
 * seconds; the main details must not wait on it.
 */
async function SimilarTitles({ item }: { item: EnrichedMedia }) {
  const result = await getSimilar(item);

  if (result.status !== "ok") {
    return (
      <p className="text-sm text-gray-600">
        {result.status === "empty"
          ? "No similar titles found."
          : "Couldn't load recommendations right now."}
      </p>
    );
  }

  return (
    <HorizontalScroll>
      {sanitizeMediaList(result.data).map((similar) => (
        <PosterTile
          key={`${similar.media_type}-${similar.id}`}
          item={similar}
        />
      ))}
    </HorizontalScroll>
  );
}

/**
 * Movie / TV detail page.
 *
 * SSR with a 24-hour revalidate. This was a modal in Phase 2 and deliberately
 * deferred to here: as a real route it has a canonical URL, Open Graph tags
 * and JSON-LD, which is what makes the catalogue discoverable at all.
 */
export default async function MediaDetailPage(
  props: PageProps<"/[mediaType]/[id]">
) {
  const { mediaType, id } = await props.params;
  const parsed = parseParams(mediaType, id);
  if (!parsed) notFound();

  const result = await getMediaDetails(parsed.id, parsed.mediaType);
  if (result.status === "empty") notFound();
  if (result.status === "failed") {
    // Distinct from a 404: the title may well exist, we just could not reach
    // the API. Throwing hands off to error.tsx, which offers a retry.
    throw new Error(`Could not load this title — ${result.reason}`);
  }

  const item = sanitizeMedia(result.data);
  if (!item) notFound();

  const year = releaseYear(item);
  const isTv = item.media_type === "tv";
  const imdb = displayRating(item.imdb_rating);
  const rt = displayRating(item.rotten_tomatoes);
  const language = getLanguageName(item.original_language);
  const inTheatres = isInTheatres(item);

  return (
    <article className="isolate animate-fade-in pb-24 md:pb-10">
      {item.poster_path && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[60vh] overflow-hidden md:hidden"
        >
          <Image
            src={`${TMDB_IMAGE_BASE_URL}${item.poster_path}`}
            alt=""
            fill
            priority={false}
            sizes="100vw"
            className="scale-125 object-cover opacity-80 blur-3xl"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/60 via-black/70 to-black" />
        </div>
      )}
      <StructuredData item={item} />

      <div className="grid gap-8 md:grid-cols-[minmax(0,300px)_1fr]">
        <div className="relative mx-auto aspect-2/3 w-48 overflow-hidden rounded-2xl border border-neutral-800 shadow-2xl md:mx-0 md:w-full">
          <Poster
            path={item.poster_path}
            alt={`${item.title} poster`}
            priority
            sizes="(max-width: 768px) 192px, 300px"
          />
        </div>

        <div className="flex flex-col">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span
              className={`rounded px-2 py-0.5 text-xs font-black tracking-wider text-white uppercase ${
                isTv ? "bg-orange-600" : "bg-red-600"
              }`}
            >
              {isTv ? "Series" : "Movie"}
            </span>
            <span className="font-mono font-medium text-gray-400">{year}</span>
            {imdb && (
              <span className="rounded border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 font-bold text-yellow-400">
                IMDb {imdb}
              </span>
            )}
            {rt && (
              <span className="rounded border border-red-400/20 bg-red-400/10 px-2 py-0.5 font-bold text-red-400">
                RT {rt}
              </span>
            )}
          </div>

          <h1 className="text-3xl leading-tight font-black tracking-tight text-white md:text-5xl">
            {item.title}
          </h1>

          {item.genres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.genres.map((genre) => (
                <span
                  key={genre}
                  className="rounded-md border border-orange-500/30 bg-orange-500/10 px-2 py-1 text-xs font-bold tracking-wider text-orange-400 uppercase"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {(item.director !== "Unknown" || language) && (
            <p className="mt-3 text-sm text-gray-400">
              {item.director !== "Unknown" && (
                <>
                  Directed by{" "}
                  <span className="font-semibold text-white">
                    {item.director}
                  </span>
                </>
              )}
              {item.director !== "Unknown" && language && (
                <span aria-hidden className="mx-2 text-neutral-600">
                  ·
                </span>
              )}
              {language && <span className="text-gray-300">{language}</span>}
            </p>
          )}

          {item.cast.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                Starring
              </h2>
              <div className="flex flex-wrap gap-2">
                {item.cast.map((actor) => (
                  <span
                    key={actor}
                    className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-sm text-gray-300"
                  >
                    {actor}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="mt-6">
            <h2 className="mb-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
              Synopsis
            </h2>
            <p className="border-l-2 border-red-600 pl-4 text-sm leading-relaxed text-gray-300 md:text-base">
              {item.overview || "No plot description available."}
            </p>
          </section>

          {(item.providers.length > 0 || inTheatres) && (
            <section className="mt-6 border-t border-neutral-800 pt-4">
              <h2 className="mb-3 flex items-center gap-2 text-[10px] font-bold tracking-widest text-gray-500 uppercase">
                <MonitorPlay size={14} /> Watch now
              </h2>

              {inTheatres ? (
                <span className="inline-flex items-center gap-2 rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-sm font-bold text-orange-400">
                  <Ticket size={16} aria-hidden /> In theatres now
                </span>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {item.providers.map((provider) =>
                    provider.link ? (
                      <a
                        key={provider.name}
                        href={provider.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 p-2 transition-colors hover:border-red-500/40 hover:bg-neutral-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-hidden"
                      >
                        <ProviderBadge provider={provider} />
                        <ExternalLink
                          size={12}
                          aria-hidden
                          className="text-gray-500"
                        />
                        <span className="sr-only">
                          (opens {provider.name} in a new tab)
                        </span>
                      </a>
                    ) : (
                      <div
                        key={provider.name}
                        className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800 p-2"
                      >
                        <ProviderBadge provider={provider} />
                      </div>
                    )
                  )}
                </div>
              )}
            </section>
          )}

          <div className="mt-auto flex flex-col gap-3 pt-8 sm:flex-row">
            <WatchlistButton item={item} variant="full" />
          </div>
        </div>
      </div>

      <section className="mt-12 border-t border-neutral-800 pt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-orange-500 uppercase">
          <Film size={14} /> You might also like
        </h2>
        <Suspense fallback={<TrendingRowSkeleton />}>
          <SimilarTitles item={result.data} />
        </Suspense>
      </section>
    </article>
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
        width={24}
        height={24}
        className="rounded-md"
      />
      <span className="text-xs font-medium text-gray-300">{provider.name}</span>
    </>
  );
}
