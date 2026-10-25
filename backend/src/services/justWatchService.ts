import fetch from "node-fetch";
import type { MediaType } from "@cineblaze/shared";
import { childLogger } from "../utils/logger.js";

const log = childLogger("justwatch");

const JUSTWATCH_GRAPHQL = "https://apis.justwatch.com/graphql";
const JUSTWATCH_TIMEOUT_MS = 6_000;

export interface JustWatchOffer {
  monetizationType: string;
  presentationType?: string;
  standardWebURL?: string;
  package?: {
    packageId: number;
    clearName: string;
    technicalName: string;
  };
}

interface JustWatchTitleNode {
  id: string;
  objectId: number;
  objectType: string;
  content?: {
    title?: string;
    originalReleaseYear?: number;
    externalIds?: {
      tmdbId?: string | null;
      imdbId?: string | null;
    };
  } | null;
  offers?: JustWatchOffer[];
}

const norm = (s: string) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const ALIAS_GROUPS: readonly (readonly string[])[] = [
  ["hotstar", "disneyhotstar", "disneyplus", "jiohotstar", "disneyplushotstar"],
  ["primevideo", "amazonprimevideo", "amazonvideo", "amazon"],
  ["appletv", "appletvplus", "appletvstore", "appleitunes"],
  ["netflix", "netflixstandardwithads"],
  ["fandangoathome", "vudu"],
  ["hbomax", "max"],
  ["peacock", "peacockpremium"],
  ["googleplaymovies", "googleplay"],
  ["youtube", "youtubepremium"],
  ["jiocinema"],
  ["zee5"],
  ["sonyliv"],
];

/**
 * Checks whether a TMDB provider name matches a JustWatch package clearName.
 */
function isProviderMatch(tmdbName: string, jwName: string): boolean {
  const t = norm(tmdbName);
  const j = norm(jwName);
  if (!t || !j) return false;
  if (t === j) return true;
  if (j.includes(t) || t.includes(j)) return true;

  for (const group of ALIAS_GROUPS) {
    if (
      group.some((a) => t.includes(a) || a.includes(t)) &&
      group.some((a) => j.includes(a) || a.includes(j))
    ) {
      return true;
    }
  }
  return false;
}

// In-memory cache for resolved offers: key = `${tmdbId}-${mediaType}-${country}`
const offersCache = new Map<
  string,
  { expires: number; offers: JustWatchOffer[] }
>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Queries JustWatch GraphQL to fetch all offers (direct streaming URLs) for a given title.
 */
export async function fetchJustWatchOffers(
  tmdbId: number,
  mediaType: MediaType,
  title: string,
  country: string = "IN"
): Promise<JustWatchOffer[]> {
  const cacheKey = `${tmdbId}-${mediaType}-${country.toUpperCase()}`;
  const cached = offersCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.offers;
  }

  const jwType = mediaType === "tv" ? "SHOW" : "MOVIE";

  const query = `
    query GetTitleOffers($country: Country!, $language: Language!, $searchQuery: String!) {
      popularTitles(country: $country, filter: { searchQuery: $searchQuery }, first: 5) {
        edges {
          node {
            id
            objectId
            objectType
            content(country: $country, language: $language) {
              title
              originalReleaseYear
              externalIds {
                tmdbId
                imdbId
              }
            }
            offers(country: $country, platform: WEB) {
              monetizationType
              presentationType
              standardWebURL
              package {
                packageId
                clearName
                technicalName
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    country: country.toUpperCase(),
    language: "en",
    searchQuery: title,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), JUSTWATCH_TIMEOUT_MS);

    const res = await fetch(JUSTWATCH_GRAPHQL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      log.warn(
        { status: res.status },
        "[JustWatch] GraphQL query returned non-200"
      );
      return [];
    }

    const data = (await res.json()) as {
      data?: { popularTitles?: { edges?: { node: JustWatchTitleNode }[] } };
    };
    const edges = data?.data?.popularTitles?.edges || [];

    // Find the title matching TMDB ID and objectType, or fallback to matching TMDB ID
    const match =
      edges.find(
        (e) =>
          e.node.content?.externalIds?.tmdbId === String(tmdbId) &&
          e.node.objectType === jwType
      ) ||
      edges.find(
        (e) => e.node.content?.externalIds?.tmdbId === String(tmdbId)
      ) ||
      edges[0]; // best-effort fallback if search returned exact title

    const offers = (match?.node.offers || []).filter(
      (o): o is JustWatchOffer & { standardWebURL: string } =>
        typeof o.standardWebURL === "string" && Boolean(o.standardWebURL)
    );

    offersCache.set(cacheKey, {
      expires: Date.now() + CACHE_TTL_MS,
      offers,
    });

    return offers;
  } catch (err) {
    log.warn(
      { err: String(err), tmdbId, title, country },
      "[JustWatch] Failed to query GraphQL"
    );
    return [];
  }
}

/**
 * Resolves the direct title link for a TMDB provider from JustWatch offers.
 * Respects monetization type (flatrate / rent / buy) when possible.
 */
export function resolveDirectProviderLink(
  tmdbProviderName: string,
  type: "flatrate" | "rent" | "buy" | undefined,
  offers: JustWatchOffer[]
): string | undefined {
  if (!offers.length) return undefined;

  const matchingOffers = offers.filter(
    (o) =>
      o.package?.clearName &&
      isProviderMatch(tmdbProviderName, o.package.clearName)
  );

  if (!matchingOffers.length) return undefined;

  // Prefer exact monetization type match
  if (type === "flatrate") {
    const flatrateOffer = matchingOffers.find(
      (o) => o.monetizationType === "FLATRATE" || o.monetizationType === "ADS"
    );
    if (flatrateOffer?.standardWebURL) return flatrateOffer.standardWebURL;
  } else if (type === "rent") {
    const rentOffer = matchingOffers.find((o) => o.monetizationType === "RENT");
    if (rentOffer?.standardWebURL) return rentOffer.standardWebURL;
  } else if (type === "buy") {
    const buyOffer = matchingOffers.find((o) => o.monetizationType === "BUY");
    if (buyOffer?.standardWebURL) return buyOffer.standardWebURL;
  }

  // Fallback to any valid direct URL from the matching provider
  return matchingOffers[0]?.standardWebURL;
}
