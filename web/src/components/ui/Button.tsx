import React, { forwardRef } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export type ButtonVariant = "ember" | "ghost" | "quiet";
export type ButtonSize = "app" | "page";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isSuccess?: boolean;
  isError?: boolean;
  href?: string;
  external?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const baseStyles =
  "relative inline-flex items-center justify-center font-body font-medium transition-colors transition-opacity transition-transform duration-short ease-out select-none focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed disabled:pointer-events-none";

const sizeStyles: Record<ButtonSize, string> = {
  app: "min-h-[36px] min-w-[44px] px-3.5 py-1.5 text-sm rounded-full",
  page: "min-h-[48px] min-w-[44px] px-6 py-3 text-base rounded-full",
};

const variantStyles: Record<ButtonVariant, string> = {
  ember:
    "bg-accent text-accent-ink hover:opacity-95 border border-transparent shadow-sm",
  ghost:
    "bg-transparent text-ink border border-rule hover:bg-paper-2 hover:border-muted/40",
  quiet:
    "bg-transparent text-ink-2 hover:text-ink hover:bg-paper-2 border border-transparent",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "ember",
      size = "app",
      isLoading = false,
      isSuccess = false,
      isError = false,
      disabled = false,
      href,
      external,
      className = "",
      children,
      leftIcon,
      rightIcon,
      type = "button",
      ...props
    },
    ref
  ) => {
    const combinedClassName = [
      baseStyles,
      sizeStyles[size],
      variantStyles[variant],
      isError ? "border-error text-error" : "",
      isSuccess ? "border-success text-success" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    const content = (
      <>
        {isLoading ? (
          <Loader2
            className="w-4 h-4 mr-2 motion-safe:animate-spin shrink-0"
            aria-hidden="true"
          />
        ) : leftIcon ? (
          <span
            className="mr-2 inline-flex shrink-0 items-center"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        ) : null}
        <span className="whitespace-nowrap">{children}</span>
        {!isLoading && rightIcon ? (
          <span
            className="ml-2 inline-flex shrink-0 items-center"
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        ) : null}
      </>
    );

    if (href) {
      if (external) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`${combinedClassName} focus-visible:outline-2 active:translate-y-[1px]`}
            aria-disabled={disabled || isLoading}
          >
            {content}
          </a>
        );
      }
      return (
        <Link
          href={href}
          className={`${combinedClassName} focus-visible:outline-2 active:translate-y-[1px]`}
          aria-disabled={disabled || isLoading}
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        className={`${combinedClassName} focus-visible:outline-2 active:translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed`}
        {...props}
      >
        {content}
      </button>
    );
  }
);

Button.displayName = "Button";
export default Button;
