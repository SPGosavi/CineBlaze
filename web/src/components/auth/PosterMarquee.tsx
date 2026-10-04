import Image from "next/image";
import { LOGIN_POSTERS, TMDB_IMAGE_BASE_URL } from "@/lib/constants";

/** Splits the pool into `rows` interleaved slices so no row repeats another. */
function sliceRows(posters: readonly string[], rows: number): string[][] {
  return Array.from({ length: rows }, (_, row) =>
    posters.filter((_, index) => index % rows === row)
  );
}

/**
 * Decorative poster wall for the login page.
 *
 * A Server Component with no client JS: the scroll is a CSS keyframe, and the
 * poster list is a static constant, so the panel paints on first byte with no
 * fetch, no hydration and no loading state.
 *
 * Each row's track is duplicated and translated by exactly -50%, which is what
 * makes the loop seamless — at the end of the cycle the second copy sits
 * precisely where the first began.
 */
export default function PosterMarquee() {
  const rows = sliceRows(LOGIN_POSTERS, 3);

  return (
    <div
      aria-hidden
      className="pointer-events-none relative hidden select-none overflow-hidden md:flex md:flex-col md:justify-center md:gap-4"
    >
      {rows.map((row, index) => (
        <div
          key={index}
          className={`flex w-max gap-4 ${
            index % 2 === 0 ? "animate-marquee-left" : "animate-marquee-right"
          }`}
          style={{ animationDuration: `${55 + index * 10}s` }}
        >
          {[...row, ...row].map((path, position) => (
            <div
              key={`${path}-${position}`}
              className="relative h-56 w-36 shrink-0 overflow-hidden rounded-xl border border-white/5 shadow-2xl"
            >
              <Image
                src={`${TMDB_IMAGE_BASE_URL}${path}`}
                alt=""
                fill
                sizes="144px"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      ))}

      {/* Fades the wall into the page edges and behind the form. */}
      <div className="absolute inset-0 bg-linear-to-r from-black via-transparent to-transparent" />
      <div className="absolute inset-x-0 top-0 h-24 bg-linear-to-b from-black to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 bg-linear-to-t from-black to-transparent" />
    </div>
  );
}
