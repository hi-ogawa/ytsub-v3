import { expect } from "@playwright/test";
import { test } from "./coverage";

test("/ => /videos/new", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("ytsub-v3");

  // Input
  await page
    .locator("data-test=search-form >> input >> nth=0")
    .fill("EnPYXckiUVg");
  await page.locator("data-test=search-form >> input >> nth=0").press("Enter");

  // Navigate to /vides/new
  await expect(page).toHaveURL("/videos/new?videoId=EnPYXckiUVg");
});

// anonymous
test("/videos/new => /videos/id", async ({ page }) => {
  await page.goto("/videos/new?videoId=EnPYXckiUVg");

  // Check readonly input
  await expect(
    page.locator('data-test=setup-form >> input[type="text"]').nth(1)
  ).toHaveText("");

  // Select language options
  await page
    .locator("data-test=setup-form >> select >> nth=0")
    .selectOption('{"id":".fr"}');
  await page
    .locator("data-test=setup-form >> select >> nth=1")
    .selectOption('{"id":".en"}');

  // Submit
  await page.locator('data-test=setup-form >> button[type="submit"]').click();

  // Navigate to /videos/$id
  await expect(page).toHaveURL(/\/videos\/\d+$/);
});
