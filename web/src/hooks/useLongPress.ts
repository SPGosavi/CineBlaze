"use client";

import { useCallback, useRef, useState } from "react";

const LONG_PRESS_MS = 500;
/** Finger drift past this cancels — the user is scrolling, not pressing. */
const MOVE_TOLERANCE_PX = 10;

/**
 * Reveals a card's action button after a sustained touch.
 *
 * Pointer events rather than touch events so the same handler covers pen and
 * mouse, and `pointercancel` gives a reliable abort when the browser takes
 * over the gesture for a scroll.
 *
 * Drift cancellation is the important part: without it, every flick-scroll
 * that starts on a poster fires a long-press.
 */
export function useLongPress(onLongPress: () => void) {
  const [revealed, setRevealed] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      clearTimer();
      startPosRef.current = { x: event.clientX, y: event.clientY };
      timerRef.current = setTimeout(() => {
        onLongPress();
        setRevealed(true);
      }, LONG_PRESS_MS);
    },
    [clearTimer, onLongPress]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!startPosRef.current || !timerRef.current) return;
      const dx = event.clientX - startPosRef.current.x;
      const dy = event.clientY - startPosRef.current.y;
      if (Math.sqrt(dx * dx + dy * dy) > MOVE_TOLERANCE_PX) {
        clearTimer();
      }
    },
    [clearTimer]
  );

  const onPointerUp = useCallback(() => {
    clearTimer();
    startPosRef.current = null;
  }, [clearTimer]);

  const handlers = {
    onPointerDown,
    onPointerUp,
    onPointerMove,
    onPointerCancel: onPointerUp,
    onPointerLeave: onPointerUp,
  };

  return { revealed, setRevealed, handlers };
}
