"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Filter } from "lucide-react";

export interface GenreFilterProps {
  genres: string[];
  selected: string;
  onChange: (genre: string) => void;
}

/** Dropdown for filtering the watchlist by genre. Closes on outside click. */
export default function GenreFilter({
  genres,
  selected,
  onChange,
}: GenreFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        event.target instanceof Node &&
        !dropdownRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative z-60" ref={dropdownRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex min-w-[140px] items-center justify-between gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all ${
          isOpen
            ? "bg-neutral-800 text-white ring-1 ring-white/10"
            : "bg-transparent text-gray-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span className="flex items-center gap-2">
          <Filter
            size={14}
            className={selected === "All" ? "text-gray-500" : "text-orange-500"}
          />
          {selected}
        </span>
        <ChevronDown
          size={14}
          className={`text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="animate-fade-in absolute top-full left-0 z-9999 mt-2 max-h-[60vh] w-56 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="scrollbar-thin max-h-64 space-y-0.5 overflow-y-auto p-1.5">
            {genres.map((genre) => (
              <button
                key={genre}
                type="button"
                role="option"
                aria-selected={selected === genre}
                onClick={() => {
                  onChange(genre);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                  selected === genre
                    ? "bg-linear-to-r from-red-600/20 to-orange-600/20 font-semibold text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {genre}
                {selected === genre && (
                  <Check size={14} className="text-orange-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
