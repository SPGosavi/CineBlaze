import fetch, { Response } from "node-fetch";
import {
  GROQ_API_KEY,
  GROQ_API_URL,
  GROQ_MODEL,
  GROQ_FALLBACK_MODEL,
  GROQ_MAX_RETRIES,
  TMDB_API_KEY,
} from "../config.js";
import { getLanguageCode, getGenreIds } from "../utils/languageMap.js";
import type {
  ChatMessage,
  GroqChatOptions,
  StructuredParams,
  AiSuggestion,
  GroqApiResponse,
  GroqApiError,
  MediaType,
  WikiSearchResponse,
  TmdbPaginatedResponse,
} from "../types/index.js";

// ─── Groq Request Helper (retry + backoff + fallback model) ────────────────

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Exponential backoff with jitter: ~500ms, ~1s, ~2s (+/- up to 100ms). */
function backoffDelay(attempt: number): number {
  const base = 500 * 2 ** (attempt - 1);
  const jitter = Math.random() * 100;
  return base + jitter;
}

/** Cheap non-cryptographic hash (djb2) used only to correlate log lines for the same query. */
function hashString(str: string): string {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function logGroqCall(info: Record<string, unknown>): void {
  console.log(`[Groq]`, JSON.stringify(info));
}

/**
 * Single entry point for every Groq chat-completion call in this file.
 *
 * Behavior:
 * - Retries up to `GROQ_MAX_RETRIES` times per model with exponential backoff + jitter.
 * - On HTTP 429, honors the `Retry-After` header if present instead of the default backoff.
 * - On HTTP 5xx (or if all retries on the primary model are exhausted), falls back to
 *   `GROQ_FALLBACK_MODEL` and retries there before giving up.
 * - Logs one structured line per attempt: { label, model, attempt, latencyMs, status, tokens, queryHash }.
 *
 * @param messages
 * @param opts
 * @returns raw text content of the model's reply
 * @throws if every model/attempt combination fails
 */
async function groqChat(
  messages: ChatMessage[],
  opts: GroqChatOptions = {}
): Promise<string> {
  const {
    temperature = 0.1,
    maxTokens = 800,
    responseFormat = null,
    label = "groqChat",
  } = opts;

  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const queryHash = hashString(lastUserMessage);

  const models: string[] = [GROQ_MODEL, GROQ_FALLBACK_MODEL].filter(
    Boolean
  ) as string[];
  let lastError: Error | undefined;

  for (const model of models) {
    for (let attempt = 1; attempt <= GROQ_MAX_RETRIES; attempt++) {
      const start = Date.now();
      try {
        const body: any = {
          model,
          messages,
          temperature,
          max_tokens: maxTokens,
          stream: false,
        };
        if (responseFormat) body.response_format = responseFormat;

        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify(body),
        });

        const latencyMs = Date.now() - start;

        if (response.status === 429) {
          const retryAfterHeader = Number(response.headers.get("retry-after"));
          const waitMs =
            Number.isFinite(retryAfterHeader) && retryAfterHeader > 0
              ? retryAfterHeader * 1000
              : backoffDelay(attempt);
          logGroqCall({
            label,
            model,
            attempt,
            latencyMs,
            status: 429,
            queryHash,
          });
          lastError = new Error("Groq API rate limit (429) exceeded");
          if (attempt < GROQ_MAX_RETRIES) {
            await sleep(waitMs);
            continue;
          }
          break; // exhausted retries on this model, try fallback
        }

        if (!response.ok) {
          const errorBody = (await response
            .json()
            .catch(() => ({}))) as GroqApiError;
          const message =
            errorBody.error?.message || `Groq API error: ${response.status}`;
          logGroqCall({
            label,
            model,
            attempt,
            latencyMs,
            status: response.status,
            error: message,
            queryHash,
          });
          lastError = new Error(message);

          // Retry on 5xx (transient); don't retry on 4xx other than 429 (bad request won't fix itself)
          if (response.status >= 500 && attempt < GROQ_MAX_RETRIES) {
            await sleep(backoffDelay(attempt));
            continue;
          }
          break; // move to fallback model
        }

        const data = (await response.json()) as GroqApiResponse;
        const usage = data.usage || {};
        logGroqCall({
          label,
          model,
          attempt,
          latencyMs,
          status: 200,
          queryHash,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
        });

        const content = data.choices?.[0]?.message?.content;
        if (!content) {
          lastError = new Error("Groq API returned an empty response");
          break;
        }
        return content;
      } catch (e: any) {
        const latencyMs = Date.now() - start;
        logGroqCall({
          label,
          model,
          attempt,
          latencyMs,
          error: e.message,
          queryHash,
        });
        lastError = e;
        if (attempt < GROQ_MAX_RETRIES) {
          await sleep(backoffDelay(attempt));
          continue;
        }
      }
    }
  }

  throw lastError || new Error("Groq request failed for an unknown reason");
}

