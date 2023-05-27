import { hashString, tinyassert } from "@hiogawa/utils";
import { expect } from "@playwright/test";
import type { Email } from "../utils/email-utils";
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
    const username = "user-" + hashString(__filename + "/users/register").slice(0, 8);
    await page.locator('data-test=register-form >> input[name=username]').fill(username);
    await page.locator('data-test=register-form >> input[name=password]').fill('password');
    await page.locator('data-test=register-form >> input[name=passwordConfirmation]').fill('password');
    await page.locator('data-test=register-form >> button[type=submit]').click();
  }

  // navgiate to root
  await expect(page).toHaveURL("/");
  await page.waitForSelector(`"Successfully registered"`);
});

test.describe("/users/signin", () => {
  const password = "password";
  const user = useUserE2E(test, {
    password,
    seed: __filename + "/users/signin",
  });

  test("basic", async ({ page }) => {
    await page.goto("/");

    // navigate to signin
    await page.locator("header >> data-test=login-icon").click();
    await expect(page).toHaveURL("/users/signin");

    // submit form
    await page.locator('input[name="username"]').fill(user.data.username);
    await page.locator('input[name="password"]').fill(password);
    await page.locator('[data-test="signin-form"] >> text="Sign in"').click();

    // navigate to root
    await expect(page).toHaveURL("/");
    await page.getByText("Successfully signed in").click();
  });

  test("error", async ({ page }) => {
    await user.signin(page);
    await page.goto("/users/signin");
    await page.waitForURL("/users/me");
    await page
      .getByText(`Already signed in as '${user.data.username}'`)
      .click();
  });
});

test.describe("/users/me", () => {
  const user = useUserE2E(test, {
    seed: __filename + "/users/me",
  });

  test("with-session", async ({ page }) => {
    await user.signin(page);
    await page.goto("/users/me");

    // check user data is loaded
    await expect(page.locator("data-test=me-username")).toHaveValue(
      user.data.username
    );

    // disabled initially
    await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();

    // update settings
    await page
      .getByRole("combobox", { name: "1st language" })
      .selectOption("ko");
    await page
      .getByRole("combobox", { name: "2nd language" })
      .selectOption("en");
    await page.locator('input[name="timezone"]').fill("+09:00");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByText("Successfully updated settings").click();

    // check settings are applied
    // prettier-ignore
    async function chcekSettings() {
      // button is disabled back after successful update
      await expect(page.getByRole("button", { name: "Save" })).toBeDisabled();
      await expect(page.getByRole("combobox", { name: "1st language" })).toHaveValue("ko");
      await expect(page.getByRole("combobox", { name: "2nd language" })).toHaveValue("en");
      await expect(page.locator('input[name="timezone"]')).toHaveValue("+09:00");
    }

    // now and after reload
    await chcekSettings();
    await page.goto("/users/me");
    await chcekSettings();
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
    await page.locator('[data-test="user-menu"]').click();
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.getByText("Successfully signed out").click();
  });
});

test.describe("change email", () => {
  const user = useUserE2E(test, {
    seed: __filename + "change email",
  });

  test("basic", async ({ page }) => {
    await user.signin(page);
    await page.goto("/users/me");

    const newEmail = "test@dummy.local";
    await page.locator(".i-ri-edit-box-line").click();
    await page.getByPlaceholder("Input new email...").fill(newEmail);
    await page.getByRole("button", { name: "Send Verification Email" }).click();
    await page.getByText("Verification email is sent successfullly").click();

    // find verification link from dev page
    await page.goto("/dev/emails");
    const emailsRaw = await page.evaluate(() => document.body.textContent);
    tinyassert(emailsRaw);
    const emails: Email[] = JSON.parse(emailsRaw);
    const message = emails[0].Messages[0];
    expect(message.To[0].Email).toEqual(newEmail);
    tinyassert(message.TextPart);

    const match = message.TextPart.match(/\[Change your email\]\((.+?)\)/);
    tinyassert(match);
    const url = new URL(match[1]);
    await page.goto(url.pathname + url.search);
    await page.getByText("Successfully updated an email").click();
    await page.waitForURL("/users/me");
    await expect(page.getByTestId("me-email")).toHaveValue(newEmail);
  });
});
