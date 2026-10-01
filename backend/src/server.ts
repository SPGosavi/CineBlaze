import { initErrorTracking } from "./utils/errorTracking.js";

// Before any other import that Sentry needs to instrument.
initErrorTracking();

import express, { Express, NextFunction, Request, Response } from "express";
import cors from "cors";
import type { Server } from "http";
import * as Sentry from "@sentry/node";

import apiRoutes from "./routes/api.js";
import healthRoutes from "./routes/health.js";
import { attachUser } from "./middleware/auth.js";
import { requireApiKey } from "./middleware/apiKey.js";
import { ipBurstLimiter } from "./middleware/rateLimit.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";
import { cacheBackend, closeCache } from "./cache/index.js";
import { closeDatabase, isDatabaseEnabled } from "./db/index.js";
import { logger } from "./utils/logger.js";
import { CORS_ORIGINS, IS_PRODUCTION, SENTRY_DSN } from "./config.js";

const app: Express = express();

/**
 * Render terminates TLS and proxies, so the socket address is the load
 * balancer's. Without this, `req.ip` is identical for every visitor and the
 * per-IP rate limit would throttle the whole world as one client.
 */
app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  cors({
    // `origin: "*"` was the previous setting. Combined with an unauthenticated
    // API, that let any page on the internet spend our Groq and TMDB quota.
    // Falls back to open when unset so local development still works.
    origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : "*",
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
    maxAge: 86_400,
  })
);

// 64kb is far more than any endpoint needs; the largest body is a plot
// description capped at 500 characters. The default 100kb is an easy way to
// make the server do pointless parsing work.
app.use(express.json({ limit: "64kb" }));

/**
 * Turns a malformed body into a 400.
 *
 * `express.json()` throws a SyntaxError on unparseable input, which otherwise
 * falls through to the terminal handler and is reported as a 500. That is
 * wrong on three counts: it blames the server for a client mistake, it
 * inflates the error rate the metrics endpoint reports, and once Sentry is
 * configured it pages someone every time a bot posts junk.
 *
 * Must sit immediately after the parser — Express matches error handlers in
 * registration order.
 */
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

/**
 * Terminal error handler.
 *
 * Express needs all four parameters to recognise this as an error handler,
 * even though `next` is unused.
 */
app.use(
  (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
    logger.error({ err: error.message, stack: error.stack }, "Unhandled error");
    if (res.headersSent) return;
    res.status(500).json({
      error: IS_PRODUCTION ? "Internal server error" : error.message,
    });
  }
);

const PORT: number = Number(process.env.PORT) || 8000;

const server: Server = app.listen(PORT, "0.0.0.0", () => {
  logger.info(
    {
      port: PORT,
      cache: cacheBackend(),
      database: isDatabaseEnabled() ? "postgres" : "disabled",
      cors: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : "*",
    },
    "Server started"
  );
  startScheduler();
});

// Node closes idle keep-alive sockets after 5s by default. Any proxy in
// front of us -- Vite's dev proxy, Render's load balancer -- pools
// connections and can reuse one at the exact moment Node is closing it,
// which surfaces as an intermittent ECONNRESET in dev and a 502 in
// production. Outliving the proxy's own idle timeout avoids the race.
// headersTimeout must stay above keepAliveTimeout.
server.keepAliveTimeout = 65_000;
server.headersTimeout = 66_000;

let shuttingDown = false;

const shutdown = (signal: string): void => {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info({ signal }, "Shutting down");

  stopScheduler();

  server.close(() => {
    // Close the connection pools only after in-flight requests have finished,
    // otherwise a request still using them fails on the way out.
    void Promise.allSettled([closeCache(), closeDatabase()]).then(() => {
      logger.info("Server closed cleanly");
      process.exit(0);
    });
  });

  setTimeout(() => {
    logger.warn("Forcing exit after shutdown timeout");
    process.exit(1);
  }, 10_000).unref();
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// An unhandled rejection leaves the process in an unknown state. Log it
// loudly rather than letting Node's default terminate silently.
process.on("unhandledRejection", (reason) => {
  logger.error({ err: String(reason) }, "Unhandled promise rejection");
});
