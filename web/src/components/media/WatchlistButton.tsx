"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plus } from "lucide-react";
import type { SanitizedMedia } from "@cineblaze/shared";
import { useAuthContext } from "@/contexts/AuthContext";
import { useWatchlistContext } from "@/contexts/WatchlistContext";

export interface WatchlistButtonProps {
  item: SanitizedMedia;
  className?: string;
  /** `icon` for the overlay button on a card, `full` for the detail page. */
  variant?: "icon" | "full";
}

/**
 * Add-to-watchlist control.
 *
 * The only interactive island on an otherwise server-rendered card, which is
 * why it is split out rather than making the whole card a Client Component.
 *
 * Signing in is no longer a precondition for browsing, so a signed-out click
 * routes to /login with a return path instead of the action silently doing
 * nothing.
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
    // Cards wrap themselves in a full-bleed link overlay; without this the
    // click would navigate to the detail page instead of saving.
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
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={label}
        className={`flex-1 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-60 ${
          saved
            ? "bg-red-900/20 border border-red-500/50 text-red-500 hover:bg-red-600 hover:text-white"
            : "bg-white text-black hover:bg-gray-200 shadow-lg shadow-white/10"
        } ${className}`}
      >
        {pending ? (
          <Loader2 size={20} className="animate-spin" />
        ) : saved ? (
          <Check size={20} />
        ) : (
          <Plus size={20} />
        )}
        {saved ? "In your watchlist" : "Add to watchlist"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-label={label}
      title={label}
      className={`p-2 rounded-full text-white transition-all shadow-lg active:scale-90 disabled:opacity-60 ${
        saved
          ? "bg-green-600 hover:bg-green-500 shadow-green-900/20"
          : "bg-red-600 hover:bg-red-500 shadow-red-900/20"
      } ${className}`}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : saved ? (
        <Check size={16} strokeWidth={3} />
      ) : (
        <Plus size={16} strokeWidth={3} />
      )}
    </button>
  );
}
