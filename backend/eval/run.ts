import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";
import type { EnrichedMedia } from "../src/types/index.js";
import { CacheKeys, invalidatePrefix } from "../src/cache/index.js";
import {
  directSearch,
  findMovies,
} from "../src/controllers/searchController.js";
import {
  getEvalTelemetrySnapshot,
  resetEvalTelemetry,
  setEvalTelemetryEnabled,
} from "../src/eval/telemetry.js";

type EvalMode = "ai" | "recommend" | "direct";

interface EvalCase {
  id: string;
  query: string;
  mode?: EvalMode;
  expected: {
    tmdbIds?: number[];
    titles?: string[];
  };
  tags: string[];
}

interface EvalCaseResult {
  id: string;
  query: string;
  mode: EvalMode;
  tags: string[];
  expected: EvalCase["expected"];
  statusCode: number;
  resolvedBy: string | null;
  latencyMs: number;
  resultCount: number;
  topTitles: string[];
  topTmdbIds: number[];
  top1Hit: boolean;
  top3Hit: boolean;
  promptTokens: number;
  completionTokens: number;
  groundingSources: {
    label: string;
    chars: number;
    ms: number;
    populated: boolean;
  }[];
}

interface EvalSummary {
  totalCases: number;
  hitAt1: number;
  hitAt3: number;
  hitAt1Rate: number;
  hitAt3Rate: number;
  p50Ms: number;
  p95Ms: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  avgPromptTokensPerCase: number;
  avgCompletionTokensPerCase: number;
  avgGroundingCharsPerCase: number;
  avgGroundingPopulatedSourcesPerCase: number;
  resolvedBy: Record<string, number>;
}

interface EvalReport {
  generatedAt: string;
  baseline: boolean;
  summary: EvalSummary;
  cases: EvalCaseResult[];
}

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

function normalizeTitle(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  );
  return sorted[index];
}

function isHit(movie: EnrichedMedia, expected: EvalCase["expected"]): boolean {
  const ids = expected.tmdbIds ?? [];
  if (ids.length > 0 && ids.includes(movie.id)) return true;

  const titleNeedles = (expected.titles ?? [])
    .map((t) => normalizeTitle(t))
    .filter(Boolean);
  if (titleNeedles.length === 0) return false;

  const actual = normalizeTitle(movie.title);
  return titleNeedles.some(
    (needle) =>
      actual === needle || actual.includes(needle) || needle.includes(actual)
  );
}

function asMovies(payload: unknown): EnrichedMedia[] {
  if (!payload || typeof payload !== "object") return [];
  const bag = payload as { movies?: EnrichedMedia[] };
  return Array.isArray(bag.movies) ? bag.movies : [];
}

async function runCase(testCase: EvalCase): Promise<EvalCaseResult> {
  const mode: EvalMode = testCase.mode ?? "ai";
  const reqBody =
    mode === "direct"
      ? { query: testCase.query }
      : { description: testCase.query, mode };

  const req = {
    body: reqBody,
    user: null,
  } as Request;

  const res = new MockResponse() as unknown as Response;

  resetEvalTelemetry();
  const started = Date.now();

  if (mode === "direct") {
    await directSearch(req as Request<{}, {}, { query: string }>, res);
  } else {
    await findMovies(req, res);
  }

  const latencyMs = Date.now() - started;
  const telemetry = getEvalTelemetrySnapshot();
  const movies = asMovies((res as unknown as MockResponse).payload);

  const top1Hit =
    movies.length > 0 ? isHit(movies[0], testCase.expected) : false;
  const top3Hit = movies
    .slice(0, 3)
    .some((movie) => isHit(movie, testCase.expected));

  const promptTokens = telemetry.groqCalls.reduce(
    (sum, call) => sum + call.promptTokens,
    0
  );
  const completionTokens = telemetry.groqCalls.reduce(
    (sum, call) => sum + call.completionTokens,
    0
  );

  return {
    id: testCase.id,
    query: testCase.query,
    mode,
    tags: testCase.tags,
    expected: testCase.expected,
    statusCode: (res as unknown as MockResponse).statusCode,
    resolvedBy:
      (res as unknown as MockResponse).headers.get("x-resolved-by") ?? null,
    latencyMs,
    resultCount: movies.length,
    topTitles: movies.slice(0, 5).map((m) => m.title),
    topTmdbIds: movies.slice(0, 5).map((m) => m.id),
    top1Hit,
    top3Hit,
    promptTokens,
    completionTokens,
    groundingSources: telemetry.groundingSources,
  };
}

function summarize(results: EvalCaseResult[]): EvalSummary {
  const totalCases = results.length;
  const hitAt1 = results.filter((r) => r.top1Hit).length;
  const hitAt3 = results.filter((r) => r.top3Hit).length;
  const latencies = results.map((r) => r.latencyMs);
  const totalPromptTokens = results.reduce((sum, r) => sum + r.promptTokens, 0);
  const totalCompletionTokens = results.reduce(
    (sum, r) => sum + r.completionTokens,
    0
  );

  const totalGroundingChars = results.reduce(
    (sum, r) => sum + r.groundingSources.reduce((s, g) => s + g.chars, 0),
    0
  );
  const totalPopulatedSources = results.reduce(
    (sum, r) => sum + r.groundingSources.filter((g) => g.populated).length,
    0
  );

  const resolvedBy: Record<string, number> = {};
  for (const result of results) {
    const bucket = result.resolvedBy ?? "(none)";
    resolvedBy[bucket] = (resolvedBy[bucket] ?? 0) + 1;
  }

  return {
    totalCases,
    hitAt1,
    hitAt3,
    hitAt1Rate: totalCases > 0 ? hitAt1 / totalCases : 0,
    hitAt3Rate: totalCases > 0 ? hitAt3 / totalCases : 0,
    p50Ms: percentile(latencies, 50),
    p95Ms: percentile(latencies, 95),
    totalPromptTokens,
    totalCompletionTokens,
    avgPromptTokensPerCase: totalCases > 0 ? totalPromptTokens / totalCases : 0,
    avgCompletionTokensPerCase:
      totalCases > 0 ? totalCompletionTokens / totalCases : 0,
    avgGroundingCharsPerCase:
      totalCases > 0 ? totalGroundingChars / totalCases : 0,
    avgGroundingPopulatedSourcesPerCase:
      totalCases > 0 ? totalPopulatedSources / totalCases : 0,
    resolvedBy,
  };
}

