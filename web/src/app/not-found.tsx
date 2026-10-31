import { FileQuestion } from "lucide-react";
import AppShell from "@/components/layout/AppShell";
import Button from "@/components/ui/Button";

/**
 * The app's only 404.
 *
 * Handles both URLs that match no route at all and `notFound()` thrown by the
 * detail page for a bad media type or an id TMDB does not have.
 *
 * There is deliberately no `loading.tsx` anywhere above it. A segment-level
 * `loading.tsx` wraps the segment in a Suspense boundary, which makes Next
 * start streaming before the page has decided anything — and a streamed
 * response cannot change its status, so every 404 came back as HTTP 200 with
 * a `noindex` tag. The pages here already Suspense their individually slow
 * parts (trending shelves, search grid, similar-titles row), so the
 * segment-level boundary bought nothing and cost the status code.
 *
 * It renders `AppShell` itself because the shell lives in the `(main)` route
 * group's layout, and an unmatched URL never enters that group.
 */
export default function NotFound() {
  return (
    <AppShell>
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <FileQuestion size={48} className="text-muted" aria-hidden="true" />
        <h1 className="text-3xl font-display font-medium text-ink">
          Not found
        </h1>
        <p className="max-w-md text-sm text-muted">
          We couldn&apos;t find that page. Titles live at addresses like{" "}
          <code className="rounded border border-rule bg-paper-3 px-1.5 py-0.5 font-mono text-xs text-ink">
            /movie/550
          </code>{" "}
          or{" "}
          <code className="rounded border border-rule bg-paper-3 px-1.5 py-0.5 font-mono text-xs text-ink">
            /tv/1396
          </code>
          .
        </p>
        <div className="mt-2">
          <Button href="/" variant="ember">
            Back to discover
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
