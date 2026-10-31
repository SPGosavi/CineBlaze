import React from "react";
import { AlertTriangle, SearchX, type LucideIcon } from "lucide-react";

interface StatePanelProps {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  tone: "neutral" | "warning";
}

function StatePanel({ icon: Icon, title, children, tone }: StatePanelProps) {
  const accent = tone === "warning" ? "text-accent" : "text-muted";
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 rounded-well border border-rule bg-paper-2 px-6 py-12">
      <Icon size={36} className={accent} aria-hidden="true" />
      <h3 className="font-display font-medium text-lg text-ink">{title}</h3>
      <div className="max-w-md font-body text-sm text-muted">{children}</div>
    </div>
  );
}

/**
 * "The request succeeded and there is genuinely nothing here."
 */
export function EmptyResults({ query }: { query?: string }) {
  return (
    <StatePanel icon={SearchX} title="No matches found" tone="neutral">
      {query ? (
        <>
          Nothing came back for{" "}
          <span className="text-ink font-medium">&ldquo;{query}&rdquo;</span>.
          Try describing the plot differently, or search the exact title.
        </>
      ) : (
        "Try describing the plot differently, or search the exact title."
      )}
    </StatePanel>
  );
}

/**
 * "The request failed."
 */
export function FailedToLoad({
  what,
  reason,
}: {
  what: string;
  reason?: string;
}) {
  return (
    <StatePanel
      icon={AlertTriangle}
      title={`Couldn't load ${what}`}
      tone="warning"
    >
      This is a problem on our side, not yours. Refresh to try again.
      {reason ? (
        <span className="mt-2 block font-outlier text-xs text-muted/80">
          {reason}
        </span>
      ) : null}
    </StatePanel>
  );
}
