import { describe, it, expect, vi } from "vitest";
import { attachUser, requireUser } from "./auth.js";
import { createMockReqRes } from "../test-utils/mocks.js";

vi.mock("jose", () => ({
  createRemoteJWKSet: vi.fn(() => vi.fn()),
  jwtVerify: vi.fn(async (token: string) => {
    if (token === "valid-user-token") {
      return {
        payload: {
          sub: "firebase-uid-123",
          email: "user@example.com",
          name: "Test User",
        },
      };
    }
    throw new Error("Invalid token signature");
  }),
}));

vi.mock("../config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config.js")>();
  return {
    ...actual,
    FIREBASE_PROJECT_ID: "cineblaze-test-project",
  };
});

vi.mock("../db/repositories.js", () => ({
  upsertUser: vi.fn(async () => ({ id: "db-user-uuid-456" })),
}));

describe("auth middleware", () => {
  describe("attachUser", () => {
    it("attaches user info to req.user when valid bearer token is sent", async () => {
      const { req, res, next } = createMockReqRes({
        headers: { authorization: "Bearer valid-user-token" },
      });

      await attachUser(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeDefined();
      expect(req.user?.uid).toBe("firebase-uid-123");
      expect(req.user?.email).toBe("user@example.com");
      expect(req.user?.userId).toBe("db-user-uuid-456");
    });

    it("continues as anonymous when no authorization header is sent", async () => {
      const { req, res, next } = createMockReqRes({
        headers: {},
      });

      await attachUser(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    });

    it("continues as anonymous without throwing when token is invalid", async () => {
      const { req, res, next } = createMockReqRes({
        headers: { authorization: "Bearer invalid-token" },
      });

      await attachUser(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toBeUndefined();
    });
  });

  describe("requireUser", () => {
    it("calls next() if req.user is populated", () => {
      const { req, res, next } = createMockReqRes({
        user: { uid: "123", email: "a@b.com", displayName: "A", userId: "1" },
      });

      requireUser(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    });

    it("returns 401 when req.user is absent", () => {
      const { req, res, next } = createMockReqRes();

      requireUser(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        error: "Authentication required",
      });
    });
  });
});