// ─── Structured Parameter Extraction ────────────────────────────────────────

/**
 * Decomposes a user's natural-language description into structured fields
 * so downstream search can apply hard constraints (language, actor, genre, etc.)
 */
export async function extractStructuredParams(
  query: string
): Promise<StructuredParams> {
  const prompt = `You are a movie/TV query parser. Extract structured parameters from the user's description.

Rules:
1. "language" — detect any language or regional film industry mentioned (e.g. "marathi", "hindi", "bollywood", "korean"). Use null if not mentioned.
2. "genres" — array of genre keywords (e.g. ["comedy", "action", "spy", "romance"]). Use [] if none.
3. "actors" — array of actor names mentioned. Use [] if none.
4. "directors" — array of director names mentioned. Use [] if none.
5. "plot_keywords" — concise plot description stripped of actor/language/genre info. Use null if the query is just an actor/genre listing.
6. "media_types" — ["movie"] if user says movie/film, ["tv"] if user says show/series/season, ["movie", "tv"] if unspecified.
7. "era" — decade or year range if mentioned (e.g. "90s", "2020s"). Use null if not mentioned.
8. "is_generic" — true if the query is just an actor name, genre, or simple browsing query with NO specific plot. false otherwise.

Output a valid JSON object ONLY. No markdown, no commentary.

Query: "${query}"`;

  try {
    const content = await groqChat([{ role: "user", content: prompt }], {
      temperature: 0.05,
      maxTokens: 300,
      responseFormat: { type: "json_object" },
      label: "extractStructuredParams",
    });

    const parsed = JSON.parse(
      content.replace(/```json|```/g, "").trim()
    ) as Record<string, unknown>;
    console.log(`[AI] Structured Params:`, JSON.stringify(parsed));
    return {
      language: (parsed.language as string) || null,
      genres: Array.isArray(parsed.genres) ? parsed.genres : [],
      actors: Array.isArray(parsed.actors) ? parsed.actors : [],
      directors: Array.isArray(parsed.directors) ? parsed.directors : [],
      plot_keywords: (parsed.plot_keywords as string) || null,
      media_types: Array.isArray(parsed.media_types)
        ? (parsed.media_types as MediaType[])
        : (["movie", "tv"] as MediaType[]),
      era: (parsed.era as string) || null,
      is_generic: !!parsed.is_generic,
    };
  } catch (e: any) {
    console.warn("[AI] Structured param extraction failed:", e.message);
    return getDefaultParams();
  }
}

function getDefaultParams(): StructuredParams {
  return {
    language: null,
    genres: [],
    actors: [],
    directors: [],
    plot_keywords: null,
    media_types: ["movie", "tv"],
    era: null,
    is_generic: false,
  };
}

// ─── Main AI Search (Single-Pass) ───────────────────────────────────────────

export async function callGroqWithFallback(
  userQuery: string,
  structuredParams: StructuredParams | null
): Promise<AiSuggestion[]> {
  console.log(
    `[AI] Processing Single-Pass Search: "${userQuery.substring(0, 50)}..."`
  );
  try {
    const results = await makeGroqRequest(userQuery, structuredParams);
    return results || [];
  } catch (e: any) {
    console.error("[AI] Single-Pass Request failed:", e.message);
    throw e;
  }
}

// ─── Keyword Extraction (Fallback) ──────────────────────────────────────────

