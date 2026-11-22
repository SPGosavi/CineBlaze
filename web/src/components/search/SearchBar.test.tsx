import { describe, it, expect, vi } from "vitest";
import React, { type ComponentPropsWithoutRef } from "react";
import { render, screen, fireEvent } from "@/test-utils/render";
import SearchBar from "./SearchBar";

// Mock next/form
vi.mock("next/form", () => ({
  __esModule: true,
  default: ({ children, ...props }: ComponentPropsWithoutRef<"form">) => {
    return <form {...props}>{children}</form>;
  },
}));

describe("SearchBar component", () => {
  it("renders search tabs and search input", () => {
    render(<SearchBar defaultQuery="Inception" defaultMode="direct" />);

    expect(screen.getByDisplayValue("Inception")).toBeInTheDocument();
    expect(screen.getByText("Find a title")).toBeInTheDocument();
    expect(screen.getByText("Describe it")).toBeInTheDocument();
    expect(screen.getByText("Recommend me")).toBeInTheDocument();
  });

  it("switches placeholder and hint when mode tab is clicked", () => {
    render(<SearchBar defaultMode="ai" />);

    expect(
      screen.getByPlaceholderText(/A noir detective movie set in 2049/i)
    ).toBeInTheDocument();

    const directTab = screen.getByText("Find a title");
    fireEvent.click(directTab);

    expect(
      screen.getByPlaceholderText(/e\.g\. Inception/i)
    ).toBeInTheDocument();
  });
});
