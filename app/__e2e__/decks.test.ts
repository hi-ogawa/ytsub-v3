import { expect } from "@playwright/test";
import { DEFAULT_SEED_FILE, importSeed } from "../misc/seed-utils";
import { test } from "./coverage";
import { forceDismissToast, useUserE2E } from "./helper";

test.describe("decks", () => {
  const user = useUserE2E(test, { seed: __filename });

  test.beforeAll(async () => {
    await user.isReady;
    await importSeed(user.data.id);
  });

  test("decks => new-deck => edit-deck", async ({ page }) => {
    await user.signin(page);

    await page.goto("/decks");

    await page.locator("data-test=new-deck-link").click();

    await expect(page).toHaveURL("/decks/new");

    // create new deck
    await page
      .locator('data-test=new-deck-form >> input[name="name"]')
      .fill("deck-e2e-test");
    await page
      .locator('data-test=new-deck-form >> button[type="submit"]')
      .click();
    await page.waitForSelector(`"Deck created successfully"`);
    await expect(page).toHaveURL(/\/decks\/\d+$/);
    await forceDismissToast(page);

    // navigate to edit deck page
    await page.locator("data-test=deck-menu-popover-reference").click();
    await page
      .locator("data-test=deck-menu-popover-floating >> text=Edit")
      .click();
    await expect(page).toHaveURL(/\/decks\/\d+\/edit$/);

    // submit edit deck form
    await page
      .locator('data-test=edit-deck-form >> input[name="newEntriesPerDay"]')
      .fill("25");
    await page
      .locator('data-test=edit-deck-form >> button[type="submit"]')
      .click();
    await page.waitForSelector(`"Deck updated successfully"`);
    await expect(page).toHaveURL(/\/decks\/\d+$/);

    // navigate to "/decks/$id/history-graph"
    await page.locator("data-test=deck-menu-popover-reference").click();
    await page
      .locator("data-test=deck-menu-popover-floating >> text=History")
      .click();
    await expect(page).toHaveURL(/\/decks\/\d+\/history-graph$/);

    // navigate to "/decks/$id/history"
    await page.getByRole("combobox").selectOption({ label: "List" });
    await expect(page).toHaveURL(/\/decks\/\d+\/history$/);
    await expect(page.locator(`data-test=main >> "Empty"`)).toBeVisible();
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
    await page.locator("text=Korean").click();
    await expect(page).toHaveURL(/\/decks\/\d+$/);

    // navigate pagination
    await page.locator("data-test=pagination >> a >> nth=2").click();
    await expect(page).toHaveURL(/\/decks\/\d+\?perPage=20&page=2$/);

    // navigate to "/decks/$id/history-graph"
    await page.locator("data-test=deck-menu-popover-reference").click();
    await page
      .locator("data-test=deck-menu-popover-floating >> text=History")
      .click();
    await expect(page).toHaveURL(/\/decks\/\d+\/history-graph$/);
  });

  test("practice", async ({ page }) => {
    await user.signin(page);
    await page.goto("/decks");
    await page.getByRole("link", { name: "Korean" }).click();
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Practice" }).click();
    await page.getByText("Progress").click();
    await page.getByText("0 | 140").click();
    await page.getByRole("button", { name: "AGAIN" }).click();
    await page.getByText("1 | 139").click();
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
    await page.getByRole("link", { name: "Korean" }).click();
    await page.locator('[data-test="deck-menu-popover-reference"]').click();
    await page.getByRole("link", { name: "Edit" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: "Export JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("ytsub-deck-export--Korean.txt");
  });
});
