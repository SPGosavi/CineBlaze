"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import type { SanitizedMedia } from "@cineblaze/shared";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWatchlistContext } from "@/contexts/WatchlistContext";
import Button from "@/components/ui/Button";

export interface WatchlistButtonProps {
  item: SanitizedMedia;
  className?: string;
  /** `icon` for the overlay button on a card, `full` for the detail page. */
  variant?: "icon" | "full";
}

/**
 * Add-to-watchlist control with Hallmark token states and focus rings.
 */
export default function WatchlistButton({
  item,
  className = "",
  variant = "icon",
}: WatchlistButtonProps) {
  const router = useRouter();
  const { user } = useAuthContext();
  const { isInWatchlist, add, remove } = useWatchlistContext();
  const [pending, setPending] = useState(false);

  const saved = isInWatchlist(item.id);

  const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (!user) {
      router.push(
        `/login?next=${encodeURIComponent(`/${item.media_type}/${item.id}`)}`
      );
      return;
    }

    setPending(true);
    try {
      await (saved ? remove(item.id) : add(item));
    } finally {
      setPending(false);
    }
  };

  const label = saved ? "Remove from watchlist" : "Add to watchlist";

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant={saved ? "ghost" : "ember"}
        size="page"
        onClick={handleClick}
        disabled={pending}
        isLoading={pending}
        aria-label={label}
        leftIcon={
          saved ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <Plus size={18} aria-hidden="true" />
          )
        }
        className={className}
      >
        {saved ? "In your watchlist" : "Add to watchlist"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={label}
      title={label}
      className={`min-h-[32px] min-w-[32px] p-2 rounded-full border transition-colors transition-opacity transition-transform duration-short ease-out focus-visible:outline-2 focus-visible:outline-focus focus-visible:outline-offset-2 active:translate-y-[1px] disabled:opacity-55 disabled:cursor-not-allowed ${
        saved
          ? "bg-paper-2 text-success border-success/40 hover:bg-paper-3"
          : "bg-paper-2/90 text-ink border-rule hover:text-accent hover:border-muted/50 hover:bg-paper-3"
      } ${className}`}
    >
      {pending ? (
        <Loader2
          size={15}
          className="motion-safe:animate-spin"
          aria-hidden="true"
        />
      ) : saved ? (
        <Check size={15} strokeWidth={2.5} aria-hidden="true" />
      ) : (
        <Plus size={15} strokeWidth={2.5} aria-hidden="true" />
      )}
    </button>
  );
}
