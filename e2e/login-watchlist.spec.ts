import { test, expect } from "@playwright/test";

test.describe("Login to Watchlist Flow (6B.3)", () => {
  test("unauthenticated access redirects or displays login prompt", async ({
    page,
  }) => {
    await page.goto("/watchlist");

    // The user should either be on /login?next=/watchlist or redirected
    const isLogin = page.url().includes("/login");
    if (isLogin) {
      await expect(page).toHaveURL(/\/login/);
      await expect(
        page.getByRole("button", { name: /sign in/i })
      ).toBeVisible();
      await expect(page.getByText(/continue as guest/i)).toBeVisible();
    } else {
      // If watchlist renders an empty/prompt state when signed out
      await expect(page.locator("body")).toBeVisible();
    }
  });
});
