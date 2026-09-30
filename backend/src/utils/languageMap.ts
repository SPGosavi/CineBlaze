// Maps natural language names and industry nicknames to ISO 639-1 codes
// Used by TMDB's `with_original_language` discover filter

const LANGUAGE_MAP: Record<string, string> = {
  // Indian languages
  hindi: "hi",
  marathi: "mr",
  tamil: "ta",
  telugu: "te",
  kannada: "kn",
  malayalam: "ml",
  bengali: "bn",
  bangla: "bn",
  punjabi: "pa",
  gujarati: "gu",
  odia: "or",
  assamese: "as",
  urdu: "ur",

  // Indian film industry nicknames
  bollywood: "hi",
  tollywood: "te",
  kollywood: "ta",
  mollywood: "ml",
  sandalwood: "kn",

  // World cinema
  korean: "ko",
  japanese: "ja",
  french: "fr",
  spanish: "es",
  german: "de",
  italian: "it",
  chinese: "zh",
  mandarin: "zh",
  cantonese: "cn",
  portuguese: "pt",
  russian: "ru",
  turkish: "tr",
  thai: "th",
  arabic: "ar",
  persian: "fa",
  swedish: "sv",
  danish: "da",
  norwegian: "no",
  dutch: "nl",
  polish: "pl",
  indonesian: "id",
  malay: "ms",
  vietnamese: "vi",
  english: "en",
  hollywood: "en",
};

// TMDB genre name -> ID mapping (for discover endpoint)
const GENRE_ID_MAP: Record<string, number> = {
  action: 28,
  adventure: 12,
  animation: 16,
  comedy: 35,
  crime: 80,
  documentary: 99,
  drama: 18,
  family: 10751,
  fantasy: 14,
  history: 36,
  horror: 27,
  music: 10402,
  mystery: 9648,
  romance: 10749,
  "sci-fi": 878,
  "science fiction": 878,
  thriller: 53,
  war: 10752,
  western: 37,
  spy: 53, // map to thriller (closest)
  suspense: 53, // map to thriller
  biographical: 36, // map to history
  biopic: 36,
  sports: 18, // map to drama (no dedicated genre)
  musical: 10402,
  romantic: 10749,
  superhero: 28, // map to action
};

export function getLanguageCode(
  languageName: string | null | undefined
): string | null {
  if (!languageName) return null;
  return LANGUAGE_MAP[normalizeLanguageName(languageName)] || null;
}

/**
 * Umbrella terms that describe a group of film industries rather than one
 * language.
 *
 * "south indian" is the common case: it spans four separate industries, and a
 * single ISO code cannot express it. Before this existed, such a query
 * resolved to null, which meant no language-filtered discover ran at all and
 * the model was asked to identify a film with almost no grounding.
 */
const LANGUAGE_GROUPS: Record<string, string[]> = {
  "south indian": ["ta", "te", "ml", "kn"],
  "south india": ["ta", "te", "ml", "kn"],
  south: ["ta", "te", "ml", "kn"],
  dravidian: ["ta", "te", "ml", "kn"],

  indian: ["hi", "ta", "te", "ml"],
  india: ["hi", "ta", "te", "ml"],
  desi: ["hi", "ta", "te", "ml"],

  "north indian": ["hi", "pa"],
  "north india": ["hi", "pa"],
};

/** Strips the filler that tends to trail an industry name in a query. */
function normalizeLanguageName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\b(cinema|movies?|films?|film industry|language)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Resolves a language or region name to one or more ISO 639-1 codes.
 *
 * Returns an array because umbrella terms map to several industries. Callers
 * that can only handle one code should use `getLanguageCode`.
 */
export function getLanguageCodes(
  languageName: string | null | undefined
): string[] {
  if (!languageName) return [];
  const normalized = normalizeLanguageName(languageName);

  const group = LANGUAGE_GROUPS[normalized];
  if (group) return group;

  const single = LANGUAGE_MAP[normalized];
  return single ? [single] : [];
}

export function getGenreIds(genreNames: string[] | null | undefined): number[] {
  if (!genreNames || !Array.isArray(genreNames)) return [];
  return genreNames
    .map((g) => GENRE_ID_MAP[g.toLowerCase().trim()])
    .filter((id): id is number => Boolean(id));
}

export { LANGUAGE_MAP, GENRE_ID_MAP, LANGUAGE_GROUPS };
