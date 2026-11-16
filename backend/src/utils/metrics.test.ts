import { describe, it, expect, beforeEach } from "vitest";
import { recordRequest, snapshot, resetMetrics } from "./metrics.js";

describe("metrics utils", () => {
  beforeEach(() => {
    resetMetrics();
  });

  it("starts with empty metrics snapshot", () => {
    const s = snapshot();
    expect(s.totalRequests).toBe(0);
    expect(s.totalErrors).toBe(0);
    expect(s.errorRate).toBe(0);
    expect(s.routes).toEqual([]);
  });

  it("records successful requests and computes averages", () => {
    recordRequest("/api/trending", 200, 50);
    recordRequest("/api/trending", 200, 150);

    const s = snapshot();
    expect(s.totalRequests).toBe(2);
    expect(s.totalErrors).toBe(0);
    expect(s.routes).toHaveLength(1);

    const route = s.routes[0];
    expect(route.route).toBe("/api/trending");
    expect(route.count).toBe(2);
    expect(route.avgMs).toBe(100);
    expect(route.maxMs).toBe(150);
    expect(route.errorRate).toBe(0);
  });

  it("records error rates for 4xx and 5xx responses", () => {
    recordRequest("/api/search", 200, 100);
    recordRequest("/api/search", 400, 20); // client error counts in route errors
    recordRequest("/api/search", 500, 200); // 500 counts in totalErrors + route errors

    const s = snapshot();
    expect(s.totalRequests).toBe(3);
    expect(s.totalErrors).toBe(1); // Only 500 counts as system total error
    expect(s.errorRate).toBeCloseTo(1 / 3, 2);

    const route = s.routes[0];
    expect(route.count).toBe(3);
    expect(route.errorRate).toBeCloseTo(2 / 3, 2); // 400 and 500 count as route errors
  });

  it("computes p50 and p95 correctly with percentiles", () => {
    for (let i = 1; i <= 100; i++) {
      recordRequest("/api/calc", 200, i * 10);
    }

    const s = snapshot();
    const route = s.routes[0];
    expect(route.count).toBe(100);
    expect(route.p50Ms).toBe(510);
    expect(route.p95Ms).toBe(960);
  });

  it("resets metrics accurately", () => {
    recordRequest("/api/test", 200, 50);
    resetMetrics();
    const s = snapshot();
    expect(s.totalRequests).toBe(0);
    expect(s.routes).toHaveLength(0);
  });
});
