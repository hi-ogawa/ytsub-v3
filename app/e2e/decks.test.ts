import { expect } from "@playwright/test";
import { E, T, db } from "../db/drizzle-client.server";
import { DEFAULT_SEED_FILE, importSeed } from "../misc/seed-utils";
import { test } from "./coverage";
import { useUserE2E } from "./helper";

test.describe("decks", () => {
  const user = useUserE2E(test, { seed: __filename });

  test.beforeEach(async () => {
    await user.isReady;
    await db.delete(T.videos).where(E.eq(T.videos.userId, user.data.id));
    await db.delete(T.decks).where(E.eq(T.decks.userId, user.data.id));
    await importSeed(user.data.id);
  });

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

    // navigate to "/decks/$id/history-graph"
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Chart" }).click();
    await expect(page).toHaveURL(/\/decks\/\d+\/history-graph$/);

    // navigate to "/decks/$id/history"
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "History" }).click();
    await expect(page).toHaveURL(/\/decks\/\d+\/history$/);
    await page.getByText("Empty").click();
    await page
      .getByTestId("ActionStatisticsComponent")
      .getByText("0-0")
      .click();

    // go to edit page and delete deck
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Edit" }).click();
    page.once("dialog", (dialog) => dialog.accept("wrong-input"));
    await page.getByRole("button", { name: "Delete this deck" }).click();
    await page.getByText("Deletion canceled").click();
    page.once("dialog", (dialog) => dialog.accept("deck-e2e-test"));
    await page.getByRole("button", { name: "Delete this deck" }).click();
    await page.getByText("Successfully deleted a deck").click();
    await expect(page).toHaveURL("/decks");
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

  test("show-deck => pagination => deck-history", async ({ page }) => {
    await user.signin(page);
    await page.goto("/decks");

    // nagivate to "/decks/$id"
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Deck" }).click();
    await expect(page).toHaveURL(/\/decks\/\d+$/);

    // navigate pagination
    await page.locator("data-test=pagination >> a >> nth=2").click();
    await expect(page).toHaveURL(/\/decks\/\d+\?perPage=20&page=2$/);

    // navigate to "/decks/$id/history-graph"
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Chart" }).click();
    await expect(page).toHaveURL(/\/decks\/\d+\/history-graph$/);
    await page.getByText("this week").click();

    // change graph options
    await page
      .getByTestId("SelectWrapper-rangeType")
      .selectOption({ label: "by month" });
    await page.getByText("this month").click();
    await page
      .getByTestId("SelectWrapper-graphType")
      .selectOption({ label: "by queue" });

    // navigate to "/decks/$id/history"
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "History" }).click();
    await page.waitForURL(/\/decks\/\d+\/history$/);
    await page.getByText("1 / 13 (247)").click();
    await page.getByRole("combobox").selectOption("1");
    await page.getByText("1 / 7 (128)").click();
  });

  // TODO: detailed test with non randomMode?
  test("practice", async ({ page }) => {
    await user.signin(page);
    await page.goto("/decks");
    await page.getByRole("link", { name: "Korean" }).click();
    await page.getByText("Progress").click();
    await page.getByText("0 | 140").click();
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
    await page.locator("input[name=fileList]").setInputFiles(DEFAULT_SEED_FILE);
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
