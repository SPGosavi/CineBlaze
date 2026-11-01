"use client";

import { SearchMode } from "@cineblaze/shared";
import { useState } from "react";
import Form from "next/form";
import { useFormStatus } from "react-dom";
import { Search, Sparkles, Wand2 } from "lucide-react";
import Button from "@/components/ui/Button";

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
    hint: "Search directly by title name.",
  },
  {
    mode: "recommend",
    label: "Recommend me",
    Icon: Wand2,
    placeholder: "What are you in the mood for?",
    hint: "Share a mood, genre, language, or era.",
  },
] as const;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="ember"
      size="app"
      isLoading={pending}
      disabled={pending}
      className="h-9 px-4 text-xs sm:text-sm font-medium whitespace-nowrap shadow-sm"
    >
      {label}
    </Button>
  );
}

export interface SearchBarProps {
  /** Prefills the box when returning to a results page. */
  defaultQuery?: string;
  autoFocus?: boolean;
  defaultMode?: SearchMode;
  /** Keeps conversational refinements URL-stable across submissions. */
  defaultRefinements?: string[];
}

export default function SearchBar({
  defaultQuery = "",
  autoFocus = false,
  defaultMode = "ai",
  defaultRefinements = [],
}: SearchBarProps) {
  const [mode, setMode] = useState<SearchMode>(defaultMode);

  const currentMeta =
    SEARCH_MODE_META.find((m) => m.mode === mode) || SEARCH_MODE_META[0];

  return (
    <Form action="/search" className="relative mx-auto w-full max-w-2xl">
      <input type="hidden" name="mode" value={mode} />
      {defaultRefinements.map((refinement) => (
        <input key={refinement} type="hidden" name="r" value={refinement} />
      ))}

      {/* Mode Selector Segmented Control */}
      <div className="mb-4 flex w-full justify-center">
        <div
          role="tablist"
          aria-label="Search mode"
          className="flex max-w-full gap-1 rounded-full border border-rule bg-paper-2 p-1"
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
                className={`flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 font-body text-xs sm:text-sm font-medium transition-colors duration-short focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] ${
                  isActive
                    ? "bg-accent text-accent-ink shadow-sm"
                    : "text-muted hover:text-ink hover:bg-paper-3/50"
                }`}
              >
                <meta.Icon
                  size={15}
                  aria-hidden="true"
                  className={isActive ? "text-accent-ink" : "text-muted"}
                />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search Input Line */}
      <div className="relative w-full">
        <label htmlFor="q" className="sr-only">
          {currentMeta.hint}
        </label>
        <Search
          aria-hidden="true"
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
        />
        <input
          id="q"
          name="q"
          type="search"
          required
          defaultValue={defaultQuery}
          autoFocus={autoFocus}
          placeholder={currentMeta.placeholder}
          className="block w-full h-12 rounded-full border border-muted bg-paper pl-11 pr-28 sm:pr-32 font-body text-sm text-ink placeholder:text-muted/60 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px] transition-colors"
        />
        <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
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
      </div>

      <p className="mt-2 text-center font-body text-xs text-muted">
        {currentMeta.hint}
      </p>
    </Form>
  );
}
