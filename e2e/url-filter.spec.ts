import { expect, test, type Page } from "@playwright/test";

/** Wait for hydration so the filters' handlers are attached before typing. */
async function open(page: Page, url: string) {
  await page.goto(url);
  await page.waitForLoadState("networkidle");
}

// Required test 3 (URL filter).
test("search keeps its filter in the URL across reload and back", async ({ page }) => {
  await open(page, "/shop");
  const items = page.getByRole("list", { name: "Items" }).getByRole("listitem");
  await expect(items).toHaveCount(5);

  await page.getByLabel("Search").pressSequentially("lamp");

  await expect(page).toHaveURL(/[?&]q=lamp(&|$)/);
  await expect(items).toHaveCount(1);
  await expect(items).toContainText(["Maple lamp"]);

  await page.reload();

  await expect(page).toHaveURL(/[?&]q=lamp(&|$)/);
  await expect(page.getByLabel("Search")).toHaveValue("lamp");
  await expect(items).toHaveCount(1);
  await expect(items).toContainText(["Maple lamp"]);

  await page.goBack();

  await expect(page).toHaveURL(/\/shop$/);
  await expect(items).toHaveCount(5);
  await expect(page.getByLabel("Search")).toHaveValue("");
});
