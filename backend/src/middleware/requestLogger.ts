import type { NextFunction, Request, Response } from "express";
import { logger } from "../utils/logger.js";
import { recordRequest } from "../utils/metrics.js";

/**
 * Logs one structured line per request and feeds the metrics collector.
 *
 * Hand-rolled rather than pino-http because the route *template* is needed,
 * not the URL. Keying metrics on `/movie/550` would create a new bucket per
 * title and make the numbers useless; `req.route` gives `/media/:mediaType/:id`.
 * It is only populated after routing, which is why this reads it in the
 * `finish` handler rather than up front.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    const template = req.route?.path
      ? `${req.baseUrl}${req.route.path}`
      : req.path;
    const route = `${req.method} ${template}`;

    recordRequest(route, res.statusCode, durationMs);

    const line = {
      method: req.method,
      route: template,
      status: res.statusCode,
      durationMs: Math.round(durationMs),
      cache: res.getHeader("X-Cache") ?? undefined,
      // Present only on authenticated requests; never the token itself.
      uid: req.user?.uid,
    };

    if (res.statusCode >= 500) {
      logger.error(line, "Request failed");
    } else if (res.statusCode >= 400) {
      logger.warn(line, "Request rejected");
    } else {
      logger.info(line, "Request completed");
    }
  });

  next();
}
