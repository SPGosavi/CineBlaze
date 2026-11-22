import { test, expect } from "@playwright/test";

test.describe("Home Page Smoke Test", () => {
  test("loads the application shell and title", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/CineBlaze/i);
  });
});
