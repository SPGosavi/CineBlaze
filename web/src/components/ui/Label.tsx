import React from "react";

export type LabelElement =
  "span" | "label" | "dt" | "th" | "figcaption" | "p" | "h2" | "h3";

export interface LabelProps extends React.HTMLAttributes<HTMLElement> {
  as?: LabelElement;
  htmlFor?: string;
  size?: "xs" | "sm";
  children: React.ReactNode;
}

export const Label: React.FC<LabelProps> = ({
  as = "span",
  htmlFor,
  size = "sm",
  className = "",
  children,
  ...props
}) => {
  const Component = as as React.ElementType;
  const sizeClass = size === "xs" ? "text-xs" : "text-sm";

  return (
    <Component
      htmlFor={as === "label" ? htmlFor : undefined}
      className={`font-body font-medium ${sizeClass} text-muted normal-case tracking-normal ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Label;
