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
      // scrollWidth or offsetWidth of a w-max container measures the full unconstrained intrinsic width
      const contentWidth = Math.max(
        contentRef.current.scrollWidth,
        contentRef.current.offsetWidth
      );
      if (containerWidth > 0 && contentWidth > 0) {
        const overflows = contentWidth > containerWidth + 1;
        setIsOverflowing(overflows);
      }
    }
  }, []);

  useEffect(() => {
    checkOverflow();
    const raf = requestAnimationFrame(checkOverflow);
    window.addEventListener("resize", checkOverflow);
    if (typeof document !== "undefined" && document.fonts) {
      document.fonts.ready.then(checkOverflow);
    }
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", checkOverflow);
    };
  }, [checkOverflow, children]);

  useEffect(() => {
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
      {/* Base ratings: uses w-max so intrinsic width is always measurable and does not shrink.
          When overflowing and revealed/hovered, uses invisible so layout dimensions are preserved
          and never collapse to zero. */}
      <div
        ref={(node: HTMLDivElement | null) => {
          contentRef.current = node;
        }}
        className={`w-max flex items-center gap-1.5 whitespace-nowrap ${
          isOverflowing
            ? isRevealed
              ? "invisible"
              : "group-hover:invisible group-focus-within:invisible"
            : ""
        }`}
      >
        {children}
      </div>

      {/* Marquee sliding ratings ONLY when ratings actually overflow */}
      {isOverflowing && (
        <div
          className={`absolute inset-0 w-max ${
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
