"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronDown, Filter, type LucideIcon } from "lucide-react";

export interface FacetFilterProps {
  /** Always includes the "All" sentinel as the first entry. */
  options: string[];
  selected: string;
  onChange: (value: string) => void;
  label: string;
  icon?: LucideIcon;
}

/** Dropdown for filtering the watchlist by facet. Closes on outside click. */
export default function FacetFilter({
  options,
  selected,
  onChange,
  label,
  icon: Icon = Filter,
}: FacetFilterProps) {
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
    <div className={`relative ${isOpen ? "z-50" : "z-10"}`} ref={dropdownRef}>
      <button
        type="button"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen((open) => !open)}
        className={`flex min-w-0 items-center justify-between gap-2 rounded-xl px-4 py-2 text-sm font-medium shadow-sm transition-all ${
          isOpen
            ? "bg-neutral-800 text-white ring-1 ring-white/10"
            : "bg-transparent text-gray-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <Icon
            size={14}
            className={selected === "All" ? "text-gray-500" : "text-orange-500"}
          />
          <span className="truncate">
            {selected === "All" ? label : selected}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="animate-fade-in absolute top-full left-0 z-50 mt-2 max-h-[60vh] w-56 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/95 shadow-2xl backdrop-blur-xl"
        >
          <div className="scrollbar-thin max-h-64 space-y-0.5 overflow-y-auto p-1.5">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                role="option"
                aria-selected={selected === option}
                onClick={() => {
                  onChange(option);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-all ${
                  selected === option
                    ? "bg-linear-to-r from-red-600/20 to-orange-600/20 font-semibold text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-gray-200"
                }`}
              >
                {option}
                {selected === option && (
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
