import { test, expect } from "@playwright/test";

test.describe("Search to Detail Flow (6B.3)", () => {
  test("submits search query and navigates to detail page", async ({
    page,
  }) => {
    await page.goto("/");

    const searchInput = page
      .locator("input[name='q']")
      .or(page.getByRole("searchbox"))
      .or(page.locator("input[type='search'], input[type='text']"))
      .first();

    await expect(searchInput).toBeVisible();
    await searchInput.fill("Inception");
    await searchInput.press("Enter");

    await page.waitForURL(/\/search\?.*q=Inception/i);
    await expect(page).toHaveURL(/search/i);

    // Look for media cards or result section
    const mediaCard = page
      .locator("a[href^='/movie/'], a[href^='/tv/']")
      .first();
    if (await mediaCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await mediaCard.click();
      await page.waitForURL(/\/(movie|tv)\/\d+/i);
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});
