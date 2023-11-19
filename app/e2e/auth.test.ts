import { hashString, tinyassert } from "@hiogawa/utils";
import { Page, expect } from "@playwright/test";
import { E, T, db } from "../db/drizzle-client.server";
import type { Email } from "../utils/email-utils";
import { test } from "./coverage";
import { useUserE2E, waitForHydration } from "./helper";

test("/users/register success", async ({ page }) => {
  await page.goto("/users/register");
  await waitForHydration(page);

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

test("/users/register error", async ({ page }) => {
  await page.goto("/users/register");
  await waitForHydration(page);

  await page.getByLabel("Username").fill("hello");
  await page.getByLabel("Password", { exact: true }).fill("hi");
  await page.getByLabel("Password confirmation").fill("hi");
  await page.getByRole("button", { name: "Register" }).click();
  await page
    .getByText(
      'Error: [ { "code": "too_small", "minimum": 3, "type": "string", "inclusive": tru'
    )
    .click();
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
    await waitForHydration(page);

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

  test("invalid credentials", async ({ page }) => {
    await page.goto("/users/signin");
    await waitForHydration(page);

    await page.getByLabel("Username").fill(user.data.username);
    await page.getByLabel("Password").fill("asdfjkl;asdf-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByText("Invalid username or password").click();
  });
});

test.describe("/users/me", () => {
  const user = useUserE2E(test, {
    seed: __filename + "/users/me",
  });

  test("with-session", async ({ page }) => {
    await user.signin(page);
    await page.goto("/users/me");
    await waitForHydration(page);

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
    await page.getByText("Signin required").click();
    await expect(page).toHaveURL("/users/signin");
  });
});

test.describe("/users/signout", () => {
  const { signin } = useUserE2E(test, { seed: __filename + "signout" });

  test("basic", async ({ page }) => {
    await signin(page);
    await page.goto("/");
    await waitForHydration(page);

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
    await waitForHydration(page);

    const newEmail = "change-email@dummy.local";
    await page.getByRole("button", { name: "Change email" }).click();
    await page.getByPlaceholder("Input new email...").fill(newEmail);
    await page.getByRole("button", { name: "Send Verification Email" }).click();
    await page.getByText("Verification email is sent successfullly").click();

    // find verification link from dev page
    const emails = await getDevEmails(page);
    const email = emails.find((e) =>
      e.Messages[0].To.find((t) => t.Email === newEmail)
    );
    tinyassert(email);
    const match = email.Messages[0].TextPart?.match(
      /\[Change your email\]\((.+?)\)/
    );
    tinyassert(match);
    const url = new URL(match[1]);

    // visit a link
    await page.goto(url.pathname + url.search);
    await page.getByText("Successfully updated an email").click();
    await page.waitForURL("/users/me");
    await expect(page.getByTestId("me-email")).toHaveValue(newEmail);

    // cannot use a same link
    await page.goto(url.pathname + url.search);
    await page.getByText("invalid email verification link").click();
  });
});

test.describe("reset password", () => {
  const user = useUserE2E(test, {
    seed: __filename + "reset password",
  });

  const userEmail = "reset-password@dummy.local";

  // find reset link from email
  async function findResetPasswordLink(page: Page) {
    const emails = await getDevEmails(page);
    const email = emails.find((e) =>
      e.Messages[0].To.find((t) => t.Email === userEmail)
    );
    tinyassert(email);
    const match = email.Messages[0].TextPart?.match(
      /\[Reset your password\]\((.+?)\)/
    );
    tinyassert(match);
    const urlObj = new URL(match[1]);
    const url = urlObj.pathname + urlObj.search;
    return url;
  }

  test.beforeAll(async () => {
    // set email
    await user.isReady;
    await db
      .update(T.users)
      .set({ email: userEmail })
      .where(E.eq(T.users.id, user.data.id));
  });

  test("logged in", async ({ page }) => {
    // trigger reset password from account
    await user.signin(page);
    await page.goto("/users/me");
    await waitForHydration(page);

    await page.getByRole("button", { name: "Reset password" }).click();
    await page
      .getByText("Please check your email to reset your password")
      .click();

    // find reset link from email
    const url = await findResetPasswordLink(page);

    // submit new password
    const newPassword = "asdfjkl;";
    await page.goto(url);
    await waitForHydration(page);

    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByLabel("Password confirmation").fill(newPassword);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByText("Successfully reset your password").click();

    // cannot use a same link
    await page.goto(url);
    await waitForHydration(page);

    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByLabel("Password confirmation").fill(newPassword);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByText("Something went wrong").click();
  });

  test("forgot password", async ({ page }) => {
    // submit email from "forgot password" page
    await page.goto("/users/signin");
    await waitForHydration(page);
    await page.getByRole("link", { name: "Forgot your password?" }).click();
    await page.getByLabel("Email").fill(userEmail);
    await page.getByRole("button", { name: "Submit" }).click();
    await page
      .getByText("Please check your email to reset your password")
      .click();

    // find reset link from email
    const url = await findResetPasswordLink(page);

    // submit new password
    const newPassword = "12345678";
    await page.goto(url);
    await waitForHydration(page);
    await page.getByLabel("Password", { exact: true }).fill(newPassword);
    await page.getByLabel("Password confirmation").fill(newPassword);
    await page.getByRole("button", { name: "Submit" }).click();
    await page.getByText("Successfully reset your password").click();

    // login with new password
    await page.locator('[data-test="login-icon"]').click();
    await waitForHydration(page);
    await page.getByLabel("Username").fill(user.data.username);
    await page.getByLabel("Password").fill(newPassword);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByText("Successfully signed in").click();
  });
});

async function getDevEmails(page: Page) {
  await page.goto("/dev/emails");
  const emailsRaw = await page.evaluate(() => document.body.textContent);
  tinyassert(emailsRaw);
  const emails: Email[] = JSON.parse(emailsRaw);
  return emails;
}