export async function extractKeywords(query: string): Promise<string> {
  const extractPrompt = `You are a search engine optimization expert.
    Task: Convert a user's movie description into 3-4 specific search terms for TMDB/Wikipedia.
    Focus on: Plot hooks, actors, and genre. Correct misspellings.
    Example: "recent hindi movie about a man controlling a girl" -> "hindi movie man controlling girl mind psychological"
    Output ONLY the search terms separated by space.
    Query: "${query}"`;

  try {
    const content = await groqChat([{ role: "user", content: extractPrompt }], {
      temperature: 0.1,
      maxTokens: 60,
      label: "extractKeywords",
    });
    return content.trim() || query;
  } catch (e: any) {
    console.warn(
      "[AI] Keyword extraction failed, falling back to raw query:",
      e.message
    );
    return query;
  }
}

// ─── DuckDuckGo Lite Search ─────────────────────────────────────────────────

async function fetchDDGLite(query: string): Promise<string> {
  try {
    const res = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)",
      },
      body: "q=" + encodeURIComponent(query),
    });
    const html = await res.text();

    const results: string[] = [];
    const titleRegex = /class='result-link'>([^<]+)<\/a>/g;
    const snippetRegex = /class='result-snippet'>([\s\S]*?)<\/td>/g;

    let titleMatch;
    let snippetMatch;

    while ((titleMatch = titleRegex.exec(html)) !== null) {
      snippetMatch = snippetRegex.exec(html);
      if (snippetMatch) {
        results.push(
          `[Web] ${titleMatch[1].trim()}: ${snippetMatch[1].replace(/<[^>]*>?/gm, "").trim()}`
        );
      }
    }
    return results.slice(0, 3).join("\n");
  } catch (e: any) {
    console.warn("[Search] DDG Lite fetch failed:", e.message);
    return "";
  }
}

// ─── TMDB Actor Filmography Fetch ───────────────────────────────────────────

async function fetchActorFilmography(
  actorName: string,
  languageCode: string | null,
  mediaTypes: MediaType[]
): Promise<string> {
  try {
    // Step 1: Find the actor on TMDB
    const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(actorName)}&language=en-US&page=1`;
    const searchRes = await fetch(searchUrl);
    const searchData = (await searchRes.json()) as any;

    const person = searchData.results?.[0];
    if (!person) return "";

    const personId = person.id;
    console.log(`[Context] Found actor "${actorName}" (ID: ${personId})`);

    // Step 2: Get combined credits
    const creditsUrl = `https://api.themoviedb.org/3/person/${personId}/combined_credits?api_key=${TMDB_API_KEY}&language=en-US`;
    const creditsRes = await fetch(creditsUrl);
    const creditsData = (await creditsRes.json()) as any;

    let castCredits = creditsData.cast || [];

    // Filter by language if specified
    if (languageCode) {
      const langFiltered = castCredits.filter(
        (c: any) => c.original_language === languageCode
      );
      // If language filter yields results, use them; otherwise keep all (AI will filter)
      if (langFiltered.length > 0) castCredits = langFiltered;
    }

    // Filter by media type
    if (
      mediaTypes &&
      !mediaTypes.includes("movie") &&
      !mediaTypes.includes("tv")
    ) {
      // no valid filter, keep all
    } else if (mediaTypes && mediaTypes.length === 1) {
      castCredits = castCredits.filter(
        (c: any) => c.media_type === mediaTypes[0]
      );
    }

    // Sort by popularity and take top entries
    castCredits.sort(
      (a: any, b: any) => (b.popularity || 0) - (a.popularity || 0)
    );
    const top = castCredits.slice(0, 15);

    return top
      .map((c: any) => {
        const title = c.title || c.name;
        const year = (c.release_date || c.first_air_date || "").substring(0, 4);
        const overview = (c.overview || "").substring(0, 120);
        return `[Actor Filmography] ${title} (${year}) [${c.media_type}]: ${overview}`;
      })
      .join("\n");
  } catch (e: any) {
    console.warn(
      `[Context] Actor filmography fetch failed for "${actorName}":`,
      e.message
    );
    return "";
  }
}

// ─── TMDB Language-Filtered Discover ────────────────────────────────────────

