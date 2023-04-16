import { importSeed } from "../misc/seed-utils";
import { test } from "./coverage";
import { useUserE2E } from "./helper";

test.describe("bookmarks", () => {
  const user = useUserE2E(test, { seed: __filename });

  test.beforeEach(async () => {
    await user.isReady;
    await importSeed(user.data.id);
  });

  test("search", async ({ page }) => {
    await user.signin(page);
    await page.goto("/bookmarks");
    await page.getByPlaceholder("Search text...").fill("진짜");
    await page.getByPlaceholder("Search text...").press("Enter");
    await page.getByText("진짜 힘든데").click();
  });

  test("MiniPlayer", async ({ page }) => {
    await user.signin(page);
    await page.goto("/bookmarks");
    await page.getByText("케플러 대박 기원").click();
    await page.locator(".i-ri-upload-line").click();
    await page.getByText("감사합니당~").click();
  });
});
