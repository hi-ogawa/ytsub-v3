import { expect, test } from "@playwright/test";
import { tables } from "../db/models";
import { useUserE2E } from "./helper";

// TODO: maybe sourcemap is broken in playwright
test.describe("videos-signed-in", () => {
  const { user, signin } = useUserE2E(test, {
    seed: __filename + "/users/me",
  });

  test("new-video => show-video => new-bookmark", async ({ page }) => {
    await signin(page);

    // create https://www.youtube.com/watch?v=EnPYXckiUVg with fr/en
    await page.goto("/videos/new?videoId=EnPYXckiUVg");
    await page
      .locator("data-test=setup-form >> select >> nth=0")
      .selectOption('{"id":".fr"}');
    await page
      .locator("data-test=setup-form >> select >> nth=1")
      .selectOption('{"id":".en"}');
    await page.locator('data-test=setup-form >> button[type="submit"]').click();

    // navigate to /videos/$id
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
    const entry = await tables
      .bookmarkEntries()
      .where({ userId: user().id })
      .first();
    expect(entry).toMatchObject({
      text: "qu'est-ce qu'on va faire ?",
      offset: 13,
      side: 0,
    });
  });
});
