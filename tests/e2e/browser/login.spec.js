import { test, expect } from "./fixtures";
test.describe("auth flow", () => {
  test.beforeEach(async ({ auth }) => {
    await auth.login();
  });

  test("signs in", async ({ page }) => {
    await expect(page.locator("button.signout-user")).toBeVisible();
  });

  test("signs out", async ({ page }) => {
    await page.waitForSelector('button.signout-user');
    await expect(page.locator("button.signout-user")).toBeVisible();

    await page.waitForTimeout(1000);
    await page.locator("button.signout-user").click();

    await page.waitForTimeout(1000);
    await page.waitForSelector('button.signin-user');
    await expect(page.locator("button.signin-user")).toBeVisible();
  });
});
