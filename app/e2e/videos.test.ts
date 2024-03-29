import { regExpRaw } from "@hiogawa/utils";
import { expect } from "@playwright/test";
import { E, T, db } from "../db/drizzle-client.server";
import { importSeed } from "../misc/seed-utils";
import { test } from "./coverage";
import { useUserE2E, waitForHydration } from "./helper";

test.describe("videos-signed-in", () => {
  const user = useUserE2E(test, {
    seed: "videos-signed-in",
  });

  // prettier-ignore
  test("create-bookmarks", async ({ page }) => {
    await user.signin(page);

    //
    // input video url in "/"
    //
    await page.goto("/");
    await waitForHydration(page);
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
  await waitForHydration(page);

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

test("captions-editor-basic", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);

  // input videoId
  await page.getByTestId("Navbar-drawer-button").click();
  await page
    .getByPlaceholder("Enter Video ID or URL")
    .fill("https://www.youtube.com/watch?v=UY3N52CrTPE"); // SAY SOMETHING (TWICE)
  await page.getByPlaceholder("Enter Video ID or URL").press("Enter");

  // navigated to /vides/new
  await page.waitForURL(
    "/videos/new?videoId=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DUY3N52CrTPE"
  );
  await expect(page.getByLabel("Title")).toHaveValue(
    `TWICE 5th Anniversary Special Live 'WITH' "SAY SOMETHING"`
  );

  // enable caption editor mode
  await page.getByTestId("video-menu-reference").click();
  await page.getByRole("button", { name: "Use caption editor" }).click();

  // check link
  await expect(
    page.getByRole("link", { name: "Open caption editor" })
  ).toHaveAttribute("href", "/caption-editor/watch?v=UY3N52CrTPE");

  // input form
  await page
    .getByRole("combobox", { name: "1st language" })
    .selectOption({ label: "Korean" });
  await page
    .getByRole("combobox", { name: "2nd language" })
    .selectOption({ label: "English" });
  await page.locator('textarea[name="input"]').fill(`\
[
  {
    "begin": 0,
    "end": 0,
    "endLocked": true,
    "text1": "매일이 별다를 것 없던",
    "text2": "It will be different tomorrow",
    "index": 0
  },
  {
    "begin": 0,
    "end": 0,
    "endLocked": true,
    "text1": "기억들이 변해가는 것 같아",
    "text2": "Are bad memories changing?",
    "index": 1
  }
]
`);

  // submit and navigated to /videos/$id
  await page.getByRole("button", { name: "Save and Play" }).click();
  await page.getByText("Created a new video").click();
  await page.waitForURL(/\/videos\/\d+$/);

  // check captions
  await page.getByText("기억들이 변해가는 것 같아").click();
  await page.getByText("Are bad memories changing?").click();
});

test("captions-editor-auto-save", async ({ page }) => {
  // PAXXWORD (NMIXX) https://www.youtube.com/watch?v=lH_n29wkT_4
  await page.goto("/caption-editor/watch?v=lH_n29wkT_4");
  await waitForHydration(page);

  // import with manual + download
  await page.getByRole("button", { name: "Import" }).click();
  await page
    .locator('textarea[name="text1"]')
    .fill("Alright 일단 system check\n시작하기 전 stretching 해");
  await page
    .locator('select[name="mode2"]')
    .selectOption({ label: "download" });
  await page
    .locator('select[name="download2"]')
    .selectOption({ label: "English" });
  await page
    .locator('[data-test="modal"]')
    .getByRole("button", { name: "Import" })
    .click();

  // check downloaded captions
  await page.getByText("Alright, First, system check").click();

  // edit
  await page
    .getByText("Alright 일단 system check")
    .fill("[EDIT] Alright 일단 system check");
  await page.waitForTimeout(500);

  // reload and verify draft
  await page.reload();
  await page.getByText("[EDIT] Alright 일단 system check").click();

  // export
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Export" }).click();
  await page.getByText("Caption data is copied to clipboard!").click();
  const clipboardText = await page.evaluate(() =>
    navigator.clipboard.readText()
  );
  expect(clipboardText).toContain(
    `"text1": "[EDIT] Alright 일단 system check"`
  );

  // check draft list
  await page.getByTestId("Navbar-drawer-button").click();
  await page.getByRole("link", { name: "Caption Editor" }).click();
  await page.waitForURL("/caption-editor");
  await page
    .getByRole("link", { name: "NMIXX - PAXXWORD | SPECIAL VIDEO" })
    .click();
  await page.waitForURL("/caption-editor/watch?v=lH_n29wkT_4");
});

test("invalid videoId input", async ({ page }) => {
  await page.goto("/");
  await waitForHydration(page);
  await page.getByTestId("Navbar-drawer-button").click();
  await page.getByPlaceholder("Enter Video ID or URL").click();
  await page
    .getByPlaceholder("Enter Video ID or URL")
    .fill("https://www.youtube.com/watch?v=4gXmClk8rXX");
  await page.getByPlaceholder("Enter Video ID or URL").press("Enter");
  await page.getByText("Failed to load a video").click();
});

test.describe("video playback rate", () => {
  const userHook = useUserE2E(test, {
    seed: "video playback rate",
  });

  test.beforeAll(async () => {
    await userHook.isReady;
    await importSeed(userHook.data.id);
  });

  test("basic", async ({ page }) => {
    await userHook.signin(page);
    await page.goto("/videos");
    await waitForHydration(page);
    await page
      .getByRole("link", { name: "fromis_9 (프로미스나인) 'DM' Official MV" })
      .click();
    await page.getByTestId("video-menu-reference").click();
    await page
      .getByTestId("PlaybackRateSelect")
      .selectOption({ label: "0.75" });
  });
});

test.describe("videos deletion", () => {
  const userHook = useUserE2E(test, { seed: "videos deletion" });

  test.beforeAll(async () => {
    await userHook.isReady;
    await importSeed(userHook.data.id);
  });

  test("error", async ({ page }) => {
    await userHook.signin(page);
    await page.goto("/videos");
    await waitForHydration(page);
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

test.describe("videos new form", () => {
  test("reset form state", async ({ page }) => {
    await page.goto("/");
    await waitForHydration(page);

    // 1st navigation
    await page.getByTestId("Navbar-drawer-button").click();
    await page
      .getByPlaceholder("Enter Video ID or URL")
      .fill("https://www.youtube.com/watch?v=w9ueRzymcU0");
    await page.getByPlaceholder("Enter Video ID or URL").press("Enter");
    await expect(page.getByLabel("Video ID")).toHaveValue("w9ueRzymcU0");

    // 2nd navigation within same page
    await page.getByTestId("Navbar-drawer-button").click();
    await page
      .getByPlaceholder("Enter Video ID or URL")
      .fill("https://www.youtube.com/watch?v=jyw_vrI4ySg");
    await page.getByPlaceholder("Enter Video ID or URL").press("Enter");
    await expect(page.getByLabel("Video ID")).toHaveValue("jyw_vrI4ySg");
  });
});
