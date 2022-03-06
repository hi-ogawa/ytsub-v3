import { expect, test } from "@playwright/test";

test("index", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("ytsub-v3");
});