async function fetchLanguageFilteredDiscover(
  languageCode: string,
  genreIds: number[],
  mediaType: MediaType = "movie"
): Promise<string> {
  try {
    const genreParam =
      genreIds.length > 0 ? `&with_genres=${genreIds.join(",")}` : "";
    const url = `https://api.themoviedb.org/3/discover/${mediaType}?api_key=${TMDB_API_KEY}&with_original_language=${languageCode}${genreParam}&sort_by=popularity.desc&page=1`;

    console.log(
      `[Context] Language-filtered discover: lang=${languageCode}, genres=${genreIds.join(",")}, type=${mediaType}`
    );
    const res = await fetch(url);
    const data = (await res.json()) as any;

    return (data.results || [])
      .slice(0, 5)
      .map((r: any) => {
        const title = r.title || r.name;
        const year = (r.release_date || r.first_air_date || "").substring(0, 4);
        return `[TMDB Discover] ${title} (${year}): ${(r.overview || "").substring(0, 120)}`;
      })
      .join("\n");
  } catch (e: any) {
    console.warn("[Context] Language-filtered discover failed:", e.message);
    return "";
  }
}

// ─── Enhanced Context Gathering ─────────────────────────────────────────────

/**
 * Assembles grounding context for the main identification prompt (`makeGroqRequest`).
 * Fires several lookups in parallel and concatenates their text into one block that
 * gets injected into the system prompt as "REAL-WORLD DATABASE HINTS".
 */
async function getStableContext(
  userQuery: string,
  structuredParams: StructuredParams | null = null
): Promise<string> {
  try {
    const params = structuredParams || getDefaultParams();
    const languageCode = getLanguageCode(params.language || "");
    const genreIds = getGenreIds(params.genres);

    // Build a smarter keyword string from structured params
    const keywordParts: string[] = [];
    if (params.language) keywordParts.push(params.language);
    if (params.actors.length > 0) keywordParts.push(params.actors[0]);
    if (params.plot_keywords) keywordParts.push(params.plot_keywords);
    if (params.genres.length > 0) keywordParts.push(params.genres[0]);
    const keywords =
      keywordParts.length > 0 ? keywordParts.join(" ") : userQuery;

    // Build parallel context fetches
    const contextPromises: Promise<Response | string>[] = [
      // Wiki search with structured keywords
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(keywords)}&format=json&origin=*&srlimit=3`
      ),
      // TMDB multi-search with keywords
      fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(keywords)}&language=en-US&page=1`
      ),
      // Web search with full user query for better plot matching
      fetchDDGLite(userQuery),
      // Second wiki search with raw user query for broader coverage
      fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(userQuery)}&format=json&origin=*&srlimit=3`
      ),
    ];

    // Add actor filmography if actors are specified
    if (params.actors.length > 0) {
      contextPromises.push(
        fetchActorFilmography(
          params.actors[0],
          languageCode || null,
          params.media_types
        )
      );
    }

    // Add language-filtered discover if language is specified
    if (languageCode) {
      for (const mt of params.media_types) {
        contextPromises.push(
          fetchLanguageFilteredDiscover(languageCode, genreIds, mt)
        );
      }
    }

    // Add plot-specific TMDB search with language filtering
    if (params.plot_keywords && languageCode) {
      const plotSearchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(params.plot_keywords)}&language=en-US&page=1`;
      contextPromises.push(fetch(plotSearchUrl));
    }

    const contextResults = await Promise.all(contextPromises);

    // Parse standard results
    const wikiData = (await (
      contextResults[0] as Response
    ).json()) as WikiSearchResponse;
    const tmdbData = (await (
      contextResults[1] as Response
    ).json()) as TmdbPaginatedResponse;
    const webRes = contextResults[2] as string;
    const wiki2Data = (await (
      contextResults[3] as Response
    ).json()) as WikiSearchResponse;

    const wikiContext = (wikiData.query?.search || [])
      .map(
        (s: any) => `[Wiki] ${s.title}: ${s.snippet.replace(/<[^>]*>?/gm, "")}`
      )
      .join("\n");

    // Second wiki search results (from raw user query)
    const wiki2Context = (wiki2Data.query?.search || [])
      .map(
        (s: any) => `[Wiki] ${s.title}: ${s.snippet.replace(/<[^>]*>?/gm, "")}`
      )
      .join("\n");

    const tmdbContext = (tmdbData.results || [])
      .filter((r: any) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 5)
      .map(
        (r: any) =>
          `[TMDB Candidate] ${r.title || r.name} (${(r.release_date || r.first_air_date || "N/A").substring(0, 4)}) [${r.media_type}]: ${r.overview}`
      )
      .join("\n");

    // Gather additional context (actor filmography + discover + plot search results)
    let additionalContext = "";
    for (let i = 4; i < contextResults.length; i++) {
      const result = contextResults[i];
      if (typeof result === "string") {
        additionalContext += result + "\n";
      } else if (result && typeof (result as Response).json === "function") {
        // This is a fetch Response (e.g. plot-specific TMDB search)
        try {
          const plotData = (await (result as Response).json()) as any;
          if (plotData.results) {
            const plotContext = plotData.results
              .slice(0, 5)
              .map(
                (r: any) =>
                  `[TMDB Plot Match] ${r.title || r.name} (${(r.release_date || r.first_air_date || "N/A").substring(0, 4)}): ${r.overview}`
              )
              .join("\n");
            additionalContext += plotContext + "\n";
          }
        } catch (e) {
          /* ignore parse errors */
        }
      }
    }

    return `--- REAL-WORLD DATABASE & WEB HINTS ---\n${webRes}\n${wikiContext}\n${wiki2Context}\n${tmdbContext}\n${additionalContext}`;
  } catch (e: any) {
    console.error("[Search] Context fetch failed:", e.message);
    return "No external context available.";
  }
}

