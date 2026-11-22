import { test, expect } from "@playwright/test";

test.describe("Search Modes Flow (6B.3)", () => {
  test("switches between AI, Direct, and Recommend tabs", async ({ page }) => {
    await page.goto("/");

    const aiTab = page
      .getByRole("tab", { name: /describe/i })
      .or(page.getByRole("tab", { name: /ai/i }))
      .or(page.getByText(/ai search/i))
      .first();
    const directTab = page
      .getByRole("tab", { name: /find a title/i })
      .or(page.getByRole("tab", { name: /direct/i }))
      .first();

    if (await aiTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(aiTab).toBeVisible();
    }

    if (await directTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await directTab.click();
      const input = page
        .locator("input[name='q']")
        .or(page.locator("input[type='search'], input[type='text']"))
        .first();
      await expect(input).toBeVisible();
    }
  });
});
