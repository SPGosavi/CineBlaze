"use client";

import { useState } from "react";
import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { LOGIN_POSTERS, TMDB_IMAGE_BASE_URL } from "@/lib/constants";
import Frame from "@/components/ui/Frame";

/** Splits the pool into `rows` interleaved slices so no row repeats another. */
function sliceRows(posters: readonly string[], rows: number): string[][] {
  return Array.from({ length: rows }, (_, row) =>
    posters.filter((_, index) => index % rows === row)
  );
}

/**
 * Decorative poster wall for the login page.
 *
 * Includes hover/focus pause affordance and visible pause control (Gate 18).
 * Uses CSS mask-image rather than decorative gradient overlays (Gate 81).
 */
export default function PosterMarquee() {
  const [isPaused, setIsPaused] = useState(false);
  const rows = sliceRows(LOGIN_POSTERS, 3);

  return (
    <div
      aria-label="Movie poster gallery"
      className="group/marquee relative hidden select-none overflow-hidden md:flex md:flex-col md:justify-center md:gap-4 bg-paper [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
    >
      {/* Visible pause control button (Gate 18 requirement for animations > 5s) */}
      <button
        type="button"
        onClick={() => setIsPaused((prev) => !prev)}
        aria-label={isPaused ? "Resume poster marquee" : "Pause poster marquee"}
        aria-pressed={isPaused}
        className="absolute top-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-rule bg-paper-2/90 px-3 py-1.5 font-body text-xs text-muted hover:text-ink hover:bg-paper-3 focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed transition-colors"
      >
        {isPaused ? (
          <>
            <Play size={12} aria-hidden="true" />
            <span>Play</span>
          </>
        ) : (
          <>
            <Pause size={12} aria-hidden="true" />
            <span>Pause</span>
          </>
        )}
      </button>

      {rows.map((row, index) => (
        <div
          key={index}
          className={`flex w-max gap-4 motion-safe:duration-[60s] ${
            index % 2 === 0
              ? "motion-safe:animate-marquee-left"
              : "motion-safe:animate-marquee-right"
          } ${
            isPaused
              ? "[animation-play-state:paused]"
              : "group-hover/marquee:[animation-play-state:paused] group-focus-within/marquee:[animation-play-state:paused]"
          }`}
          style={{ animationDuration: `${55 + index * 10}s` }}
        >
          {[...row, ...row].map((path, position) => (
            <div
              key={`${path}-${position}`}
              className="relative h-56 w-36 shrink-0"
            >
              <Frame aspectRatio="poster">
                <Image
                  src={`${TMDB_IMAGE_BASE_URL}${path}`}
                  alt=""
                  fill
                  sizes="144px"
                  className="object-cover"
                />
              </Frame>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
