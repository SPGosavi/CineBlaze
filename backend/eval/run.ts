import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Request, Response } from "express";
import type { EnrichedMedia } from "../src/types/index.js";
import { CacheKeys, invalidatePrefix } from "../src/cache/index.js";
import { closeCache } from "../src/cache/index.js";
import { closeDatabase } from "../src/db/index.js";
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
  failed: boolean;
  error: string | null;
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
  failedCases: number;
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
  byMode: Record<
    string,
    {
      totalCases: number;
      hitAt1Rate: number;
      hitAt3Rate: number;
      p50Ms: number;
      avgPromptTokensPerCase: number;
    }
  >;
  byTag: Record<
    string,
    {
      totalCases: number;
      hitAt1Rate: number;
      hitAt3Rate: number;
      p50Ms: number;
      avgPromptTokensPerCase: number;
    }
  >;
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

  let failed = false;
  let errorMessage: string | null = null;
  try {
    if (mode === "direct") {
      await directSearch(req as Request<{}, {}, { query: string }>, res);
    } else {
      await findMovies(req, res);
    }
  } catch (error) {
    failed = true;
    errorMessage = error instanceof Error ? error.message : String(error);
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
    failed,
    error: errorMessage,
    promptTokens,
    completionTokens,
    groundingSources: telemetry.groundingSources,
  };
}

async function runCaseWithTimeout(
  testCase: EvalCase,
  timeoutMs: number
): Promise<EvalCaseResult> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      resolve({
        id: testCase.id,
        query: testCase.query,
        mode: testCase.mode ?? "ai",
        tags: testCase.tags,
        expected: testCase.expected,
        statusCode: 598,
        resolvedBy: null,
        latencyMs: timeoutMs,
        resultCount: 0,
        topTitles: [],
        topTmdbIds: [],
        top1Hit: false,
        top3Hit: false,
        failed: true,
        error: `timeout after ${timeoutMs}ms`,
        promptTokens: 0,
        completionTokens: 0,
        groundingSources: [],
      });
    }, timeoutMs);

    void runCase(testCase)
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        resolve({
          id: testCase.id,
          query: testCase.query,
          mode: testCase.mode ?? "ai",
          tags: testCase.tags,
          expected: testCase.expected,
          statusCode: 599,
          resolvedBy: null,
          latencyMs: timeoutMs,
          resultCount: 0,
          topTitles: [],
          topTmdbIds: [],
          top1Hit: false,
          top3Hit: false,
          failed: true,
          error: error instanceof Error ? error.message : String(error),
          promptTokens: 0,
          completionTokens: 0,
          groundingSources: [],
        });
      });
  });
}

function parseArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function parseArgNumber(flag: string, fallback: number): number {
  const value = parseArgValue(flag);
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function parseArgList(flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === flag && process.argv[i + 1]) {
      values.push(process.argv[i + 1]);
    }
  }
  return values;
}

