import { type ReactElement } from "react";
import {
  render as rtlRender,
  type RenderOptions,
} from "@testing-library/react";

/**
 * Custom render function that wraps components with common providers if needed.
 */
export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) {
  return rtlRender(ui, { ...options });
}

export * from "@testing-library/react";
