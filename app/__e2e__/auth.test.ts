import { expect, test } from "@playwright/test";
import { useUser } from "./helper";

test("/users/register", async ({ page }) => {
  await page.goto("/users/register");
  // TODO: test registration
  await expect(
    page.locator("data-test=register-form >> button[type=submit]")
  ).toBeDisabled();
});

test("/users/signin", async ({ page }) => {
  await page.goto("/users/signin");
  // TODO: test signin
  await expect(
    page.locator("data-test=signin-form >> button[type=submit]")
  ).toBeDisabled();
});

test.describe("/users/me", () => {
  const { username, signin } = useUser(test, {
    seed: __filename + "/users/me",
  });

  test("with-session", async ({ page }) => {
    await signin(page);
    await page.goto("/users/me");

    // check user data is loaded
    await expect(page.locator("data-test=me-username")).toHaveValue(username);

    // update settings
    await expect(page.locator("text=Save")).toBeDisabled();
    await page.locator('select[name="language1"]').selectOption("fr");
    await page.locator('select[name="language2"]').selectOption("en");
    await expect(page.locator("text=Save")).toBeEnabled();
    await page.locator("text=Save").click();

    // button is disabled again after successful update
    await page.waitForSelector(`"Settings updated successfuly"`);
    await expect(page.locator("text=Save")).toBeDisabled();
    await expect(page.locator('select[name="language1"]')).toHaveValue("fr");
    await expect(page.locator('select[name="language2"]')).toHaveValue("en");
  });

  test("without-session", async ({ page }) => {
    await page.goto("/users/me");
    await expect(page).toHaveURL("/users/signin");
  });
});

test.describe("/users/signout", () => {
  const { signin } = useUser(test, { seed: __filename + "signout" });

  test("basic", async ({ page }) => {
    await signin(page);
    await page.goto("/");

    // Signout from top menu
    await page.locator("header >> data-test=user-menu").click();
    await page.locator("header >> data-test=signout-form >> button").click();

    // Find signin menu
    await page.waitForSelector(`header >> a[href="/users/signin"]`, {
      timeout: 10_000,
    });

    // Not available "/users/me"
    await page.goto("/users/me", { waitUntil: "networkidle" });
    await expect(page).toHaveURL("/users/signin");
  });
});
