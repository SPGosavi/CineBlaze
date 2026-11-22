import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { AuthProvider, useAuthContext } from "./AuthContext";
import * as useAuthHook from "@/hooks/useAuth";

describe("AuthContext (6B.2)", () => {
  it("throws error when useAuthContext is used outside AuthProvider", () => {
    function ConsumerOutside() {
      useAuthContext();
      return null;
    }

    // Suppress console.error during expected throw
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    expect(() => render(<ConsumerOutside />)).toThrow(
      "useAuthContext must be used within an AuthProvider"
    );
    consoleError.mockRestore();
  });

  it("provides auth state and methods to children", () => {
    const mockLogin = vi.fn(async () => {});
    const mockSignup = vi.fn(async () => {});
    const mockContinueAsGuest = vi.fn(async () => {});
    const mockLogout = vi.fn(async () => {});

    vi.spyOn(useAuthHook, "useAuth").mockReturnValue({
      user: {
        uid: "user-1",
        email: "user1@example.com",
      } as unknown as useAuthHook.AuthState["user"],
      loading: false,
      submitting: false,
      loginError: "",
      login: mockLogin,
      signup: mockSignup,
      continueAsGuest: mockContinueAsGuest,
      logout: mockLogout,
    });

    function Consumer() {
      const auth = useAuthContext();
      return (
        <div>
          <span data-testid="user-email">{auth.user?.email}</span>
          <button onClick={() => auth.login("test@test.com", "pass123")}>
            Login
          </button>
          <button onClick={() => auth.logout()}>Logout</button>
        </div>
      );
    }

    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    );

    expect(screen.getByTestId("user-email")).toHaveTextContent(
      "user1@example.com"
    );

    act(() => {
      screen.getByText("Login").click();
    });
    expect(mockLogin).toHaveBeenCalledWith("test@test.com", "pass123");

    act(() => {
      screen.getByText("Logout").click();
    });
    expect(mockLogout).toHaveBeenCalled();
  });
});
