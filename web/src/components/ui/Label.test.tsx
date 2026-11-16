import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@/test-utils/render";
import { Label } from "./Label";

describe("Label Component", () => {
  it("renders children text correctly", () => {
    render(<Label>Trending Now</Label>);
    expect(screen.getByText("Trending Now")).toBeInTheDocument();
  });
});
