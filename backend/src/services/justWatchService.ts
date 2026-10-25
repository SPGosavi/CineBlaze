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

const EXPECTED_DOMAINS: Record<string, string[]> = {
  crunchyroll: ["crunchyroll.com"],
  netflix: ["netflix.com"],
  hotstar: ["hotstar.com"],
  appletv: ["tv.apple.com", "apple.com"],
  primevideo: ["primevideo.com", "amazon."],
  amazonvideo: ["primevideo.com", "amazon."],
  sonyliv: ["sonyliv.com"],
  zee5: ["zee5.com"],
  jiocinema: ["jiocinema.com"],
  hulu: ["hulu.com"],
  peacock: ["peacocktv.com"],
  max: ["max.com"],
  paramountplus: ["paramountplus.com"],
  youtube: ["youtube.com"],
  googleplay: ["play.google.com"],
  fandango: ["fandango.com", "vudu.com"],
};

const ALIAS_GROUPS: readonly (readonly string[])[] = [
  ["hotstar", "disneyhotstar", "disneyplus", "jiohotstar", "disneyplushotstar"],
  ["primevideo", "amazonprimevideo", "amazonvideo", "amazon"],
  ["appletv", "appletvplus", "appletvstore", "appleitunes"],
  ["netflix", "netflixstandardwithads"],
  ["fandangoathome", "vudu", "fandango"],
  ["hbomax", "max"],
  ["peacock", "peacockpremium"],
  ["googleplaymovies", "googleplay"],
  ["youtube", "youtubepremium"],
  ["crunchyroll"],
  ["sonyliv", "sonylivtv"],
  ["zee5"],
  ["jiocinema"],
];

/**
 * Unwraps affiliate redirection wrappers (e.g. Crunchyroll's impact radius
 * tracking link) to point directly to the destination site.
 */
export function cleanProviderUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  if (url.includes("crunchyroll.pxf.io")) {
    try {
      const parsed = new URL(url);
      const direct = parsed.searchParams.get("u");
      if (direct) return decodeURIComponent(direct);
    } catch {
      // ignore
    }
  }
  return url;
}

/**
 * Scores an offer against a requested TMDB provider name and type.
 * Returns -1 if the offer is not a match or is an incompatible channel.
 */
function scoreOffer(
  tmdbName: string,
  type: "flatrate" | "rent" | "buy" | undefined,
  offer: JustWatchOffer
): number {
  const t = norm(tmdbName);
  const pkgName = offer.package?.clearName || "";
  const j = norm(pkgName);
  const rawUrl = offer.standardWebURL || "";
  const url = cleanProviderUrl(rawUrl) || "";
  if (!url) return -1;

  const isChannelOffer = j.includes("channel") || j.includes("amazonchannel");
  const tmdbIsChannel = t.includes("channel");

  // Reject channel offers when searching for a standalone provider like Crunchyroll
  if (isChannelOffer && !tmdbIsChannel) {
    if (t.includes("crunchyroll")) return -1;
  }

  let nameScore = 0;
  if (t === j) {
    nameScore = 100;
  } else if (!isChannelOffer && (j.includes(t) || t.includes(j))) {
    nameScore = 80;
  } else if (
    isChannelOffer &&
    tmdbIsChannel &&
    (j.includes(t) || t.includes(j))
  ) {
    nameScore = 80;
  } else {
    for (const group of ALIAS_GROUPS) {
      if (
        group.some((a) => t.includes(a)) &&
        group.some((a) => j.includes(a))
      ) {
        nameScore = isChannelOffer && !tmdbIsChannel ? 20 : 70;
        break;
      }
    }
  }

  if (nameScore <= 0) return -1;

  // Domain score bonus or penalty
  let domainScore = 0;
  for (const [key, domains] of Object.entries(EXPECTED_DOMAINS)) {
    if (t.includes(key)) {
      if (domains.some((d) => url.includes(d))) {
        domainScore = 50;
      } else {
        // e.g. Crunchyroll pointing to primevideo.com
        domainScore = -100;
      }
      break;
    }
  }

  // Monetization type bonus
  let typeScore = 0;
  const mType = offer.monetizationType;
  if (type === "flatrate" && (mType === "FLATRATE" || mType === "ADS")) {
    typeScore = 20;
  } else if (type === "rent" && mType === "RENT") {
    typeScore = 20;
  } else if (type === "buy" && mType === "BUY") {
    typeScore = 20;
  }

  return nameScore + domainScore + typeScore;
}

// In-memory cache for resolved offers: key = `${tmdbId}-${mediaType}-${country}`
const offersCache = new Map<
  string,
  { expires: number; offers: JustWatchOffer[] }
>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Queries JustWatch GraphQL to fetch offers for a title in a single country.
 */
