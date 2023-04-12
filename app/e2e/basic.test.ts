import { expect } from "@playwright/test";
import { test } from "./coverage";

test("title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Ytsub");
});
