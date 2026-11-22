import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

import type { AuthState } from "@/hooks/useAuth";

const mockReplace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: (key: string) => (key === "next" ? "/watchlist" : null),
  }),
}));

vi.mock("@/components/auth/PosterMarquee", () => ({
  default: () => <div data-testid="poster-marquee">Marquee</div>,
}));

let mockAuthState: AuthState = {
  user: null,
  loading: false,
  submitting: false,
  loginError: "",
  login: vi.fn(async () => {}),
  signup: vi.fn(async () => {}),
  continueAsGuest: vi.fn(async () => {}),
  logout: vi.fn(async () => {}),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuthContext: () => mockAuthState,
}));

import LoginPage from "./page";

describe("Login Page Smoke Test (6B.2)", () => {
  it("renders email, password inputs, and actions", () => {
    render(<LoginPage />);

    expect(
      screen.getByPlaceholderText(/name@example.com/i)
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/••••••••/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/continue as guest/i)).toBeInTheDocument();
  });

  it("submits login form when user fills credentials", async () => {
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText(/name@example.com/i);
    const passwordInput = screen.getByPlaceholderText(/••••••••/i);

    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.change(passwordInput, { target: { value: "password123" } });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    });

    expect(mockAuthState.login).toHaveBeenCalledWith(
      "test@example.com",
      "password123"
    );
  });

  it("calls continueAsGuest when clicked", async () => {
    render(<LoginPage />);

    await act(async () => {
      fireEvent.click(screen.getByText(/continue as guest/i));
    });

    expect(mockAuthState.continueAsGuest).toHaveBeenCalled();
  });

  it("redirects when user is already authenticated", () => {
    mockAuthState = {
      ...mockAuthState,
      user: { uid: "existing-user" } as unknown as AuthState["user"],
    };

    render(<LoginPage />);
    expect(mockReplace).toHaveBeenCalledWith("/watchlist");
  });
});
