import { expect } from "@playwright/test";
import { test } from "./coverage";
import { waitForHydration } from "./helper";

test("title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Ytsub");
});

test("theme", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);
  await page.getByTestId("Navbar-drawer-button").click();

  await page
    .getByRole("combobox", { name: "Theme" })
    .selectOption({ label: "Dark" });
  expect(
    await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    )
  ).toBe("rgb(20, 20, 20)");

  await page
    .getByRole("combobox", { name: "Theme" })
    .selectOption({ label: "Light" });
  expect(
    await page.evaluate(
      () => window.getComputedStyle(document.body).backgroundColor
    )
  ).toBe("rgb(255, 255, 255)");
});

test.describe("/share-target", () => {
  test("basic", async ({ page }) => {
    const query = new URLSearchParams({
      "share-target-text": "https://youtu.be/quCP2lvtWXA",
    });
    await page.goto("/share-target?" + query);
    await expect(page.getByLabel("Author")).toHaveValue("IVE");
  });

  test("error", async ({ page }) => {
    await page.goto("/share-target");
    await page.getByText(`"status": 400`).click();
  });
});
