import express, { Request, Response, Router } from "express";
import * as cache from "../cache/index.js";
import { cacheBackend } from "../cache/index.js";
import { isDatabaseEnabled, pingDatabase } from "../db/index.js";
import { isApiKeyEnforced } from "../middleware/apiKey.js";
import { isAuthConfigured } from "../middleware/auth.js";
import { snapshot } from "../utils/metrics.js";

const router: Router = express.Router();

type DependencyStatus = "ok" | "degraded" | "disabled";

interface Dependency {
  status: DependencyStatus;
  detail: string;
}

/**
 * Health check with per-dependency status.
 *
 * The old endpoint returned a bare `OK` as long as the process was running,
 * which meant a load balancer kept routing traffic to an instance whose Redis
 * and Postgres were both unreachable.
 *
 * "disabled" is reported distinctly from "degraded" on purpose: an
 * unconfigured dependency is a deployment choice, a configured one that fails
 * to answer is an incident. Collapsing them would either page on a
 * deliberately minimal deployment or hide a real outage.
 *
 * Only a degraded *configured* dependency fails the check, because the API can
 * genuinely serve search and discovery without either.
 */
router.get("/health", async (_req: Request, res: Response): Promise<void> => {
  const dependencies: Record<string, Dependency> = {};

  const backend = cacheBackend();
  if (backend === "redis") {
    const reachable = await cache.ping();
    dependencies.cache = {
      status: reachable ? "ok" : "degraded",
      detail: reachable ? "redis" : "redis unreachable — serving uncached",
    };
  } else {
    dependencies.cache = {
      status: "ok",
      detail: "in-process (not shared, lost on restart)",
    };
  }

  if (isDatabaseEnabled()) {
    const reachable = await pingDatabase();
    dependencies.database = {
      status: reachable ? "ok" : "degraded",
      detail: reachable ? "postgres" : "postgres unreachable",
    };
  } else {
    dependencies.database = {
      status: "disabled",
      detail: "DATABASE_URL unset",
    };
  }

  dependencies.auth = isAuthConfigured()
    ? { status: "ok", detail: "firebase token verification enabled" }
    : { status: "disabled", detail: "FIREBASE_PROJECT_ID unset" };

  dependencies.apiKey = isApiKeyEnforced()
    ? { status: "ok", detail: "enforced" }
    : { status: "disabled", detail: "INTERNAL_API_KEY unset — API is open" };

  const degraded = Object.values(dependencies).some(
    (dependency) => dependency.status === "degraded"
  );

  res.status(degraded ? 503 : 200).json({
    status: degraded ? "degraded" : "ok",
    uptimeSeconds: Math.round(process.uptime()),
    dependencies,
  });
});

/**
 * Response-time and error-rate summary.
 *
 * Behind the API key when one is configured, since it reveals traffic shape.
 */
router.get("/metrics", (_req: Request, res: Response): void => {
  res.json(snapshot());
});

export default router;
