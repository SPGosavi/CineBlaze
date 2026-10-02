import * as Sentry from "@sentry/node";
import { NODE_ENV, SENTRY_DSN } from "../config.js";
import { logger } from "./logger.js";

/**
 * Initialises Sentry, if a DSN is configured.
 *
 * Must run before anything else is imported that Sentry needs to instrument,
 * which is why `server.ts` calls it on its first line.
 *
 * No DSN means no-op. Errors still reach the structured logs either way —
 * Sentry adds grouping, alerting and stack traces across deploys, none of
 * which should be a prerequisite for the app booting.
 */
export function initErrorTracking(): void {
  if (!SENTRY_DSN) {
    logger.info("SENTRY_DSN not set — error tracking disabled");
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: NODE_ENV,
    // 10% of transactions. Enough to spot a regression in the Groq path
    // without exhausting the free tier on trending requests.
    tracesSampleRate: 0.1,
    // These are our own keys and the user's identity token; neither belongs
    // in a third-party error tracker.
    beforeSend(event) {
      if (event.request?.headers) {
        delete event.request.headers["x-api-key"];
        delete event.request.headers.authorization;
      }
      return event;
    },
  });

  logger.info({ environment: NODE_ENV }, "Sentry error tracking enabled");
}

export { Sentry };
