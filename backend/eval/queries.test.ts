import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

interface EvalCase {
  id: string;
  query: string;
  mode?: "ai" | "recommend" | "direct";
  expected: {
    tmdbIds?: number[];
    titles?: string[];
  };
  tags: string[];
}

describe("eval/queries.json", () => {
  it("has unique ids and valid shape", async () => {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const body = await fs.readFile(
      path.join(currentDir, "queries.json"),
      "utf8"
    );
    const cases = JSON.parse(body) as EvalCase[];

    expect(Array.isArray(cases)).toBe(true);
    expect(cases.length).toBeGreaterThanOrEqual(20);

    const ids = new Set<string>();

    for (const testCase of cases) {
      expect(testCase.id).toBeTruthy();
      expect(ids.has(testCase.id)).toBe(false);
      ids.add(testCase.id);

      expect(testCase.query.trim().length).toBeGreaterThan(0);
      expect(["ai", "recommend", "direct", undefined]).toContain(testCase.mode);
      expect(Array.isArray(testCase.tags)).toBe(true);
      expect(testCase.tags.length).toBeGreaterThan(0);

      expect(testCase.expected).toBeTruthy();
      const hasIds = (testCase.expected.tmdbIds ?? []).length > 0;
      const hasTitles = (testCase.expected.titles ?? []).length > 0;
      expect(hasIds || hasTitles || testCase.tags.includes("known-hard")).toBe(
        true
      );
    }
  });
});
