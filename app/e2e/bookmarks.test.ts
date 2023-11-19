import { importSeed } from "../misc/seed-utils";
import { test } from "./coverage";
import { useUserE2E } from "./helper";

test.describe("bookmarks", () => {
  const user = useUserE2E(test, { seed: __filename });

  test.beforeAll(async () => {
    await user.isReady;
    await importSeed(user.data.id);
  });

  test("load-more", async ({ page }) => {
    await user.signin(page);
    await page.goto("/bookmarks");
    await page.getByRole("button", { name: "Load more" }).click();
    await page.getByText("오늘 재밌게 촬영한 것 같습니다").click();
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
    await page.getByText("케플러 대박 기원").click(); // TODO
    await page.locator(".i-ri-upload-line").click();
    await page.getByText("감사합니당~").click();
  });

  test("goToLastBookmark", async ({ page }) => {
    await user.signin(page);
    await page.goto("/videos");
    await page
      .getByRole("link", {
        name: "(ENG) 떡잎부터 남다른 케플러 갓기시절👼🏻 짱플러의 육아난이도는?! [이게될까? - 멜론 스테이션 EP44]",
      })
      .click();
    await page.getByTestId("video-menu-reference").click();
    await page.getByRole("button", { name: "Details" }).click();
    await page.getByRole("button", { name: "Go to Last Bookmark" }).click();
    await page.getByText("케플러 대박 기원").click();
  });
});

test.describe("/bookmarks/history-chart", () => {
  const userHook = useUserE2E(test, { seed: __filename });

  test("requires login", async ({ page }) => {
    await page.goto("/bookmarks/history-chart");
    await page.getByText("Signin required").click();
    await page.waitForURL("/users/signin");
  });

  // prettier-ignore
  test("basic", async ({ page }) => {
    await userHook.signin(page);
    await page.goto("/bookmarks/history-chart");
    await page.getByText("this week").click();
    await page.getByRole('button').nth(3).click();
    await page.waitForURL(`/bookmarks/history-chart?page=1`);
    await page.getByText("last week").click();
    await page.getByTestId('SelectWrapper-rangeType').selectOption({ label: "by month" });
    await page.waitForURL(`/bookmarks/history-chart?rangeType=month`);
    await page.getByText('this month').click();
    await page.getByRole('button').nth(3).click();
    await page.getByText('last month').click();
    await page.waitForURL(`/bookmarks/history-chart?rangeType=month?page=1`);
  });
});
