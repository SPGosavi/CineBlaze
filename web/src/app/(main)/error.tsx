"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Route-level error boundary.
 *
 * `reset()` re-renders the segment, which re-runs the server fetch — the
 * right affordance for the transient upstream failures the detail and search
 * pages throw on.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle size={48} className="text-orange-500" />
      <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
      <p className="max-w-md text-sm text-gray-500">
        {error.message || "We couldn't load this page."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 flex items-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:from-red-500 hover:to-orange-500"
      >
        <RotateCw size={16} /> Try again
      </button>
      {error.digest && (
        <p className="font-mono text-xs text-neutral-700">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
