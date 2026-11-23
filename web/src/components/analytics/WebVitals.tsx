"use client";

import { useReportWebVitals } from "next/web-vitals";

type ReportWebVitalsCallback = Parameters<typeof useReportWebVitals>[0];

/**
 * Core Web Vitals reporting.
 *
 * In development, logs to the console for developer awareness.
 * In production, reports telemetry metrics (CLS, FCP, FID, INP, LCP, TTFB)
 * to `/api/vitals` via `navigator.sendBeacon` (falling back to `fetch` with `keepalive: true`).
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

  if (typeof window !== "undefined") {
    const payload = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    });

    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/vitals", payload);
      } else {
        void fetch("/api/vitals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Telemetry sink error ignored to avoid disrupting UI
        });
      }
    } catch {
      // Fire-and-forget; never disrupt UI
    }
  }
};

export default function WebVitals() {
  useReportWebVitals(report);
  return null;
}
