import { describe, it, expect, vi } from "vitest";
import { TimeoutError, fetchWithTimeout, bestEffort } from "./http.js";
import { Response } from "node-fetch";

vi.mock("node-fetch", () => {
  return {
    default: vi.fn(async (url: string, init?: any) => {
      if (url.includes("timeout")) {
        return new Promise((_, reject) => {
          const timer = setTimeout(() => {
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          }, 100);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            const err = new Error("aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      }
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }),
    Response: class {
      status: number;
      constructor(
        public body: any,
        init?: any
      ) {
        this.status = init?.status || 200;
      }
      async json() {
        return JSON.parse(this.body);
      }
    },
  };
});

describe("http utils", () => {
  describe("TimeoutError", () => {
    it("creates an error with proper message and name", () => {
      const err = new TimeoutError(1500);
      expect(err.name).toBe("TimeoutError");
      expect(err.message).toBe("Timed out after 1500ms");
    });
  });

  describe("fetchWithTimeout", () => {
    it("resolves successfully when peer responds within deadline", async () => {
      const res = await fetchWithTimeout("https://api.example.com/data", 1000);
      expect(res.status).toBe(200);
    });

    it("throws TimeoutError when aborted", async () => {
      await expect(
        fetchWithTimeout("https://api.example.com/timeout", 20)
      ).rejects.toThrow(TimeoutError);
    });
  });

  describe("bestEffort", () => {
    it("returns function result when successful", async () => {
      const result = await bestEffort(
        "test-task",
        500,
        "fallback",
        async () => {
          return "success-result";
        }
      );
      expect(result).toBe("success-result");
    });

    it("returns fallback value when task times out", async () => {
      const result = await bestEffort(
        "slow-task",
        30,
        "default-fallback",
        async () => {
          await new Promise((r) => setTimeout(r, 100));
          return "too-late";
        }
      );
      expect(result).toBe("default-fallback");
    });

    it("returns fallback value when task throws an error", async () => {
      const result = await bestEffort(
        "error-task",
        500,
        "err-fallback",
        async () => {
          throw new Error("unexpected service failure");
        }
      );
      expect(result).toBe("err-fallback");
    });
  });
});
