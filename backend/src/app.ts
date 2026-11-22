import { initErrorTracking } from "./utils/errorTracking.js";

// Before any other import that Sentry needs to instrument.
initErrorTracking();

import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import * as Sentry from "@sentry/node";

import apiRoutes from "./routes/api.js";
import healthRoutes from "./routes/health.js";
import { attachUser } from "./middleware/auth.js";
import { requireApiKey } from "./middleware/apiKey.js";
import { ipBurstLimiter } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { logger } from "./utils/logger.js";
import { CORS_ORIGINS, IS_PRODUCTION, SENTRY_DSN } from "./config.js";

export const app: Express = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  cors({
    origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    maxAge: 86_400,
  })
);

app.use(express.json({ limit: "64kb" }));

app.use(
  (
    error: Error & { status?: number; type?: string },
    _req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    if (error instanceof SyntaxError && error.type === "entity.parse.failed") {
      res.status(400).json({ error: "Malformed JSON body" });
      return;
    }
    if (error.type === "entity.too.large") {
      res.status(413).json({ error: "Request body too large" });
      return;
    }
    next(error);
  }
);

app.use(requestLogger);

// Health is registered before the API key and burst limiter so an uptime
// probe does not need a secret and cannot be throttled into a false alarm.
app.use(healthRoutes);

app.use("/api", ipBurstLimiter, requireApiKey, attachUser, apiRoutes);

app.use((_req: Request, res: Response): void => {
  res.status(404).json({ error: "Not found" });
});

if (SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use(
  (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
    logger.error({ err: error.message, stack: error.stack }, "Unhandled error");
    if (res.headersSent) return;
    res.status(500).json({
      error: IS_PRODUCTION ? "Internal server error" : error.message,
    });
  }
);

export default app;
