/**
 * ISO 639-1 -> display name.
 *
 * Declared explicitly rather than inverted from the backend's LANGUAGE_MAP,
 * which is many-to-one: inverting it would surface industry nicknames
 * ("Bollywood", "Hollywood") where a language name is wanted.
 *
 * The API returns the raw ISO code; the display name is a presentation
 * concern and would bake an English label into stored Firestore documents.
 */
const LANGUAGE_DISPLAY_MAP: Record<string, string> = {
  hi: "Hindi",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  kn: "Kannada",
  ml: "Malayalam",
  bn: "Bengali",
  pa: "Punjabi",
  gu: "Gujarati",
  or: "Odia",
  as: "Assamese",
  ur: "Urdu",
  ko: "Korean",
  ja: "Japanese",
  fr: "French",
  es: "Spanish",
  de: "German",
  it: "Italian",
  zh: "Chinese",
  cn: "Cantonese",
  pt: "Portuguese",
  ru: "Russian",
  tr: "Turkish",
  th: "Thai",
  ar: "Arabic",
  fa: "Persian",
  sv: "Swedish",
  da: "Danish",
  no: "Norwegian",
  nl: "Dutch",
  pl: "Polish",
  id: "Indonesian",
  ms: "Malay",
  vi: "Vietnamese",
  en: "English",
};

/** Falls back to the upper-cased code so an unmapped language still reads. */
export function getLanguageName(code: string | null | undefined): string {
  if (!code) return "";
  return LANGUAGE_DISPLAY_MAP[code.toLowerCase()] ?? code.toUpperCase();
}

export { LANGUAGE_DISPLAY_MAP };
