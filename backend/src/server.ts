import type { Server } from "http";
import { app } from "./app.js";
import { startScheduler, stopScheduler } from "./jobs/scheduler.js";
import { cacheBackend, closeCache } from "./cache/index.js";
import { closeDatabase, isDatabaseEnabled } from "./db/index.js";
import { logger } from "./utils/logger.js";
import { CORS_ORIGINS } from "./config.js";

const PORT: number = Number(process.env.PORT) || 5001;

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

export { server };
