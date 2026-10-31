"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import Button from "@/components/ui/Button";

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
      <AlertTriangle size={48} className="text-accent" aria-hidden="true" />
      <h1 className="text-3xl font-display font-medium text-ink">
        Something went wrong
      </h1>
      <p className="max-w-md text-sm text-muted">
        {error.message || "We couldn't load this page."}
      </p>
      <div className="mt-2">
        <Button
          variant="ember"
          onClick={reset}
          leftIcon={<RotateCw size={16} />}
        >
          Try again
        </Button>
      </div>
      {error.digest && (
        <p className="font-mono text-xs text-muted">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
