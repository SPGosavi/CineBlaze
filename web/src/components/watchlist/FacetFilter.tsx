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

/** Dropdown for filtering the watchlist by facet with Hallmark focus and token styles. */
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
        className={`flex min-h-[36px] min-w-0 items-center justify-between gap-2 rounded-full border border-rule px-3.5 py-1.5 font-body text-xs sm:text-sm font-medium transition-colors duration-short focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] ${
          isOpen || selected !== "All"
            ? "bg-paper-3 text-ink border-muted/50"
            : "bg-paper-2 text-muted hover:text-ink hover:bg-paper-3/60"
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          <Icon
            size={14}
            className={selected === "All" ? "text-muted" : "text-accent"}
            aria-hidden="true"
          />
          <span className="truncate">
            {selected === "All" ? label : selected}
          </span>
        </span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted transition-transform duration-short ${
            isOpen ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="animate-fade-in absolute top-full left-0 z-50 mt-2 max-h-[60vh] w-56 overflow-y-auto rounded-well border border-rule bg-paper-2 shadow-card"
        >
          <div className="scrollbar-thin max-h-64 space-y-0.5 overflow-y-auto p-1.5">
            {options.map((option) => {
              const isSelected = selected === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                  }}
                  className={`flex w-full min-h-[32px] items-center justify-between rounded-lg px-3 py-1.5 text-left font-body text-xs sm:text-sm transition-colors duration-short focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-1 active:translate-y-[1px] ${
                    isSelected
                      ? "bg-paper-3 text-accent font-medium"
                      : "text-ink hover:bg-paper-3/50"
                  }`}
                >
                  <span className="truncate">{option}</span>
                  {isSelected && (
                    <Check
                      size={14}
                      className="shrink-0 text-accent ml-2"
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
