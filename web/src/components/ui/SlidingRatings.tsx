"use client";

import React, { useState, useRef, useEffect, useCallback, memo } from "react";

export interface SlidingRatingsProps {
  children: React.ReactNode;
  className?: string;
  isRevealed?: boolean;
}

/**
 * Sliding ratings row that scrolls via marquee animation ONLY if the ratings
 * do not fit in their container. If they fit completely, they remain completely static.
 */
function SlidingRatings({
  children,
  className = "",
  isRevealed = false,
}: SlidingRatingsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = useCallback(() => {
    if (contentRef.current && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      if (containerWidth > 0) {
        // scrollWidth > clientWidth + 1 indicates overflow/truncation
        const overflows = contentRef.current.scrollWidth > containerWidth + 1;
        setIsOverflowing(overflows);
      }
    }
  }, []);

  useEffect(() => {
    checkOverflow();
    window.addEventListener("resize", checkOverflow);
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(checkOverflow);
    }
    return () => window.removeEventListener("resize", checkOverflow);
  }, [checkOverflow, children]);

  useEffect(() => {
    checkOverflow();
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      const ro = new ResizeObserver(() => checkOverflow());
      ro.observe(containerRef.current);
      return () => ro.disconnect();
    }
  }, [checkOverflow]);

  const handleMouseEnter = () => {
    if (!isOverflowing) {
      checkOverflow();
    }
  };

  const hiddenClass = isOverflowing
    ? isRevealed
      ? "hidden"
      : "group-hover:hidden group-focus-within:hidden"
    : "";

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      className={`relative w-full overflow-hidden ${
        isOverflowing
          ? "[mask-image:linear-gradient(to_right,black_85%,transparent)]"
          : ""
      } ${className}`}
    >
      {/* Static ratings: visible when fits or when not hovered/revealed */}
      <div
        ref={(node: HTMLDivElement | null) => {
          contentRef.current = node;
        }}
        className={`flex items-center gap-1.5 whitespace-nowrap ${hiddenClass}`}
      >
        {children}
      </div>

      {/* Marquee sliding ratings ONLY when ratings actually overflow */}
      {isOverflowing && (
        <div
          className={`w-max ${
            isRevealed
              ? "flex animate-marquee-title"
              : "hidden group-hover:flex group-hover:animate-marquee-title group-focus-within:flex group-focus-within:animate-marquee-title"
          } select-none`}
          aria-hidden="true"
        >
          <div className="flex shrink-0 items-center gap-1.5 pr-6">
            {children}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 pr-6">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(SlidingRatings);
