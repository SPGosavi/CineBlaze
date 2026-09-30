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
        className={`absolute left-0 top-0 bottom-0 z-20 w-8 md:w-12 bg-linear-to-r from-black via-black/70 to-transparent flex items-center justify-center transition-opacity duration-300 ${
          showLeft ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronLeft
          size={32}
          className="text-white drop-shadow-lg hover:text-red-500 transition-colors"
        />
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
        className={`absolute right-0 top-0 bottom-0 z-20 w-8 md:w-12 bg-linear-to-l from-black via-black/70 to-transparent flex items-center justify-center transition-opacity duration-300 ${
          showRight ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <ChevronRight
          size={32}
          className="text-white drop-shadow-lg hover:text-red-500 transition-colors"
        />
      </button>
    </div>
  );
}
