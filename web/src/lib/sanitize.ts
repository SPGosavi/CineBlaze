import type {
  MediaType,
  SanitizedMedia,
  WatchProvider,
  WatchlistStatus,
} from "@cineblaze/shared";
import { isMediaType } from "@cineblaze/shared";

const asString = (value: unknown): string =>
  typeof value === "string" ? value : "";

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : [];

const asProviders = (value: unknown): WatchProvider[] =>
  Array.isArray(value)
    ? value.flatMap((entry) => {
        if (typeof entry !== "object" || entry === null) return [];
        const candidate = entry as Record<string, unknown>;
        if (typeof candidate.name !== "string") return [];
        return [
          {
            name: candidate.name,
            logo: typeof candidate.logo === "string" ? candidate.logo : "",
            ...(typeof candidate.link === "string" && candidate.link
              ? { link: candidate.link }
              : {}),
          },
        ];
      })
    : [];

const asStatus = (value: unknown): WatchlistStatus =>
  value === "watching" || value === "watched" ? value : "want";

const asMediaType = (value: unknown): MediaType =>
  isMediaType(value) ? value : "movie";

/**
 * Normalises a media item so components can rely on every field being present
 * and correctly typed.
 *
 * Takes `unknown` on purpose. This is the boundary where untrusted data
 * becomes a `SanitizedMedia`, and items arrive from three sources with three
 * levels of trust: the API (well-formed), Firestore (possibly written by an
 * older version of the app), and raw TMDB-ish payloads that still use `name`
 * and `first_air_date` instead of `title` and `release_date`. A narrower
 * parameter type would only push `as` casts out to every call site.
 *
 * Unknown extra fields are dropped rather than spread through, so "sanitized"
 * means exactly the fields declared here — nothing arbitrary from Firestore
 * reaches a component.
 */
export function sanitizeMedia(input: unknown): SanitizedMedia | null {
  if (typeof input !== "object" || input === null) return null;

  const item = input as Record<string, unknown>;
  if (typeof item.id !== "number") return null;

  return {
    id: item.id,
    title: asString(item.title) || asString(item.name) || "Untitled",
    release_date: asString(item.release_date) || asString(item.first_air_date),
    media_type: asMediaType(item.media_type),
    poster_path: typeof item.poster_path === "string" ? item.poster_path : null,
    overview: asString(item.overview),
    vote_average: typeof item.vote_average === "number" ? item.vote_average : 0,
    genres: asStringArray(item.genres),
    cast: asStringArray(item.cast),
    providers: asProviders(item.providers),
    director: asString(item.director) || "Unknown",
    original_language: asString(item.original_language),
    imdb_rating: asString(item.imdb_rating) || null,
    rotten_tomatoes: asString(item.rotten_tomatoes) || null,
    status: asStatus(item.status),
    addedAt: typeof item.addedAt === "number" ? item.addedAt : 0,
  };
}

/** Maps a list, dropping anything that could not be normalised. */
export function sanitizeMediaList(input: unknown): SanitizedMedia[] {
  if (!Array.isArray(input)) return [];
  return input
    .map(sanitizeMedia)
    .filter((item): item is SanitizedMedia => item !== null);
}

/** `"2019-10-04"` -> `"2019"`. Returns "N/A" when there is no date at all. */
export function releaseYear(
  item: Pick<SanitizedMedia, "release_date">
): string {
  return item.release_date.split("-")[0] || "N/A";
}

/** OMDb writes the literal string "N/A" rather than omitting the field. */
export function displayRating(value: string | null | undefined): string | null {
  return value && value !== "N/A" ? value : null;
}
