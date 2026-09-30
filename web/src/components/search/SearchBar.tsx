"use client";

import Form from "next/form";
import { useFormStatus } from "react-dom";
import { Search } from "lucide-react";

function SubmitButton() {
  // Reads the pending state of the enclosing <Form>. Scoped to its own
  // component because useFormStatus only reports on the form above it.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="absolute top-2 right-2 bottom-2 flex items-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-orange-600 px-5 font-bold text-white shadow-lg transition-all hover:from-red-500 hover:to-orange-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        "Find"
      )}
    </button>
  );
}

export interface SearchBarProps {
  /** Prefills the box when returning to a results page. */
  defaultQuery?: string;
  autoFocus?: boolean;
}

/**
 * The search entry point.
 *
 * Submits to `/search?q=...` rather than holding results in a context. That
 * is the central Phase 3 change: a search is now a URL, so results are
 * shareable, linkable, server-rendered and crawlable, and the browser's back
 * button works through a search history.
 *
 * `next/form` keeps this a real GET form, so it still works without JS and
 * lets Next prefetch the results route's loading UI on interaction.
 */
export default function SearchBar({
  defaultQuery = "",
  autoFocus = false,
}: SearchBarProps) {
  return (
    <Form action="/search" className="group relative mx-auto max-w-2xl">
      <div className="absolute inset-0 rounded-2xl bg-linear-to-r from-red-500 to-orange-500 opacity-25 blur transition-opacity duration-300 group-hover:opacity-40" />
      <div className="relative flex items-center">
        <label htmlFor="q" className="sr-only">
          Describe a movie or series
        </label>
        <Search
          aria-hidden
          size={20}
          className="absolute left-4 text-gray-400 transition-colors group-focus-within:text-red-400"
        />
        <input
          id="q"
          name="q"
          type="search"
          required
          defaultValue={defaultQuery}
          autoFocus={autoFocus}
          placeholder="e.g. A noir detective movie set in 2049..."
          className="w-full rounded-2xl border border-white/10 bg-neutral-900/90 p-4 pr-24 pl-12 text-base text-white shadow-xl transition-all outline-hidden placeholder:text-gray-500 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
        />
        <SubmitButton />
      </div>
    </Form>
  );
}
