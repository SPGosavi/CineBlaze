import { AlertTriangle, SearchX, type LucideIcon } from "lucide-react";

interface StatePanelProps {
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
  tone: "neutral" | "warning";
}

function StatePanel({ icon: Icon, title, children, tone }: StatePanelProps) {
  const accent = tone === "warning" ? "text-orange-500" : "text-neutral-600";
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 rounded-2xl border border-dashed border-neutral-800 bg-neutral-900/30 px-6 py-14">
      <Icon size={40} className={accent} />
      <h3 className="text-lg font-bold text-gray-200">{title}</h3>
      <div className="max-w-md text-sm text-gray-500">{children}</div>
    </div>
  );
}

/**
 * "The request succeeded and there is genuinely nothing here."
 *
 * Phase 2 had no such state: a search returning zero results fell straight
 * back to the trending shelves, so after a ~30s wait the page looked
 * unchanged and the user could not tell whether the search had run, failed,
 * or found nothing. Echoing the query back is what makes the difference
 * legible.
 */
export function EmptyResults({ query }: { query?: string }) {
  return (
    <StatePanel icon={SearchX} title="No matches found" tone="neutral">
      {query ? (
        <>
          Nothing came back for{" "}
          <span className="text-gray-300 font-medium">
            &ldquo;{query}&rdquo;
          </span>
          . Try describing the plot differently, or search the exact title.
        </>
      ) : (
        "Try describing the plot differently, or search the exact title."
      )}
    </StatePanel>
  );
}

/**
 * "The request failed."
 *
 * Distinct from `EmptyResults` on purpose. `useTrending` in Phase 2 collapsed
 * every error into `[]`, which rendered as a section heading above empty
 * space — indistinguishable from a shelf that legitimately had no titles.
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
        <span className="mt-2 block font-mono text-xs text-neutral-600">
          {reason}
        </span>
      ) : null}
    </StatePanel>
  );
}
