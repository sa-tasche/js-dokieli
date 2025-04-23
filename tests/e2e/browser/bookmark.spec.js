import { test, expect } from "./fixtures";

test.beforeEach(async ({ auth, page }) => {
  await auth.login();
  await page.waitForLoadState("load");

  // Click and drag on text to select it
  const text = page.locator("#summary");
  const box = await text.boundingBox();

  await text.click();
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.up();

  // Wait for the toolbar to be visible
  const toolbar = page.locator(".editor-toolbar");
  await expect(toolbar).toBeVisible();
});

async function cleanup(page, bookmark) {
  bookmark.click();
  await page.waitForTimeout(1000);
  // clean up created bookmark
  await page.locator("button.delete");
  await page.click("button.delete");
  await expect(page.locator("sup.ref-annotation")).not.toBeVisible();
}

test("should be able to bookmark a resource", async ({ page }) => {
  // TODO: we should not need this here, login should be enough
  // Listen for console messages to make sure we are logged in 
  await page.on("console", async (msg) => {
    if (
      msg.text().includes(process.env.WEBID)
    ) {
      const bookmarkButton = page.locator('[id="editor-button-bookmark"]');
      await bookmarkButton.click();
      await expect(page.locator("textarea#bookmark-content")).toBeVisible();
      await page.fill("textarea#bookmark-content", "This is a bookmark");
      const saveButton = page.getByRole("button", { name: "Post" });
      expect(saveButton).toBeVisible();
      await saveButton.click();

      const bookmark = page.locator("sup.ref-annotation");
      await expect(bookmark).toBeVisible();

      // wait for screencast purposes
      // await page.waitForTimeout(5000);

      await cleanup(page, bookmark);
    }
  });
});
