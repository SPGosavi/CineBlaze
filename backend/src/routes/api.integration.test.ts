import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// Mock external services before app import
vi.mock("../cache/index.js", () => ({
  cacheBackend: vi.fn(() => "memory"),
  ping: vi.fn(async () => true),
  remember: vi.fn(
    async (_key: string, _ttl: number, produce: () => Promise<unknown>) => ({
      value: await produce(),
      hit: false,
      stale: false,
    })
  ),
  get: vi.fn(async () => null),
  set: vi.fn(async () => {}),
  CacheKeys: {
    trending: (shelf: string) => `trending:${shelf}`,
    trendingPrefix: "trending:",
    search: (mode: string, description: string) =>
      `search:${mode}:${description.toLowerCase().trim()}`,
    searchPrefix: "search:",
    directSearch: (query: string) =>
      `directSearch:${query.toLowerCase().trim()}`,
    details: (type: string, id: number) => `details:${type}:${id}`,
    detailsByTitle: (title: string, year?: string, mediaType?: string) =>
      `details:title:${title}:${year ?? ""}:${mediaType ?? ""}`,
    detailsPrefix: "details:",
    ratings: () => `ratings:test`,
  },
}));

vi.mock("../db/index.js", () => ({
  isDatabaseEnabled: vi.fn(() => false),
  pingDatabase: vi.fn(async () => false),
}));

vi.mock("../services/tmdbService.js", () => ({
  fetchTmdb: vi.fn(async () => ({
    results: [
      {
        id: 101,
        title: "Global Trending Title",
        media_type: "movie",
        release_date: "2024-01-01",
        overview: "Trending overview",
        poster_path: "/trending.jpg",
      },
    ],
  })),
  formatBasicTmdbResult: vi.fn((item: Record<string, unknown>) => ({
    id: item.id ?? 101,
    title: item.title ?? "Global Trending Title",
    media_type: item.media_type ?? "movie",
    release_date: item.release_date ?? "2024-01-01",
    overview: item.overview ?? "Trending overview",
    poster_path: item.poster_path ?? "/trending.jpg",
  })),
  fetchEnrichedDataById: vi.fn(async () => ({
    runtime: 120,
    director: "Christopher Nolan",
    genres: ["Sci-Fi", "Drama"],
  })),
  fetchEnrichedData: vi.fn(
    async (title: string, year: string, mediaType: string) => ({
      id: 101,
      title: title || "Inception",
      release_date: year ? `${year}-01-01` : "2010-07-16",
      media_type: mediaType || "movie",
      overview: "A dream within a dream.",
      poster_path: "/inception.jpg",
    })
  ),
  searchTmdbDirect: vi.fn(async () => []),
  fetchFullDetailsById: vi.fn(async (id: number, mediaType: string) => ({
    id,
    media_type: mediaType,
    title: "Inception",
    overview:
      "A thief who steals corporate secrets through dream-sharing technology.",
    release_date: "2010-07-16",
    runtime: 148,
    genres: ["Action", "Sci-Fi", "Adventure"],
    director: "Christopher Nolan",
  })),
  fetchRatings: vi.fn(async () => ({
    imdb: 8.8,
    rt: 87,
  })),
  fetchRecommendPool: vi.fn(async () => []),
  enrichWithDeepData: vi.fn(async (items: unknown[]) => items),
  fetchWatchProviders: vi.fn(async () => ({})),
}));

vi.mock("../services/aiService.js", () => ({
  callGroqWithFallback: vi.fn(async () => [
    { title: "Inception", year: "2010", reason: "Dream sci-fi thriller" },
  ]),
  callGroqSimilar: vi.fn(async () => []),
  extractKeywords: vi.fn(async () => ["dreams", "sci-fi"]),
  extractStructuredParams: vi.fn(async () => ({
    is_generic: false,
    plot_keywords: "dreams",
  })),
  callGroqRecommend: vi.fn(async () => []),
}));

vi.mock("../services/embeddingService.js", () => ({
  semanticSearchByQuery: vi.fn(async () => []),
  indexMediaEmbeddings: vi.fn(async () => {}),
}));

vi.mock("../services/rankingService.js", () => ({
  applyClickFeedbackPriors: vi.fn(async (items: unknown[]) => items),
}));

vi.mock("../db/repositories.js", () => ({
  recordSearch: vi.fn(async () => {}),
  recordSearchSelection: vi.fn(async () => {}),
  recordWatchEvent: vi.fn(async () => {}),
}));

import { app } from "../app.js";
import { INTERNAL_API_KEY } from "../config.js";

function withAuth(req: request.Test): request.Test {
  return INTERNAL_API_KEY ? req.set("x-api-key", INTERNAL_API_KEY) : req;
}

describe("API Integration Tests (6B.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/health", () => {
    it("returns 200 with dependency statuses", async () => {
      const res = await request(app).get("/api/health");

      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.dependencies).toBeDefined();
      expect(res.body.dependencies.cache.status).toBe("ok");
    });
  });

  describe("GET /api/trending/global", () => {
    it("returns shaped response", async () => {
      const res = await withAuth(request(app).get("/api/trending/global"));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("results");
      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBeGreaterThan(0);
      expect(res.body.results[0]).toHaveProperty("id");
      expect(res.body.results[0]).toHaveProperty("title");
    });
  });

  describe("POST /api/find-movies", () => {
    it("rejects without API key when key is configured", async () => {
      if (!INTERNAL_API_KEY) {
        return;
      }

      const res = await request(app)
        .post("/api/find-movies")
        .send({ description: "mind bending space movies" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized");
    });

    it("validates body with Zod and rejects invalid body", async () => {
      const res = await withAuth(
        request(app).post("/api/find-movies").send({ description: "" })
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid request");
      expect(res.body.issues).toBeDefined();
    });

    it("returns results when given valid body", async () => {
      const res = await withAuth(
        request(app).post("/api/find-movies").send({
          description: "space exploration with black holes",
          mode: "ai",
        })
      );

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("movies");
      expect(Array.isArray(res.body.movies)).toBe(true);
      expect(res.body.movies.length).toBeGreaterThan(0);
    });
  });

  describe("GET /api/media/:mediaType/:id", () => {
    it("returns 400 for invalid mediaType or id", async () => {
      const resInvalidType = await withAuth(
        request(app).get("/api/media/book/123")
      );
      expect(resInvalidType.status).toBe(400);

      const resInvalidId = await withAuth(
        request(app).get("/api/media/movie/not-a-number")
      );
      expect(resInvalidId.status).toBe(400);
    });

    it("returns detail for valid mediaType and id", async () => {
      const res = await withAuth(request(app).get("/api/media/movie/550"));

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("id", 550);
      expect(res.body).toHaveProperty("media_type", "movie");
      expect(res.body).toHaveProperty("title", "Inception");
    });
  });
});
