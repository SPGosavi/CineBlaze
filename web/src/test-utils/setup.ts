import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

// Mock server-only so Server Components can be tested in Vitest JSDOM
vi.mock("server-only", () => ({}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next/image
vi.mock("next/image", () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => {
    return React.createElement("img", {
      ...props,
      alt: typeof props.alt === "string" ? props.alt : "",
    });
  },
}));
