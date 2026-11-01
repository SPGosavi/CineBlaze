import React from "react";

export interface FigureProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string | number;
  unit?: string;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
  xl: "text-2xl sm:text-3xl",
};

export const Figure: React.FC<FigureProps> = ({
  value,
  unit,
  size = "md",
  className = "",
  ...props
}) => {
  return (
    <span
      className={`font-body font-semibold tabular-nums lining-nums ${sizeClasses[size]} ${className}`}
      {...props}
    >
      <span>{value}</span>
      {unit ? <span className="ml-1 text-xs opacity-75">{unit}</span> : null}
    </span>
  );
};

export default Figure;
