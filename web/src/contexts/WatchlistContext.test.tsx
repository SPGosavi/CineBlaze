import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { WatchlistProvider, useWatchlistContext } from "./WatchlistContext";
import * as AuthContextModule from "./AuthContext";
import type { AuthState } from "@/hooks/useAuth";
import * as useWatchlistHook from "@/hooks/useWatchlist";
import type { SanitizedMedia, WatchlistItem } from "@cineblaze/shared";

describe("WatchlistContext (6B.2)", () => {
  it("throws error when useWatchlistContext is used outside WatchlistProvider", () => {
    function ConsumerOutside() {
      useWatchlistContext();
      return null;
    }

    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => render(<ConsumerOutside />)).toThrow(
      "useWatchlistContext must be used within a WatchlistProvider"
    );
    consoleError.mockRestore();
  });

  it("provides watchlist state and mutations to children", () => {
    vi.spyOn(AuthContextModule, "useAuthContext").mockReturnValue({
      user: { uid: "test-user-123" } as unknown as AuthState["user"],
      loading: false,
      submitting: false,
      loginError: "",
      login: vi.fn(),
      signup: vi.fn(),
      continueAsGuest: vi.fn(),
      logout: vi.fn(),
    });

    const mockAdd = vi.fn(async () => {});
    const mockRemove = vi.fn(async () => {});
    const mockSetStatus = vi.fn(async () => {});
    const mockIsInWatchlist = vi.fn((id: number) => id === 42);

    vi.spyOn(useWatchlistHook, "useWatchlist").mockReturnValue({
      watchlist: [
        {
          id: 42,
          title: "The Matrix",
          media_type: "movie",
          status: "want",
          addedAt: Date.now(),
        } as unknown as WatchlistItem,
      ],
      ready: true,
      error: null,
      isInWatchlist: mockIsInWatchlist,
      add: mockAdd,
      remove: mockRemove,
      setStatus: mockSetStatus,
      reorder: vi.fn(),
      onDragStart: vi.fn(),
      onDragOver: vi.fn(),
      onDropInColumn: vi.fn(),
    });

    function Consumer() {
      const { watchlist, isInWatchlist, add, remove } = useWatchlistContext();
      return (
        <div>
          <span data-testid="count">{watchlist.length}</span>
          <span data-testid="is-in">{isInWatchlist(42) ? "yes" : "no"}</span>
          <button
            onClick={() =>
              add({
                id: 99,
                title: "Interstellar",
                media_type: "movie",
              } as SanitizedMedia)
            }
          >
            Add
          </button>
          <button onClick={() => remove(42)}>Remove</button>
        </div>
      );
    }

    render(
      <WatchlistProvider>
        <Consumer />
      </WatchlistProvider>
    );

    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("is-in")).toHaveTextContent("yes");

    act(() => {
      screen.getByText("Add").click();
    });
    expect(mockAdd).toHaveBeenCalled();

    act(() => {
      screen.getByText("Remove").click();
    });
    expect(mockRemove).toHaveBeenCalledWith(42);
  });
});
