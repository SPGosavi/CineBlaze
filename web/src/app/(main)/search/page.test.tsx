import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/server-api", () => ({
  findMovies: vi.fn(async () => ({
    status: "ok",
    data: [
      {
        id: 10,
        title: "Inception",
        media_type: "movie",
        release_date: "2010-07-16",
        overview: "A thief who steals corporate secrets.",
        poster_path: "/inception.jpg",
      },
    ],
  })),
}));

vi.mock("@/components/search/SearchBar", () => ({
  default: () => <div data-testid="search-bar">SearchBar</div>,
}));

vi.mock("@/components/search/SearchRefinements", () => ({
  default: () => <div data-testid="search-refinements">SearchRefinements</div>,
}));

vi.mock("@/components/media/MediaCard", () => ({
  default: ({ item }: { item: { title: string } }) => (
    <div data-testid="media-card">{item.title}</div>
  ),
}));

import SearchPage from "./page";

describe("Search Page Smoke Test (6B.2)", () => {
  it("renders search layout and handles query searchParams", async () => {
    // Next.js 15 page props have searchParams as a Promise
    const props = {
      params: Promise.resolve({}),
      searchParams: Promise.resolve({ q: "Inception", mode: "ai" }),
    };

    const jsx = await SearchPage(
      props as unknown as Parameters<typeof SearchPage>[0]
    );
    render(jsx);

    expect(screen.getByText(/Search: Inception/i)).toBeInTheDocument();
    expect(screen.getByTestId("search-bar")).toBeInTheDocument();
    expect(screen.getByTestId("search-refinements")).toBeInTheDocument();
  });
});
