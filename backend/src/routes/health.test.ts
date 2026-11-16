import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import healthRouter from "./health.js";

vi.mock("../cache/index.js", () => ({
  cacheBackend: vi.fn(() => "memory"),
  ping: vi.fn(async () => true),
}));

vi.mock("../db/index.js", () => ({
  isDatabaseEnabled: vi.fn(() => false),
  pingDatabase: vi.fn(async () => false),
}));

vi.mock("../middleware/apiKey.js", () => ({
  isApiKeyEnforced: vi.fn(() => false),
}));

vi.mock("../middleware/auth.js", () => ({
  isAuthConfigured: vi.fn(() => false),
}));

describe("health route", () => {
  const app = express();
  app.use(healthRouter);

  it("GET /health returns 200 with dependency statuses", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.dependencies).toBeDefined();
    expect(res.body.dependencies.cache.status).toBe("ok");
    expect(res.body.dependencies.database.status).toBe("disabled");
  });

  it("GET /metrics returns metrics snapshot", async () => {
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.body.totalRequests).toBeDefined();
    expect(res.body.routes).toBeInstanceOf(Array);
  });
});
