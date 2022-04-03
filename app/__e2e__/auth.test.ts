import { expect, test } from "@playwright/test";
import { useUser } from "./helper";

test("register", async ({ page }) => {
  await page.goto("/users/register");
  // TODO: test registration
  await expect(
    page.locator("data-test=register-form >> button[type=submit]")
  ).toBeDisabled();
});

test("signin", async ({ page }) => {
  await page.goto("/users/signin");
  // TODO: test signin
  await expect(
    page.locator("data-test=signin-form >> button[type=submit]")
  ).toBeDisabled();
});

test.describe("/users/me", () => {
  const username = "root-me";
  const signin = useUser(test, { username });

  test("with-session", async ({ page }) => {
    await signin(page);
    await page.goto("/users/me");
    await expect(page.locator("data-test=me-username")).toHaveValue("root-me");
  });

  test("without-session", async ({ page }) => {
    await page.goto("/users/me");
    await expect(page).toHaveURL("/users/signin");
  });
});

test.describe("signout", () => {
  const username = "root-me";
  const signin = useUser(test, { username });

  test("basic", async ({ page }) => {
    await signin(page);
    await page.goto("/");

    // Signout from top menu
    await page.pause();
    await page.locator('header >> data-test=user-menu').click();
    await page.locator('header >> data-test=signout-form >> button').click();

    // Not available "/users/me"
    await page.goto("/users/me");
    await expect(page).toHaveURL("/users/signin");
  });
});
