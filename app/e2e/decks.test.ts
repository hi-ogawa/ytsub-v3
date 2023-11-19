import { expect } from "@playwright/test";
import { DEFAULT_SEED_FILE, importSeed } from "../misc/seed-utils";
import { test } from "./coverage";
import { useUserE2E } from "./helper";

test.describe("decks-empty", () => {
  const user = useUserE2E(test, { seed: __filename });

  test("decks => new-deck => edit-deck => delete-deck", async ({ page }) => {
    await user.signin(page);
    await page.goto("/decks");

    // navigate to new deck page
    await page.locator('[data-test="new-deck-link"]').click();
    await expect(page).toHaveURL("/decks/new");

    // create new deck
    await page.getByLabel("Name").fill("deck-e2e-test");
    await page.getByLabel("New entries per day").fill("40");
    await page.getByRole("button", { name: "Create" }).click();
    await page.getByText("Successfully created a deck").click();
    await expect(page).toHaveURL(/\/decks\/\d+$/);

    // navigate to edit deck page
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page).toHaveURL(/\/decks\/\d+\/edit$/);

    // submit edit deck form
    await expect(page.getByLabel("Name")).toHaveValue("deck-e2e-test");
    await expect(page.getByLabel("New entries per day")).toHaveValue("40");
    await expect(page.getByLabel("Randomize")).toBeChecked();
    await page.getByLabel("New entries per day").click();
    await page.getByLabel("New entries per day").fill("");
    await page.getByLabel("New entries per day").type("25");
    await page.getByRole("button", { name: "Save" }).click();
    await page.getByText("Successfully updated a deck").click();

    // delete deck
    page.once("dialog", (dialog) => dialog.accept("wrong-input"));
    await page.getByRole("button", { name: "Delete this deck" }).click();
    await page.getByText("Deletion canceled").click();
    page.once("dialog", (dialog) => dialog.accept("deck-e2e-test"));
    await page.getByRole("button", { name: "Delete this deck" }).click();
    await page.getByText("Successfully deleted a deck").click();
    await expect(page).toHaveURL("/decks");
  });
});

test.describe("decks-seed", () => {
  const user = useUserE2E(test, { seed: __filename });
  let deckId: number;

  test.beforeAll(async () => {
    await user.isReady;
    deckId = await importSeed(user.data.id);
  });

  test("videos => add-to-deck", async ({ page }) => {
    await user.signin(page);

    await page.goto("/videos");

    // show add to deck modal
    await page
      .locator("data-test=video-component-popover-button >> nth=1")
      .click();
    await page
      .locator('[data-test="video-component-add-to-deck-button"]')
      .click();

    // add to deck
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Korean (56)" }).click();
    await page.getByText("Added 0 to a deck").click();
  });

  // prettier-ignore
  test("show-deck => pagination => deck-history", async ({ page }) => {
    await user.signin(page);
    await page.goto("/decks");

    // nagivate to "/decks/$id"
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Deck" }).click();
    await page.waitForURL(`/decks/${deckId}`);

    // navigate pagination
    await page
      .locator('[data-test="pagination"]')
      .getByRole("link")
      .nth(2)
      .click();
    await page.waitForURL(`/decks/${deckId}?page=2`);
    await page
      .locator('[data-test="pagination"]')
      .getByRole("link")
      .nth(2)
      .click();
    await page.waitForURL(`/decks/${deckId}?page=3`);
    await page
      .locator('[data-test="pagination"]')
      .getByRole("link")
      .first()
      .click();
    await page.waitForURL(`/decks/${deckId}`);

    // navigate to "/decks/$id/history-graph"
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Chart" }).click();
    await page.waitForURL(`/decks/${deckId}/history-graph`);
    await page.getByText("this week").click();

    // change graph options
    await page
      .getByTestId("SelectWrapper-rangeType")
      .selectOption({ label: "by month" });
    await page.waitForURL(`/decks/${deckId}/history-graph?rangeType=month`);
    await page.getByText("this month").click();
    await page
      .getByTestId("SelectWrapper-graphType")
      .selectOption({ label: "by queue" });
    await page.waitForURL(`/decks/${deckId}/history-graph?rangeType=month&graphType=queue`);

    //
    // /decks/$id/history
    //
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "History" }).click();
    await page.waitForURL(`/decks/${deckId}/history`);

    // first entry
    await page.getByText("많이 울었던 사람?").click();

    // lazy load entry after scroll
    await expect(page.getByText("맞아?")).not.toBeVisible();
    await page
      .getByTestId("main-scroll")
      .evaluate((el) => el.scroll({ top: el.scrollHeight }));
    await page.getByText("맞아?").click();

    // filter actionType
    await page.getByRole("combobox", { name: 'Filter' }).selectOption({ label: "GOOD" });
    await page.getByText("네 맞아요").click(); // TODO
    await page
      .getByTestId("main-scroll")
      .evaluate((el) => el.scroll({ top: el.scrollHeight }));
    await page.getByText("특별한").click();
  });

  // TODO: detailed test with non randomMode?
  test("practice", async ({ page }) => {
    await user.signin(page);
    await page.goto("/decks");
    await page.getByRole("link", { name: "Korean" }).click();
    await page.getByText("Progress").click();
    await page.getByText("0 | 139").click();
    await page.getByRole("button", { name: "AGAIN" }).click();
  });
});

test.describe("decks-import-export", () => {
  const user = useUserE2E(test, { seed: __filename });

  test("basic", async ({ page }) => {
    await user.signin(page);
    await page.goto("/decks");

    // import
    await page.locator(".i-ri-file-upload-line").click();
    await page.getByLabel("File").setInputFiles(DEFAULT_SEED_FILE);
    await page.getByRole("button", { name: "Import" }).click();
    await page.getByText("Deck imported successfully!").click();

    // export
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Edit" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("ytsub-deck-export--Korean.txt");
  });
});
