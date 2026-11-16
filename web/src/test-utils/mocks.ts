import { vi } from "vitest";

export const mockFirebaseUser = {
  uid: "test-user-123",
  email: "tester@example.com",
  displayName: "Tester",
  getIdToken: vi.fn(async () => "mock-id-token"),
};

export const mockWatchlistContextValue = {
  watchlist: [],
  categories: {
    watching: [],
    toWatch: [],
    watched: [],
  },
  loading: false,
  error: null,
  addToWatchlist: vi.fn(async () => {}),
  removeFromWatchlist: vi.fn(async () => {}),
  updateStatus: vi.fn(async () => {}),
  isInWatchlist: vi.fn(() => false),
  getStatus: vi.fn(() => null),
  isReady: true,
};

export const mockAuthContextValue = {
  user: mockFirebaseUser,
  loading: false,
  error: null,
  loginWithGoogle: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
};
