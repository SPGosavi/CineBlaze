import { ENABLE_BACKGROUND_JOBS } from "../config.js";
import { isDatabaseEnabled } from "../db/index.js";
import { childLogger } from "../utils/logger.js";
import { refreshTrending, warmDetailCache } from "./cacheJobs.js";
import { refreshTasteProfiles } from "./tasteProfile.js";

const log = childLogger("scheduler");

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

interface ScheduledJob {
  name: string;
  intervalMs: number;
  /** Delay before the first run, to keep boot from stampeding. */
  initialDelayMs: number;
  enabled: () => boolean;
  run: () => Promise<void>;
}

const JOBS: ScheduledJob[] = [
  {
    name: "refresh-trending",
    // Matches the shelves' six-hour TTL, so the refresh lands just as the
    // entries would otherwise go stale.
    intervalMs: 6 * HOUR,
    // Not zero: the first request after a deploy should not be competing with
    // a full shelf rebuild for the outbound concurrency budget.
    initialDelayMs: 30_000,
    enabled: () => true,
    run: refreshTrending,
  },
  {
    name: "warm-detail-cache",
    intervalMs: 6 * HOUR,
    // After refresh-trending, since it reads the shelves that job writes.
    initialDelayMs: 5 * MINUTE,
    enabled: () => true,
    run: warmDetailCache,
  },
  {
    name: "refresh-taste-profiles",
    intervalMs: 12 * HOUR,
    initialDelayMs: 10 * MINUTE,
    enabled: isDatabaseEnabled,
    run: refreshTasteProfiles,
  },
];

const timers: NodeJS.Timeout[] = [];

/**
 * Starts the scheduled jobs.
 *
 * `setInterval` rather than BullMQ. The plan offers either, and a queue earns
 * its keep when jobs are produced dynamically, need retries with visibility,
 * or must be distributed across workers. These three are fixed, periodic,
 * idempotent and individually cheap — a queue would add a Redis dependency
 * for scheduling on top of the one already used for caching, plus a worker
 * process to deploy, and buy nothing. Phase 5's embedding backfill is the
 * workload that would actually justify BullMQ.
 *
 * Each run is chained off the previous one's completion rather than fired on
 * a fixed clock, so a slow run cannot overlap itself.
 */
export function startScheduler(): void {
  if (!ENABLE_BACKGROUND_JOBS) {
    log.info("Background jobs disabled (ENABLE_BACKGROUND_JOBS=false)");
    return;
  }

  for (const job of JOBS) {
    if (!job.enabled()) {
      log.info({ job: job.name }, "Job skipped — dependency not configured");
      continue;
    }

    const execute = async (): Promise<void> => {
      const startedAt = Date.now();
      try {
        await job.run();
        log.info(
          { job: job.name, durationMs: Date.now() - startedAt },
          "Job completed"
        );
      } catch (error) {
        // A throwing job must not take the process down, and must not stop
        // its own schedule.
        log.error(
          { job: job.name, err: (error as Error).message },
          "Job failed"
        );
      } finally {
        const timer = setTimeout(execute, job.intervalMs);
        timer.unref();
        timers.push(timer);
      }
    };

    const initial = setTimeout(execute, job.initialDelayMs);
    initial.unref();
    timers.push(initial);

    log.info(
      { job: job.name, intervalMinutes: job.intervalMs / MINUTE },
      "Job scheduled"
    );
  }
}

export function stopScheduler(): void {
  for (const timer of timers) clearTimeout(timer);
  timers.length = 0;
}
