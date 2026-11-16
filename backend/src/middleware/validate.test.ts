import { describe, it, expect } from "vitest";
import { z } from "zod";
import { validateBody, validateParams } from "./validate.js";
import { createMockReqRes } from "../test-utils/mocks.js";

describe("validate middleware", () => {
  const schema = z.object({
    title: z.string().min(1),
    count: z.number().int().positive().optional(),
  });

  describe("validateBody", () => {
    it("calls next() and sets coerced body on valid data", () => {
      const { req, res, next } = createMockReqRes({
        body: { title: "Dune", count: 2 },
      });

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.body).toEqual({ title: "Dune", count: 2 });
    });

    it("returns 400 with validation issues on invalid data", () => {
      const { req, res, next } = createMockReqRes({
        body: { title: "" }, // invalid: min 1
      });

      const middleware = validateBody(schema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: "Invalid request",
          issues: expect.arrayContaining([
            expect.objectContaining({ field: "title" }),
          ]),
        })
      );
    });
  });

  describe("validateParams", () => {
    const paramSchema = z.object({
      id: z.coerce.number().positive(),
    });

    it("coerces params and calls next()", () => {
      const { req, res, next } = createMockReqRes({
        params: { id: "42" },
      });

      const middleware = validateParams(paramSchema);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(req.params.id).toBe(42);
    });

    it("returns 400 when param fails validation", () => {
      const { req, res, next } = createMockReqRes({
        params: { id: "not-a-number" },
      });

      const middleware = validateParams(paramSchema);
      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
