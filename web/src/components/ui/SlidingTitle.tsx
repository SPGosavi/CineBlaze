"use client";

import { useState, useRef, useEffect, useCallback, memo } from "react";
import Link from "next/link";

export interface SlidingTitleProps {
  text: string;
  href?: string;
  className?: string;
  as?: "h3" | "h4" | "p" | "span" | "div";
  isRevealed?: boolean;
}

/**
 * Sliding title that scrolls via marquee animation ONLY if the text
 * does not fit in its container. Fits stay completely static.
 */
function SlidingTitle({
  text,
  href,
  className = "",
  as: Component = "span",
  isRevealed = false,
}: SlidingTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = useCallback(() => {
    if (textRef.current && containerRef.current) {
      const containerWidth = containerRef.current.clientWidth;
      if (containerWidth > 0) {
        // scrollWidth > clientWidth + 1 indicates truncation
        const overflows = textRef.current.scrollWidth > containerWidth + 1;
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
  }, [checkOverflow, text]);

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
          ? "[mask-image:linear-gradient(to_right,black_90%,transparent)]"
          : ""
      }`}
    >
      {/* Static text with truncate */}
      {href ? (
        <Link
          href={href}
          className="block w-full focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-1 rounded transition-colors"
        >
          <Component
            ref={(node: HTMLElement | null) => {
              textRef.current = node;
            }}
            className={`block truncate ${hiddenClass} ${className}`}
            title={text}
          >
            {text}
          </Component>
        </Link>
      ) : (
        <Component
          ref={(node: HTMLElement | null) => {
            textRef.current = node;
          }}
          className={`block truncate ${hiddenClass} ${className}`}
          title={text}
        >
          {text}
        </Component>
      )}

      {/* Marquee sliding text ONLY when the title actually overflows */}
      {isOverflowing && (
        <div
          className={`w-max ${
            isRevealed
              ? "flex animate-marquee-title"
              : "hidden group-hover:flex group-hover:animate-marquee-title group-focus-within:flex group-focus-within:animate-marquee-title"
          }`}
          aria-hidden="true"
        >
          {href ? (
            <>
              <Link href={href} tabIndex={-1}>
                <Component className={`shrink-0 pr-8 ${className}`}>
                  {text}
                </Component>
              </Link>
              <Link href={href} tabIndex={-1}>
                <Component className={`shrink-0 pr-8 ${className}`}>
                  {text}
                </Component>
              </Link>
            </>
          ) : (
            <>
              <Component className={`shrink-0 pr-8 ${className}`}>
                {text}
              </Component>
              <Component className={`shrink-0 pr-8 ${className}`}>
                {text}
              </Component>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default memo(SlidingTitle);