async function latestReport(resultsDir: string): Promise<EvalReport | null> {
  let names: string[] = [];
  try {
    names = (await fs.readdir(resultsDir)).filter((n) => n.endsWith(".json"));
  } catch {
    return null;
  }
  if (names.length === 0) return null;

  names.sort();
  const latest = names[names.length - 1];
  const body = await fs.readFile(path.join(resultsDir, latest), "utf8");
  return JSON.parse(body) as EvalReport;
}

function printSummary(summary: EvalSummary): void {
  console.log("\n=== Eval Summary ===");
  console.log(`cases: ${summary.totalCases}`);
  console.log(
    `hit@1: ${summary.hitAt1}/${summary.totalCases} (${(summary.hitAt1Rate * 100).toFixed(1)}%)`
  );
  console.log(
    `hit@3: ${summary.hitAt3}/${summary.totalCases} (${(summary.hitAt3Rate * 100).toFixed(1)}%)`
  );
  console.log(`latency p50/p95: ${summary.p50Ms}ms / ${summary.p95Ms}ms`);
  console.log(
    `prompt tokens total/avg: ${summary.totalPromptTokens} / ${summary.avgPromptTokensPerCase.toFixed(1)}`
  );
  console.log(
    `completion tokens total/avg: ${summary.totalCompletionTokens} / ${summary.avgCompletionTokensPerCase.toFixed(1)}`
  );
  console.log(
    `grounding chars avg per case: ${summary.avgGroundingCharsPerCase.toFixed(1)}`
  );
  console.log(
    `grounding populated sources avg per case: ${summary.avgGroundingPopulatedSourcesPerCase.toFixed(2)}`
  );
  console.log(`resolvedBy: ${JSON.stringify(summary.resolvedBy)}`);
}

function printDiff(prev: EvalSummary, next: EvalSummary): void {
  console.log("\n=== Diff vs Previous Baseline ===");
  const pct = (value: number) => `${(value * 100).toFixed(1)}%`;
  console.log(
    `hit@1: ${pct(prev.hitAt1Rate)} -> ${pct(next.hitAt1Rate)} (${pct(
      next.hitAt1Rate - prev.hitAt1Rate
    )})`
  );
  console.log(
    `hit@3: ${pct(prev.hitAt3Rate)} -> ${pct(next.hitAt3Rate)} (${pct(
      next.hitAt3Rate - prev.hitAt3Rate
    )})`
  );
  console.log(
    `p50 latency: ${prev.p50Ms}ms -> ${next.p50Ms}ms (${next.p50Ms - prev.p50Ms}ms)`
  );
  console.log(
    `p95 latency: ${prev.p95Ms}ms -> ${next.p95Ms}ms (${next.p95Ms - prev.p95Ms}ms)`
  );
  console.log(
    `avg prompt tokens: ${prev.avgPromptTokensPerCase.toFixed(1)} -> ${next.avgPromptTokensPerCase.toFixed(1)} (${(next.avgPromptTokensPerCase - prev.avgPromptTokensPerCase).toFixed(1)})`
  );
  console.log(
    `avg grounding chars: ${prev.avgGroundingCharsPerCase.toFixed(1)} -> ${next.avgGroundingCharsPerCase.toFixed(1)} (${(next.avgGroundingCharsPerCase - prev.avgGroundingCharsPerCase).toFixed(1)})`
  );
}

async function main(): Promise<void> {
  const isBaseline = process.argv.includes("--baseline");
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const queriesPath = path.join(currentDir, "queries.json");
  const resultsDir = path.join(currentDir, "results");

  const raw = await fs.readFile(queriesPath, "utf8");
  const cases = JSON.parse(raw) as EvalCase[];

  await fs.mkdir(resultsDir, { recursive: true });

  const previous = !isBaseline ? await latestReport(resultsDir) : null;

  await invalidatePrefix(CacheKeys.searchPrefix);

  setEvalTelemetryEnabled(true);

  const results: EvalCaseResult[] = [];
  for (const testCase of cases) {
    const result = await runCase(testCase);
    results.push(result);
    console.log(
      `[${result.id}] mode=${result.mode} status=${result.statusCode} resolvedBy=${result.resolvedBy ?? "(none)"} top1=${result.top1Hit ? "hit" : "miss"} top3=${result.top3Hit ? "hit" : "miss"} latency=${result.latencyMs}ms`
    );
  }

  setEvalTelemetryEnabled(false);

  const report: EvalReport = {
    generatedAt: new Date().toISOString(),
    baseline: isBaseline,
    summary: summarize(results),
    cases: results,
  };

  const timestamp = report.generatedAt.replace(/[:.]/g, "-");
  const outputPath = path.join(
    resultsDir,
    `${isBaseline ? "baseline" : "run"}-${timestamp}.json`
  );
  await fs.writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");

  printSummary(report.summary);

  if (previous) {
    printDiff(previous.summary, report.summary);
  }

  console.log(`\nSaved report: ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
