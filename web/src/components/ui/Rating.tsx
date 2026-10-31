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

export const Rating: React.FC<RatingProps> = ({
  score,
  maxScore = 10,
  source,
  size = "md",
  className = "",
  ...props
}) => {
  const heatClass = getHeatColorClass(score, maxScore);
  const displayScore =
    score == null || isNaN(score)
      ? "—"
      : maxScore === 100
        ? `${Math.round(score)}%`
        : score.toFixed(1);

  return (
    <div
      className={`inline-flex items-baseline gap-1.5 select-none ${className}`}
      {...props}
    >
      <Figure value={displayScore} size={size} className={heatClass} />
      {source && (
        <Label size="xs" className="opacity-80">
          {source}
        </Label>
      )}
    </div>
  );
};

export default Rating;
