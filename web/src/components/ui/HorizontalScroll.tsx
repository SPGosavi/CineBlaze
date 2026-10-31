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
        className={`absolute left-2 top-[35%] -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-paper-2 text-ink shadow-md transition-opacity duration-short hover:border-muted/50 hover:text-accent focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px] active:translate-y-[-45%] ${
          showLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft size={20} aria-hidden="true" />
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
        className={`absolute right-2 top-[35%] -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-paper-2 text-ink shadow-md transition-opacity duration-short hover:border-muted/50 hover:text-accent focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-[-2px] active:translate-y-[-45%] ${
          showRight ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight size={20} aria-hidden="true" />
      </button>
    </div>
  );
}
