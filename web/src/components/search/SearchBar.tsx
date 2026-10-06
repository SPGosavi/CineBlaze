"use client";

import { SearchMode } from "@cineblaze/shared";
import { useState } from "react";
import Form from "next/form";
import { useFormStatus } from "react-dom";
import { Search, Sparkles, Wand2 } from "lucide-react";

const SEARCH_MODE_META = [
  {
    mode: "ai",
    label: "Describe it",
    Icon: Sparkles,
    placeholder: "e.g. A noir detective movie set in 2049...",
    hint: "Describe a plot, a scene, or a vibe.",
  },
  {
    mode: "direct",
    label: "Find a title",
    Icon: Search,
    placeholder: "e.g. Inception",
    hint: "Already know it? Search by name.",
  },
  {
    mode: "recommend",
    label: "Recommend me",
    Icon: Wand2,
    placeholder: "e.g. A Tamil thriller from the 2010s",
    hint: "Tell us a genre, language or era.",
  },
] as const;

function SubmitButton({ label }: { label: string }) {
  // Reads the pending state of the enclosing <Form>. Scoped to its own
  // component because useFormStatus only reports on the form above it.
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="absolute top-2 right-2 bottom-2 flex items-center gap-2 rounded-xl bg-linear-to-r from-red-600 to-orange-600 px-3 text-sm sm:px-5 sm:text-base font-bold text-white shadow-lg transition-all hover:from-red-500 hover:to-orange-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {pending ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        label
      )}
    </button>
  );
}

export interface SearchBarProps {
  /** Prefills the box when returning to a results page. */
  defaultQuery?: string;
  autoFocus?: boolean;
  defaultMode?: SearchMode;
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
  defaultMode = "ai",
}: SearchBarProps) {
  const [mode, setMode] = useState<SearchMode>(defaultMode);

  const currentMeta =
    SEARCH_MODE_META.find((m) => m.mode === mode) || SEARCH_MODE_META[0];

  return (
    <Form action="/search" className="group relative mx-auto max-w-2xl">
      <input type="hidden" name="mode" value={mode} />

      <div className="mb-4 sm:mb-5 flex w-full justify-center">
        <div
          role="tablist"
          aria-label="Search mode"
          className="flex max-w-full gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-black/40 p-1 sm:p-1.5 backdrop-blur-sm scrollbar-hide"
        >
          {SEARCH_MODE_META.map((meta) => {
            const isActive = mode === meta.mode;
            return (
              <button
                key={meta.mode}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setMode(meta.mode)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-xl px-4 py-2 sm:px-5 sm:py-2 text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-white/10 text-white shadow-sm ring-1 ring-white/20"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                <meta.Icon
                  size={16}
                  aria-hidden
                  className={isActive ? "text-orange-400" : "text-gray-500"}
                />
                <span className="hidden sm:inline">{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="absolute inset-0 top-[3.5rem] rounded-2xl bg-linear-to-r from-red-500 to-orange-500 opacity-25 blur transition-opacity duration-300 group-hover:opacity-40" />
      <div className="relative flex items-center">
        <label htmlFor="q" className="sr-only">
          {currentMeta.hint}
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
          placeholder={currentMeta.placeholder}
          className="w-full rounded-2xl border border-white/10 bg-neutral-900/90 p-4 pr-28 sm:pr-32 pl-12 text-base text-white shadow-xl transition-all outline-hidden placeholder:text-gray-500 focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
        />
        <SubmitButton
          label={
            currentMeta.mode === "recommend"
              ? "Recommend"
              : currentMeta.mode === "direct"
                ? "Search"
                : "Find"
          }
        />
      </div>
      <p className="mt-2 text-center text-sm text-gray-400 font-medium">
        {currentMeta.hint}
      </p>
    </Form>
  );
}
