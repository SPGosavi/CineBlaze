import React from "react";

export interface FrameProps extends React.HTMLAttributes<HTMLDivElement> {
  hasScrim?: boolean;
  aspectRatio?: "poster" | "backdrop" | "square" | "video";
  children: React.ReactNode;
}

const aspectStyles = {
  poster: "aspect-[2/3]",
  backdrop: "aspect-[16/9]",
  square: "aspect-square",
  video: "aspect-video",
};

export const Frame: React.FC<FrameProps> = ({
  hasScrim = false,
  aspectRatio = "poster",
  className = "",
  children,
  ...props
}) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-paper-2 ring-1 ring-inset ring-ink/10 ${aspectStyles[aspectRatio]} ${className}`}
      {...props}
    >
      {children}
      {hasScrim && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-paper/90 via-paper/40 to-transparent"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default Frame;
