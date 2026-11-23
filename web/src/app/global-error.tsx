"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Root error boundary. Catches unhandled errors that bubble past
 * layout boundaries and root layouts.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global application error:", error);
    try {
      Sentry.captureException(error);
    } catch {
      // Sentry uninitialized or disabled in local development
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d0f12] text-[#f2f4f8] flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 text-red-500 mb-2">
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">
            Something went wrong
          </h1>
          <p className="text-sm text-neutral-400">
            {error.message ||
              "A critical error occurred while rendering the page."}
          </p>
          {error.digest && (
            <p className="font-mono text-xs text-neutral-500">
              Error Digest: {error.digest}
            </p>
          )}
          <div className="pt-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/40"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