// ─── Find Similar (AI-Powered) ──────────────────────────────────────────────

export async function callGroqSimilar(
  title: string,
  mediaType: MediaType,
  year: string | undefined,
  enrichedData: {
    genres?: string[];
    overview?: string;
    cast?: string[];
    director?: string;
  } = {}
): Promise<AiSuggestion[]> {
  const {
    genres = [],
    overview = "",
    cast = [],
    director = "Unknown",
  } = enrichedData;

  const systemPrompt = `You are a precise media recommendation expert.
    Task: Find 5 titles similar to "${title}" (${year}).
    
    Source media details:
    - Genres: ${genres.join(", ") || "Unknown"}
    - Plot: ${overview || "Not available"}
    - Cast: ${cast.join(", ") || "Unknown"}
    - Director: ${director}
    - Type: ${mediaType}

    Rules:
    1. Match Media Type (${mediaType}).
    2. Prioritize similarity in these dimensions (in order):
       a. Thematic/plot similarity — stories with similar narrative arcs or themes
       b. Genre overlap — same genre combination
       c. Cast/director overlap — other works by the same actors or director
       d. Tone and style — similar mood, pacing, cinematographic approach
    3. Return REAL titles only. Do not invent movies.
    4. Prefer titles from the same language/region as the source.
    5. JSON Array ONLY. No markdown, no commentary.
    Format: [{"title": "Title", "year": "YYYY", "media_type": "${mediaType}"}]`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Find similar to ${title}` },
  ];

  try {
    const content = await groqChat(messages, {
      temperature: 0.3,
      maxTokens: 1200,
      label: "callGroqSimilar",
    });
    return parseJsonSafe(content);
  } catch (e: any) {
    console.error("[AI Similar] Error:", e.message);
    throw e;
  }
}

// ─── Core AI Identification Request ─────────────────────────────────────────

async function makeGroqRequest(
  userQuery: string,
  structuredParams: StructuredParams | null = null
): Promise<AiSuggestion[]> {
  const params = structuredParams || getDefaultParams();
  const externalContext = await getStableContext(userQuery, params);

  // Build structured constraints block
  const constraints = [];
  if (params.language)
    constraints.push(
      `- Language: ${params.language} (MUST be a ${params.language}-language production)`
    );
  if (params.actors.length > 0)
    constraints.push(`- Must star: ${params.actors.join(", ")}`);
  if (params.directors.length > 0)
    constraints.push(`- Directed by: ${params.directors.join(", ")}`);
  if (params.genres.length > 0)
    constraints.push(`- Genre: ${params.genres.join(", ")}`);
  if (params.plot_keywords)
    constraints.push(`- Plot elements: ${params.plot_keywords}`);
  if (params.era) constraints.push(`- Era/Period: ${params.era}`);
  constraints.push(
    `- Media types to consider: ${params.media_types.join(", ")}`
  );

  const constraintBlock =
    constraints.length > 0
      ? `\n    HARD CONSTRAINTS FROM USER QUERY (you MUST NOT violate these):\n    ${constraints.join("\n    ")}\n`
      : "";

  // Determine result count guidance
  const resultGuidance = params.plot_keywords
    ? "Return 1-3 titles that best match the specific plot described. If the plot description is specific enough to identify a single movie, return that one. If multiple movies match the described plot, return all of them (up to 3)."
    : "Return 1-3 most relevant titles.";

  const systemPrompt = `You are a world-class cinema historian and movie identification expert, with deep knowledge of regional and international cinema.
    Goal: Identify 1-3 REAL movies or TV shows that match the user's description.

    CRITICAL RULES:
    1. **NO HALLUCINATIONS**: Do not invent titles. Do not return movies with release years in the future (e.g., 2025, 2026) unless they are major confirmed productions.
    2. **HINT PRIORITY**: The "REAL-WORLD DATABASE HINTS" section contains actual entries from TMDB, Wikipedia, and actor filmographies. You MUST prioritize titles that appear in these hints and match the user's description.
    3. **VERIFY AGAINST HINTS**: If your internal "best guess" is not found in the hints, double-check if it actually exists. Favor titles that appear in the hints.
    4. **LANGUAGE LOCK**: If a language is specified in the constraints, you MUST ONLY return titles in that language. A Hindi movie is NOT a substitute for a Marathi movie, and vice versa. A Telugu movie is NOT a substitute for a Tamil movie. Different Indian languages are COMPLETELY DIFFERENT film industries with separate actors, directors, and stories.
    5. **ACTOR LOCK**: If actors are specified, every returned title MUST feature that actor in a significant role. Cross-reference with the actor filmography hints provided.
    6. **MEDIA TYPE**: Return both movies and TV shows unless the user specifically asks for one type. Use the "media_type" field correctly ("movie" or "tv").
    7. **PLOT PRECISION**: Match the SPECIFIC plot elements described. Do not return movies that share only the genre or general theme. For example, if the user says "recalling childhood love", the movie must specifically be about a character reminiscing about a past childhood love — not just any love story.
    8. **REGIONAL CINEMA EXPERTISE**: For regional cinema (Marathi, Tamil, Telugu, etc.), consider less mainstream titles that match the plot precisely, not just the most popular titles in that language.
    ${constraintBlock}
    ${resultGuidance}

    REAL-WORLD DATABASE HINTS:
    ${externalContext}

    Output Requirement: Provide a valid JSON object with a "results" key containing the array of matches. Do not include markdown wraps or extra commentary.
    Format: {"results": [{"title": "Exact Title", "year": "YYYY", "media_type": "movie or tv"}]}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    {
      role: "user",
      content: `Identify the media matching this description: "${userQuery}"`,
    },
  ];

  const content = await groqChat(messages, {
    temperature: 0.1,
    maxTokens: 800,
    responseFormat: { type: "json_object" },
    label: "makeGroqRequest",
  });

  console.log(`[AI] Raw Response: ${content?.substring(0, 200)}...`);
  return parseJsonSafe(content);
}

