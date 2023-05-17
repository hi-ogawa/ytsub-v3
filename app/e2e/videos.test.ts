import { expect } from "@playwright/test";
import { E, T, db } from "../db/drizzle-client.server";
import { importSeed } from "../misc/seed-utils";
import { regExpRaw } from "../utils/misc";
import { test } from "./coverage";
import { useUserE2E } from "./helper";

test.describe("videos-signed-in", () => {
  const user = useUserE2E(test, {
    seed: __filename + "/users/me",
  });

  // prettier-ignore
  test("create-bookmarks", async ({ page }) => {
    await user.signin(page);

    //
    // input video url in "/"
    //
    await page.goto("/");
    await page.getByTestId("Navbar-drawer-button").click();
    await page.getByPlaceholder("Enter Video ID or URL").fill("https://www.youtube.com/watch?v=4gXmClk8rKI");
    await page.getByPlaceholder("Enter Video ID or URL").press("Enter");

    //
    // create video in "/videos/new"
    //
    await page.waitForURL("/videos/new?videoId=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3D4gXmClk8rKI");
    await page.getByRole("combobox", { name: "1st language" }).selectOption('{"id":".ko"}');
    await page.getByRole("combobox", { name: "2nd language" }).selectOption('{"id":".en"}');
    await page.getByRole("button", { name: "Save and Play" }).click();

    //
    // play video in "/videos/$id"
    //
    await page.waitForURL(regExpRaw`/videos/\d+$`);

    // select text
    await page.getByText("잠깐 밖으로 나올래").evaluate((el) => {
      const selection = window.getSelection();
      selection?.setBaseAndExtent(el.childNodes[0], 0, el.childNodes[0], 6);
    });

    // create bookmark
    await page.locator('[data-test="new-bookmark-button"]').click();
    await page.getByText("Bookmark success").click();

    // highlight bookmarks
    await page.getByTestId('video-menu-reference').click();
    await page.getByRole('button', { name: 'Show bookmarks' }).click();
    await expect(page.getByText('잠깐 밖으로')).toHaveAttribute("data-offset", "0");
    await expect(page.getByText('잠깐 밖으로')).toHaveClass("text-colorPrimaryText")
    await expect(page.getByText('나올래')).toHaveAttribute("data-offset", "6");
    await expect(page.getByText('나올래')).not.toHaveClass("text-colorPrimaryText");

    // create overlapped bookmark
    await page.getByText("잠깐 밖으로 나올래").evaluate((el) => {
      const selection = window.getSelection();
      selection?.setBaseAndExtent(el.childNodes[0].childNodes[0], 3, el.childNodes[1].childNodes[0], 3);
    });
    await page.getByTestId("toast-remove").evaluate((el: any) => el.click());
    await page.locator('[data-test="new-bookmark-button"]').click();
    await page.getByText("Bookmark success").click();

    await page.getByText("잠깐 밖으로 나올래").evaluate((el) => {
      const selection = window.getSelection();
      // dragging in reverse direction
      selection?.setBaseAndExtent(el.childNodes[3].childNodes[0], 1, el.childNodes[1].childNodes[0], 2);
    });
    await page.getByTestId("toast-remove").evaluate((el: any) => el.click());
    await page.locator('[data-test="new-bookmark-button"]').click();
    await page.getByText("Bookmark success").click();

    // check db
    const rows = await db
      .select()
      .from(T.bookmarkEntries)
      .where(E.eq(T.bookmarkEntries.userId, user.data.id));
    expect(rows).toMatchObject([
      {
        side: 0,
        offset: 0,
        text: "잠깐 밖으로",
      },
      {
        side: 0,
        offset: 3,
        text: "밖으로 나올",
      },
      {
        side: 0,
        offset: 5,
        text: "로 나올래",
      },
    ]);

    //
    // check created bookmarks in /bookmarks
    //

    await page.getByTestId('Navbar-drawer-button').click();
    await page.getByRole('link', { name: 'Bookmarks' }).click();
    await page.getByText('잠깐 밖으로').click();
    await page.locator('[data-test="caption-entry-component__video-link"]').click();

    // back to the video
    await page.waitForURL(regExpRaw`/videos/\d+\?index=1$`);
  });
});

test("anonymouse: / => /videos/new => /videos/id", async ({ page }) => {
  await page.goto("/");

  // input videoId
  await page.getByTestId("Navbar-drawer-button").click();
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

test("captions-manual-mode", async ({ page }) => {
  await page.goto("/");

  // input videoId
  await page.getByTestId("Navbar-drawer-button").click();
  await page
    .getByPlaceholder("Enter Video ID or URL")
    .fill("https://www.youtube.com/watch?v=AQt4K08L_m8");
  await page.getByPlaceholder("Enter Video ID or URL").press("Enter");

  // navigated to /vides/new
  await page.waitForURL(
    "/videos/new?videoId=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DAQt4K08L_m8"
  );
  await expect(page.getByLabel("Title")).toHaveValue(
    "조유리 (JO YURI) | 'GLASSY' MV"
  );

  // enable manual mode
  await page.getByTestId("video-menu-reference").click();
  await page.getByRole("button", { name: "Manual input" }).click();

  // input form
  await page
    .getByRole("combobox", { name: "1st language" })
    .selectOption({ label: "Korean" });
  await page
    .getByRole("combobox", { name: "2nd language" })
    .selectOption('{"id":".en"}');
  await page.locator('textarea[name="input"]').fill(`\
기분이 들떠
Like a star like a star
걸음에 시선이 쏟아져
`);

  // edit preview
  await page.getByRole("button", { name: "Preview" }).click();
  await page.getByText("기분이 들떠").click();
  await page.getByText("걸음에 시선이 쏟아져").click();
  await page
    .locator("div:nth-child(4) > div > .w-full")
    .fill("아닌척해도 살짝살짝");
  await page.keyboard.press("Escape");

  // submit and navigated to /videos/$id
  await page.getByRole("button", { name: "Save and Play" }).click();
  await page.getByText("Created a new video").click();
  await page.waitForURL(/\/videos\/\d+$/);

  // check created captions
  await page.getByText("아닌척해도 살짝살짝").click();
  await page.getByText("Even if you’re pretending not to").click();
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

test.describe("videos deletion", () => {
  const userHook = useUserE2E(test, { seed: __filename + "videos deletion" });

  test.beforeAll(async () => {
    await userHook.isReady;
    await importSeed(userHook.data.id);
  });

  test("error", async ({ page }) => {
    await userHook.signin(page);
    await page.goto("/videos");
    await page
      .locator('[data-test="video-component-popover-button"]')
      .nth(0)
      .click();
    page.once("dialog", (dialog) => {
      dialog.accept();
    });
    await page.locator('[data-test="video-delete-form"]').click();
    await page
      .getByText("You cannot delete a video when it has associated bookmarks.")
      .click();
  });
});
