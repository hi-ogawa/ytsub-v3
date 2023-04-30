import { expect } from "@playwright/test";
import { E, T, db } from "../db/drizzle-client.server";
import { test } from "./coverage";
import { useUserE2E } from "./helper";

test.describe("videos-signed-in", () => {
  const user = useUserE2E(test, {
    seed: __filename + "/users/me",
  });

  test("new-video => show-video => new-bookmark => list-bookmarks", async ({
    page,
  }) => {
    await user.signin(page);

    //
    // navigate to /videos/new to create https://www.youtube.com/watch?v=EnPYXckiUVg with fr/en
    //

    await page.goto("/videos/new?videoId=EnPYXckiUVg");
    await page
      .locator("data-test=setup-form >> select >> nth=0")
      .selectOption('{"id":".fr"}');
    await page
      .locator("data-test=setup-form >> select >> nth=1")
      .selectOption('{"id":".en"}');
    await page.locator('data-test=setup-form >> button[type="submit"]').click();

    //
    // navigate to /videos/$id
    //

    await page.waitForSelector(`"Created a new video"`);

    await expect(page).toHaveURL(/\/videos\/\d+$/);

    // select text to bookmark
    const bookmarkable = page.locator(".--bookmarkable-- >> nth=6");
    await bookmarkable.evaluate((el) => {
      const text = el.childNodes[0];
      const selection = window.getSelection();
      const range = document.createRange();
      range.setStart(text, 13);
      range.setEnd(text, 39);
      if (!selection) throw new Error();
      selection.addRange(range);
    });

    // click bookmark
    await page.locator("data-test=new-bookmark-button").click();

    // see success message
    await page.waitForSelector(`"Bookmark success"`);

    // verify database
    const rows = await db
      .select()
      .from(T.bookmarkEntries)
      .where(E.eq(T.bookmarkEntries.userId, user.data.id));
    expect(rows[0]).toMatchObject({
      text: "qu'est-ce qu'on va faire ?",
      offset: 13,
      side: 0,
    });

    //
    // navigate to bookmark list
    //

    await page.goto("/bookmarks");

    // verify bookmark text
    await expect(
      page.locator("data-test=bookmark-entry >> data-test=bookmark-entry-text")
    ).toHaveText("qu'est-ce qu'on va faire ?");

    // click "ChevronDown"
    await page.locator("data-test=bookmark-entry >> button >> nth=0").click();

    // click link to navigate back to /videos/$id
    await page
      .locator(
        "data-test=bookmark-entry >> data-test=caption-entry-component__video-link >> nth=0"
      )
      .click();

    await expect(page).toHaveURL(/\/videos\/\d+\?index=\d+$/);
  });
});

test("anonymouse: / => /videos/new => /videos/id", async ({ page }) => {
  await page.goto("/");

  // input videoId
  await page.getByRole("button").click();
  await page
    .getByPlaceholder("Enter Video ID or URL")
    .fill("https://www.youtube.com/watch?v=4gXmClk8rKI");
  await page.getByPlaceholder("Enter Video ID or URL").press("Enter");

  // navigated to /vides/new
  await page.waitForURL(
    "/videos/new?videoId=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D4gXmClk8rKI"
  );
  await expect(page.getByLabel("Title")).toHaveValue(
    "fromis_9 (프로미스나인) 'DM' Official MV"
  );
  await page
    .getByRole("combobox", { name: "1st language" })
    .selectOption('{"id":".ko"}');
  await page
    .getByRole("combobox", { name: "2nd language" })
    .selectOption('{"id":".en"}');
  await page.getByRole("button", { name: "Play" }).click();

  // navigated to /videos/id
  await page.getByText("Created a new video").click();
  await page.waitForURL(/\/videos\/\d+$/);
  await page.getByText("Hey you 지금 뭐 해").click();
});

test("invalid videoId input", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("Navbar-drawer-button").click();
  await page.getByPlaceholder("Enter Video ID or URL").click();
  await page
    .getByPlaceholder("Enter Video ID or URL")
    .fill("https://www.youtube.com/watch?v=4gXmClk8rXX");
  await page.getByPlaceholder("Enter Video ID or URL").press("Enter");
  await page.getByText("Failed to load a video").click();
});
