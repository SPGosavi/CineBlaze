import { test, expect } from "@playwright/test";

test.describe("404 Handling Flow (6B.3)", () => {
  test("navigating to non-existent route shows not found page", async ({
    page,
  }) => {
    const response = await page.goto("/nonexistent-page-test-404");
    if (response) {
      expect([200, 404]).toContain(response.status());
    }

    const bodyText = await page.locator("body").innerText();
    expect(bodyText.toLowerCase()).toMatch(
      /(not found|404|doesn't exist|could not find)/i
    );
  });
});
