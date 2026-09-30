import Link from "next/link";
import { FileQuestion } from "lucide-react";
import AppShell from "@/components/layout/AppShell";

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
        <FileQuestion size={48} className="text-neutral-600" />
        <h1 className="text-2xl font-bold text-white">Not found</h1>
        <p className="max-w-md text-sm text-gray-500">
          We couldn&apos;t find that page. Titles live at addresses like{" "}
          <code className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-xs text-gray-400">
            /movie/550
          </code>{" "}
          or{" "}
          <code className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-xs text-gray-400">
            /tv/1396
          </code>
          .
        </p>
        <Link
          href="/"
          className="mt-2 rounded-xl bg-linear-to-r from-red-600 to-orange-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:from-red-500 hover:to-orange-500"
        >
          Back to discover
        </Link>
      </div>
    </AppShell>
  );
}
