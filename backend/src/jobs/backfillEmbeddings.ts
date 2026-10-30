import { PROVIDERS } from "../config.js";
import { isDatabaseEnabled } from "../db/index.js";
import { getPopularQueries } from "../db/repositories.js";
import { findMovies } from "../controllers/searchController.js";
import {
  loadTrendingAll,
  loadTrendingIndian,
  loadTrendingPlatform,
} from "../controllers/trendingController.js";
import { indexMediaEmbeddings } from "../services/embeddingService.js";
import { childLogger } from "../utils/logger.js";
import type {
  EnrichedMedia,
  FindMoviesRequest,
  MoviesResponse,
} from "../types/index.js";
import type { Request, Response } from "express";
import { fileURLToPath } from "node:url";

const log = childLogger("jobs:embed-backfill");

class MockResponse {
  public statusCode = 200;
  public payload: unknown = null;
  public headers = new Map<string, string>();

  status(code: number): this {
    this.statusCode = code;
    return this;
  }

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  json(payload: unknown): this {
    this.payload = payload;
    return this;
  }

  end(): this {
    return this;
  }
}

function parseArgNumber(flag: string, fallback: number): number {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return Math.floor(value);
}

function uniqueByMedia(items: EnrichedMedia[]): EnrichedMedia[] {
  const seen = new Set<string>();
  const output: EnrichedMedia[] = [];
  for (const item of items) {
    const key = `${item.media_type}:${item.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(item);
  }
  return output;
}

function asMovies(payload: unknown): EnrichedMedia[] {
  if (!payload || typeof payload !== "object") return [];
  const bag = payload as MoviesResponse;
  return Array.isArray(bag.movies) ? bag.movies : [];
}

async function runAiQuery(query: string): Promise<EnrichedMedia[]> {
  const req = {
    body: { description: query, mode: "ai" } satisfies FindMoviesRequest,
    user: null,
  } as unknown as Request;

  const res = new MockResponse() as unknown as Response;
  await findMovies(req, res);

  const response = res as unknown as MockResponse;
  if (response.statusCode >= 400) {
    log.warn(
      { query, statusCode: response.statusCode },
      "Popular query failed"
    );
    return [];
  }

  return asMovies(response.payload);
}

export async function backfillEmbeddings(): Promise<void> {
  if (!isDatabaseEnabled()) {
    log.warn("Database not configured; embedding backfill skipped");
    return;
  }

  const maxItems = parseArgNumber("--max-items", 500);
  const popularLimit = parseArgNumber("--popular-limit", 40);
  const popularOffset = parseArgNumber("--popular-offset", 0);

  const startedAt = Date.now();
  const pool: EnrichedMedia[] = [];

  log.info(
    { maxItems, popularLimit, popularOffset },
    "Embedding backfill started"
  );

  // 1) Trending shelves seed broadly popular titles.
  try {
    pool.push(...(await loadTrendingAll()));
    pool.push(...(await loadTrendingIndian()));
    for (const providerId of Object.values(PROVIDERS)) {
      pool.push(...(await loadTrendingPlatform(providerId)));
    }
  } catch (error) {
    log.warn(
      { err: (error as Error).message },
      "Trending seed phase had failures"
    );
  }

  // 2) Popular historical queries seed intent-rich long tail.
  const popular = await getPopularQueries(popularLimit + popularOffset, 30);
  const selectedQueries = popular.slice(
    popularOffset,
    popularOffset + popularLimit
  );
  for (const { query } of selectedQueries) {
    try {
      const movies = await runAiQuery(query);
      pool.push(...movies);
    } catch (error) {
      log.warn(
        { query, err: (error as Error).message },
        "Popular query run failed"
      );
    }
  }

  const unique = uniqueByMedia(pool).slice(0, maxItems);
  if (unique.length === 0) {
    log.info("No titles collected for embedding backfill");
    return;
  }

  await indexMediaEmbeddings(unique, "backfill");

  log.info(
    {
      collected: pool.length,
      unique: unique.length,
      durationMs: Date.now() - startedAt,
    },
    "Embedding backfill completed"
  );
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  backfillEmbeddings().catch((error) => {
    log.error({ err: (error as Error).message }, "Embedding backfill failed");
    process.exitCode = 1;
  });
}
