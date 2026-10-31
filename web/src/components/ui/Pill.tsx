import React from "react";
import { X } from "lucide-react";

export interface PillProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  onRemove?: () => void;
  removeLabel?: string;
  size?: "sm" | "md";
  children: React.ReactNode;
}

export const Pill: React.FC<PillProps> = ({
  selected = false,
  onRemove,
  removeLabel = "Remove",
  size = "md",
  disabled = false,
  className = "",
  children,
  onClick,
  ...props
}) => {
  const sizeClass =
    size === "sm"
      ? "min-h-[32px] px-3 py-1 text-xs"
      : "min-h-[36px] px-3.5 py-1.5 text-sm";
  const stateClass = selected
    ? "bg-accent text-accent-ink border-accent font-medium shadow-sm focus-visible:outline-ink"
    : "bg-paper-2 text-ink border-rule hover:border-muted/50 hover:bg-paper-3 focus-visible:outline-focus";

  const disabledClass = disabled
    ? "opacity-55 cursor-not-allowed pointer-events-none"
    : "";

  if (!onRemove) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`inline-flex items-center justify-center rounded-full border font-body font-medium transition-colors transition-opacity transition-transform duration-short ease-out select-none focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed ${sizeClass} ${stateClass} ${disabledClass} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors transition-opacity transition-transform duration-short ease-out select-none ${sizeClass} ${stateClass} ${disabledClass} ${className}`}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="font-body font-medium text-inherit min-h-[32px] inline-flex items-center focus-visible:outline-2 focus-visible:outline-offset-2 rounded-full active:translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed"
        {...props}
      >
        {children}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        aria-label={removeLabel}
        className="ml-0.5 min-h-[32px] min-w-[32px] inline-flex items-center justify-center rounded-full p-1 hover:bg-black/20 focus-visible:outline-2 focus-visible:outline-offset-1 text-inherit opacity-75 hover:opacity-100 active:translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed"
      >
        <X className="w-3.5 h-3.5" aria-hidden="true" />
      </button>
    </span>
  );
};

export default Pill;
