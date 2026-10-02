/**
 * In-process request metrics.
 *
 * Deliberately not Prometheus. The goal from the plan is "a simple dashboard
 * showing API response times and error rates", and a scrape endpoint plus a
 * time-series database is a lot of machinery for a single instance. This
 * keeps a bounded rolling summary per route and serves it as JSON.
 *
 * The limits are worth stating plainly: counters live in memory, so they
 * reset on deploy and each instance sees only its own traffic. When that
 * stops being good enough the answer is a real metrics backend, not a bigger
 * version of this.
 */

interface RouteStats {
  count: number;
  errors: number;
  totalMs: number;
  maxMs: number;
  /** Recent durations, for percentiles. Bounded to keep memory flat. */
  samples: number[];
}

const MAX_SAMPLES = 200;
const routes = new Map<string, RouteStats>();

let startedAt = Date.now();
let totalRequests = 0;
let totalErrors = 0;

export function recordRequest(
  route: string,
  statusCode: number,
  durationMs: number
): void {
  totalRequests++;
  const isError = statusCode >= 500;
  if (isError) totalErrors++;

  const stats = routes.get(route) ?? {
    count: 0,
    errors: 0,
    totalMs: 0,
    maxMs: 0,
    samples: [],
  };

  stats.count++;
  if (statusCode >= 400) stats.errors++;
  stats.totalMs += durationMs;
  stats.maxMs = Math.max(stats.maxMs, durationMs);

  stats.samples.push(durationMs);
  if (stats.samples.length > MAX_SAMPLES) stats.samples.shift();

  routes.set(route, stats);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return Math.round(sorted[index]);
}

export interface MetricsSnapshot {
  uptimeSeconds: number;
  totalRequests: number;
  totalErrors: number;
  errorRate: number;
  routes: {
    route: string;
    count: number;
    errorRate: number;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
  }[];
}

export function snapshot(): MetricsSnapshot {
  const perRoute = [...routes.entries()]
    .map(([route, stats]) => {
      const sorted = [...stats.samples].sort((a, b) => a - b);
      return {
        route,
        count: stats.count,
        errorRate:
          stats.count === 0
            ? 0
            : Number((stats.errors / stats.count).toFixed(4)),
        avgMs: Math.round(stats.totalMs / stats.count),
        p50Ms: percentile(sorted, 50),
        p95Ms: percentile(sorted, 95),
        maxMs: Math.round(stats.maxMs),
      };
    })
    .sort((a, b) => b.count - a.count);

  return {
    uptimeSeconds: Math.round((Date.now() - startedAt) / 1000),
    totalRequests,
    totalErrors,
    errorRate:
      totalRequests === 0
        ? 0
        : Number((totalErrors / totalRequests).toFixed(4)),
    routes: perRoute,
  };
}

export function resetMetrics(): void {
  routes.clear();
  totalRequests = 0;
  totalErrors = 0;
  startedAt = Date.now();
}
