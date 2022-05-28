import { expect } from "@playwright/test";
import { sha256 } from "../utils/auth";
import { test } from "./coverage";
import { useUserE2E } from "./helper";

test("/users/register", async ({ page }) => {
  await page.goto("/");

  // navigate to signin
  await page.locator("header >> data-test=login-icon").click();
  await expect(page).toHaveURL("/users/signin");

  // navigate to register
  await page.locator("data-test=signin-form >> text=Register").click();
  await expect(page).toHaveURL("/users/register");

  // submit form
  // prettier-ignore
  {
    const username = "user-" + sha256(__filename + "/users/register", "hex").slice(0, 8);
    await page.locator('data-test=register-form >> input[name=username]').fill(username);
    await page.locator('data-test=register-form >> input[name=password]').fill('password');
    await page.locator('data-test=register-form >> input[name=passwordConfirmation]').fill('password');
    await page.locator('data-test=register-form >> button[type=submit]').click();
  }

  // navgiate to root
  await expect(page).toHaveURL("/");
  await page.waitForSelector(`"Successfully registered"`);
});

test("/users/signin", async ({ page }) => {
  await page.goto("/");

  // navigate to signin
  await page.locator("header >> data-test=login-icon").click();
  await expect(page).toHaveURL("/users/signin");

  // submit form
  await page.locator('input[name="username"]').fill("dev");
  await page.locator('input[name="password"]').fill("dev");
  await page.locator('[data-test="signin-form"] >> text="Sign in"').click();

  // navigate to root
  await expect(page).toHaveURL("/");
  await page.waitForSelector(`"Successfully signed in as 'dev'"`);
});

test.describe("/users/me", () => {
  const { user, signin } = useUserE2E(test, {
    seed: __filename + "/users/me",
  });

  test("with-session", async ({ page }) => {
    await signin(page);
    await page.goto("/users/me");

    // check user data is loaded
    await expect(page.locator("data-test=me-username")).toHaveValue(
      user().username
    );

    // update settings
    await expect(page.locator("text=Save")).toBeDisabled();
    await page.locator('select[name="language1"]').selectOption("fr");
    await page.locator('select[name="language2"]').selectOption("en");
    await page.locator('input[name="timezone"]').fill("+09:00");
    await expect(page.locator("text=Save")).toBeEnabled();
    await page.locator("text=Save").click();

    // button is disabled again after successful update
    await page.waitForSelector(`"Settings updated successfuly"`);
    await expect(page.locator("text=Save")).toBeDisabled();
    await expect(page.locator('select[name="language1"]')).toHaveValue("fr");
    await expect(page.locator('select[name="language2"]')).toHaveValue("en");
    await expect(page.locator('input[name="timezone"]')).toHaveValue("+09:00");
  });

  test("without-session", async ({ page }) => {
    await page.goto("/users/me");
    await expect(page).toHaveURL("/users/signin");
  });
});

test.describe("/users/signout", () => {
  const { signin } = useUserE2E(test, { seed: __filename + "signout" });

  test("basic", async ({ page }) => {
    await signin(page);
    await page.goto("/");

    // Signout from top menu
    await page.locator("header >> data-test=user-menu").click();
    await page.locator("header >> data-test=signout-form >> button").click();
    await page.waitForSelector('"Signed out successfuly"');
  });
});
