"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Horizontally scrollable row with arrow controls that fade in only when
 * there is more content to scroll to in that direction.
 */
export default function HorizontalScroll({
  children,
  className = "",
}: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const checkScroll = useCallback(() => {
    const element = scrollRef.current;
    if (!element) return;
    const { scrollLeft, scrollWidth, clientWidth } = element;
    setShowLeft(scrollLeft > 0);
    setShowRight(Math.ceil(scrollLeft + clientWidth) < scrollWidth);
  }, []);

  useEffect(() => {
    checkScroll();
    window.addEventListener("resize", checkScroll);
    return () => window.removeEventListener("resize", checkScroll);
  }, [checkScroll, children]);

  const scroll = (direction: "left" | "right") => {
    const element = scrollRef.current;
    if (!element) return;
    const amount = element.clientWidth * 0.75;
    element.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <div className={`relative group/scroll ${className}`}>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll("left")}
        className={`absolute left-0 top-0 bottom-0 z-20 w-10 md:w-14 bg-gradient-to-r from-paper via-paper/80 to-transparent flex items-center justify-start pl-1 transition-opacity duration-short focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px] ${
          showLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="p-1 rounded-full bg-paper-2/90 border border-rule text-ink hover:text-accent hover:border-muted/50 transition-colors">
          <ChevronLeft size={24} aria-hidden="true" />
        </span>
      </button>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex overflow-x-auto gap-4 pb-4 scroll-smooth scrollbar-hide"
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll("right")}
        className={`absolute right-0 top-0 bottom-0 z-20 w-10 md:w-14 bg-gradient-to-l from-paper via-paper/80 to-transparent flex items-center justify-end pr-1 transition-opacity duration-short focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px] ${
          showRight ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <span className="p-1 rounded-full bg-paper-2/90 border border-rule text-ink hover:text-accent hover:border-muted/50 transition-colors">
          <ChevronRight size={24} aria-hidden="true" />
        </span>
      </button>
    </div>
  );
}
