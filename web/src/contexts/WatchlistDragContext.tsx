"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type { WatchlistItem, WatchlistStatus } from "@cineblaze/shared";
import Poster from "@/components/ui/Poster";

export type DragTarget =
  | { type: "card"; id: number }
  | { type: "status"; status: WatchlistStatus }
  | null;

interface WatchlistDragContextValue {
  isTouchDragging: boolean;
  draggedItem: WatchlistItem | null;
  dragTarget: DragTarget;
  startTouchDrag: (
    item: WatchlistItem,
    initialPos: { x: number; y: number }
  ) => void;
  cancelTouchDrag: () => void;
}

const WatchlistDragContext = createContext<WatchlistDragContextValue | null>(
  null
);

export function useWatchlistDrag(): WatchlistDragContextValue {
  const ctx = useContext(WatchlistDragContext);
  if (!ctx) {
    return {
      isTouchDragging: false,
      draggedItem: null,
      dragTarget: null,
      startTouchDrag: () => {},
      cancelTouchDrag: () => {},
    };
  }
  return ctx;
}

interface WatchlistDragProviderProps {
  children: ReactNode;
  onReorder: (targetId: number, sourceId: number) => Promise<void>;
  onSetStatus: (id: number, status: WatchlistStatus) => Promise<void>;
}

/**
 * Coordinates touch drag-and-drop interactions across Watchlist components.
 *
 * Provides hit-testing against cards and status targets (tabs/column headers),
 * handles smooth viewport auto-scrolling when dragging near edges, renders a
 * floating drag avatar under the user's touch, and suppresses synthetic clicks
 * when releasing a drag.
 */
export function WatchlistDragProvider({
  children,
  onReorder,
  onSetStatus,
}: WatchlistDragProviderProps) {
  const [isTouchDragging, setIsTouchDragging] = useState(false);
  const [draggedItem, setDraggedItem] = useState<WatchlistItem | null>(null);
  const [touchPos, setTouchPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [dragTarget, setDragTarget] = useState<DragTarget>(null);

  const draggedItemRef = useRef<WatchlistItem | null>(null);
  const dragTargetRef = useRef<DragTarget>(null);
  const touchPosRef = useRef<{ x: number; y: number } | null>(null);

  const startTouchDrag = (
    item: WatchlistItem,
    initialPos: { x: number; y: number }
  ) => {
    draggedItemRef.current = item;
    dragTargetRef.current = null;
    touchPosRef.current = initialPos;
    setDraggedItem(item);
    setTouchPos(initialPos);
    setDragTarget(null);
    setIsTouchDragging(true);
  };

  const cancelTouchDrag = () => {
    setIsTouchDragging(false);
    setDraggedItem(null);
    setTouchPos(null);
    setDragTarget(null);
    draggedItemRef.current = null;
    dragTargetRef.current = null;
    touchPosRef.current = null;
  };

  useEffect(() => {
    if (!isTouchDragging) return;

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      // Prevent browser from scrolling natively while dragging a media card
      if (e.cancelable) {
        e.preventDefault();
      }

      const touch = e.touches[0];
      const pos = { x: touch.clientX, y: touch.clientY };
      touchPosRef.current = pos;
      setTouchPos(pos);

      // Auto-scroll when near top or bottom edges of viewport
      const threshold = 80;
      if (touch.clientY < threshold) {
        const factor = Math.max(1, (threshold - touch.clientY) / 8);
        window.scrollBy({ top: -factor * 6, behavior: "auto" });
      } else if (touch.clientY > window.innerHeight - threshold) {
        const factor = Math.max(
          1,
          (touch.clientY - (window.innerHeight - threshold)) / 8
        );
        window.scrollBy({ top: factor * 6, behavior: "auto" });
      }

      // Hit-test element under finger
      const el = document.elementFromPoint(touch.clientX, touch.clientY);
      const cardEl = el?.closest("[data-watchlist-card-id]");
      const statusEl = el?.closest("[data-watchlist-status-target]");

      let target: DragTarget = null;
      const current = draggedItemRef.current;
      if (cardEl && current) {
        const cardId = Number(cardEl.getAttribute("data-watchlist-card-id"));
        if (cardId && cardId !== current.id) {
          target = { type: "card", id: cardId };
        }
      } else if (statusEl && current) {
        const status = statusEl.getAttribute(
          "data-watchlist-status-target"
        ) as WatchlistStatus;
        if (status && status !== current.status) {
          target = { type: "status", status };
        }
      }

      dragTargetRef.current = target;
      setDragTarget(target);
    };

    const handleWindowTouchEnd = () => {
      // Suppress any synthetic mouse click triggered by touch release
      const suppressClick = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
      };
      window.addEventListener("click", suppressClick, {
        capture: true,
        once: true,
      });
      setTimeout(() => {
        window.removeEventListener("click", suppressClick, { capture: true });
      }, 200);

      const target = dragTargetRef.current;
      const current = draggedItemRef.current;

      if (current && target) {
        if (target.type === "card") {
          void onReorder(target.id, current.id);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(30);
          }
        } else if (target.type === "status") {
          if (current.status !== target.status) {
            void onSetStatus(current.id, target.status);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate(40);
            }
          }
        }
      }

      cancelTouchDrag();
    };

    window.addEventListener("touchmove", handleWindowTouchMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleWindowTouchEnd, {
      passive: true,
    });
    window.addEventListener("touchcancel", handleWindowTouchEnd, {
      passive: true,
    });

    return () => {
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowTouchEnd);
      window.removeEventListener("touchcancel", handleWindowTouchEnd);
    };
  }, [isTouchDragging, onReorder, onSetStatus]);

  return (
    <WatchlistDragContext.Provider
      value={{
        isTouchDragging,
        draggedItem,
        dragTarget,
        startTouchDrag,
        cancelTouchDrag,
      }}
    >
      {children}

      {/* Floating touch drag preview with reduced brightness red ring */}
      {isTouchDragging && draggedItem && touchPos && (
        <div
          className="pointer-events-none fixed z-50 select-none transition-transform duration-75 ease-out"
          style={{
            left: `${touchPos.x}px`,
            top: `${touchPos.y}px`,
            transform: "translate(-50%, -50%) scale(1.06) rotate(2deg)",
            width: "105px",
            height: "155px",
          }}
        >
          <div className="relative h-full w-full overflow-hidden rounded-xl bg-neutral-900 shadow-2xl shadow-black ring-2 ring-red-600/70">
            <Poster
              path={draggedItem.poster_path}
              alt={`${draggedItem.title} poster preview`}
              sizes="105px"
              className="pointer-events-none select-none"
            />
            <div className="absolute inset-x-0 bottom-0 bg-black/85 p-1 text-center backdrop-blur-xs">
              <p className="truncate text-[10px] font-bold text-white">
                {draggedItem.title}
              </p>
            </div>
          </div>
        </div>
      )}
    </WatchlistDragContext.Provider>
  );
}
