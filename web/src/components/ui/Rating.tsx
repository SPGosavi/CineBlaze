import React from "react";
import Figure from "./Figure";
import Label from "./Label";

export interface RatingProps extends React.HTMLAttributes<HTMLDivElement> {
  score?: number | null;
  maxScore?: number;
  source?: "IMDb" | "RT" | "TMDB" | "Metacritic" | string;
  size?: "sm" | "md" | "lg";
}

export function getHeatColorClass(
  score?: number | null,
  maxScore: number = 10
): string {
  if (score == null || isNaN(score)) return "text-muted";
  // Normalize to 10-point scale
  const normalized = maxScore === 100 ? score / 10 : score;

  if (normalized < 5.0) return "text-heat-1";
  if (normalized < 6.5) return "text-heat-2";
  if (normalized < 7.5) return "text-heat-3";
  if (normalized < 8.5) return "text-heat-4";
  return "text-heat-5";
}

/** Rotten Tomatoes Tomatometer color: binary Fresh / Rotten at 60% */
export function getRTColorClass(score?: number | null): string {
  if (score == null || isNaN(score)) return "text-muted";
  if (score < 60) return "text-rt-rotten";
  return "text-rt-fresh";
}

const logoSizeClasses = {
  sm: "h-3.5",
  md: "h-4",
  lg: "h-5",
};

function SourceLogo({
  source,
  score,
  size = "md",
}: {
  source: string;
  score?: number | null;
  size?: "sm" | "md" | "lg";
}) {
  const h = logoSizeClasses[size];

  if (source === "IMDb") {
    return (
      <img
        src="/icons/imdb.svg"
        alt="IMDb"
        className={`inline-block ${h} opacity-80`}
        draggable={false}
      />
    );
  }

  if (source === "RT") {
    const isFresh = score != null && !isNaN(score) && score >= 60;
    return (
      <img
        src={isFresh ? "/icons/rt-fresh.svg" : "/icons/rt-rotten.svg"}
        alt={isFresh ? "Fresh" : "Rotten"}
        className={`inline-block ${h} opacity-90`}
        draggable={false}
      />
    );
  }

  // Fallback for TMDB or other sources — keep text
  return (
    <Label size="xs" className="opacity-80">
      {source}
    </Label>
  );
}

export const Rating: React.FC<RatingProps> = ({
  score,
  maxScore = 10,
  source,
  size = "md",
  className = "",
  ...props
}) => {
  const heatClass =
    source === "RT"
      ? getRTColorClass(score)
      : getHeatColorClass(score, maxScore);

  const displayScore =
    score == null || isNaN(score)
      ? "—"
      : maxScore === 100
        ? `${Math.round(score)}%`
        : score.toFixed(1);

  return (
    <div
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
      {...props}
    >
      {source && <SourceLogo source={source} score={score} size={size} />}
      <Figure value={displayScore} size={size} className={heatClass} />
    </div>
  );
};

export default Rating;