function summarize(results: EvalCaseResult[]): EvalSummary {
  const totalCases = results.length;
  const hitAt1 = results.filter((r) => r.top1Hit).length;
  const hitAt3 = results.filter((r) => r.top3Hit).length;
  const failedCases = results.filter((r) => r.failed).length;
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

  const summarizeSlice = (
    slice: EvalCaseResult[]
  ): {
    totalCases: number;
    hitAt1Rate: number;
    hitAt3Rate: number;
    p50Ms: number;
    avgPromptTokensPerCase: number;
  } => {
    const total = slice.length;
    const hitAt1Count = slice.filter((r) => r.top1Hit).length;
    const hitAt3Count = slice.filter((r) => r.top3Hit).length;
    const promptTotal = slice.reduce((sum, r) => sum + r.promptTokens, 0);
    return {
      totalCases: total,
      hitAt1Rate: total > 0 ? hitAt1Count / total : 0,
      hitAt3Rate: total > 0 ? hitAt3Count / total : 0,
      p50Ms: percentile(
        slice.map((r) => r.latencyMs),
        50
      ),
      avgPromptTokensPerCase: total > 0 ? promptTotal / total : 0,
    };
  };

  const byMode: EvalSummary["byMode"] = {};
  for (const mode of ["ai", "recommend", "direct"] as const) {
    const slice = results.filter((r) => r.mode === mode);
    if (slice.length > 0) byMode[mode] = summarizeSlice(slice);
  }

  const tagSet = new Set<string>();
  for (const result of results) {
    for (const tag of result.tags) tagSet.add(tag);
  }

  const byTag: EvalSummary["byTag"] = {};
  for (const tag of [...tagSet].sort()) {
    const slice = results.filter((r) => r.tags.includes(tag));
    if (slice.length > 0) byTag[tag] = summarizeSlice(slice);
  }

  return {
    totalCases,
    hitAt1,
    hitAt3,
    failedCases,
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
    byMode,
    byTag,
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
  console.log(`failed: ${summary.failedCases}`);
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

  console.log("\n--- By Mode ---");
  for (const [mode, slice] of Object.entries(summary.byMode)) {
    console.log(
      `${mode}: cases=${slice.totalCases} hit@1=${(slice.hitAt1Rate * 100).toFixed(1)}% hit@3=${(slice.hitAt3Rate * 100).toFixed(1)}% p50=${slice.p50Ms}ms avgPrompt=${slice.avgPromptTokensPerCase.toFixed(1)}`
    );
  }

  const topTags = Object.entries(summary.byTag)
    .sort((a, b) => b[1].totalCases - a[1].totalCases)
    .slice(0, 10);

  console.log("\n--- By Tag (top 10 by case count) ---");
  for (const [tag, slice] of topTags) {
    console.log(
      `${tag}: cases=${slice.totalCases} hit@1=${(slice.hitAt1Rate * 100).toFixed(1)}% hit@3=${(slice.hitAt3Rate * 100).toFixed(1)}% p50=${slice.p50Ms}ms avgPrompt=${slice.avgPromptTokensPerCase.toFixed(1)}`
    );
  }
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

  const prevSemantic = prev.resolvedBy["semantic"] ?? 0;
  const nextSemantic = next.resolvedBy["semantic"] ?? 0;
  console.log(
    `resolvedBy.semantic: ${prevSemantic} -> ${nextSemantic} (${nextSemantic - prevSemantic})`
  );

  const compareTag = (tag: string) => {
    const left = prev.byTag?.[tag];
    const right = next.byTag?.[tag];
    if (!left && !right) return;
    const leftRate = left?.hitAt3Rate ?? 0;
    const rightRate = right?.hitAt3Rate ?? 0;
    console.log(
      `tag:${tag} hit@3: ${(leftRate * 100).toFixed(1)}% -> ${(rightRate * 100).toFixed(1)}% (${((rightRate - leftRate) * 100).toFixed(1)}pp)`
    );
  };

  compareTag("recommend");
  compareTag("mood");
  compareTag("franchise");
  compareTag("regional");
}

async function main(): Promise<void> {
  const isBaseline = process.argv.includes("--baseline");
  const limit = parseArgNumber("--limit", 0);
  const timeoutMs = parseArgNumber("--timeout-ms", 45_000);
  const tags = parseArgList("--tag").map((tag) => tag.toLowerCase());
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const queriesPath = path.join(currentDir, "queries.json");
  const resultsDir = path.join(currentDir, "results");

  try {
    const raw = await fs.readFile(queriesPath, "utf8");
    let cases = JSON.parse(raw) as EvalCase[];

    if (tags.length > 0) {
      cases = cases.filter((testCase) =>
        testCase.tags.some((tag) => tags.includes(tag.toLowerCase()))
      );
    }

    if (limit > 0) {
      cases = cases.slice(0, limit);
    }

    await fs.mkdir(resultsDir, { recursive: true });

    const previous = !isBaseline ? await latestReport(resultsDir) : null;

    await invalidatePrefix(CacheKeys.searchPrefix);

    setEvalTelemetryEnabled(true);

    const results: EvalCaseResult[] = [];
    for (const testCase of cases) {
      const result = await runCaseWithTimeout(testCase, timeoutMs);
      results.push(result);
      console.log(
        `[${result.id}] mode=${result.mode} status=${result.statusCode} resolvedBy=${result.resolvedBy ?? "(none)"} top1=${result.top1Hit ? "hit" : "miss"} top3=${result.top3Hit ? "hit" : "miss"} latency=${result.latencyMs}ms${result.failed ? ` failed=${result.error}` : ""}`
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
  } finally {
    setEvalTelemetryEnabled(false);
    await closeCache();
    await closeDatabase();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