// ─── JSON Parser ────────────────────────────────────────────────────────────

/**
 * Extracts an array of result objects out of an LLM's raw text reply.
 */
function parseJsonSafe(text: string | null | undefined): AiSuggestion[] {
  if (!text) {
    console.warn("[AI] parseJsonSafe called with empty content");
    return [];
  }
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    const jsonParsed = JSON.parse(cleaned) as any;
    if (Array.isArray(jsonParsed))
      return jsonParsed.slice(0, 5) as AiSuggestion[];
    if (jsonParsed.movies && Array.isArray(jsonParsed.movies))
      return jsonParsed.movies.slice(0, 5) as AiSuggestion[];
    if (jsonParsed.results && Array.isArray(jsonParsed.results))
      return jsonParsed.results.slice(0, 5) as AiSuggestion[];
    if (typeof jsonParsed === "object") {
      const keys = Object.keys(jsonParsed);
      if (keys.length === 1 && Array.isArray(jsonParsed[keys[0]]))
        return jsonParsed[keys[0]].slice(0, 5) as AiSuggestion[];
    }
    // Valid JSON, but not a shape we recognize — treat as "no matches", not an error.
    console.warn(
      "[AI] parseJsonSafe: valid JSON but unrecognized shape:",
      cleaned.substring(0, 200)
    );
    return [];
  } catch (e: any) {
    console.warn(
      "[AI] parseJsonSafe: malformed JSON from model:",
      cleaned.substring(0, 200)
    );
    return [];
  }
}
