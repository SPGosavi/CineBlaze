import { describe, it, expect } from "vitest";
import { isRetryableStatus, backoffDelay } from "./retry.js";

describe("retry utils", () => {
  describe("isRetryableStatus", () => {
    it("returns true for 429 and 5xx statuses", () => {
      expect(isRetryableStatus(429)).toBe(true);
      expect(isRetryableStatus(500)).toBe(true);
      expect(isRetryableStatus(502)).toBe(true);
      expect(isRetryableStatus(503)).toBe(true);
      expect(isRetryableStatus(504)).toBe(true);
    });

    it("returns false for 2xx and 4xx other than 429", () => {
      expect(isRetryableStatus(200)).toBe(false);
      expect(isRetryableStatus(201)).toBe(false);
      expect(isRetryableStatus(400)).toBe(false);
      expect(isRetryableStatus(401)).toBe(false);
      expect(isRetryableStatus(404)).toBe(false);
    });
  });

  describe("backoffDelay", () => {
    it("calculates exponential delays with jitter: ~500ms, ~1s, ~2s (+/- up to 100ms)", () => {
      // attempt 1: base = 500 * 2^0 = 500, jitter = [0, 100]
      const delay1 = backoffDelay(1);
      expect(delay1).toBeGreaterThanOrEqual(500);
      expect(delay1).toBeLessThanOrEqual(600);

      // attempt 2: base = 500 * 2^1 = 1000, jitter = [0, 100]
      const delay2 = backoffDelay(2);
      expect(delay2).toBeGreaterThanOrEqual(1000);
      expect(delay2).toBeLessThanOrEqual(1100);

      // attempt 3: base = 500 * 2^2 = 2000, jitter = [0, 100]
      const delay3 = backoffDelay(3);
      expect(delay3).toBeGreaterThanOrEqual(2000);
      expect(delay3).toBeLessThanOrEqual(2100);
    });
  });
});
