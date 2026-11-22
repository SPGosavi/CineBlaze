import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server-api", () => ({
  getTrending: vi.fn(async (shelf: string) => ({
    status: "ok",
    data: [
      {
        id: 1,
        title: `Mock Title for ${shelf}`,
        media_type: "movie",
        poster_path: "/test.jpg",
      },
    ],
  })),
}));

vi.mock("@/components/search/SearchBar", () => ({
  default: () => <div data-testid="search-bar">Search Bar Mock</div>,
}));

vi.mock("@/components/search/MoodChips", () => ({
  default: () => <div data-testid="mood-chips">Mood Chips Mock</div>,
}));

vi.mock("@/components/personalization/ForYouShelf", () => ({
  default: () => <div data-testid="for-you-shelf">For You Shelf Mock</div>,
}));

import DiscoverPage from "./page";

describe("Home Page Smoke Test (6B.2)", () => {
  it("renders page headline, search bar, and shelf components", () => {
    render(<DiscoverPage />);

    expect(
      screen.getByText("Find a film by plot, scene, or title.")
    ).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
    expect(screen.getByTestId("mood-chips")).toBeInTheDocument();
    expect(screen.getByTestId("for-you-shelf")).toBeInTheDocument();
  });
});
