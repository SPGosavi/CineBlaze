import Image from "next/image";
import { PLACEHOLDER_IMAGE, TMDB_IMAGE_BASE_URL } from "@/lib/constants";

export interface PosterProps {
  path: string | null;
  alt: string;
  className?: string;
  /**
   * Set on the handful of posters above the fold. Everything else stays lazy,
   * which matters on Discover where three shelves render ~36 images.
   */
  priority?: boolean;
  sizes?: string;
}

/**
 * Media poster backed by `next/image`.
 *
 * A Server Component, so it costs no client JS. That rules out the `onError`
 * placeholder swap the Phase 2 version used; instead a missing `poster_path`
 * resolves to the placeholder up front, and TMDB paths are trusted because
 * they came from TMDB's own response.
 */
export default function Poster({
  path,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 45vw, 200px",
}: PosterProps) {
  return (
    <Image
      src={path ? `${TMDB_IMAGE_BASE_URL}${path}` : PLACEHOLDER_IMAGE}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );
}
