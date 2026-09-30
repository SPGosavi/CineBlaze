"use client";

import { useReportWebVitals } from "next/web-vitals";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

/**
 * Core Web Vitals reporting.
 *
 * Logs to the console in development and is a no-op in production until an
 * analytics sink exists — Phase 4 adds real observability, and wiring a
 * half-analytics here would just be dead code to rip out.
 *
 * Declared at module scope so the callback identity never changes;
 * `useReportWebVitals` replays buffered metrics into any new function it is
 * handed, so an inline arrow would report duplicates on every render.
 */
const report: ReportWebVitalsCallback = (metric) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(
      `[web-vitals] ${metric.name} ${Math.round(metric.value)} (${metric.rating})`
    );
  }
};

export default function WebVitals() {
  useReportWebVitals(report);
  return null;
}