export async function fetchJustWatchOffers(
  tmdbId: number,
  mediaType: MediaType,
  titles: string | string[],
  country: string = "IN"
): Promise<JustWatchOffer[]> {
  const titleList = Array.isArray(titles) ? titles : [titles];
  const primaryTitle = titleList[0] || "";
  if (!primaryTitle) return [];

  const cacheKey = `${tmdbId}-${mediaType}-${country.toUpperCase()}`;
  const cached = offersCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.offers;
  }

  const jwType = mediaType === "tv" ? "SHOW" : "MOVIE";

  const query = `
    query GetTitleOffers($country: Country!, $language: Language!, $searchQuery: String!) {
      popularTitles(country: $country, filter: { searchQuery: $searchQuery }, first: 15) {
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

  for (const title of titleList) {
    if (!title) continue;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        JUSTWATCH_TIMEOUT_MS
      );

      const res = await fetch(JUSTWATCH_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          variables: {
            country: country.toUpperCase(),
            language: "en",
            searchQuery: title,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = (await res.json()) as {
        data?: { popularTitles?: { edges?: { node: JustWatchTitleNode }[] } };
      };
      const edges = data?.data?.popularTitles?.edges || [];

      const match =
        edges.find(
          (e) =>
            e.node.content?.externalIds?.tmdbId === String(tmdbId) &&
            e.node.objectType === jwType
        ) ||
        edges.find(
          (e) => e.node.content?.externalIds?.tmdbId === String(tmdbId)
        ) ||
        (edges.length > 0 && titleList.indexOf(title) === 0
          ? edges[0]
          : undefined);

      if (match?.node?.offers?.length) {
        const offers = match.node.offers.filter(
          (o): o is JustWatchOffer & { standardWebURL: string } =>
            typeof o.standardWebURL === "string" && Boolean(o.standardWebURL)
        );

        offersCache.set(cacheKey, {
          expires: Date.now() + CACHE_TTL_MS,
          offers,
        });

        return offers;
      }
    } catch (err) {
      log.warn(
        { err: String(err), tmdbId, title, country },
        "[JustWatch] Query failed for title candidate"
      );
    }
  }

  return [];
}

/**
 * Fetches combined offers across priority regions (IN + US) in parallel.
 * Prioritizes IN offers while including US offers so region-exclusive
 * providers (like Crunchyroll, Hulu, Max) are never lost.
 */
export async function fetchCombinedJustWatchOffers(
  tmdbId: number,
  mediaType: MediaType,
  titles: string | string[]
): Promise<JustWatchOffer[]> {
  const [inOffers, usOffers] = await Promise.all([
    fetchJustWatchOffers(tmdbId, mediaType, titles, "IN"),
    fetchJustWatchOffers(tmdbId, mediaType, titles, "US"),
  ]);

  return [...inOffers, ...usOffers];
}

/**
 * Direct platform fallback search URLs when JustWatch has no direct offer.
 * Guarantees the user lands on the actual provider service rather than TMDB.
 */
function getPlatformFallbackUrl(
  tmdbProviderName: string,
  title?: string
): string | undefined {
  if (!title) return undefined;
  const t = norm(tmdbProviderName);
  const enc = encodeURIComponent(title.trim());

  if (t.includes("crunchyroll")) {
    return `https://www.crunchyroll.com/search?q=${enc}`;
  }
  if (t.includes("netflix")) {
    return `https://www.netflix.com/search?q=${enc}`;
  }
  if (
    t.includes("primevideo") ||
    t.includes("amazonvideo") ||
    t.includes("amazonprime")
  ) {
    return `https://www.primevideo.com/search?phrase=${enc}`;
  }
  if (t.includes("hotstar") || t.includes("disneyplus")) {
    return `https://www.hotstar.com/in/search?q=${enc}`;
  }
  if (t.includes("appletv") || t.includes("appleitunes")) {
    return `https://tv.apple.com/search?term=${enc}`;
  }
  if (t.includes("sonyliv")) {
    return `https://www.sonyliv.com/search?query=${enc}`;
  }
  if (t.includes("zee5")) {
    return `https://www.zee5.com/search?q=${enc}`;
  }
  if (t.includes("jiocinema")) {
    return `https://www.jiocinema.com/search/${enc}`;
  }
  if (t.includes("youtube")) {
    return `https://www.youtube.com/results?search_query=${enc}+movie`;
  }
  if (t.includes("googleplay")) {
    return `https://play.google.com/store/search?q=${enc}&c=movies`;
  }
  if (t.includes("fandango") || t.includes("vudu")) {
    return `https://athome.fandango.com/content/browse/search?query=${enc}`;
  }
  return undefined;
}

/**
 * Resolves the best direct title link for a TMDB provider.
 * Prefers exact title pages on the platform, then platform search,
 * falling back to TMDB country link only as a last resort.
 */
export function resolveDirectProviderLink(
  tmdbProviderName: string,
  type: "flatrate" | "rent" | "buy" | undefined,
  offers: JustWatchOffer[],
  fallbackTitle?: string,
  tmdbFallbackLink?: string
): string | undefined {
  let bestOffer: JustWatchOffer | null = null;
  let bestScore = -1;

  for (const offer of offers) {
    const score = scoreOffer(tmdbProviderName, type, offer);
    if (score > bestScore) {
      bestScore = score;
      bestOffer = offer;
    }
  }

  if (bestOffer && bestScore > 0) {
    return cleanProviderUrl(bestOffer.standardWebURL);
  }

  // If no direct JustWatch title page was matched, provide the provider platform search
  const platformFallback = getPlatformFallbackUrl(
    tmdbProviderName,
    fallbackTitle
  );
  if (platformFallback) return platformFallback;

  return tmdbFallbackLink;
}
