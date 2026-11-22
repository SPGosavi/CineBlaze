import { describe, it, expect, vi } from "vitest";
import { requireApiKey } from "./apiKey.js";
import { createMockReqRes } from "../test-utils/mocks.js";

// Partially mock config.js
vi.mock("../config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config.js")>();
  return {
    ...actual,
    INTERNAL_API_KEY: "secret-cineblaze-key-123",
  };
});

describe("requireApiKey middleware", () => {
  it("allows access when correct x-api-key is presented", () => {
    const { req, res, next } = createMockReqRes({
      headers: { "x-api-key": "secret-cineblaze-key-123" },
    });

    requireApiKey(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized when x-api-key is missing", () => {
    const { req, res, next } = createMockReqRes({
      headers: {},
    });

    requireApiKey(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
  });

  it("returns 401 Unauthorized when wrong x-api-key is presented", () => {
    const { req, res, next } = createMockReqRes({
      headers: { "x-api-key": "wrong-secret-key" },
    });

    requireApiKey(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
