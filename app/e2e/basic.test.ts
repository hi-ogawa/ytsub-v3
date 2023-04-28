import { expect } from "@playwright/test";
import { test } from "./coverage";

test("title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Ytsub");
});

test("theme", async ({ page }) => {
  await page.goto("/");
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
