import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { childLogger } from "../utils/logger.js";

const log = childLogger("validate");

/**
 * Validates and replaces `req.body`.
 *
 * Before this, handlers cast the body straight to an interface
 * (`req.body as FindMoviesRequest`) — a compile-time assertion about runtime
 * data from the network, which is to say no check at all. `media_type` could
 * be any string and flowed unchecked into a TMDB URL; `description` could be
 * absent, an object, or a megabyte of text headed for a paid LLM call.
 *
 * On success the parsed value replaces the body, so handlers receive coerced,
 * trimmed, known-shaped data instead of whatever was posted.
 */
export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      const issues = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(body)",
        message: issue.message,
      }));
      log.debug({ path: req.path, issues }, "Request rejected by validation");
      res.status(400).json({ error: "Invalid request", issues });
      return;
    }

    req.body = result.data;
    next();
  };
}

/** Same, for `req.params`. */
export function validateParams<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: "Invalid request",
        issues: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
      return;
    }
    Object.assign(req.params, result.data);
    next();
  };
}

// ─── Shared primitives ──────────────────────────────────────────────────────

export const mediaTypeSchema = z.enum(["movie", "tv"]);

/** TMDB ids are positive integers; accepts the string form from a URL. */
export const tmdbIdSchema = z.coerce.number().int().positive().max(99_999_999);

const yearSchema = z
  .string()
  .regex(/^\d{4}$/, "Expected a four-digit year")
  .optional();

// ─── Request schemas ────────────────────────────────────────────────────────

/**
 * The 500-character ceiling is a cost control, not a UI constraint. This
 * string is interpolated into a Groq prompt, and an unbounded body is an
 * unbounded bill.
 */
export const findMoviesSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Describe what you are looking for")
    .max(500, "Keep the description under 500 characters"),
  mode: z.enum(["ai", "recommend"]).optional(),
});

export const directSearchSchema = z.object({
  query: z.string().trim().min(1).max(200),
});

export const getSimilarSchema = z.object({
  title: z.string().trim().min(1).max(500),
  media_type: mediaTypeSchema,
  year: yearSchema,
  genres: z.array(z.string().max(60)).max(20).optional(),
  overview: z.string().max(4_000).optional(),
  cast: z.array(z.string().max(120)).max(30).optional(),
  director: z.string().max(200).optional(),
});

/**
 * Either an id or a title must be present — the handler branches on exactly
 * that, and previously answered `{}` when given neither.
 */
export const mediaDetailsSchema = z
  .object({
    id: tmdbIdSchema.optional(),
    title: z.string().trim().min(1).max(500).optional(),
    year: yearSchema,
    media_type: mediaTypeSchema,
  })
  .refine((body) => body.id !== undefined || body.title !== undefined, {
    message: "Provide either an id or a title",
  });

export const mediaExtrasSchema = z.object({
  id: tmdbIdSchema,
  media_type: mediaTypeSchema,
});

export const mediaByIdParamsSchema = z.object({
  mediaType: mediaTypeSchema,
  id: tmdbIdSchema,
});

export const trendingPlatformParamsSchema = z.object({
  platform: z.enum(["netflix", "prime", "hotstar"]),
});
