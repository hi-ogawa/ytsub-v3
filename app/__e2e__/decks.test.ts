import { expect } from "@playwright/test";
import { test } from "./coverage";
import { useDevUserE2e } from "./helper";

test.describe("decks", () => {
  const { signin } = useDevUserE2e(test);

  test("decks => new-deck", async ({ page }) => {
    await signin(page);

    await page.goto("/decks");

    await page.locator('[data-test="decks-menu"]').click();

    await page.locator("text=New deck").click();

    await expect(page).toHaveURL("/decks/new");
  });

  test("videos => add-to-deck", async ({ page }) => {
    await signin(page);

    await page.goto("/videos");

    // show add to deck modal
    await page
      .locator("data-test=video-component-popover-button >> nth=0")
      .click();
    await page
      .locator("data-test=video-component-add-to-deck-button >> nth=0")
      .click();

    // assert "add to deck" component in modal
    await page.waitForSelector(
      "data-test=modal >> data-test=add-to-deck-component"
    );
  });
});
