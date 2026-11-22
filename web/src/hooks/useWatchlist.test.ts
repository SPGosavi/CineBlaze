import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { User } from "firebase/auth";
import type { SanitizedMedia } from "@cineblaze/shared";

// Mock firebase
const mockUnsubscribe = vi.fn();
let snapshotCallback:
  ((snapshot: { exists: () => boolean; data: () => unknown }) => void) | null =
  null;

vi.mock("firebase/firestore", () => ({
  doc: vi.fn(() => ({ id: "mock-doc-ref" })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn((_ref, callback) => {
    snapshotCallback = callback;
    return mockUnsubscribe;
  }),
}));

vi.mock("@/lib/firebase", () => ({
  firebaseInitialized: true,
  requireDb: vi.fn(() => ({})),
}));

vi.mock("@/lib/api", () => ({
  default: {
    post: vi.fn(async () => ({})),
  },
}));

import { useWatchlist } from "./useWatchlist";
import { setDoc } from "firebase/firestore";

describe("useWatchlist hook (6B.2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    snapshotCallback = null;
  });

  it("returns empty watchlist and ready=true when user is null", () => {
    const { result } = renderHook(() => useWatchlist(null));

    expect(result.current.watchlist).toEqual([]);
    expect(result.current.ready).toBe(true);
    expect(result.current.isInWatchlist(123)).toBe(false);
  });

  it("subscribes to firestore snapshot when user is provided", async () => {
    const mockUser = { uid: "user-456" } as User;
    const { result } = renderHook(() => useWatchlist(mockUser));

    expect(result.current.ready).toBe(false);

    // Simulate firestore snapshot
    act(() => {
      if (snapshotCallback) {
        snapshotCallback({
          exists: () => true,
          data: () => ({
            items: [
              {
                id: 101,
                title: "Inception",
                media_type: "movie",
                status: "want",
                addedAt: 12345678,
              },
            ],
          }),
        });
      }
    });

    expect(result.current.ready).toBe(true);
    expect(result.current.watchlist).toHaveLength(1);
    expect(result.current.isInWatchlist(101)).toBe(true);
    expect(result.current.isInWatchlist(999)).toBe(false);
  });

  it("calls firestore when adding an item", async () => {
    const mockUser = { uid: "user-456" } as User;
    const { result } = renderHook(() => useWatchlist(mockUser));

    act(() => {
      if (snapshotCallback) {
        snapshotCallback({
          exists: () => true,
          data: () => ({ items: [] }),
        });
      }
    });

    const itemToAdd = {
      id: 202,
      title: "Interstellar",
      media_type: "movie",
    } as unknown as SanitizedMedia;

    await act(async () => {
      await result.current.add(itemToAdd, "want");
    });

    expect(setDoc).toHaveBeenCalled();
  });

  it("calls firestore when removing an item", async () => {
    const mockUser = { uid: "user-456" } as User;
    const { result } = renderHook(() => useWatchlist(mockUser));

    act(() => {
      if (snapshotCallback) {
        snapshotCallback({
          exists: () => true,
          data: () => ({
            items: [
              {
                id: 303,
                title: "Dunkirk",
                media_type: "movie",
                status: "want",
                addedAt: 1111,
              },
            ],
          }),
        });
      }
    });

    await act(async () => {
      await result.current.remove(303);
    });

    expect(setDoc).toHaveBeenCalled();
  });
});
