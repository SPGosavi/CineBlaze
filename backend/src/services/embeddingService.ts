import type {
  BasicTmdbResult,
  EnrichedMedia,
  MediaType,
} from "../types/index.js";
import { isDatabaseEnabled } from "../db/index.js";
import {
  findNearestMediaEmbeddings,
  upsertMediaEmbedding,
} from "../db/repositories.js";
import { mapSettledLimit } from "../utils/concurrency.js";
import { childLogger } from "../utils/logger.js";
import { groqEmbed } from "./llm/groq.js";

const log = childLogger("embeddings");

function buildEmbeddingText(item: BasicTmdbResult | EnrichedMedia): string {
  const parts: string[] = [
    item.title,
    item.overview || "",
    ...(item.genres || []),
    item.release_date || "",
  ];
  return parts.filter(Boolean).join("\n");
}

function toBasicResult(
  row: Awaited<ReturnType<typeof findNearestMediaEmbeddings>>[number]
): BasicTmdbResult {
  return {
    id: row.tmdbId,
    title: row.title,
    media_type: row.mediaType,
    overview: row.overview || "",
    release_date: row.releaseDate || "",
    poster_path: row.posterPath || null,
    vote_average: row.voteAverage ? Number(row.voteAverage) : 0,
    original_language: row.originalLanguage || "",
    genres: row.genres || [],
  };
}

export async function indexMediaEmbeddings(
  items: (BasicTmdbResult | EnrichedMedia)[],
  source = "search"
): Promise<void> {
  if (!isDatabaseEnabled()) return;
  if (!items.length) return;

  const unique = Array.from(
    new Map(
      items.map((item) => [`${item.media_type}:${item.id}`, item])
    ).values()
  ).slice(0, 12);

  const settled = await mapSettledLimit(unique, async (item) => {
    const embedding = await groqEmbed(buildEmbeddingText(item), {
      label: "indexMediaEmbeddings",
    });

    await upsertMediaEmbedding({
      tmdbId: item.id,
      mediaType: item.media_type,
      title: item.title,
      overview: item.overview || null,
      releaseDate: item.release_date || null,
      posterPath: item.poster_path || null,
      voteAverage:
        typeof item.vote_average === "number"
          ? item.vote_average.toFixed(2)
          : null,
      originalLanguage: item.original_language || null,
      genres: item.genres || [],
      embedding,
      source,
      updatedAt: new Date(),
    });
  });

  const failures = settled.filter((result) => result.status === "rejected");
  if (failures.length > 0) {
    log.debug(
      { failed: failures.length, attempted: unique.length },
      "Some media embeddings failed to index"
    );
  }
}

export async function semanticSearchByQuery(
  query: string,
  options: {
    mediaType?: MediaType;
    limit?: number;
    minSimilarity?: number;
  } = {}
): Promise<BasicTmdbResult[]> {
  if (!isDatabaseEnabled()) return [];
  if (!query.trim()) return [];

  try {
    const embedding = await groqEmbed(query, {
      label: "semanticSearchByQuery",
    });
    const rows = await findNearestMediaEmbeddings(embedding, options);
    return rows.map(toBasicResult);
  } catch (error) {
    log.warn({ err: String(error) }, "Semantic search fallback failed");
    return [];
  }
}
