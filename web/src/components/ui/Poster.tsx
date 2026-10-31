import Image from "next/image";
import Frame from "./Frame";
import { PLACEHOLDER_IMAGE, TMDB_IMAGE_BASE_URL } from "@/lib/constants";

export interface PosterProps {
  path: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
  hasScrim?: boolean;
  standalone?: boolean;
}

/**
 * Media poster backed by `next/image` and integrated with Hallmark `Frame`.
 */
export default function Poster({
  path,
  alt,
  className = "",
  priority = false,
  sizes = "(max-width: 768px) 45vw, 200px",
  hasScrim = false,
  standalone = false,
}: PosterProps) {
  const image = (
    <Image
      src={path ? `${TMDB_IMAGE_BASE_URL}${path}` : PLACEHOLDER_IMAGE}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${className}`}
    />
  );

  if (standalone) {
    return (
      <Frame aspectRatio="poster" hasScrim={hasScrim} className={className}>
        {image}
      </Frame>
    );
  }

  return image;
}
