import { expect, test } from "@playwright/test";

test("index => setup", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("ytsub-v3");

  // Input
  await page
    .locator("data-test=search-form >> input >> nth=0")
    .fill("EnPYXckiUVg");
  await page.locator("data-test=search-form >> input >> nth=0").press("Enter");

  // Navigate to /setup
  await expect(page).toHaveURL("/setup?videoId=EnPYXckiUVg");
});

test("setup => watch", async ({ page }) => {
  await page.goto("/setup?videoId=EnPYXckiUVg");

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

  // Navigate to /watch
  await expect(page).toHaveURL(
    "/watch?videoId=EnPYXckiUVg&language1.id=.fr&language1.translation=&language2.id=.en&language2.translation="
  );
});
